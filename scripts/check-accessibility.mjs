import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const semanticRules = [
  "aria-prohibited-attr",
  "aria-valid-attr-value",
  "label",
  "scrollable-region-focusable",
];
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function findExecutable(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    findExecutable("google-chrome"),
    findExecutable("google-chrome-stable"),
    findExecutable("chromium"),
    findExecutable("chromium-browser"),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function createDemoServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const withoutBase = requestUrl.pathname.replace(/^\/codex-ui-kit\/?/, "");
      const relativePath = withoutBase || "index.html";
      const filePath = normalize(join(demoRoot, relativePath));
      if (!filePath.startsWith(`${demoRoot}${sep}`) && filePath !== demoRoot) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

const chrome = findChrome();
if (!chrome) {
  throw new Error(
    "Chrome or Chromium is required for the accessibility contract. Set PUPPETEER_EXECUTABLE_PATH when it is installed in a non-standard location.",
  );
}

const server = createDemoServer();
const address = await listen(server);
if (!address || typeof address === "string") {
  server.close();
  throw new Error("failed to start the accessibility fixture server");
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox"],
});

const cases = [
  { dark: false, height: 1_000, name: "desktop light", width: 1_440 },
  { dark: true, height: 1_000, name: "desktop dark", width: 1_440 },
  { dark: false, height: 680, name: "compact light", width: 820 },
];
const failures = [];

try {
  for (const testCase of cases) {
    const page = await browser.newPage();
    await page.setViewport({
      height: testCase.height,
      width: testCase.width,
    });
    await page.goto(
      `http://127.0.0.1:${address.port}/codex-ui-kit/`,
      { waitUntil: "networkidle0" },
    );
    if (testCase.dark) {
      await page.click(".showcase__topbar-actions button");
    }
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async (rules) => {
      const report = await globalThis.axe.run(document, {
        runOnly: { type: "rule", values: rules },
      });
      const simplify = (entry) => ({
        id: entry.id,
        impact: entry.impact,
        nodes: entry.nodes.map((node) => ({
          failureSummary: node.failureSummary,
          target: node.target,
        })),
      });
      return {
        incomplete: report.incomplete.map(simplify),
        violations: report.violations.map(simplify),
      };
    }, semanticRules);
    await page.close();

    if (result.violations.length > 0 || result.incomplete.length > 0) {
      failures.push({ case: testCase.name, ...result });
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error("accessibility semantic contract failed");
}

console.log(
  `accessibility semantic contract ok: ${semanticRules.length} rules across ${cases.length} viewports`,
);
