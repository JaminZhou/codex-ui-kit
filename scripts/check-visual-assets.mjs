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
const currentProjectMenuManifestUrl = new URL(
  "../research/current-project-menu-assets.json",
  import.meta.url,
);
const rasterManifestUrl = new URL(
  "../research/visual-raster-assets.json",
  import.meta.url,
);
const packageUrl = new URL("../package.json", import.meta.url);
const playgroundIconUrl = new URL(
  "../playgrounds/codex-app/src/currentBuildIcons.tsx",
  import.meta.url,
);
const visualAssetIconUrl = new URL(
  "../playgrounds/codex-app/src/VisualAssetIcon.tsx",
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
const demoAppUrl = new URL("../demo/main.tsx", import.meta.url);
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
  currentProjectMenuManifestText,
  rasterManifestText,
  packageText,
  iconSource,
  rendererSource,
  appSource,
  demoSource,
  playgroundStyles,
  captureSource,
  updaterSource,
] =
  await Promise.all([
    readFile(manifestUrl, "utf8"),
    readFile(currentProjectMenuManifestUrl, "utf8"),
    readFile(rasterManifestUrl, "utf8"),
    readFile(packageUrl, "utf8"),
    readFile(playgroundIconUrl, "utf8"),
    readFile(visualAssetIconUrl, "utf8"),
    readFile(playgroundAppUrl, "utf8"),
    readFile(demoAppUrl, "utf8"),
    readFile(playgroundStylesUrl, "utf8"),
    readFile(captureScriptUrl, "utf8"),
    readFile(updaterScriptUrl, "utf8"),
  ]);
const manifest = JSON.parse(manifestText);
const currentProjectMenuManifest = JSON.parse(currentProjectMenuManifestText);
const rasterManifest = JSON.parse(rasterManifestText);
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
const rasterAsset = rasterManifest.assets?.[0];
const rasterBytes = Buffer.from(rasterAsset?.dataBase64 ?? "", "base64");
if (
  rasterManifest.schemaVersion !== 1 ||
  canonicalize(rasterManifest.baseline) !== canonicalize(manifest.baseline) ||
  rasterManifest.assets?.length !== 1 ||
  rasterAsset.id !== "thread-header-editor-vscode" ||
  rasterAsset.mimeType !== "image/png" ||
  rasterAsset.sourceUrl !== "app://-/apps/vscode.png" ||
  rasterAsset.status !== "runtime-observed" ||
  rasterAsset.naturalSize?.height !== 64 ||
  rasterAsset.naturalSize?.width !== 64 ||
  rasterAsset.renderSize?.height !== 16 ||
  rasterAsset.renderSize?.width !== 16 ||
  rasterAsset.byteLength !== rasterBytes.length ||
  rasterBytes.toString("base64") !== rasterAsset.dataBase64 ||
  rasterBytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
  createHash("sha256").update(rasterBytes).digest("hex") !== rasterAsset.sha256 ||
  !demoSource.includes('name="thread-header-editor-vscode"')
) {
  throw new Error("current-thread VS Code raster provenance is incomplete");
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
for (const [surface, observation] of Object.entries(
  manifest.workspaceObservation?.environmentSettings ?? {},
)) {
  if (!observation?.style) {
    throw new Error(`workspace environment ${surface} must retain computed style evidence`);
  }
  sanitizeVisualScalarRecord(
    observation.style,
    `manifest.workspaceObservation.environmentSettings.${surface}.style`,
  );
}
for (const [surface, observation] of Object.entries(
  manifest.settingsObservation?.page ?? {},
)) {
  if (!observation?.style) {
    continue;
  }
  sanitizeVisualScalarRecord(
    observation.style,
    `manifest.settingsObservation.page.${surface}.style`,
  );
}
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
  const iconBaselineContext = icon.baselineContext ?? baselineContext;
  if (
    icon.baselineContext &&
    (!icon.baselineContext.appVersion ||
      !icon.baselineContext.buildNumber ||
      !/^[a-f0-9]{64}$/.test(icon.baselineContext.appAsarSha256 ?? "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(icon.baselineContext.capturedAt ?? "") ||
      icon.baselineContext.theme !== "dark" ||
      icon.baselineContext.viewport?.width !== 1180 ||
      icon.baselineContext.viewport?.height !== 820)
  ) {
    throw new Error(`invalid component-scoped baseline for ${icon.id}`);
  }
  const sha256 = createHash("sha256")
    .update(
      canonicalize({
        baselineContext: iconBaselineContext,
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
  const renderedBySettingsNavigation =
    icon.id.startsWith("settings-") &&
    appSource.includes('name={`settings-${id}` as CurrentBuildIconName}') &&
    (icon.id !== "settings-account-external" ||
      appSource.includes('name="settings-account-external"'));
  const providerOnly = currentProjectMenuManifest.icons.some(
    (candidate) =>
      candidate.id === icon.id && candidate.renderStatus === "provider_only",
  );
  if (
    !providerOnly &&
    !appSource.includes(`name="${icon.id}"`) &&
    !demoSource.includes(`name="${icon.id}"`) &&
    !renderedBySettingsNavigation
  ) {
    throw new Error(`current-build playgrounds do not render ${icon.id}`);
  }
}
for (const [surface, observation] of Object.entries({
  search: manifest.projectPickerObservation?.search,
  surface: manifest.projectPickerObservation?.surface,
})) {
  sanitizeVisualScalarRecord(
    observation?.style,
    `manifest.projectPickerObservation.${surface}.style`,
  );
}

if (
  !rendererSource.includes("primitive.children?.map") ||
  !rendererSource.includes("renderPrimitive(child") ||
  !rendererSource.includes("toReactStyle(primitive.computedStyle)") ||
  !rendererSource.includes("toReactStyle(icon.rootComputedStyle)")
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
  !captureSource.includes("settingsObservation") ||
  !captureSource.includes('region: "settings-navigation"') ||
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
  !captureSource.includes("sanitizeVisualScalarRecord") ||
  !captureSource.includes("CODEX_VISUAL_ASSET_PROJECT_PICKER_ONLY") ||
  !captureSource.includes("CODEX_VISUAL_ASSET_REVIEW_ONLY") ||
  !captureSource.includes("reviewObservation") ||
  !captureSource.includes("projectPickerObservation")
) {
  throw new Error(
    "visual capture must prove argv and listener ancestry and fail closed on visual SVG attributes",
  );
}
if (
  packageJson.scripts?.["update:visual-assets"] !==
    "node scripts/update-current-visual-assets.mjs --write" ||
  packageJson.scripts?.["update:visual-assets:review"] !==
    "node scripts/update-current-visual-assets.mjs --review-only --write" ||
  !updaterSource.includes("Expected one current capture") ||
  !updaterSource.includes("baselineContext") ||
  !updaterSource.includes("complete ordered primitive match with no leftovers") ||
  !updaterSource.includes("repeated captures do not share one visual fingerprint") ||
  !updaterSource.includes("explicit current-build geometry seed") ||
  !updaterSource.includes("retainExistingWhenAbsentOnSameFingerprint") ||
  !updaterSource.includes("sameFingerprintRetainedComputedStyleProperties") ||
  !updaterSource.includes('"cursor"') ||
  !updaterSource.includes('"scrollbar-color"') ||
  !updaterSource.includes("currentBuildAbsenceEvidence") ||
  !updaterSource.includes("hasCurrentSidebarSettingsAbsenceEvidence") ||
  !updaterSource.includes("hasCurrentSidebarThreadAbsenceEvidence") ||
  !updaterSource.includes("currentSidebarSettingsAbsenceProven") ||
  !updaterSource.includes("currentSidebarThreadAbsenceProven") ||
  !updaterSource.includes("manifest.composerObservation") ||
  !updaterSource.includes("manifest.settingsObservation") ||
  !updaterSource.includes("Unexpected current Git Settings capture") ||
  !updaterSource.includes("capturedComposerIds") ||
  !updaterSource.includes("Unexpected current Composer capture") ||
  !updaterSource.includes("remainingApproximationCandidates.add(id)") ||
  !updaterSource.includes("sanitizeVisualAssetIcon") ||
  !updaterSource.includes("capturedAt") ||
  !updaterSource.includes("--project-picker-only") ||
  !updaterSource.includes("--review-only") ||
  !updaterSource.includes("Targeted current Review capture contract changed") ||
  !updaterSource.includes("CODEX_VISUAL_ASSET_PROJECT_PICKER_CAPTURE") ||
  !updaterSource.includes("CODEX_VISUAL_ASSET_PERMISSION_CAPTURE") ||
  !updaterSource.includes("validateProjectPickerObservation")
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
  "composer-new-project",
  "composer-clear-project",
  "composer-worktree",
  "composer-branch",
  "composer-add-files",
  "composer-permission",
  "composer-model-chevron",
  "composer-dictate",
  "composer-voice",
  "review-tab",
  "review-close",
  "review-open-tab",
  "review-expand",
  "review-scope-chevron",
  "review-options",
  "review-collapse-all",
  "review-jump-file",
  "review-split-diff",
  "review-files-toggle",
  "review-commit-or-push",
  "review-more-git",
  "review-copy-path",
  "review-file-toggle",
  "review-open-in",
  "review-search",
  "review-file-text",
  "window-chrome-sidebar",
  "window-chrome-back",
  "window-chrome-forward",
  "sidebar-more",
  "sidebar-pin",
  "sidebar-archive",
  "sidebar-activity",
  "sidebar-activity-attention",
  "sidebar-help",
  "sidebar-voice",
  "sidebar-project-menu-unpin",
  "sidebar-project-menu-reveal",
  "sidebar-project-menu-worktree",
  "sidebar-project-menu-edit",
  "sidebar-project-menu-mark-read",
  "sidebar-project-menu-archive",
  "sidebar-project-menu-remove",
  "sidebar-help-menu-release-note",
  "sidebar-help-menu-changelog",
  "sidebar-help-menu-changelog-external",
  "sidebar-help-menu-chrome",
  "sidebar-help-menu-remote",
  "sidebar-help-menu-keyboard",
  "sidebar-help-menu-support",
  "sidebar-account-menu-usage",
  "sidebar-account-menu-pet",
  "sidebar-account-menu-invite",
  "sidebar-account-menu-settings",
  "sidebar-account-menu-logout",
  "workspace-selection-check",
  "workspace-run-location-local",
  "workspace-run-location-worktree",
  "workspace-run-location-codex-web",
  "workspace-run-location-external",
  "workspace-run-location-send-cloud",
  "workspace-run-location-usage",
  "workspace-run-location-usage-chevron",
  "workspace-environment-settings",
  "settings-back",
  "settings-search",
  "settings-general",
  "settings-import",
  "settings-profile",
  "settings-appearance",
  "settings-voice",
  "settings-configuration",
  "settings-personalization",
  "settings-pets",
  "settings-keyboard-shortcuts",
  "settings-usage-billing",
  "settings-account",
  "settings-account-external",
  "settings-appshots",
  "settings-plugins",
  "settings-browser",
  "settings-computer-use",
  "settings-hooks",
  "settings-hooks-reload",
  "settings-connections",
  "settings-git",
  "settings-environments",
  "settings-worktrees",
  "settings-archived-chats",
  "composer-send",
  "thread-header-project",
  "thread-header-actions",
  "thread-header-open-in-chevron",
  "thread-header-summary",
  "thread-header-bottom-panel",
  "thread-header-side-panel",
  "thread-assistant-copy",
  "thread-assistant-good",
  "thread-assistant-bad",
  "thread-assistant-fork",
  "thread-command-terminal",
  "thread-mcp-tool",
  "thread-activity-chevron",
  "thread-reconnecting",
]) {
  if (!ids.has(id) || remaining.includes(id)) {
    throw new Error(`${id} must be promoted from current-build runtime evidence`);
  }
}
if (
  manifest.icons.length !== 115 ||
  manifest.composerObservation?.topContextIconCount !== 3 ||
  manifest.composerObservation?.bottomActionIconCount !== 5 ||
  manifest.composerObservation?.exactSemanticIconCount !== 8 ||
  canonicalize(manifest.projectPickerObservation?.actionLabels) !==
    canonicalize(["New project", "Don't work in a project"]) ||
  manifest.projectPickerObservation?.optionCount !== 14 ||
  manifest.projectPickerObservation?.selectedCount !== 1 ||
  manifest.projectPickerObservation?.surface?.rect?.height !== 249.5 ||
  manifest.projectPickerObservation?.surface?.rect?.width !== 260 ||
  manifest.projectPickerObservation?.listbox?.rect?.height !== 142.81 ||
  manifest.projectPickerObservation?.listbox?.rect?.width !== 252 ||
  manifest.reviewBaseline?.appAsarSha256 !==
    "c964aebbf9a6a0f70799d01215c611d8ef6ee63f816b3d57beccddd47a811fd9" ||
  manifest.reviewBaseline?.appVersion !== "26.820.60940" ||
  manifest.reviewBaseline?.buildNumber !== "7119" ||
  manifest.reviewBaseline?.capturedAt !== "2026-08-29" ||
  manifest.reviewBaseline?.interactionState !==
    "open-current-review-workspace" ||
  manifest.reviewBaseline?.theme !== "dark" ||
  manifest.reviewBaseline?.viewport?.width !== 1180 ||
  manifest.reviewBaseline?.viewport?.height !== 820 ||
  canonicalize(manifest.reviewObservation?.fileNames) !==
    canonicalize(["rename-destination.txt", "rename-source.txt"]) ||
  manifest.reviewObservation?.copyPathCount !== 2 ||
  manifest.reviewObservation?.fileTextIconCount !== 2 ||
  manifest.reviewObservation?.openInCount !== 2 ||
  manifest.reviewObservation?.toggleFileDiffCount !== 2 ||
  manifest.reviewObservation?.filter?.placeholder !== "Filter files…" ||
  Math.abs((manifest.reviewObservation?.filter?.rect?.width ?? 0) - 203) >
    0.15 ||
  Math.abs((manifest.reviewObservation?.panel?.rect?.width ?? 0) - 419.59) >
    0.15 ||
  manifest.reviewObservation?.panel?.rect?.height !== 820 ||
  manifest.reviewObservation?.splitDiffLabel !== "Switch to split diff"
) {
  throw new Error(
    "current visual asset capture must retain 115 promoted icons plus the Composer, Project picker, and Review observations",
  );
}
if (
  manifest.settingsObservation?.iconCount !== 24 ||
  manifest.settingsObservation?.itemCount !== 21 ||
  canonicalize(manifest.settingsObservation?.selectedLabels) !==
    canonicalize(["Git"]) ||
  manifest.settingsObservation?.page?.heading?.text !== "Git" ||
  manifest.settingsObservation?.page?.document?.horizontalOverflow !== 0 ||
  manifest.settingsObservation?.page?.document?.viewport?.width !== 1180 ||
  manifest.settingsObservation?.page?.document?.viewport?.height !== 820 ||
  manifest.settingsObservation?.page?.navigation?.rect?.width !== 322.91 ||
  manifest.settingsObservation?.page?.searchbox?.rect?.width !== 258.91 ||
  manifest.settingsObservation?.page?.controls?.filter(
    ({ role }) => role === "switch",
  ).length !== 2 ||
  manifest.settingsObservation?.page?.controls?.filter(
    ({ tagName }) => tagName === "TEXTAREA",
  ).length !== 2 ||
  manifest.settingsObservation?.search?.query !== "git" ||
  !manifest.settingsObservation?.search?.resultLines?.includes("GitHub") ||
  !manifest.settingsObservation?.search?.resultLines?.includes(
    "Right before ChatGPT ends its turn",
  )
) {
  throw new Error(
    "current Settings capture must retain navigation, Git controls, and grouped search evidence",
  );
}
const expectedProjectMenuItemCount = manifest.sidebarObservation
  ?.projectMenuHasMarkAllAsRead
  ? 7
  : 6;
if (
  manifest.sidebarObservation?.projectMenuItemCount !==
    expectedProjectMenuItemCount ||
  manifest.sidebarObservation?.footerVoiceControlCount !== 1 ||
  manifest.sidebarObservation?.footerHelpControlCount !== 1 ||
  manifest.sidebarObservation?.helpMenuIconCount !== 9 ||
  manifest.sidebarObservation?.helpMenuItemCount !== 8 ||
  manifest.sidebarObservation?.helpMenu?.iconCount !== 9 ||
  manifest.sidebarObservation?.accountMenu?.itemCount !== 6 ||
  manifest.sidebarObservation?.accountMenu?.iconCount !== 5 ||
  manifest.sidebarObservation?.accountMenu?.imageCount !== 1 ||
  manifest.sidebarObservation?.accountMenu?.separatorCount !== 0 ||
  manifest.sidebarObservation?.accountMenu?.focusReturned !== true ||
  manifest.sidebarObservation?.accountMenu?.triggerExpanded !== "false"
) {
  throw new Error(
    "current sidebar capture must retain project, Help, and account menu evidence",
  );
}
if (
  manifest.workspaceObservation?.workInMenu?.itemCount !== 5 ||
  manifest.workspaceObservation.workInMenu.iconCount !== 8 ||
  manifest.workspaceObservation.workInMenu.separatorCount !== 0 ||
  manifest.workspaceObservation.workInMenu.sectionLabel !== "Work in" ||
  canonicalize(manifest.workspaceObservation.workInMenu.roles) !==
    canonicalize(Array(5).fill("menuitem")) ||
  canonicalize(manifest.workspaceObservation.workInMenu.tags) !==
    canonicalize(["DIV", "DIV", "A", "DIV", "DIV"]) ||
  canonicalize(manifest.workspaceObservation.workInMenu.disabled) !==
    canonicalize([false, false, false, true, false]) ||
  canonicalize(manifest.workspaceObservation.workInMenu.labels) !==
    canonicalize([
      "Local",
      "New worktree",
      "Connect Codex web",
      "Send to cloud",
      "Usage remaining",
    ]) ||
  manifest.workspaceObservation.workInMenu.codexWebHrefIsExpected !== true ||
  manifest.workspaceObservation?.environmentMenu?.itemCount !== 2 ||
  manifest.workspaceObservation.environmentMenu.iconCount !== 2 ||
  manifest.workspaceObservation.environmentMenu.separatorCount !== 0 ||
  manifest.workspaceObservation.environmentMenu.emptyText !==
    "No environments found" ||
  canonicalize(manifest.workspaceObservation.environmentMenu.labels) !==
    canonicalize(["Work without environment", "Environment settings"]) ||
  manifest.workspaceObservation.environmentSettings?.heading?.text !==
    "Environments" ||
  manifest.workspaceObservation.environmentSettings?.unavailableHeading?.text !==
    "Local environments unavailable" ||
  manifest.workspaceObservation.environmentSettings?.message?.text !==
    "We could not load local environment settings for this project"
) {
  throw new Error(
    "current workspace capture must retain action, link, empty, and unavailable-state evidence",
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
