import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "../playgrounds/codex-app/node_modules/pngjs/lib/png.js";
import { navigationFingerprints } from "./current-navigation-assets-contract.mjs";
import { navigationPngColorProfile } from "./navigation-png-color.mjs";

export const currentShellPaintVersion = "26.930.61225";
export const currentShellPaintFingerprint =
  navigationFingerprints[currentShellPaintVersion];
export const currentShellPaintDirectory = new URL(
  `../research/current-shell-${currentShellPaintVersion}/`,
  import.meta.url,
);
export const currentShellPaintManifestUrl = new URL(
  "assets.json",
  currentShellPaintDirectory,
);
export const currentShellPaintReferenceUrl = new URL(
  "main-edge-dark-1180x820.png",
  currentShellPaintDirectory,
);
export const currentShellPaintCrop = Object.freeze({
  x: 321,
  y: 120,
  width: 16,
  height: 640,
});
export const currentShellPaintExpected = Object.freeze({
  viewport: { width: 1180, height: 820, deviceScaleFactor: 1 },
  theme: "dark",
  main: {
    x: 321.875,
    y: 44,
    width: 854.125,
    height: 772,
    background: "rgb(24, 24, 24)",
    boxShadow: "none",
    borderLeft: "1px solid rgba(255, 255, 255, 0.082)",
  },
});
const observedBackground = currentShellPaintExpected.main.background.match(
  /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/,
);
assert.ok(observedBackground, "The shell reference requires an opaque observed sRGB background");
export const currentShellPaintCompositeBackground = Object.freeze(
  observedBackground.slice(1).map(Number),
);

export function compositeShellPaintRasterOnObservedBackground(raster) {
  assert.ok(Number.isSafeInteger(raster?.width) && raster.width > 0);
  assert.ok(Number.isSafeInteger(raster?.height) && raster.height > 0);
  assert.ok(raster.data instanceof Uint8Array);
  assert.equal(raster.data.length, raster.width * raster.height * 4);
  const data = Buffer.alloc(raster.data.length);
  for (let index = 0; index < raster.data.length; index += 4) {
    const alpha = raster.data[index + 3];
    const inverseAlpha = 255 - alpha;
    for (let channel = 0; channel < 3; channel += 1) {
      data[index + channel] = Math.round(
        (raster.data[index + channel] * alpha +
          currentShellPaintCompositeBackground[channel] * inverseAlpha) /
          255,
      );
    }
    data[index + 3] = 255;
  }
  return { width: raster.width, height: raster.height, data };
}

const expectedCalibration = {
  kind: "independent-css-alpha-composition",
  pixels: [
    { name: "alpha-white-over-dark", rgba: [145, 145, 145, 255] },
    { name: "opaque-mid-gray", rgba: [145, 145, 145, 255] },
    { name: "opaque-background", rgba: [36, 36, 36, 255] },
  ],
};

export function assertCurrentShellPaintReference(record, pngBytes) {
  assert.equal(record.schemaVersion, 1);
  assert.deepEqual(record.baseline, currentShellPaintFingerprint);
  assert.deepEqual(record.crop, currentShellPaintCrop);
  assert.equal(
    record.source.ownership,
    "OpenAI; exploratory reference, not MIT relicensed",
  );
  assert.equal(record.source.capturedAt, "2026-10-07");
  assert.equal(record.source.captureKind, "isolated-read-only-renderer-cdp");
  assert.equal(
    record.source.colorProfileMode,
    "forced-srgb-with-independent-calibration",
  );
  assert.equal(record.source.pngColorProfile, null);
  assert.equal(
    record.source.viewportMode,
    "renderer-emulation-not-native-product-resize",
  );
  assert.equal(
    record.source.rasterMode,
    "unflattened-renderer-rgba",
  );
  assert.equal(
    record.comparisonMode,
    "composite-both-srgb-rasters-over-observed-main-background",
  );
  assert.deepEqual(record.source.calibration, expectedCalibration);
  assert.equal(
    record.source.readOnlyBoundary,
    "No prompt, task text, account identity, or route content was recorded.",
  );
  for (const key of ["ownerPid", "processStartedAtMs", "profile", "port"]) {
    assert.equal(Object.hasOwn(record.source, key), false);
  }
  assert.equal(
    record.scope,
    "Dark main-surface left-edge fragment only at 1180x820; not a Home-body, whole-window, light-theme, or global-baseline claim.",
  );
  assert.deepEqual(record.observations, {
    theme: "dark",
    main: {
      rect: { x: 321.875, y: 44, width: 854.125, height: 772 },
      background: "rgb(24, 24, 24)",
      boxShadow: "none",
      borderLeft: "1px solid rgba(255, 255, 255, 0.082)",
    },
    navigationRail: { rect: { x: 0, y: 44, width: 52, height: 772 } },
    contentSidebar: { rect: { x: 52, y: 44, width: 269.875, height: 772 } },
  });
  assert.deepEqual(record.reference, {
    file: "main-edge-dark-1180x820.png",
    sha256: createHash("sha256").update(pngBytes).digest("hex"),
    width: 16,
    height: 640,
  });
  assert.equal(record.reference.sha256, "a5218c4102499520716a17237d0dbd2d8e03898b034309be30eec0eb8ab90d0f");
  assert.equal(navigationPngColorProfile(pngBytes), null);
  const png = PNG.sync.read(pngBytes);
  assert.equal(png.width, record.reference.width);
  assert.equal(png.height, record.reference.height);
  assert.ok([...png.data].every((value) => Number.isInteger(value) && value >= 0 && value <= 255));
  return png;
}
