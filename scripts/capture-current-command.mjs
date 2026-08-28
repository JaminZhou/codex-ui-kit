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

// Capture-only: this script never submits a prompt. The three user-authorized,
// disposable command tasks must already contain their completed observations.

const port = Number(process.env.CODEX_CURRENT_COMMAND_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_COMMAND_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_COMMAND_OUTPUT_DIR;
const allowCapture =
  process.env.CODEX_CURRENT_COMMAND_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const scenarios = [
  {
    id: "success",
    marker: "CURRENT 26.820 LONG COMMAND OBSERVED",
    taskTitleSha256:
      process.env.CODEX_CURRENT_COMMAND_SUCCESS_TASK_TITLE_SHA256,
    viewports: ["wide"],
  },
  {
    id: "failure",
    marker: "CURRENT 26.820 COMMAND RECOVERY ACCEPTED",
    taskTitleSha256:
      process.env.CODEX_CURRENT_COMMAND_FAILURE_TASK_TITLE_SHA256,
    viewports: ["wide"],
  },
  {
    id: "interruption",
    marker: "CURRENT 26.820 INTERRUPTION RECOVERY ACCEPTED",
    taskTitleSha256:
      process.env.CODEX_CURRENT_COMMAND_INTERRUPTION_TASK_TITLE_SHA256,
    viewports: ["wide", "compact"],
  },
];

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated command CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated command profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute command output directory.");
}
if (
  scenarios.some(
    ({ taskTitleSha256 }) => !/^[a-f0-9]{64}$/.test(taskTitleSha256 ?? ""),
  )
) {
  throw new Error("Set the SHA-256 of every disposable command task title.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_COMMAND_ALLOW_CAPTURE=1 to authorize capture-only navigation and screenshot sampling in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The command profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-command-capture-")
) {
  throw new Error(
    "The output must be a new current-command-capture-* direct child of the isolated profile.",
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
  if (field.startsWith("p")) {
    listeners.push({ addresses: [], pid: field.slice(1) });
  }
  if (field.startsWith("n")) listeners.at(-1)?.addresses.push(field.slice(1));
}
if (
  listeners.length === 0 ||
  listeners.some(
    ({ addresses }) =>
      addresses.length !== 1 || addresses[0] !== `127.0.0.1:${port}`,
  )
) {
  throw new Error("Every command CDP listener must be loopback-only.");
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
  throw new Error("The isolated command CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const screenshotPath = (name) => resolve(outputDirectory, `${name}.png`);
const recordPath = resolve(outputDirectory, "record.json");
const inspectCandidate = async (page, index) => {
  const structure = await page.evaluate(() => {
    const visible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
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
    const controls = page.locator(`button[aria-label="${label}"]:visible`);
    if ((await controls.count()) > 0) {
      await controls.first().click();
      await page.waitForTimeout(250);
    }
  };
  const closePinnedPanels = async () => {
    const controls = page.locator(
      'button[aria-label="Toggle pinned summary"]:visible, button[aria-label="Toggle bottom panel"]:visible, button[aria-label="Toggle side panel"]:visible',
    );
    for (let index = 0; index < (await controls.count()); index += 1) {
      const control = controls.nth(index);
      if ((await control.getAttribute("aria-pressed")) === "true") {
        await control.click();
        await page.waitForTimeout(180);
      }
    }
  };
  const openTask = async (taskTitleSha256, marker) => {
    await setSidebarVisible(true);
    const titleNodes = page.locator("nav:visible [data-thread-title]:visible");
    const titles = await titleNodes.evaluateAll((elements) =>
      elements.map((element, index) => ({
        index,
        title: element.textContent?.trim() ?? "",
      })),
    );
    const matches = titles.filter(
      ({ title }) => sha256(title) === taskTitleSha256,
    );
    if (matches.length !== 1) {
      throw new Error("Could not resolve exactly one disposable command task.");
    }
    await titleNodes.nth(matches[0].index).evaluate((element) => {
      const target = element.closest(
        '[data-app-action-sidebar-thread-row], button, a',
      );
      if (!(target instanceof HTMLElement)) {
        throw new Error("Disposable command task row is not clickable.");
      }
      target.click();
    });
    await page.getByText(marker, { exact: true }).last().waitFor({
      state: "visible",
      timeout: 10_000,
    });
    return matches[0].title;
  };
  const observe = async (marker) =>
    page.evaluate((expectedMarker) => {
      const visible = (element) =>
        element instanceof HTMLElement &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      const round = (value) => Math.round(value * 1_000) / 1_000;
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: round(value.height),
          left: round(value.left),
          top: round(value.top),
          width: round(value.width),
        };
      };
      const style = (element) => {
        if (!(element instanceof Element)) return null;
        const value = getComputedStyle(element);
        return {
          backgroundColor: value.backgroundColor,
          borderRadius: value.borderRadius,
          color: value.color,
          fontFamily: value.fontFamily,
          fontSize: value.fontSize,
          fontWeight: value.fontWeight,
          lineHeight: value.lineHeight,
          maxWidth: value.maxWidth,
          padding: value.padding,
          whiteSpace: value.whiteSpace,
        };
      };
      const leafElements = [...document.querySelectorAll("*")].filter(
        (element) => element.children.length === 0 && visible(element),
      );
      const marker = leafElements.find(
        (element) => element.textContent?.trim() === expectedMarker,
      );
      const commandRows = leafElements
        .filter((element) => {
          const text = element.textContent?.replace(/\s+/g, " ").trim() ?? "";
          return (
            text.includes("CURRENT 26.820") &&
            (text.startsWith("Ran ") ||
              text.startsWith("Background terminal stopped with "))
          );
        })
        .map((element) => ({
          rect: rect(element),
          style: style(element),
          text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
        }));
      const markerAncestors = [];
      for (let element = marker; element; element = element.parentElement) {
        markerAncestors.push({
          className:
            typeof element.className === "string" ? element.className : null,
          rect: rect(element),
          style: style(element),
          tagName: element.tagName,
        });
        if (markerAncestors.length === 6) break;
      }
      return {
        commandRows,
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        marker: { ancestors: markerAncestors, rect: rect(marker), style: style(marker) },
        window: { height: innerHeight, width: innerWidth },
      };
    }, marker);

  const records = [];
  for (const scenario of scenarios) {
    const title = await openTask(scenario.taskTitleSha256, scenario.marker);
    for (const viewportName of scenario.viewports) {
      const viewport = currentBaselineViewports[viewportName];
      await page.setViewportSize(viewport);
      await page.evaluate(async () => document.fonts.ready);
      await setSidebarVisible(false);
      await closePinnedPanels();
      const commandRow = page
        .locator("span:visible")
        .filter({ hasText: "CURRENT 26.820" })
        .filter({ hasText: /^(Ran |Background terminal stopped with )/ })
        .first();
      if ((await commandRow.count()) === 0) {
        throw new Error(`The ${scenario.id} command row is unavailable.`);
      }
      await commandRow.evaluate((element) =>
        element.scrollIntoView({ block: "center", inline: "nearest" }),
      );
      await page.waitForTimeout(250);
      const screenshot = screenshotPath(`${scenario.id}-${viewportName}`);
      await page.mouse.move(viewport.width - 8, viewport.height - 8);
      await page.screenshot({ path: screenshot });
      records.push({
        observation: await observe(scenario.marker),
        scenario: scenario.id,
        screenshot,
        taskTitleSha256: scenario.taskTitleSha256,
        title,
        viewport: viewportName,
      });
    }
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
    if (initialSidebarVisible === true) {
      const controls = page.locator(
        'button[aria-label="Show sidebar"]:visible',
      );
      if ((await controls.count()) > 0) await controls.first().click();
    }
    if (initialViewport) await page.setViewportSize(initialViewport);
  }
  await browser.close();
}
