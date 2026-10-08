import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";
import { assertNavigationAssets, navigationCrop, navigationLabels, navigationHash, navigationFingerprints, standardizedSrgbNavigationBuilds } from "../../../scripts/current-navigation-assets-contract.mjs";
import { navigationPngColorProfile, normalizeNavigationPng } from "../../../scripts/navigation-png-color.mjs";
import { paintCalibrationHtml, paintCalibrationCrop, assertSrgbPaintCalibration } from "../../../scripts/paint-calibration-contract.mjs";

const requestedVersion = process.argv.find(value => value.startsWith("--version="))?.slice("--version=".length);
if (requestedVersion) assert.ok(navigationFingerprints[requestedVersion]);
for (const version of requestedVersion ? [requestedVersion] : Object.keys(navigationFingerprints)) {
const root = new URL(`../../../research/current-navigation-${version}/`, import.meta.url);
const manifest = assertNavigationAssets(JSON.parse(await readFile(new URL("assets.json", root), "utf8")));
const artifacts = new URL(`../artifacts/current-navigation-${version}/`, import.meta.url);
await mkdir(artifacts, { recursive: true });
let worstRatio = 0;
let worstStrictRatio = 0;
let worstChannelDelta = 0;
const metrics = [];
for (const theme of ["dark", "light"]) for (const width of [1180, 820, 721, 720]) {
  const height = width === 1180 ? 820 : 680;
  const scene = { currentSidebar: true, frame: "sidebar-current", id: `current-navigation-assets-${theme}-${width}`,
    scenario: "streaming-recovery", sidebarState: `primary-navigation-current-${version.replaceAll(".", "-")}`, view: "shell", theme };
  const { app, page } = await launchScene(scene, { capture: false, windowSize: { width, height } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    const rail = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    await rail.waitFor();
    assert.equal(await rail.getAttribute("data-current-build"), version);
    const native = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => w.getContentBounds()));
    assert.equal(native.length, 1); assert.equal(native[0].width, width); assert.equal(native[0].height, height);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    for (const sample of manifest.samples.filter(sample => sample.theme === theme && sample.width === width)) {
      await page.mouse.move(width - 2, height - 2);
      await page.evaluate(() => document.activeElement?.blur());
      if (sample.state.startsWith("hover:")) await rail.getByRole("button", { name: sample.state.slice(6), exact: true }).hover();
      if (sample.state.startsWith("focus:")) {
        const target = rail.getByRole("button", { name: sample.state.slice(6), exact: true });
        await target.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
        assert.ok(await target.evaluate(e => e === document.activeElement && e.matches(":focus-visible")));
      }
      await page.waitForTimeout(400);
      const actualGeometry = await rail.locator('.codex-ui-app-primary-navigation-rail__items button').evaluateAll(buttons => buttons.map(e => {
        const r = e.getBoundingClientRect(); const svg = e.querySelector('svg').getBoundingClientRect();
        const decorations = [...e.querySelectorAll('[data-current-navigation-decoration]')].map(node => {
          const r = node.getBoundingClientRect();
          return { rect: { left: r.left, top: r.top, width: r.width, height: r.height }, backgroundColor: getComputedStyle(node).backgroundColor };
        });
        return { label: e.getAttribute('aria-label'), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, icon: { width: svg.width, height: svg.height }, decorations, sourceWidth: Number(e.dataset.sourceWidth) };
      }));
      assert.deepEqual(actualGeometry.map(e => e.label), navigationLabels);
      actualGeometry.forEach((e, i) => {
        assert.deepEqual(e.rect, sample.items[i].rect); assert.deepEqual(e.icon, sample.items[i].icon.renderSize);
        assert.equal(e.sourceWidth, width, "Use the observed paint state for this exact viewport, not a wide-state surrogate");
        assert.deepEqual(e.decorations, (sample.items[i].decorations ?? []).map(node => ({ rect: node.rect, backgroundColor: manifest.styles[node.styleId]["background-color"] })));
      });
      if (sample.sharedCard) {
        const card = await page.locator('[data-current-navigation-shared-card]').evaluate(node => {
          const r = node.getBoundingClientRect(), s = getComputedStyle(node);
          return { rect: { left: r.left, top: r.top, width: r.width, height: r.height }, boxShadow: s.boxShadow, backgroundColor: s.backgroundColor };
        });
        assert.deepEqual(card.rect, sample.sharedCard.rect);
        assert.equal(card.boxShadow, manifest.styles[sample.sharedCard.styleId]["box-shadow"]);
        assert.equal(card.backgroundColor, "rgba(0, 0, 0, 0)");
      }
      const actualBytes = await page.screenshot({ clip: navigationCrop, animations: "disabled", caret: "hide", omitBackground: true });
      const expectedBytes = await readFile(new URL(sample.png, root));
      assert.equal(navigationHash(expectedBytes), sample.pngSha256);
      assert.deepEqual(navigationPngColorProfile(expectedBytes), manifest.source.pngColorProfile);
      const actual = PNG.sync.read(await normalizeNavigationPng(actualBytes));
      const expected = PNG.sync.read(await normalizeNavigationPng(expectedBytes));
      assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
      const diff = new PNG({ width: actual.width, height: actual.height });
      const ratio = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, { threshold: 0.1 }) / (actual.width * actual.height);
      worstRatio = Math.max(worstRatio, ratio);
      let changedPixels = 0, channelDeltaSum = 0, maxChannelDelta = 0;
      for (let index = 0; index < actual.data.length; index += 4) {
        let pixelDelta = 0;
        for (let channel = 0; channel < 4; channel += 1) pixelDelta = Math.max(pixelDelta, Math.abs(actual.data[index + channel] - expected.data[index + channel]));
        if (pixelDelta) changedPixels += 1;
        channelDeltaSum += pixelDelta;
        maxChannelDelta = Math.max(maxChannelDelta, pixelDelta);
      }
      const strictRatio = changedPixels / (actual.width * actual.height);
      worstStrictRatio = Math.max(worstStrictRatio, strictRatio);
      worstChannelDelta = Math.max(worstChannelDelta, maxChannelDelta);
      metrics.push({ png: sample.png, perceptualRatio: ratio, strictRgbaRatio: strictRatio, maxChannelDelta, meanMaximumChannelDelta: channelDeltaSum / (actual.width * actual.height) });
      await writeFile(new URL(sample.png, artifacts), actualBytes);
      await writeFile(new URL(sample.png.replace(".png", "-diff.png"), artifacts), PNG.sync.write(diff));
      assert.ok(ratio <= 0.008, `${sample.png}: ${(ratio * 100).toFixed(4)}% exceeds the 0.8% actual-product regional gate`);
      console.log(`${sample.png}: ${(ratio * 100).toFixed(4)}% sRGB perceptual actual-product difference`);
    }
    assert.deepEqual(errors, [], "Current navigation must not produce runtime or React attribute errors");
    if (standardizedSrgbNavigationBuilds.includes(version)) {
      await page.setContent(paintCalibrationHtml);
      const calibrationBytes = await page.screenshot({ clip: paintCalibrationCrop });
      assert.equal(navigationPngColorProfile(calibrationBytes), null);
      assertSrgbPaintCalibration(PNG.sync.read(calibrationBytes));
    }
  } finally { await app.close(); }
}
await writeFile(new URL("comparison.json", artifacts), `${JSON.stringify({ version, referenceProfileMode: manifest.source.colorProfileMode ?? "native-display-icc", samples: metrics, worstRatio, worstStrictRatio, worstChannelDelta }, null, 2)}\n`);
console.log(`${version}: 104 real-product navigation comparisons, native Electron bounds, CDP geometry/keyboard states: passed; worst sRGB perceptual ${(worstRatio * 100).toFixed(4)}%, strict RGBA ${(worstStrictRatio * 100).toFixed(4)}%, max channel delta ${worstChannelDelta}. Not byte-identical parity.`);
}
