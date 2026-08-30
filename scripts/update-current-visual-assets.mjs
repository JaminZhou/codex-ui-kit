import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  sanitizeVisualAssetIcon,
  sanitizeVisualScalarRecord,
} from "./visual-asset-contract.mjs";
import {
  hasCurrentSidebarSettingsAbsenceEvidence,
  hasCurrentSidebarThreadAbsenceEvidence,
} from "./visual-asset-sidebar-contract.mjs";
import {
  collectCurrentMcpVisualAssets,
  currentMcpVisualAssetIds,
  mergeSupplementalCurrentMcpCapture,
} from "./visual-asset-mcp-contract.mjs";
import {
  assertComposerPermissionRefreshCoverage,
  composerPermissionVisualAssetIds,
  mergeSupplementalComposerPermissionCapture,
} from "./visual-asset-permission-contract.mjs";
import { serializeCurrentThreadVisualAssetSubset } from "./current-thread-visual-assets.mjs";

const write = process.argv.includes("--write");
const hooksOnly = process.argv.includes("--hooks-only");
const threadOnly = process.argv.includes("--thread-only");
const mcpOnly = process.argv.includes("--mcp-only");
const projectPickerOnly = process.argv.includes("--project-picker-only");
const reviewOnly = process.argv.includes("--review-only");
const settingsOnly = process.argv.includes("--settings-only");
if (
  [
    hooksOnly,
    threadOnly,
    mcpOnly,
    projectPickerOnly,
    reviewOnly,
    settingsOnly,
  ].filter(Boolean).length > 1
) {
  throw new Error("Targeted current visual asset modes are mutually exclusive.");
}
const supplementalMcpCapturePath =
  process.env.CODEX_VISUAL_ASSET_MCP_CAPTURE;
const supplementalProjectPickerCapturePath =
  process.env.CODEX_VISUAL_ASSET_PROJECT_PICKER_CAPTURE;
const supplementalPermissionCapturePath =
  process.env.CODEX_VISUAL_ASSET_PERMISSION_CAPTURE;
if (
  (supplementalMcpCapturePath ||
    supplementalProjectPickerCapturePath ||
    supplementalPermissionCapturePath) &&
  (hooksOnly ||
    threadOnly ||
    mcpOnly ||
    projectPickerOnly ||
    reviewOnly ||
    settingsOnly)
) {
  throw new Error(
    "Supplemental visual captures are available only during a full visual asset refresh.",
  );
}
const includeThreadCapture =
  !threadOnly && process.env.CODEX_VISUAL_ASSET_INCLUDE_THREAD === "1";
const conditionalCapturePath =
  !threadOnly && process.env.CODEX_VISUAL_ASSET_CONDITIONAL_CAPTURE;
const manifestPath = fileURLToPath(
  new URL("../research/visual-assets.json", import.meta.url),
);
const rasterManifestPath = fileURLToPath(
  new URL("../research/visual-raster-assets.json", import.meta.url),
);
const currentThreadSubsetPath = fileURLToPath(
  new URL("../demo/current-thread-visual-assets.json", import.meta.url),
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

const writeOutput = (output) =>
  new Promise((resolve) => {
    process.stdout.write(output, resolve);
  });

function validateProjectPickerObservation(observation, context) {
  sanitizeVisualScalarRecord(
    observation?.search?.style,
    `${context}.projectPickerObservation.search.style`,
  );
  sanitizeVisualScalarRecord(
    observation?.surface?.style,
    `${context}.projectPickerObservation.surface.style`,
  );
  if (
    canonicalize(observation?.actionLabels) !==
      canonicalize(["New project", "Don't work in a project"]) ||
    observation?.activePlaceholder !== "Search projects" ||
    observation?.optionCount !== 14 ||
    observation?.selectedCount !== 1 ||
    Math.abs((observation?.surface?.rect?.width ?? 0) - 260) > 0.1 ||
    Math.abs((observation?.surface?.rect?.height ?? 0) - 249.5) > 0.1 ||
    Math.abs((observation?.listbox?.rect?.width ?? 0) - 252) > 0.1 ||
    Math.abs((observation?.listbox?.rect?.height ?? 0) - 142.81) > 0.1
  ) {
    throw new Error(
      `${context} Project picker capture contract changed: ${canonicalize(observation)}.`,
    );
  }
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
    "composer-new-project",
    {
      ownerAriaLabel: "New project",
      ownerEvidence:
        "fixed current Project picker action selected by visible text ownership",
      region: "conversation",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-new-project",
    },
  ],
  [
    "composer-clear-project",
    {
      ownerAriaLabel: "Don't work in a project",
      ownerEvidence:
        "fixed current Project picker clear action selected by visible text ownership",
      region: "conversation",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-clear-project",
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
        "one visible 16px current non-ask Composer permission control after Add files",
      region: "composer",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-permission",
    },
  ],
  [
    "composer-permission-ask",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "one visible 16px current Ask for approval Composer control after Add files",
      region: "composer",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-permission-ask",
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
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-voice",
    },
  ],
  [
    "composer-send",
    {
      ownerAriaLabel: "Send",
      ownerEvidence:
        "current completed-thread Composer terminal action selected by its exact accessible label",
      region: "composer",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "composer-send",
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
  ...[
    [
      "thread-header-project",
      null,
      "one visible ownerless 16px current-thread project glyph selected structurally inside the titlebar",
      "titlebar",
    ],
    ["thread-header-actions", "Chat actions", null, "titlebar"],
    [
      "thread-header-open-in-chevron",
      "Secondary action",
      null,
      "titlebar",
    ],
    [
      "thread-header-summary",
      "Toggle summary",
      null,
      "titlebar",
    ],
    [
      "thread-header-bottom-panel",
      "Toggle bottom panel",
      null,
      "titlebar",
    ],
    [
      "thread-header-side-panel",
      "Toggle side panel",
      null,
      "titlebar",
    ],
    ["thread-assistant-copy", "Copy", null, "conversation"],
    ["thread-assistant-good", "Good response", null, "conversation"],
    ["thread-assistant-bad", "Bad response", null, "conversation"],
    [
      "thread-assistant-fork",
      "Fork chat from here",
      null,
      "conversation",
    ],
    [
      "thread-command-terminal",
      null,
      "first visible 16px SVG in a current command activity summary, selected structurally before the summary text",
      "conversation",
    ],
  ].map(([id, ownerAriaLabel, ownerEvidence, region]) => [
    id,
    {
      ownerAriaLabel,
      ...(ownerEvidence ? { ownerEvidence } : {}),
      region,
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: id,
    },
  ]),
  [
    "thread-mcp-tool",
    {
      minimumCandidates: 3,
      ownerAriaLabel: null,
      ownerEvidence:
        "current OpenAI Developer Docs integration and call-row glyph selected by exact completed group ownership",
      region: "conversation",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "thread-mcp-tool",
    },
  ],
  [
    "thread-activity-chevron",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "current closed MCP call disclosure chevron selected by aria-labelledby ownership",
      region: "conversation",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "thread-activity-chevron",
    },
  ],
  [
    "thread-reconnecting",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "current completed activity Reconnecting row selected structurally from a real recovered turn",
      region: "conversation",
      retainExistingWhenAbsentOnSameFingerprint: true,
      semanticId: "thread-reconnecting",
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
    "sidebar-activity-attention",
    {
      ownerAriaLabel: "View activity, needs attention",
      ownerEvidence:
        "current unread Activity control selected by its exact accessible label in a supplemental same-fingerprint capture",
      region: "sidebar-primary",
      semanticId: "sidebar-activity-attention",
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
  [
    "sidebar-voice",
    {
      ownerAriaLabel: "Start new voice chat",
      ownerEvidence:
        "current sidebar-footer Voice control selected by its exact accessible label and region",
      region: "sidebar-footer",
      semanticId: "sidebar-voice",
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
  [
    "sidebar-help-menu-changelog-external",
    {
      ownerAriaLabel: null,
      ownerEvidence:
        "trailing external-link icon on the current Full changelog Help-menu row",
      region: "sidebar-help-menu",
      semanticId: "sidebar-help-menu-changelog-external",
    },
  ],
  ...[
    "usage",
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
    "settings-computer-history",
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
        "fixed current Settings navigation icon selected by exact semantic label and structural ownership",
      region: "settings-navigation",
      semanticId: id,
    },
  ]),
  [
    "settings-hooks-reload",
    {
      ownerAriaLabel: "Reload hooks",
      ownerEvidence:
        "current Hooks Settings reload action selected by its exact accessible label",
      region: "settings-page-action",
      semanticId: "settings-hooks-reload",
    },
  ],
  ...[
    ["review-tab", null, "current Review tab glyph selected by exact tab text"],
    ["review-close", "Close Review tab", null],
    ["review-open-tab", "Open side panel tab", null],
    ["review-expand", "Expand panel", null],
    ["review-scope-chevron", "Last Turn", null],
    ["review-options", "Review options", null],
    ["review-collapse-all", "Collapse all diffs", null],
    ["review-jump-file", "Jump to file", null],
    ["review-split-diff", "Switch to split diff", null],
    ["review-files-toggle", "Hide files", null],
    ["review-commit-or-push", "Commit or push", null],
    ["review-more-git", "More Git actions", null],
    ["review-copy-path", "Copy path", null],
    ["review-file-toggle", "Toggle file diff", null],
    ["review-open-in", "Open in", null],
    [
      "review-search",
      null,
      "current Review Filter files search glyph selected structurally from its exact input",
    ],
    [
      "review-file-text",
      null,
      "current visible Review text-file use resolved against its exact runtime SVG symbol",
    ],
  ].map(([id, ownerAriaLabel, ownerEvidence]) => [
    id,
    {
      ownerAriaLabel,
      ...(ownerEvidence ? { ownerEvidence } : {}),
      region: "review-panel",
      semanticId: id,
    },
  ]),
]);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
function writeManifestAndCurrentThreadSubset(output, message) {
  const subsetOutput = serializeCurrentThreadVisualAssetSubset(manifest);
  writeFileSync(manifestPath, output);
  writeFileSync(currentThreadSubsetPath, subsetOutput);
  console.log(message);
  console.log(`Updated ${currentThreadSubsetPath}`);
}
const runCapture = (
  captureThreadOnly,
  captureMcpOnly = false,
  captureProjectPickerOnly = false,
  captureReviewOnly = false,
  captureSettingsOnly = false,
) =>
  JSON.parse(
    execFileSync(process.execPath, [capturePath], {
      encoding: "utf8",
      env: {
        ...process.env,
        ...(captureThreadOnly
          ? { CODEX_VISUAL_ASSET_THREAD_ONLY: "1" }
          : {}),
        ...(captureMcpOnly ? { CODEX_VISUAL_ASSET_MCP_ONLY: "1" } : {}),
        ...(captureProjectPickerOnly
          ? { CODEX_VISUAL_ASSET_PROJECT_PICKER_ONLY: "1" }
          : {}),
        ...(captureReviewOnly ? { CODEX_VISUAL_ASSET_REVIEW_ONLY: "1" } : {}),
        ...(captureSettingsOnly
          ? { CODEX_VISUAL_ASSET_SETTINGS_ONLY: "1" }
          : {}),
      },
      maxBuffer: 64 * 1024 * 1024,
    }),
  );
const supplementalThreadCapture = includeThreadCapture
  ? runCapture(true)
  : null;
let capture = runCapture(
  threadOnly,
  mcpOnly,
  projectPickerOnly,
  reviewOnly,
  settingsOnly,
);
if (conditionalCapturePath) {
  const normalizedProfile = realpathSync(
    process.env.CODEX_VISUAL_ASSET_PROFILE,
  );
  const normalizedConditionalCapture = realpathSync(conditionalCapturePath);
  if (dirname(normalizedConditionalCapture) !== normalizedProfile) {
    throw new Error(
      "The conditional visual capture must be a direct child of the isolated profile.",
    );
  }
  const conditionalCapture = JSON.parse(
    readFileSync(normalizedConditionalCapture, "utf8"),
  );
  if (
    conditionalCapture.captureMode !== "full" ||
    conditionalCapture.sidebarObservation?.projectMenuHasMarkAllAsRead !==
      true ||
    canonicalize(conditionalCapture.baselineContext) !==
      canonicalize(capture.baselineContext)
  ) {
    throw new Error(
      "Conditional visual capture must prove the same exact unread current-build context.",
    );
  }
  for (const id of [
    "sidebar-activity-attention",
    "sidebar-project-menu-mark-read",
  ]) {
    const observed = conditionalCapture.icons.filter(
      (icon) => icon.owner?.semanticId === id,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one conditional current capture for ${id}, received ${observed.length}.`,
      );
    }
    if (
      capture.icons.some((icon) => icon.owner?.semanticId === id)
    ) {
      throw new Error(
        `Conditional current capture for ${id} overlaps the neutral capture.`,
      );
    }
    capture.icons.push(observed[0]);
  }
}
if (supplementalThreadCapture) {
  if (
    supplementalThreadCapture.captureMode !== "completed-thread" ||
    supplementalThreadCapture.threadObservation
      ?.structuralNewChatIconCount !== 0 ||
    canonicalize(supplementalThreadCapture.baselineContext) !==
      canonicalize(capture.baselineContext)
  ) {
    throw new Error(
      "Supplemental current-thread capture must prove the same exact completed-thread build context.",
    );
  }
  const supplementalIds = new Set([
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
  ]);
  for (const id of supplementalIds) {
    const observed = supplementalThreadCapture.icons.filter(
      (icon) => icon.owner?.semanticId === id,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one supplemental current-thread capture for ${id}, received ${observed.length}.`,
      );
    }
    const existingGlobal = capture.icons.filter(
      (icon) => icon.owner?.semanticId === id,
    );
    if (existingGlobal.length > 1) {
      throw new Error(
        `Expected at most one global current capture for ${id}, received ${existingGlobal.length}.`,
      );
    }
    if (existingGlobal.length === 0) capture.icons.push(observed[0]);
  }
}
if (supplementalMcpCapturePath) {
  const normalizedProfile = realpathSync(
    process.env.CODEX_VISUAL_ASSET_PROFILE,
  );
  const normalizedSupplementalCapture = realpathSync(
    supplementalMcpCapturePath,
  );
  if (dirname(normalizedSupplementalCapture) !== normalizedProfile) {
    throw new Error(
      "The supplemental MCP capture must be a direct child of the isolated profile.",
    );
  }
  const supplementalMcpCapture = JSON.parse(
    readFileSync(normalizedSupplementalCapture, "utf8"),
  );
  capture = mergeSupplementalCurrentMcpCapture(
    capture,
    supplementalMcpCapture,
  );
}
if (supplementalPermissionCapturePath) {
  const normalizedProfile = realpathSync(
    process.env.CODEX_VISUAL_ASSET_PROFILE,
  );
  const normalizedSupplementalCapture = realpathSync(
    supplementalPermissionCapturePath,
  );
  if (dirname(normalizedSupplementalCapture) !== normalizedProfile) {
    throw new Error(
      "The supplemental Composer permission capture must be a direct child of the isolated profile.",
    );
  }
  capture = mergeSupplementalComposerPermissionCapture(
    capture,
    JSON.parse(readFileSync(normalizedSupplementalCapture, "utf8")),
  );
}
const projectPickerVisualAssetIds = [
  "composer-new-project",
  "composer-clear-project",
];
if (supplementalProjectPickerCapturePath) {
  const normalizedProfile = realpathSync(
    process.env.CODEX_VISUAL_ASSET_PROFILE,
  );
  const normalizedSupplementalCapture = realpathSync(
    supplementalProjectPickerCapturePath,
  );
  if (dirname(normalizedSupplementalCapture) !== normalizedProfile) {
    throw new Error(
      "The supplemental Project picker capture must be a direct child of the isolated profile.",
    );
  }
  const supplementalProjectPickerCapture = JSON.parse(
    readFileSync(normalizedSupplementalCapture, "utf8"),
  );
  const captureIdentity = ({ baselineContext }) => ({
    appAsarSha256: baselineContext?.appAsarSha256,
    appVersion: baselineContext?.appVersion,
    buildNumber: baselineContext?.buildNumber,
    theme: baselineContext?.theme,
    viewport: baselineContext?.viewport,
  });
  if (
    supplementalProjectPickerCapture.captureMode !== "project-picker" ||
    supplementalProjectPickerCapture.baselineContext?.interactionState !==
      "open-current-project-picker" ||
    canonicalize(captureIdentity(supplementalProjectPickerCapture)) !==
      canonicalize(captureIdentity(capture))
  ) {
    throw new Error(
      "The supplemental Project picker capture must prove the same exact build, theme, and viewport.",
    );
  }
  validateProjectPickerObservation(
    supplementalProjectPickerCapture.projectPickerObservation,
    "Supplemental current",
  );
  for (const id of projectPickerVisualAssetIds) {
    const spec = promotionSpecs.get(id);
    const observed = supplementalProjectPickerCapture.icons.filter(
      (icon) =>
        icon.region === spec?.region &&
        icon.owner?.semanticId === spec?.semanticId,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one supplemental Project picker capture for ${id}, received ${observed.length}.`,
      );
    }
    if (capture.icons.some((icon) => icon.owner?.semanticId === id)) {
      throw new Error(
        `Supplemental Project picker capture for ${id} overlaps the resting capture.`,
      );
    }
    capture.icons.push(observed[0]);
  }
  capture.projectPickerObservation =
    supplementalProjectPickerCapture.projectPickerObservation;
}
capture.icons.forEach((icon, index) =>
  sanitizeVisualAssetIcon(icon, `capture.icons[${index}]`),
);
if (reviewOnly) {
  const targetIds = [
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
  ];
  const observation = capture.reviewObservation;
  sanitizeVisualScalarRecord(
    observation?.filter?.style,
    "capture.reviewObservation.filter.style",
  );
  const sameIdentity = ({ baselineContext }) => ({
    appAsarSha256: baselineContext?.appAsarSha256,
    appVersion: baselineContext?.appVersion,
    buildNumber: baselineContext?.buildNumber,
    theme: baselineContext?.theme,
    viewport: baselineContext?.viewport,
  });
  const expectedReviewIdentity = {
    appAsarSha256:
      "c964aebbf9a6a0f70799d01215c611d8ef6ee63f816b3d57beccddd47a811fd9",
    appVersion: "26.820.60940",
    buildNumber: "7119",
    theme: "dark",
    viewport: { height: 820, width: 1180 },
  };
  if (
    capture.captureMode !== "review-workspace" ||
    capture.baselineContext?.interactionState !==
      "open-current-review-workspace" ||
    canonicalize(sameIdentity(capture)) !==
      canonicalize(expectedReviewIdentity) ||
    canonicalize(observation?.fileNames) !==
      canonicalize(["rename-destination.txt", "rename-source.txt"]) ||
    observation?.copyPathCount !== 2 ||
    observation?.fileTextIconCount !== 2 ||
    observation?.openInCount !== 2 ||
    observation?.toggleFileDiffCount !== 2 ||
    observation?.filter?.placeholder !== "Filter files…" ||
    Math.abs((observation?.filter?.rect?.width ?? 0) - 203) > 0.15 ||
    Math.abs((observation?.panel?.rect?.width ?? 0) - 419.59) > 0.15 ||
    Math.abs((observation?.panel?.rect?.height ?? 0) - 820) > 0.1 ||
    observation?.splitDiffLabel !== "Switch to split diff" ||
    canonicalize(observation?.toolbarLabels) !==
      canonicalize([
        "Last Turn",
        "Review options",
        "Collapse all diffs",
        "Jump to file",
        "Switch to split diff",
        "Hide files",
        "Commit or push",
        "More Git actions",
      ])
  ) {
    throw new Error(
      `Targeted current Review capture contract changed: ${canonicalize(observation)}.`,
    );
  }
  const expectedCandidateCounts = new Map([
    ["review-copy-path", 2],
    ["review-file-toggle", 2],
    ["review-open-in", 2],
  ]);
  const promotedById = new Map();
  for (const id of targetIds) {
    const spec = promotionSpecs.get(id);
    if (!spec) throw new Error(`Missing current Review promotion spec: ${id}.`);
    const observed = capture.icons.filter(
      (candidate) =>
        candidate.region === spec.region &&
        candidate.owner?.semanticId === spec.semanticId,
    );
    const expectedCount = expectedCandidateCounts.get(id) ?? 1;
    if (observed.length !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} current Review captures for ${id}, received ${observed.length}.`,
      );
    }
    const groups = new Map();
    for (const candidate of observed) {
      const bucket = groups.get(candidate.sha256) ?? [];
      bucket.push(candidate);
      groups.set(candidate.sha256, bucket);
    }
    const selectedGroup = [...groups.values()].sort(
      (left, right) => right.length - left.length,
    )[0];
    const minimumMatching = expectedCount;
    if (!selectedGroup || selectedGroup.length < minimumMatching) {
      throw new Error(`${id} current Review geometry is not deterministic.`);
    }
    const selected = selectedGroup[0];
    const existing = manifest.icons.find((icon) => icon.id === id);
    const sameComponentFingerprint =
      canonicalize(
        sameIdentity({
          baselineContext: existing?.baselineContext ?? manifest.baseline,
        }),
      ) === canonicalize(expectedReviewIdentity);
    if (
      existing &&
      sameComponentFingerprint &&
      (existing.region !== spec.region ||
        existing.viewBox !== selected.viewBox ||
        canonicalize(existing.rootAttributes) !==
          canonicalize(selected.rootAttributes))
    ) {
      throw new Error(`${id} root geometry or region changed.`);
    }
    const promoted = {
      baselineContext: {
        ...capture.baselineContext,
        capturedAt: "2026-08-29",
      },
      id,
      ownerAriaLabel: spec.ownerAriaLabel,
      ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
      primitives: existing && sameComponentFingerprint
        ? promotePrimitives(existing, selected)
        : selected.primitives,
      region: spec.region,
      renderSize: selected.renderSize,
      rootAttributes: selected.rootAttributes,
      rootComputedStyle: existing && sameComponentFingerprint
        ? promoteComputedStyle(existing.rootComputedStyle, selected.rootComputedStyle)
        : selected.rootComputedStyle,
      sourceClassName: selected.sourceClassName,
      status: "runtime-observed",
      viewBox: selected.viewBox,
    };
    promoted.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: promoted.baselineContext,
          primitives: promoted.primitives,
          renderSize: promoted.renderSize,
          rootAttributes: promoted.rootAttributes,
          rootComputedStyle: promoted.rootComputedStyle,
          sourceClassName: promoted.sourceClassName,
          viewBox: promoted.viewBox,
        }),
      )
      .digest("hex");
    promotedById.set(id, promoted);
  }
  const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  manifest.icons = [...promotionSpecs.keys()].map(
    (id) => promotedById.get(id) ?? existingById.get(id),
  );
  manifest.reviewBaseline = {
    ...capture.baselineContext,
    capturedAt: "2026-08-29",
  };
  manifest.reviewObservation = observation;
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current Review assets`,
    );
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
if (projectPickerOnly) {
  const targetIds = projectPickerVisualAssetIds;
  const currentFingerprint = {
    appAsarSha256: capture.baselineContext?.appAsarSha256,
    appVersion: capture.baselineContext?.appVersion,
    buildNumber: capture.baselineContext?.buildNumber,
  };
  const manifestFingerprint = {
    appAsarSha256: manifest.baseline.appAsarSha256,
    appVersion: manifest.baseline.appVersion,
    buildNumber: manifest.baseline.buildNumber,
  };
  const observation = capture.projectPickerObservation;
  validateProjectPickerObservation(observation, "Targeted current");
  if (
    capture.captureMode !== "project-picker" ||
    canonicalize(currentFingerprint) !== canonicalize(manifestFingerprint) ||
    capture.baselineContext?.interactionState !== "open-current-project-picker" ||
    capture.baselineContext?.theme !== manifest.baseline.theme ||
    canonicalize(capture.baselineContext?.viewport) !==
      canonicalize(manifest.baseline.viewport)
  ) {
    throw new Error(
      "Targeted current Project picker capture must match the tracked fingerprint, theme, and viewport.",
    );
  }
  const promotedById = new Map();
  for (const id of targetIds) {
    const spec = promotionSpecs.get(id);
    if (!spec) throw new Error(`Missing Project picker promotion spec: ${id}.`);
    const observed = capture.icons.filter(
      (candidate) =>
        candidate.region === spec.region &&
        candidate.owner?.semanticId === spec.semanticId,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one targeted Project picker capture for ${id}, received ${observed.length}.`,
      );
    }
    const existing = manifest.icons.find((icon) => icon.id === id);
    if (
      existing &&
      (existing.region !== spec.region ||
        existing.viewBox !== observed[0].viewBox ||
        canonicalize(existing.rootAttributes) !==
          canonicalize(observed[0].rootAttributes))
    ) {
      throw new Error(`${id} root geometry or region changed.`);
    }
    const promoted = {
      id,
      ownerAriaLabel: spec.ownerAriaLabel,
      ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
      primitives: existing
        ? promotePrimitives(existing, observed[0])
        : observed[0].primitives,
      region: spec.region,
      renderSize: observed[0].renderSize,
      rootAttributes: observed[0].rootAttributes,
      rootComputedStyle: existing
        ? promoteComputedStyle(
            existing.rootComputedStyle,
            observed[0].rootComputedStyle,
          )
        : observed[0].rootComputedStyle,
      sourceClassName: observed[0].sourceClassName,
      status: "runtime-observed",
      viewBox: observed[0].viewBox,
    };
    promoted.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: manifest.baseline,
          primitives: promoted.primitives,
          renderSize: promoted.renderSize,
          rootAttributes: promoted.rootAttributes,
          rootComputedStyle: promoted.rootComputedStyle,
          sourceClassName: promoted.sourceClassName,
          viewBox: promoted.viewBox,
        }),
      )
      .digest("hex");
    promotedById.set(id, promoted);
  }
  const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  manifest.icons = [...promotionSpecs.keys()].map(
    (id) => promotedById.get(id) ?? existingById.get(id),
  );
  manifest.projectPickerObservation = observation;
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current Project picker assets`,
    );
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
if (mcpOnly) {
  const observedById = collectCurrentMcpVisualAssets(
    capture,
    "Targeted current MCP capture",
  );
  const currentFingerprint = {
    appAsarSha256: capture.baselineContext?.appAsarSha256,
    appVersion: capture.baselineContext?.appVersion,
    buildNumber: capture.baselineContext?.buildNumber,
  };
  const manifestFingerprint = {
    appAsarSha256: manifest.baseline.appAsarSha256,
    appVersion: manifest.baseline.appVersion,
    buildNumber: manifest.baseline.buildNumber,
  };
  if (
    canonicalize(currentFingerprint) !== canonicalize(manifestFingerprint) ||
    capture.baselineContext?.interactionState !==
      "completed-current-mcp-thread" ||
    capture.baselineContext?.theme !== manifest.baseline.theme ||
    canonicalize(capture.baselineContext?.viewport) !==
      canonicalize(manifest.baseline.viewport)
  ) {
    throw new Error(
      "Targeted current MCP capture must match the tracked fingerprint, theme, and viewport.",
    );
  }
  const promotedById = new Map();
  for (const id of currentMcpVisualAssetIds) {
    const spec = promotionSpecs.get(id);
    if (!spec) throw new Error(`Missing current MCP promotion spec: ${id}.`);
    const observed = observedById.get(id);
    const expectedMinimum = spec.minimumCandidates ?? 1;
    if (observed.length < expectedMinimum) {
      throw new Error(
        `Expected at least ${expectedMinimum} targeted MCP captures for ${id}, received ${observed.length}.`,
      );
    }
    if (new Set(observed.map(({ sha256 }) => sha256)).size !== 1) {
      throw new Error(`${id} targeted captures do not share one fingerprint.`);
    }
    const existing = manifest.icons.find((icon) => icon.id === id);
    if (
      existing &&
      (existing.region !== spec.region ||
        existing.viewBox !== observed[0].viewBox ||
        canonicalize(existing.rootAttributes) !==
          canonicalize(observed[0].rootAttributes))
    ) {
      throw new Error(`${id} root geometry or region changed.`);
    }
    const promoted = {
      id,
      ownerAriaLabel: spec.ownerAriaLabel,
      ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
      primitives: existing
        ? promotePrimitives(existing, observed[0])
        : observed[0].primitives,
      region: spec.region,
      renderSize: observed[0].renderSize,
      rootAttributes: observed[0].rootAttributes,
      rootComputedStyle: existing
        ? promoteComputedStyle(
            existing.rootComputedStyle,
            observed[0].rootComputedStyle,
          )
        : observed[0].rootComputedStyle,
      sourceClassName: observed[0].sourceClassName,
      status: "runtime-observed",
      viewBox: observed[0].viewBox,
    };
    promoted.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: manifest.baseline,
          primitives: promoted.primitives,
          renderSize: promoted.renderSize,
          rootAttributes: promoted.rootAttributes,
          rootComputedStyle: promoted.rootComputedStyle,
          sourceClassName: promoted.sourceClassName,
          viewBox: promoted.viewBox,
        }),
      )
      .digest("hex");
    promotedById.set(id, promoted);
  }
  const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  manifest.icons = [...promotionSpecs.keys()].map(
    (id) => promotedById.get(id) ?? existingById.get(id),
  );
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current MCP assets`,
    );
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
if (threadOnly) {
  const targetIds = [
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
  ];
  if (capture.captureMode !== "completed-thread") {
    throw new Error("Targeted current-thread capture mode was not proven.");
  }
  if (capture.threadObservation?.structuralNewChatIconCount !== 0) {
    throw new Error(
      "Targeted current-thread capture must prove the removed header New chat control remains absent.",
    );
  }
  const rasterAssets = capture.rasterAssets;
  if (
    !Array.isArray(rasterAssets) ||
    rasterAssets.length !== 1 ||
    rasterAssets[0]?.id !== "thread-header-editor-vscode" ||
    rasterAssets[0]?.mimeType !== "image/png" ||
    rasterAssets[0]?.sourceUrl !== "app://-/apps/vscode.png" ||
    rasterAssets[0]?.status !== "runtime-observed" ||
    rasterAssets[0]?.naturalSize?.height !== 64 ||
    rasterAssets[0]?.naturalSize?.width !== 64 ||
    rasterAssets[0]?.renderSize?.height !== 16 ||
    rasterAssets[0]?.renderSize?.width !== 16 ||
    rasterAssets[0]?.byteLength !== 2804 ||
    rasterAssets[0]?.sha256 !==
      "5ff492ba38828c649ad3f2e8ce78e02d9cbdd1200009dd046992cfbde6897a24"
  ) {
    throw new Error("Targeted current-thread raster asset changed unexpectedly.");
  }
  const currentFingerprint = {
    appAsarSha256: capture.baselineContext?.appAsarSha256,
    appVersion: capture.baselineContext?.appVersion,
    buildNumber: capture.baselineContext?.buildNumber,
  };
  const manifestFingerprint = {
    appAsarSha256: manifest.baseline.appAsarSha256,
    appVersion: manifest.baseline.appVersion,
    buildNumber: manifest.baseline.buildNumber,
  };
  if (
    canonicalize(currentFingerprint) !== canonicalize(manifestFingerprint) ||
    capture.baselineContext?.interactionState !==
      manifest.baseline.interactionState ||
    capture.baselineContext?.theme !== manifest.baseline.theme ||
    canonicalize(capture.baselineContext?.viewport) !==
      canonicalize(manifest.baseline.viewport)
  ) {
    throw new Error(
      "Targeted current-thread capture must match the exact tracked app fingerprint, interaction state, theme, and viewport.",
    );
  }
  const promotedById = new Map();
  for (const id of targetIds) {
    const spec = promotionSpecs.get(id);
    if (!spec) throw new Error(`Missing current-thread promotion spec: ${id}.`);
    const observed = capture.icons.filter(
      (candidate) =>
        candidate.region === spec.region &&
        candidate.owner?.semanticId === spec.semanticId,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one targeted current-thread capture for ${id}, received ${observed.length}.`,
      );
    }
    const existing = manifest.icons.find((icon) => icon.id === id);
    if (
      existing &&
      (existing.region !== spec.region ||
        existing.viewBox !== observed[0].viewBox ||
        canonicalize(existing.rootAttributes) !==
          canonicalize(observed[0].rootAttributes))
    ) {
      throw new Error(`${id} root geometry or region changed.`);
    }
    const promoted = {
      id,
      ownerAriaLabel: spec.ownerAriaLabel,
      ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
      primitives: existing
        ? promotePrimitives(existing, observed[0])
        : observed[0].primitives,
      region: spec.region,
      renderSize: observed[0].renderSize,
      rootAttributes: observed[0].rootAttributes,
      rootComputedStyle: existing
        ? promoteComputedStyle(
            existing.rootComputedStyle,
            observed[0].rootComputedStyle,
          )
        : observed[0].rootComputedStyle,
      sourceClassName: observed[0].sourceClassName,
      status: "runtime-observed",
      viewBox: observed[0].viewBox,
    };
    promoted.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: manifest.baseline,
          primitives: promoted.primitives,
          renderSize: promoted.renderSize,
          rootAttributes: promoted.rootAttributes,
          rootComputedStyle: promoted.rootComputedStyle,
          sourceClassName: promoted.sourceClassName,
          viewBox: promoted.viewBox,
        }),
      )
      .digest("hex");
    promotedById.set(id, promoted);
  }
  const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  manifest.icons = [...promotionSpecs.keys()].map(
    (id) => promotedById.get(id) ?? existingById.get(id),
  );
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  const rasterOutput = `${JSON.stringify(
    {
      assets: rasterAssets,
      baseline: manifest.baseline,
      policy: {
        distribution:
          "exploratory playground only; excluded from the published npm package",
        ownership: "Microsoft Visual Studio Code trademark asset",
        runtimeSource: "Codex Desktop titlebar integration image",
      },
      schemaVersion: 1,
    },
    null,
    2,
  )}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current-thread assets`,
    );
    writeFileSync(rasterManifestPath, rasterOutput);
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
if (settingsOnly) {
  const targetIds = [...promotionSpecs.entries()]
    .filter(([, spec]) => spec.region === "settings-navigation")
    .map(([id]) => id);
  const currentFingerprint = {
    appAsarSha256: capture.baselineContext?.appAsarSha256,
    appVersion: capture.baselineContext?.appVersion,
    buildNumber: capture.baselineContext?.buildNumber,
  };
  const expectedSettingsFingerprint = {
    appAsarSha256:
      "f56ac8d5254a10fc4a04e7417fa787d135c3bbca49bad7d668d4ae65833d40c7",
    appVersion: "26.825.51511",
    buildNumber: "7377",
  };
  const observation = capture.settingsNavigationObservation;
  if (
    capture.captureMode !== "settings-navigation" ||
    capture.baselineContext?.interactionState !==
      "open-current-settings-navigation" ||
    canonicalize(currentFingerprint) !==
      canonicalize(expectedSettingsFingerprint) ||
    capture.baselineContext?.theme !== manifest.baseline.theme ||
    canonicalize(capture.baselineContext?.viewport) !==
      canonicalize(manifest.baseline.viewport) ||
    canonicalize(observation?.itemLabels) !==
      canonicalize([
        "General",
        "Import",
        "Profile",
        "Appearance",
        "Voice",
        "Configuration",
        "Personalization",
        "Pets",
        "Keyboard shortcuts",
        "Usage & billing",
        "Account",
        "Computer use",
        "Computer history",
        "Appshots",
        "Plugins",
        "Browser",
        "Hooks",
        "Connections",
        "Git",
        "Environments",
        "Worktrees",
        "Archived chats",
      ]) ||
    observation?.searchPlaceholder !== "Search settings…" ||
    Math.abs((observation?.navigation?.width ?? 0) - 321.88) > 0.1 ||
    observation?.navigation?.top !== 46 ||
    observation?.navigation?.height !== 774
  ) {
    throw new Error(
      `Targeted current Settings capture contract changed: ${canonicalize({
        captureMode: capture.captureMode,
        observation,
      })}.`,
    );
  }

  const promotedById = new Map();
  const existingById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  for (const id of targetIds) {
    const spec = promotionSpecs.get(id);
    const observed = capture.icons.filter(
      (candidate) =>
        candidate.region === spec?.region &&
        candidate.owner?.semanticId === spec?.semanticId,
    );
    if (observed.length !== 1) {
      throw new Error(
        `Expected one targeted current Settings capture for ${id}, received ${observed.length}.`,
      );
    }
    const selected = observed[0];
    const existing = existingById.get(id);
    const sameRootGeometry =
      existing &&
      existing.viewBox === selected.viewBox &&
      canonicalize(existing.rootAttributes) ===
        canonicalize(selected.rootAttributes);
    const promoted = {
      baselineContext: {
        ...capture.baselineContext,
        capturedAt: "2026-08-30",
      },
      id,
      ownerAriaLabel: spec.ownerAriaLabel,
      ...(spec.ownerEvidence ? { ownerEvidence: spec.ownerEvidence } : {}),
      primitives: sameRootGeometry
        ? promotePrimitives(existing, selected)
        : selected.primitives,
      region: spec.region,
      renderSize: selected.renderSize,
      rootAttributes: selected.rootAttributes,
      rootComputedStyle: sameRootGeometry
        ? promoteComputedStyle(existing.rootComputedStyle, selected.rootComputedStyle)
        : selected.rootComputedStyle,
      sourceClassName: selected.sourceClassName,
      status: "runtime-observed",
      viewBox: selected.viewBox,
    };
    promoted.sha256 = createHash("sha256")
      .update(
        canonicalize({
          baselineContext: promoted.baselineContext,
          primitives: promoted.primitives,
          renderSize: promoted.renderSize,
          rootAttributes: promoted.rootAttributes,
          rootComputedStyle: promoted.rootComputedStyle,
          sourceClassName: promoted.sourceClassName,
          viewBox: promoted.viewBox,
        }),
      )
      .digest("hex");
    promotedById.set(id, promoted);
  }
  manifest.icons = [...promotionSpecs.keys()].map(
    (id) => promotedById.get(id) ?? existingById.get(id),
  );
  manifest.settingsBaseline = {
    ...capture.baselineContext,
    capturedAt: "2026-08-30",
  };
  manifest.settingsNavigationObservation = observation;
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current Settings navigation assets`,
    );
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
if (hooksOnly) {
  const observed = capture.icons.filter(
    ({ owner, region }) =>
      region === "settings-page-action" &&
      owner?.semanticId === "settings-hooks-reload",
  );
  if (observed.length !== 1) {
    throw new Error(
      `Expected one current Hooks reload capture, received ${observed.length}.`,
    );
  }
  const currentFingerprint = {
    appAsarSha256: capture.baselineContext?.appAsarSha256,
    appVersion: capture.baselineContext?.appVersion,
    buildNumber: capture.baselineContext?.buildNumber,
  };
  const manifestFingerprint = {
    appAsarSha256: manifest.baseline.appAsarSha256,
    appVersion: manifest.baseline.appVersion,
    buildNumber: manifest.baseline.buildNumber,
  };
  if (
    canonicalize(currentFingerprint) !== canonicalize(manifestFingerprint) ||
    capture.baselineContext?.interactionState !==
      manifest.baseline.interactionState ||
    capture.baselineContext?.theme !== manifest.baseline.theme ||
    canonicalize(capture.baselineContext?.viewport) !==
      canonicalize(manifest.baseline.viewport)
  ) {
    throw new Error(
      "Targeted Hooks capture must match the exact tracked app fingerprint, interaction state, theme, and viewport.",
    );
  }
  const existing = manifest.icons.find(
    ({ id }) => id === "settings-hooks-reload",
  );
  if (
    existing &&
    (existing.region !== "settings-page-action" ||
      existing.viewBox !== observed[0].viewBox ||
      canonicalize(existing.rootAttributes) !==
        canonicalize(observed[0].rootAttributes))
  ) {
    throw new Error("settings-hooks-reload root geometry or region changed.");
  }
  const primitives = existing
    ? promotePrimitives(existing, observed[0])
    : observed[0].primitives;
  const promoted = {
    id: "settings-hooks-reload",
    ownerAriaLabel: "Reload hooks",
    ownerEvidence:
      "current Hooks Settings reload action selected by its exact accessible label",
    primitives,
    region: "settings-page-action",
    renderSize: observed[0].renderSize,
    rootAttributes: observed[0].rootAttributes,
    rootComputedStyle: existing
      ? promoteComputedStyle(existing.rootComputedStyle, observed[0].rootComputedStyle)
      : observed[0].rootComputedStyle,
    sourceClassName: observed[0].sourceClassName,
    status: "runtime-observed",
    viewBox: observed[0].viewBox,
  };
  promoted.sha256 = createHash("sha256")
    .update(
      canonicalize({
        baselineContext: manifest.baseline,
        primitives: promoted.primitives,
        renderSize: promoted.renderSize,
        rootAttributes: promoted.rootAttributes,
        rootComputedStyle: promoted.rootComputedStyle,
        sourceClassName: promoted.sourceClassName,
        viewBox: promoted.viewBox,
      }),
    )
    .digest("hex");
  manifest.icons = [
    ...manifest.icons.filter(({ id }) => id !== promoted.id),
    promoted,
  ];
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (write) {
    writeManifestAndCurrentThreadSubset(
      output,
      `Updated ${manifestPath} with current Hooks assets`,
    );
  } else {
    await writeOutput(output);
  }
  process.exit(0);
}
const composerTerminalIds = new Set(["composer-send", "composer-voice"]);
const composerPermissionIds = new Set(composerPermissionVisualAssetIds);
const expectedComposerIds = [...promotionSpecs.entries()]
  .filter(
    ([id, spec]) =>
      spec.region === "composer" &&
      !composerTerminalIds.has(id) &&
      !composerPermissionIds.has(id),
  )
  .map(([id]) => id)
  .sort();
const capturedComposerIds = capture.icons
  .filter(({ region }) => region === "composer")
  .map(({ owner }) => owner.semanticId)
  .sort();
const capturedComposerRequiredIds = capturedComposerIds.filter(
  (id) => !composerTerminalIds.has(id),
);
const capturedComposerPermissionIds = capturedComposerRequiredIds.filter(
  (id) => composerPermissionIds.has(id),
);
const incomingFingerprint = {
  appAsarSha256: capture.baselineContext?.appAsarSha256,
  appVersion: capture.baselineContext?.appVersion,
  buildNumber: capture.baselineContext?.buildNumber,
};
const trackedFingerprint = {
  appAsarSha256: manifest.baseline.appAsarSha256,
  appVersion: manifest.baseline.appVersion,
  buildNumber: manifest.baseline.buildNumber,
};
const fullRefreshFingerprintChanged =
  canonicalize(incomingFingerprint) !== canonicalize(trackedFingerprint);
assertComposerPermissionRefreshCoverage(capturedComposerPermissionIds, {
  fingerprintChanged: fullRefreshFingerprintChanged,
});
const expectedCapturedComposerIds = [
  ...expectedComposerIds,
  ...capturedComposerPermissionIds,
].sort();
const capturedComposerTerminalIds = capturedComposerIds.filter((id) =>
  composerTerminalIds.has(id),
);
if (
  capture.composerObservation?.topContextIconCount !== 3 ||
  capture.composerObservation?.bottomActionIconCount !== 5 ||
  capture.composerObservation?.exactSemanticIconCount !== 8 ||
  canonicalize(capturedComposerRequiredIds) !==
    canonicalize(expectedCapturedComposerIds) ||
  canonicalize(capturedComposerTerminalIds) !==
    canonicalize(["composer-send", "composer-voice"])
) {
  throw new Error(
    `Unexpected current Composer capture: ${canonicalize({
      capturedComposerIds,
      capturedComposerTerminalIds,
      composerObservation: capture.composerObservation,
      expectedComposerIds: expectedCapturedComposerIds,
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
  capture.sidebarObservation?.helpMenuIconCount !== 9 ||
  capture.sidebarObservation?.helpMenu?.menuRect?.width !== 320 ||
  Math.abs(
    (capture.sidebarObservation?.helpMenu?.menuRect?.height ?? 0) - 272.06,
  ) > 1 ||
  capture.sidebarObservation?.footerVoiceControlCount !== 1 ||
  capture.sidebarObservation?.accountMenu?.itemCount !== 6 ||
  capture.sidebarObservation?.accountMenu?.iconCount !== 5 ||
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

const fingerprintChanged = fullRefreshFingerprintChanged;
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
if (capture.projectPickerObservation) {
  validateProjectPickerObservation(
    capture.projectPickerObservation,
    "Full-refresh supplemental",
  );
  manifest.projectPickerObservation = capture.projectPickerObservation;
}

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
  if (
    candidates.length === 0 &&
    fingerprintChanged &&
    currentMcpVisualAssetIds.includes(id)
  ) {
    throw new Error(
      `${id} requires CODEX_VISUAL_ASSET_MCP_CAPTURE from the same new-build profile during a fingerprint-changing full refresh.`,
    );
  }
  if (
    candidates.length === 0 &&
    fingerprintChanged &&
    projectPickerVisualAssetIds.includes(id)
  ) {
    throw new Error(
      `${id} requires CODEX_VISUAL_ASSET_PROJECT_PICKER_CAPTURE from the same new-build profile during a fingerprint-changing full refresh.`,
    );
  }
  if (
    candidates.length === 0 &&
    fingerprintChanged &&
    composerPermissionIds.has(id)
  ) {
    throw new Error(
      `${id} requires CODEX_VISUAL_ASSET_PERMISSION_CAPTURE with the alternate same-build Composer permission state during a fingerprint-changing full refresh.`,
    );
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
  writeManifestAndCurrentThreadSubset(output, `Updated ${manifestPath}`);
} else {
  process.stdout.write(output);
}
