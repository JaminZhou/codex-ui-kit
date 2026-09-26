import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = process.env.RELEASE_VERSION;
assert.match(version ?? "", /^0\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, "Specify an exact 0.x.y RELEASE_VERSION");
assert.equal(manifest.name, "codex-ui-kit");
assert.equal(manifest.version, version);
assert.notEqual(manifest.private, true, "The release candidate must be publishable");
assert.deepEqual(manifest.publishConfig, {
  access: "public", tag: "latest", registry: "https://registry.npmjs.org/",
});

const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sourceCommit = git(["rev-parse", "HEAD"]);
assert.equal(git(["status", "--porcelain"]), "", "Prepare candidates only from a clean checkout");
if (process.env.RELEASE_SHA) assert.equal(sourceCommit, process.env.RELEASE_SHA, "Source commit differs from approved SHA");

const outputDir = join(root, "artifacts");
mkdirSync(outputDir, { recursive: true });
const staging = mkdtempSync(join(outputDir, "preparing-"));
const archivePath = join(outputDir, `codex-ui-kit-${version}.tgz`);
const evidencePath = join(outputDir, "release-evidence.json");
assert.ok(!existsSync(archivePath) && !existsSync(evidencePath), "Existing candidate output must be inspected, not overwritten");

function run(command, args, extraEnv = {}) {
  execFileSync(command, args, {
    cwd: root, stdio: "inherit", timeout: 300_000,
    env: { ...process.env, ...extraEnv },
  });
}

try {
  const output = execFileSync("npm", ["pack", "--json", "--pack-destination", staging], {
    cwd: root, encoding: "utf8", timeout: 180_000, maxBuffer: 4 * 1024 * 1024,
  });
  const match = [...output.matchAll(/(?:^|\n)(\[\s*\{\s*"id"\s*:)/g)].at(-1);
  assert.ok(match, "npm pack did not return a JSON manifest");
  const [packed] = JSON.parse(output.slice(match.index + (output[match.index] === "\n" ? 1 : 0)));
  assert.equal(packed.name, manifest.name);
  assert.equal(packed.version, version);
  assert.equal(packed.filename, `codex-ui-kit-${version}.tgz`);
  const files = packed.files.map((file) => file.path);
  assert.ok(files.every((name) => name === "LICENSE" || name === "README.md"
    || name === "THIRD_PARTY_NOTICES.md"
    || name === "package.json" || name.startsWith("dist/")), "Unexpected file in release archive");
  for (const name of ["LICENSE", "README.md", "THIRD_PARTY_NOTICES.md", "package.json", "dist/index.js",
    "dist/index.d.ts", "dist/style.css", "dist/styles.d.ts", "dist/tokens.css", "dist/tokens.d.ts"]) {
    assert.ok(files.includes(name), "Missing release file: " + name);
  }
  const stagedArchive = join(staging, packed.filename);
  const bytes = readFileSync(stagedArchive);
  const integrity = "sha512-" + createHash("sha512").update(bytes).digest("base64");
  assert.equal(integrity, packed.integrity, "Packed archive integrity mismatch");

  const smoke = (react, dom, reactTypes, domTypes, resolution, installer = "npm") => {
    run(process.execPath, ["scripts/react-compatibility-smoke.mjs", react, dom,
      reactTypes, domTypes, resolution, "--tarball", stagedArchive],
    { RELEASE_CONSUMER_INSTALLER: installer });
  };
  smoke("18.3.1", "18.3.1", "18.3.27", "18.3.7", "Bundler");
  smoke("19.2.7", "19.2.7", "19.2.17", "19.2.3", "Bundler");
  smoke("19.2.7", "19.2.7", "19.2.17", "19.2.3", "NodeNext");
  smoke("19.2.7", "19.2.7", "19.2.17", "19.2.3", "NodeNext", "pnpm");

  assert.equal(git(["rev-parse", "HEAD"]), sourceCommit, "Source commit moved during candidate preparation");
  assert.equal(git(["status", "--porcelain"]), "", "Source changed during candidate preparation");
  const evidence = {
    name: manifest.name, version, sourceCommit, sourceDirty: false,
    tarball: packed.filename, integrity, compressedBytes: bytes.length,
    unpackedBytes: packed.unpackedSize, files,
    verifiedAt: new Date().toISOString(), node: process.versions.node,
    verified: ["npm React 18/Bundler", "npm React 19/Bundler", "npm React 19/NodeNext", "pnpm React 19/NodeNext"],
    published: false, intendedTag: "latest",
  };
  copyFileSync(stagedArchive, archivePath);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify({ sourceCommit, version, integrity, archivePath, published: false }));
} finally {
  rmSync(staging, { recursive: true, force: true });
}
