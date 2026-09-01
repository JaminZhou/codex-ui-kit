import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  assertCurrentAppServerCrashRecoveryRecord,
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only and intentionally destructive to one explicitly identified child:
// the caller must launch a disposable loopback-only Codex profile and pass its
// exact App Server PID. The script terminates only that direct child, observes
// the fatal UI, clicks Restart ChatGPT, and proves that the isolated shell returns.

const port = Number(process.env.CODEX_CURRENT_APP_SERVER_CRASH_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_APP_SERVER_CRASH_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_APP_SERVER_CRASH_OUTPUT_DIR;
const expectedAppServerPid = Number(
  process.env.CODEX_CURRENT_APP_SERVER_CRASH_EXPECTED_CHILD_PID,
);
const allowCapture =
  process.env.CODEX_CURRENT_APP_SERVER_CRASH_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appExecutable = `${appBundle}/Contents/MacOS/ChatGPT`;
const appServerExecutable = `${appBundle}/Contents/Resources/codex`;
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated App Server crash CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated App Server crash profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute App Server crash output directory.");
}
if (!Number.isSafeInteger(expectedAppServerPid) || expectedAppServerPid <= 1) {
  throw new Error("Set the exact isolated App Server child PID.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_APP_SERVER_CRASH_ALLOW_CAPTURE=1 to authorize SIGTERM for the exact isolated App Server child and the Restart ChatGPT action.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The App Server crash profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-app-server-crash-")
) {
  throw new Error(
    "The output must be a current-app-server-crash-* direct child of the isolated profile.",
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
  throw new Error("Every App Server crash CDP listener must be loopback-only.");
}

const readProcessInfo = (pid) =>
  JSON.parse(
    execFileSync(
      "/usr/bin/python3",
      ["scripts/read-macos-process-info.py", String(pid)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
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
    processInfo.executablePath === appExecutable &&
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
  throw new Error("The isolated App Server crash owner is ambiguous.");
}
const profileOwnerPid = Number(isolatedOwners[0].pid);
const processStartedAt = execFileSync(
  "/bin/ps",
  ["-p", String(profileOwnerPid), "-o", "lstart="],
  { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } },
).trim();
const startedMatch = processStartedAt.match(
  /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/,
);
if (!startedMatch) throw new Error("Could not prove the isolated owner start time.");
const monthIndex = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
].indexOf(startedMatch[1]);
const processStartedAtMs = new Date(
  Number(startedMatch[6]),
  monthIndex,
  Number(startedMatch[2]),
  Number(startedMatch[3]),
  Number(startedMatch[4]),
  Number(startedMatch[5]),
).getTime();

const directChildPids = () =>
  execFileSync("/bin/ps", ["-axo", "pid=,ppid="], { encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([, ppid]) => ppid === profileOwnerPid)
    .map(([pid]) => pid);
const appServerChildren = () => {
  const children = [];
  for (const pid of directChildPids()) {
    try {
      const info = readProcessInfo(pid);
      if (
        info.executablePath === appServerExecutable &&
        info.argv.includes("app-server")
      ) {
        children.push({
          argvSha256: sha256(JSON.stringify(info.argv)),
          executablePath: info.executablePath,
          pid,
          ppid: profileOwnerPid,
        });
      }
    } catch {
      // A short-lived direct child may exit between ps and inspection.
    }
  }
  return children;
};
const initialChildren = appServerChildren();
if (
  initialChildren.length !== 1 ||
  initialChildren[0].pid !== expectedAppServerPid
) {
  throw new Error(
    `The exact isolated App Server child is not uniquely proven: ${JSON.stringify(initialChildren)}`,
  );
}

await mkdir(outputDirectory, { mode: 0o700 });
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
const recordCandidateUrl = (url) => {
  if (
    url === "app://-/index.html" ||
    url === "app://-/index.html?initialRoute=%2Favatar-overlay"
  ) {
    return url;
  }
  if (url.startsWith("app://-/index.html?")) return "app://-/index.html?redacted";
  return "non-app-page";
};
const waitForReplacement = async () => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const children = appServerChildren();
    if (children.length === 1 && children[0].pid !== expectedAppServerPid) {
      return children[0];
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("The isolated App Server replacement child did not appear.");
};
const recoveryFrame = (page) =>
  page.evaluate(async () => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left,
        top: value.top,
        width: value.width,
      };
    };
    const text = (element) =>
      element?.textContent?.replace(/\s+/g, " ").trim() ?? null;
    const heading = [...document.querySelectorAll("h1")].find(
      (candidate) => text(candidate) === "ChatGPT hit a snag",
    );
    const copy = heading?.parentElement;
    const group = copy?.parentElement;
    const image = group?.querySelector("img");
    const elements = [...document.querySelectorAll("*")];
    const content = elements.find((candidate) => {
      const value = candidate.getBoundingClientRect();
      return (
        Math.abs(value.width - Math.min(innerWidth, 896)) <= 1 &&
        Math.abs(value.height - innerHeight) <= 1
      );
    });
    const recoveryRoot = elements.find((candidate) => {
      const value = candidate.getBoundingClientRect();
      return (
        Math.abs(value.width - innerWidth) <= 1 &&
        Math.abs(value.height - innerHeight) <= 1 &&
        getComputedStyle(candidate).backgroundColor === "rgb(20, 20, 20)"
      );
    });
    const buttons = [...(group?.querySelectorAll("button") ?? [])].map(
      (button) => {
        const style = getComputedStyle(button);
        return {
          kind:
            text(button) === "Restart ChatGPT"
              ? "restart"
              : text(button) === "Send feedback"
                ? "feedback"
                : null,
          label: text(button),
          rect: rect(button),
          style: {
            backgroundColor: style.backgroundColor,
            border: style.border,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
          },
        };
      },
    );
    const headingStyle = heading ? getComputedStyle(heading) : null;
    const paragraph = copy?.querySelector("p");
    const paragraphStyle = paragraph ? getComputedStyle(paragraph) : null;
    return {
      backgroundColor: recoveryRoot
        ? getComputedStyle(recoveryRoot).backgroundColor
        : null,
      buttons,
      content: rect(content),
      copy: rect(copy),
      fontFamily: recoveryRoot ? getComputedStyle(recoveryRoot).fontFamily : null,
      fontWeight: recoveryRoot ? getComputedStyle(recoveryRoot).fontWeight : null,
      heading: text(heading),
      headingStyle: headingStyle
        ? {
            fontSize: headingStyle.fontSize,
            fontWeight: headingStyle.fontWeight,
            lineHeight: headingStyle.lineHeight,
          }
        : null,
      illustration: rect(image),
      imageMetadata: image
        ? await (async () => {
            const response = await fetch(image.src);
            const bytes = await response.arrayBuffer();
            const digest = await crypto.subtle.digest("SHA-256", bytes);
            return {
              byteLength: bytes.byteLength,
              mimeType: response.headers.get("content-type"),
              naturalHeight: image.naturalHeight,
              naturalWidth: image.naturalWidth,
              sha256: [...new Uint8Array(digest)]
                .map((value) => value.toString(16).padStart(2, "0"))
                .join(""),
            };
          })()
        : null,
      paragraphs: [...(copy?.querySelectorAll("p") ?? [])].map(text),
      paragraphStyle: paragraphStyle
        ? {
            color: paragraphStyle.color,
            fontSize: paragraphStyle.fontSize,
            lineHeight: paragraphStyle.lineHeight,
          }
        : null,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
const screenshot = async (page, name) => {
  const path = join(outputDirectory, name);
  await page.screenshot({ path });
  const contents = await readFile(path);
  const png = PNG.sync.read(contents);
  return { height: png.height, name, sha256: sha256(contents), width: png.width };
};

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let captureError;
let successSummary;
let page;
let replacement;
try {
  const candidates = await Promise.all(
    browser
      .contexts()
      .flatMap((context) => context.pages())
      .map(inspectCandidate),
  );
  const selected = selectCurrentMainCandidate(candidates);
  page = selected.page;
  await page.bringToFront();
  await page.setViewportSize(currentBaselineViewports.wide);
  await page.mouse.move(
    currentBaselineViewports.wide.width - 8,
    currentBaselineViewports.wide.height - 8,
  );
  const terminatedAt = Date.now();
  process.kill(expectedAppServerPid, "SIGTERM");
  await page.getByRole("heading", { name: "ChatGPT hit a snag" }).waitFor({
    timeout: 30_000,
  });
  const fatalVisibleAfterMs = Date.now() - terminatedAt;
  replacement = await waitForReplacement();
  const wide = await recoveryFrame(page);
  const wideScreenshot = await screenshot(page, "app-server-crash-wide.png");
  await page.setViewportSize(currentBaselineViewports.compact);
  await page.mouse.move(
    currentBaselineViewports.compact.width - 8,
    currentBaselineViewports.compact.height - 8,
  );
  const compact = await recoveryFrame(page);
  const compactScreenshot = await screenshot(
    page,
    "app-server-crash-compact.png",
  );
  const restartAt = Date.now();
  await page
    .getByRole("button", { name: "Restart ChatGPT", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll("h1").length === 0 &&
      document.querySelectorAll("main").length >= 1 &&
      document.querySelectorAll("nav").length >= 1 &&
      document.querySelectorAll(
        'textarea, [contenteditable="true"], [role="textbox"]',
      ).length >= 1,
    null,
    { timeout: 30_000 },
  );
  const shellVisibleAfterRestartMs = Date.now() - restartAt;
  const postRestartChildren = appServerChildren();
  if (postRestartChildren.length !== 1) {
    throw new Error("The restored isolated shell has an ambiguous App Server child.");
  }
  const restart = await page.evaluate(() => ({
    headingCount: [...document.querySelectorAll("h1")].filter(
      (heading) => heading.textContent?.trim() === "ChatGPT hit a snag",
    ).length,
    mainCount: document.querySelectorAll("main").length,
    navigationCount: document.querySelectorAll("nav").length,
    textboxCount: document.querySelectorAll(
      'textarea, [contenteditable="true"], [role="textbox"]',
    ).length,
  }));
  const afterCapture = await readInstalledSnapshot();
  const record = {
    assetReference: {
      ...wide.imageMetadata,
      distribution: "local-only-not-committed",
    },
    captureKind: "renderer_cdp_app_server_recovery",
    fingerprint,
    frames: {
      compact: { ...compact, imageMetadata: undefined },
      wide: { ...wide, imageMetadata: undefined },
    },
    privacyBoundary:
      "fatal-recovery-copy-style-geometry-process-and-local-asset-hash-only",
    processTransition: {
      fatalVisibleAfterMs,
      postRestart: postRestartChildren[0],
      replacement,
      shellVisibleAfterRestartMs,
      signal: "SIGTERM",
      terminated: initialChildren[0],
    },
    profileOwnerPid,
    restart,
    runtimeBundleIdentity: {
      afterCapture: afterCapture.bundle,
      beforeCapture: beforeCapture.bundle,
      ownerPid: profileOwnerPid,
      processStartedAtMs,
    },
    schemaVersion: 1,
    screenshots: { compact: compactScreenshot, wide: wideScreenshot },
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
  };
  assertCurrentAppServerCrashRecoveryRecord(record);
  record.sha256 = sha256(JSON.stringify(record));
  await writeFile(
    join(outputDirectory, "app-server-crash.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  successSummary = {
    fingerprint,
    outputDirectory,
    processTransition: {
      postRestartPid: record.processTransition.postRestart.pid,
      replacementPid: record.processTransition.replacement.pid,
      terminatedPid: record.processTransition.terminated.pid,
    },
    recordSha256: record.sha256,
  };
} catch (error) {
  captureError = error;
} finally {
  if (page) {
    const restartButton = page.getByRole("button", {
      name: "Restart ChatGPT",
      exact: true,
    });
    if ((await restartButton.count()) === 1) {
      try {
        await restartButton.click();
        await page.waitForSelector("main", { timeout: 30_000 });
      } catch {
        // The caller owns the isolated app and can still close it safely.
      }
    }
  }
  await browser.close();
}
if (captureError) throw captureError;
console.log(JSON.stringify(successSummary));
