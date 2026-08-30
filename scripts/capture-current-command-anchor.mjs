import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only: this script never submits a prompt. The disposable task must
// already contain one completed `/usr/bin/uuidgen` command observation.

const port = Number(process.env.CODEX_CURRENT_COMMAND_26_825_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_COMMAND_26_825_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_COMMAND_26_825_OUTPUT_DIR;
const taskTitleSha256 =
  process.env.CODEX_CURRENT_COMMAND_26_825_TASK_TITLE_SHA256;
const allowCapture =
  process.env.CODEX_CURRENT_COMMAND_26_825_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const uuidPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated current-command CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated current-command profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute current-command output directory.");
}
if (!/^[a-f0-9]{64}$/.test(taskTitleSha256 ?? "")) {
  throw new Error("Set the SHA-256 of the disposable current-command title.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_COMMAND_26_825_ALLOW_CAPTURE=1 to authorize capture-only navigation and screenshot sampling in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The current-command profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-command-26-825-capture-")
) {
  throw new Error(
    "The output must be a new current-command-26-825-capture-* direct child of the isolated profile.",
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
const fingerprint = await readInstalledSnapshot();
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
  throw new Error("Every current-command CDP listener must be loopback-only.");
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
    valuesFor(processInfo.argv, "--remote-debugging-port=")[0] ===
      String(port) &&
    profiles.length === 1 &&
    (await realpath(profiles[0])) === normalizedProfile
  ) {
    isolatedOwners.push(listener);
  }
}
if (isolatedOwners.length !== 1) {
  throw new Error("The isolated current-command CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
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

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
let page;
let initialViewport;
let initialSidebarVisible;
try {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const selected = selectCurrentMainCandidate(
    await Promise.all(pages.map(inspectCandidate)),
  );
  page = selected.page;
  await page.bringToFront();
  initialViewport = await page.evaluate(() => ({
    height: innerHeight,
    width: innerWidth,
  }));
  initialSidebarVisible =
    (await page.locator('button[aria-label="Hide sidebar"]:visible').count()) >
    0;

  const setSidebarVisible = async (visible) => {
    const label = visible ? "Show sidebar" : "Hide sidebar";
    const control = page.locator(`button[aria-label="${label}"]:visible`);
    if ((await control.count()) > 0) {
      await control.first().evaluate((element) => element.click());
      await page.waitForTimeout(250);
    }
  };
  const closePinnedPanels = async () => {
    for (const label of [
      "Toggle pinned summary",
      "Toggle bottom panel",
      "Toggle side panel",
    ]) {
      const control = page.locator(`button[aria-label="${label}"]:visible`);
      if (
        (await control.count()) > 0 &&
        (await control.first().getAttribute("aria-pressed")) === "true"
      ) {
        await control.first().click();
        await page.waitForTimeout(180);
      }
    }
  };

  await setSidebarVisible(true);
  const titleNodes = page.locator("nav:visible [data-thread-title]:visible");
  const titles = await titleNodes.evaluateAll((elements) =>
    elements.map((element, index) => ({
      index,
      title: element.textContent?.trim() ?? "",
    })),
  );
  const matches = titles.filter(({ title }) => sha256(title) === taskTitleSha256);
  if (matches.length !== 1) {
    throw new Error("Could not resolve exactly one disposable current-command task.");
  }
  await titleNodes.nth(matches[0].index).evaluate((element) => {
    const target = element.closest(
      '[data-app-action-sidebar-thread-row], button, a',
    );
    if (!(target instanceof HTMLElement)) {
      throw new Error("Disposable current-command task row is not clickable.");
    }
    target.click();
  });
  await page.getByText(uuidPattern).last().waitFor({
    state: "visible",
    timeout: 10_000,
  });

  const records = [];
  for (const viewportName of ["wide", "compact"]) {
    const viewport = currentBaselineViewports[viewportName];
    await page.setViewportSize(viewport);
    await page.evaluate(async () => document.fonts.ready);
    await setSidebarVisible(false);
    await page.waitForFunction(() => {
      const main = document.querySelector("main")?.getBoundingClientRect();
      return Boolean(
        main && Math.abs(main.left) < 0.1 && Math.abs(main.width - innerWidth) < 0.1,
      );
    });
    await closePinnedPanels();
    const body = await page.locator("body").innerText();
    const duration = page.getByText(/^Worked for \d+s$/).last();
    if (!body.includes("Ran /usr/bin/uuidgen")) {
      await duration.click();
      await page.waitForTimeout(300);
    }
    const command = page.getByText("Ran /usr/bin/uuidgen", { exact: true });
    if ((await command.count()) !== 1) {
      throw new Error("The completed uuidgen command row is unavailable.");
    }
    const assistant = page.getByText(uuidPattern).last();
    const screenshot = screenshotPath(viewportName);
    await page.mouse.move(viewport.width - 8, viewport.height - 8);
    await page.screenshot({ path: screenshot });
    const observation = await page.evaluate(() => {
      const visible = (element) =>
        element instanceof HTMLElement &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const style = (element) => {
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
      const leaves = [...document.querySelectorAll("*")].filter(
        (element) => element.children.length === 0 && visible(element),
      );
      const commandRow = leaves.find(
        (element) => element.textContent?.trim() === "Ran /usr/bin/uuidgen",
      );
      const durationRow = leaves.findLast((element) =>
        /^Worked for \d+s$/.test(element.textContent?.trim() ?? ""),
      );
      const assistantRow = leaves.find((element) =>
        /^[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-F0-9]{12}$/i.test(
          element.textContent?.trim() ?? "",
        ),
      );
      return {
        assistant: { rect: rect(assistantRow), style: style(assistantRow) },
        command: { rect: rect(commandRow), style: style(commandRow) },
        composerSendVisible: [...document.querySelectorAll("button")].some(
          (button) =>
            visible(button) && button.getAttribute("aria-label") === "Send",
        ),
        duration: {
          rect: rect(durationRow),
          style: style(durationRow),
          text: durationRow?.textContent?.trim(),
        },
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        stopVisible: [...document.querySelectorAll("button")].some(
          (button) =>
            visible(button) && button.getAttribute("aria-label") === "Stop",
        ),
        window: { height: innerHeight, width: innerWidth },
      };
    });
    if (
      !observation.composerSendVisible ||
      observation.stopVisible ||
      observation.horizontalOverflow > 0
    ) {
      throw new Error(
        `The ${viewportName} current-command settlement is incomplete: ${JSON.stringify(observation)}`,
      );
    }
    records.push({
      assistantTextSha256: sha256((await assistant.textContent())?.trim() ?? ""),
      observation,
      screenshot,
      taskTitleSha256,
      viewport: viewportName,
    });
  }

  const afterFingerprint = await readInstalledSnapshot();
  if (
    Object.keys(fingerprint).some(
      (key) => afterFingerprint[key] !== fingerprint[key],
    )
  ) {
    throw new Error("The installed Codex build changed during command capture.");
  }
  const record = {
    capturedAtMs: Date.now(),
    fingerprint,
    ownerPid: Number(isolatedOwners[0].pid),
    records,
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
} finally {
  if (page && !page.isClosed()) {
    const restoreLabel = initialSidebarVisible
      ? "Show sidebar"
      : "Hide sidebar";
    const control = page.locator(
      `button[aria-label="${restoreLabel}"]:visible`,
    );
    if ((await control.count()) > 0) {
      await control.first().evaluate((element) => element.click());
    }
    if (initialViewport) await page.setViewportSize(initialViewport);
  }
  await browser.close();
}
