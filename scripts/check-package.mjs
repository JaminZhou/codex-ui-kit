import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(packageJson.name === "codex-ui-kit", "unexpected package name");
assert(packageJson.version === "0.1.0", "expected the 0.1.0 foundation version");
assert(packageJson.private !== true, "release package must not be private");
assert(packageJson.publishConfig?.access === "public", "package access must be public");
assert(packageJson.repository?.url, "repository metadata is required");
assert(packageJson.homepage, "homepage metadata is required");
assert(packageJson.bugs?.url, "bugs metadata is required");
assert(packageJson.files?.includes("dist"), "dist must be included in the package");
assert(
  packageJson.sideEffects?.includes("**/*.css"),
  "CSS must remain marked as a side effect",
);

function collectExportTargets(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectExportTargets);
}

const exportTargets = collectExportTargets(packageJson.exports);
for (const target of exportTargets) {
  assert(target.startsWith("./"), `export target must be relative: ${target}`);
  assert(existsSync(new URL(target.slice(2), root)), `missing export target: ${target}`);
}

for (const field of ["main", "module", "types"]) {
  const target = packageJson[field];
  assert(typeof target === "string", `missing ${field} entry`);
  assert(existsSync(new URL(target.slice(2), root)), `missing ${field} target: ${target}`);
}

const rootDeclaration = readFileSync(new URL("dist/index.d.ts", root), "utf8");
assert(
  !rootDeclaration.includes(".css"),
  "root declarations must not retain a CSS side-effect import",
);

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const packed = spawnSync(npmExecutable, ["pack", "--dry-run", "--json"], {
  cwd: new URL(".", root),
  encoding: "utf8",
});

if (packed.error) throw packed.error;
assert(packed.status === 0, packed.stderr || "npm pack --dry-run failed");

const [report] = JSON.parse(packed.stdout);
assert(report.name === packageJson.name, "packed name does not match package.json");
assert(
  report.version === packageJson.version,
  "packed version does not match package.json",
);

const packedPaths = new Set(report.files.map((file) => file.path));
for (const requiredPath of [
  "LICENSE",
  "README.md",
  "package.json",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/style.css",
  "dist/styles.d.ts",
]) {
  assert(packedPaths.has(requiredPath), `package is missing ${requiredPath}`);
}

for (const file of packedPaths) {
  assert(
    !/^(demo|fixtures|playgrounds|research|src|tests)\//.test(file),
    `development-only file leaked into package: ${file}`,
  );
}

console.log(
  `package contract ok: ${report.name}@${report.version}, ${report.entryCount} files`,
);
