import { StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  CurrentThreadBuildIcon,
  CurrentThreadRasterAsset,
} from "./currentBuildIcons";
import {
  ActivityGroup,
  ActivityTimeline,
  AgentActivity,
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentPlan,
  AgentReasoning,
  AgentThread,
  AgentThreadViewport,
  AgentTurn,
  AppShell,
  AppSidebar,
  AppSidebarItem,
  AppSidebarSection,
  ApprovalCommandPreview,
  ApprovalRequest,
  ArtifactList,
  BrowserActivity,
  BranchCreationDialog,
  Button,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  ComposerMentionMenu,
  ComposerModeIndicator,
  ConversationContextBar,
  ConversationThreadShell,
  ConversationProjectListbox,
  ConversationEvent,
  ConversationEventList,
  Dialog,
  DialogChoice,
  FileChange,
  FileDiff,
  fileDiffToText,
  FloatingThreadPanel,
  GeneratedImageGallery,
  ImagePreviewDialog,
  InlineNotice,
  IconButton,
  LoadingShimmer,
  LocalEnvironmentDialog,
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuSectionLabel,
  MenuSeparator,
  MenuSubmenu,
  NewConversationStart,
  Popover,
  ProposedPlan,
  ProjectPicker,
  ProjectConversationPage,
  ProjectIndex,
  PullRequestCheckList,
  PullRequestDetails,
  PullRequestList,
  PullRequestPage,
  PullRequestReviewSummary,
  PullRequestReviewThread,
  QueuedPromptList,
  ResourceCard,
  ResourceList,
  RunLocationMenu,
  SearchActivity,
  Select,
  StatusIndicator,
  StatusBanner,
  SourceList,
  StreamNotice,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentPanel,
  SubagentSummary,
  SubagentTranscriptHeader,
  TerminalSession,
  TerminalProcessList,
  ToolCallCard,
  Tooltip,
  ThreadFloatingButton,
  ThreadContextEvent,
  ThreadContextOptimization,
  ThreadHeader,
  ThreadLoadingState,
  ThreadMessageNavigationRail,
  ThreadNavigationControls,
  ThreadRenderError,
  ThreadInterruptionSummary,
  ThreadSkeleton,
  ThreadSummaryDelta,
  ThreadSummaryIconButton,
  ThreadSummaryItem,
  ThreadSummaryPanel,
  ThreadSummaryPopover,
  ThreadSummarySection,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  TurnDuration,
  WorkspaceSelection,
  WorkspacePanel,
  WorktreePicker,
  type ApprovalDecision,
  type FileDiffLine,
  type GeneratedImageItem,
  type QueuedPrompt,
  type StatusIndicatorStatus,
  type SubagentActivityItem,
  type SubagentItem,
} from "../src";
import "../src/styles.css";
import "./showcase.css";

interface GalleryCardProps {
  children: ReactNode;
  description: string;
  title: string;
  wide?: boolean;
}

function GalleryCard({
  children,
  description,
  title,
  wide = false,
}: GalleryCardProps) {
  return (
    <section className="gallery-card" data-wide={wide || undefined}>
      <header className="gallery-card__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="gallery-card__body">{children}</div>
    </section>
  );
}

const statuses: Array<{ label: string; status: StatusIndicatorStatus }> = [
  { label: "Pending", status: "pending" },
  { label: "Running", status: "running" },
  { label: "Completed", status: "completed" },
  { label: "Warning", status: "warning" },
  { label: "Failed", status: "failed" },
];

const navigationMessages = [
  {
    id: "navigation-message-1",
    label: "Create a protocol-neutral component library.",
    outputs: ["Mapped the public API", "Measured the layout"],
    preview: "Start with the thread shell and preserve host-owned behavior.",
  },
  {
    id: "navigation-message-2",
    label: "Add browser and Electron acceptance surfaces.",
    outputs: ["H5 showcase", "Electron playground", "Package consumer"],
    preview: "Reuse the same React components in both renderers.",
  },
  {
    id: "navigation-message-3",
    label: "Verify light, dark, compact, and focus states.",
    preview: "Capture measured geometry before declaring parity.",
  },
  {
    id: "navigation-message-4",
    label: "Keep the package independent from product transport.",
    preview: "Navigation callbacks remain host-controlled.",
  },
  {
    id: "navigation-message-5",
    label: "Finish the complete parity matrix.",
    preview: "Every row requires component, visual, H5, Electron, and test gates.",
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: `navigation-message-${index + 6}`,
    label: `Inspect long-thread navigation turn ${index + 6}.`,
    preview: "Keep the current ten-message threshold interactive in the showcase.",
  })),
] as const;

const showcaseConversationProjects = [
  {
    description: "Component workspace",
    id: "ui-kit",
    label: "codex-ui-kit",
  },
  {
    description: "Desktop application",
    id: "desktop",
    label: "Codex desktop",
  },
  ...Array.from({ length: 12 }, (_, index) => {
    const number = String(index + 3).padStart(2, "0");
    return {
      description: "Available project",
      id: `project-${number}`,
      label: `Project ${number}`,
    };
  }),
];

const showcaseDiffLines: FileDiffLine[] = [
  { content: "@@ -12,3 +12,4 @@", kind: "hunk" },
  {
    content: "export const status = 'running';",
    kind: "context",
    newLineNumber: 12,
    oldLineNumber: 12,
  },
  {
    content: "export const retries = 2;",
    kind: "deletion",
    oldLineNumber: 13,
  },
  {
    content: "export const retries = 3;",
    kind: "addition",
    newLineNumber: 13,
  },
  {
    content: "export const timeout = 30_000;",
    kind: "addition",
    newLineNumber: 14,
  },
];

const longShowcaseDiffLines: FileDiffLine[] = [
  { content: "@@ -12,8 +12,18 @@", kind: "hunk" },
  ...Array.from({ length: 16 }, (_, index) => ({
    content: `export const checkpoint${index + 1} = 'verified';`,
    kind: index === 2 ? ("deletion" as const) : ("addition" as const),
    newLineNumber: index === 2 ? undefined : index + 12,
    oldLineNumber: index === 2 ? index + 12 : undefined,
  })),
  { content: "No newline at end of file", kind: "meta" },
];
const shortShowcaseDiffLines = longShowcaseDiffLines.slice(0, 8);

const webSearchEntries = Array.from({ length: 15 }, (_, index) => ({
  completed: index < 14,
  detail: [
    "Codex app-server protocol",
    "TypeScript SDK execution model",
    "MCP tool result content blocks",
  ][index % 3] + ` · source ${index + 1}`,
  id: `web-result-${index + 1}`,
}));

const subagentActivities: SubagentActivityItem[] = [
  {
    activityStatus: "active",
    id: "researcher-thread",
    name: "Researcher",
  },
  {
    activityStatus: "updated",
    id: "builder-thread",
    name: "Builder",
  },
  {
    activityStatus: "active",
    id: "reviewer-thread",
    name: "Reviewer",
  },
  {
    activityStatus: "active",
    id: "tester-thread",
    name: "Tester",
  },
];

const showcaseSubagents: SubagentItem[] = [
  {
    id: "researcher-thread",
    lastMessage: "Mapped delegated-work labels and the three rendering layers.",
    name: "Researcher",
    presentation: "grouped",
    role: "explorer",
    status: "active",
    timestamp: "now",
  },
  {
    id: "builder-thread",
    name: "Builder",
    presentation: "grouped",
    status: "done",
    statusSummary: "Implemented the protocol-neutral component boundary.",
  },
  {
    id: "reviewer-thread",
    name: "Reviewer",
    presentation: "grouped",
    status: "waiting",
  },
  {
    additions: 48,
    deletions: 6,
    id: "integration-thread",
    model: "gpt-5",
    name: "Integration",
    role: "worker",
    status: "active",
    statusSummary: "Connecting H5 and Electron acceptance surfaces.",
  },
  {
    additions: 12,
    deletions: 2,
    id: "accessibility-thread",
    lastMessage: "Verified focus, names, and keyboard activation.",
    name: "Accessibility",
    status: "done",
    timestamp: "2m",
  },
  {
    id: "visual-thread",
    name: "Visual QA",
    status: "waiting",
  },
  {
    id: "responsive-thread",
    lastMessage: "Checking the narrow side-panel layout.",
    name: "Responsive",
    status: "active",
    timestamp: "1m",
  },
  {
    id: "tests-thread",
    lastMessage: "Added interaction and visual-contract coverage.",
    name: "Tests",
    status: "active",
    timestamp: "3m",
  },
  {
    id: "docs-thread",
    lastMessage: "Recorded independent implementation observations.",
    name: "Docs",
    status: "done",
    timestamp: "5m",
  },
];

const markdownShowcase = [
  "## Implementation notes",
  "",
  "Use **semantic markup** with `inline code`, [links](https://example.com), and measured spacing.",
  "",
  "> Keep the package protocol-neutral while matching the rendered behavior.",
  "",
  "- [x] Parse GFM content",
  "- [x] Preserve table overflow",
  "- [ ] Finish every parity row",
  "",
  "| Surface | State |",
  "| --- | ---: |",
  "| Browser | ready |",
  "| Electron | ready |",
  "",
  "```typescript",
  "export function Result() {",
  "  return <AgentMarkdown>Measured output</AgentMarkdown>;",
  "}",
  "```",
].join("\n");

const streamingMarkdownShowcase = [
  "Streaming keeps an unfinished fence stable:",
  "",
  "```ts",
  "const status = 'running';",
].join("\n");

const proposedPlanShowcase = [
  "## Delivery plan",
  "",
  "1. Lock the observed interaction states.",
  "2. Implement protocol-neutral React primitives.",
  "3. Verify browser and Electron rendering.",
].join("\n");

const activePlanSteps = [
  { status: "completed" as const, step: "Inspect the sampled behavior" },
  { status: "in_progress" as const, step: "Implement the public components" },
  { status: "pending" as const, step: "Verify both renderer targets" },
];

const completedPlanSteps = activePlanSteps.map((item) => ({
  ...item,
  status: "completed" as const,
}));

const resourceImages: GeneratedImageItem[] = [
  ["image-sky", "#4f87ff", "#dce8ff"],
  ["image-leaf", "#4ba66c", "#d9f4e4"],
  ["image-sunset", "#eb7440", "#ffe7d9"],
  ["image-violet", "#805ad5", "#ede5ff"],
  ["image-night", "#34445f", "#c8d3e5"],
  ["image-sand", "#ba873c", "#f6e4bd"],
].map(([id, foreground, background], index) => ({
  alt: `Generated image ${index + 1}`,
  height: index % 2 === 0 ? 720 : 640,
  id,
  src: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="${background}"/><circle cx="${250 + index * 70}" cy="250" r="170" fill="${foreground}" opacity=".9"/><path d="M0 610 230 390l170 145 150-175 410 350H0Z" fill="${foreground}" opacity=".55"/></svg>`,
  )}`,
  width: index % 2 === 0 ? 960 : 760,
}));

type PixelIconName =
  | "approve"
  | "chevron"
  | "copy"
  | "dislike"
  | "expand"
  | "folder"
  | "like"
  | "microphone"
  | "more"
  | "panel"
  | "plus"
  | "sliders"
  | "workspace";

function PixelIcon({ name }: { name: PixelIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.35,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      {name === "approve" ? (
        <>
          <path {...common} d="M8 2.25 12.5 4v3.4c0 2.7-1.8 4.9-4.5 6.35-2.7-1.45-4.5-3.65-4.5-6.35V4L8 2.25Z" />
          <path {...common} d="m6.25 8 1.15 1.15 2.4-2.55" />
        </>
      ) : null}
      {name === "chevron" ? <path {...common} d="m5 6.5 3 3 3-3" /> : null}
      {name === "copy" ? (
        <>
          <rect {...common} height="8" rx="1.4" width="8" x="5" y="5" />
          <path {...common} d="M3.25 10.75H3A1.25 1.25 0 0 1 1.75 9.5V3A1.25 1.25 0 0 1 3 1.75h6.5A1.25 1.25 0 0 1 10.75 3v.25" />
        </>
      ) : null}
      {name === "dislike" ? <path {...common} d="M5.25 3.25h5.2c.7 0 1.25.55 1.25 1.25v4.25H8.4l.35 2.05c.15.85-.5 1.65-1.35 1.65H7L4.25 8.9V4.25l1-1ZM4.25 4.25H2.5v4.5h1.75" /> : null}
      {name === "expand" ? (
        <>
          <path {...common} d="M6.25 3.25H3.5v2.75M9.75 12.75h2.75V10" />
          <path {...common} d="m3.5 3.25 3.25 3.25M12.5 12.75 9.25 9.5" />
        </>
      ) : null}
      {name === "folder" ? <path {...common} d="M1.75 4.5c0-.7.55-1.25 1.25-1.25h3l1.25 1.5H13c.7 0 1.25.55 1.25 1.25v5.25c0 .7-.55 1.25-1.25 1.25H3c-.7 0-1.25-.55-1.25-1.25V4.5Z" /> : null}
      {name === "like" ? <path {...common} d="M5.25 12.75h5.2c.7 0 1.25-.55 1.25-1.25V7.25H8.4l.35-2.05c.15-.85-.5-1.65-1.35-1.65H7L4.25 7.1v4.65l1 1ZM4.25 11.75H2.5v-4.5h1.75" /> : null}
      {name === "microphone" ? (
        <>
          <rect {...common} height="7" rx="2.25" width="4.5" x="5.75" y="2" />
          <path {...common} d="M3.75 7.75A4.25 4.25 0 0 0 8 12a4.25 4.25 0 0 0 4.25-4.25M8 12v2.25M6 14.25h4" />
        </>
      ) : null}
      {name === "more" ? (
        <>
          <circle cx="3.5" cy="8" fill="currentColor" r=".85" />
          <circle cx="8" cy="8" fill="currentColor" r=".85" />
          <circle cx="12.5" cy="8" fill="currentColor" r=".85" />
        </>
      ) : null}
      {name === "panel" ? (
        <>
          <rect {...common} height="10" rx="1.75" width="12" x="2" y="3" />
          <path {...common} d="M2.75 9.75h10.5" />
        </>
      ) : null}
      {name === "plus" ? <path {...common} d="M8 3v10M3 8h10" /> : null}
      {name === "sliders" ? (
        <>
          <path {...common} d="M3 4h10M3 8h10M3 12h10" />
          <circle cx="6" cy="4" fill="currentColor" r="1.25" />
          <circle cx="10" cy="8" fill="currentColor" r="1.25" />
          <circle cx="7.5" cy="12" fill="currentColor" r="1.25" />
        </>
      ) : null}
      {name === "workspace" ? (
        <>
          <rect {...common} height="10" rx="1.75" width="12" x="2" y="3" />
          <path {...common} d="M10 3.75v8.5" />
        </>
      ) : null}
    </svg>
  );
}

type CurrentThreadPixelState = "completed" | "streaming";

function CurrentThreadExactHeader({ title }: { title: string }) {
  return (
    <ThreadHeader
      navigation={
        <div className="current-thread-pixel-fixture__navigation">
          <button aria-label="Show sidebar" type="button">
            <CurrentThreadBuildIcon name="window-chrome-sidebar" />
          </button>
          <button aria-label="Back" type="button">
            <CurrentThreadBuildIcon name="window-chrome-back" />
          </button>
          <button aria-label="Forward" disabled type="button">
            <CurrentThreadBuildIcon name="window-chrome-forward" />
          </button>
          <button aria-label="New chat" type="button">
            <CurrentThreadBuildIcon name="thread-header-new-chat" />
          </button>
        </div>
      }
      endActions={
        <>
          <button
            aria-label="Open in editor"
            className="current-thread-pixel-fixture__editor-control"
            type="button"
          >
            <CurrentThreadRasterAsset name="thread-header-editor-vscode" />
            <CurrentThreadBuildIcon name="thread-header-open-in-chevron" />
          </button>
          <button aria-label="Thread controls" type="button">
            <CurrentThreadBuildIcon name="thread-header-pinned-summary" />
          </button>
          <button aria-label="Toggle bottom panel" type="button">
            <CurrentThreadBuildIcon name="thread-header-bottom-panel" />
          </button>
          <button aria-label="Toggle workspace panel" type="button">
            <CurrentThreadBuildIcon name="thread-header-side-panel" />
          </button>
        </>
      }
      position="static"
      title={
        <span className="current-thread-pixel-fixture__title">
          <CurrentThreadBuildIcon name="thread-header-project" />
          <span>{title}</span>
          <CurrentThreadBuildIcon name="thread-header-actions" />
        </span>
      }
    />
  );
}

function CurrentThreadExactComposer({
  onStop,
  onSubmit,
  onValueChange,
  running,
  value,
}: {
  onStop?: () => void;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  running: boolean;
  value: string;
}) {
  return (
    <AgentComposer
      actions={
        <>
          <button aria-label="Add attachment" type="button">
            <CurrentThreadBuildIcon name="composer-add-files" />
          </button>
          <button type="button">
            <CurrentThreadBuildIcon name="composer-permission" />
            <span>Full access</span>
          </button>
        </>
      }
      controls={
        <>
          <button type="button">
            <span className="current-thread-pixel-fixture__model">
              5.6 Sol <span>Extra High</span>
            </span>
            <CurrentThreadBuildIcon name="composer-model-chevron" />
          </button>
          <button aria-label="Voice input" type="button">
            <CurrentThreadBuildIcon name="composer-dictate" />
          </button>
        </>
      }
      isRunning={running}
      layout="multiline"
      onStop={onStop}
      onSubmit={onSubmit}
      onValueChange={onValueChange}
      placeholder="Do anything"
      stopLabel="Stop"
      submitIcon={<CurrentThreadBuildIcon name="composer-send" />}
      value={value}
    />
  );
}

const streamingPixelPrompt =
  'Write exactly 24 short plain-text sentences about pixel-level UI verification. Begin the first sentence with "Streaming probe:" and number no sentences. Do not use Markdown or tools.';

const streamingPixelReplies = {
  compact:
    "Streaming probe: compare each rendered frame with the approved refer",
  wide: "Streaming probe: compare",
} as const;

function CurrentThreadPixelFixture({
  sceneId,
  state = "completed",
}: {
  sceneId?: string;
  state?: CurrentThreadPixelState;
}) {
  const streaming = state === "streaming";
  const [running, setRunning] = useState(streaming);
  const streamingReply =
    sceneId === "current-thread-streaming-compact"
      ? streamingPixelReplies.compact
      : streamingPixelReplies.wide;
  const messageActions = [
    ["copy", <CurrentThreadBuildIcon name="thread-assistant-copy" />],
    ["like", <CurrentThreadBuildIcon name="thread-assistant-good" />],
    ["dislike", <CurrentThreadBuildIcon name="thread-assistant-bad" />],
    ["expand", <CurrentThreadBuildIcon name="thread-assistant-continue" />],
  ] as const;

  return (
    <main
      className="current-thread-pixel-fixture"
      data-theme="dark"
      data-visual-scene={sceneId ?? `current-thread-${state}`}
    >
      <ConversationThreadShell
        composer={
          <CurrentThreadExactComposer
            onStop={() => setRunning(false)}
            onSubmit={() => undefined}
            onValueChange={() => undefined}
            running={running}
            value=""
          />
        }
        header={
          <CurrentThreadExactHeader
            title={
              streaming
                ? "Write pixel UI verification summary"
                : "Confirm UI probe completion"
            }
          />
        }
        isRunning={running}
        label="Current conversation pixel fixture"
        viewportProps={{ followKey: running ? streamingReply : state }}
      >
        <AgentMessage role="user">
          {streaming
            ? streamingPixelPrompt
            : "Please reply with exactly: UI probe complete."}
        </AgentMessage>
        <AgentMessage
          actions={
            running
              ? undefined
              : messageActions.map(([label, icon]) => (
                  <button aria-label={label} key={label} type="button">
                    {icon}
                  </button>
                ))
          }
          role="assistant"
          status={running ? "running" : "completed"}
        >
          {streaming ? streamingReply : "UI probe complete."}
        </AgentMessage>
      </ConversationThreadShell>
    </main>
  );
}

type CurrentCommandLifecycleState =
  | "failure"
  | "interruption"
  | "success";
type CurrentCommandInterruptionPhase =
  | "recovered"
  | "running"
  | "settled"
  | "stopping";

const currentSuccessCommand =
  "for i in $(seq 1 12); do printf 'current-success-%03d\\n' \"$i\"; sleep 1; done";
const currentFailureCommand =
  "printf 'current-stdout\\n'; printf 'current-stderr\\n' >&2; exit 7";
const currentInterruptionCommand =
  "for i in $(seq 1 120); do printf 'current-interrupt-%03d\\n' \"$i\"; sleep 1; done";
const currentSuccessOutput = Array.from(
  { length: 12 },
  (_, index) => `current-success-${String(index + 1).padStart(3, "0")}`,
).join("\n");

function CurrentCommandLifecycleFixture({
  state,
}: {
  state: CurrentCommandLifecycleState;
}) {
  const [interruptionPhase, setInterruptionPhase] =
    useState<CurrentCommandInterruptionPhase>("running");
  const [composerValue, setComposerValue] = useState("");
  const interruption = state === "interruption";
  const turnRunning =
    state === "success" ||
    (interruption && interruptionPhase === "running");
  const backgroundStopping =
    interruption && interruptionPhase === "stopping";
  const backgroundSettled =
    interruption &&
    (interruptionPhase === "settled" || interruptionPhase === "recovered");

  useEffect(() => {
    if (!backgroundStopping) return;
    const timer = window.setTimeout(() => setInterruptionPhase("settled"), 700);
    return () => window.clearTimeout(timer);
  }, [backgroundStopping]);

  const stopTurn = () => {
    if (interruptionPhase === "running") setInterruptionPhase("stopping");
  };
  const stopBackground = () => {
    if (interruptionPhase === "stopping") setInterruptionPhase("settled");
  };
  const submitRecovery = () => {
    if (
      interruptionPhase !== "settled" ||
      composerValue !== "CURRENT INTERRUPTION RECOVERY"
    ) {
      return;
    }
    setComposerValue("");
    setInterruptionPhase("recovered");
  };

  const terminalIcon = (
    <CurrentThreadBuildIcon name="thread-command-terminal" />
  );
  const commandPanel = (() => {
    if (state === "success") {
      return (
        <ActivityTimeline
          className="current-command-lifecycle__timeline"
          defaultOpen
          summary={<TurnDuration durationMs={19_000} status="working" />}
        >
          <AgentReasoning label="Thinking" status="running">
            <span />
          </AgentReasoning>
          <CommandExecution
            command={currentSuccessCommand}
            defaultOpen
            durationMs={12_000}
            exitCode={0}
            status="completed"
            terminalIcon={terminalIcon}
          >
            <CommandOutput copyLabel="Copy" copyText={currentSuccessOutput}>
              {currentSuccessOutput}
            </CommandOutput>
          </CommandExecution>
        </ActivityTimeline>
      );
    }
    if (state === "failure") {
      return (
        <ActivityTimeline
          className="current-command-lifecycle__timeline"
          defaultOpen
          summary={<TurnDuration durationMs={4_000} status="worked" />}
        >
          <CommandExecution
            command={currentFailureCommand}
            defaultOpen
            durationMs={4_000}
            exitCode={7}
            status="failed"
            terminalIcon={terminalIcon}
          >
            <CommandOutput
              copyLabel="Copy"
              copyText={"current-stdout\ncurrent-stderr\n"}
            >
              {"current-stdout\ncurrent-stderr\n"}
            </CommandOutput>
          </CommandExecution>
        </ActivityTimeline>
      );
    }
    const summary = backgroundStopping ? (
      <>Background terminal stopped with {currentInterruptionCommand}</>
    ) : backgroundSettled ? (
      <>Ran {currentInterruptionCommand}</>
    ) : (
      <>Running {currentInterruptionCommand}</>
    );
    const execution = (
      <CommandExecution
        command={currentInterruptionCommand}
        compactDetail={turnRunning ? "Running command for 16s" : undefined}
        hideRawCommand
        open={turnRunning}
        status={
          backgroundStopping
            ? "interrupted"
            : backgroundSettled
              ? "background-finished"
              : "running"
        }
        summary={summary}
        terminalIcon={terminalIcon}
      />
    );
    return turnRunning ? (
      <ActivityTimeline
        className="current-command-lifecycle__timeline"
        open
        summary={<TurnDuration durationMs={20_000} status="working" />}
      >
        {execution}
      </ActivityTimeline>
    ) : (
      <>
        <ThreadInterruptionSummary durationMs={20_000} />
        {execution}
      </>
    );
  })();

  return (
    <main
      className="current-thread-pixel-fixture current-command-lifecycle"
      data-interruption-phase={interruption ? interruptionPhase : undefined}
      data-theme="dark"
      data-visual-scene={`current-command-${state}`}
    >
      <div className="current-command-lifecycle__conversation">
        <ConversationThreadShell
          composer={
            <CurrentThreadExactComposer
              onStop={
                turnRunning
                  ? interruption
                    ? stopTurn
                    : () => undefined
                  : undefined
              }
              onSubmit={submitRecovery}
              onValueChange={setComposerValue}
              running={turnRunning}
              value={composerValue}
            />
          }
          header={
            <CurrentThreadExactHeader title="Current command lifecycle" />
          }
          isRunning={turnRunning}
          label="Current command lifecycle"
          viewportProps={{ followKey: interruptionPhase, latestOrigin: "start" }}
        >
          <AgentMessage role="user">
            {state === "success"
              ? currentSuccessCommand
              : state === "failure"
                ? currentFailureCommand
                : currentInterruptionCommand}
          </AgentMessage>
          {commandPanel}
          {state === "failure" ? (
            <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
              CURRENT COMMAND FAILURE OBSERVED
            </AgentMessage>
          ) : null}
          {interruptionPhase === "recovered" ? (
            <>
              <AgentMessage role="user">CURRENT INTERRUPTION RECOVERY</AgentMessage>
              <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
                CURRENT INTERRUPTION RECOVERY ACCEPTED
              </AgentMessage>
            </>
          ) : null}
        </ConversationThreadShell>
      </div>
      {backgroundStopping ? (
        <aside
          aria-label="Current background terminal panel"
          className="current-command-lifecycle__process-panel"
        >
          <TerminalProcessList
            onStopAll={stopBackground}
            onStopProcess={stopBackground}
            processes={[
              {
                detail: currentInterruptionCommand,
                id: "current-interruption",
                label: "Background terminal",
                status: "running",
              },
            ]}
          />
        </aside>
      ) : null}
    </main>
  );
}

type WorkflowPixelState = "approval" | "file-diff" | "tool-call";
type ToolRecoveryPixelState =
  | "browser"
  | "command-failure"
  | "mcp-unavailable"
  | "search";

function WorkflowPixelHeader({
  compact = false,
  title,
}: {
  compact?: boolean;
  title: string;
}) {
  return (
    <ThreadHeader
      endActions={
        <>
          <button
            aria-label="Open in editor"
            className="current-thread-pixel-fixture__editor-control"
            type="button"
          >
            <span aria-hidden="true">⌁</span>
            <PixelIcon name="chevron" />
          </button>
          <button aria-label="Thread controls" type="button">
            <PixelIcon name="sliders" />
          </button>
          {!compact ? (
            <>
              <button aria-label="Toggle bottom panel" type="button">
                <PixelIcon name="panel" />
              </button>
              <button aria-label="Toggle workspace panel" type="button">
                <PixelIcon name="workspace" />
              </button>
            </>
          ) : null}
        </>
      }
      position="static"
      title={
        <span className="current-thread-pixel-fixture__title">
          <PixelIcon name="folder" />
          <span>{title}</span>
          <PixelIcon name="more" />
        </span>
      }
    />
  );
}

function WorkflowPixelComposer({
  approvalLabel = "Ask for approval",
  running = false,
}: {
  approvalLabel?: string;
  running?: boolean;
} = {}) {
  return (
    <AgentComposer
      actions={
        <>
          <button aria-label="Add attachment" type="button">
            <PixelIcon name="plus" />
          </button>
          <button type="button">
            <PixelIcon name="approve" />
            <span>{approvalLabel}</span>
          </button>
        </>
      }
      controls={
        <>
          <button type="button">
            <span className="current-thread-pixel-fixture__model">
              5.6 Sol <span>Extra High</span>
            </span>
            <PixelIcon name="chevron" />
          </button>
          <button aria-label="Voice input" type="button">
            <PixelIcon name="microphone" />
          </button>
        </>
      }
      isRunning={running}
      layout="multiline"
      onStop={() => undefined}
      onSubmit={() => undefined}
      onValueChange={() => undefined}
      placeholder="Do anything"
      value=""
    />
  );
}

function WorkflowMessageActions() {
  const messageActions: PixelIconName[] = [
    "copy",
    "like",
    "dislike",
    "expand",
  ];
  return messageActions.map((name) => (
    <button aria-label={name} key={name} type="button">
      <PixelIcon name={name} />
    </button>
  ));
}

function WorkflowToolCallFixture() {
  return (
    <main
      className="current-thread-pixel-fixture workflow-pixel-fixture"
      data-theme="dark"
      data-visual-scene="current-thread-tool-call"
    >
      <ConversationThreadShell
        composer={<WorkflowPixelComposer />}
        header={<WorkflowPixelHeader title="Run workflow visual probe" />}
        label="Tool call pixel fixture"
      >
        <AgentMessage role="user">
          Run{" "}
          <code className="workflow-pixel-fixture__inline-command">
            printf &apos;workflow visual probe\n&apos;
          </code>{" "}
          as a single read-only shell command. Then reply exactly: Tool probe
          complete.Run{" "}
          <code className="workflow-pixel-fixture__inline-command">
            printf &apos;workflow visual
            <br />
            probe\n&apos;
          </code>{" "}
          as a single read-only shell command. Then reply exactly: Tool probe
          <br />
          complete.
        </AgentMessage>
        <ActivityTimeline
          className="workflow-pixel-fixture__timeline"
          defaultOpen
          summary="Worked for 8s"
        >
          <p className="workflow-pixel-fixture__commentary">
            我会按要求执行这一条只读命令。
          </p>
          <CommandExecution
            command={"printf 'workflow visual probe\\n'"}
            hideRawCommand
            status="completed"
          />
        </ActivityTimeline>
        <AgentMessage
          actions={<WorkflowMessageActions />}
          role="assistant"
        >
          Tool probe complete.
        </AgentMessage>
      </ConversationThreadShell>
    </main>
  );
}

function WorkflowApprovalFixture() {
  return (
    <main
      className="current-thread-pixel-fixture workflow-pixel-fixture"
      data-theme="dark"
      data-visual-scene="current-thread-approval"
    >
      <ConversationThreadShell
        composer={
          <ApprovalRequest
            approveLabel="Allow once"
            autoFocus={false}
            className="workflow-pixel-fixture__approval"
            kind="command"
            onApprove={() => undefined}
            onReject={() => undefined}
            rejectLabel="Deny"
            scopedApproveAction={{
              label: "Allow this conversation",
              onClick: () => undefined,
            }}
            title="是否允许打开“计算器”？这仅用于测试审批界面。"
          >
            <ApprovalCommandPreview
              command="open -a Calculator"
              forceCollapsible={false}
            />
          </ApprovalRequest>
        }
        header={
          <WorkflowPixelHeader title="Calculator approval probe" />
        }
        label="Approval pixel fixture"
      >
        <AgentMessage role="user">
          Attempt to run{" "}
          <code className="workflow-pixel-fixture__inline-command">
            open -a Calculator
          </code>
          , but do not take any other action. This is only an approval UI
          probe.
        </AgentMessage>
        <ActivityTimeline
          className="workflow-pixel-fixture__timeline"
          defaultOpen
          summary="Working for 14s"
        >
          <p className="workflow-pixel-fixture__commentary">
            Jamin，我只会尝试执行这条命令，用于触发审批界面。
          </p>
          <CommandExecution
            command="open -a Calculator"
            hideRawCommand
            status="running"
            summary="Running open -a Calculator"
          />
        </ActivityTimeline>
      </ConversationThreadShell>
    </main>
  );
}

function WorkflowFileChangeCard() {
  const indicator = (
    <span className="workflow-pixel-fixture__file-indicator">
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <rect height="12" rx="2" width="12" x="2" y="2" />
        <path d="M5 8h6M8 5v6" />
      </svg>
    </span>
  );

  return (
    <FileChange
      additions={1}
      change="modified"
      className="workflow-pixel-fixture__file-change"
      detail={
        <span className="workflow-pixel-fixture__file-actions">
          <span className="workflow-pixel-fixture__file-stats">
            <span>+1</span>
            <span>−0</span>
          </span>
          <button type="button">
            <span>Undo</span>
            <span aria-hidden="true">↶</span>
          </button>
          <button type="button">Review</button>
        </span>
      }
      indicator={indicator}
      path="fixture.txt"
      showDiffDetails={false}
    />
  );
}

function WorkflowReviewPanel() {
  const lines: FileDiffLine[] = [
    {
      content: "workflow visual probe",
      kind: "addition",
      newLineNumber: 1,
    },
  ];

  return (
    <WorkspacePanel
      activeTabId="review"
      className="workflow-pixel-fixture__review-panel"
      label="Review"
      onActiveTabChange={() => undefined}
      onClose={() => undefined}
      onCloseTab={() => undefined}
      onExpandedChange={() => undefined}
      onOpenTab={() => undefined}
      placement="side"
      tabs={[
        {
          content: (
            <div className="workflow-pixel-fixture__review-content">
              <div className="workflow-pixel-fixture__review-toolbar">
                <button type="button">
                  Last Turn <PixelIcon name="chevron" />
                </button>
                <span className="workflow-pixel-fixture__file-stats">
                  <span>+1</span>
                  <span>−0</span>
                </span>
                <span className="workflow-pixel-fixture__review-toolbar-actions">
                  <button aria-label="Review options" type="button">
                    <PixelIcon name="more" />
                  </button>
                  <button aria-label="Diff settings" type="button">
                    <PixelIcon name="sliders" />
                  </button>
                  <button aria-label="Open file" type="button">
                    <PixelIcon name="copy" />
                  </button>
                  <button aria-label="Diff layout" type="button">
                    <PixelIcon name="panel" />
                  </button>
                  <button aria-label="Review graph" type="button">
                    <PixelIcon name="workspace" />
                  </button>
                  <button aria-label="Review layout" type="button">
                    <PixelIcon name="panel" />
                  </button>
                </span>
              </div>
              <div className="workflow-pixel-fixture__review-file">
                <div className="workflow-pixel-fixture__review-file-header">
                  <span>
                    <span
                      aria-hidden="true"
                      className="workflow-pixel-fixture__review-file-icon"
                    >
                      ▱
                    </span>
                    .research/workflow-cdp/fixture.txt
                  </span>
                  <span className="workflow-pixel-fixture__file-stats">
                    <span>+1</span>
                    <span>−0</span>
                  </span>
                </div>
                <FileDiff lines={lines} />
              </div>
            </div>
          ),
          id: "review",
          label: (
            <span className="workflow-pixel-fixture__review-tab-label">
              <span aria-hidden="true">↙</span>
              <span>Review</span>
              <span aria-hidden="true">×</span>
              <span aria-hidden="true">＋</span>
            </span>
          ),
        },
      ]}
    />
  );
}

function WorkflowFileDiffFixture() {
  return (
    <main
      className="current-thread-pixel-fixture workflow-pixel-fixture workflow-pixel-fixture--file-diff"
      data-theme="dark"
      data-visual-scene="current-workspace-file-diff"
    >
      <div className="workflow-pixel-fixture__split">
        <ConversationThreadShell
          composer={<WorkflowPixelComposer />}
          header={
            <WorkflowPixelHeader
              compact
              title="Create workflow probe fixture"
            />
          }
          label="File change pixel fixture"
        >
          <AgentMessage role="user">
            Use apply_patch to create{" "}
            <code className="workflow-pixel-fixture__inline-command">
              .research/workflow-cdp/fixture.txt
            </code>{" "}
            with exactly{" "}
            <code className="workflow-pixel-fixture__inline-command">
              workflow visual probe
            </code>{" "}
            followed by one newline. Do not change any other file. Then reply
            exactly: File probe complete.
          </AgentMessage>
          <ActivityTimeline
            className="workflow-pixel-fixture__timeline"
            summary="Worked for 7s"
          />
          <AgentMessage role="assistant">File probe complete.</AgentMessage>
          <WorkflowFileChangeCard />
        </ConversationThreadShell>
        <WorkflowReviewPanel />
      </div>
    </main>
  );
}

function WorkflowPixelFixture({ state }: { state: WorkflowPixelState }) {
  if (state === "approval") return <WorkflowApprovalFixture />;
  if (state === "file-diff") return <WorkflowFileDiffFixture />;
  return <WorkflowToolCallFixture />;
}

const browserProbeSteps = [
  {
    completed: true,
    id: "instructions",
    kind: "instruction" as const,
    label: "读取应用内浏览器技能说明",
  },
  {
    completed: true,
    id: "connect",
    kind: "connection" as const,
    label: "连接应用内浏览器",
  },
  {
    completed: true,
    id: "open",
    kind: "navigation" as const,
    label: "打开页面并读取标题",
  },
];

function ToolRecoveryThread({
  children,
  scene,
  title,
}: {
  children: ReactNode;
  scene: string;
  title: string;
}) {
  return (
    <main
      className="current-thread-pixel-fixture workflow-pixel-fixture tool-recovery-pixel-fixture"
      data-theme="dark"
      data-visual-scene={scene}
    >
      <ConversationThreadShell
        composer={<WorkflowPixelComposer approvalLabel="Approve for me" />}
        header={<WorkflowPixelHeader title={title} />}
        label={`${title} pixel fixture`}
      >
        {children}
      </ConversationThreadShell>
    </main>
  );
}

function ToolRecoveryPixelFixture({
  state,
}: {
  state: ToolRecoveryPixelState;
}) {
  if (state === "browser") {
    return (
      <ToolRecoveryThread
        scene="current-compact-browser-tool"
        title="Probe example.com page title"
      >
        <AgentMessage role="user">
          Use the in-app browser tool, not web search or shell, to open{" "}
          https://example.com and read only the page title. Do not click links
          or submit forms. Then reply exactly: Browser probe complete.
        </AgentMessage>
        <ActivityTimeline
          className="workflow-pixel-fixture__timeline"
          defaultOpen
          summary="Worked for 53s"
        >
          <p className="workflow-pixel-fixture__commentary">
            我会按要求仅用应用内浏览器打开该网址并读取页面标题，不进行其他交互。
          </p>
          <p className="workflow-pixel-fixture__commentary">
            我会依照{" "}
            <code className="workflow-pixel-fixture__inline-command">
              browser:control-in-app-browser
            </code>{" "}
            技能的限制执行这次只读页面检查。
          </p>
          <BrowserActivity
            className="tool-recovery-pixel-fixture__browser"
            defaultOpen
            status="completed"
            steps={browserProbeSteps}
            summary="Used the browser, ran a command"
          />
        </ActivityTimeline>
        <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
          Browser probe complete.
        </AgentMessage>
      </ToolRecoveryThread>
    );
  }

  if (state === "mcp-unavailable") {
    return (
      <ToolRecoveryThread
        scene="current-compact-mcp-unavailable"
        title="Probe public repo description"
      >
        <AgentMessage role="user">
          Use the GitHub connector or MCP tool, not shell or web search, to read
          only the public repository description for
          JaminZhou/codex-ui-kit. Do not access issues, pull requests, files, or
          private repositories. Then reply exactly: MCP probe complete.
        </AgentMessage>
        <ActivityTimeline
          className="workflow-pixel-fixture__timeline"
          summary="Worked for 1m 26s"
        />
        <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
          无法完成：当前会话没有可用的 GitHub connector/MCP 工具。
        </AgentMessage>
      </ToolRecoveryThread>
    );
  }

  if (state === "command-failure") {
    return (
      <ToolRecoveryThread
        scene="current-compact-command-failure"
        title="Run workflow failure probe"
      >
        <AgentMessage role="user">
          Run{" "}
          sh -c &apos;printf &quot;workflow failure probe\n&quot; &gt;&amp;2;
          exit 7&apos; as one shell command. Do not retry it. Then reply
          exactly: Failure probe complete.
        </AgentMessage>
        <ActivityTimeline
          className="workflow-pixel-fixture__timeline"
          defaultOpen
          summary="Worked for 7s"
        >
          <p className="workflow-pixel-fixture__commentary">
            我会按原命令执行一次，不重试。
          </p>
          <CommandExecution
            command={`sh -c 'printf "workflow failure probe\\n" >&2; exit 7'`}
            hideRawCommand
            status="failed"
          />
        </ActivityTimeline>
        <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
          Failure probe complete.
        </AgentMessage>
      </ToolRecoveryThread>
    );
  }

  return (
    <ToolRecoveryThread
      scene="current-compact-search-tool"
      title="Find OpenAI Codex docs title"
    >
      <AgentMessage role="user">
        Use web search, not browser or shell, to find the title of the official
        OpenAI Codex documentation landing page. Do not click unrelated results
        or submit forms. Then reply exactly: Search probe complete.
      </AgentMessage>
      <ActivityTimeline
        className="workflow-pixel-fixture__timeline"
        defaultOpen
        summary="Worked for 32s"
      >
        <p className="workflow-pixel-fixture__commentary">
          我会仅用网页搜索核对 OpenAI 官方文档结果。
        </p>
        <SearchActivity
          entries={[
            {
              completed: true,
              detail: "Official OpenAI Codex documentation",
              id: "official-codex-docs",
            },
          ]}
          kind="web"
          status="completed"
        />
      </ActivityTimeline>
      <AgentMessage actions={<WorkflowMessageActions />} role="assistant">
        Search probe complete.
      </AgentMessage>
    </ToolRecoveryThread>
  );
}

type ContinuityPixelState =
  | "context-completed"
  | "context-running"
  | "interrupted"
  | "navigation"
  | "scroll-away";

const continuityNavigationItems = Array.from({ length: 11 }, (_, index) => ({
  id: `continuity-message-${index + 1}`,
  label: `UI continuity message ${index + 1}`,
}));

function ContinuityUserActions() {
  return (
    <>
      <button aria-label="copy" type="button">
        <PixelIcon name="copy" />
      </button>
      <button aria-label="edit" type="button">
        <span aria-hidden="true">⌁</span>
      </button>
    </>
  );
}

function ContinuityPixelFixture({ state }: { state: ContinuityPixelState }) {
  const navigation = state === "navigation";
  const scrollAway = state === "scroll-away";
  const contextRunning = state === "context-running";
  const contextCompleted = state === "context-completed";
  const scene = `current-${
    navigation
      ? "medium-message-navigation"
      : scrollAway
        ? "compact-scroll-away"
        : state === "interrupted"
          ? "compact-interrupted"
          : state === "context-running"
            ? "compact-context-running"
            : "compact-context-completed"
  }`;

  return (
    <main
      className="current-thread-pixel-fixture workflow-pixel-fixture continuity-pixel-fixture"
      data-theme="dark"
      data-visual-scene={scene}
    >
      <ConversationThreadShell
        composer={
          <WorkflowPixelComposer
            approvalLabel="Approve for me"
            running={contextRunning}
          />
        }
        floatingControl={
          <ThreadFloatingButton
            label="Scroll to bottom"
            onClick={() => undefined}
            show={scrollAway}
          />
        }
        header={
          <WorkflowPixelHeader title="Complete UI continuity probe" />
        }
        label="Conversation continuity pixel fixture"
        messageNavigation={
          navigation ? (
            <ThreadMessageNavigationRail
              items={continuityNavigationItems.slice(0, 10)}
              onNavigate={() => undefined}
            />
          ) : null
        }
        viewportProps={{ autoFollow: false, tabIndex: -1 }}
      >
        {navigation ? (
          <>
            <AgentMessage role="assistant">Continuity 7 complete.</AgentMessage>
            <AgentMessage role="user">
              UI continuity sample 8. Reply with exactly: Continuity 8 complete.
            </AgentMessage>
            <AgentMessage role="assistant">Continuity 8 complete.</AgentMessage>
            <AgentMessage role="user">
              UI continuity sample 9. Reply with exactly: Continuity 9 complete.
            </AgentMessage>
            <AgentMessage role="assistant">Continuity 9 complete.</AgentMessage>
            <AgentMessage role="user">
              UI continuity sample 10. Reply with exactly: Continuity 10
              complete.
            </AgentMessage>
            <AgentMessage
              actions={<WorkflowMessageActions />}
              role="assistant"
            >
              Continuity 10 complete.
            </AgentMessage>
          </>
        ) : scrollAway ? (
          <>
            <AgentMessage role="user">
              UI continuity probe turn 1. Reply with exactly: Probe 1 complete.
            </AgentMessage>
            <AgentMessage role="assistant">Probe 1 complete.</AgentMessage>
            <AgentMessage role="user">
              UI continuity probe turn 1. Reply with exactly: Probe 1 complete.
            </AgentMessage>
            <AgentMessage role="assistant">Probe 1 complete.</AgentMessage>
            <AgentMessage role="user">
              UI continuity probe turn 2. Reply with exactly: Probe 2 complete.
            </AgentMessage>
          </>
        ) : (
          <>
            {!contextRunning ? (
              <AgentMessage role="assistant">
                Continuity 9 complete.
              </AgentMessage>
            ) : null}
            <AgentMessage
              actions={contextRunning ? <ContinuityUserActions /> : undefined}
              role="user"
            >
              UI continuity sample 10. Reply with exactly: Continuity 10
              complete.
            </AgentMessage>
            <AgentMessage role="assistant">Continuity 10 complete.</AgentMessage>
            <AgentMessage
              actions={<ContinuityUserActions />}
              role="user"
            >
              UI interruption probe. Write 60 numbered short sentences, one per
              line.
            </AgentMessage>
            <ThreadInterruptionSummary durationMs={2_000} />
            {contextRunning ? (
              <ThreadContextEvent status="running" />
            ) : null}
            {contextCompleted ? (
              <ThreadContextEvent status="completed" />
            ) : null}
          </>
        )}
      </ConversationThreadShell>
    </main>
  );
}

function Showcase() {
  const [dark, setDark] = useState(false);
  const [composerValue, setComposerValue] = useState(
    "Add keyboard navigation to the activity timeline.",
  );
  const [composerRunning, setComposerRunning] = useState(false);
  const [composerStatus, setComposerStatus] = useState("Ready to submit");
  const [hasAttachment, setHasAttachment] = useState(true);
  const [mentionOpen, setMentionOpen] = useState(true);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPrompt[]>([
    { id: "queue-tests", text: "Run the complete test matrix" },
    {
      attachmentSummary: "1 attachment",
      id: "queue-fix",
      status: "paused",
      text: "Fix the remaining visual mismatch",
    },
    { id: "queue-docs", status: "editing", text: "Update parity notes" },
  ]);
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision>("pending");
  const [approvalActionStatus, setApprovalActionStatus] = useState(
    "Approval actions ready",
  );
  const [wrapMarkdownCode, setWrapMarkdownCode] = useState(false);
  const [markdownCopyStatus, setMarkdownCopyStatus] = useState("Ready to copy");
  const [planActionStatus, setPlanActionStatus] = useState("Plan actions ready");
  const [toolActionStatus, setToolActionStatus] = useState(
    "Raw tool output ready",
  );
  const [noticeActionStatus, setNoticeActionStatus] = useState(
    "Notice actions ready",
  );
  const [selectedSubagent, setSelectedSubagent] =
    useState<SubagentItem | null>(null);
  const [executionMode, setExecutionMode] = useState("local");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [primitiveStatus, setPrimitiveStatus] = useState(
    "Interactive controls ready",
  );
  const [continuationDialogOpen, setContinuationDialogOpen] = useState(false);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(true);
  const [navigationStatus, setNavigationStatus] = useState("Navigation ready");
  const [terminalValue, setTerminalValue] = useState("");
  const [terminalCommands, setTerminalCommands] = useState<string[]>([]);
  const [threadStatus, setThreadStatus] = useState("Thread states ready");
  const [threadComposerValue, setThreadComposerValue] = useState("");
  const [appSidebarOpen, setAppSidebarOpen] = useState(true);
  const [appSidePanelOpen, setAppSidePanelOpen] = useState(true);
  const [appBottomPanelOpen, setAppBottomPanelOpen] = useState(false);
  const [appWorkspaceTab, setAppWorkspaceTab] = useState("sources");
  const [appComposerValue, setAppComposerValue] = useState(
    "Inspect the remaining P0 shell states.",
  );
  const [workflowProject, setWorkflowProject] = useState("ui-kit");
  const [workflowRunLocation, setWorkflowRunLocation] =
    useState("worktree");
  const [workflowWorktree, setWorkflowWorktree] =
    useState("feature");
  const [routingProject, setRoutingProject] = useState("ui-kit");
  const [routingRoute, setRoutingRoute] = useState("local");
  const [routingWorktree, setRoutingWorktree] = useState("routing");
  const [routingComposerValue, setRoutingComposerValue] = useState("");
  const [routingContextReady, setRoutingContextReady] =
    useState(false);
  const [routingProjectOptionsOpen, setRoutingProjectOptionsOpen] =
    useState(false);
  const [localEnvironmentDialogOpen, setLocalEnvironmentDialogOpen] =
    useState(false);
  const [
    localEnvironmentDialogOwner,
    setLocalEnvironmentDialogOwner,
  ] = useState<"environment" | "worktree">();
  const [localEnvironmentQuery, setLocalEnvironmentQuery] = useState("");
  const [branchCreationDialogOpen, setBranchCreationDialogOpen] =
    useState(false);
  const [branchCreationName, setBranchCreationName] = useState("");
  const [branchCreationError, setBranchCreationError] = useState<string>();
  const [routingStatus, setRoutingStatus] = useState(
    "Choose a project route",
  );
  const [selectedPullRequest, setSelectedPullRequest] = useState("50");
  const [activeNavigationMessageId, setActiveNavigationMessageId] = useState<string>(
    navigationMessages[2].id,
  );

  const selectRoutingProject = (projectId: string) => {
    setRoutingProject(projectId);
    setRoutingWorktree(
      projectId === "desktop" ? "main" : "routing",
    );
    setRoutingProjectOptionsOpen(false);
    setRoutingStatus(`Selected ${projectId}`);
  };

  const reorderQueuedPrompts = (activeId: string, overId: string) => {
    setQueuedPrompts((current) => {
      const activeIndex = current.findIndex((item) => item.id === activeId);
      const overIndex = current.findIndex((item) => item.id === overId);
      if (activeIndex < 0 || overIndex < 0) return current;
      const next = [...current];
      const [active] = next.splice(activeIndex, 1);
      if (!active) return current;
      next.splice(overIndex, 0, active);
      return next;
    });
  };

  return (
    <main
      className="showcase"
      data-codex-ui
      data-theme={dark ? "dark" : "light"}
    >
      <header className="showcase__topbar">
        <a className="showcase__brand" href="#top" aria-label="Codex UI Kit home">
          <span className="showcase__brand-mark" aria-hidden="true">
            C
          </span>
          <span>codex-ui-kit</span>
        </a>
        <div className="showcase__topbar-actions">
          <span className="showcase__version">coverage preview</span>
          <a
            className="showcase__source-link"
            href="https://github.com/JaminZhou/codex-ui-kit"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <button type="button" onClick={() => setDark((value) => !value)}>
            {dark ? "Light" : "Dark"} theme
          </button>
        </div>
      </header>

      <div className="showcase__content" id="top">
        <section className="showcase__hero">
          <span className="showcase__eyebrow">Independent React primitives</span>
          <h1>Build clear coding-agent threads.</h1>
          <p>
            Protocol-neutral components for messages, activities, tools, and
            the states between them. Designed from interaction research and
            implemented independently.
          </p>
          <div
            aria-label="Package highlights"
            className="showcase__hero-meta"
            role="group"
          >
            <span>React 18+</span>
            <span>TypeScript</span>
            <span>Light + dark</span>
            <span>MIT</span>
          </div>
        </section>

        <div className="gallery-grid">
          <GalleryCard
            description="A protocol-neutral application skeleton with navigation, conversation, responsive side panels, and a bottom terminal surface."
            title="Application and workspace shell"
            wide
          >
            <div className="app-shell-preview">
              <AppShell
                bottomPanel={
                  <WorkspacePanel
                    activeTabId="terminal"
                    label="Bottom panel"
                    onActiveTabChange={() => undefined}
                    onClose={() => setAppBottomPanelOpen(false)}
                    onOpenTab={() => setAppBottomPanelOpen(true)}
                    placement="bottom"
                    tabs={[
                      {
                        content: (
                          <div className="app-shell-preview__terminal">
                            <code>codex-ui-kit %</code>
                            <textarea
                              aria-label="Terminal input"
                              readOnly
                              value=""
                            />
                          </div>
                        ),
                        id: "terminal",
                        label: "codex-ui-kit",
                      },
                    ]}
                  />
                }
                bottomPanelOpen={appBottomPanelOpen}
                mainLabel="Application shell preview"
                mainRole="region"
                onSidePanelOpenChange={setAppSidePanelOpen}
                onSidebarOpenChange={setAppSidebarOpen}
                sidePanel={
                  <WorkspacePanel
                    activeTabId={appWorkspaceTab}
                    label="Workspace"
                    onActiveTabChange={setAppWorkspaceTab}
                    onClose={() => setAppSidePanelOpen(false)}
                    onCloseTab={() => setAppSidePanelOpen(false)}
                    onOpenTab={() => setAppSidePanelOpen(true)}
                    tabs={[
                      {
                        content: (
                          <div className="app-shell-preview__panel-content">
                            <SourceList
                              items={[
                                {
                                  id: "conversation-source",
                                  kind: "external",
                                  meta: "Provided in the conversation",
                                  title: "example.com",
                                },
                                {
                                  id: "file-source",
                                  kind: "file",
                                  meta: "Attached to this thread",
                                  title: "UI_INVENTORY.md",
                                },
                              ]}
                            />
                          </div>
                        ),
                        id: "sources",
                        label: "Sources",
                      },
                      {
                        content: (
                          <div className="app-shell-preview__panel-content">
                            <FileDiff lines={showcaseDiffLines} />
                          </div>
                        ),
                        id: "review",
                        label: "Review",
                      },
                    ]}
                  />
                }
                sidePanelOpen={appSidePanelOpen}
                sidebar={
                  <AppSidebar
                    footer={
                      <AppSidebarItem description="Local account">
                        Profile
                      </AppSidebarItem>
                    }
                    header={<strong>Codex</strong>}
                  >
                    <AppSidebarSection>
                      <AppSidebarItem selected>New chat</AppSidebarItem>
                      <AppSidebarItem>Pull requests</AppSidebarItem>
                      <AppSidebarItem>Sites</AppSidebarItem>
                      <AppSidebarItem>Scheduled</AppSidebarItem>
                      <AppSidebarItem>Plugins</AppSidebarItem>
                    </AppSidebarSection>
                    <AppSidebarSection title="codex-ui-kit">
                      <AppSidebarItem badge="12">P0 shell parity</AppSidebarItem>
                      <AppSidebarItem>Runtime inventory</AppSidebarItem>
                    </AppSidebarSection>
                  </AppSidebar>
                }
                sidebarOpen={appSidebarOpen}
                sidebarResizable
              >
                <div className="app-shell-preview__conversation">
                  <ThreadHeader
                    endActions={
                      <>
                        <IconButton
                          icon={<span>▥</span>}
                          label="Toggle bottom panel"
                          onClick={() =>
                            setAppBottomPanelOpen((value) => !value)
                          }
                          pressed={appBottomPanelOpen}
                        />
                        <IconButton
                          icon={<span>▤</span>}
                          label="Toggle workspace panel"
                          onClick={() =>
                            setAppSidePanelOpen((value) => !value)
                          }
                          pressed={appSidePanelOpen}
                        />
                      </>
                    }
                    navigation={
                      <ThreadNavigationControls
                        historyControls={false}
                        onToggleSidebar={() =>
                          setAppSidebarOpen((value) => !value)
                        }
                        sidebarOpen={appSidebarOpen}
                      />
                    }
                    position="static"
                    subtitle="codex-ui-kit"
                    title="P0 shell parity"
                  />
                  <AgentThreadViewport
                    footer={
                      <div className="app-shell-preview__composer">
                        <AgentComposer
                          controls={
                            <>
                              <button type="button">Local</button>
                              <button type="button">Ask for approval</button>
                            </>
                          }
                          onSubmit={() => setAppComposerValue("")}
                          onValueChange={setAppComposerValue}
                          value={appComposerValue}
                        />
                      </div>
                    }
                  >
                    <AgentThread>
                      <AgentMessage metadata="You · now" role="user">
                        Restore the full application shell before visual polish.
                      </AgentMessage>
                      <AgentTurn spacing="grouped">
                        <TurnDuration durationMs={11_000} status="worked" />
                        <CommandExecution
                          command="pnpm check"
                          durationMs={11_000}
                          exitCode={0}
                          status="completed"
                        />
                      </AgentTurn>
                      <AgentMessage role="assistant">
                        The shell now coordinates navigation, thread content,
                        Sources/Review tabs, and a bottom terminal panel.
                      </AgentMessage>
                    </AgentThread>
                  </AgentThreadViewport>
                </div>
              </AppShell>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Project, run-location, worktree, event, pull-request, check, and review surfaces composed without product transport assumptions."
            title="Workspace and pull-request workflow"
            wide
          >
            <div className="workflow-preview">
              <ProjectConversationPage
                actions={
                  <>
                    <button type="button">Open folder</button>
                    <button
                      onClick={() => {
                        setBranchCreationName("");
                        setBranchCreationError(undefined);
                        setBranchCreationDialogOpen(true);
                      }}
                      type="button"
                    >
                      Create branch
                    </button>
                  </>
                }
                description="Move from the application-owned project index into a new conversation without losing workspace context."
                footer={
                  <>
                    <output aria-live="polite">{routingStatus}</output>
                    <button
                      onClick={() =>
                        setRoutingStatus(
                          `${routingProject} · ${routingRoute} · ${routingWorktree}`,
                        )
                      }
                      type="button"
                    >
                      Start conversation
                    </button>
                  </>
                }
                projects={
                  <ProjectIndex
                    actions={<button type="button">Add</button>}
                    items={[
                      {
                        description: "Component workspace",
                        id: "ui-kit",
                        label: "codex-ui-kit",
                        meta: "3 tasks",
                        path: "/Developer/codex-ui-kit",
                      },
                      {
                        description: "Desktop application",
                        id: "desktop",
                        label: "Codex desktop",
                        meta: "1 task",
                        path: "/Applications/ChatGPT.app",
                      },
                      {
                        id: "repair",
                        label: "Unavailable project",
                        status: "unavailable",
                        statusLabel: "Repair",
                      },
                    ]}
                    onSelect={selectRoutingProject}
                    selectedId={routingProject}
                    toolbar={
                      <input
                        aria-label="Search project routes"
                        placeholder="Search projects"
                        type="search"
                      />
                    }
                  />
                }
                title="Project to conversation"
              >
                <NewConversationStart
                  composer={
                    <AgentComposer
                      onSubmit={() => {
                        setRoutingStatus("Conversation started");
                        setRoutingComposerValue("");
                      }}
                      onValueChange={setRoutingComposerValue}
                      value={routingComposerValue}
                    />
                  }
                  context={
                    routingContextReady ? (
                      <>
                        <ConversationContextBar
                          data-local-environment-context="true"
                          expandedId={
                            routingProjectOptionsOpen
                              ? "project"
                              : localEnvironmentDialogOpen
                                ? localEnvironmentDialogOwner
                                : undefined
                          }
                          items={[
                            {
                              controlsId:
                                "showcase-routing-project-options",
                              icon: <span>▦</span>,
                              id: "project",
                              kind: "project",
                              label: routingProject,
                              popupRole: "listbox",
                              triggerId:
                                "showcase-routing-project-trigger",
                            },
                            {
                              controlsId:
                                "showcase-local-environment-dialog",
                              icon: <span>⌘</span>,
                              id: "environment",
                              kind: "environment",
                              label:
                                routingRoute === "local"
                                  ? "Local"
                                  : routingRoute,
                            },
                            {
                              controlsId:
                                "showcase-local-environment-dialog",
                              icon: <span>⑂</span>,
                              id: "worktree",
                              kind: "worktree",
                              label: routingWorktree,
                            },
                          ]}
                          onSelect={(itemId) => {
                            if (itemId === "project") {
                              setLocalEnvironmentDialogOwner(undefined);
                              setLocalEnvironmentDialogOpen(false);
                              setRoutingProjectOptionsOpen(
                                (open) => !open,
                              );
                              setRoutingStatus("Choose a project");
                              return;
                            }
                            setRoutingProjectOptionsOpen(false);
                            setLocalEnvironmentDialogOwner(
                              itemId === "worktree"
                                ? "worktree"
                                : "environment",
                            );
                            setLocalEnvironmentDialogOpen(true);
                            setRoutingStatus(
                              itemId === "environment"
                                ? "Choose an environment"
                                : "Choose a worktree",
                            );
                          }}
                        />
                        {routingProjectOptionsOpen ? (
                          <ConversationProjectListbox
                            id="showcase-routing-project-options"
                            items={showcaseConversationProjects}
                            onDismiss={() =>
                              setRoutingProjectOptionsOpen(false)
                            }
                            onSelect={selectRoutingProject}
                            selectedId={routingProject}
                            triggerId="showcase-routing-project-trigger"
                          />
                        ) : null}
                      </>
                    ) : null
                  }
                  description="Destination, project, execution environment, and worktree remain independent."
                  destination="ChatGPT"
                  prompt={
                    !routingContextReady ? (
                      <button
                        onClick={() => {
                          setRoutingContextReady(true);
                          setRoutingProjectOptionsOpen(false);
                          setRoutingStatus(
                            "Choose project, environment, and worktree",
                          );
                          window.setTimeout(() =>
                            document
                              .getElementById(
                                "showcase-routing-project-trigger",
                              )
                              ?.focus(),
                          );
                        }}
                        type="button"
                      >
                        Choose a project to use a worktree
                      </button>
                    ) : undefined
                  }
                />
              </ProjectConversationPage>
              <LocalEnvironmentDialog
                createAction={
                  <button
                    onClick={() => {
                      setRoutingStatus("Local environment creation requested");
                      setLocalEnvironmentDialogOwner(undefined);
                      setLocalEnvironmentDialogOpen(false);
                    }}
                    type="button"
                  >
                    Create environment
                  </button>
                }
                groups={[
                  {
                    description: "Current checkout and linked worktrees",
                    id: "ui-kit",
                    items: [
                      {
                        branch: "feat/new-chat-context",
                        id: "routing",
                        label: "New chat context",
                        meta: "2 changes",
                      },
                      {
                        branch: "main",
                        id: "main",
                        label: "Main",
                        meta: "clean",
                      },
                      {
                        branch: "fix/repair",
                        id: "repairing",
                        label: "Repairing checkout",
                        status: "repairing",
                        statusLabel: "Repairing",
                      },
                    ],
                    label: "UI Kit",
                  },
                  {
                    description: "Application environment",
                    id: "desktop",
                    items: [
                      {
                        branch: "main",
                        id: "desktop-main",
                        label: "Desktop main",
                        meta: "clean",
                      },
                    ],
                    label: "Codex desktop",
                  },
                ]}
                id="showcase-local-environment-dialog"
                onOpenChange={(open) => {
                  setLocalEnvironmentDialogOpen(open);
                  if (!open) {
                    setLocalEnvironmentDialogOwner(undefined);
                  }
                }}
                onQueryChange={setLocalEnvironmentQuery}
                onSelect={(groupId, itemId) => {
                  setRoutingProject(groupId);
                  setRoutingRoute("local");
                  setRoutingWorktree(
                    itemId === "desktop-main" ? "main" : itemId,
                  );
                  setRoutingStatus(`Selected local/${itemId}`);
                  setLocalEnvironmentDialogOwner(undefined);
                  setLocalEnvironmentDialogOpen(false);
                }}
                open={localEnvironmentDialogOpen}
                query={localEnvironmentQuery}
              />
              <BranchCreationDialog
                branchName={branchCreationName}
                error={branchCreationError}
                onBranchNameChange={(branchName) => {
                  setBranchCreationName(branchName);
                  setBranchCreationError(undefined);
                }}
                onCreate={(branchName) => {
                  if (branchName === "main") {
                    setBranchCreationError(
                      "A branch named main already exists.",
                    );
                    return;
                  }
                  setRoutingWorktree(branchName);
                  setRoutingStatus(`Created and checked out ${branchName}`);
                  setBranchCreationDialogOpen(false);
                }}
                onOpenChange={setBranchCreationDialogOpen}
                onSetPrefix={() => {
                  setBranchCreationDialogOpen(false);
                  setRoutingStatus(
                    "Open Git settings to set a branch prefix",
                  );
                }}
                open={branchCreationDialogOpen}
              />

              <div className="workflow-preview__grid">
                <WorkspaceSelection
                  description="Choose the repository context before starting the next session."
                  footer={
                    <output aria-live="polite">
                      {workflowProject} · {workflowRunLocation} ·{" "}
                      {workflowWorktree}
                    </output>
                  }
                  title="Session workspace"
                >
                  <ProjectPicker
                    onProjectChange={setWorkflowProject}
                    projects={[
                      {
                        description: "Current project",
                        id: "ui-kit",
                        label: "codex-ui-kit",
                        path: "/Developer/codex-ui-kit",
                      },
                      {
                        description: "Desktop host",
                        id: "desktop",
                        label: "Codex desktop",
                        path: "/Applications/Codex.app",
                      },
                    ]}
                    value={workflowProject}
                  />
                  <RunLocationMenu
                    onValueChange={setWorkflowRunLocation}
                    options={[
                      {
                        description: "Use the current checkout",
                        id: "local",
                        label: "Local",
                      },
                      {
                        description: "Keep changes isolated",
                        id: "worktree",
                        label: "Worktree",
                      },
                      {
                        disabled: true,
                        id: "cloud",
                        label: "Cloud",
                        status: "unavailable",
                        statusLabel: "Unavailable",
                      },
                    ]}
                    value={workflowRunLocation}
                  />
                  <WorktreePicker
                    onWorktreeChange={setWorkflowWorktree}
                    value={workflowWorktree}
                    worktrees={[
                      {
                        branch: "feat/workflow-surfaces",
                        id: "feature",
                        label: "Workflow surfaces",
                      },
                      {
                        branch: "main",
                        id: "main",
                        label: "Main checkout",
                      },
                      {
                        branch: "fix/repairing",
                        id: "repairing",
                        label: "Repairing worktree",
                        status: "repairing",
                        statusLabel: "Repairing",
                      },
                    ]}
                  />
                </WorkspaceSelection>

                <div className="workflow-preview__events">
                  <div className="workflow-preview__surface-heading">
                    <h3>Conversation events</h3>
                    <span>turn + thread ownership</span>
                  </div>
                  <ConversationEventList
                    label="Workflow event taxonomy"
                    tabIndex={0}
                  >
                    <ConversationEvent
                      description="Mapped public interaction states."
                      kind="reasoning"
                      meta="4s"
                      title="Reasoned about the surface inventory"
                    />
                    <ConversationEvent
                      description="Official documentation and local research."
                      kind="search"
                      meta="3 sources"
                      title="Searched implementation evidence"
                    />
                    <ConversationEvent
                      description="Typecheck, component tests, and package build."
                      kind="command"
                      meta="running"
                      status="running"
                      title="Running pnpm check"
                    />
                    <ConversationEvent
                      description="3 components · 1 stylesheet"
                      kind="file-change"
                      title="Changed workflow surfaces"
                    />
                    <ConversationEvent
                      description="Waiting for the host to authorize the action."
                      kind="approval"
                      status="pending"
                      title="Approval requested"
                    />
                    <ConversationEvent
                      description="The delegated task returned its result."
                      kind="subagent"
                      ownership="thread"
                      title="Subagent completed"
                    />
                    <ConversationEvent
                      description="The target branch needs attention before replay."
                      kind="handoff"
                      ownership="thread"
                      status="warning"
                      title="Worktree handoff paused"
                    />
                  </ConversationEventList>
                </div>
              </div>

              <PullRequestPage
                label="Pull request workflow preview"
                list={
                  <PullRequestList
                    items={[
                      {
                        author: "Jamin",
                        checkStatus: "passed",
                        commentCount: 0,
                        id: "50",
                        number: 50,
                        repository: "codex-ui-kit",
                        state: "open",
                        title: "Add current application shell",
                        updatedAt: "now",
                      },
                      {
                        author: "Jamin",
                        checkStatus: "running",
                        commentCount: 1,
                        id: "51",
                        number: 51,
                        repository: "codex-ui-kit",
                        state: "draft",
                        title: "Add workflow and review surfaces",
                        updatedAt: "2m",
                      },
                    ]}
                    onSelect={setSelectedPullRequest}
                    selectedId={selectedPullRequest}
                    toolbar={
                      <input
                        aria-label="Search pull requests"
                        placeholder="Search pull requests"
                        type="search"
                      />
                    }
                  />
                }
                toolbar={
                  <>
                    <strong>Pull requests</strong>
                    <span>Open</span>
                  </>
                }
              >
                <PullRequestDetails
                  actions={
                    <button type="button">
                      {selectedPullRequest === "50"
                        ? "Merge"
                        : "Ready for review"}
                    </button>
                  }
                  additions={selectedPullRequest === "50" ? 284 : 428}
                  author="Jamin"
                  deletions={selectedPullRequest === "50" ? 18 : 32}
                  filesChanged={selectedPullRequest === "50" ? 9 : 14}
                  number={selectedPullRequest}
                  repository="codex-ui-kit"
                  sourceBranch={
                    selectedPullRequest === "50"
                      ? "feat/current-ui-inventory"
                      : "feat/workflow-surfaces"
                  }
                  state={selectedPullRequest === "50" ? "open" : "draft"}
                  targetBranch="main"
                  title={
                    selectedPullRequest === "50"
                      ? "Add current application shell"
                      : "Add workflow and review surfaces"
                  }
                >
                  <PullRequestCheckList
                    checks={[
                      {
                        duration: "1m 12s",
                        id: "ci",
                        name: "CI",
                        status: "passed",
                      },
                      {
                        description: "Automated review",
                        id: "review",
                        name: "Codex",
                        status:
                          selectedPullRequest === "50"
                            ? "passed"
                            : "running",
                      },
                    ]}
                  />
                  <PullRequestReviewSummary
                    reviewers={[
                      {
                        id: "codex",
                        name: "Codex",
                        status:
                          selectedPullRequest === "50"
                            ? "approved"
                            : "commented",
                        summary:
                          selectedPullRequest === "50"
                            ? "No blocking findings"
                            : "One suggestion",
                      },
                    ]}
                  />
                  <PullRequestReviewThread
                    actions={<button type="button">Resolve</button>}
                    author="Codex"
                    line={42}
                    path="src/components/WorkspaceSelection.tsx"
                    resolved={selectedPullRequest === "50"}
                  >
                    Keep the workspace option state available to assistive
                    technology while the menu is open.
                  </PullRequestReviewThread>
                </PullRequestDetails>
              </PullRequestPage>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Current-build measured header, centered timeline, completed message actions, and overlay composer in one responsive composition."
            title="Current conversation shell"
            wide
          >
            <div className="thread-preview">
              <ConversationThreadShell
                composer={
                  <AgentComposer
                    actions={
                      <button aria-label="Add attachment" type="button">
                        +
                      </button>
                    }
                    controls={
                      <>
                        <button type="button">Approve for me</button>
                        <button type="button">Local</button>
                      </>
                    }
                    layout="multiline"
                    onSubmit={(value) => {
                      setThreadStatus(`Submitted: ${value}`);
                      setThreadComposerValue("");
                    }}
                    onValueChange={setThreadComposerValue}
                    value={threadComposerValue}
                  />
                }
                header={
                  <ThreadHeader
                    endActions={
                      <>
                        <IconButton
                          icon={<span>⌘</span>}
                          label="Open in editor"
                        />
                        <IconButton
                          icon={<span>☷</span>}
                          label="Open thread summary"
                        />
                        <IconButton
                          icon={<span>▣</span>}
                          label="Toggle bottom panel"
                        />
                        <IconButton
                          icon={<span>◫</span>}
                          label="Toggle workspace panel"
                        />
                      </>
                    }
                    navigation={
                      <IconButton
                        icon={<span>▱</span>}
                        label="Open project"
                      />
                    }
                    position="static"
                    startActions={
                      <IconButton
                        icon={<span>•••</span>}
                        label="More thread actions"
                      />
                    }
                    title="Current conversation shell"
                  />
                }
                label="Current conversation shell preview"
                viewportProps={{ followKey: threadStatus }}
              >
                <AgentMessage role="user">
                  Please verify the current conversation layout.
                </AgentMessage>
                <AgentMessage
                  actions={
                    <>
                      <IconButton
                        icon={<span>□</span>}
                        label="Copy response"
                        onClick={() => setThreadStatus("Copied response")}
                      />
                      <IconButton
                        icon={<span>−</span>}
                        label="Response was not helpful"
                      />
                      <IconButton
                        icon={<span>+</span>}
                        label="Response was helpful"
                      />
                      <IconButton
                        icon={<span>↗</span>}
                        label="Expand response"
                      />
                    </>
                  }
                  role="assistant"
                >
                  The measured header, timeline, and composer now share one
                  responsive shell.
                </AgentMessage>
              </ConversationThreadShell>
            </div>
            <output
              aria-live="polite"
              className="thread-preview__status"
            >
              {threadStatus}
            </output>
            <div className="thread-state-matrix">
              <div>
                <span>Expanded activity timeline</span>
                <AgentThread aria-label="Thread activity states">
                  <AgentMessage
                    actions={
                      <button
                        className="thread-message-action"
                        onClick={() => setThreadStatus("Copied user message")}
                        type="button"
                      >
                        Copy
                      </button>
                    }
                    highlighted
                    metadata="You · now"
                    onEdit={() => setThreadStatus("Editing user message")}
                    role="user"
                  >
                    Add a compact activity timeline and verify the component tests.
                  </AgentMessage>

                  <AgentMessage role="assistant">
                    <p>
                      I’ll inspect the component model, make the change, and run
                      checks.
                    </p>
                  </AgentMessage>

                  <AgentTurn spacing="grouped">
                    <ActivityTimeline
                      defaultOpen
                      persistentContent={
                        <ToolCallCard
                          name="pnpm check"
                          status="running"
                          summary="Typechecking, testing, and building the package"
                        />
                      }
                      shouldShowPersistentContentGap
                      summary={<TurnDuration durationMs={4_200} status="working" />}
                    >
                      <ActivityGroup aria-label="Previous agent activity">
                        <AgentReasoning status="completed">
                          <p>Inspected the existing component boundaries.</p>
                        </AgentReasoning>
                        <AgentActivity
                          defaultOpen
                          detail="3 files"
                          kind="file-change"
                          status="completed"
                          summary="Implemented thread primitives"
                        >
                          <ul>
                            <li>Added an expandable activity primitive.</li>
                            <li>Added responsive thread and grouping layout.</li>
                            <li>Added semantic light and dark tokens.</li>
                          </ul>
                        </AgentActivity>
                        <AgentActivity
                          kind="generic"
                          status="warning"
                          summary="Handoff to worktree needs attention"
                        />
                      </ActivityGroup>
                    </ActivityTimeline>
                    <ThreadThinkingPlaceholder />
                  </AgentTurn>

                  <AgentMessage role="assistant" status="running">
                    <LoadingShimmer>Writing the final response…</LoadingShimmer>
                  </AgentMessage>
                </AgentThread>
              </div>
              <div>
                <span>Chat loading</span>
                <ThreadLoadingState />
              </div>
              <div>
                <span>Reconnect</span>
                <ThreadLoadingState kind="reconnecting" />
              </div>
              <div>
                <span>Skeleton</span>
                <ThreadSkeleton />
              </div>
              <div>
                <span>Manual compaction</span>
                <ThreadContextOptimization mode="manual" status="completed" />
              </div>
              <div>
                <span>Work optimization</span>
                <ThreadContextOptimization mode="work" status="running" />
              </div>
              <div>
                <span>Turn render error</span>
                <ThreadRenderError
                  onRetry={() => setThreadStatus("Retried failed turn")}
                >
                  The response could not be rendered.
                </ThreadRenderError>
              </div>
              <div className="thread-state-matrix__placeholder">
                <span>Virtualized estimate · 280px</span>
                <ThreadVirtualizedPlaceholder />
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Measured 48px draggable header, 28px navigation controls, transient sidebar, and latest-message floating states."
            title="Thread header and navigation"
            wide
          >
            <div className="navigation-preview">
              <ThreadHeader
                endActions={
                  <>
                    <ThreadSummaryPopover>
                      <ThreadSummaryPanel>
                        <ThreadSummarySection
                          actions={
                            <ThreadSummaryIconButton
                              icon={<span>+</span>}
                              label="Set up local environment"
                              onClick={() =>
                                setNavigationStatus(
                                  "Requested local environment setup",
                                )
                              }
                            />
                          }
                          collapsible
                          title="Environment"
                          toggleLabel="Toggle environment summary"
                        >
                          <ThreadSummaryItem
                            label="Changes"
                            leading={<span>◫</span>}
                            meta={<ThreadSummaryDelta added={2} removed={1} />}
                          />
                          <ThreadSummaryItem
                            label="Local"
                            leading={<span>▱</span>}
                            trailing={<span>⌄</span>}
                          />
                          <ThreadSummaryItem
                            label="feat/current-context-summary"
                            leading={<span>⌘</span>}
                          />
                          <ThreadSummaryItem
                            disabled
                            label="Commit or push"
                            leading={<span>○</span>}
                          />
                          <ThreadSummaryItem
                            label="Create pull request"
                            leading={<span>◇</span>}
                            onClick={() =>
                              setNavigationStatus(
                                "Requested pull request creation",
                              )
                            }
                          />
                        </ThreadSummarySection>
                      </ThreadSummaryPanel>
                    </ThreadSummaryPopover>
                    <Tooltip content="More actions">
                      <IconButton icon={<span>•••</span>} label="More actions" />
                    </Tooltip>
                  </>
                }
                navigation={
                  <ThreadNavigationControls
                    backShortcut="⌘["
                    canGoBack
                    canGoForward={false}
                    forwardShortcut="⌘]"
                    onGoBack={() => setNavigationStatus("Navigated back")}
                    onGoForward={() => setNavigationStatus("Navigated forward")}
                    onSidebarPointerEnter={() => setFloatingPanelOpen(true)}
                    onToggleSidebar={() => {
                      setSidebarOpen((value) => !value);
                      setFloatingPanelOpen((value) => !value);
                    }}
                    sidebarOpen={sidebarOpen}
                    sidebarShortcut="⌘B"
                  />
                }
                position="static"
                subtitle="codex-ui-kit"
                title="Match the desktop thread surfaces"
              />
              <div className="navigation-preview__body">
                <ThreadMessageNavigationRail
                  activeIds={[activeNavigationMessageId]}
                  insetInlineStart="calc(var(--codex-ui-floating-panel-width) + 0.75rem)"
                  items={navigationMessages}
                  onNavigate={(item, behavior) => {
                    setActiveNavigationMessageId(item.id);
                    setNavigationStatus(
                      `${behavior === "instant" ? "Scrubbed" : "Jumped"} to ${item.id}`,
                    );
                  }}
                />
                <FloatingThreadPanel
                  className="navigation-preview__panel"
                  label="Project navigation"
                  open={floatingPanelOpen}
                  onPointerLeave={() => {
                    if (!sidebarOpen) setFloatingPanelOpen(false);
                  }}
                  topInset="var(--codex-ui-toolbar-height)"
                >
                  <div className="navigation-preview__panel-header">
                    <strong>codex-ui-kit</strong>
                    <IconButton
                      icon={<span>×</span>}
                      label="Close sidebar"
                      onClick={() => {
                        setFloatingPanelOpen(false);
                        setSidebarOpen(false);
                      }}
                    />
                  </div>
                  <button type="button">New thread</button>
                  <button type="button">Component parity</button>
                  <button type="button">Desktop acceptance</button>
                </FloatingThreadPanel>
                <p>
                  Header content remains draggable while buttons opt out. Resize
                  the browser to verify title truncation and compact navigation.
                </p>
                <output aria-live="polite">{navigationStatus}</output>
                <div className="navigation-preview__floating-states">
                  <div>
                    <span>Latest available</span>
                    <ThreadFloatingButton
                      className="navigation-preview__floating-button"
                      onClick={() => setNavigationStatus("Scrolled to bottom")}
                      show
                    />
                  </div>
                  <div>
                    <span>Working below</span>
                    <ThreadFloatingButton
                      className="navigation-preview__floating-button"
                      onClick={() => setNavigationStatus("Followed working output")}
                      show
                      working
                    />
                  </div>
                  <div>
                    <span>Hidden</span>
                    <ThreadFloatingButton
                      className="navigation-preview__floating-button"
                      show={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Card and image attachments, grouped mentions, active modes, and a reorderable queued-prompt state machine."
            title="Composer context and queue"
            wide
          >
            <div className="composer-aux-preview">
              <div className="composer-aux-preview__grid">
                <div className="composer-aux-preview__sample composer-aux-preview__sample--mentions">
                  <span>Mention tray · grouped + keyboard</span>
                  <AgentComposer
                    actions={<button type="button">+</button>}
                    controls={
                      <ComposerModeIndicator
                        clearLabel="Clear plan mode"
                        kind="plan"
                        label="Plan"
                        onClear={() => setComposerStatus("Plan mode cleared")}
                      />
                    }
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    suggestions={
                      mentionOpen ? (
                        <ComposerMentionMenu
                          groups={[
                            {
                              id: "files",
                              label: "Files",
                              options: [
                                {
                                  description: "TypeScript",
                                  icon: "TS",
                                  id: "app-file",
                                  kind: "file",
                                  label: "src/App.tsx",
                                },
                                {
                                  description: "Markdown",
                                  icon: "#",
                                  id: "readme-file",
                                  kind: "file",
                                  label: "README.md",
                                },
                              ],
                            },
                            {
                              id: "skills",
                              label: "Skills and agents",
                              options: [
                                {
                                  description: "Local skill",
                                  icon: "S",
                                  id: "browser-skill",
                                  kind: "skill",
                                  label: "browser",
                                },
                              ],
                            },
                          ]}
                          onDismiss={() => setMentionOpen(false)}
                          onSelect={(option) => {
                            setComposerStatus(`Mentioned: ${String(option.label)}`);
                            setMentionOpen(false);
                          }}
                          query="@"
                        />
                      ) : undefined
                    }
                    value="@"
                  />
                  {!mentionOpen ? (
                    <button
                      className="composer-aux-preview__reset"
                      onClick={() => setMentionOpen(true)}
                      type="button"
                    >
                      Reopen mention tray
                    </button>
                  ) : null}
                </div>

                <div className="composer-aux-preview__sample">
                  <span>
                    Attachment tray · file + folder + upload + recovery
                  </span>
                  <AgentComposer
                    attachments={
                      <>
                        <ComposerAttachment
                          kind="file"
                          label="src/AgentComposer.tsx"
                          layout="card"
                          meta="TypeScript · 12 KB"
                          onRemove={() => undefined}
                        />
                        <ComposerAttachment
                          kind="folder"
                          label="src"
                          layout="card"
                          meta="Folder"
                          onRemove={() => undefined}
                        />
                        <ComposerAttachment
                          kind="file"
                          label="current-build.zip"
                          layout="card"
                          progress={62}
                          status="uploading"
                        />
                        <ComposerAttachment
                          kind="file"
                          label="failed-upload.json"
                          layout="card"
                          onRetry={() => undefined}
                          status="error"
                        />
                        <ComposerAttachment
                          kind="image"
                          label="UI reference"
                          layout="image"
                          previewSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect width='72' height='72' fill='%23339cff'/%3E%3Cpath d='M14 50l14-17 9 10 8-9 13 16' fill='none' stroke='white' stroke-width='4'/%3E%3C/svg%3E"
                        />
                        <ComposerAttachment
                          kind="image"
                          label="Unavailable preview"
                          layout="image"
                          onRetry={() => undefined}
                          status="preview-error"
                        />
                      </>
                    }
                    controls={
                      <ComposerModeIndicator
                        clearLabel="Clear goal"
                        kind="goal"
                        label="Goal"
                        onClear={() => setComposerStatus("Goal cleared")}
                      />
                    }
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    value="Use the attached context"
                  />
                </div>

                <div className="composer-aux-preview__sample composer-aux-preview__sample--wide">
                  <span>Queued prompts · interrupted + paused + editing</span>
                  <AgentComposer
                    controls={
                      <ComposerModeIndicator
                        clearLabel="Clear review mode"
                        kind="review"
                        label="Review"
                        onClear={() => setComposerStatus("Review mode cleared")}
                      />
                    }
                    isRunning
                    onStop={() => setComposerStatus("Stopped from queue preview")}
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    queue={
                      <QueuedPromptList
                        interrupted
                        items={queuedPrompts}
                        onDelete={(id) =>
                          setQueuedPrompts((current) =>
                            current.filter((item) => item.id !== id),
                          )
                        }
                        onEdit={(id) =>
                          setQueuedPrompts((current) =>
                            current.map((item) => ({
                              ...item,
                              status: item.id === id ? "editing" : item.status,
                            })),
                          )
                        }
                        onQueueingChange={(enabled) =>
                          setComposerStatus(`Queueing ${enabled ? "on" : "off"}`)
                        }
                        onReorder={reorderQueuedPrompts}
                        onResume={() => setComposerStatus("Queue resumed")}
                        onSendNow={(id) =>
                          setComposerStatus(`Steered: ${id}`)
                        }
                      />
                    }
                    value="Add another follow-up"
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Shared button, toolbar, tooltip, popover, menu, submenu, checkbox, listbox, and modal dialog states with portal collision handling."
            title="Interactive controls and overlays"
            wide
          >
            <div className="primitive-preview">
              <div className="primitive-preview__toolbar">
                <Tooltip content="Create a chat" shortcut="⌘N">
                  <IconButton icon={<span>＋</span>} label="Create a chat" />
                </Tooltip>
                <Tooltip content="Search files" shortcut="⌘P">
                  <IconButton icon={<span>⌕</span>} label="Search files" />
                </Tooltip>
                <Menu
                  trigger={
                    <IconButton icon={<span>•••</span>} label="More actions" />
                  }
                >
                  <MenuSectionLabel>Thread</MenuSectionLabel>
                  <MenuItem
                    shortcut="⌘R"
                    onSelect={() => setPrimitiveStatus("Thread renamed")}
                  >
                    Rename
                  </MenuItem>
                  <MenuCheckboxItem
                    checked={showLineNumbers}
                    onCheckedChange={setShowLineNumbers}
                  >
                    Show line numbers
                  </MenuCheckboxItem>
                  <MenuSubmenu label="Appearance">
                    <MenuItem keepOpen>System</MenuItem>
                    <MenuItem keepOpen>Light</MenuItem>
                    <MenuItem keepOpen>Dark</MenuItem>
                  </MenuSubmenu>
                  <MenuSeparator />
                  <MenuItem
                    onSelect={() => setPrimitiveStatus("Thread deleted")}
                    tone="danger"
                  >
                    Delete
                  </MenuItem>
                </Menu>
              </div>

              <div className="primitive-preview__matrix">
                <div className="primitive-preview__sample">
                  <span>Buttons · tones + states</span>
                  <div className="primitive-preview__row">
                    <Button
                      onClick={() => setPrimitiveStatus("Primary action")}
                      tone="primary"
                    >
                      Continue
                    </Button>
                    <Button>Secondary</Button>
                    <Button tone="outline">Outline</Button>
                    <Button tone="ghost">Ghost</Button>
                    <Button tone="danger">Delete</Button>
                    <Button loading>Running</Button>
                  </div>
                </div>

                <div className="primitive-preview__sample">
                  <span>Popover + select</span>
                  <div className="primitive-preview__row">
                    <Popover
                      label="Workspace information"
                      trigger={<Button tone="outline">Workspace info</Button>}
                      width="menu-wide"
                    >
                      <div className="primitive-preview__popover-copy">
                        <strong>codex-ui-kit</strong>
                        <span>Renderer-neutral React package</span>
                      </div>
                    </Popover>
                    <Select
                      label="Execution mode"
                      onValueChange={(value) => {
                        setExecutionMode(value);
                        setPrimitiveStatus(`Execution mode: ${value}`);
                      }}
                      options={[
                        {
                          description: "Use the current workspace",
                          label: "Local",
                          value: "local",
                        },
                        {
                          description: "Run in an isolated environment",
                          label: "Cloud",
                          value: "cloud",
                        },
                        { disabled: true, label: "Unavailable", value: "off" },
                      ]}
                      value={executionMode}
                    />
                  </div>
                </div>

                <div className="primitive-preview__sample">
                  <span>Compact modal choice</span>
                  <div className="primitive-preview__row">
                    <Button
                      data-choice-dialog-trigger="true"
                      onClick={() => setContinuationDialogOpen(true)}
                      tone="outline"
                    >
                      Continue from message
                    </Button>
                  </div>
                </div>

                <div className="primitive-preview__sample primitive-preview__sample--wide">
                  <span>Live state</span>
                  <output aria-live="polite">
                    {primitiveStatus} · line numbers {showLineNumbers ? "on" : "off"}
                  </output>
                </div>
              </div>
            </div>
            <Dialog
              onOpenChange={setContinuationDialogOpen}
              open={continuationDialogOpen}
              showClose={false}
              size="compact"
              title="Continue in a new chat"
            >
              <DialogChoice
                description="Continue from this message in the current workspace"
                icon={<span>◇</span>}
                label="Use this workspace"
                onSelect={() => {
                  setPrimitiveStatus("Continued in workspace");
                  setContinuationDialogOpen(false);
                }}
              />
              <DialogChoice
                description="Continue from this message in a new worktree"
                icon={<span>◇</span>}
                label="Use a new worktree"
                onSelect={() => {
                  setPrimitiveStatus("Continued in new worktree");
                  setContinuationDialogOpen(false);
                }}
              />
            </Dialog>
          </GalleryCard>

          <GalleryCard
            description="Files, websites, Drive items, citations, artifacts, generated-image overflow, pending placeholders, and keyboard preview."
            title="Resources, sources, and generated images"
            wide
          >
            <div className="resource-preview">
              <div className="resource-preview__surface resource-preview__surface--wide">
                <span className="resource-preview__label">Generated images · overflow + preview</span>
                <GeneratedImageGallery
                  images={resourceImages}
                  onOpenImage={(image) => setPreviewImageId(image.id)}
                />
              </div>
              <div className="resource-preview__surface">
                <span className="resource-preview__label">Inline resources · first three + reveal</span>
                <ResourceList>
                  <ResourceCard
                    hoverLabel="Open in editor"
                    kind="document"
                    subtitle="Document · MD"
                    title="research-notes.md"
                  />
                  <ResourceCard
                    hoverLabel="Open in browser"
                    kind="website"
                    subtitle="Website"
                    title="Component research"
                  />
                  <ResourceCard
                    hoverLabel="Open in Drive"
                    kind="spreadsheet"
                    subtitle="Google Sheets"
                    title="Parity matrix"
                  />
                  <ResourceCard
                    action={<Button size="small" tone="ghost">Share</Button>}
                    hoverLabel="Open app"
                    kind="app"
                    subtitle="Interactive app"
                    title="Acceptance lab"
                  />
                  <ResourceCard
                    hoverLabel="Open image preview"
                    kind="image"
                    previewSrc={resourceImages[0]?.src}
                    subtitle="Image · PNG"
                    title="generated-preview.png"
                  />
                </ResourceList>
              </div>
              <div className="resource-preview__surface">
                <span className="resource-preview__label">Sources · compact + full</span>
                <SourceList
                  items={[
                    {
                      id: "attached-source",
                      kind: "file",
                      meta: "Attached to the conversation",
                      title: "renderer-observations.md",
                    },
                    {
                      id: "web-source",
                      kind: "web",
                      meta: "Web search",
                      title: "React accessibility reference",
                    },
                    {
                      id: "tool-source",
                      kind: "tool",
                      meta: "Connector result",
                      title: "Issue parity audit",
                    },
                    {
                      id: "external-source",
                      kind: "external",
                      meta: "External resource",
                      title: "Renderer architecture notes",
                    },
                  ]}
                  visibleLimit={3}
                />
              </div>
              <div className="resource-preview__surface">
                <span className="resource-preview__label">Generating · reserved square slots</span>
                <GeneratedImageGallery
                  images={resourceImages.slice(0, 2)}
                  onOpenImage={(image) => setPreviewImageId(image.id)}
                  pendingCount={2}
                />
              </div>
              <div className="resource-preview__surface resource-preview__empty">
                <span className="resource-preview__label">Artifacts · empty</span>
                <ArtifactList />
              </div>
            </div>
            <ImagePreviewDialog
              imageId={previewImageId}
              images={resourceImages}
              onOpenChange={(open) => {
                if (!open) setPreviewImageId(null);
              }}
              open={previewImageId !== null}
            />
          </GalleryCard>

          <GalleryCard
            description="Delegated-work activity, summary aggregation, active/done lists, pagination, and nested transcript navigation."
            title="Subagents and delegated work"
            wide
          >
            <div className="subagent-preview">
              <div className="subagent-preview__surface subagent-preview__surface--wide">
                <span className="subagent-preview__label">Thread activity</span>
                <div className="subagent-preview__activity">
                  <SubagentActivity item={subagentActivities[0]} />
                  <SubagentActivityGroup
                    items={subagentActivities}
                    onOpen={(item) =>
                      setSelectedSubagent(
                        showcaseSubagents.find((agent) => agent.id === item.id) ??
                          null,
                      )
                    }
                  />
                  <SubagentActivityGroup
                    animateEntrance={false}
                    items={subagentActivities.slice(0, 2).map((item) => ({
                      ...item,
                      activityStatus: "done",
                    }))}
                  />
                  <SubagentActivity
                    item={{
                      activityStatus: "interrupted",
                      id: "tester-thread",
                      name: "Tester",
                    }}
                  />
                </div>
              </div>

              <div className="subagent-preview__surface">
                <span className="subagent-preview__label">Thread summary</span>
                <SubagentSummary
                  items={showcaseSubagents.slice(0, 5)}
                  onOpenSubagent={setSelectedSubagent}
                  onOpenSummary={() => setSelectedSubagent(null)}
                />
                <SubagentSummary
                  items={showcaseSubagents
                    .filter((item) => item.status === "done")
                    .map((item) => ({ ...item, presentation: "row" }))}
                  title="Completed section"
                />
              </div>

              <div className="subagent-preview__surface subagent-preview__panel-shell">
                <span className="subagent-preview__label">Subagents panel</span>
                <div className="subagent-preview__panel">
                  {selectedSubagent ? (
                    <>
                      <SubagentTranscriptHeader
                        item={selectedSubagent}
                        onBack={() => setSelectedSubagent(null)}
                      />
                      <div className="subagent-preview__transcript">
                        <strong>{selectedSubagent.name}</strong>
                        <p>
                          Nested subagent transcripts remain host-rendered; the
                          header preserves the selected identity and back path.
                        </p>
                      </div>
                    </>
                  ) : (
                    <SubagentPanel
                      items={showcaseSubagents.map((item) => ({
                        ...item,
                        presentation: "row",
                      }))}
                      onSelect={setSelectedSubagent}
                    />
                  )}
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Code and web searches plus generic MCP, connector, browser, result, raw-output, empty, and error states."
            title="Search and tool calls"
            wide
          >
            <div className="tool-preview">
              <div className="tool-preview__controls">
                <span>Protocol-neutral state matrix</span>
                <output aria-live="polite">{toolActionStatus}</output>
              </div>
              <div className="tool-preview__grid">
                <div className="tool-preview__surface tool-preview__surface--wide">
                  <span className="tool-preview__label">Web · running accordion</span>
                  <SearchActivity
                    defaultOpen
                    entries={webSearchEntries}
                    kind="web"
                    status="running"
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">Web · completed</span>
                  <SearchActivity
                    entries={webSearchEntries.map((entry) => ({
                      ...entry,
                      completed: true,
                    }))}
                    kind="web"
                    status="completed"
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">Code · active</span>
                  <SearchActivity
                    kind="code"
                    path="src/components"
                    query="AgentActivity"
                    status="running"
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">MCP · running</span>
                  <ToolCallCard
                    activeLabel="Searching issues"
                    icon={<span className="tool-preview__source-mark">G</span>}
                    name="search_issues"
                    source="GitHub"
                    status="running"
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">Connector · result</span>
                  <ToolCallCard
                    completedLabel="Searched issues"
                    defaultOpen
                    icon={<span className="tool-preview__source-mark">G</span>}
                    name="search_issues"
                    onViewRawOutput={() =>
                      setToolActionStatus("Opened raw GitHub tool output")
                    }
                    rawOutput={{ callId: "call-github-1" }}
                    source="GitHub"
                    status="completed"
                    structuredContent={{
                      count: 2,
                      issues: ["#14 File diff parity", "#15 Search parity"],
                    }}
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">Browser · completed</span>
                  <BrowserActivity
                    defaultOpen
                    status="completed"
                    steps={browserProbeSteps}
                    summary="Used the browser, ran a command"
                  />
                </div>
                <div className="tool-preview__surface">
                  <span className="tool-preview__label">MCP · failed</span>
                  <ToolCallCard
                    defaultOpen
                    error="Connector authorization expired"
                    failedLabel="GitHub search failed"
                    icon={<span className="tool-preview__source-mark">G</span>}
                    name="search_issues"
                    source="GitHub"
                    status="failed"
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Observed disclosure defaults, plan progress, and proposed-plan actions across every sampled state."
            title="Reasoning and plans"
            wide
          >
            <div className="reasoning-plan-preview">
              <div className="reasoning-plan-preview__surface">
                <span className="reasoning-plan-preview__label">Reasoning</span>
                <AgentReasoning status="running">
                  <p>
                    Comparing the interaction model with the sampled desktop
                    behavior.
                  </p>
                </AgentReasoning>
                <AgentReasoning status="completed">
                  <p>
                    Confirmed the active-open and completed-collapsed defaults.
                  </p>
                </AgentReasoning>
              </div>

              <div className="reasoning-plan-preview__surface">
                <span className="reasoning-plan-preview__label">Step plan</span>
                <AgentPlan aria-label="Active implementation plan" steps={activePlanSteps} />
                <AgentPlan
                  aria-label="Completed implementation plan"
                  defaultOpen={false}
                  steps={completedPlanSteps}
                />
              </div>

              <div className="reasoning-plan-preview__surface reasoning-plan-preview__surface--wide">
                <div className="reasoning-plan-preview__meta">
                  <span className="reasoning-plan-preview__label">Proposed plan</span>
                  <output aria-live="polite">{planActionStatus}</output>
                </div>
                <ProposedPlan
                  onCopy={() => setPlanActionStatus("Plan copied")}
                  onDownload={() => setPlanActionStatus("Plan download requested")}
                  status="completed"
                >
                  <AgentMarkdown>{proposedPlanShowcase}</AgentMarkdown>
                </ProposedPlan>
                <ProposedPlan status="writing">
                  <AgentMarkdown streaming>{proposedPlanShowcase}</AgentMarkdown>
                </ProposedPlan>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Measured typography, GFM structure, code actions, overflow, and streaming-safe rendering."
            title="Markdown and code"
            wide
          >
            <div className="markdown-preview">
              <div className="markdown-preview__controls">
                <button
                  aria-pressed={wrapMarkdownCode}
                  onClick={() => setWrapMarkdownCode((value) => !value)}
                  type="button"
                >
                  {wrapMarkdownCode ? "Disable" : "Enable"} code wrapping
                </button>
                <output aria-live="polite">{markdownCopyStatus}</output>
              </div>
              <div className="markdown-preview__grid">
                <div className="markdown-preview__surface">
                  <span className="markdown-preview__label">Complete</span>
                  <AgentMarkdown
                    codeBlockWrap={wrapMarkdownCode}
                    linkTarget="_blank"
                    onCopyCode={(code) => {
                      setMarkdownCopyStatus(`Copied ${code.length} characters`);
                    }}
                  >
                    {markdownShowcase}
                  </AgentMarkdown>
                </div>
                <div className="markdown-preview__surface">
                  <span className="markdown-preview__label">Streaming</span>
                  <AgentMarkdown codeBlockCopyable={false} streaming>
                    {streamingMarkdownShowcase}
                  </AgentMarkdown>
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Creating, applied, stopped, rejected, deleted, and renamed states with measured inline diff geometry."
            title="File changes"
            wide
          >
            <div className="file-preview">
              <div className="file-preview__grid">
                <div className="file-preview__surface file-preview__surface--wide">
                  <span className="file-preview__label">Applied · expanded</span>
                  <FileChange
                    additions={15}
                    change="modified"
                    defaultOpen
                    deletions={1}
                    diffText={fileDiffToText(longShowcaseDiffLines)}
                    path="src/runtime/configuration.ts"
                  >
                    <FileDiff lines={longShowcaseDiffLines} />
                  </FileChange>
                </div>
                <div className="file-preview__surface">
                  <span className="file-preview__label">Creating · short stream</span>
                  <FileChange
                    additions={7}
                    change="added"
                    defaultOpen
                    deletions={0}
                    diffText={fileDiffToText(shortShowcaseDiffLines)}
                    path="src/components/FileStatus.tsx"
                    status="streaming"
                  >
                    <FileDiff lines={shortShowcaseDiffLines} size="short" />
                  </FileChange>
                </div>
                <div className="file-preview__surface">
                  <span className="file-preview__label">Stopped</span>
                  <FileChange
                    change="deleted"
                    path="src/legacy/adapter.ts"
                    status="stopped"
                  />
                </div>
                <div className="file-preview__surface">
                  <span className="file-preview__label">Rejected</span>
                  <FileChange
                    additions={1}
                    change="modified"
                    deletions={1}
                    path="src/private/config.ts"
                    status="rejected"
                  />
                </div>
                <div className="file-preview__surface">
                  <span className="file-preview__label">Deleted · expanded</span>
                  <FileChange
                    change="deleted"
                    defaultOpen
                    path="src/obsolete.ts"
                  />
                </div>
                <div className="file-preview__surface file-preview__surface--wide">
                  <span className="file-preview__label">Renamed without content</span>
                  <FileChange
                    change="renamed"
                    defaultOpen
                    path="src/components/ExecutionTimeline.tsx"
                    previousPath="src/components/ActivityTimeline.tsx"
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Collapsed command language, embedded shell output, duration, exit, interruption, and background-terminal states."
            title="Command execution"
            wide
          >
            <div className="command-preview">
              <div className="command-preview__grid">
                <div className="command-preview__surface">
                  <span className="command-preview__label">Running</span>
                  <CommandExecution
                    command="pnpm test --watch"
                    defaultOpen
                    durationMs={5_000}
                    status="running"
                  >
                    <CommandOutput>{Array.from(
                      { length: 12 },
                      (_, index) =>
                        `watch cycle ${index + 1}: ${index === 11 ? "waiting" : "passed"}`,
                    ).join("\n")}</CommandOutput>
                  </CommandExecution>
                </div>

                <div className="command-preview__surface">
                  <span className="command-preview__label">Success</span>
                  <CommandExecution
                    command="pnpm check"
                    cwd="/workspace/codex-ui-kit"
                    defaultOpen
                    durationMs={61_000}
                    exitCode={0}
                    status="completed"
                  >
                    <CommandOutput>{`Test Files  11 passed (11)\nTests       88 passed (88)\nBuilt library, showcase, and Electron Renderer`}</CommandOutput>
                  </CommandExecution>
                </div>

                <div className="command-preview__surface">
                  <span className="command-preview__label">Failure</span>
                  <CommandExecution
                    command="pnpm lint"
                    defaultOpen
                    durationMs={2_000}
                    exitCode={1}
                    status="failed"
                  >
                    <CommandOutput stream="stderr">
                      src/example.ts:12:3 Unexpected any
                    </CommandOutput>
                  </CommandExecution>
                </div>

                <div className="command-preview__surface">
                  <span className="command-preview__label">Interrupted</span>
                  <CommandExecution
                    command="pnpm test --watch"
                    defaultOpen
                    durationMs={8_000}
                    status="interrupted"
                  >
                    <CommandOutput>Waiting for file changes…</CommandOutput>
                  </CommandExecution>
                </div>

                <div className="command-preview__surface">
                  <span className="command-preview__label">Background</span>
                  <CommandExecution
                    command="vite --host 127.0.0.1"
                    status="background-running"
                  >
                    <CommandOutput>Local: http://127.0.0.1:5173/</CommandOutput>
                  </CommandExecution>
                </div>

                <div className="command-preview__surface">
                  <span className="command-preview__label">No output</span>
                  <CommandExecution
                    command="touch .ready"
                    defaultOpen
                    durationMs={900}
                    exitCode={0}
                    status="completed"
                  />
                </div>

                <div className="command-preview__surface command-preview__surface--terminal">
                  <span className="command-preview__label">
                    Background terminal · controlled input
                  </span>
                  <TerminalSession
                    entries={[
                      {
                        id: "terminal-command",
                        kind: "command",
                        text: "/workspace/codex-ui-kit % pnpm dev",
                      },
                      {
                        id: "terminal-output",
                        kind: "stdout",
                        text: "VITE ready in 438 ms\nLocal: http://localhost:5173/",
                      },
                      ...terminalCommands.flatMap((command, index) => [
                        {
                          id: `terminal-local-${index}`,
                          kind: "command" as const,
                          text: `/workspace/codex-ui-kit % ${command}`,
                        },
                        {
                          id: `terminal-local-${index}-status`,
                          kind: "system" as const,
                          text: "Submission returned to the host.",
                        },
                      ]),
                    ]}
                    label="Showcase terminal"
                    onCommandSubmit={(command) => {
                      setTerminalCommands((commands) => [
                        ...commands,
                        command,
                      ]);
                      setTerminalValue("");
                    }}
                    onValueChange={setTerminalValue}
                    status="running"
                    value={terminalValue}
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Command, patch, network, permission, scope, loading, outcome, keyboard, and narrow-container states."
            title="Approval and permission requests"
            wide
          >
            <div className="approval-preview">
              <div className="approval-preview__meta">
                <output aria-live="polite">{approvalActionStatus}</output>
                <button
                  disabled={approvalDecision === "pending"}
                  onClick={() => {
                    setApprovalDecision("pending");
                    setApprovalActionStatus("Command request reset");
                  }}
                  type="button"
                >
                  Reset request
                </button>
              </div>
              <div className="approval-preview__grid">
                <div className="approval-preview__surface approval-preview__surface--wide">
                  <span className="approval-preview__label">
                    Terminal · interactive · three-line collapse
                  </span>
                  <ApprovalRequest
                    autoFocus={false}
                    decision={approvalDecision}
                    kind="command"
                    onApprove={() => {
                      setApprovalDecision("approved");
                      setApprovalActionStatus("Allowed command once");
                    }}
                    onReject={() => {
                      setApprovalDecision("rejected");
                      setApprovalActionStatus("Denied command");
                    }}
                    reason="Publish the verified package after all checks pass"
                    scopedApproveAction={{
                      info: "Allow commands that start with pnpm publish for this conversation",
                      label: "Allow similar commands",
                      onClick: () =>
                        setApprovalActionStatus("Allowed similar commands"),
                    }}
                    title="Allow ChatGPT to run this command?"
                  >
                    <ApprovalCommandPreview
                      command={[
                        "pnpm publish --access public --no-git-checks",
                        "--report-summary ./artifacts/publish-summary.json",
                        "--tag parity-preview",
                        "--provenance",
                      ].join("\n")}
                      forceCollapsible
                    />
                  </ApprovalRequest>
                </div>

                <div className="approval-preview__surface">
                  <span className="approval-preview__label">Edit files · patch</span>
                  <ApprovalRequest
                    autoFocus={false}
                    disableHotkeys
                    kind="file"
                    onApprove={() =>
                      setApprovalActionStatus("Allowed this edit once")
                    }
                    onReject={() => setApprovalActionStatus("Denied file edit")}
                    scopedApproveAction={{
                      info: "Allow this and future file edits in this conversation",
                      label: "Allow all edits",
                      onClick: () =>
                        setApprovalActionStatus("Allowed all edits"),
                    }}
                    title="Allow ChatGPT to edit the following file?"
                  >
                    <FileDiff lines={showcaseDiffLines} size="fallback" />
                  </ApprovalRequest>
                </div>

                <div className="approval-preview__surface">
                  <span className="approval-preview__label">Internet access</span>
                  <ApprovalRequest
                    autoFocus={false}
                    description="api.example.com isn't on the current network allowlist"
                    disableHotkeys
                    kind="network"
                    onApprove={() =>
                      setApprovalActionStatus("Allowed network access once")
                    }
                    onReject={() =>
                      setApprovalActionStatus("Denied network access")
                    }
                    scopedApproveAction={{
                      label: "Allow this conversation",
                      onClick: () =>
                        setApprovalActionStatus(
                          "Allowed network access for this conversation",
                        ),
                    }}
                    title="Allow ChatGPT to connect to https://api.example.com?"
                  />
                </div>

                <div className="approval-preview__surface">
                  <span className="approval-preview__label">Permissions · session scope</span>
                  <ApprovalRequest
                    autoFocus={false}
                    disableHotkeys
                    kind="permission"
                    onApprove={() =>
                      setApprovalActionStatus("Allowed filesystem access once")
                    }
                    onReject={() =>
                      setApprovalActionStatus("Denied filesystem access")
                    }
                    scopedApproveAction={{
                      onClick: () =>
                        setApprovalActionStatus(
                          "Allowed filesystem access for this conversation",
                        ),
                    }}
                    title="Allow ChatGPT to view and edit the contents of Developer/codex-ui-kit?"
                  />
                </div>

                <div className="approval-preview__surface approval-preview__surface--narrow">
                  <span className="approval-preview__label">Loading · disabled</span>
                  <ApprovalRequest
                    autoFocus={false}
                    disableHotkeys
                    kind="mcp"
                    leadingAction={{ onClick: () => undefined }}
                    loading
                    onApprove={() => undefined}
                    onReject={() => undefined}
                    title="Allow the connector to update this issue?"
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="A controlled, protocol-neutral input surface with keyboard and running states."
            title="Composer interaction"
            wide
          >
            <div className="composer-preview">
              <div className="composer-preview__meta">
                <span>Enter sends · Shift+Enter adds a line</span>
                <output aria-live="polite">{composerStatus}</output>
              </div>
              <AgentComposer
                actions={
                  <button
                    disabled={hasAttachment}
                    onClick={() => setHasAttachment(true)}
                    type="button"
                  >
                    + Attach
                  </button>
                }
                attachments={
                  hasAttachment ? (
                    <ComposerAttachment
                      label="src/App.tsx"
                      meta="12 KB"
                      onRemove={() => setHasAttachment(false)}
                    />
                  ) : undefined
                }
                controls={
                  <>
                    <select aria-label="Execution mode" defaultValue="local">
                      <option value="local">Local</option>
                      <option value="remote">Remote</option>
                    </select>
                    <select aria-label="Permission mode" defaultValue="ask">
                      <option value="ask">Ask first</option>
                      <option value="auto">Auto</option>
                    </select>
                  </>
                }
                isRunning={composerRunning}
                onStop={() => {
                  setComposerRunning(false);
                  setComposerStatus("Generation stopped");
                }}
                onSubmit={(value) => {
                  setComposerStatus(`Submitted: ${value}`);
                  setComposerValue("");
                  setComposerRunning(true);
                }}
                onValueChange={setComposerValue}
                value={composerValue}
              />
              <div
                aria-label="Composer layout state matrix"
                className="composer-preview__matrix"
                role="group"
              >
                <div className="composer-preview__sample">
                  <span>Auto · compact</span>
                  <AgentComposer
                    actions={<button type="button">+</button>}
                    controls={<button type="button">Local</button>}
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    value="Fix the failing test"
                  />
                </div>
                <div className="composer-preview__sample">
                  <span>Multiline · autosized</span>
                  <AgentComposer
                    layout="multiline"
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    value={
                      "Compare the desktop and browser renderers.\nKeep the component API protocol-neutral."
                    }
                  />
                </div>
                <div className="composer-preview__sample composer-preview__sample--narrow">
                  <span>Running · narrow host</span>
                  <AgentComposer
                    isRunning
                    onStop={() => undefined}
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    value="Add the next parity state"
                  />
                </div>
                <div className="composer-preview__sample">
                  <span>Disabled · multiline</span>
                  <AgentComposer
                    disabled
                    layout="multiline"
                    onSubmit={() => undefined}
                    onValueChange={() => undefined}
                    value="Waiting for the current operation to finish"
                  />
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="One activity model across the full execution lifecycle."
            title="Status language"
          >
            <div className="status-grid">
              {statuses.map(({ label, status }) => (
                <div className="status-sample" key={status}>
                  <StatusIndicator status={status} />
                  <span>{label}</span>
                  <code>{status}</code>
                </div>
              ))}
            </div>
          </GalleryCard>

          <GalleryCard
            description="Banner, inline divider, reconnect details, retry, interruption, semantic tone, and narrow-container states."
            title="Errors, warnings, notices, and retry"
            wide
          >
            <div className="notice-preview">
              <div className="notice-preview__controls">
                <span>Protocol-neutral state matrix</span>
                <output aria-live="polite">{noticeActionStatus}</output>
              </div>
              <div className="notice-preview__grid">
                <div className="notice-preview__surface notice-preview__surface--wide">
                  <span className="notice-preview__label">
                    Warning · responsive actions
                  </span>
                  <StatusBanner
                    actions={[
                      {
                        label: "Try again",
                        onClick: () =>
                          setNoticeActionStatus("Retried sandbox readiness"),
                        variant: "primary",
                      },
                    ]}
                    aria-live="polite"
                    heading="Couldn’t check the sandbox"
                    onDismiss={() =>
                      setNoticeActionStatus("Dismissed sandbox warning")
                    }
                    role="status"
                    stackOnNarrow
                    tone="warning"
                  >
                    Try again to continue setup.
                  </StatusBanner>
                </div>

                <div className="notice-preview__surface">
                  <span className="notice-preview__label">
                    Error · vertical icon
                  </span>
                  <StatusBanner
                    actions={[
                      {
                        label: "Try again",
                        onClick: () =>
                          setNoticeActionStatus("Retried failed operation"),
                        variant: "primary",
                      },
                      {
                        label: "View logs",
                        onClick: () =>
                          setNoticeActionStatus("Opened failure details"),
                      },
                    ]}
                    heading="Chat couldn’t continue"
                    layout="icon"
                    role="alert"
                    tone="error"
                  >
                    The response stream closed before the turn completed.
                  </StatusBanner>
                </div>

                <div className="notice-preview__surface">
                  <span className="notice-preview__label">
                    Info accent · custom action
                  </span>
                  <StatusBanner
                    customActions={
                      <button
                        className="notice-preview__link"
                        onClick={() =>
                          setNoticeActionStatus("Opened usage details")
                        }
                        type="button"
                      >
                        Learn more
                      </button>
                    }
                    heading="You’re approaching your usage limit"
                    tone="info"
                  >
                    Some models may become unavailable until the window resets.
                  </StatusBanner>
                </div>

                <div className="notice-preview__surface notice-preview__surface--narrow">
                  <span className="notice-preview__label">
                    Narrow · loading action
                  </span>
                  <StatusBanner
                    actions={[
                      {
                        label: "Checking",
                        loading: true,
                        variant: "primary",
                      },
                      { label: "Not now", variant: "ghost" },
                    ]}
                    heading="Finish setup before continuing"
                    stackOnNarrow
                  >
                    Codex is checking the desktop environment.
                  </StatusBanner>
                </div>

                <div className="notice-preview__surface">
                  <span className="notice-preview__label">
                    Stream · reconnecting
                  </span>
                  <StreamNotice
                    additionalDetails="upstream closed before a complete response"
                    reconnectAttempt={2}
                    reconnectMaxAttempts={5}
                    serverBusy
                  />
                </div>

                <div className="notice-preview__surface">
                  <span className="notice-preview__label">
                    Stream · failed + retry
                  </span>
                  <StreamNotice
                    additionalDetails="request id: req_01 · transport closed"
                    defaultExpanded
                    onRetry={() =>
                      setNoticeActionStatus("Retried disconnected stream")
                    }
                    status="failed"
                  >
                    Response stream disconnected.
                  </StreamNotice>
                </div>

                <div className="notice-preview__surface notice-preview__surface--wide">
                  <span className="notice-preview__label">
                    Inline · usage and interruption
                  </span>
                  <div className="notice-preview__inline-stack">
                    <InlineNotice wrap>
                      You’ve hit your usage limit. Try again later.
                    </InlineNotice>
                    <InlineNotice
                      icon={<span aria-hidden="true">■</span>}
                      tone="warning"
                      trailingContent={
                        <button
                          aria-label="Why Auto-review stopped the turn"
                          className="notice-preview__help"
                          onClick={() =>
                            setNoticeActionStatus(
                              "Opened interruption guidance",
                            )
                          }
                          title="Auto-review stopped after repeated denials"
                          type="button"
                        >
                          ?
                        </button>
                      }
                      wrap
                    >
                      Turn ended by Auto-review
                    </InlineNotice>
                    <InlineNotice shimmering>
                      Reconnecting to the response stream
                    </InlineNotice>
                    <InlineNotice>
                      <TurnDuration durationMs={8_000} status="stopped" />
                    </InlineNotice>
                  </div>
                </div>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Turn-level collapse, persistent running work, precise durations, and row detail across the observed lifecycle."
            title="Activity timeline"
            wide
          >
            <div className="activity-timeline-preview">
              <div className="activity-timeline-preview__surface">
                <span className="activity-timeline-preview__label">
                  Working · expanded
                </span>
                <ActivityTimeline
                  defaultOpen
                  persistentContent={
                    <AgentActivity
                      kind="command"
                      status="running"
                      summary="Running package checks"
                    />
                  }
                  shouldShowPersistentContentGap
                  summary={
                    <TurnDuration durationMs={4_200} status="working" />
                  }
                >
                  <ActivityGroup>
                    <AgentActivity
                      kind="command"
                      status="completed"
                      summary="Read package configuration"
                    />
                    <AgentActivity
                      detail="2 changes"
                      kind="file-change"
                      status="completed"
                      summary="Updated component exports"
                    >
                      <code>src/index.ts</code>
                    </AgentActivity>
                  </ActivityGroup>
                </ActivityTimeline>
              </div>

              <div className="activity-timeline-preview__surface">
                <span className="activity-timeline-preview__label">
                  Completed · collapsed
                </span>
                <ActivityTimeline
                  summary={<TurnDuration durationMs={72_000} status="worked" />}
                >
                  <ActivityGroup>
                    <AgentActivity
                      kind="search"
                      status="completed"
                      summary="Located the Renderer entry point"
                    />
                    <AgentActivity
                      kind="file-change"
                      status="completed"
                      summary="Updated activity exports"
                    />
                  </ActivityGroup>
                </ActivityTimeline>
              </div>

              <div className="activity-timeline-preview__surface">
                <span className="activity-timeline-preview__label">
                  Interrupted · expanded
                </span>
                <ActivityTimeline
                  defaultOpen
                  summary={
                    <TurnDuration durationMs={8_000} status="stopped" />
                  }
                >
                  <ActivityGroup>
                    <AgentActivity
                      kind="search"
                      status="failed"
                      summary="Could not resolve design reference"
                    />
                    <AgentActivity
                      indicator={<span aria-hidden="true">■</span>}
                      kind="command"
                      status="failed"
                      summary="Stopped by the user"
                    />
                  </ActivityGroup>
                </ActivityTimeline>
              </div>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Roles change presentation while keeping semantic article markup."
            title="Message roles"
          >
            <div className="message-stack">
              <AgentMessage role="user">User messages align to the edge.</AgentMessage>
              <AgentMessage role="assistant">
                Assistant messages stay in the reading column.
              </AgentMessage>
              <AgentMessage role="system">
                System context is visually quiet but remains available.
              </AgentMessage>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Semantic variables can be overridden by any product theme."
            title="Theme tokens"
          >
            <div className="token-grid">
              <div className="token-sample" data-token="surface">
                <span />
                <code>--codex-ui-bg</code>
              </div>
              <div className="token-sample" data-token="subtle">
                <span />
                <code>--codex-ui-bg-subtle</code>
              </div>
              <div className="token-sample" data-token="text">
                <span />
                <code>--codex-ui-text</code>
              </div>
              <div className="token-sample" data-token="focus">
                <span />
                <code>--codex-ui-focus</code>
              </div>
            </div>
            <div
              aria-label="Forced theme isolation"
              className="theme-isolation"
              role="group"
            >
              <div data-theme="light">
                <div className="theme-isolation__surface">
                  <span>Light ancestor</span>
                  <code>unscoped component surface</code>
                </div>
              </div>
              <div data-theme="dark">
                <div className="theme-isolation__surface">
                  <span>Dark ancestor</span>
                  <code>unscoped component surface</code>
                </div>
              </div>
            </div>
          </GalleryCard>
        </div>
      </div>
    </main>
  );
}

const capture = new URLSearchParams(window.location.search).get("capture");
const currentThreadCapture =
  capture === "current-thread" ||
  capture === "current-thread-completed" ||
  capture === "current-thread-completed-compact" ||
  capture === "current-thread-streaming" ||
  capture === "current-thread-streaming-compact";
const currentCommandLifecycleState: CurrentCommandLifecycleState | undefined =
  capture === "current-command-success"
    ? "success"
    : capture === "current-command-failure"
      ? "failure"
      : capture === "current-command-interruption"
        ? "interruption"
        : undefined;
const currentThreadPixelState: CurrentThreadPixelState =
  capture === "current-thread-streaming" ||
  capture === "current-thread-streaming-compact"
    ? "streaming"
    : "completed";
const workflowPixelState: WorkflowPixelState | undefined =
  capture === "current-thread-tool-call"
    ? "tool-call"
    : capture === "current-thread-approval"
      ? "approval"
      : capture === "current-workspace-file-diff"
        ? "file-diff"
        : undefined;
const toolRecoveryPixelState: ToolRecoveryPixelState | undefined =
  capture === "current-compact-search-tool"
    ? "search"
    : capture === "current-compact-browser-tool"
      ? "browser"
      : capture === "current-compact-mcp-unavailable"
        ? "mcp-unavailable"
        : capture === "current-compact-command-failure"
          ? "command-failure"
          : undefined;
const continuityPixelState: ContinuityPixelState | undefined =
  capture === "current-medium-message-navigation"
    ? "navigation"
    : capture === "current-compact-scroll-away"
      ? "scroll-away"
      : capture === "current-compact-interrupted"
        ? "interrupted"
        : capture === "current-compact-context-running"
          ? "context-running"
          : capture === "current-compact-context-completed"
            ? "context-completed"
            : undefined;

createRoot(document.getElementById("root")!).render(
  currentCommandLifecycleState ? (
    <CurrentCommandLifecycleFixture state={currentCommandLifecycleState} />
  ) : continuityPixelState ? (
    <ContinuityPixelFixture state={continuityPixelState} />
  ) : toolRecoveryPixelState ? (
    <ToolRecoveryPixelFixture state={toolRecoveryPixelState} />
  ) : workflowPixelState ? (
    <WorkflowPixelFixture state={workflowPixelState} />
  ) : currentThreadCapture ? (
    <CurrentThreadPixelFixture
      sceneId={capture ?? undefined}
      state={currentThreadPixelState}
    />
  ) : (
    <StrictMode>
      <Showcase />
    </StrictMode>
  ),
);
