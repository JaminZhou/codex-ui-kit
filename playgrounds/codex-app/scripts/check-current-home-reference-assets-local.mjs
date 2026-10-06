import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const playgroundRoot = fileURLToPath(new URL("../", import.meta.url));
const capturePreview = process.argv.slice(2).includes("--capture-preview");
assert.ok(
  process.argv.slice(2).every((argument) => argument === "--capture-preview"),
  "Supported option: --capture-preview",
);
const localReferenceBuildPath = fileURLToPath(
  new URL("../dist/local-reference-assets/26.930.31730/", import.meta.url),
);

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

try {
  execFileSync("pnpm", ["build:renderer"], {
    cwd: playgroundRoot,
    env: { ...process.env, CODEX_UI_KIT_INCLUDE_LOCAL_REFERENCE_ASSETS: "1" },
    stdio: "inherit",
  });
  assert.equal(
    await pathExists(localReferenceBuildPath),
    true,
    "the explicit local-reference build must include the local comparison assets",
  );
  execFileSync(
    process.execPath,
    [
      "scripts/check-current-home-composer-26-930.mjs",
      "--require-local-reference-assets",
      ...(capturePreview ? ["--capture-preview"] : []),
    ],
    { cwd: playgroundRoot, stdio: "inherit" },
  );
} finally {
  await rm(localReferenceBuildPath, { force: true, recursive: true });
  assert.equal(
    await pathExists(localReferenceBuildPath),
    false,
    "local-only reference bytes must be removed from the generated renderer after acceptance",
  );
  const parentPath = fileURLToPath(
    new URL("../dist/local-reference-assets/", import.meta.url),
  );
  if (await pathExists(parentPath)) {
    if ((await readdir(parentPath)).length === 0) {
      await rm(parentPath, { force: true, recursive: true });
    }
  }
}
