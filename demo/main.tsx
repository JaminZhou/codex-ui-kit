import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
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
  ApprovalCommandPreview,
  ApprovalRequest,
  ArtifactList,
  Button,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  ComposerMentionMenu,
  ComposerModeIndicator,
  FileChange,
  FileDiff,
  fileDiffToText,
  FloatingThreadPanel,
  GeneratedImageGallery,
  ImagePreviewDialog,
  InlineNotice,
  IconButton,
  LoadingShimmer,
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuSectionLabel,
  MenuSeparator,
  MenuSubmenu,
  Popover,
  ProposedPlan,
  QueuedPromptList,
  ResourceCard,
  ResourceList,
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
  ToolCallCard,
  Tooltip,
  ThreadFloatingButton,
  ThreadContextOptimization,
  ThreadHeader,
  ThreadLoadingState,
  ThreadMessageNavigationRail,
  ThreadNavigationControls,
  ThreadRenderError,
  ThreadSkeleton,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  TurnDuration,
  type AgentItemStatus,
  type ApprovalDecision,
  type FileDiffLine,
  type GeneratedImageItem,
  type QueuedPrompt,
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

const statuses: Array<{ label: string; status: AgentItemStatus }> = [
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
] as const;

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
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(true);
  const [navigationStatus, setNavigationStatus] = useState("Navigation ready");
  const [threadStatus, setThreadStatus] = useState("Thread states ready");
  const [activeNavigationMessageId, setActiveNavigationMessageId] = useState<string>(
    navigationMessages[2].id,
  );

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
          <span className="showcase__version">parity preview</span>
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
          <div className="showcase__hero-meta" aria-label="Package highlights">
            <span>React 18+</span>
            <span>TypeScript</span>
            <span>Light + dark</span>
            <span>MIT</span>
          </div>
        </section>

        <div className="gallery-grid">
          <GalleryCard
            description="A complete conversation surface assembled from the primitives."
            title="Thread composition"
            wide
          >
            <div className="thread-preview">
              <AgentThreadViewport
                followKey={threadStatus}
                footer={
                  <div className="thread-preview__footer">
                    <span>Latest turn</span>
                    <output aria-live="polite">{threadStatus}</output>
                  </div>
                }
              >
                <AgentThread aria-label="Example coding agent thread">
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
              </AgentThreadViewport>
            </div>
            <div className="thread-state-matrix">
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
                  <Tooltip content="More actions">
                    <IconButton icon={<span>•••</span>} label="More actions" />
                  </Tooltip>
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
                  <span>Attachment tray · file + paste + image</span>
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
                          kind="pasted-text"
                          label="Pasted text"
                          layout="card"
                          status="uploading"
                        />
                        <ComposerAttachment
                          kind="image"
                          label="UI reference"
                          layout="image"
                          previewSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect width='72' height='72' fill='%23339cff'/%3E%3Cpath d='M14 50l14-17 9 10 8-9 13 16' fill='none' stroke='white' stroke-width='4'/%3E%3C/svg%3E"
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
            description="Shared button, toolbar, tooltip, popover, menu, submenu, checkbox, and listbox states with portal collision handling."
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

                <div className="primitive-preview__sample primitive-preview__sample--wide">
                  <span>Live state</span>
                  <output aria-live="polite">
                    {primitiveStatus} · line numbers {showLineNumbers ? "on" : "off"}
                  </output>
                </div>
              </div>
            </div>
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
                  <span className="tool-preview__label">Browser · empty</span>
                  <ToolCallCard
                    completedLabel="Used the browser"
                    defaultOpen
                    icon={<span className="tool-preview__source-mark">B</span>}
                    name="browser"
                    source="browser-use"
                    status="completed"
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
                      indicator={<span aria-label="Stopped">■</span>}
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
            <div className="theme-isolation" aria-label="Forced theme isolation">
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
);
