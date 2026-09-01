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
const electronMain = readFileSync(
  new URL("../electron/main.ts", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const appStyles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("lifecycle visual policy", () => {
  it("gates runtime-observed 26.818 MCP success, recovery, and Sources regions", () => {
    expect(electronHarness).toContain('id: "mcp-current-26-818-success"');
    expect(electronHarness).toContain(
      'id: "mcp-current-26-818-recovery-compact"',
    );
    expect(electronHarness).toContain(
      'id: "mcp-current-26-818-sources-pinned"',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_818_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_818_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_818_REFERENCE",
    );
    expect(cdpContract).toContain(
      'scene.id === "mcp-current-26-818-sources-pinned"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-818-success"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-818-recovery"',
    );
    expect(electronContract).toContain(
      "26.818 Electron MCP Sources interaction drifted",
    );
    expect(electronContract).toContain(
      "26.818 Electron MCP recovery drifted",
    );
    expect(electronMain).toContain("CODEX_DEMO_SUMMARY_STATE");
    expect(electronHarness).toContain("CODEX_DEMO_SUMMARY_STATE");
    expect(appSource).toContain('data-summary-pinned={');
    expect(appStyles).toContain(
      '.demo-root[data-summary-pinned="true"]',
    );
  });

  it("gates runtime-observed 26.820 MCP success, failure, recovery, and Sources regions", () => {
    for (const scene of [
      "mcp-current-26-820-success",
      "mcp-current-26-820-recovery-failed",
      "mcp-current-26-820-recovery-retrying",
      "mcp-current-26-820-recovery-completed",
      "mcp-current-26-820-recovery-compact",
      "mcp-current-26-820-sources-pinned",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_820_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_FAILURE_26_820_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_820_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_820_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      'scene.scenario === "mcp-current-26-820-success"',
    );
    expect(cdpContract).toContain(
      "current 26.820 failed MCP row contract failed",
    );
    expect(cdpContract).toContain(
      "current 26.820 MCP evidence contract failed",
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-820-success"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-820-failed"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-820-recovery"',
    );
    expect(appSource).toContain("collapsible={!usesCurrentMcpFlatRows}");
    expect(appStyles).toContain(
      '[data-scenario="mcp-current-26-820-recovery"]',
    );
  });

  it("gates the runtime-observed 26.825 MCP two-turn lifecycle", () => {
    for (const scene of [
      "mcp-current-26-825-success",
      "mcp-current-26-825-recovery",
      "mcp-current-26-825-recovery-compact",
      "mcp-current-26-825-sources-pinned",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_825_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_825_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      "current 26.825 MCP lifecycle contract failed",
    );
    expect(cdpContract).toContain(
      "current 26.825 MCP summary lifecycle failed",
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-825-success"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-mcp-26-825-recovery"',
    );
    expect(appSource).toContain(
      'scenarioId === "mcp-current-26-825-lifecycle"',
    );
    expect(appStyles).toContain(
      '[data-scenario="mcp-current-26-825-lifecycle"]',
    );
  });

  it("gates the runtime-observed 26.825 transport recovery lifecycle", () => {
    for (const scene of [
      "current-transport-network-waiting",
      "current-transport-network-waiting-repeated",
      "current-transport-network-waiting-repeated-compact",
      "current-transport-network-waiting-sixth",
      "current-transport-recovered",
      "current-transport-followup",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_TRANSPORT_26_825_WAITING_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_TRANSPORT_26_825_WAITING_MAX_DIFF_RATIO",
    );
    expect(cdpContract).toContain(
      "current transport recovery contract failed",
    );
    expect(electronContract).toContain(
      'id: "electron-current-transport-followup"',
    );
    expect(appSource).toContain(
      'scenarioId === "streaming-recovery-current-26-825"',
    );
    expect(appStyles).toContain(
      '[data-scenario="streaming-recovery-current-26-825"]',
    );
  });

  it("gates the runtime-observed 26.825 Browser failure and Composer recovery", () => {
    for (const scene of [
      "conversation-browser-current-26-825-chromium-error",
      "conversation-browser-current-26-825-unsupported-error",
      "conversation-browser-current-26-825-unsupported-error-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_BROWSER_FAILURE_26_825_REFERENCE",
      "CODEX_UI_KIT_CURRENT_BROWSER_FAILURE_26_825_COMPACT_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      "current Browser unsupported-service recovery contract failed",
    );
    expect(electronContract).toContain(
      "Electron current 26.825 Browser failure contract failed",
    );
    expect(appSource).toContain(
      'scenarioId === "current-browser-26-825-failure"',
    );
    expect(appStyles).toContain(
      '[data-scenario="current-browser-26-825-failure"]',
    );
  });

  it("gates the runtime-observed 26.825 project and run-location controls", () => {
    for (const scene of [
      "workspace-context-current-26-825-ready",
      "workspace-context-current-26-825-project-menu",
      "workspace-context-current-26-825-project-menu-compact",
      "workspace-context-current-26-825-environment-menu",
      "workspace-context-current-26-825-new-worktree",
      "workspace-context-current-26-825-environment-picker",
      "workspace-context-current-26-825-worktree-menu",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_READY_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_PROJECT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_PROJECT_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_RUN_LOCATION_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_NEW_WORKTREE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_ENVIRONMENT_PICKER_REFERENCE",
      "CODEX_UI_KIT_CURRENT_CONTEXT_26_825_WORKTREE_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      "workspace project dialog failed",
    );
    expect(cdpContract).toContain(
      "Search codex-ui-kit branches",
    );
    expect(electronContract).toContain(
      'id: "electron-workspace-context-current-26-825"',
    );
    expect(electronContract).toContain(
      'id: "electron-workspace-context-current-26-825-compact"',
    );
    expect(appSource).toContain("currentContext26825Replay");
    expect(appSource).toContain(
      'placeholder={`Search ${workspaceProject?.label ?? "project"} branches`}',
    );
    expect(appStyles).toContain(
      ".demo-workspace-context-menu--current-26-825",
    );
    expect(appStyles).toContain("backdrop-filter: blur(8px)");
  });

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

  it("removes host scrollbar preferences from Markdown table captures", () => {
    expect(contract).toContain(
      ".codex-ui-markdown__table-scroll,\n          .codex-ui-markdown-table-preview__surface",
    );
    expect(contract).toContain(
      ".codex-ui-markdown__table-scroll::-webkit-scrollbar,\n          .codex-ui-markdown-table-preview__surface::-webkit-scrollbar",
    );
    expect(contract).toContain("scrollbar-width: none");
    expect(contract).toContain("display: none");
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

  it("keeps workspace-frame diagnostics independent from sidebar status", () => {
    const workspaceFrameComparison = contract.slice(
      contract.indexOf("async function compareCurrentBuildWorkspaceFrame"),
      contract.indexOf("const regionalFailures"),
    );

    expect(workspaceFrameComparison).toContain(
      "current-build workspace frame pixel ratio",
    );
    expect(workspaceFrameComparison).not.toContain("${status}");
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
      'initialSelection.frame?.startsWith("sidebar-current") ||',
    );
    expect(appSource).toContain("!initialSelection.capture");
    expect(appSource).toContain(
      "data-sidebar-current={currentSidebarComposition || undefined}",
    );
    expect(appSource).toContain(
      'aria-label="View activity, needs attention"',
    );
    expect(appStyles).toContain(".demo-root[data-sidebar-current]");
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_COLLAPSED_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_MENU_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_SUBMENU_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_HELP_MENU_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_COMPACT_PINNED_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_ACTIVE_STATUS_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_WAITING_STATUS_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_UNREAD_STATUS_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_LOADING_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_ERROR_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_RESTORED_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_EMPTY_COLLECTION_REFERENCE",
      "CODEX_UI_KIT_CURRENT_SIDEBAR_SHOW_MORE_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    for (const scene of [
      "current-sidebar-project-collapsed",
      "current-sidebar-project-menu",
      "current-sidebar-project-section-submenu",
      "current-sidebar-help-menu",
      "current-sidebar-account-menu",
      "current-sidebar-account-menu-light",
      "current-sidebar-account-menu-compact",
      "current-sidebar-account-menu-light-compact",
      "current-sidebar-compact-pinned",
      "current-sidebar-status-lifecycle",
      "current-sidebar-collection-empty",
      "current-sidebar-collection-loading",
      "current-sidebar-collection-long-list",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    expect(cdpContract).toContain(
      'scene.id === "current-sidebar-collection-empty"',
    );
    expect(cdpContract).toContain(
      'scene.id === "current-sidebar-collection-loading"',
    );
    expect(cdpContract).toContain(
      'scene.id === "current-sidebar-collection-long-list"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-sidebar-collection-empty"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-sidebar-collection-loading"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-sidebar-collection-long-list"',
    );
    expect(contract).toContain(
      "expectedActualPosition: { left: 211, top: 313 }",
    );
    expect(contract).toContain(
      "expectedActualPosition: { left: 235, top: 502 }",
    );
    expect(contract).toContain(
      "expectedActualPosition: { left: 9, top: expectedTop }",
    );
    expect(contract).toContain("const expectedTop = compact ? 447 : 587");
    expect(contract).toContain("width: 306");
    expect(contract).toContain("defaultMaximumRatio: 0.008");
    expect(appSource).toMatch(
      /currentHomeFrame \|\|[\s\S]{0,220}\? 322\.90625/,
    );
    expect(cdpContract).toContain(
      'helpMenuContract.heading !== "What\'s new"',
    );
    expect(electronContract).toContain(
      'helpMenuStructure.separatorCount !== 1',
    );
    expect(cdpContract).toContain(
      'accountMenuContract.imageCount !== 1',
    );
    expect(electronContract).toContain(
      'accountMenuContract.separatorCount !== 0',
    );
    expect(cdpContract).toContain(
      'scene.id.startsWith("current-sidebar-account-menu")',
    );
    expect(electronContract).toContain(
      'id: "electron-current-sidebar-account-menu-light-compact"',
    );
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
      "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_GOAL_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_PLAN_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      "current 26.820 Composer mode pixel ratio",
    );
    expect(contract).toContain(
      'scene.id === "composer-resources-menu" ? 0.008 : 0.005',
    );
    expect(contract).toContain(
      "current-build Composer lifecycle pixel ratio",
    );
  });

  it("gates current project options across wide and compact listboxes", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_WORKSPACE_PROJECT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_WORKSPACE_PROJECT_COMPACT_REFERENCE",
    );
    expect(contract).toContain("height: 209");
    expect(contract).toContain(
      "current-build project list pixel ratio",
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

  it("keeps current approval region artifacts distinct and current", () => {
    expect(
      contract.match(/sceneId: `\$\{scene\.id\}\.region`/g),
    ).toHaveLength(3);
    expect(contract).toContain("await rm(diffPath, { force: true })");
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
    expect(electronContract).toContain("Electron theme pointer contract failed");
    expect(electronContract).toContain(
      'themeControl.selectOption("light")',
    );
    expect(electronContract).toContain(
      'themeControl.selectOption("dark")',
    );
    expect(electronContract).toContain(
      "Electron unsupported route theme contract failed",
    );
    expect(electronContract).toContain(
      "Electron light project overlay contract failed",
    );
    expect(electronContract).toContain(
      "Electron light environment overlay contract failed",
    );
    expect(electronContract).toContain(
      "Electron light worktree overlay contract failed",
    );
    expect(electronContract).toContain(
      "Electron native System theme contract failed",
    );
    expect(electronContract).toContain(
      "Electron light shell status contract failed",
    );
    expect(electronHarness).toContain("CODEX_DEMO_NATIVE_THEME_SOURCE");
    expect(electronMain).toContain("!nativeTheme.shouldUseDarkColors");
    expect(appSource).toContain("const themeAvailable = isDemoThemeView(view)");
    expect(appSource).toContain(
      'const appliedTheme = themeAvailable ? theme : "dark"',
    );
    expect(appSource).toContain("data-theme={appliedTheme}");
    expect(appSource).toContain(
      "!initialSelection.capture && themeAvailable",
    );
    expect(appStyles).toContain(
      ':root[data-theme="light"] .demo-current-build-icon',
    );
    expect(appStyles).toContain(
      "background: var(--demo-shell-overlay)",
    );
    expect(appStyles).toContain(
      "color: var(--demo-shell-overlay-text)",
    );
    expect(appStyles).toContain("-webkit-app-region: no-drag");
    expect(appStyles).toContain(
      "color: var(--demo-shell-success-text) !important",
    );
  });

  it("gates the current home across theme and compact states", () => {
    expect(electronHarness).toContain('id: "current-dark-shell"');
    expect(electronHarness).toContain('id: "current-light-shell"');
    expect(electronHarness).toContain('id: "current-dark-shell-compact"');
    expect(electronHarness).toContain('id: "current-light-shell-compact"');
    expect(electronHarness).toContain('theme: "dark"');
    expect(electronHarness).toContain("currentSidebar: true");
    expect(cdpContract).toContain(
      'scene.id === "current-dark-shell"',
    );
    expect(cdpContract).toContain(
      'darkShell.newChatCurrent !== "page"',
    );
    expect(cdpContract).toContain(
      'darkShell.back.cursor !== "default"',
    );
    expect(cdpContract).toContain(
      'darkShell.forward.cursor !== "default"',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_DARK_SHELL_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_LIGHT_SHELL_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_DARK_SHELL_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_LIGHT_SHELL_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      '"current-dark-shell": currentDarkShellReference',
    );
    expect(contract).toContain(
      '"current-light-shell-compact": currentLightShellCompactReference',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_HOME_MAIN_MAX_DIFF_RATIO",
    );
    expect(contract).toContain("left: 323, top: 46, width: 857");
    expect(contract).toContain("left: 323, top: 46, width: 397");
    expect(contract).toContain("0.05");
    expect(cdpContract).toContain(
      'scene.id === "current-dark-shell-compact"',
    );
    expect(cdpContract).toContain(
      'scene.id === "current-light-shell-compact"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-home-dark-wide"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-home-light-compact"',
    );
    expect(appSource).toContain(
      'view === "workspace" &&',
    );
    expect(appSource).toContain("!workspacePersistenceFrame &&");
    expect(appSource).toContain("!projectIndexChat");
    expect(appSource).toContain(
      "currentWorkspacePersistenceFrame(activeFrame)",
    );
  });

  it("gates the current basic thread without ownership masks", () => {
    expect(electronHarness).toContain('id: "current-basic-thread"');
    expect(electronHarness).toContain('scenario: "current-basic-message"');
    expect(cdpContract).toContain(
      'scene.id === "current-basic-thread"',
    );
    expect(cdpContract).toContain(
      'basicThread.assistantText !== "CURRENT BASIC MESSAGE."',
    );
    expect(electronContract).toContain(
      'id: "electron-current-basic-thread"',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_THREAD_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_THREAD_MAX_DIFF_RATIO",
    );
    expect(contract).toContain("defaultMaximumRatio: 0.005");
    expect(contract).toContain("masks: []");
    expect(appSource).toContain(
      "isAnyCurrentBasicMessageReplay ||\n                isCurrentAttachment26825Replay ||\n                isCurrentCitations26825Replay ||\n                isCurrentBrowser26825Replay ||\n                isCurrentMarkdown26818Replay",
    );
    expect(appSource).toContain(
      "!isAnyCurrentBasicMessageReplay &&\n                      !isCurrentAttachment26825Replay &&\n                      !isCurrentCitations26825Replay &&\n                      !isCurrentBrowser26825Replay &&\n                      !isCurrentMarkdown26818Replay",
    );
  });

  it("gates current inline citations and the Sources workspace", () => {
    for (const sceneId of [
      "current-citations-26-825-wide",
      "current-citations-26-825-compact",
      "current-citations-26-825-summary-wide",
      "current-citations-26-825-summary-compact",
      "current-citations-26-825-sources-wide",
      "current-citations-26-825-sources-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${sceneId}"`);
    }
    expect(cdpContract).toContain('"current-citations-26-825"');
    expect(electronContract).toContain(
      'id: "electron-current-citations-26-825-sources-compact"',
    );
    expect(appSource).toContain("data-inline-mention-interactive");
    expect(appSource).toContain("Close Sources tab");
    expect(appSource).toContain("currentCitationQueries");
  });

  it("gates the current 26.825 basic thread across its responsive boundary", () => {
    for (const sceneId of [
      "current-basic-26-825-wide",
      "current-basic-26-825-boundary-open",
      "current-basic-26-825-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${sceneId}"`);
      expect(cdpContract).toContain(`"${sceneId}"`);
    }
    for (const sceneId of [
      "electron-current-basic-26-825-wide",
      "electron-current-basic-26-825-boundary-open",
      "electron-current-basic-26-825-compact",
    ]) {
      expect(electronContract).toContain(`id: "${sceneId}"`);
    }
    expect(electronHarness).toContain(
      'scenario: "current-basic-message-26-825"',
    );
    expect(electronHarness).toContain(
      "windowSize: { height: 680, width: 721 }",
    );
    expect(electronHarness).toContain(
      "windowSize: { height: 680, width: 720 }",
    );
    expect(cdpContract).toContain(
      'basicThread.assistantText !== "CURRENT BASIC MESSAGE"',
    );
    expect(cdpContract).toContain(
      'sidebarLabel: "Show sidebar"',
    );
    expect(electronContract).toContain(
      'basicThread.assistantText !== "CURRENT BASIC MESSAGE"',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_WIDE_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_BOUNDARY_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_COMPACT_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_THREAD_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_COMPOSER_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_HEADER_MAX_DIFF_RATIO",
    );
    expect(appSource).toContain(
      "isCurrentBasicMessageReplay || isCurrentBasic26825Replay",
    );
  });

  it("gates runtime-observed 26.818 Markdown at wide and compact widths", () => {
    expect(electronHarness).toContain('id: "markdown-current-26-818"');
    expect(electronHarness).toContain(
      'id: "markdown-current-26-818-compact"',
    );
    expect(cdpContract).toContain(
      'scene.id === "markdown-current-26-818"',
    );
    expect(cdpContract).toContain(
      'scene.id === "markdown-current-26-818-compact"',
    );
    expect(electronContract).toContain(
      'id: "electron-markdown-current-26-818"',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_COMPACT_REFERENCE",
    );
    expect(contract).toContain("current 26.818 Markdown pixel ratio");
    expect(appStyles).toContain(
      '.demo-root[data-scenario="markdown-current-26-818"]',
    );
  });

  it("gates current 26.820 Markdown math, media, and fallbacks at wide and compact widths", () => {
    expect(electronHarness).toContain(
      'id: "markdown-current-26-820-media"',
    );
    expect(electronHarness).toContain(
      'id: "markdown-current-26-820-media-compact"',
    );
    expect(cdpContract).toContain(
      'scene.id === "markdown-current-26-820-media"',
    );
    expect(cdpContract).toContain(
      'scene.id === "markdown-current-26-820-media-compact"',
    );
    expect(cdpContract).toContain(
      "current 26.820 Markdown media contract failed",
    );
    expect(electronContract).toContain(
      'id: "electron-markdown-current-26-820-media"',
    );
    expect(electronContract).toContain(
      'id: "electron-markdown-current-26-820-media-compact"',
    );
    expect(electronContract).toContain(
      "current 26.820 Markdown media Electron contract failed",
    );
    expect(appStyles).toContain(
      '.demo-root[data-scenario="markdown-current-26-820-media"]',
    );
    expect(appSource).toContain(
      "isCurrentMarkdown26820MediaReplay ||\n                    isCurrentMarkdown26825MediaReplay",
    );
  });

  it("gates current 26.825 Markdown loaded, unavailable, and immersive preview media", () => {
    for (const scene of [
      "markdown-current-26-825-media-loaded",
      "markdown-current-26-825-media-loaded-compact",
      "markdown-current-26-825-media-preview",
      "markdown-current-26-825-media-unavailable",
      "markdown-current-26-825-media-unavailable-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const scene of [
      "electron-markdown-current-26-825-media-loaded",
      "electron-markdown-current-26-825-media-loaded-compact",
      "electron-markdown-current-26-825-media-preview",
      "electron-markdown-current-26-825-media-unavailable",
      "electron-markdown-current-26-825-media-unavailable-compact",
    ]) {
      expect(electronContract).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MEDIA_LOADED_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MEDIA_LOADED_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MEDIA_PREVIEW_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MEDIA_UNAVAILABLE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MEDIA_UNAVAILABLE_COMPACT_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      'scene.scenario === "markdown-current-26-825-media"',
    );
    expect(cdpContract).toContain(
      "current 26.825 Markdown loaded-media contract failed",
    );
    expect(electronContract).toContain(
      "current 26.825 Markdown media preview Electron contract failed",
    );
    expect(appSource).toContain(
      "expandWideMedia={isCurrentMarkdown26825MediaReplay}",
    );
    expect(appSource).toContain("imagePreviewSourceResolver={");
    expect(appStyles).toContain(
      '[data-scenario="markdown-current-26-825-media"]',
    );
  });

  it("gates current rich Markdown streaming mutation regions", () => {
    for (const scene of [
      "markdown-stream-fence",
      "markdown-stream-table",
      "markdown-stream-large",
      "markdown-stream-tail",
      "markdown-stream-complete",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_FENCE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_TABLE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_LONG_REFERENCE",
      "CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_COMPLETE_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(contract).toContain("current rich Markdown pixel ratio");
    expect(cdpContract).toContain("streaming Markdown contract failed");
    expect(electronContract).toContain(
      'id: "electron-markdown-streaming-large"',
    );
    expect(appSource).toContain("isCurrentRichMarkdownStreamingReplay");
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

  it("gates current 26.818 command failure and interruption regions without masks", () => {
    expect(electronHarness).toContain(
      'id: "current-command-failure-expanded"',
    );
    expect(electronHarness).toContain(
      'id: "current-command-interruption-recovered"',
    );
    expect(cdpContract).toContain(
      'scene.id === "current-command-failure-expanded"',
    );
    expect(cdpContract).toContain(
      'scene.id === "current-command-interruption-recovered"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-command-failure-compact"',
    );
    expect(electronContract).toContain(
      'id: "electron-current-command-interruption-compact"',
    );
    expect(electronContract).toContain(
      'windowSize: { height: 680, width: 720 }',
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_818_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_26_818_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_818_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_26_818_MAX_DIFF_RATIO",
    );
    expect(contract).toContain("defaultMaximumRatio: 0.05");
    expect(contract).toContain("defaultMaximumRatio: 0.045");
    expect(contract.match(/masks: \[\]/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("gates runtime-observed command success, failure, and interruption without output cards", () => {
    for (const scene of [
      "command-current-26-820-success-running",
      "command-current-26-820-success-completed",
      "command-current-26-820-success-compact",
      "command-current-26-825-failure-completed",
      "command-current-26-825-failure-recovered",
      "command-current-26-825-failure-compact",
      "command-current-26-825-interruption-running",
      "command-current-26-825-interruption-stopped-immediate",
      "command-current-26-825-interruption-recovered",
      "command-current-26-825-interruption-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_COMMAND_SUCCESS_26_820_REFERENCE",
      "CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_825_REFERENCE",
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_STOPPED_26_825_REFERENCE",
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_RECOVERY_26_825_COMPACT_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      'scene.scenario.startsWith("command-current-26-8")',
    );
    expect(cdpContract).toContain(
      "current command evidence contract failed",
    );
    expect(electronContract).toContain(
      "currentCommandElectronCases",
    );
    expect(electronContract).toContain(
      "Electron current command contract drifted",
    );
    expect(appSource).toContain("isCurrentCommandReplay");
    expect(appSource).toContain("hideRawCommand");
    expect(appStyles).toContain(
      '[data-scenario^="command-current-26-8"]',
    );
    expect(contract).toContain(
      "current 26.820 command success region pixel ratio",
    );
    expect(contract).toContain(
      "current 26.825 stopped-command region pixel ratio",
    );
  });

  it("gates the runtime-observed 26.825 uuidgen command at wide and compact widths", () => {
    for (const scene of [
      "command-current-26-825-success-completed",
      "command-current-26-825-success-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    expect(cdpContract).toContain(
      'const current26825 = scene.scenario.includes("26-825")',
    );
    expect(electronContract).toContain(
      'scenario: "command-current-26-825-success"',
    );
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_ACTIVITY_MAX_DIFF_RATIO",
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_COMPOSER_MAX_DIFF_RATIO",
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_HEADER_MAX_DIFF_RATIO",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(contract).toContain(
      "current 26.825 command ${name} pixel ratio",
    );
    expect(appSource).toContain("isCurrentCommand26825SuccessReplay");
    expect(appSource).toContain(
      'command.id.startsWith("command-current-26-8")',
    );
  });

  it("gates the runtime-observed 26.825 Review card and workspace at wide and compact widths", () => {
    for (const scene of [
      "current-review-26-825-file-card",
      "current-review-26-825-file-card-compact",
      "current-review-26-825-files",
      "current-review-26-825-files-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    expect(cdpContract).toContain(
      'scene.scenario === "current-review-26-825-files"',
    );
    expect(cdpContract).toContain(
      "current 26.825 Review evidence contract failed",
    );
    expect(electronContract).toContain(
      "currentReview26825ElectronCases",
    );
    expect(electronContract).toContain(
      "Electron current 26.825 Review contract drifted",
    );
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_WORKSPACE_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_WORKSPACE_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_MAX_DIFF_RATIO",
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_PANEL_MAX_DIFF_RATIO",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(contract).toContain(
      "current 26.825 Review ${name} pixel ratio",
    );
    expect(appSource).toContain("isCurrentReview26825FilesReplay");
    expect(appSource).toContain('name="review-card-files"');
    expect(appSource).toContain('name="review-undo"');
    expect(appStyles).toContain(
      '[data-scenario="current-review-26-825-files"]',
    );
  });

  it("gates the runtime-observed 26.825 mixed attachment lifecycle", () => {
    for (const scene of [
      "attachment-current-26-825-post-picker",
      "attachment-current-26-825-post-picker-compact",
      "attachment-current-26-825-preview",
      "attachment-current-26-825-preview-compact",
      "attachment-current-26-825-completed",
      "attachment-current-26-825-completed-compact",
    ]) {
      expect(electronHarness).toContain(`id: "${scene}"`);
    }
    for (const reference of [
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_PICKER_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_PICKER_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_PREVIEW_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_PREVIEW_COMPACT_REFERENCE",
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_COMPLETED_WIDE_REFERENCE",
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_26_825_COMPLETED_COMPACT_REFERENCE",
    ]) {
      expect(contract).toContain(reference);
    }
    expect(cdpContract).toContain(
      "current attachment completion contract failed",
    );
    expect(electronContract).toContain(
      "Electron current attachment completion failed",
    );
    expect(contract).toContain(
      "current 26.825 attachment completion product pixel ratios",
    );
    expect(appSource).toContain(
      "demo-current-attachment-26-825-summary-dock",
    );
    expect(appStyles).toContain(
      '[data-frame="attachment-current-26-825-completed"]',
    );
  });

  it("gates the current 26.825 manual context-compaction running frame", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMPACTION_26_825_RUNNING_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_CURRENT_COMPACTION_26_825_MAX_DIFF_RATIO",
    );
    expect(contract).toContain(
      'scene.id === "context-compaction-running"',
    );
    expect(contract).toContain(
      "current 26.825 context-compaction pixel ratio",
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
