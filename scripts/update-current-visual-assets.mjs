import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sanitizeVisualAssetIcon } from "./visual-asset-contract.mjs";

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

function promotePrimitive(existing, observed, context) {
  if (
    canonicalize(primitiveGeometry(existing)) !==
    canonicalize(primitiveGeometry(observed))
  ) {
    throw new Error(`${context} does not match the tracked primitive geometry.`);
  }
  return {
    attributes: existing.attributes,
    ...(existing.children
      ? {
          children: existing.children.map((child, index) =>
            promotePrimitive(
              child,
              observed.children[index],
              `${context}.children[${index}]`,
            ),
          ),
        }
      : {}),
    computedStyle: observed.computedStyle,
    tag: existing.tag,
  };
}

const activityAttentionPrimitiveGeometry = {
  attributes: {
    d: "M14.1562 6.63542C14.6701 6.93403 15.2292 7.08333 15.8333 7.08333C16.4375 7.08333 16.9931 6.93403 17.5 6.63542C18.0139 6.33681 18.4201 5.93403 18.7187 5.42708C19.0174 4.91319 19.1667 4.35417 19.1667 3.75C19.1667 3.14583 19.0174 2.59028 18.7187 2.08333C18.4201 1.56944 18.0139 1.16319 17.5 0.864583C16.9931 0.565972 16.4375 0.416667 15.8333 0.416667C15.2292 0.416667 14.6701 0.565972 14.1562 0.864583C13.6493 1.16319 13.2465 1.56944 12.9479 2.08333C12.6493 2.59028 12.5 3.14583 12.5 3.75C12.5 4.35417 12.6493 4.91319 12.9479 5.42708C13.2465 5.93403 13.6493 6.33681 14.1562 6.63542Z",
    fill: "var(--color-token-text-link-foreground)",
  },
  tag: "path",
};

function promotePrimitives(icon, observed) {
  const expectedObservedGeometry =
    icon.id === "sidebar-activity"
      ? [
          ...icon.primitives.map(primitiveGeometry),
          activityAttentionPrimitiveGeometry,
        ]
      : icon.primitives.map(primitiveGeometry);
  const observedGeometry = observed.primitives.map(primitiveGeometry);
  if (canonicalize(observedGeometry) !== canonicalize(expectedObservedGeometry)) {
    throw new Error(
      `${icon.id} requires a complete ordered primitive match with no leftovers.`,
    );
  }
  return icon.primitives.map((primitive, index) =>
    promotePrimitive(
      primitive,
      observed.primitives[index],
      `${icon.id}.primitives[${index}]`,
    ),
  );
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const capture = JSON.parse(
  execFileSync(process.execPath, [capturePath], {
    encoding: "utf8",
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
  }),
);
capture.icons.forEach((icon, index) =>
  sanitizeVisualAssetIcon(icon, `capture.icons[${index}]`),
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

const previousFingerprint = {
  appAsarSha256: manifest.baseline.appAsarSha256,
  appVersion: manifest.baseline.appVersion,
  buildNumber: manifest.baseline.buildNumber,
};
const currentFingerprint = {
  appAsarSha256: baselineContext.appAsarSha256,
  appVersion: baselineContext.appVersion,
  buildNumber: baselineContext.buildNumber,
};
const capturedAt =
  canonicalize(previousFingerprint) === canonicalize(currentFingerprint) &&
  /^\d{4}-\d{2}-\d{2}$/.test(manifest.baseline.capturedAt ?? "")
    ? manifest.baseline.capturedAt
    : new Date().toISOString().slice(0, 10);
const hashBaselineContext = { ...baselineContext, capturedAt };
manifest.geometryHashVersion = 4;
manifest.baseline = hashBaselineContext;
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
  if (
    observed.region !== icon.region ||
    observed.viewBox !== icon.viewBox ||
    canonicalize(observed.rootAttributes) !== canonicalize(icon.rootAttributes)
  ) {
    throw new Error(`${icon.id} root geometry or region changed.`);
  }
  const promoted = {
    ...icon,
    primitives: promotePrimitives(icon, observed),
    renderSize: observed.renderSize,
    rootComputedStyle: observed.rootComputedStyle,
    sourceClassName: observed.sourceClassName,
  };
  promoted.sha256 = createHash("sha256")
    .update(
      canonicalize({
        baselineContext: hashBaselineContext,
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
