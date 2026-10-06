import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { chromium } from "../playgrounds/codex-app/node_modules/playwright-core/index.mjs";
import {
  currentBaselineFingerprint,
  currentBaselineViewports,
  currentInstalledCandidateBaselineFingerprint,
  currentLatestInstalledCandidateBaselineFingerprint,
  currentObservationCandidateFingerprints,
  selectCurrentMainCandidate,
} from "./current-baseline-contract.mjs";

// Capture-only: this script never submits a prompt. The user-authorized,
// disposable MCP task and its completed success/recovery turns must exist.

const port = Number(process.env.CODEX_CURRENT_MCP_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_MCP_PROFILE;
const requestedOutputDirectory = process.env.CODEX_CURRENT_MCP_OUTPUT_DIR;
const taskTitleSha256 = process.env.CODEX_CURRENT_MCP_TASK_TITLE_SHA256;
const successDuration =
  process.env.CODEX_CURRENT_MCP_SUCCESS_DURATION ?? "Worked for 20s";
const recoveryDuration =
  process.env.CODEX_CURRENT_MCP_RECOVERY_DURATION ?? "Worked for 10s";
const requestedFingerprint =
  process.env.CODEX_CURRENT_MCP_FINGERPRINT?.trim() || "26.903.71938";
const allowCapture = process.env.CODEX_CURRENT_MCP_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const expectedFingerprintByVersion = new Map([
  ["26.903.71938", currentBaselineFingerprint],
  ["26.915.31945", currentInstalledCandidateBaselineFingerprint],
  [
    "26.917.71314",
    currentLatestInstalledCandidateBaselineFingerprint,
  ],
  [
    "26.930.61225",
    currentObservationCandidateFingerprints["26.930.61225"],
  ],
]);
const expectedFingerprint =
  expectedFingerprintByVersion.get(requestedFingerprint) ?? null;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated MCP CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated MCP profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute MCP output directory.");
}
if (!/^[a-f0-9]{64}$/.test(taskTitleSha256 ?? "")) {
  throw new Error("Set the SHA-256 of the disposable MCP task title.");
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_MCP_ALLOW_CAPTURE=1 to authorize capture-only navigation and screenshot sampling in the isolated app.",
  );
}
if (!expectedFingerprint) {
  throw new Error(
    `Unsupported MCP capture fingerprint ${JSON.stringify(requestedFingerprint)}.`,
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The MCP profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-mcp-capture-")
) {
  throw new Error(
    "The output must be a new current-mcp-capture-* direct child of the isolated profile.",
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
  Object.entries(expectedFingerprint).some(
    ([key, expected]) => fingerprint[key] !== expected,
  )
) {
  throw new Error(
    `The installed fingerprint does not match ${requestedFingerprint}: ${JSON.stringify(fingerprint)}`,
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
  throw new Error("Every MCP CDP listener must be loopback-only.");
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
  throw new Error("The isolated MCP CDP owner is ambiguous.");
}

await mkdir(outputDirectory, { mode: 0o700 });
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
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
let initialSummaryPinned;
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
    (await page.getByRole("button", { name: "Hide sidebar" }).count()) === 1;

  if (
    !initialSidebarVisible &&
    (await page.locator("nav [data-thread-title]").count()) === 0
  ) {
    const showSidebar = page.getByRole("button", { name: "Show sidebar" });
    if ((await showSidebar.count()) === 0) {
      throw new Error("Could not expose the disposable MCP task list.");
    }
    await showSidebar.first().click();
    await page.waitForTimeout(250);
  }
  const titleNodes = page.locator("nav [data-thread-title]");
  const titleCandidates = await titleNodes.evaluateAll((elements) =>
    elements.map((element, index) => ({
      index,
      title: element.textContent?.trim() ?? "",
    })),
  );
  const matchingTitles = titleCandidates.filter(
    ({ title }) => sha256(title) === taskTitleSha256,
  );
  if (matchingTitles.length !== 1) {
    throw new Error("Could not resolve exactly one disposable MCP task.");
  }
  const titleNode = titleNodes.nth(matchingTitles[0].index);
  await titleNode.evaluate((element) => {
    const target = element.closest(
      '[data-app-action-sidebar-thread-row], button, a',
    );
    if (!(target instanceof HTMLElement)) {
      throw new Error("Disposable MCP task row is not clickable.");
    }
    target.click();
  });
  await page
    .getByRole("button", { exact: true, name: successDuration })
    .waitFor({
      state: "visible",
      timeout: 10_000,
    });

  await page.setViewportSize(currentBaselineViewports.wide);
  await page.evaluate(async () => document.fonts.ready);
  const hideSidebar = page.getByRole("button", { name: "Hide sidebar" });
  if ((await hideSidebar.count()) === 1) {
    await hideSidebar.click();
    await page.waitForTimeout(250);
  }
  const summaryToggle = page.getByRole("button", {
    name: "Toggle pinned summary",
  });
  initialSummaryPinned =
    (await summaryToggle.count()) === 1
      ? (await summaryToggle.getAttribute("aria-pressed")) === "true"
      : false;
  if (initialSummaryPinned) {
    await summaryToggle.click();
    await page.waitForTimeout(250);
  }

  const activityButton = (name) =>
    page.getByRole("button", { exact: true, name });
  const expandActivity = async (name) => {
    const button = activityButton(name);
    if ((await button.count()) !== 1) {
      throw new Error(`Expected one completed MCP activity: ${name}`);
    }
    if ((await button.getAttribute("aria-expanded")) !== "true") {
      await button.click();
      await page.waitForTimeout(180);
    }
    await button.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await page.waitForTimeout(250);
    const buttonBox = await button.boundingBox();
    const groups = page.getByRole("button", {
      name: /^(Used|Using) OpenAI Developer Docs integration$/,
    });
    const groupCandidates = [];
    for (let index = 0; index < (await groups.count()); index += 1) {
      const group = groups.nth(index);
      const box = await group.boundingBox();
      if (box && buttonBox && box.y >= buttonBox.y) {
        groupCandidates.push({ box, group });
      }
    }
    groupCandidates.sort((left, right) => left.box.y - right.box.y);
    const group = groupCandidates[0]?.group;
    if (!group) throw new Error(`MCP integration group missing after ${name}.`);
    if ((await group.getAttribute("aria-expanded")) !== "true") {
      await group.click();
      await page.waitForTimeout(180);
    }
    await button.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await page.waitForTimeout(250);
    return { button, group };
  };

  const measureElement = async (locator) =>
    locator.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const round = (value) => Math.round(value * 1_000) / 1_000;
      return {
        rect: {
          height: round(rect.height),
          left: round(rect.left),
          top: round(rect.top),
          width: round(rect.width),
        },
        style: {
          color: computed.color,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
        },
      };
    });

  const callGroupContainer = async (group) => {
    const containerHandle = await group.evaluateHandle((groupElement) => {
      const normalize = (value) => value.trim().replace(/\s+/g, " ");
      const accessibleName = (element) => {
        const labelledBy = element
          .getAttribute("aria-labelledby")
          ?.split(/\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ");
        return normalize(
          element.getAttribute("aria-label") ||
            labelledBy ||
            element.innerText ||
            element.textContent ||
            "",
        );
      };
      const groupName = accessibleName(groupElement);
      for (
        let ancestor = groupElement.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const names = [...ancestor.querySelectorAll('button, [role="button"]')]
          .filter(
            (element) =>
              element instanceof HTMLElement &&
              element.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
          )
          .map(accessibleName);
        if (
          names.filter((name) => name === groupName).length === 1 &&
          names.includes("Search OpenAI docs") &&
          names.includes("Fetch OpenAI doc")
        ) {
          return ancestor;
        }
      }
      return null;
    });
    const container = containerHandle.asElement();
    if (!container) {
      await containerHandle.dispose();
      throw new Error("MCP tool rows could not be scoped to one integration group.");
    }
    return container;
  };

  const readAccessibleCallLabel = (element) =>
    element.evaluate((node) => {
      const labelledBy = node
        .getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
      return (node.getAttribute("aria-label") || labelledBy || node.innerText || "")
        .trim()
        .replace(/\s+/g, " ");
    });

  const captureFailedFetchDetails = async (group) => {
    const container = await callGroupContainer(group);
    const buttons = await container.$$('button, [role="button"]');
    const fetchRows = [];
    for (const candidate of buttons) {
      if ((await readAccessibleCallLabel(candidate)) === "Fetch OpenAI doc") {
        fetchRows.push(candidate);
      }
    }
    const failedFetch = fetchRows[0];
    if (!failedFetch) {
      throw new Error("The recovery integration has no failed Fetch row.");
    }
    const initialDisclosure = await failedFetch.getAttribute("aria-expanded");
    if (initialDisclosure === null) {
      throw new Error("The failed Fetch row is not an explicit disclosure control.");
    }
    if (initialDisclosure !== "true") {
      if (initialDisclosure !== "false") {
        throw new Error("The failed Fetch disclosure state is ambiguous.");
      }
      await failedFetch.click();
      await page.waitForTimeout(180);
    }
    const detailBounds = await failedFetch.evaluate((button) => {
      const failurePattern = /\b(invalid|failed|error|not\s+valid)\b/i;
      const buttonRect = button.getBoundingClientRect();
      for (
        let ancestor = button.parentElement;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        if (
          !(ancestor instanceof HTMLElement) ||
          !ancestor.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }) ||
          !failurePattern.test(ancestor.innerText ?? "")
        ) {
          continue;
        }
        const rect = ancestor.getBoundingClientRect();
        if (rect.height <= buttonRect.height + 1) continue;
        const round = (value) => Math.round(value * 1_000) / 1_000;
        return {
          height: round(rect.height),
          left: round(rect.left),
          top: round(rect.top),
          width: round(rect.width),
        };
      }
      return null;
    });
    if (!detailBounds) {
      throw new Error("No expanded failure detail is visible for the failed Fetch.");
    }
    const right = Math.min(
      currentBaselineViewports.wide.width,
      Math.ceil(detailBounds.left + Math.min(detailBounds.width, 420) + 4),
    );
    const bottom = Math.min(
      currentBaselineViewports.wide.height,
      Math.ceil(detailBounds.top + detailBounds.height + 4),
    );
    const left = Math.max(0, Math.floor(detailBounds.left - 4));
    const top = Math.max(0, Math.floor(detailBounds.top - 4));
    return {
      disclosureExpanded:
        (await failedFetch.getAttribute("aria-expanded")) === "true",
      details: detailBounds,
      failureSignalVisible: true,
      row: await measureElement(failedFetch),
      screenshotClip: {
        height: bottom - top,
        x: left,
        y: top,
        width: right - left,
      },
    };
  };

  const readActivity = async ({ button, group }) => {
    const activity = await measureElement(button);
    const groupMeasurement = await measureElement(group);
    const groupBox = await group.boundingBox();
    const callContainer = await callGroupContainer(group);
    const callRows = [];
    for (const candidate of await callContainer.$$('button, [role="button"]')) {
      const label = await readAccessibleCallLabel(candidate);
      if (label !== "Fetch OpenAI doc" && label !== "Search OpenAI docs") {
        continue;
      }
      const box = await candidate.boundingBox();
      if (
        !box ||
        !groupBox ||
        box.x < groupBox.x - 1 ||
        box.x > groupBox.x + groupBox.width ||
        Math.abs(box.height - 21) >= 0.1
      ) {
        continue;
      }
      const measured = await measureElement(candidate);
      callRows.push({
        label,
        disclosureExpanded:
          (await candidate.getAttribute("aria-expanded")) === "true",
        ...measured,
      });
    }
    const uniqueCallRows = [
      ...new Map(
        callRows.map((row) => [`${row.rect.top}:${row.label}`, row]),
      ).values(),
    ].sort((left, right) => left.rect.top - right.rect.top);
    const viewport = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      height: innerHeight,
      width: innerWidth,
    }));
    return {
      activity,
      callRows: uniqueCallRows,
      group: groupMeasurement,
      horizontalOverflow: Math.max(0, viewport.documentWidth - viewport.width),
      window: { height: viewport.height, width: viewport.width },
    };
  };

  const success = await readActivity(await expandActivity(successDuration));
  const successWideScreenshot = screenshotPath("mcp-success-wide");
  await page.mouse.move(600, 600);
  await page.screenshot({ path: successWideScreenshot });

  await page.setViewportSize(currentBaselineViewports.compact);
  const successCompact = await readActivity(
    await expandActivity(successDuration),
  );
  const successCompactScreenshot = screenshotPath("mcp-success-compact");
  await page.mouse.move(500, 500);
  await page.screenshot({ path: successCompactScreenshot });

  await page.setViewportSize(currentBaselineViewports.wide);
  const recoveryWideActivity = await expandActivity(recoveryDuration);
  const recoveryFailureDetails = await captureFailedFetchDetails(
    recoveryWideActivity.group,
  );
  const recoveryWide = await readActivity(recoveryWideActivity);
  const recoveryWideScreenshot = screenshotPath("mcp-recovery-wide");
  await page.mouse.move(600, 600);
  await page.screenshot({ path: recoveryWideScreenshot });
  const recoveryFailureDetailsScreenshot = screenshotPath(
    "mcp-recovery-failed-fetch-details-wide",
  );
  await page.screenshot({
    path: recoveryFailureDetailsScreenshot,
    clip: recoveryFailureDetails.screenshotClip,
  });

  await page.setViewportSize(currentBaselineViewports.compact);
  const recoveryCompact = await readActivity(
    await expandActivity(recoveryDuration),
  );
  const recoveryCompactScreenshot = screenshotPath("mcp-recovery-compact");
  await page.mouse.move(500, 500);
  await page.screenshot({ path: recoveryCompactScreenshot });

  await page.setViewportSize(currentBaselineViewports.wide);
  await expandActivity(recoveryDuration);
  if ((await summaryToggle.count()) !== 1) {
    throw new Error("The MCP Sources summary toggle is unavailable.");
  }
  if ((await summaryToggle.getAttribute("aria-pressed")) !== "true") {
    await summaryToggle.click();
    await page.waitForTimeout(250);
  }
  const sourcesScreenshot = screenshotPath("mcp-sources-pinned");
  await page.mouse.move(600, 600);
  await page.screenshot({ path: sourcesScreenshot });
  const sources = await page.evaluate(() => {
    const round = (value) => Math.round(value * 1_000) / 1_000;
    const visible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    const panel = [...document.querySelectorAll("div")]
      .filter(
        (element) =>
          visible(element) &&
          element.textContent?.includes("Sources") &&
          element.textContent?.includes("openai-docs-mcp") &&
          Math.abs(element.getBoundingClientRect().width - 300) < 1,
      )
      .sort(
        (left, right) =>
          left.getBoundingClientRect().height -
          right.getBoundingClientRect().height,
      )[0];
    const rect = panel?.getBoundingClientRect();
    const rows = panel
      ? [...panel.querySelectorAll("button")]
          .filter(visible)
          .map((element) => {
            const value = element.getBoundingClientRect();
            return {
              rect: {
                height: round(value.height),
                left: round(value.left),
                top: round(value.top),
                width: round(value.width),
              },
            };
          })
      : [];
    return {
      panel: rect
        ? {
            height: round(rect.height),
            left: round(rect.left),
            top: round(rect.top),
            width: round(rect.width),
          }
        : null,
      rows,
      rowCount: rows.length,
    };
  });

  const afterFingerprint = await readInstalledSnapshot();
  if (
    Object.keys(fingerprint).some(
      (key) => afterFingerprint[key] !== fingerprint[key],
    )
  ) {
    throw new Error("The installed Codex build changed during MCP capture.");
  }
  const record = {
    schemaVersion: 1,
    capturedAtMs: Date.now(),
    fingerprint,
    captureMode: "native-viewport-only",
    mutationsSubmitted: false,
    recoveryCompact,
    recoveryCompactScreenshot,
    recoveryFailureDetails: {
      disclosureExpanded: recoveryFailureDetails.disclosureExpanded,
      details: recoveryFailureDetails.details,
      failureSignalVisible: recoveryFailureDetails.failureSignalVisible,
      row: recoveryFailureDetails.row,
    },
    recoveryFailureDetailsScreenshot,
    recoveryWide,
    recoveryWideScreenshot,
    sources,
    sourcesScreenshot,
    success,
    successWideScreenshot,
    successCompact,
    successCompactScreenshot,
    taskTitleSha256,
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
} finally {
  if (page && !page.isClosed()) {
    if (
      typeof initialSummaryPinned === "boolean" &&
      (await page
        .getByRole("button", { name: "Toggle pinned summary" })
        .count()) === 1
    ) {
      const toggle = page.getByRole("button", {
        name: "Toggle pinned summary",
      });
      const pinned = (await toggle.getAttribute("aria-pressed")) === "true";
      if (pinned !== initialSummaryPinned) await toggle.click();
    }
    if (initialSidebarVisible === true) {
      const showSidebar = page.getByRole("button", { name: "Show sidebar" });
      if ((await showSidebar.count()) === 1) await showSidebar.click();
    }
    if (initialViewport) await page.setViewportSize(initialViewport);
  }
  await browser.close();
}
