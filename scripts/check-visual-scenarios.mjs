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
import {
  chromeLaunchArgs,
  findChromeExecutable,
} from "./browser-executable.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const manifestPath = join(root, "research/visual-scenarios.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const outputRoot = process.env.CODEX_UI_KIT_VISUAL_OUTPUT_DIR
  ? resolve(process.cwd(), process.env.CODEX_UI_KIT_VISUAL_OUTPUT_DIR)
  : mkdtempSync(join(tmpdir(), "codex-ui-kit-visual."));
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

if (
  manifest.version !== 1 ||
  !Array.isArray(manifest.scenarios) ||
  manifest.scenarios.length === 0
) {
  throw new Error("research/visual-scenarios.json must contain v1 scenarios.");
}

const scenarioById = new Map(
  manifest.scenarios.map((scenario) => [scenario.id, scenario]),
);
const argument = process.argv.find((value) => value.startsWith("--scenes="));
const requestedIds = (
  argument?.slice("--scenes=".length) ??
  process.env.CODEX_UI_KIT_VISUAL_SCENARIOS ??
  ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedScenarios =
  requestedIds.length > 0
    ? requestedIds.map((id) => {
        const scenario = scenarioById.get(id);
        if (!scenario) throw new Error(`Unknown visual scenario: ${id}`);
        return scenario;
      })
    : manifest.scenarios.filter(
        (scenario) => process.env[scenario.referenceEnv],
      );

if (selectedScenarios.length === 0) {
  throw new Error(
    "Select scenarios with --scenes=<ids> or set at least one manifest reference environment variable.",
  );
}

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

function configuredRatio(fallback, environment, label) {
  if (!environment || process.env[environment] === undefined) return fallback;
  const value = Number(process.env[environment]);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${environment} for ${label} must be between 0 and 1.`);
  }
  return value;
}

function geometryViolations(geometry, scenario) {
  const violations = [];
  for (const name of Object.keys(scenario.geometry)) {
    const actual = geometry[name];
    if (!actual) {
      violations.push({
        actual: null,
        expected: "matching element",
        name,
        property: "selector",
      });
      continue;
    }

    for (const [property, declaration] of Object.entries(
      scenario.expectedGeometry[name],
    )) {
      const expected =
        typeof declaration === "object" ? declaration.value : declaration;
      const tolerance =
        typeof declaration === "object" ? declaration.tolerance ?? 0 : 0;
      const actualValue = actual[property];
      const matches =
        typeof expected === "number"
          ? typeof actualValue === "number" &&
            Math.abs(actualValue - expected) <= tolerance
          : actualValue === expected;
      if (!matches) {
        violations.push({
          actual: actualValue,
          expected,
          name,
          property,
          tolerance,
        });
      }
    }
  }
  return violations;
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

function cloneImage(image) {
  const clone = new PNG({ height: image.height, width: image.width });
  image.data.copy(clone.data);
  return clone;
}

function normalizeMask(mask, width, height) {
  const left = Math.max(0, Math.min(width, Math.round(mask.left)));
  const top = Math.max(0, Math.min(height, Math.round(mask.top)));
  const right = Math.max(
    left,
    Math.min(width, Math.round(mask.left + mask.width)),
  );
  const bottom = Math.max(
    top,
    Math.min(height, Math.round(mask.top + mask.height)),
  );
  return {
    ...mask,
    height: bottom - top,
    left,
    top,
    width: right - left,
  };
}

function applyMasks(reference, actual, masks) {
  const normalized = masks.map((mask) =>
    normalizeMask(mask, reference.width, reference.height),
  );
  for (const mask of normalized) {
    for (let y = mask.top; y < mask.top + mask.height; y += 1) {
      for (let x = mask.left; x < mask.left + mask.width; x += 1) {
        const index = (y * reference.width + x) * 4;
        reference.data[index] = 0;
        reference.data[index + 1] = 0;
        reference.data[index + 2] = 0;
        reference.data[index + 3] = 0;
        actual.data[index] = 0;
        actual.data[index + 1] = 0;
        actual.data[index + 2] = 0;
        actual.data[index + 3] = 0;
      }
    }
  }
  return normalized;
}

function mismatchRegions(diff, scenario) {
  return scenario.regions.map((region) => {
    const left = region.left ?? 0;
    const width = region.width ?? diff.width - left;
    const top =
      region.fromBottom === undefined
        ? region.top
        : diff.height - region.fromBottom;
    if (
      !Number.isInteger(top) ||
      !Number.isInteger(region.height) ||
      !Number.isInteger(left) ||
      !Number.isInteger(width) ||
      left < 0 ||
      width <= 0 ||
      left + width > diff.width ||
      top < 0 ||
      region.height <= 0 ||
      top + region.height > diff.height
    ) {
      throw new Error(
        `${scenario.id} region ${region.name} was outside the reference image.`,
      );
    }
    let mismatches = 0;
    for (let y = top; y < top + region.height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        const index = (y * diff.width + x) * 4;
        if (
          diff.data[index] === 255 &&
          diff.data[index + 1] === 82 &&
          diff.data[index + 2] === 82
        ) {
          mismatches += 1;
        }
      }
    }
    const pixels = region.height * width;
    const maximumDiffRatio = configuredRatio(
      region.maximumDiffRatio,
      region.maximumDiffRatioEnv,
      `${scenario.id}/${region.name}`,
    );
    return {
      diffRatio: Number((mismatches / pixels).toFixed(6)),
      height: region.height,
      left,
      maximumDiffRatio,
      mismatches,
      name: region.name,
      pixels,
      top,
      width,
    };
  });
}

const chrome = findChromeExecutable();
if (!chrome) {
  throw new Error("Chrome or Chromium is required for visual scenarios.");
}

mkdirSync(outputRoot, { recursive: true });
const server = createDemoServer();
const address = await listen(server);
if (!address || typeof address === "string") {
  server.close();
  throw new Error("Failed to start the visual fixture server.");
}

let browser;
const results = [];
try {
  browser = await puppeteer.launch({
    args: chromeLaunchArgs,
    executablePath: chrome,
    headless: true,
  });
  for (const scenario of selectedScenarios) {
    const referenceValue = process.env[scenario.referenceEnv];
    const referencePath = referenceValue
      ? resolve(process.cwd(), referenceValue)
      : undefined;
    if (!referencePath || !existsSync(referencePath)) {
      throw new Error(
        `${scenario.id} requires ${scenario.referenceEnv} to point to a current-build PNG capture.`,
      );
    }
    const referenceOriginal = PNG.sync.read(readFileSync(referencePath));
    const maximumDiffRatio = configuredRatio(
      scenario.maximumDiffRatio,
      scenario.maximumDiffRatioEnv,
      scenario.id,
    );
    const pixelThreshold = configuredRatio(
      scenario.pixelThreshold,
      scenario.pixelThresholdEnv,
      `${scenario.id} pixel threshold`,
    );
    const outputDir = join(outputRoot, scenario.id);
    mkdirSync(outputDir, { recursive: true });
    const page = await browser.newPage();
    try {
      const captureViewport = {
        deviceScaleFactor: 1,
        height: referenceOriginal.height,
        width: referenceOriginal.width,
      };
      await page.setViewport(
        scenario.warmViewport
          ? { deviceScaleFactor: 1, ...scenario.warmViewport }
          : captureViewport,
      );
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
        {
          name: "prefers-color-scheme",
          value: scenario.colorScheme,
        },
      ]);
      await page.goto(
        `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=${encodeURIComponent(scenario.capture)}`,
        { waitUntil: "networkidle0" },
      );
      await page.waitForSelector(
        `.current-thread-pixel-fixture[data-visual-scene="${scenario.fixtureId ?? scenario.id}"]`,
      );
      await page.evaluate(() => document.fonts.ready);
      if (scenario.warmViewport) {
        await page.setViewport(captureViewport);
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
      }
      await page.addStyleTag({
        content:
          "*, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }",
      });
      const geometry = await page.evaluate((selectors) => {
        const bounds = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            bottom: Math.round(rect.bottom),
            borderRadius: style.borderRadius,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            lineHeight: style.lineHeight,
            padding: style.padding,
            top: Math.round(rect.top),
            width: Math.round(rect.width),
          };
        };
        return Object.fromEntries(
          Object.entries(selectors).map(([name, selector]) => [
            name,
            bounds(selector),
          ]),
        );
      }, scenario.geometry);
      const geometryContractViolations = geometryViolations(
        geometry,
        scenario,
      );

      const actualPath = join(outputDir, "actual.png");
      const diffPath = join(outputDir, "diff.png");
      await page.screenshot({ path: actualPath });
      const actualOriginal = PNG.sync.read(readFileSync(actualPath));
      if (
        actualOriginal.width !== referenceOriginal.width ||
        actualOriginal.height !== referenceOriginal.height
      ) {
        throw new Error(
          `${scenario.id} screenshot ${actualOriginal.width}x${actualOriginal.height} did not match reference ${referenceOriginal.width}x${referenceOriginal.height}.`,
        );
      }

      const reference = cloneImage(referenceOriginal);
      const actual = cloneImage(actualOriginal);
      const masks = applyMasks(reference, actual, scenario.masks ?? []);
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
      const regions = mismatchRegions(diff, scenario);
      const failed =
        geometryContractViolations.length > 0 ||
        diffRatio > maximumDiffRatio ||
        regions.some(
          (region) => region.diffRatio > region.maximumDiffRatio,
        );
      results.push({
        actualDominantColors: dominantColors(actualOriginal),
        actualPath,
        diffPath,
        diffRatio: Number(diffRatio.toFixed(6)),
        failed,
        geometry,
        geometryContractViolations,
        id: scenario.id,
        masks,
        maximumDiffRatio,
        mismatchedPixels,
        mismatchRegions: regions,
        pixelThreshold,
        reference: {
          dominantColors: dominantColors(referenceOriginal),
          environment: scenario.referenceEnv,
          height: referenceOriginal.height,
          path: referencePath,
          width: referenceOriginal.width,
        },
        totalPixels,
      });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await closeServer(server);
}

const report = {
  failed: results.some((result) => result.failed),
  manifestPath,
  outputRoot,
  scenarios: results,
};
console.log(JSON.stringify(report, null, 2));
if (report.failed) process.exitCode = 1;
