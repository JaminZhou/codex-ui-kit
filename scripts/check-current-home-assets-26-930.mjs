import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(
  await readFile(
    new URL("../research/current-home-assets-26.930.31730.json", import.meta.url),
    "utf8",
  ),
);
const currentHomeSource = await readFile(
  new URL("../playgrounds/codex-app/src/CurrentHome26930.tsx", import.meta.url),
  "utf8",
);
const iconRegistrySource = await readFile(
  new URL("../playgrounds/codex-app/src/currentBuildIcons.tsx", import.meta.url),
  "utf8",
);
const extractorSource = await readFile(
  new URL("./extract-current-home-assets-26-930.mjs", import.meta.url),
  "utf8",
);
const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
const repositoryRoot = new URL("../", import.meta.url);
const localAssetDirectory =
  "playgrounds/codex-app/public/local-reference-assets/26.930.31730";

assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(
  Object.keys(manifest).sort(),
  [
    "assetModule",
    "baseline",
    "candidates",
    "homeStyleEvidence",
    "policy",
    "schemaVersion",
  ].sort(),
);
assert.deepEqual(Object.keys(manifest.baseline).sort(), [
  "appAsarBytes",
  "appAsarSha256",
  "appVersion",
  "buildNumber",
  "capturedAt",
].sort());
assert.deepEqual(manifest.baseline, {
  appVersion: "26.930.31730",
  buildNumber: "12947",
  capturedAt: manifest.baseline.capturedAt,
  appAsarBytes: 546863116,
  appAsarSha256: "87a934de9a00a04d2e534693db87756321ca4f3413f6caa55d3a0d32a5543836",
});
assert.match(manifest.baseline.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
assert.deepEqual(manifest.policy, {
  retainedData:
    "tracked files retain metadata only; exact SVG candidates are optional local references in a gitignored directory",
  assetBytesRetained: false,
  vectorPathDataRetained: false,
  rendererSourceRetained: false,
  localReferenceExtraction:
    "hash-verified candidates only; fixed version-scoped gitignored playground path",
  runtimeControlMapping:
    "packaged asset catalog keys are verified; exact DOM control binding and rendered states remain unverified",
  staticHomeStyles:
    "fingerprinted Home CSS/JS and abstract hero declarations only; no source text or exact CDP-node mapping",
  productPixelParity: "unverified",
});
assert.equal(manifest.candidates.length, 9);
assert.deepEqual(Object.keys(manifest.assetModule).sort(), [
  "byteLength",
  "fileName",
  "sha256",
].sort());
assert.equal(manifest.assetModule.fileName, "src-47eedec2abf2.js");
assert.match(manifest.assetModule.sha256, /^[a-f0-9]{64}$/);
assert.ok(manifest.assetModule.byteLength > 0);
assert.deepEqual(Object.keys(manifest.homeStyleEvidence).sort(), [
  "auditedAt",
  "boundary",
  "classTokenPairing",
  "componentChunk",
  "ruleCandidates",
  "stylesheet",
].sort());
assert.equal(manifest.homeStyleEvidence.auditedAt, "2026-10-06");
assert.equal(
  manifest.homeStyleEvidence.classTokenPairing,
  "the fingerprinted Home chunk and stylesheet share the Home hero class tokens; this does not identify the captured CDP node",
);
assert.equal(
  manifest.homeStyleEvidence.boundary,
  "static package CSS/JS evidence only; runtime DOM binding and product-pixel parity remain unverified",
);
assert.deepEqual(manifest.homeStyleEvidence.stylesheet, {
  fileName: "home-49f9c30a8c63.css",
  sha256: "7f0df130262375735fdbeed70f75771d82fa70f1f41acd872351b0b201040e6a",
  byteLength: 15551,
});
assert.deepEqual(manifest.homeStyleEvidence.componentChunk, {
  fileName: "home-f7f8584d4748.js",
  sha256: "b269296f0f975ee3f9282103298a854d1cc77dadde1b1f89525a0a26567da340",
  byteLength: 112455,
});
assert.deepEqual(manifest.homeStyleEvidence.ruleCandidates, {
  heroWrapper: { "max-width": "616px" },
  heroTitle: {
    "letter-spacing": ".38px",
    "font-size": "28px",
    "font-weight": "400",
    "line-height": "34px",
  },
});
const measuredHomeTitle = JSON.parse(
  await readFile(
    new URL("../research/current-home-composer-layout-26.930.31730.json", import.meta.url),
    "utf8",
  ),
).centerTextBlock.style;
assert.equal(
  manifest.homeStyleEvidence.ruleCandidates.heroTitle["font-size"],
  measuredHomeTitle.fontSize,
  "static Home title size should corroborate the measured Home title size",
);
assert.equal(
  manifest.homeStyleEvidence.ruleCandidates.heroTitle["font-weight"],
  measuredHomeTitle.fontWeight,
  "static Home title weight should corroborate the measured Home title weight",
);
assert.ok(
  Math.abs(
    Number.parseFloat(manifest.homeStyleEvidence.ruleCandidates.heroTitle["line-height"]) -
      Number.parseFloat(measuredHomeTitle.lineHeight),
  ) <= 0.5,
  "static Home title line-height should remain within subpixel rounding of the captured computed style",
);

const candidateIds = new Set();
const forbiddenKeys = new Set([
  "attributes",
  "children",
  "dataBase64",
  "d",
  "markup",
  "pathData",
  "primitives",
  "rawSource",
  "sourceBytes",
  "sourceText",
  "svgSource",
]);
function assertMetadataOnly(value, location = "manifest") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertMetadataOnly(entry, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    assert.ok(!forbiddenKeys.has(key), `${location} must not retain ${key}`);
    assertMetadataOnly(nested, `${location}.${key}`);
  }
}
assertMetadataOnly(manifest);

for (const candidate of manifest.candidates) {
  assert.deepEqual(Object.keys(candidate).sort(), [
    "assetCatalogKey",
    "byteLength",
    "fileName",
    "id",
    "intrinsicSize",
    "packagedAssetModuleReferenceCount",
    "primitiveCount",
    "primitiveKinds",
    "sha256",
    "viewBox",
  ].sort());
  assert.ok(candidate.id && !candidateIds.has(candidate.id), "candidate ids must be unique");
  candidateIds.add(candidate.id);
  assert.match(candidate.fileName, /^[a-z0-9_-]+\.svg$/);
  assert.match(candidate.sha256, /^[a-f0-9]{64}$/);
  assert.ok(candidate.byteLength > 0);
  assert.ok(candidate.primitiveCount > 0);
  assert.ok(candidate.intrinsicSize?.width > 0);
  assert.ok(candidate.intrinsicSize?.height > 0);
  assert.equal(
    Object.values(candidate.primitiveKinds).reduce((sum, count) => sum + count, 0),
    candidate.primitiveCount,
  );
  assert.equal(candidate.packagedAssetModuleReferenceCount, 1);
}
assert.deepEqual(
  Object.fromEntries(manifest.candidates.map(({ fileName, assetCatalogKey }) => [fileName, assetCatalogKey])),
  {
    "codex-d905da579253.svg": "codex",
    "codex_new-f14177b03534.svg": "codexNew",
    "home-53fa00df0b9e.svg": "home",
    "home_alt-82a060d5e35f.svg": "homeAlt",
    "plus_composer-86a041c72466.svg": "plusComposer",
    "mic_lg_dictate-9b125ec2975b.svg": "micLgDictate",
    "voice-ae407024968a.svg": "voice",
    "chevron_down-6d8fb03d85b2.svg": "chevronDown",
    "sliders_horizontal-9d3361006ff8.svg": "slidersHorizontal",
  },
);

assert.doesNotMatch(
  currentHomeSource,
  /current-home-assets-26\.930|<svg\b|path\s+d=/,
  "the current Home fixture must not embed current-build vector bytes",
);
assert.match(currentHomeSource, /import \{ CurrentBuildIcon \} from "\.\/currentBuildIcons"/);
assert.match(currentHomeSource, /name="home-mark"/);
assert.match(currentHomeSource, /existing-home-mark-four-path-match/);
assert.doesNotMatch(
  iconRegistrySource,
  /currentHomeAssets26930|home-mark-candidate-26-930/,
  "the general icon registry must not publish this candidate's private assets",
);
assert.match(gitignore, /^playgrounds\/codex-app\/public\/local-reference-assets\/$/m);
assert.match(currentHomeSource, /local-reference-assets\/26\.930\.31730\//);
for (const fileName of [
  "plus_composer-86a041c72466.svg",
  "mic_lg_dictate-9b125ec2975b.svg",
  "voice-ae407024968a.svg",
  "chevron_down-6d8fb03d85b2.svg",
  "sliders_horizontal-9d3361006ff8.svg",
]) {
  assert.ok(currentHomeSource.includes(fileName), `${fileName} should be rendered as an optional local candidate`);
}
assert.match(extractorSource, /--extract-local-reference-assets/);
assert.match(extractorSource, /"check-ignore"/);
assert.match(extractorSource, new RegExp(localAssetDirectory.replaceAll("/", "\\/")));
const ignoredProbe = spawnSync(
  "git",
  ["check-ignore", "--no-index", "--quiet", `${localAssetDirectory}/probe.svg`],
  { cwd: fileURLToPath(repositoryRoot) },
);
assert.equal(ignoredProbe.status, 0, "local reference assets must remain gitignored");
const trackedLocalAssets = execFileSync("git", ["ls-files", "--", localAssetDirectory], {
  cwd: fileURLToPath(repositoryRoot),
  encoding: "utf8",
});
assert.equal(trackedLocalAssets.trim(), "", "local reference assets must never be tracked");
assert.match(currentHomeSource, /no-vector-bytes-tracked/);
assert.doesNotMatch(
  currentHomeSource,
  /codex-d905da579253\.svg/,
  "the Home mark must use the verified existing vector rather than the nearest optional candidate",
);

console.log(
  `current Home assets ok: existing Home-mark vector path match plus five optional local SVG references; ${manifest.candidates.length} metadata-only candidates remain tracked`,
);
