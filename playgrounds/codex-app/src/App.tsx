import {
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
  FileChange,
  FileDiff,
  StatusBanner,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadThinkingPlaceholder,
  WorkspacePanel,
  type FileDiffLine,
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
  type DemoProtocolState,
  type DemoFileUpdateChange,
  type ProtocolEventRecord,
} from "./protocol-state";
import {
  isScenarioId,
  replayScenarios,
  type ReplayScenarioId,
} from "./replay";
import {
  resolveReviewSelection,
  type ReviewSelection,
} from "./review-selection";

function querySelection() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("scenario");
  const scenarioId = isScenarioId(requested)
    ? requested
    : "streaming-recovery";
  const frame = params.get("frame");
  const capture = params.get("capture") === "1";
  return { capture, frame, scenarioId };
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

function diffLines(change: DemoFileUpdateChange): FileDiffLine[] {
  let oldLine = 0;
  let newLine = 0;
  return change.diff.split(/\r?\n/).flatMap<FileDiffLine>((line) => {
    if (!line) return [];
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      oldLine = Number(match?.[1] ?? 0);
      newLine = Number(match?.[2] ?? 0);
      return [{ content: line, kind: "hunk" as const }];
    }
    if (
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("\\ ")
    ) {
      return [{ content: line, kind: "meta" as const }];
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      const next = {
        content: line.slice(1),
        kind: "addition" as const,
        newLineNumber: newLine,
      };
      newLine += 1;
      return [next];
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      const next = {
        content: line.slice(1),
        kind: "deletion" as const,
        oldLineNumber: oldLine,
      };
      oldLine += 1;
      return [next];
    }
    const next = {
      content: line.startsWith(" ") ? line.slice(1) : line,
      kind: "context" as const,
      newLineNumber: newLine,
      oldLineNumber: oldLine,
    };
    newLine += 1;
    oldLine += 1;
    return [next];
  });
}

function changeStats(change: DemoFileUpdateChange) {
  const lines = diffLines(change);
  return {
    additions: lines.filter(({ kind }) => kind === "addition").length,
    deletions: lines.filter(({ kind }) => kind === "deletion").length,
    lines,
  };
}

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
  const [composerValue, setComposerValue] = useState("");
  const [liveStartPending, setLiveStartPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(
    initialSelection.frame === "review-open",
  );
  const [reviewSelection, setReviewSelection] =
    useState<ReviewSelection | null>(null);
  const [undoneFileIds, setUndoneFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveStartPendingRef = useRef(false);
  const replay = replayState(scenario.events, replayCount);
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

  const selectScenario = (nextId: ReplayScenarioId) => {
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(replayScenarios[nextId].events.length);
    setReviewOpen(false);
    setReviewSelection(null);
    setUndoneFileIds(new Set());
    setLiveError(null);
  };

  const respondToApproval = async (
    requestId: number | string,
    decision: "accept" | "decline",
  ) => {
    if (mode !== "live") return;
    try {
      await window.codexDemo?.respondToApproval({ decision, requestId });
      dispatchLive({
        decision: decision === "accept" ? "approved" : "rejected",
        kind: "approval-resolution",
        requestId,
      });
    } catch (error) {
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
      <AppSidebarSection title="Connection">
        <AppSidebarItem
          description="Local stdio app-server"
          disabled={!window.codexDemo}
          onClick={() => setMode("live")}
          selected={mode === "live"}
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

  const composer = (
    <AgentComposer
      aria-busy={liveStartPending || undefined}
      disabled={liveStartPending}
      isRunning={isTurnActive(liveState.status)}
      onStop={stopLive}
      onSubmit={submitLive}
      onValueChange={setComposerValue}
      placeholder={
        mode === "live"
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
  const reviewChange = resolvedReview?.change;
  const reviewStats = reviewChange ? changeStats(reviewChange) : null;
  const reviewPanel = reviewChange ? (
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
                  <span>{reviewChange.path}</span>
                </div>
                <span className="demo-review-panel__stats">
                  +{reviewStats?.additions ?? 0} −
                  {reviewStats?.deletions ?? 0}
                </span>
              </div>
              <FileDiff
                aria-label={`Review diff for ${reviewChange.path}`}
                lines={reviewStats?.lines ?? []}
                wrapLines
              />
            </div>
          ),
          id: "review",
          label: "Review",
        },
      ]}
    />
  ) : null;
  const timelineContent = state.timeline.map((entry) => {
    if (entry.kind === "message") {
      const message = state.messages.find(({ id }) => id === entry.id);
      if (!message) return null;
      return (
        <Fragment key={`message:${message.id}`}>
          <AgentMessage
            data-item-id={message.id}
            role={message.role}
            status={agentMessageStatus(message.status)}
          >
            {message.role === "assistant" ? (
              <AgentMarkdown streaming={message.status === "running"}>
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
        </Fragment>
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
          exitCode={command.exitCode ?? undefined}
          key={`command:${command.id}`}
          open={
            initialSelection.capture &&
            initialSelection.frame === "command-running" &&
            command.status === "running"
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
    return (
      <Fragment key={`file-change:${fileChange.id}`}>
        {fileChange.changes.map((change) => {
          const stats = changeStats(change);
          const open =
            initialSelection.capture &&
            initialSelection.frame === "file-changing";
          const indicator = (
            <svg
              aria-hidden="true"
              className="demo-file-indicator"
              viewBox="0 0 16 16"
            >
              <path d="M3 2.5h6l4 4v7H3z" />
              <path d="M9 2.5v4h4M5.5 9h5M5.5 11.5h3.5" />
            </svg>
          );
          const detail =
            fileChange.status === "applied" ? (
              <span className="demo-file-actions">
                <span className="demo-file-actions__stats">
                  +{stats.additions} −{stats.deletions}
                </span>
                {mode === "replay" ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
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
                    Undo
                  </button>
                ) : null}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setReviewSelection({
                      fileChangeId: fileChange.id,
                      path: change.path,
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
            <FileChange
              additions={stats.additions}
              change={change.kind}
              data-item-id={fileChange.id}
              data-testid="file-change"
              deletions={stats.deletions}
              detail={detail}
              diffText={change.diff}
              indicator={indicator}
              key={change.path}
              open={open}
              path={change.path}
              previousPath={change.previousPath}
              status={fileChange.status}
            >
              <FileDiff
                aria-label={`Inline diff for ${change.path}`}
                lines={stats.lines}
                wrapLines
              />
            </FileChange>
          );
        })}
      </Fragment>
    );
  });
  const activeTurnHasWork = hasActiveTurnWork(state);

  return (
    <div
      className="demo-root"
      data-capture={initialSelection.capture || undefined}
      data-frame={initialSelection.frame ?? lastEvent?.frame ?? "final"}
      data-last-method={state.lastMethod ?? undefined}
      data-mode={mode}
      data-scenario={scenarioId}
      data-status={state.status}
    >
      <AppShell
        onSidebarOpenChange={setSidebarOpen}
        onSidePanelOpenChange={setReviewOpen}
        sidePanel={reviewPanel}
        sidePanelLabel="Review"
        sidePanelOpen={reviewOpen && Boolean(reviewPanel)}
        sidebar={sidebar}
        sidebarOpen={sidebarOpen}
      >
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
              onClick={() => setReplayCount((count) => Math.max(1, count - 1))}
              size="small"
              tone="ghost"
            >
              Previous
            </Button>
            <input
              aria-label="Protocol event position"
              max={scenario.events.length}
              min={1}
              onChange={(event) => setReplayCount(Number(event.target.value))}
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
      </AppShell>
    </div>
  );
}

interface ReplayScenario {
  description: string;
  id: ReplayScenarioId;
  label: string;
}
