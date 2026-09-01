import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentGlobalNotificationsRecord,
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only: four user-authorized disposable tasks must already exist. The
// script performs reversible Pin -> Undo actions, records only title hashes and
// notification geometry, and never submits prompts or archives tasks.

const port = Number(process.env.CODEX_CURRENT_NOTIFICATIONS_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_NOTIFICATIONS_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_NOTIFICATIONS_OUTPUT_DIR;
const allowCapture =
  process.env.CODEX_CURRENT_NOTIFICATIONS_ALLOW_CAPTURE === "1";
const taskTitleSha256s = (
  process.env.CODEX_CURRENT_NOTIFICATIONS_TASK_TITLE_SHA256S ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const round = (value) => Math.round(value * 1_000) / 1_000;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated notification CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated notification profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute notification output directory.");
}
if (
  taskTitleSha256s.length !== 4 ||
  new Set(taskTitleSha256s).size !== 4 ||
  taskTitleSha256s.some((hash) => !/^[a-f0-9]{64}$/.test(hash))
) {
  throw new Error("Set four unique disposable task-title SHA-256 values.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_NOTIFICATIONS_ALLOW_CAPTURE=1 to authorize reversible Pin and Undo actions plus regional screenshots in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The notification profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-notifications-")
) {
  throw new Error(
    "The output must be a new current-notifications-* direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readInstalledSnapshot = async () => {
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
    throw new Error("The installed app.asar changed while it was being hashed.");
  }
  return {
    bundle: {
      appAsarBytes: after.size,
      appAsarSha256,
      changedAtMs: Math.ceil(Math.max(after.ctimeMs, after.mtimeMs)),
      checkedAtMs: Date.now(),
      device: String(after.dev),
      inode: String(after.ino),
    },
    fingerprint: {
      appAsarBytes: after.size,
      appAsarSha256,
      appVersion: plistValue("CFBundleShortVersionString"),
      buildNumber: plistValue("CFBundleVersion"),
      chromiumVersion: plistValue("ChromiumBaseVersion"),
    },
  };
};
const beforeCapture = await readInstalledSnapshot();
const fingerprint = beforeCapture.fingerprint;
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
  throw new Error("Every notification CDP listener must be loopback-only.");
}

const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", pid],
      { encoding: "utf8" },
    ),
  );
const valuesFor = (argv, prefix) =>
  argv
    .filter((argument) => argument.startsWith(prefix))
    .map((argument) => argument.slice(prefix.length));
const isolatedOwners = [];
for (const listener of listeners) {
  let processInfo;
  try {
    processInfo = readProcessInfo(listener.pid);
  } catch {
    continue;
  }
  const profiles = valuesFor(processInfo.argv, "--user-data-dir=");
  if (
    processInfo.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
    valuesFor(processInfo.argv, "--remote-debugging-address=")[0] ===
      "127.0.0.1" &&
    valuesFor(processInfo.argv, "--remote-debugging-port=")[0] === String(port) &&
    profiles.length === 1 &&
    (await realpath(profiles[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated notification owner is ambiguous.");
}
const isolatedOwnerPid = isolatedOwners[0].pid;
const processStartedAt = execFileSync(
  "/bin/ps",
  ["-p", isolatedOwnerPid, "-o", "lstart="],
  { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } },
).trim();
const processStartedAtMatch = processStartedAt.match(
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
);
if (!processStartedAtMatch) {
  throw new Error(
    `Could not prove the isolated owner start time for PID ${isolatedOwnerPid}.`,
  );
}
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
].indexOf(processStartedAtMatch[1]);
const processStartedAtMs = new Date(
  Number(processStartedAtMatch[6]),
  monthIndex,
  Number(processStartedAtMatch[2]),
  Number(processStartedAtMatch[3]),
  Number(processStartedAtMatch[4]),
  Number(processStartedAtMatch[5]),
).getTime();
if (!Number.isSafeInteger(processStartedAtMs) || processStartedAtMs <= 0) {
  throw new Error(
    `Could not prove the isolated owner start time for PID ${isolatedOwnerPid}.`,
  );
}
const parentPid = (pid) =>
  execFileSync("/bin/ps", ["-p", pid, "-o", "ppid="], {
    encoding: "utf8",
  }).trim();
for (const listener of listeners) {
  if (listener.pid === isolatedOwnerPid) continue;
  const visited = new Set();
  let candidatePid = listener.pid;
  while (candidatePid !== isolatedOwnerPid && candidatePid !== "1") {
    if (!/^\d+$/.test(candidatePid) || visited.has(candidatePid)) {
      throw new Error(`Could not prove listener ancestry for PID ${listener.pid}.`);
    }
    visited.add(candidatePid);
    candidatePid = parentPid(candidatePid);
  }
  if (candidatePid !== isolatedOwnerPid) {
    throw new Error(`Listener PID ${listener.pid} is outside the isolated app tree.`);
  }
}

await mkdir(outputDirectory, { mode: 0o700 });
const recordCandidateUrl = (url) => {
  if (
    url === "app://-/index.html" ||
    url === "app://-/index.html?initialRoute=%2Favatar-overlay"
  ) {
    return url;
  }
  if (url.startsWith("app://-/index.html?")) {
    return "app://-/index.html?redacted";
  }
  return "non-app-page";
};
const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visible = (element) =>
      element instanceof HTMLElement &&
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
      visibleControls: [...document.querySelectorAll("button, a")].filter(
        visible,
      ).length,
    };
  });
  return { index, page, url: page.url(), ...structure };
};
const normalizeNotification = (notification) => ({
  ...notification,
  iconSha256s: notification.iconPaths.map((paths) =>
    sha256(JSON.stringify(paths)),
  ),
  iconPaths: undefined,
});
const screenshotRegion = async (page, notifications, name) => {
  const visible = notifications.filter((notification) => notification.visible);
  const left = Math.floor(Math.min(...visible.map(({ rect }) => rect.left)) - 4);
  const top = Math.floor(Math.min(...visible.map(({ rect }) => rect.top)) - 4);
  const right = Math.ceil(Math.max(...visible.map(({ rect }) => rect.right)) + 4);
  const bottom = Math.ceil(
    Math.max(...visible.map(({ rect }) => rect.bottom)) + 4,
  );
  const path = join(outputDirectory, name);
  await page.screenshot({
    clip: { height: bottom - top, width: right - left, x: left, y: top },
    path,
  });
  const contents = await readFile(path);
  const png = PNG.sync.read(contents);
  return { height: png.height, name, sha256: sha256(contents), width: png.width };
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let captureError;
let cleanupError;
let successSummary;
let page;
let tasks = [];
const resolveTasks = async () => {
  const rows = page.locator("[data-app-action-sidebar-thread-title]");
  const observed = [];
  for (let index = 0; index < (await rows.count()); index += 1) {
    const title = await rows.nth(index).getAttribute(
      "data-app-action-sidebar-thread-title",
    );
    if (!title) continue;
    const titleSha256 = sha256(title);
    if (taskTitleSha256s.includes(titleSha256)) observed.push({ title, titleSha256 });
  }
  if (
    observed.length !== 4 ||
    new Set(observed.map(({ titleSha256 }) => titleSha256)).size !== 4
  ) {
    throw new Error("Could not resolve exactly four disposable notification tasks.");
  }
  return taskTitleSha256s.map((titleSha256) => {
    const title = observed.find((candidate) => candidate.titleSha256 === titleSha256)
      ?.title;
    if (!title) throw new Error(`Missing disposable title hash ${titleSha256}.`);
    return { locator: page.getByLabel(title, { exact: true }), titleSha256 };
  });
};
const pinnedState = async (task) =>
  (await task.locator.getAttribute("data-app-action-sidebar-thread-pinned")) ===
  "true";
const waitForPinnedState = async (task, pinned) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await pinnedState(task)) === pinned) return;
    await page.waitForTimeout(100);
  }
  throw new Error(
    `Disposable notification task did not reach pinned=${pinned}: ${task.titleSha256}`,
  );
};
const setTaskPinned = async (task, pinned) => {
  if ((await pinnedState(task)) === pinned) return;
  await task.locator.scrollIntoViewIfNeeded();
  await task.locator.hover();
  await task.locator
    .getByRole("button", {
      exact: true,
      name: pinned ? "Pin chat" : "Unpin chat",
    })
    .click();
  await waitForPinnedState(task, pinned);
};
const collect = () =>
  page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return Object.fromEntries(
        ["bottom", "height", "left", "right", "top", "width"].map((key) => [
          key,
          Math.round(value[key] * 1_000) / 1_000,
        ]),
      );
    };
    const style = (element) => {
      const value = getComputedStyle(element);
      return {
        backgroundColor: value.backgroundColor,
        borderColor: value.borderColor,
        borderRadius: value.borderRadius,
        boxShadow: value.boxShadow,
        color: value.color,
        fontFamily: value.fontFamily,
        fontSize: value.fontSize,
        fontWeight: value.fontWeight,
        lineHeight: value.lineHeight,
        opacity: value.opacity,
        padding: value.padding,
        pointerEvents: value.pointerEvents,
        transform: value.transform,
      };
    };
    const toaster = document.querySelector("[data-sonner-toaster]");
    const region = toaster?.parentElement;
    const notifications = [...document.querySelectorAll("[data-sonner-toast]")].map(
      (notification) => {
        const alert = [notification, ...notification.querySelectorAll("*")].find(
          (element) => getComputedStyle(element).backgroundColor === "rgb(1, 28, 11)",
        );
        return {
          alert: alert ? { rect: rect(alert), style: style(alert) } : null,
          dismissible: notification.getAttribute("data-dismissible") === "true",
          expanded: notification.getAttribute("data-expanded") === "true",
          front: notification.getAttribute("data-front") === "true",
          iconPaths: [...notification.querySelectorAll("svg")].map((svg) =>
            [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d")),
          ),
          index: Number(notification.getAttribute("data-index")),
          mounted: notification.getAttribute("data-mounted") === "true",
          promise: notification.getAttribute("data-promise") === "true",
          rect: rect(notification),
          removed: notification.getAttribute("data-removed") === "true",
          style: style(notification),
          swipeOut: notification.getAttribute("data-swipe-out") === "true",
          swiped: notification.getAttribute("data-swiped") === "true",
          swiping: notification.getAttribute("data-swiping") === "true",
          tabIndex: notification.tabIndex,
          text: notification.innerText.trim(),
          visible: notification.getAttribute("data-visible") === "true",
        };
      },
    );
    return {
      notifications,
      region: toaster && region
        ? {
            ariaAtomic: region.getAttribute("aria-atomic"),
            ariaLabel: region.getAttribute("aria-label"),
            ariaLive: region.getAttribute("aria-live"),
            ariaRelevant: region.getAttribute("aria-relevant"),
            frontToastHeight: toaster.style.getPropertyValue(
              "--front-toast-height",
            ),
            gap: toaster.style.getPropertyValue("--gap"),
            rect: rect(toaster),
            sonnerTheme: toaster.getAttribute("data-sonner-theme"),
            xPosition: toaster.getAttribute("data-x-position"),
            yPosition: toaster.getAttribute("data-y-position"),
          }
        : null,
    };
  });

try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(pages.map(inspectCandidate));
  const selected = selectCurrentMainCandidate(candidates);
  page = selected.page;
  await page.bringToFront();
  await page.setViewportSize(currentBaselineViewports.wide);
  await page.mouse.move(
    currentBaselineViewports.wide.width - 8,
    currentBaselineViewports.wide.height - 8,
  );
  const showSidebar = page.locator('button[aria-label="Show sidebar"]:visible');
  if ((await showSidebar.count()) === 1) await showSidebar.click();
  await page.waitForFunction(
    () => document.querySelectorAll("[data-app-action-sidebar-thread-title]").length > 0,
  );
  tasks = await resolveTasks();
  for (const task of tasks) {
    const title = await task.locator.getAttribute(
      "data-app-action-sidebar-thread-title",
    );
    if (!title || (await task.locator.count()) !== 1) {
      throw new Error("A disposable notification task is not uniquely addressable.");
    }
  }
  const initial = await Promise.all(tasks.map(pinnedState));
  if (initial.some(Boolean)) {
    throw new Error("Every disposable notification task must begin unpinned.");
  }
  await page.waitForFunction(
    () => document.querySelectorAll("[data-sonner-toast]").length === 0,
    null,
    { timeout: 15_000 },
  );
  for (const task of tasks) await setTaskPinned(task, true);
  const pinned = await Promise.all(tasks.map(pinnedState));
  await page.waitForFunction(
    () => document.querySelectorAll("[data-sonner-toast]").length === 0,
    null,
    { timeout: 15_000 },
  );
  await tasks.at(-1).locator.click();
  for (let index = 0; index < tasks.length; index += 1) {
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(120);
  }
  await Promise.all(tasks.map((task) => waitForPinnedState(task, false)));
  await page.waitForFunction(
    () => document.querySelectorAll("[data-sonner-toast]").length >= 4,
    null,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(300);
  const collapsedObservation = await collect();
  const collapsed = collapsedObservation.notifications.map(
    normalizeNotification,
  );
  const collapsedScreenshot = await screenshotRegion(
    page,
    collapsed,
    "notification-stack-collapsed.png",
  );
  await page.locator("[data-sonner-toast]").first().hover();
  await page.waitForTimeout(500);
  const expandedObservation = await collect();
  const expanded = expandedObservation.notifications.map(normalizeNotification);
  const expandedScreenshot = await screenshotRegion(
    page,
    expanded,
    "notification-stack-expanded.png",
  );
  const restored = await Promise.all(tasks.map(pinnedState));
  const afterCapture = await readInstalledSnapshot();
  if (JSON.stringify(afterCapture.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error("The installed build changed during notification capture.");
  }
  const record = {
    captureKind: "renderer_cdp",
    collapsed,
    expanded,
    fingerprint,
    privacyBoundary:
      "four-disposable-task-title-hashes-and-notification-geometry-only",
    profileOwnerPid: Number(isolatedOwnerPid),
    region: collapsedObservation.region,
    runtimeBundleIdentity: {
      afterCapture: afterCapture.bundle,
      beforeCapture: beforeCapture.bundle,
      ownerPid: Number(isolatedOwnerPid),
      processStartedAtMs,
    },
    schemaVersion: 1,
    screenshots: {
      collapsed: collapsedScreenshot,
      expanded: expandedScreenshot,
    },
    targetSelection: {
      candidates: candidates.map(({ page: _page, url, ...candidate }) => ({
        ...candidate,
        url: recordCandidateUrl(url),
      })),
      selected: {
        area: selected.area,
        index: selected.index,
        landmarks: selected.landmarks,
        url: recordCandidateUrl(selected.url),
        visibleControls: selected.visibleControls,
      },
    },
    taskState: { initial, pinned, restored },
    taskTitleSha256s,
    viewport: currentBaselineViewports.wide,
  };
  assertCurrentGlobalNotificationsRecord(record);
  record.sha256 = sha256(JSON.stringify(record));
  await writeFile(
    join(outputDirectory, "notifications.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  successSummary = {
    fingerprint,
    outputDirectory,
    recordSha256: record.sha256,
    stack: collapsed.map(({ rect, visible }) => ({
      top: round(rect.top),
      visible,
      width: round(rect.width),
    })),
  };
} catch (error) {
  captureError = error;
} finally {
  try {
    if (page) {
      await page.mouse.move(
        currentBaselineViewports.wide.width - 8,
        currentBaselineViewports.wide.height - 8,
      );
      for (const task of tasks) {
        if (await pinnedState(task)) await setTaskPinned(task, false);
      }
    }
  } catch (error) {
    cleanupError = error;
  }
  await browser.close();
}
if (captureError && cleanupError) {
  throw new AggregateError(
    [captureError, cleanupError],
    "Notification capture and reversible cleanup both failed.",
  );
}
if (cleanupError) {
  throw new Error(
    `Notification reversible cleanup failed: ${cleanupError.message}`,
    { cause: cleanupError },
  );
}
if (captureError) throw captureError;
console.log(JSON.stringify(successSummary));
