import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only. This helper opens one existing thread in an isolated current-
// build process, records the renderer trigger, and verifies that Chat actions
// is a native macOS menu rather than a renderer overlay. It never selects a
// native menu item or mutates, archives, shares, forks, schedules, or opens a
// thread externally.

const port = Number(process.env.CODEX_CURRENT_THREAD_OVERFLOW_CDP_PORT);
const requestedProfile = process.env.CODEX_CURRENT_THREAD_OVERFLOW_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_THREAD_OVERFLOW_OUTPUT_DIR;
const requestedTaskTitleSha256 =
  process.env.CODEX_CURRENT_THREAD_OVERFLOW_TASK_TITLE_SHA256?.trim();
const allowCapture =
  process.env.CODEX_CURRENT_THREAD_OVERFLOW_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated thread-overflow CDP port.");
}
if (!requestedProfile?.startsWith("/") || /\s/.test(requestedProfile)) {
  throw new Error("Set the absolute isolated thread-overflow profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set the absolute thread-overflow output directory.");
}
if (!/^[a-f0-9]{64}$/.test(requestedTaskTitleSha256 ?? "")) {
  throw new Error("Set one SHA-256 task-title selector.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_THREAD_OVERFLOW_ALLOW_CAPTURE=1 to authorize read-only thread-overflow capture.",
  );
}

const profile = await realpath(requestedProfile);
const outputDirectory = resolve(requestedOutputDirectory);
if (!profile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The thread-overflow profile must be isolated under /private/tmp.");
}
if (
  dirname(outputDirectory) !== profile ||
  !basename(outputDirectory).startsWith("current-thread-overflow-capture-")
) {
  throw new Error(
    "The output must be a current-thread-overflow-capture-* direct child of the isolated profile.",
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
  throw new Error("Every thread-overflow CDP listener must be loopback-only.");
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
  throw new Error("The isolated thread-overflow CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
const inspectedPages = await Promise.all(
  browser
    .contexts()
    .flatMap((context) => context.pages())
    .map(async (page, index) => ({
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
    })),
);
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
await page.setViewportSize(currentBaselineViewports.wide);

const taskCandidates = page.locator("button, [role=button]");
const taskCandidateTexts = await taskCandidates.evaluateAll((elements) =>
  elements.map((element, index) => {
    const bounds = element.getBoundingClientRect();
    const visible =
      element instanceof HTMLElement &&
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    return {
      index,
      text: visible && bounds.left < 330 ? element.textContent?.trim() ?? "" : "",
    };
  }),
);
const matchingTaskIndexes = taskCandidateTexts
  .filter(({ text }) => text.length > 0 && text.length <= 240)
  .filter(
    ({ text }) =>
      createHash("sha256").update(text).digest("hex") ===
      requestedTaskTitleSha256,
  )
  .map(({ index }) => index);
if (matchingTaskIndexes.length !== 1) {
  throw new Error("The SHA-selected task is unavailable or ambiguous.");
}
await taskCandidates.nth(matchingTaskIndexes[0]).click();
const trigger = page.getByRole("button", { name: "Chat actions" });
await trigger.waitFor();
await page.evaluate(async () => document.fonts.ready);

const inspectTrigger = async (viewportName) => {
  const observation = await trigger.evaluate((element, requestedViewportName) => {
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      padding: style.padding,
      rect: {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      },
      rendererMenuCount: document.querySelectorAll('[role="menu"]').length,
      viewport: { height: innerHeight, name: requestedViewportName, width: innerWidth },
    };
  }, viewportName);
  await page.screenshot({ path: screenshotPath(`thread-trigger-${viewportName}`) });
  await trigger.click();
  await page.waitForTimeout(200);
  observation.rendererMenuCountAfterOpen = await page
    .locator('[role="menu"]')
    .count();
  await page.keyboard.press("Escape");
  return observation;
};

const wide = await inspectTrigger("wide");
await page.setViewportSize(currentBaselineViewports.compact);
await trigger.waitFor();
const compact = await inspectTrigger("compact");
const closeTo = (actual, expected, tolerance = 1) =>
  typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
if (
  wide.viewport.width !== 1180 ||
  wide.viewport.height !== 820 ||
  compact.viewport.width !== 720 ||
  compact.viewport.height !== 680 ||
  !closeTo(wide.rect.top, 9) ||
  !closeTo(compact.rect.top, 9) ||
  !closeTo(wide.rect.width, 28) ||
  !closeTo(wide.rect.height, 28) ||
  !closeTo(compact.rect.width, 28) ||
  !closeTo(compact.rect.height, 28) ||
  wide.rendererMenuCount !== 0 ||
  compact.rendererMenuCount !== 0 ||
  wide.rendererMenuCountAfterOpen !== 0 ||
  compact.rendererMenuCountAfterOpen !== 0
) {
  throw new Error(
    `The current native thread-overflow contract was not reached: ${JSON.stringify({ compact, wide })}`,
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
      taskSelectorSha256: requestedTaskTitleSha256,
      threadOverflow: {
        compact,
        menuLayer: "native-macos-menu",
        wide,
      },
    },
    null,
    2,
  )}\n`,
  { mode: 0o600 },
);
await browser.close();
console.log(recordPath);
