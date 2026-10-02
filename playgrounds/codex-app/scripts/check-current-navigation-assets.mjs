import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";
import { assertNavigationAssets, navigationCrop, navigationLabels, navigationHash } from "../../../scripts/current-navigation-assets-contract.mjs";
import { navigationPngColorProfile, normalizeNavigationPng } from "../../../scripts/navigation-png-color.mjs";

const root = new URL("../../../research/current-navigation-26.928.31416/", import.meta.url);
const manifest = assertNavigationAssets(JSON.parse(await readFile(new URL("assets.json", root), "utf8")));
const artifacts = new URL("../artifacts/current-navigation-26.928.31416/", import.meta.url);
await mkdir(artifacts, { recursive: true });
let worstRatio = 0;
let worstStrictRatio = 0;
let worstChannelDelta = 0;
for (const theme of ["dark", "light"]) for (const width of [1180, 820, 721, 720]) {
  const height = width === 1180 ? 820 : 680;
  const scene = { currentSidebar: true, frame: "sidebar-current", id: `current-navigation-assets-${theme}-${width}`,
    scenario: "streaming-recovery", sidebarState: "primary-navigation-current-26-928-31416", view: "shell", theme };
  const { app, page } = await launchScene(scene, { capture: false, windowSize: { width, height } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  try {
    const rail = page.getByRole("navigation", { name: "Primary navigation", exact: true });
    await rail.waitFor();
    assert.equal(await rail.getAttribute("data-current-build"), "26.928.31416");
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
        return { label: e.getAttribute('aria-label'), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, icon: { width: svg.width, height: svg.height } };
      }));
      assert.deepEqual(actualGeometry.map(e => e.label), navigationLabels);
      actualGeometry.forEach((e, i) => { assert.deepEqual(e.rect, sample.items[i].rect); assert.deepEqual(e.icon, sample.items[i].icon.renderSize); });
      const actualBytes = await page.screenshot({ clip: navigationCrop, animations: "disabled", caret: "hide" });
      const expectedBytes = await readFile(new URL(sample.png, root));
      assert.equal(navigationHash(expectedBytes), sample.pngSha256);
      assert.deepEqual(navigationPngColorProfile(expectedBytes), manifest.source.pngColorProfile);
      const actual = PNG.sync.read(await normalizeNavigationPng(actualBytes));
      const expected = PNG.sync.read(await normalizeNavigationPng(expectedBytes));
      assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
      const diff = new PNG({ width: actual.width, height: actual.height });
      const ratio = pixelmatch(actual.data, expected.data, diff.data, actual.width, actual.height, { threshold: 0.1 }) / (actual.width * actual.height);
      worstRatio = Math.max(worstRatio, ratio);
      worstStrictRatio = Math.max(worstStrictRatio, pixelmatch(actual.data, expected.data, null, actual.width, actual.height, { threshold: 0, includeAA: true }) / (actual.width * actual.height));
      for (let index = 0; index < actual.data.length; index += 1) worstChannelDelta = Math.max(worstChannelDelta, Math.abs(actual.data[index] - expected.data[index]));
      await writeFile(new URL(sample.png, artifacts), actualBytes);
      await writeFile(new URL(sample.png.replace(".png", "-diff.png"), artifacts), PNG.sync.write(diff));
      assert.ok(ratio <= 0.008, `${sample.png}: ${(ratio * 100).toFixed(4)}% exceeds the 0.8% actual-product regional gate`);
      console.log(`${sample.png}: ${(ratio * 100).toFixed(4)}% sRGB perceptual actual-product difference`);
    }
    assert.deepEqual(errors, [], "Current navigation must not produce runtime or React attribute errors");
  } finally { await app.close(); }
}
console.log(`104 real-product navigation comparisons, native Electron bounds, CDP geometry/keyboard states: passed; worst sRGB perceptual ${(worstRatio * 100).toFixed(4)}%, strict RGBA ${(worstStrictRatio * 100).toFixed(4)}%, max channel delta ${worstChannelDelta}. Not byte-identical parity.`);
