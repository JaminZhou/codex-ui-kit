import {
  ActivityTimeline,
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentTurn,
  AppShell,
  AppSidebar,
  AppSidebarItem,
  AppSidebarSection,
  ApprovalRequest,
  Button,
  CommandExecution,
  CommandOutput,
  ConversationThreadShell,
  FileChangeGroup,
  FileReview,
  McpToolCallGroup,
  McpToolIcon,
  PullRequestCheckList,
  PullRequestList,
  PullRequestPanelSummary,
  StatusBanner,
  TerminalSession,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadThinkingPlaceholder,
  ToolCallCard,
  TurnDuration,
  WorkspacePanel,
  type TerminalEntry,
} from "codex-ui-kit";
import {
  Fragment,
  useEffect,
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
  type ReplayScenarioId,
} from "./replay";
import {
  resolveReviewSelection,
  type ReviewSelection,
} from "./review-selection";
import {
  mcpToolCallGroupForEntry,
  mcpToolCallPresentation,
} from "./mcp-tool-call-view";

type DemoView = "conversation" | "pull-request";

function querySelection() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("scenario");
  const scenarioId = isScenarioId(requested)
    ? requested
    : "streaming-recovery";
  const frame = params.get("frame");
  const capture = params.get("capture") === "1";
  const view: DemoView =
    params.get("view") === "pull-request"
      ? "pull-request"
      : "conversation";
  return { capture, frame, scenarioId, view };
}

function replayState(
  events: readonly ProtocolEventRecord[],
  count: number,
): DemoProtocolState {
  return events
    .slice(0, count)
    .reduce(reduceProtocolNotification, initialProtocolState);
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

function McpResponseActions() {
  return (
    <span
      aria-label="MCP response actions"
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

export function App() {
  const initialSelection = useMemo(querySelection, []);
  const [scenarioId, setScenarioId] = useState<ReplayScenarioId>(
    initialSelection.scenarioId,
  );
  const scenario = replayScenarios[scenarioId];
  const initialCount =
    initialSelection.frame && scenario.frames[initialSelection.frame]
      ? scenario.frames[initialSelection.frame]
      : scenario.events.length;
  const [replayCount, setReplayCount] = useState(initialCount);
  const [liveState, dispatchLive] = useReducer(
    reduceProtocolNotification,
    initialProtocolState,
  );
  const [mode, setMode] = useState<"live" | "replay">("replay");
  const [view, setView] = useState<DemoView>(initialSelection.view);
  const [composerValue, setComposerValue] = useState("");
  const [liveStartPending, setLiveStartPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(
    initialSelection.frame === "review-open",
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
  const liveApprovalSubmissionGateRef = useRef(
    new LiveApprovalSubmissionGate(),
  );
  const replay = useMemo(
    () => replayState(scenario.events, replayCount),
    [replayCount, scenario.events],
  );
  const state = mode === "live" ? liveState : replay;

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

  const selectScenario = (nextId: ReplayScenarioId) => {
    setView("conversation");
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(replayScenarios[nextId].events.length);
    setReviewOpen(false);
    setReviewSelection(null);
    setTerminalOpen(nextId === "background-terminal");
    setTerminalCommandId(null);
    setTerminalHeight(272);
    setTerminalValue("");
    setTerminalHistoryByCommand({});
    setUndoneFileIds(new Set());
    setLiveError(null);
  };

  const respondToApproval = async (
    requestId: number | string,
    decision: "accept" | "decline",
  ) => {
    if (mode !== "live") return;
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

  const lastEvent = scenario.events[Math.max(0, replayCount - 1)];
  const sidebar = (
    <AppSidebar
      footer={
        <div className="demo-sidebar-footer">
          <span data-testid="dependency-ui-kit">UI Kit workspace</span>
          <span data-testid="dependency-client">Client 97ffcd4</span>
        </div>
      }
      header={
        <div className="demo-brand">
          <span aria-hidden="true" className="demo-brand__mark">
            ◈
          </span>
          <span>Codex App Playground</span>
        </div>
      }
    >
      <AppSidebarSection title="Lifecycle scenarios">
        {(Object.values(replayScenarios) as ReplayScenario[]).map((item) => (
          <AppSidebarItem
            description={item.description}
            key={item.id}
            onClick={() => selectScenario(item.id)}
            selected={mode === "replay" && scenarioId === item.id}
          >
            {item.label}
          </AppSidebarItem>
        ))}
      </AppSidebarSection>
      <AppSidebarSection title="Workspace">
        <AppSidebarItem
          description="Summary, Timeline, Code, checks, and review"
          onClick={() => {
            setMode("replay");
            setView("pull-request");
            setPullRequestOpen(true);
          }}
          selected={view === "pull-request"}
        >
          Pull requests
        </AppSidebarItem>
      </AppSidebarSection>
      <AppSidebarSection title="Connection">
        <AppSidebarItem
          description="Local stdio app-server"
          disabled={!window.codexDemo}
          onClick={() => {
            setView("conversation");
            setMode("live");
          }}
          selected={view === "conversation" && mode === "live"}
        >
          Live local
        </AppSidebarItem>
      </AppSidebarSection>
    </AppSidebar>
  );

  const header = (
    <ThreadHeader
      endActions={
        <div className="demo-header-actions">
          <span className="demo-status" data-status={state.status}>
            {statusLabel(state)}
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
            onClick={() => setMode(mode === "replay" ? "live" : "replay")}
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
      scenarioId === "mcp-tool-call");
  const composer = (
    <AgentComposer
      actions={
        showMeasuredComposer ? (
          <span className="demo-composer-controls">
            <button aria-label="Add context" type="button">
              +
            </button>
            <span>◉ Approve for me</span>
          </span>
        ) : undefined
      }
      aria-busy={liveStartPending || undefined}
      controls={
        showMeasuredComposer ? (
          <span className="demo-composer-actions">
            <span>5.6 Sol Extra High⌄</span>
            <button aria-label="Voice input" type="button">
              ♫
            </button>
          </span>
        ) : undefined
      }
      disabled={liveStartPending}
      isRunning={isTurnActive(liveState.status)}
      layout={showMeasuredComposer ? "multiline" : "auto"}
      onStop={stopLive}
      onSubmit={submitLive}
      onValueChange={setComposerValue}
      placeholder={
        showMeasuredComposer
          ? "Do anything"
          : mode === "live"
          ? "Ask Codex to inspect this repository…"
          : "Switch to Live to send a real local turn…"
      }
      textareaLabel="Message composer"
      value={composerValue}
    />
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
  const timelineContent = state.timeline.map((entry, entryIndex) => {
    if (entry.kind === "message") {
      const message = state.messages.find(({ id }) => id === entry.id);
      if (!message) return null;
      return (
        <Fragment key={`message:${message.id}`}>
          <AgentMessage
            actions={
              mode === "replay" &&
              ((scenarioId === "markdown" &&
                message.id === "assistant-markdown") ||
                (scenarioId === "mcp-tool-call" &&
                  message.id === "assistant-mcp")) &&
              message.status === "completed" ? (
                scenarioId === "mcp-tool-call" ? (
                  <McpResponseActions />
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
      const groupStatus = calls.some(
        ({ status }) => status === "running" || status === "pending",
      )
        ? "running"
        : calls.some(({ status }) => status === "failed")
          ? "failed"
          : "completed";
      const captureOpen =
        initialSelection.capture &&
        (initialSelection.frame === "mcp-running" ||
          initialSelection.frame === "mcp-progress" ||
          initialSelection.frame === "mcp-tool-calls");
      const durationMs =
        state.turnDurationMs ??
        calls.reduce(
          (total, call) => total + (call.durationMs ?? 0),
          0,
        );
      return (
        <ActivityTimeline
          key={`mcp-group:${toolCall.turnId}:${toolCall.server}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={durationMs}
              status={groupStatus === "running" ? "working" : "worked"}
            />
          }
        >
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
                  key={call.id}
                  icon={<McpToolIcon />}
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
              ? initialSelection.frame === "command-running" &&
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
                        text: `/workspace/codex-ui-kit % ${command}`,
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

  return (
    <div
      className="demo-root"
      data-capture={initialSelection.capture || undefined}
      data-frame={initialSelection.frame ?? lastEvent?.frame ?? "final"}
      data-last-method={state.lastMethod ?? undefined}
      data-mode={mode}
      data-scenario={scenarioId}
      data-status={state.status}
      data-view={view}
    >
      <AppShell
        bottomPanel={terminalPanel}
        bottomPanelHeight={terminalHeight}
        bottomPanelLabel="Terminal"
        bottomPanelOpen={terminalOpen}
        bottomPanelResizable
        bottomPanelResizeLabel="Resize bottom panel"
        onBottomPanelHeightChange={setTerminalHeight}
        layoutMode="wide"
        onSidebarOpenChange={setSidebarOpen}
        onSidePanelOpenChange={
          view === "pull-request" ? setPullRequestOpen : setReviewOpen
        }
        onSidePanelWidthChange={
          view === "pull-request" ? setPullRequestWidth : undefined
        }
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
      >
        {view === "pull-request" ? (
          pullRequestIndex
        ) : (
          <>
            <ConversationThreadShell
              composer={composer}
              header={header}
              label="Codex client demo conversation"
              threadWidth="wide"
              viewportProps={{ followKey: state.eventCount }}
            >
              <AgentTurn aria-label="Protocol-backed conversation">
                {liveError ? (
                  <StatusBanner heading="Live connection failed" tone="error">
                    {liveError}
                  </StatusBanner>
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
                    setReplayCount((count) => Math.max(1, count - 1))
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
                    setReplayCount(Number(event.target.value))
                  }
                  type="range"
                  value={replayCount}
                />
                <Button
                  disabled={replayCount >= scenario.events.length}
                  onClick={() =>
                    setReplayCount((count) =>
                      Math.min(scenario.events.length, count + 1),
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
    </div>
  );
}

interface ReplayScenario {
  description: string;
  id: ReplayScenarioId;
  label: string;
}
