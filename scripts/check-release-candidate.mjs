import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicRuntimeExports } from "./public-runtime-exports.mjs";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(packageJson.name === "codex-ui-kit", "unexpected package name");
assert(packageJson.private !== true, "release archive must be publishable");
assert(packageJson.publishConfig?.access === "public", "package access must remain public");
assert(packageJson.publishConfig?.tag === "latest", "unexpected publication tag");
assert(packageJson.publishConfig?.registry === "https://registry.npmjs.org/", "unexpected registry");
assert(/^0\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(packageJson.version), "expected an exact pre-1.0 version");

const runtimeModule = await import(new URL("dist/index.js", root));
const runtimeExports = Object.keys(runtimeModule).sort();
assert(
  JSON.stringify(runtimeExports) === JSON.stringify(publicRuntimeExports),
  `public runtime exports changed: expected ${JSON.stringify(publicRuntimeExports)}, received ${JSON.stringify(runtimeExports)}`,
);
const componentReference = await readFile(
  new URL("docs/COMPONENTS.md", root),
  "utf8",
);
const undocumentedExports = publicRuntimeExports.filter(
  (name) => !componentReference.includes(`\`${name}\``),
);
assert(
  undocumentedExports.length === 0,
  `public runtime exports missing from docs/COMPONENTS.md: ${undocumentedExports.join(", ")}`,
);
const releaseNotes = await readFile(new URL("docs/RELEASE_NOTES.md", root), "utf8");
assert(
  releaseNotes.includes("# Release notes") &&
    releaseNotes.includes("unpublished"),
  "release notes must document the unpublished candidate boundary",
);

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const tarDestination = await mkdtemp(join(tmpdir(), "codex-ui-kit-release-") );
try {
  const packed = spawnSync(
    npmExecutable,
    ["pack", "--json", "--pack-destination", tarDestination],
    {
      cwd: new URL(".", root),
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  if (packed.error) throw packed.error;
  assert(packed.status === 0, packed.stderr || "npm pack failed");

  const [report] = JSON.parse(packed.stdout);
  assert(report.name === packageJson.name, "packed name does not match package.json");
  assert(report.version === packageJson.version, "packed version does not match package.json");
  const tarballPath = join(tarDestination, report.filename);
  const tarball = await readFile(tarballPath);
  const sha256 = createHash("sha256").update(tarball).digest("hex");

  const listed = spawnSync("tar", ["-tzf", tarballPath], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (listed.error) throw listed.error;
  assert(listed.status === 0, listed.stderr || "could not inspect release tarball");
  const files = listed.stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//, ""));
  const fileSet = new Set(files);

  for (const required of [
    "LICENSE",
    "README.md",
    "THIRD_PARTY_NOTICES.md",
    "package.json",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/style.css",
    "dist/styles.d.ts",
    "dist/tokens.css",
    "dist/tokens.d.ts",
  ]) {
    assert(fileSet.has(required), `release tarball is missing ${required}`);
  }
  assert(
    files.some((file) => /^dist\/highlightCode-[\w-]+\.js$/.test(file)),
    "release tarball is missing the lazy code-highlight chunk",
  );
  for (const file of files) {
    assert(
      !/^(?:demo|fixtures|playgrounds|research|src|tests|\.github)\//.test(file),
      `development-only file leaked into release tarball: ${file}`,
    );
  }

  console.log(
    JSON.stringify({
      passed: true,
      package: report.name,
      version: report.version,
      publishable: packageJson.private !== true,
      entryCount: files.length,
      tarballBytes: tarball.byteLength,
      sha256,
      runtimeExportCount: runtimeExports.length,
      documentedExportCount: runtimeExports.length - undocumentedExports.length,
      provenance: "dist-only public package; no playground, research, or host runtime files",
    }),
  );
} finally {
  await rm(tarDestination, { recursive: true, force: true });
}
