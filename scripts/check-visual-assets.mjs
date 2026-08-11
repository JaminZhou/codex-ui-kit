import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  sanitizeVisualAssetIcon,
  sanitizeVisualScalarRecord,
} from "./visual-asset-contract.mjs";
import {
  hasCurrentSidebarSettingsAbsenceEvidence,
  hasCurrentSidebarThreadAbsenceEvidence,
} from "./visual-asset-sidebar-contract.mjs";

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
  manifest.baseline?.interactionState !==
    "resting-and-open-sidebar-menus" ||
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
const escapedExternalUrlFixture = structuredClone(manifest.icons[0]);
escapedExternalUrlFixture.rootComputedStyle.fill =
  "u\\72 l(\\68 ttps\\3a \\2f \\2f example.invalid\\2f fill.svg#paint)";
rejectUnsafeFixture(escapedExternalUrlFixture, "css-escaped-external-url");
const escapedQuoteUrlFixture = structuredClone(manifest.icons[0]);
escapedQuoteUrlFixture.rootComputedStyle.fill = "url(\\22 #safe-filter\\22 )";
rejectUnsafeFixture(escapedQuoteUrlFixture, "css-escaped-quote-url");
const escapedWhitespaceUrlFixture = structuredClone(manifest.icons[0]);
escapedWhitespaceUrlFixture.rootComputedStyle.fill = "url(\\20 #safe-filter)";
rejectUnsafeFixture(escapedWhitespaceUrlFixture, "css-escaped-whitespace-url");
const quotedWhitespaceUrlFixture = structuredClone(manifest.icons[0]);
quotedWhitespaceUrlFixture.rootComputedStyle.fill = 'url(" #safe-filter")';
rejectUnsafeFixture(quotedWhitespaceUrlFixture, "quoted-whitespace-url");
const nonBreakingWhitespaceUrlFixture = structuredClone(manifest.icons[0]);
nonBreakingWhitespaceUrlFixture.rootComputedStyle.fill = 'url("\u00A0#safe-filter")';
rejectUnsafeFixture(nonBreakingWhitespaceUrlFixture, "non-breaking-whitespace-url");
try {
  sanitizeVisualScalarRecord(
    { filter: "url(chrome-extension://unsafe/filter.svg#paint)" },
    "negative-fixture.font-sample",
  );
  throw new Error("visual asset sanitizer accepted unsafe font sample");
} catch (error) {
  if (error.message === "visual asset sanitizer accepted unsafe font sample") {
    throw error;
  }
}
const localFragmentFixture = structuredClone(manifest.icons[0]);
localFragmentFixture.rootComputedStyle.filter = 'url( "#safe-filter" )';
sanitizeVisualAssetIcon(localFragmentFixture, "positive-fixture.local-fragment");
if (
  manifest.policy?.packageBoundary !== "playground-only" ||
  manifest.policy?.globalPixelParityEligible !== false ||
  manifest.policy?.remainingApproximationInventoryComplete !== false ||
  manifest.policy?.globalPixelParityBlocker !==
    "The scoped visible shell asset denominator is zero, but the broader UI inventory and current-build lifecycle evidence remain incomplete."
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
  !captureSource.includes("semanticLabelEntries") ||
  !captureSource.includes('targetRegion === "sidebar-footer"') ||
  !captureSource.includes('targetRegion === "sidebar-projects"') ||
  !captureSource.includes("allowControlPatternFallback") ||
  !captureSource.includes("sidebarObservation") ||
  !captureSource.includes("projectTaskLeadingSvgCount") ||
  !captureSource.includes("recentsSection.scrollIntoView") ||
  !captureSource.includes("recentsTaskActionRowCount") ||
  !captureSource.includes("recentsTaskLeadingSvgCount") ||
  !captureSource.includes("recentsScrollContainer.scrollTop = 0") ||
  !captureSource.includes("composerStructuralSemanticIds") ||
  !captureSource.includes("composerBottomUnlabelledInputs.length === 2") ||
  !captureSource.includes("composerObservation") ||
  !captureSource.includes("checkOpacity: true") ||
  !captureSource.includes('targetRegion === "composer"') ||
  !captureSource.includes(
    'resolveSemanticId(fixedTextLabel, targetRegion, false)',
  ) ||
  !captureSource.includes("bounds.bottom <= 0") ||
  !captureSource.includes("bounds.top >= window.innerHeight") ||
  !captureSource.includes("bounds.right <= 0") ||
  !captureSource.includes("bounds.left >= window.innerWidth") ||
  !captureSource.includes('getComputedStyle(svg).visibility !== "visible"') ||
  captureSource.includes("rawSemanticLabel") ||
  !captureSource.includes("computedStyle: computedStyle(element)") ||
  !captureSource.includes("sanitizeVisualAssetIcon") ||
  !captureSource.includes("sanitizeVisualScalarRecord")
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
  !updaterSource.includes("repeated captures do not share one visual fingerprint") ||
  !updaterSource.includes("explicit current-build geometry seed") ||
  !updaterSource.includes("retainExistingWhenAbsentOnSameFingerprint") ||
  !updaterSource.includes("sameFingerprintRetainedComputedStyleProperties") ||
  !updaterSource.includes('"scrollbar-color"') ||
  !updaterSource.includes("currentBuildAbsenceEvidence") ||
  !updaterSource.includes("hasCurrentSidebarSettingsAbsenceEvidence") ||
  !updaterSource.includes("hasCurrentSidebarThreadAbsenceEvidence") ||
  !updaterSource.includes("currentSidebarSettingsAbsenceProven") ||
  !updaterSource.includes("currentSidebarThreadAbsenceProven") ||
  !updaterSource.includes("manifest.composerObservation") ||
  !updaterSource.includes("capturedComposerIds") ||
  !updaterSource.includes("Unexpected current Composer capture") ||
  !updaterSource.includes("remainingApproximationCandidates.add(id)") ||
  !updaterSource.includes("sanitizeVisualAssetIcon") ||
  !updaterSource.includes("capturedAt")
) {
  throw new Error("visual asset promotion must remain deterministic and explicit");
}

const remaining = manifest.remainingApproximationIds;
if (!Array.isArray(remaining) || remaining.length !== 0) {
  throw new Error(
    "the scoped visible shell approximation denominator must remain explicitly zero",
  );
}
if (new Set(remaining).size !== remaining.length) {
  throw new Error("remaining approximation ids must be unique");
}
for (const id of [
  "composer-project",
  "composer-worktree",
  "composer-branch",
  "composer-add-files",
  "composer-permission",
  "composer-model-chevron",
  "composer-dictate",
  "composer-voice",
  "window-chrome-sidebar",
  "window-chrome-back",
  "window-chrome-forward",
  "sidebar-more",
  "sidebar-pin",
  "sidebar-archive",
  "sidebar-help",
  "sidebar-project-menu-unpin",
  "sidebar-project-menu-reveal",
  "sidebar-project-menu-worktree",
  "sidebar-project-menu-edit",
  "sidebar-project-menu-archive",
  "sidebar-project-menu-remove",
  "sidebar-help-menu-release-note",
  "sidebar-help-menu-changelog",
  "sidebar-help-menu-chrome",
  "sidebar-help-menu-remote",
  "sidebar-help-menu-keyboard",
  "sidebar-help-menu-support",
]) {
  if (!ids.has(id) || remaining.includes(id)) {
    throw new Error(`${id} must be promoted from current-build runtime evidence`);
  }
}
if (
  manifest.icons.length !== 37 ||
  manifest.composerObservation?.topContextIconCount !== 3 ||
  manifest.composerObservation?.bottomActionIconCount !== 5 ||
  manifest.composerObservation?.exactSemanticIconCount !== 8
) {
  throw new Error(
    "current Composer capture must retain three context and five action icons with eight exact semantic mappings",
  );
}
if (
  manifest.sidebarObservation?.projectMenuItemCount !== 6 ||
  manifest.sidebarObservation?.helpMenuItemCount !== 8
) {
  throw new Error(
    "current sidebar capture must retain six project and eight Help menu items",
  );
}
const currentSidebarSettingsAbsenceProven =
  hasCurrentSidebarSettingsAbsenceEvidence(manifest.sidebarObservation);
const currentSidebarThreadAbsenceProven =
  hasCurrentSidebarThreadAbsenceEvidence(manifest.sidebarObservation);
if (
  !hasCurrentSidebarSettingsAbsenceEvidence({
    footerHelpControlCount: 1,
    settingsControlCount: 0,
  }) ||
  [
    undefined,
    {},
    {
      footerHelpControlCount: 0,
      settingsControlCount: 0,
    },
    {
      footerHelpControlCount: 1,
      settingsControlCount: 1,
    },
  ].some(hasCurrentSidebarSettingsAbsenceEvidence)
) {
  throw new Error(
    "sidebar Settings absence evidence must fail closed on each sampled state",
  );
}
if (
  !hasCurrentSidebarThreadAbsenceEvidence({
    recentsSectionCount: 1,
    recentsTaskActionRowCount: 6,
    recentsTaskLeadingSvgCount: 0,
  }) ||
  [
    undefined,
    {},
    {
      recentsSectionCount: 0,
      recentsTaskActionRowCount: 6,
      recentsTaskLeadingSvgCount: 0,
    },
    {
      recentsSectionCount: 2,
      recentsTaskActionRowCount: 6,
      recentsTaskLeadingSvgCount: 0,
    },
    {
      recentsSectionCount: 1,
      recentsTaskActionRowCount: 1,
      recentsTaskLeadingSvgCount: 0,
    },
    {
      recentsSectionCount: 1,
      recentsTaskActionRowCount: 6,
      recentsTaskLeadingSvgCount: 1,
    },
  ].some(hasCurrentSidebarThreadAbsenceEvidence)
) {
  throw new Error(
    "sidebar thread absence evidence must fail closed on section, row, and leading-SVG samples",
  );
}
if (
  !Number.isInteger(manifest.sidebarObservation?.projectTaskActionRowCount) ||
  manifest.sidebarObservation.projectTaskActionRowCount < 2 ||
  manifest.sidebarObservation?.projectTaskLeadingSvgCount !== 0
) {
  throw new Error(
    "current sidebar capture must retain scoped project-task leading-icon evidence",
  );
}
if (
  ids.has("sidebar-settings") ||
  (currentSidebarSettingsAbsenceProven
    ? remaining.includes("sidebar-settings")
    : !remaining.includes("sidebar-settings"))
) {
  throw new Error(
    currentSidebarSettingsAbsenceProven
      ? "sidebar-settings must remain absent from the observed current footer"
      : "sidebar-settings must return to the approximation inventory on an unproven footer",
  );
}
if (
  ids.has("sidebar-thread") ||
  (currentSidebarThreadAbsenceProven
    ? remaining.includes("sidebar-thread")
    : !remaining.includes("sidebar-thread")) ||
  !appSource.includes("currentSidebarComposition ? undefined") ||
  !appSource.includes('<SidebarGlyph name="thread" />')
) {
  throw new Error(
    currentSidebarThreadAbsenceProven
      ? "current-build Recents must omit a leading thread icon while legacy fixtures retain it"
      : "sidebar-thread must return to the approximation inventory when Recents absence is unproven",
  );
}

console.log(
  `Visual asset provenance covers ${ids.size} exact icons; ${remaining.length} approximations remain explicit.`,
);
