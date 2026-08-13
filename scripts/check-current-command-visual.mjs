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

const referencePath = process.env.CODEX_UI_KIT_COMMAND_SUCCESS_REFERENCE;
if (!referencePath) {
  console.log(
    "Current command visual gate skipped: CODEX_UI_KIT_COMMAND_SUCCESS_REFERENCE is not set.",
  );
  process.exit(0);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const demoRoot = join(root, "demo/dist");
const resolvedReference = resolve(process.cwd(), referencePath);
if (!existsSync(resolvedReference)) {
  throw new Error(`Current command reference not found: ${resolvedReference}`);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
]);
const regions = [
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
];

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
  await page.goto(
    `http://127.0.0.1:${address.port}/codex-ui-kit/?capture=current-command-success`,
    { waitUntil: "networkidle0" },
  );
  await page.waitForSelector(
    '.current-command-lifecycle[data-visual-scene="current-command-success"]',
  );
  const actual = PNG.sync.read(Buffer.from(await page.screenshot()));
  const reference = PNG.sync.read(readFileSync(resolvedReference));
  if (reference.width !== 1180 || reference.height !== 820) {
    throw new Error(
      `Current command reference must be 1180x820, received ${reference.width}x${reference.height}.`,
    );
  }

  const outputDirectory = process.env.CODEX_UI_KIT_COMMAND_VISUAL_OUTPUT_DIR
    ? resolve(process.cwd(), process.env.CODEX_UI_KIT_COMMAND_VISUAL_OUTPUT_DIR)
    : null;
  if (outputDirectory) mkdirSync(outputDirectory, { recursive: true });

  const results = regions.map((region) => {
    const actualCrop = crop(actual, region.actual);
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
    if (outputDirectory) {
      writeFileSync(
        join(outputDirectory, `${region.name}.actual.png`),
        PNG.sync.write(actualCrop),
      );
      writeFileSync(
        join(outputDirectory, `${region.name}.reference.png`),
        PNG.sync.write(referenceCrop),
      );
      writeFileSync(
        join(outputDirectory, `${region.name}.diff.png`),
        PNG.sync.write(diff),
      );
    }
    return {
      diffRatio,
      maximumDiffRatio: region.maximumDiffRatio,
      mismatches,
      name: region.name,
      pixels,
    };
  });

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
