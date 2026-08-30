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
const allowCapture = process.env.CODEX_CURRENT_MCP_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;

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
  const title = matchingTitles[0].title;
  await titleNode.evaluate((element) => {
    const target = element.closest(
      '[data-app-action-sidebar-thread-row], button, a',
    );
    if (!(target instanceof HTMLElement)) {
      throw new Error("Disposable MCP task row is not clickable.");
    }
    target.click();
  });
  await page.getByText(title, { exact: true }).first().waitFor({
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
    return { button, group };
  };

  const readActivity = async (name) =>
    page.evaluate((expectedName) => {
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
          height: Math.round(value.height * 1_000) / 1_000,
          left: Math.round(value.left * 1_000) / 1_000,
          top: Math.round(value.top * 1_000) / 1_000,
          width: Math.round(value.width * 1_000) / 1_000,
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
      const activity = [...document.querySelectorAll("button")].find(
        (button) => visible(button) && button.textContent?.trim() === expectedName,
      );
      const activityRect = rect(activity);
      const groups = [...document.querySelectorAll("button")]
        .filter(
          (button) =>
            visible(button) &&
            /^(Used|Using) OpenAI Developer Docs integration$/.test(
              button.textContent?.trim() ?? "",
            ),
        )
        .filter((button) => {
          const value = button.getBoundingClientRect();
          return activityRect && value.top >= activityRect.top;
        })
        .sort(
          (left, right) =>
            left.getBoundingClientRect().top -
            right.getBoundingClientRect().top,
        );
      const group = groups[0];
      const groupRect = rect(group);
      const labels = [...document.querySelectorAll("span")]
        .filter(
          (element) =>
            visible(element) &&
            ["Fetch OpenAI doc", "Search OpenAI docs"].includes(
              element.textContent?.trim() ?? "",
            ),
        )
        .filter((element) => {
          const value = element.getBoundingClientRect();
          return (
            groupRect &&
            value.top >= groupRect.top &&
            value.top < groupRect.top + 130
          );
        });
      const callRows = [
        ...new Map(
          labels
            .map((element) => ({
              label: element.textContent?.trim(),
              rect: rect(element),
              style: style(element),
            }))
            .filter(
              (row) =>
                row.rect &&
                groupRect &&
                row.rect.left >= groupRect.left + 20 &&
                Math.abs(row.rect.height - 21) < 0.1,
            )
            .map((row) => [`${row.rect.top}:${row.label}`, row]),
        ).values(),
      ].sort((left, right) => left.rect.top - right.rect.top);
      return {
        activity: { rect: activityRect, style: style(activity) },
        callRows,
        group: { rect: groupRect, style: style(group) },
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        window: { height: innerHeight, width: innerWidth },
      };
    }, name);

  await expandActivity(successDuration);
  const success = await readActivity(successDuration);
  const successWideScreenshot = screenshotPath("mcp-success-wide");
  await page.mouse.move(600, 600);
  await page.screenshot({ path: successWideScreenshot });

  await expandActivity(recoveryDuration);
  const recoveryWide = await readActivity(recoveryDuration);
  const recoveryWideScreenshot = screenshotPath("mcp-recovery-wide");
  await page.mouse.move(600, 600);
  await page.screenshot({ path: recoveryWideScreenshot });

  await page.setViewportSize(currentBaselineViewports.compact);
  await expandActivity(recoveryDuration);
  const recoveryCompact = await readActivity(recoveryDuration);
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
          element.textContent?.includes("Environment") &&
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
              label:
                element.getAttribute("aria-label") ??
                element.textContent?.replace(/\s+/g, " ").trim() ??
                "",
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
      text: panel?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      rows,
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
    capturedAtMs: Date.now(),
    fingerprint,
    ownerPid: Number(isolatedOwners[0].pid),
    recoveryCompact,
    recoveryCompactScreenshot,
    recoveryWide,
    recoveryWideScreenshot,
    sources,
    sourcesScreenshot,
    success,
    successWideScreenshot,
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
