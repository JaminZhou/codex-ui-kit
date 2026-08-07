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
const captureScriptUrl = new URL(
  "./capture-current-visual-assets.mjs",
  import.meta.url,
);

const [
  manifestText,
  packageText,
  iconSource,
  appSource,
  playgroundStyles,
  captureSource,
] =
  await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(packageUrl, "utf8"),
    readFile(playgroundIconUrl, "utf8"),
    readFile(playgroundAppUrl, "utf8"),
    readFile(playgroundStylesUrl, "utf8"),
    readFile(captureScriptUrl, "utf8"),
  ]);
const manifest = JSON.parse(manifestText);
const packageJson = JSON.parse(packageText);
const allowedSvgTags = new Set([
  "circle",
  "clippath",
  "defs",
  "ellipse",
  "g",
  "line",
  "lineargradient",
  "mask",
  "path",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "use",
]);
const allowedSvgAttributes = new Set([
  "clip-path",
  "clip-rule",
  "color",
  "cx",
  "cy",
  "d",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "gradienttransform",
  "gradientunits",
  "height",
  "href",
  "id",
  "mask",
  "offset",
  "opacity",
  "points",
  "preserveaspectratio",
  "r",
  "rx",
  "ry",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "vector-effect",
  "width",
  "x",
  "x1",
  "x2",
  "xlink:href",
  "y",
  "y1",
  "y2",
]);
const rootComputedStyleKeys = new Set([
  "clipPath",
  "color",
  "display",
  "fill",
  "fillOpacity",
  "filter",
  "flexBasis",
  "flexGrow",
  "flexShrink",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "height",
  "lineHeight",
  "mask",
  "opacity",
  "overflow",
  "paintOrder",
  "shapeRendering",
  "stroke",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "transform",
  "transformOrigin",
  "vectorEffect",
  "visibility",
  "width",
]);

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

function validSvgAttributes(attributes) {
  return (
    attributes &&
    typeof attributes === "object" &&
    !Array.isArray(attributes) &&
    Object.entries(attributes).every(
      ([name, value]) =>
        allowedSvgAttributes.has(name.toLowerCase()) &&
        typeof value === "string",
    )
  );
}

function validSvgPrimitive(primitive) {
  return (
    primitive &&
    typeof primitive === "object" &&
    allowedSvgTags.has(primitive.tag) &&
    validSvgAttributes(primitive.attributes) &&
    (primitive.children === undefined ||
      (Array.isArray(primitive.children) &&
        primitive.children.length > 0 &&
        primitive.children.every(validSvgPrimitive))) &&
    Object.keys(primitive).every((key) =>
      ["attributes", "children", "tag"].includes(key),
    )
  );
}

if (manifest.schemaVersion !== 1) {
  throw new Error("visual asset schemaVersion must be 1");
}
if (manifest.geometryHashVersion !== 3) {
  throw new Error("visual asset geometryHashVersion must be 3");
}
if (
  !manifest.baseline?.appVersion ||
  !manifest.baseline?.buildNumber ||
  manifest.baseline?.theme !== "dark" ||
  manifest.baseline?.interactionState !== "resting" ||
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
    typeof icon.sourceClassName !== "string" ||
    !icon.rootComputedStyle ||
    typeof icon.rootComputedStyle !== "object" ||
    Array.isArray(icon.rootComputedStyle) ||
    Object.keys(icon.rootComputedStyle).length !== rootComputedStyleKeys.size ||
    !Object.entries(icon.rootComputedStyle).every(
      ([key, value]) =>
        rootComputedStyleKeys.has(key) && typeof value === "string",
    ) ||
    !validSvgAttributes(icon.rootAttributes) ||
    !Number.isFinite(icon.renderSize?.width) ||
    !Number.isFinite(icon.renderSize?.height) ||
    !Array.isArray(icon.primitives) ||
    icon.primitives.length === 0 ||
    !icon.primitives.every(validSvgPrimitive)
  ) {
    throw new Error(`incomplete runtime evidence for ${icon.id}`);
  }
  const sha256 = createHash("sha256")
    .update(
      canonicalize({
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
  !iconSource.includes("renderPrimitive(child")
) {
  throw new Error("current-build renderer must reconstruct nested SVG trees");
}
if (
  !captureSource.includes("read-macos-process-info.py") ||
  !captureSource.includes("does not descend from isolated owner PID") ||
  !captureSource.includes("Inline SVG style attributes are unsupported") ||
  !captureSource.includes("ignoredNonVisualSvgAttributes") ||
  !captureSource.includes("separatelyCapturedRootSvgAttributes") ||
  !captureSource.includes("Unsupported SVG attributes on")
) {
  throw new Error(
    "visual capture must prove argv and listener ancestry and fail closed on visual SVG attributes",
  );
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
