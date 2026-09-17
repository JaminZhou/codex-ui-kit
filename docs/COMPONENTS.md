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
- `AgentMessage`: user, assistant, and system presentation with user-bubble geometry, edit activation, actions, running ARIA state, target highlighting, and a message-owned attachment slot outside the editable user bubble.
- `MessageAttachment`: sent image, file-card, and preview-unavailable
  presentation with an explicit host-owned open action and accessible label.
- `ThreadLoadingState` and `ThreadThinkingPlaceholder`: loading, reconnecting, and thinking states.
- `ThreadContextOptimization`: manual compaction, automatic compaction, and Work-mode conversation optimization in running and completed states.
- `ThreadInterruptionSummary`: current-build stop-result row with duration
  language and the measured trailing divider.
- `ThreadContextEvent`: current-build manual compaction composition, including
  the running `Working` divider and running/completed optimization row.
- `LoadingShimmer` and `ThreadSkeleton`: streaming-safe progress surfaces with reduced-motion fallbacks.
- `ThreadRenderError`: compact turn-level failure with a host-owned retry hook.

## Rich content

- `AgentMarkdown`: GFM rendering without raw HTML, streaming stabilization,
  semantic renderer overrides, viewport-aware lazy syntax highlighting, and
  current-style table actions. Tables copy their exact source Markdown plus
  rendered HTML by default; `onCopyTable` can transfer that protocol-neutral
  payload to a host. `allowWideTables` opts a host into the measured
  horizontal overhang, hover/focus Copy and Expand rail, and full-screen table
  preview. `allowWideMedia` enables media-only paragraph composition and
  `expandWideMedia` opts into the measured current-product overhang.
  `imageStatus` controls loading/ready/unavailable semantics,
  `imageSourceResolver` resolves the inline source, and
  `imagePreviewSourceResolver` can independently model a source-owned preview
  payload while preserving measured geometry, caption, zoom, and focus
  behavior. `stabilizeStreamingMarkdown` exposes the package's standalone
  streaming helper; `CodeHighlighter` is the public contract for supplying a
  custom escaped-code highlighter.
- `InlineCode`: standalone inline-code treatment.
- `CodeBlock`: language header, copy feedback, syntax highlighting, and wrapped or unwrapped states.
- `FileDiff`: structured context, hunk, metadata, addition, and deletion lines
  with optional wrapping, viewport modes, scroll-edge fades, and real unified
  or paired old/new split rendering. `fileDiffToText` converts the structured
  public line model into copyable plain text.

The built-in highlighter escapes untrusted code. A custom `CodeHighlighter` returning `html` is treated as trusted markup, so hosts must escape untrusted input before returning it.

## Agent activity

- `AgentActivity`: accessible expandable activity primitive.
- `ActivityTimeline`: controlled or uncontrolled turn-level disclosure with persistent and historical content slots; a disabled lock covers the timeline toggle.
- `TurnDuration`: working, completed, and user-stopped duration language. `formatTurnDuration` exposes the same protocol-neutral formatter.
- `AgentReasoning`: active and completed reasoning disclosure states with a
  disabled lock for the disclosure boundary.
- `AgentPlan`: structured pending, in-progress, and completed plan steps with a
  disabled lock for plan disclosure.
- `ProposedPlan`: writing and completed plan-card states with host-owned actions
  and a disabled lock for built-in copy, download, and disclosure controls.
- `SearchActivity`: code-search and grouped web-search states with controlled
  disclosure, bounded results, and a disabled lock for disclosure/result actions.
- `BrowserActivity`: running, completed, and failed Browser disclosures with
  ordered instruction, connection, and navigation steps; disabled locks keep
  disclosure and step actions host-controlled.
- `ConversationEventList` and `ConversationEvent`: protocol-neutral ordering,
  ownership (`turn` or `thread`), event-kind, progress, warning, failure, live
  status, metadata, content, and action slots for mixed session timelines.
- `SubagentActivity` and `SubagentActivityGroup`: delegated-work rows and compact grouped activity with a disabled lock for built-in opening actions.
- `SubagentSummary`: controlled working/done summary with agent metadata and diff statistics; disabled locks disclosure, overflow, and agent-opening actions.
- `SubagentPanel`: active and completed agent sections with pagination and
  selection hooks plus a disabled lock for selection and pagination. Summary
  avatars and rows can use host-provided protocol timestamps to keep active work
  ahead of completed work and newer agents ahead of older peers.
- `SubagentTranscriptHeader` and `SubagentAvatar`: nested transcript navigation
  (with a disabled back-action lock) and asset-free agent identity.

The protocol-backed playground composes these primitives in Replay and Live
for current single-agent, concurrent-sibling, and nested-delegation success
paths: active and grouped timelines, populated thread summaries, mixed
active/done side-panel lists, independent transcript/back navigation, and
responsive wide/820px/720px panel continuity. Nested public `agentPath`
identity remains available to the host while the observed current panel stays
flat. Live duration uses host-reduced protocol timestamps instead of replay
constants. Hosts still own protocol reduction, topology policy,
failure/cancellation policy, pagination, and transcript streaming.

## Tools, approvals, and status

- `McpToolCallGroup`: expandable integration-owned group for ordered MCP calls
  with running, recovered, and failed labels plus legacy `details` or current
  content-button disclosure and a disabled lock.
- `ToolCallCard`: generic MCP, connector, and arbitrary tool-call row with
  structured, empty, danger-alert, neutral language/output-error, host-owned
  raw-output states, an independently localizable failed-state accessible name,
  and legacy `details` or current content-width overlay-button disclosure. A
  disabled lock covers disclosure and raw-output actions.
- `CommandExecution`: expandable command surface with duration, copy,
  optional `Shell`/host-defined shell label, background-terminal, success,
  failure, and interruption states. Completed expanded summaries preserve the
  command identity. A disabled lock covers disclosure, command copy, and the
  internal output surface. `formatCommandDuration` exposes the standalone
  duration formatter.
- `CommandOutput`: labeled stdout/stderr with no-output, 144px bounded
  reverse-tail following, overflow, fade, collapse/reopen restoration, and
  copy behavior with an explicit disabled lock. The current failure/recovery acceptance preserves a mixed
  160-record transcript, `Exit code 7`, exact copy output, and a successful
  later turn without treating command failure as thread failure.
- `FileChange`: one-file create, apply, stop, reject, delete, and rename activities with disclosure, statistics, path opening, and copy hooks. A disabled lock covers disclosure, file-open, and diff-copy actions.
- `FileChangeGroup`: one protocol item's aggregate changed-files card with group status/actions, independent file rows, statistics, rename paths, and host-owned file opening. Its disabled lock covers changed-file opening.
- `FileReview`: a scrollable workspace composition that stacks every changed
  file with an independent header, statistics, focusable text/binary/conflict
  content, optional controlled file selection, and a selected-file marker.
  Existing `lines` items remain supported; `FileReviewContent` makes non-text
  states explicit, `FileReviewNotice` can also be composed independently, and
  a disabled lock suppresses file selection.
- `FileReviewWorkspace`: the current Review toolbar/body/tree composition with
  controlled or uncontrolled six-way scope selection, aggregate statistics,
  filtering, collapse/expand, jump selection, unified/split presentation,
  changed-files visibility, Git-action hooks, host-supplied exact icons, and a
  disabled lock covering review controls, file selection, and Git actions.
- `FileRevertErrorDialog`: controlled current-style Undo failure dialog with
  replaceable title, description, and close icon; file mutation and recovery
  policy remain host-owned.
- `ApprovalRequest`: command, patch, network, permission, and generic approval
  card with scoped actions, shortcuts, loading, outcome states, and default or
  current Composer-dock presentation. A disabled lock covers decision buttons,
  scoped approval menus, and approval hotkeys.
- `ApprovalFilePreview`: path and additions/deletions preview for file-edit
  approval cards; filesystem decisions and mutations remain host-owned.
- `AutomaticApprovalReview`: in-progress, approved, denied, high-risk denied,
  timed-out, and aborted reviewer-agent status with action, rationale, and
  accessible terminal semantics. It reports protocol state only; it never
  performs or bypasses an approval.
- `ApprovalCommandPreview`: bounded command preview with explicit expansion
  controls and a disabled lock for the collapse/expand action.
- `StatusBanner`: neutral, info, warning, and error shell with actions,
  dismissal, compact reflow, and a disabled lock for built-in actions.
- `InlineNotice`: transcript divider with tone, guidance, wrapping, and active shimmer.
- `StreamNotice`: reconnecting, server-busy, failed, retry, progress, and
  additional-detail states with a disabled lock for details/retry controls.
- `StatusIndicator`: compact pending, running, completed, warning, and failed state primitive.

All privileged behavior remains host-owned. The components never auto-approve commands, file changes, network access, or permissions.

## Composer

- `AgentComposer`: controlled autosizing input with automatic, single-line, and multiline layouts; text or explicitly host-enabled attachment-only submit/stop behavior; focus transfer; and protocol-neutral slots. `allowAttachmentOnlySubmit` confirms that the host has sendable attachment state instead of inferring it from an opaque React subtree. `allowSubmitWhileRunning` lets Enter route a follow-up to a host-owned queue while Stop remains the visible primary action. `submitDisabled` keeps only the submit affordance unavailable while host-owned attachment upload or recovery controls remain interactive.
- `ComposerDock`: current-build composition that keeps context controls,
  external queue state, and the input card in distinct ownership slots.
- `ComposerContextBar` and `ComposerContextControl`: accessible project,
  environment, branch, or host-defined context controls above the Composer.
- `ComposerAttachment`: pill, default card/image layouts, and the explicit
  current-build compact 52.5px file-card / 54px image scale with ready,
  bounded upload-progress, upload-error,
  preview-error, retry, open, and remove states.
- `ComposerMentionMenu`: grouped file, skill, app, agent, or custom mentions with loading, empty, disabled, active, and keyboard-selection states.
- `ComposerModeIndicator`: Plan, Goal, Review, or host-defined footer mode with a clear affordance.
- `QueuedPromptList`: reorderable queued follow-ups with queued, editing, paused, interrupted, retry, steer, delete, resume, and queue-toggle behavior.

## Interactive primitives

- `Button` and `IconButton`: primary, secondary, outline, ghost, danger, pressed, loading, disabled, toolbar, and size states.
- `Dialog` and `DialogChoice`: controlled modal presentation with compact, standard, and wide sizes; focus trapping/restoration; an optional `returnFocusRef` for launchers that unmount before the modal commits; scroll locking; Escape/backdrop dismissal; and descriptive choice rows.
- `Tooltip`: delayed pointer and immediate keyboard disclosure with shortcut, side, alignment, and collision support.
- `Popover`: portalled dialog, menu, or listbox positioning with outside dismissal, focus restoration, and viewport collision handling.
- `Menu`, `MenuItem`, `MenuCheckboxItem`, `MenuSubmenu`, `MenuSectionLabel`, and `MenuSeparator`: keyboard navigation, labelled sections, separators, checked states, nested portals, shortcuts, descriptions, destructive actions, and opt-in `initialFocus="none"` when the host must retain trigger focus.
- `Select`: controlled listbox selection with descriptions, icons, disabled options, selected state, and empty fallback.

## Resources and media

- `DocumentPreviewPanel`: protocol-neutral PDF, document, notebook, spreadsheet,
  and presentation preview shell with ready, loading, empty, and error states;
  hosts provide the renderer and own file loading while retry/open callbacks
  remain explicit. A disabled lock covers open and retry actions.
- `CitationMention`: inline external citation with optional favicon or supplied icon, deterministic new-tab security defaults, and the current `data-inline-mention-interactive` host hook.
- `ResourceCard` and `ResourceList`: file, website, Drive, app, and image resources with previews, metadata, optional labelled opening actions, trailing actions, and progressive reveal. Cards without `href` or `onOpen` remain static content; resource-list reveal has a disabled lock.
- `SourceList`: compact file, web, tool, and external citation summaries with
  metadata, optional labelled opening actions, expansion, and controlled
  loading/empty/error/retry states. Sources without `href` or `onOpen` remain
  static rows; disabled locks cover expansion, retry, and item opening.
- `SourceActivityList` and `SourceSearchActivity`: Sources-workspace activity
  composition with optional leading identity, controlled or uncontrolled
  disclosure, exact search counts, host-supplied query rows, and a disabled
  expansion lock.
- `ArtifactList`: resource-list composition with explicit empty, loading, and
  retryable error states; a disabled lock covers retry and reveal while the
  host owns artifact discovery and file loading.
- `GeneratedImageGallery`: one-to-four-slot natural or square image geometry, pending placeholders, retry/error handling, overflow paging, and reduced-motion support. Images become focusable actions only when `onOpenImage` is provided; a disabled lock covers image opening and paging.
- `ImagePreviewDialog`: portalled lightbox with focus trapping/restoration, Escape and arrow navigation, download, backdrop dismissal, and previous/next controls. A disabled lock covers image actions, navigation, and zoom while close/Escape remain host-owned escape hatches.

## Navigation and shell

- `AppWindowChrome`: 46px application-owned window navigation with
  traffic-light-safe Sidebar, Back, and Forward controls plus host-owned title
  and trailing slots. A host-wide disabled lock covers the navigation actions;
  hosts retain history, routing, and native-window behavior.
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
  replacement. A disabled lock keeps queued action and dismissal callbacks
  host-controlled while preserving the live region.
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
  960/720px layout transitions and restore only surfaces that it closed.
  `responsiveSidebarContinuity` can independently keep the sidebar visible
  while retaining side-panel continuity; when omitted it follows
  `responsivePanelContinuity`. Disabling continuity or changing
  `responsivePanelContinuityKey` resets the matching restoration intent for a
  new route or workspace. Controlled-host callbacks must acknowledge the
  requested state before the surface becomes eligible for later restoration.
  `narrowSidebarBehavior="current-build"` lets a visible sidebar keep its
  clamped persistent track at narrow widths without reintroducing the removed
  edge-hover preview.
- `AppSidebar`, `AppSidebarSection`, `AppSidebarProjectGroup`,
  `AppSidebarItem`, and `AppSidebarFooter`: grouped primary navigation with
  one selected route, reusable expandable project/task groups,
  heading-preserving collapsible collections, lifecycle status, measured
  action columns, and an in-flow footer slot that cannot cover navigation.
  Section, project-group, and bounded-collection controls accept a host-wide
  disabled lock for route transitions; row-level action slots remain
  host-owned.
  `AppSidebarFooter.renderAccountTrigger` lets a host wrap the component-owned
  account button in one `Menu` or other overlay element without duplicating its
  markup or shrinking the flexible account hit area.
  A titleless section remains expanded because it has no operable toggle;
  chevron and action visibility transitions respect reduced motion.
- `WorkspacePanel`: controlled side or bottom tab shell with labelled tab
  semantics, host action slots, close/open/expand hooks and labels, focusable
  content, an optional host-supplied exact close icon, and host-owned tab
  contents.
- `TerminalTranscript`, `TerminalPrompt`, and `TerminalSession`: terminal
  output, controlled input, and process-status composition with typed output
  rows, polite follow output, named log/input regions, and explicit
  host-owned submission. `TerminalPanel` adds controlled multi-session tabs,
  per-tab close, create/restore hooks, independent values, and running,
  failed, restoring, idle, or exited status. Tab names expose that status to
  assistive technology and use distinct visible symbols rather than color
  alone unless a host opts into the current product's plain local-terminal
  labels. `TerminalWorkspaceMismatchNotice` composes the current worktree
  mismatch message plus host-owned dismiss/open-new-terminal actions.
  `TerminalProcessList` presents host-supplied background-process
  summaries and reopen requests. None of these components starts a shell,
  owns process persistence, or executes input.
- `ThreadHeader`: draggable desktop header with truncating identity, navigation, and independently aligned action slots.
- `ThreadOverflowMenu` and `ThreadOverflowMenuOption`: controlled current
  thread actions composition with the observed ten-action grouping, three
  separators, shortcuts, host-supplied icons and Copy/Fork/Open-in submenus.
  Pin, rename, archive, share, side-chat, scheduling, and external-open effects
  remain host-owned callbacks.
- `ThreadSummaryPopover`, `ThreadSummaryPanel`, `ThreadSummarySection`,
  `ThreadSummaryItem`, `ThreadSummaryDelta`, and
  `ThreadSummaryIconButton`: controlled or uncontrolled thread-summary overlay
  composition with current Environment/Git rows, compact metadata, disabled
  actions, section collapse, outside dismissal, Escape focus return, and
  viewport-clamped 300px geometry. Host code owns every environment, branch,
  commit, and pull-request mutation.
- `ThreadNavigationControls`: sidebar and optional Back/Forward toolbar controls with shortcuts, disabled states, and transient-navigation hover hooks. A host-wide disabled lock covers all navigation controls.
- `ThreadMessageNavigationRail`: message overview with a current-build default
  threshold of ten user messages, active markers, keyboard and pointer
  previews, click navigation, pointer scrubbing, regular or compact row
  density, optional initial end positioning for long histories, and a
  host-controlled disabled lock.
- `FloatingThreadPanel`: non-modal, inert-when-closed panel with host-controlled contents and inset.
- `ThreadFloatingButton`: latest-message control with chevron, working dots,
  hidden-interaction removal, reduced-motion behavior, and a host-controlled
  disabled lock.

## Settings

- `SettingsShell`: full-page application Settings composition with an
  independent navigation landmark, Back action, controlled search, grouped
  sections, selected-page state, exact host-supplied icon slots, loading,
  empty, and error states, with `aria-busy` and host-configurable loading copy,
  and a separately labelled main landmark. Search terms and result descriptions
  remain host data so the component does not own product routes or private
  preferences.
- `GitSettingsPage`: controlled Branch prefix, Merge/Squash, force-push,
  draft-PR, review-delivery, commit-instruction, and pull-request-instruction
  presentation. Saving feedback, retry copy, and busy-state locking are
  host-controlled; hosts still own persistence, validation, save failures, Git
  mutation, and dirty-state decisions.
- `AppearanceSettingsPage`: controlled System/Light/Dark selection, responsive
  previews, Light/Dark theme editors, code-theme menus, contrast ranges, and
  the complete Preferences card. Loading, saving, saved, and error feedback,
  retry copy, and busy-state locking are host-controlled. Hosts own
  persistence, file import, copy behavior, and optional Dock icon nodes; no
  proprietary Dock artwork is bundled by the component.
- `GeneralSettingsPage`: controlled Permissions, General, Composer, Popout
  Window, and Notifications cards with host-supplied file destinations,
  searchable languages, menus, switches, keyboard-operable segmented choices,
  and shortcut-capture state. Loading, saving, saved, and error feedback,
  retry copy, and busy-state locking are host-controlled. Hosts own
  persistence, file opening, license presentation, global shortcut
  registration, and notification delivery; observed playground values are
  fixtures rather than declared defaults.
- `UsageSettingsPage`: controlled plan, credits, usage-limit meters, reset,
  and cancellation presentation with independent host callbacks for View
  plans, Buy credits, and Gift credits. Loading, saving, saved, and error
  feedback, retry copy, and busy-state locking are host-controlled. Hosts own
  account data, billing, checkout, gifting, and cancellation effects.
- `PlanSelectionPage`: full-height Personal/Business plan composition with
  controlled audience, 5x/20x or annual/monthly per-card selectors,
  responsive cards, a host-owned Back transition, supplied pricing/features,
  and host-owned plan actions. Loading, saving, saved, and error feedback,
  retry copy, and busy-state locking are host-controlled. It does not load an
  embedded webview or perform a purchase.

## Integration catalogs

- `IntegrationCatalogTabs`: controlled Plugins/Skills tablist with a
  host-owned route transition.
- `IntegrationCatalogPage`: controlled catalog shell for search, scopes,
  sections, installed icon rows, public cards, loading, error, and unavailable
  states. Item actions expose pending/success/error/retry feedback and lock
  their row while a host-owned operation is in flight. Page-level busy and
  disabled states lock search, scopes, navigation, and catalog actions while
  retry remains explicit. Hosts supply catalog data, exact third-party artwork,
  installation state, search persistence, discovery, permission checks, and
  every privileged action. The component does not fetch or install
  integrations.
- `PluginDetailBreadcrumb`: controlled Plugins-to-detail breadcrumb with a
  host-owned Back transition.
- `PluginDetailPage`: responsive installed/discovery detail shell with
  host-supplied artwork and hero backdrop, prompt suggestions, app rows,
  information links, privacy disclosure, controlled install progress/error/
  retry state, per-app connecting/disconnecting/error/retry state, and
  controlled actions, uninstall, reconnect, and disconnect menus. A host-wide
  disabled lock covers navigation, suggestions, app rows, and primary actions.
  The component emits callbacks only; hosts own clipboard, navigation,
  installation, connection, permission, OAuth, and persistence effects.
- `PluginManagerTabs`: controlled Plugins/Apps/MCPs/Skills/Marketplace tablist
  with count badges and host-owned route changes.
- `IntegrationAddMenu`: controlled Create plugin, Add a marketplace, Add MCP
  server, and Record a skill menu with outside-pointer and Escape dismissal.
- `McpServersPage`: responsive MCP manager shell with wide-only search,
  standalone and plugin-provided server groups, controlled enable switches,
  per-server enabling/disabling/error/retry states, Settings callbacks,
  empty/loading/error states, and an editor slot that preserves the manager
  header and tabs. Page-level busy/disabled states lock category tabs, search,
  directory/add actions, settings, and switches while retry remains explicit.
- `McpServerEditor`: controlled STDIO or Streamable HTTP create/update form
  with list and key/value editors, type selection, saving/error/retry states,
  disabled-save state, documentation, Back, and optional Uninstall callbacks.
  Hosts own persisted configuration, validation, credentials, OAuth, transport,
  and destructive effects.

## Workspace and pull-request workflow

- `ProjectConversationPage`: bounded split/stacked page composition connecting
  an application-owned project index to conversation and workspace setup.
- `ProjectIndex`: controlled project navigation with selected, available,
  loading, unavailable, error, search-toolbar, metadata, path, and empty
  states. Page-level loading/error/disabled locks cover sorting, project
  selection, expansion, and recent-chat opening while partial-error data stays
  selectable for recovery-oriented hosts.
- `NewConversationStart`: centered new-chat composition with an independent
  destination, composer, context controls, and optional worktree prompt.
- `ConversationContextBar`: compact, controlled project, run-location,
  environment, starting-state, and worktree buttons with optional
  listbox/menu/dialog linkage, per-item accessible-label overrides,
  expansion, status, and disabled semantics.
- `ConversationProjectListbox`: linked project options with selected/disabled
  states, initial focus, arrow/Home/End navigation, Escape dismissal, and
  outside-pointer dismissal. A host-wide disabled lock covers option
  selection and keyboard focus while dismissal remains available. `selectedIcon`
  lets a host supply its observed selection primitive while the listbox
  continues to own option semantics and focus behavior.
- `LocalEnvironmentDialog`: searchable, grouped local checkout/worktree
  selection with branch, metadata, repair/loading states, scrolling, and a
  host-owned create action. A disabled lock covers search and environment
  selection without taking ownership of the host-provided footer action.
- `BranchCreationDialog`: current compact branch-name modal with an optional
  Git-prefix action, empty/creating/error states, host-owned validation and
  mutation, focus containment on the modal surface while creating, dismissal
  blocking while creating, and launcher focus return.
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

## Additional public contracts

The following exports are intentionally listed separately because they are
small, route-specific, or host-integration helpers. They follow the same
boundary: values are controlled by the host, callbacks emit intent, and the
kit never performs filesystem, network, account, or process mutations.

### Shell, recovery, and workspace helpers

- `AppServerCrashRecovery`: fatal App Server child-exit surface with a
  host-supplied title, explanation, actions, and `onAction` callback. The
  default restart action is only a label; restarting the client is host-owned.
- `AppSidebarCollection` and `AppSidebarCollectionState`: reusable grouped
  sidebar collections and loading/empty/error state rows. `items`, `status`,
  `onRetry`, and action slots are controlled; the collection does not fetch or
  persist history. Its disabled lock covers the bounded Show more transition.
- `BrowserWorkspacePanel`: controlled browser-tab shell with active tab,
  close/open/expand callbacks, toolbar slots, and host-owned page content.
  A host-wide disabled lock covers tab and toolbar actions. It does not
  navigate, authenticate, download, or execute page scripts.
- `ThreadSummaryDock`: docked variant of the thread-summary surface with
  controlled open state, labels, and close/focus callbacks; environment, Git,
  and pull-request values remain host data.
- `SystemErrorNotice` and `WorkingDirectoryNotice`: compact error and missing
  working-directory notices with explicit retry/open-new-worktree actions.
  They never inspect paths or repair a checkout themselves.
- `TerminalReloadNotice`: terminal-crash/reload copy with an explicit reload
  callback and optional detail. Reloading or recreating a process belongs to
  the host.

### Composer and content helpers

- `ComposerEditor`: contenteditable editor shell with accessible multiline
  textbox semantics, an optional placeholder, and a forwarded focus ref for
  host-owned rich content. A disabled lock makes the editor non-editable and
  suppresses host editing callbacks. Hosts own serialization, selection,
  keyboard behavior, and submission; inline tokens can be composed as
  non-editable children.
- `ComposerPermissionMenu`: controlled Ask/Approve/Full (or host-defined)
  permission choices with checked state, descriptions, and `onChange`.
  Approval policy and persistence remain host-owned.
- `ComposerPlanProgress`: pending, active, completed, and failed plan-step
  progress with controlled steps and an optional `onDismiss`/action slot. A
  disabled lock keeps hover, focus, and disclosure changes host-controlled. It
  renders protocol state and does not run a plan.
- `ComposerResourcePicker`: searchable, grouped resource picker with loading,
  empty, disabled, selected, footer, keyboard-dismissal, and `onSelect`/
  `onClose` callbacks. Hosts own attachment, plugin, and skill effects.
- `ComposerResourceMention`: a non-editable inline resource token for a
  contenteditable Composer editor. It accepts host-supplied label/artwork and
  forwards span attributes; it is intentionally separate from
  `ComposerAttachment`, so selecting a resource can remain an inline mention
  without implying upload, persistence, authorization, or execution.
- `MarkdownImage`: protocol-neutral image renderer with ready/loading/error
  status, source resolver, alt text, preview and retry callbacks. It never
  fetches or decodes a remote URL on behalf of the host.
- `McpToolIcon`: deterministic, replaceable MCP/tool identity glyph. The host
  supplies the semantic label and may replace the icon; it has no tool-call
  side effects.
- `NewConversationPromptGrid`: controlled starter-prompt grid with prompt
  values, disabled state, and `onSelect`. Submitting a prompt is host-owned.
- `SubagentPanelIcon`: asset-free identity icon for delegated-agent panels;
  the host supplies accessible labels and protocol metadata.

### Settings, environment, and account surfaces

- `CodeReviewSettingsPage`: controlled review-trigger policy, credits option,
  loading/error/retry state with `aria-busy` and host-configurable copy, and
  `onChange`/`onRetry` callbacks. It never starts a review or changes account
  limits.
- `EnvironmentSettingsPage`: controlled environment list with ready/loading/
  error/empty states, `aria-busy`, host-configurable loading copy, and
  host-owned Retry/edit callbacks. Disabled states keep retry explicit while
  registry, credentials, and provisioning stay in the host.
- `EnvironmentEditorPage`: Setup/Cleanup/Actions tabs with controlled name,
  script, action rows, dirty state, Save/Discard, and conflict/error Retry
  callbacks. Saving or a host-wide disabled state exposes busy feedback and
  locks mutable controls while preserving host-owned retry/discard actions. It
  is an editor contract, not a remote environment client.
- `HooksSettingsPage`: controlled hook groups, trust/managed/changed states,
  config-open and reload callbacks, refresh busy state, and explicit error
  recovery with host-configurable copy. Refreshing locks mutable hook actions;
  it does not read or write hook files.
- `KeyboardShortcutsPage`: searchable, grouped shortcut catalogue with
  controlled capture/edit/clear/cancel state and `onShortcutChange`.
  Loading, saving, saved, and error feedback, retry copy, and busy-state
  locking are host-controlled. Native registration and persistence remain
  host-owned.
- `PersonalizationSettingsPage`: controlled custom instructions, Memory
  controls, warning, and Personality choice with save/reset callbacks. Save
  lifecycle feedback, retry copy, and busy-state locking are host-controlled;
  it does not access account memory or profile services.
- `VoiceSettingsPage`: controlled microphone, voice, screen-context,
  dictionary, and recording states with host callbacks. Loading, saving,
  saved, and error feedback, retry copy, and busy-state locking are
  host-controlled. Audio capture and permissions remain outside the package.
- `WorktreeSettingsPage`: controlled managed-worktree preferences and project
  groups with Refresh/Delete/New-chat callbacks. Loading, saving, saved, and
  error feedback, retry copy, and busy-state locking are host-controlled. It
  never deletes a directory or changes Git state itself.
- `WorktreeSetupStatus`: created/creating/failed setup phases, ordered steps,
  sanitized log, and Retry/Cancel/Edit-environment actions. The host owns
  checkout, filesystem, and retry effects.
- `LoginPage`: ready/loading/error login shell with provider list, API-key and
  device-code modes, browser-pending state, and host callbacks. Credentials,
  browser navigation, and account persistence are never handled by the kit.
- `RemoteConnectionsPage`: device/SSH rows with connected/connecting/
  disconnected/error status plus Add/Edit/Forget/Test/Retry and a controlled
  connection form with saving/error/retry feedback and busy-field locking.
  Loading and host-wide disabled states lock page and form actions while retry
  remains explicit. Credentials, pairing, Noise relay, SSH exchange, and
  registry writes remain host-owned.

### Integrations, automations, and previews

- `ScheduledTasksPage`, `ScheduledTaskNavigator`, `ScheduledTaskFilterTabs`,
  and `ScheduledTaskCreateMenu`: controlled automation index, filters, search,
  suggestions, create choices, loading/error/unavailable states, and intent
  callbacks. Page and navigator disabled states lock search, filters, row
  navigation, toggles, and suggestion actions while retry stays explicit. They
  do not schedule or execute work.
- `ScheduledTaskEditor` and `ScheduledTaskDetail`: controlled task name,
  prompt, frequency/detail fields, facts, saving/updating/running/error/retry
  state, busy action locking, and Create/Save/Edit/Pause/Resume/Run callbacks.
  Persistence, permissions, delivery, and cloud execution belong to the host.
- `SitesIndexPage`: controlled site search/index with ready/loading/empty/
  unavailable/error states and Create/Open/Share/Refresh/Overflow callbacks.
  Page-level busy/disabled states lock search and all site actions while retry
  remains explicit. It does not call a Sites service or open external pages.
- `SkillDetailDialog` and `SkillPromptMention`: controlled skill detail,
  enabled state, action menu, long instructions, unsent Try-now prompt, and
  updating/error/retry lifecycle. A host-wide disabled lock covers modal
  actions while the host coordinates persistence. Installation, execution, and
  prompt submission are host-owned.
- `PdfPreviewPanel`: controlled PDF page/zoom/annotation/expand state with
  page navigation, Open/Retry/Close callbacks, and an explicit renderer slot.
  A disabled lock covers paging, zoom, annotation, download, open, and retry;
  PDF decoding and file access remain host-owned.
- `MenuLinkItem`: accessible menu item that renders a host-provided link or
  callback while preserving menu focus semantics; navigation is not inferred.
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
