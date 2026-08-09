import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../scripts/check-visual-contract.mjs", import.meta.url),
  "utf8",
);
const cdpContract = readFileSync(
  new URL("../scripts/check-cdp-contract.mjs", import.meta.url),
  "utf8",
);
const electronContract = readFileSync(
  new URL("../scripts/check-electron-contract.mjs", import.meta.url),
  "utf8",
);
const electronHarness = readFileSync(
  new URL("../scripts/electron-harness.mjs", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const appStyles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("lifecycle visual policy", () => {
  it("keeps the main gate strict while scoping raster tolerance to the sidebar", () => {
    expect(contract).toContain(
      "const defaultLifecycleMainPixelRatio = 0.0025",
    );
    expect(contract).toContain(
      "const defaultLifecycleSidebarPixelRatio = 0.05",
    );
    expect(contract).toContain("const internalSidebarWidth = 274");
    expect(contract).toContain(
      "scene.maxPixelRatio ?? defaultLifecycleMainPixelRatio",
    );
    expect(contract).toContain(
      "mainComparison.ratio > maximumMainPixelRatio",
    );
    expect(contract).toContain(
      "sidebarComparison.ratio > defaultLifecycleSidebarPixelRatio",
    );
    expect(contract).not.toContain("const topMasks");
    expect(contract).not.toContain("defaultLifecyclePixelRatio");
  });

  it("keeps the current-build window chrome comparison ownership-scoped", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_WINDOW_CHROME_REFERENCE",
    );
    expect(contract).toContain(
      "const actualChrome = cropPng(actual, 80, 0, 120, 46)",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_WINDOW_CHROME_MAX_DIFF_RATIO",
    );
  });

  it("gates the dedicated current-build sidebar regions", () => {
    expect(contract).toContain('scene.id === "current-sidebar"');
    expect(contract).toContain("CODEX_UI_KIT_SIDEBAR_REFERENCE");
    expect(contract).toContain("CODEX_UI_KIT_SIDEBAR_TOP_MAX_DIFF_RATIO");
    expect(contract).toContain("CODEX_UI_KIT_SIDEBAR_SELECTED_MAX_DIFF_RATIO");
    expect(contract).toContain("CODEX_UI_KIT_SIDEBAR_FOOTER_MAX_DIFF_RATIO");
    expect(contract).toContain("`${scene.id}.current-build.${region}.diff.png`");
    expect(appSource).toContain("initialSelection.currentSidebar ||");
    expect(appSource).toContain(
      'initialSelection.frame === "sidebar-current" ||',
    );
    expect(appSource).toContain("!initialSelection.capture");
    expect(appSource).toContain(
      "data-sidebar-current={currentSidebarComposition || undefined}",
    );
    expect(appStyles).toContain(".demo-root[data-sidebar-current]");
  });

  it("gates current multiline, permission, resource, and mode Composer regions", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_GOAL_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_PLAN_REFERENCE",
    );
    expect(contract).toContain(
      'scene.id === "composer-resources-menu" ? 0.008 : 0.005',
    );
    expect(contract).toContain(
      "current-build Composer lifecycle pixel ratio",
    );
  });

  it("keeps current-build Composer icon coordinates in the pixel gate", () => {
    const composerIconGate = contract.slice(
      contract.indexOf("const iconComparisons"),
      contract.indexOf("const composerIconPixels"),
    );

    expect(contract).toContain(
      "JSON.stringify(workspaceCurrentIconBounds) !==",
    );
    expect(contract).toContain(
      "JSON.stringify(currentBuildComposerIconReferenceBounds)",
    );
    expect(contract).toContain(
      "current Composer icon bounds drifted from the current-build reference",
    );
    expect(contract).not.toContain(
      "workspaceCurrentIconBounds?.map(({ height, name, width })",
    );
    expect(composerIconGate).toContain("actual,\n              referenceBounds.left");
    expect(composerIconGate).toContain("referenceBounds.top");
    expect(composerIconGate).not.toContain("actualBounds.left");
    expect(composerIconGate).not.toContain("actualBounds.top");
    expect(appSource).toContain("Full access");
    expect(appStyles).toContain("padding-inline-start: 19px");
    expect(appStyles).toContain("padding-top: 14px");
    expect(appStyles).toContain("flex: 0 0 101px");
    expect(appStyles).toContain("margin-left: 8px");
  });

  it("keeps exact Composer assets after current approval decisions", () => {
    expect(appSource).toMatch(
      /const currentComposerComposition =\s+currentHeaderReplay \|\|\s+showLifecycleComposer \|\|\s+isCurrentApprovalReplay;/,
    );
    expect(cdpContract).toContain(
      '"approval-current-allow-once-completed"',
    );
    expect(cdpContract).toContain('"approval-current-denied"');
    expect(cdpContract).toContain(
      '"approval-current-similar-repeated-completed"',
    );
  });

  it("gates the independent light shell without promoting emulated product evidence", () => {
    expect(electronHarness).toContain('id: "current-light-shell"');
    expect(electronHarness).toContain('theme: "light"');
    expect(cdpContract).toContain(
      'scene.id === "current-light-shell"',
    );
    expect(cdpContract).toContain(
      'lightShell.colorScheme !== "light"',
    );
    expect(cdpContract).toContain(
      'lightShell.main?.backgroundColor !== "rgb(255, 255, 255)"',
    );
    expect(electronContract).toContain(
      'themeControl.selectOption("system")',
    );
    expect(electronContract).toContain(
      'themeControl.selectOption("light")',
    );
    expect(electronContract).toContain(
      'themeControl.selectOption("dark")',
    );
    expect(electronContract).toContain(
      "Electron unsupported route theme contract failed",
    );
    expect(appSource).toContain("const themeAvailable = isDemoThemeView(view)");
    expect(appSource).toContain(
      'const appliedTheme = themeAvailable ? theme : "dark"',
    );
    expect(appSource).toContain("data-theme={appliedTheme}");
    expect(appSource).toContain(
      "!initialSelection.capture && themeAvailable",
    );
    expect(appStyles).toContain(
      '.demo-root[data-theme="light"] .demo-current-build-icon',
    );
  });

  it("gates the current long-thread navigation and return control", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_LONG_THREAD_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_LONG_THREAD_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "current-build long-thread pixel ratio",
    );
    expect(contract).toContain(
      'const actualRegion = cropPng(actual, 274, 0, 906, 820)',
    );
  });

  it("gates current command approval decision regions", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_PENDING_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_DENIED_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_PENDING_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_DENIED_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "current-build approval pixel ratio",
    );
  });

  it("gates the current failed command and recovery frame", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_COMMAND_FAILURE_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMMAND_FAILURE_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      'scene.id === "command-failure-expanded"',
    );
    expect(contract).toContain(
      "current-build command-failure pixel ratio",
    );
  });

  it("gates the current command Stop and interruption-summary frame", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_COMMAND_INTERRUPTION_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMMAND_INTERRUPTION_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      'scene.id === "command-interruption-stopping"',
    );
    expect(contract).toContain(
      "current-build command-interruption pixel ratio",
    );
  });

  it("gates the current manual context-compaction running frame", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_CONTEXT_COMPACTION_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CONTEXT_COMPACTION_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      'scene.id === "context-compaction-running"',
    );
    expect(contract).toContain(
      "current-build context-compaction pixel ratio",
    );
  });

  it("gates current concurrent and nested subagent lifecycle regions", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_SUBAGENT_CONCURRENT_SUMMARY_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_SUBAGENT_CONCURRENT_MIXED_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_SUBAGENT_NESTED_RUNNING_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_SUBAGENT_NESTED_TRANSCRIPT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_SUBAGENT_COLLABORATION_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      '"subagent-concurrent-summary-running":',
    );
    expect(contract).toContain(
      '"subagent-concurrent-summary-mixed":',
    );
    expect(contract).toContain(
      '"subagent-nested-panel-mixed":',
    );
    expect(contract).toContain(
      'sceneId: "subagent-nested-main-activity-running"',
    );
    expect(appSource).toContain(
      "subagentTimelinePresentation(state, entry.id)",
    );
    expect(appSource).toContain(
      'key={`subagent:${entry.id}:${turnActive ? "active" : "settled"}`}',
    );
  });
});
