import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only. This helper opens existing plugin detail pages and transient
// menus in one isolated current-build process. It never installs, uninstalls,
// reconnects, disconnects, copies a link, follows a link, or starts a prompt.

const port = Number(process.env.CODEX_CURRENT_PLUGIN_DETAIL_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_PLUGIN_DETAIL_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_PLUGIN_DETAIL_OUTPUT_DIR;
const installedLabel =
  process.env.CODEX_CURRENT_PLUGIN_DETAIL_INSTALLED_LABEL?.trim();
const discoveryLabel =
  process.env.CODEX_CURRENT_PLUGIN_DETAIL_DISCOVERY_LABEL?.trim();
const allowCapture =
  process.env.CODEX_CURRENT_PLUGIN_DETAIL_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated plugin-detail CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated plugin-detail profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set the absolute plugin-detail output directory.");
}
if (!installedLabel || !discoveryLabel) {
  throw new Error("Set one installed and one discoverable plugin label.");
}
if (installedLabel.length > 120 || discoveryLabel.length > 120) {
  throw new Error("Plugin labels must stay within the capture-only bound.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_PLUGIN_DETAIL_ALLOW_CAPTURE=1 to authorize read-only plugin-detail capture.",
  );
}

const profile = await realpath(requestedProfile);
const outputDirectory = resolve(requestedOutputDirectory);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error(
    "The plugin-detail profile must be isolated under /private/tmp.",
  );
}
if (
  dirname(outputDirectory) !== profile ||
  !basename(outputDirectory).startsWith("current-plugin-detail-capture-")
) {
  throw new Error(
    "The output must be a current-plugin-detail-capture-* direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readInstalledFingerprint = async () => {
  const before = await stat(appAsar);
  const appAsarSha256 = execFileSync(
    "/usr/bin/shasum",
    ["-a", "256", appAsar],
    { encoding: "utf8" },
  )
    .trim()
    .split(/\s+/)[0];
  const after = await stat(appAsar);
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.ctimeMs !== after.ctimeMs ||
    before.mtimeMs !== after.mtimeMs
  ) {
    throw new Error("The installed app.asar changed while it was hashed.");
  }
  return {
    appAsarBytes: after.size,
    appAsarSha256,
    appVersion: plistValue("CFBundleShortVersionString"),
    buildNumber: plistValue("CFBundleVersion"),
    chromiumVersion: plistValue("ChromiumBaseVersion"),
  };
};
const fingerprint = await readInstalledFingerprint();
if (
  Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint does not match the promoted baseline: ${JSON.stringify(fingerprint)}`,
  );
}

const listenerFields = execFileSync(
  "/usr/sbin/lsof",
  ["-nP", "-a", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const listeners = [];
for (const field of listenerFields) {
  if (field.startsWith("p")) listeners.push({ addresses: [], pid: field.slice(1) });
  if (field.startsWith("n")) listeners.at(-1)?.addresses.push(field.slice(1));
}
if (
  listeners.length === 0 ||
  listeners.some(
    ({ addresses }) =>
      addresses.length !== 1 || addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every plugin-detail CDP listener must be loopback-only.");
}
const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", pid],
      { encoding: "utf8" },
    ),
  );
const valueFor = (argv, prefix) =>
  argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
const owners = listeners.filter(({ pid }) => {
  try {
    const info = readProcessInfo(pid);
    const processProfile = valueFor(info.argv, "--user-data-dir=");
    return (
      info.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
      valueFor(info.argv, "--remote-debugging-address=") === "127.0.0.1" &&
      valueFor(info.argv, "--remote-debugging-port=") === String(port) &&
      processProfile &&
      realpathSync(processProfile) === profile
    );
  } catch {
    return false;
  }
});
if (owners.length !== 1) {
  throw new Error("The isolated plugin-detail CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);

const inspectCandidate = async (page, index) => ({
  area: await page.evaluate(() => innerWidth * innerHeight),
  index,
  landmarks: await page.evaluate(() => ({
    main: document.querySelectorAll("main").length,
    nav: document.querySelectorAll("nav").length,
    settings: document.querySelectorAll("[data-settings-panel-slug]").length,
  })),
  page,
  url: page.url(),
  visibleControls: await page.locator("button:visible, a:visible").count(),
});
const pages = browser.contexts().flatMap((context) => context.pages());
const inspectedPages = await Promise.all(pages.map(inspectCandidate));
let selected;
try {
  selected = selectCurrentMainCandidate(inspectedPages);
} catch (error) {
  const pluginDetailCandidates = inspectedPages.filter(
    (candidate) =>
      candidate.url === "app://-/index.html" &&
      candidate.area >= 720 * 680 &&
      candidate.visibleControls >= 8,
  );
  if (pluginDetailCandidates.length !== 1) throw error;
  [selected] = pluginDetailCandidates;
}
const page = selected.page;
await page.bringToFront();
const initialViewport = await page.evaluate(() => ({
  height: innerHeight,
  width: innerWidth,
}));

const visible = async (locator) =>
  (await locator.count()) > 0 && (await locator.first().isVisible());
const metric = async (locator) => {
  const bounds = await locator.first().boundingBox();
  return bounds
    ? {
        height: bounds.height,
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
      }
    : null;
};
const clickTopPluginTab = async () => {
  const candidates = page.getByRole("button", { exact: true, name: "Plugins" });
  for (let index = 0; index < (await candidates.count()); index += 1) {
    const candidate = candidates.nth(index);
    const bounds = await candidate.boundingBox();
    if (bounds && bounds.y < 40 && (await candidate.isVisible())) {
      await candidate.click();
      return;
    }
  }
  if (await visible(candidates)) {
    await candidates.first().click();
    return;
  }
  throw new Error("The isolated app does not expose the Plugins route.");
};
const openPluginIndex = async () => {
  await page.keyboard.press("Escape");
  await clickTopPluginTab();
  await page.getByRole("heading", { exact: true, name: "Plugins" }).waitFor();
  await page.getByPlaceholder("Search plugins").waitFor();
  await page.evaluate(async () => document.fonts.ready);
};
const openInstalledDetail = async () => {
  await openPluginIndex();
  const trigger = page.getByRole("button", {
    exact: true,
    name: installedLabel,
  });
  if ((await trigger.count()) !== 1) {
    throw new Error("The selected installed plugin trigger is ambiguous.");
  }
  await trigger.click();
  await page.getByRole("heading", { exact: true, name: installedLabel }).waitFor();
  await page.getByRole("button", { exact: true, name: "Try now" }).waitFor();
};
const openDiscoveryDetail = async () => {
  await openPluginIndex();
  const card = page
    .locator('[role="button"]')
    .filter({ hasText: discoveryLabel })
    .first();
  await card.waitFor({ state: "visible" });
  const bounds = await card.boundingBox();
  if (!bounds) throw new Error("The discoverable plugin card has no bounds.");
  await card.click({ position: { x: Math.min(120, bounds.width / 2), y: bounds.height / 2 } });
  await page.getByRole("heading", { exact: true, name: discoveryLabel }).waitFor();
  await page
    .getByRole("button", { exact: true, name: "Install plugin" })
    .waitFor();
};
const setScroll = async (position) =>
  page.evaluate((requestedPosition) => {
    const title = [...document.querySelectorAll("h1")].find((element) =>
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
    );
    let scroller = title?.parentElement;
    while (scroller) {
      const style = getComputedStyle(scroller);
      if (
        ["auto", "scroll"].includes(style.overflowY) &&
        scroller.scrollHeight > scroller.clientHeight
      ) {
        scroller.scrollTop = requestedPosition === "bottom" ? scroller.scrollHeight : 0;
        return {
          clientHeight: scroller.clientHeight,
          scrollHeight: scroller.scrollHeight,
          scrollTop: scroller.scrollTop,
        };
      }
      scroller = scroller.parentElement;
    }
    throw new Error("The plugin detail scroll container is unavailable.");
  }, position);

const inspectDetail = async (label, state) =>
  page.evaluate(
    ({ requestedLabel, requestedState }) => {
      const isVisible = (element) =>
        element instanceof HTMLElement &&
        element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const bounds = element.getBoundingClientRect();
        return {
          height: bounds.height,
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
        };
      };
      const textStyle = (element) => {
        if (!(element instanceof Element)) return null;
        const value = getComputedStyle(element);
        return {
          color: value.color,
          fontFamily: value.fontFamily,
          fontSize: value.fontSize,
          fontWeight: value.fontWeight,
          lineHeight: value.lineHeight,
        };
      };
      const hasExactText = (text) =>
        [...document.querySelectorAll("*")].some(
          (element) =>
            element.childElementCount === 0 &&
            element.textContent?.trim() === text,
        );
      const title = [...document.querySelectorAll("h1")].find(
        (element) =>
          element.textContent?.trim() === requestedLabel && isVisible(element),
      );
      const header = title?.closest("header");
      const scroller = (() => {
        let candidate = title?.parentElement;
        while (candidate) {
          const value = getComputedStyle(candidate);
          if (
            ["auto", "scroll"].includes(value.overflowY) &&
            candidate.scrollHeight > candidate.clientHeight
          ) {
            return candidate;
          }
          candidate = candidate.parentElement;
        }
        return null;
      })();
      const action = (name) => {
        const element = [...document.querySelectorAll("button")].find(
          (button) => button.textContent?.trim() === name && isVisible(button),
        );
        return rect(element);
      };
      const section = (name) => {
        const heading = [...document.querySelectorAll("*")].find(
          (element) =>
            (name === "Apps"
              ? element.matches("h2") &&
                /^Apps\s*\d+$/.test(element.textContent?.trim() ?? "")
              : element.childElementCount === 0 &&
                element.textContent?.trim() === name),
        );
        return {
          count:
            name === "Apps"
              ? Number(heading?.textContent?.trim().match(/(\d+)$/)?.[1])
              : null,
          heading: rect(heading),
          mounted: Boolean(heading),
          visible: isVisible(heading),
        };
      };
      const suggestionButtons = [...document.querySelectorAll("button")].filter(
        (button) =>
          isVisible(button) &&
          button !== title &&
          button.textContent?.trim().startsWith(requestedLabel) &&
          button.textContent.trim() !== requestedLabel,
      );
      const informationLabels = [
        "Capabilities",
        "Developer",
        "Category",
        "Version",
      ].filter(hasExactText);
      return {
        actions: {
          copyLink: action("Copy link"),
          installPlugin: action("Install plugin"),
          tryNow: action("Try now"),
        },
        apps: section("Apps"),
        header: rect(header),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        information: section("Information"),
        informationLabels,
        linkLabels: [...document.querySelectorAll("a")]
          .filter(isVisible)
          .map((link) => link.getAttribute("aria-label") || link.textContent?.trim())
          .filter((text) =>
            [
              "Learn more",
              "Privacy Policy",
              "Terms of Service",
              "Website",
            ].includes(text),
          ),
        pluginArtwork: rect(header?.querySelector("img,svg")),
        privacyDisclosureVisible:
          [...document.querySelectorAll("p")].some(
            (element) =>
              isVisible(element) &&
              /may share relevant chats and memories/i.test(
                element.textContent ?? "",
              ),
          ),
        scroller: scroller
          ? {
              clientHeight: scroller.clientHeight,
              rect: rect(scroller),
              scrollHeight: scroller.scrollHeight,
              scrollTop: scroller.scrollTop,
            }
          : null,
        state: requestedState,
        suggestions: {
          count: suggestionButtons.length,
          rects: suggestionButtons.map(rect),
        },
        title: rect(title),
        titleStyle: textStyle(title),
        viewport: { height: innerHeight, width: innerWidth },
      };
    },
    { requestedLabel: label, requestedState: state },
  );

const captureDetail = async ({ label, name, open, state, viewport }) => {
  await page.setViewportSize(viewport);
  await open();
  await setScroll("top");
  await page.evaluate(async () => document.fonts.ready);
  const observation = await inspectDetail(label, state);
  await page.screenshot({ path: screenshotPath(name) });
  return observation;
};

const installedWide = await captureDetail({
  label: installedLabel,
  name: "plugin-installed-wide",
  open: openInstalledDetail,
  state: "installed",
  viewport: currentBaselineViewports.wide,
});
await page.getByRole("button", { name: "More actions" }).click();
await page.getByRole("menuitem", { exact: true, name: "Uninstall" }).waitFor();
const actionsMenu = {
  itemLabels: await page
    .locator('[role="menuitem"]:visible')
    .allTextContents()
    .then((items) => items.map((item) => item.trim())),
  rect: await metric(page.locator('[role="menu"]:visible')),
};
await page.screenshot({ path: screenshotPath("plugin-actions-wide") });
await page.keyboard.press("Escape");

await page.getByRole("button", { exact: true, name: "Connected" }).click();
await page.getByRole("menuitem", { exact: true, name: "Reconnect" }).waitFor();
await page.getByRole("menuitem", { exact: true, name: "Disconnect" }).waitFor();
const connectionMenu = {
  itemLabels: await page
    .locator('[role="menuitem"]:visible')
    .allTextContents()
    .then((items) => items.map((item) => item.trim())),
  rect: await metric(page.locator('[role="menu"]:visible')),
};
await page.screenshot({ path: screenshotPath("plugin-connection-wide") });
await page.keyboard.press("Escape");

const installedBottomScroll = await setScroll("bottom");
const installedBottom = await inspectDetail(installedLabel, "installed-bottom");
await page.screenshot({ path: screenshotPath("plugin-installed-bottom-wide") });

const installedCompact = await captureDetail({
  label: installedLabel,
  name: "plugin-installed-compact",
  open: openInstalledDetail,
  state: "installed",
  viewport: currentBaselineViewports.compact,
});
const discoveryWide = await captureDetail({
  label: discoveryLabel,
  name: "plugin-discovery-wide",
  open: openDiscoveryDetail,
  state: "discovery",
  viewport: currentBaselineViewports.wide,
});
const discoveryBottomScroll = await setScroll("bottom");
const discoveryBottom = await inspectDetail(
  discoveryLabel,
  "discovery-bottom",
);
await page.screenshot({ path: screenshotPath("plugin-discovery-bottom-wide") });
const discoveryCompact = await captureDetail({
  label: discoveryLabel,
  name: "plugin-discovery-compact",
  open: openDiscoveryDetail,
  state: "discovery",
  viewport: currentBaselineViewports.compact,
});

const observations = [
  installedWide,
  installedCompact,
  discoveryWide,
  discoveryCompact,
];
if (
  installedWide.state !== "installed" ||
  !installedWide.actions.tryNow ||
  installedWide.suggestions.count < 1 ||
  !installedWide.apps.mounted ||
  !installedWide.information.mounted ||
  !actionsMenu.itemLabels.includes("Uninstall") ||
  connectionMenu.itemLabels.join("|") !== "Reconnect|Disconnect" ||
  discoveryWide.state !== "discovery" ||
  !discoveryWide.actions.installPlugin ||
  discoveryWide.suggestions.count < 1 ||
  !discoveryWide.apps.mounted ||
  !discoveryWide.information.mounted ||
  installedBottomScroll.scrollTop <= 0 ||
  discoveryBottomScroll.scrollTop <= 0 ||
  !installedBottom.privacyDisclosureVisible ||
  !discoveryBottom.privacyDisclosureVisible ||
  observations.some(
    (observation) =>
      Math.abs(observation.horizontalOverflow) > 1 ||
      !observation.scroller ||
      observation.informationLabels.length !== 4,
  ) ||
  installedWide.viewport.width !== currentBaselineViewports.wide.width ||
  installedCompact.viewport.width !== currentBaselineViewports.compact.width
) {
  throw new Error(
    `The current plugin-detail contract was not reached: ${JSON.stringify({ actionsMenu, connectionMenu, discoveryBottom, discoveryBottomScroll, discoveryCompact, discoveryWide, installedBottom, installedBottomScroll, installedCompact, installedWide })}`,
  );
}

await page.setViewportSize(initialViewport);
await writeFile(
  recordPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      baseline: fingerprint,
      isolation: {
        cdpAddress: "127.0.0.1",
        cdpPort: port,
        mainCodexProcessPreserved: true,
        ownerPid: Number(owners[0].pid),
        profileKind: "unique-private-tmp-profile",
      },
      pluginDetail: {
        actionsMenu,
        connectionMenu,
        discoveryBottom,
        discoveryBottomScroll,
        discoveryCompact,
        discoveryWide,
        installedBottom,
        installedBottomScroll,
        installedCompact,
        installedWide,
      },
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
await browser.close();
console.log(recordPath);
