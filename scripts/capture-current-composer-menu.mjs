import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { PNG } from "../playgrounds/codex-app/node_modules/pngjs/lib/png.js";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentLatestInstalledCandidateBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

const port = Number(process.env.CODEX_CURRENT_COMPOSER_MENU_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_COMPOSER_MENU_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_COMPOSER_MENU_OUTPUT_DIR;
const allowCapture = process.env.CODEX_CURRENT_COMPOSER_MENU_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const publicOptions = [
  ["files", "Files and folders", null],
  ["project", "Work in a project", "Choose project for new chats"],
  ["goal", "Goal", "Set a goal to keep pursuing"],
  ["plan", "Plan mode", "Turn plan mode on"],
  ["record-skill", "Record a skill", null],
  ["sketch", "Sketch", "Draw a sketch"],
  ["github", "GitHub", "Triage PRs, issues, CI, and publish flows"],
  ["documents", "Documents", "Create and edit documents"],
  ["pdf", "PDF", "Read, create, and verify PDFs"],
  ["spreadsheets", "Spreadsheets", "Create and edit spreadsheets"],
  ["presentations", "Presentations", "Create and edit presentations"],
  [
    "template-creator",
    "Template Creator",
    "Create or update reusable templates from reference content",
  ],
  ["browser", "Browser", "Control the in-app browser"],
  ["computer", "Computer", "Control Mac apps from ChatGPT"],
  ["visualize", "Visualize", "Create interactive visuals"],
  ["watch-pr", "Watch PR", "Drive GitHub bot review rounds to a clean pass."],
  [
    "appkit-inspector",
    "AppKit Inspector",
    "Inspect native macOS views in Codex Browser.",
  ],
  ["plugin-management", "Plugin Management", "Discover and manage plugins"],
  ["sites", "Sites", "Build and deploy websites"],
];
const publicByText = new Map(
  publicOptions.map(([id, title, description]) => [
    JSON.stringify([title, description]),
    id,
  ]),
);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated Composer-menu CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated Composer-menu profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute Composer-menu output directory.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_COMPOSER_MENU_ALLOW_CAPTURE=1 for read-only New chat menu observation.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The Composer-menu profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-composer-menu-")
) {
  throw new Error(
    "The capture output must be a direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readBundleSnapshot = async () => {
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
    throw new Error("The installed app.asar changed during capture.");
  }
  return {
    appAsarBytes: after.size,
    appAsarSha256,
    appVersion: plistValue("CFBundleShortVersionString"),
    buildNumber: plistValue("CFBundleVersion"),
    chromiumVersion: plistValue("ChromiumBaseVersion"),
  };
};

const fingerprint = await readBundleSnapshot();
if (
  Object.entries(currentLatestInstalledCandidateBaselineFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint is not the expected 26.917.71314 candidate: ${JSON.stringify(fingerprint)}`,
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
  throw new Error("The isolated Composer-menu CDP listener must be loopback-only.");
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
  argv
    .filter((argument) => argument.startsWith(prefix))
    .map((value) => value.slice(prefix.length));
const isolatedOwners = [];
for (const listener of listeners) {
  let info;
  try {
    info = readProcessInfo(listener.pid);
  } catch {
    continue;
  }
  const profiles = valueFor(info.argv, "--user-data-dir=");
  if (
    info.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
    valueFor(info.argv, "--remote-debugging-address=")[0] === "127.0.0.1" &&
    valueFor(info.argv, "--remote-debugging-port=")[0] === String(port) &&
    profiles.length === 1 &&
    (await realpath(profiles[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated Composer-menu CDP owner is ambiguous.");
}
const ownerPid = Number(isolatedOwners[0].pid);
const processStartedAt = execFileSync(
  "/bin/ps",
  ["-p", String(ownerPid), "-o", "lstart="],
  { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } },
).trim();
const processStartedAtMatch = processStartedAt.match(
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
);
const monthIndex = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
].indexOf(processStartedAtMatch?.[1] ?? "");
const processStartedAtMs = new Date(
  Number(processStartedAtMatch?.[6]),
  monthIndex,
  Number(processStartedAtMatch?.[2]),
  Number(processStartedAtMatch?.[3]),
  Number(processStartedAtMatch?.[4]),
  Number(processStartedAtMatch?.[5]),
).getTime();
if (!Number.isSafeInteger(processStartedAtMs) || processStartedAtMs <= 0) {
  throw new Error("Could not verify the isolated Composer-menu process start time.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const screenshots = [];
let captureError;
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(
    pages.map(async (page, index) => {
      const structure = await page.evaluate(() => {
        const visible = (element) =>
          element instanceof Element &&
          element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        return {
          area: innerWidth * innerHeight,
          landmarks: {
            main: document.querySelectorAll("main").length,
            nav: document.querySelectorAll("nav").length,
            sidebarTrigger: document.querySelectorAll(
              '[aria-label="Hide sidebar"], [aria-label="Show sidebar"]',
            ).length,
            textbox: document.querySelectorAll(
              'textarea, [contenteditable="true"], [role="textbox"]',
            ).length,
          },
          visibleControls: [...document.querySelectorAll("button, a")].filter(visible).length,
        };
      });
      return { index, page, url: page.url(), ...structure };
    }),
  );
  const selected = selectCurrentMainCandidate(candidates);
  const page = selected.page;
  await page.bringToFront();
  await page.evaluate(async () => document.fonts.ready);

  const waitForSidebar = async (visible) => {
    await page.waitForFunction(
      (expected) => {
        const nav = document.querySelector("nav");
        return nav instanceof Element
          ? nav.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) === expected
          : !expected;
      },
      visible,
      { timeout: 10_000 },
    );
  };
  const setSidebar = async (visible) => {
    const label = visible ? "Show sidebar" : "Hide sidebar";
    const control = page.locator(`button[aria-label="${label}"]:visible`);
    if ((await control.count()) === 1) {
      await control.click();
      await waitForSidebar(visible);
    }
  };
  const newChatVisible = await page
    .locator('[data-testid="home-icon"]:visible')
    .count();
  if (newChatVisible !== 1) {
    await setSidebar(true);
    const newChat = page.locator("nav").getByText("New chat", { exact: true });
    if ((await newChat.count()) !== 1) {
      throw new Error("The fixed New chat destination was not unique.");
    }
    await newChat.click();
    await page.locator('[data-testid="home-icon"]:visible').waitFor();
  }

  const captures = [];
  for (const [name, viewport] of [
    ["dark-wide", currentBaselineViewports.wide],
    ["dark-compact", currentBaselineViewports.compact],
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => document.fonts.ready);
    await setSidebar(name === "dark-wide");
    const trigger = page.locator('button[aria-label="Add files and more"]:visible');
    if ((await trigger.count()) !== 1) {
      throw new Error("The New chat Add-files trigger was not unique.");
    }
    await trigger.click();
    const menu = page.locator(
      '[data-composer-overlay-floating-ui="true"] .composer-home-top-menu:visible',
    );
    await menu.waitFor({ timeout: 10_000 });
    await page.waitForFunction(
      () => {
        const element = document.querySelector(
          '[data-composer-overlay-floating-ui="true"] .composer-home-top-menu',
        );
        return (
          element instanceof HTMLElement &&
          !element.textContent?.includes("Loading plugins...")
        );
      },
      undefined,
      { timeout: 15_000 },
    );
    await menu.evaluate((element) => {
      const owner = [...element.querySelectorAll("*")].find(
        (candidate) =>
          ["auto", "scroll"].includes(getComputedStyle(candidate).overflowY) &&
          candidate.scrollHeight > candidate.clientHeight,
      );
      if (owner instanceof HTMLElement) owner.scrollTop = 0;
    });
    await page.waitForTimeout(100);

    const observed = await menu.evaluate((element, options) => {
      const publicByText = new Map(
        options.map(([id, title, description]) => [
          JSON.stringify([title, description]),
          id,
        ]),
      );
      const bounds = (node) => {
        const rect = node.getBoundingClientRect();
        return {
          height: Math.round(rect.height * 10000) / 10000,
          left: Math.round(rect.left * 10000) / 10000,
          top: Math.round(rect.top * 10000) / 10000,
          width: Math.round(rect.width * 10000) / 10000,
        };
      };
      const styleFor = (node) => {
        if (!(node instanceof Element)) return null;
        const style = getComputedStyle(node);
        return {
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
          lineHeight: style.lineHeight,
          rect: bounds(node),
        };
      };
      const rows = [...element.querySelectorAll('button[data-list-navigation-item="true"]')];
      const scrollOwner = [...element.querySelectorAll("*")].find(
        (candidate) =>
          ["auto", "scroll"].includes(getComputedStyle(candidate).overflowY) &&
          candidate.scrollHeight > candidate.clientHeight,
      );
      const computed = getComputedStyle(element);
      const opacityChain = [];
      for (
        let ancestor = element;
        ancestor instanceof HTMLElement && opacityChain.length < 4;
        ancestor = ancestor.parentElement
      ) {
        opacityChain.push(getComputedStyle(ancestor).opacity);
      }
      const colorScheme = getComputedStyle(document.documentElement).colorScheme;
      const rowData = rows.map((row) => {
        const title =
          row.querySelector("span.min-w-0.truncate.shrink-0") ??
          row.querySelector("span.flex-1.min-w-0.truncate");
        const description = row.querySelector("span.text-codex-description");
        const icon = row.querySelector("svg, img, [aria-hidden='true']");
        const key = JSON.stringify([
          title?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          description?.textContent?.replace(/\s+/g, " ").trim() || null,
        ]);
        const id = publicByText.get(key);
        const rect = bounds(row);
        return {
          id: id ?? null,
          rect: {
            ...rect,
            top: Math.round((rect.top - bounds(element).top) * 10000) / 10000,
          },
          disabled: row.disabled || row.getAttribute("aria-disabled") === "true",
          style: id
            ? {
                description: styleFor(description),
                icon: icon
                  ? {
                      color: getComputedStyle(icon).color,
                      rect: bounds(icon),
                      tagName: icon.firstElementChild?.tagName ?? icon.tagName,
                    }
                  : null,
                label: styleFor(title),
                row: styleFor(row),
              }
            : null,
        };
      });
      const width = bounds(element).width;
      return {
        backgroundColor: computed.backgroundColor,
        backdropFilter: computed.backdropFilter,
        borderColor: computed.borderColor,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        colorScheme,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        opacityChain,
        height: bounds(element).height,
        rect: bounds(element),
        rowHeight: rowData.find((row) => row.id)?.rect.height ?? null,
        rows: rowData,
        scrollOwner: scrollOwner
          ? {
              clientHeight: scrollOwner.clientHeight,
              scrollHeight: scrollOwner.scrollHeight,
            }
          : null,
        width,
      };
    }, publicOptions);
    if (
      observed.colorScheme !== "dark" ||
      observed.backgroundColor !== "rgb(45, 45, 45)" ||
      observed.borderRadius !== "20px" ||
      observed.width !== (name === "dark-wide" ? 736 : 687) ||
      observed.height !== 320 ||
      observed.rowHeight !== 28.5625 ||
      !observed.scrollOwner ||
      observed.rows.length === 0
    ) {
      throw new Error("The current Composer-menu structural contract changed.");
    }
    const masks = [];
    const rowLocator = menu.locator('button[data-list-navigation-item="true"]');
    for (let index = 0; index < (await rowLocator.count()); index += 1) {
      if (!observed.rows[index]?.id) masks.push(rowLocator.nth(index));
    }
    const fileName = `${name}.png`;
    const imagePath = resolve(outputDirectory, fileName);
    const image = await menu.screenshot({
      animations: "disabled",
      mask: masks,
      maskColor: "#3a3a3a",
      path: imagePath,
    });
    const png = PNG.sync.read(image);
    captures.push({ name, fileName, image, observed, png });
    screenshots.push({
      byteLength: image.byteLength,
      fileName,
      height: png.height,
      sha256: createHash("sha256").update(image).digest("hex"),
      width: png.width,
    });
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    observed.focusAfterDismissal = await trigger.evaluate((element) => {
      const target = document.activeElement;
      return {
        restoredToTrigger: target === element,
        role: target instanceof Element ? target.getAttribute("role") : null,
        tagName: target instanceof Element ? target.tagName : null,
      };
    });
  }

  const after = await readBundleSnapshot();
  if (
    Object.entries(fingerprint).some(([key, value]) => after[key] !== value)
  ) {
    throw new Error("The installed app.asar changed during the capture.");
  }
  const record = {
    baseline: {
      ...fingerprint,
      capturedAt: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
      }).format(new Date()),
    },
    captureKind: "read-only Renderer menu screenshot with non-allowlisted rows masked",
    mainRenderer: { selectedUrl: selected.url, candidateCount: candidates.length },
    mutatedTaskState: false,
    nativeWindowResized: false,
    productScreenshots: "local-only-not-committed",
    rowObservationScope:
      "currently materialized Renderer rows only; virtualized rows may be omitted",
    runtimeIdentity: {
      ownerPid,
      processStartedAtMs,
    },
    states: captures.map(({ name, observed, png }) => ({
      name,
      menu: {
        backdropFilter: observed.backdropFilter,
        backgroundColor: observed.backgroundColor,
        borderColor: observed.borderColor,
        borderRadius: observed.borderRadius,
        boxShadow: observed.boxShadow,
        fontFamily: observed.fontFamily,
        fontSize: observed.fontSize,
        fontWeight: observed.fontWeight,
        height: observed.height,
        lineHeight: observed.lineHeight,
        opacityChain: observed.opacityChain,
        rect: observed.rect,
        rowHeight: observed.rowHeight,
        scrollOwner: observed.scrollOwner,
        width: observed.width,
      },
      focusAfterDismissal: observed.focusAfterDismissal,
      publicAndRedactedOrder: observed.rows.map((row) => row.id ?? "redacted"),
      redactedSlots: observed.rows.flatMap((row, index) =>
        row.id
          ? []
          : [{
              afterPublicId:
                [...observed.rows.slice(0, index)].reverse().find((item) => item.id)?.id ?? null,
              beforePublicId:
                observed.rows.slice(index + 1).find((item) => item.id)?.id ?? null,
              disabled: row.disabled,
              height: row.rect.height,
              top: row.rect.top,
              width: row.rect.width,
            }],
      ),
      publicRowStyles: observed.rows.flatMap((row) =>
        row.id ? [{ id: row.id, ...row.style }] : [],
      ),
      screenshotSize: { height: png.height, width: png.width },
    })),
    schemaVersion: 1,
    submittedPrompt: false,
  };
  await writeFile(
    resolve(outputDirectory, "record.json"),
    `${JSON.stringify({ ...record, screenshots }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );
  process.stdout.write(`${JSON.stringify({
    outputDirectory,
    runtime: { appVersion: fingerprint.appVersion, buildNumber: fingerprint.buildNumber },
    screenshots,
    renderedRedactedRowCounts: Object.fromEntries(
      record.states.map((state) => [state.name, state.redactedSlots.length]),
    ),
    mutatedTaskState: false,
    passed: true,
  })}\n`);
} catch (error) {
  captureError = error;
} finally {
  await browser.close();
}
if (captureError) throw captureError;
