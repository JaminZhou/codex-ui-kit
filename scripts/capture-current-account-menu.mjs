import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentAccountMenuRecord,
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

const port = Number(process.env.CODEX_CURRENT_ACCOUNT_MENU_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_ACCOUNT_MENU_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_ACCOUNT_MENU_OUTPUT_DIR;
const allowPreferences =
  process.env.CODEX_CURRENT_ACCOUNT_MENU_ALLOW_PREFERENCES === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated account-menu CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated account-menu profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute account-menu output directory.");
}
if (!allowPreferences) {
  throw new Error(
    "Set CODEX_CURRENT_ACCOUNT_MENU_ALLOW_PREFERENCES=1 to authorize fixed theme and route changes in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The account-menu profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-account-menu-")
) {
  throw new Error(
    "The output must be a new current-account-menu-* direct child of the isolated profile.",
  );
}

const plistValue = (key) =>
  execFileSync("/usr/bin/plutil", ["-extract", key, "raw", appInfoPlist], {
    encoding: "utf8",
  }).trim();
const readInstalledSnapshot = async () => {
  const before = await stat(appAsar);
  const asarSha256 = execFileSync(
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
      appAsarSha256: asarSha256,
      changedAtMs: Math.ceil(Math.max(after.ctimeMs, after.mtimeMs)),
      checkedAtMs: Date.now(),
      device: String(after.dev),
      inode: String(after.ino),
    },
    fingerprint: {
      appAsarBytes: after.size,
      appAsarSha256: asarSha256,
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
    (listener) =>
      listener.addresses.length !== 1 ||
      listener.addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every account-menu CDP listener must be loopback-only.");
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
  const processProfile = valuesFor(processInfo.argv, "--user-data-dir=");
  if (
    processInfo.executablePath === `${appBundle}/Contents/MacOS/ChatGPT` &&
    valuesFor(processInfo.argv, "--remote-debugging-address=")[0] ===
      "127.0.0.1" &&
    valuesFor(processInfo.argv, "--remote-debugging-port=")[0] ===
      String(port) &&
    processProfile.length === 1 &&
    (await realpath(processProfile[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated account-menu owner is ambiguous.");
}
const isolatedOwnerPid = isolatedOwners[0].pid;
const processStartedAt = execFileSync(
  "/bin/ps",
  ["-p", isolatedOwnerPid, "-o", "lstart="],
  {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  },
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

const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visibleControls = [
      ...document.querySelectorAll('a, button, [role="button"], [role="tab"]'),
    ].filter((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        bounds.right > 0 &&
        bounds.left < innerWidth &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight
      );
    }).length;
    return {
      area: innerWidth * innerHeight,
      landmarks: {
        main: document.querySelectorAll("main").length,
        nav: document.querySelectorAll("nav").length,
        appearanceThemeRadios: document.querySelectorAll(
          'input[aria-label="System"], input[aria-label="Light"], input[aria-label="Dark"]',
        ).length,
        sidebarTrigger: document.querySelectorAll(
          '[aria-label="Hide sidebar"], [aria-label="Show sidebar"]',
        ).length,
        textbox: document.querySelectorAll(
          'textarea, [contenteditable="true"], [role="textbox"]',
        ).length,
      },
      visibleControls,
    };
  });
  return { index, page, url: page.url(), ...structure };
};

const selectAccountMenuMainCandidate = (candidates) => {
  try {
    return selectCurrentMainCandidate(candidates);
  } catch (error) {
    const settingsCandidates = candidates
      .filter(
        (candidate) =>
          candidate.url === "app://-/index.html" &&
          candidate.area >= 300_000 &&
          candidate.landmarks.nav === 1 &&
          candidate.landmarks.appearanceThemeRadios === 3 &&
          candidate.visibleControls >= 10,
      )
      .sort((left, right) => right.area - left.area);
    if (
      settingsCandidates.length === 1 ||
      (settingsCandidates[0] &&
        settingsCandidates[0].area >= (settingsCandidates[1]?.area ?? 0) * 1.25)
    ) {
      return settingsCandidates[0];
    }
    throw error;
  }
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let page;
let cleanupError = null;
let captureError = null;
let restoreIsolatedState;
let successSummary;
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const candidates = await Promise.all(pages.map(inspectCandidate));
  page = selectAccountMenuMainCandidate(candidates).page;
  await page.bringToFront();
  await page.evaluate(async () => document.fonts.ready);

  const accountTriggerCandidates = () =>
    page.locator('button[aria-haspopup="menu"]:has(img):visible');
  const requireAccountTrigger = async () => {
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button[aria-haspopup="menu"]:has(img)')].some(
        (element) =>
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      ),
    );
    const candidates = accountTriggerCandidates();
    if ((await candidates.count()) !== 1) {
      throw new Error("The current account trigger is ambiguous.");
    }
    return candidates.nth(0);
  };
  const waitForStableLayout = async () => {
    let previous = null;
    let stableSamples = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const current = await page.evaluate(() =>
        JSON.stringify({
          main: document.querySelector("main")?.getBoundingClientRect().toJSON(),
          navigation: document.querySelector("nav")?.getBoundingClientRect().toJSON(),
          viewport: { height: innerHeight, width: innerWidth },
        }),
      );
      stableSamples = current === previous ? stableSamples + 1 : 0;
      if (stableSamples >= 2) return;
      previous = current;
      await page.waitForTimeout(100);
    }
    throw new Error("The account-menu layout did not stabilize.");
  };
  const setViewport = async (viewport) => {
    await page.setViewportSize(viewport);
    await page.waitForFunction(
      (expected) => innerWidth === expected.width && innerHeight === expected.height,
      viewport,
    );
    await waitForStableLayout();
  };
  const waitForSidebarVisibility = async (expectedVisible) => {
    await page.waitForFunction((visible) => {
      const navigation = document.querySelector("nav");
      if (!(navigation instanceof Element)) return !visible;
      return (
        navigation.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) === visible
      );
    }, expectedVisible);
  };
  const pinCompactSidebar = async () => {
    const show = page.locator('[aria-label="Show sidebar"]:visible').first();
    if ((await show.count()) === 1) {
      await show.click();
    }
    const hide = page.locator('[aria-label="Hide sidebar"]:visible').first();
    await hide.waitFor({ state: "visible" });
    await waitForSidebarVisibility(true);
    await waitForStableLayout();
  };
  const goNewChat = async () => {
    const backToApp = page.getByRole("link", {
      name: "Back to app",
      exact: true,
    });
    if ((await backToApp.count()) === 1) {
      await backToApp.click();
    }
    const target = page
      .locator("nav")
      .getByText("New chat", { exact: true })
      .first();
    await target.waitFor({ state: "visible" });
    await target.click();
    await requireAccountTrigger();
    await waitForStableLayout();
  };
  const goAppearance = async () => {
    if ((await page.getByRole("radio", { name: "Light", exact: true }).count()) === 1) {
      return;
    }
    const trigger = await requireAccountTrigger();
    const accountMenuExpanded =
      (await trigger.getAttribute("aria-expanded")) === "true";
    if (!accountMenuExpanded) await trigger.click();
    const menu = page.locator('[role="menu"]:visible').first();
    await menu.waitFor({ state: "visible" });
    await menu
      .getByRole("menuitem", { name: /^Settings/ })
      .first()
      .click();
    const appearance = page.getByText("Appearance", { exact: true }).first();
    await appearance.waitFor({ state: "visible" });
    await appearance.click();
    await page.getByRole("radio", { name: "Light", exact: true }).waitFor();
  };
  const setTheme = async (theme) => {
    await goAppearance();
    const radio = page.getByRole("radio", { name: theme, exact: true });
    const label = page.locator("label").filter({ has: radio });
    if ((await label.count()) !== 1) {
      throw new Error(`The ${theme} theme label is ambiguous.`);
    }
    await label.click();
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await radio.isChecked()) break;
      if (attempt === 39) {
        throw new Error(`The ${theme} theme preference was not selected.`);
      }
      await page.waitForTimeout(100);
    }
    if (theme !== "System") {
      await page.waitForFunction(
        (expected) =>
          getComputedStyle(document.documentElement).colorScheme === expected,
        theme.toLowerCase(),
      );
    }
    await page.waitForTimeout(300);
  };
  restoreIsolatedState = async () => {
    await setViewport({ height: 820, width: 1180 });
    await setTheme("System");
    await goNewChat();
  };
  const capture = async ({ compact, theme }) => {
    const viewport = compact
      ? { height: 680, width: 720 }
      : { height: 820, width: 1180 };
    if (compact) {
      await goNewChat();
      await setViewport(currentBaselineViewports.medium);
      await setViewport(currentBaselineViewports.threshold);
      await setViewport(viewport);
      await pinCompactSidebar();
    } else {
      await setViewport(viewport);
      await goNewChat();
    }
    const trigger = await requireAccountTrigger();
    await trigger.click();
    const menu = page.locator('[role="menu"]:visible').first();
    await menu.waitFor({ state: "visible" });
    await waitForStableLayout();
    const state = await menu.evaluate((element, context) => {
      const round = (value) => Math.round(value * 1000) / 1000;
      const rect = (target) => {
        const bounds = target?.getBoundingClientRect();
        return bounds
          ? {
              height: round(bounds.height),
              left: round(bounds.left),
              top: round(bounds.top),
              width: round(bounds.width),
            }
          : null;
      };
      const items = [...element.querySelectorAll('[role="menuitem"]')];
      const menuStyle = getComputedStyle(element);
      const trigger = document.querySelector(
        'button[aria-haspopup="menu"]:has(img)',
      );
      return {
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        compact: context.compact,
        focusRole: document.activeElement?.getAttribute("role"),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        imageCount: element.querySelectorAll("img").length,
        itemCount: items.length,
        itemRects: items.map(rect),
        itemStyles: items.map((item) => {
          const style = getComputedStyle(item);
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            padding: style.padding,
          };
        }),
        labels: items.map((item, index) =>
          index === 0
            ? "<account>"
            : index === 1
              ? "Usage <dynamic>"
              : item.textContent?.trim(),
        ),
        menuRect: rect(element),
        menuStyle: {
          backgroundColor: menuStyle.backgroundColor,
          borderRadius: menuStyle.borderRadius,
          boxShadow: menuStyle.boxShadow,
          color: menuStyle.color,
        },
        separatorCount: element.querySelectorAll('[role="separator"]').length,
        sidebarRect: rect(document.querySelector("nav")),
        svgGeometry: items.map((item) =>
          [...item.querySelectorAll("svg")].map((svg) => ({
            shapes: [...svg.querySelectorAll("path, circle, rect, line")].map(
              (shape) => ({
                d: shape.getAttribute("d"),
                tag: shape.tagName.toLowerCase(),
              }),
            ),
            viewBox: svg.getAttribute("viewBox"),
          })),
        ),
        theme: context.theme,
        triggerRect: rect(trigger),
        triggerTextLength: trigger?.textContent?.trim().length ?? 0,
        viewport: { height: innerHeight, width: innerWidth },
      };
    }, { compact, theme });
    const stem = `${theme.toLowerCase()}-${compact ? "compact" : "wide"}`;
    await page.screenshot({ path: `${outputDirectory}/${stem}.png` });
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    state.focusReturned = await trigger.evaluate(
      (element) => document.activeElement === element,
    );
    return state;
  };

  const states = {};
  for (const theme of ["Light", "Dark"]) {
    await setViewport({ height: 820, width: 1180 });
    await setTheme(theme);
    states[`${theme.toLowerCase()}Wide`] = await capture({
      compact: false,
      theme,
    });
    states[`${theme.toLowerCase()}Compact`] = await capture({
      compact: true,
      theme,
    });
  }
  await restoreIsolatedState();
  const afterCapture = await readInstalledSnapshot();
  if (JSON.stringify(afterCapture.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error("The installed build changed during account-menu capture.");
  }

  const record = {
    fingerprint,
    profileOwnerPid: Number(isolatedOwnerPid),
    restoredPreference: "System",
    runtimeBundleIdentity: {
      afterCapture: afterCapture.bundle,
      beforeCapture: beforeCapture.bundle,
      ownerPid: Number(isolatedOwnerPid),
      processStartedAtMs,
    },
    states,
  };
  assertCurrentAccountMenuRecord(record);
  for (const [key, state] of Object.entries(states)) {
    const stem = `${state.theme.toLowerCase()}-${key.endsWith("Compact") ? "compact" : "wide"}`;
    await writeFile(
      `${outputDirectory}/${stem}.json`,
      `${JSON.stringify(state, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
  record.sha256 = createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex");
  await writeFile(
    `${outputDirectory}/account-menu.json`,
    `${JSON.stringify(record, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  successSummary = {
    fingerprint,
    outputDirectory,
    restoredPreference: record.restoredPreference,
    sha256: record.sha256,
    states: Object.fromEntries(
      Object.entries(states).map(([key, state]) => [
        key,
        {
          colorScheme: state.colorScheme,
          focusReturned: state.focusReturned,
          fontWeight: state.itemStyles[1]?.fontWeight,
          horizontalOverflow: state.horizontalOverflow,
          itemCount: state.itemCount,
          menuRect: state.menuRect,
          sidebarWidth: state.sidebarRect?.width,
        },
      ]),
    ),
  };
} catch (error) {
  captureError = error;
} finally {
  if (page && !page.isClosed() && restoreIsolatedState) {
    try {
      await restoreIsolatedState();
    } catch (error) {
      cleanupError = error;
    }
  }
  await browser.close();
}
if (captureError && cleanupError) {
  throw new AggregateError(
    [captureError, cleanupError],
    "Account-menu capture and isolated-state cleanup both failed.",
  );
}
if (cleanupError) {
  throw new Error(
    `Account-menu isolated-state cleanup failed: ${cleanupError.message}`,
    { cause: cleanupError },
  );
}
if (captureError) throw captureError;
console.log(JSON.stringify(successSummary));
