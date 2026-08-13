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
  "cursor",
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
    "composer-project",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "first of three visible current Composer context controls, selected structurally without retaining its dynamic label",
      region: "composer",
      semanticId: "composer-project",
    },
  ],
  [
    "composer-worktree",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "second of three visible current Composer context controls, selected structurally without retaining its dynamic label",
      region: "composer",
      semanticId: "composer-worktree",
    },
  ],
  [
    "composer-branch",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "third of three visible current Composer context controls, selected structurally without retaining its dynamic label",
      region: "composer",
      semanticId: "composer-branch",
    },
  ],
  [
    "composer-add-files",
    {
      ownerAriaLabel: "Add files and more",
      region: "composer",
      semanticId: "composer-add-files",
    },
  ],
  [
    "composer-permission",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "one visible 16px current Composer permission control after Add files",
      region: "composer",
      semanticId: "composer-permission",
    },
  ],
  [
    "composer-model-chevron",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "one visible 14px current Composer model chevron before Dictate",
      region: "composer",
      semanticId: "composer-model-chevron",
    },
  ],
  [
    "composer-dictate",
    {
      ownerAriaLabel: "Dictate",
      region: "composer",
      semanticId: "composer-dictate",
    },
  ],
  [
    "composer-voice",
    {
      ownerAriaLabel: "Start new voice chat",
      region: "composer",
      semanticId: "composer-voice",
    },
  ],
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
  ...[
    "unpin",
    "reveal",
    "worktree",
    "edit",
    "archive",
    "remove",
  ].map((name) => [
    `sidebar-project-menu-${name}`,
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed-position project-menu item icon selected by ordered current-build menu structure",
      region: "sidebar-project-menu",
      semanticId: `sidebar-project-menu-${name}`,
    },
  ]),
  [
    "sidebar-project-menu-mark-read",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "conditional Mark all as read project-menu icon selected by current-build menu text and ordered structure",
      region: "sidebar-project-menu",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "sidebar-project-menu-mark-read",
    },
  ],
  [
    "sidebar-help-menu-release-note",
    {
      minimumCandidates: 3,
      ownerAriaLabel: null,
      ownerEvidence:
        "three current-build release-note rows share one ordered menu icon",
      region: "sidebar-help-menu",
      semanticId: "sidebar-help-menu-release-note",
    },
  ],
  ...[
    "changelog",
    "chrome",
    "remote",
    "keyboard",
    "support",
  ].map((name) => [
    `sidebar-help-menu-${name}`,
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed-position Help-menu item icon selected by ordered current-build menu structure",
      region: "sidebar-help-menu",
      semanticId: `sidebar-help-menu-${name}`,
    },
  ]),
  ...[
    "usage",
    "usage-chevron",
    "pet",
    "invite",
    "settings",
    "logout",
  ].map((name) => [
    `sidebar-account-menu-${name}`,
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed-position account-menu icon selected by ordered current-build menu structure without retaining account identity",
      region: "sidebar-account-menu",
      semanticId: `sidebar-account-menu-${name}`,
    },
  ]),
  [
    "workspace-selection-check",
    {
      minimumCandidates: 2,
      ownerAriaLabel: null,
      ownerEvidence:
        "shared current selection check captured from the Local and Work without environment menu items",
      region: "workspace-selection",
      regions: ["workspace-run-location-menu", "workspace-environment-menu"],
      semanticId: "workspace-selection-check",
    },
  ],
  ...[
    "local",
    "worktree",
    "codex-web",
    "external",
    "send-cloud",
    "usage",
    "usage-chevron",
  ].map((name) => [
    `workspace-run-location-${name}`,
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed-position Work in menu icon selected by current-build action structure without retaining project identity",
      region: "workspace-run-location-menu",
      semanticId: `workspace-run-location-${name}`,
    },
  ]),
  [
    "workspace-environment-settings",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed Environment settings action icon captured from the current No environment menu",
      region: "workspace-environment-menu",
      semanticId: "workspace-environment-settings",
    },
  ],
  ...[
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
    "settings-connections",
    "settings-git",
    "settings-environments",
    "settings-worktrees",
    "settings-archived-chats",
  ].map((id) => [
    id,
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "fixed current Git Settings navigation icon selected by exact structural ownership",
      region: "settings-navigation",
      semanticId: id,
    },
  ]),
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
const expectedComposerIds = [...promotionSpecs.entries()]
  .filter(([, spec]) => spec.region === "composer")
  .map(([id]) => id)
  .sort();
const capturedComposerIds = capture.icons
  .filter(({ region }) => region === "composer")
  .map(({ owner }) => owner.semanticId)
  .sort();
if (
  capture.composerObservation?.topContextIconCount !== 3 ||
  capture.composerObservation?.bottomActionIconCount !== 5 ||
  capture.composerObservation?.exactSemanticIconCount !== 8 ||
  canonicalize(capturedComposerIds) !== canonicalize(expectedComposerIds)
) {
  throw new Error(
    `Unexpected current Composer capture: ${canonicalize({
      capturedComposerIds,
      composerObservation: capture.composerObservation,
      expectedComposerIds,
    })}`,
  );
}
const expectedProjectMenuItemCount = capture.sidebarObservation
  ?.projectMenuHasMarkAllAsRead
  ? 7
  : 6;
if (
  capture.sidebarObservation?.projectMenuItemCount !==
    expectedProjectMenuItemCount ||
  capture.sidebarObservation?.helpMenuItemCount !== 8 ||
  capture.sidebarObservation?.accountMenu?.itemCount !== 6 ||
  capture.sidebarObservation?.accountMenu?.iconCount !== 6 ||
  capture.sidebarObservation?.accountMenu?.imageCount !== 1 ||
  capture.sidebarObservation?.accountMenu?.separatorCount !== 0 ||
  capture.sidebarObservation?.accountMenu?.focusReturned !== true ||
  capture.sidebarObservation?.accountMenu?.triggerExpanded !== "false"
) {
  throw new Error(
    `Unexpected current sidebar menu capture: ${canonicalize(capture.sidebarObservation)}`,
  );
}
const workspaceObservation = capture.workspaceObservation;
if (
  workspaceObservation?.workInMenu?.itemCount !== 5 ||
  workspaceObservation.workInMenu.iconCount !== 8 ||
  workspaceObservation.workInMenu.separatorCount !== 0 ||
  workspaceObservation.workInMenu.sectionLabel !== "Work in" ||
  canonicalize(workspaceObservation.workInMenu.roles) !==
    canonicalize(Array(5).fill("menuitem")) ||
  canonicalize(workspaceObservation.workInMenu.tags) !==
    canonicalize(["DIV", "DIV", "A", "DIV", "DIV"]) ||
  canonicalize(workspaceObservation.workInMenu.disabled) !==
    canonicalize([false, false, false, true, false]) ||
  canonicalize(workspaceObservation.workInMenu.labels) !==
    canonicalize([
      "Local",
      "New worktree",
      "Connect Codex web",
      "Send to cloud",
      "Usage remaining",
    ]) ||
  workspaceObservation.workInMenu.codexWebHrefIsExpected !== true ||
  workspaceObservation?.environmentMenu?.itemCount !== 2 ||
  workspaceObservation.environmentMenu.iconCount !== 2 ||
  workspaceObservation.environmentMenu.separatorCount !== 0 ||
  workspaceObservation.environmentMenu.emptyText !== "No environments found" ||
  canonicalize(workspaceObservation.environmentMenu.labels) !==
    canonicalize(["Work without environment", "Environment settings"]) ||
  canonicalize(workspaceObservation.environmentMenu.roles) !==
    canonicalize(["menuitem", "menuitem"]) ||
  workspaceObservation.environmentSettings?.heading?.text !== "Environments" ||
  workspaceObservation.environmentSettings?.unavailableHeading?.text !==
    "Local environments unavailable" ||
  workspaceObservation.environmentSettings?.message?.text !==
    "We could not load local environment settings for this project"
) {
  throw new Error(
    `Unexpected current workspace environment capture: ${canonicalize(workspaceObservation)}`,
  );
}
const expectedSettingsIds = [...promotionSpecs.entries()]
  .filter(([, spec]) => spec.region === "settings-navigation")
  .map(([id]) => id)
  .sort();
const capturedSettingsIds = capture.icons
  .filter(({ region }) => region === "settings-navigation")
  .map(({ owner }) => owner.semanticId)
  .sort();
const settingsObservation = capture.settingsObservation;
if (
  canonicalize(capturedSettingsIds) !== canonicalize(expectedSettingsIds) ||
  settingsObservation?.iconCount !== 24 ||
  settingsObservation?.itemCount !== 21 ||
  canonicalize(settingsObservation?.selectedLabels) !== canonicalize(["Git"]) ||
  settingsObservation?.page?.heading?.text !== "Git" ||
  settingsObservation?.page?.document?.horizontalOverflow !== 0 ||
  settingsObservation?.page?.document?.viewport?.width !== 1180 ||
  settingsObservation?.page?.document?.viewport?.height !== 820 ||
  settingsObservation?.page?.navigation?.rect?.width !== 322.91 ||
  settingsObservation?.page?.searchbox?.rect?.width !== 258.91 ||
  settingsObservation?.page?.controls?.filter(
    ({ placeholder }) => placeholder === "codex/",
  ).length !== 1 ||
  settingsObservation?.page?.controls?.filter(
    ({ role }) => role === "switch",
  ).length !== 2 ||
  settingsObservation?.search?.query !== "git" ||
  !settingsObservation?.search?.resultLines?.includes("GitHub") ||
  !settingsObservation?.search?.resultLines?.includes(
    "Go to a line in the current file",
  )
) {
  throw new Error(
    `Unexpected current Git Settings capture: ${canonicalize({ capturedSettingsIds, expectedSettingsIds, settingsObservation })}`,
  );
}
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
const settingsCaptureExpanded = !manifest.icons.some(
  ({ id }) => id === "settings-git",
);
const captureContextChanged =
  fingerprintChanged ||
  settingsCaptureExpanded ||
  manifest.baseline.interactionState !== baselineContext.interactionState ||
  manifest.baseline.theme !== baselineContext.theme ||
  canonicalize(manifest.baseline.viewport) !==
    canonicalize(baselineContext.viewport);
const capturedAt =
  !captureContextChanged &&
  /^\d{4}-\d{2}-\d{2}$/.test(manifest.baseline.capturedAt ?? "")
    ? manifest.baseline.capturedAt
    : new Date().toISOString().slice(0, 10);
const hashBaselineContext = { ...baselineContext, capturedAt };
manifest.geometryHashVersion = 4;
manifest.baseline = hashBaselineContext;
manifest.composerObservation = capture.composerObservation;
manifest.sidebarObservation = capture.sidebarObservation;
manifest.workspaceObservation = workspaceObservation;
manifest.settingsObservation = settingsObservation;

function selectObservedIcon(id, spec, existing) {
  const regions = spec.regions ?? [spec.region];
  const candidates = capture.icons.filter(
    (candidate) =>
      regions.includes(candidate.region) &&
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
  if (!observed) {
    const retained = { ...existing };
    retained.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: hashBaselineContext,
          primitives: retained.primitives,
          renderSize: retained.renderSize,
          rootAttributes: retained.rootAttributes,
          rootComputedStyle: retained.rootComputedStyle,
          sourceClassName: retained.sourceClassName,
          viewBox: retained.viewBox,
        }),
      )
      .digest("hex");
    return retained;
  }

  let primitives = observed.primitives;
  if (existing && !fingerprintChanged) {
    if (
      spec.region !== existing.region ||
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
    region: spec.region,
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
manifest.policy.globalPixelParityBlocker =
  manifest.remainingApproximationIds.length === 0
    ? "The scoped visible shell asset denominator is zero, but the broader UI inventory and current-build lifecycle evidence remain incomplete."
    : "Only the listed elements have exact-source coverage; remaining approximate elements must be promoted before claiming global pixel parity.";

const output = `${JSON.stringify(manifest, null, 2)}\n`;
if (write) {
  writeFileSync(manifestPath, output);
  console.log(`Updated ${manifestPath}`);
} else {
  process.stdout.write(output);
}
