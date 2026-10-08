import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  assertCurrentShellPaintReference,
  compositeShellPaintRasterOnObservedBackground,
  currentShellPaintCrop,
  currentShellPaintExpected,
  currentShellPaintManifestUrl,
  currentShellPaintReferenceUrl,
} from "../../../scripts/current-shell-paint-contract.mjs";
import { navigationPngColorProfile, normalizeNavigationPng } from "../../../scripts/navigation-png-color.mjs";
import { paintCalibrationCrop, paintCalibrationHtml, assertSrgbPaintCalibration } from "../../../scripts/paint-calibration-contract.mjs";
import { launchScene } from "./electron-harness.mjs";

const manifest = JSON.parse(await readFile(currentShellPaintManifestUrl, "utf8"));
const referenceBytes = await readFile(currentShellPaintReferenceUrl);
assertCurrentShellPaintReference(manifest, referenceBytes);

const scene = {
  currentSidebar: true,
  frame: "sidebar-current",
  height: 820,
  id: "current-shell-paint-26-930-61225-dark-1180",
  scenario: "streaming-recovery",
  sidebarState: "primary-navigation-current-26-930-61225",
  theme: "dark",
  view: "shell",
  width: 1180,
};
const { app, page } = await launchScene(scene, {
  capture: false,
  deviceScaleFactor: currentShellPaintExpected.viewport.deviceScaleFactor,
  windowSize: { height: 820, width: 1180 },
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

try {
  const root = page.locator(
    '.demo-root[data-sidebar-state="primary-navigation-current-26-930-61225"][data-theme="dark"]',
  );
  await root.waitFor();
  const native = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((window) => window.getContentBounds()),
  );
  assert.equal(native.length, 1);
  assert.equal(native[0].width, 1180);
  assert.equal(native[0].height, 820);

  const measurement = await page.evaluate(() => {
    const rootElement = document.querySelector(".demo-root");
    const main = document.querySelector(".codex-ui-app-shell__main");
    const rail = document.querySelector(".codex-ui-app-primary-navigation-rail");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height };
    };
    const mainStyle = getComputedStyle(main);
    return {
      viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
      theme: rootElement.dataset.theme,
      sidebarState: rootElement.dataset.sidebarState,
      main: {
        ...rect(main),
        background: mainStyle.backgroundColor,
        boxShadow: mainStyle.boxShadow,
        borderLeft: mainStyle.borderLeft,
      },
      rail: rect(rail),
      sidebar: rect(sidebar),
      railBuild: rail?.getAttribute("data-current-build"),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  assert.deepEqual(measurement.viewport, currentShellPaintExpected.viewport);
  assert.equal(measurement.theme, currentShellPaintExpected.theme);
  assert.equal(measurement.sidebarState, "primary-navigation-current-26-930-61225");
  assert.deepEqual(measurement.main, currentShellPaintExpected.main);
  assert.deepEqual(measurement.rail, { x: 0, y: 44, width: 52, height: 772 });
  assert.deepEqual(measurement.sidebar, { x: 52, y: 44, width: 269.875, height: 772 });
  assert.equal(measurement.railBuild, "26.930.61225");
  assert.equal(measurement.overflow, 0);

  await page.mouse.move(1178, 818);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(350);
  const actualBytes = await page.screenshot({
    clip: currentShellPaintCrop,
    animations: "disabled",
    caret: "hide",
    omitBackground: true,
  });
  const actualProfile = navigationPngColorProfile(actualBytes);
  if (actualProfile) assert.equal(process.platform, "darwin");
  const actualRaw = PNG.sync.read(await normalizeNavigationPng(actualBytes));
  const expectedRaw = PNG.sync.read(await normalizeNavigationPng(referenceBytes));
  assert.equal(actualRaw.width, expectedRaw.width);
  assert.equal(actualRaw.height, expectedRaw.height);

  // Compare visible pixels on the observed opaque main background. Chromium
  // and Electron can encode the same fractional edge with different alpha;
  // retain that unflattened RGBA residual below as separate diagnostics.
  const actual = compositeShellPaintRasterOnObservedBackground(actualRaw);
  const expected = compositeShellPaintRasterOnObservedBackground(expectedRaw);

  const diff = new PNG({ width: actual.width, height: actual.height });
  const perceptualRatio = pixelmatch(
    actual.data,
    expected.data,
    diff.data,
    actual.width,
    actual.height,
    { threshold: 0.1 },
  ) / (actual.width * actual.height);
  let strictChangedPixels = 0;
  let maxVisibleChannelDelta = 0;
  let maxRawRgbaChannelDelta = 0;
  for (let index = 0; index < actual.data.length; index += 4) {
    const x = (index / 4) % actual.width;
    let rawPixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const rawDelta = Math.abs(actualRaw.data[index + channel] - expectedRaw.data[index + channel]);
      if (x >= 2) {
        assert.equal(rawDelta, 0, `Unexpected raw RGBA difference inside main surface at x=${x}`);
      }
      if (rawDelta > 0) rawPixelChanged = true;
      maxRawRgbaChannelDelta = Math.max(maxRawRgbaChannelDelta, rawDelta);
      if (channel < 3) {
        maxVisibleChannelDelta = Math.max(
          maxVisibleChannelDelta,
          Math.abs(actual.data[index + channel] - expected.data[index + channel]),
        );
      }
    }
    if (rawPixelChanged) strictChangedPixels += 1;
  }
  const strictRgbaRatio = strictChangedPixels / (actual.width * actual.height);
  assert.ok(perceptualRatio <= 0.008, `${(perceptualRatio * 100).toFixed(4)}% exceeds the 0.8% shell-edge gate`);
  assert.ok(maxVisibleChannelDelta <= 16, `${maxVisibleChannelDelta} visible RGB delta exceeds the 16-level edge cap`);

  await page.setContent(paintCalibrationHtml);
  const calibrationBytes = await page.screenshot({ clip: paintCalibrationCrop });
  assert.equal(navigationPngColorProfile(calibrationBytes), null);
  assertSrgbPaintCalibration(PNG.sync.read(calibrationBytes));
  assert.deepEqual(errors, [], "The shell replay must not emit runtime or console errors");
  console.log(
    `26.930.61225 dark main-edge Electron bounds/styles and sRGB product pixels: passed; ` +
      `perceptual ${(perceptualRatio * 100).toFixed(4)}%, ` +
      `strict RGBA ${(strictRgbaRatio * 100).toFixed(4)}%, ` +
      `max visible RGB delta ${maxVisibleChannelDelta}, max raw RGBA delta ${maxRawRgbaChannelDelta}. ` +
      "One 16x640px shell fragment only; no whole-window parity claim.",
  );
} finally {
  await app.close();
}
