import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
  type ApprovalDecision,
  type FileDiffLine,
  type GeneratedImageItem,
  type SubagentActivityItem,
  type SubagentItem,
} from "codex-ui-kit";
import {
  themeSources,
  windowPresets,
  type AppliedWindowSize,
  type DesktopEnvironment,
  type ThemeSource,
  type ThemeState,
  type WindowPreset,
} from "../../shared/contract";

interface FontMetrics {
  devicePixelRatio: number;
  monoFamily: string;
  monoWidth: number;
  sansFamily: string;
  sansWidth: number;
}

interface ViewportMetrics {
  height: number;
  width: number;
}

const repeatedActivities = [
  "Read the package boundary",
  "Inspected desktop theme tokens",
  "Measured the system font stack",
  "Validated the scroll container",
  "Checked compact window layout",
  "Checked standard window layout",
  "Checked wide window layout",
  "Built the isolated Renderer",
];

const desktopDiffLines: FileDiffLine[] = [
  { content: "@@ -46,2 +46,3 @@", kind: "hunk" },
  {
    content: "Renderer build completed",
    kind: "context",
    newLineNumber: 46,
    oldLineNumber: 46,
  },
  {
    content: "Desktop diff rendering validated",
    kind: "addition",
    newLineNumber: 47,
  },
];

const desktopLongDiffLines: FileDiffLine[] = [
  { content: "@@ -46,4 +46,20 @@", kind: "hunk" },
  ...Array.from({ length: 17 }, (_, index) => ({
    content: `const desktopCheckpoint${index + 1} = 'verified';`,
    kind: index === 3 ? ("deletion" as const) : ("addition" as const),
    newLineNumber: index === 3 ? undefined : index + 46,
    oldLineNumber: index === 3 ? index + 46 : undefined,
  })),
];
const desktopShortDiffLines = desktopLongDiffLines.slice(0, 8);

const desktopWebSearchEntries = Array.from({ length: 15 }, (_, index) => ({
  completed: index < 14,
  detail: `Desktop search result ${index + 1}: Codex Renderer behavior`,
  id: `desktop-web-result-${index + 1}`,
}));

const desktopSubagentActivities: SubagentActivityItem[] = [
  { activityStatus: "active", id: "desktop-research", name: "Researcher" },
  { activityStatus: "updated", id: "desktop-build", name: "Builder" },
  { activityStatus: "active", id: "desktop-review", name: "Reviewer" },
  { activityStatus: "active", id: "desktop-test", name: "Tester" },
];

const desktopSubagents: SubagentItem[] = [
  {
    id: "desktop-research",
    lastMessage: "Measured the desktop subagent surfaces.",
    name: "Researcher",
    presentation: "grouped",
    status: "active",
    timestamp: "now",
  },
  {
    id: "desktop-build",
    name: "Builder",
    presentation: "grouped",
    status: "done",
    statusSummary: "Implemented desktop-safe geometry.",
  },
  {
    id: "desktop-review",
    name: "Reviewer",
    presentation: "grouped",
    status: "waiting",
  },
  {
    additions: 36,
    deletions: 4,
    id: "desktop-integration",
    model: "gpt-5",
    name: "Integration",
    role: "worker",
    status: "active",
    statusSummary: "Validating Electron rendering.",
  },
  {
    id: "desktop-accessibility",
    lastMessage: "Checked focus-visible and accessible names.",
    name: "Accessibility",
    status: "done",
    timestamp: "2m",
  },
  {
    id: "desktop-responsive",
    name: "Responsive",
    status: "waiting",
  },
  {
    id: "desktop-scroll",
    lastMessage: "Inspecting panel scroll containment.",
    name: "Scroll",
    status: "active",
    timestamp: "1m",
  },
  {
    id: "desktop-theme",
    lastMessage: "Compared the native light and dark themes.",
    name: "Theme",
    status: "done",
    timestamp: "4m",
  },
];

const desktopMarkdown = [
  "### Desktop Markdown",
  "",
  "Renderer typography supports `inline code`, **GFM**, and overflow-safe tables.",
  "",
  "| Check | Result |",
  "| --- | ---: |",
  "| Theme | inherited |",
  "| Font | measured |",
  "",
  "```ts",
  "const renderer = 'electron';",
  "```",
].join("\n");

const desktopPlanMarkdown = [
  "### Desktop acceptance plan",
  "",
  "- Reuse the workspace React package.",
  "- Exercise theme, font, scroll, and compact-window behavior.",
].join("\n");

const desktopPlanSteps = [
  { status: "completed" as const, step: "Load the shared primitives" },
  { status: "in_progress" as const, step: "Inspect desktop rendering" },
  { status: "pending" as const, step: "Record the viewport matrix" },
];

const desktopResourceImages: GeneratedImageItem[] = [
  ["desktop-sky", "#4f87ff", "#dce8ff"],
  ["desktop-leaf", "#4ba66c", "#d9f4e4"],
  ["desktop-sunset", "#eb7440", "#ffe7d9"],
  ["desktop-violet", "#805ad5", "#ede5ff"],
  ["desktop-night", "#34445f", "#c8d3e5"],
  ["desktop-sand", "#ba873c", "#f6e4bd"],
].map(([id, foreground, background], index) => ({
  alt: `Generated image ${index + 1}`,
  height: index % 2 === 0 ? 720 : 640,
  id,
  src: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="${background}"/><circle cx="${250 + index * 70}" cy="250" r="170" fill="${foreground}" opacity=".9"/><path d="M0 610 230 390l170 145 150-175 410 350H0Z" fill="${foreground}" opacity=".55"/></svg>`,
  )}`,
  width: index % 2 === 0 ? 960 : 760,
}));

const desktopNavigationMessages = [
  {
    id: "desktop-message-1",
    label: "Reuse the public package in Electron.",
    outputs: ["Renderer loaded", "System theme connected"],
    preview: "Keep the component package independent from the desktop host.",
  },
  {
    id: "desktop-message-2",
    label: "Measure the native window surface.",
    outputs: ["Standard viewport", "Compact viewport", "Font fallback"],
    preview: "Capture geometry under native resizing and theme changes.",
  },
  {
    id: "desktop-message-3",
    label: "Verify navigation and focus behavior.",
    preview: "Keyboard focus opens the same message preview as pointer hover.",
  },
  {
    id: "desktop-message-4",
    label: "Scrub between user turns.",
    preview: "Pointer capture uses instant navigation while click stays smooth.",
  },
  {
    id: "desktop-message-5",
    label: "Complete desktop acceptance.",
    preview: "No horizontal overflow at either verified window size.",
  },
] as const;

function useViewportMetrics(): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));

  useEffect(() => {
    const update = () => {
      setMetrics({ height: window.innerHeight, width: window.innerWidth });
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return metrics;
}

function useFontMetrics() {
  const sansRef = useRef<HTMLSpanElement>(null);
  const monoRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState<FontMetrics | null>(null);

  useLayoutEffect(() => {
    const measure = async () => {
      await document.fonts.ready;
      if (!sansRef.current || !monoRef.current) return;
      const sansStyle = getComputedStyle(sansRef.current);
      const monoStyle = getComputedStyle(monoRef.current);
      setMetrics({
        devicePixelRatio: window.devicePixelRatio,
        monoFamily: monoStyle.fontFamily,
        monoWidth: Math.round(monoRef.current.getBoundingClientRect().width),
        sansFamily: sansStyle.fontFamily,
        sansWidth: Math.round(sansRef.current.getBoundingClientRect().width),
      });
    };

    void measure();
  }, []);

  return { metrics, monoRef, sansRef };
}

function formatPlatform(environment: DesktopEnvironment | null) {
  if (!environment) return "Loading host…";
  return `${environment.platform} · ${environment.arch}`;
}

export function DesktopPlayground() {
  const [environment, setEnvironment] = useState<DesktopEnvironment | null>(null);
  const [theme, setTheme] = useState<ThemeState>({
    resolved: "light",
    source: "system",
  });
  const [activePreset, setActivePreset] = useState<WindowPreset>("standard");
  const [appliedSize, setAppliedSize] = useState<AppliedWindowSize | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [composerValue, setComposerValue] = useState(
    "Validate the composer in this desktop window.",
  );
  const [composerRunning, setComposerRunning] = useState(false);
  const [composerStatus, setComposerStatus] = useState("Ready");
  const [hasComposerAttachment, setHasComposerAttachment] = useState(true);
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision>("pending");
  const [noticeStatus, setNoticeStatus] = useState("Notice actions ready");
  const [selectedSubagent, setSelectedSubagent] =
    useState<SubagentItem | null>(null);
  const [desktopExecutionMode, setDesktopExecutionMode] = useState("local");
  const [desktopLineNumbers, setDesktopLineNumbers] = useState(true);
  const [primitiveStatus, setPrimitiveStatus] = useState(
    "Desktop controls ready",
  );
  const [continuationDialogOpen, setContinuationDialogOpen] = useState(false);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [navigationSidebarOpen, setNavigationSidebarOpen] = useState(false);
  const [navigationPanelOpen, setNavigationPanelOpen] = useState(true);
  const [navigationStatus, setNavigationStatus] = useState("Desktop navigation ready");
  const [threadStatus, setThreadStatus] = useState("Desktop thread ready");
  const [activeNavigationMessageId, setActiveNavigationMessageId] = useState<string>(
    desktopNavigationMessages[2].id,
  );
  const viewport = useViewportMetrics();
  const { metrics: fontMetrics, monoRef, sansRef } = useFontMetrics();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    void window.desktopPlayground.getEnvironment().then((value) => {
      if (!mounted) return;
      setEnvironment(value);
      setTheme(value.theme);
    });
    const unsubscribe = window.desktopPlayground.onThemeChanged((value) => {
      setTheme(value);
      setEnvironment((current) =>
        current ? { ...current, theme: value } : current,
      );
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const updateScrollProgress = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const maximum = element.scrollHeight - element.clientHeight;
    setScrollProgress(maximum <= 0 ? 100 : Math.round((element.scrollTop / maximum) * 100));
  }, []);

  const setThemeSource = async (source: ThemeSource) => {
    const value = await window.desktopPlayground.setThemeSource(source);
    setTheme(value);
  };

  const setWindowPreset = async (preset: WindowPreset) => {
    setActivePreset(preset);
    const size = await window.desktopPlayground.setWindowPreset(preset);
    setAppliedSize(size);
  };

  const scrollTo = (position: "start" | "end") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({
      behavior: "smooth",
      top: position === "start" ? 0 : element.scrollHeight,
    });
  };

  return (
    <main
      className="desktop-playground"
      data-codex-ui
      data-theme={theme.resolved}
    >
      <header className="desktop-titlebar">
        <div className="desktop-titlebar__identity">
          <span className="desktop-titlebar__mark" aria-hidden="true">
            C
          </span>
          <div>
            <strong>Electron acceptance</strong>
            <span>{formatPlatform(environment)}</span>
          </div>
        </div>
        <div className="desktop-titlebar__status" aria-label="Desktop status">
          <StatusIndicator status="completed" />
          Renderer connected
        </div>
      </header>

      <section className="desktop-controls" aria-label="Desktop controls">
        <div className="control-group">
          <span className="control-group__label">Native theme</span>
          <div className="segmented-control">
            {themeSources.map((source) => (
              <button
                aria-pressed={theme.source === source}
                key={source}
                onClick={() => void setThemeSource(source)}
                type="button"
              >
                {source}
              </button>
            ))}
          </div>
          <output>{theme.resolved}</output>
        </div>

        <div className="control-group">
          <span className="control-group__label">Window preset</span>
          <div className="segmented-control">
            {(Object.keys(windowPresets) as WindowPreset[]).map((preset) => (
              <button
                aria-pressed={activePreset === preset}
                key={preset}
                onClick={() => void setWindowPreset(preset)}
                type="button"
              >
                {windowPresets[preset].label}
              </button>
            ))}
          </div>
          <output>
            {appliedSize
              ? `${appliedSize.width} × ${appliedSize.height}`
              : `${viewport.width} × ${viewport.height}`}
          </output>
        </div>
      </section>

      <div
        className="desktop-scroll-region"
        onScroll={updateScrollProgress}
        ref={scrollRef}
      >
        <section className="desktop-overview">
          <div>
            <span className="desktop-eyebrow">Real BrowserWindow · shared package</span>
            <h1>Desktop Renderer validation</h1>
            <p>
              This shell loads the workspace package through an isolated preload
              bridge. Use the controls above to validate native theme changes,
              responsive window sizes, font rendering, and long-thread scrolling.
            </p>
          </div>
          <div className="runtime-facts">
            <div>
              <span>Electron</span>
              <strong>{environment?.electron ?? "…"}</strong>
            </div>
            <div>
              <span>Chromium</span>
              <strong>{environment?.chromium ?? "…"}</strong>
            </div>
            <div>
              <span>Pixel ratio</span>
              <strong>{fontMetrics?.devicePixelRatio ?? "…"}</strong>
            </div>
          </div>
        </section>

        <section className="desktop-grid" aria-label="Acceptance checks">
          <article className="acceptance-card acceptance-card--thread">
            <header>
              <div>
                <h2>Thread rendering</h2>
                <p>Shared React components inside an Electron Renderer.</p>
              </div>
              <span className="acceptance-badge">workspace package</span>
            </header>
            <div className="acceptance-card__body thread-surface">
              <AgentThreadViewport
                className="desktop-thread-viewport"
                followKey={threadStatus}
                footer={
                  <div className="desktop-thread-footer">
                    <span>Latest turn</span>
                    <output aria-live="polite">{threadStatus}</output>
                  </div>
                }
              >
                <AgentThread
                  aria-label="Desktop validation thread"
                  width={activePreset === "compact" ? "narrow" : "wide"}
                >
                <AgentMessage
                  actions={
                    <button
                      className="desktop-thread-message-action"
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
                  Validate this component library in a real desktop window.
                </AgentMessage>
                <AgentMessage role="assistant">
                  I’ll exercise the system theme, font stack, scroll container,
                  and responsive window presets.
                </AgentMessage>
                <AgentMessage role="assistant">
                  <AgentMarkdown codeBlockCopyable={false}>
                    {desktopMarkdown}
                  </AgentMarkdown>
                </AgentMessage>
                <ActivityTimeline
                  defaultOpen
                  persistentContent={
                    <ToolCallCard
                      name="desktop acceptance"
                      status="running"
                      summary="Watching native theme and viewport changes"
                    />
                  }
                  shouldShowPersistentContentGap
                  summary={<TurnDuration durationMs={4_200} status="working" />}
                >
                  <ActivityGroup>
                    <AgentReasoning status="running">
                      <p>
                        Comparing system theme, font fallback, and compact-window
                        geometry.
                      </p>
                    </AgentReasoning>
                    <AgentReasoning status="completed">
                      <p>Connected the isolated preload bridge.</p>
                    </AgentReasoning>
                    <AgentPlan
                      aria-label="Desktop acceptance plan"
                      steps={desktopPlanSteps}
                    />
                    <AgentActivity
                      defaultOpen
                      detail="desktop"
                      kind="file-change"
                      status="completed"
                      summary="Loaded shared UI primitives"
                    >
                      <ul>
                        <li>React components resolve from the workspace package.</li>
                        <li>Electron remains a playground-only dependency.</li>
                      </ul>
                    </AgentActivity>
                    <AgentActivity
                      kind="generic"
                      status="warning"
                      summary="Handoff to worktree needs attention"
                    />
                    <CommandExecution
                      command="pnpm --filter @codex-ui-kit/electron-playground check"
                      cwd="playgrounds/electron"
                      defaultOpen
                      durationMs={61_000}
                      exitCode={0}
                      status="completed"
                    >
                      <CommandOutput>{`3 tests passed\nRenderer build completed`}</CommandOutput>
                    </CommandExecution>
                    <FileChange
                      additions={1}
                      change="modified"
                      defaultOpen
                      deletions={0}
                      path="playgrounds/electron/src/renderer/src/DesktopPlayground.tsx"
                    >
                      <FileDiff lines={desktopDiffLines} />
                    </FileChange>
                  </ActivityGroup>
                </ActivityTimeline>
                <ProposedPlan
                  onCopy={() => undefined}
                  onDownload={() => undefined}
                  status="completed"
                >
                  <AgentMarkdown codeBlockCopyable={false}>
                    {desktopPlanMarkdown}
                  </AgentMarkdown>
                </ProposedPlan>
                <ProposedPlan status="writing">
                  <AgentMarkdown codeBlockCopyable={false} streaming>
                    {desktopPlanMarkdown}
                  </AgentMarkdown>
                </ProposedPlan>
                <ApprovalRequest
                  decision={approvalDecision}
                  kind="command"
                  onApprove={() => setApprovalDecision("approved")}
                  onReject={() => setApprovalDecision("rejected")}
                  reason="Verify the package in the independent Electron Renderer"
                  scopedApproveAction={{
                    info: "Allow commands that start with pnpm --filter for this conversation",
                    label: "Allow similar commands",
                    onClick: () => setApprovalDecision("approved"),
                  }}
                  title="Allow ChatGPT to run this command?"
                >
                  <ApprovalCommandPreview command="pnpm --filter @codex-ui-kit/electron-playground check" />
                </ApprovalRequest>
                <AgentTurn spacing="grouped">
                  <ThreadThinkingPlaceholder />
                  <AgentMessage role="assistant" status="running">
                    <LoadingShimmer>Writing the final desktop response…</LoadingShimmer>
                  </AgentMessage>
                </AgentTurn>
                <ThreadLoadingState />
                <ThreadLoadingState kind="reconnecting" />
                <ThreadContextOptimization mode="manual" status="completed" />
                <ThreadContextOptimization mode="work" status="running" />
                <ThreadSkeleton />
                <ThreadRenderError
                  onRetry={() => setThreadStatus("Retried failed desktop turn")}
                >
                  The Renderer could not display this turn.
                </ThreadRenderError>
                <ThreadVirtualizedPlaceholder estimatedHeight="4rem" />
                </AgentThread>
              </AgentThreadViewport>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--navigation">
            <header>
              <div>
                <h2>Header, navigation, and floating controls</h2>
                <p>
                  Draggable geometry, toolbar focus, transient panel, compact
                  title handling, and latest-message states.
                </p>
              </div>
              <span className="acceptance-badge">48px toolbar</span>
            </header>
            <div className="acceptance-card__body desktop-navigation-surface">
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
                    onSidebarPointerEnter={() => setNavigationPanelOpen(true)}
                    onToggleSidebar={() => {
                      setNavigationSidebarOpen((value) => !value);
                      setNavigationPanelOpen((value) => !value);
                    }}
                    sidebarOpen={navigationSidebarOpen}
                    sidebarShortcut="⌘B"
                  />
                }
                position="static"
                subtitle="Electron Renderer"
                title="Desktop thread navigation acceptance"
              />
              <div className="desktop-navigation-surface__body">
                <ThreadMessageNavigationRail
                  activeIds={[activeNavigationMessageId]}
                  insetInlineStart="calc(var(--codex-ui-floating-panel-width) + 1rem)"
                  items={desktopNavigationMessages}
                  onNavigate={(item, behavior) => {
                    setActiveNavigationMessageId(item.id);
                    setNavigationStatus(
                      `${behavior === "instant" ? "Scrubbed" : "Jumped"} to ${item.id}`,
                    );
                  }}
                />
                <FloatingThreadPanel
                  className="desktop-navigation-surface__panel"
                  label="Desktop project navigation"
                  open={navigationPanelOpen}
                  onPointerLeave={() => {
                    if (!navigationSidebarOpen) setNavigationPanelOpen(false);
                  }}
                  topInset="var(--codex-ui-toolbar-height)"
                >
                  <div className="desktop-navigation-surface__panel-header">
                    <strong>codex-ui-kit</strong>
                    <IconButton
                      icon={<span>×</span>}
                      label="Close sidebar"
                      onClick={() => {
                        setNavigationPanelOpen(false);
                        setNavigationSidebarOpen(false);
                      }}
                    />
                  </div>
                  <button type="button">New thread</button>
                  <button type="button">Component parity</button>
                  <button type="button">Electron acceptance</button>
                </FloatingThreadPanel>
                <p>
                  Resize to Compact and change the native theme while this
                  surface remains visible.
                </p>
                <output aria-live="polite">{navigationStatus}</output>
                <div className="desktop-navigation-surface__floating-states">
                  <div>
                    <span>Latest available</span>
                    <ThreadFloatingButton
                      className="desktop-navigation-surface__floating-button"
                      onClick={() => setNavigationStatus("Scrolled to bottom")}
                      show
                    />
                  </div>
                  <div>
                    <span>Working below</span>
                    <ThreadFloatingButton
                      className="desktop-navigation-surface__floating-button"
                      onClick={() => setNavigationStatus("Followed working output")}
                      show
                      working
                    />
                  </div>
                  <div>
                    <span>Hidden</span>
                    <ThreadFloatingButton
                      className="desktop-navigation-surface__floating-button"
                      show={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--approval">
            <header>
              <div>
                <h2>Approval and permission request states</h2>
                <p>
                  Elevated shell, identity hierarchy, command collapse, scoped
                  actions, network copy, patch content, and narrow-window reflow.
                </p>
              </div>
            </header>
            <div className="acceptance-card__body approval-state-matrix">
              <div className="approval-state-matrix__wide">
                <span className="approval-state-matrix__label">
                  Terminal · long command
                </span>
                <ApprovalRequest
                  autoFocus={false}
                  disableHotkeys
                  kind="command"
                  onApprove={() => undefined}
                  onReject={() => undefined}
                  reason="Run the desktop acceptance matrix"
                  scopedApproveAction={{
                    info: "Allow commands that start with pnpm for this conversation",
                    label: "Allow similar commands",
                    onClick: () => undefined,
                  }}
                  title="Allow ChatGPT to run this command?"
                >
                  <ApprovalCommandPreview
                    command={[
                      "pnpm --filter @codex-ui-kit/electron-playground check",
                      "--reporter verbose",
                      "--outputFile ./artifacts/electron-check.json",
                      "--runInBand",
                    ].join("\n")}
                    forceCollapsible
                  />
                </ApprovalRequest>
              </div>

              <div>
                <span className="approval-state-matrix__label">Edit files</span>
                <ApprovalRequest
                  autoFocus={false}
                  disableHotkeys
                  kind="file"
                  onApprove={() => undefined}
                  onReject={() => undefined}
                  scopedApproveAction={{
                    info: "Allow this and future file edits in this conversation",
                    label: "Allow all edits",
                    onClick: () => undefined,
                  }}
                  title="Allow ChatGPT to edit the following file?"
                >
                  <FileDiff lines={desktopDiffLines} size="fallback" />
                </ApprovalRequest>
              </div>

              <div>
                <span className="approval-state-matrix__label">Internet access</span>
                <ApprovalRequest
                  autoFocus={false}
                  description="api.example.com isn't on the current network allowlist"
                  disableHotkeys
                  kind="network"
                  onApprove={() => undefined}
                  onReject={() => undefined}
                  scopedApproveAction={{ onClick: () => undefined }}
                  title="Allow ChatGPT to connect to https://api.example.com?"
                />
              </div>

              <div>
                <span className="approval-state-matrix__label">Permissions</span>
                <ApprovalRequest
                  autoFocus={false}
                  disableHotkeys
                  kind="permission"
                  onApprove={() => undefined}
                  onReject={() => undefined}
                  scopedApproveAction={{ onClick: () => undefined }}
                  title="Allow ChatGPT to view and edit the contents of this workspace?"
                />
              </div>

              <div className="approval-state-matrix__narrow">
                <span className="approval-state-matrix__label">Loading</span>
                <ApprovalRequest
                  autoFocus={false}
                  disableHotkeys
                  kind="mcp"
                  loading
                  onApprove={() => undefined}
                  onReject={() => undefined}
                  title="Allow the connector to update this issue?"
                />
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--notice">
            <header>
              <div>
                <h2>Error, warning, notice, and retry states</h2>
                <p>
                  Native theme, desktop font, reconnect disclosure, interruption,
                  retry, and compact-window action reflow.
                </p>
              </div>
              <output aria-live="polite" className="notice-state-matrix__output">
                {noticeStatus}
              </output>
            </header>
            <div className="acceptance-card__body notice-state-matrix">
              <div className="notice-state-matrix__wide">
                <span className="notice-state-matrix__label">
                  Warning · desktop status
                </span>
                <StatusBanner
                  actions={[
                    {
                      label: "Try again",
                      onClick: () => setNoticeStatus("Retried desktop setup"),
                      variant: "primary",
                    },
                  ]}
                  aria-live="polite"
                  heading="Couldn’t check the sandbox"
                  onDismiss={() => setNoticeStatus("Dismissed warning")}
                  role="status"
                  stackOnNarrow
                  tone="warning"
                >
                  Try again to continue setup.
                </StatusBanner>
              </div>

              <div>
                <span className="notice-state-matrix__label">
                  Error · vertical icon
                </span>
                <StatusBanner
                  actions={[
                    {
                      label: "Try again",
                      onClick: () => setNoticeStatus("Retried failed turn"),
                      variant: "primary",
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

              <div className="notice-state-matrix__narrow">
                <span className="notice-state-matrix__label">
                  Compact · loading
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
                  Checking the desktop environment.
                </StatusBanner>
              </div>

              <div>
                <span className="notice-state-matrix__label">
                  Stream · reconnecting
                </span>
                <StreamNotice
                  additionalDetails="upstream closed before a complete response"
                  reconnectAttempt={2}
                  reconnectMaxAttempts={5}
                  serverBusy
                />
              </div>

              <div>
                <span className="notice-state-matrix__label">
                  Stream · failed
                </span>
                <StreamNotice
                  additionalDetails="request id: desktop_req_01"
                  defaultExpanded
                  onRetry={() => setNoticeStatus("Retried response stream")}
                  status="failed"
                >
                  Response stream disconnected.
                </StreamNotice>
              </div>

              <div className="notice-state-matrix__wide notice-state-matrix__inline">
                <span className="notice-state-matrix__label">
                  Inline · usage, interruption, stopped turn
                </span>
                <InlineNotice wrap>
                  You’ve hit your usage limit. Try again later.
                </InlineNotice>
                <InlineNotice
                  icon={<span aria-hidden="true">■</span>}
                  tone="warning"
                  trailingContent={
                    <button
                      aria-label="Why Auto-review stopped the turn"
                      className="notice-state-matrix__help"
                      onClick={() =>
                        setNoticeStatus("Opened interruption guidance")
                      }
                      type="button"
                    >
                      ?
                    </button>
                  }
                  wrap
                >
                  Turn ended by Auto-review
                </InlineNotice>
                <InlineNotice>
                  <TurnDuration durationMs={8_000} status="stopped" />
                </InlineNotice>
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--subagent">
            <header>
              <div>
                <h2>Subagent and delegated-work states</h2>
                <p>
                  Inline chips, summary aggregation, panel pagination, nested
                  transcript navigation, and compact-window behavior.
                </p>
              </div>
            </header>
            <div className="acceptance-card__body subagent-state-matrix">
              <div className="subagent-state-matrix__wide">
                <span className="subagent-state-matrix__label">Thread activity</span>
                <div className="subagent-state-matrix__activity">
                  <SubagentActivity item={desktopSubagentActivities[0]} />
                  <SubagentActivityGroup
                    items={desktopSubagentActivities}
                    onOpen={(item) =>
                      setSelectedSubagent(
                        desktopSubagents.find((agent) => agent.id === item.id) ??
                          null,
                      )
                    }
                  />
                  <SubagentActivityGroup
                    animateEntrance={false}
                    items={desktopSubagentActivities.slice(0, 2).map((item) => ({
                      ...item,
                      activityStatus: "done",
                    }))}
                  />
                  <SubagentActivity
                    item={{
                      activityStatus: "interrupted",
                      id: "desktop-test",
                      name: "Tester",
                    }}
                  />
                </div>
              </div>
              <div>
                <span className="subagent-state-matrix__label">Thread summary</span>
                <SubagentSummary
                  items={desktopSubagents.slice(0, 5)}
                  onOpenSubagent={setSelectedSubagent}
                  onOpenSummary={() => setSelectedSubagent(null)}
                />
                <SubagentSummary
                  items={desktopSubagents
                    .filter((item) => item.status === "done")
                    .map((item) => ({ ...item, presentation: "row" }))}
                  title="Completed section"
                />
              </div>
              <div className="subagent-state-matrix__panel-shell">
                <span className="subagent-state-matrix__label">Subagents panel</span>
                <div className="subagent-state-matrix__panel">
                  {selectedSubagent ? (
                    <>
                      <SubagentTranscriptHeader
                        item={selectedSubagent}
                        onBack={() => setSelectedSubagent(null)}
                      />
                      <div className="subagent-state-matrix__transcript">
                        <strong>{selectedSubagent.name}</strong>
                        <p>
                          Host-rendered transcript content remains independent
                          from the navigation shell.
                        </p>
                      </div>
                    </>
                  ) : (
                    <SubagentPanel
                      items={desktopSubagents.map((item) => ({
                        ...item,
                        presentation: "row",
                      }))}
                      onSelect={setSelectedSubagent}
                    />
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--file">
            <header>
              <div>
                <h2>File change states</h2>
                <p>
                  Patch status language, inline diff overflow, fallback content,
                  and compact-window geometry.
                </p>
              </div>
            </header>
            <div className="acceptance-card__body file-state-matrix">
              <div className="file-state-matrix__wide">
                <span className="file-state-matrix__label">Applied · 240px viewport</span>
                <FileChange
                  additions={16}
                  change="modified"
                  defaultOpen
                  deletions={1}
                  diffText={fileDiffToText(desktopLongDiffLines)}
                  path="playgrounds/electron/src/renderer/src/DesktopPlayground.tsx"
                >
                  <FileDiff lines={desktopLongDiffLines} />
                </FileChange>
              </div>
              <div>
                <span className="file-state-matrix__label">Creating · 100px viewport</span>
                <FileChange
                  additions={7}
                  change="added"
                  defaultOpen
                  diffText={fileDiffToText(desktopShortDiffLines)}
                  path="src/components/FileStatus.tsx"
                  status="streaming"
                >
                  <FileDiff lines={desktopShortDiffLines} size="short" />
                </FileChange>
              </div>
              <div>
                <span className="file-state-matrix__label">Stopped delete</span>
                <FileChange
                  change="deleted"
                  path="src/legacy/desktop.ts"
                  status="stopped"
                />
              </div>
              <div>
                <span className="file-state-matrix__label">Rejected edit</span>
                <FileChange
                  additions={1}
                  change="modified"
                  deletions={1}
                  path="src/private/bridge.ts"
                  status="rejected"
                />
              </div>
              <div>
                <span className="file-state-matrix__label">Deleted fallback</span>
                <FileChange
                  change="deleted"
                  defaultOpen
                  path="src/obsolete.ts"
                />
              </div>
              <div className="file-state-matrix__wide">
                <span className="file-state-matrix__label">Rename fallback</span>
                <FileChange
                  change="renamed"
                  defaultOpen
                  path="src/components/DesktopTimeline.tsx"
                  previousPath="src/components/LegacyTimeline.tsx"
                />
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--tool">
            <header>
              <div>
                <h2>Search and tool-call states</h2>
                <p>
                  Web and code search, MCP, connector, browser, structured,
                  empty, and error results.
                </p>
              </div>
            </header>
            <div className="acceptance-card__body tool-state-matrix">
              <div className="tool-state-matrix__wide">
                <span className="tool-state-matrix__label">Web · running · 320px max</span>
                <SearchActivity
                  defaultOpen
                  entries={desktopWebSearchEntries}
                  kind="web"
                  status="running"
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">Web · completed</span>
                <SearchActivity
                  entries={desktopWebSearchEntries.map((entry) => ({
                    ...entry,
                    completed: true,
                  }))}
                  kind="web"
                  status="completed"
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">Code · running</span>
                <SearchActivity
                  kind="code"
                  path="src/renderer"
                  query="ToolCallCard"
                  status="running"
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">MCP · running</span>
                <ToolCallCard
                  activeLabel="Searching issues"
                  icon={<span className="tool-state-matrix__source-mark">G</span>}
                  name="search_issues"
                  source="GitHub"
                  status="running"
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">Connector · structured</span>
                <ToolCallCard
                  completedLabel="Searched issues"
                  defaultOpen
                  icon={<span className="tool-state-matrix__source-mark">G</span>}
                  name="search_issues"
                  onViewRawOutput={() => undefined}
                  rawOutput={{ callId: "desktop-call-1" }}
                  source="GitHub"
                  status="completed"
                  structuredContent={{ count: 2, state: "open" }}
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">Browser · empty</span>
                <ToolCallCard
                  completedLabel="Used the browser"
                  defaultOpen
                  icon={<span className="tool-state-matrix__source-mark">B</span>}
                  name="browser"
                  source="browser-use"
                  status="completed"
                />
              </div>
              <div>
                <span className="tool-state-matrix__label">MCP · failed</span>
                <ToolCallCard
                  defaultOpen
                  error="Connector authorization expired"
                  failedLabel="GitHub search failed"
                  icon={<span className="tool-state-matrix__source-mark">G</span>}
                  name="search_issues"
                  source="GitHub"
                  status="failed"
                />
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--command">
            <header>
              <div>
                <h2>Command shell states</h2>
                <p>Summary, output overflow, footer, and background states.</p>
              </div>
            </header>
            <div className="acceptance-card__body command-state-matrix">
              <div>
                <span className="command-state-matrix__label">Running</span>
                <CommandExecution
                  command="pnpm test --watch"
                  defaultOpen
                  durationMs={5_000}
                  status="running"
                >
                  <CommandOutput>{Array.from(
                    { length: 12 },
                    (_, index) =>
                      `desktop cycle ${index + 1}: ${index === 11 ? "waiting" : "passed"}`,
                  ).join("\n")}</CommandOutput>
                </CommandExecution>
              </div>
              <div>
                <span className="command-state-matrix__label">Success</span>
                <CommandExecution
                  command="pnpm check"
                  defaultOpen
                  durationMs={61_000}
                  exitCode={0}
                  status="completed"
                >
                  <CommandOutput>{`88 tests passed\nRenderer build completed`}</CommandOutput>
                </CommandExecution>
              </div>
              <div>
                <span className="command-state-matrix__label">Failure</span>
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
              <div>
                <span className="command-state-matrix__label">Stopped</span>
                <CommandExecution
                  command="pnpm test --watch"
                  defaultOpen
                  durationMs={8_000}
                  status="interrupted"
                >
                  <CommandOutput>Waiting for file changes…</CommandOutput>
                </CommandExecution>
              </div>
              <div>
                <span className="command-state-matrix__label">Background</span>
                <CommandExecution
                  command="vite --host 127.0.0.1"
                  status="background-running"
                >
                  <CommandOutput>Local: http://127.0.0.1:5173/</CommandOutput>
                </CommandExecution>
              </div>
              <div>
                <span className="command-state-matrix__label">No output</span>
                <CommandExecution
                  command="touch .ready"
                  defaultOpen
                  durationMs={900}
                  exitCode={0}
                  status="completed"
                />
              </div>
            </div>
          </article>

          <article className="acceptance-card acceptance-card--activity">
            <header>
              <div>
                <h2>Activity timeline states</h2>
                <p>Expanded, collapsed, and interrupted states in Chromium.</p>
              </div>
            </header>
            <div className="acceptance-card__body activity-state-matrix">
              <div>
                <span className="activity-state-matrix__label">Working</span>
                <ActivityTimeline
                  defaultOpen
                  persistentContent={
                    <AgentActivity
                      kind="command"
                      status="running"
                      summary="Checking the Renderer"
                    />
                  }
                  shouldShowPersistentContentGap
                  summary={
                    <TurnDuration durationMs={4_200} status="working" />
                  }
                >
                  <ActivityGroup>
                    <AgentActivity
                      kind="search"
                      status="completed"
                      summary="Inspected activity geometry"
                    />
                    <AgentActivity
                      kind="file-change"
                      status="completed"
                      summary="Added desktop states"
                    />
                  </ActivityGroup>
                </ActivityTimeline>
              </div>
              <div>
                <span className="activity-state-matrix__label">Completed</span>
                <ActivityTimeline
                  summary={<TurnDuration durationMs={72_000} status="worked" />}
                >
                  <AgentActivity
                    kind="command"
                    status="completed"
                    summary="Built the Renderer"
                  />
                </ActivityTimeline>
              </div>
              <div>
                <span className="activity-state-matrix__label">Stopped</span>
                <ActivityTimeline
                  defaultOpen
                  summary={
                    <TurnDuration durationMs={8_000} status="stopped" />
                  }
                >
                  <AgentActivity
                    indicator={<span aria-label="Stopped">■</span>}
                    kind="command"
                    status="failed"
                    summary="Stopped by the user"
                  />
                </ActivityTimeline>
              </div>
            </div>
          </article>

          <article
            className="acceptance-card acceptance-card--primitives"
            data-acceptance-surface="interactive-primitives"
          >
            <header>
              <div>
                <h2>Interactive controls and overlays</h2>
                <p>
                  Portal placement, native focus, toolbar geometry, menus, and
                  modal choices.
                </p>
              </div>
              <span className="acceptance-badge">desktop portal</span>
            </header>
            <div className="acceptance-card__body primitive-state-matrix">
              <div className="primitive-state-matrix__toolbar">
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
                    checked={desktopLineNumbers}
                    onCheckedChange={setDesktopLineNumbers}
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

              <div className="primitive-state-matrix__buttons">
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

              <div className="primitive-state-matrix__selectors">
                <Popover
                  label="Workspace information"
                  trigger={<Button tone="outline">Workspace info</Button>}
                  width="menu-wide"
                >
                  <div className="primitive-state-matrix__popover-copy">
                    <strong>Electron Renderer</strong>
                    <span>Shared package, portalled to the current document.</span>
                  </div>
                </Popover>
                <Select
                  label="Execution mode"
                  onValueChange={(value) => {
                    setDesktopExecutionMode(value);
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
                  ]}
                  value={desktopExecutionMode}
                />
                <Button
                  data-choice-dialog-trigger="true"
                  onClick={() => setContinuationDialogOpen(true)}
                  tone="outline"
                >
                  Continue from message
                </Button>
              </div>

              <output aria-live="polite">
                {primitiveStatus} · line numbers {desktopLineNumbers ? "on" : "off"}
              </output>
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
          </article>

          <article
            className="acceptance-card acceptance-card--resources"
            data-acceptance-surface="resource-surfaces"
          >
            <header>
              <div>
                <h2>Resources, sources, and generated images</h2>
                <p>
                  Desktop image geometry, hover actions, scroll-safe expansion,
                  native focus, and portalled preview.
                </p>
              </div>
              <span className="acceptance-badge">desktop images</span>
            </header>
            <div className="acceptance-card__body resource-state-matrix">
              <div className="resource-state-matrix__wide">
                <span className="resource-state-matrix__label">
                  Generated images · overflow + preview
                </span>
                <GeneratedImageGallery
                  images={desktopResourceImages}
                  onOpenImage={(image) => setPreviewImageId(image.id)}
                />
              </div>
              <div>
                <span className="resource-state-matrix__label">
                  Inline resources · reveal remainder
                </span>
                <ResourceList>
                  <ResourceCard
                    hoverLabel="Open in editor"
                    kind="document"
                    subtitle="Document · MD"
                    title="renderer-notes.md"
                  />
                  <ResourceCard
                    hoverLabel="Open in browser"
                    kind="website"
                    subtitle="Website"
                    title="Desktop research"
                  />
                  <ResourceCard
                    hoverLabel="Open in Drive"
                    kind="spreadsheet"
                    subtitle="Google Sheets"
                    title="Viewport matrix"
                  />
                  <ResourceCard
                    action={<Button size="small" tone="ghost">Share</Button>}
                    hoverLabel="Open app"
                    kind="app"
                    subtitle="Interactive app"
                    title="Acceptance lab"
                  />
                </ResourceList>
              </div>
              <div>
                <span className="resource-state-matrix__label">
                  Sources · compact summary
                </span>
                <SourceList
                  items={[
                    {
                      id: "desktop-attached-source",
                      kind: "file",
                      meta: "Attached to the conversation",
                      title: "desktop-observations.md",
                    },
                    {
                      id: "desktop-web-source",
                      kind: "web",
                      meta: "Web search",
                      title: "Electron renderer reference",
                    },
                    {
                      id: "desktop-tool-source",
                      kind: "tool",
                      meta: "Connector result",
                      title: "Desktop issue audit",
                    },
                    {
                      id: "desktop-external-source",
                      kind: "external",
                      meta: "External resource",
                      title: "Window geometry notes",
                    },
                  ]}
                />
              </div>
              <div>
                <span className="resource-state-matrix__label">
                  Generating · reserved slots
                </span>
                <GeneratedImageGallery
                  images={desktopResourceImages.slice(0, 2)}
                  onOpenImage={(image) => setPreviewImageId(image.id)}
                  pendingCount={2}
                />
              </div>
              <div>
                <span className="resource-state-matrix__label">Artifacts · empty</span>
                <ArtifactList />
              </div>
            </div>
            <ImagePreviewDialog
              imageId={previewImageId}
              images={desktopResourceImages}
              onOpenChange={(open) => {
                if (!open) setPreviewImageId(null);
              }}
              open={previewImageId !== null}
            />
          </article>

          <article className="acceptance-card">
            <header>
              <div>
                <h2>System font metrics</h2>
                <p>Computed inside the current Electron/Chromium build.</p>
              </div>
            </header>
            <div className="acceptance-card__body font-checks">
              <div>
                <span>Sans</span>
                <strong data-font-probe="sans" ref={sansRef}>
                  Agent interface Aa 0123
                </strong>
                <code>{fontMetrics?.sansFamily ?? "measuring…"}</code>
                <small>{fontMetrics?.sansWidth ?? "…"} px sample width</small>
              </div>
              <div>
                <span>Mono</span>
                <strong className="font-checks__mono" ref={monoRef}>
                  const status = "ready";
                </strong>
                <code>{fontMetrics?.monoFamily ?? "measuring…"}</code>
                <small>{fontMetrics?.monoWidth ?? "…"} px sample width</small>
              </div>
            </div>
          </article>

          <article className="acceptance-card">
            <header>
              <div>
                <h2>Window behavior</h2>
                <p>Live content viewport and breakpoint feedback.</p>
              </div>
            </header>
            <div className="acceptance-card__body window-checks">
              <div>
                <span>Renderer viewport</span>
                <strong>
                  {viewport.width} × {viewport.height}
                </strong>
              </div>
              <div>
                <span>Layout mode</span>
                <strong>{viewport.width < 900 ? "compact" : "desktop"}</strong>
              </div>
              <div>
                <span>Theme source</span>
                <strong>{theme.source}</strong>
              </div>
              <div>
                <span>Resolved theme</span>
                <strong>{theme.resolved}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="scroll-validation" aria-label="Scroll validation">
          <header>
            <div>
              <span className="desktop-eyebrow">Long-thread test</span>
              <h2>Scroll containment</h2>
              <p>
                The titlebar and controls remain fixed while this Renderer-owned
                region scrolls through a long activity history.
              </p>
            </div>
            <output>{scrollProgress}%</output>
          </header>

          <AgentThread aria-label="Long desktop thread">
            {repeatedActivities.map((summary, index) => (
              <ActivityGroup key={summary}>
                <AgentMessage role={index % 3 === 0 ? "assistant" : "system"}>
                  Acceptance checkpoint {index + 1}
                </AgentMessage>
                <AgentActivity
                  detail={`step ${index + 1}`}
                  kind={index % 2 === 0 ? "command" : "generic"}
                  status="completed"
                  summary={summary}
                />
              </ActivityGroup>
            ))}
            <AgentMessage role="assistant">
              Desktop validation reached the end of the thread.
            </AgentMessage>
          </AgentThread>
        </section>
      </div>

      <section className="desktop-composer-dock" aria-label="Composer acceptance">
        <div className="desktop-composer-dock__meta">
          <span>Composer acceptance</span>
          <output aria-live="polite">{composerStatus}</output>
        </div>
        <AgentComposer
          actions={
            <button
              disabled={hasComposerAttachment}
              onClick={() => setHasComposerAttachment(true)}
              type="button"
            >
              + Attach
            </button>
          }
          attachments={
            hasComposerAttachment ? (
              <ComposerAttachment
                label="DesktopPlayground.tsx"
                layout="card"
                meta="Renderer"
                onRemove={() => setHasComposerAttachment(false)}
              />
            ) : undefined
          }
          controls={
            <>
              <ComposerModeIndicator
                clearLabel="Clear plan mode"
                kind="plan"
                label="Plan"
                onClear={() => setComposerStatus("Plan mode cleared")}
              />
              <select aria-label="Desktop execution mode" defaultValue="local">
                <option value="local">Local</option>
                <option value="remote">Remote</option>
              </select>
              <select aria-label="Desktop permission mode" defaultValue="ask">
                <option value="ask">Ask first</option>
                <option value="auto">Auto</option>
              </select>
            </>
          }
          isRunning={composerRunning}
          onStop={() => {
            setComposerRunning(false);
            setComposerStatus("Stopped");
          }}
          onSubmit={(value) => {
            setComposerStatus(`Submitted: ${value}`);
            setComposerValue("");
            setComposerRunning(true);
          }}
          onValueChange={setComposerValue}
          placeholder="Enter sends · Shift+Enter adds a line"
          value={composerValue}
        />
        <div
          aria-label="Desktop composer state matrix"
          className="desktop-composer-dock__matrix"
        >
          <div className="desktop-composer-dock__sample">
            <span>Auto · compact</span>
            <AgentComposer
              actions={<button type="button">+</button>}
              controls={<button type="button">Local</button>}
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              value="Inspect the desktop shell"
            />
          </div>
          <div className="desktop-composer-dock__sample">
            <span>Multiline · autosized</span>
            <AgentComposer
              layout="multiline"
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              value={"Validate resizing and focus.\nUse the system font stack."}
            />
          </div>
          <div className="desktop-composer-dock__sample desktop-composer-dock__sample--narrow">
            <span>Running · narrow host</span>
            <AgentComposer
              isRunning
              onStop={() => undefined}
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              value="Continue the renderer check"
            />
          </div>
          <div className="desktop-composer-dock__sample">
            <span>Disabled</span>
            <AgentComposer
              disabled
              layout="multiline"
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              value="Waiting for the active task"
            />
          </div>
          <div className="desktop-composer-dock__sample desktop-composer-dock__sample--mentions">
            <span>Mentions · expanded tray</span>
            <AgentComposer
              controls={
                <ComposerModeIndicator
                  clearLabel="Clear goal"
                  kind="goal"
                  label="Goal"
                  onClear={() => undefined}
                />
              }
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              suggestions={
                <ComposerMentionMenu
                  groups={[
                    {
                      id: "desktop-files",
                      label: "Files",
                      options: [
                        {
                          description: "Renderer",
                          icon: "TS",
                          id: "desktop-playground",
                          kind: "file",
                          label: "DesktopPlayground.tsx",
                        },
                        {
                          description: "Styles",
                          icon: "#",
                          id: "desktop-styles",
                          kind: "file",
                          label: "styles.css",
                        },
                      ],
                    },
                  ]}
                  onSelect={() => undefined}
                  query="@desktop"
                />
              }
              value="@desktop"
            />
          </div>
          <div className="desktop-composer-dock__sample">
            <span>Queue · interrupted + paused</span>
            <AgentComposer
              isRunning
              onStop={() => undefined}
              onSubmit={() => undefined}
              onValueChange={() => undefined}
              queue={
                <QueuedPromptList
                  interrupted
                  items={[
                    { id: "desktop-one", text: "Validate system theme" },
                    {
                      attachmentSummary: "1 attachment",
                      id: "desktop-two",
                      status: "paused",
                      text: "Retry compact geometry",
                    },
                  ]}
                  onDelete={() => undefined}
                  onEdit={() => undefined}
                  onQueueingChange={() => undefined}
                  onReorder={() => undefined}
                  onResume={() => undefined}
                  onSendNow={() => undefined}
                />
              }
              value="Queue another desktop check"
            />
          </div>
        </div>
      </section>

      <footer className="desktop-footer">
        <div>
          <StatusIndicator status="completed" />
          <span>Scroll {scrollProgress}%</span>
        </div>
        <div className="desktop-footer__actions">
          <button onClick={() => scrollTo("start")} type="button">
            Top
          </button>
          <button onClick={() => scrollTo("end")} type="button">
            Latest
          </button>
        </div>
      </footer>
    </main>
  );
}
