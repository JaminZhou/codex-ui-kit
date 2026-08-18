import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import puppeteer from "puppeteer-core";
import {
  chromeLaunchArgs,
  findChromeExecutable,
} from "./browser-executable.mjs";

const referencePaths = {
  failure: process.env.CODEX_UI_KIT_COMMAND_FAILURE_REFERENCE,
  interruption: process.env.CODEX_UI_KIT_COMMAND_INTERRUPTION_REFERENCE,
  success: process.env.CODEX_UI_KIT_COMMAND_SUCCESS_REFERENCE,
};
if (!Object.values(referencePaths).some(Boolean)) {
  console.log(
    "Current command visual gate skipped: no current-command reference is set.",
  );
  process.exit(0);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
for (const [name, referencePath] of Object.entries(referencePaths)) {
  if (!referencePath) continue;
  const resolved = resolve(process.cwd(), referencePath);
  if (!existsSync(resolved)) {
    throw new Error(`Current ${name} command reference not found: ${resolved}`);
  }
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);
const sceneRegions = {
  failure: [
    {
      actual: { height: 168, left: 16, top: 207, width: 657 },
      maximumDiffRatio: 0.045,
      name: "command",
      reference: { height: 168, left: 16, top: 257, width: 657 },
    },
    {
      actual: { height: 98, left: 16, top: 706, width: 657 },
      maximumDiffRatio: 0.023,
      name: "composer",
      reference: { height: 98, left: 16, top: 706, width: 657 },
    },
  ],
  interruption: [
    {
      actual: { height: 67, left: 16, top: 163, width: 657 },
      maximumDiffRatio: 0.03,
      name: "stopped-command",
      reference: { height: 67, left: 16, top: 429, width: 657 },
    },
    {
      actual: { height: 98, left: 16, top: 706, width: 657 },
      maximumDiffRatio: 0.023,
      name: "composer",
      reference: { height: 98, left: 16, top: 706, width: 657 },
    },
  ],
  success: [
    {
      actual: { height: 227, left: 16, top: 177, width: 657 },
      maximumDiffRatio: 0.025,
      name: "command",
      reference: { height: 227, left: 16, top: 219, width: 657 },
    },
    {
      actual: { height: 98, left: 16, top: 706, width: 657 },
      maximumDiffRatio: 0.015,
      name: "composer",
      reference: { height: 98, left: 16, top: 706, width: 657 },
    },
  ],
};

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
      "content-type":
        contentTypes.get(extname(path)) ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolveListen, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolveListen);
});
const address = server.address();
if (!address || typeof address === "string") throw new Error("No demo port.");

const executablePath = findChromeExecutable();
if (!executablePath) throw new Error("Chrome or Chromium is required.");
const browser = await puppeteer.launch({
  args: chromeLaunchArgs,
  executablePath,
  headless: true,
});

function crop(image, region) {
  if (
    region.left < 0 ||
    region.top < 0 ||
    region.left + region.width > image.width ||
    region.top + region.height > image.height
  ) {
    throw new Error(`Crop is outside ${image.width}x${image.height}.`);
  }
  const output = new PNG({ height: region.height, width: region.width });
  PNG.bitblt(
    image,
    output,
    region.left,
    region.top,
    region.width,
    region.height,
    0,
    0,
  );
  return output;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ deviceScaleFactor: 1, height: 820, width: 690 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
    { name: "prefers-color-scheme", value: "dark" },
  ]);

  const outputDirectory = process.env.CODEX_UI_KIT_COMMAND_VISUAL_OUTPUT_DIR
    ? resolve(process.cwd(), process.env.CODEX_UI_KIT_COMMAND_VISUAL_OUTPUT_DIR)
    : null;
  if (outputDirectory) mkdirSync(outputDirectory, { recursive: true });

  const results = [];
  for (const name of ["success", "failure", "interruption"]) {
    const referencePath = referencePaths[name];
    if (!referencePath) continue;
    await page.goto(
      `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=current-command-${name}`,
      { waitUntil: "networkidle0" },
    );
    await page.waitForSelector(
      `.current-command-lifecycle[data-visual-scene="current-command-${name}"]`,
    );
    if (name === "interruption") {
      await page.click('.codex-ui-composer__primary[data-action="stop"]');
      await page.waitForSelector('[aria-label="Stop all background terminals"]');
      await page.click('[aria-label="Stop all background terminals"]');
      await page.waitForFunction(
        () =>
          document
            .querySelector(".current-command-lifecycle")
            ?.getAttribute("data-interruption-phase") === "settled",
      );
    }
    const actual = PNG.sync.read(Buffer.from(await page.screenshot()));
    const resolvedReference = resolve(process.cwd(), referencePath);
    const reference = PNG.sync.read(readFileSync(resolvedReference));
    if (reference.width !== 1180 || reference.height !== 820) {
      throw new Error(
        `Current ${name} command reference must be 1180x820, received ${reference.width}x${reference.height}.`,
      );
    }

    const anchors = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) return null;
        const bounds = element.getBoundingClientRect();
        return {
          left: Math.round(bounds.left),
          top: Math.round(bounds.top),
        };
      };
      return {
        command: rect(".codex-ui-command-execution"),
        composer: rect(".codex-ui-composer"),
        interruption: rect(".codex-ui-thread-interruption-summary"),
      };
    });
    for (const region of sceneRegions[name]) {
      const actualRegion = { ...region.actual };
      const anchor =
        region.name === "composer"
          ? anchors.composer
          : region.name === "stopped-command"
            ? anchors.interruption
            : name === "failure"
              ? anchors.command
              : null;
      if (anchor) {
        actualRegion.left = anchor.left;
        actualRegion.top = anchor.top;
      }
      const actualCrop = crop(actual, actualRegion);
      const referenceCrop = crop(reference, region.reference);
      const diff = new PNG({
        height: actualCrop.height,
        width: actualCrop.width,
      });
      const mismatches = pixelmatch(
        referenceCrop.data,
        actualCrop.data,
        diff.data,
        actualCrop.width,
        actualCrop.height,
        { threshold: 0.05 },
      );
      const pixels = actualCrop.width * actualCrop.height;
      const diffRatio = Number((mismatches / pixels).toFixed(6));
      const resultName = `${name}-${region.name}`;
      if (outputDirectory) {
        writeFileSync(
          join(outputDirectory, `${resultName}.actual.png`),
          PNG.sync.write(actualCrop),
        );
        writeFileSync(
          join(outputDirectory, `${resultName}.reference.png`),
          PNG.sync.write(referenceCrop),
        );
        writeFileSync(
          join(outputDirectory, `${resultName}.diff.png`),
          PNG.sync.write(diff),
        );
      }
      results.push({
        diffRatio,
        maximumDiffRatio: region.maximumDiffRatio,
        mismatches,
        name: resultName,
        pixels,
      });
    }
  }

  console.log(JSON.stringify({ results }, null, 2));
  const failed = results.filter(
    ({ diffRatio, maximumDiffRatio }) => diffRatio > maximumDiffRatio,
  );
  if (failed.length > 0) {
    throw new Error(
      `Current command visual regions failed: ${JSON.stringify(failed)}`,
    );
  }
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
