import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestUrl = new URL("../research/visual-assets.json", import.meta.url);
const packageUrl = new URL("../package.json", import.meta.url);
const playgroundIconUrl = new URL(
  "../playgrounds/codex-app/src/currentBuildIcons.tsx",
  import.meta.url,
);
const playgroundAppUrl = new URL(
  "../playgrounds/codex-app/src/App.tsx",
  import.meta.url,
);
const playgroundStylesUrl = new URL(
  "../playgrounds/codex-app/src/styles.css",
  import.meta.url,
);

const [manifestText, packageText, iconSource, appSource, playgroundStyles] =
  await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(packageUrl, "utf8"),
    readFile(playgroundIconUrl, "utf8"),
    readFile(playgroundAppUrl, "utf8"),
    readFile(playgroundStylesUrl, "utf8"),
  ]);
const manifest = JSON.parse(manifestText);
const packageJson = JSON.parse(packageText);

function canonicalize(value) {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || Array.isArray(nested) || typeof nested !== "object") {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });
}

if (manifest.schemaVersion !== 1) {
  throw new Error("visual asset schemaVersion must be 1");
}
if (manifest.geometryHashVersion !== 2) {
  throw new Error("visual asset geometryHashVersion must be 2");
}
if (
  !manifest.baseline?.appVersion ||
  !manifest.baseline?.buildNumber ||
  !/^[a-f0-9]{64}$/.test(manifest.baseline?.appAsarSha256 ?? "")
) {
  throw new Error("visual assets require a complete current-build fingerprint");
}
if (
  manifest.policy?.packageBoundary !== "playground-only" ||
  manifest.policy?.globalPixelParityEligible !== false ||
  manifest.policy?.remainingApproximationInventoryComplete !== false ||
  !manifest.policy?.globalPixelParityBlocker
) {
  throw new Error("visual asset policy must preserve the package and parity boundary");
}
if (
  !Array.isArray(packageJson.files) ||
  packageJson.files.length !== 1 ||
  packageJson.files[0] !== "dist"
) {
  throw new Error("exact reference visuals must remain outside the npm package");
}
if (
  manifest.typography?.shell?.fontFamily !==
    "-apple-system, system-ui, Segoe UI, sans-serif" ||
  playgroundStyles.includes("OpenAI Sans")
) {
  throw new Error("playground shell typography must use the observed system stack");
}

const ids = new Set();
for (const icon of manifest.icons ?? []) {
  if (!icon.id || ids.has(icon.id)) {
    throw new Error(`invalid or duplicate visual asset id: ${String(icon.id)}`);
  }
  ids.add(icon.id);
  if (
    icon.status !== "runtime-observed" ||
    !icon.region ||
    !icon.viewBox ||
    !icon.rootAttributes ||
    !Number.isFinite(icon.renderSize?.width) ||
    !Number.isFinite(icon.renderSize?.height) ||
    !Array.isArray(icon.primitives) ||
    icon.primitives.length === 0
  ) {
    throw new Error(`incomplete runtime evidence for ${icon.id}`);
  }
  const sha256 = createHash("sha256")
    .update(
      canonicalize({
        primitives: icon.primitives,
        rootAttributes: icon.rootAttributes,
        viewBox: icon.viewBox,
      }),
    )
    .digest("hex");
  if (sha256 !== icon.sha256) {
    throw new Error(
      `visual asset hash mismatch for ${icon.id}: expected ${icon.sha256}, received ${sha256}`,
    );
  }
  if (!iconSource.includes(`| "${icon.id}"`) && !iconSource.includes(`name: "${icon.id}"`)) {
    throw new Error(`current-build renderer does not declare ${icon.id}`);
  }
  if (!appSource.includes(`name="${icon.id}"`)) {
    throw new Error(`current-build playground does not render ${icon.id}`);
  }
}

const remaining = manifest.remainingApproximationIds;
if (!Array.isArray(remaining) || remaining.length === 0) {
  throw new Error(
    "global parity cannot be promoted until the remaining approximation inventory is explicitly empty",
  );
}
if (new Set(remaining).size !== remaining.length) {
  throw new Error("remaining approximation ids must be unique");
}

console.log(
  `Visual asset provenance covers ${ids.size} exact icons; ${remaining.length} approximations remain explicit.`,
);
