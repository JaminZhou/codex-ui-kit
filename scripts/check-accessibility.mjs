import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import puppeteer from "puppeteer-core";
import {
  contrastRatio,
  partitionWcagIncomplete,
} from "./accessibility-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const semanticRules = [
  "aria-prohibited-attr",
  "aria-valid-attr-value",
  "label",
  "scrollable-region-focusable",
];
const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
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

const cases = [
  { dark: false, height: 1_000, name: "desktop light", width: 1_440 },
  { dark: true, height: 1_000, name: "desktop dark", width: 1_440 },
  { dark: false, height: 680, name: "compact light", width: 820 },
];
const failures = [];
let incompleteWcagChecks = 0;
let browser;

function parseComputedRgb(value) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) {
    throw new Error(`could not parse computed color: ${value}`);
  }
  return channels;
}

async function sampleThemeTransitionContrast(page) {
  const samples = [];
  let elapsed = 0;
  for (const sampleAt of [0, 25, 50, 100, 175]) {
    if (sampleAt > elapsed) {
      await new Promise((resolve) => setTimeout(resolve, sampleAt - elapsed));
      elapsed = sampleAt;
    }
    const colors = await page.evaluate(() => {
      const label = document.querySelector(
        '.codex-ui-button[data-tone="danger"] > .codex-ui-button__label',
      );
      const control = label?.closest("button");
      if (!label || !control) return null;
      return {
        background: getComputedStyle(control).backgroundColor,
        foreground: getComputedStyle(label).color,
      };
    });
    if (!colors) {
      throw new Error("danger control is missing from the accessibility fixture");
    }
    samples.push({
      at: sampleAt,
      background: colors.background,
      foreground: colors.foreground,
      ratio: contrastRatio(
        parseComputedRgb(colors.foreground),
        parseComputedRgb(colors.background),
      ),
    });
  }
  return samples;
}

try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  for (const testCase of cases) {
    const page = await browser.newPage();
    let themeTransitionViolations = [];
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
      const transitionSamples = await sampleThemeTransitionContrast(page);
      themeTransitionViolations = transitionSamples.filter(
        (sample) => sample.ratio < 4.5,
      );
    }
    await page.addScriptTag({ content: axe.source });
    const result = await page.evaluate(async ({ rules, tags }) => {
      const simplify = (entry) => ({
        id: entry.id,
        impact: entry.impact,
        nodeCount: entry.nodes.length,
        nodes: entry.nodes.map((node) => ({
          failureSummary: node.failureSummary,
          target: node.target,
        })).slice(0, 20),
      });
      const semanticReport = await globalThis.axe.run(document, {
        runOnly: { type: "rule", values: rules },
      });
      const wcagReport = await globalThis.axe.run(document, {
        runOnly: { type: "tag", values: tags },
      });
      return {
        semantic: {
          incomplete: semanticReport.incomplete.map(simplify),
          violations: semanticReport.violations.map(simplify),
        },
        wcag: {
          incomplete: wcagReport.incomplete.map(simplify),
          violations: wcagReport.violations.map(simplify),
        },
      };
    }, { rules: semanticRules, tags: wcagTags });
    await page.close();

    const { manualReview, unexpected } = partitionWcagIncomplete(
      result.wcag.incomplete,
    );
    result.wcag.incomplete = unexpected;
    incompleteWcagChecks += manualReview.reduce(
      (total, entry) => total + entry.nodeCount,
      0,
    );
    if (
      result.semantic.violations.length > 0 ||
      result.semantic.incomplete.length > 0 ||
      result.wcag.violations.length > 0 ||
      result.wcag.incomplete.length > 0 ||
      themeTransitionViolations.length > 0
    ) {
      failures.push({
        case: testCase.name,
        themeTransitionViolations,
        ...result,
      });
    }
  }
} finally {
  await browser?.close();
  await closeServer(server);
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error("accessibility contract failed");
}

console.log(
  `accessibility contract ok: ${semanticRules.length} strict semantic rules and WCAG A/AA/2.2 across ${cases.length} viewports (${incompleteWcagChecks} manual-review nodes)`,
);
