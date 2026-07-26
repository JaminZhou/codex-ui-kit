import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const referencePath = process.env.CODEX_UI_KIT_THREAD_REFERENCE;
const maximumDiffRatio = Number(
  process.env.CODEX_UI_KIT_VISUAL_MAX_DIFF ?? "0.005",
);
const pixelThreshold = Number(
  process.env.CODEX_UI_KIT_PIXEL_THRESHOLD ?? "0.05",
);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

if (!referencePath || !existsSync(referencePath)) {
  throw new Error(
    "Set CODEX_UI_KIT_THREAD_REFERENCE to a current-build main-only PNG capture.",
  );
}
if (!Number.isFinite(maximumDiffRatio) || maximumDiffRatio < 0) {
  throw new Error("CODEX_UI_KIT_VISUAL_MAX_DIFF must be a non-negative number.");
}
if (
  !Number.isFinite(pixelThreshold) ||
  pixelThreshold < 0 ||
  pixelThreshold > 1
) {
  throw new Error("CODEX_UI_KIT_PIXEL_THRESHOLD must be between 0 and 1.");
}

const reference = PNG.sync.read(readFileSync(referencePath));
const outputDir = process.env.CODEX_UI_KIT_VISUAL_OUTPUT_DIR
  ? resolve(process.cwd(), process.env.CODEX_UI_KIT_VISUAL_OUTPUT_DIR)
  : mkdtempSync(join(tmpdir(), "codex-ui-kit-current-thread-visual."));
mkdirSync(outputDir, { recursive: true });

function dominantColors(image, limit = 6) {
  const counts = new Map();
  for (let index = 0; index < image.data.length; index += 4) {
    const key = `${image.data[index]},${image.data[index + 1]},${image.data[index + 2]},${image.data[index + 3]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([rgba, pixels]) => ({ pixels, rgba }));
}

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function createDemoServer() {
  return createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const withoutBase = requestUrl.pathname.replace(/^\/codex-ui-kit\/?/, "");
    const relativePath = withoutBase || "index.html";
    const filePath = normalize(join(demoRoot, relativePath));
    if (!filePath.startsWith(`${demoRoot}${sep}`) && filePath !== demoRoot) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const body = readFileSync(filePath);
      response.writeHead(200, {
        "content-type":
          contentTypes.get(extname(filePath)) ?? "application/octet-stream",
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
  throw new Error("Chrome or Chromium is required for the visual contract.");
}

const server = createDemoServer();
const address = await listen(server);
if (!address || typeof address === "string") {
  server.close();
  throw new Error("Failed to start the visual fixture server.");
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({
    deviceScaleFactor: 1,
    height: reference.height,
    width: reference.width,
  });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
    { name: "prefers-color-scheme", value: "dark" },
  ]);
  await page.goto(
    `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=current-thread`,
    { waitUntil: "networkidle0" },
  );
  await page.waitForSelector(".current-thread-pixel-fixture");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      "*, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }",
  });
  const geometry = await page.evaluate(() => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
      };
    };
    return {
      assistant: bounds(
        '.codex-ui-agent-message[data-role="assistant"] .codex-ui-agent-message__content',
      ),
      assistantActions: bounds(
        '.codex-ui-agent-message[data-role="assistant"] .codex-ui-agent-message__actions',
      ),
      composer: bounds(".codex-ui-composer"),
      header: bounds(".codex-ui-conversation-thread-shell__header"),
      thread: bounds(".codex-ui-conversation-thread-shell__thread"),
      user: bounds(
        '.codex-ui-agent-message[data-role="user"] .codex-ui-agent-message__content',
      ),
    };
  });

  const actualPath = join(outputDir, "actual.png");
  const diffPath = join(outputDir, "diff.png");
  await page.screenshot({ path: actualPath });
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (
    actual.width !== reference.width ||
    actual.height !== reference.height
  ) {
    throw new Error(
      `Screenshot size ${actual.width}x${actual.height} did not match reference ${reference.width}x${reference.height}.`,
    );
  }

  const diff = new PNG({
    height: reference.height,
    width: reference.width,
  });
  const mismatchedPixels = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    reference.width,
    reference.height,
    {
      alpha: 0.65,
      diffColor: [255, 82, 82],
      threshold: pixelThreshold,
    },
  );
  writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = reference.width * reference.height;
  const diffRatio = mismatchedPixels / totalPixels;
  const mismatchRegions = [
    {
      height: 46,
      maximumDiffRatio: Number(
        process.env.CODEX_UI_KIT_VISUAL_MAX_HEADER_DIFF ?? "0.03",
      ),
      name: "header",
      top: 0,
    },
    {
      height: 194,
      maximumDiffRatio: Number(
        process.env.CODEX_UI_KIT_VISUAL_MAX_MESSAGES_DIFF ?? "0.006",
      ),
      name: "messages",
      top: 46,
    },
    {
      height: 130,
      maximumDiffRatio: Number(
        process.env.CODEX_UI_KIT_VISUAL_MAX_COMPOSER_DIFF ?? "0.012",
      ),
      name: "composer",
      top: reference.height - 130,
    },
  ].map((region) => {
    let mismatches = 0;
    for (let y = region.top; y < region.top + region.height; y += 1) {
      for (let x = 0; x < reference.width; x += 1) {
        const index = (y * reference.width + x) * 4;
        if (
          diff.data[index] === 255 &&
          diff.data[index + 1] === 82 &&
          diff.data[index + 2] === 82
        ) {
          mismatches += 1;
        }
      }
    }
    const pixels = region.height * reference.width;
    return {
      diffRatio: Number((mismatches / pixels).toFixed(6)),
      maximumDiffRatio: region.maximumDiffRatio,
      mismatches,
      name: region.name,
      pixels,
    };
  });
  if (
    mismatchRegions.some(
      (region) =>
        !Number.isFinite(region.maximumDiffRatio) ||
        region.maximumDiffRatio < 0,
    )
  ) {
    throw new Error("Visual region diff limits must be non-negative numbers.");
  }
  const result = {
    actualDominantColors: dominantColors(actual),
    actualPath,
    diffPath,
    diffRatio: Number(diffRatio.toFixed(6)),
    geometry,
    maximumDiffRatio,
    mismatchRegions,
    mismatchedPixels,
    pixelThreshold,
    reference: {
      dominantColors: dominantColors(reference),
      height: reference.height,
      path: referencePath,
      width: reference.width,
    },
    totalPixels,
  };
  console.log(JSON.stringify(result, null, 2));

  if (
    diffRatio > maximumDiffRatio ||
    mismatchRegions.some(
      (region) => region.diffRatio > region.maximumDiffRatio,
    )
  ) {
    process.exitCode = 1;
  }
} finally {
  await browser?.close();
  await closeServer(server);
}
