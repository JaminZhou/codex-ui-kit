import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Local-only reference crops contain our synthetic PDF and its observed product chrome.
// No baseline generation or pixel masks: a missing reference or a mismatch fails closed.
const referenceDirectory = process.env.CODEX_UI_KIT_CURRENT_PDF_REFERENCES;
const executablePath = process.argv.find(argument => argument.startsWith("--electron-executable="))?.slice("--electron-executable=".length);
assert.ok(referenceDirectory, "Set CODEX_UI_KIT_CURRENT_PDF_REFERENCES to the owned product crops directory");
const artifacts = join(process.cwd(), "artifacts", "current-pdf-product");
await mkdir(artifacts, { recursive: true });
const results = [];
for (const [state, referenceState] of [["ready", "wide-ready"], ["compact", "compact-open"]]) {
  const scene = visualScenes.find(({ id }) => id === `workspace-document-preview-current-${state}`);
  const reference = PNG.sync.read(await readFile(join(referenceDirectory, `pdf-${referenceState}-owned.png`)));
  const { app, page } = await launchScene(scene, { executablePath });
  try {
    const runtime = await app.evaluate(() => ({ electron: process.versions.electron, chromium: process.versions.chrome }));
    // Match the product reference's declared Renderer-emulation rasterization path.
    // Native BrowserWindow behavior is checked separately by the Electron lifecycle test.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: scene.windowSize?.width ?? 1180, height: scene.windowSize?.height ?? 820, deviceScaleFactor: 1, mobile: false });
    await page.waitForFunction(() => document.querySelectorAll('[data-painted="true"]').length === 2);
    const bounds = await page.locator('[data-testid="current-pdf-preview"]').boundingBox();
    assert.ok(bounds);
    assert.equal(Math.floor(bounds.width), reference.width);
    assert.equal(Math.floor(bounds.height), reference.height);
    const bytes = await page.screenshot({ clip: bounds, animations: "disabled" });
    const actual = PNG.sync.read(bytes);
    const diff = new PNG({ width: reference.width, height: reference.height });
    const pixels = pixelmatch(reference.data, actual.data, diff.data, reference.width, reference.height, { threshold: .1 });
    const ratio = pixels / (reference.width * reference.height);
    results.push({ state, runtime, width: reference.width, height: reference.height, changedPixels: pixels, ratio, maxRatio: .01, masks: [] });
    await writeFile(join(artifacts, `${state}-actual.png`), bytes);
    await writeFile(join(artifacts, `${state}-diff.png`), PNG.sync.write(diff));
  } finally { await app.close(); }
}
await writeFile(join(artifacts, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
assert.ok(results.every(({ ratio, maxRatio }) => ratio <= maxRatio), "Current PDF owned-panel product pixels exceed 1%; do not promote parity");
