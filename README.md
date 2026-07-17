# Codex UI Kit

Independently designed React components for building Codex-style coding-agent interfaces.

> This is an unofficial, independently developed open-source project for the public Codex ecosystem. It is not affiliated with, sponsored by, or endorsed by OpenAI. Codex and OpenAI are trademarks of OpenAI.

## Status

High-fidelity preview for an initial public release. The public API may change
before 1.0 while component and visual parity work is completed.

The completed foundations cover the thread, activity timeline, reasoning, plan,
approval, composer, and rich-text surfaces: messages, GFM Markdown, inline and
block code, grouped and collapsible activities, turn duration and interruption,
commands, file changes, tool-call state, responsive content, controlled
decisions, delegated-work activity, subagent summaries and panels, and an agent
input with keyboard and running states. Error, warning, reconnect, retry,
interruption, status-banner, button, tooltip, popover, menu, submenu, and
select surfaces are also covered. Resource cards, source summaries, artifact
states, generated-image galleries, pending placeholders, and keyboard image
preview are covered by the same browser and Electron acceptance matrix. Run the local
showcase with:

```bash
pnpm dev
```

For validation in a real desktop Renderer, run the independent Electron
playground:

```bash
pnpm dev:electron
```

The Electron app lives in `playgrounds/electron` and consumes this package via
the pnpm workspace. Electron is not a dependency of `codex-ui-kit`.

## Principles

- Keep the component model independent from any single agent protocol.
- Represent messages, tool calls, commands, file changes, and approvals as composable primitives.
- Match the sampled Codex component behavior and visual system with independently written implementation code.
- Keep extracted application files, bundled fonts, logos, and other private assets out of the package.
- Keep protocol-specific mapping in adapters rather than UI components.

## Components

- `AgentThread`: measured `768px` responsive content column with `12px` turn
  separation and container-query reflow.
- `AgentThreadViewport`: focusable, follow-aware scroll surface with a `24px`
  latest-turn threshold, reduced-motion-safe auto-follow, and sticky footer.
- `AgentTurn`, `ActivityGroup`, and `ThreadVirtualizedPlaceholder`: explicit
  `16px` standard, `4px` grouped, and `280px` virtualized turn contracts.
- `AgentMessage`: user, assistant, and system presentation with measured user
  bubble geometry, keyboard/double-click edit activation, hover/focus actions,
  running ARIA state, and target highlighting.
- `ThreadLoadingState`, `ThreadThinkingPlaceholder`, `LoadingShimmer`, and
  `ThreadSkeleton`: exact task/reconnect language plus streaming-safe progress
  surfaces and reduced-motion fallbacks.
- `ThreadRenderError`: compact turn-level failure with a host-owned retry hook.
- `AgentMarkdown`: safe GFM rendering with measured rich-text geometry and
  streaming stabilization plus viewport-aware lazy syntax highlighting.
- `InlineCode`: standalone inline-code treatment.
- `CodeBlock`: language header, copy feedback, and wrapped/unwrapped states.
- `AgentActivity`: accessible expandable activity primitive.
- `ActivityGroup`: compact grouping for related activities.
- `ActivityTimeline`: controlled or uncontrolled turn-level activity collapse
  with pre-toggle, persistent, and animated historical content slots.
- `TurnDuration`: exact working, worked, and user-stopped duration language.
- `AgentReasoning`: active and completed reasoning disclosure states.
- `AgentPlan`: structured pending, in-progress, and completed plan steps.
- `ProposedPlan`: writing and completed plan-card states with action slots.
- `ToolCallCard`: generic MCP, connector, browser, and arbitrary tool-call row
  with source icons, active/completed labels, controlled results, structured
  JSON, empty/error states, and a raw-output inspection hook.
- `SearchActivity`: exact code-search and grouped web-search language with
  controlled disclosure, current-query summaries, favicons, and a `320px`
  result viewport.
- `SubagentActivity` and `SubagentActivityGroup`: standalone delegated-work
  rows plus the measured three-chip inline group, overflow count, status
  priority, entrance motion, and host-owned subagent navigation.
- `SubagentSummary`: controlled summary section with grouped agent avatars,
  working/done counts, individual role/model hints, and diff statistics.
- `SubagentPanel`: active and done sections with two-line/one-line previews,
  exact empty fallbacks, visible-item pagination, and selection hooks.
- `SubagentTranscriptHeader` and `SubagentAvatar`: nested transcript navigation
  and deterministic, asset-free agent identity primitives.
- `ApprovalRequest`: elevated command, patch, network, permission, and generic
  request card with identity/title/reason hierarchy, one-shot and scoped
  actions, loading/outcome states, Enter/Escape shortcuts, and compact
  container reflow.
- `ApprovalCommandPreview`: measured three-line command collapse with a
  `320px` expanded viewport and explicit expand/collapse controls.
- `CommandExecution`: collapsed command language plus expandable shell, exact
  duration, copy, background-terminal, success, failure, and interruption states.
- `CommandOutput`: independently labeled stdout/stderr output with no-output,
  tail-following, `140px` overflow, edge-fade, and copy behavior.
- `FileChange`: creating, applied, stopped, rejected, deleted, and renamed
  activities with controlled disclosure, diff statistics, path opening, copy,
  and state-specific empty content.
- `FileDiff`: structured context, hunk, metadata, addition, and deletion lines
  with host-rendered syntax tokens, optional wrapping, `100px`/`240px`/`160px`
  viewport modes, and scroll-edge fades.
- `StatusBanner`: neutral, info, warning, and error status shell with horizontal,
  vertical, and icon layouts; protocol-neutral actions; dismiss behavior; ARIA
  passthrough; and compact-container action reflow.
- `InlineNotice`: the measured two-rule transcript divider with optional icon,
  trailing guidance, wrapping, tone, and active shimmer.
- `StreamNotice`: reconnecting, server-busy, failed, retry, progress, and
  controlled/uncontrolled additional-detail states.
- `StatusIndicator`: visual state primitive.
- `AgentComposer`: controlled input surface with measured `auto`, forced
  `single-line`, and forced `multiline` layouts; autosizing; submit/stop
  behavior; shell-to-input focus transfer; and protocol-neutral slots.
  Attachments and explicit line breaks remain structurally multiline even when
  a host requests the compact layout.
- `ComposerAttachment`: pill, card, and image attachment layouts with open,
  remove, ready, uploading, and error states.
- `ComposerMentionMenu`: grouped file, skill, app, agent, or custom mention
  results with loading, empty, disabled, active, and keyboard-selection states.
- `ComposerModeIndicator`: compact Plan, Goal, Review, or host-defined footer
  mode with the observed hover-to-clear affordance.
- `QueuedPromptList`: reorderable queued follow-ups with queued, editing,
  paused, interrupted, retry/steer, edit, delete, resume, and queue-toggle
  behavior.
- `Button` and `IconButton`: measured primary, secondary, outline, ghost,
  danger, pressed, loading, disabled, toolbar, and size states.
- `Tooltip`: delayed pointer and immediate keyboard disclosure with shortcut,
  side, alignment, collision, and controlled-state support.
- `Popover`: portal-based dialog, menu, or listbox positioning with outside
  dismissal, focus restoration, viewport collision handling, and public width
  roles.
- `Menu`, `MenuItem`, `MenuCheckboxItem`, and `MenuSubmenu`: keyboard-navigable
  action surfaces with sections, separators, checked states, nested portalled
  menus, shortcuts, descriptions, and destructive actions.
- `Select`: controlled value selection over the shared listbox surface with
  descriptions, icons, selected state, disabled options, and empty fallback.
- `ResourceCard` and `ResourceList`: protocol-neutral file, website, Drive,
  app, and image rows with a `40px` visual well, hover/open affordances,
  independent trailing actions, and the observed three-item reveal behavior.
- `SourceList`: compact file, web, tool, and external citation summaries with
  `View all`, `18px` previews, metadata, and a measured `300px` panel width.
- `ArtifactList`: resource-list composition with the observed
  `No artifacts yet` empty state.
- `GeneratedImageGallery`: one-to-four-slot natural/square image geometry,
  `8px` gaps, pending placeholders, overflow paging, no-referrer images, and
  reduced-motion support.
- `ImagePreviewDialog`: portalled lightbox with focus restoration and trapping,
  Escape and Arrow navigation, download, backdrop dismissal, and previous/next
  controls.
- `ThreadHeader`: measured `48px` draggable desktop header with truncating
  identity, leading/navigation, start/end action, and independently centered
  action slots.
- `ThreadNavigationControls`: sidebar plus optional Back/Forward toolbar
  controls with observed accessible names, disabled history states, shortcuts,
  and hover hooks for transient navigation.
- `ThreadMessageNavigationRail`: four-or-more-message overview with active-turn
  markers, keyboard and pointer previews, smooth click navigation, and captured
  pointer scrubbing through host-controlled instant navigation callbacks.
- `FloatingThreadPanel`: non-modal, inert-when-closed leading panel with
  host-controlled contents and top inset.
- `ThreadFloatingButton`: latest-message chevron plus working-dot state with
  hidden interaction removal and reduced-motion behavior.

The default stylesheet supports light, dark, and system color schemes. Set
`data-theme="light"` or `data-theme="dark"` on an ancestor to force a theme.

## Visual tokens

The component stylesheet includes the complete public token foundation. Import
the standalone token contract when building additional parity components that
do not need the packaged component styles:

```tsx
import "codex-ui-kit/tokens.css";
```

All public variables use the `--codex-ui-` prefix. They cover the measured
neutral and status palettes, semantic light and dark surfaces, typography,
spacing, radii, shadows, thread width, and composer geometry. The font stack
names OpenAI Sans when a host has licensed and provided it, then falls back to
the native system stack; this package does not redistribute the bundled font.

## Installation

The package is prepared as `codex-ui-kit@0.1.0`. After the first registry
release, install it with:

```bash
pnpm add codex-ui-kit
```

## Usage

```tsx
import {
  ActivityGroup,
  ActivityTimeline,
  AgentMarkdown,
  AgentMessage,
  AgentPlan,
  AgentReasoning,
  AgentThread,
  AgentThreadViewport,
  TurnDuration,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";

export function Example() {
  return (
    <AgentThreadViewport>
      <AgentThread aria-label="Coding agent thread">
        <AgentMessage role="user">Run the checks.</AgentMessage>
        <AgentMessage role="assistant">
          <AgentMarkdown>{"**Running** `pnpm check`."}</AgentMarkdown>
        </AgentMessage>
        <ActivityTimeline
          defaultOpen
          persistentContent={
            <AgentReasoning status="running">
              Inspecting the test configuration.
            </AgentReasoning>
          }
          shouldShowPersistentContentGap
          summary={<TurnDuration durationMs={4_200} status="working" />}
        >
          <ActivityGroup>
            <AgentPlan
              steps={[
                { status: "completed", step: "Inspect configuration" },
                { status: "in_progress", step: "Run tests" },
              ]}
            />
          </ActivityGroup>
        </ActivityTimeline>
      </AgentThread>
    </AgentThreadViewport>
  );
}
```

`AgentMarkdown` parses GFM but does not enable raw HTML. Hosts can override its
semantic renderer map and code-copy handler without coupling the component to a
protocol or clipboard bridge.

Fenced code uses the same observed highlight.js language surface as the sampled
desktop build. Highlighting is loaded only when needed, starts when a block is
within `600px` of the viewport, and is throttled to one start per `120ms` while
streaming. The previous highlighted prefix remains stable while newly streamed
text is still plain. Pass `codeHighlighter={false}` to disable highlighting or a
`CodeHighlighter` to integrate another engine. A custom highlighter's `html`
result is rendered as trusted markup, so the host must escape untrusted code;
the built-in highlighter performs that escaping.

## Research and provenance

The component model is informed by read-only study of publicly observable
Codex interactions and locally installed packaged Renderer assets. Extracted
application files are never committed or redistributed. See
[`SOURCES.md`](SOURCES.md) and [`research/README.md`](research/README.md).

## Development

```bash
pnpm install
pnpm check
pnpm check:package
```

`pnpm check` builds the library, browser showcase, Electron main/preload
processes, Electron Renderer, and a dry-run npm tarball without launching a
graphical window in CI. `pnpm check:package` validates release metadata, export
targets, and package contents after the library build.

## License

MIT
