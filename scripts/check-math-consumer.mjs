import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Use the actual archive without workspace overrides: a safe workspace graph
// must not hide vulnerable transitive ranges in the published package.
const [archive, installer = "npm"] = process.argv.slice(2);
assert(archive && ["npm", "pnpm"].includes(installer),
  "usage: node scripts/check-math-consumer.mjs <tarball> [npm|pnpm]");
const directory = mkdtempSync(join(tmpdir(), "codex-ui-kit-math-consumer-"));
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: directory, encoding: "utf8", timeout: 120_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  writeFileSync(join(directory, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const dependencies = [resolve(archive), "react@18.3.1", "react-dom@18.3.1"];
  run(installer, installer === "npm"
    ? ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", ...dependencies]
    : ["add", "--ignore-scripts", "--save-exact", ...dependencies]);
  const lock = readFileSync(join(directory, installer === "npm" ? "package-lock.json" : "pnpm-lock.yaml"), "utf8");
  assert(!/rehype-katex|remark-math|micromark-extension-math/.test(lock),
    "consumer must not install math adapters with vulnerable KaTeX ranges");
  const audit = JSON.parse(run(installer, ["audit", "--json"]));
  const counts = audit.metadata.vulnerabilities;
  assert(Object.values(counts).every((count) => count === 0), JSON.stringify(counts));
  writeFileSync(join(directory, "math.mjs"),
    readFileSync(new URL("../fixtures/package-consumer/math.mjs", import.meta.url)));
  process.stdout.write(run(process.execPath, [join(directory, "math.mjs")]));
  console.log(JSON.stringify({ installer, vulnerabilities: counts, passed: true }));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
