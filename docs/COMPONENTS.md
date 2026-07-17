# Component reference

Codex UI Kit exposes protocol-neutral React components. Hosts own data fetching, app-server mapping, persistence, routing, and privileged actions; the kit owns presentation, interaction state, accessibility semantics, and public visual tokens.

## Thread and message surfaces

- `AgentThread`: responsive `768px` content column with turn separation and container-query reflow.
- `AgentThreadViewport`: focusable, follow-aware scroll surface with latest-turn detection, reduced-motion-safe auto-follow, and a sticky footer.
- `AgentTurn` and `ActivityGroup`: explicit standard and grouped spacing contracts.
- `ThreadVirtualizedPlaceholder`: estimated-height placeholder for host-owned thread virtualization.
- `AgentMessage`: user, assistant, and system presentation with user-bubble geometry, edit activation, actions, running ARIA state, and target highlighting.
- `ThreadLoadingState` and `ThreadThinkingPlaceholder`: loading, reconnecting, and thinking states.
- `LoadingShimmer` and `ThreadSkeleton`: streaming-safe progress surfaces with reduced-motion fallbacks.
- `ThreadRenderError`: compact turn-level failure with a host-owned retry hook.

## Rich content

- `AgentMarkdown`: GFM rendering without raw HTML, streaming stabilization, semantic renderer overrides, and viewport-aware lazy syntax highlighting.
- `InlineCode`: standalone inline-code treatment.
- `CodeBlock`: language header, copy feedback, syntax highlighting, and wrapped or unwrapped states.
- `FileDiff`: structured context, hunk, metadata, addition, and deletion lines with optional wrapping, viewport modes, and scroll-edge fades.

The built-in highlighter escapes untrusted code. A custom `CodeHighlighter` returning `html` is treated as trusted markup, so hosts must escape untrusted input before returning it.

## Agent activity

- `AgentActivity`: accessible expandable activity primitive.
- `ActivityTimeline`: controlled or uncontrolled turn-level disclosure with persistent and historical content slots.
- `TurnDuration`: working, completed, and user-stopped duration language.
- `AgentReasoning`: active and completed reasoning disclosure states.
- `AgentPlan`: structured pending, in-progress, and completed plan steps.
- `ProposedPlan`: writing and completed plan-card states with host-owned actions.
- `SearchActivity`: code-search and grouped web-search states with controlled disclosure and bounded results.
- `SubagentActivity` and `SubagentActivityGroup`: delegated-work rows and compact grouped activity.
- `SubagentSummary`: controlled working/done summary with agent metadata and diff statistics.
- `SubagentPanel`: active and completed agent sections with pagination and selection hooks.
- `SubagentTranscriptHeader` and `SubagentAvatar`: nested transcript navigation and asset-free agent identity.

## Tools, approvals, and status

- `ToolCallCard`: generic MCP, connector, browser, and arbitrary tool-call row with structured, empty, error, and raw-output states.
- `CommandExecution`: expandable command surface with duration, copy, background-terminal, success, failure, and interruption states.
- `CommandOutput`: labeled stdout/stderr with no-output, tail-following, overflow, fade, and copy behavior.
- `FileChange`: create, apply, stop, reject, delete, and rename activities with disclosure, statistics, path opening, and copy hooks.
- `ApprovalRequest`: command, patch, network, permission, and generic approval card with scoped actions, shortcuts, loading, and outcome states.
- `ApprovalCommandPreview`: bounded command preview with explicit expansion controls.
- `StatusBanner`: neutral, info, warning, and error shell with actions, dismissal, and compact reflow.
- `InlineNotice`: transcript divider with tone, guidance, wrapping, and active shimmer.
- `StreamNotice`: reconnecting, server-busy, failed, retry, progress, and additional-detail states.
- `StatusIndicator`: compact visual state primitive.

All privileged behavior remains host-owned. The components never auto-approve commands, file changes, network access, or permissions.

## Composer

- `AgentComposer`: controlled autosizing input with automatic, single-line, and multiline layouts; submit/stop behavior; focus transfer; and protocol-neutral slots.
- `ComposerAttachment`: pill, card, and image layouts with ready, uploading, error, open, and remove states.
- `ComposerMentionMenu`: grouped file, skill, app, agent, or custom mentions with loading, empty, disabled, active, and keyboard-selection states.
- `ComposerModeIndicator`: Plan, Goal, Review, or host-defined footer mode with a clear affordance.
- `QueuedPromptList`: reorderable queued follow-ups with queued, editing, paused, interrupted, retry, steer, delete, resume, and queue-toggle behavior.

## Interactive primitives

- `Button` and `IconButton`: primary, secondary, outline, ghost, danger, pressed, loading, disabled, toolbar, and size states.
- `Tooltip`: delayed pointer and immediate keyboard disclosure with shortcut, side, alignment, and collision support.
- `Popover`: portalled dialog, menu, or listbox positioning with outside dismissal, focus restoration, and viewport collision handling.
- `Menu`, `MenuItem`, `MenuCheckboxItem`, and `MenuSubmenu`: keyboard navigation, sections, separators, checked states, nested portals, shortcuts, descriptions, and destructive actions.
- `Select`: controlled listbox selection with descriptions, icons, disabled options, selected state, and empty fallback.

## Resources and media

- `ResourceCard` and `ResourceList`: file, website, Drive, app, and image resources with previews, metadata, opening, trailing actions, and progressive reveal.
- `SourceList`: compact file, web, tool, and external citation summaries with metadata and expansion.
- `ArtifactList`: resource-list composition with an explicit empty state.
- `GeneratedImageGallery`: one-to-four-slot natural or square image geometry, pending placeholders, retry/error handling, overflow paging, and reduced-motion support.
- `ImagePreviewDialog`: portalled lightbox with focus trapping/restoration, Escape and arrow navigation, download, backdrop dismissal, and previous/next controls.

## Navigation and shell

- `ThreadHeader`: draggable desktop header with truncating identity, navigation, and independently aligned action slots.
- `ThreadNavigationControls`: sidebar and optional Back/Forward toolbar controls with shortcuts, disabled states, and transient-navigation hover hooks.
- `ThreadMessageNavigationRail`: message overview with active markers, keyboard and pointer previews, click navigation, and pointer scrubbing.
- `FloatingThreadPanel`: non-modal, inert-when-closed panel with host-controlled contents and inset.
- `ThreadFloatingButton`: latest-message control with chevron, working dots, hidden-interaction removal, and reduced-motion behavior.

## Composition rules

- Keep protocol objects in adapters; pass normalized props into UI components.
- Keep privileged actions explicit and host-owned.
- Import `codex-ui-kit/styles.css` once at the application boundary.
- Override public `--codex-ui-*` variables rather than targeting private element structure.
- Use the controlled APIs when application state must survive remounts or coordinate across windows.
