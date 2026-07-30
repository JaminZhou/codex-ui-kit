import {
  ActivityTimeline,
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentTurn,
  AppShell,
  AppNotificationRegion,
  AppRouteOutlet,
  AppSidebar,
  AppSidebarFooter,
  AppSidebarItem,
  AppSidebarSection,
  AppWindowChrome,
  ApprovalRequest,
  Button,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  ComposerContextBar,
  ComposerContextControl,
  ComposerDock,
  ConversationContextBar,
  ConversationProjectListbox,
  ConversationThreadShell,
  Dialog,
  FileChangeGroup,
  FileReview,
  LocalEnvironmentDialog,
  Menu,
  MenuItem,
  MenuSectionLabel,
  MenuSeparator,
  McpToolCallGroup,
  McpToolIcon,
  NewConversationStart,
  PullRequestCheckList,
  PullRequestList,
  PullRequestPanelSummary,
  QueuedPromptList,
  StatusBanner,
  TerminalSession,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadFloatingButton,
  ThreadMessageNavigationRail,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  ToolCallCard,
  TurnDuration,
  WorkspacePanel,
  type TerminalEntry,
  type AppRouteOutletStatus,
  type QueuedPrompt,
} from "codex-ui-kit";
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
  isTurnActive,
  reduceProtocolNotification,
  terminalTranscriptEvents,
  type DemoProtocolState,
  type ProtocolEventRecord,
} from "./protocol-state";
import { changeStats } from "./diff-lines";
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
  workspaceExecutionCwd,
} from "./workspace-replay";
import {
  hasMcpToolCallGroupForTurn,
  mcpToolCallGroupDurationMs,
  mcpToolCallGroupForEntry,
  mcpToolCallGroupStatus,
  mcpToolCallPresentation,
} from "./mcp-tool-call-view";

type DemoView = "conversation" | "pull-request" | "shell" | "workspace";

type SidebarGlyphName =
  | "automation"
  | "folder"
  | "more"
  | "new"
  | "pin"
  | "plugins"
  | "pull-request"
  | "search"
  | "settings"
  | "sites"
  | "thread";

function SidebarGlyph({ name }: { name: SidebarGlyphName }) {
  const path = {
    automation:
      "M8 2.25a5.75 5.75 0 1 1-4.07 1.68M8 4.75V8l2.15 1.45",
    folder:
      "M1.75 4.5h4l1.2 1.5h7.3v6.25a1.5 1.5 0 0 1-1.5 1.5H3.25a1.5 1.5 0 0 1-1.5-1.5V4.5Zm0 2h12.5",
    more: "M3.25 8h.01M8 8h.01M12.75 8h.01",
    new: "M3 13l.55-3.1L10.9 2.55a1.55 1.55 0 0 1 2.2 2.2L5.75 12.1 3 13Zm6.9-9.45 2.55 2.55",
    pin: "m5.25 2.5 5.5 5.5M9.6 1.6l4.8 4.8-2.15 1.05-3.7 3.7-1.05 2.15-4.8-4.8 2.15-1.05 3.7-3.7L9.6 1.6ZM8 11l-3 3",
    plugins:
      "M6.25 1.75v3M9.75 1.75v3M4.5 4.75h7v2.5A3.5 3.5 0 0 1 8 10.75v3.5M2 7.25h12",
    "pull-request":
      "M4 3.25v8.5M4 3.25a1.25 1.25 0 1 0 0 .01M4 11.75a1.25 1.25 0 1 0 0 .01M12 4.5a1.25 1.25 0 1 0 0 .01M12 5.75v2a4 4 0 0 1-4 4H6.5",
    search: "m11.5 11.5 2.75 2.75M13 7.25A5.75 5.75 0 1 1 1.5 7.25 5.75 5.75 0 0 1 13 7.25Z",
    settings:
      "M8 5.5A2.5 2.5 0 1 1 8 10.5 2.5 2.5 0 0 1 8 5.5Zm0-3.75.8 1.3 1.55.35 1.2-.95 2 2-.95 1.2.35 1.55 1.3.8-1.3.8-.35 1.55.95 1.2-2 2-1.2-.95-1.55.35L8 14.25l-.8-1.3-1.55-.35-1.2.95-2-2 .95-1.2-.35-1.55L1.75 8l1.3-.8.35-1.55-.95-1.2 2-2 1.2.95 1.55-.35L8 1.75Z",
    sites:
      "M2.25 2.25h4.5v4.5h-4.5v-4.5Zm7 0h4.5v4.5h-4.5v-4.5Zm-7 7h4.5v4.5h-4.5v-4.5Zm7 0h4.5v4.5h-4.5v-4.5Z",
    thread:
      "M2.25 3.25h11.5v7.5H7L3.25 13.5v-2.75h-1V3.25Z",
  }[name];
  return (
    <svg aria-hidden="true" className="demo-sidebar-glyph" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
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
  const layoutMode =
    params.get("layout") === "wide" ? ("wide" as const) : undefined;
  const view: DemoView =
    params.get("view") === "pull-request"
      ? "pull-request"
      : params.get("view") === "shell"
        ? "shell"
        : params.get("view") === "workspace"
          ? "workspace"
          : "conversation";
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
  return { capture, frame, layoutMode, scenarioId, shellState, view };
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
  "composer-disabled",
  "composer-idle",
  "composer-multiline",
  "composer-queue-paused",
  "composer-queued",
  "composer-running",
  "thread-scroll-away",
  "thread-windowed",
]);

function replayCountForSelection(
  scenario: ReplayScenario,
  frame: string | null,
) {
  if (frame && scenario.frames[frame]) return scenario.frames[frame];
  if (scenario.id !== "conversation-lifecycle" || !frame) {
    return scenario.events.length;
  }
  if (!conversationHostFrames.has(frame)) return scenario.events.length;
  if (frame === "composer-running" || frame === "composer-queued") {
    return scenario.frames["conversation-running"] ?? scenario.events.length;
  }
  return (
    scenario.frames["conversation-thread-ready"] ?? scenario.events.length
  );
}

function initialComposerValue(frame: string | null) {
  if (frame === "composer-multiline") {
    return [
      "Please compare the current runtime evidence,",
      "the computed Composer geometry,",
      "and the regional pixel gate.",
    ].join("\n");
  }
  if (frame === "composer-disabled") {
    return "Starting a deterministic lifecycle turn…";
  }
  return "";
}

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
        completedAt: null,
        durationMs: null,
        error: null,
        id: state.currentTurnId,
        items: [],
        itemsView: "full",
        startedAt: null,
        status: "interrupted",
      },
    },
  });
}

function statusLabel(state: DemoProtocolState) {
  if (state.status === "retrying") return "Retrying";
  if (state.status === "running") return "Working";
  if (state.status === "completed") return "Completed";
  if (state.status === "interrupted") return "Stopped";
  if (state.status === "failed") return "Failed";
  return "Ready";
}

function McpAnswer({ text }: { text: string }) {
  const [title = "", url = ""] = text.split(/\r?\n/, 2);
  return (
    <div className="demo-mcp-answer">
      <span>{title}</span>
      <a href={url} rel="noreferrer" target="_blank">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M1.8 8h12.4M8 1.5a10 10 0 0 1 0 13M8 1.5a10 10 0 0 0 0 13" />
        </svg>
        <span>{url}</span>
      </a>
    </div>
  );
}

function McpResponseActions({
  label = "MCP response actions",
}: {
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className="demo-mcp-turn-actions demo-turn-actions"
      role="toolbar"
    >
      <button aria-label="Copy response" type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <rect height="9" rx="1.5" width="8" x="5" y="2" />
          <path d="M10.5 13.5h-7a1 1 0 0 1-1-1v-7" />
        </svg>
      </button>
      <button aria-label="Good response" type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M5.2 13H3.5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1h1.7M5.2 13V6.5L8 2.8c.6-.8 1.8-.3 1.7.7l-.3 2h2.5a1.5 1.5 0 0 1 1.4 2L11.8 12a1.5 1.5 0 0 1-1.4 1H5.2Z" />
        </svg>
      </button>
      <button aria-label="Bad response" type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M5.2 3H3.5a1 1 0 0 0-1 1v4.5a1 1 0 0 0 1 1h1.7M5.2 3v6.5L8 13.2c.6.8 1.8.3 1.7-.7l-.3-2h2.5a1.5 1.5 0 0 0 1.4-2L11.8 4a1.5 1.5 0 0 0-1.4-1H5.2Z" />
        </svg>
      </button>
      <button aria-label="Share response" type="button">
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="M5 3H3.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1H12a1 1 0 0 0 1-1V11M8 8l5.5-5.5M9.5 2.5h4v4" />
        </svg>
      </button>
    </span>
  );
}

const pullRequestFiles = [
  {
    additions: 3,
    change: "modified" as const,
    deletions: 1,
    lines: [
      {
        content: "@@ -318,6 +318,8 @@ export interface AppShellProps",
        kind: "hunk" as const,
      },
      {
        content: "sidePanelOpen?: boolean;",
        kind: "context" as const,
        newLineNumber: 329,
        oldLineNumber: 329,
      },
      {
        content: "sidePanelResizable?: boolean;",
        kind: "addition" as const,
        newLineNumber: 330,
      },
      {
        content: "sidePanelResizeLabel?: string;",
        kind: "addition" as const,
        newLineNumber: 331,
      },
    ],
    path: "src/components/AppShell.tsx",
  },
  {
    additions: 5,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content: "@@ -243,6 +243,11 @@",
        kind: "hunk" as const,
      },
      {
        content: ".codex-ui-app-shell__side-panel-resizer {",
        kind: "addition" as const,
        newLineNumber: 245,
      },
      {
        content: "  cursor: col-resize;",
        kind: "addition" as const,
        newLineNumber: 246,
      },
    ],
    path: "src/styles.css",
  },
  {
    additions: 8,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content: "@@ -262,6 +262,14 @@ describe(\"application shell\", () => {",
        kind: "hunk" as const,
      },
      {
        content: "it(\"resizes the workspace track\", () => {",
        kind: "addition" as const,
        newLineNumber: 265,
      },
    ],
    path: "tests/app-shell.test.tsx",
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
    id: "unavailable",
    label: "archived-workspace",
    path: "/workspace/archived-workspace",
    status: "unavailable" as const,
    statusLabel: "Unavailable",
  },
];

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

const workspaceWorktreesByProject: Record<
  string,
  (typeof workspaceEnvironmentGroups)[number]["items"]
> = {
  "app-server-client": [workspaceEnvironmentGroups[0].items[0]],
  "codex-ui-kit": workspaceEnvironmentGroups[0].items,
  "desktop-shell": [workspaceEnvironmentGroups[0].items[0]],
  tooling: [workspaceEnvironmentGroups[0].items[0]],
};

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
  const [view, setView] = useState<DemoView>(initialSelection.view);
  const [workspaceProjectId, setWorkspaceProjectId] = useState<
    string | null
  >("codex-ui-kit");
  const [workspaceEnvironmentId, setWorkspaceEnvironmentId] =
    useState("local");
  const [workspaceWorktreeId, setWorkspaceWorktreeId] = useState(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-repairing"
      ? "repairing"
      : "main",
  );
  const [workspaceLocalEnvironmentOpen, setWorkspaceLocalEnvironmentOpen] =
    useState(
      initialSelection.view === "workspace" &&
        initialSelection.frame === "workspace-environment",
    );
  const [workspaceOverlay, setWorkspaceOverlay] = useState<
    "environment" | "project" | "worktree" | null
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
        : null,
  );
  const [workspaceBranchQuery, setWorkspaceBranchQuery] = useState("");
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
  const [composerValue, setComposerValue] = useState(() =>
    initialComposerValue(initialSelection.frame),
  );
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
  const [replayComposerStopped, setReplayComposerStopped] = useState(
    initialSelection.frame === "composer-queue-paused",
  );
  const [replayApprovalResolution, setReplayApprovalResolution] =
    useState<{
      decision: "approved" | "rejected";
      requestId: number | string;
    } | null>(null);
  const [workspaceRunCwd, setWorkspaceRunCwd] = useState(
    "/workspace/codex-ui-kit",
  );
  const [threadFollowing, setThreadFollowing] = useState(
    initialSelection.frame !== "thread-scroll-away",
  );
  const [activeFrame, setActiveFrame] = useState(initialSelection.frame);
  const [scenarioSelectionVersion, setScenarioSelectionVersion] =
    useState(0);
  const [windowedTimelineExpanded, setWindowedTimelineExpanded] =
    useState(false);
  const [liveStartPending, setLiveStartPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => initialSelection.capture || !isNarrowDemoWindow(),
  );
  const [reviewOpen, setReviewOpen] = useState(
    initialSelection.frame === "review-open" ||
      initialSelection.frame === "mixed-review-open",
  );
  const [terminalOpen, setTerminalOpen] = useState(
    initialSelection.scenarioId === "background-terminal",
  );
  const [terminalCommandId, setTerminalCommandId] = useState<string | null>(
    null,
  );
  const [terminalHeight, setTerminalHeight] = useState(272);
  const [terminalValue, setTerminalValue] = useState("");
  const [terminalHistoryByCommand, setTerminalHistoryByCommand] = useState<
    Record<string, TerminalEntry[]>
  >({});
  const [reviewSelection, setReviewSelection] =
    useState<ReviewSelection | null>(null);
  const [reviewSelectionKey, setReviewSelectionKey] = useState(0);
  const [rawToolOutput, setRawToolOutput] = useState<{
    name: string;
    value: unknown;
  } | null>(null);
  const [pullRequestExpanded, setPullRequestExpanded] = useState(false);
  const [pullRequestOpen, setPullRequestOpen] = useState(
    initialSelection.view === "pull-request",
  );
  const [pullRequestWidth, setPullRequestWidth] = useState(554);
  const [pullRequestTab, setPullRequestTab] = useState<
    "code" | "summary" | "timeline"
  >("summary");
  const [undoneFileIds, setUndoneFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveStartPendingRef = useRef(false);
  const workspaceEnvironmentTriggerRef =
    useRef<HTMLButtonElement>(null);
  const workspaceWorktreeTriggerRef = useRef<HTMLButtonElement>(null);
  const [workspaceEnvironmentLauncher, setWorkspaceEnvironmentLauncher] =
    useState<"environment" | "worktree">("environment");
  const queuedPromptCounterRef = useRef(1);
  const replaySubmitTimerRef = useRef<number | null>(null);
  const pendingMessageNavigationRef = useRef<{
    behavior: "instant" | "smooth";
    id: string;
  } | null>(null);
  const threadViewportRef = useRef<HTMLDivElement>(null);
  const liveApprovalSubmissionGateRef = useRef(
    new LiveApprovalSubmissionGate(),
  );
  const scenarioEvents = useMemo(
    () =>
      scenario.id === "workspace-workflow"
        ? contextualizeWorkspaceReplay(scenario.events, workspaceRunCwd)
        : scenario.events,
    [scenario, workspaceRunCwd],
  );
  const replay = useMemo(
    () => replayState(scenarioEvents, replayCount),
    [replayCount, scenarioEvents],
  );
  const isConversationLifecycle =
    mode === "replay" && scenarioId === "conversation-lifecycle";
  const lifecycleReplay = useMemo(
    () =>
      isConversationLifecycle && replayComposerStopped
        ? interruptConversationReplay(replay)
        : replay,
    [isConversationLifecycle, replay, replayComposerStopped],
  );
  const state = useMemo(
    () =>
      mode === "live"
        ? liveState
        : replayApprovalResolution
          ? reduceProtocolNotification(lifecycleReplay, {
              ...replayApprovalResolution,
              kind: "approval-resolution",
            })
          : lifecycleReplay,
    [
      lifecycleReplay,
      liveState,
      mode,
      replayApprovalResolution,
    ],
  );
  const replayComposerRunning =
    isConversationLifecycle && state.status === "running";

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
    const root = document.documentElement;
    root.dataset.theme = "dark";
    return () => {
      delete root.dataset.theme;
    };
  }, []);

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
    },
    [],
  );

  const cancelReplaySubmitTimer = () => {
    if (replaySubmitTimerRef.current === null) return;
    window.clearTimeout(replaySubmitTimerRef.current);
    replaySubmitTimerRef.current = null;
  };

  const selectReplayPosition = (nextCount: number) => {
    cancelReplaySubmitTimer();
    setActiveFrame(null);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayApprovalResolution(null);
    setQueueInterrupted(false);
    if (!isTurnActive(replayState(scenarioEvents, nextCount).status)) {
      setQueuedPrompts([]);
    }
    setReplayCount(nextCount);
  };

  const dismissSidebarAfterNavigation = () => {
    if (isNarrowDemoWindow()) setSidebarOpen(false);
  };

  const openWorkspace = (
    projectId: string | null = workspaceProjectId,
  ) => {
    cancelReplaySubmitTimer();
    setMode("replay");
    setView("workspace");
    setWorkspaceProjectId(projectId);
    setWorkspaceEnvironmentId("local");
    setWorkspaceWorktreeId("main");
    setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceOverlay(null);
    setWorkspaceBranchQuery("");
    setWorkspaceEnvironmentQuery("");
    setWorkspaceProjectQuery("");
    setWorkspaceProjectTriggerId("demo-workspace-project-trigger");
    setComposerValue("");
    setReplayApprovalResolution(null);
    setActiveFrame("workspace-ready");
    setReviewOpen(false);
    setTerminalOpen(false);
    setPullRequestOpen(false);
    dismissSidebarAfterNavigation();
  };

  const selectScenario = (
    nextId: ReplayScenarioId,
    frame: string | null = null,
  ) => {
    cancelReplaySubmitTimer();
    setView("conversation");
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(
      replayCountForSelection(replayScenarios[nextId], frame),
    );
    setComposerValue("");
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayApprovalResolution(null);
    setActiveFrame(frame);
    setScenarioSelectionVersion((version) => version + 1);
    setWindowedTimelineExpanded(false);
    pendingMessageNavigationRef.current = null;
    setReviewOpen(false);
    setReviewSelection(null);
    setTerminalOpen(nextId === "background-terminal");
    setTerminalCommandId(null);
    setTerminalHeight(272);
    setTerminalValue("");
    setTerminalHistoryByCommand({});
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
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayApprovalResolution(null);
    setWorkspaceOverlay(null);
    setWorkspaceLocalEnvironmentOpen(false);
  };

  const respondToApproval = async (
    requestId: number | string,
    decision: "accept" | "decline",
  ) => {
    if (mode === "replay") {
      if (scenario.id === "workspace-workflow" && decision === "accept") {
        setReplayApprovalResolution(null);
        setReplayCount(scenario.events.length);
        setActiveFrame(null);
      } else {
        setReplayApprovalResolution({
          decision: decision === "accept" ? "approved" : "rejected",
          requestId,
        });
        setActiveFrame(
          decision === "accept"
            ? "approval-approved"
            : "approval-rejected",
        );
      }
      return;
    }
    const submissionGate = liveApprovalSubmissionGateRef.current;
    if (!submissionGate.begin(requestId)) return;
    try {
      await window.codexDemo?.respondToApproval({ decision, requestId });
      dispatchLive({
        decision: decision === "accept" ? "approved" : "rejected",
        kind: "approval-resolution",
        requestId,
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
    setQueueInterrupted(false);
    setReplayCount(
      replayScenarios["conversation-lifecycle"].frames[
        "conversation-running"
      ] ?? replayScenarios["conversation-lifecycle"].events.length,
    );
  };

  const submitComposer = (prompt: string) => {
    if (!isConversationLifecycle) {
      void submitLive(prompt);
      return;
    }
    setActiveFrame(null);
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

  const stopComposer = () => {
    if (!isConversationLifecycle) {
      void stopLive();
      return;
    }
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(true);
    if (queuedPrompts.length > 0) {
      setQueueInterrupted(true);
    }
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

  const returnToLatest = useCallback(() => {
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      behavior: "smooth",
      top: viewport.scrollHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (scenarioSelectionVersion === 0) return;
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    let resetFrame = 0;
    const layoutFrame = window.requestAnimationFrame(() => {
      resetFrame = window.requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
    });
    return () => {
      window.cancelAnimationFrame(layoutFrame);
      window.cancelAnimationFrame(resetFrame);
    };
  }, [scenarioSelectionVersion]);

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

  useEffect(() => {
    if (!windowedTimelineExpanded) return;
    const pendingNavigation = pendingMessageNavigationRef.current;
    if (!pendingNavigation) return;
    pendingMessageNavigationRef.current = null;
    scrollToMessage(pendingNavigation.id, pendingNavigation.behavior);
  }, [scrollToMessage, windowedTimelineExpanded]);

  const lastEvent = scenario.events[Math.max(0, replayCount - 1)];
  const sidebar = (
    <AppSidebar
      footer={
        <AppSidebarFooter
          account="Demo account"
          accountAvatar={<span className="demo-sidebar-avatar">D</span>}
          accountButtonProps={{
            "aria-expanded": false,
            "aria-haspopup": "menu",
          }}
          actions={
            <button aria-label="Open settings" type="button">
              <SidebarGlyph name="settings" />
            </button>
          }
        />
      }
      header={
        <div className="demo-sidebar-header">
          <div className="demo-sidebar-brand-row">
            <button
              aria-expanded={false}
              aria-haspopup="menu"
              className="demo-sidebar-brand"
              type="button"
            >
              Codex
              <span aria-hidden="true">⌄</span>
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
      }
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
          <AppSidebarItem leading={<SidebarGlyph name="plugins" />}>
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
          leading={<SidebarGlyph name="folder" />}
          status={hasActiveTurnWork(state) ? "running" : "idle"}
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
          onClick={() => selectScenario("mcp-tool-call")}
          status="unread"
          statusLabel="Unread update"
        >
          MCP tool validation
        </AppSidebarItem>
      </AppSidebarSection>
      <AppSidebarSection
        actions={
          <button
            aria-label="New project"
            className="demo-sidebar-section-action"
            type="button"
          >
            +
          </button>
        }
        collapsible
        defaultExpanded={false}
        kind="projects"
        title="Projects"
        toggleLabel="Toggle projects"
      >
        <AppSidebarItem
          leading={<SidebarGlyph name="folder" />}
          onClick={() => openWorkspace("codex-ui-kit")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "codex-ui-kit"
          }
        >
          codex-ui-kit
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder" />}
          onClick={() => openWorkspace("app-server-client")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "app-server-client"
          }
        >
          codex-app-server-client
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder" />}
          status="queued"
          statusLabel="Project task queued"
        >
          protocol-client-with-an-intentionally-long-worktree-name
        </AppSidebarItem>
      </AppSidebarSection>
      <AppSidebarSection
        collapsible
        kind="threads"
        title="Recents"
        toggleLabel="Toggle recent tasks"
      >
        {(Object.values(replayScenarios) as ReplayScenario[]).map((item, index) => (
          <AppSidebarItem
            actions={
              <button
                aria-label={`Sidebar actions for ${item.label}`}
                type="button"
              >
                <SidebarGlyph name="more" />
              </button>
            }
            actionsLabel={`Sidebar task actions for ${item.label}`}
            key={item.id}
            leading={<SidebarGlyph name="thread" />}
            onClick={() => selectScenario(item.id)}
            selected={
              view === "conversation" &&
              mode === "replay" &&
              scenarioId === item.id
            }
            status={
              index === 1
                ? "queued"
                : index === 2
                  ? "error"
                  : index === 3
                    ? "unread"
                    : "idle"
            }
            statusLabel={
              index === 1
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
      : isConversationLifecycle && replayComposerRunning;
  const composerIsDisabled =
    liveStartPending ||
    (isConversationLifecycle && replayComposerSubmitting);
  const displayedStatus =
    isConversationLifecycle && replayComposerStopped
      ? "interrupted"
      : composerIsRunning
        ? "running"
        : state.status;
  const composerPhase = composerIsDisabled
    ? "submitting"
    : composerIsRunning
      ? queuedPrompts.length > 0
        ? "queued"
        : "running"
      : queueInterrupted
        ? "queue-paused"
        : activeFrame === "composer-attachment"
          ? "attachment"
          : composerValue.includes("\n")
            ? "multiline"
            : "idle";
  const header = (
    <ThreadHeader
      endActions={
        <div className="demo-header-actions">
          <span className="demo-status" data-status={displayedStatus}>
            {replayStatusLabel(
              state.status,
              composerIsRunning,
              isConversationLifecycle && replayComposerStopped,
            )}
          </span>
          {scenarioId === "background-terminal" ? (
            <Button
              aria-label="Toggle bottom panel"
              aria-pressed={terminalOpen}
              onClick={() => setTerminalOpen((open) => !open)}
              size="small"
              tone="ghost"
            >
              ▱
            </Button>
          ) : null}
          <Button
            onClick={() => selectMode(mode === "replay" ? "live" : "replay")}
            size="small"
            tone="ghost"
          >
            {mode === "replay" ? "Live" : "Replay"}
          </Button>
        </div>
      }
      navigation={
        <Button
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          size="small"
          tone="ghost"
        >
          ☰
        </Button>
      }
      subtitle={
        mode === "replay"
          ? `${scenario.id} · ${replayCount}/${scenario.events.length} events`
          : state.threadId ?? "Local app-server"
      }
      title={mode === "replay" ? scenario.label : "Live local thread"}
    />
  );

  const showMeasuredComposer =
    mode === "replay" &&
    (scenarioId === "multi-file-review" ||
      scenarioId === "markdown" ||
      scenarioId === "mcp-tool-call" ||
      scenarioId === "mcp-recovery-mixed-thread");
  const showLifecycleComposer = isConversationLifecycle;
  const composerSurface = (
    <AgentComposer
      actions={
        showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-controls">
            <button aria-label="Add files and more" type="button">
              +
            </button>
            <button aria-label="Change permissions" type="button">
              ◉ Approve for me
            </button>
          </span>
        ) : undefined
      }
      allowSubmitWhileRunning={showLifecycleComposer}
      aria-busy={composerIsDisabled || undefined}
      attachments={
        showLifecycleComposer &&
        activeFrame === "composer-attachment" ? (
          <ComposerAttachment
            kind="file"
            label="current-build-composer-notes.md"
            layout="card"
            meta="Markdown · 4 KB"
            onOpen={() => undefined}
            onRemove={() => setActiveFrame(null)}
          />
        ) : undefined
      }
      controls={
        showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-actions">
            <span>5.6 Sol Extra High⌄</span>
            <button aria-label="Dictate" type="button">
              ♫
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
        showMeasuredComposer || showLifecycleComposer
          ? "Do anything"
          : mode === "live"
          ? "Ask Codex to inspect this repository…"
          : "Switch to Live to send a real local turn…"
      }
      stopLabel="Stop"
      textareaLabel="Message composer"
      value={composerValue}
    />
  );
  const composer = showLifecycleComposer ? (
    <ComposerDock
      composer={composerSurface}
      context={
        !composerIsRunning && !queueInterrupted ? (
          <ComposerContextBar>
            <ComposerContextControl icon="□">
              codex-ui-kit
            </ComposerContextControl>
            <ComposerContextControl icon="◉">Local</ComposerContextControl>
            <ComposerContextControl icon="⑂">main</ComposerContextControl>
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

  const workspaceProject =
    workspaceProjectId === null
      ? undefined
      : (workspaceProjects.find(
          ({ id }) => id === workspaceProjectId,
        ) ?? workspaceProjects[0]);
  const workspaceWorktrees =
    (workspaceProjectId
      ? workspaceWorktreesByProject[workspaceProjectId]
      : undefined) ?? [workspaceEnvironmentGroups[0].items[0]];
  const workspaceWorktree =
    workspaceWorktrees.find(
      ({ id }) => id === workspaceWorktreeId,
    ) ?? workspaceWorktrees[0];
  const currentWorkspaceCwd = workspaceExecutionCwd({
    environmentId: workspaceEnvironmentId,
    projectPath: workspaceProject?.path,
    worktreeBranch: workspaceWorktree.branch,
    worktreeId: workspaceWorktreeId,
  });
  const filteredWorkspaceProjects = workspaceProjects.filter(({ label }) =>
    label
      .toLocaleLowerCase()
      .includes(workspaceProjectQuery.trim().toLocaleLowerCase()),
  );
  const filteredWorkspaceWorktrees =
    workspaceWorktrees.filter(
      ({ branch, label, status }) =>
        status !== "repairing" &&
        `${branch} ${label}`
          .toLocaleLowerCase()
          .includes(workspaceBranchQuery.trim().toLocaleLowerCase()),
    );
  useEffect(() => {
    if (view === "workspace" && workspaceLocalEnvironmentOpen) {
      setActiveFrame("workspace-environment");
    }
  }, [view, workspaceLocalEnvironmentOpen]);
  const setWorkspaceOverlayState = (
    overlay: "environment" | "project" | "worktree" | null,
  ) => {
    if (overlay) setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceOverlay(overlay);
    setActiveFrame(
      overlay === "project"
        ? "workspace-project-menu"
        : overlay === "environment"
          ? "workspace-environment-menu"
          : overlay === "worktree"
            ? "workspace-worktree-menu"
            : "workspace-ready",
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
  const workspaceContext = (
    <>
      <ConversationContextBar
        expandedId={workspaceOverlay ?? undefined}
        items={[
          {
            controlsId: "demo-workspace-project-dialog",
            icon: <SidebarGlyph name="folder" />,
            id: "project",
            kind: "project",
            label: workspaceProject?.label ?? "No project",
            popupRole: "dialog",
            textValue: workspaceProject?.label ?? "No project",
            triggerId: "demo-workspace-project-trigger",
          },
          {
            controlsId: "demo-workspace-environment-menu",
            icon: "▱",
            id: "environment",
            kind: "environment",
            label:
              workspaceEnvironmentId === "local"
                ? "Local"
                : workspaceEnvironmentId === "worktree"
                  ? "New worktree"
                  : "Codex web",
            popupRole: "menu",
          },
          {
            controlsId: "demo-workspace-worktree-menu",
            icon: "⑂",
            id: "worktree",
            kind: "worktree",
            label: workspaceWorktree.branch,
            popupRole: "menu",
            status: workspaceWorktree.status,
            statusLabel: workspaceWorktree.statusLabel,
          },
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
                label="Start in"
                onOpenChange={(open) =>
                  setWorkspaceOverlayState(open ? "environment" : null)
                }
                open={workspaceOverlay === "environment"}
                side="top"
                sideOffset={1}
                trigger={environmentTrigger}
                width="auto"
              >
                <MenuSectionLabel>Start in</MenuSectionLabel>
                <MenuItem
                  aria-checked={workspaceEnvironmentId === "local"}
                  endIcon={
                    workspaceEnvironmentId === "local" ? "✓" : undefined
                  }
                  onSelect={() => setWorkspaceEnvironmentId("local")}
                  role="menuitemradio"
                  startIcon="▱"
                >
                  Work locally
                </MenuItem>
                <MenuItem
                  aria-checked={workspaceEnvironmentId === "worktree"}
                  endIcon={
                    workspaceEnvironmentId === "worktree" ? "✓" : undefined
                  }
                  onSelect={() => {
                    openWorkspaceLocalEnvironment("environment");
                  }}
                  role="menuitemradio"
                  startIcon="↗"
                >
                  New worktree
                </MenuItem>
                <MenuItem
                  aria-checked={workspaceEnvironmentId === "cloud"}
                  endIcon={
                    workspaceEnvironmentId === "cloud" ? "✓" : "↗"
                  }
                  onSelect={() => setWorkspaceEnvironmentId("cloud")}
                  role="menuitemradio"
                  startIcon="◌"
                >
                  Connect Codex web
                </MenuItem>
                <MenuItem disabled startIcon="⌁">
                  Send to cloud
                </MenuItem>
                <MenuSeparator />
                <MenuItem endIcon="›" startIcon="◔">
                  Usage remaining
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
                {filteredWorkspaceWorktrees.map((worktree) => (
                  <MenuItem
                    aria-checked={worktree.id === workspaceWorktreeId}
                    endIcon={
                      worktree.id === workspaceWorktreeId ? "✓" : undefined
                    }
                    key={worktree.id}
                    onSelect={() => {
                      if (workspaceEnvironmentId === "worktree") {
                        setWorkspaceEnvironmentId("local");
                      }
                      setWorkspaceWorktreeId(worktree.id);
                    }}
                    role="menuitemradio"
                    startIcon="⑂"
                  >
                    {worktree.branch}
                  </MenuItem>
                ))}
                <span
                  aria-hidden="true"
                  className="demo-workspace-worktree-menu__spacer"
                />
                <MenuSeparator />
                <MenuItem
                  onSelect={() =>
                    openWorkspaceLocalEnvironment("worktree")
                  }
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
              setWorkspaceProjectId(projectId);
              setWorkspaceEnvironmentId("local");
              setWorkspaceWorktreeId("main");
              setWorkspaceOverlayState(null);
              setWorkspaceProjectQuery("");
            }}
            selectedId={workspaceProjectId ?? undefined}
            triggerId={workspaceProjectTriggerId}
          />
          <div className="demo-workspace-project-dialog__actions">
            <button type="button">
              <span aria-hidden="true">＋</span>
              New project
            </button>
            <button
              onClick={() => {
                setWorkspaceProjectId(null);
                setWorkspaceEnvironmentId("local");
                setWorkspaceWorktreeId("main");
                setWorkspaceOverlayState(null);
                setWorkspaceProjectQuery("");
                window.setTimeout(() =>
                  document
                    .getElementById(workspaceProjectTriggerId)
                    ?.focus(),
                );
              }}
              type="button"
            >
              <span aria-hidden="true">⊘</span>
              Don&apos;t work in a project
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
  const workspaceComposer = (
    <AgentComposer
      actions={
        <span className="demo-composer-controls">
          <button aria-label="Add files and more" type="button">
            +
          </button>
          <button aria-label="Change permissions" type="button">
            ◉ Approve for me
          </button>
        </span>
      }
      controls={
        <span className="demo-composer-actions">
          <span>5.6 Sol Extra High⌄</span>
          <button aria-label="Dictate" type="button">
            ♫
          </button>
        </span>
      }
      layout="multiline"
      onSubmit={() => {
        setWorkspaceRunCwd(currentWorkspaceCwd);
        selectScenario("workspace-workflow", "approval-pending")
      }}
      onValueChange={setComposerValue}
      placeholder="Do anything"
      textareaLabel="Workspace message composer"
      value={composerValue}
    />
  );
  const workspaceRoute = (
    <div className="demo-workspace-route">
      <NewConversationStart
        className="demo-workspace-start"
        composer={workspaceComposer}
        context={workspaceContext}
        destination={
          <>
            What should we build in{" "}
            <button
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
              {workspaceProject?.label ?? "No project"}?
            </button>
          </>
        }
        eyebrow={
          <span aria-hidden="true" className="demo-workspace-mark">
            ⌁
          </span>
        }
        label="New coding workspace"
        prompt={
          <button
            onClick={() =>
              setComposerValue(
                "Review the current workspace changes and prepare delivery.",
              )
            }
            type="button"
          >
            <span aria-hidden="true">◌</span>
            <span>Review the current workspace changes</span>
            <span aria-hidden="true">→</span>
          </button>
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
        groups={workspaceEnvironmentGroups}
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
          setWorkspaceProjectId(groupId);
          setWorkspaceEnvironmentId("local");
          setWorkspaceWorktreeId(itemId);
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
    </div>
  );

  const resolvedReview = resolveReviewSelection(
    state.fileChanges,
    reviewSelection,
  );
  const reviewFileChange = resolvedReview?.fileChange;
  const reviewFiles = useMemo(
    () =>
      reviewFileChange?.changes.map((change) => {
        const stats = changeStats(change);
        return {
          ...change,
          ...stats,
          change: change.kind,
          lines:
            change.kind === "added"
              ? stats.lines.filter(({ kind }) => kind !== "hunk")
              : stats.lines,
        };
      }) ?? [],
    [reviewFileChange],
  );
  const reviewTotals = reviewFiles.reduce(
    (totals, file) => ({
      additions: totals.additions + file.additions,
      deletions: totals.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 },
  );
  const reviewPanel = reviewFileChange ? (
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
                  <strong>Last turn</strong>
                  <span>
                    {reviewFiles.length}{" "}
                    {reviewFiles.length === 1 ? "file" : "files"}
                  </span>
                </div>
                <span className="demo-review-panel__stats">
                  +{reviewTotals.additions} −{reviewTotals.deletions}
                </span>
              </div>
              <FileReview
                aria-label="Last turn file review"
                files={reviewFiles}
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
  ) : null;
  const pullRequestSummary = (
    <PullRequestPanelSummary
      checks={
        <PullRequestCheckList
          checks={[
            {
              id: "electron",
              name: "Codex app Electron acceptance",
              status: "passed",
            },
            { id: "check", name: "check", status: "passed" },
            { id: "codeql", name: "CodeQL", status: "passed" },
            {
              id: "react-nodenext",
              name: "React 19 / NodeNext consumer",
              status: "passed",
            },
          ]}
        />
      }
      className="demo-pr-panel__summary"
      commentComposer={
        <label className="demo-pr-comment">
          <span>Comment</span>
          <textarea
            aria-label="Pull request comment"
            placeholder="Leave a comment"
          />
          <button aria-label="Post comment" type="button">
            ↑
          </button>
        </label>
      }
      description={
        <div className="demo-pr-description">
          <h3>Summary</h3>
          <ul>
            <li>Add controlled and uncontrolled Review workspace resizing.</li>
            <li>Preserve the measured panel and conversation constraints.</li>
            <li>Gate pointer, keyboard, compact, Electron, and pixels.</li>
          </ul>
          <h3>Verification</h3>
          <ul>
            <li>Focused component and accessibility tests.</li>
            <li>CDP, Electron, and pixel acceptance.</li>
          </ul>
        </div>
      }
      descriptionAction={
        <button aria-label="Edit description" type="button">
          ✎
        </button>
      }
      facts={[
        {
          id: "branch",
          indicator: "⑂",
          label: "Branch",
          value: (
            <>
              feat/review-panel-workspace → main{" "}
              <span className="demo-pr-additions">+637</span>{" "}
              <span className="demo-pr-deletions">−14</span>
            </>
          ),
        },
        {
          id: "reviewers",
          indicator: "◎",
          label: "Reviewers",
          value: "1 reviewer",
        },
        {
          id: "comments",
          indicator: "◌",
          label: "Comments",
          value: "3 comments",
        },
        {
          id: "checks",
          indicator: "○",
          label: "Checks",
          tone: "success",
          value: "Successful",
        },
      ]}
      meta={
        <>
          <span className="demo-pr-avatar demo-pr-avatar--small">J</span>
          <span>JaminZhou</span>
          <span>·</span>
          <span>now</span>
          <span>·</span>
          <span>Ready for review</span>
        </>
      }
      title="feat: add resizable review workspace"
      titleAction={
        <button aria-label="Edit title" type="button">
          ✎
        </button>
      }
    />
  );
  const pullRequestTimeline = (
    <div className="demo-pr-panel__timeline">
      <article>
        <span aria-hidden="true" className="demo-pr-avatar">
          J
        </span>
        <div>
          <strong>JaminZhou opened this pull request</strong>
          <time dateTime="PT1M">now</time>
        </div>
      </article>
      <label className="demo-pr-comment">
        <span>Comment</span>
        <textarea
          aria-label="Timeline comment"
          placeholder="Leave a comment"
        />
        <button aria-label="Post timeline comment" type="button">
          ↑
        </button>
      </label>
    </div>
  );
  const pullRequestCode = (
    <div className="demo-pr-panel__code">
      <div aria-label="Code review controls" className="demo-pr-code-toolbar">
        <span>
          <strong>feat/review-panel-workspace</strong>
          <small>into main</small>
        </span>
        <button aria-label="Review options" type="button">
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
      </div>
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
          <button aria-label="More pull request actions" type="button">
            ⋯
          </button>
          <button disabled type="button">
            Merge
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
        { content: pullRequestTimeline, id: "timeline", label: "Timeline" },
        { content: pullRequestCode, id: "code", label: "Code" },
      ]}
      tabsLabel="Pull request view"
    />
  );
  const pullRequestIndex = (
    <section aria-label="Pull requests" className="demo-pr-index">
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
          defaultValue="69"
          placeholder="Search pull requests"
          type="search"
        />
        <button aria-label="Filter pull requests" type="button">
          ≡
        </button>
      </div>
      <h2>Authored</h2>
      <PullRequestList
        items={[
          {
            author: "JaminZhou",
            checkStatus: "passed",
            commentCount: 3,
            id: "69",
            indicator: (
              <span className="demo-pr-branch-indicator">
                ⑂<i />
              </span>
            ),
            number: 69,
            repository: "codex-ui-kit",
            state: "open",
            title: "feat: add resizable review workspace",
            updatedAt: "11m",
          },
        ]}
        onSelect={() => setPullRequestOpen(true)}
        selectedId={pullRequestOpen ? "69" : undefined}
      />
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
  const messageNavigationItems = state.messages
    .filter(({ role }) => role === "user")
    .map((message) => ({
      id: message.id,
      label: message.text,
    }));
  const windowedTimeline =
    isConversationLifecycle &&
    activeFrame === "thread-windowed" &&
    !windowedTimelineExpanded;
  const indexedTimeline = state.timeline.map((entry, entryIndex) => ({
    entry,
    entryIndex,
  }));
  const hiddenTimelineEntryCount = windowedTimeline
    ? Math.max(0, indexedTimeline.length - 8)
    : 0;
  const visibleTimeline = indexedTimeline.slice(hiddenTimelineEntryCount);
  const timelineContent = visibleTimeline.map(({ entry, entryIndex }) => {
    if (entry.kind === "message") {
      const message = state.messages.find(({ id }) => id === entry.id);
      if (!message) return null;
      if (
        scenarioId === "mcp-recovery-mixed-thread" &&
        message.id === "assistant-recovery-intro" &&
        hasMcpToolCallGroupForTurn(state, message.turnId)
      ) {
        return null;
      }
      return (
        <Fragment key={`message:${message.id}`}>
          <AgentMessage
            actions={
              mode === "replay" &&
              ((scenarioId === "markdown" &&
                message.id === "assistant-markdown") ||
                (scenarioId === "mcp-tool-call" &&
                  message.id === "assistant-mcp") ||
                (scenarioId === "mcp-recovery-mixed-thread" &&
                  (message.id === "assistant-recovery" ||
                    message.id === "assistant-workflow"))) &&
              message.status === "completed" ? (
                scenarioId === "mcp-tool-call" ||
                scenarioId === "mcp-recovery-mixed-thread" ? (
                  <McpResponseActions
                    label={
                      message.id === "assistant-workflow"
                        ? "Response actions"
                        : undefined
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
            data-item-id={message.id}
            role={message.role}
            status={agentMessageStatus(message.status)}
          >
            {message.role === "assistant" &&
            scenarioId === "mcp-tool-call" &&
            message.id === "assistant-mcp" ? (
              <McpAnswer text={message.text} />
            ) : message.role === "assistant" ? (
              <AgentMarkdown
                linkTarget="_blank"
                streaming={message.status === "running"}
              >
                {message.text || " "}
              </AgentMarkdown>
            ) : (
              message.text
            )}
          </AgentMessage>
          {message.interruptionDurationMs !== undefined ? (
            <ThreadInterruptionSummary
              durationMs={message.interruptionDurationMs ?? 0}
              label={
                message.interruptionDurationMs === null
                  ? "You stopped this response"
                  : undefined
              }
              stoppedLabel={(time) =>
                `You stopped this response after ${time}`
              }
            />
          ) : null}
          {message.compaction ? (
            <ThreadContextEvent
              mode="automatic"
              status={message.compaction}
            />
          ) : null}
          {mode === "replay" &&
          scenarioId === "multi-file-review" &&
          message.id === "user-multi-file" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={24_000} status="worked" />}
            />
          ) : null}
        </Fragment>
      );
    }

    if (entry.kind === "mcpToolCall") {
      const calls = mcpToolCallGroupForEntry(state, entryIndex);
      if (!calls) return null;
      const toolCall = calls[0];
      const recoveryIntro =
        scenarioId === "mcp-recovery-mixed-thread"
          ? state.messages.find(
              ({ id }) => id === "assistant-recovery-intro",
            )
          : undefined;
      const groupStatus = mcpToolCallGroupStatus(calls);
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
          key={`mcp-group:${toolCall.turnId}:${toolCall.server}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={durationMs}
              status={
                groupStatus === "running" ||
                state.currentTurnId === toolCall.turnId
                  ? "working"
                  : "worked"
              }
            />
          }
        >
          {recoveryIntro ? (
            <AgentMessage
              className="demo-mcp-recovery-intro"
              data-item-id={recoveryIntro.id}
              role="assistant"
              status={agentMessageStatus(recoveryIntro.status)}
            >
              <AgentMarkdown>{recoveryIntro.text}</AgentMarkdown>
            </AgentMessage>
          ) : null}
          <McpToolCallGroup
            data-testid="mcp-tool-call-group"
            defaultOpen={false}
            name={toolCall.appName}
            open={initialSelection.capture ? captureOpen : undefined}
            source={toolCall.server}
            status={groupStatus}
          >
            {calls.map((call) => {
              const presentation = mcpToolCallPresentation(call);
              return (
                <ToolCallCard
                  data-item-id={call.id}
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
                  icon={<McpToolIcon />}
                  name={call.toolLabel}
                  open={
                    initialSelection.capture &&
                    call.id === "mcp-fetch-invalid" &&
                    (activeFrame === "mcp-recovery-failed" ||
                      activeFrame === "mcp-recovery-completed")
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

    if (entry.kind === "command") {
      const command = state.commands.find(({ id }) => id === entry.id);
      if (!command) return null;
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
                  setTerminalCommandId(command.id);
                  setTerminalValue("");
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
    const indicator = (
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
              setReviewOpen(true);
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
          detail={detail}
          indicator={indicator}
          onOpenFile={(change) => {
            setReviewSelectionKey((current) => current + 1);
            setReviewSelection({
              fileChangeId: fileChange.id,
              path: change.path,
            });
            setReviewOpen(true);
          }}
          status={fileChange.status}
        />
        {mode === "replay" && fileChange.id === "file-multi-file" ? (
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
            <time dateTime="14:39">2:39 PM</time>
          </div>
        ) : null}
      </Fragment>
    );
  });
  const activeTurnHasWork = hasActiveTurnWork(state);
  const terminalCommands = state.commands.filter(({ processId }) =>
    Boolean(processId),
  );
  const terminalCommand =
    terminalCommands.find(({ id }) => id === terminalCommandId) ??
    terminalCommands.at(-1);
  const terminalHistoryKey = terminalCommand?.id ?? "unbound";
  const terminalHistory =
    terminalHistoryByCommand[terminalHistoryKey] ?? [];
  const terminalEntries = useMemo<TerminalEntry[]>(() => {
    if (!terminalCommand) return terminalHistory;
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
                    text: terminalCommand.terminalInput.replace(/\n$/, ""),
                  },
                ]
              : []),
          ];
    return [
      {
        id: `${terminalCommand.id}:command`,
        kind: "command",
        text: `${terminalCommand.cwd} % ${terminalCommand.command}`,
      },
      ...protocolEntries,
      ...terminalHistory,
    ];
  }, [terminalCommand, terminalHistory]);
  const terminalPanel = (
    <WorkspacePanel
      activeTabId="terminal"
      className="demo-terminal-panel"
      data-testid="terminal-panel"
      label="Terminal"
      onActiveTabChange={() => undefined}
      onClose={() => setTerminalOpen(false)}
      onOpenTab={() => setTerminalOpen(true)}
      openTabLabel="New terminal"
      placement="bottom"
      tabs={[
        {
          content: (
            <TerminalSession
              data-testid="terminal-session"
              entries={terminalEntries}
              label="Background terminal"
              onCommandSubmit={(command) => {
                setTerminalHistoryByCommand((historyByCommand) => {
                  const entries =
                    historyByCommand[terminalHistoryKey] ?? [];
                  return {
                    ...historyByCommand,
                    [terminalHistoryKey]: [
                      ...entries,
                      {
                        id: `${terminalHistoryKey}:local:${entries.length}:command`,
                        kind: "command",
                        text: `${terminalCommand?.cwd ?? workspaceRunCwd} % ${command}`,
                      },
                      {
                        id: `${terminalHistoryKey}:local:${entries.length}:system`,
                        kind: "system",
                        text: "Replay input is host-owned and was not executed.",
                      },
                    ],
                  };
                });
                setTerminalValue("");
              }}
              onValueChange={setTerminalValue}
              status={
                terminalCommand?.status === "running"
                  ? "running"
                  : terminalCommand?.status === "failed"
                    ? "failed"
                    : terminalCommand?.status === "completed"
                      ? "exited"
                      : "idle"
              }
              value={terminalValue}
            />
          ),
          id: "terminal",
          label: (
            <span className="demo-terminal-tab-label">
              <span aria-hidden="true">▣</span>
              <span>codex-ui-kit</span>
              <span aria-hidden="true">×</span>
            </span>
          ),
        },
      ]}
      tabsLabel="Terminal tabs"
    />
  );
  const messageNavigation = isConversationLifecycle ? (
    <ThreadMessageNavigationRail
      items={messageNavigationItems}
      minItems={10}
      onNavigate={(item, behavior) => {
        if (scrollToMessage(item.id, behavior)) return;
        if (windowedTimeline) {
          pendingMessageNavigationRef.current = {
            behavior,
            id: item.id,
          };
          setWindowedTimelineExpanded(true);
        }
      }}
    />
  ) : undefined;
  const floatingControl = isConversationLifecycle ? (
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
      data-composer-phase={isConversationLifecycle ? composerPhase : undefined}
      data-queue-count={
        isConversationLifecycle ? queuedPrompts.length : undefined
      }
      data-queueing-enabled={
        isConversationLifecycle ? queueingEnabled : undefined
      }
      data-scenario={scenarioId}
      data-status={displayedStatus}
      data-thread-following={
        isConversationLifecycle ? threadFollowing : undefined
      }
      data-windowed-timeline={
        isConversationLifecycle &&
        activeFrame === "thread-windowed"
          ? windowedTimeline
            ? "trimmed"
            : "expanded"
          : undefined
      }
      data-shell-state={view === "shell" ? shellState : undefined}
      data-view={view}
    >
      <AppNotificationRegion
        notifications={
          view === "shell" && shellNotificationVisible
            ? [
                {
                  description: "Pull requests are up to date.",
                  heading: "Connection restored",
                  id: "shell-restored",
                  onDismiss: () => setShellNotificationVisible(false),
                  tone: "info",
                },
              ]
            : []
        }
        position="bottom-end"
      />
      <AppShell
        bottomPanel={terminalPanel}
        bottomPanelHeight={terminalHeight}
        bottomPanelLabel="Terminal"
        bottomPanelOpen={terminalOpen}
        bottomPanelResizable
        bottomPanelResizeLabel="Resize bottom panel"
        onBottomPanelHeightChange={setTerminalHeight}
        layoutMode={
          initialSelection.capture ||
          initialSelection.layoutMode === "wide"
            ? "wide"
            : undefined
        }
        narrowSidebarBehavior="current-build"
        onSidebarOpenChange={setSidebarOpen}
        onSidePanelOpenChange={
          view === "pull-request" ? setPullRequestOpen : setReviewOpen
        }
        onSidePanelWidthChange={
          view === "pull-request" ? setPullRequestWidth : undefined
        }
        responsivePanelContinuity={!initialSelection.capture}
        responsivePanelContinuityKey={`${mode}:${view}:${scenarioId}`}
        sidePanel={
          view === "pull-request" ? pullRequestPanel : reviewPanel
        }
        sidePanelExpanded={
          view === "pull-request" && pullRequestExpanded
        }
        sidePanelLabel={
          view === "pull-request" ? "Pull request details" : "Review"
        }
        sidePanelOpen={
          view === "pull-request"
            ? pullRequestOpen
            : reviewOpen && Boolean(reviewPanel)
        }
        sidePanelResizable
        sidePanelWidth={
          view === "pull-request" ? pullRequestWidth : undefined
        }
        sidebar={sidebar}
        sidebarOpen={sidebarOpen}
        sidebarResizable
        windowChrome={
          view === "shell" || view === "workspace" ? (
            <AppWindowChrome
              backAction={{ label: "Back" }}
              forwardAction={{ disabled: true, label: "Forward" }}
              sidebarAction={{
                "aria-expanded": sidebarOpen,
                label: sidebarOpen ? "Hide sidebar" : "Show sidebar",
                onClick: () => setSidebarOpen((open) => !open),
              }}
            />
          ) : undefined
        }
      >
        {view === "pull-request" ? (
          pullRequestIndex
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
                  activeFrame !== "thread-scroll-away",
                followKey: state.eventCount,
                onFollowingChange: setThreadFollowing,
              }}
              viewportRef={threadViewportRef}
            >
              <AgentTurn aria-label="Protocol-backed conversation">
                {liveError ? (
                  <StatusBanner heading="Live connection failed" tone="error">
                    {liveError}
                  </StatusBanner>
                ) : null}

                {hiddenTimelineEntryCount > 0 ? (
                  <ThreadVirtualizedPlaceholder
                    data-hidden-entry-count={hiddenTimelineEntryCount}
                    estimatedHeight={`${hiddenTimelineEntryCount * 3.5}rem`}
                  />
                ) : null}

                {timelineContent}

                {state.status === "running" &&
                !activeTurnHasWork &&
                !state.messages.some(
                  ({ role, status, turnId }) =>
                    role === "assistant" &&
                    status === "running" &&
                    turnId === state.currentTurnId,
                ) ? (
                  <ThreadThinkingPlaceholder />
                ) : null}

                {state.status === "retrying" ? (
                  <StatusBanner heading="Connection interrupted" tone="warning">
                    {state.error} Retrying the active turn…
                  </StatusBanner>
                ) : null}

                {state.status === "failed" ? (
                  <StatusBanner heading="Turn failed" tone="error">
                    {state.error}
                  </StatusBanner>
                ) : null}
              </AgentTurn>
            </ConversationThreadShell>

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
    </div>
  );
}
