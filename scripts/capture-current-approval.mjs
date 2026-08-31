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

// Capture-only: this script never submits a prompt or chooses an approval.
// The isolated profile must already contain one pending external-file approval
// task and one settled task whose Composer exposes the permission selector.

const port = Number(process.env.CODEX_CURRENT_APPROVAL_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_APPROVAL_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_APPROVAL_OUTPUT_DIR;
const pendingTaskTitleSha256 =
  process.env.CODEX_CURRENT_APPROVAL_PENDING_TASK_TITLE_SHA256;
const settledTaskTitleSha256 =
  process.env.CODEX_CURRENT_APPROVAL_SETTLED_TASK_TITLE_SHA256;
const allowCapture =
  process.env.CODEX_CURRENT_APPROVAL_ALLOW_CAPTURE === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated approval CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated approval profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute approval output directory.");
}
for (const taskTitleSha256 of [
  pendingTaskTitleSha256,
  settledTaskTitleSha256,
]) {
  if (!/^[a-f0-9]{64}$/.test(taskTitleSha256 ?? "")) {
    throw new Error("Set the SHA-256 of both disposable approval task titles.");
  }
}
if (!allowCapture) {
  throw new Error(
    "Set CODEX_CURRENT_APPROVAL_ALLOW_CAPTURE=1 to authorize capture-only navigation and screenshot sampling in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error("The approval profile must be isolated under /private/tmp.");
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-approval-capture-")
) {
  throw new Error(
    "The output must be a new current-approval-capture-* direct child of the isolated profile.",
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
  throw new Error("Every approval CDP listener must be loopback-only.");
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
  throw new Error("The isolated approval CDP owner is ambiguous.");
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
  const openTask = async (taskTitleSha256) => {
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
      throw new Error("Could not resolve exactly one disposable approval task.");
    }
    await titleNodes.nth(matches[0].index).evaluate((element) => {
      const target = element.closest(
        '[data-app-action-sidebar-thread-row], button, a',
      );
      if (!(target instanceof HTMLElement)) {
        throw new Error("Disposable approval task row is not clickable.");
      }
      target.click();
    });
    await page.waitForTimeout(350);
  };
  const observeApprovalCard = async () =>
    pendingQuestion.last().evaluate((question) => {
      const round = (value) => Math.round(value * 1_000) / 1_000;
      const rect = (target) => {
        const value = target.getBoundingClientRect();
        return {
          height: round(value.height),
          left: round(value.left),
          top: round(value.top),
          width: round(value.width),
        };
      };
      let element = question;
      while (element.parentElement) {
        const labels = [...element.querySelectorAll("button")].map(
          (button) => button.textContent?.trim() ?? "",
        );
        if (
          labels.some((label) => label.startsWith("Deny")) &&
          labels.some((label) => label.startsWith("Allow once"))
        ) {
          break;
        }
        element = element.parentElement;
      }
      const style = getComputedStyle(element);
      return {
        rect: rect(element),
        style: {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          padding: style.padding,
        },
      };
    });

  await openTask(pendingTaskTitleSha256);
  const pendingQuestion = page.getByText(
    /(?:Would you like to allow Codex to edit|Allow ChatGPT to edit the following file\?)/,
  );
  await pendingQuestion.last().waitFor({ state: "visible", timeout: 10_000 });
  const pendingRecords = [];
  for (const viewportName of ["wide", "compact"]) {
    const viewport = currentBaselineViewports[viewportName];
    await page.setViewportSize(viewport);
    await page.evaluate(async () => document.fonts.ready);
    await setSidebarVisible(false);
    await closePinnedPanels();
    await pendingQuestion.last().evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await page.waitForTimeout(250);
    const deny = page.getByRole("button", { name: /^Deny/ });
    const allowOnce = page.getByRole("button", {
      name: /^Allow once/,
    });
    const options = page.getByRole("button", {
      exact: true,
      name: "Approval options",
    });
    if (
      (await deny.count()) !== 1 ||
      (await allowOnce.count()) !== 1 ||
      (await options.count()) !== 1
    ) {
      throw new Error("The pending approval actions are not uniquely visible.");
    }
    const screenshot = screenshotPath(`pending-${viewportName}`);
    await page.mouse.move(viewport.width - 8, viewport.height - 8);
    await page.screenshot({ path: screenshot });
    pendingRecords.push({
      actions: {
        allowOnce: await allowOnce.boundingBox(),
        deny: await deny.boundingBox(),
        options: await options.boundingBox(),
      },
      card: await observeApprovalCard(),
      screenshot,
      viewport: viewportName,
    });
    if (viewportName === "compact") {
      await options.click();
      const allowConversation = page.getByText("Allow all edits", {
        exact: true,
      });
      await allowConversation.waitFor({ state: "visible" });
      const labels = await page.getByRole("menuitem").evaluateAll((elements) =>
        elements
          .filter(
            (element) =>
              element instanceof HTMLElement &&
              element.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
          )
          .map((element) => element.textContent?.trim() ?? "")
          .filter((label) =>
            ["Allow once", "Allow all edits"].includes(label),
          ),
      );
      if (labels.join("|") !== "Allow once|Allow all edits") {
        throw new Error("The approval options labels do not match 26.825.");
      }
      const screenshot = screenshotPath("options-compact");
      await page.screenshot({ path: screenshot });
      pendingRecords.push({
        labels,
        screenshot,
        viewport: "compact-options",
      });
      await page.keyboard.press("Escape");
      if (!(await options.evaluate((element) => element === document.activeElement))) {
        throw new Error("Escape did not restore approval-options focus.");
      }
    }
  }

  await openTask(settledTaskTitleSha256);
  await page.setViewportSize(currentBaselineViewports.wide);
  await page.evaluate(async () => document.fonts.ready);
  await setSidebarVisible(false);
  await closePinnedPanels();
  const permissionTrigger = page
    .getByRole("button", { name: "Change permissions" })
    .filter({ hasText: "Ask for approval" });
  await permissionTrigger.waitFor({ state: "visible", timeout: 10_000 });
  await permissionTrigger.click();
  const expectedModes = ["Ask for approval", "Approve for me", "Full access"];
  const modeNodes = expectedModes.map((label) =>
    page.getByText(label, { exact: true }).last(),
  );
  await modeNodes[0].waitFor({ state: "visible" });
  const modeRects = [];
  for (const node of modeNodes) modeRects.push(await node.boundingBox());
  const permissionsScreenshot = screenshotPath("permissions-wide");
  await page.screenshot({ path: permissionsScreenshot });
  await page.keyboard.press("Escape");
  if (
    !(await permissionTrigger.evaluate(
      (element) => element === document.activeElement,
    ))
  ) {
    throw new Error("Escape did not restore permission-trigger focus.");
  }

  const afterFingerprint = await readInstalledSnapshot();
  if (
    Object.keys(fingerprint).some(
      (key) => afterFingerprint[key] !== fingerprint[key],
    )
  ) {
    throw new Error("The installed Codex build changed during approval capture.");
  }
  const record = {
    capturedAtMs: Date.now(),
    fingerprint,
    ownerPid: Number(isolatedOwners[0].pid),
    pending: {
      records: pendingRecords,
      taskTitleSha256: pendingTaskTitleSha256,
    },
    permissions: {
      modeRects,
      modes: expectedModes,
      screenshot: permissionsScreenshot,
      taskTitleSha256: settledTaskTitleSha256,
    },
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
