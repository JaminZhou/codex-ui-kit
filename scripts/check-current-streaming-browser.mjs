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
try {
  const page = await browser.newPage();
  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 1180 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
    { name: "prefers-color-scheme", value: "dark" },
  ]);
  await page.goto(
    `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=current-thread-streaming-compact`,
    { waitUntil: "networkidle0" },
  );
  await page.waitForSelector(
    '.current-thread-pixel-fixture[data-visual-scene="current-thread-streaming-compact"]',
  );

  const capture = () =>
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
      const shell = document.querySelector(
        ".codex-ui-conversation-thread-shell",
      );
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      const stop = document.querySelector(
        '.codex-ui-composer__primary[data-action="stop"]',
      );
      const stopIcon = stop?.querySelector("svg");
      const submit = document.querySelector(
        '.codex-ui-composer__primary[data-action="submit"]',
      );
      return {
        bodyOverflow: document.body.scrollWidth - document.documentElement.clientWidth,
        composer: rect(".codex-ui-composer"),
        latestOrigin: shell?.getAttribute("data-latest-origin"),
        running: shell?.getAttribute("data-running"),
        send: rect('.codex-ui-composer__primary[data-action="submit"]'),
        sendDisabled:
          submit instanceof HTMLButtonElement ? submit.disabled : null,
        stop: rect('.codex-ui-composer__primary[data-action="stop"]'),
        stopIcon: rect(
          '.codex-ui-composer__primary[data-action="stop"] .codex-ui-composer__stop-icon',
        ),
        stopPath: stopIcon?.querySelector("path")?.getAttribute("d") ?? null,
        stopViewBox: stopIcon?.getAttribute("viewBox") ?? null,
        thread: rect(".codex-ui-conversation-thread-shell__thread"),
        user: rect(
          '.codex-ui-agent-message[data-role="user"] .codex-ui-agent-message__content',
        ),
        viewportScrollTop:
          viewport instanceof HTMLElement ? viewport.scrollTop : null,
      };
    });

  const wide = await capture();
  await page.setViewport({ deviceScaleFactor: 1, height: 680, width: 720 });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const compact = await capture();
  await page.click('.codex-ui-composer__primary[data-action="stop"]');
  await page.waitForSelector('.codex-ui-composer__primary[data-action="submit"]');
  const recovered = await capture();

  const failures = [];
  const expect = (condition, message) => {
    if (!condition) failures.push(message);
  };
  expect(wide.running === "true" && wide.latestOrigin === "start", "wide running origin");
  expect(wide.stop?.width === 28 && wide.stop?.height === 28, "wide Stop geometry");
  expect(wide.stopIcon?.width === 16 && wide.stopIcon?.height === 16, "wide Stop icon geometry");
  expect(wide.stopViewBox === "0 0 20 20", "Stop viewBox");
  expect(
    wide.stopPath ===
      "M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z",
    "Stop path",
  );
  expect(wide.thread?.height === 858 && wide.thread?.top === -38, "wide running follow height");
  expect(compact.thread?.height === 858 && compact.thread?.top === -178, "compact retained follow height");
  expect(compact.user?.top === -145, "compact user clipping");
  expect(compact.composer?.left === 16 && compact.composer?.width === 688, "compact Composer");
  expect(compact.viewportScrollTop === 0, "compact reverse scroll origin");
  expect(recovered.running === null && recovered.latestOrigin === "end", "recovered origin");
  expect(recovered.stop === null && recovered.send?.width === 28, "Stop to Send recovery");
  expect(recovered.sendDisabled === true, "empty recovered Send disabled");
  expect([wide, compact, recovered].every((state) => state.bodyOverflow === 0), "horizontal overflow");

  const report = { compact, failures, recovered, wide };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
