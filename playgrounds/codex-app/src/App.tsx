import {
  ActivityTimeline,
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentTurn,
  AppShell,
  AppNotificationRegion,
  AppRouteOutlet,
  AppServerCrashRecovery,
  AppSidebar,
  AppSidebarFooter,
  AppSidebarItem,
  AppSidebarProjectGroup,
  AppSidebarSection,
  AppWindowChrome,
  AppearanceSettingsPage,
  ApprovalRequest,
  AutomaticApprovalReview,
  BranchCreationDialog,
  BrowserActivity,
  Button,
  CodeReviewSettingsPage,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  ComposerContextBar,
  ComposerContextControl,
  ComposerDock,
  ComposerModeIndicator,
  ComposerPermissionMenu,
  ComposerResourcePicker,
  ConversationContextBar,
  ConversationProjectListbox,
  ConversationThreadShell,
  Dialog,
  EnvironmentSettingsPage,
  FileChangeGroup,
  FileRevertErrorDialog,
  FileReview,
  FileReviewWorkspace,
  GeneralSettingsPage,
  GitSettingsPage,
  HooksSettingsPage,
  IconButton,
  LocalEnvironmentDialog,
  Menu,
  MenuItem,
  MenuLinkItem,
  MenuSectionLabel,
  MenuSeparator,
  McpToolCallGroup,
  McpToolIcon,
  MessageAttachment,
  NewConversationStart,
  PullRequestCheckList,
  PullRequestCommentComposer,
  PullRequestList,
  PullRequestMergeReadiness,
  PullRequestPanelSummary,
  PullRequestQueryState,
  PullRequestReviewComposer,
  QueuedPromptList,
  ProjectIndex,
  SearchActivity,
  SettingsShell,
  StatusBanner,
  StreamNotice,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentAvatar,
  SubagentPanel,
  SubagentTranscriptHeader,
  SystemErrorNotice,
  TerminalPanel,
  TerminalProcessList,
  TerminalTranscript,
  TerminalWorkspaceMismatchNotice,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadFloatingButton,
  ThreadMessageNavigationRail,
  ThreadSummaryDelta,
  ThreadSummaryDock,
  ThreadSummaryIconButton,
  ThreadSummaryItem,
  ThreadSummaryPanel,
  ThreadSummaryPopover,
  ThreadSummarySection,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  ToolCallCard,
  TurnDuration,
  WorkingDirectoryNotice,
  WorkspacePanel,
  type TerminalEntry,
  type AppRouteOutletStatus,
  type AppSidebarWorktreeStatus,
  type AppearanceSettingsValue,
  type ComposerPermissionOption,
  type ComposerModeKind,
  type ComposerResourceGroup,
  type CodeReviewSettingsValue,
  type GeneralSettingsValue,
  type GitSettingsValue,
  type HookSettingsEntry,
  type QueuedPrompt,
  type SubagentItem,
} from "codex-ui-kit";
import {
  CurrentBuildIcon,
  type CurrentBuildIconName,
} from "./currentBuildIcons";
import {
  cloneElement,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import {
  agentMessageStatus,
  hasActiveTurnWork,
  initialProtocolState,
  isCurrentTurnGroupActive,
  isTurnActive,
  messageAttachmentAccessibleLabel,
  messageAttachmentPreviewSource,
  reduceProtocolNotification,
  settleApprovedCommandReplay,
  settleRejectedFileReplay,
  subagentTimelinePresentation,
  terminalTranscriptEvents,
  type DemoProtocolState,
  type DemoSubagent,
  type ProtocolEventRecord,
} from "./protocol-state";
import { changeStats, reviewContent } from "./diff-lines";
import { LiveApprovalSubmissionGate } from "./live-approval-submission-gate";
import {
  isScenarioId,
  replayScenarios,
  type ReplayScenario,
  type ReplayScenarioId,
} from "./replay";
import {
  resolveReviewSelection,
  type ReviewSelection,
} from "./review-selection";
import {
  contextualizeWorkspaceReplay,
  hostSelectionUsesInPlaceBranch,
  workspaceExecutionCwd,
} from "./workspace-replay";
import { branchStateAfterSuccessfulCreation } from "./workspace-branch-state";
import { trimBranchInputAsciiWhitespace } from "../../../src/internal/branchName";
import {
  hasMcpToolCallGroupForTurn,
  mcpToolCallGroupDurationMs,
  mcpToolCallGroupForEntry,
  mcpToolCallGroupStatus,
  mcpToolCallPresentation,
} from "./mcp-tool-call-view";
import {
  initialPullRequestLifecycleState,
  reducePullRequestLifecycle,
  type PullRequestLifecycleAction,
} from "./pull-request-lifecycle";
import {
  applyDemoThemePreference,
  isDemoThemeView,
  parseDemoThemePreference,
  resolveDemoThemePreference,
  type DemoThemePreference,
} from "./theme";

type DemoView =
  | "conversation"
  | "projects"
  | "pull-request"
  | "shell"
  | "workspace";

type SidebarGlyphName =
  | "activity"
  | "activity-attention"
  | "automation"
  | "archive-current"
  | "chevron-current"
  | "folder"
  | "folder-current"
  | "help-current"
  | "more"
  | "more-current"
  | "new"
  | "pin"
  | "pin-current"
  | "plugins"
  | "plugins-current"
  | "pull-request"
  | "quick"
  | "search"
  | "sidebar"
  | "settings"
  | "sites"
  | "thread";

type SummaryGlyphName =
  | "branch"
  | "changes"
  | "commit"
  | "computer"
  | "github"
  | "link";

function SidebarGlyph({ name }: { name: SidebarGlyphName }) {
  if (name === "activity") {
    return <CurrentBuildIcon name="sidebar-activity" />;
  }
  if (name === "activity-attention") {
    return <CurrentBuildIcon name="sidebar-activity-attention" />;
  }
  if (name === "new") {
    return <CurrentBuildIcon name="sidebar-new-chat" />;
  }
  if (name === "quick") {
    return <CurrentBuildIcon name="sidebar-quick-chat" />;
  }
  if (name === "search") {
    return <CurrentBuildIcon name="sidebar-search" />;
  }
  if (name === "automation") {
    return <CurrentBuildIcon name="sidebar-scheduled" />;
  }
  if (name === "folder-current") {
    return <CurrentBuildIcon name="sidebar-folder" />;
  }
  if (name === "archive-current") {
    return <CurrentBuildIcon name="sidebar-archive" />;
  }
  if (name === "chevron-current") {
    return <CurrentBuildIcon name="sidebar-mode-chevron" />;
  }
  if (name === "help-current") {
    return <CurrentBuildIcon name="sidebar-help" />;
  }
  if (name === "more-current") {
    return <CurrentBuildIcon name="sidebar-more" />;
  }
  if (name === "pin-current") {
    return <CurrentBuildIcon name="sidebar-pin" />;
  }
  if (name === "plugins-current") {
    return <CurrentBuildIcon name="sidebar-plugins" />;
  }
  if (name === "pull-request") {
    return <CurrentBuildIcon name="sidebar-pull-request" />;
  }
  if (name === "sites") {
    return <CurrentBuildIcon name="sidebar-sites" />;
  }
  const path = {
    folder:
      "M1.75 4.5h4l1.2 1.5h7.3v6.25a1.5 1.5 0 0 1-1.5 1.5H3.25a1.5 1.5 0 0 1-1.5-1.5V4.5Zm0 2h12.5",
    more: "M3.25 8h.01M8 8h.01M12.75 8h.01",
    pin: "m5.25 2.5 5.5 5.5M9.6 1.6l4.8 4.8-2.15 1.05-3.7 3.7-1.05 2.15-4.8-4.8 2.15-1.05 3.7-3.7L9.6 1.6ZM8 11l-3 3",
    plugins:
      "M6.25 1.75v3M9.75 1.75v3M4.5 4.75h7v2.5A3.5 3.5 0 0 1 8 10.75v3.5M2 7.25h12",
    sidebar: "M2.25 3.5h11.5v9H2.25v-9Zm4 0v9",
    settings:
      "M8 5.5A2.5 2.5 0 1 1 8 10.5 2.5 2.5 0 0 1 8 5.5Zm0-3.75.8 1.3 1.55.35 1.2-.95 2 2-.95 1.2.35 1.55 1.3.8-1.3.8-.35 1.55.95 1.2-2 2-1.2-.95-1.55.35L8 14.25l-.8-1.3-1.55-.35-1.2.95-2-2 .95-1.2-.35-1.55L1.75 8l1.3-.8.35-1.55-.95-1.2 2-2 1.2.95 1.55-.35L8 1.75Z",
    thread:
      "M2.25 3.25h11.5v7.5H7L3.25 13.5v-2.75h-1V3.25Z",
  }[name];
  return (
    <svg aria-hidden="true" className="demo-sidebar-glyph" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
  );
}

function SummaryGlyph({ name }: { name: SummaryGlyphName }) {
  const path = {
    branch:
      "M4 2.5v7.25A2.25 2.25 0 0 0 6.25 12h3.5M4 2.5a1.25 1.25 0 1 0 0 .01M11 4.25a1.25 1.25 0 1 0 0 .01M11 5.5v4M11 12a1.25 1.25 0 1 0 0 .01",
    changes:
      "M2.75 3.25h10.5v9.5H2.75v-9.5Zm2.5 2.5h5.5M5.25 8h5.5m-5.5 2.25h3",
    commit:
      "M2.25 8h3.5M10.25 8h3.5M8 5.75A2.25 2.25 0 1 1 8 10.25 2.25 2.25 0 0 1 8 5.75Z",
    computer:
      "M2.25 3.25h11.5v7.5H2.25v-7.5Zm3 10h5.5M8 10.75v2.5",
    github:
      "M8 2.25a5.75 5.75 0 0 0-1.82 11.2c.29.05.39-.13.39-.28v-1.1c-1.63.35-1.97-.69-1.97-.69-.27-.68-.65-.86-.65-.86-.53-.36.04-.35.04-.35.59.04.9.6.9.6.52.9 1.36.64 1.69.49.05-.38.2-.64.37-.79-1.3-.15-2.67-.65-2.67-2.9 0-.64.23-1.16.6-1.57-.06-.15-.26-.74.06-1.54 0 0 .49-.16 1.58.6A5.5 5.5 0 0 1 8 4.54c.49 0 .97.07 1.43.2 1.1-.75 1.58-.6 1.58-.6.32.8.12 1.39.06 1.54.38.41.6.93.6 1.57 0 2.25-1.37 2.75-2.68 2.89.21.18.4.54.4 1.09v1.94c0 .15.1.33.4.27A5.75 5.75 0 0 0 8 2.25Z",
    link:
      "M6.25 9.75 9.75 6.25M5.25 11.75H4A2.75 2.75 0 0 1 4 6.25h2M10.75 4.25H12a2.75 2.75 0 1 1 0 5.5h-2",
  }[name];
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
  );
}

const configuredHookSettingsEntries: readonly HookSettingsEntry[] = [
  {
    command: "pnpm check",
    enabled: true,
    event: "Stop",
    handler: "command",
    id: "user-stop-check",
    source: "user",
    statusMessage: "Checking the workspace",
    timeout: "120s",
    trusted: true,
  },
  {
    changedSinceTrusted: true,
    command: "pnpm lint",
    enabled: false,
    event: "PreToolUse",
    handler: "command",
    id: "plugin-pre-tool-lint",
    matcher: "Shell",
    pluginName: "Quality checks",
    source: "plugin",
    trusted: false,
  },
  {
    enabled: true,
    event: "SessionStart",
    handler: "prompt",
    id: "project-session-context",
    managed: true,
    projectLabel: "codex-ui-kit",
    prompt: "Load the project contribution guide.",
    source: "project",
    trusted: true,
  },
];

function DemoVsCodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect fill="#2588d8" height="14" rx="3" width="14" x="1" y="1" />
      <path
        d="m4.2 8 2.4-2.2L11.8 3v10L6.6 10.2 4.2 8Zm2.4 0 3.3 2V6L6.6 8Z"
        fill="#fff"
      />
    </svg>
  );
}

const currentLearnChatGptFavicon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAPFBMVEVHcEwAgPcAevf3/P8AgPcAgPgAgPcAgPgAgPcAgPcAdPdgpvrh8P682f10s/uJvfsbjPjS5v44lvmjy/yT3YB9AAAACnRSTlMA////i0ydF8rrN2iBHgAAAXxJREFUOI2FU9uuwzAIa6BNWgK5/v+/HnKruk5H42GaigO242zbXe6w52XMddrDbd/ldm2uuuwb4nbzqv0D4s5335jzgTjmN9B6QI77/GxTEIlPlPuYDx5ZJGMMMRR4bln8sBoig8gZ0Q/E/lhAIgSmohQiiBjhXmJHP2CBwBiAirKpSGuE6/4kHZsIK1ERxGASjyWXGxKJ2TeA1+HZR+SSA0ypdghIpU9AxppIqSyadmsaQQQ6AEMKzIHAZ5l+bo0CZKEyVihBFer1d+i4tu5RzTpBoM8lDIKeIg8dHWCKfknTnzZHKfoptK9QEljIqNeK0+NGaUzA1UkaSIxZ2atAnIAsMEjatUMFQp/RAX7qtDMLiQup0eo0JAXk9m8aNaw2OhFSKAR6XcmwTJ/U6nHbek4SNBLZEwRcmbH3dbf1WRhjz0T9yNQ+8xhqjcwxygrDDMwd6RbGEjNLWP0V7JmpgdI83cl279i/6o7974fz++k1iH0+3q/2/8//D5sDEe8GCH/bAAAAAElFTkSuQmCC";

function CurrentMcpLink({ href }: { href: string }) {
  return (
    <a
      className="demo-current-mcp-answer__link"
      data-inline-mention-interactive=""
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span
        className="demo-current-mcp-answer__favicon-container"
        data-markdown-copy="exclude"
      >
        <img
          alt=""
          className="demo-current-mcp-answer__favicon"
          decoding="async"
          draggable={false}
          src={currentLearnChatGptFavicon}
        />
      </span>
      <span>{href}</span>
    </a>
  );
}

function CurrentMcpAnswer({ recovery }: { recovery?: boolean }) {
  const href = recovery
    ? "https://learn.chatgpt.com/docs/mcp-server"
    : "https://learn.chatgpt.com/docs/extend/mcp";
  return (
    <div
      className="demo-current-mcp-answer"
      data-markdown-text-style="assistant-message"
    >
      <p>
        {recovery ? (
          <>
            RECOVERY COMPLETE
            <br />
            Use Codex with the Agents SDK
            <br />
            <CurrentMcpLink href={href} />
          </>
        ) : (
          <>
            Model Context Protocol — <CurrentMcpLink href={href} />
          </>
        )}
      </p>
    </div>
  );
}

function querySelection() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("scenario");
  const scenarioId = isScenarioId(requested)
    ? requested
    : "streaming-recovery";
  const frame = params.get("frame");
  const capture = params.get("capture") === "1";
  const currentSidebar = params.get("currentSidebar") === "1";
  const requestedSidebarState = params.get("sidebarState");
  const sidebarState = [
    "compact-collapsed",
    "compact-pinned",
    "hidden",
    "account-menu",
    "help-menu",
    "project-collapsed",
    "project-menu",
    "status-lifecycle",
  ].includes(requestedSidebarState ?? "")
    ? requestedSidebarState
    : null;
  const requestedSummaryState = params.get("summaryState");
  const summaryState = ["floating", "hidden", "pinned"].includes(
    requestedSummaryState ?? "",
  )
    ? (requestedSummaryState as "floating" | "hidden" | "pinned")
    : null;
  const layoutMode =
    params.get("layout") === "wide" ? ("wide" as const) : undefined;
  const view: DemoView =
    params.get("view") === "pull-request"
      ? "pull-request"
      : params.get("view") === "projects"
        ? "projects"
        : params.get("view") === "shell"
          ? "shell"
          : params.get("view") === "workspace"
            ? "workspace"
            : "conversation";
  const theme = resolveDemoThemePreference(params.get("theme"), view);
  const requestedShellState = params.get("shellState");
  const shellState: AppRouteOutletStatus = [
    "ready",
    "loading",
    "empty",
    "error",
    "offline",
    "reconnecting",
    "stale",
  ].includes(requestedShellState ?? "")
    ? (requestedShellState as AppRouteOutletStatus)
    : "ready";
  return {
    capture,
    currentSidebar,
    frame,
    layoutMode,
    scenarioId,
    shellState,
    sidebarState,
    summaryState,
    theme,
    view,
  };
}

function isNarrowDemoWindow() {
  const rootFontSize =
    Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    ) || 16;
  return window.innerWidth <= 45 * rootFontSize;
}

function replayState(
  events: readonly ProtocolEventRecord[],
  count: number,
): DemoProtocolState {
  return events
    .slice(0, count)
    .reduce(reduceProtocolNotification, initialProtocolState);
}

const conversationHostFrames = new Set([
  "composer-attachment",
  "composer-auto-continued",
  "composer-disabled",
  "composer-idle",
  "composer-goal",
  "composer-multiline",
  "composer-plan",
  "composer-permissions-menu",
  "composer-queue-paused",
  "composer-queued",
  "composer-resources-menu",
  "composer-running",
  "thread-scroll-away",
  "thread-windowed",
]);

const currentWindowedHistorySize = 82;
const currentWindowedTurnWindowSize = 7;
const currentWindowedInitialIndex = 39;

function replayCountForSelection(
  scenario: ReplayScenario,
  frame: string | null,
) {
  if (frame && frame in scenario.frames) return scenario.frames[frame];
  if (
    scenario.id === "streaming-recovery" &&
    frame?.startsWith("sidebar-current")
  ) {
    return scenario.frames.recovered ?? scenario.events.length;
  }
  if (
    scenario.id === "attachment-lifecycle" &&
    frame?.startsWith("attachment-")
  ) {
    return 0;
  }
  if (isSubagentScenarioId(scenario.id) && frame) {
    const state = frame.includes("mixed")
      ? "mixed"
      : frame.includes("running")
        ? "running"
        : "completed";
    const prefix =
      scenario.id === "subagent-delegation"
        ? "subagent-current"
        : scenario.id === "subagent-concurrency"
          ? "subagent-concurrent"
          : "subagent-nested";
    return scenario.frames[`${prefix}-${state}`] ?? scenario.events.length;
  }
  if (
    scenario.id === "compaction" &&
    frame === "context-compaction-command-menu"
  ) {
    return (
      scenario.frames["context-compaction-ready"] ?? scenario.events.length
    );
  }
  if (scenario.id !== "conversation-lifecycle" || !frame) {
    return scenario.events.length;
  }
  if (!conversationHostFrames.has(frame)) return scenario.events.length;
  if (
    frame === "composer-running" ||
    frame === "composer-queued" ||
    frame === "composer-auto-continued"
  ) {
    return scenario.frames["conversation-running"] ?? scenario.events.length;
  }
  return (
    scenario.frames["conversation-thread-ready"] ?? scenario.events.length
  );
}

function isSubagentScenarioId(id: ReplayScenarioId) {
  return (
    id === "subagent-delegation" ||
    id === "subagent-concurrency" ||
    id === "subagent-nested" ||
    id === "subagent-recovery"
  );
}

function currentSubagentFrame(frame: string | null) {
  return frame?.startsWith("subagent-") ?? false;
}

function currentSubagentSummaryFrame(frame: string | null) {
  return frame?.includes("-summary-") ?? false;
}

function currentSubagentPanelFrame(frame: string | null) {
  return (
    (frame?.includes("-panel-") ?? false) ||
    (frame?.includes("-transcript-") ?? false) ||
    frame === "subagent-current-transcript" ||
    frame === "subagent-current-compact-820" ||
    frame === "subagent-current-compact-720"
  );
}

function currentWorkspacePersistenceFrame(frame: string | null) {
  return (
    frame === "workspace-persisted-thread" ||
    frame === "workspace-directory-missing"
  );
}

function initialSubagentId(frame: string | null) {
  if (frame === "subagent-current-transcript") return "long-probe";
  if (frame?.endsWith("transcript-alpha")) return "alpha";
  if (frame?.endsWith("transcript-beta")) return "beta";
  if (frame?.endsWith("transcript-parent")) return "parent";
  if (frame?.endsWith("transcript-child")) return "child";
  if (frame?.endsWith("transcript-validator")) return "validator";
  return null;
}

function compactSubagentTime(timestampMs: number, nowMs: number) {
  const elapsedMs = Math.max(0, nowMs - timestampMs);
  if (elapsedMs < 60_000) return `${Math.floor(elapsedMs / 1_000)}s`;
  if (elapsedMs < 3_600_000) return `${Math.floor(elapsedMs / 60_000)}m`;
  if (elapsedMs < 86_400_000) return `${Math.floor(elapsedMs / 3_600_000)}h`;
  return `${Math.floor(elapsedMs / 86_400_000)}d`;
}

function presentSubagent(
  subagent: DemoSubagent,
  mode: "live" | "replay",
  nowMs: number,
): SubagentItem {
  const timestampMs =
    subagent.status === "done"
      ? subagent.completedAtMs
      : subagent.startedAtMs;
  const relativeTime =
    mode === "live" && timestampMs !== null
      ? {
          timestamp: `${compactSubagentTime(timestampMs, nowMs)}${subagent.status === "done" ? " ago" : ""}`,
        }
      : {
          timestamp: subagent.status === "done" ? "1m ago" : "0s",
        };
  return {
    ...relativeTime,
    dateTime:
      mode !== "live" || timestampMs === null
        ? undefined
        : new Date(timestampMs).toISOString(),
    id: subagent.id,
    lastMessage: subagent.message ?? undefined,
    name: subagent.name ?? undefined,
    sortTimestampMs: timestampMs ?? undefined,
    status: subagent.status,
    statusSummary:
      subagent.status === "active"
        ? subagent.message ?? "Working"
        : subagent.status === "waiting"
          ? "Waiting"
          : subagent.message ?? undefined,
  };
}

function subagentActivityStatus(subagent: DemoSubagent) {
  if (
    subagent.threadStatus === "interrupted" ||
    subagent.threadStatus === "shutdown"
  ) {
    return "interrupted" as const;
  }
  if (subagent.status === "done") return "done" as const;
  if (subagent.activityKind === "interacted") return "updated" as const;
  return "active" as const;
}

function initialComposerValue(frame: string | null) {
  if (
    frame === "attachment-ready" ||
    frame === "attachment-multi-ready" ||
    frame === "attachment-native-ready"
  ) {
    return "Reply using three uppercase words describing this test: attachment, lifecycle, complete. Include a final period and no other text.";
  }
  if (frame === "context-compaction-command-menu") return "/compact";
  if (
    frame === "composer-multiline" ||
    frame === "composer-permissions-menu" ||
    frame === "composer-resources-menu"
  ) {
    return [
      "First current-build Composer line.",
      "Second line checks automatic growth.",
      "Third line keeps the draft unsubmitted.",
      "Fourth line reaches the measured expanded state.",
    ].join("\n");
  }
  if (frame === "composer-disabled") {
    return "Starting a deterministic lifecycle turn…";
  }
  return "";
}

type ComposerOverlay = "permissions" | "resources" | null;
type ComposerMode = Extract<ComposerModeKind, "goal" | "plan"> | null;

function initialComposerOverlay(frame: string | null): ComposerOverlay {
  if (frame === "composer-permissions-menu") return "permissions";
  if (frame === "composer-resources-menu") return "resources";
  return null;
}

function initialComposerMode(frame: string | null): ComposerMode {
  if (frame === "composer-goal") return "goal";
  if (frame === "composer-plan") return "plan";
  return null;
}

const attachmentPreviewDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlS8AAAAASUVORK5CYII=";

type DemoComposerAttachmentStatus =
  | "error"
  | "preview-error"
  | "ready"
  | "uploading";

interface DemoComposerAttachmentItem {
  id: string;
  kind: "file" | "folder" | "image";
  label: string;
  layout: "card" | "image";
  meta?: string;
  previewSrc?: string;
  progress?: number;
  status: DemoComposerAttachmentStatus;
}

function attachmentItemsForFrame(
  frame: string | null,
): DemoComposerAttachmentItem[] {
  if (frame === "composer-attachment" || frame === "attachment-ready") {
    return [
      {
        id: "current-image",
        kind: "image",
        label: "codex-ui-kit-current.png",
        layout: "image",
        previewSrc: attachmentPreviewDataUrl,
        status: "ready",
      },
    ];
  }
  if (frame === "attachment-preview-error") {
    return [
      {
        id: "preview-error",
        kind: "image",
        label: "reference-unavailable.png",
        layout: "image",
        status: "preview-error",
      },
    ];
  }
  const status: DemoComposerAttachmentStatus =
    frame === "attachment-uploading"
      ? "uploading"
      : frame === "attachment-upload-error"
        ? "error"
        : "ready";
  if (
    frame === "attachment-multi-ready" ||
    frame === "attachment-multi-compact" ||
    frame === "attachment-uploading" ||
    frame === "attachment-upload-error"
  ) {
    return [
      {
        id: "readme",
        kind: "file",
        label: "README.md",
        layout: "card",
        meta: "MD",
        status: "ready",
      },
      {
        id: "source-folder",
        kind: "folder",
        label: "src",
        layout: "card",
        meta: "Folder",
        status: "ready",
      },
      {
        id: "archive",
        kind: "file",
        label: "current-build.zip",
        layout: "card",
        meta: "ZIP",
        progress: status === "uploading" ? 62 : undefined,
        status,
      },
      {
        id: "notes",
        kind: "file",
        label: "notes.txt",
        layout: "card",
        meta: "TXT · 1–24",
        status: "ready",
      },
      {
        id: "manifest",
        kind: "file",
        label: "package.json",
        layout: "card",
        meta: "JSON",
        status: "ready",
      },
    ];
  }
  return [];
}

const composerPermissionOptions: readonly ComposerPermissionOption[] = [
  {
    description:
      "Always ask to edit external files and use the internet",
    icon: "○",
    id: "ask",
    label: "Ask for approval",
  },
  {
    description:
      "Only ask for actions detected as potentially unsafe",
    icon: "○",
    id: "approve",
    label: "Approve for me",
  },
  {
    description:
      "Unrestricted access to the internet and any file on your computer",
    icon: "◉",
    id: "full",
    label: "Full access",
  },
  {
    description: "Uses permissions defined in config.toml",
    icon: "○",
    id: "custom",
    label: "Custom (config.toml)",
  },
];

const composerResourceGroups: readonly ComposerResourceGroup[] = [
  {
    id: "add",
    options: [
      {
        icon: "＋",
        id: "files",
        label: "Files and folders",
      },
      {
        icon: "▣",
        id: "active-app",
        label: "Attach active app",
      },
      {
        description: "Choose project for new chats",
        icon: "□",
        id: "project",
        label: "Work in a project",
      },
      {
        description: "Set a goal to keep pursuing",
        icon: "◎",
        id: "goal",
        label: "Goal",
      },
      {
        description: "Turn plan mode on",
        icon: "◇",
        id: "plan",
        label: "Plan mode",
      },
      {
        icon: "◌",
        id: "record-skill",
        label: "Record a skill",
      },
    ],
  },
  {
    id: "plugins",
    label: "Plugins",
    options: [
      {
        description: "Create and edit document artifacts",
        icon: "▤",
        id: "documents",
        label: "Documents",
      },
      {
        description: "Read, create, and verify PDF files",
        icon: "▧",
        id: "pdf",
        label: "PDF",
      },
      {
        description: "Create and edit spreadsheet files",
        icon: "▦",
        id: "spreadsheets",
        label: "Spreadsheets",
      },
      {
        description: "Create and edit presentations",
        icon: "▥",
        id: "presentations",
        label: "Presentations",
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    options: [
      { icon: "◎", id: "browser-control", label: "Browser control" },
      { icon: "◎", id: "chrome-control", label: "Chrome control" },
      { icon: "◎", id: "computer-use", label: "Computer use" },
      { icon: "◎", id: "image-generation", label: "Image generation" },
      { icon: "◎", id: "openai-docs", label: "OpenAI docs" },
      { icon: "◎", id: "watch-pr", label: "Watch pull request" },
      { icon: "◎", id: "visualize", label: "Visualize" },
      { icon: "◎", id: "site-builder", label: "Site builder" },
    ],
  },
  {
    id: "apps",
    label: "Apps",
    options: [
      { icon: "◫", id: "browser-app", label: "Browser" },
      { icon: "◫", id: "chrome-app", label: "Chrome" },
      { icon: "◫", id: "tasks-app", label: "Codex tasks" },
      { icon: "◫", id: "files-app", label: "Local files" },
      { icon: "◫", id: "terminal-app", label: "Terminal" },
      { icon: "◫", id: "electron-app", label: "Electron" },
      { icon: "◫", id: "github-app", label: "GitHub" },
    ],
  },
  {
    id: "context",
    label: "Context",
    options: [
      { icon: "⊕", id: "current-task", label: "Current task" },
      { icon: "⊕", id: "current-repository", label: "Current repository" },
      { icon: "⊕", id: "browser-tab", label: "Open browser tab" },
      { icon: "⊕", id: "recent-screenshot", label: "Recent screenshot" },
      { icon: "⊕", id: "clipboard", label: "Clipboard" },
    ],
  },
];

function initialQueuedPrompts(frame: string | null): QueuedPrompt[] {
  if (frame !== "composer-queued" && frame !== "composer-queue-paused") {
    return [];
  }
  return [
    {
      id: "queued-lifecycle-1",
      status: "queued",
      text: "Verify the queued Composer lifecycle.",
    },
  ];
}

function initialQueuedContinuation(frame: string | null) {
  return frame === "composer-auto-continued"
    ? "Verify the queued Composer lifecycle."
    : null;
}

const terminalLifecycleCommandIds = [
  "command-terminal-dev",
  "command-terminal-test",
  "command-terminal-docs",
] as const;

function currentTerminalFrame(frame: string | null) {
  return frame?.startsWith("terminal-current-") ?? false;
}

function initialTerminalSessionIds(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  if (scenarioId === "background-terminal") return ["command-dev"];
  if (scenarioId !== "terminal-lifecycle") return [];
  if (frame === "terminal-current-closed") return [];
  if (frame === "terminal-current-background-list") return [];
  if (frame === "terminal-current-background-open") {
    return ["agent-background-terminal"];
  }
  if (frame === "terminal-current-multi") {
    return ["local-terminal-1", "local-terminal-2", "local-terminal-3"];
  }
  if (frame === "terminal-current-mismatch") {
    return ["local-terminal-1", "local-terminal-2"];
  }
  if (currentTerminalFrame(frame)) return ["local-terminal-1"];
  if (frame === "terminal-running") {
    return terminalLifecycleCommandIds.slice(0, 1);
  }
  if (frame === "terminal-failed") {
    return terminalLifecycleCommandIds.slice(0, 2);
  }
  if (frame === "terminal-closed") return [];
  return [...terminalLifecycleCommandIds];
}

function initialTerminalWorkspaceLabels(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  const sessionIds = initialTerminalSessionIds(scenarioId, frame);
  if (frame === "terminal-current-mismatch") {
    return {
      "local-terminal-1": "assets",
      "local-terminal-2": "codex-ui-kit",
    };
  }
  return Object.fromEntries(
    sessionIds.map((sessionId) => [sessionId, "codex-ui-kit"]),
  );
}

function initialTerminalHistory(
  scenarioId: ReplayScenarioId,
  frame: string | null,
): Record<string, TerminalEntry[]> {
  if (scenarioId !== "terminal-lifecycle" || !currentTerminalFrame(frame)) {
    return {};
  }
  const sessionIds = initialTerminalSessionIds(scenarioId, frame);
  return Object.fromEntries(
    sessionIds.map((sessionId, index) => [
      sessionId,
      frame === "terminal-current-background-open"
        ? Array.from({ length: 45 }, (_, outputIndex) => ({
            id: `${sessionId}:background:${outputIndex + 66}`,
            kind: "stdout" as const,
            text: `terminal-background-handle-${String(
              outputIndex + 66,
            ).padStart(3, "0")}`,
          }))
        : frame === "terminal-current-command-exit-7" && index === 0
          ? [
              {
                id: `${sessionId}:exit-command`,
                kind: "command" as const,
                text: "/workspace/codex-ui-kit % sh -c 'printf terminal-direct-out; exit 7'",
              },
              {
                id: `${sessionId}:exit-output`,
                kind: "stdout" as const,
                text: "terminal-direct-out",
              },
            ]
        : frame === "terminal-current-running" && index === 0
        ? [
            {
              id: `${sessionId}:running`,
              kind: "command" as const,
              text: "/workspace/codex-ui-kit % sleep 3; echo terminal-after-reopen",
            },
          ]
        : frame === "terminal-current-completed" && index === 0
          ? [
              {
                id: `${sessionId}:command`,
                kind: "command" as const,
                text: "/workspace/codex-ui-kit % sleep 3; echo terminal-after-reopen",
              },
              {
                id: `${sessionId}:stdout`,
                kind: "stdout" as const,
                text: "terminal-after-reopen",
              },
            ]
          : [
              {
                id: `${sessionId}:prompt`,
                kind: "command" as const,
                text: `/workspace/${
                  frame === "terminal-current-mismatch" && index === 0
                    ? "assets"
                    : "codex-ui-kit"
                } %`,
              },
              {
                id: `${sessionId}:ready`,
                kind: "stdout" as const,
                text: "",
              },
            ],
    ]),
  );
}

function initialClosedTerminalSessionIds(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  return scenarioId === "terminal-lifecycle" &&
    frame === "terminal-closed"
    ? [...terminalLifecycleCommandIds]
    : [];
}

function replayStatusLabel(
  status: DemoProtocolState["status"],
  running: boolean,
  stopped: boolean,
) {
  if (running) return "Working";
  if (stopped) return "Stopped";
  if (status === "retrying") return "Retrying";
  if (status === "running") return "Working";
  if (status === "completed") return "Completed";
  if (status === "interrupted") return "Stopped";
  if (status === "failed") return "Failed";
  return "Ready";
}

function interruptConversationReplay(
  state: DemoProtocolState,
): DemoProtocolState {
  if (!state.currentTurnId) return state;
  return reduceProtocolNotification(state, {
    atMs: state.eventCount,
    method: "turn/completed",
    params: {
      threadId: state.threadId,
      turn: {
        completedAt: 13,
        durationMs: 2_000,
        error: null,
        id: state.currentTurnId,
        items: [],
        itemsView: "full",
        startedAt: 11,
        status: "interrupted",
      },
    },
  });
}

function continueQueuedConversationReplay(
  state: DemoProtocolState,
  prompt: string,
): DemoProtocolState {
  const interrupted = interruptConversationReplay(state);
  const threadId =
    interrupted.threadId ?? "thread-conversation-lifecycle";
  const turnId = "turn-queued-continuation";
  const startAt = interrupted.eventCount;
  const continuationEvents: ProtocolEventRecord[] = [
    {
      atMs: startAt,
      method: "item/started",
      params: {
        item: {
          clientId: "demo-queued-continuation",
          content: [{ text: prompt, text_elements: [], type: "text" }],
          id: "user-queued-continuation",
          type: "userMessage",
        },
        startedAtMs: 13_000,
        threadId,
        turnId,
      },
    },
    {
      atMs: startAt + 1,
      method: "turn/started",
      params: {
        threadId,
        turn: {
          completedAt: null,
          durationMs: null,
          error: null,
          id: turnId,
          items: [],
          itemsView: "full",
          startedAt: 13,
          status: "inProgress",
        },
      },
    },
    {
      atMs: startAt + 2,
      method: "item/started",
      params: {
        item: {
          id: "assistant-queued-continuation",
          memoryCitation: null,
          phase: "final_answer",
          text: "",
          type: "agentMessage",
        },
        startedAtMs: 13_020,
        threadId,
        turnId,
      },
    },
    {
      atMs: startAt + 3,
      method: "item/agentMessage/delta",
      params: {
        delta: "Working on the queued follow-up…",
        itemId: "assistant-queued-continuation",
        threadId,
        turnId,
      },
    },
  ];
  return continuationEvents.reduce(
    reduceProtocolNotification,
    interrupted,
  );
}

function statusLabel(state: DemoProtocolState) {
  if (state.status === "retrying") return "Retrying";
  if (state.status === "running") return "Working";
  if (state.status === "completed") return "Completed";
  if (state.status === "interrupted") return "Stopped";
  if (state.status === "failed") return "Failed";
  return "Ready";
}

function McpResponseActions({
  copyLabel = "Copy response",
  includeFork = true,
  label = "MCP response actions",
  toolbar = true,
}: {
  copyLabel?: string;
  includeFork?: boolean;
  label?: string | null;
  toolbar?: boolean;
}) {
  return (
    <span
      aria-label={label ?? undefined}
      className="demo-mcp-turn-actions demo-turn-actions"
      role={toolbar ? "toolbar" : undefined}
    >
      <button aria-label={copyLabel} type="button">
        <CurrentBuildIcon name="thread-assistant-copy" />
      </button>
      <button aria-label="Good response" type="button">
        <CurrentBuildIcon name="thread-assistant-good" />
      </button>
      <button aria-label="Bad response" type="button">
        <CurrentBuildIcon name="thread-assistant-bad" />
      </button>
      {includeFork ? (
        <button aria-label="Fork chat from here" type="button">
          <CurrentBuildIcon name="thread-assistant-fork" />
        </button>
      ) : null}
    </span>
  );
}

const pullRequestFiles = [
  {
    additions: 31,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content:
          "@@ -136,8 +137,31 @@ export type TerminalSessionStatus",
        kind: "hunk" as const,
      },
      {
        content: '| "idle"',
        kind: "context" as const,
        newLineNumber: 140,
        oldLineNumber: 140,
      },
      {
        content: '| "restoring"',
        kind: "addition" as const,
        newLineNumber: 141,
      },
      {
        content: '| "running";',
        kind: "context" as const,
        newLineNumber: 142,
        oldLineNumber: 141,
      },
      {
        content: "const terminalSessionStatusLabel = {",
        kind: "addition" as const,
        newLineNumber: 144,
      },
    ],
    path: "src/components/TerminalPanel.tsx",
  },
  {
    additions: 7,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content: "@@ -16,6 +17,7 @@ export type ReplayScenarioId",
        kind: "hunk" as const,
      },
      {
        content: '| "terminal-lifecycle"',
        kind: "addition" as const,
        newLineNumber: 20,
      },
      {
        content: '| "interruption"',
        kind: "context" as const,
        newLineNumber: 21,
        oldLineNumber: 20,
      },
      {
        content: '"terminal-lifecycle": scenario(',
        kind: "addition" as const,
        newLineNumber: 84,
      },
    ],
    path: "playgrounds/codex-app/src/replay.ts",
  },
  {
    additions: 140,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content:
          '@@ -87,4 +89,140 @@ describe("terminal panel", () => {',
        kind: "hunk" as const,
      },
      {
        content:
          'it("coordinates multiple controlled sessions, close, create, and restore", () => {',
        kind: "addition" as const,
        newLineNumber: 92,
      },
    ],
    path: "tests/terminal-panel.test.tsx",
  },
];

const workspaceProjects = [
  {
    icon: <SidebarGlyph name="folder" />,
    id: "codex-ui-kit",
    label: "codex-ui-kit",
    path: "/workspace/codex-ui-kit",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "app-server-client",
    label: "codex-app-server-client",
    path: "/workspace/codex-app-server-client",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "desktop-shell",
    label: "desktop-shell",
    path: "/workspace/desktop-shell",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "tooling",
    label: "tooling",
    path: "/workspace/tooling",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "component-lab",
    label: "component-lab",
    path: "/workspace/component-lab",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "desktop-client",
    label: "desktop-client",
    path: "/workspace/desktop-client",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "design-system",
    label: "design-system",
    path: "/workspace/design-system",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "release-tools",
    label: "release-tools",
    path: "/workspace/release-tools",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "protocol-kit",
    label: "protocol-kit",
    path: "/workspace/protocol-kit",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "test-fixtures",
    label: "test-fixtures",
    path: "/workspace/test-fixtures",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "documentation",
    label: "documentation",
    path: "/workspace/documentation",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "automation",
    label: "automation",
    path: "/workspace/automation",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "sample-app",
    label: "sample-app",
    path: "/workspace/sample-app",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "shared-utils",
    label: "shared-utils",
    path: "/workspace/shared-utils",
    status: "available" as const,
  },
];

const currentProjectIndexUpdated = [
  "2m",
  "1h",
  "3h",
  "10h",
  "1d",
  "3d",
  "1w",
  "2w",
  "3w",
  "1mo",
  "1mo",
  "2mo",
  "3mo",
  "4mo",
];

const currentProjectIndexItems = workspaceProjects.map((project, index) => ({
  id: project.id,
  label: project.label,
  path: project.path,
  recentChats:
    index === 0
      ? [
          {
            id: "project-index-parity",
            label: "Match the current projects index",
            meta: "2m",
          },
        ]
      : index === 1
        ? [
            {
              id: "sidebar-contract",
              label: "Verify sidebar project behavior",
              meta: "1h",
            },
          ]
        : [],
  status: "available" as const,
  updated: currentProjectIndexUpdated[index] ?? "4mo",
  updatedOrder: workspaceProjects.length - index,
}));

const workspaceEnvironmentGroups = [
  {
    description: "Current checkout and linked worktrees",
    id: "codex-ui-kit",
    items: [
      {
        branch: "main",
        id: "main",
        label: "Main",
        meta: "clean",
        status: "available" as const,
      },
      {
        branch: "feat/coding-workspace-lifecycle",
        id: "feature",
        label: "Coding workspace",
        meta: "ready",
        status: "available" as const,
      },
      {
        actions: (
          <button aria-label="Inspect repairing worktree" type="button">
            Details
          </button>
        ),
        branch: "fix/repair",
        id: "repairing",
        label: "Repairing worktree",
        status: "repairing" as const,
        statusLabel: "Repairing",
      },
    ],
    label: "codex-ui-kit",
  },
];

type WorkspaceBranch = {
  branch: string;
  checkedOutInLinkedWorktree?: boolean;
  checkoutUnavailable?: boolean;
  id: string;
  label: string;
  meta?: string;
  status: "available" | "repairing";
  statusLabel?: string;
};

type WorkspaceGitBranchResponse =
  | { branch: string; ok: true }
  | { code: string; message: string; ok: false };

type WorkspaceHostBranchState =
  | { status: "loading" }
  | {
      branches: string[];
      branchesCheckedOutElsewhere: string[];
      branchesUnavailableForCheckout: string[];
      currentBranch: string | null;
      status: "ready";
      unbornBranch: string | null;
    }
  | { message: string; status: "error" };

function workspaceGitBranchId(branch: string) {
  return branch === "main" ? "main" : `git:${branch}`;
}

function workspaceGitBranch(
  branch: string,
  branchesCheckedOutElsewhere: ReadonlySet<string>,
  branchesUnavailableForCheckout: ReadonlySet<string>,
): WorkspaceBranch {
  const checkedOutInLinkedWorktree = branchesCheckedOutElsewhere.has(branch);
  const checkoutUnavailable = branchesUnavailableForCheckout.has(branch);
  return {
    branch,
    checkedOutInLinkedWorktree,
    checkoutUnavailable,
    id: workspaceGitBranchId(branch),
    label: branch,
    meta: checkedOutInLinkedWorktree
      ? "Linked worktree"
      : checkoutUnavailable
        ? "Unavailable"
        : "clean",
    status: "available",
  };
}

const unattachedWorkspaceBranchId = "state:unattached-head";

function unattachedWorkspaceBranch(
  unbornBranch: string | null,
): WorkspaceBranch {
  const label = unbornBranch ? `${unbornBranch} (unborn)` : "Detached HEAD";
  return {
    branch: label,
    id: unattachedWorkspaceBranchId,
    label,
    meta: "unattached",
    status: "available",
  };
}

const workspaceBranches: WorkspaceBranch[] = [
  {
    branch: "main",
    id: "main",
    label: "Main",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "feat/current-workspace-entry-refresh",
    id: "feature",
    label: "Workspace entry refresh",
    meta: "ready",
    status: "available" as const,
  },
  {
    branch: "fix/context-layout",
    id: "context-layout",
    label: "Context layout",
    meta: "ready",
    status: "available" as const,
  },
  {
    branch: "docs/parity-notes",
    id: "parity-notes",
    label: "Parity notes",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "test/electron-workspace",
    id: "electron-workspace",
    label: "Electron workspace",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "refactor/context-controls",
    id: "context-controls",
    label: "Context controls",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "chore/current-baseline",
    id: "current-baseline",
    label: "Current baseline",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "fix/repair",
    id: "repairing",
    label: "Repairing worktree",
    status: "repairing",
    statusLabel: "Repairing",
  },
];

const capturedWorkspaceBranch: WorkspaceBranch = {
  branch: "feat/current-branch",
  id: "created:feat/current-branch",
  label: "Current branch",
  meta: "clean",
  status: "available",
};

const workspaceWorktreesByProject: Record<
  string,
  typeof workspaceBranches
> = {
  "app-server-client": [workspaceBranches[0]],
  "codex-ui-kit": workspaceBranches,
  "desktop-shell": [workspaceBranches[0]],
  tooling: [workspaceBranches[0]],
};

const currentSidebarProjects = [
  {
    id: "session-browser",
    label: "session-browser",
    tasks: ["Inspect timeline structure"],
  },
  {
    id: "desktop-cleanup",
    label: "desktop-cleanup",
    tasks: ["Verify recent item cleanup"],
  },
  {
    id: "codex-ui-kit",
    label: "codex-ui-kit",
    selected: true,
    tasks: ["Match current sidebar", "Review responsive shell"],
  },
  {
    id: "design-assets",
    label: "design-assets",
    status: "unread" as const,
    tasks: [
      "Audit monthly layout",
      "Compare visual baseline",
      "Tune compact spacing",
    ],
  },
  {
    id: "protocol-client",
    label: "protocol-client",
    tasks: ["Check compatibility matrix"],
  },
];

function currentSidebarTaskStatus(projectId: string, taskIndex: number) {
  const fixture = `${projectId}:${taskIndex}`;
  switch (fixture) {
    case "session-browser:0":
      return "active" as const;
    case "desktop-cleanup:0":
      return "waiting" as const;
    case "codex-ui-kit:0":
      return "unread" as const;
    case "design-assets:2":
      return "unread" as const;
    default:
      return "idle" as const;
  }
}

function currentSidebarTaskWorktreeStatus(
  projectId: string,
  taskIndex: number,
): AppSidebarWorktreeStatus | undefined {
  const fixture = `${projectId}:${taskIndex}`;
  return {
    "codex-ui-kit:1": "queued",
    "design-assets:0": "creating",
    "design-assets:1": "setting-up",
    "design-assets:2": "failed",
    "protocol-client:0": "restored",
  }[fixture] as AppSidebarWorktreeStatus | undefined;
}

function currentSidebarTaskStatusLabel(projectId: string, taskIndex: number) {
  const worktreeStatus = currentSidebarTaskWorktreeStatus(
    projectId,
    taskIndex,
  );
  if (worktreeStatus) {
    return {
      queued: "Worktree creation is queued",
      creating: "Worktree is being created",
      "setting-up": "Worktree is being set up",
      failed: "Worktree init failed",
      restored: undefined,
    }[worktreeStatus];
  }
  const status = currentSidebarTaskStatus(projectId, taskIndex);
  return {
    active: "Task is active",
    idle: undefined,
    unread: "Task has an unread update",
    waiting: "Task is waiting for a response",
  }[status];
}

export function App() {
  const initialSelection = useMemo(querySelection, []);
  const [scenarioId, setScenarioId] = useState<ReplayScenarioId>(
    initialSelection.scenarioId,
  );
  const scenario = replayScenarios[scenarioId];
  const initialCount = replayCountForSelection(
    scenario,
    initialSelection.frame,
  );
  const [replayCount, setReplayCount] = useState(initialCount);
  const [liveState, dispatchLive] = useReducer(
    reduceProtocolNotification,
    initialProtocolState,
  );
  const [mode, setMode] = useState<"live" | "replay">("replay");
  const [theme, setTheme] = useState<DemoThemePreference>(
    initialSelection.theme,
  );
  const [view, setView] = useState<DemoView>(initialSelection.view);
  const themeAvailable = isDemoThemeView(view);
  const appliedTheme = themeAvailable ? theme : "dark";
  const [workspaceProjectId, setWorkspaceProjectId] = useState<
    string | null
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-no-project"
      ? null
      : initialSelection.view === "workspace" &&
          initialSelection.frame === "workspace-environment" &&
          window.codexDemo
        ? window.codexDemo.workspaceProjectId
      : "codex-ui-kit",
  );
  const workspaceProjectIdRef = useRef(workspaceProjectId);
  const workspaceBranchCheckoutActiveRef = useRef(false);
  const workspaceRunLocationVersionRef = useRef(0);
  const [projectIndexQuery, setProjectIndexQuery] = useState(
    initialSelection.frame === "projects-index-empty" ? "missing" : "",
  );
  const [createdProjects, setCreatedProjects] = useState<
    Array<{
      id: string;
      label: string;
      path: string;
      projectToken?: string;
    }>
  >([]);
  const [workspaceProjectTokens, setWorkspaceProjectTokens] = useState<
    Record<string, string>
  >(() =>
    window.codexDemo
      ? {
          [window.codexDemo.workspaceProjectId]:
            window.codexDemo.startupWorkspaceProjectToken,
        }
      : {},
  );
  const [workspaceHostBranchesByProject, setWorkspaceHostBranchesByProject] =
    useState<Record<string, WorkspaceHostBranchState>>({});
  const workspaceProjectToken = workspaceProjectId
    ? workspaceProjectTokens[workspaceProjectId]
    : undefined;
  const workspaceUsesHostBranches = Boolean(
    window.codexDemo && !window.codexDemo.useWorkspaceBranchFixture,
  );
  const [projectIndexChat, setProjectIndexChat] = useState<
    | {
        chatId: string;
        chatLabel: string;
        projectId: string;
      }
    | undefined
  >();
  const [projectIndexChatTurns, setProjectIndexChatTurns] = useState<
    Array<{ id: number; prompt: string; response: string }>
  >([]);
  const projectIndexChatTurnCounterRef = useRef(0);
  const [projectCreationStatus, setProjectCreationStatus] = useState<
    "error" | "idle" | "selecting"
  >("idle");
  const [projectCreationSource, setProjectCreationSource] = useState<
    "projects" | "sidebar" | "workspace" | null
  >(null);
  const [projectIndexSortBy, setProjectIndexSortBy] = useState<
    "name" | "updated"
  >("updated");
  const [projectIndexSortDirection, setProjectIndexSortDirection] =
    useState<"ascending" | "descending">("descending");
  const [expandedProjectIndexIds, setExpandedProjectIndexIds] = useState(
    () =>
      new Set(
        initialSelection.frame === "projects-index-expanded"
          ? ["codex-ui-kit"]
          : [],
      ),
  );
  const [workspaceEnvironmentId, setWorkspaceEnvironmentId] =
    useState<"local" | "worktree">(
      initialSelection.view === "workspace" &&
        (initialSelection.frame === "workspace-new-worktree" ||
          initialSelection.frame === "workspace-environment-picker" ||
          initialSelection.frame === "workspace-environments-unavailable")
        ? "worktree"
        : "local",
    );
  const [workspacePage, setWorkspacePage] = useState<
    | "appearance-settings"
    | "code-review-settings"
    | "conversation"
    | "environments"
    | "general-settings"
    | "git-settings"
    | "hooks-settings"
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-environments-unavailable"
      ? "environments"
      : initialSelection.view === "workspace" &&
          ["workspace-git-settings", "workspace-git-settings-compact"].includes(
            initialSelection.frame ?? "",
          )
        ? "git-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-hooks-settings")
        ? "hooks-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-code-review-settings")
        ? "code-review-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-general-settings")
        ? "general-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-appearance-settings")
        ? "appearance-settings"
      : "conversation",
  );
  const [settingsQuery, setSettingsQuery] = useState("");
  const [selectedSettingsId, setSelectedSettingsId] = useState(
    initialSelection.frame?.startsWith("workspace-general-settings")
      ? "general"
      : initialSelection.frame?.startsWith("workspace-appearance-settings")
        ? "appearance"
        : initialSelection.frame?.startsWith("workspace-hooks-settings")
          ? "hooks"
        : initialSelection.frame?.startsWith("workspace-code-review-settings")
          ? "code-review"
        : "git",
  );
  const [settingsRouteFocusPending, setSettingsRouteFocusPending] =
    useState(false);
  const settingsBackButtonRef = useRef<HTMLButtonElement>(null);
  const [gitSettings, setGitSettings] = useState<GitSettingsValue>({
    alwaysForcePush: false,
    branchPrefix: "",
    commitInstructions: "",
    createDraftPullRequests: true,
    mergeMethod: "merge",
    pullRequestInstructions: "",
    reviewDelivery: "inline",
  });
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettingsValue>({
      codeFontSize: 12,
      dark: {
        accent: "#339CFF",
        background: "#181818",
        codeFont: 'ui-monospace, "SFMono-Regular"',
        codeTheme: "Codex",
        contrast: 60,
        foreground: "#FFFFFF",
        translucentSidebar: true,
        uiFont: "-apple-system, BlinkMacSystemFont",
      },
      diffMarkers: "color",
      dockIcon: "codex",
      fontSmoothing: true,
      light: {
        accent: "#339CFF",
        background: "#FFFFFF",
        codeFont: 'ui-monospace, "SFMono-Regular"',
        codeTheme: "Codex",
        contrast: 45,
        foreground: "#1A1C1F",
        translucentSidebar: true,
        uiFont: "-apple-system, BlinkMacSystemFont",
      },
      reduceMotion: "system",
      theme: "system",
      uiFontSize: 14,
      usePointerCursors: false,
    });
  const [appearanceThemeAction, setAppearanceThemeAction] = useState("");
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsValue>({
    ambientSuggestions: true,
    autoReview: true,
    bottomPanel: true,
    defaultFileOpenDestination: "vscode",
    followUpBehavior: "queue",
    fullAccess: true,
    language: "auto",
    permissionNotifications: true,
    pluginsEnabled: true,
    popoutHotkey: null,
    popoutStandaloneChat: false,
    preventSleepWhileRunning: false,
    questionNotifications: true,
    sendShortcut: "enter",
    showContextWindowUsage: false,
    showInMenuBar: true,
    speed: "standard",
    terminalLocation: "bottom",
    turnCompletionNotifications: "unfocused",
  });
  const [generalHotkeyCaptureActive, setGeneralHotkeyCaptureActive] = useState(
    initialSelection.frame === "workspace-general-settings-hotkey",
  );
  useEffect(() => {
    if (workspacePage !== "general-settings") {
      setGeneralHotkeyCaptureActive(false);
    }
  }, [workspacePage]);
  const [generalSettingsAction, setGeneralSettingsAction] = useState("");
  const [hookSettingsEntries, setHookSettingsEntries] = useState<
    readonly HookSettingsEntry[]
  >(() =>
    initialSelection.frame === "workspace-hooks-settings-configured"
      ? configuredHookSettingsEntries
      : [],
  );
  const [hookSettingsStatus, setHookSettingsStatus] = useState<
    "error" | "loading" | "ready"
  >(() =>
    initialSelection.frame === "workspace-hooks-settings-loading"
      ? "loading"
      : initialSelection.frame === "workspace-hooks-settings-error"
        ? "error"
        : "ready",
  );
  const [hooksRefreshing, setHooksRefreshing] = useState(false);
  const [hooksSettingsAction, setHooksSettingsAction] = useState("");
  const [codeReviewSettings, setCodeReviewSettings] =
    useState<CodeReviewSettingsValue>({
      allowCreditsForCodeReviews: false,
      automaticReview: true,
      exhaustiveCodeReview: false,
      triggerPolicy: "pr_open",
    });
  const [savedCommitInstructions, setSavedCommitInstructions] = useState("");
  const [savedPullRequestInstructions, setSavedPullRequestInstructions] =
    useState("");
  const [workspaceWorktreeId, setWorkspaceWorktreeId] = useState(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-repairing"
      ? "repairing"
      : initialSelection.view === "workspace" &&
          initialSelection.frame === "workspace-branch-created"
        ? capturedWorkspaceBranch.id
      : initialSelection.view === "workspace" && initialSelection.capture
        ? "feature"
        : "main",
  );
  const workspaceLinkedWorktreeSelectionRef = useRef<string | null>(null);
  const workspaceWorktreeIdRef = useRef(workspaceWorktreeId);
  const updateWorkspaceWorktreeId = (
    worktreeId: string,
    linkedSelection = false,
  ) => {
    workspaceLinkedWorktreeSelectionRef.current = linkedSelection
      ? worktreeId
      : null;
    workspaceWorktreeIdRef.current = worktreeId;
    setWorkspaceWorktreeId(worktreeId);
  };
  const [workspaceLocalEnvironmentOpen, setWorkspaceLocalEnvironmentOpen] =
    useState(
      initialSelection.view === "workspace" &&
        initialSelection.frame === "workspace-environment",
    );
  const [workspaceOverlay, setWorkspaceOverlay] = useState<
    | "environment"
    | "project"
    | "worktree"
    | "worktree-environment"
    | null
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-project-menu"
      ? "project"
      : initialSelection.view === "workspace" &&
          initialSelection.frame === "workspace-environment-menu"
        ? "environment"
        : initialSelection.view === "workspace" &&
            initialSelection.frame === "workspace-worktree-menu"
          ? "worktree"
          : initialSelection.view === "workspace" &&
              initialSelection.frame === "workspace-environment-picker"
            ? "worktree-environment"
            : null,
  );
  const [workspaceBranchQuery, setWorkspaceBranchQuery] = useState("");
  const [workspaceCreatedBranches, setWorkspaceCreatedBranches] = useState<
    Record<string, WorkspaceBranch[]>
  >(() =>
    initialSelection.frame === "workspace-branch-created"
      ? { "codex-ui-kit": [capturedWorkspaceBranch] }
      : ({} as Record<string, WorkspaceBranch[]>),
  );
  const [workspaceBranchDialogOpen, setWorkspaceBranchDialogOpen] =
    useState(
      initialSelection.view === "workspace" &&
        [
          "workspace-branch-create",
          "workspace-branch-create-error",
          "workspace-branch-create-filled",
        ].includes(initialSelection.frame ?? ""),
    );
  const [workspaceBranchName, setWorkspaceBranchName] = useState(() =>
    initialSelection.frame === "workspace-branch-create-error"
      ? "main"
      : initialSelection.frame === "workspace-branch-create-filled"
        ? "feat/current-branch"
        : "",
  );
  const [workspaceBranchStatus, setWorkspaceBranchStatus] = useState<
    "creating" | "error" | "idle"
  >(
    initialSelection.frame === "workspace-branch-create-error"
      ? "error"
      : "idle",
  );
  const [workspaceBranchError, setWorkspaceBranchError] = useState<
    string | undefined
  >(
    initialSelection.frame === "workspace-branch-create-error"
      ? "A branch named main already exists."
      : undefined,
  );
  const [workspaceBranchSwitchError, setWorkspaceBranchSwitchError] =
    useState<string>();
  const [workspaceBranchCheckoutPending, setWorkspaceBranchCheckoutPending] =
    useState(false);
  const updateWorkspaceProjectId = (projectId: string | null) => {
    workspaceProjectIdRef.current = projectId;
    setWorkspaceBranchSwitchError(undefined);
    setWorkspaceProjectId(projectId);
  };
  const [workspaceEnvironmentQuery, setWorkspaceEnvironmentQuery] =
    useState("");
  const [workspaceProjectQuery, setWorkspaceProjectQuery] = useState("");
  const [workspaceProjectTriggerId, setWorkspaceProjectTriggerId] =
    useState("demo-workspace-project-trigger");
  const [shellState, setShellState] = useState<AppRouteOutletStatus>(
    initialSelection.shellState,
  );
  const [shellNotificationVisible, setShellNotificationVisible] = useState(
    initialSelection.shellState === "ready" &&
      initialSelection.frame === "shell-restored",
  );
  const [shellQueuedNotificationIds, setShellQueuedNotificationIds] = useState<
    string[]
  >(() =>
    initialSelection.frame === "shell-notification-queue"
      ? ["permission", "background", "restored", "update"]
      : [],
  );
  const [shellNotificationAction, setShellNotificationAction] = useState<
    string | null
  >(null);
  const [appServerCrashed, setAppServerCrashed] = useState(
    initialSelection.frame === "app-server-crashed",
  );
  const [composerValue, setComposerValue] = useState(() =>
    initialComposerValue(initialSelection.frame),
  );
  const [workspacePersistedTaskAvailable] = useState(() =>
    currentWorkspacePersistenceFrame(initialSelection.frame),
  );
  const [workspaceDirectoryMissing] = useState(
    initialSelection.frame === "workspace-directory-missing",
  );
  const [workspaceModelOnlyTurns, setWorkspaceModelOnlyTurns] = useState<
    Array<{ id: number; prompt: string; response: string }>
  >([]);
  const [composerOverlay, setComposerOverlay] =
    useState<ComposerOverlay>(() =>
      initialComposerOverlay(initialSelection.frame),
    );
  const [composerMode, setComposerMode] = useState<ComposerMode>(() =>
    initialComposerMode(initialSelection.frame),
  );
  const [composerPermissionId, setComposerPermissionId] =
    useState("full");
  const [composerResourceActiveId, setComposerResourceActiveId] =
    useState("files");
  const [composerAttachments, setComposerAttachments] = useState<
    DemoComposerAttachmentItem[]
  >(() => attachmentItemsForFrame(initialSelection.frame));
  const [submittedComposerAttachments, setSubmittedComposerAttachments] =
    useState<DemoComposerAttachmentItem[]>([]);
  const [submittedComposerPrompt, setSubmittedComposerPrompt] = useState<
    string | null
  >(null);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPrompt[]>(() =>
    initialQueuedPrompts(initialSelection.frame),
  );
  const [queueingEnabled, setQueueingEnabled] = useState(true);
  const [queueInterrupted, setQueueInterrupted] = useState(
    initialSelection.frame === "composer-queue-paused",
  );
  const [replayComposerSubmitting, setReplayComposerSubmitting] = useState(
    initialSelection.frame === "composer-disabled",
  );
  const [replayComposerFocusRequest, setReplayComposerFocusRequest] =
    useState(0);
  const [replayComposerStopped, setReplayComposerStopped] = useState(
    initialSelection.frame === "composer-queue-paused",
  );
  const [threadSummaryOpen, setThreadSummaryOpen] = useState(
    initialSelection.frame === "context-summary-open" ||
      currentSubagentSummaryFrame(initialSelection.frame) ||
      currentWorkspacePersistenceFrame(initialSelection.frame),
  );
  const [mcpSourceSummaryOpen, setMcpSourceSummaryOpen] = useState(
    initialSelection.summaryState === "floating" ||
      initialSelection.summaryState === "pinned",
  );
  const [mcpSourceSummaryPinned, setMcpSourceSummaryPinned] = useState(
    initialSelection.summaryState === "pinned",
  );
  const [replayQueuedContinuation, setReplayQueuedContinuation] =
    useState<string | null>(() =>
      initialQueuedContinuation(initialSelection.frame),
    );
  const [replayApprovalResolution, setReplayApprovalResolution] =
    useState<{
      decision: "approved" | "rejected";
      requestId: number | string;
    } | null>(null);
  const [replaySessionApprovalScope, setReplaySessionApprovalScope] = useState<
    "once" | "session" | null
  >(
    initialSelection.scenarioId === "approval-for-session" &&
      initialSelection.frame !== "approval-current-session-pending"
      ? "session"
      : null,
  );
  const [workspaceRunCwd, setWorkspaceRunCwd] = useState(
    "/workspace/codex-ui-kit",
  );
  const [workspaceRunPrompt, setWorkspaceRunPrompt] = useState<
    string | undefined
  >(undefined);
  const [workspaceRunProjectLabel, setWorkspaceRunProjectLabel] =
    useState(
      initialSelection.frame === "terminal-current-mismatch"
        ? "assets"
        : "codex-ui-kit",
    );
  const [threadFollowing, setThreadFollowing] = useState(
    initialSelection.frame !== "thread-scroll-away" &&
      initialSelection.frame !== "thread-windowed",
  );
  const [activeFrame, setActiveFrame] = useState(initialSelection.frame);
  const [scenarioSelectionVersion, setScenarioSelectionVersion] =
    useState(0);
  const [windowedSelectedMessageIndex, setWindowedSelectedMessageIndex] =
    useState(currentWindowedInitialIndex);
  const [liveStartPending, setLiveStartPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      initialSelection.sidebarState !== "hidden" &&
      ((initialSelection.capture &&
        initialSelection.frame !== "pr-compact-detail" &&
        initialSelection.frame !== "workspace-compact-ready" &&
        initialSelection.frame !== "mcp-current-integration-recovered" &&
        initialSelection.frame !== "mcp-current-recovery-completed" &&
        initialSelection.frame !== "current-mixed-completed" &&
        initialSelection.frame !== "subagent-current-compact-720" &&
        initialSelection.sidebarState !== "compact-collapsed") ||
        !isNarrowDemoWindow()),
  );
  const [currentSidebarExpandedProjectIds, setCurrentSidebarExpandedProjectIds] =
    useState<Set<string>>(
      () =>
        new Set(
          currentSidebarProjects
            .filter(
              (_project, index) =>
                initialSelection.view !== "projects" &&
                (initialSelection.sidebarState !== "project-collapsed" ||
                  index !== 0),
            )
            .map((project) => project.id),
        ),
    );
  const [currentSidebarProjectMenuId, setCurrentSidebarProjectMenuId] =
    useState<string | null>(
      initialSelection.sidebarState === "project-menu"
        ? currentSidebarProjects[0].id
        : null,
    );
  const [currentSidebarHelpMenuOpen, setCurrentSidebarHelpMenuOpen] =
    useState(initialSelection.sidebarState === "help-menu");
  const [currentSidebarAccountMenuOpen, setCurrentSidebarAccountMenuOpen] =
    useState(initialSelection.sidebarState === "account-menu");
  const [reviewOpen, setReviewOpen] = useState(
    initialSelection.frame === "review-open" ||
      initialSelection.frame === "mixed-review-open" ||
      initialSelection.frame === "current-mixed-review-open",
  );
  const [subagentPanelOpen, setSubagentPanelOpen] = useState(
    currentSubagentPanelFrame(initialSelection.frame),
  );
  const [activeConversationSidePanel, setActiveConversationSidePanel] =
    useState<"review" | "subagents">(
      currentSubagentPanelFrame(initialSelection.frame)
        ? "subagents"
        : "review",
    );
  const [subagentClockMs, setSubagentClockMs] = useState(() => Date.now());
  const [selectedSubagentId, setSelectedSubagentId] = useState<string | null>(
    initialSubagentId(initialSelection.frame),
  );
  const [subagentPanelWidth, setSubagentPanelWidth] = useState(
    initialSelection.frame === "subagent-current-compact-820"
      ? 319
      : initialSelection.frame === "subagent-current-compact-720"
        ? 329.3125
        : 369.28125,
  );
  const [terminalOpen, setTerminalOpen] = useState(
    initialSelection.scenarioId === "background-terminal" ||
      (initialSelection.scenarioId === "terminal-lifecycle" &&
        initialSelection.frame !== "terminal-current-closed" &&
        initialSelection.frame !== "terminal-current-background-list" &&
        initialSelection.frame !== "terminal-current-background-open" &&
        initialSelection.frame !== "terminal-closed"),
  );
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>(() =>
    initialTerminalSessionIds(
      initialSelection.scenarioId,
      initialSelection.frame,
    ),
  );
  const [closedTerminalSessionIds, setClosedTerminalSessionIds] =
    useState<string[]>(() =>
      initialClosedTerminalSessionIds(
        initialSelection.scenarioId,
        initialSelection.frame,
      ),
    );
  const [terminalTabPickerOpen, setTerminalTabPickerOpen] = useState(
    initialSelection.frame === "terminal-picker",
  );
  const [terminalCommandId, setTerminalCommandId] = useState<string | null>(
    () =>
      initialTerminalSessionIds(
        initialSelection.scenarioId,
        initialSelection.frame,
      ).at(-1) ?? null,
  );
  const [terminalHeight, setTerminalHeight] = useState(272);
  const [terminalValuesByCommand, setTerminalValuesByCommand] = useState<
    Record<string, string>
  >({});
  const [terminalHistoryByCommand, setTerminalHistoryByCommand] = useState<
    Record<string, TerminalEntry[]>
  >(() =>
    initialTerminalHistory(
      initialSelection.scenarioId,
      initialSelection.frame,
    ),
  );
  const [terminalWorkspaceBySession, setTerminalWorkspaceBySession] =
    useState<Record<string, string>>(() =>
      initialTerminalWorkspaceLabels(
        initialSelection.scenarioId,
        initialSelection.frame,
      ),
    );
  const [dismissedTerminalMismatchIds, setDismissedTerminalMismatchIds] =
    useState<Set<string>>(() => new Set());
  const [terminalReloadPendingIds, setTerminalReloadPendingIds] =
    useState<Set<string>>(() => new Set());
  const [terminalReloadSessionId, setTerminalReloadSessionId] =
    useState<string | null>(() =>
      initialSelection.frame === "terminal-current-reload"
        ? "local-terminal-1"
        : null,
    );
  const [backgroundTerminalPanelWidth, setBackgroundTerminalPanelWidth] =
    useState(381.4375);
  const [backgroundTerminalPanelOpen, setBackgroundTerminalPanelOpen] =
    useState(
      initialSelection.scenarioId === "terminal-lifecycle" &&
        (initialSelection.frame === "terminal-current-background-list" ||
          initialSelection.frame === "terminal-current-background-open"),
    );
  const [backgroundTerminalRunning, setBackgroundTerminalRunning] =
    useState(true);
  const [reviewSelection, setReviewSelection] =
    useState<ReviewSelection | null>(null);
  const [reviewSelectionKey, setReviewSelectionKey] = useState(0);
  const [reviewPanelWidth, setReviewPanelWidth] = useState(
    initialSelection.scenarioId === "current-review-files" ? 382.4375 : 370,
  );
  const [fileRevertErrorOpen, setFileRevertErrorOpen] = useState(
    initialSelection.frame === "undo-failed",
  );
  const [rawToolOutput, setRawToolOutput] = useState<{
    name: string;
    value: unknown;
  } | null>(null);
  const [pullRequestState, dispatchPullRequest] = useReducer(
    reducePullRequestLifecycle,
    initialSelection.frame,
    initialPullRequestLifecycleState,
  );
  const [pullRequestExpanded, setPullRequestExpanded] = useState(false);
  const [pullRequestOpen, setPullRequestOpen] = useState(
    initialSelection.view === "pull-request" &&
      pullRequestState.selectedId !== null,
  );
  const [pullRequestWidth, setPullRequestWidth] = useState(370);
  const [pullRequestTab, setPullRequestTab] = useState<
    "code" | "summary"
  >(
    initialSelection.frame?.startsWith("pr-review-")
      ? "code"
      : "summary",
  );
  const [pullRequestReviewOpen, setPullRequestReviewOpen] = useState(
    initialSelection.frame?.startsWith("pr-review-") ?? false,
  );
  const [pullRequestReviewMenuOpen, setPullRequestReviewMenuOpen] =
    useState(false);
  const [undoneFileIds, setUndoneFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveStartPendingRef = useRef(false);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const composerResourceTriggerRef = useRef<HTMLButtonElement>(null);
  const mcpSourceSummaryTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceEnvironmentTriggerRef =
    useRef<HTMLButtonElement>(null);
  const workspaceWorktreeTriggerRef = useRef<HTMLButtonElement>(null);
  const [workspaceEnvironmentLauncher, setWorkspaceEnvironmentLauncher] =
    useState<"environment" | "worktree">("environment");
  const queuedPromptCounterRef = useRef(1);
  const attachmentSelectionCounterRef = useRef(1);
  const workspaceModelOnlyTurnCounterRef = useRef(1);
  const terminalSessionCounterRef = useRef(
    initialTerminalSessionIds(
      initialSelection.scenarioId,
      initialSelection.frame,
    ).filter((sessionId) => sessionId.startsWith("local-terminal-")).length +
      1,
  );
  const replaySubmitTimerRef = useRef<number | null>(null);
  const pullRequestTransitionTimerRef = useRef<number | null>(null);
  const terminalReloadTimerRef = useRef<number | null>(null);
  const threadViewportRef = useRef<HTMLDivElement>(null);
  const liveApprovalSubmissionGateRef = useRef(
    new LiveApprovalSubmissionGate(),
  );
  const scenarioEvents = useMemo(
    () =>
      scenario.id === "workspace-workflow"
        ? contextualizeWorkspaceReplay(
            scenario.events,
            workspaceRunCwd,
            workspaceRunPrompt,
          )
        : scenario.events,
    [scenario, workspaceRunCwd, workspaceRunPrompt],
  );
  const replay = useMemo(
    () => replayState(scenarioEvents, replayCount),
    [replayCount, scenarioEvents],
  );
  const isConversationLifecycle =
    mode === "replay" && scenarioId === "conversation-lifecycle";
  const lifecycleReplay = useMemo(
    () => {
      if (!isConversationLifecycle) return replay;
      const continuedReplay = replayQueuedContinuation
        ? continueQueuedConversationReplay(
            replay,
            replayQueuedContinuation,
          )
        : replay;
      return replayComposerStopped
        ? interruptConversationReplay(continuedReplay)
        : continuedReplay;
    },
    [
      isConversationLifecycle,
      replay,
      replayComposerStopped,
      replayQueuedContinuation,
    ],
  );
  const state = useMemo(
    () => {
      if (mode === "live") return liveState;
      const resolvedReplay = replayApprovalResolution
        ? reduceProtocolNotification(lifecycleReplay, {
            ...replayApprovalResolution,
            kind: "approval-resolution",
          })
        : lifecycleReplay;
      if (
        scenarioId === "approval-denied" &&
        replayApprovalResolution?.decision === "approved"
      ) {
        return settleApprovedCommandReplay(
          resolvedReplay,
          replayApprovalResolution.requestId,
          {
            durationMs: 23_000,
            messageId: "assistant-approval-approved",
            messageText:
              "Approval was granted, and the command completed successfully.",
            replacedMessageId: "assistant-approval-denied",
          },
        );
      }
      if (
        scenarioId === "approval-for-session" &&
        replayApprovalResolution?.decision === "rejected"
      ) {
        return settleRejectedFileReplay(
          resolvedReplay,
          replayApprovalResolution.requestId,
        );
      }
      return resolvedReplay;
    },
    [
      lifecycleReplay,
      liveState,
      mode,
      replayApprovalResolution,
    ],
  );
  const isCurrentApprovalReplay =
    mode === "replay" &&
    (scenarioId === "approval-allow-once" ||
      scenarioId === "approval-denied" ||
      scenarioId === "approval-similar-commands" ||
      scenarioId === "approval-for-session");
  const isCurrentApprovalSimilarReplay =
    mode === "replay" && scenarioId === "approval-similar-commands";
  const isCurrentApprovalSessionReplay =
    mode === "replay" && scenarioId === "approval-for-session";
  const isCurrentAutomaticReviewReplay =
    mode === "replay" && scenarioId === "approval-review-timeout";
  const isCurrentAttachmentReplay =
    mode === "replay" && scenarioId === "attachment-lifecycle";
  const isCurrentLongCommandReplay =
    mode === "replay" && scenarioId === "long-command-output";
  const isCurrentCommandFailureReplay =
    mode === "replay" && scenarioId === "command-failure-recovery";
  const isCurrentCommandInterruptionReplay =
    mode === "replay" && scenarioId === "interruption";
  const isCurrentContextCompactionReplay =
    mode === "replay" && scenarioId === "compaction";
  const isCurrentContextSummaryReplay =
    mode === "replay" && scenarioId === "context-summary";
  const isCurrentTransportRecoveryReplay =
    mode === "replay" && scenarioId === "streaming-recovery";
  const isCurrentBasicMessageReplay =
    mode === "replay" && scenarioId === "current-basic-message";
  const isCurrentMarkdown26818Replay =
    mode === "replay" && scenarioId === "markdown-current-26-818";
  const isCurrentMixedToolReplay =
    mode === "replay" && scenarioId === "current-mixed-tool-thread";
  const isCurrentReviewFilesReplay =
    mode === "replay" && scenarioId === "current-review-files";
  const isCurrentMcp26818SuccessReplay =
    mode === "replay" && scenarioId === "mcp-current-26-818-success";
  const isCurrentMcp26818RecoveryReplay =
    mode === "replay" && scenarioId === "mcp-current-26-818-recovery";
  const isCurrentMcp26818Replay =
    isCurrentMcp26818SuccessReplay || isCurrentMcp26818RecoveryReplay;
  const isCurrentMcpSuccessReplay =
    mode === "replay" &&
    (scenarioId === "mcp-current-success" ||
      scenarioId === "mcp-current-26-818-success");
  const isCurrentMcpRecoveryReplay =
    mode === "replay" &&
    (scenarioId === "mcp-current-recovery" ||
      scenarioId === "mcp-current-26-818-recovery");

  useEffect(() => {
    setReviewPanelWidth(isCurrentReviewFilesReplay ? 382.4375 : 370);
  }, [isCurrentReviewFilesReplay]);
  const isCurrentMcpReplay =
    mode === "replay" &&
    (scenarioId === "current-mixed-tool-thread" ||
      scenarioId === "mcp-current-integration-recovery" ||
      isCurrentMcpSuccessReplay ||
      isCurrentMcpRecoveryReplay);
  const isCurrentSubagentReplay =
    mode === "replay" && isSubagentScenarioId(scenarioId);
  const hasSubagentSurface =
    isCurrentSubagentReplay ||
    isCurrentMixedToolReplay ||
    (mode === "live" && state.subagents.length > 0);
  const subagentPanelSelected =
    hasSubagentSurface && activeConversationSidePanel === "subagents";
  const replayComposerRunning =
    isConversationLifecycle && state.status === "running";

  useEffect(() => {
    if (replayComposerFocusRequest === 0) return;
    composerInputRef.current?.focus();
  }, [replayComposerFocusRequest]);

  useEffect(() => {
    if (!hasSubagentSurface) return;
    const syncSubagentPanelWidth = () => {
      setSubagentPanelWidth(
        window.innerWidth <= 720
          ? 329.3125
          : window.innerWidth <= 820
            ? 319
            : 369.28125,
      );
    };
    syncSubagentPanelWidth();
    window.addEventListener("resize", syncSubagentPanelWidth);
    return () => {
      window.removeEventListener("resize", syncSubagentPanelWidth);
    };
  }, [hasSubagentSurface]);

  useEffect(() => {
    if (
      mode !== "live" ||
      state.subagents.length === 0 ||
      !subagentPanelSelected ||
      !subagentPanelOpen ||
      selectedSubagentId !== null
    ) {
      return;
    }
    setSubagentClockMs(Date.now());
    const timer = window.setInterval(() => setSubagentClockMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [
    mode,
    selectedSubagentId,
    state.subagents.length,
    subagentPanelOpen,
    subagentPanelSelected,
  ]);

  useEffect(() => {
    if (!window.codexDemo) return;
    const removeNotification = window.codexDemo.onNotification((notification) => {
      dispatchLive(notification);
    });
    const removeServerRequest = window.codexDemo.onServerRequest((request) => {
      dispatchLive(request);
    });
    return () => {
      removeNotification();
      removeServerRequest();
    };
  }, []);

  useEffect(() => {
    if (
      !workspaceUsesHostBranches ||
      !window.codexDemo ||
      !workspaceProjectId ||
      !workspaceProjectToken
    ) {
      return;
    }
    const projectId = workspaceProjectId;
    const initialWorktreeId = workspaceWorktreeIdRef.current;
    let cancelled = false;
    setWorkspaceHostBranchesByProject((current) => ({
      ...current,
      [projectId]: { status: "loading" },
    }));
    void window.codexDemo
      .listBranches({ projectToken: workspaceProjectToken })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) {
          setWorkspaceHostBranchesByProject((current) => ({
            ...current,
            [projectId]: {
              message: response.message,
              status: "error",
            },
          }));
          return;
        }
        setWorkspaceHostBranchesByProject((current) => ({
          ...current,
          [projectId]: {
            branches: response.branches,
            branchesCheckedOutElsewhere:
              response.branchesCheckedOutElsewhere,
            branchesUnavailableForCheckout:
              response.branchesUnavailableForCheckout,
            currentBranch: response.currentBranch,
            status: "ready",
            unbornBranch: response.unbornBranch,
          },
        }));
        if (workspaceProjectIdRef.current === projectId) {
          setWorkspaceWorktreeId((currentWorktreeId) => {
            if (
              workspaceLinkedWorktreeSelectionRef.current !== null ||
              currentWorktreeId !== initialWorktreeId
            ) {
              return currentWorktreeId;
            }
            const nextWorktreeId = response.currentBranch
              ? workspaceGitBranchId(response.currentBranch)
              : unattachedWorkspaceBranchId;
            workspaceWorktreeIdRef.current = nextWorktreeId;
            return nextWorktreeId;
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceHostBranchesByProject((current) => ({
          ...current,
          [projectId]: {
            message: "Git could not list the repository branches.",
            status: "error",
          },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    workspaceProjectId,
    workspaceProjectToken,
    workspaceUsesHostBranches,
  ]);

  useEffect(() => {
    applyDemoThemePreference(document.documentElement, appliedTheme);
  }, [appliedTheme]);

  useEffect(() => {
    liveApprovalSubmissionGateRef.current.retainPending(
      liveState.approvals
        .filter(({ decision }) => decision === "pending")
        .map(({ requestId }) => requestId),
    );
  }, [liveState.approvals]);

  useEffect(
    () => () => {
      if (replaySubmitTimerRef.current !== null) {
        window.clearTimeout(replaySubmitTimerRef.current);
      }
      if (pullRequestTransitionTimerRef.current !== null) {
        window.clearTimeout(pullRequestTransitionTimerRef.current);
      }
      if (terminalReloadTimerRef.current !== null) {
        window.clearTimeout(terminalReloadTimerRef.current);
      }
    },
    [],
  );

  const cancelReplaySubmitTimer = () => {
    if (replaySubmitTimerRef.current === null) return;
    window.clearTimeout(replaySubmitTimerRef.current);
    replaySubmitTimerRef.current = null;
  };

  const cancelTerminalReloadTimer = () => {
    if (terminalReloadTimerRef.current === null) return;
    window.clearTimeout(terminalReloadTimerRef.current);
    terminalReloadTimerRef.current = null;
  };

  const completeReplayComposerSubmission = () => {
    setReplayComposerSubmitting(false);
    setReplayComposerFocusRequest((request) => request + 1);
  };

  const schedulePullRequestTransition = useCallback(
    (
      pending: PullRequestLifecycleAction,
      settled: PullRequestLifecycleAction,
    ) => {
      if (pullRequestTransitionTimerRef.current !== null) {
        window.clearTimeout(pullRequestTransitionTimerRef.current);
      }
      dispatchPullRequest(pending);
      pullRequestTransitionTimerRef.current = window.setTimeout(() => {
        dispatchPullRequest(settled);
        pullRequestTransitionTimerRef.current = null;
      }, 420);
    },
    [],
  );

  const selectReplayPosition = (nextCount: number) => {
    cancelReplaySubmitTimer();
    const replaySessionFrame =
      scenarioId === "approval-for-session"
        ? (Object.entries(scenario.frames).find(
            ([, frameCount]) => frameCount === nextCount,
          )?.[0] ?? null)
        : null;
    const replaySessionFirstCompletedCount =
      scenario.frames["approval-current-session-first-completed"];
    setActiveFrame(replaySessionFrame);
    setComposerOverlay(null);
    if (isCurrentAttachmentReplay) {
      setComposerAttachments([]);
      setSubmittedComposerAttachments([]);
      setSubmittedComposerPrompt(null);
    }
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(
      scenarioId === "approval-for-session" &&
        replaySessionFirstCompletedCount !== undefined &&
        nextCount >= replaySessionFirstCompletedCount
        ? "session"
        : null,
    );
    setThreadSummaryOpen(false);
    setQueueInterrupted(false);
    if (!isTurnActive(replayState(scenarioEvents, nextCount).status)) {
      setQueuedPrompts([]);
    }
    setReplayCount(nextCount);
  };

  const dismissSidebarAfterNavigation = () => {
    if (!isNarrowDemoWindow()) return;
    const shell = document.querySelector(".codex-ui-app-shell");
    if (!shell?.hasAttribute("data-sidebar-pinned")) {
      setSidebarOpen(false);
    }
  };

  const openWorkspace = (
    projectId: string | null = workspaceProjectId,
  ) => {
    cancelReplaySubmitTimer();
    setMode("replay");
    setView("workspace");
    setProjectIndexChat(undefined);
    setWorkspacePage("conversation");
    updateWorkspaceProjectId(projectId);
    setWorkspaceEnvironmentId("local");
    updateWorkspaceWorktreeId("main");
    setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceOverlay(null);
    setWorkspaceBranchQuery("");
    setWorkspaceEnvironmentQuery("");
    setWorkspaceProjectQuery("");
    setWorkspaceProjectTriggerId("demo-workspace-project-trigger");
    setComposerValue("");
    setComposerOverlay(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(null);
    setActiveFrame("workspace-ready");
    setReviewOpen(false);
    setSubagentPanelOpen(false);
    setActiveConversationSidePanel("review");
    setSelectedSubagentId(null);
    setTerminalOpen(false);
    setTerminalSessionIds([]);
    setClosedTerminalSessionIds([]);
    setTerminalWorkspaceBySession({});
    setDismissedTerminalMismatchIds(new Set());
    setTerminalTabPickerOpen(false);
    setTerminalCommandId(null);
    setTerminalValuesByCommand({});
    setTerminalHistoryByCommand({});
    setPullRequestOpen(false);
    dismissSidebarAfterNavigation();
  };

  const openProjectsIndex = () => {
    cancelReplaySubmitTimer();
    setMode("replay");
    setView("projects");
    setProjectIndexChat(undefined);
    setProjectIndexQuery("");
    setProjectIndexSortBy("updated");
    setProjectIndexSortDirection("descending");
    setExpandedProjectIndexIds(new Set());
    setActiveFrame("projects-index-ready");
    setReviewOpen(false);
    setSubagentPanelOpen(false);
    setTerminalOpen(false);
    setPullRequestOpen(false);
    dismissSidebarAfterNavigation();
  };

  const createProject = async (
    source: "projects" | "sidebar" | "workspace",
  ) => {
    if (projectCreationStatus === "selecting") return;
    setProjectCreationSource(source);
    setProjectCreationStatus("selecting");
    try {
      const selection = window.codexDemo
        ? await window.codexDemo.selectProjectDirectory()
        : {
            label: "new-project",
            path: "/workspace/new-project",
          };
      if (!selection) {
        setProjectCreationStatus("idle");
        setProjectCreationSource(null);
        return;
      }
      const knownProject = workspaceProjects.find(
        (project) => project.path === selection.path,
      );
      const id = knownProject?.id ?? `created:${selection.path}`;
      const selectedProjectToken = selection.projectToken;
      if (selectedProjectToken) {
        setWorkspaceProjectTokens((current) => ({
          ...current,
          [id]: selectedProjectToken,
        }));
      }
      setCreatedProjects((current) => {
        const withoutSelectedPath = current.filter(
          (project) => project.path !== selection.path,
        );
        return knownProject
          ? withoutSelectedPath
          : [{ id, ...selection }, ...withoutSelectedPath];
      });
      cancelReplaySubmitTimer();
      setMode("replay");
      setView("workspace");
      setProjectIndexChat(undefined);
      setWorkspacePage("conversation");
      updateWorkspaceProjectId(id);
      setWorkspaceEnvironmentId("local");
      updateWorkspaceWorktreeId("main");
      setWorkspaceLocalEnvironmentOpen(false);
      setWorkspaceOverlay(null);
      setWorkspaceBranchQuery("");
      setWorkspaceEnvironmentQuery("");
      setWorkspaceProjectQuery("");
      setWorkspaceProjectTriggerId("demo-workspace-project-trigger");
      setComposerValue("");
      setComposerOverlay(null);
      setReplayApprovalResolution(null);
      setReplaySessionApprovalScope(null);
      setActiveFrame(
        knownProject ? "workspace-ready" : "workspace-project-created",
      );
      setReviewOpen(false);
      setSubagentPanelOpen(false);
      setActiveConversationSidePanel("review");
      setSelectedSubagentId(null);
      setTerminalOpen(false);
      setTerminalSessionIds([]);
      setClosedTerminalSessionIds([]);
      setTerminalWorkspaceBySession({});
      setDismissedTerminalMismatchIds(new Set());
      setTerminalTabPickerOpen(false);
      setTerminalCommandId(null);
      setTerminalValuesByCommand({});
      setTerminalHistoryByCommand({});
      setPullRequestOpen(false);
      setProjectCreationStatus("idle");
      setProjectCreationSource(null);
      dismissSidebarAfterNavigation();
      window.setTimeout(() =>
        document.getElementById("demo-workspace-project-trigger")?.focus(),
      );
    } catch {
      setProjectCreationStatus("error");
    }
  };

  const openProjectIndexChat = (projectId: string, chatId: string) => {
    const project = currentProjectIndexItems.find(
      (candidate) => candidate.id === projectId,
    );
    const chat = project?.recentChats.find(
      (candidate) => candidate.id === chatId,
    );
    if (!project || !chat) return;
    openWorkspace(projectId);
    setProjectIndexChatTurns([]);
    setProjectIndexChat({
      chatId,
      chatLabel: chat.label,
      projectId,
    });
    setActiveFrame("projects-index-chat");
  };

  const selectScenario = (
    nextId: ReplayScenarioId,
    frame: string | null = null,
    workspaceContext?: {
      cwd: string;
      prompt: string;
      projectLabel: string;
    },
  ) => {
    cancelReplaySubmitTimer();
    cancelTerminalReloadTimer();
    const nextTerminalSessionIds = initialTerminalSessionIds(
      nextId,
      frame,
    );
    const nextClosedTerminalSessionIds =
      initialClosedTerminalSessionIds(nextId, frame);
    setWorkspaceRunCwd(
      workspaceContext?.cwd ?? "/workspace/codex-ui-kit",
    );
    setWorkspaceRunPrompt(
      nextId === "workspace-workflow"
        ? workspaceContext?.prompt
        : undefined,
    );
    setWorkspaceRunProjectLabel(
      workspaceContext?.projectLabel ??
        (frame === "terminal-current-mismatch"
          ? "assets"
          : "codex-ui-kit"),
    );
    setView("conversation");
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(
      replayCountForSelection(replayScenarios[nextId], frame),
    );
    setComposerValue(initialComposerValue(frame));
    setComposerOverlay(initialComposerOverlay(frame));
    setComposerMode(initialComposerMode(frame));
    setComposerResourceActiveId("files");
    setComposerAttachments(attachmentItemsForFrame(frame));
    setSubmittedComposerAttachments([]);
    setSubmittedComposerPrompt(null);
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(initialQueuedContinuation(frame));
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(
      nextId === "approval-for-session" &&
        frame !== "approval-current-session-pending"
        ? "session"
        : null,
    );
    setThreadSummaryOpen(
      (nextId === "context-summary" && frame === "context-summary-open") ||
        (isSubagentScenarioId(nextId) && currentSubagentSummaryFrame(frame)),
    );
    setMcpSourceSummaryOpen(false);
    setMcpSourceSummaryPinned(false);
    setActiveFrame(frame);
    setScenarioSelectionVersion((version) => version + 1);
    setWindowedSelectedMessageIndex(currentWindowedInitialIndex);
    setReviewOpen(false);
    setReviewSelection(null);
    setFileRevertErrorOpen(false);
    setActiveConversationSidePanel(
      isSubagentScenarioId(nextId) && currentSubagentPanelFrame(frame)
        ? "subagents"
        : "review",
    );
    setSubagentPanelOpen(
      isSubagentScenarioId(nextId) && currentSubagentPanelFrame(frame),
    );
    setSelectedSubagentId(
      isSubagentScenarioId(nextId) ? initialSubagentId(frame) : null,
    );
    setSubagentPanelWidth(
      frame === "subagent-current-compact-820"
        ? 319
        : frame === "subagent-current-compact-720"
          ? 329.3125
          : 369.28125,
    );
    setTerminalOpen(
      nextId === "background-terminal" ||
        (nextId === "terminal-lifecycle" &&
          frame !== "terminal-current-closed" &&
          frame !== "terminal-current-background-list" &&
          frame !== "terminal-current-background-open" &&
          frame !== "terminal-closed"),
    );
    setTerminalSessionIds([...nextTerminalSessionIds]);
    terminalSessionCounterRef.current =
      nextTerminalSessionIds.filter((sessionId) =>
        sessionId.startsWith("local-terminal-"),
      ).length + 1;
    setClosedTerminalSessionIds([...nextClosedTerminalSessionIds]);
    setTerminalWorkspaceBySession(
      initialTerminalWorkspaceLabels(nextId, frame),
    );
    setDismissedTerminalMismatchIds(new Set());
    setTerminalReloadPendingIds(new Set());
    setTerminalReloadSessionId(
      frame === "terminal-current-reload" ? "local-terminal-1" : null,
    );
    setTerminalTabPickerOpen(frame === "terminal-picker");
    setTerminalCommandId(nextTerminalSessionIds.at(-1) ?? null);
    setTerminalHeight(272);
    setBackgroundTerminalPanelWidth(381.4375);
    setBackgroundTerminalPanelOpen(
      nextId === "terminal-lifecycle" &&
        (frame === "terminal-current-background-list" ||
          frame === "terminal-current-background-open"),
    );
    setBackgroundTerminalRunning(true);
    setTerminalValuesByCommand({});
    setTerminalHistoryByCommand(initialTerminalHistory(nextId, frame));
    setUndoneFileIds(new Set());
    setLiveError(null);
    setShellNotificationVisible(false);
    setWorkspaceOverlay(null);
    setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceProjectQuery("");
    setWorkspaceBranchQuery("");
    setWorkspaceEnvironmentQuery("");
    dismissSidebarAfterNavigation();
  };

  const selectMode = (nextMode: "live" | "replay") => {
    cancelReplaySubmitTimer();
    setView("conversation");
    setMode(nextMode);
    setActiveFrame(null);
    setComposerValue("");
    setComposerOverlay(null);
    setComposerAttachments([]);
    setSubmittedComposerAttachments([]);
    setSubmittedComposerPrompt(null);
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(null);
    setThreadSummaryOpen(false);
    setSubagentPanelOpen(false);
    setActiveConversationSidePanel("review");
    setSelectedSubagentId(null);
    setWorkspaceOverlay(null);
    setWorkspaceLocalEnvironmentOpen(false);
  };

  const dismissComposerResources = () => {
    setComposerOverlay(null);
    if (!isCurrentAttachmentReplay) setActiveFrame(null);
    window.setTimeout(() => composerInputRef.current?.focus());
  };

  const respondToApproval = async (
    requestId: number | string,
    decision: "accept" | "acceptForSession" | "decline",
    scope: "once" | "similar" = "once",
  ) => {
    if (mode === "replay") {
      if (isCurrentApprovalReplay) {
        if (
          scenarioId === "approval-for-session" &&
          decision === "acceptForSession"
        ) {
          setReplaySessionApprovalScope("session");
          setReplayApprovalResolution(null);
          setReplayCount(
            scenario.frames["approval-current-session-first-completed"] ??
              scenario.events.length,
          );
          setActiveFrame("approval-current-session-first-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-for-session" &&
          decision === "accept"
        ) {
          setReplaySessionApprovalScope("once");
          setReplayApprovalResolution(null);
          setReplayCount(
            scenario.frames["approval-current-session-first-completed"] ??
              scenario.events.length,
          );
          setActiveFrame("approval-current-session-first-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-for-session" &&
          decision === "decline"
        ) {
          setReplaySessionApprovalScope(null);
          setReplayApprovalResolution({
            decision: "rejected",
            requestId,
          });
          setActiveFrame("approval-current-session-denied");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (decision === "accept" && scope === "similar") {
          if (scenarioId !== "approval-similar-commands") {
            selectScenario(
              "approval-similar-commands",
              "approval-current-similar-first-completed",
            );
          } else {
            setReplayApprovalResolution(null);
            setReplayCount(
              scenario.frames[
                "approval-current-similar-first-completed"
              ] ?? scenario.events.length,
            );
            setActiveFrame("approval-current-similar-first-completed");
          }
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-similar-commands" &&
          decision === "accept"
        ) {
          selectScenario(
            "approval-allow-once",
            "approval-current-allow-once-completed",
          );
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (scenarioId === "approval-allow-once" && decision === "accept") {
          setReplayApprovalResolution(null);
          setReplayCount(scenario.events.length);
          setActiveFrame("approval-current-allow-once-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (decision === "decline") {
          if (
            scenarioId === "approval-allow-once" ||
            scenarioId === "approval-similar-commands"
          ) {
            selectScenario("approval-denied", "approval-current-denied");
            requestAnimationFrame(() => composerInputRef.current?.focus());
            return;
          }
          setReplayApprovalResolution(null);
          setReplayCount(scenario.events.length);
          setActiveFrame("approval-current-denied");
        } else {
          setReplayApprovalResolution({
            decision: "approved",
            requestId,
          });
          setReplayCount(scenario.events.length);
          setActiveFrame(null);
        }
        return;
      }
      if (decision === "accept" || decision === "acceptForSession") {
        setReplayApprovalResolution(null);
        setReplayCount(scenario.events.length);
        setActiveFrame(null);
      } else {
        setReplayApprovalResolution({
          decision: "rejected",
          requestId,
        });
        setActiveFrame("approval-rejected");
      }
      return;
    }
    const submissionGate = liveApprovalSubmissionGateRef.current;
    if (!submissionGate.begin(requestId)) return;
    try {
      await window.codexDemo?.respondToApproval({ decision, requestId });
      dispatchLive({
        decision: decision === "decline" ? "rejected" : "approved",
        kind: "approval-resolution",
        requestId,
        responseDecision: decision,
      });
    } catch (error) {
      submissionGate.finish(requestId);
      setLiveError(error instanceof Error ? error.message : String(error));
    }
  };

  const submitLive = async (prompt: string) => {
    if (!window.codexDemo) {
      setLiveError("Live mode is available in the Electron app.");
      return;
    }
    if (liveStartPendingRef.current) return;
    liveStartPendingRef.current = true;
    setLiveStartPending(true);
    setMode("live");
    setLiveError(null);
    try {
      await window.codexDemo.startLive({ prompt });
      setComposerValue((current) => (current === prompt ? "" : current));
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      liveStartPendingRef.current = false;
      setLiveStartPending(false);
    }
  };

  const stopLive = async () => {
    try {
      await window.codexDemo?.stopLive();
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      liveState.approvals
        .filter(({ decision }) => decision === "pending")
        .forEach(({ requestId }) => {
          dispatchLive({
            decision: "rejected",
            kind: "approval-resolution",
            requestId,
          });
        });
    }
  };

  const restoreConversationRunningReplay = () => {
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setQueueInterrupted(false);
    setReplayCount(
      replayScenarios["conversation-lifecycle"].frames[
        "conversation-running"
      ] ?? replayScenarios["conversation-lifecycle"].events.length,
    );
  };

  const startReplayCompaction = () => {
    if (!isCurrentContextCompactionReplay || state.status === "running") {
      return;
    }
    cancelReplaySubmitTimer();
    setComposerValue("");
    setComposerOverlay(null);
    setReplayCount(
      replayScenarios.compaction.frames["context-compaction-running"] ??
        replayScenarios.compaction.events.length,
    );
    setActiveFrame("context-compaction-running");
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setReplayCount(
        replayScenarios.compaction.frames["context-compaction-completed"] ??
          replayScenarios.compaction.events.length,
      );
      setActiveFrame("context-compaction-completed");
      requestAnimationFrame(() => composerInputRef.current?.focus());
    }, 900);
  };

  const stopReplayCompaction = () => {
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(false);
    setReplayCount(
      replayScenarios.compaction.frames["context-compaction-ready"] ??
        replayScenarios.compaction.events.length,
    );
    setActiveFrame("context-compaction-ready");
    setComposerValue("");
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const attachmentSubmissionReady =
    composerAttachments.length > 0 &&
    composerAttachments.every(({ status }) => status === "ready");

  const submitComposer = (prompt: string) => {
    if (isCurrentAttachmentReplay) {
      if (!attachmentSubmissionReady) return;
      cancelReplaySubmitTimer();
      setSubmittedComposerAttachments(
        composerAttachments.map((attachment) => ({ ...attachment })),
      );
      setSubmittedComposerPrompt(prompt);
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      setActiveFrame("attachment-submitting");
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("attachment-completed");
        setComposerAttachments([]);
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (
      isCurrentApprovalSimilarReplay &&
      activeFrame === "approval-current-similar-first-completed"
    ) {
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("approval-current-similar-repeated-completed");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentApprovalSessionReplay) {
      if (
        activeFrame !== "approval-current-session-first-completed" ||
        replaySessionApprovalScope !== "session"
      ) {
        return;
      }
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("approval-current-session-repeated-completed");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentContextCompactionReplay) {
      if (state.status === "running") return;
      if (prompt.trim() === "/compact") {
        startReplayCompaction();
        return;
      }
      if (state.compaction !== "completed") return;
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(
          replayScenarios.compaction.frames[
            "context-compaction-recovered"
          ] ?? replayScenarios.compaction.events.length,
        );
        setActiveFrame("context-compaction-recovered");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentCommandInterruptionReplay) {
      if (activeFrame !== "command-interruption-settled") return;
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(
          replayScenarios.interruption.frames[
            "command-interruption-recovered"
          ] ?? replayScenarios.interruption.events.length,
        );
        setActiveFrame("command-interruption-recovered");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (!isConversationLifecycle) {
      void submitLive(prompt);
      return;
    }
    setActiveFrame(null);
    setComposerOverlay(null);
    setComposerAttachments([]);
    if (replayComposerRunning) {
      if (queueingEnabled) {
        queuedPromptCounterRef.current += 1;
        setQueuedPrompts((items) => [
          ...items,
          {
            id: `queued-lifecycle-${queuedPromptCounterRef.current}`,
            text: prompt,
          },
        ]);
        setComposerValue("");
      } else {
        restoreConversationRunningReplay();
        setComposerValue("");
      }
      return;
    }
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(true);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setQueueInterrupted(false);
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setReplayCount(
        replayScenarios["conversation-lifecycle"].frames[
          "conversation-running"
        ] ?? replayScenarios["conversation-lifecycle"].events.length,
      );
      setReplayComposerSubmitting(false);
      setComposerValue((current) => (current === prompt ? "" : current));
    }, 160);
  };

  const settleCurrentCommandInterruption = () => {
    if (!isCurrentCommandInterruptionReplay) return;
    cancelReplaySubmitTimer();
    setReplayCount(
      replayScenarios.interruption.frames[
        "command-interruption-settled"
      ] ?? replayScenarios.interruption.events.length,
    );
    setActiveFrame("command-interruption-settled");
  };

  const stopComposer = () => {
    if (isCurrentContextCompactionReplay) {
      stopReplayCompaction();
      return;
    }
    if (isCurrentCommandInterruptionReplay) {
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(false);
      setReplayCount(
        replayScenarios.interruption.frames[
          "command-interruption-stopping"
        ] ?? replayScenarios.interruption.events.length,
      );
      setActiveFrame("command-interruption-stopping");
      return;
    }
    if (!isConversationLifecycle) {
      void stopLive();
      return;
    }
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(false);
    const [nextQueuedPrompt, ...remainingQueuedPrompts] =
      queuedPrompts;
    if (
      nextQueuedPrompt &&
      typeof nextQueuedPrompt.text === "string"
    ) {
      setReplayComposerStopped(false);
      setReplayQueuedContinuation(nextQueuedPrompt.text);
      setQueuedPrompts(remainingQueuedPrompts);
      setQueueInterrupted(false);
      return;
    }
    setReplayComposerStopped(true);
    setQueueInterrupted(false);
  };

  const resumeQueue = () => {
    restoreConversationRunningReplay();
    setQueuedPrompts((items) =>
      items.map((item) => ({ ...item, status: "queued" })),
    );
  };

  const removeQueuedPrompt = (id: string) => {
    const nextItems = queuedPrompts.filter((item) => item.id !== id);
    setQueuedPrompts(nextItems);
    if (nextItems.length === 0) {
      setQueueInterrupted(false);
    }
  };

  const deleteQueuedPrompt = removeQueuedPrompt;

  const editQueuedPrompt = (id: string) => {
    const item = queuedPrompts.find((candidate) => candidate.id === id);
    if (item && typeof item.text === "string") setComposerValue(item.text);
    removeQueuedPrompt(id);
  };

  const sendQueuedPromptNow = (id: string) => {
    deleteQueuedPrompt(id);
    restoreConversationRunningReplay();
  };

  const reorderQueuedPrompts = (activeId: string, overId: string) => {
    setQueuedPrompts((items) => {
      const activeIndex = items.findIndex(({ id }) => id === activeId);
      const overIndex = items.findIndex(({ id }) => id === overId);
      if (activeIndex < 0 || overIndex < 0) return items;
      const next = [...items];
      const [active] = next.splice(activeIndex, 1);
      if (!active) return items;
      next.splice(overIndex, 0, active);
      return next;
    });
  };

  const currentWindowedFrame =
    isConversationLifecycle && activeFrame === "thread-windowed";

  const returnToLatest = useCallback(() => {
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    if (currentWindowedFrame) {
      setWindowedSelectedMessageIndex(currentWindowedHistorySize - 1);
    }
    viewport.scrollTo({
      behavior: "smooth",
      top: currentWindowedFrame ? 0 : viewport.scrollHeight,
    });
  }, [currentWindowedFrame]);

  useLayoutEffect(() => {
    if (scenarioSelectionVersion === 0) return;
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    let resetFrame = 0;
    const layoutFrame = window.requestAnimationFrame(() => {
      resetFrame = window.requestAnimationFrame(() => {
        viewport.scrollTop =
          activeFrame === "thread-windowed" ? -28_484 : viewport.scrollHeight;
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
    });
    return () => {
      window.cancelAnimationFrame(layoutFrame);
      window.cancelAnimationFrame(resetFrame);
    };
  }, [activeFrame, scenarioSelectionVersion]);

  const scrollToMessage = useCallback(
    (id: string, behavior: "instant" | "smooth") => {
      const viewport = threadViewportRef.current;
      const target = viewport
        ? [...viewport.querySelectorAll<HTMLElement>("[data-item-id]")].find(
            (candidate) => candidate.dataset.itemId === id,
          )
        : undefined;
      if (!target) return false;
      viewport?.dispatchEvent(new Event("pointerdown"));
      target.scrollIntoView({ behavior, block: "center" });
      return true;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!currentWindowedFrame) return;
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    let alignmentFrame = 0;
    let scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = window.requestAnimationFrame(() => {
        const messagesAfter =
          currentWindowedHistorySize - 1 - windowedSelectedMessageIndex;
        const distanceFromLatest =
          messagesAfter === 0 ? 0 : messagesAfter * 672 + 320;
        viewport.scrollTop = -Math.min(
          viewport.scrollHeight - viewport.clientHeight,
          distanceFromLatest,
        );
        alignmentFrame = window.requestAnimationFrame(() => {
          const selectedTurn = viewport.querySelector<HTMLElement>(
            `[data-windowed-turn="${windowedSelectedMessageIndex + 1}"]`,
          );
          if (selectedTurn && messagesAfter > 0) {
            const viewportBounds = viewport.getBoundingClientRect();
            const selectedBounds = selectedTurn.getBoundingClientRect();
            viewport.scrollTop +=
              selectedBounds.top - (viewportBounds.top + 180);
          }
          viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
        });
      });
    });
    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(alignmentFrame);
    };
  }, [currentWindowedFrame, windowedSelectedMessageIndex]);

  const lastEvent = scenario.events[Math.max(0, replayCount - 1)];
  const currentSidebarComposition =
    initialSelection.currentSidebar ||
    initialSelection.frame?.startsWith("sidebar-current") ||
    !initialSelection.capture;
  const workspacePersistenceFrame =
    view === "workspace" && currentWorkspacePersistenceFrame(activeFrame);
  const sidebarRecentScenarios = (
    Object.values(replayScenarios) as ReplayScenario[]
  ).slice(0, currentSidebarComposition ? 6 : undefined);
  const sidebar = (
    <AppSidebar
      footer={
        <AppSidebarFooter
          account="Demo account"
          accountAvatar={<span className="demo-sidebar-avatar">D</span>}
          renderAccountTrigger={(trigger) => (
            <Menu
              align="start"
              className="demo-current-sidebar-menu demo-current-sidebar-account-menu"
              label="Account menu"
              onOpenChange={(open) => {
                setCurrentSidebarAccountMenuOpen(open);
                if (open) setCurrentSidebarHelpMenuOpen(false);
              }}
              open={currentSidebarAccountMenuOpen}
              side="top"
              sideOffset={7.5}
              style={{
                width: "calc(var(--codex-ui-app-sidebar-width) - 1rem)",
              }}
              trigger={trigger}
              width="auto"
            >
              <MenuItem
                className="demo-current-sidebar-account-menu__identity"
                startIcon={
                  <img
                    alt=""
                    className="demo-current-sidebar-account-menu__avatar"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%230c7faa'/%3E%3Ctext x='9' y='12' text-anchor='middle' font-family='system-ui' font-size='8' fill='white'%3ED%3C/text%3E%3C/svg%3E"
                  />
                }
              >
                Demo account
              </MenuItem>
              <div
                aria-hidden="true"
                className="demo-current-sidebar-account-menu__divider"
              >
                <span />
              </div>
              <MenuItem
                shortcut="94% left"
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-usage" />
                }
              >
                Usage
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-pet" />
                }
              >
                Show pet
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-invite" />
                }
              >
                Invite a friend
              </MenuItem>
              <MenuItem
                shortcut="⌘,"
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-settings" />
                }
              >
                Settings
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-logout" />
                }
              >
                Log out
              </MenuItem>
            </Menu>
          )}
          actions={
            currentSidebarComposition ? (
              <>
                <button
                  aria-label="Start new voice chat"
                  className="demo-current-sidebar-voice"
                  type="button"
                >
                  <CurrentBuildIcon name="sidebar-voice" />
                  <span>Voice</span>
                </button>
                <Menu
                  align="start"
                  className="demo-current-sidebar-menu demo-current-sidebar-help-menu"
                  label="Help menu"
                  onOpenChange={(open) => {
                    setCurrentSidebarHelpMenuOpen(open);
                    if (open) setCurrentSidebarAccountMenuOpen(false);
                  }}
                  open={currentSidebarHelpMenuOpen}
                  side="top"
                  sideOffset={7}
                  style={{ width: 320 }}
                  trigger={
                    <button aria-label="Open help menu" type="button">
                      <SidebarGlyph name="help-current" />
                    </button>
                  }
                  width="auto"
                >
                <div className="demo-current-sidebar-help-menu__heading">
                  What&apos;s new
                </div>
                <div className="demo-current-sidebar-help-menu__releases">
                  <MenuItem
                    shortcut="13 Aug"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Computer History
                  </MenuItem>
                  <MenuItem
                    shortcut="11 Aug"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Linux desktop preview and agent imports
                  </MenuItem>
                  <MenuItem
                    shortcut="31 Jul"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Record &amp; Replay expands to the EU, UK, and Switzerland
                  </MenuItem>
                </div>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-changelog-external" />
                  }
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-changelog" />
                  }
                >
                  Full changelog
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-chrome" />
                  }
                >
                  Set up Chrome extension
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-remote" />
                  }
                >
                  Set up remote
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-keyboard" />
                  }
                >
                  Keyboard shortcuts
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-support" />
                  }
                >
                  Help
                </MenuItem>
                </Menu>
              </>
            ) : (
              <button aria-label="Open settings" type="button">
                <SidebarGlyph name="settings" />
              </button>
            )
          }
        />
      }
      header={currentSidebarComposition ? (
        <div className="demo-sidebar-header">
          <div className="demo-sidebar-brand-row">
            <button
              aria-expanded={false}
              aria-haspopup="menu"
              className="demo-sidebar-brand"
              type="button"
            >
              Codex
              <CurrentBuildIcon name="sidebar-mode-chevron" />
            </button>
            <span className="demo-sidebar-brand-actions">
              <button
                aria-label="Search"
                className="demo-sidebar-header-action"
                type="button"
              >
                <SidebarGlyph name="search" />
              </button>
              <button
                aria-label="View activity, needs attention"
                className="demo-sidebar-header-action"
                type="button"
              >
                <SidebarGlyph name="activity-attention" />
              </button>
            </span>
          </div>
          <div className="demo-sidebar-new-chat-row">
            <button
              aria-current={
                view === "workspace" &&
                !workspacePersistenceFrame &&
                !projectIndexChat
                  ? "page"
                  : undefined
              }
              className="demo-sidebar-new-chat"
              onClick={() => openWorkspace()}
              type="button"
            >
              <SidebarGlyph name="new" />
              <span>New chat</span>
            </button>
            <button
              aria-label="Quick chat"
              className="demo-sidebar-quick-chat"
              type="button"
            >
              <SidebarGlyph name="quick" />
            </button>
          </div>
        </div>
      ) : (
        <div className="demo-sidebar-header">
          <div className="demo-sidebar-brand-row">
            <button
              aria-expanded={false}
              aria-haspopup="menu"
              className="demo-sidebar-brand"
              type="button"
            >
              Codex
              <CurrentBuildIcon name="sidebar-mode-chevron" />
            </button>
            <button
              aria-label="Search"
              className="demo-sidebar-header-action"
              type="button"
            >
              <SidebarGlyph name="search" />
            </button>
          </div>
          <AppSidebarItem
            leading={<SidebarGlyph name="new" />}
            onClick={() => openWorkspace()}
          >
            New chat
          </AppSidebarItem>
        </div>
      )}
      primaryNavigation={
        <>
          <AppSidebarItem
            leading={<SidebarGlyph name="pull-request" />}
            onClick={() => {
              setMode("replay");
              setView("pull-request");
              setPullRequestOpen(!isNarrowDemoWindow());
              dismissSidebarAfterNavigation();
            }}
            selected={view === "pull-request" || view === "shell"}
          >
            Pull requests
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="sites" />}>
            Sites
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="automation" />}>
            Scheduled
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="plugins-current" />}>
            Plugins
          </AppSidebarItem>
        </>
      }
      titlebarInset
    >
      <AppSidebarSection
        collapsible
        kind="pinned"
        title="Pinned"
        toggleLabel="Toggle pinned tasks"
      >
        {currentSidebarComposition ? (
          currentSidebarProjects.map((project) => (
            <AppSidebarProjectGroup
              actions={
                <>
                  <Menu
                    align="start"
                    className="demo-current-sidebar-menu demo-current-sidebar-project-menu"
                    label={`${project.label} project menu`}
                    onOpenChange={(open) =>
                      setCurrentSidebarProjectMenuId((current) =>
                        open
                          ? project.id
                          : current === project.id
                            ? null
                            : current,
                      )
                    }
                    open={currentSidebarProjectMenuId === project.id}
                    side="bottom"
                    sideOffset={2}
                    style={{
                      height: project.tasks.some(
                        (_task, taskIndex) =>
                          currentSidebarTaskStatus(project.id, taskIndex) ===
                          "unread",
                      )
                        ? 212
                        : 187,
                      width: 221,
                    }}
                    trigger={
                      <button
                        aria-label={`Project actions for ${project.label}`}
                        type="button"
                      >
                        <SidebarGlyph name="more-current" />
                      </button>
                    }
                    width="auto"
                  >
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-unpin" />
                      }
                    >
                      Unpin
                    </MenuItem>
                    <MenuItem
                      className="demo-current-sidebar-project-menu__item--edit"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-edit" />
                      }
                    >
                      Edit
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      className="demo-current-sidebar-project-menu__item--reveal"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-reveal" />
                      }
                    >
                      Reveal in Finder
                    </MenuItem>
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-worktree" />
                      }
                    >
                      Create permanent worktree
                    </MenuItem>
                    <MenuSeparator />
                    {project.tasks.some(
                      (_task, taskIndex) =>
                        currentSidebarTaskStatus(project.id, taskIndex) ===
                        "unread",
                    ) ? (
                      <MenuItem
                        startIcon={
                          <CurrentBuildIcon name="sidebar-project-menu-mark-read" />
                        }
                      >
                        Mark all as read
                      </MenuItem>
                    ) : null}
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-archive" />
                      }
                    >
                      Archive chats
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      className="demo-current-sidebar-project-menu__item--remove"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-remove" />
                      }
                    >
                      Remove project
                    </MenuItem>
                  </Menu>
                  <button
                    aria-label={`Start new chat in ${project.label}`}
                    type="button"
                  >
                    <SidebarGlyph name="new" />
                  </button>
                </>
              }
              actionsLabel={`${project.label} project actions`}
              expanded={currentSidebarExpandedProjectIds.has(project.id)}
              key={project.id}
              label={project.label}
              leading={<SidebarGlyph name="folder-current" />}
              selected={
                project.selected &&
                view === "conversation" &&
                mode === "replay"
              }
              status={
                initialSelection.sidebarState === "status-lifecycle"
                  ? "idle"
                  : project.selected &&
                      (hasActiveTurnWork(state) || isTurnActive(state.status))
                    ? "running"
                    : project.status
              }
              statusLabel={
                project.selected &&
                (hasActiveTurnWork(state) || isTurnActive(state.status))
                  ? "Current project is running"
                  : project.status
                    ? "Unread project update"
                    : undefined
              }
              onExpandedChange={(expanded) =>
                setCurrentSidebarExpandedProjectIds((current) => {
                  const next = new Set(current);
                  if (expanded) next.add(project.id);
                  else next.delete(project.id);
                  return next;
                })
              }
            >
              {[
                ...project.tasks,
                ...(workspacePersistedTaskAvailable &&
                project.id === "codex-ui-kit"
                  ? ["Verify worktree persistence"]
                  : []),
              ].map((task, index) => (
                <AppSidebarItem
                  actions={
                    task === "Verify worktree persistence" ||
                    (initialSelection.sidebarState === "status-lifecycle" &&
                      project.id === "protocol-client" &&
                      index === 0) ? undefined : (
                      <>
                        <button
                          aria-label={`Pin task ${project.id}-${index + 1}`}
                          type="button"
                        >
                          <SidebarGlyph name="pin-current" />
                        </button>
                        <button
                          aria-label={`Archive task ${project.id}-${index + 1}`}
                          type="button"
                        >
                          <SidebarGlyph name="archive-current" />
                        </button>
                      </>
                    )
                  }
                  actionsLabel={`${project.id} task actions`}
                  data-sidebar-status-fixture={
                    initialSelection.sidebarState === "status-lifecycle"
                      ? `${project.id}:${index}`
                      : undefined
                  }
                  data-sidebar-worktree-status-fixture={
                    initialSelection.sidebarState === "status-lifecycle" &&
                    currentSidebarTaskWorktreeStatus(project.id, index)
                      ? `${project.id}:${index}`
                      : undefined
                  }
                  depth={1}
                  key={task}
                  onClick={
                    task === "Verify worktree persistence"
                      ? () => {
                          setMode("replay");
                          setView("workspace");
                          setWorkspacePage("conversation");
                          setActiveFrame(
                            workspaceDirectoryMissing
                              ? "workspace-directory-missing"
                              : "workspace-persisted-thread",
                          );
                          dismissSidebarAfterNavigation();
                        }
                      : undefined
                  }
                  selected={
                    workspacePersistenceFrame &&
                    task === "Verify worktree persistence"
                  }
                  status={
                    task === "Verify worktree persistence"
                      ? "idle"
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskStatus(project.id, index)
                      : "idle"
                  }
                  statusLabel={
                    task === "Verify worktree persistence"
                      ? undefined
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskStatusLabel(project.id, index)
                      : undefined
                  }
                  worktreeStatus={
                    task === "Verify worktree persistence"
                      ? "restored"
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskWorktreeStatus(project.id, index)
                      : undefined
                  }
                >
                  {task}
                </AppSidebarItem>
              ))}
            </AppSidebarProjectGroup>
          ))
        ) : (
          <>
            <AppSidebarItem
              actions={
                <>
                  <button aria-label="Pin current task" type="button">
                    <SidebarGlyph name="pin" />
                  </button>
                  <button aria-label="Current task actions" type="button">
                    <SidebarGlyph name="more" />
                  </button>
                </>
              }
              actionsLabel="Current task actions"
              leading={<SidebarGlyph name="folder-current" />}
              status={
                hasActiveTurnWork(state) || isTurnActive(state.status)
                  ? "running"
                  : "idle"
              }
              statusLabel="Current task is running"
            >
              codex-ui-kit
            </AppSidebarItem>
            <AppSidebarItem
              actions={
                <button aria-label="Pinned task actions" type="button">
                  <SidebarGlyph name="more" />
                </button>
              }
              actionsLabel="Pinned task actions"
              depth={1}
              leading={<SidebarGlyph name="thread" />}
              onClick={() => selectScenario("mcp-current-success")}
              status="unread"
              statusLabel="Unread update"
            >
              MCP tool validation
            </AppSidebarItem>
          </>
        )}
      </AppSidebarSection>
      <AppSidebarSection
        actions={
          <span className="demo-sidebar-project-section-actions">
            <button
              aria-label="View projects"
              onClick={openProjectsIndex}
              type="button"
            >
              ›
            </button>
            <button
              aria-label="New project"
              onClick={() => void createProject("sidebar")}
              type="button"
            >
              +
            </button>
          </span>
        }
        collapsible
        defaultExpanded={false}
        kind="projects"
        title="Projects"
        toggleLabel="Toggle projects"
      >
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          onClick={() => openWorkspace("codex-ui-kit")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "codex-ui-kit"
          }
        >
          codex-ui-kit
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          onClick={() => openWorkspace("app-server-client")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "app-server-client"
          }
        >
          codex-app-server-client
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          status="queued"
          statusLabel="Project task queued"
        >
          protocol-client-with-an-intentionally-long-worktree-name
        </AppSidebarItem>
      </AppSidebarSection>
      {projectCreationStatus === "error" &&
      projectCreationSource === "sidebar" ? (
        <p className="demo-sidebar-project-error" role="alert">
          Couldn&apos;t add that project
        </p>
      ) : null}
      <AppSidebarSection
        collapsible
        kind="threads"
        title="Recents"
        toggleLabel="Toggle recent tasks"
      >
        {sidebarRecentScenarios.map((item, index) => (
          <AppSidebarItem
            actions={
              currentSidebarComposition ? (
                <>
                  <button
                    aria-label={`Pin recent task ${item.id}`}
                    type="button"
                  >
                    <SidebarGlyph name="pin-current" />
                  </button>
                  <button
                    aria-label={`Archive recent task ${item.id}`}
                    type="button"
                  >
                    <SidebarGlyph name="archive-current" />
                  </button>
                </>
              ) : (
                <button
                  aria-label={`Sidebar actions for ${item.label}`}
                  type="button"
                >
                  <SidebarGlyph name="more" />
                </button>
              )
            }
            actionsLabel={`Sidebar task actions for ${item.label}`}
            key={item.id}
            leading={
              currentSidebarComposition ? undefined : (
                <SidebarGlyph name="thread" />
              )
            }
            onClick={() => selectScenario(item.id)}
            selected={
              !currentSidebarComposition &&
              view === "conversation" &&
              mode === "replay" &&
              scenarioId === item.id
            }
            status={
              currentSidebarComposition
                ? "idle"
                : index === 1
                  ? "queued"
                  : index === 2
                    ? "error"
                    : index === 3
                      ? "unread"
                      : "idle"
            }
            statusLabel={
              currentSidebarComposition
                ? undefined
                : index === 1
                  ? "Task queued"
                  : index === 2
                    ? "Task failed"
                    : index === 3
                      ? "Unread update"
                      : undefined
            }
          >
            {item.label}
          </AppSidebarItem>
        ))}
      </AppSidebarSection>
      <AppSidebarSection title="Connection">
        <AppSidebarItem
          disabled={!window.codexDemo}
          leading={<SidebarGlyph name="plugins" />}
          onClick={() => {
            selectMode("live");
            dismissSidebarAfterNavigation();
          }}
          selected={view === "conversation" && mode === "live"}
        >
          Live local
        </AppSidebarItem>
      </AppSidebarSection>
    </AppSidebar>
  );

  const composerIsRunning =
    mode === "live"
      ? isTurnActive(liveState.status)
      : (isConversationLifecycle && replayComposerRunning) ||
        (isCurrentTransportRecoveryReplay && isTurnActive(state.status)) ||
        ((isCurrentCommandInterruptionReplay ||
          isCurrentContextCompactionReplay ||
          isCurrentMixedToolReplay ||
          isCurrentSubagentReplay) &&
          state.status === "running");
  const composerIsDisabled =
    liveStartPending ||
    ((isConversationLifecycle ||
      isCurrentAttachmentReplay ||
      isCurrentCommandInterruptionReplay ||
      isCurrentContextCompactionReplay) &&
      replayComposerSubmitting);
  const displayedStatus =
    isConversationLifecycle && replayComposerStopped
      ? "interrupted"
      : state.status === "retrying"
        ? "retrying"
      : composerIsRunning
        ? "running"
        : state.status;
  const subagentItems = useMemo<SubagentItem[]>(
    () =>
      state.subagents.map((subagent) =>
        presentSubagent(subagent, mode, subagentClockMs),
      ),
    [mode, state.subagents, subagentClockMs],
  );
  const selectedSubagent =
    subagentItems.find(({ id }) => id === selectedSubagentId) ?? null;
  const summarySubagentItems = useMemo(
    () =>
      subagentItems
        .map((item, index) => ({ index, item }))
        .sort((left, right) => {
          const leftTime = left.item.sortTimestampMs ?? Number.NaN;
          const rightTime = right.item.sortTimestampMs ?? Number.NaN;
          return Number.isFinite(leftTime) && Number.isFinite(rightTime)
            ? rightTime - leftTime || left.index - right.index
            : left.index - right.index;
        })
        .map(({ item }) => item),
    [subagentItems],
  );
  const activeSubagentCount = subagentItems.filter(
    ({ status }) => status !== "done",
  ).length;
  const completedSubagentCount =
    subagentItems.length - activeSubagentCount;
  const subagentSummaryLabel = [
    activeSubagentCount > 0 ? `${activeSubagentCount} working` : null,
    completedSubagentCount > 0 ? `${completedSubagentCount} done` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const visibleSummarySubagents =
    activeSubagentCount > 0
      ? summarySubagentItems.filter(({ status }) => status !== "done")
      : summarySubagentItems;
  const openReviewPanel = () => {
    setActiveConversationSidePanel("review");
    setSubagentPanelOpen(false);
    setReviewOpen(true);
  };
  const openSubagentPanel = (subagentId?: string | null) => {
    setActiveConversationSidePanel("subagents");
    setReviewOpen(false);
    if (subagentId !== undefined) setSelectedSubagentId(subagentId);
    setSubagentPanelOpen(true);
  };
  const toggleSubagentPanel = () => {
    const opening =
      activeConversationSidePanel !== "subagents" || !subagentPanelOpen;
    setActiveConversationSidePanel("subagents");
    setReviewOpen(false);
    setSubagentPanelOpen(opening);
  };
  const composerPhase = composerIsDisabled
    ? "submitting"
    : composerIsRunning
      ? queuedPrompts.length > 0
        ? "queued"
        : "running"
      : queueInterrupted
        ? "queue-paused"
        : composerAttachments.length > 0 ||
            activeFrame === "composer-attachment"
          ? "attachment"
          : composerMode
            ? composerMode
            : composerValue.includes("\n")
              ? "multiline"
              : "idle";
  const currentHeaderReplay =
    mode === "replay" &&
    (isCurrentMcpReplay ||
      scenarioId === "mcp-tool-call" ||
      scenarioId === "mcp-recovery-mixed-thread" ||
      scenarioId === "attachment-lifecycle" ||
      isCurrentAutomaticReviewReplay ||
      scenarioId === "long-command-output" ||
      scenarioId === "command-failure-recovery" ||
      scenarioId === "interruption" ||
      scenarioId === "compaction" ||
      scenarioId === "context-summary" ||
      isCurrentBasicMessageReplay ||
      isCurrentMarkdown26818Replay ||
      isCurrentTransportRecoveryReplay ||
      isCurrentSubagentReplay ||
      scenarioId === "current-review-rename" ||
      isCurrentReviewFilesReplay);
  const usesCurrentAskPermission =
    isCurrentApprovalReplay ||
    isCurrentAutomaticReviewReplay ||
    isCurrentAttachmentReplay ||
    isCurrentLongCommandReplay ||
    isCurrentCommandFailureReplay ||
    isCurrentCommandInterruptionReplay ||
    isCurrentContextCompactionReplay ||
    isCurrentContextSummaryReplay ||
    isCurrentTransportRecoveryReplay ||
    isCurrentMixedToolReplay ||
    isCurrentSubagentReplay ||
    scenarioId === "current-review-rename" ||
    isCurrentReviewFilesReplay;
  const selectedComposerPermission =
    (usesCurrentAskPermission
      ? composerPermissionOptions[0]
      : composerPermissionOptions.find(
          ({ id }) => id === composerPermissionId,
        )) ?? composerPermissionOptions[2]!;
  const header = (
    <ThreadHeader
      endActions={
        currentHeaderReplay ? (
          <div className="demo-current-mcp-header-actions">
            {isCurrentSubagentReplay ? null : (
              <button aria-label="Open integration menu" type="button">
                ◈⌄
              </button>
            )}
            {isCurrentContextSummaryReplay || isCurrentSubagentReplay ? (
              <ThreadSummaryPopover
                onOpenChange={setThreadSummaryOpen}
                open={threadSummaryOpen}
                triggerIcon={
                  <CurrentBuildIcon name="thread-header-summary" />
                }
              >
                {isCurrentSubagentReplay ? (
                  <ThreadSummaryPanel className="demo-subagent-summary-panel">
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Create a file or site"
                        />
                      }
                      collapsible
                      title="Outputs"
                      toggleLabel="Toggle outputs summary"
                    >
                      <ThreadSummaryItem
                        disabled
                        label="Create a file or site"
                      />
                    </ThreadSummarySection>
                    <ThreadSummarySection
                      collapsible
                      title="Subagents"
                      toggleLabel="Toggle subagents summary"
                    >
                      <ThreadSummaryItem
                        aria-label="Open subagents"
                        label={subagentSummaryLabel}
                        leading={
                          <span className="demo-subagent-summary-avatars">
                            {visibleSummarySubagents.slice(0, 4).map((item) => (
                              <SubagentAvatar
                                active={item.status !== "done"}
                                key={item.id}
                                seed={item.id}
                                size="tiny"
                              />
                            ))}
                          </span>
                        }
                        onClick={() => {
                          setThreadSummaryOpen(false);
                          openSubagentPanel(null);
                        }}
                      />
                    </ThreadSummarySection>
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Attach files or connect apps"
                        />
                      }
                      collapsible
                      title="Sources"
                      toggleLabel="Toggle sources summary"
                    >
                      <ThreadSummaryItem
                        disabled
                        label="Attach files or connect apps"
                      />
                    </ThreadSummarySection>
                  </ThreadSummaryPanel>
                ) : (
                  <ThreadSummaryPanel>
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Set up local environment"
                        />
                      }
                      collapsible
                      title="Environment"
                      toggleLabel="Toggle environment summary"
                    >
                      <ThreadSummaryItem
                        label="Changes"
                        leading={<SummaryGlyph name="changes" />}
                        meta={<ThreadSummaryDelta added={0} removed={0} />}
                      />
                      <ThreadSummaryItem
                        label="Local"
                        leading={<SummaryGlyph name="computer" />}
                        title="Select where to run the chat"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        label="feat/current-context-summary"
                        leading={<SummaryGlyph name="branch" />}
                        title="Switch branch"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        disabled
                        label="Commit or push"
                        leading={<SummaryGlyph name="commit" />}
                      />
                      <ThreadSummaryItem
                        label="Create pull request"
                        leading={<SummaryGlyph name="github" />}
                      />
                    </ThreadSummarySection>
                  </ThreadSummaryPanel>
                )}
              </ThreadSummaryPopover>
            ) : isCurrentMcp26818Replay ? (
              <button
                aria-label="Toggle pinned summary"
                aria-pressed={mcpSourceSummaryPinned}
                className="codex-ui-thread-summary-toggle"
                onClick={() => {
                  if (mcpSourceSummaryOpen && mcpSourceSummaryPinned) {
                    setMcpSourceSummaryPinned(false);
                    return;
                  }
                  setMcpSourceSummaryOpen(true);
                  setMcpSourceSummaryPinned(true);
                }}
                ref={mcpSourceSummaryTriggerRef}
                type="button"
              >
                <CurrentBuildIcon name="thread-header-summary" />
              </button>
            ) : (
              <button aria-label="Thread settings" type="button">
                ☷
              </button>
            )}
            {!isCurrentSubagentReplay || !subagentPanelOpen ? (
              <>
                <button aria-label="Toggle bottom panel" type="button">
                  ▱
                </button>
                <button
                  aria-label="Toggle side panel"
                  aria-pressed={
                    isCurrentSubagentReplay
                      ? subagentPanelOpen
                      : undefined
                  }
                  onClick={
                    isCurrentSubagentReplay
                      ? toggleSubagentPanel
                      : undefined
                  }
                  type="button"
                >
                  ▯
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="demo-header-actions">
            <span className="demo-status" data-status={displayedStatus}>
              {replayStatusLabel(
                state.status,
                composerIsRunning,
                isConversationLifecycle && replayComposerStopped,
              )}
            </span>
            {scenarioId === "background-terminal" ||
            scenarioId === "terminal-lifecycle" ? (
              <Button
                aria-label="Toggle bottom panel"
                aria-pressed={terminalOpen}
                onClick={toggleTerminalPanel}
                size="small"
                tone="ghost"
              >
                ▱
              </Button>
            ) : null}
            {hasSubagentSurface ? (
              <Button
                aria-label="Toggle side panel"
                aria-pressed={subagentPanelSelected && subagentPanelOpen}
                onClick={toggleSubagentPanel}
                size="small"
                tone="ghost"
              >
                ▯
              </Button>
            ) : null}
            <Button
              onClick={() =>
                selectMode(mode === "replay" ? "live" : "replay")
              }
              size="small"
              tone="ghost"
            >
              {mode === "replay" ? "Live" : "Replay"}
            </Button>
          </div>
        )
      }
      navigation={
        currentHeaderReplay ? (
          isCurrentSubagentReplay ? undefined : (
            <span aria-hidden="true" className="demo-current-mcp-folder">
              ▱
            </span>
          )
        ) : (
          <Button
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="small"
            tone="ghost"
          >
            ☰
          </Button>
        )
      }
      subtitle={
        currentHeaderReplay
          ? undefined
          : mode === "replay"
          ? `${scenario.id} · ${replayCount}/${scenario.events.length} events`
          : state.threadId ?? "Local app-server"
      }
      title={mode === "replay" ? scenario.label : "Live local thread"}
    />
  );

  const showMeasuredComposer =
    mode === "replay" &&
    (scenarioId === "multi-file-review" ||
      scenarioId === "current-review-rename" ||
      scenarioId === "current-review-files" ||
      scenarioId === "mixed-file-review" ||
      scenarioId === "markdown" ||
      isCurrentMarkdown26818Replay ||
      isCurrentMcpReplay ||
      scenarioId === "mcp-tool-call" ||
      scenarioId === "mcp-recovery-mixed-thread" ||
      scenarioId === "attachment-lifecycle" ||
      scenarioId === "approval-allow-once" ||
      scenarioId === "approval-denied" ||
      scenarioId === "approval-similar-commands" ||
      scenarioId === "approval-for-session" ||
      scenarioId === "approval-review-timeout" ||
      scenarioId === "long-command-output" ||
      scenarioId === "command-failure-recovery" ||
      scenarioId === "interruption" ||
      scenarioId === "compaction" ||
      scenarioId === "context-summary" ||
      isCurrentBasicMessageReplay ||
      isCurrentTransportRecoveryReplay ||
      isCurrentSubagentReplay);
  const showLifecycleComposer = isConversationLifecycle;
  const currentComposerComposition =
    currentHeaderReplay || showLifecycleComposer || isCurrentApprovalReplay;
  const removeComposerAttachment = (id: string) => {
    setComposerAttachments((items) => {
      const next = items.filter((item) => item.id !== id);
      if (next.length === 0) {
        setActiveFrame(isCurrentAttachmentReplay ? "attachment-empty" : null);
      }
      return next;
    });
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };
  const retryComposerAttachment = (id: string) => {
    cancelReplaySubmitTimer();
    if (id.startsWith("native-selection-error:")) {
      void selectFilesAndFolders(id);
      return;
    }
    const previewRetry = composerAttachments.some(
      (item) => item.id === id && item.status === "preview-error",
    );
    if (previewRetry) {
      setComposerAttachments((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                previewSrc: attachmentPreviewDataUrl,
                status: "ready",
              }
            : item,
        ),
      );
      setActiveFrame("attachment-ready");
      requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }
    setComposerAttachments((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, progress: 18, status: "uploading" }
          : item,
      ),
    );
    setActiveFrame("attachment-uploading");
    requestAnimationFrame(() => composerInputRef.current?.focus());
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setComposerAttachments((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, progress: undefined, status: "ready" }
            : item,
        ),
      );
      setActiveFrame("attachment-multi-ready");
    }, 420);
  };
  async function selectFilesAndFolders(replacingErrorId?: string) {
    const previousAttachmentFrame = activeFrame;
    setComposerOverlay(null);
    setActiveFrame("attachment-picker");
    if (
      !window.codexDemo ||
      window.codexDemo.useRendererAttachmentFixture
    ) {
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) => [
        ...items.filter((item) => item.id !== replacingErrorId),
        ...attachmentItemsForFrame("attachment-ready").map(
          (attachment, index) => ({
            ...attachment,
            id: `${attachment.id}:selection:${selectionVersion}:${index + 1}`,
          }),
        ),
      ]);
      setActiveFrame("attachment-ready");
      setComposerValue(
        (current) => current || initialComposerValue("attachment-ready"),
      );
      requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }
    try {
      const selected = await window.codexDemo.selectAttachments();
      if (selected.length === 0) {
        setActiveFrame(previousAttachmentFrame);
        requestAnimationFrame(() => composerInputRef.current?.focus());
        return;
      }
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) => [
        ...items.filter((item) => item.id !== replacingErrorId),
        ...selected.map((item, index) => ({
          ...item,
          id: `${item.id}:selection:${selectionVersion}:${index + 1}`,
          layout: "card" as const,
          status: "ready" as const,
        })),
      ]);
      setActiveFrame("attachment-native-ready");
      setComposerValue(
        (current) =>
          current || initialComposerValue("attachment-native-ready"),
      );
    } catch {
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) =>
        replacingErrorId
          ? items
          : [
              ...items,
              {
                id: `native-selection-error:selection:${selectionVersion}`,
                kind: "file",
                label: "Files and folders",
                layout: "card",
                status: "error",
              },
            ],
      );
      setActiveFrame("attachment-upload-error");
    }
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }
  const composerAttachmentNodes = composerAttachments.map((attachment) => (
    <ComposerAttachment
      icon={
        attachment.kind === "folder" ? (
          <CurrentBuildIcon name="composer-project" />
        ) : attachment.kind === "file" ? (
          <span className="demo-current-file-type">
            {attachment.meta?.split(/\s|·/)[0] ?? "FILE"}
          </span>
        ) : undefined
      }
      key={attachment.id}
      kind={attachment.kind}
      label={attachment.label}
      layout={attachment.layout}
      meta={attachment.meta}
      onOpen={() => undefined}
      onRemove={() => removeComposerAttachment(attachment.id)}
      onRetry={
        attachment.status === "error" ||
        attachment.status === "preview-error"
          ? () => retryComposerAttachment(attachment.id)
          : undefined
      }
      previewSrc={attachment.previewSrc}
      progress={attachment.progress}
      status={attachment.status}
    />
  ));
  const composerSurface = (
    <AgentComposer
      actions={
        showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-controls">
            <button
              aria-expanded={composerOverlay === "resources"}
              aria-label="Add files and more"
              onClick={() => {
                if (!isCurrentAttachmentReplay) setActiveFrame(null);
                setComposerOverlay((current) =>
                  current === "resources" ? null : "resources",
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  composerOverlay === "resources"
                ) {
                  event.preventDefault();
                  dismissComposerResources();
                }
              }}
              ref={composerResourceTriggerRef}
              type="button"
            >
              {currentComposerComposition ? (
                <CurrentBuildIcon name="composer-add-files" />
              ) : (
                "+"
              )}
            </button>
            <ComposerPermissionMenu
              align="start"
              heading="How should ChatGPT actions be approved?"
              learnMore="Learn more"
              onOpenChange={(open) => {
                setActiveFrame(null);
                setComposerOverlay((current) =>
                  open
                    ? "permissions"
                    : current === "permissions"
                      ? null
                      : current,
                );
              }}
              onSelect={(option) => {
                setComposerPermissionId(option.id);
                setComposerOverlay(null);
                setActiveFrame(null);
              }}
              open={composerOverlay === "permissions"}
              options={composerPermissionOptions}
              selectedId={selectedComposerPermission.id}
              side="top"
              sideOffset={1.5}
              trigger={
                <button
                  aria-label="Change permissions"
                  className="demo-composer-permission-trigger"
                  type="button"
                >
                  <span aria-hidden="true">
                    {currentComposerComposition ? (
                      selectedComposerPermission.id === "ask" ? (
                        <CurrentBuildIcon name="composer-permission-ask" />
                      ) : (
                        <CurrentBuildIcon name="composer-permission" />
                      )
                    ) : (
                      "◉"
                    )}
                  </span>
                  {currentHeaderReplay ||
                  showLifecycleComposer ||
                  isCurrentApprovalReplay
                    ? selectedComposerPermission.label
                    : "Approve for me"}
                </button>
              }
            />
            {composerMode ? (
              <ComposerModeIndicator
                clearLabel={
                  composerMode === "goal" ? "Clear goal" : "Plan"
                }
                kind={composerMode}
                label={composerMode === "goal" ? "Goal" : "Plan"}
                onClear={() => {
                  setComposerMode(null);
                  setActiveFrame(null);
                  requestAnimationFrame(() => composerInputRef.current?.focus());
                }}
              />
            ) : null}
          </span>
        ) : undefined
      }
      allowAttachmentOnlySubmit={
        isCurrentAttachmentReplay && attachmentSubmissionReady
      }
      allowSubmitWhileRunning={showLifecycleComposer}
      aria-busy={composerIsDisabled || undefined}
      attachments={composerAttachmentNodes}
      controls={
        showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-actions">
            {isCurrentBasicMessageReplay ? (
              <button
                className="demo-current-composer-model"
                type="button"
              >
                <span>5.6 Sol Extra High</span>
                <CurrentBuildIcon name="composer-model-chevron" />
              </button>
            ) : (
              <span className="demo-current-composer-model">
                <span>5.6 Sol Extra High</span>
                {currentComposerComposition ? (
                  <CurrentBuildIcon name="composer-model-chevron" />
                ) : (
                  <span aria-hidden="true">⌄</span>
                )}
              </span>
            )}
            <button aria-label="Dictate" type="button">
              {currentComposerComposition ? (
                <CurrentBuildIcon name="composer-dictate" />
              ) : (
                "♫"
              )}
            </button>
          </span>
        ) : undefined
      }
      disabled={composerIsDisabled}
      isRunning={composerIsRunning}
      layout={
        showMeasuredComposer || showLifecycleComposer
          ? "multiline"
          : "auto"
      }
      onStop={stopComposer}
      onSubmit={submitComposer}
      onValueChange={setComposerValue}
      placeholder={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : showMeasuredComposer || showLifecycleComposer
              ? "Do anything"
              : mode === "live"
                ? "Ask Codex to inspect this repository…"
                : "Switch to Live to send a real local turn…"
      }
      stopLabel="Stop"
      submitDisabled={
        isCurrentAttachmentReplay
          ? !attachmentSubmissionReady
          : composerAttachments.length > 0 && !attachmentSubmissionReady
      }
      submitLabel={
        isCurrentCommandInterruptionReplay ||
        isCurrentContextCompactionReplay ||
        isCurrentTransportRecoveryReplay ||
        isCurrentBasicMessageReplay
          ? "Send"
          : undefined
      }
      suggestions={
        isCurrentContextCompactionReplay &&
        (activeFrame === "context-compaction-ready" ||
          activeFrame === "context-compaction-command-menu") &&
        composerValue.trim() === "/compact" ? (
          <div
            aria-label="Slash commands"
            className="demo-compaction-command-menu"
            role="listbox"
          >
            <button
              aria-label="Compact this chat's context (9% full)"
              className="demo-compaction-command"
              onClick={startReplayCompaction}
              role="option"
              type="button"
            >
              <span aria-hidden="true" className="demo-compaction-command__icon">
                ◴
              </span>
              <span className="demo-compaction-command__label">Compact</span>
              <span className="demo-compaction-command__description">
                Compact this chat&apos;s context (9% full)
              </span>
            </button>
          </div>
        ) : (showMeasuredComposer || showLifecycleComposer) &&
          composerOverlay === "resources" ? (
          <ComposerResourcePicker
            activeId={composerResourceActiveId}
            groups={composerResourceGroups}
            onActiveIdChange={setComposerResourceActiveId}
            onDismiss={dismissComposerResources}
            onSelect={(option) => {
              setComposerResourceActiveId(option.id);
              if (isCurrentAttachmentReplay && option.id === "files") {
                void selectFilesAndFolders();
                return;
              }
              if (
                isCurrentAttachmentReplay &&
                (option.id === "goal" || option.id === "plan")
              ) {
                selectScenario(
                  "conversation-lifecycle",
                  `composer-${option.id}`,
                );
                return;
              }
              if (option.id === "goal" || option.id === "plan") {
                setComposerMode(option.id);
                setComposerValue("");
              }
              dismissComposerResources();
            }}
          />
        ) : undefined
      }
      textareaLabel={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : "Message composer"
      }
      ref={composerInputRef}
      value={composerValue}
    />
  );
  const regularComposer = showLifecycleComposer ? (
    <ComposerDock
      composer={composerSurface}
      context={
        !composerIsRunning && !queueInterrupted ? (
          <ComposerContextBar>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-project" />}
            >
              codex-ui-kit
            </ComposerContextControl>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-worktree" />}
            >
              Local
            </ComposerContextControl>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-branch" />}
            >
              main
            </ComposerContextControl>
          </ComposerContextBar>
        ) : undefined
      }
      queue={
        queuedPrompts.length > 0 ? (
          <QueuedPromptList
            interrupted={queueInterrupted}
            items={queuedPrompts}
            onDelete={deleteQueuedPrompt}
            onEdit={editQueuedPrompt}
            onQueueingChange={setQueueingEnabled}
            onReorder={reorderQueuedPrompts}
            onResume={resumeQueue}
            onSendNow={sendQueuedPromptNow}
            queueingEnabled={queueingEnabled}
          />
        ) : undefined
      }
    />
  ) : (
    composerSurface
  );
  const currentPendingApproval = isCurrentApprovalReplay
    ? state.approvals.find(({ decision }) => decision === "pending")
    : undefined;
  const composer = currentPendingApproval ? (
    <ApprovalRequest
      approvalOptionsIcon={
        <CurrentBuildIcon name="composer-model-chevron" />
      }
      autoFocus={false}
      data-item-id={currentPendingApproval.itemId}
      data-testid="current-approval-request"
      description={currentPendingApproval.command}
      identity={
        currentPendingApproval.kind === "file" ? "Edit files" : "Terminal"
      }
      identityIcon={
        currentPendingApproval.kind === "file" ? undefined : (
          <CurrentBuildIcon name="thread-command-terminal" />
        )
      }
      kind={currentPendingApproval.kind}
      onApprove={() =>
        respondToApproval(currentPendingApproval.requestId, "accept")
      }
      onReject={() =>
        respondToApproval(currentPendingApproval.requestId, "decline")
      }
      presentation="composer"
      scopedApproveAction={{
        info:
          currentPendingApproval.kind === "file"
            ? "Allow this and future file edits in this conversation without asking again"
            : "Allow future commands that match this proposed rule",
        label:
          currentPendingApproval.kind === "file"
            ? "Allow all edits"
            : "Allow similar commands",
        onClick: () =>
          respondToApproval(
            currentPendingApproval.requestId,
            currentPendingApproval.kind === "file"
              ? "acceptForSession"
              : "accept",
            currentPendingApproval.kind === "file" ? "once" : "similar",
          ),
      }}
      title={
        currentPendingApproval.kind === "file"
          ? "Allow ChatGPT to edit the following file?"
          : scenarioId === "approval-denied"
            ? "是否允许创建这个指定的 Desktop 哨兵文件?"
            : "Allow opening the requested local application?"
      }
    />
  ) : (
    regularComposer
  );

  const createdWorkspaceProject = createdProjects.find(
    ({ id }) => id === workspaceProjectId,
  );
  const workspaceProjectFixture =
    workspaceProjectId === null
      ? undefined
      : createdWorkspaceProject
        ? {
            ...createdWorkspaceProject,
            icon: <SidebarGlyph name="folder" />,
            status: "available" as const,
          }
        : (workspaceProjects.find(
            ({ id }) => id === workspaceProjectId,
          ) ?? workspaceProjects[0]);
  const workspaceProject =
    workspaceProjectFixture &&
    workspaceUsesHostBranches &&
    window.codexDemo &&
    workspaceProjectId === window.codexDemo.workspaceProjectId
      ? {
          ...workspaceProjectFixture,
          path: window.codexDemo.workspaceProjectPath,
        }
      : workspaceProjectFixture;
  const createdProjectBranches = workspaceProjectId
    ? (workspaceCreatedBranches[workspaceProjectId] ?? [])
    : [];
  const createdProjectBranchNames = new Set(
    createdProjectBranches.map(({ branch }) => branch),
  );
  const workspaceHostBranchState = workspaceProjectId
    ? workspaceHostBranchesByProject[workspaceProjectId]
    : undefined;
  const workspaceBranchesCheckedOutElsewhere = new Set(
    workspaceHostBranchState?.status === "ready"
      ? workspaceHostBranchState.branchesCheckedOutElsewhere
      : [],
  );
  const workspaceBranchesUnavailableForCheckout = new Set(
    workspaceHostBranchState?.status === "ready"
      ? workspaceHostBranchState.branchesUnavailableForCheckout
      : [],
  );
  const workspaceLocalEnvironmentGroups = (() => {
    if (!workspaceUsesHostBranches || !workspaceProjectId) {
      return workspaceEnvironmentGroups;
    }
    const templateGroup = workspaceEnvironmentGroups.find(
      ({ id }) => id === workspaceProjectId,
    ) ?? workspaceEnvironmentGroups[0];
    if (!templateGroup) return [];
    const [currentCheckout] = templateGroup.items;
    if (!currentCheckout) return [];
    const hostGroup = {
      ...templateGroup,
      id: workspaceProjectId,
      label: workspaceProject?.label ?? workspaceProjectId,
    };
    if (workspaceHostBranchState?.status !== "ready") {
      return [
        {
          ...hostGroup,
          items: [
            {
              ...currentCheckout,
              disabled: true,
              meta: "Loading Git branches",
              status: "unavailable" as const,
            },
          ],
        },
      ];
    }
    const currentBranch = workspaceHostBranchState.currentBranch;
    const currentItem = currentBranch
      ? {
          ...currentCheckout,
          branch: currentBranch,
          id: workspaceGitBranchId(currentBranch),
          label: currentBranch === "main" ? "Main" : "Current checkout",
          meta: "current",
          textValue:
            currentBranch === "main" ? "Main" : "Current checkout",
        }
      : {
          ...currentCheckout,
          branch:
            workspaceHostBranchState.unbornBranch ?? "Detached HEAD",
          id: unattachedWorkspaceBranchId,
          label: workspaceHostBranchState.unbornBranch
            ? "Unborn checkout"
            : "Detached HEAD",
          meta: "current",
          textValue: workspaceHostBranchState.unbornBranch
            ? "Unborn checkout"
            : "Detached HEAD",
        };
    return [{ ...hostGroup, items: [currentItem] }];
  })();
  const workspaceBranchOperationsAvailable =
    !workspaceUsesHostBranches ||
    Boolean(
      workspaceProjectToken && workspaceHostBranchState?.status === "ready",
    );
  const workspaceBranchControlAvailable =
    !workspaceUsesHostBranches ||
    Boolean(
      workspaceProjectToken && workspaceHostBranchState?.status !== "error",
    );
  const workspaceWorktrees = workspaceProjectId
    ? workspaceUsesHostBranches
      ? workspaceHostBranchState?.status === "ready"
        ? [
            ...(workspaceHostBranchState.currentBranch
              ? []
              : [
                  unattachedWorkspaceBranch(
                    workspaceHostBranchState.unbornBranch,
                  ),
                ]),
            ...workspaceHostBranchState.branches.map((branch) =>
              workspaceGitBranch(
                branch,
                workspaceBranchesCheckedOutElsewhere,
                workspaceBranchesUnavailableForCheckout,
              ),
            ),
          ]
        : [workspaceBranches[0]]
      : [
          ...(workspaceWorktreesByProject[workspaceProjectId] ?? [
            workspaceBranches[0],
          ]).filter(
            ({ branch }) => !createdProjectBranchNames.has(branch),
          ),
          ...createdProjectBranches,
        ]
    : [workspaceBranches[0]];
  const selectedLinkedWorkspaceWorktree = workspaceEnvironmentGroups
    .find(({ id }) => id === workspaceProjectId)
    ?.items.find(({ id }) => id === workspaceWorktreeId);
  const workspaceWorktree =
    workspaceWorktrees.find(({ id }) => id === workspaceWorktreeId) ??
    selectedLinkedWorkspaceWorktree ??
    workspaceWorktrees[0];
  const currentWorkspaceCwd = workspaceExecutionCwd({
    environmentId: workspaceEnvironmentId,
    inPlaceBranch:
      workspaceUsesHostBranches &&
      hostSelectionUsesInPlaceBranch(workspaceWorktreeId),
    projectPath: workspaceProject?.path,
    worktreeBranch: workspaceWorktree.branch,
    worktreeId: workspaceWorktreeId,
  });
  const selectableWorkspaceProjects = [
    ...createdProjects.map((project) => ({
      ...project,
      icon: <SidebarGlyph name="folder" />,
      status: "available" as const,
    })),
    ...workspaceProjects,
  ];
  const filteredWorkspaceProjects = selectableWorkspaceProjects.filter(
    ({ label }) =>
      label
        .toLocaleLowerCase()
        .includes(workspaceProjectQuery.trim().toLocaleLowerCase()),
  );
  const filteredWorkspaceWorktrees =
    workspaceWorktrees.filter(
      ({ branch, id, label, status }) =>
        id !== unattachedWorkspaceBranchId &&
        status !== "repairing" &&
        `${branch} ${label}`
          .toLocaleLowerCase()
          .includes(workspaceBranchQuery.trim().toLocaleLowerCase()),
    );
  const workspaceBaseFrame =
    workspacePage === "environments"
      ? "workspace-environments-unavailable"
      : workspacePage === "general-settings"
        ? activeFrame?.startsWith("workspace-general-settings")
          ? activeFrame
          : "workspace-general-settings"
      : workspacePage === "hooks-settings"
        ? activeFrame?.startsWith("workspace-hooks-settings")
          ? activeFrame
          : "workspace-hooks-settings"
      : workspacePage === "code-review-settings"
        ? activeFrame?.startsWith("workspace-code-review-settings")
          ? activeFrame
          : "workspace-code-review-settings"
      : workspacePage === "appearance-settings"
        ? initialSelection.frame?.startsWith("workspace-appearance-settings")
          ? initialSelection.frame
          : "workspace-appearance-settings"
      : workspacePage === "git-settings"
        ? initialSelection.frame === "workspace-git-settings-compact"
          ? "workspace-git-settings-compact"
          : "workspace-git-settings"
      : projectIndexChat
      ? "projects-index-chat"
      : activeFrame === "workspace-branch-created"
        ? activeFrame
      : currentWorkspacePersistenceFrame(activeFrame)
      ? activeFrame
      : initialSelection.frame === "workspace-compact-ready"
      ? "workspace-compact-ready"
      : workspaceProjectId === null
        ? "workspace-no-project"
        : workspaceEnvironmentId === "worktree"
          ? "workspace-new-worktree"
            : workspaceWorktree.status === "repairing"
              ? "workspace-repairing"
              : createdWorkspaceProject
                ? "workspace-project-created"
                : "workspace-ready";
  useEffect(() => {
    if (view === "workspace" && workspaceLocalEnvironmentOpen) {
      setActiveFrame("workspace-environment");
    }
  }, [view, workspaceLocalEnvironmentOpen]);
  useEffect(() => {
    if (
      view !== "workspace" ||
      workspaceLocalEnvironmentOpen ||
      workspaceBranchDialogOpen ||
      workspaceOverlay
    ) {
      return;
    }
    setActiveFrame(workspaceBaseFrame);
  }, [
    view,
    workspaceBaseFrame,
    workspaceBranchDialogOpen,
    workspaceLocalEnvironmentOpen,
    workspaceOverlay,
  ]);
  useEffect(() => {
    if (
      ![
        "appearance-settings",
        "code-review-settings",
        "general-settings",
        "git-settings",
        "hooks-settings",
      ].includes(
        workspacePage,
      ) ||
      !settingsRouteFocusPending
    ) return;
    const timer = window.setTimeout(() => {
      settingsBackButtonRef.current?.focus();
      setSettingsRouteFocusPending(false);
    });
    return () => window.clearTimeout(timer);
  }, [settingsRouteFocusPending, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "appearance-settings" ||
      !activeFrame?.startsWith("workspace-appearance-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame?.endsWith("-preferences")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "general-settings" ||
      !activeFrame?.startsWith("workspace-general-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop =
      activeFrame.endsWith("-bottom") || activeFrame.endsWith("-hotkey")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  const setWorkspaceOverlayState = (
    overlay:
      | "environment"
      | "project"
      | "worktree"
      | "worktree-environment"
      | null,
  ) => {
    if (overlay) setWorkspaceLocalEnvironmentOpen(false);
    if (overlay !== "project") setWorkspaceProjectQuery("");
    setWorkspaceOverlay(overlay);
    setActiveFrame(
      overlay === "project"
        ? "workspace-project-menu"
        : overlay === "environment"
          ? "workspace-environment-menu"
          : overlay === "worktree"
            ? "workspace-worktree-menu"
            : overlay === "worktree-environment"
              ? "workspace-environment-picker"
              : workspaceBaseFrame,
    );
  };
  const openWorkspaceLocalEnvironment = (
    launcher: "environment" | "worktree",
  ) => {
    setWorkspaceEnvironmentLauncher(launcher);
    setWorkspaceOverlay(null);
    setWorkspaceEnvironmentQuery("");
    setWorkspaceLocalEnvironmentOpen(true);
  };
  const closeWorkspaceLocalEnvironment = () => {
    setWorkspaceEnvironmentQuery("");
    setWorkspaceLocalEnvironmentOpen(false);
    setActiveFrame("workspace-ready");
  };
  const openWorkspaceBranchCreation = () => {
    if (!workspaceBranchOperationsAvailable) return;
    setWorkspaceOverlay(null);
    setWorkspaceBranchName("");
    setWorkspaceBranchError(undefined);
    setWorkspaceBranchStatus("idle");
    setWorkspaceBranchDialogOpen(true);
    setActiveFrame("workspace-branch-create");
  };
  const closeWorkspaceBranchCreation = () => {
    if (workspaceBranchStatus === "creating") return;
    setWorkspaceBranchDialogOpen(false);
    setWorkspaceBranchStatus("idle");
    setWorkspaceBranchError(undefined);
    setActiveFrame("workspace-ready");
  };
  const createWorkspaceBranch = async (rawBranchName: string) => {
    const branchName = trimBranchInputAsciiWhitespace(rawBranchName);
    const projectId = workspaceProjectId;
    if (!branchName || !projectId) return;
    const projectToken = workspaceProjectTokens[projectId];
    if (workspaceUsesHostBranches && !projectToken) {
      setWorkspaceBranchStatus("error");
      setWorkspaceBranchError(
        "Add this project from a local directory before managing its Git branches.",
      );
      setActiveFrame("workspace-branch-create-error");
      return;
    }
    setWorkspaceBranchStatus("creating");
    setWorkspaceBranchError(undefined);
    const duplicate =
      !workspaceUsesHostBranches &&
      workspaceWorktrees.some((worktree) => worktree.branch === branchName);
    let response: WorkspaceGitBranchResponse;
    try {
      response = duplicate
        ? {
            code: "duplicate",
            message: `A branch named ${branchName} already exists.`,
            ok: false,
          }
        : workspaceUsesHostBranches && window.codexDemo
          ? await window.codexDemo.createAndCheckoutBranch({
              branchName,
              projectToken: projectToken ?? "",
            })
          : { branch: branchName, ok: true };
    } catch {
      response = {
        code: "unavailable",
        message: "Git could not create and checkout the branch.",
        ok: false,
      };
    }
    if (!response.ok) {
      setWorkspaceBranchStatus("error");
      setWorkspaceBranchError(response.message);
      setActiveFrame("workspace-branch-create-error");
      return;
    }
    const createdBranch: WorkspaceBranch = {
      branch: response.branch,
      id: workspaceUsesHostBranches
        ? workspaceGitBranchId(response.branch)
        : `created:${response.branch}`,
      label: response.branch,
      meta: "clean",
      status: "available",
    };
    let selectedBranchId = createdBranch.id;
    if (workspaceUsesHostBranches) {
      const previous = workspaceHostBranchesByProject[projectId];
      let nextState: WorkspaceHostBranchState =
        branchStateAfterSuccessfulCreation(
          previous?.status === "ready" ? previous : undefined,
          response.branch,
        ) ?? {
          message: "Git created the branch, but its state could not be refreshed.",
          status: "error",
        };
      try {
        const listed = await window.codexDemo?.listBranches({
          projectToken: projectToken ?? "",
        });
        if (listed?.ok) {
          nextState = {
            branches: listed.branches,
            branchesCheckedOutElsewhere:
              listed.branchesCheckedOutElsewhere,
            branchesUnavailableForCheckout:
              listed.branchesUnavailableForCheckout,
            currentBranch: listed.currentBranch,
            status: "ready",
            unbornBranch: listed.unbornBranch,
          };
        }
      } catch {
        // The successful switch remains represented as an uncommitted ref.
      }
      setWorkspaceHostBranchesByProject((current) => ({
        ...current,
        [projectId]: nextState,
      }));
      selectedBranchId = nextState.status === "ready"
        ? nextState.currentBranch
          ? workspaceGitBranchId(nextState.currentBranch)
          : unattachedWorkspaceBranchId
        : createdBranch.id;
    } else {
      setWorkspaceCreatedBranches((current) => ({
        ...current,
        [projectId]: [
          ...(current[projectId] ?? []).filter(
            (branch) => branch.branch !== response.branch,
          ),
          createdBranch,
        ],
      }));
    }
    setWorkspaceEnvironmentId("local");
    updateWorkspaceWorktreeId(selectedBranchId);
    setWorkspaceBranchDialogOpen(false);
    setWorkspaceBranchName("");
    setWorkspaceBranchStatus("idle");
    setActiveFrame("workspace-branch-created");
  };
  const selectWorkspaceBranch = async (worktree: WorkspaceBranch) => {
    const initiatingProjectId = workspaceProjectId;
    const initiatingEnvironmentId = workspaceEnvironmentId;
    const initiatingRunLocationVersion =
      workspaceRunLocationVersionRef.current;
    if (
      !initiatingProjectId ||
      worktree.checkedOutInLinkedWorktree ||
      worktree.checkoutUnavailable ||
      workspaceBranchCheckoutActiveRef.current
    ) {
      return;
    }
    const initiatingProjectToken =
      workspaceProjectTokens[initiatingProjectId] ?? "";
    if (workspaceUsesHostBranches && !initiatingProjectToken) {
      setWorkspaceBranchSwitchError(
        "Add this project from a local directory before managing its Git branches.",
      );
      setActiveFrame("workspace-branch-switch-error");
      return;
    }
    workspaceBranchCheckoutActiveRef.current = true;
    setWorkspaceBranchCheckoutPending(true);
    setWorkspaceBranchSwitchError(undefined);
    let response: WorkspaceGitBranchResponse;
    try {
      response = workspaceUsesHostBranches && window.codexDemo
        ? await window.codexDemo.checkoutBranch({
            branchName: worktree.branch,
            projectToken: initiatingProjectToken,
          })
        : { branch: worktree.branch, ok: true };
    } catch {
      response = {
        code: "unavailable",
        message: "Git could not checkout the branch.",
        ok: false,
      };
    } finally {
      workspaceBranchCheckoutActiveRef.current = false;
      setWorkspaceBranchCheckoutPending(false);
    }
    if (response.ok && workspaceUsesHostBranches) {
      setWorkspaceHostBranchesByProject((current) => {
        const previous = current[initiatingProjectId];
        if (previous?.status !== "ready") return current;
        return {
          ...current,
          [initiatingProjectId]: {
            ...previous,
            currentBranch: response.branch,
            unbornBranch: null,
          },
        };
      });
    }
    if (workspaceProjectIdRef.current !== initiatingProjectId) {
      return;
    }
    if (!response.ok) {
      setWorkspaceBranchSwitchError(response.message);
      setActiveFrame("workspace-branch-switch-error");
      return;
    }
    if (
      (workspaceUsesHostBranches ||
        initiatingEnvironmentId === "worktree") &&
      workspaceRunLocationVersionRef.current ===
        initiatingRunLocationVersion
    ) {
      setWorkspaceEnvironmentId("local");
    }
    updateWorkspaceWorktreeId(
      workspaceUsesHostBranches
        ? workspaceGitBranchId(response.branch)
        : worktree.id,
    );
    setActiveFrame("workspace-ready");
  };
  const selectWorkspaceRunLocation = (
    environmentId: "local" | "worktree",
  ) => {
    workspaceRunLocationVersionRef.current += 1;
    setWorkspaceEnvironmentId(environmentId);
    setWorkspacePage("conversation");
    setWorkspaceOverlay(null);
    setActiveFrame(
      environmentId === "worktree"
        ? "workspace-new-worktree"
        : "workspace-ready",
    );
  };
  const workspaceContext = (
    <>
      <ConversationContextBar
        expandedId={
          workspaceOverlay === "project" &&
          workspaceProjectTriggerId !== "demo-workspace-project-trigger"
            ? undefined
            : (workspaceOverlay ?? undefined)
        }
        items={[
          {
            ariaLabel: workspaceProject
              ? `Change project: ${workspaceProject.label}`
              : "Choose project",
            controlsId: "demo-workspace-project-dialog",
            icon: <CurrentBuildIcon name="composer-project" />,
            id: "project",
            kind: "project",
            label: workspaceProject?.label ?? "Choose project",
            popupRole: "dialog",
            textValue: workspaceProject?.label ?? "Choose project",
            triggerId: "demo-workspace-project-trigger",
          },
          ...(workspaceProject
            ? workspaceEnvironmentId === "worktree"
              ? [
                  {
                    ariaLabel: "Select where to run the chat",
                    controlsId: "demo-workspace-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-run-location-worktree" />
                    ),
                    id: "environment",
                    kind: "run-location" as const,
                    label: "New local worktree",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "Select a local environment",
                    controlsId:
                      "demo-workspace-worktree-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-environment-settings" />
                    ),
                    id: "worktree-environment",
                    kind: "environment" as const,
                    label: "No environment",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "What branch should this chat start from?",
                    icon: <CurrentBuildIcon name="composer-branch" />,
                    id: "starting-state",
                    kind: "starting-state" as const,
                    label: "main",
                  },
                ]
              : [
                  {
                    ariaLabel: "Select where to run the chat",
                    controlsId: "demo-workspace-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-run-location-local" />
                    ),
                    id: "environment",
                    kind: "run-location" as const,
                    label: "Local",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "Switch branch",
                    controlsId: "demo-workspace-worktree-menu",
                    disabled:
                      workspaceBranchCheckoutPending ||
                      !workspaceBranchControlAvailable,
                    icon: <CurrentBuildIcon name="composer-branch" />,
                    id: "worktree",
                    kind: "worktree" as const,
                    label: workspaceWorktree.branch,
                    popupRole: "menu" as const,
                    status: workspaceWorktree.status,
                    statusLabel: workspaceWorktree.statusLabel,
                  },
                ]
            : []),
        ]}
        onSelect={(itemId) => {
          if (itemId === "project") {
            const nextOverlay =
              workspaceOverlay === "project" ? null : "project";
            if (nextOverlay) {
              setWorkspaceProjectTriggerId(
                "demo-workspace-project-trigger",
              );
            }
            setWorkspaceOverlayState(nextOverlay);
            return;
          }
          if (itemId === "environment") {
            setWorkspaceOverlayState(
              workspaceOverlay === "environment" ? null : "environment",
            );
            return;
          }
          if (itemId === "worktree-environment") {
            setWorkspaceOverlayState(
              workspaceOverlay === "worktree-environment"
                ? null
                : "worktree-environment",
            );
            return;
          }
          if (itemId === "starting-state") return;
          setWorkspaceOverlayState(
            workspaceOverlay === "worktree" ? null : "worktree",
          );
        }}
        renderItem={(item, trigger) => {
          if (item.id === "environment") {
            const environmentTrigger = cloneElement(trigger, {
              ref: workspaceEnvironmentTriggerRef,
            });
            return (
              <Menu
                align="start"
                className="demo-workspace-context-menu demo-workspace-environment-menu"
                label="Work in"
                onOpenChange={(open) =>
                  setWorkspaceOverlayState(open ? "environment" : null)
                }
                open={workspaceOverlay === "environment"}
                side="top"
                sideOffset={1}
                trigger={environmentTrigger}
                width="auto"
              >
                <MenuSectionLabel>Work in</MenuSectionLabel>
                <MenuItem
                  endIcon={
                    workspaceEnvironmentId === "local" ? (
                      <CurrentBuildIcon name="workspace-selection-check" />
                    ) : undefined
                  }
                  onSelect={() => selectWorkspaceRunLocation("local")}
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-local" />
                  }
                >
                  Local
                </MenuItem>
                <MenuItem
                  endIcon={
                    workspaceEnvironmentId === "worktree" ? (
                      <CurrentBuildIcon name="workspace-selection-check" />
                    ) : undefined
                  }
                  onSelect={() => selectWorkspaceRunLocation("worktree")}
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-worktree" />
                  }
                >
                  New local worktree
                </MenuItem>
                <MenuLinkItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-run-location-external" />
                  }
                  href="https://chatgpt.com/codex/cloud"
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-codex-web" />
                  }
                >
                  Connect Codex web
                </MenuLinkItem>
                <MenuItem
                  disabled
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-send-cloud" />
                  }
                >
                  Cloud
                </MenuItem>
                <div
                  aria-hidden="true"
                  className="demo-workspace-context-menu__divider"
                />
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-run-location-usage-chevron" />
                  }
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-usage" />
                  }
                >
                  Usage remaining
                </MenuItem>
              </Menu>
            );
          }
          if (item.id === "worktree-environment") {
            return (
              <Menu
                align="start"
                className="demo-workspace-context-menu demo-workspace-worktree-environment-menu"
                initialFocus="none"
                label="Environment"
                onOpenChange={(open) =>
                  setWorkspaceOverlayState(
                    open ? "worktree-environment" : null,
                  )
                }
                open={workspaceOverlay === "worktree-environment"}
                side="top"
                sideOffset={1}
                trigger={trigger}
                width="auto"
              >
                <MenuSectionLabel>Environment</MenuSectionLabel>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-selection-check" />
                  }
                >
                  Work without environment
                </MenuItem>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-environment-settings" />
                  }
                  onSelect={() => {
                    setWorkspaceOverlay(null);
                    setWorkspacePage("environments");
                    setActiveFrame("workspace-environments-unavailable");
                  }}
                >
                  Set up project
                </MenuItem>
              </Menu>
            );
          }
          if (item.id === "worktree") {
            const worktreeTrigger = cloneElement(trigger, {
              ref: workspaceWorktreeTriggerRef,
            });
            return (
              <Menu
                align="start"
                className="demo-workspace-context-menu demo-workspace-worktree-menu"
                label="Branches"
                onOpenChange={(open) => {
                  if (!open) setWorkspaceBranchQuery("");
                  setWorkspaceOverlayState(open ? "worktree" : null);
                }}
                open={workspaceOverlay === "worktree"}
                side="top"
                sideOffset={1}
                trigger={worktreeTrigger}
                width="auto"
              >
                <input
                  aria-label="Search branches"
                  onChange={(event) =>
                    setWorkspaceBranchQuery(event.currentTarget.value)
                  }
                  placeholder="Search branches"
                  type="search"
                  value={workspaceBranchQuery}
                />
                <MenuSectionLabel>Branches</MenuSectionLabel>
                <div className="demo-workspace-worktree-menu__branches">
                  {filteredWorkspaceWorktrees.map((worktree) => (
                    <MenuItem
                      aria-checked={worktree.id === workspaceWorktreeId}
                      disabled={
                        !workspaceBranchOperationsAvailable ||
                        worktree.checkedOutInLinkedWorktree ||
                        worktree.checkoutUnavailable
                      }
                      endIcon={
                        worktree.id === workspaceWorktreeId
                          ? "✓"
                          : undefined
                      }
                      key={worktree.id}
                      onSelect={() => {
                        void selectWorkspaceBranch(worktree);
                      }}
                      role="menuitemradio"
                      startIcon="⑂"
                      subText={
                        worktree.checkedOutInLinkedWorktree
                          ? "Checked out in another worktree"
                          : worktree.checkoutUnavailable
                            ? "Unavailable for checkout"
                          : undefined
                      }
                    >
                      {worktree.branch}
                    </MenuItem>
                  ))}
                </div>
                <MenuSeparator />
                <MenuItem
                  onSelect={() =>
                    openWorkspaceLocalEnvironment("worktree")
                  }
                  startIcon={<CurrentBuildIcon name="composer-worktree" />}
                >
                  Select local environment…
                </MenuItem>
                <MenuItem
                  disabled={!workspaceBranchOperationsAvailable}
                  onSelect={openWorkspaceBranchCreation}
                  startIcon="＋"
                >
                  Create and checkout new branch…
                </MenuItem>
              </Menu>
            );
          }
          return trigger;
        }}
      />
      {workspaceBranchSwitchError ? (
        <StatusBanner heading="Couldn’t checkout branch" tone="error">
          {workspaceBranchSwitchError}
        </StatusBanner>
      ) : null}
      {workspaceBranchCheckoutPending ? (
        <StatusBanner heading="Switching branch" tone="info">
          Waiting for the current Git checkout to finish.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectId &&
      !workspaceProjectToken ? (
        <StatusBanner heading="Branch operations unavailable" tone="info">
          Add this project from a local directory before managing its Git
          branches.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectToken &&
      workspaceHostBranchState?.status === "loading" ? (
        <StatusBanner heading="Loading branches" tone="info">
          Reading the selected project’s local Git branches.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectToken &&
      workspaceHostBranchState?.status === "error" ? (
        <StatusBanner heading="Branch operations unavailable" tone="error">
          {workspaceHostBranchState.message}
        </StatusBanner>
      ) : null}
      {workspaceOverlay === "project" ? (
        <div
          aria-label="Choose a project"
          className="demo-workspace-project-dialog"
          id="demo-workspace-project-dialog"
          role="dialog"
        >
          <input
            aria-label="Search projects"
            autoFocus
            onChange={(event) =>
              setWorkspaceProjectQuery(event.currentTarget.value)
            }
            placeholder="Search projects"
            type="search"
            value={workspaceProjectQuery}
          />
          <ConversationProjectListbox
            dismissBoundaryId="demo-workspace-project-dialog"
            initialFocus="none"
            items={filteredWorkspaceProjects}
            label="Suggestions"
            onDismiss={() => {
              setWorkspaceOverlayState(null);
            }}
            onSelect={(projectId) => {
              updateWorkspaceProjectId(projectId);
              setWorkspaceEnvironmentId("local");
              updateWorkspaceWorktreeId("main");
              setWorkspaceOverlayState(null);
              setActiveFrame("workspace-ready");
              setWorkspaceProjectQuery("");
            }}
            selectedId={workspaceProjectId ?? undefined}
            triggerId={workspaceProjectTriggerId}
          />
          {filteredWorkspaceProjects.length === 0 ? (
            <p
              aria-live="polite"
              className="demo-workspace-project-dialog__empty"
              role="status"
            >
              No projects found
            </p>
          ) : null}
          <div className="demo-workspace-project-dialog__actions">
            <button
              aria-busy={projectCreationStatus === "selecting" || undefined}
              disabled={projectCreationStatus === "selecting"}
              onClick={() => void createProject("workspace")}
              type="button"
            >
              <CurrentBuildIcon name="composer-new-project" />
              {projectCreationStatus === "selecting"
                ? "Choosing project…"
                : "New project"}
            </button>
            <button
              onClick={() => {
                openWorkspace(null);
                setActiveFrame("workspace-no-project");
                window.setTimeout(() =>
                  document
                    .getElementById("demo-workspace-project-trigger")
                    ?.focus(),
                );
              }}
              type="button"
            >
              <CurrentBuildIcon name="composer-clear-project" />
              Don&apos;t work in a project
            </button>
          </div>
          {projectCreationStatus === "error" &&
          projectCreationSource === "workspace" ? (
            <p className="demo-workspace-project-dialog__error" role="alert">
              Couldn&apos;t add that project
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
  const workspaceComposer = (
    <AgentComposer
      actions={
        <span className="demo-composer-controls">
          <button aria-label="Add files and more" type="button">
            <CurrentBuildIcon name="composer-add-files" />
          </button>
          <button aria-label="Change permissions" type="button">
            <CurrentBuildIcon name="composer-permission" />
            Full access
          </button>
        </span>
      }
      controls={
        <span className="demo-composer-actions">
          <span className="demo-workspace-model">
            <span>5.6 Sol</span>
            <span>Extra High</span>
            <CurrentBuildIcon name="composer-model-chevron" />
          </span>
          <button aria-label="Dictate" type="button">
            <CurrentBuildIcon name="composer-dictate" />
          </button>
          {!composerValue.trim() ? (
            <button
              aria-label="Start new voice chat"
              className="demo-workspace-voice"
              type="button"
            >
              <CurrentBuildIcon name="composer-voice" />
            </button>
          ) : null}
        </span>
      }
      layout="multiline"
      onSubmit={(prompt) => {
        if (projectIndexChat) {
          const nextPrompt = prompt.trim();
          if (!nextPrompt) return;
          setProjectIndexChatTurns((turns) => [
            ...turns,
            {
              id: projectIndexChatTurnCounterRef.current++,
              prompt: nextPrompt,
              response: "The selected project chat has been updated.",
            },
          ]);
          setComposerValue("");
          setActiveFrame("projects-index-chat");
          return;
        }
        if (workspacePersistenceFrame) {
          const nextPrompt = prompt.trim();
          if (!nextPrompt) return;
          setWorkspaceModelOnlyTurns((turns) => [
            ...turns,
            {
              id: workspaceModelOnlyTurnCounterRef.current++,
              prompt: nextPrompt,
              response: workspaceDirectoryMissing
                ? "MODEL-ONLY WORKTREE TURN COMPLETE."
                : "MODEL-ONLY TURN COMPLETE.",
            },
          ]);
          setComposerValue("");
          setActiveFrame(
            workspaceDirectoryMissing
              ? "workspace-directory-missing"
              : "workspace-persisted-thread",
          );
          return;
        }
        selectScenario("workspace-workflow", "approval-pending", {
          cwd: currentWorkspaceCwd,
          prompt,
          projectLabel: workspaceProject?.label ?? "Workspace",
        });
      }}
      onValueChange={setComposerValue}
      placeholder="Do anything"
      textareaLabel="Do anything"
      value={composerValue}
    />
  );
  const workspaceNewConversationRoute = (
    <div className="demo-workspace-route">
      <NewConversationStart
        className="demo-workspace-start"
        composer={workspaceComposer}
        context={workspaceContext}
        destination={
          workspaceProject ? (
            <>
              What should we build in{" "}
              <button
                aria-controls="demo-workspace-project-dialog"
                aria-expanded={
                  workspaceOverlay === "project" &&
                  workspaceProjectTriggerId ===
                    "demo-workspace-destination-trigger"
                }
                aria-haspopup="dialog"
                className="demo-workspace-destination"
                id="demo-workspace-destination-trigger"
                onClick={() => {
                  setWorkspaceProjectTriggerId(
                    "demo-workspace-destination-trigger",
                  );
                  setWorkspaceOverlayState("project");
                }}
                type="button"
              >
                {workspaceProject.label}?
              </button>
            </>
          ) : (
            "What should we build?"
          )
        }
        eyebrow={
          <span aria-hidden="true" className="demo-workspace-mark">
            ⌁
          </span>
        }
        label="New coding workspace"
        prompt={
          workspaceProject ? (
            <div className="demo-workspace-prompts">
              <button
                onClick={() =>
                  setComposerValue(
                    "Review the latest workspace changes and prepare delivery.",
                  )
                }
                type="button"
              >
                <SidebarGlyph name="thread" />
                <span>Review the latest workspace changes</span>
                <span aria-hidden="true">→</span>
              </button>
              <button
                onClick={() =>
                  setComposerValue(
                    "Plan the next component parity slice and its verification.",
                  )
                }
                type="button"
              >
                <SidebarGlyph name="thread" />
                <span>Plan the next component parity slice</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : undefined
        }
      />
      <LocalEnvironmentDialog
        createAction={
          <Button
            onClick={() => {
              setWorkspaceEnvironmentId("worktree");
              closeWorkspaceLocalEnvironment();
            }}
            size="small"
            tone="primary"
          >
            Create worktree
          </Button>
        }
        groups={workspaceLocalEnvironmentGroups}
        id="demo-workspace-local-environment-dialog"
        onOpenChange={(open) => {
          if (open) {
            setWorkspaceLocalEnvironmentOpen(true);
            return;
          }
          closeWorkspaceLocalEnvironment();
        }}
        onQueryChange={setWorkspaceEnvironmentQuery}
        onSelect={(groupId, itemId) => {
          updateWorkspaceProjectId(groupId);
          setWorkspaceEnvironmentId("local");
          updateWorkspaceWorktreeId(
            itemId,
            !workspaceUsesHostBranches ||
              !hostSelectionUsesInPlaceBranch(itemId),
          );
          closeWorkspaceLocalEnvironment();
        }}
        open={workspaceLocalEnvironmentOpen}
        query={workspaceEnvironmentQuery}
        returnFocusRef={
          workspaceEnvironmentLauncher === "worktree"
            ? workspaceWorktreeTriggerRef
            : workspaceEnvironmentTriggerRef
        }
        title="Select local environment"
      />
      <BranchCreationDialog
        branchName={workspaceBranchName}
        error={workspaceBranchError}
        onBranchNameChange={(branchName) => {
          setWorkspaceBranchName(branchName);
          if (workspaceBranchError) {
            setWorkspaceBranchError(undefined);
            setWorkspaceBranchStatus("idle");
          }
        }}
        onCreate={(branchName) => {
          void createWorkspaceBranch(branchName);
        }}
        onOpenChange={(open) => {
          if (open) {
            setWorkspaceBranchDialogOpen(true);
            return;
          }
          closeWorkspaceBranchCreation();
        }}
        onSetPrefix={() => {
          setWorkspaceBranchDialogOpen(false);
          setWorkspaceBranchName("");
          setWorkspaceBranchError(undefined);
          setWorkspaceBranchStatus("idle");
          setSettingsQuery("");
          setSelectedSettingsId("git");
          setSettingsRouteFocusPending(true);
          setWorkspacePage("git-settings");
          setActiveFrame("workspace-git-settings");
        }}
        open={workspaceBranchDialogOpen}
        returnFocusRef={workspaceWorktreeTriggerRef}
        status={workspaceBranchStatus}
      />
    </div>
  );
  const workspaceThreadMissing = workspaceDirectoryMissing;
  const workspaceThreadSummary = (
    <ThreadSummaryPopover
      className="demo-workspace-thread-summary-popover"
      label="Workspace summary"
      onOpenChange={setThreadSummaryOpen}
      open={threadSummaryOpen}
      triggerLabel="Toggle workspace summary"
    >
      <ThreadSummaryPanel
        className="demo-workspace-thread-summary"
        label="Workspace summary"
      >
        <ThreadSummarySection
          actions={
            <ThreadSummaryIconButton icon="+" label="Add environment item" />
          }
          collapsible
          title="Environment"
          toggleLabel="Toggle environment summary"
        >
          <ThreadSummaryItem
            disabled
            label="Changes"
            leading={<SummaryGlyph name="changes" />}
          />
          <ThreadSummaryItem
            label="Worktree"
            leading={<SummaryGlyph name="computer" />}
            trailing="⌄"
          />
          <ThreadSummaryItem
            label="main"
            leading={<SummaryGlyph name="branch" />}
            trailing="⌄"
          />
          <ThreadSummaryItem
            disabled
            label="Commit or push"
            leading={<SummaryGlyph name="commit" />}
          />
          <ThreadSummaryItem
            disabled
            label={
              workspaceThreadMissing
                ? "Pull request status unavailable"
                : "No pull request"
            }
            leading={<SummaryGlyph name="github" />}
          />
        </ThreadSummarySection>
        <ThreadSummarySection
          actions={
            <ThreadSummaryIconButton icon="+" label="Create a file or site" />
          }
          collapsible
          title="Outputs"
          toggleLabel="Toggle outputs summary"
        >
          <ThreadSummaryItem disabled label="Create a file or site" />
        </ThreadSummarySection>
      </ThreadSummaryPanel>
    </ThreadSummaryPopover>
  );
  const workspacePersistedThread = (
    <div className="demo-workspace-route demo-workspace-persisted-route">
      <ConversationThreadShell
        className="demo-workspace-persisted-thread"
        composer={
          <div className="demo-workspace-persisted-composer">
            {workspaceThreadMissing ? (
              <WorkingDirectoryNotice aria-label="Workspace status" />
            ) : null}
            {workspaceComposer}
          </div>
        }
        header={
          <ThreadHeader
            endActions={workspaceThreadSummary}
            startActions={
              <button aria-label="Thread actions" type="button">
                <SidebarGlyph name="more-current" />
              </button>
            }
            title={
              <span className="demo-workspace-persisted-title">
                <SidebarGlyph name="folder-current" />
                Verify worktree persistence
              </span>
            }
          />
        }
        label="Persisted worktree conversation"
        threadWidth="wide"
      >
        <AgentTurn aria-label="Persisted worktree transcript">
          <AgentMessage role="user">
            Create no files and reply exactly WORKTREE PERSISTENCE PROBE READY.
          </AgentMessage>
          <AgentMessage
            actions={
              <McpResponseActions
                includeFork={false}
                label="Persisted response actions"
              />
            }
            metadata={<time dateTime="17:34">5:34 PM</time>}
            role="assistant"
          >
            <AgentMarkdown>WORKTREE PERSISTENCE PROBE READY.</AgentMarkdown>
          </AgentMessage>
          {workspaceThreadMissing ? (
            <>
              <AgentMessage role="user">
                Reply exactly MISSING WORKTREE PROBE.
              </AgentMessage>
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Missing worktree response actions"
                  />
                }
                role="assistant"
              >
                <AgentMarkdown>MISSING WORKTREE PROBE.</AgentMarkdown>
              </AgentMessage>
            </>
          ) : null}
          {workspaceModelOnlyTurns.map((turn) => (
            <Fragment key={turn.id}>
              <AgentMessage role="user">{turn.prompt}</AgentMessage>
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Model-only response actions"
                  />
                }
                role="assistant"
              >
                <AgentMarkdown>{turn.response}</AgentMarkdown>
              </AgentMessage>
            </Fragment>
          ))}
        </AgentTurn>
      </ConversationThreadShell>
    </div>
  );
  const projectIndexChatRoute = projectIndexChat ? (
    <div
      className="demo-workspace-route demo-project-index-chat-route"
      data-chat-id={projectIndexChat.chatId}
      data-project-id={projectIndexChat.projectId}
    >
      <ConversationThreadShell
        className="demo-project-index-chat-thread"
        composer={workspaceComposer}
        header={
          <ThreadHeader
            startActions={
              <button aria-label="Thread actions" type="button">
                <SidebarGlyph name="more-current" />
              </button>
            }
            title={projectIndexChat.chatLabel}
          />
        }
        label={`Project chat ${projectIndexChat.chatLabel}`}
        threadWidth="wide"
      >
        <AgentTurn aria-label="Project chat transcript">
          <AgentMessage role="user">
            Continue this project conversation from the saved context.
          </AgentMessage>
          <AgentMessage role="assistant">
            The selected project chat is ready to continue.
          </AgentMessage>
        </AgentTurn>
        {projectIndexChatTurns.map((turn) => (
          <AgentTurn aria-label="Continued project chat turn" key={turn.id}>
            <AgentMessage role="user">{turn.prompt}</AgentMessage>
            <AgentMessage role="assistant">{turn.response}</AgentMessage>
          </AgentTurn>
        ))}
      </ConversationThreadShell>
    </div>
  ) : null;
  const workspaceEnvironmentSettingsRoute = (
    <div className="demo-workspace-environment-settings-route">
      <EnvironmentSettingsPage status="unavailable" />
    </div>
  );
  const settingsNavigation = [
    {
      id: "personal",
      label: "Personal",
      items: [
        ["general", "General"],
        ["import", "Import"],
        ["profile", "Profile"],
        ["appearance", "Appearance", "GitHub"],
        ["voice", "Voice"],
        ["configuration", "Configuration", "Choose how ChatGPT summarizes its reasoning"],
        ["personalization", "Personalization", "Personalization"],
        ["pets", "Pets"],
        ["keyboard-shortcuts", "Keyboard shortcuts", "Go to a line in the current file"],
        ["usage-billing", "Usage & billing", "GitHub"],
        ["account", "Account"],
      ],
    },
    {
      id: "integrations",
      label: "Integrations",
      items: [
        ["appshots", "Appshots"],
        ["plugins", "Plugins"],
        [
          "browser",
          "Browser",
          "Allow ChatGPT to use full Chrome DevTools Protocol (CDP) access in connected Browser Use sessions.",
        ],
        ["computer-use", "Computer use", "Computer use"],
      ],
    },
    {
      id: "coding",
      label: "Coding",
      items: [
        ["hooks", "Hooks", "Right before ChatGPT ends its turn"],
        [
          "connections",
          "Connections",
          "Allow ChatGPT apps signed into your account to use this device",
        ],
        ["git", "Git", "Git"],
        ["environments", "Environments"],
        [
          "worktrees",
          "Worktrees",
          "Automatic deletion is disabled. ChatGPT will not prune old worktrees automatically.",
        ],
      ],
    },
    {
      id: "archived",
      label: "Archived",
      items: [["archived-chats", "Archived chats"]],
    },
  ].map((section) => ({
    ...section,
    items: section.items.map(([id, label, resultLabel]) => ({
      icon: (
        <span className="demo-settings-navigation-icon-stack">
          <CurrentBuildIcon
            name={`settings-${id}` as CurrentBuildIconName}
          />
          {id === "account" ? (
            <CurrentBuildIcon name="settings-account-external" />
          ) : null}
        </span>
      ),
      id,
      keywords:
        id === "appearance" || id === "usage-billing"
          ? ["git", "github"]
          : id === "hooks" || id === "keyboard-shortcuts"
            ? ["git"]
            : id === "browser" || id === "computer-use" || id === "connections" || id === "worktrees"
              ? ["git"]
              : undefined,
      label,
      resultLabel,
    })),
  }));
  const workspaceSettingsRoute = (
    <SettingsShell
      backIcon={<CurrentBuildIcon name="settings-back" />}
      backButtonRef={settingsBackButtonRef}
      onBack={() => {
        setSettingsQuery("");
        setWorkspacePage("conversation");
        setActiveFrame(
          workspaceEnvironmentId === "worktree"
            ? "workspace-new-worktree"
            : "workspace-ready",
        );
      }}
      onQueryChange={setSettingsQuery}
      onSelect={(itemId) => {
        if (
          itemId !== "appearance" &&
          itemId !== "general" &&
          itemId !== "git" &&
          itemId !== "hooks"
        ) {
          return;
        }
        setSelectedSettingsId(itemId);
        setWorkspacePage(
          itemId === "appearance"
            ? "appearance-settings"
            : itemId === "general"
              ? "general-settings"
              : itemId === "hooks"
                ? "hooks-settings"
              : "git-settings",
        );
        setActiveFrame(
          itemId === "appearance"
            ? "workspace-appearance-settings"
            : itemId === "general"
              ? "workspace-general-settings"
              : itemId === "hooks"
                ? "workspace-hooks-settings"
              : "workspace-git-settings",
        );
      }}
      query={settingsQuery}
      searchIcon={<CurrentBuildIcon name="settings-search" />}
      sections={settingsNavigation}
      selectedId={selectedSettingsId}
    >
      {workspacePage === "hooks-settings" ? (
        <>
          <HooksSettingsPage
            data-evidence="runtime-observed"
            entries={hookSettingsEntries}
            learnMoreHref="https://developers.openai.com/codex/hooks"
            onOpenConfig={(entry) =>
              setHooksSettingsAction(
                `Open config requested for ${entry.title ?? entry.event}`,
              )
            }
            onReload={() => {
              setHooksSettingsAction("");
              setHooksRefreshing(true);
              window.setTimeout(() => {
                setHookSettingsStatus("ready");
                setHooksRefreshing(false);
                setHooksSettingsAction("Refreshed hooks");
              }, 180);
            }}
            onToggleHookEnabled={(entry, enabled) =>
              setHookSettingsEntries((entries) =>
                entries.map((candidate) =>
                  candidate.id === entry.id
                    ? { ...candidate, enabled }
                    : candidate,
                ),
              )
            }
            onTrustHook={(entry) =>
              setHookSettingsEntries((entries) =>
                entries.map((candidate) =>
                  candidate.id === entry.id
                    ? {
                        ...candidate,
                        changedSinceTrusted: false,
                        trusted: true,
                      }
                    : candidate,
                ),
              )
            }
            refreshing={hooksRefreshing}
            reloadIcon={<CurrentBuildIcon name="settings-hooks-reload" />}
            status={hookSettingsStatus}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {hooksSettingsAction}
          </span>
        </>
      ) : workspacePage === "code-review-settings" ? (
        <CodeReviewSettingsPage
          data-evidence="package-observed"
          onChange={setCodeReviewSettings}
          onRetry={() => undefined}
          showCreditPreference
          value={codeReviewSettings}
        />
      ) : workspacePage === "appearance-settings" ? (
        <>
          <AppearanceSettingsPage
            chatGptDockIcon={<CurrentBuildIcon name="settings-account" />}
            codexDockIcon={
              <span className="demo-codex-dock-icon" aria-hidden="true">
                C
              </span>
            }
            onChange={setAppearanceSettings}
            onCopyTheme={(theme) =>
              setAppearanceThemeAction(`${theme} theme copied`)
            }
            onImportTheme={(theme) =>
              setAppearanceThemeAction(`${theme} theme import requested`)
            }
            value={appearanceSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {appearanceThemeAction}
          </span>
        </>
      ) : workspacePage === "general-settings" ? (
        <>
          <GeneralSettingsPage
            elevatedRiskHref="https://help.openai.com/"
            fileDestinationOptions={[
              { icon: <DemoVsCodeIcon />, label: "VS Code", value: "vscode" },
              { label: "Cursor", value: "cursor" },
              { label: "Sublime Text", value: "sublime-text" },
              { label: "Default app", value: "default-app" },
              { label: "Finder", value: "finder" },
              { label: "Terminal", value: "terminal" },
              { label: "Xcode", value: "xcode" },
            ]}
            hotkeyCaptureActive={generalHotkeyCaptureActive}
            onCancelHotkeyCapture={() => setGeneralHotkeyCaptureActive(false)}
            onChange={setGeneralSettings}
            onOpenSourceLicenses={() =>
              setGeneralSettingsAction("Open source licenses requested")
            }
            onStartHotkeyCapture={() => setGeneralHotkeyCaptureActive(true)}
            value={generalSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {generalSettingsAction}
          </span>
        </>
      ) : (
        <GitSettingsPage
          commitInstructionsDirty={
            gitSettings.commitInstructions !== savedCommitInstructions
          }
          onChange={setGitSettings}
          onSaveCommitInstructions={() =>
            setSavedCommitInstructions(gitSettings.commitInstructions)
          }
          onSavePullRequestInstructions={() =>
            setSavedPullRequestInstructions(gitSettings.pullRequestInstructions)
          }
          pullRequestInstructionsDirty={
            gitSettings.pullRequestInstructions !== savedPullRequestInstructions
          }
          value={gitSettings}
        />
      )}
    </SettingsShell>
  );
  const workspaceRoute =
    workspacePage === "environments"
      ? workspaceEnvironmentSettingsRoute
      : workspacePage === "git-settings" ||
          workspacePage === "hooks-settings" ||
          workspacePage === "code-review-settings" ||
          workspacePage === "appearance-settings" ||
          workspacePage === "general-settings"
        ? workspaceSettingsRoute
      : projectIndexChatRoute
        ? projectIndexChatRoute
        : workspacePersistenceFrame
          ? workspacePersistedThread
          : workspaceNewConversationRoute;
  const workspaceShowsSettings =
    workspacePage === "appearance-settings" ||
    workspacePage === "code-review-settings" ||
    workspacePage === "general-settings" ||
    workspacePage === "git-settings" ||
    workspacePage === "hooks-settings";

  const projectIndexStatus =
    activeFrame === "projects-index-loading"
      ? ("loading" as const)
      : activeFrame === "projects-index-error"
        ? ("error" as const)
        : activeFrame === "projects-index-partial-error"
          ? ("partial-error" as const)
          : ("ready" as const);
  const projectIndexSourceItems = [
    ...createdProjects.map((project, index) => ({
      id: project.id,
      kindLabel: "Local",
      label: project.label,
      path: project.path,
      recentChats: [],
      status: "available" as const,
      updated: "Now",
      updatedOrder: workspaceProjects.length + createdProjects.length - index,
    })),
    ...currentProjectIndexItems,
  ];
  const filteredProjectIndexItems = projectIndexSourceItems
    .filter(({ label, path }) => {
      const query = projectIndexQuery.trim().toLocaleLowerCase();
      return (
        query.length === 0 ||
        label.toLocaleLowerCase().includes(query) ||
        path.toLocaleLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const direction = projectIndexSortDirection === "ascending" ? 1 : -1;
      return projectIndexSortBy === "name"
        ? left.label.localeCompare(right.label) * direction
        : (left.updatedOrder - right.updatedOrder) * direction;
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      updated: item.updated,
      actions: (
        <>
          <button
            aria-label={`Project actions for ${item.label}`}
            type="button"
          >
            <SidebarGlyph name="more-current" />
          </button>
          <button aria-label={`Pin ${item.label}`} type="button">
            <SidebarGlyph name="pin-current" />
          </button>
          <button
            aria-label={`Start new chat in ${item.label}`}
            onClick={() => openWorkspace(item.id)}
            type="button"
          >
            <SidebarGlyph name="new" />
          </button>
        </>
      ),
      expanded: expandedProjectIndexIds.has(item.id),
      expandIcon: <SidebarGlyph name="chevron-current" />,
      icon: <SidebarGlyph name="folder-current" />,
      recentChats: item.recentChats.map((chat) => ({
        ...chat,
        actions: (
          <button aria-label={`Chat actions for ${chat.label}`} type="button">
            <SidebarGlyph name="more-current" />
          </button>
        ),
      })),
    }));
  const projectIndexItems =
    projectIndexStatus === "loading" || projectIndexStatus === "error"
      ? []
      : filteredProjectIndexItems;
  const projectIndexDisplayStatus =
    projectCreationStatus === "error" &&
    projectCreationSource === "projects" &&
    projectIndexStatus === "ready"
      ? ("error" as const)
      : projectIndexStatus;
  const projectsRoute = (
    <div className="demo-projects-route">
      <ProjectIndex
        emptyState="No projects"
        items={projectIndexItems}
        label="Projects"
        layout="table"
        onExpandedChange={(projectId, expanded) =>
          setExpandedProjectIndexIds((current) => {
            const next = new Set(current);
            if (expanded) next.add(projectId);
            else next.delete(projectId);
            return next;
          })
        }
        onOpenRecentChat={openProjectIndexChat}
        onSelect={openWorkspace}
        onSortChange={(nextSort) => {
          if (projectIndexSortBy === nextSort) {
            setProjectIndexSortDirection((current) =>
              current === "ascending" ? "descending" : "ascending",
            );
            return;
          }
          setProjectIndexSortBy(nextSort);
          setProjectIndexSortDirection(
            nextSort === "name" ? "ascending" : "descending",
          );
        }}
        sortBy={projectIndexSortBy}
        sortDirection={projectIndexSortDirection}
        sortIcon={<SidebarGlyph name="chevron-current" />}
        status={projectIndexDisplayStatus}
        statusMessage={
          projectCreationStatus === "error" &&
          projectCreationSource === "projects"
            ? "Couldn’t add that project. Try again."
            : projectIndexStatus === "error"
              ? "Couldn’t load projects"
              : projectIndexStatus === "partial-error"
                ? "Some projects may be missing"
                : undefined
        }
        toolbar={
          <div className="demo-projects-search">
            <div className="demo-projects-search__inner">
              <SidebarGlyph name="search" />
              <input
                aria-label="Search projects"
                onChange={(event) =>
                  setProjectIndexQuery(event.currentTarget.value)
                }
                placeholder="Search projects"
                type="search"
                value={projectIndexQuery}
              />
            </div>
          </div>
        }
      />
    </div>
  );

  const reviewableFileChanges = useMemo(
    () =>
      state.fileChanges.filter(
        (fileChange) => !undoneFileIds.has(fileChange.id),
      ),
    [state.fileChanges, undoneFileIds],
  );
  const resolvedReview = resolveReviewSelection(
    reviewableFileChanges,
    reviewSelection,
  );
  const reviewFileChange = resolvedReview?.fileChange;
  const reviewFiles = useMemo(
    () =>
      reviewFileChange?.changes.map((change) => {
        const stats = changeStats(change);
        const content = reviewContent(change);
        return {
          ...change,
          additions: stats.additions,
          change: change.kind,
          content:
            content.kind === "diff"
              ? {
                  kind: "diff" as const,
                  lines:
                    change.kind === "added" ||
                    scenarioId === "current-review-rename" ||
                    scenarioId === "current-review-files"
                      ? content.lines.filter(({ kind }) => kind !== "hunk")
                      : content.lines,
                }
              : content,
          deletions: stats.deletions,
        };
      }) ?? [],
    [reviewFileChange, scenarioId],
  );
  const reviewTotals = reviewFiles.reduce(
    (totals, file) => ({
      additions: totals.additions + file.additions,
      deletions: totals.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 },
  );
  const reviewPanel = reviewFileChange ? (
    isCurrentReviewFilesReplay ? (
      <WorkspacePanel
        actions={
          <>
            <button
              aria-label="Open side panel tab"
              className="demo-current-review-header-action"
              type="button"
            >
              <CurrentBuildIcon name="review-open-tab" />
            </button>
            <span className="demo-current-review-header-spacer" />
            <button
              aria-label="Expand panel"
              className="demo-current-review-header-action"
              type="button"
            >
              <CurrentBuildIcon name="review-expand" />
            </button>
          </>
        }
        activeTabId="review"
        className="demo-current-review-workspace-panel"
        closeIcon={<CurrentBuildIcon name="review-close" />}
        label="Review"
        onActiveTabChange={() => undefined}
        onCloseTab={() => setReviewOpen(false)}
        placement="side"
        tabCloseButtons
        tabs={[
          {
            content: (
              <FileReviewWorkspace
                data-testid="current-review-workspace"
                files={reviewFiles}
                icons={{
                  collapseAll: <CurrentBuildIcon name="review-collapse-all" />,
                  commit: <CurrentBuildIcon name="review-commit-or-push" />,
                  copyPath: <CurrentBuildIcon name="review-copy-path" />,
                  file: <CurrentBuildIcon name="review-file-text" />,
                  fileToggle: <CurrentBuildIcon name="review-file-toggle" />,
                  filesToggle: <CurrentBuildIcon name="review-files-toggle" />,
                  jumpToFile: <CurrentBuildIcon name="review-jump-file" />,
                  moreGit: <CurrentBuildIcon name="review-more-git" />,
                  openIn: <CurrentBuildIcon name="review-open-in" />,
                  options: <CurrentBuildIcon name="review-options" />,
                  scopeChevron: <CurrentBuildIcon name="review-scope-chevron" />,
                  search: <CurrentBuildIcon name="review-search" />,
                  splitDiff: <CurrentBuildIcon name="review-split-diff" />,
                }}
                onOpenFile={(file) => {
                  setReviewSelectionKey((current) => current + 1);
                  setReviewSelection({
                    fileChangeId: reviewFileChange.id,
                    path: file.path,
                  });
                }}
                rootLabel="current-review-26-810-probe"
                selectionKey={reviewSelectionKey}
                selectedPath={resolvedReview?.selectedPath}
              />
            ),
            id: "review",
            label: (
              <span className="demo-current-review-tab-label">
                <CurrentBuildIcon name="review-tab" />
                Review
              </span>
            ),
          },
        ]}
      />
    ) : (
      <WorkspacePanel
        activeTabId="review"
        label="Review"
        onActiveTabChange={() => undefined}
        onClose={() => setReviewOpen(false)}
        onCloseTab={() => setReviewOpen(false)}
        placement="side"
        tabs={[
          {
            content: (
              <div className="demo-review-panel" data-testid="review-panel">
                <div className="demo-review-panel__toolbar">
                  <div>
                    <strong>
                      {scenarioId === "current-review-rename"
                        ? "Last Turn"
                        : "Last turn"}
                    </strong>
                    {scenarioId === "current-review-rename" ? (
                      <span aria-hidden="true">⌄</span>
                    ) : (
                      <span>
                        {reviewFiles.length}{" "}
                        {reviewFiles.length === 1 ? "file" : "files"}
                      </span>
                    )}
                  </div>
                  <span className="demo-review-panel__stats">
                    <span data-stat="additions">
                      +{reviewTotals.additions}
                    </span>{" "}
                    <span data-stat="deletions">
                      {scenarioId === "current-review-rename" ? "-" : "−"}
                      {reviewTotals.deletions}
                    </span>
                  </span>
                </div>
                <FileReview
                  aria-label="Last turn file review"
                  files={reviewFiles}
                  onSelectFile={(file) => {
                    setReviewSelectionKey((current) => current + 1);
                    setReviewSelection({
                      fileChangeId: reviewFileChange.id,
                      path: file.path,
                    });
                  }}
                  selectionKey={reviewSelectionKey}
                  selectedPath={resolvedReview?.selectedPath}
                />
              </div>
            ),
            id: "review",
            label: "Review",
          },
        ]}
      />
    )
  ) : null;
  const subagentPanel = hasSubagentSurface ? (
    <WorkspacePanel
      activeTabId="subagents"
      actions={
        <>
          <button
            aria-label="Open side panel tab"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            +
          </button>
          <span className="demo-subagent-panel-header-spacer" />
          <button
            aria-label="Expand side panel"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            ⌜
          </button>
          <button
            aria-label="Toggle bottom panel"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            ▱
          </button>
          <button
            aria-label="Toggle side panel"
            className="demo-subagent-panel-header-action"
            onClick={() => setSubagentPanelOpen(false)}
            type="button"
          >
            ▯
          </button>
        </>
      }
      className="demo-subagent-workspace-panel"
      label="Subagents"
      onActiveTabChange={() => undefined}
      onCloseTab={() => setSubagentPanelOpen(false)}
      placement="side"
      tabCloseButtons
      tabs={[
        {
          closeLabel: "Close Subagents tab",
          content: selectedSubagent ? (
            <div
              className="demo-subagent-transcript"
              data-testid="subagent-transcript"
            >
              <SubagentTranscriptHeader
                item={selectedSubagent}
                onBack={() => setSelectedSubagentId(null)}
              />
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Subagent response actions"
                  />
                }
                role="assistant"
              >
                {selectedSubagent.lastMessage ?? "Working"}
              </AgentMessage>
            </div>
          ) : (
            <SubagentPanel
              activeTitle={`Active · ${activeSubagentCount}`}
              data-testid="subagent-panel"
              items={subagentItems}
              onSelect={(item) => setSelectedSubagentId(item.id)}
            />
          ),
          id: "subagents",
          label: (
            <span className="demo-subagent-panel-tab-label">
              <SubagentAvatar seed="long-probe" size="tiny" />
              <span>Subagents</span>
            </span>
          ),
        },
      ]}
      tabsLabel="Subagent tabs"
    />
  ) : null;
  const pullRequestChecks = [
    {
      id: "electron",
      name: "Codex app Electron acceptance",
      status:
        pullRequestState.checkStatus === "passed"
          ? ("passed" as const)
          : pullRequestState.checkStatus === "failed"
            ? ("failed" as const)
            : ("running" as const),
    },
    {
      id: "check",
      name: "check",
      status:
        pullRequestState.checkStatus === "failed"
          ? ("failed" as const)
          : pullRequestState.checkStatus === "running"
            ? ("running" as const)
            : ("passed" as const),
    },
    { id: "codeql", name: "CodeQL", status: "passed" as const },
    {
      id: "react-nodenext",
      name: "React 19 / NodeNext consumer",
      status: "passed" as const,
    },
  ];
  const pullRequestMergeAction =
    pullRequestState.checkStatus === "failed" ? (
      <button
        onClick={() =>
          schedulePullRequestTransition(
            { type: "checks/run" },
            { type: "checks/pass" },
          )
        }
        type="button"
      >
        Re-run checks
      </button>
    ) : pullRequestState.reviewRequirement !== "passed" &&
      pullRequestState.mergeStatus !== "checking" ? (
      <button
        onClick={() => {
          setPullRequestTab("code");
          setPullRequestReviewOpen(true);
        }}
        type="button"
      >
        Open review
      </button>
    ) : undefined;
  const showPullRequestLifecycleDetails =
    activeFrame === "pr-checks-running" ||
    activeFrame === "pr-checks-failed" ||
    activeFrame === "pr-merge-blocked" ||
    activeFrame === "pr-merge-ready" ||
    activeFrame === "pr-merged";
  const pullRequestTimeline = (
    <div aria-label="Pull request timeline" className="demo-pr-panel__timeline">
      <article>
        <span aria-hidden="true" className="demo-pr-avatar">
          J
        </span>
        <div>
          <strong>JaminZhou opened this pull request</strong>
          <time dateTime="PT2H">2h</time>
        </div>
      </article>
      <article>
        <span aria-hidden="true" className="demo-pr-avatar">
          C
        </span>
        <div>
          <strong>chatgpt-codex-connector reviewed the latest push</strong>
          <time dateTime="PT1H">1h</time>
        </div>
      </article>
    </div>
  );
  const pullRequestSummaryReady = (
    <PullRequestPanelSummary
      checks={
        showPullRequestLifecycleDetails ? (
          <div className="demo-pr-checks">
            <PullRequestCheckList checks={pullRequestChecks} />
            <PullRequestMergeReadiness
              action={pullRequestMergeAction}
              description={
                pullRequestState.mergeStatus === "blocked"
                  ? "All current-head gates must pass before merging."
                  : pullRequestState.mergeStatus === "ready"
                    ? "Current-head checks, review, and threads are clean."
                    : undefined
              }
              requirements={[
                {
                  description:
                    pullRequestState.checkStatus === "passed"
                      ? "7 checks successful"
                      : pullRequestState.checkStatus === "running"
                        ? "Current-head checks are running"
                        : "A current-head check failed",
                  id: "checks",
                  label: "Checks",
                  status:
                    pullRequestState.checkStatus === "passed"
                      ? "passed"
                      : pullRequestState.checkStatus === "failed"
                        ? "failed"
                        : "pending",
                },
                {
                  description:
                    pullRequestState.reviewRequirement === "passed"
                      ? "Fresh review after the latest push"
                      : pullRequestState.reviewRequirement === "failed"
                        ? "Review submission failed"
                        : "Waiting for a fresh current-head review",
                  id: "review",
                  label: "Review",
                  status: pullRequestState.reviewRequirement,
                },
                {
                  description: "No unresolved bot threads",
                  id: "threads",
                  label: "Review threads",
                  status: "passed",
                },
              ]}
              status={pullRequestState.mergeStatus}
            />
          </div>
        ) : undefined
      }
      className="demo-pr-panel__summary"
      commentComposer={
        <PullRequestCommentComposer
          error={pullRequestState.commentError}
          onSubmit={() =>
            schedulePullRequestTransition(
              { type: "comment/submit" },
              { type: "comment/succeed" },
            )
          }
          onValueChange={(body) =>
            dispatchPullRequest({ body, type: "comment/change" })
          }
          status={pullRequestState.commentStatus}
          value={pullRequestState.commentBody}
        />
      }
      description={
        <div className="demo-pr-description">
          <h3>Summary</h3>
          <ul>
            <li>
              add controlled multi-session TerminalPanel tabs, per-tab close,
              restore hooks, and TerminalProcessList
            </li>
            <li>
              add a 15-event terminal lifecycle replay with running, failed,
              exited, picker, close/restore, and compact states
            </li>
            <li>
              gate 49 lifecycle scenes through CDP, real Electron interactions,
              and reviewed pixels
            </li>
            <li>
              refresh current-build terminal evidence and split session UI from
              process lifecycle <span className="demo-pr-final-word">claims</span>
            </li>
          </ul>
          <h3>Verification</h3>
          <ul>
            <li>pnpm check</li>
            <li>pnpm check:codex-app:acceptance</li>
            <li>
              pnpm --filter @codex-ui-kit/codex-app-playground typecheck
            </li>
            <li>pnpm --filter @codex-ui-kit/codex-app-playground test</li>
          </ul>
        </div>
      }
      descriptionAction={
        <button aria-label="Edit description" type="button">
          ✎
        </button>
      }
      descriptionHeading={
        <>
          Description <span aria-hidden="true">⌄</span>
        </>
      }
      facts={[
        {
          id: "branch",
          indicator: "⑂",
          label: "Branch",
          value: (
            <span className="demo-pr-branch">
              <span>feat/terminal-sessi…</span>
              <span aria-hidden="true">›</span>
              <span>m…</span>
              <span className="demo-pr-additions">+1,743</span>
              <span className="demo-pr-deletions">−231</span>
            </span>
          ),
        },
        {
          id: "reviewers",
          indicator: "◎",
          label: "Reviewers",
          value: (
            <span className="demo-pr-reviewers">
              <span aria-hidden="true" className="demo-pr-reviewer-status" />
              <button aria-label="Request reviewers" type="button">
                +
              </button>
            </span>
          ),
        },
        {
          id: "comments",
          indicator: "◌",
          label: "Comments",
          value: "17 comments",
        },
        {
          id: "checks",
          indicator: "○",
          label: "Checks",
          tone:
            pullRequestState.checkStatus === "passed"
              ? "success"
              : pullRequestState.checkStatus === "failed"
                ? "danger"
                : undefined,
          value:
            pullRequestState.checkStatus === "passed"
              ? "Successful"
              : pullRequestState.checkStatus === "failed"
                ? "Failed"
                : "In progress",
        },
        {
          id: "status",
          indicator: "⑂",
          label: "Status",
          value: "Ready for review⌄",
        },
      ]}
      meta={
        <>
          <span className="demo-pr-avatar demo-pr-avatar--small">J</span>
          <span>JaminZhou</span>
          <span>·</span>
          <span>2h</span>
        </>
      }
      timeline={pullRequestTimeline}
      title="feat: add terminal session lifecycle"
      titleAction={
        <button aria-label="Edit title" type="button">
          ✎
        </button>
      }
    />
  );
  const pullRequestDetailState =
    pullRequestState.detailStatus === "ready" ? null : (
      <PullRequestQueryState
        action={
          pullRequestState.detailStatus === "error" ? (
            <button
              onClick={() =>
                schedulePullRequestTransition(
                  { type: "detail/load" },
                  { type: "detail/ready" },
                )
              }
              type="button"
            >
              Retry
            </button>
          ) : undefined
        }
        description={
          pullRequestState.detailStatus === "error"
            ? "The pull request detail could not be loaded."
            : "Fetching the latest summary and diff."
        }
        heading={
          pullRequestState.detailStatus === "error"
            ? "Pull request unavailable"
            : pullRequestState.detailStatus === "empty"
              ? "Pull request not found"
              : "Loading pull request"
        }
        status={pullRequestState.detailStatus}
      />
    );
  const pullRequestSummary =
    pullRequestDetailState ?? pullRequestSummaryReady;
  const pullRequestCode = (
    <div
      className="demo-pr-panel__code"
      data-review-open={pullRequestReviewOpen || undefined}
    >
      <div aria-label="Code review controls" className="demo-pr-code-toolbar">
        <button
          aria-expanded={pullRequestReviewMenuOpen}
          aria-haspopup="menu"
          aria-label="Review options"
          onClick={() => setPullRequestReviewMenuOpen((open) => !open)}
          type="button"
        >
          ⋯
        </button>
        <button aria-label="Collapse all diffs" type="button">
          −
        </button>
        <button aria-label="Switch to split diff" type="button">
          ◫
        </button>
        <button aria-label="Show file tree" type="button">
          ☷
        </button>
        {pullRequestReviewMenuOpen ? (
          <div
            aria-label="Review options"
            className="demo-pr-review-menu"
            role="menu"
          >
            <button role="menuitem" type="button">
              Enable word wrap
            </button>
            <button role="menuitem" type="button">
              Enable rich preview
            </button>
            <button role="menuitem" type="button">
              Enable word diffs
            </button>
            <button
              onClick={() => {
                setPullRequestReviewMenuOpen(false);
                setPullRequestReviewOpen(true);
              }}
              role="menuitem"
              type="button"
            >
              Open synthetic review
            </button>
          </div>
        ) : null}
      </div>
      {pullRequestReviewOpen ? (
        <PullRequestReviewComposer
          body={pullRequestState.reviewBody}
          error={pullRequestState.reviewError}
          kind={pullRequestState.reviewKind}
          onBodyChange={(body) =>
            dispatchPullRequest({ body, type: "review/body" })
          }
          onKindChange={(kind) =>
            dispatchPullRequest({ kind, type: "review/kind" })
          }
          onSubmit={() =>
            schedulePullRequestTransition(
              { type: "review/submit" },
              { type: "review/succeed" },
            )
          }
          status={pullRequestState.reviewStatus}
        />
      ) : null}
      <FileReview
        aria-label="Pull request code review"
        files={pullRequestFiles}
        selectedPath={pullRequestFiles[0].path}
      />
    </div>
  );
  const pullRequestPanel = (
    <WorkspacePanel
      actions={
        <>
          <button aria-label="Open in browser" type="button">
            ↗
          </button>
          <button type="button">
            Auto-merge
          </button>
          <button
            disabled={pullRequestState.mergeStatus !== "ready"}
            onClick={() =>
              schedulePullRequestTransition(
                { type: "merge/start" },
                { type: "merge/succeed" },
              )
            }
            type="button"
          >
            {pullRequestState.mergeStatus === "merged"
              ? "Merged"
              : pullRequestState.mergeStatus === "merging"
                ? "Merging…"
                : "Merge"}
          </button>
        </>
      }
      activeTabId={pullRequestTab}
      className="demo-pr-panel"
      data-testid="pull-request-panel"
      expanded={pullRequestExpanded}
      label="Pull request"
      onActiveTabChange={(id) =>
        setPullRequestTab(id as typeof pullRequestTab)
      }
      onExpandedChange={setPullRequestExpanded}
      placement="side"
      restorePanelLabel="Restore panel width"
      tabs={[
        { content: pullRequestSummary, id: "summary", label: "Summary" },
        {
          content: pullRequestDetailState ?? pullRequestCode,
          id: "code",
          label: "Code",
        },
      ]}
      tabsLabel="Pull request view"
    />
  );
  const pullRequestIndex = (
    <section aria-label="Pull requests" className="demo-pr-index">
      <button
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        className="demo-pr-sidebar-toggle"
        onClick={() => setSidebarOpen((open) => !open)}
        type="button"
      >
        <SidebarGlyph name="sidebar" />
      </button>
      <header>
        <div role="tablist" aria-label="Pull request filters">
          <button aria-selected="true" role="tab" type="button">
            All
          </button>
          <button aria-selected="false" role="tab" type="button">
            Reviewing
          </button>
          <button aria-selected="false" role="tab" type="button">
            Authored
          </button>
        </div>
      </header>
      <div className="demo-pr-index__search">
        <input
          aria-label="Search pull requests"
          defaultValue="80"
          placeholder="Search pull requests"
          type="search"
        />
        <button aria-label="Filter pull requests" type="button">
          ≡
        </button>
      </div>
      <h2>Authored</h2>
      {pullRequestState.indexStatus === "ready" ? (
        <PullRequestList
          items={[
            {
              author: "JaminZhou",
              checkStatus:
                pullRequestState.checkStatus === "passed"
                  ? "passed"
                  : pullRequestState.checkStatus === "failed"
                    ? "failed"
                    : "running",
              commentCount: 6,
              id: "80",
              indicator: (
                <span className="demo-pr-branch-indicator">
                  ⑂<i />
                </span>
              ),
              number: 80,
              repository: "codex-ui-kit",
              state: "open",
              title: "feat: add terminal session lifecycle",
              updatedAt: "now",
            },
          ]}
          onSelect={(id) => {
            dispatchPullRequest({ id, type: "select" });
            setPullRequestOpen(true);
            schedulePullRequestTransition(
              { type: "detail/load" },
              { type: "detail/ready" },
            );
          }}
          selectedId={
            pullRequestOpen
              ? (pullRequestState.selectedId ?? undefined)
              : undefined
          }
        />
      ) : (
        <PullRequestQueryState
          action={
            pullRequestState.indexStatus === "error" ||
            pullRequestState.indexStatus === "empty" ? (
              <button
                onClick={() =>
                  schedulePullRequestTransition(
                    { type: "index/load" },
                    { type: "index/ready" },
                  )
                }
                type="button"
              >
                {pullRequestState.indexStatus === "empty"
                  ? "Refresh"
                  : "Retry"}
              </button>
            ) : undefined
          }
          description={
            pullRequestState.indexStatus === "error"
              ? "Check the connection and try again."
              : pullRequestState.indexStatus === "empty"
                ? "No pull requests match the current filters."
                : undefined
          }
          status={pullRequestState.indexStatus}
          variant="list"
        />
      )}
    </section>
  );
  const shellRouteContent = (
    <div className="demo-shell-route-content">
      <header>
        <div>
          <span className="demo-shell-route-eyebrow">Workspace</span>
          <h1>Pull requests</h1>
        </div>
        <button type="button">New pull request</button>
      </header>
      <div className="demo-shell-route-toolbar">
        <input
          aria-label="Search restored pull requests"
          placeholder="Search pull requests"
          type="search"
        />
        <button type="button">All repositories</button>
      </div>
      <article>
        <span aria-hidden="true" className="demo-shell-route-status">✓</span>
        <div>
          <strong>App shell continuity</strong>
          <span>codex-ui-kit · ready for review</span>
        </div>
        <time dateTime="PT2M">2m</time>
      </article>
    </div>
  );
  const shellRoute = (
    <AppRouteOutlet
      actions={
        shellState === "offline" || shellState === "error"
          ? [
              {
                label: "Try again",
                onClick: () => {
                  setShellState("loading");
                  window.setTimeout(() => {
                    setShellState("ready");
                    setShellNotificationVisible(true);
                  }, 240);
                },
                primary: true,
              },
            ]
          : []
      }
      aria-label="Pull requests route"
      description={
        shellState === "loading"
          ? "Refreshing pull requests…"
          : undefined
      }
      heading={
        shellState === "loading" ? "Loading pull requests" : undefined
      }
      status={shellState}
    >
      {shellRouteContent}
    </AppRouteOutlet>
  );
  const messageNavigationItems = currentWindowedFrame
    ? Array.from({ length: currentWindowedHistorySize }, (_, index) => ({
        id: `current-windowed-user-${index + 1}`,
        label: `Synthetic user checkpoint ${index + 1}`,
      }))
    : state.messages
        .filter(({ role }) => role === "user")
        .map((message) => ({
          id: message.id,
          label: message.text,
        }));
  const currentWindowStart = Math.min(
    currentWindowedHistorySize - currentWindowedTurnWindowSize,
    Math.max(
      0,
      windowedSelectedMessageIndex -
        Math.floor(currentWindowedTurnWindowSize / 2),
    ),
  );
  const currentWindowEnd =
    currentWindowStart + currentWindowedTurnWindowSize;
  const timelineContent = state.timeline.map((entry, entryIndex) => {
    if (entry.kind === "streamError") {
      const streamError = state.streamErrors.find(({ id }) => id === entry.id);
      if (!streamError) return null;
      return (
        <StreamNotice
          additionalDetails={streamError.additionalDetails}
          data-item-id={streamError.id}
          icon={
            isCurrentTransportRecoveryReplay ? (
              <CurrentBuildIcon name="thread-reconnecting" />
            ) : undefined
          }
          key={`stream-error:${streamError.id}`}
          reconnectAttempt={streamError.reconnectAttempt ?? undefined}
          reconnectMaxAttempts={
            streamError.reconnectMaxAttempts ?? undefined
          }
          serverBusy={streamError.serverBusy}
        >
          {streamError.reconnectAttempt === null
            ? streamError.content
            : undefined}
        </StreamNotice>
      );
    }
    if (entry.kind === "systemError") {
      const systemError = state.systemErrors.find(({ id }) => id === entry.id);
      if (!systemError) return null;
      return (
        <SystemErrorNotice
          data-item-id={systemError.id}
          key={`system-error:${systemError.id}`}
        >
          {systemError.content}
        </SystemErrorNotice>
      );
    }
    if (entry.kind === "automaticApprovalReview") {
      const review = state.automaticApprovalReviews.find(
        ({ id }) => id === entry.id,
      );
      if (!review || review.status === "approved") return null;
      return (
        <AutomaticApprovalReview
          action={review.actionLabel}
          data-item-id={review.id}
          data-testid="automatic-approval-review"
          key={`automatic-approval-review:${review.id}`}
          rationale={review.rationale}
          riskLevel={review.riskLevel}
          status={review.status}
        />
      );
    }
    if (entry.kind === "message") {
      const message = state.messages.find(({ id }) => id === entry.id);
      if (!message) return null;
      const submittedMessageAttachments =
        isCurrentAttachmentReplay &&
        message.role === "user" &&
        message.id === "user-attachment-lifecycle" &&
        submittedComposerAttachments.length > 0
          ? submittedComposerAttachments
          : null;
      const submittedMessageText = submittedMessageAttachments
        ? (submittedComposerPrompt ?? message.text)
        : message.text;
      const groupedMcpIntro =
        ((scenarioId === "mcp-recovery-mixed-thread" &&
          (message.id === "assistant-recovery-intro" ||
            message.id === "assistant-recovery-status")) ||
          (scenarioId === "mcp-tool-call" &&
            message.id === "assistant-mcp-intro") ||
          (scenarioId === "mcp-current-integration-recovery" &&
            message.id ===
              "assistant-current-integration-recovery-intro") ||
          (isCurrentMixedToolReplay &&
            message.id === "assistant-current-mixed-mcp-intro")) &&
        hasMcpToolCallGroupForTurn(state, message.turnId);
      const groupedWebSearchIntro =
        isCurrentMixedToolReplay &&
        message.id === "assistant-current-mixed-research-intro" &&
        state.webSearches.some(({ turnId }) => turnId === message.turnId);
      const groupedLongCommandIntro =
        (isCurrentLongCommandReplay &&
          message.id === "assistant-long-command-intro" &&
          state.commands.some(
            ({ id }) => id === "command-long-output",
          ));
      if (
        groupedMcpIntro ||
        groupedWebSearchIntro ||
        groupedLongCommandIntro
      ) {
        return null;
      }
      if (
        scenarioId === "mcp-current-integration-recovery" &&
        message.id === "assistant-current-integration-unavailable-intro"
      ) {
        const unavailableTurnActive = isCurrentTurnGroupActive(
          state,
          message.turnId,
        );
        return (
          <ActivityTimeline
            key={`integration-unavailable:${message.turnId}`}
            open={
              initialSelection.capture &&
              (activeFrame === "mcp-current-integration-unavailable" ||
                activeFrame === "mcp-current-integration-recovering" ||
                activeFrame === "mcp-current-integration-recovered")
                ? true
                : undefined
            }
            summary={
              <TurnDuration
                durationMs={
                  (message.turnId
                    ? state.turnDurationsMs[message.turnId]
                    : undefined) ?? 16_000
                }
                status={unavailableTurnActive ? "working" : "worked"}
              />
            }
          >
            <AgentMessage
              className="demo-mcp-current-unavailable-intro"
              data-item-id={message.id}
              role="assistant"
              status={agentMessageStatus(message.status)}
            >
              <AgentMarkdown>{message.text}</AgentMarkdown>
            </AgentMessage>
          </ActivityTimeline>
        );
      }
      return (
        <Fragment key={`message:${message.id}`}>
          <AgentMessage
            actions={
              mode === "replay" &&
              ((scenarioId === "markdown" &&
                message.id === "assistant-markdown") ||
                (isCurrentMarkdown26818Replay &&
                  message.id === "assistant-markdown") ||
                (scenarioId === "markdown-table-actions" &&
                  message.id === "assistant-markdown-table-actions") ||
                (scenarioId === "markdown-streaming-large" &&
                  message.id === "assistant-markdown-streaming-large") ||
                (scenarioId === "mcp-tool-call" &&
                  message.id === "assistant-mcp") ||
                (isCurrentMcpSuccessReplay &&
                  (message.id === "assistant-current-mcp-success" ||
                    message.id ===
                      "assistant-current-mcp-26-818-success")) ||
                (isCurrentMcpRecoveryReplay &&
                  (message.id === "assistant-current-mcp-recovery" ||
                    message.id ===
                      "assistant-current-mcp-26-818-recovery")) ||
                (scenarioId === "mcp-current-integration-recovery" &&
                  (message.id ===
                    "assistant-current-integration-unavailable" ||
                    message.id ===
                      "assistant-current-integration-recovered")) ||
                (scenarioId === "mcp-recovery-mixed-thread" &&
                  (message.id === "assistant-recovery" ||
                    message.id === "assistant-workflow")) ||
                ((scenarioId === "approval-denied" ||
                  scenarioId === "approval-allow-once" ||
                  scenarioId === "approval-similar-commands") &&
                  (message.id === "assistant-approval-denied" ||
                    message.id === "assistant-approval-approved" ||
                    message.id === "assistant-approval-allow-once" ||
                    message.id === "assistant-approval-similar-first" ||
                    message.id === "assistant-approval-similar-second")) ||
                (scenarioId === "long-command-output" &&
                  message.id === "assistant-long-command-final") ||
                (isCurrentBasicMessageReplay &&
                  message.id === "assistant-current-basic") ||
                (scenarioId === "command-failure-recovery" &&
                  (message.id === "assistant-command-failure-recovered" ||
                    message.id === "assistant-command-follow-up")) ||
                (scenarioId === "interruption" &&
                  message.id ===
                    "assistant-command-interruption-recovery") ||
                (isCurrentSubagentReplay &&
                  message.id.startsWith("assistant-subagent-")) ||
                (isCurrentMixedToolReplay &&
                  message.id.startsWith("assistant-current-mixed-") &&
                  !message.id.endsWith("-intro")) ||
                (scenarioId === "compaction" &&
                  (message.id === "assistant-compaction-baseline" ||
                    message.id ===
                      "assistant-context-compaction-recovery"))) &&
              message.status === "completed" ? (
                isCurrentMcpReplay ||
                scenarioId === "mcp-tool-call" ||
                scenarioId === "mcp-recovery-mixed-thread" ||
                scenarioId === "approval-allow-once" ||
                scenarioId === "approval-denied" ||
                scenarioId === "approval-similar-commands" ||
                scenarioId === "long-command-output" ||
                isCurrentBasicMessageReplay ||
                isCurrentMarkdown26818Replay ||
                isCurrentSubagentReplay ? (
                  <McpResponseActions
                    copyLabel={
                      isCurrentBasicMessageReplay ||
                      isCurrentMarkdown26818Replay
                        ? "Copy"
                        : undefined
                    }
                    label={
                      isCurrentBasicMessageReplay ||
                      isCurrentMarkdown26818Replay
                        ? null
                        : message.id === "assistant-workflow" ||
                      message.id === "assistant-approval-denied" ||
                      message.id === "assistant-approval-approved" ||
                      message.id === "assistant-approval-allow-once" ||
                      message.id === "assistant-approval-similar-first" ||
                      message.id === "assistant-approval-similar-second"
                        ? "Response actions"
                        : undefined
                    }
                    toolbar={
                      !isCurrentBasicMessageReplay &&
                      !isCurrentMarkdown26818Replay
                    }
                  />
                ) : (
                  <span
                    aria-label="Markdown response actions"
                    className="demo-turn-actions"
                    role="toolbar"
                  >
                    <button aria-label="Copy response" type="button">
                      ▣
                    </button>
                    <button aria-label="Good response" type="button">
                      ♡
                    </button>
                    <button aria-label="Bad response" type="button">
                      ♢
                    </button>
                    <button aria-label="Share response" type="button">
                      ↗
                    </button>
                  </span>
                )
              ) : undefined
            }
            attachments={
              submittedMessageAttachments
                ? submittedMessageAttachments.map((attachment) => (
                    <MessageAttachment
                      alt={
                        attachment.kind === "image" ? attachment.label : ""
                      }
                      icon={
                        attachment.kind === "folder" ? (
                          <CurrentBuildIcon name="composer-project" />
                        ) : attachment.kind === "file" ? (
                          <span className="demo-current-file-type">
                            {attachment.meta?.split(/\s|·/)[0] ?? "FILE"}
                          </span>
                        ) : undefined
                      }
                      key={`${message.id}:submitted-attachment:${attachment.id}`}
                      kind={attachment.kind === "image" ? "image" : "file"}
                      label={attachment.label}
                      meta={attachment.meta}
                      onClick={() => undefined}
                      previewSrc={attachment.previewSrc}
                    />
                  ))
                : message.role === "user" && message.attachments?.length
                ? message.attachments.map((attachment, index) => (
                    <MessageAttachment
                      alt={messageAttachmentAccessibleLabel(
                        attachment,
                        index,
                        message.attachments?.length ?? 0,
                      )}
                      key={`${message.id}:attachment:${index}`}
                      label={messageAttachmentAccessibleLabel(
                        attachment,
                        index,
                        message.attachments?.length ?? 0,
                      )}
                      onClick={() => undefined}
                      previewSrc={messageAttachmentPreviewSource(
                        attachment,
                        attachmentPreviewDataUrl,
                      )}
                    />
                  ))
                : undefined
            }
            data-item-id={message.id}
            role={message.role}
            status={agentMessageStatus(message.status)}
          >
            {message.role === "assistant" ? (
              message.id === "assistant-current-mcp-26-818-success" ? (
                <CurrentMcpAnswer />
              ) : message.id ===
                "assistant-current-mcp-26-818-recovery" ? (
                <CurrentMcpAnswer recovery />
              ) : (
                <AgentMarkdown
                  allowWideTables={scenarioId === "markdown-table-actions"}
                  codeBlockWrapToggleable={isCurrentMarkdown26818Replay}
                  linkTarget="_blank"
                  streaming={message.status === "running"}
                >
                  {message.text || " "}
                </AgentMarkdown>
              )
            ) : (
              submittedMessageText || null
            )}
          </AgentMessage>
          {message.interruptionDurationMs !== undefined ? (
            <ThreadInterruptionSummary
              durationMs={message.interruptionDurationMs ?? 0}
              label={
                message.interruptionDurationMs === null
                  ? "You stopped"
                  : undefined
              }
              stoppedLabel={(time) => `You stopped after ${time}`}
            />
          ) : null}
          {message.compaction ? (
            <ThreadContextEvent
              mode={
                isCurrentContextCompactionReplay ? "manual" : "automatic"
              }
              status={message.compaction}
            />
          ) : null}
          {mode === "replay" &&
          scenarioId === "multi-file-review" &&
          message.id === "user-multi-file" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={24_000} status="worked" />}
            />
          ) : mode === "replay" &&
            scenarioId === "current-review-rename" &&
            message.id === "user-current-review-rename" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={52_000} status="worked" />}
            />
          ) : null}
        </Fragment>
      );
    }

    if (entry.kind === "webSearch") {
      const webSearch = state.webSearches.find(({ id }) => id === entry.id);
      if (!webSearch) return null;
      const turnSearches = state.webSearches.filter(
        ({ turnId }) => turnId === webSearch.turnId,
      );
      if (turnSearches[0]?.id !== entry.id) return null;

      const searchActions = turnSearches.filter(
        ({ action }) => action === "search",
      );
      const browserActions = turnSearches.filter(
        ({ action }) => action === "openPage" || action === "findInPage",
      );
      const intro = state.messages.find(
        ({ id, turnId }) =>
          turnId === webSearch.turnId &&
          id === "assistant-current-mixed-research-intro",
      );
      const active = turnSearches.some(({ status }) => status === "running");
      const captureOpen =
        initialSelection.capture &&
        (activeFrame === "current-mixed-research-running" ||
          activeFrame === "current-mixed-research-completed");
      const searchEntries = searchActions.flatMap((search) =>
        search.results.map((result) => ({
          completed: search.status === "completed",
          detail: result.detail,
          id: result.id,
        })),
      );
      const browserSteps = browserActions.map((action) => ({
        completed: action.status === "completed",
        id: action.id,
        kind: "navigation" as const,
        label:
          action.action === "openPage"
            ? `Opened ${action.target ?? action.query}`
            : `Found ${action.target ?? action.query}`,
      }));
      const durationMs =
        (webSearch.turnId
          ? state.turnDurationsMs[webSearch.turnId]
          : undefined) ?? 22_000;

      return (
        <ActivityTimeline
          className="demo-current-mixed-research-timeline"
          key={`web-search:${webSearch.turnId}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={active ? 0 : durationMs}
              status={active ? "working" : "worked"}
            />
          }
        >
          {intro ? (
            <AgentMessage
              className="demo-current-mixed-research-intro"
              data-item-id={intro.id}
              role="assistant"
              status={agentMessageStatus(intro.status)}
            >
              <AgentMarkdown>{intro.text}</AgentMarkdown>
            </AgentMessage>
          ) : null}
          {searchActions.length > 0 ? (
            <SearchActivity
              data-item-id={searchActions[0]?.id}
              entries={searchEntries}
              kind="web"
              open={initialSelection.capture ? captureOpen : undefined}
              query={searchActions.at(-1)?.query}
              status={
                searchActions.some(({ status }) => status === "running")
                  ? "running"
                  : "completed"
              }
            />
          ) : null}
          {browserActions.length > 0 ? (
            <BrowserActivity
              data-item-id={browserActions[0]?.id}
              open={initialSelection.capture ? captureOpen : undefined}
              status={
                browserActions.some(({ status }) => status === "running")
                  ? "running"
                  : "completed"
              }
              steps={browserSteps}
            />
          ) : null}
        </ActivityTimeline>
      );
    }

    if (entry.kind === "mcpToolCall") {
      const calls = mcpToolCallGroupForEntry(state, entryIndex);
      if (!calls) return null;
      const toolCall = calls[0];
      if (scenarioId === "mcp-recovery-mixed-thread") {
        const failedCall = calls.find(
          ({ id }) => id === "mcp-fetch-invalid",
        );
        if (!failedCall || entry.id !== failedCall.id) return null;

        const recoveryCalls = calls.filter(
          ({ id }) => id !== failedCall.id,
        );
        const toolIntro = state.messages.find(
          ({ id }) => id === "assistant-recovery-intro",
        );
        const recoveryStatus = state.messages.find(
          ({ id }) => id === "assistant-recovery-status",
        );
        const failedPresentation =
          mcpToolCallPresentation(failedCall);
        const recoveryGroupStatus =
          recoveryCalls.length > 0
            ? mcpToolCallGroupStatus(recoveryCalls)
            : undefined;
        const captureOpen =
          initialSelection.capture &&
          (activeFrame === "mcp-running" ||
            activeFrame === "mcp-progress" ||
            activeFrame === "mcp-tool-calls" ||
            activeFrame === "mcp-recovery-failed" ||
            activeFrame === "mcp-recovery-retrying" ||
            activeFrame === "mcp-recovery-completed");
        const durationMs = mcpToolCallGroupDurationMs(state, calls);

        return (
          <ActivityTimeline
            key={`mcp-recovery:${failedCall.turnId}:${failedCall.server}`}
            open={initialSelection.capture ? captureOpen : undefined}
            summary={
              <TurnDuration
                durationMs={durationMs}
                status={
                  state.currentTurnId === failedCall.turnId
                    ? "working"
                    : "worked"
                }
              />
            }
          >
            {toolIntro ? (
              <AgentMessage
                className="demo-mcp-recovery-intro"
                data-item-id={toolIntro.id}
                role="assistant"
                status={agentMessageStatus(toolIntro.status)}
              >
                <AgentMarkdown>{toolIntro.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            <ToolCallCard
              className="demo-mcp-recovery-failed-call"
              data-item-id={failedCall.id}
              error={failedPresentation.error}
              errorLanguage="plaintext"
              errorPresentation="output"
              failedAriaLabel={`${failedCall.toolLabel} failed`}
              failedLabel={failedCall.toolLabel}
              icon={<McpToolIcon />}
              name={failedCall.toolLabel}
              open={
                initialSelection.capture &&
                (activeFrame === "mcp-recovery-failed" ||
                  activeFrame === "mcp-recovery-completed")
                  ? true
                  : undefined
              }
              onViewRawOutput={(value) =>
                setRawToolOutput({
                  name: failedCall.toolLabel,
                  value,
                })
              }
              rawOutput={{
                arguments: failedCall.arguments,
                error: failedCall.error,
              }}
              result={failedPresentation.result}
              role="listitem"
              source={failedCall.server}
              status={failedCall.status}
              structuredContent={failedPresentation.structuredContent}
              summary={failedPresentation.summary}
            />
            {recoveryStatus ? (
              <AgentMessage
                className="demo-mcp-recovery-status"
                data-item-id={recoveryStatus.id}
                role="assistant"
                status={agentMessageStatus(recoveryStatus.status)}
              >
                <AgentMarkdown>{recoveryStatus.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            {recoveryCalls.length > 0 && recoveryGroupStatus ? (
              <McpToolCallGroup
                data-testid="mcp-tool-call-group"
                defaultOpen={false}
                name={recoveryCalls[0]?.appName ?? failedCall.appName}
                open={initialSelection.capture ? captureOpen : undefined}
                source={recoveryCalls[0]?.server ?? failedCall.server}
                status={recoveryGroupStatus}
              >
                {recoveryCalls.map((call) => {
                  const presentation = mcpToolCallPresentation(call);
                  return (
                    <ToolCallCard
                      data-item-id={call.id}
                      error={presentation.error}
                      icon={<McpToolIcon />}
                      key={call.id}
                      name={call.toolLabel}
                      result={presentation.result}
                      role="listitem"
                      source={call.server}
                      status={call.status}
                      structuredContent={presentation.structuredContent}
                      summary={presentation.summary}
                    />
                  );
                })}
              </McpToolCallGroup>
            ) : null}
          </ActivityTimeline>
        );
      }
      const toolIntro = state.messages.find(
        ({ id, turnId }) =>
          turnId === toolCall.turnId &&
          (id === "assistant-mcp-intro" ||
            (scenarioId === "mcp-current-integration-recovery" &&
              id === "assistant-current-integration-recovery-intro") ||
            (isCurrentMixedToolReplay &&
              id === "assistant-current-mixed-mcp-intro")),
      );
      const groupStatus = mcpToolCallGroupStatus(calls);
      const currentMcpTurnActive = isCurrentTurnGroupActive(
        state,
        toolCall.turnId,
      );
      const presentedGroupStatus =
        currentMcpTurnActive ? "running" : groupStatus;
      const currentMcpCaptureOpen =
        (isCurrentMcpSuccessReplay &&
          (activeFrame === "mcp-current-running" ||
            activeFrame === "mcp-current-success" ||
            activeFrame === "mcp-current-26-818-running" ||
            activeFrame === "mcp-current-26-818-success")) ||
        (isCurrentMcpRecoveryReplay &&
          (activeFrame === "mcp-current-recovery-failed" ||
            activeFrame === "mcp-current-recovery-retrying" ||
            activeFrame === "mcp-current-recovery-completed" ||
            activeFrame === "mcp-current-26-818-recovery-failed" ||
            activeFrame === "mcp-current-26-818-recovery-retrying" ||
            activeFrame === "mcp-current-26-818-recovery-completed")) ||
        (scenarioId === "mcp-current-integration-recovery" &&
          (activeFrame === "mcp-current-integration-recovering" ||
            activeFrame === "mcp-current-integration-recovered")) ||
        (isCurrentMixedToolReplay &&
          (activeFrame === "current-mixed-mcp-running" ||
            activeFrame === "current-mixed-mcp-completed"));
      const captureOpen =
        initialSelection.capture &&
        (currentMcpCaptureOpen ||
          activeFrame === "mcp-running" ||
          activeFrame === "mcp-progress" ||
          activeFrame === "mcp-tool-calls");
      const durationMs = mcpToolCallGroupDurationMs(state, calls);
      return (
        <ActivityTimeline
          key={`mcp-group:${toolCall.turnId}:${toolCall.server}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={durationMs}
              status={
                presentedGroupStatus === "running"
                  ? "working"
                  : "worked"
              }
            />
          }
        >
          {toolIntro ? (
            <AgentMessage
              className="demo-mcp-recovery-intro demo-mcp-current-intro"
              data-item-id={toolIntro.id}
              role="assistant"
              status={agentMessageStatus(toolIntro.status)}
            >
              <AgentMarkdown>{toolIntro.text}</AgentMarkdown>
            </AgentMessage>
          ) : null}
          <McpToolCallGroup
            data-testid="mcp-tool-call-group"
            defaultOpen={false}
            disclosureIcon={
              isCurrentMcpReplay ? (
                <CurrentBuildIcon name="thread-activity-chevron" />
              ) : undefined
            }
            disclosureMode={isCurrentMcpReplay ? "button" : undefined}
            icon={
              isCurrentMcpReplay ? (
                <CurrentBuildIcon name="thread-mcp-tool" />
              ) : undefined
            }
            name={toolCall.appName}
            open={initialSelection.capture ? captureOpen : undefined}
            source={toolCall.server}
            status={presentedGroupStatus}
          >
            {calls.map((call) => {
              const presentation = mcpToolCallPresentation(call);
              return (
                <ToolCallCard
                  data-item-id={call.id}
                  disclosureIcon={
                    isCurrentMcpReplay ? (
                      <CurrentBuildIcon name="thread-activity-chevron" />
                    ) : undefined
                  }
                  disclosureMode={
                    isCurrentMcpReplay ? "overlay-button" : undefined
                  }
                  error={presentation.error}
                  errorLanguage={
                    call.status === "failed" ? "plaintext" : undefined
                  }
                  errorPresentation={
                    call.status === "failed" ? "output" : undefined
                  }
                  failedAriaLabel={
                    call.status === "failed"
                      ? `${call.toolLabel} failed`
                      : undefined
                  }
                  failedLabel={call.toolLabel}
                  key={call.id}
                  icon={
                    isCurrentMcpReplay ? (
                      <CurrentBuildIcon name="thread-mcp-tool" />
                    ) : (
                      <McpToolIcon />
                    )
                  }
                  name={call.toolLabel}
                  open={
                    initialSelection.capture &&
                    (call.id === "mcp-fetch-invalid" ||
                      call.id === "mcp-current-fetch-invalid" ||
                      call.id === "mcp-current-26-818-fetch-invalid") &&
                    (activeFrame === "mcp-recovery-failed" ||
                      activeFrame === "mcp-recovery-completed" ||
                      activeFrame === "mcp-current-recovery-failed" ||
                      activeFrame === "mcp-current-recovery-completed" ||
                      activeFrame ===
                        "mcp-current-26-818-recovery-failed" ||
                      activeFrame ===
                        "mcp-current-26-818-recovery-completed")
                      ? true
                      : undefined
                  }
                  onViewRawOutput={
                    call.status === "failed"
                      ? (value) =>
                          setRawToolOutput({
                            name: call.toolLabel,
                            value,
                          })
                      : undefined
                  }
                  rawOutput={
                    call.status === "failed"
                      ? {
                          arguments: call.arguments,
                          error: call.error,
                        }
                      : undefined
                  }
                  result={presentation.result}
                  role="listitem"
                  source={call.server}
                  status={call.status}
                  structuredContent={presentation.structuredContent}
                  summary={presentation.summary}
                />
              );
            })}
          </McpToolCallGroup>
        </ActivityTimeline>
      );
    }

    if (entry.kind === "subagent") {
      const presentation = subagentTimelinePresentation(state, entry.id);
      if (!presentation || presentation.anchor.callId !== entry.id) return null;
      const groupTurnId = presentation.turnId;
      const turnActive = presentation.active;
      const groupedSubagents = presentation.rows;
      const callSubagents = groupedSubagents.map((subagent) =>
        presentSubagent(subagent, mode, subagentClockMs),
      );
      if (callSubagents.length === 0) return null;
      const activityStatuses = new Map(
        groupedSubagents.map((subagent) => [
          subagent.id,
          subagentActivityStatus(subagent),
        ]),
      );
      const working = callSubagents.filter(
        ({ status }) => status !== "done",
      );
      const activityItems =
        turnActive
          ? callSubagents
          : isCurrentMixedToolReplay
            ? callSubagents
            : working.length > 0 || mode !== "live"
            ? working
            : callSubagents;
      const startedAtMs = presentation.startedAtMs;
      const completedAtMs = presentation.completedAtMs;
      const settledTurnDurationMs =
        working.length === 0 && groupTurnId !== null
          ? state.turnDurationsMs[groupTurnId]
          : undefined;
      return (
        <ActivityTimeline
          className="demo-subagent-activity-timeline"
          defaultOpen={mode === "live" && turnActive}
          key={`subagent:${entry.id}:${turnActive ? "active" : "settled"}`}
          open={
            initialSelection.capture
              ? (isCurrentMixedToolReplay &&
                  activeFrame === "current-mixed-completed") ||
                (turnActive && activityItems.length > 0)
              : undefined
          }
          summary={
            <TurnDuration
              {...(mode === "live"
                ? settledTurnDurationMs !== undefined
                  ? { durationMs: settledTurnDurationMs }
                  : {
                      completedAtMs:
                        working.length === 0 ? completedAtMs : undefined,
                      startedAtMs,
                    }
                : {
                    durationMs:
                      working.length > 0
                        ? 14_000
                        : settledTurnDurationMs !== undefined
                          ? settledTurnDurationMs
                          : turnActive &&
                              startedAtMs !== undefined &&
                              completedAtMs !== undefined
                            ? Math.max(0, completedAtMs - startedAtMs)
                            : state.turnDurationMs ?? 45_000,
                  })}
              status={working.length > 0 ? "working" : "worked"}
            />
          }
        >
          {activityItems.length > 1 ? (
            <SubagentActivityGroup
              items={activityItems.map((item) => ({
                activityStatus: activityStatuses.get(item.id) ?? "active",
                id: item.id,
                name: item.name,
              }))}
              onOpen={(item) => openSubagentPanel(item.id)}
            />
          ) : (
            activityItems.map((item) => (
              <SubagentActivity
                item={{
                  activityStatus: activityStatuses.get(item.id) ?? "active",
                  id: item.id,
                  name: item.name,
                }}
                key={item.id}
                onOpen={() => {
                  openSubagentPanel(item.id);
                }}
              />
            ))
          )}
        </ActivityTimeline>
      );
    }

    if (entry.kind === "command") {
      const command = state.commands.find(({ id }) => id === entry.id);
      if (!command) return null;
      if (
        isCurrentApprovalReplay &&
        (command.id === "command-open-calculator" ||
          command.id === "command-create-approval-sentinel" ||
          command.id === "command-open-calculator-once" ||
          command.id === "command-open-calculator-similar-first" ||
          command.id === "command-open-calculator-similar-second")
      ) {
        const pending = command.status === "running";
        const approved = command.status === "completed";
        const pendingDurationMs =
          scenarioId === "approval-allow-once"
            ? 273_000
            : scenarioId === "approval-similar-commands"
              ? 98_000
          : 75_000;
        const completedTurnDurationMs = command.turnId
          ? state.turnDurationsMs[command.turnId]
          : undefined;
        return (
          <ActivityTimeline
            key={`command:${command.id}`}
            open={initialSelection.capture && pending ? true : undefined}
            summary={
              <TurnDuration
                durationMs={
                  pending
                    ? pendingDurationMs
                    : (completedTurnDurationMs ??
                      state.turnDurationMs ??
                      (scenarioId === "approval-denied"
                        ? 113_000
                        : 23_000))
                }
                status={pending ? "working" : "worked"}
              />
            }
          >
            <CommandExecution
              command={command.command}
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              hideRawCommand
              status={command.status}
              summary={
                pending ? (
                  <>Running {command.command}</>
                ) : approved ? (
                  <>Completed {command.command}</>
                ) : (
                  <>Did not run {command.command}</>
                )
              }
            />
          </ActivityTimeline>
        );
      }
      if (
        isCurrentLongCommandReplay &&
        command.id === "command-long-output"
      ) {
        const intro = state.messages.find(
          ({ id }) => id === "assistant-long-command-intro",
        );
        return (
          <ActivityTimeline
            defaultOpen={false}
            key={`command:${command.id}`}
            summary={
              <TurnDuration
                durationMs={state.turnDurationMs ?? 10_000}
                status="worked"
              />
            }
          >
            {intro ? (
              <AgentMessage
                data-item-id={intro.id}
                role="assistant"
                status={agentMessageStatus(intro.status)}
              >
                <AgentMarkdown>{intro.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            <CommandExecution
              command={command.command}
              copyCommandLabel="Copy"
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              defaultOpen={false}
              durationMs={command.durationMs ?? undefined}
              exitCode={command.exitCode ?? undefined}
              status={command.status}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
            >
              <CommandOutput
                copyLabel="Copy"
                copyText={command.output}
              >
                {command.output}
              </CommandOutput>
            </CommandExecution>
          </ActivityTimeline>
        );
      }
      if (
        isCurrentCommandFailureReplay &&
        command.id === "command-failure-output"
      ) {
        return (
          <ActivityTimeline
            defaultOpen={false}
            key={`command:${command.id}`}
            summary={
              <TurnDuration
                durationMs={
                  command.status === "running"
                    ? 0
                    : ((command.turnId
                        ? state.turnDurationsMs[command.turnId]
                        : undefined) ?? 10_000)
                }
                status={command.status === "running" ? "working" : "worked"}
              />
            }
          >
            <CommandExecution
              command={command.command}
              copyCommandLabel="Copy"
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              defaultOpen={false}
              durationMs={command.durationMs ?? undefined}
              exitCode={command.exitCode ?? undefined}
              status={command.status}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
            >
              <CommandOutput copyLabel="Copy" copyText={command.output}>
                {command.output}
              </CommandOutput>
            </CommandExecution>
          </ActivityTimeline>
        );
      }
      if (
        isCurrentCommandInterruptionReplay &&
        command.id === "command-interruption"
      ) {
        const commandSummary = (
          <span className="codex-ui-command-execution__summary-command">
            {command.command}
          </span>
        );
        const running =
          command.status === "running" && state.status === "running";
        const stopped =
          state.status === "interrupted" || command.status === "completed";
        const execution = (
          <CommandExecution
            command={command.command}
            data-item-id={command.id}
            data-testid="command-execution"
            hideRawCommand
            indicator={
              stopped ? (
                <span
                  aria-hidden="true"
                  className="demo-command-stop-indicator"
                />
              ) : undefined
            }
            open={false}
            status={stopped ? "interrupted" : "running"}
            terminalIcon={
              <CurrentBuildIcon name="thread-command-terminal" />
            }
            summary={
              stopped ? (
                <>Background terminal stopped with {commandSummary}</>
              ) : (
                <>Running {commandSummary}</>
              )
            }
          />
        );
        return running ? (
          <ActivityTimeline
            key={`command:${command.id}`}
            open
            summary={<TurnDuration durationMs={7_000} status="working" />}
          >
            {execution}
          </ActivityTimeline>
        ) : (
          <Fragment key={`command:${command.id}`}>{execution}</Fragment>
        );
      }
      return (
        <CommandExecution
          command={command.command}
          cwd={command.cwd}
          data-item-id={command.id}
          data-testid="command-execution"
          durationMs={command.durationMs ?? undefined}
          detail={
            command.processId ? (
              <button
                className="demo-command-terminal"
                onClick={() => {
                  setTerminalSessionIds((sessionIds) =>
                    sessionIds.includes(command.id)
                      ? sessionIds
                      : [...sessionIds, command.id],
                  );
                  setClosedTerminalSessionIds((sessionIds) =>
                    sessionIds.filter((id) => id !== command.id),
                  );
                  setTerminalCommandId(command.id);
                  setTerminalOpen(true);
                }}
                type="button"
              >
                Open terminal
              </button>
            ) : undefined
          }
          exitCode={command.exitCode ?? undefined}
          key={`command:${command.id}`}
          open={
            initialSelection.capture
              ? activeFrame === "command-running" &&
                command.status === "running"
              : undefined
          }
          status={command.status}
        >
          <CommandOutput copyText={command.output}>
            {command.output}
          </CommandOutput>
        </CommandExecution>
      );
    }

    if (entry.kind === "approval") {
      const approval = state.approvals.find(
        ({ requestId }) =>
          `${typeof requestId}:${requestId}` === entry.id,
      );
      if (!approval) return null;
      if (
        isCurrentApprovalReplay ||
        (isCurrentMixedToolReplay && approval.decision !== "pending")
      ) {
        return null;
      }
      return (
        <ApprovalRequest
          data-item-id={approval.itemId}
          data-testid="approval-request"
          decision={approval.decision}
          description={approval.command}
          kind={approval.kind}
          key={`approval:${entry.id}`}
          onApprove={() =>
            respondToApproval(approval.requestId, "accept")
          }
          onReject={() =>
            respondToApproval(approval.requestId, "decline")
          }
          reason={approval.reason}
          scopedApproveAction={
            approval.kind === "file"
              ? {
                  info: "Allow this and future file edits in this conversation without asking again",
                  label: "Allow all edits",
                  onClick: () =>
                    respondToApproval(
                      approval.requestId,
                      "acceptForSession",
                    ),
                }
              : undefined
          }
          title={
            approval.kind === "command"
              ? "Run this command?"
              : "Apply these file changes?"
          }
        />
      );
    }

    const fileChange = state.fileChanges.find(({ id }) => id === entry.id);
    if (!fileChange || undoneFileIds.has(fileChange.id)) return null;
    const changes = fileChange.changes.map((change) => {
      const stats = changeStats(change);
      return {
        additions: stats.additions,
        change: change.kind,
        deletions: stats.deletions,
        path: change.path,
        previousPath: change.previousPath,
      };
    });
    const indicator = isCurrentReviewFilesReplay ? (
      <CurrentBuildIcon name="review-file-text" />
    ) : (
      <svg
        aria-hidden="true"
        className="demo-file-indicator"
        viewBox="0 0 16 16"
      >
        <rect height="12" rx="2" width="12" x="2" y="2" />
        <path d="M5 8h6M8 5v6" />
      </svg>
    );
    const detail =
      fileChange.status === "applied" ? (
        <span className="demo-file-actions">
          {mode === "replay" ? (
            <button
              onClick={() => {
                if (isCurrentReviewFilesReplay) {
                  setFileRevertErrorOpen(true);
                  return;
                }
                setUndoneFileIds((current) => {
                  const next = new Set(current);
                  next.add(fileChange.id);
                  return next;
                });
                if (resolvedReview?.fileChangeId === fileChange.id) {
                  setReviewOpen(false);
                  setReviewSelection(null);
                }
              }}
              type="button"
            >
              Undo <span aria-hidden="true">↶</span>
            </button>
          ) : null}
          <button
            onClick={() => {
              setReviewSelectionKey((current) => current + 1);
              setReviewSelection({
                fileChangeId: fileChange.id,
              });
              openReviewPanel();
            }}
            type="button"
          >
            Review
          </button>
        </span>
      ) : undefined;
    return (
      <Fragment key={`file-change:${fileChange.id}`}>
        <FileChangeGroup
          changes={changes}
          data-item-id={fileChange.id}
          data-testid="file-change-group"
          description={
            isCurrentReviewFilesReplay ? (
              <span className="demo-current-review-card-stats">
                <span data-stat="additions">+{reviewTotals.additions}</span>
                <span data-stat="deletions">−{reviewTotals.deletions}</span>
              </span>
            ) : undefined
          }
          detail={detail}
          indicator={indicator}
          onOpenFile={(change) => {
            setReviewSelectionKey((current) => current + 1);
            setReviewSelection({
              fileChangeId: fileChange.id,
              path: change.path,
            });
            openReviewPanel();
          }}
          status={fileChange.status}
        />
        {mode === "replay" &&
        (fileChange.id === "file-multi-file" ||
          fileChange.id === "file-current-review-rename") ? (
          <div
            aria-label="Turn actions"
            className="demo-turn-actions"
            role="toolbar"
          >
            <button aria-label="Copy response" type="button">
              ▣
            </button>
            <button aria-label="Good response" type="button">
              ♡
            </button>
            <button aria-label="Bad response" type="button">
              ♢
            </button>
            <button aria-label="Share response" type="button">
              ↗
            </button>
            <time
              dateTime={
                fileChange.id === "file-current-review-rename"
                  ? "00:55"
                  : "14:39"
              }
            >
              {fileChange.id === "file-current-review-rename"
                ? "12:55 AM"
                : "2:39 PM"}
            </time>
          </div>
        ) : null}
      </Fragment>
    );
  });
  const currentWindowedContent = currentWindowedFrame ? (
    <div
      data-mounted-turn-count={currentWindowedTurnWindowSize}
      data-selected-message-index={windowedSelectedMessageIndex + 1}
      data-total-message-count={currentWindowedHistorySize}
    >
      {currentWindowStart > 0 ? (
        <ThreadVirtualizedPlaceholder
          data-hidden-entry-count={currentWindowStart}
          data-window-side="before"
          estimatedHeight={`${currentWindowStart * 42}rem`}
        />
      ) : null}
      {Array.from(
        { length: currentWindowedTurnWindowSize },
        (_, offset) => {
          const messageIndex = currentWindowStart + offset;
          return (
            <AgentTurn
              data-windowed-turn={messageIndex + 1}
              key={`current-windowed-turn-${messageIndex + 1}`}
              spacing="grouped"
            >
              <AgentMessage
                data-item-id={`current-windowed-user-${messageIndex + 1}`}
                role="user"
              >
                Synthetic user checkpoint {messageIndex + 1}
              </AgentMessage>
              <AgentMessage role="assistant">
                The host keeps only the nearby deterministic turn window mounted.
              </AgentMessage>
            </AgentTurn>
          );
        },
      )}
      {currentWindowEnd < currentWindowedHistorySize ? (
        <ThreadVirtualizedPlaceholder
          data-hidden-entry-count={
            currentWindowedHistorySize - currentWindowEnd
          }
          data-window-side="after"
          estimatedHeight={`${
            (currentWindowedHistorySize - currentWindowEnd) * 42
          }rem`}
        />
      ) : null}
    </div>
  ) : null;
  const activeTurnHasWork = hasActiveTurnWork(state);
  const terminalCommands = useMemo(
    () => state.commands.filter(({ processId }) => Boolean(processId)),
    [state.commands],
  );
  const visibleTerminalSessionIds = terminalSessionIds.filter(
    (id) =>
      id.startsWith("local-terminal-") ||
      terminalCommands.some((command) => command.id === id),
  );
  const activeTerminalSessionId =
    visibleTerminalSessionIds.includes(terminalCommandId ?? "")
      ? (terminalCommandId ?? "")
      : (visibleTerminalSessionIds.at(-1) ?? "");
  const terminalEntriesBySession = useMemo(() => {
    const entriesBySession: Record<string, TerminalEntry[]> = {};
    for (const sessionId of terminalSessionIds) {
      const terminalCommand = terminalCommands.find(
        ({ id }) => id === sessionId,
      );
      const terminalHistory =
        terminalHistoryByCommand[sessionId] ?? [];
      if (!terminalCommand) {
        entriesBySession[sessionId] = terminalHistory;
        continue;
      }
      const protocolEntries =
        terminalCommand.terminalEvents.length > 0
          ? terminalTranscriptEvents(terminalCommand.terminalEvents).map(
              (entry, index) => ({
                id: `${terminalCommand.id}:event:${index}`,
                kind:
                  entry.kind === "stdin"
                    ? ("command" as const)
                    : ("stdout" as const),
                text: entry.text.replace(/\n$/, ""),
              }),
            )
          : [
              ...(terminalCommand.output
                ? [
                    {
                      id: `${terminalCommand.id}:output`,
                      kind: "stdout" as const,
                      text: terminalCommand.output.replace(/\n$/, ""),
                    },
                  ]
                : []),
              ...(terminalCommand.terminalInput
                ? [
                    {
                      id: `${terminalCommand.id}:stdin`,
                      kind: "command" as const,
                      text: terminalCommand.terminalInput.replace(
                        /\n$/,
                        "",
                      ),
                    },
                  ]
                : []),
            ];
      entriesBySession[sessionId] = [
        {
          id: `${terminalCommand.id}:command`,
          kind: "command",
          text: `${terminalCommand.cwd} % ${terminalCommand.command}`,
        },
        ...protocolEntries,
        ...terminalHistory,
      ];
    }
    return entriesBySession;
  }, [
    terminalCommands,
    terminalHistoryByCommand,
    terminalSessionIds,
  ]);
  const terminalSessions = visibleTerminalSessionIds.map(
    (sessionId, visibleIndex) => {
      const terminalCommand = terminalCommands.find(
        ({ id }) => id === sessionId,
      );
      const sessionProjectLabel =
        terminalWorkspaceBySession[sessionId] ??
        workspaceRunProjectLabel;
      const label =
        visibleTerminalSessionIds.length > 1
          ? `${sessionProjectLabel} ${visibleIndex + 1}`
          : sessionProjectLabel;
      const mismatched =
        sessionId === activeTerminalSessionId &&
        sessionProjectLabel !== workspaceRunProjectLabel &&
        !dismissedTerminalMismatchIds.has(sessionId);
      const isDirectShellReload =
        activeFrame === "terminal-current-reload" &&
        sessionId === terminalReloadSessionId &&
        !terminalReloadPendingIds.has(sessionId);
      const isBackgroundTerminal =
        sessionId === "agent-background-terminal";
      return {
        entries: terminalEntriesBySession[sessionId]!,
        id: sessionId,
        inputDisabled:
          activeFrame === "terminal-current-running" &&
          sessionId === activeTerminalSessionId,
        label,
        notice: mismatched ? (
          <TerminalWorkspaceMismatchNotice
            onDismiss={() =>
              setDismissedTerminalMismatchIds((sessionIds) => {
                const next = new Set(sessionIds);
                next.add(sessionId);
                return next;
              })
            }
            onOpenNewTerminal={() => createTerminalSession()}
          />
        ) : undefined,
        onReload: isDirectShellReload
          ? () => {
              cancelTerminalReloadTimer();
              setTerminalReloadPendingIds((sessionIds) =>
                new Set(sessionIds).add(sessionId),
              );
              terminalReloadTimerRef.current = window.setTimeout(() => {
                terminalReloadTimerRef.current = null;
                setTerminalReloadPendingIds((sessionIds) => {
                  const next = new Set(sessionIds);
                  next.delete(sessionId);
                  return next;
                });
                setTerminalReloadSessionId(null);
                setActiveFrame("terminal-current-single");
              }, 160);
            }
          : undefined,
        showStatus:
          !sessionId.startsWith("local-terminal-") &&
          !isBackgroundTerminal,
        status:
          terminalReloadPendingIds.has(sessionId)
            ? ("restoring" as const)
            : isDirectShellReload
              ? ("failed" as const)
              : isBackgroundTerminal
                ? ("running" as const)
                : terminalCommand?.status === "running"
            ? ("running" as const)
            : terminalCommand?.status === "failed"
              ? ("failed" as const)
              : terminalCommand?.status === "completed"
                ? ("exited" as const)
                : ("idle" as const),
        value: terminalValuesByCommand[sessionId] ?? "",
      };
    },
  );
  const createTerminalSession = () => {
    const sessionId = `local-terminal-${terminalSessionCounterRef.current}`;
    terminalSessionCounterRef.current += 1;
    setTerminalSessionIds((sessionIds) => [
      ...sessionIds,
      sessionId,
    ]);
    setTerminalWorkspaceBySession((labels) => ({
      ...labels,
      [sessionId]: workspaceRunProjectLabel,
    }));
    setTerminalCommandId(sessionId);
    setTerminalOpen(true);
    setTerminalTabPickerOpen(false);
  };
  function toggleTerminalPanel() {
    if (terminalOpen) {
      setTerminalOpen(false);
      return;
    }
    if (visibleTerminalSessionIds.length === 0) {
      createTerminalSession();
      return;
    }
    setTerminalOpen(true);
  }
  const terminalPanel = (
    <TerminalPanel
      activeSessionId={activeTerminalSessionId}
      className="demo-terminal-panel"
      data-testid="terminal-panel"
      label="Terminal"
      onActiveSessionChange={setTerminalCommandId}
      onClose={() => setTerminalOpen(false)}
      onCloseSession={(sessionId) => {
        setTerminalSessionIds((sessionIds) => {
          const closingIndex = sessionIds.indexOf(sessionId);
          const remaining = sessionIds.filter((id) => id !== sessionId);
          if (terminalCommandId === sessionId) {
            setTerminalCommandId(
              remaining[
                Math.min(
                  Math.max(closingIndex, 0),
                  remaining.length - 1,
                )
              ] ?? null,
            );
          }
          if (remaining.length === 0) setTerminalOpen(false);
          return remaining;
        });
        setClosedTerminalSessionIds((sessionIds) => [
          ...sessionIds.filter((id) => id !== sessionId),
          sessionId,
        ]);
        setDismissedTerminalMismatchIds((sessionIds) => {
          const next = new Set(sessionIds);
          next.delete(sessionId);
          return next;
        });
      }}
      onCommandSubmit={(sessionId, command) => {
        const terminalCommand = terminalCommands.find(
          ({ id }) => id === sessionId,
        );
        setTerminalHistoryByCommand((historyByCommand) => {
          const entries = historyByCommand[sessionId] ?? [];
          return {
            ...historyByCommand,
            [sessionId]: [
              ...entries,
              {
                id: `${sessionId}:local:${entries.length}:command`,
                kind: "command",
                text: `${terminalCommand?.cwd ?? workspaceRunCwd} % ${command}`,
              },
              {
                id: `${sessionId}:local:${entries.length}:system`,
                kind: "system",
                text: "Replay input is host-owned and was not executed.",
              },
            ],
          };
        });
        setTerminalValuesByCommand((values) => ({
          ...values,
          [sessionId]: "",
        }));
      }}
      onCreateSession={createTerminalSession}
      onSessionValueChange={(sessionId, value) =>
        setTerminalValuesByCommand((values) => ({
          ...values,
          [sessionId]: value,
        }))
      }
      openSessionAction={
        <Menu
          align="start"
          className="demo-terminal-tab-menu"
          label="Open bottom panel tab"
          onOpenChange={setTerminalTabPickerOpen}
          open={terminalTabPickerOpen}
          side="bottom"
          sideOffset={4}
          trigger={
            <IconButton
              icon="+"
              label="Open bottom panel tab"
              size="toolbar"
            />
          }
          width="auto"
        >
          <MenuItem
            disabled={!reviewPanel}
            endIcon="⌃⇧G"
            onSelect={() => {
              openReviewPanel();
              setTerminalTabPickerOpen(false);
            }}
            startIcon="▣"
          >
            Review
          </MenuItem>
          <MenuItem
            onSelect={createTerminalSession}
            startIcon="▣"
          >
            Terminal
          </MenuItem>
          <MenuItem disabled endIcon="⌘T" startIcon="◎">
            Browser
          </MenuItem>
          <MenuItem disabled endIcon="⌘P" startIcon="□">
            Files
          </MenuItem>
        </Menu>
      }
      sessions={terminalSessions}
    />
  );
  const backgroundTerminalCommand =
    "for i in $(seq 1 120); do printf 'terminal-background-handle-%03d\\n' \"$i\"; sleep 1; done";
  const backgroundTerminalPanelSelected =
    view === "conversation" &&
    scenarioId === "terminal-lifecycle" &&
    (activeFrame === "terminal-current-background-list" ||
      activeFrame === "terminal-current-background-open");
  const openBackgroundTerminal = () => {
    setTerminalSessionIds(["agent-background-terminal"]);
    setTerminalWorkspaceBySession({
      "agent-background-terminal": "codex-ui-kit",
    });
    setTerminalHistoryByCommand(
      initialTerminalHistory(
        "terminal-lifecycle",
        "terminal-current-background-open",
      ),
    );
    setTerminalCommandId("agent-background-terminal");
    setTerminalOpen(false);
    setBackgroundTerminalPanelOpen(true);
    setActiveFrame("terminal-current-background-open");
  };
  const closeBackgroundTerminalTab = () => {
    setTerminalSessionIds([]);
    setTerminalCommandId(null);
    setTerminalOpen(false);
    setActiveFrame("terminal-current-background-list");
  };
  const backgroundTerminalSidePanel =
    activeFrame === "terminal-current-background-open" ? (
      <WorkspacePanel
        activeTabId="agent-background-terminal"
        className="demo-background-terminal-panel"
        data-testid="terminal-current-background-panel"
        label="Background terminal"
        onActiveTabChange={() => undefined}
        onClose={() => closeBackgroundTerminalTab()}
        onCloseTab={() => closeBackgroundTerminalTab()}
        placement="side"
        tabCloseButtons
        tabs={[
          {
            closeLabel: `Close ${backgroundTerminalCommand} tab`,
            content: (
              <TerminalTranscript
                entries={
                  terminalEntriesBySession["agent-background-terminal"] ?? []
                }
                label="Background terminal output"
              />
            ),
            id: "agent-background-terminal",
            label: backgroundTerminalCommand,
          },
        ]}
      />
    ) : (
      <div
        className="demo-background-terminal-summary"
        data-testid="terminal-current-background-summary"
      >
        <TerminalProcessList
          label="Background processes"
          onOpenProcess={openBackgroundTerminal}
          onStopAll={() => setBackgroundTerminalRunning(false)}
          processes={
            backgroundTerminalRunning
              ? [
                  {
                    id: "agent-background-terminal",
                    label: backgroundTerminalCommand,
                    status: "running",
                    view: "background",
                  },
                ]
              : []
          }
        />
      </div>
    );
  const messageNavigation = isConversationLifecycle ? (
    <ThreadMessageNavigationRail
      activeIds={
        currentWindowedFrame
          ? [
              `current-windowed-user-${
                windowedSelectedMessageIndex + 1
              }`,
            ]
          : undefined
      }
      density={currentWindowedFrame ? "compact" : "regular"}
      initialScroll={currentWindowedFrame ? "end" : "start"}
      items={messageNavigationItems}
      minItems={10}
      onNavigate={(item, behavior) => {
        if (currentWindowedFrame) {
          const nextIndex =
            Number(item.id.replace("current-windowed-user-", "")) - 1;
          if (
            Number.isInteger(nextIndex) &&
            nextIndex >= 0 &&
            nextIndex < currentWindowedHistorySize
          ) {
            setWindowedSelectedMessageIndex(nextIndex);
            setThreadFollowing(
              nextIndex === currentWindowedHistorySize - 1,
            );
          }
          return;
        }
        if (scrollToMessage(item.id, behavior)) return;
      }}
    />
  ) : undefined;
  const floatingControl =
    isConversationLifecycle ||
    (mode === "replay" && scenarioId === "markdown-streaming-large") ? (
      <ThreadFloatingButton
        onClick={returnToLatest}
        show={!threadFollowing}
        working={composerIsRunning}
      />
    ) : undefined;

  return (
    <div
      className="demo-root"
      data-capture={initialSelection.capture || undefined}
      data-frame={activeFrame ?? lastEvent?.frame ?? "final"}
      data-layout={initialSelection.layoutMode}
      data-last-method={state.lastMethod ?? undefined}
      data-mode={mode}
      data-composer-phase={
        isConversationLifecycle ||
        isCurrentAttachmentReplay ||
        isCurrentCommandInterruptionReplay ||
        isCurrentContextCompactionReplay ||
        isCurrentSubagentReplay
          ? composerPhase
          : undefined
      }
      data-composer-overlay={
        isConversationLifecycle || isCurrentAttachmentReplay
          ? composerOverlay ?? undefined
          : undefined
      }
      data-composer-mode={
        isConversationLifecycle ? composerMode ?? undefined : undefined
      }
      data-queue-count={
        isConversationLifecycle ? queuedPrompts.length : undefined
      }
      data-queueing-enabled={
        isConversationLifecycle ? queueingEnabled : undefined
      }
      data-scenario={scenarioId}
      data-sidebar-current={currentSidebarComposition || undefined}
      data-sidebar-state={initialSelection.sidebarState ?? undefined}
      data-summary-open={
        isCurrentMcp26818Replay ? mcpSourceSummaryOpen : undefined
      }
      data-summary-pinned={
        isCurrentMcp26818Replay ? mcpSourceSummaryPinned : undefined
      }
      data-status={displayedStatus}
      data-theme={appliedTheme}
      data-thread-following={
        isConversationLifecycle ? threadFollowing : undefined
      }
      data-windowed-timeline={
        isConversationLifecycle &&
        activeFrame === "thread-windowed"
          ? "current"
          : undefined
      }
      data-shell-state={view === "shell" ? shellState : undefined}
      data-app-server-state={appServerCrashed ? "crashed" : "running"}
      data-notification-action={shellNotificationAction ?? undefined}
      data-view={view}
    >
      {!initialSelection.capture && themeAvailable ? (
        <label className="demo-theme-control demo-theme-control--floating">
          <span>Theme</span>
          <select
            aria-label="Theme"
            onChange={(event) =>
              setTheme(
                parseDemoThemePreference(event.currentTarget.value),
              )
            }
            value={theme}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      ) : null}
      <AppNotificationRegion
        notifications={
          view === "shell"
            ? [
                ...(shellNotificationVisible
                  ? [
                      {
                        description: "Pull requests are up to date.",
                        heading: "Connection restored",
                        id: "shell-restored",
                        onDismiss: () => setShellNotificationVisible(false),
                        tone: "info" as const,
                      },
                    ]
                  : []),
                ...shellQueuedNotificationIds.map((id) => {
                  const remove = () =>
                    setShellQueuedNotificationIds((current) =>
                      current.filter((candidate) => candidate !== id),
                    );
                  if (id === "permission") {
                    return {
                      actionLabel: "Review",
                      description: "A local command is waiting for approval.",
                      heading: "Permission required",
                      id,
                      onAction: () => {
                        setShellNotificationAction("permission-reviewed");
                        remove();
                      },
                      onDismiss: remove,
                      tone: "warning" as const,
                    };
                  }
                  if (id === "background") {
                    return {
                      actionLabel: "Open",
                      description: "The validation task finished successfully.",
                      heading: "Background task completed",
                      id,
                      onAction: () => {
                        setShellNotificationAction("background-opened");
                        remove();
                      },
                      onDismiss: remove,
                      tone: "info" as const,
                    };
                  }
                  if (id === "restored") {
                    return {
                      description: "Live updates are available again.",
                      heading: "Connection restored",
                      id,
                      onDismiss: remove,
                      tone: "info" as const,
                    };
                  }
                  return {
                    actionLabel: "View",
                    description: "Restart when your current work is saved.",
                    heading: "Update available",
                    id,
                    onAction: () => {
                      setShellNotificationAction("update-viewed");
                      remove();
                    },
                    onDismiss: remove,
                    tone: "neutral" as const,
                  };
                }),
              ]
            : []
        }
        position="bottom-end"
      />
      {appServerCrashed ? (
        <AppServerCrashRecovery
          configurationAction={{
            label: "Open Config.toml",
            onClick: () => setShellNotificationAction("configuration-opened"),
          }}
          documentationAction={{
            label: "documentation",
            onClick: () => setShellNotificationAction("documentation-opened"),
          }}
          restartAction={{
            label: "Restart",
            onClick: () => {
              setAppServerCrashed(false);
              setActiveFrame("app-server-restarted");
            },
          }}
          updateAction={{
            label: "Update ChatGPT",
            onClick: () => setShellNotificationAction("update-opened"),
          }}
        />
      ) : (
      <AppShell
        bottomPanel={terminalPanel}
        bottomPanelHeight={terminalHeight}
        bottomPanelLabel="Terminal"
        bottomPanelOpen={terminalOpen}
        bottomPanelResizable
        bottomPanelResizeLabel="Resize bottom panel"
        onBottomPanelHeightChange={setTerminalHeight}
        layoutMode={
          (initialSelection.capture &&
            activeFrame !== "pr-compact-detail" &&
            activeFrame !== "subagent-current-compact-720" &&
            ![
              "compact-collapsed",
              "compact-pinned",
            ].includes(initialSelection.sidebarState ?? "")) ||
          initialSelection.layoutMode === "wide"
            ? "wide"
            : undefined
        }
        mainLabel={
          workspaceShowsSettings ? "Settings route" : undefined
        }
        mainRole={workspaceShowsSettings ? "region" : "main"}
        narrowSidebarBehavior="current-build"
        onSidebarOpenChange={setSidebarOpen}
        onSidePanelOpenChange={
          view === "pull-request"
            ? setPullRequestOpen
            : backgroundTerminalPanelSelected
              ? setBackgroundTerminalPanelOpen
            : subagentPanelSelected
              ? setSubagentPanelOpen
              : setReviewOpen
        }
        onSidePanelWidthChange={
          view === "pull-request"
            ? setPullRequestWidth
            : backgroundTerminalPanelSelected
              ? setBackgroundTerminalPanelWidth
            : subagentPanelSelected
              ? setSubagentPanelWidth
              : setReviewPanelWidth
        }
        responsivePanelContinuity={
          !initialSelection.capture &&
          activeFrame !== "pr-compact-detail"
        }
        responsivePanelContinuityKey={`${mode}:${view}:${scenarioId}`}
        responsiveSidebarContinuity={false}
        sidePanel={
          view === "pull-request"
            ? pullRequestPanel
            : backgroundTerminalPanelSelected
              ? backgroundTerminalSidePanel
            : subagentPanelSelected
              ? subagentPanel
              : reviewPanel
        }
        sidePanelExpanded={
          view === "pull-request" && pullRequestExpanded
        }
        sidePanelLabel={
          view === "pull-request"
            ? "Pull request details"
            : backgroundTerminalPanelSelected
              ? activeFrame === "terminal-current-background-open"
                ? "Background terminal"
                : "Thread summary"
            : subagentPanelSelected
              ? "Subagents"
              : "Review"
        }
        sidePanelMinMainWidth={
          view === "pull-request"
            ? 390
            : backgroundTerminalPanelSelected
              ? 390
            : subagentPanelSelected
              ? 220
              : undefined
        }
        sidePanelMinWidth={
          view === "pull-request"
            ? 322
            : backgroundTerminalPanelSelected
              ? 300
            : subagentPanelSelected
              ? 300
              : undefined
        }
        sidePanelOpen={
          view === "pull-request"
            ? pullRequestOpen
            : backgroundTerminalPanelSelected
              ? backgroundTerminalPanelOpen
            : subagentPanelSelected
              ? subagentPanelOpen
              : reviewOpen && Boolean(reviewPanel)
        }
        sidePanelOverlay={view === "pull-request"}
        sidePanelOverlayModal={
          view !== "pull-request" &&
          !backgroundTerminalPanelSelected &&
          !subagentPanelSelected
        }
        sidePanelResizable
        sidePanelWidth={
          view === "pull-request"
            ? pullRequestWidth
            : backgroundTerminalPanelSelected
              ? backgroundTerminalPanelWidth
            : subagentPanelSelected
              ? subagentPanelWidth
              : reviewPanelWidth
        }
        sidebar={sidebar}
        sidebarMinMainWidth={
          subagentPanelSelected
            ? 220
            : currentSidebarComposition
              ? 240
              : undefined
        }
        sidebarOpen={sidebarOpen}
        sidebarResizable
        windowChrome={
          view === "projects" || view === "shell" || view === "workspace" ? (
            view === "workspace" && workspaceShowsSettings ? null : (
            <AppWindowChrome
              backAction={
                view === "workspace" && workspacePage === "environments"
                  ? {
                      icon: <CurrentBuildIcon name="window-chrome-back" />,
                      label: "Back to ChatGPT",
                      onClick: () => {
                        setWorkspacePage("conversation");
                        setActiveFrame(
                          workspaceEnvironmentId === "worktree"
                            ? "workspace-new-worktree"
                            : "workspace-ready",
                        );
                      },
                    }
                  : {
                      disabled: true,
                      icon: <CurrentBuildIcon name="window-chrome-back" />,
                      label: "Back",
                  }
              }
              endActions={
                view === "projects" ? (
                  <Button
                    className="demo-projects-create"
                    disabled={projectCreationStatus === "selecting"}
                    onClick={() => void createProject("projects")}
                    size="small"
                  >
                    {projectCreationStatus === "selecting"
                      ? "Choosing…"
                      : "Create"}
                  </Button>
                ) : undefined
              }
              forwardAction={{
                disabled: true,
                icon: <CurrentBuildIcon name="window-chrome-forward" />,
                label: "Forward",
              }}
              sidebarAction={{
                "aria-expanded": sidebarOpen,
                icon: <CurrentBuildIcon name="window-chrome-sidebar" />,
                label: sidebarOpen ? "Hide sidebar" : "Show sidebar",
                onClick: () => setSidebarOpen((open) => !open),
              }}
            />
            )
          ) : undefined
        }
      >
        {view === "pull-request" ? (
          pullRequestIndex
        ) : view === "projects" ? (
          projectsRoute
        ) : view === "shell" ? (
          shellRoute
        ) : view === "workspace" ? (
          workspaceRoute
        ) : (
          <>
            <ConversationThreadShell
              composer={composer}
              floatingControl={floatingControl}
              header={header}
              label="Codex client demo conversation"
              messageNavigation={messageNavigation}
              threadWidth="wide"
              viewportProps={{
                defaultFollowing:
                  activeFrame !== "thread-scroll-away" &&
                  activeFrame !== "thread-windowed",
                followKey: state.eventCount,
                latestOrigin:
                  currentWindowedFrame ||
                  isCurrentLongCommandReplay ||
                  isCurrentCommandFailureReplay ||
                  isCurrentCommandInterruptionReplay
                    ? "start"
                    : "end",
                onFollowingChange: setThreadFollowing,
              }}
              viewportRef={threadViewportRef}
            >
              <AgentTurn
                aria-label="Protocol-backed conversation"
                data-current-windowed-history={
                  currentWindowedFrame || undefined
                }
              >
                {liveError ? (
                  <StatusBanner heading="Live connection failed" tone="error">
                    {liveError}
                  </StatusBanner>
                ) : null}

                {currentWindowedContent}
                {currentWindowedFrame ? null : timelineContent}

                {isCurrentCommandInterruptionReplay &&
                activeFrame === "command-interruption-stopping" ? (
                  <TerminalProcessList
                    className="demo-terminal-processes"
                    data-testid="command-interruption-process-list"
                    onStopAll={settleCurrentCommandInterruption}
                    onStopProcess={settleCurrentCommandInterruption}
                    processes={[
                      {
                        detail:
                          state.commands.find(
                            ({ id }) => id === "command-interruption",
                          )?.command ?? "Background command",
                        id: "process-command-interruption",
                        label: "Background terminal",
                        status: "running",
                      },
                    ]}
                  />
                ) : null}

                {scenarioId === "terminal-lifecycle" &&
                !currentTerminalFrame(activeFrame) &&
                terminalCommands.length > 0 ? (
                  <TerminalProcessList
                    className="demo-terminal-processes"
                    data-testid="terminal-process-list"
                    onOpenProcess={(sessionId) => {
                      setTerminalSessionIds((sessionIds) =>
                        sessionIds.includes(sessionId)
                          ? sessionIds
                          : [...sessionIds, sessionId],
                      );
                      setClosedTerminalSessionIds((sessionIds) =>
                        sessionIds.filter((id) => id !== sessionId),
                      );
                      setTerminalCommandId(sessionId);
                      setTerminalOpen(true);
                    }}
                    processes={terminalCommands.map((command) => ({
                      detail: command.command,
                      id: command.id,
                      label:
                        command.status === "running"
                          ? "Development process"
                          : command.status === "failed"
                            ? "Failed process"
                            : "Completed process",
                      status:
                        command.status === "completed"
                          ? "exited"
                          : command.status === "pending"
                            ? "idle"
                            : command.status,
                    }))}
                  />
                ) : null}

                {state.status === "running" &&
                !isCurrentContextCompactionReplay &&
                !activeTurnHasWork &&
                !state.messages.some(
                  ({ role, status, turnId }) =>
                    role === "assistant" &&
                    status === "running" &&
                    turnId === state.currentTurnId,
                ) ? (
                  <ThreadThinkingPlaceholder />
                ) : null}

              </AgentTurn>
            </ConversationThreadShell>

            {isCurrentMcp26818Replay ? (
              <ThreadSummaryDock
                anchorRef={mcpSourceSummaryTriggerRef}
                className="demo-current-mcp-source-summary-dock"
                onOpenChange={setMcpSourceSummaryOpen}
                open={mcpSourceSummaryOpen}
                pinned={mcpSourceSummaryPinned}
              >
                <ThreadSummaryPanel
                  className="demo-current-mcp-source-summary-panel"
                  label="MCP sources summary"
                >
                  <ThreadSummarySection
                    actions={
                      <ThreadSummaryIconButton
                        icon="+"
                        label="Create a file or site"
                      />
                    }
                    title="Outputs"
                  >
                    <ThreadSummaryItem
                      disabled
                      label="Create a file or site"
                    />
                  </ThreadSummarySection>
                  <ThreadSummarySection
                    actions={
                      <ThreadSummaryIconButton
                        icon="+"
                        label="Add a source"
                      />
                    }
                    title="Sources"
                  >
                    <ThreadSummaryItem
                      label="openai-docs-mcp"
                      leading={
                        <CurrentBuildIcon name="thread-mcp-tool" />
                      }
                    />
                    <ThreadSummaryItem
                      label="View all"
                      leading={<SummaryGlyph name="link" />}
                      tone="muted"
                    />
                  </ThreadSummarySection>
                </ThreadSummaryPanel>
              </ThreadSummaryDock>
            ) : null}

            {mode === "replay" && !initialSelection.capture ? (
              <div className="demo-playback" aria-label="Replay controls">
                <Button
                  disabled={replayCount <= 1}
                  onClick={() =>
                    selectReplayPosition(Math.max(1, replayCount - 1))
                  }
                  size="small"
                  tone="ghost"
                >
                  Previous
                </Button>
                <input
                  aria-label="Protocol event position"
                  max={scenario.events.length}
                  min={1}
                  onChange={(event) =>
                    selectReplayPosition(Number(event.target.value))
                  }
                  type="range"
                  value={replayCount}
                />
                <Button
                  disabled={replayCount >= scenario.events.length}
                  onClick={() =>
                    selectReplayPosition(
                      Math.min(scenario.events.length, replayCount + 1),
                    )
                  }
                  size="small"
                  tone="ghost"
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </AppShell>
      )}
      <Dialog
        className="demo-raw-tool-output-dialog"
        description="Arguments and error returned by the integration."
        onOpenChange={(open) => {
          if (!open) setRawToolOutput(null);
        }}
        open={rawToolOutput !== null}
        title={
          rawToolOutput
            ? `${rawToolOutput.name} raw output`
            : "Raw tool call output"
        }
      >
        <pre className="demo-raw-tool-output">
          <code>{JSON.stringify(rawToolOutput?.value, null, 2)}</code>
        </pre>
      </Dialog>
      <FileRevertErrorDialog
        closeIcon={<CurrentBuildIcon name="review-close" />}
        onOpenChange={setFileRevertErrorOpen}
        open={fileRevertErrorOpen}
      />
    </div>
  );
}
