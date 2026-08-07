import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const write = process.argv.includes("--write");
const manifestPath = fileURLToPath(
  new URL("../research/visual-assets.json", import.meta.url),
);
const capturePath = fileURLToPath(
  new URL("./capture-current-visual-assets.mjs", import.meta.url),
);

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

function primitiveGeometry(primitive) {
  return {
    attributes: primitive.attributes,
    ...(primitive.children
      ? { children: primitive.children.map(primitiveGeometry) }
      : {}),
    tag: primitive.tag,
  };
}

function legacyGeometryHash(icon) {
  return createHash("sha256")
    .update(
      canonicalize({
        primitives: icon.primitives.map(primitiveGeometry),
        rootAttributes: icon.rootAttributes,
        viewBox: icon.viewBox,
      }),
    )
    .digest("hex");
}

function promotePrimitive(existing, observedCandidates) {
  const geometry = canonicalize(primitiveGeometry(existing));
  const observed = observedCandidates.find(
    (candidate) => canonicalize(primitiveGeometry(candidate)) === geometry,
  );
  if (!observed) {
    throw new Error(`No observed primitive matches ${existing.tag}.`);
  }
  return {
    attributes: existing.attributes,
    ...(existing.children
      ? {
          children: existing.children.map((child) =>
            promotePrimitive(child, observed.children ?? []),
          ),
        }
      : {}),
    computedStyle: observed.computedStyle,
    tag: existing.tag,
  };
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const capture = JSON.parse(
  execFileSync(process.execPath, [capturePath], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  }),
);
const baselineContext = capture.baselineContext;
if (
  !baselineContext ||
  canonicalize(capture.viewport) !== canonicalize(baselineContext.viewport)
) {
  throw new Error("Capture is missing its exact baseline context.");
}

const semanticIdByManifestId = new Map([
  ["sidebar-activity", "sidebar-activity-attention"],
  ["sidebar-mode-chevron", "sidebar-mode-chevron"],
  ["sidebar-quick-chat", "sidebar-quick-chat"],
  ["sidebar-search", "sidebar-search"],
]);

manifest.geometryHashVersion = 4;
manifest.baseline = {
  ...manifest.baseline,
  ...baselineContext,
};
manifest.icons = manifest.icons.map((icon) => {
  const semanticId = semanticIdByManifestId.get(icon.id);
  const candidates = semanticId
    ? capture.icons.filter((candidate) => candidate.owner.semanticId === semanticId)
    : capture.icons.filter(
        (candidate) =>
          candidate.region === icon.region &&
          legacyGeometryHash(candidate) === legacyGeometryHash(icon),
      );
  if (candidates.length !== 1) {
    throw new Error(
      `Expected one current capture for ${icon.id}, received ${candidates.length}.`,
    );
  }
  const observed = candidates[0];
  if (!observed) {
    throw new Error(`No current capture matches ${icon.id}.`);
  }
  const promoted = {
    ...icon,
    primitives: icon.primitives.map((primitive) =>
      promotePrimitive(primitive, observed.primitives),
    ),
    renderSize: observed.renderSize,
    rootComputedStyle: observed.rootComputedStyle,
    sourceClassName: observed.sourceClassName,
  };
  promoted.sha256 = createHash("sha256")
    .update(
      canonicalize({
        baselineContext,
        primitives: promoted.primitives,
        renderSize: promoted.renderSize,
        rootAttributes: promoted.rootAttributes,
        rootComputedStyle: promoted.rootComputedStyle,
        sourceClassName: promoted.sourceClassName,
        viewBox: promoted.viewBox,
      }),
    )
    .digest("hex");
  return promoted;
});

const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (write) {
  writeFileSync(manifestPath, output);
  console.log(`Updated ${manifestPath}`);
} else {
  process.stdout.write(output);
}
