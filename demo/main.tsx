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
  ApprovalRequest,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  FileChange,
  FileDiff,
  fileDiffToText,
  ProposedPlan,
  SearchActivity,
  StatusIndicator,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentPanel,
  SubagentSummary,
  SubagentTranscriptHeader,
  ToolCallCard,
  TurnDuration,
  type AgentItemStatus,
  type ApprovalDecision,
  type FileDiffLine,
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
  { label: "Failed", status: "failed" },
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

function Showcase() {
  const [dark, setDark] = useState(false);
  const [composerValue, setComposerValue] = useState(
    "Add keyboard navigation to the activity timeline.",
  );
  const [composerRunning, setComposerRunning] = useState(false);
  const [composerStatus, setComposerStatus] = useState("Ready to submit");
  const [hasAttachment, setHasAttachment] = useState(true);
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision>("pending");
  const [wrapMarkdownCode, setWrapMarkdownCode] = useState(false);
  const [markdownCopyStatus, setMarkdownCopyStatus] = useState("Ready to copy");
  const [planActionStatus, setPlanActionStatus] = useState("Plan actions ready");
  const [toolActionStatus, setToolActionStatus] = useState(
    "Raw tool output ready",
  );
  const [selectedSubagent, setSelectedSubagent] =
    useState<SubagentItem | null>(null);

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
              <AgentThread aria-label="Example coding agent thread">
                <AgentMessage role="user">
                  Add a compact activity timeline and verify the component tests.
                </AgentMessage>

                <AgentMessage role="assistant">
                  <p>
                    I’ll inspect the component model, make the change, and run
                    checks.
                  </p>
                </AgentMessage>

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
                  </ActivityGroup>
                </ActivityTimeline>

                <AgentMessage role="assistant" status="running">
                  The implementation is ready; I’m waiting for the final checks.
                </AgentMessage>
              </AgentThread>
            </div>
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
            description="A controlled decision surface for commands and other privileged work."
            title="Approval interaction"
            wide
          >
            <div className="approval-preview">
              <div className="approval-preview__meta">
                <span>Decision: {approvalDecision}</span>
                <button
                  disabled={approvalDecision === "pending"}
                  onClick={() => setApprovalDecision("pending")}
                  type="button"
                >
                  Reset request
                </button>
              </div>
              <ApprovalRequest
                decision={approvalDecision}
                description="This command publishes the package to a public registry."
                onApprove={() => setApprovalDecision("approved")}
                onReject={() => setApprovalDecision("rejected")}
                title="Publish codex-ui-kit?"
              >
                pnpm publish --access public
              </ApprovalRequest>
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
