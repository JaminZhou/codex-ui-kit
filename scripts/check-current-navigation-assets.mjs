import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertNavigationAssets, navigationHash, navigationFingerprint } from "./current-navigation-assets-contract.mjs";
import { assertCurrentBaselineObservationRecord } from "./current-baseline-contract.mjs";
import { navigationReplayData } from "./current-navigation-replay.mjs";
import { navigationPngColorProfile } from "./navigation-png-color.mjs";
const root = new URL("../research/current-navigation-26.928.31416/", import.meta.url);
const manifest = assertNavigationAssets(JSON.parse(await readFile(new URL("assets.json", root), "utf8")));
assertCurrentBaselineObservationRecord(JSON.parse(await readFile(new URL("../research/current-baseline-26.928.31416-candidate.json", import.meta.url), "utf8")), navigationFingerprint);
const geometry = new Map();
for (const sample of manifest.samples) {
  const png = await readFile(new URL(sample.png, root));
  assert.equal(navigationHash(png), sample.pngSha256);
  assert.deepEqual(navigationPngColorProfile(png), manifest.source.pngColorProfile);
  for (const item of sample.items) {
    const key = `${sample.theme}:${item.label}`;
    if (geometry.has(key)) assert.equal(geometry.get(key), item.icon.geometrySha256, `Unexpected width/state geometry drift: ${key}`);
    geometry.set(key, item.icon.geometrySha256);
  }
}
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.deepEqual(pkg.files, ["dist", "THIRD_PARTY_NOTICES.md"]);
assert.deepEqual(JSON.parse(await readFile(new URL("../playgrounds/codex-app/src/currentNavigationAssets2692831416.json", import.meta.url), "utf8")), navigationReplayData(manifest));
console.log("Current navigation: six original glyphs, full resolved styles, 104 fingerprinted public crops; npm excludes reference assets");
