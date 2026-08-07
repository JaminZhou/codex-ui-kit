import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sanitizeVisualAssetIcon } from "./visual-asset-contract.mjs";

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
const captureScriptUrl = new URL(
  "./capture-current-visual-assets.mjs",
  import.meta.url,
);
const updaterScriptUrl = new URL(
  "./update-current-visual-assets.mjs",
  import.meta.url,
);

const [
  manifestText,
  packageText,
  iconSource,
  appSource,
  playgroundStyles,
  captureSource,
  updaterSource,
] =
  await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(packageUrl, "utf8"),
    readFile(playgroundIconUrl, "utf8"),
    readFile(playgroundAppUrl, "utf8"),
    readFile(playgroundStylesUrl, "utf8"),
    readFile(captureScriptUrl, "utf8"),
    readFile(updaterScriptUrl, "utf8"),
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
if (manifest.geometryHashVersion !== 4) {
  throw new Error("visual asset geometryHashVersion must be 4");
}
if (
  !manifest.baseline?.appVersion ||
  !manifest.baseline?.buildNumber ||
  !/^\d{4}-\d{2}-\d{2}$/.test(manifest.baseline?.capturedAt ?? "") ||
  manifest.baseline?.theme !== "dark" ||
  manifest.baseline?.interactionState !== "resting" ||
  manifest.baseline?.viewport?.width !== 1180 ||
  manifest.baseline?.viewport?.height !== 820 ||
  !/^[a-f0-9]{64}$/.test(manifest.baseline?.appAsarSha256 ?? "")
) {
  throw new Error("visual assets require a complete current-build fingerprint");
}
const baselineContext = {
  appAsarSha256: manifest.baseline.appAsarSha256,
  appVersion: manifest.baseline.appVersion,
  buildNumber: manifest.baseline.buildNumber,
  capturedAt: manifest.baseline.capturedAt,
  interactionState: manifest.baseline.interactionState,
  theme: manifest.baseline.theme,
  viewport: manifest.baseline.viewport,
};
const rejectUnsafeFixture = (fixture, label) => {
  try {
    sanitizeVisualAssetIcon(fixture, `negative-fixture.${label}`);
  } catch {
    return;
  }
  throw new Error(`visual asset sanitizer accepted unsafe fixture: ${label}`);
};
const incompleteStyleFixture = structuredClone(manifest.icons[0]);
delete incompleteStyleFixture.rootComputedStyle[
  Object.keys(incompleteStyleFixture.rootComputedStyle)[0]
];
rejectUnsafeFixture(incompleteStyleFixture, "incomplete-computed-style");
const externalCssUrlFixture = structuredClone(manifest.icons[0]);
externalCssUrlFixture.rootComputedStyle.filter = "url(app://-/asset.svg#filter)";
rejectUnsafeFixture(externalCssUrlFixture, "external-css-url");
const schemeRelativeAttributeFixture = structuredClone(manifest.icons[0]);
schemeRelativeAttributeFixture.rootAttributes.fill = "url(//example.invalid/fill.svg)";
rejectUnsafeFixture(schemeRelativeAttributeFixture, "scheme-relative-svg-url");
const externalHrefFixture = structuredClone(manifest.icons[0]);
externalHrefFixture.rootAttributes.href = "blob:https://example.invalid/id";
rejectUnsafeFixture(externalHrefFixture, "external-svg-href");
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
  try {
    sanitizeVisualAssetIcon(icon, `manifest.icons.${icon.id}`);
  } catch (error) {
    throw new Error(`unsafe or incomplete runtime evidence for ${icon.id}`, {
      cause: error,
    });
  }
  if (
    icon.status !== "runtime-observed" ||
    !icon.region ||
    !icon.viewBox ||
    typeof icon.sourceClassName !== "string" ||
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
        baselineContext,
        primitives: icon.primitives,
        renderSize: icon.renderSize,
        rootAttributes: icon.rootAttributes,
        rootComputedStyle: icon.rootComputedStyle,
        sourceClassName: icon.sourceClassName,
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

if (
  !iconSource.includes("primitive.children?.map") ||
  !iconSource.includes("renderPrimitive(child") ||
  !iconSource.includes("toReactStyle(primitive.computedStyle)") ||
  !iconSource.includes("toReactStyle(icon.rootComputedStyle)")
) {
  throw new Error(
    "current-build renderer must reconstruct nested SVG trees and computed styles",
  );
}
if (
  !captureSource.includes("read-macos-process-info.py") ||
  !captureSource.includes("does not descend from isolated owner PID") ||
  !captureSource.includes("Inline SVG style attributes are unsupported") ||
  !captureSource.includes("ignoredNonVisualSvgAttributes") ||
  !captureSource.includes("separatelyCapturedRootSvgAttributes") ||
  !captureSource.includes("Unsupported SVG attributes on") ||
  !captureSource.includes("baselineContext") ||
  !captureSource.includes("computedStyle: computedStyle(element)") ||
  !captureSource.includes("sanitizeVisualAssetIcon")
) {
  throw new Error(
    "visual capture must prove argv and listener ancestry and fail closed on visual SVG attributes",
  );
}
if (
  packageJson.scripts?.["update:visual-assets"] !==
    "node scripts/update-current-visual-assets.mjs --write" ||
  !updaterSource.includes("Expected one current capture") ||
  !updaterSource.includes("baselineContext") ||
  !updaterSource.includes("complete ordered primitive match with no leftovers") ||
  !updaterSource.includes("sanitizeVisualAssetIcon") ||
  !updaterSource.includes("capturedAt")
) {
  throw new Error("visual asset promotion must remain deterministic and explicit");
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
