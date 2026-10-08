import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "playwright-core";
import { findChromeExecutable } from "../../../scripts/browser-executable.mjs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";
import { assertSrgbPaintCalibration, paintCalibrationHtml, paintCalibrationCrop } from "../../../scripts/paint-calibration-contract.mjs";
import { normalizeNavigationPng } from "../../../scripts/navigation-png-color.mjs";

const referenceDirectory = process.env.CODEX_UI_KIT_CURRENT_HOME_ASSET_REFERENCES;
assert.ok(referenceDirectory?.startsWith("/"), "Supply an absolute directory of hash-verified public product crops");
const manifest = JSON.parse(await readFile(new URL("../../../research/current-home-assets-26.930.61225.json", import.meta.url), "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const output = await mkdtemp(join(tmpdir(), "ui-kit-home-pixels-"));
const results = [];
const browserMode = process.argv.includes("--browser");
assert.ok(process.argv.slice(2).every(arg => arg === "--browser"));
async function launchBrowserScene(scene, width, height) {
  const dist = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
  const server = createServer(async (req, res) => {
    const path = resolve(dist, `.${new URL(req.url, "http://127.0.0.1").pathname === "/" ? "/index.html" : new URL(req.url, "http://127.0.0.1").pathname}`);
    if (!path.startsWith(`${dist}${sep}`)) { res.writeHead(403).end(); return; }
    try {
      const bytes = await readFile(path);
      res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" })[extname(path)] ?? "application/octet-stream");
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    const executablePath = findChromeExecutable();
    assert.ok(executablePath, "A local Chrome executable is required for independent Browser/CDP verification");
    browser = await chromium.launch({ executablePath, headless: true, args: ["--force-color-profile=srgb"] });
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const params = new URLSearchParams({ frame: scene.frame, scenario: scene.scenario, currentSidebar: "1", sidebarState: scene.sidebarState, theme: scene.theme, view: scene.view });
    await page.goto(`http://127.0.0.1:${server.address().port}/?${params}`);
    return { page, app: { close: async () => { try { await browser.close(); } finally { await new Promise(resolve => server.close(resolve)); } } } };
  } catch (error) {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    throw error;
  }
}
for (const sample of manifest.samples) {
  const { width, height } = sample.viewport;
  const scene = { currentSidebar: true, frame: "home-current-26-930-61225", id: `home-assets-${sample.theme}-${width}`, scenario: "streaming-recovery", sidebarState: "primary-navigation-current-26-930-61225", theme: sample.theme, view: "shell" };
  const { app, page } = browserMode ? await launchBrowserScene(scene, width, height) : await launchScene(scene, { capture: false, windowSize: { width, height }, deviceScaleFactor: 1 });
  try {
    await page.waitForSelector('[data-current-home-observed-icon="home-mark"]');
    if (width <= 721) await page.getByRole("button", { name: "Hide sidebar", exact: true }).first().click();
    await page.mouse.move(1, 1);
    for (const control of sample.controls) {
      const selector = control.id === "home-mark" ? ".demo-current-home-composer-26-930__mark" : `[data-home-composer-region="${control.id}"]`;
      const locator = page.locator(selector);
      const bounds = await locator.boundingBox();
      const svgBounds = await locator.locator("svg").boundingBox();
      for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(bounds[key] - control.rect[key]) <= .02, `${sample.theme}/${width}/${control.id}: ${key} geometry drift`);
      for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(svgBounds[key] - control.svgRect[key]) <= .02, `${sample.theme}/${width}/${control.id}: SVG ${key} geometry drift`);
      const expectedBytes = await readFile(join(referenceDirectory, control.screenshot));
      assert.equal(sha(expectedBytes), control.screenshotSha256, "Product crop hash drift");
      const actualBytes = await locator.screenshot({ animations: "disabled", caret: "hide" });
      const expected = PNG.sync.read(await normalizeNavigationPng(expectedBytes));
      const actual = PNG.sync.read(await normalizeNavigationPng(actualBytes));
      assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
      const diff = new PNG({ width: actual.width, height: actual.height });
      const ratio = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, { threshold: .1 }) / (actual.width * actual.height);
      let strict = 0;
      for (let i = 0; i < actual.data.length; i += 4) if ([0, 1, 2, 3].some(c => actual.data[i+c] !== expected.data[i+c])) strict++;
      const result = { theme: sample.theme, width, control: control.id, perceptualRatio: ratio, strictRgbaRatio: strict / (actual.width * actual.height) };
      results.push(result);
      await writeFile(join(output, control.screenshot), actualBytes);
      await writeFile(join(output, `diff-${control.screenshot}`), PNG.sync.write(diff));
    }
    await page.setContent(paintCalibrationHtml);
    assertSrgbPaintCalibration(PNG.sync.read(await page.screenshot({ clip: paintCalibrationCrop })));
  } finally { await app.close(); }
}
await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ mode: browserMode ? "Browser/CDP" : "Electron", output, results }));
assert.ok(results.every(result => result.perceptualRatio <= .008), "Current Home public control crop exceeds the 0.8% perceptual gate; inspect preserved differences. Strict RGBA reported separately, not byte-identical parity.");
assert.ok(results.every(result => result.strictRgbaRatio === 0), "Current Home rest controls must retain the observed strict RGBA equality; no whole-window claim.");
