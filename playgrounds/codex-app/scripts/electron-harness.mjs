import electronPath from "electron";
import { _electron as electron } from "playwright-core";

// These six dense scenes use the system font to match Codex. Their limits are
// calibrated from uploaded macOS 15 runner artifacts against macOS 26 baselines;
// CDP and Electron contracts continue to gate their exact text and geometry.
const crossMacOsSystemFontRatios = {
  composerQueuePaused: 0.025,
  mcpToolCalls: 0.06,
  prCommentFailed: 0.022,
  prCompactDetail: 0.023,
  prDetail: 0.018,
  prReviewSubmitting: 0.025,
};

export const visualScenes = [
  {
    frame: "workspace-ready",
    id: "workspace-ready",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "workspace-ready",
    id: "current-dark-shell",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "projects-index-ready",
    id: "projects-index-ready",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "dark",
    view: "projects",
  },
  {
    currentSidebar: true,
    frame: "projects-index-expanded",
    id: "projects-index-expanded",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "dark",
    view: "projects",
  },
  {
    currentSidebar: true,
    frame: "projects-index-ready",
    id: "projects-index-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "projects",
    windowSize: { height: 600, width: 600 },
  },
  {
    currentSidebar: true,
    frame: "workspace-ready",
    id: "current-light-shell",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    frame: "workspace-no-project",
    id: "workspace-no-project",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-new-worktree",
    id: "workspace-new-worktree",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-environment-picker",
    id: "workspace-environment-picker",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-environments-unavailable",
    id: "workspace-environments-unavailable",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-git-settings",
    id: "workspace-git-settings",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-git-settings",
    id: "workspace-git-settings-light",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    frame: "workspace-git-settings-compact",
    id: "workspace-git-settings-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-appearance-settings",
    id: "workspace-appearance-settings",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-appearance-settings",
    id: "workspace-appearance-settings-light",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    frame: "workspace-appearance-settings-compact",
    id: "workspace-appearance-settings-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-appearance-settings-preferences",
    id: "workspace-appearance-settings-preferences",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-general-settings",
    id: "workspace-general-settings",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-general-settings",
    id: "workspace-general-settings-light",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    frame: "workspace-general-settings-compact",
    id: "workspace-general-settings-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-general-settings-hotkey",
    id: "workspace-general-settings-hotkey",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-general-settings-hotkey",
    id: "workspace-general-settings-hotkey-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-general-settings-bottom",
    id: "workspace-general-settings-bottom",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-hooks-settings",
    id: "workspace-hooks-settings",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-hooks-settings",
    id: "workspace-hooks-settings-light",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    frame: "workspace-hooks-settings-compact",
    id: "workspace-hooks-settings-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-hooks-settings-configured",
    id: "workspace-hooks-settings-configured",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-hooks-settings-loading",
    id: "workspace-hooks-settings-loading",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-hooks-settings-error",
    id: "workspace-hooks-settings-error",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-code-review-settings",
    id: "workspace-code-review-settings",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-code-review-settings-compact",
    id: "workspace-code-review-settings-compact",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-compact-ready",
    id: "workspace-compact-ready",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-project-menu",
    id: "workspace-project-menu",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-environment-menu",
    id: "workspace-environment-menu",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-environment",
    id: "workspace-environment",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-worktree-menu",
    id: "workspace-worktree-menu",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-branch-create",
    id: "workspace-branch-create",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-branch-create-error",
    id: "workspace-branch-create-error",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-branch-created",
    id: "workspace-branch-created",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "workspace-repairing",
    id: "workspace-repairing",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "workspace-persisted-thread",
    id: "workspace-persisted-thread",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "workspace-directory-missing",
    id: "workspace-directory-missing",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "workspace",
  },
  {
    frame: "conversation-thread-ready",
    id: "conversation-thread-ready",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-multiline",
    id: "composer-multiline",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-goal",
    id: "composer-goal",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-plan",
    id: "composer-plan",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-permissions-menu",
    id: "composer-permissions-menu",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-resources-menu",
    id: "composer-resources-menu",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-running",
    id: "composer-running",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-queued",
    id: "composer-queued",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-auto-continued",
    id: "composer-auto-continued",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-queue-paused",
    id: "composer-queue-paused",
    maxPixelRatio: crossMacOsSystemFontRatios.composerQueuePaused,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-disabled",
    id: "composer-disabled",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "attachment-ready",
    id: "attachment-current-ready",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "attachment-multi-ready",
    id: "attachment-multi-ready",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "attachment-uploading",
    id: "attachment-uploading",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "attachment-upload-error",
    id: "attachment-upload-error",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "attachment-preview-error",
    id: "attachment-preview-error",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "attachment-multi-compact",
    id: "attachment-multi-compact",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
    windowSize: { height: 680, width: 820 },
  },
  {
    frame: "attachment-completed",
    id: "attachment-current-completed",
    maxPixelRatio: 0.0225,
    scenario: "attachment-lifecycle",
  },
  {
    frame: "thread-scroll-away",
    id: "thread-scroll-away",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
    scrollTop: 0,
  },
  {
    frame: "thread-windowed",
    id: "thread-windowed",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "conversation-completed",
    id: "conversation-completed",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    currentSidebar: true,
    frame: "current-basic-completed",
    id: "current-basic-thread",
    maxPixelRatio: 0.0225,
    scenario: "current-basic-message",
    theme: "dark",
  },
  {
    frame: "sidebar-current",
    id: "current-sidebar",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
  },
  {
    frame: "sidebar-current",
    id: "current-sidebar-recents",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarSectionKind: "threads",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-status-lifecycle",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "status-lifecycle",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-collapsed",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "project-collapsed",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-menu",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "project-menu",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-help-menu",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "help-menu",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-account-menu",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "account-menu",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-compact-pinned",
    maxPixelRatio: 0.0225,
    scenario: "streaming-recovery",
    sidebarState: "compact-pinned",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "streaming",
    id: "streaming",
    scenario: "streaming-recovery",
  },
  {
    frame: "retrying",
    id: "retrying",
    scenario: "streaming-recovery",
  },
  {
    frame: "retrying-progress",
    id: "retrying-progress",
    scenario: "streaming-recovery",
  },
  {
    frame: "recovered",
    id: "recovered",
    scenario: "streaming-recovery",
  },
  {
    frame: "transport-failed",
    id: "transport-failed",
    scenario: "streaming-recovery",
  },
  {
    frame: "transport-retried",
    id: "transport-retried",
    scenario: "streaming-recovery",
  },
  {
    frame: "markdown-complete",
    id: "markdown-complete",
    maxPixelRatio: 0.01,
    scenario: "markdown",
  },
  {
    frame: "markdown-table-complete",
    id: "markdown-table-actions-hover",
    markdownTableState: "hover",
    maxPixelRatio: 0.01,
    scenario: "markdown-table-actions",
  },
  {
    frame: "markdown-table-complete",
    id: "markdown-table-actions-narrow",
    markdownTableState: "hover",
    maxPixelRatio: 0.01,
    scenario: "markdown-table-actions",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "markdown-table-complete",
    id: "markdown-table-actions-preview",
    markdownTableState: "preview",
    maxPixelRatio: 0.01,
    scenario: "markdown-table-actions",
  },
  {
    frame: "markdown-stream-fence",
    id: "markdown-stream-fence",
    maxPixelRatio: 0.01,
    scenario: "markdown-streaming-large",
  },
  {
    frame: "markdown-stream-table",
    id: "markdown-stream-table",
    maxPixelRatio: 0.01,
    scenario: "markdown-streaming-large",
  },
  {
    frame: "markdown-stream-large",
    id: "markdown-stream-large",
    maxPixelRatio: 0.01,
    scenario: "markdown-streaming-large",
  },
  {
    frame: "markdown-stream-complete",
    id: "markdown-stream-complete",
    maxPixelRatio: 0.01,
    scenario: "markdown-streaming-large",
  },
  {
    callLabels: ["Search OpenAI docs"],
    frame: "mcp-running",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-running",
    maxPixelRatio: 0.01,
    scenario: "mcp-tool-call",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Search OpenAI docs"],
    currentSidebar: true,
    frame: "mcp-current-running",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-current-running",
    maxPixelRatio: 0.01,
    scenario: "mcp-current-success",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Search OpenAI docs", "Fetch OpenAI doc"],
    currentSidebar: true,
    frame: "mcp-current-success",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-current-success",
    maxPixelRatio: crossMacOsSystemFontRatios.mcpToolCalls,
    scenario: "mcp-current-success",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 25s",
    toolCount: 2,
  },
  {
    currentSidebar: true,
    frame: "current-mixed-research-running",
    id: "current-mixed-research-running",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    timelineLabel: "Working",
    webSearchCount: 1,
    webSearchStatus: "running",
  },
  {
    browserStepCount: 2,
    currentSidebar: true,
    frame: "current-mixed-research-completed",
    id: "current-mixed-research-completed",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    timelineLabel: "Worked for 22s",
    webSearchCount: 1,
    webSearchStatus: "completed",
  },
  {
    callLabels: ["Search OpenAI docs"],
    currentSidebar: true,
    frame: "current-mixed-mcp-running",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "current-mixed-mcp-running",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Search OpenAI docs", "Fetch OpenAI doc"],
    currentSidebar: true,
    frame: "current-mixed-mcp-completed",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "current-mixed-mcp-completed",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    timelineLabel: "Worked for 34s",
    toolCount: 2,
  },
  {
    approvalDecision: "pending",
    currentSidebar: true,
    frame: "current-mixed-approval-pending",
    id: "current-mixed-approval-pending",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
  },
  {
    currentSidebar: true,
    fileCount: 1,
    frame: "current-mixed-review-open",
    id: "current-mixed-review-open",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
  },
  {
    currentSidebar: true,
    frame: "current-mixed-subagent-running",
    id: "current-mixed-subagent-running",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    subagentStatus: "active",
    timelineLabel: "Working for 14s",
  },
  {
    currentSidebar: true,
    frame: "current-mixed-completed",
    id: "current-mixed-completed",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    subagentStatus: "done",
  },
  {
    currentSidebar: true,
    frame: "current-mixed-completed",
    id: "current-mixed-completed-compact",
    maxPixelRatio: 0.01,
    scenario: "current-mixed-tool-thread",
    subagentStatus: "done",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "mcp-current-integration-unavailable",
    id: "mcp-current-integration-unavailable",
    maxPixelRatio: 0.0225,
    scenario: "mcp-current-integration-recovery",
    timelineLabel: "Worked for 16s",
  },
  {
    callLabels: ["Search OpenAI docs"],
    currentSidebar: true,
    frame: "mcp-current-integration-recovering",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-current-integration-recovering",
    maxPixelRatio: 0.01,
    scenario: "mcp-current-integration-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Search OpenAI docs", "Fetch OpenAI doc"],
    currentSidebar: true,
    frame: "mcp-current-integration-recovered",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-current-integration-recovered",
    maxPixelRatio: crossMacOsSystemFontRatios.mcpToolCalls,
    scenario: "mcp-current-integration-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 34s",
    toolCount: 2,
  },
  {
    callLabels: ["Search OpenAI docs", "Fetch OpenAI doc"],
    currentSidebar: true,
    frame: "mcp-current-integration-recovered",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-current-integration-recovered-compact",
    maxPixelRatio: crossMacOsSystemFontRatios.mcpToolCalls,
    scenario: "mcp-current-integration-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 34s",
    toolCount: 2,
    windowSize: { height: 680, width: 720 },
  },
  {
    callLabels: ["Search OpenAI docs", "Fetch OpenAI doc"],
    frame: "mcp-tool-calls",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-tool-calls",
    maxPixelRatio: crossMacOsSystemFontRatios.mcpToolCalls,
    scenario: "mcp-tool-call",
    scrollTop: 0,
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 31s",
    toolCount: 2,
  },
  {
    errorOutput: "Invalid URL",
    frame: "mcp-recovery-failed",
    id: "mcp-recovery-failed",
    maxPixelRatio: 0.01,
    scenario: "mcp-recovery-mixed-thread",
    timelineLabel: "Working",
  },
  {
    callLabels: ["Fetch OpenAI doc"],
    currentSidebar: true,
    errorOutput: "Invalid URL",
    frame: "mcp-current-recovery-failed",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-current-recovery-failed",
    maxPixelRatio: 0.01,
    scenario: "mcp-current-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Fetch OpenAI doc", "Search OpenAI docs"],
    currentSidebar: true,
    frame: "mcp-current-recovery-retrying",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-current-recovery-retrying",
    maxPixelRatio: 0.01,
    scenario: "mcp-current-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 2,
  },
  {
    callLabels: [
      "Fetch OpenAI doc",
      "Search OpenAI docs",
      "Fetch OpenAI doc",
    ],
    currentSidebar: true,
    errorOutput: "Invalid URL",
    frame: "mcp-current-recovery-completed",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-current-recovery-completed",
    maxPixelRatio: 0.0225,
    scenario: "mcp-current-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 18s",
    toolCount: 3,
  },
  {
    callLabels: [
      "Fetch OpenAI doc",
      "Search OpenAI docs",
      "Fetch OpenAI doc",
    ],
    currentSidebar: true,
    errorOutput: "Invalid URL",
    frame: "mcp-current-recovery-completed",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-current-recovery-compact",
    maxPixelRatio: 0.0225,
    scenario: "mcp-current-recovery",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 18s",
    toolCount: 3,
    windowSize: { height: 680, width: 720 },
  },
  {
    callLabels: ["Search OpenAI docs"],
    frame: "mcp-recovery-retrying",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-recovery-retrying",
    maxPixelRatio: 0.01,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: [
      "Search OpenAI docs",
      "Search OpenAI docs",
      "Search OpenAI docs",
      "Fetch OpenAI doc",
    ],
    errorOutput: "Invalid URL",
    frame: "mcp-recovery-completed",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-recovery-completed",
    maxPixelRatio: 0.0225,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 51s",
    toolCount: 4,
  },
  {
    fileCount: 1,
    frame: "mixed-review-open",
    id: "mixed-thread-review",
    maxPixelRatio: 0.013,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["approval", "command", "fileChange", "reviewPanel"],
  },
  {
    frame: "command-interruption-running",
    id: "command-interruption-running",
    maxPixelRatio: 0.0225,
    scenario: "interruption",
    surfaces: ["command"],
  },
  {
    frame: "command-interruption-stopping",
    id: "command-interruption-stopping",
    maxPixelRatio: 0.0225,
    scenario: "interruption",
    surfaces: ["command"],
  },
  {
    frame: "command-interruption-settled",
    id: "command-interruption-settled",
    maxPixelRatio: 0.0225,
    scenario: "interruption",
    surfaces: ["command"],
  },
  {
    frame: "command-interruption-recovered",
    id: "command-interruption-recovered",
    maxPixelRatio: 0.0225,
    scenario: "interruption",
    surfaces: ["command"],
  },
  {
    frame: "context-compaction-command-menu",
    id: "context-compaction-command-menu",
    scenario: "compaction",
  },
  {
    frame: "context-compaction-running",
    id: "context-compaction-running",
    maxPixelRatio: 0.0225,
    scenario: "compaction",
  },
  {
    frame: "context-compaction-completed",
    id: "context-compaction-completed",
    maxPixelRatio: 0.0225,
    scenario: "compaction",
  },
  {
    frame: "context-compaction-recovered",
    id: "context-compaction-recovered",
    maxPixelRatio: 0.0225,
    scenario: "compaction",
  },
  {
    frame: "context-summary-open",
    id: "context-summary-open",
    maxPixelRatio: 0.0225,
    scenario: "context-summary",
  },
  {
    frame: "subagent-current-running",
    id: "subagent-current-running",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-summary-running",
    id: "subagent-current-summary-running",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-panel-running",
    id: "subagent-current-panel-running",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-completed",
    id: "subagent-current-completed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-summary-completed",
    id: "subagent-current-summary-completed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-panel-completed",
    id: "subagent-current-panel-completed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-transcript",
    id: "subagent-current-transcript",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-current-compact-820",
    id: "subagent-current-compact-820",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
    windowSize: { height: 680, width: 820 },
  },
  {
    frame: "subagent-current-compact-720",
    id: "subagent-current-compact-720",
    maxPixelRatio: 0.0225,
    scenario: "subagent-delegation",
    surfaces: ["subagent"],
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "subagent-concurrent-summary-running",
    id: "subagent-concurrent-summary-running",
    maxPixelRatio: 0.0225,
    scenario: "subagent-concurrency",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-concurrent-summary-mixed",
    id: "subagent-concurrent-summary-mixed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-concurrency",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-concurrent-panel-mixed",
    id: "subagent-concurrent-panel-mixed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-concurrency",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-concurrent-panel-completed",
    id: "subagent-concurrent-panel-completed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-concurrency",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-concurrent-transcript-beta",
    id: "subagent-concurrent-transcript-beta",
    maxPixelRatio: 0.0225,
    scenario: "subagent-concurrency",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-nested-panel-running",
    id: "subagent-nested-panel-running",
    maxPixelRatio: 0.0225,
    scenario: "subagent-nested",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-nested-panel-mixed",
    id: "subagent-nested-panel-mixed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-nested",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-nested-panel-completed",
    id: "subagent-nested-panel-completed",
    maxPixelRatio: 0.0225,
    scenario: "subagent-nested",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-nested-transcript-child",
    id: "subagent-nested-transcript-child",
    maxPixelRatio: 0.0225,
    scenario: "subagent-nested",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-recovery-panel-streaming",
    id: "subagent-recovery-panel-streaming",
    maxPixelRatio: 0.0225,
    scenario: "subagent-recovery",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-recovery-panel-terminal",
    id: "subagent-recovery-panel-terminal",
    maxPixelRatio: 0.0225,
    scenario: "subagent-recovery",
    surfaces: ["subagent"],
  },
  {
    frame: "subagent-recovery-transcript-validator",
    id: "subagent-recovery-transcript-validator",
    maxPixelRatio: 0.0225,
    scenario: "subagent-recovery",
    surfaces: ["subagent"],
  },
  {
    frame: "terminal-open",
    id: "background-terminal",
    scenario: "background-terminal",
    surfaces: ["bottomPanel", "command", "terminal"],
  },
  {
    frame: "terminal-running",
    id: "terminal-running",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "command", "terminal", "terminalProcesses"],
  },
  {
    frame: "terminal-failed",
    id: "terminal-failed",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "command", "terminal", "terminalProcesses"],
  },
  {
    frame: "terminal-multi-tab",
    id: "terminal-multi-tab",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "command", "terminal", "terminalProcesses"],
  },
  {
    frame: "terminal-picker",
    id: "terminal-picker",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "command", "terminal", "terminalProcesses"],
  },
  {
    frame: "terminal-closed",
    id: "terminal-closed",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["command", "terminalProcesses"],
  },
  {
    frame: "terminal-multi-tab",
    id: "terminal-compact",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "command", "terminal", "terminalProcesses"],
    windowSize: { height: 680, width: 820 },
  },
  {
    frame: "terminal-current-single",
    id: "terminal-current-single",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-running",
    id: "terminal-current-running",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-completed",
    id: "terminal-current-completed",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-multi",
    id: "terminal-current-multi",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-mismatch",
    id: "terminal-current-mismatch",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-closed",
    id: "terminal-current-closed",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
  },
  {
    frame: "terminal-current-command-exit-7",
    id: "terminal-current-command-exit-7",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
  },
  {
    frame: "terminal-current-reload",
    id: "terminal-current-reload",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminalReload"],
  },
  {
    frame: "terminal-current-background-list",
    id: "terminal-current-background-list",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["backgroundSummary", "terminalProcesses"],
  },
  {
    frame: "terminal-current-background-open",
    id: "terminal-current-background-open",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["backgroundTerminal"],
  },
  {
    frame: "terminal-current-multi",
    id: "terminal-current-compact",
    maxPixelRatio: 0.0225,
    scenario: "terminal-lifecycle",
    surfaces: ["bottomPanel", "terminal"],
    windowSize: { height: 680, width: 820 },
  },
  {
    frame: "command-running",
    id: "command-running",
    scenario: "workspace-workflow",
    surfaces: ["command"],
  },
  {
    frame: "command-output-expanded",
    id: "command-output-expanded",
    maxPixelRatio: 0.0225,
    scenario: "long-command-output",
    surfaces: ["command"],
  },
  {
    frame: "command-failure-output-running",
    id: "command-failure-running",
    maxPixelRatio: 0.0225,
    scenario: "command-failure-recovery",
    surfaces: ["command"],
  },
  {
    frame: "command-failure-completed",
    id: "command-failure-collapsed",
    maxPixelRatio: 0.0225,
    scenario: "command-failure-recovery",
    surfaces: ["command"],
  },
  {
    frame: "command-failure-recovered",
    id: "command-failure-expanded",
    maxPixelRatio: 0.0225,
    scenario: "command-failure-recovery",
    surfaces: ["command"],
  },
  {
    currentSidebar: true,
    frame: "command-failure-recovered",
    id: "current-command-failure-expanded",
    maxPixelRatio: 0.01,
    scenario: "command-failure-recovery",
    sidebarState: "hidden",
    surfaces: ["command"],
    theme: "dark",
  },
  {
    currentSidebar: true,
    frame: "command-interruption-recovered",
    id: "current-command-interruption-recovered",
    maxPixelRatio: 0.01,
    scenario: "interruption",
    sidebarState: "hidden",
    surfaces: ["command"],
    theme: "dark",
  },
  {
    frame: "approval-pending",
    id: "approval-pending",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command"],
  },
  {
    frame: "approval-current-pending",
    id: "approval-current-pending",
    maxPixelRatio: 0.0225,
    scenario: "approval-denied",
    surfaces: ["approval", "command"],
  },
  {
    frame: "approval-current-pending",
    id: "approval-current-options",
    maxPixelRatio: 0.0225,
    scenario: "approval-denied",
    surfaces: ["approval", "command"],
  },
  {
    frame: "approval-current-denied",
    id: "approval-current-denied",
    maxPixelRatio: 0.0225,
    scenario: "approval-denied",
    scrollTop: 72,
  },
  {
    frame: "approval-current-allow-once-pending",
    id: "approval-current-allow-once-pending",
    maxPixelRatio: 0.0225,
    scenario: "approval-allow-once",
    surfaces: ["approval", "command"],
  },
  {
    frame: "approval-current-allow-once-completed",
    id: "approval-current-allow-once-completed",
    maxPixelRatio: 0.0225,
    scenario: "approval-allow-once",
    scrollTop: 72,
  },
  {
    frame: "approval-current-similar-pending",
    id: "approval-current-similar-menu",
    maxPixelRatio: 0.0225,
    scenario: "approval-similar-commands",
    surfaces: ["approval", "command"],
  },
  {
    frame: "approval-current-similar-repeated-completed",
    id: "approval-current-similar-repeated-completed",
    maxPixelRatio: 0.0225,
    scenario: "approval-similar-commands",
  },
  {
    frame: "approval-current-session-pending",
    id: "approval-current-session-menu",
    maxPixelRatio: 0.0225,
    scenario: "approval-for-session",
    surfaces: ["approval", "fileChange"],
  },
  {
    frame: "approval-current-session-repeated-completed",
    id: "approval-current-session-repeated-completed",
    maxPixelRatio: 0.0225,
    scenario: "approval-for-session",
    surfaces: ["fileChange"],
  },
  {
    frame: "approval-review-running",
    id: "approval-review-running",
    maxPixelRatio: 0.0225,
    scenario: "approval-review-timeout",
    surfaces: ["automaticApprovalReview"],
  },
  {
    frame: "approval-review-timeout",
    id: "approval-review-timeout",
    maxPixelRatio: 0.0225,
    scenario: "approval-review-timeout",
    surfaces: ["automaticApprovalReview"],
  },
  {
    frame: "file-changing",
    id: "file-changing",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange"],
  },
  {
    frame: "file-applied",
    id: "file-applied",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange"],
  },
  {
    frame: "review-open",
    id: "review-open",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange", "reviewPanel"],
  },
  {
    frame: "review-open",
    id: "multi-file-review",
    scenario: "multi-file-review",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    changeKinds: ["modified", "modified"],
    diffCount: 2,
    fileCount: 2,
    frame: "review-open",
    id: "current-review-rename",
    maxPixelRatio: 0.01,
    scenario: "current-review-rename",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    frame: "review-card",
    id: "current-review-file-card",
    maxPixelRatio: 0.01,
    scenario: "current-review-files",
    surfaces: ["fileChange"],
  },
  {
    changeKinds: ["added", "modified", "deleted"],
    diffCount: 3,
    fileCount: 3,
    frame: "review-open",
    id: "current-review-files",
    maxPixelRatio: 0.01,
    scenario: "current-review-files",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    frame: "undo-failed",
    id: "current-review-undo-failed",
    maxPixelRatio: 0.01,
    scenario: "current-review-files",
    surfaces: ["fileChange"],
  },
  {
    changeKinds: ["renamed", "deleted", "modified", "modified"],
    diffCount: 2,
    fileCount: 4,
    frame: "review-open",
    id: "mixed-file-review",
    maxPixelRatio: 0.01,
    noticeKinds: ["binary", "conflict"],
    scenario: "mixed-file-review",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    fileCount: 8,
    frame: "review-open",
    id: "large-file-review",
    maxPixelRatio: 0.0045,
    scenario: "large-file-review",
    selectPath: ".research/large-review/08.ts",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    frame: "pr-summary-ready",
    id: "pull-request-detail",
    maxPixelRatio: crossMacOsSystemFontRatios.prDetail,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-index-loading",
    id: "pr-index-loading",
    maxPixelRatio: 0.011,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-index-failed",
    id: "pr-index-failed",
    maxPixelRatio: 0.011,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-detail-loading",
    id: "pr-detail-loading",
    maxPixelRatio: 0.011,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-detail-failed",
    id: "pr-detail-failed",
    maxPixelRatio: 0.011,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-checks-running",
    id: "pr-checks-running",
    maxPixelRatio: 0.011,
    panelScrollTop: 760,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-review-submitting",
    id: "pr-review-submitting",
    maxPixelRatio: crossMacOsSystemFontRatios.prReviewSubmitting,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-comment-failed",
    id: "pr-comment-failed",
    maxPixelRatio: crossMacOsSystemFontRatios.prCommentFailed,
    panelScrollTop: 1_100,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-merge-ready",
    id: "pr-merge-ready",
    maxPixelRatio: 0.011,
    panelScrollTop: 760,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "pr-compact-detail",
    id: "pr-compact-detail",
    maxPixelRatio: crossMacOsSystemFontRatios.prCompactDetail,
    scenario: "workspace-workflow",
    view: "pull-request",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "app-server-crashed",
    id: "app-server-crashed",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    view: "shell",
  },
  {
    frame: "app-server-crashed",
    id: "app-server-crashed-compact",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    view: "shell",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "shell-notification-queue",
    id: "shell-notification-queue",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "ready",
    view: "shell",
  },
  {
    frame: "shell-loading",
    id: "shell-loading",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "loading",
    view: "shell",
  },
  {
    frame: "shell-offline",
    id: "shell-offline",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "offline",
    view: "shell",
  },
  {
    frame: "shell-stale",
    id: "shell-stale",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "stale",
    view: "shell",
  },
  {
    frame: "shell-restored",
    id: "shell-restored",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "ready",
    view: "shell",
  },
];

export async function launchScene(
  scene,
  {
    capture = true,
    environment = {},
    layoutMode,
    nativeThemeSource,
    theme,
    windowSize,
  } = {},
) {
  const resolvedWindowSize = windowSize ?? scene.windowSize;
  const resolvedTheme = theme ?? scene.theme ?? "dark";
  const app = await electron.launch({
    args: ["."],
    executablePath: electronPath,
    env: {
      ...process.env,
      ...environment,
      CODEX_DEMO_CAPTURE: capture ? "1" : "0",
      CODEX_DEMO_CURRENT_SIDEBAR: scene.currentSidebar ? "1" : "0",
      CODEX_DEMO_FRAME: scene.frame,
      CODEX_DEMO_HEADLESS: "1",
      ...(layoutMode ? { CODEX_DEMO_LAYOUT: layoutMode } : {}),
      ...(nativeThemeSource
        ? { CODEX_DEMO_NATIVE_THEME_SOURCE: nativeThemeSource }
        : {}),
      CODEX_DEMO_SCENARIO: scene.scenario,
      CODEX_DEMO_SIDEBAR_STATE: scene.sidebarState ?? "",
      CODEX_DEMO_SHELL_STATE: scene.shellState ?? "ready",
      CODEX_DEMO_THEME: resolvedTheme,
      CODEX_DEMO_VIEW: scene.view ?? "conversation",
      ...(resolvedWindowSize
        ? {
            CODEX_DEMO_WINDOW_HEIGHT: String(
              resolvedWindowSize.height,
            ),
            CODEX_DEMO_WINDOW_WIDTH: String(
              resolvedWindowSize.width,
            ),
          }
        : {}),
    },
  });
  const page = await app.firstWindow();
  await page.bringToFront();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector(
    `.demo-root[data-scenario="${scene.scenario}"][data-frame="${scene.frame}"]`,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (scene.sidebarSectionKind) {
    await page
      .locator(
        `.codex-ui-app-sidebar__section[data-kind="${scene.sidebarSectionKind}"]`,
      )
      .evaluate((element) => {
        element.scrollIntoView({ block: "end", inline: "nearest" });
      });
  }
  if (capture && scene.id === "command-output-expanded") {
    await page
      .getByRole("button", { exact: true, name: "Worked for 10s" })
      .click();
    await page
      .locator('[data-item-id="command-long-output"] summary')
      .first()
      .click();
    await page.waitForSelector(
      '[data-item-id="command-long-output"] .codex-ui-command-output',
    );
    await page.evaluate(() => {
      const turn = document.querySelector(
        ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
      );
      if (turn instanceof HTMLElement) {
        turn.style.transform = "translateY(-210px)";
      }
    });
  }
  if (
    capture &&
    (scene.id === "command-failure-running" ||
      scene.id === "command-failure-collapsed" ||
      scene.id === "command-failure-expanded" ||
      scene.id === "current-command-failure-expanded")
  ) {
    const timelineLabel =
      scene.id === "command-failure-running" ? "Working" : "Worked for 10s";
    await page
      .getByRole("button", { exact: true, name: timelineLabel })
      .click();
    if (scene.id !== "command-failure-collapsed") {
      await page
        .locator('[data-item-id="command-failure-output"] summary')
        .first()
        .click();
      await page.waitForSelector(
        '[data-item-id="command-failure-output"] .codex-ui-command-output',
      );
    }
  }
  if (capture && scene.scenario === "interruption") {
    const interruptionOffsets = {
      "command-interruption-running": -129,
      "command-interruption-stopping": -133,
      "command-interruption-settled": -163,
      "command-interruption-recovered": -162,
    };
    const offset = interruptionOffsets[scene.id];
    if (offset !== undefined) {
      await page.evaluate((translateY) => {
        const turn = document.querySelector(
          ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
        );
        if (turn instanceof HTMLElement) {
          turn.style.transform = `translateY(${translateY}px)`;
        }
      }, offset);
    }
  }
  if (capture && scene.id === "current-command-failure-expanded") {
    await page.evaluate(() => {
      const turn = document.querySelector(
        ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
      );
      if (turn instanceof HTMLElement) {
        turn.style.transform = "translateY(68px)";
      }
    });
  }
  if (capture && scene.id === "current-command-interruption-recovered") {
    await page.evaluate(() => {
      const turn = document.querySelector(
        ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
      );
      if (turn instanceof HTMLElement) {
        turn.style.transform = "translateY(238px)";
      }
    });
  }
  if (
    capture &&
    scene.scenario === "subagent-delegation" &&
    scene.frame === "subagent-current-running"
  ) {
    await page.evaluate(() => {
      const turn = document.querySelector(
        ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
      );
      if (turn instanceof HTMLElement) {
        turn.style.transform = "translateY(-102px)";
      }
    });
  }
  if (capture && scene.id === "current-review-rename") {
    await page.evaluate(() => {
      const turn = document.querySelector(
        ".codex-ui-conversation-thread-shell .codex-ui-agent-turn",
      );
      if (turn instanceof HTMLElement) {
        turn.style.transform = "translateY(-128px)";
      }
    });
  }
  if (
    scene.view === "pull-request" &&
    !scene.frame.startsWith("pr-index-")
  ) {
    await page.waitForFunction(() => {
      const panel = document.querySelector(
        ".codex-ui-app-shell__side-panel",
      );
      if (!panel) return false;
      const bounds = panel.getBoundingClientRect();
      return (
        getComputedStyle(panel).visibility === "visible" &&
        bounds.width >= 320 &&
        bounds.right <= window.innerWidth + 1
      );
    });
  }
  if (scene.scrollTop !== undefined) {
    await page
      .locator(".codex-ui-conversation-thread-shell__viewport")
      .evaluate((element, scrollTop) => {
        element.scrollTop = scrollTop;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      }, scene.scrollTop);
  }
  if (scene.panelScrollTop !== undefined) {
    await page
      .locator(".demo-pr-panel__summary")
      .evaluate((element, scrollTop) => {
        element.scrollTop = scrollTop;
      }, scene.panelScrollTop);
  }
  return { app, page };
}
