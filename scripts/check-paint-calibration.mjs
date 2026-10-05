import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PNG } from "../playgrounds/codex-app/node_modules/pngjs/lib/png.js";
import { currentObservationCandidateFingerprints } from "./current-baseline-contract.mjs";
import { navigationHash } from "./current-navigation-assets-contract.mjs";
import { navigationPngColorProfile, normalizeNavigationPng } from "./navigation-png-color.mjs";
import { paintCalibrationPixels, assertSrgbPaintCalibration } from "./paint-calibration-contract.mjs";

const root = new URL("../research/", import.meta.url);
const record = JSON.parse(await readFile(new URL("paint-calibration-26.930.31730.json", root), "utf8"));
const fingerprint = currentObservationCandidateFingerprints[record.appVersion];
assert.ok(fingerprint);
for (const name of ["appVersion", "buildNumber", "appAsarSha256", "chromiumVersion"]) assert.equal(record[name], fingerprint[name]);
assert.equal(record.schemaVersion, 1);
for (const mode of ["native", "standardized"]) {
  const sample = record[mode];
  assert.equal(sample.png, `paint-calibration-26.930.31730/${mode === "native" ? "native-display" : "srgb"}.png`);
  const bytes = await readFile(new URL(sample.png, root));
  assert.equal(navigationHash(bytes), sample.sha256);
  assert.deepEqual(navigationPngColorProfile(bytes), sample.profile);
  const png = PNG.sync.read(bytes);
  const points = paintCalibrationPixels(png);
  assert.deepEqual(points.map(point => point.name), record.pointOrder);
  assert.deepEqual(points.map(point => point.rgba), sample.rawRgb.map(value => [value, value, value, 255]));
  const normalized = paintCalibrationPixels(PNG.sync.read(await normalizeNavigationPng(bytes)));
  assert.deepEqual(normalized.map(point => point.rgba), sample.colorSyncSrgbRgb.map(value => [value, value, value, 255]));
  if (mode === "standardized") assertSrgbPaintCalibration(png);
  else assert.throws(() => assertSrgbPaintCalibration(png));
}
assert.notEqual(record.native.colorSyncSrgbRgb[0], record.standardized.rawRgb[0]);
assert.deepEqual(record.native.colorSyncSrgbRgb.slice(1), record.standardized.rawRgb.slice(1));
console.log("Independent CSS calibration proves native ICC alpha composition is not post-hoc sRGB equivalence");
