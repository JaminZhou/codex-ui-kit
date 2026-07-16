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
  ApprovalRequest,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  FileChange,
  FileDiff,
  ProposedPlan,
  StatusIndicator,
  ToolCallCard,
  TurnDuration,
  type ApprovalDecision,
  type FileDiffLine,
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
              <AgentThread aria-label="Desktop validation thread">
                <AgentMessage role="user">
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
                  description="Exercise an interactive privileged-action surface inside the desktop Renderer."
                  onApprove={() => setApprovalDecision("approved")}
                  onReject={() => setApprovalDecision("rejected")}
                  title="Run the desktop acceptance command?"
                >
                  pnpm --filter @codex-ui-kit/electron-playground check
                </ApprovalRequest>
              </AgentThread>
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
                <strong ref={sansRef}>Agent interface Aa 0123</strong>
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
                meta="Renderer"
                onRemove={() => setHasComposerAttachment(false)}
              />
            ) : undefined
          }
          controls={
            <>
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
