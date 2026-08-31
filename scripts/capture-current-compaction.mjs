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

const baselinePrompt =
  "Do not use tools. Reply with exactly CURRENT 26.825 COMPACTION BASELINE READY";
const baselineReply = "CURRENT 26.825 COMPACTION BASELINE READY";
const recoveryPrompt =
  "Do not use tools. Reply with exactly CURRENT 26.825 COMPACTION RECOVERY ACCEPTED";
const recoveryReply = "CURRENT 26.825 COMPACTION RECOVERY ACCEPTED";
const port = Number(process.env.CODEX_CURRENT_COMPACTION_CDP_PORT);
const profilePath = process.env.CODEX_CURRENT_COMPACTION_PROFILE;
const requestedOutputDirectory =
  process.env.CODEX_CURRENT_COMPACTION_OUTPUT_DIR;
const allowMutation =
  process.env.CODEX_CURRENT_COMPACTION_ALLOW_MUTATION === "1";
const appBundle = "/Applications/ChatGPT.app";
const appInfoPlist = `${appBundle}/Contents/Info.plist`;
const appAsar = `${appBundle}/Contents/Resources/app.asar`;
const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Set a valid isolated context-compaction CDP port.");
}
if (!profilePath?.startsWith("/") || /\s/.test(profilePath)) {
  throw new Error("Set the absolute isolated context-compaction profile path.");
}
if (!requestedOutputDirectory?.startsWith("/")) {
  throw new Error("Set an absolute context-compaction output directory.");
}
if (!allowMutation) {
  throw new Error(
    "Set CODEX_CURRENT_COMPACTION_ALLOW_MUTATION=1 to authorize the two fixed no-tool turns and /compact in the isolated app.",
  );
}

const normalizedProfile = await realpath(profilePath);
if (!normalizedProfile.startsWith("/private/tmp/codex-ui-kit-")) {
  throw new Error(
    "The context-compaction profile must be isolated under /private/tmp.",
  );
}
const outputDirectory = resolve(requestedOutputDirectory);
if (
  dirname(outputDirectory) !== normalizedProfile ||
  !basename(outputDirectory).startsWith("current-compaction-capture-")
) {
  throw new Error(
    "The output must be a new current-compaction-capture-* direct child of the isolated profile.",
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
  throw new Error("Every context-compaction CDP listener must be loopback-only.");
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
  throw new Error("The isolated context-compaction CDP owner is ambiguous.");
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
      await control.first().click();
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
  const editor = () => page.getByRole("textbox").last();
  const submitFixedTurn = async (prompt, reply) => {
    const replyCountBefore = await page
      .getByText(reply, { exact: true })
      .count();
    const input = editor();
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await input.fill(prompt);
    await input.press("Enter");
    await page.waitForFunction(
      ({ count, text }) =>
        [...document.querySelectorAll("*")].filter(
          (element) =>
            element.children.length === 0 &&
            element.textContent?.trim() === text,
        ).length > count,
      { count: replyCountBefore, text: reply },
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () =>
        ![...document.querySelectorAll("button")].some(
          (button) =>
            button.checkVisibility({
              checkOpacity: true,
              checkVisibilityCSS: true,
            }) && button.getAttribute("aria-label") === "Stop",
        ),
      undefined,
      { timeout: 30_000 },
    );
  };
  const observe = async (label) =>
    page.evaluate((expectedLabel) => {
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
      const labelElement = leaves.findLast(
        (element) => element.textContent?.trim() === expectedLabel,
      );
      const buttonRect = (name) =>
        rect(
          [...document.querySelectorAll("button")].find(
            (button) =>
              visible(button) && button.getAttribute("aria-label") === name,
          ),
        );
      return {
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - innerWidth,
        ),
        label: {
          rect: rect(labelElement),
          style: style(labelElement),
          text: labelElement?.textContent?.trim() ?? null,
        },
        send: buttonRect("Send"),
        stop: buttonRect("Stop"),
        window: { height: innerHeight, width: innerWidth },
      };
    }, label);
  const capture = async (name, label) => {
    const threadViewport = page.locator(
      '[data-app-shell-main-content-layout="thread-edge-scroll"]',
    );
    if ((await threadViewport.count()) === 1) {
      await threadViewport.evaluate((element) => {
        if (element.parentElement) element.parentElement.scrollLeft = 0;
      });
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-app-shell-main-content-layout="thread-edge-scroll"]',
          )?.parentElement?.scrollLeft === 0,
      );
    }
    const screenshot = screenshotPath(name);
    const viewport = await page.evaluate(() => ({
      height: innerHeight,
      width: innerWidth,
    }));
    await page.mouse.move(viewport.width - 8, viewport.height - 8);
    await page.screenshot({ path: screenshot });
    return { name, observation: await observe(label), screenshot };
  };

  await page.setViewportSize(currentBaselineViewports.wide);
  await page.evaluate(async () => document.fonts.ready);
  await setSidebarVisible(false);
  await closePinnedPanels();
  const appMain = page.locator("main[data-app-shell-main-surface]");
  const baselineAlreadyPresent =
    (await page.getByText(baselineReply, { exact: true }).count()) === 1;
  if (!baselineAlreadyPresent) {
    if (!(await appMain.innerText()).includes("What should we build")) {
      throw new Error(
        "The isolated process is neither a new chat nor the exact resumable baseline task.",
      );
    }
    await submitFixedTurn(baselinePrompt, baselineReply);
  }
  await setSidebarVisible(true);
  await page.waitForFunction(() => {
    const selected = document.querySelector(
      '[data-app-action-sidebar-thread-row][data-app-action-sidebar-thread-selected="true"]',
    );
    return Boolean(selected?.getAttribute("data-app-action-sidebar-thread-id"));
  });
  const task = await page
    .locator(
      '[data-app-action-sidebar-thread-row][data-app-action-sidebar-thread-selected="true"]',
    )
    .evaluate((element) => ({
      id: element.getAttribute("data-app-action-sidebar-thread-id"),
      title: element.getAttribute("data-app-action-sidebar-thread-title"),
    }));
  if (!task.id || !task.title) {
    throw new Error("The disposable context-compaction task is unidentified.");
  }
  await setSidebarVisible(false);

  const input = editor();
  await input.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("/compact", { delay: 70 });
  const compactCommand = page
    .getByText(/^Compact this chat's context \(\d+% full\)$/)
    .last();
  await compactCommand.waitFor({ state: "visible", timeout: 10_000 });
  const compactCommandLabel = (await compactCommand.textContent())?.trim();
  if (!compactCommandLabel) {
    throw new Error("The current /compact command label is empty.");
  }
  const records = [await capture("command-menu-wide", compactCommandLabel)];
  const completedCountBefore = await page
    .getByText("Context compacted", { exact: true })
    .count();
  await compactCommand.click();

  const runningLabel = page.getByText("Compacting context", { exact: true });
  await runningLabel.waitFor({ state: "visible", timeout: 30_000 });
  records.push(await capture("running-wide", "Compacting context"));
  const terminalState = await page.waitForFunction(
    (initialCompletedCount) => {
      const text = document.body.innerText;
      if (text.includes("Error running remote compact task")) return "failed";
      const completedCount = [...document.querySelectorAll("*")].filter(
        (element) =>
          element.children.length === 0 &&
          element.textContent?.trim() === "Context compacted",
      ).length;
      const compactingVisible = [...document.querySelectorAll("*")].some(
        (element) =>
          element.children.length === 0 &&
          element.textContent?.trim() === "Compacting context" &&
          element instanceof HTMLElement &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      );
      if (completedCount > initialCompletedCount && !compactingVisible) {
        return "completed";
      }
      return null;
    },
    completedCountBefore,
    { timeout: 240_000 },
  );
  const outcome = await terminalState.jsonValue();
  if (outcome !== "completed") {
    records.push(await capture("failed-wide", "Compacting context"));
    throw new Error("The current remote context-compaction task failed.");
  }

  const completedLabel = page
    .getByText("Context compacted", { exact: true })
    .last();
  await completedLabel.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const visible = (element) =>
      element instanceof HTMLElement &&
      element.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    const buttons = [...document.querySelectorAll("button")].filter(visible);
    return (
      !buttons.some((button) => button.getAttribute("aria-label") === "Stop") &&
      buttons.some((button) => button.getAttribute("aria-label") === "Send")
    );
  });
  records.push(await capture("completed-wide", "Context compacted"));
  await submitFixedTurn(recoveryPrompt, recoveryReply);
  records.push(await capture("recovered-wide", "Context compacted"));
  await page.setViewportSize(currentBaselineViewports.compact);
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(250);
  records.push(await capture("recovered-compact", "Context compacted"));

  const finalInput = editor();
  const finalInputValue = await finalInput.evaluate((element) =>
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value
      : element.textContent ?? "",
  );
  if (finalInputValue !== "") {
    throw new Error("The recovered Composer is not empty.");
  }
  const afterFingerprint = await readInstalledSnapshot();
  if (
    Object.keys(fingerprint).some(
      (key) => afterFingerprint[key] !== fingerprint[key],
    )
  ) {
    throw new Error("The installed Codex build changed during compaction capture.");
  }
  const record = {
    capturedAtMs: Date.now(),
    fingerprint,
    fixedText: {
      baselinePrompt,
      baselineReply,
      recoveryPrompt,
      recoveryReply,
    },
    ownerPid: Number(isolatedOwners[0].pid),
    records,
    task: {
      id: task.id,
      titleSha256: sha256(task.title),
    },
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    flag: "wx",
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
} finally {
  if (page && !page.isClosed()) {
    if (initialSidebarVisible) {
      const control = page.locator('button[aria-label="Show sidebar"]:visible');
      if ((await control.count()) > 0) await control.first().click();
    }
    if (initialViewport) await page.setViewportSize(initialViewport);
  }
  await browser.close();
}
