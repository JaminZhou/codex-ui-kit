# Component reference

Codex UI Kit exposes protocol-neutral React components. Hosts own data fetching, app-server mapping, persistence, routing, and privileged actions; the kit owns presentation, interaction state, accessibility semantics, and public visual tokens.

## Thread and message surfaces

- `ConversationThreadShell`: current-build measured page composition that
  combines a 46px header, centered follow-aware timeline, responsive 16px
  insets, an overlay multiline Composer, and host-owned message-navigation and
  latest-message control slots while keeping data and actions host-owned. Its
  `viewportRef` exposes the owned scroll element for host navigation and
  return-to-latest behavior without replacing internal measurement.
- `AgentThread`: responsive `768px` content column with turn separation and container-query reflow.
- `AgentThreadViewport`: focusable, follow-aware scroll surface with latest-turn detection, normal or reverse latest-origin scrolling, reduced-motion-safe auto-follow, direct-input cancellation for programmatic following, and a sticky footer.
- `AgentTurn` and `ActivityGroup`: explicit standard and grouped spacing contracts.
- `ThreadVirtualizedPlaceholder`: estimated-height placeholder for host-owned thread virtualization.
- `AgentMessage`: user, assistant, and system presentation with user-bubble geometry, edit activation, actions, running ARIA state, and target highlighting.
- `ThreadLoadingState` and `ThreadThinkingPlaceholder`: loading, reconnecting, and thinking states.
- `ThreadContextOptimization`: manual compaction, automatic compaction, and Work-mode conversation optimization in running and completed states.
- `ThreadInterruptionSummary`: current-build stop-result row with duration
  language and the measured trailing divider.
- `ThreadContextEvent`: current-build manual compaction composition, including
  the running `Working` divider and running/completed optimization row.
- `LoadingShimmer` and `ThreadSkeleton`: streaming-safe progress surfaces with reduced-motion fallbacks.
- `ThreadRenderError`: compact turn-level failure with a host-owned retry hook.

## Rich content

- `AgentMarkdown`: GFM rendering without raw HTML, streaming stabilization, semantic renderer overrides, and viewport-aware lazy syntax highlighting. `stabilizeStreamingMarkdown` exposes the package's standalone streaming helper; `CodeHighlighter` is the public contract for supplying a custom escaped-code highlighter.
- `InlineCode`: standalone inline-code treatment.
- `CodeBlock`: language header, copy feedback, syntax highlighting, and wrapped or unwrapped states.
- `FileDiff`: structured context, hunk, metadata, addition, and deletion lines with optional wrapping, viewport modes, and scroll-edge fades. `fileDiffToText` converts the structured public line model into copyable plain text.

The built-in highlighter escapes untrusted code. A custom `CodeHighlighter` returning `html` is treated as trusted markup, so hosts must escape untrusted input before returning it.

## Agent activity

- `AgentActivity`: accessible expandable activity primitive.
- `ActivityTimeline`: controlled or uncontrolled turn-level disclosure with persistent and historical content slots.
- `TurnDuration`: working, completed, and user-stopped duration language. `formatTurnDuration` exposes the same protocol-neutral formatter.
- `AgentReasoning`: active and completed reasoning disclosure states.
- `AgentPlan`: structured pending, in-progress, and completed plan steps.
- `ProposedPlan`: writing and completed plan-card states with host-owned actions.
- `SearchActivity`: code-search and grouped web-search states with controlled disclosure and bounded results.
- `BrowserActivity`: running, completed, and failed Browser disclosures with
  ordered instruction, connection, and navigation steps.
- `ConversationEventList` and `ConversationEvent`: protocol-neutral ordering,
  ownership (`turn` or `thread`), event-kind, progress, warning, failure, live
  status, metadata, content, and action slots for mixed session timelines.
- `SubagentActivity` and `SubagentActivityGroup`: delegated-work rows and compact grouped activity.
- `SubagentSummary`: controlled working/done summary with agent metadata and diff statistics.
- `SubagentPanel`: active and completed agent sections with pagination and selection hooks.
- `SubagentTranscriptHeader` and `SubagentAvatar`: nested transcript navigation and asset-free agent identity.

## Tools, approvals, and status

- `McpToolCallGroup`: expandable integration-owned group for ordered MCP calls with running, recovered, and failed labels.
- `ToolCallCard`: generic MCP, connector, and arbitrary tool-call row with structured, empty, danger-alert, neutral language/output-error, host-owned raw-output states, and an independently localizable failed-state accessible name.
- `CommandExecution`: expandable command surface with duration, copy,
  optional `Shell`/host-defined shell label, background-terminal, success,
  failure, and interruption states. Completed expanded summaries preserve the
  command identity. `formatCommandDuration` exposes its standalone duration
  formatter.
- `CommandOutput`: labeled stdout/stderr with no-output, 144px bounded
  reverse-tail following, overflow, fade, collapse/reopen restoration, and
  copy behavior.
- `FileChange`: one-file create, apply, stop, reject, delete, and rename activities with disclosure, statistics, path opening, and copy hooks.
- `FileChangeGroup`: one protocol item's aggregate changed-files card with group status/actions, independent file rows, statistics, rename paths, and host-owned file opening.
- `FileReview`: a scrollable workspace composition that stacks every changed
  file with an independent header, statistics, focusable text/binary/conflict
  content, optional controlled file selection, and a selected-file marker.
  Existing `lines` items remain supported; `FileReviewContent` makes non-text
  states explicit, and `FileReviewNotice` can also be composed independently.
- `ApprovalRequest`: command, patch, network, permission, and generic approval
  card with scoped actions, shortcuts, loading, outcome states, and default or
  current Composer-dock presentation.
- `ApprovalCommandPreview`: bounded command preview with explicit expansion controls.
- `StatusBanner`: neutral, info, warning, and error shell with actions, dismissal, and compact reflow.
- `InlineNotice`: transcript divider with tone, guidance, wrapping, and active shimmer.
- `StreamNotice`: reconnecting, server-busy, failed, retry, progress, and additional-detail states.
- `StatusIndicator`: compact pending, running, completed, warning, and failed state primitive.

All privileged behavior remains host-owned. The components never auto-approve commands, file changes, network access, or permissions.

## Composer

- `AgentComposer`: controlled autosizing input with automatic, single-line, and multiline layouts; submit/stop behavior; focus transfer; and protocol-neutral slots. `allowSubmitWhileRunning` lets Enter route a follow-up to a host-owned queue while Stop remains the visible primary action.
- `ComposerDock`: current-build composition that keeps context controls,
  external queue state, and the input card in distinct ownership slots.
- `ComposerContextBar` and `ComposerContextControl`: accessible project,
  environment, branch, or host-defined context controls above the Composer.
- `ComposerAttachment`: pill, card, and image layouts with ready, uploading, error, open, and remove states.
- `ComposerMentionMenu`: grouped file, skill, app, agent, or custom mentions with loading, empty, disabled, active, and keyboard-selection states.
- `ComposerModeIndicator`: Plan, Goal, Review, or host-defined footer mode with a clear affordance.
- `QueuedPromptList`: reorderable queued follow-ups with queued, editing, paused, interrupted, retry, steer, delete, resume, and queue-toggle behavior.

## Interactive primitives

- `Button` and `IconButton`: primary, secondary, outline, ghost, danger, pressed, loading, disabled, toolbar, and size states.
- `Dialog` and `DialogChoice`: controlled modal presentation with compact, standard, and wide sizes; focus trapping/restoration; an optional `returnFocusRef` for launchers that unmount before the modal commits; scroll locking; Escape/backdrop dismissal; and descriptive choice rows.
- `Tooltip`: delayed pointer and immediate keyboard disclosure with shortcut, side, alignment, and collision support.
- `Popover`: portalled dialog, menu, or listbox positioning with outside dismissal, focus restoration, and viewport collision handling.
- `Menu`, `MenuItem`, `MenuCheckboxItem`, `MenuSubmenu`, `MenuSectionLabel`, and `MenuSeparator`: keyboard navigation, labelled sections, separators, checked states, nested portals, shortcuts, descriptions, and destructive actions.
- `Select`: controlled listbox selection with descriptions, icons, disabled options, selected state, and empty fallback.

## Resources and media

- `ResourceCard` and `ResourceList`: file, website, Drive, app, and image resources with previews, metadata, optional labelled opening actions, trailing actions, and progressive reveal. Cards without `href` or `onOpen` remain static content.
- `SourceList`: compact file, web, tool, and external citation summaries with metadata, optional labelled opening actions, and expansion. Sources without `href` or `onOpen` remain static rows.
- `ArtifactList`: resource-list composition with an explicit empty state.
- `GeneratedImageGallery`: one-to-four-slot natural or square image geometry, pending placeholders, retry/error handling, overflow paging, and reduced-motion support. Images become focusable actions only when `onOpenImage` is provided.
- `ImagePreviewDialog`: portalled lightbox with focus trapping/restoration, Escape and arrow navigation, download, backdrop dismissal, and previous/next controls.

## Navigation and shell

- `AppWindowChrome`: 46px application-owned window navigation with
  traffic-light-safe Sidebar, Back, and Forward controls plus host-owned title
  and trailing slots. Hosts retain history, routing, and native-window
  behavior.
- `AppRouteOutlet`: ready, loading, empty, error, offline, reconnecting, and
  stale-data presentation. Stale and reconnecting variants can preserve
  host-owned content while alert/live-region and busy semantics remain
  explicit; reconnecting marks only the refreshed content busy so the sibling
  live status remains announceable.
- `AppNotificationRegion`: body-portalled top- or bottom-end application
  feedback with neutral, success, warning, and error tones, optional action,
  dismissal, alert/status semantics, and explicit or trigger-inferred theme
  propagation across the portal boundary. Inferred theme ownership is
  recomputed when the visible notification set changes, including one-for-one
  replacement.
- `AppShell`: the application-level grid for a persistent navigation sidebar,
  conversation main region, right workspace panel, and bottom panel. Wide mode
  reserves measured tracks; medium and narrow containers switch side surfaces
  to dismissible overlays before the conversation becomes unusably narrow.
  Hosts that intentionally replace those responsive styles can pass the
  matching `layoutMode` so inert, focus, dismissal, and `aria-hidden`
  behavior stays aligned with the rendered layout. `sidebarResizable` adds a
  current-build measured 16px separator with 240–520px pointer clamps,
  accessible value metadata, and Arrow/Home/End keyboard control. Split mode
  also caps the track against `sidebarMinMainWidth` (352px by default), while
  narrow overlay mode retains the persisted preference; hosts can use
  `sidebarWidth` and `onSidebarWidthChange` for controlled persistence.
  `sidePanelResizable` applies the same accessible interaction contract to the
  right workspace, with configurable panel/main minima, responsive clamping,
  controlled persistence, focus restoration, and an expanded full-main mode.
  `sidePanelOverlay` lets a host explicitly preserve the main route beneath a
  responsive panel; `sidePanelOverlayModal` separately controls backdrop,
  inertness, focus trapping, and dismissal so a current-build non-modal PR
  overlay can remain resizable without disabling the route.
  Responsive width clamping also applies when the panel has no resize
  affordance, and a wider sidebar is coordinated with the persistent panel
  minimum so both fixed tracks cannot consume the main route.
  `bottomPanelResizable` adds the current-build measured 16px horizontal
  separator, a preferred 152px minimum (reduced only when the responsive
  half-height cap is smaller), pointer and Arrow/Home/End control, accessible
  values, and controlled or uncontrolled height persistence. `windowChrome`
  places the application-owned titlebar above the main track and keeps its
  trailing actions before a persistent right panel.
  `responsivePanelContinuity` can auto-collapse side surfaces at the measured
  960/720px layout transitions and restore only surfaces that it closed;
  disabling continuity or changing `responsivePanelContinuityKey` resets that
  restoration intent for a new route or workspace. Controlled-host callbacks
  must acknowledge the requested state before the surface becomes eligible
  for later restoration.
  `narrowSidebarBehavior="current-build"` separates
  a transient 12px edge preview from explicitly pinning the normal sidebar
  track, and restores focus before that preview becomes inert.
- `AppSidebar`, `AppSidebarSection`, `AppSidebarItem`, and
  `AppSidebarFooter`: grouped primary navigation with one selected route,
  heading-preserving collapsible collections, lifecycle status, measured
  action columns, and an in-flow footer slot that cannot cover navigation.
  A titleless section remains expanded because it has no operable toggle;
  chevron and action visibility transitions respect reduced motion.
- `WorkspacePanel`: controlled side or bottom tab shell with labelled tab
  semantics, host action slots, close/open/expand hooks and labels, focusable
  content, and host-owned tab contents.
- `TerminalTranscript`, `TerminalPrompt`, and `TerminalSession`: terminal
  output, controlled input, and process-status composition with typed output
  rows, polite follow output, named log/input regions, and explicit
  host-owned submission. `TerminalPanel` adds controlled multi-session tabs,
  per-tab close, create/restore hooks, independent values, and running,
  failed, restoring, idle, or exited status. Tab names expose that status to
  assistive technology and use distinct visible symbols rather than color
  alone. `TerminalProcessList` presents host-supplied background-process
  summaries and reopen requests. None of these components starts a shell,
  owns process persistence, or executes input.
- `ThreadHeader`: draggable desktop header with truncating identity, navigation, and independently aligned action slots.
- `ThreadNavigationControls`: sidebar and optional Back/Forward toolbar controls with shortcuts, disabled states, and transient-navigation hover hooks.
- `ThreadMessageNavigationRail`: message overview with a current-build default
  threshold of ten user messages, active markers, keyboard and pointer
  previews, click navigation, pointer scrubbing, regular or compact row
  density, and optional initial end positioning for long histories.
- `FloatingThreadPanel`: non-modal, inert-when-closed panel with host-controlled contents and inset.
- `ThreadFloatingButton`: latest-message control with chevron, working dots, hidden-interaction removal, and reduced-motion behavior.

## Workspace and pull-request workflow

- `ProjectConversationPage`: bounded split/stacked page composition connecting
  an application-owned project index to conversation and workspace setup.
- `ProjectIndex`: controlled project navigation with selected, available,
  loading, unavailable, error, search-toolbar, metadata, path, and empty
  states.
- `NewConversationStart`: centered new-chat composition with an independent
  destination, composer, context controls, and optional worktree prompt.
- `ConversationContextBar`: compact, controlled Project, environment, and
  worktree buttons with optional listbox/menu/dialog linkage, expansion,
  status, and disabled semantics.
- `ConversationProjectListbox`: linked project options with selected/disabled
  states, initial focus, arrow/Home/End navigation, Escape dismissal, and
  outside-pointer dismissal.
- `LocalEnvironmentDialog`: searchable, grouped local checkout/worktree
  selection with branch, metadata, repair/loading states, scrolling, and a
  host-owned create action.
- `ConversationRouteSelector`: keyboard-navigable radio-card selection for
  host-defined products that use one mutually exclusive route choice. It is
  protocol-neutral and is not the current Codex new-chat destination/context
  model.
- `WorktreeList`: controlled workspace list with branch/path identity,
  selected, creating, repairing, unavailable, error, item-action, and empty
  states.
- `WorkspaceSelection`: responsive project-context composition with controlled
  header, actions, field, footer, loading, ready, and error states.
- `ProjectPicker`: controlled project selection with paths, descriptions,
  availability, loading, repairing, disabled, and empty states.
- `RunLocationMenu`: radio-menu composition for local, cloud, worktree, or
  host-defined execution locations.
- `WorktreePicker`: controlled worktree and branch selection with availability
  and repair states.
- `PullRequestPage` and `PullRequestList`: responsive split or stacked PR
  workspace with toolbar, search/filter slots, selected route, status, check,
  author, update, comment, optional leading indicator, and independent empty
  states.
- `PullRequestDetails` and `PullRequestStatusBadge`: PR identity, branch,
  actions, change statistics, navigation, state, and host-owned content.
- `PullRequestPanelSummary`: current resizable-panel Summary composition with
  a level-one title, metadata, fact rows, Description and Checks regions,
  edit actions, a host-owned comment composer, and an optional integrated
  Timeline region.
- `PullRequestCheckList`, `PullRequestReviewSummary`, and
  `PullRequestReviewThread`: check progress, reviewer outcomes, inline file
  threads, resolved/outdated states, and host-owned review actions.
- `PullRequestQueryState`: accessible list/detail loading, refreshing, empty,
  and retryable failure presentation with reduced-motion-safe skeletons.
- `PullRequestMergeReadiness`: blocked, checking, conflicted, ready, merging,
  and merged presentation with explicit passed, pending, and failed
  requirements that do not rely on color alone.
- `PullRequestReviewComposer` and `PullRequestCommentComposer`: controlled,
  host-submitted review/comment forms with nonblank guards, submitting,
  success, and failure feedback. Request changes additionally requires review
  body content.

The workflow components do not fetch repositories, create worktrees, call
GitHub, or merge changes. Hosts normalize those states and perform every
privileged action.

## Composition rules

- Keep protocol objects in adapters; pass normalized props into UI components.
- Keep privileged actions explicit and host-owned.
- Import `codex-ui-kit/styles.css` once at the application boundary.
- Override public `--codex-ui-*` variables rather than targeting private element structure. Declare overrides on `:root` or the portal host when they must also affect overlays mounted outside the local component subtree.
- Use the controlled APIs when application state must survive remounts or coordinate across windows.
