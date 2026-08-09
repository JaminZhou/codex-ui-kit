import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sanitizeVisualAssetIcon } from "./visual-asset-contract.mjs";
import {
  hasCurrentSidebarSettingsAbsenceEvidence,
  hasCurrentSidebarThreadAbsenceEvidence,
} from "./visual-asset-sidebar-contract.mjs";

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

const sameFingerprintRetainedComputedStyleProperties = new Set([
  "scrollbar-color",
]);

function promoteComputedStyle(existing, observed) {
  const promoted = { ...observed };
  for (const property of sameFingerprintRetainedComputedStyleProperties) {
    if (Object.hasOwn(existing, property)) {
      promoted[property] = existing[property];
    }
  }
  return promoted;
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
    computedStyle: promoteComputedStyle(
      existing.computedStyle,
      observed.computedStyle,
    ),
    tag: existing.tag,
  };
}

function promotePrimitives(icon, observed) {
  const expectedObservedGeometry = icon.primitives.map(primitiveGeometry);
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

const promotionSpecs = new Map([
  [
    "window-chrome-sidebar",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "one visible current window-chrome Hide/Show sidebar control",
      region: "titlebar",
      semanticId: "window-chrome-sidebar",
    },
  ],
  [
    "window-chrome-back",
    {
      ownerAriaLabel: "Back",
      region: "titlebar",
      semanticId: "window-chrome-back",
    },
  ],
  [
    "window-chrome-forward",
    {
      ownerAriaLabel: "Forward",
      region: "titlebar",
      semanticId: "window-chrome-forward",
    },
  ],
  [
    "sidebar-mode-chevron",
    {
      ownerAriaLabel: "Switch mode, current mode: Codex",
      region: "sidebar-primary",
      semanticId: "sidebar-mode-chevron",
    },
  ],
  [
    "sidebar-search",
    {
      ownerAriaLabel: "Search",
      region: "sidebar-primary",
      semanticId: "sidebar-search",
    },
  ],
  [
    "sidebar-activity",
    {
      ownerAriaLabel: "View activity",
      region: "sidebar-primary",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "sidebar-activity",
    },
  ],
  [
    "sidebar-new-chat",
    {
      ownerAriaLabel: null,
      ownerEvidence: "first primary sidebar row labelled New chat",
      region: "sidebar-primary",
      semanticId: "sidebar-new-chat",
    },
  ],
  [
    "sidebar-quick-chat",
    {
      ownerAriaLabel: "Quick chat",
      region: "sidebar-primary",
      semanticId: "sidebar-quick-chat",
    },
  ],
  [
    "sidebar-folder",
    {
      geometrySha256:
        "19f3960517971cf25ba4d32df632b5088a93be74278125ac49ce01d854a59124",
      minimumCandidates: 2,
      ownerAriaLabel: null,
      ownerEvidence:
        "repeated leading glyph in project rows, selected by an explicit current-build geometry seed",
      region: "sidebar-projects",
    },
  ],
  [
    "sidebar-pull-request",
    {
      ownerAriaLabel: null,
      ownerEvidence: "primary sidebar row labelled Pull requests",
      region: "sidebar-primary",
      semanticId: "sidebar-pull-request",
    },
  ],
  [
    "sidebar-sites",
    {
      ownerAriaLabel: null,
      ownerEvidence: "primary sidebar row labelled Sites",
      region: "sidebar-primary",
      semanticId: "sidebar-sites",
    },
  ],
  [
    "sidebar-scheduled",
    {
      ownerAriaLabel: null,
      ownerEvidence: "primary sidebar row labelled Scheduled",
      region: "sidebar-primary",
      semanticId: "sidebar-scheduled",
    },
  ],
  [
    "sidebar-plugins",
    {
      ownerAriaLabel: null,
      ownerEvidence: "primary sidebar row labelled Plugins",
      region: "sidebar-primary",
      semanticId: "sidebar-plugins",
    },
  ],
  [
    "sidebar-more",
    {
      minimumCandidates: 2,
      ownerAriaLabel: null,
      ownerEvidence:
        "repeated project-row Actions controls, mapped to a fixed semantic ID inside the Renderer",
      region: "sidebar-projects",
      semanticId: "sidebar-more",
    },
  ],
  [
    "sidebar-pin",
    {
      minimumCandidates: 2,
      ownerAriaLabel: null,
      ownerEvidence:
        "repeated task-row Pin controls, mapped to a fixed semantic ID inside the Renderer",
      region: "sidebar-projects",
      semanticId: "sidebar-pin",
    },
  ],
  [
    "sidebar-archive",
    {
      minimumCandidates: 2,
      ownerAriaLabel: null,
      ownerEvidence:
        "repeated task-row Archive controls, mapped to a fixed semantic ID inside the Renderer",
      region: "sidebar-projects",
      semanticId: "sidebar-archive",
    },
  ],
  [
    "sidebar-help",
    {
      ownerAriaLabel: "Open help menu",
      region: "sidebar-footer",
      semanticId: "sidebar-help",
    },
  ],
]);

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
const fingerprintChanged =
  canonicalize(previousFingerprint) !== canonicalize(currentFingerprint);
const capturedAt =
  !fingerprintChanged &&
  /^\d{4}-\d{2}-\d{2}$/.test(manifest.baseline.capturedAt ?? "")
    ? manifest.baseline.capturedAt
    : new Date().toISOString().slice(0, 10);
const hashBaselineContext = { ...baselineContext, capturedAt };
manifest.geometryHashVersion = 4;
manifest.baseline = hashBaselineContext;
manifest.sidebarObservation = capture.sidebarObservation;

function selectObservedIcon(id, spec, existing) {
  const candidates = capture.icons.filter(
    (candidate) =>
      candidate.region === spec.region &&
      (spec.semanticId
        ? candidate.owner.semanticId === spec.semanticId
        : legacyGeometryHash(candidate) === spec.geometrySha256),
  );
  if (
    candidates.length === 0 &&
    existing &&
    !fingerprintChanged &&
    spec.retainExistingWhenAbsentOnSameFingerprint
  ) {
    return null;
  }
  if (!spec.minimumCandidates && candidates.length !== 1) {
    throw new Error(
      `Expected one current capture for ${id}, received ${candidates.length}.`,
    );
  }
  if (spec.minimumCandidates && candidates.length < spec.minimumCandidates) {
    throw new Error(
      `Expected at least ${spec.minimumCandidates} current captures for ${id}, received ${candidates.length}.`,
    );
  }
  if (new Set(candidates.map((candidate) => candidate.sha256)).size !== 1) {
    throw new Error(`${id} repeated captures do not share one visual fingerprint.`);
  }
  return candidates[0];
}

function promoteIcon(id, existing) {
  const spec = promotionSpecs.get(id);
  if (!spec) throw new Error(`Missing explicit promotion spec for ${id}.`);
  const observed = selectObservedIcon(id, spec, existing);
  if (!observed) return existing;

  let primitives = observed.primitives;
  if (existing && !fingerprintChanged) {
    if (
      observed.region !== existing.region ||
      observed.viewBox !== existing.viewBox ||
      canonicalize(observed.rootAttributes) !==
        canonicalize(existing.rootAttributes)
    ) {
      throw new Error(`${id} root geometry or region changed.`);
    }
    primitives = promotePrimitives(existing, observed);
  }

  const promoted = {
    id,
    ownerAriaLabel: spec.ownerAriaLabel,
    ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
    primitives,
    region: observed.region,
    renderSize: observed.renderSize,
    rootAttributes: observed.rootAttributes,
    rootComputedStyle:
      existing && !fingerprintChanged
        ? promoteComputedStyle(
            existing.rootComputedStyle,
            observed.rootComputedStyle,
          )
        : observed.rootComputedStyle,
    sourceClassName: observed.sourceClassName,
    status: "runtime-observed",
    viewBox: observed.viewBox,
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
}

const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
manifest.icons = [...promotionSpecs].map(([id]) =>
  promoteIcon(id, existingById.get(id)),
);
const promotedIds = new Set(promotionSpecs.keys());
const currentSidebarSettingsAbsenceProven =
  hasCurrentSidebarSettingsAbsenceEvidence(capture.sidebarObservation);
const currentSidebarThreadAbsenceProven =
  hasCurrentSidebarThreadAbsenceEvidence(capture.sidebarObservation);
const currentBuildAbsenceEvidence = new Map([
  ["sidebar-settings", currentSidebarSettingsAbsenceProven],
  ["sidebar-thread", currentSidebarThreadAbsenceProven],
]);
const remainingApproximationCandidates = new Set(
  manifest.remainingApproximationIds,
);
for (const [id, absenceProven] of currentBuildAbsenceEvidence) {
  if (!absenceProven) {
    remainingApproximationCandidates.add(id);
  }
}
manifest.remainingApproximationIds = [...remainingApproximationCandidates].filter(
  (id) =>
    !promotedIds.has(id) &&
    currentBuildAbsenceEvidence.get(id) !== true,
);

const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (write) {
  writeFileSync(manifestPath, output);
  console.log(`Updated ${manifestPath}`);
} else {
  process.stdout.write(output);
}
