import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertNavigationAssets, assertNavigationDecorationPixels, assertNavigationRasterBackground, navigationHash, navigationFingerprints } from "./current-navigation-assets-contract.mjs";
import { PNG } from "../playgrounds/codex-app/node_modules/pngjs/lib/png.js";
import { assertCurrentBaselineObservationRecord } from "./current-baseline-contract.mjs";
import { navigationReplayData } from "./current-navigation-replay.mjs";
import { navigationPngColorProfile } from "./navigation-png-color.mjs";
for (const version of Object.keys(navigationFingerprints)) {
const root = new URL(`../research/current-navigation-${version}/`, import.meta.url);
const manifest = assertNavigationAssets(JSON.parse(await readFile(new URL("assets.json", root), "utf8")));
assertCurrentBaselineObservationRecord(JSON.parse(await readFile(new URL(`../research/current-baseline-${version}-candidate.json`, import.meta.url), "utf8")), navigationFingerprints[version]);
const geometry = new Map();
for (const sample of manifest.samples) {
  const png = await readFile(new URL(sample.png, root));
  assert.equal(navigationHash(png), sample.pngSha256);
  assert.deepEqual(navigationPngColorProfile(png), manifest.source.pngColorProfile);
  if (version === "26.930.31730") {
    const raster = PNG.sync.read(png);
    assertNavigationDecorationPixels(sample, raster);
    assertNavigationRasterBackground(manifest, sample, raster);
  }
  for (const item of sample.items) {
    const key = `${sample.theme}:${item.label}`;
    if (geometry.has(key)) assert.equal(geometry.get(key), item.icon.geometrySha256, `Unexpected width/state geometry drift: ${key}`);
    geometry.set(key, item.icon.geometrySha256);
  }
}
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.deepEqual(pkg.files, ["dist", "THIRD_PARTY_NOTICES.md"]);
assert.deepEqual(JSON.parse(await readFile(new URL(`../playgrounds/codex-app/src/currentNavigationAssets${version.replaceAll(".", "")}.json`, import.meta.url), "utf8")), navigationReplayData(manifest));
console.log(`${version} navigation: six original glyphs, full resolved styles, 104 fingerprinted public crops; npm excludes reference assets`);
}
