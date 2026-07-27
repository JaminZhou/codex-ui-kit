import {
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentTurn,
  AppShell,
  AppSidebar,
  AppSidebarItem,
  AppSidebarSection,
  Button,
  ConversationThreadShell,
  StatusBanner,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadThinkingPlaceholder,
} from "codex-ui-kit";
import { useEffect, useMemo, useReducer, useState } from "react";
import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import {
  initialProtocolState,
  isTurnActive,
  reduceProtocolNotification,
  type DemoProtocolState,
  type ProtocolEventRecord,
} from "./protocol-state";
import {
  isScenarioId,
  replayScenarios,
  type ReplayScenarioId,
} from "./replay";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const replay = replayState(scenario.events, replayCount);
  const state = mode === "live" ? liveState : replay;

  useEffect(() => {
    if (!window.codexDemo) return;
    return window.codexDemo.onNotification((notification) => {
      dispatchLive(notification);
    });
  }, []);

  useEffect(() => {
    if (mode !== "replay") return;
    const root = document.documentElement;
    root.dataset.theme = "dark";
    return () => {
      delete root.dataset.theme;
    };
  }, [mode]);

  const selectScenario = (nextId: ReplayScenarioId) => {
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(replayScenarios[nextId].events.length);
    setLiveError(null);
  };

  const submitLive = async (prompt: string) => {
    if (!window.codexDemo) {
      setLiveError("Live mode is available in the Electron app.");
      return;
    }
    setMode("live");
    setLiveError(null);
    setComposerValue("");
    try {
      await window.codexDemo.startLive({ prompt });
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    }
  };

  const stopLive = async () => {
    try {
      await window.codexDemo?.stopLive();
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
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
      isRunning={mode === "live" && isTurnActive(state.status)}
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

              {state.messages.map((message) => (
                <AgentMessage
                  data-item-id={message.id}
                  key={message.id}
                  role={message.role}
                  status={
                    message.status === "running" ? "running" : "completed"
                  }
                >
                  {message.role === "assistant" ? (
                    <AgentMarkdown streaming={message.status === "running"}>
                      {message.text || " "}
                    </AgentMarkdown>
                  ) : (
                    message.text
                  )}
                </AgentMessage>
              ))}

              {state.status === "running" &&
              !state.messages.some(
                ({ role, status }) =>
                  role === "assistant" && status === "running",
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

              {state.status === "interrupted" ? (
                <ThreadInterruptionSummary
                  durationMs={18_400}
                  label="You stopped this response after 18s"
                />
              ) : null}

              {state.compaction !== "idle" ? (
                <ThreadContextEvent
                  mode="automatic"
                  status={state.compaction}
                />
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
