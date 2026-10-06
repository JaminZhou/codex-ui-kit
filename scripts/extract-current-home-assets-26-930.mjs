import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, openSync, readSync, closeSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appAsarPath =
  "/Applications/ChatGPT.app/Contents/Resources/app.asar";
const expectedAppAsarSha256 =
  "87a934de9a00a04d2e534693db87756321ca4f3413f6caa55d3a0d32a5543836";
const outputPath = fileURLToPath(
  new URL("../research/current-home-assets-26.930.31730.json", import.meta.url),
);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const localReferenceDirectory = fileURLToPath(
  new URL(
    "../playgrounds/codex-app/public/local-reference-assets/26.930.31730/",
    import.meta.url,
  ),
);
const extractLocalReferenceAssets = process.argv.includes(
  "--extract-local-reference-assets",
);
assert.ok(
  process.argv.slice(2).every((argument) =>
    ["--write", "--extract-local-reference-assets"].includes(argument),
  ),
  "Supported options are --write and --extract-local-reference-assets.",
);
const candidates = [
  { assetCatalogKey: "codex", assetPath: "webview/assets/codex-d905da579253.svg", id: "codex-mark-candidate-26-930" },
  { assetCatalogKey: "codexNew", assetPath: "webview/assets/codex_new-f14177b03534.svg", id: "codex-new-mark-candidate-26-930" },
  { assetCatalogKey: "home", assetPath: "webview/assets/home-53fa00df0b9e.svg", id: "home-icon-candidate-26-930" },
  { assetCatalogKey: "homeAlt", assetPath: "webview/assets/home_alt-82a060d5e35f.svg", id: "home-alt-icon-candidate-26-930" },
  { assetCatalogKey: "plusComposer", assetPath: "webview/assets/plus_composer-86a041c72466.svg", id: "composer-add-candidate-26-930" },
  { assetCatalogKey: "micLgDictate", assetPath: "webview/assets/mic_lg_dictate-9b125ec2975b.svg", id: "composer-dictation-candidate-26-930" },
  { assetCatalogKey: "voice", assetPath: "webview/assets/voice-ae407024968a.svg", id: "composer-voice-candidate-26-930" },
  { assetCatalogKey: "chevronDown", assetPath: "webview/assets/chevron_down-6d8fb03d85b2.svg", id: "composer-chevron-candidate-26-930" },
  { assetCatalogKey: "slidersHorizontal", assetPath: "webview/assets/sliders_horizontal-9d3361006ff8.svg", id: "context-sliders-candidate-26-930" },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function hashFile(path) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", resolve)
      .on("error", reject);
  });
  return hash.digest("hex");
}

function readAsarEntry(tree, dataOffset, assetPath) {
  let entry = tree.files;
  for (const segment of assetPath.split("/")) {
    entry = entry?.[segment]?.files ?? entry?.[segment];
  }
  assert.ok(entry && Number.isInteger(entry.size), `missing ASAR entry: ${assetPath}`);
  assert.ok(typeof entry.offset === "string", `unexpected ASAR offset: ${assetPath}`);
  const bytes = Buffer.alloc(entry.size);
  const fd = openSync(appAsarPath, "r");
  try {
    const read = readSync(fd, bytes, 0, entry.size, dataOffset + Number(entry.offset));
    assert.equal(read, entry.size, `short read for ASAR entry: ${assetPath}`);
  } finally {
    closeSync(fd);
  }
  return bytes;
}

function findAssetCatalogKey(source, fileName) {
  const assetUrlIndex = source.indexOf(`new URL(\`${fileName}\``);
  assert.notEqual(assetUrlIndex, -1, `missing asset URL registration: ${fileName}`);

  const moduleFactory =
    /([A-Za-z_$][\w$]*)=r\(\{default:\(\)=>[A-Za-z_$][\w$]*\}\),[A-Za-z_$][\w$]*,[A-Za-z_$][\w$]*=n\(\(\(\)=>\{/g;
  const wrapperName = [
    ...source.slice(0, assetUrlIndex).matchAll(moduleFactory),
  ].at(-1)?.[1];
  assert.ok(wrapperName, `missing module wrapper for ${fileName}`);

  const catalogEntries = [
    ...source.matchAll(
      /([A-Za-z_$][\w$]*):\(([A-Za-z_$][\w$]*)\(\),e\(([A-Za-z_$][\w$]*)\)\)/g,
    ),
  ].filter(([, , , candidateWrapper]) => candidateWrapper === wrapperName);
  assert.equal(
    catalogEntries.length,
    1,
    `expected one packaged asset-catalog key for ${fileName}`,
  );
  return catalogEntries[0][1];
}

function parseAttributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)].map(
      ([, name, value]) => [name, value],
    ),
  );
}

function summarizeSvg(bytes, candidate, assetCatalogKey) {
  const source = bytes.toString("utf8");
  const root = source.match(/^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/);
  assert.ok(root, `expected an SVG root in ${candidate.assetPath}`);
  assert.doesNotMatch(source, /<(?:script|foreignObject|image|use)\b/i);
  assert.doesNotMatch(source, /\b(?:href|src)="(?:https?:|data:|\/\/)/i);
  const tags = [...root[2].matchAll(/<(path|line|circle|rect|polyline|polygon|ellipse)\b/g)]
    .map(([, tag]) => tag);
  assert.ok(tags.length > 0, `expected SVG primitives in ${candidate.assetPath}`);
  const attributes = parseAttributes(root[1]);
  const primitiveKinds = Object.fromEntries(
    [...new Set(tags)].sort().map((tag) => [tag, tags.filter((item) => item === tag).length]),
  );
  return {
    fileName: candidate.assetPath.split("/").at(-1),
    id: candidate.id,
    assetCatalogKey,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    viewBox: attributes.viewBox ?? null,
    intrinsicSize: {
      width: Number.parseFloat(attributes.width) || null,
      height: Number.parseFloat(attributes.height) || null,
    },
    primitiveCount: tags.length,
    primitiveKinds,
    packagedAssetModuleReferenceCount: 0,
  };
}

const appAsarSha256 = await hashFile(appAsarPath);
assert.equal(
  appAsarSha256,
  expectedAppAsarSha256,
  "Installed app.asar changed; re-fingerprint before recording candidate metadata",
);

const fd = openSync(appAsarPath, "r");
let tree;
let dataOffset;
try {
  const prefix = Buffer.alloc(16);
  assert.equal(readSync(fd, prefix, 0, prefix.length, 0), prefix.length);
  const headerBytes = prefix.readUInt32LE(12);
  dataOffset = 8 + prefix.readUInt32LE(4);
  assert.ok(headerBytes > 0 && headerBytes < 32 * 1024 * 1024);
  assert.ok(dataOffset >= 16 + headerBytes);
  const header = Buffer.alloc(headerBytes);
  assert.equal(readSync(fd, header, 0, headerBytes, 16), headerBytes);
  tree = JSON.parse(header.toString("utf8"));
} finally {
  closeSync(fd);
}

const packageAssetModulePath = "webview/assets/src-47eedec2abf2.js";
const packageAssetModuleBytes = readAsarEntry(tree, dataOffset, packageAssetModulePath);
const packageAssetModule = packageAssetModuleBytes.toString("utf8");
const homeStyleModulePath = "webview/assets/home-49f9c30a8c63.css";
const homeComponentModulePath = "webview/assets/home-f7f8584d4748.js";
const homeStyleModuleBytes = readAsarEntry(tree, dataOffset, homeStyleModulePath);
const homeComponentModuleBytes = readAsarEntry(tree, dataOffset, homeComponentModulePath);
assert.equal(
  sha256(homeStyleModuleBytes),
  "7f0df130262375735fdbeed70f75771d82fa70f1f41acd872351b0b201040e6a",
  "Installed Home stylesheet changed; re-audit before recording candidate styles",
);
assert.equal(
  sha256(homeComponentModuleBytes),
  "b269296f0f975ee3f9282103298a854d1cc77dadde1b1f89525a0a26567da340",
  "Installed Home component chunk changed; re-audit before recording candidate styles",
);
const heroWrapperRule = { "max-width": "616px" };
const heroTitleRule = {
  "letter-spacing": ".38px",
  "font-size": "28px",
  "font-weight": "400",
  "line-height": "34px",
};
const metadata = candidates.map((candidate) => {
  const bytes = readAsarEntry(tree, dataOffset, candidate.assetPath);
  const fileName = candidate.assetPath.split("/").at(-1);
  const assetCatalogKey = findAssetCatalogKey(packageAssetModule, fileName);
  assert.equal(
    assetCatalogKey,
    candidate.assetCatalogKey,
    `unexpected packaged asset-catalog key for ${fileName}`,
  );
  const summary = summarizeSvg(bytes, candidate, assetCatalogKey);
  candidate.bytes = bytes;
  summary.packagedAssetModuleReferenceCount =
    packageAssetModule.split(summary.fileName).length - 1;
  assert.ok(
    summary.packagedAssetModuleReferenceCount > 0,
    `${summary.fileName} must be referenced by the fingerprinted asset module`,
  );
  return summary;
});
const appAsarBytes = (await stat(appAsarPath)).size;

const manifest = {
  schemaVersion: 1,
  baseline: {
    appVersion: "26.930.31730",
    buildNumber: "12947",
    capturedAt: new Date().toISOString().slice(0, 10),
    appAsarBytes,
    appAsarSha256,
  },
  policy: {
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
  },
  assetModule: {
    fileName: packageAssetModulePath.split("/").at(-1),
    sha256: sha256(packageAssetModuleBytes),
    byteLength: packageAssetModuleBytes.length,
  },
  homeStyleEvidence: {
    auditedAt: "2026-10-06",
    stylesheet: {
      fileName: homeStyleModulePath.split("/").at(-1),
      sha256: sha256(homeStyleModuleBytes),
      byteLength: homeStyleModuleBytes.length,
    },
    componentChunk: {
      fileName: homeComponentModulePath.split("/").at(-1),
      sha256: sha256(homeComponentModuleBytes),
      byteLength: homeComponentModuleBytes.length,
    },
    classTokenPairing:
      "the fingerprinted Home chunk and stylesheet share the Home hero class tokens; this does not identify the captured CDP node",
    ruleCandidates: {
      heroWrapper: heroWrapperRule,
      heroTitle: heroTitleRule,
    },
    boundary:
      "static package CSS/JS evidence only; runtime DOM binding and product-pixel parity remain unverified",
  },
  candidates: metadata,
};

if (process.argv.includes("--write")) {
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote abstract candidate metadata for ${metadata.length} assets to ${outputPath}`);
}
if (extractLocalReferenceAssets) {
  const localRelativePath = relative(repositoryRoot, localReferenceDirectory);
  assert.equal(
    localRelativePath,
    "playgrounds/codex-app/public/local-reference-assets/26.930.31730",
    "Local reference assets may only be extracted to the fixed, version-scoped playground directory.",
  );
  execFileSync(
    "git",
    ["check-ignore", "--no-index", "--quiet", join(localRelativePath, "probe.svg")],
    { cwd: repositoryRoot },
  );
  await mkdir(localReferenceDirectory, { recursive: true });
  for (const candidate of candidates) {
    const bytes = candidate.bytes;
    const destination = join(localReferenceDirectory, candidate.assetPath.split("/").at(-1));
    const existing = await readFile(destination).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (existing) {
      assert.equal(
        sha256(existing),
        sha256(bytes),
        `Refusing to overwrite a changed local reference asset: ${destination}`,
      );
      continue;
    }
    await writeFile(destination, bytes, { flag: "wx" });
  }
  console.log(
    `extracted ${candidates.length} hash-verified SVG candidates to the gitignored local-only directory ${localRelativePath}`,
  );
}
if (!process.argv.includes("--write") && !extractLocalReferenceAssets) {
  console.log(JSON.stringify(manifest, null, 2));
}
