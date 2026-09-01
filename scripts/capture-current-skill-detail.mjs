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

// Capture-only. This helper opens one existing installed skill, its transient
// actions menu, and the unsent Try now draft in an isolated current-build
// process. It never toggles, opens, reveals, copies, uninstalls, or submits.

const port = Number(process.env.CODEX_CURRENT_SKILL_DETAIL_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_SKILL_DETAIL_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_SKILL_DETAIL_OUTPUT_DIR;
const installedLabel =
  process.env.CODEX_CURRENT_SKILL_DETAIL_INSTALLED_LABEL?.trim();
const allowCapture =
  process.env.CODEX_CURRENT_SKILL_DETAIL_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated skill-detail CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated skill-detail profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set the absolute skill-detail output directory.");
}
if (!installedLabel || installedLabel.length > 120) {
  throw new Error("Set one bounded installed skill label.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_SKILL_DETAIL_ALLOW_CAPTURE=1 to authorize read-only skill-detail capture.",
  );
}

const profile = await realpath(requestedProfile);
const outputDirectory = resolve(requestedOutputDirectory);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The skill-detail profile must be isolated under /private/tmp.");
}
if (
  dirname(outputDirectory) !== profile ||
  !basename(outputDirectory).startsWith("current-skill-detail-capture-")
) {
  throw new Error(
    "The output must be a current-skill-detail-capture-* direct child of the isolated profile.",
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
  throw new Error("Every skill-detail CDP listener must be loopback-only.");
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
  throw new Error("The isolated skill-detail CDP owner is ambiguous.");
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
  const candidates = inspectedPages.filter(
    (candidate) =>
      candidate.url === "app://-/index.html" &&
      candidate.area >= 720 * 680 &&
      candidate.visibleControls >= 8,
  );
  if (candidates.length !== 1) throw error;
  [selected] = candidates;
}
const page = selected.page;
page.setDefaultTimeout(8_000);
await page.bringToFront();
const initialViewport = await page.evaluate(() => ({
  height: innerHeight,
  width: innerWidth,
}));

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
const blur = () =>
  page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
const openSkillsIndex = async () => {
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const currentSkillsHeading = page.getByRole("heading", {
    exact: true,
    name: "Skills",
  });
  if (
    (await currentSkillsHeading.count()) > 0 &&
    (await currentSkillsHeading.first().isVisible())
  ) {
    await page.evaluate(async () => document.fonts.ready);
    return;
  }
  const plugins = page.getByRole("button", { exact: true, name: "Plugins" });
  let sidebarTrigger;
  for (let index = 0; index < (await plugins.count()); index += 1) {
    const candidate = plugins.nth(index);
    const bounds = await candidate.boundingBox();
    if (bounds && bounds.x < 330 && bounds.y >= 40 && (await candidate.isVisible())) {
      sidebarTrigger = candidate;
      break;
    }
  }
  if (!sidebarTrigger) throw new Error("The Plugins sidebar route is unavailable.");
  await sidebarTrigger.click({ force: true });
  await page.getByRole("heading", { exact: true, name: "Plugins" }).waitFor();
  await page.getByRole("button", { exact: true, name: "Skills" }).click();
  await page.getByRole("heading", { exact: true, name: "Skills" }).waitFor();
  await page.evaluate(async () => document.fonts.ready);
};
const openSkill = async () => {
  await openSkillsIndex();
  const card = page.locator('[role="button"]').filter({ hasText: installedLabel });
  if ((await card.count()) !== 1) {
    throw new Error("The selected installed skill card is ambiguous.");
  }
  await card.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.getByRole("heading", { exact: true, name: installedLabel }).waitFor();
  await page.getByRole("switch", { name: "Disable skill" }).waitFor();
  await page.getByRole("button", { exact: true, name: "Try now" }).waitFor();
  await page.evaluate(async () => document.fonts.ready);
  return dialog;
};
const inspectSkill = async (state) =>
  page.evaluate(
    ({ requestedLabel, requestedState }) => {
      const rect = (target) => {
        if (!(target instanceof Element)) return null;
        const bounds = target.getBoundingClientRect();
        return {
          height: bounds.height,
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
        };
      };
      const visible = (target) =>
        target instanceof HTMLElement &&
        target.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const button = (label) =>
        [...document.querySelectorAll("button")].find(
          (candidate) =>
            visible(candidate) &&
            (candidate.getAttribute("aria-label") || candidate.textContent?.trim()) ===
              label,
        );
      const dialog = [...document.querySelectorAll('[role="dialog"]')].find(visible);
      const title = [...(dialog?.querySelectorAll("*") ?? [])].find(
        (candidate) =>
          visible(candidate) &&
          candidate.childElementCount === 0 &&
          candidate.textContent?.trim() === requestedLabel,
      );
      const artwork = dialog?.querySelector("img");
      const scrollers = [...(dialog?.querySelectorAll("*") ?? [])].filter(
        (candidate) => {
          const style = getComputedStyle(candidate);
          return (
            ["auto", "scroll"].includes(style.overflowY) &&
            candidate.scrollHeight > candidate.clientHeight
          );
        },
      );
      const scroller = scrollers[0];
      return {
        actions: {
          close: rect(button("Close dialog")),
          more: rect(button("More actions")),
          tryNow: rect(button("Try now")),
          uninstall: rect(button("Uninstall")),
        },
        artwork: rect(artwork),
        dialog: rect(dialog),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        scroller: scroller
          ? {
              clientHeight: scroller.clientHeight,
              rect: rect(scroller),
              scrollHeight: scroller.scrollHeight,
              scrollTop: scroller.scrollTop,
            }
          : null,
        state: requestedState,
        switch: {
          checked: button("Disable skill")?.getAttribute("aria-checked"),
          rect: rect(button("Disable skill")),
          role: button("Disable skill")?.getAttribute("role"),
        },
        title: rect(title),
        viewport: { height: innerHeight, width: innerWidth },
      };
    },
    { requestedLabel: installedLabel, requestedState: state },
  );

const captureOpen = async ({ name, state, viewport }) => {
  await page.setViewportSize(viewport);
  await openSkill();
  await blur();
  const observation = await inspectSkill(state);
  await page.screenshot({ path: screenshotPath(name) });
  return observation;
};

const installedWide = await captureOpen({
  name: "skill-installed-wide",
  state: "installed",
  viewport: currentBaselineViewports.wide,
});
await page.getByRole("button", { exact: true, name: "More actions" }).click();
const menu = page.getByRole("menu");
await menu.waitFor();
const actionsMenu = {
  items: await menu
    .getByRole("menuitem")
    .allTextContents()
    .then((items) => items.map((item) => item.trim())),
  rect: await metric(menu),
};
await blur();
await page.screenshot({ path: screenshotPath("skill-actions-wide") });
await page.keyboard.press("Escape");

const bottomScroll = await page.evaluate(() => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find(
    (candidate) =>
      candidate instanceof HTMLElement &&
      candidate.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
  );
  const target = [...(dialog?.querySelectorAll("*") ?? [])].find((candidate) => {
    const style = getComputedStyle(candidate);
    return (
      ["auto", "scroll"].includes(style.overflowY) &&
      candidate.scrollHeight > candidate.clientHeight
    );
  });
  if (!(target instanceof HTMLElement)) {
    throw new Error("The skill instruction scroller is unavailable.");
  }
  target.scrollTop = target.scrollHeight;
  return {
    clientHeight: target.clientHeight,
    scrollHeight: target.scrollHeight,
    scrollTop: target.scrollTop,
  };
});
const bottomWide = await inspectSkill("bottom");
await page.screenshot({ path: screenshotPath("skill-bottom-wide") });

const installedCompact = await captureOpen({
  name: "skill-installed-compact",
  state: "installed-compact",
  viewport: currentBaselineViewports.compact,
});
await page.getByRole("button", { exact: true, name: "Try now" }).click();
const draft = page.getByRole("textbox", { name: "Do anything" });
await draft.waitFor();
await page.evaluate(async () => document.fonts.ready);
const tryNowCompact = await page.evaluate((requestedLabel) => {
  const rect = (target) => {
    if (!(target instanceof Element)) return null;
    const bounds = target.getBoundingClientRect();
    return {
      height: bounds.height,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
    };
  };
  const visibleButton = (label) =>
    [...document.querySelectorAll("button")].find(
      (candidate) =>
        candidate.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
        (candidate.getAttribute("aria-label") || candidate.textContent?.trim()) ===
          label,
    );
  const textbox = document.querySelector('[role="textbox"][aria-label="Do anything"]');
  const mention = [...(textbox?.querySelectorAll("*") ?? [])].find(
    (candidate) => candidate.textContent?.trim() === requestedLabel,
  );
  return {
    addFiles: rect(visibleButton("Add files and more") ?? visibleButton("Add files")),
    contentEditable: textbox?.getAttribute("contenteditable"),
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    mention: rect(mention),
    send: rect(visibleButton("Send")),
    sendDisabled: visibleButton("Send")?.hasAttribute("disabled") ?? null,
    textIncludesSkill: textbox?.textContent?.includes(requestedLabel) ?? false,
    textbox: rect(textbox),
    viewport: { height: innerHeight, width: innerWidth },
  };
}, installedLabel);
await page.screenshot({ path: screenshotPath("skill-try-now-compact") });

const closeTo = (actual, expected, tolerance = 1) =>
  typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
if (
  !installedWide.dialog ||
  !closeTo(installedWide.dialog.left, 290) ||
  !closeTo(installedWide.dialog.top, 50) ||
  !closeTo(installedWide.dialog.width, 600) ||
  !closeTo(installedWide.dialog.height, 720) ||
  installedWide.switch.role !== "switch" ||
  installedWide.switch.checked !== "true" ||
  actionsMenu.items.join("|") !== "Open|Reveal in Finder|Copy Markdown" ||
  bottomScroll.scrollTop <= 0 ||
  !installedCompact.dialog ||
  !closeTo(installedCompact.dialog.left, 60) ||
  !closeTo(installedCompact.dialog.top, 0) ||
  !closeTo(installedCompact.dialog.width, 600) ||
  !closeTo(installedCompact.dialog.height, 680) ||
  tryNowCompact.dialogCount !== 0 ||
  tryNowCompact.contentEditable !== "true" ||
  !tryNowCompact.textIncludesSkill ||
  tryNowCompact.sendDisabled !== false ||
  !tryNowCompact.textbox ||
  observationsOverflow([installedWide, bottomWide, installedCompact])
) {
  throw new Error(
    `The current skill-detail contract was not reached: ${JSON.stringify({ actionsMenu, bottomScroll, bottomWide, installedCompact, installedWide, tryNowCompact })}`,
  );
}

function observationsOverflow(observations) {
  return observations.some(
    (observation) => Math.abs(observation.horizontalOverflow) > 1,
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
      skillDetail: {
        actionsMenu,
        bottomScroll,
        bottomWide,
        installedCompact,
        installedWide,
        tryNowCompact,
      },
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
await browser.close();
console.log(recordPath);
