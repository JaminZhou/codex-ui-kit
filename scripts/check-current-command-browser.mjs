import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import {
  chromeLaunchArgs,
  findChromeExecutable,
} from "./browser-executable.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
]);

const executablePath = findChromeExecutable();
if (!executablePath) throw new Error("Chrome or Chromium is required.");

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const relativePath =
    requestUrl.pathname.replace(/^\/codex-ui-kit\/?/, "") || "index.html";
  const path = normalize(join(demoRoot, relativePath));
  if (!path.startsWith(`${demoRoot}${sep}`) && path !== demoRoot) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = readFileSync(path);
    response.writeHead(200, {
      "content-type": contentTypes.get(extname(path)) ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("No demo port.");

const browser = await puppeteer.launch({
  args: chromeLaunchArgs,
  executablePath,
  headless: true,
});

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

try {
  const page = await browser.newPage();
  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 1180 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
    { name: "prefers-color-scheme", value: "dark" },
  ]);

  const open = async (capture) => {
    await page.goto(
      `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=${capture}`,
      { waitUntil: "networkidle0" },
    );
    await page.waitForSelector(
      `.current-command-lifecycle[data-visual-scene="${capture}"]`,
    );
  };

  const snapshot = () =>
    page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) return null;
        const bounds = element.getBoundingClientRect();
        return {
          height: Math.round(bounds.height),
          left: Math.round(bounds.left),
          top: Math.round(bounds.top),
          width: Math.round(bounds.width),
        };
      };
      const style = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) return null;
        const computed = getComputedStyle(element);
        return {
          color: computed.color,
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          maxHeight: computed.maxHeight,
          padding: computed.padding,
        };
      };
      const root = document.querySelector(".current-command-lifecycle");
      const execution = document.querySelector(
        ".codex-ui-command-execution",
      );
      const submit = document.querySelector(
        '.codex-ui-composer__primary[data-action="submit"]',
      );
      const textarea = document.querySelector(
        '.codex-ui-composer textarea[aria-label="Message"]',
      );
      const icon = document.querySelector(
        'svg[data-current-build-icon="thread-command-terminal"]',
      );
      return {
        bodyOverflow:
          document.body.scrollWidth - document.documentElement.clientWidth,
        composer: rect(".codex-ui-composer"),
        command: rect(".codex-ui-command-execution"),
        commandHeaderStyle: style(
          ".codex-ui-command-execution .codex-ui-activity__header",
        ),
        commandLine: rect(".codex-ui-command-execution__command-line"),
        commandLineStyle: style(".codex-ui-command-execution__command-line"),
        commandOutput: rect(".codex-ui-command-output"),
        commandOutputPre: rect(".codex-ui-command-output pre"),
        commandOutputPreStyle: style(".codex-ui-command-output pre"),
        commandShell: rect(".codex-ui-command-execution__shell"),
        commandShellStyle: style(".codex-ui-command-execution__shell"),
        executionStatus: execution?.getAttribute("data-execution-status") ?? null,
        interruptionSummary: rect(".codex-ui-thread-interruption-summary"),
        interruptionSummaryStyle: style(
          ".codex-ui-thread-interruption-summary__label",
        ),
        interruptionPhase: root?.getAttribute("data-interruption-phase") ?? null,
        rootText: root?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        send: rect('.codex-ui-composer__primary[data-action="submit"]'),
        sendDisabled:
          submit instanceof HTMLButtonElement ? submit.disabled : null,
        stop: rect('.codex-ui-composer__primary[data-action="stop"]'),
        stopAll: rect(
          '[aria-label="Stop all background terminals"]',
        ),
        stopProcess: rect('[aria-label="Stop Background terminal"]'),
        terminalAssetCount: document.querySelectorAll(
          '[data-current-build-icon="thread-command-terminal"]',
        ).length,
        terminalPathCount: icon?.querySelectorAll("path").length ?? 0,
        terminalViewBox: icon?.getAttribute("viewBox") ?? null,
        textareaValue:
          textarea instanceof HTMLTextAreaElement ? textarea.value : null,
      };
    });

  await open("current-command-success");
  const success = await snapshot();
  expect(success.executionStatus === "completed", "success command completed");
  expect(success.stop?.width === 28, "success retains current-turn Stop");
  expect(success.send === null, "success settling has no Send control");
  expect(success.stopAll === null, "success has no background Stop all");
  expect(success.rootText.includes("Success"), "success exit footer");
  expect(success.rootText.includes("current-success-012"), "success output visible");
  expect(success.terminalAssetCount >= 1, "success exact terminal asset");
  expect(success.terminalViewBox === "0 0 20 20", "terminal asset viewBox");
  expect(success.terminalPathCount === 3, "terminal asset path count");
  expect(success.composer?.left === 222 && success.composer?.width === 736, "success wide composer");
  expect(success.bodyOverflow === 0, "success horizontal overflow");

  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 690 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const successCompact = await snapshot();
  if (process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR) {
    await page.screenshot({
      path: join(
        process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR,
        "current-command-success-690.png",
      ),
    });
  }
  expect(
    successCompact.composer?.left === 16 &&
      successCompact.composer?.width === 658,
    "success 690 composer",
  );
  expect(
    successCompact.command?.height === 260 &&
      successCompact.commandShell?.height === 228 &&
      successCompact.commandOutputPre?.height === 144,
    "success 690 command geometry",
  );
  expect(
    successCompact.commandLineStyle?.fontSize === "13px" &&
      successCompact.commandLineStyle?.fontWeight === "445" &&
      successCompact.commandLineStyle?.lineHeight === "19.5px",
    "success current command typography",
  );
  expect(
    successCompact.commandOutputPreStyle?.fontSize === "13px" &&
      successCompact.commandOutputPreStyle?.fontWeight === "445" &&
      successCompact.commandOutputPreStyle?.lineHeight === "19.5px",
    "success current output typography",
  );
  expect(successCompact.bodyOverflow === 0, "success 690 horizontal overflow");

  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 1180 });

  await open("current-command-failure");
  const failure = await snapshot();
  expect(failure.executionStatus === "failed", "failure command failed");
  expect(failure.stop === null && failure.send?.width === 28, "failure Send recovery");
  expect(failure.sendDisabled === true, "failure empty Send disabled");
  expect(failure.rootText.includes("Exit code 7"), "failure exit code 7");
  expect(failure.rootText.includes("current-stderr"), "failure stderr visible");
  expect(failure.rootText.includes("CURRENT COMMAND FAILURE OBSERVED"), "failure assistant recovery");
  expect(failure.terminalAssetCount >= 1, "failure exact terminal asset");
  expect(failure.bodyOverflow === 0, "failure horizontal overflow");

  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 690 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const failureCompact = await snapshot();
  if (process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR) {
    await page.screenshot({
      path: join(
        process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR,
        "current-command-failure-690.png",
      ),
    });
  }
  expect(
    failureCompact.composer?.left === 16 &&
      failureCompact.composer?.width === 658,
    "failure 690 composer",
  );
  expect(
    failureCompact.command?.height === 168 &&
      failureCompact.commandShell?.height === 139 &&
      failureCompact.commandOutputPre?.height === 55,
    "failure 690 command geometry",
  );
  expect(failureCompact.bodyOverflow === 0, "failure 690 horizontal overflow");

  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 1180 });

  await open("current-command-interruption");
  const running = await snapshot();
  expect(running.interruptionPhase === "running", "interruption running phase");
  expect(running.executionStatus === "running", "interruption command running");
  expect(running.stop?.width === 28, "interruption current-turn Stop");
  expect(running.stopAll === null, "running has no background Stop all");
  expect(running.rootText.includes("Running for i in"), "running command summary");

  await page.click('.codex-ui-composer__primary[data-action="stop"]');
  await page.waitForSelector('[aria-label="Stop all background terminals"]');
  const stopping = await snapshot();
  expect(stopping.interruptionPhase === "stopping", "interruption stopping phase");
  expect(stopping.executionStatus === "interrupted", "interruption transient execution state");
  expect(stopping.stop === null && stopping.send?.width === 28, "current Stop returns to Send");
  expect(stopping.stopAll !== null, "background Stop all is separate");
  expect(stopping.stopProcess !== null, "background process Stop is separate");
  expect(stopping.rootText.includes("You stopped after 8s"), "interruption summary");
  expect(stopping.rootText.includes("Background terminal stopped with"), "background stopping summary");

  await page.type(
    '.codex-ui-composer textarea[aria-label="Message"]',
    "CURRENT INTERRUPTION RECOVERY",
  );
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 1_100));
  await page.waitForSelector('[aria-label="Stop all background terminals"]');
  expect(
    (await snapshot()).interruptionPhase === "stopping",
    "stopping rejects premature recovery submission",
  );
  await page.click('[aria-label="Stop all background terminals"]');
  await page.waitForFunction(
    () =>
      document
        .querySelector(".current-command-lifecycle")
        ?.getAttribute("data-interruption-phase") === "settled",
  );
  const settled = await snapshot();
  if (process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR) {
    await page.screenshot({
      path: join(
        process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR,
        "current-command-interruption-settled-1180.png",
      ),
    });
  }
  expect(settled.interruptionPhase === "settled", "interruption settled phase");
  expect(settled.executionStatus === "interrupted", "background terminal remains stopped");
  expect(settled.stopAll === null && settled.stopProcess === null, "background controls removed");
  expect(
    settled.rootText.includes("Background terminal stopped with for i in"),
    "settled stopped-command summary",
  );

  await page.waitForFunction(
    () => {
      const submit = document.querySelector(
        '.codex-ui-composer__primary[data-action="submit"]',
      );
      return submit instanceof HTMLButtonElement && !submit.disabled;
    },
  );
  await page.click('.codex-ui-composer__primary[data-action="submit"]');
  await page.waitForFunction(
    () =>
      document
        .querySelector(".current-command-lifecycle")
        ?.getAttribute("data-interruption-phase") === "recovered",
  );
  const recoveredWide = await snapshot();
  if (process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR) {
    await page.screenshot({
      path: join(
        process.env.CODEX_UI_KIT_COMMAND_SCREENSHOT_DIR,
        "current-command-interruption-recovered-1180.png",
      ),
    });
  }
  expect(recoveredWide.rootText.includes("CURRENT INTERRUPTION RECOVERY ACCEPTED"), "interruption recovery response");
  expect(recoveredWide.executionStatus === "interrupted", "recovered thread retains stopped command");
  expect(
    !recoveredWide.rootText.includes("Ran for i in"),
    "recovered thread does not rewrite stopped command",
  );
  expect(recoveredWide.textareaValue === "", "recovery clears composer");
  expect(recoveredWide.sendDisabled === true, "recovered empty Send disabled");

  await page.setViewport({ deviceScaleFactor: 1, height: 680, width: 720 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const recoveredCompact = await snapshot();
  expect(
    recoveredCompact.composer?.left === 16 &&
      recoveredCompact.composer?.width === 688,
    "compact recovered composer",
  );
  expect(recoveredCompact.bodyOverflow === 0, "compact horizontal overflow");

  const report = {
    failure,
    failureCompact,
    failures,
    interruption: { recoveredCompact, recoveredWide, running, settled, stopping },
    success,
    successCompact,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
