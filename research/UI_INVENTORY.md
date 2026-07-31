# Current UI inventory

This seed inventory replaces the previous assumption that a green conversation
matrix implied product-level parity. The machine-readable source of truth is
[`ui-inventory.json`](ui-inventory.json), and the missing runtime evidence is
collected with [`RUNTIME_CAPTURE.md`](RUNTIME_CAPTURE.md).

## Classification rule

A surface is classified by who owns its state and lifecycle, not by where it
appears on screen:

| Ownership | Definition |
| --- | --- |
| `turn` | Persisted with one user or assistant turn. |
| `thread` | Belongs to a conversation but not a single turn. |
| `workspace` | Belongs to the active project, repository, or worktree. |
| `app` | Survives thread changes or manages multiple threads/workspaces. |
| `cross-layer` | Portalled, modal, or window-level UI whose owner depends on its trigger. |

An approval shown inside a tool event can therefore be turn-owned, while a
global permission dialog is cross-layer. A diff triggered by a message becomes
workspace-owned when it opens as an independent panel.

## Evidence ladder

The inventory deliberately has no `Complete` status.

1. `package_observed`: a named route, page, panel, or feature family is present
   in the sampled installation package.
2. `runtime_observed`: the surface was reached in the running application and
   its trigger, container, and visible states were recorded. Each evidence
   prefix maps to the exact observed build in `ui-inventory.json`.
3. `implemented`: an independent public API and composition exist in this
   repository.
4. `browser_verified`: the H5 acceptance flow matches the recorded behavior.
5. `electron_verified`: the Electron acceptance flow matches the recorded
   behavior and geometry.

Static package evidence establishes candidates, not runtime reachability.
Likewise, an implemented primitive is not evidence that every product
composition or state variant is covered. Current-build verification requires
at least one runtime evidence record mapped to the current baseline; an
observation from a previous build remains historical evidence.

## Current baseline

- Codex Desktop `26.727.40816` (`6067`)
- Package sampled and reverified on 2026-07-31
- `app.asar` SHA-256:
  `0e4f824024d0838dd7548751c02d3a7d21917c4fc3edf74c9e98d88ea9e3127d`
- Computer Use automation: blocked by the environment safety policy for
  `com.openai.codex`
- Scoped CDP automation: available through a user-authorized second process;
  the Chromium profile is separate, but Codex application data and navigation
  are not fully isolated
- Fresh current-build Renderer capture: recorded for the dark 1180×820 main
  application target, the six left-sidebar groups, 46px window navigation,
  Pull requests loading/selection continuity, the New chat Composer/context
  row and project picker, the read-only project-named Terminal tab, and public
  PR Summary/Code with integrated Timeline and responsive detail restoration;
  successful Code content, successful and recovered OpenAI Developer Docs
  calls, and the current Composer queue/Stop automatic-continuation lifecycle
  are observed, while mutating review/comment/merge,
  light-theme, global notifications, current-build long-thread
  virtualization, and unrelated surface evidence remain pending

Current inventory: 75 surface groups; 25 have current-build runtime evidence,
31 have previous-build-only runtime evidence, 19 remain `not_sampled`, and 0
are `blocked_by_policy`. Current-build Browser verification covers 21 groups
and Electron verification covers 21. Prior acceptance outside the sampled
shell, sidebar, New chat, and Pull request slices remains recorded as
`partial_legacy` until current-build re-observation.

The current package exposes candidates far beyond the old transcript sample:
application and thread shells, local/remote conversation routes, projects and
workspace selection, PR review, editor diff, terminal, browser and artifact
panels, document previews, settings, MCP, plugins, skills, automations, remote
connections, and feature-gated surfaces.

The previous-build CDP probe confirms loopback access, distinguishes the main
application-shell target from a second small application page, reaches the
new-chat destination/context setup plus the Project and Local environment
dialogs, and now revalidates the Pull requests index plus an aggregate
multi-file change/Review flow. It also measures the application-navigation
resize handle and its 240–520px range, the independent Review-panel resize
track, and one public PR's Summary, Timeline, and Code views. The broader
queue, Sources, Sites, Scheduled tasks, Plugins, Skills,
and Settings samples were recorded on `26.715.72359`. Those entries remain
`runtime_observed` with build-scoped evidence, but none satisfy the
`26.727.40816` verification gate until reached again. The seed list is not an
exhaustive denominator: newly observed routes, variants, and cross-layer
transitions must add or split IDs.

## Priority

### P0: establish the real product skeleton

- Application shell, projects index, new-thread and workspace selection.
- Left sidebar shell, primary routes, project navigation, thread history,
  item actions/status, and footer/account/settings behavior.
- Local, remote, and ChatGPT conversation routing.
- Thread shell, virtualized timeline, composer, queue, panel system, summary,
  navigation, approvals, interruption/recovery, and worktree transitions.
- Workspace diff, terminal, PR route/review, and cross-layer overlays.
- Narrow-window sidebar/panel behavior, including an explicit rule that avoids
  placing the right workspace panel outside the visible viewport.

### P1: make coding workflows complete

- Browser and artifact panels, document previews, environments.
- Settings shell, Git/hooks/review preferences.
- MCP, plugins, skills, and automations.

### P2: confirm scope before implementing

- Quick/hotkey windows, voice and dictation, subscription surfaces.
- Remote/mobile controls and OAuth flows.
- App-generation, device, pet, and avatar candidates that may be packaged but
  not part of the intended Codex reproduction scope.

## Delivery order

1. Collect allowed runtime evidence and split every candidate into concrete
   states and transitions.
2. Implement P0 compositions and their data contracts.
3. Add P1 workspace and integration flows.
4. Decide the P2 scope from runtime reachability and product intent.
5. Only after coverage stabilizes, perform the final H5 and Electron visual
   unification pass.

H5 and Electron remain acceptance surfaces throughout implementation, but
polish is intentionally last so component and layout churn does not invalidate
finished visual work.

The complete workstream order, sidebar acceptance matrix, exit gates, and
planned PR sequence are defined in [`DELIVERY_PLAN.md`](DELIVERY_PLAN.md).

## Current implementation slice

The implementation history below names the exact observed build. Acceptance
that previously matched `26.721.81911` or earlier remains regression coverage,
but every
affected inventory row is now `partial_legacy` until it is re-observed on
`26.727.40816`.

The current sidebar slice re-observes all six application-sidebar groups on
`26.727.40816`. It independently implements the 274px shell, 46px
traffic-light-safe titlebar inset, 70px header, 30px rows, collapsible
Projects/Pinned/Recents sections, dense thread status/action rows, and fixed
46px account/settings footer. The normal H5 and Electron composition now uses
the current 960px right-panel coordination boundary and 720px sidebar collapse
boundary. A closed narrow sidebar exposes the observed 12px edge preview;
clicking Show sidebar pins the regular 274px column and leaves the remaining
main width in flow. The reusable `AppShell` retains its focus-managed modal
mode as an explicit fallback rather than describing it as the current Codex
behavior. Deterministic capture mode remains explicitly wide so regional
pixel fixtures do not disable the real responsive contract. Implementation
stays `partial` because light-theme runtime evidence, native current-app
resize, dynamic right-panel sizing, and broader route coverage remain
separate work.

The application-shell continuity slice splits window navigation, route
lifecycle feedback, route selection/restoration, and global notifications
into independently owned inventory rows. Current-build CDP records the 46px
chrome, Sidebar/Back/Forward controls, Pull requests loading status, and
detail auto-hide/reopen through 1180, 960, 820, and 720px. The broader
961/960, 721/720, 1920×1080, 2560×1440, first-use-dialog, and hard-reload
results remain build-scoped evidence from `26.721.81911`.

The public `AppWindowChrome`, `AppRouteOutlet`, and `AppNotificationRegion`
contracts cover host-owned navigation, ready/loading/empty/error/offline/
reconnecting/stale outlet states, and portalled global feedback. Browser CDP
passes the shared 36-frame matrix. Real Electron acceptance drives offline → retry →
loading → ready → restored notification and the native 1180×820 → 720×680 →
1180×820 responsive transition while preserving the selected route and
restoring only auto-collapsed surfaces. Four deterministic App shell pixel
frames pass. The 3.93% 120×46 window-chrome comparison is retained as a
`26.721.81911` regression result. Offline/error/reconnecting/stale and global
notification runtime evidence is still missing, so the implementation remains
`partial`. Its independent Browser/Electron regression tests do not promote
`cross-layer.global-notifications` to current-build parity.

The first P0 shell slice provides independently implemented `AppShell`,
`AppSidebar`, and `WorkspacePanel` compositions. It covers the measured wide
sidebar/side-panel/bottom-panel tracks, controlled landmarks and tab semantics,
an accessible 16px pointer/keyboard navigation resizer with the
`26.721.41059` 240–520px clamps, and container-responsive overlay transitions
that keep the right panel inside medium and narrow viewports.

The next workflow slice adds `ConversationEventList` and `ConversationEvent`
for explicit turn/thread ownership and event kinds; `WorkspaceSelection`,
`ProjectPicker`, `RunLocationMenu`, and `WorktreePicker` for session context;
and PR list, detail, check, reviewer, and inline-thread compositions. The H5
showcase exercises the same public package exports.

The workflow slice also runs in the secure Electron playground's real
`BrowserWindow`. Automated acceptance clicks all three portalled selectors,
selects a PR, and checks event/live-region semantics, list/detail geometry, and
horizontal overflow at 1180×820 dark and 820×680 light. The PR layout is split
at the standard size and stacked at the compact size.

The project-entry slice adds `ProjectConversationPage`, `ProjectIndex`,
`ConversationRouteSelector`, and `WorktreeList`. `ConversationRouteSelector`
remains a protocol-neutral host composition for products that genuinely use a
single route choice; it is no longer treated as the current Codex new-chat
model.

The `26.721.41059`-backed new-chat slice adds `NewConversationStart`,
`ConversationContextBar`, `ConversationProjectListbox`, and
`LocalEnvironmentDialog`. It keeps the
application-owned ChatGPT destination independent from project, execution
environment, and worktree controls, and represents the local environment
picker as a searchable, grouped, scrollable dialog. The H5 flow activates the
worktree prompt before verifying both Environment and Worktree trigger/dialog
relationships, modal semantics, and initial focus. The Electron acceptance
flow asserts the prompt-to-context transition, opens the linked project
listbox from its context control, selects a project, opens the dialog from both
remaining controls, checks grouping, search filtering, and repair-state
disabling, selects a local environment, submits the real composer, and captures
both wide and compact dialog screenshots.

The current `conversation.context-controls`,
`conversation.project-picker`, and
`app.new-thread-workspace-selection` slices are Browser- and
Electron-verified against `26.727.40816`. Their implementation remains
`partial` because the current probe does not establish Remote destination
behavior, real project selection, creation workflows, or persistence. The
broader project index, environment settings, and worktree settings families
remain partial/legacy, as does the legacy host-defined route selector. The
current PR route is covered separately below; generic review components still
do not establish mutating product behavior. The remaining P0
conversation/workspace variants remain open. Global notification runtime
observation and light-theme shell evidence also remain open. Final
H5/Electron visual unification is intentionally deferred until coverage
stabilizes.

The current-thread slice adds `ConversationThreadShell`, which composes the
existing header, scroll-following timeline, messages, and Composer into one
responsive public surface. Its `26.721.41059`-derived contract locks the 46px
header, 768px outer thread column, 736px wide Composer card, 16px responsive
insets, 98px multiline Composer, 28px submit/Stop control, user/assistant
alignment, completed assistant actions, and the measured user-to-assistant
turn gap.

The H5 showcase retains regression coverage for those relationships in
Chromium at 1440×1000 light and dark plus 820×680 compact light. The Electron
acceptance flow retains the same composition coverage in real 1180×820 and
820×680 BrowserWindows, including top/bottom timeline positioning and the
running Stop state. A separate main-only dark fixture accepts a `26.721.41059`
PNG reference through
`CODEX_UI_KIT_THREAD_REFERENCE` and gates the full image plus the header,
message band, and Composer regions independently. The sampled completed state
matches all measured region geometry and stays below a 0.5% full-image raster
delta at the strict 0.05 pixel threshold.

The visual gate is now scenario-driven. A second external reference supplied
through `CODEX_UI_KIT_THREAD_STREAMING_REFERENCE` covers a `26.721.41059`
running reply and 28px `Stop` control. It locks 14/22px running text, the
736px reply/Composer columns, and the 736×98 Composer card. Its declared mask
omits only the workspace-owned Environment control from the thread-owned
comparison; the remaining full raster and header/message/Composer regions
stay independently bounded.

The previous full conversation/Composer probe observed build `26.721.81911`
in a disposable second process using synthetic prompts only. It remains the
historical source for multiline, permission, Add-files, attachment, and
paused/Resume variants.

The current `26.727.40816` text-only probe re-observed the 736px Composer
column, 712×44 textbox, 28×28 Stop button, and a real queued follow-up. The
queue shell is inset 13px and measures 710×39px; its 708×38 scroll region
contains a 684×28 row using 14/16px typography with Steer,
Delete queued message, and queued message actions. Stop produced
`You stopped after 2s`, removed the tray, promoted the queued prompt, and
started the next turn automatically. The current product did not expose the
old paused header or Resume action.

The independent public contract adds `ComposerDock`,
`ComposerContextBar`, and `ComposerContextControl`, keeps context, queue, and
input ownership separate, and lets a running `AgentComposer` route Enter to a
host-owned queue while Stop remains the primary control. The 46-event
conversation replay contains 11 turns and covers multiline, disabled,
attachment, running, queued, queue-paused, completed, scroll-away,
message-navigation, and windowed-history frames. Its default interaction now
drives submit → running → queue → Stop → automatic queued continuation, then
message navigation and return-to-latest. The old paused/Resume frame remains
an explicit compatibility fixture rather than a current-product claim. Real
Electron repeats the current lifecycle in an 1180×820 `BrowserWindow`.

Optional 792×320 `26.727.40816` references are accepted through
`CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE` and
`CODEX_UI_KIT_COMPOSER_CONTINUED_REFERENCE`. At the strict 0.05 pixel
threshold and 2% hard ratio limit, the accepted ownership-masked
changed-pixel ratios are `0.004505997` and `0.006182923`. Queue and
Stop/interruption are therefore current-build Browser/Electron verified.
Permission, attachment, and full multiline lifecycle evidence remains
`partial_legacy`. Message navigation and windowing retain strong independent
Browser/Electron regression coverage, but stay `partial_legacy` because the
current build's exact long-thread virtualization algorithm was not re-observed.

Three more `26.721.41059` scenarios cover an expanded read-only command, a
pending command approval, and an applied file card with the Review panel open.
The command and approval remain turn-owned. The file scenario explicitly
splits its 666px conversation region from the independent 406px
workspace-owned Review panel, and its regional checker accepts optional
horizontal bounds so those owners are gated separately.

The workflow fixture extends `FileChange` with a host-owned leading indicator
slot and composes the existing `ActivityTimeline`, `CommandExecution`,
`ApprovalRequest`, `ConversationThreadShell`, `WorkspacePanel`, and `FileDiff`
primitives. Browser evidence and real `BrowserWindow` acceptance previously
verified the sampled command and approval states against `26.721.41059`; their
current inventory status is `partial_legacy`.

The protocol-backed Codex App playground now exercises command execution, a
real App Server approval request/response, the applied turn-owned file card,
and the host-owned Review split in a real BrowserWindow. CDP locks the named
surface geometry and computed layout, Electron acceptance closes and reopens
the Review panel, and reviewed pixels gate the five workflow frames. Paired
with the `26.721.41059` captures, this previously verified the sampled file
card, Review side-panel, and editor diff in Electron. Their current status is
`partial_legacy`, and they remain implementation-partial because broader
content and error variants remain open.

The multi-file slice adds public `FileChangeGroup` and `FileReview`
components. A protocol-backed two-file trace renders one aggregate
`Edited 2 files` card with group-level Undo/Review and stacks both independent
diffs in the workspace panel. CDP requires one card, two file rows, two Review
sections, exact focus labels, valid split geometry, and no horizontal
overflow. Electron drives close, file-specific reopen, group reopen, and
Undo, then repeats the geometry assertions in a real 800×600 BrowserWindow.
An optional 906×820 `26.721.41059` raster gate compares the whole main region
and its 536px conversation/370px Review ownership regions separately. This
previously verified `workspace.multi-file-review` in Browser and Electron; its
current status is `partial_legacy`, and implementation remains partial for
mixed change kinds and broader real PR-review variants.

The large-Review acceptance slice expands the deterministic public-protocol
fixture to eight files and 96 addition lines. Its Review region must overflow
internally, and selecting the eighth file must scroll that exact section fully
into view in both CDP and a real `BrowserWindow`. A thirteenth reviewed
full-frame pixel baseline guards the resulting layout. This validates large
file-set rendering and selection scrolling in the independent implementation;
it is not product evidence for an eight-file state on any observed build.

The mixed-Review slice adds explicit public `FileReviewContent` variants for
text diffs, binary changes, and merge conflicts. A pinned public-protocol trace
maps `move_path` to a renamed row, preserves a deleted diff, and lets the host
derive binary/conflict presentation only from patch content. Review headers
drive exact selection without dropping sibling files; group Undo closes the
panel and removes the undone group from the reviewable set. CDP now checks four
rows, two diffs, two notices, their ordered kinds, focus, and split geometry;
Electron repeats selection, close/reopen, sibling preservation, and Undo. A
reviewed full-frame pixel baseline covers the integrated state.

A separate `26.721.81911` disposable ignored-file probe observed the
then-current
delete card, its 28px Undo/Review actions, a 370px Last Turn Review panel, and
the deletion diff. A rename-only `apply_patch` run was rendered by the current
product as separate `+0 −0` entries with `No content`, not a single
rename-arrow row. The independent mapper therefore retains the public
`move_path` semantic while documenting that it is not the current-product
presentation observed in this run. Binary and conflict notices remain
synthetic host-state coverage, so the broader Review family remains
implementation-partial rather than being promoted to product-level
completion.

The refreshed Pull request lifecycle keeps the controlled, resizable workspace
panel but follows the current `26.727.40816` non-modal overlay geometry. The
read-only public-PR probe measured a 369.28px detail panel over the 906px main
route at 1180×820, a 321.97px panel at 960×720, about 319px at 820×680, and a
329.31px panel at 720×680 after the sidebar collapsed. The 16px resize target
sits on the panel edge; the underlying main route remains interactive. The
detail auto-hides after the responsive transition and is restored by
explicitly reopening the selected row.

The public contract now includes `PullRequestQueryState`,
`PullRequestMergeReadiness`, `PullRequestReviewComposer`, and
`PullRequestCommentComposer` in addition to the PR list, details, summary,
checks, reviewer, and thread surfaces. The deterministic state machine covers
index/detail loading, failure and retry; running/failed/passed checks; comment
failure/recovery; review submission; blocked/ready/merging/merged requirements;
compact layout; and route restoration. Browser/CDP, real Electron, and
reviewed pixels verify the resulting 59-frame matrix, so
`workspace.pull-request-route` and `workspace.pull-request-review` are now
independently Browser/Electron verified.

The current-product evidence now covers the two-tab Summary/Code structure,
Timeline integrated below the Summary comment composer, successful multi-file
Code content, the three-item display-options menu, Auto-merge, and responsive
geometry. The independent visual comparison passes at 5.75% for the full
906×820 main region, 4.68% for the index, and 6.44% for the detail without
relaxing the existing thresholds. No real comment, review, auto-merge, or
merge was submitted. The independent review composer is therefore exposed
through a host-owned synthetic action rather than mislabeling the current
display menu as review submission.

The original Terminal slice established the bottom-panel interaction contract
on `26.721.41059`: a 272px panel track, 152px minimum, half-height responsive
maximum, 16px drag strip, 33px tab header, 239px content region, named
tab/tabpanel, and `Terminal input`. The `26.721.81911` refresh now separately
verifies the session-tab surface. Current-product CDP observed three
auto-numbered Terminal tabs, one close button named for each tab, nearest-tab
selection after closing the active tab, a four-item Review/Terminal/Browser/
Files picker, and all three tabs fitting at 820×680 without horizontal
overflow. Tabs measured 140px at 1180×820 and about 136px at 820×680; the
current outer bottom-panel container includes its resize affordance, while the
independent `AppShell` preserves the 272px track and 239px content contract.

The public `TerminalPanel` composes controlled multi-session tabs over
`WorkspacePanel`; `TerminalTranscript`, `TerminalPrompt`, and
`TerminalSession` keep output, input, status, and submission protocol-neutral
and host-owned. `TerminalProcessList` presents running, failed, restoring,
idle, and exited process summaries without starting, stopping, or reopening a
process itself. A 15-event public-protocol trace supplies three independent
commands and six reviewed states: running, failed, three-tab, picker,
all-closed/restore, and compact layout. Browser/CDP gates 49 shared frames.
Electron drives tab changes with keyboard and pointer input, preserves
per-session command values, closes to the nearest tab, creates a session from
the picker, closes all sessions, restores the latest one, and reopens a failed
process.

The current `26.727.40816` shell instead presented one project-named
`codex-ui-kit` tab in the bounded read-only observation. The independent
single-session model matches that label plus the close/add controls and passes
the current-build regional pixel gate at 1.79% for the panel and 0.73% for its
content, so `workspace.terminal` is current-build Browser/Electron verified.
The independently implemented process list and
running/failed/exited replay are deliberately split into
`workspace.terminal-process-lifecycle`: the installed build's real process
lifecycle was not safely exercised in this refresh, so that row retains
previous-build runtime evidence and `partial_legacy` verification. Persisted
panel state and real shell creation/termination remain open.

The compact tool/recovery slice splits the former combined
`thread.search-tool-mcp-events` candidate into independent search, Browser, and
MCP tool-event rows. `26.721.41059` CDP evidence previously verified completed
web search and Browser activity in the Browser gate; both are now
`partial_legacy`. The unsuccessful GitHub request is tracked separately as
`thread.tool-unavailable-recovery`: it proves the visible assistant recovery
message, not an MCP call. `BrowserActivity` supplies a protocol-neutral
completed/running/failed disclosure with ordered browser steps, and the
Electron playground exercises that public component without claiming exact
compact-window parity.

Four external 526×600 main-only references now gate completed web search,
expanded Browser steps, unavailable-MCP recovery, and a failed exit-code-7
command. The Browser fixture explicitly represents the sampled
auto-follow/scroll position. Search, unavailable recovery, and failed-command
geometry remain independent, so a passing plain assistant fallback cannot
promote MCP tool rendering and a failed command cannot promote thread-level
render/retry recovery.

The original successful-MCP slice samples a real read-only
`openaiDeveloperDocs` run on build `26.721.41059`. That build's CDP evidence
records the completed answer, the `Worked for 54s` disclosure, the
`Used OpenAI Developer Docs integration` group, and its three Search plus two
Fetch calls.

Build `26.727.40816` refreshes the primary successful path with one real
Search followed by one real Fetch, a `Worked for 31s` disclosure, an
intermediate assistant explanation inside the activity timeline, and a linked
Markdown answer. The independent two-call replay now matches the current
group order, 14/21px typography, system font, 445 weight, 0.6 secondary color,
and response layout. Its current 906×820 gate passes at 2.03% full-main,
0.05% tool-structure, 1.87% answer, and 1.92% Composer difference without
changing the existing limits. Dynamic header/task/intermediate/group-label
glyphs and the non-owning scrollbar are masked; the answer stays unmasked,
and CDP separately gates the masked typography and disclosure properties.
`thread.mcp-tool-events` is therefore current-build
Browser/Electron verified.

Build `26.721.81911` first established a separate real recovery path. Build
`26.727.40816` now refreshes it with a disposable task that deliberately calls
Fetch OpenAI doc with `not-a-valid-url`, exposes the expanded neutral
`plaintext / Invalid URL` output, explains the retry, then performs three
Search OpenAI docs calls and a successful Fetch OpenAI doc call. The current
Renderer keeps the failed Fetch as a standalone activity row and groups the
four recovery calls under `Worked for 51s` and
`Used OpenAI Developer Docs integration`. The independent replay tracks that
separation and terminal-event order so an earlier failed call cannot make the
later recovered group itself failed.

The public App Server traces use only schema-validated `mcpToolCall` start,
progress, result, error, and completion fields. The new deterministic scenario
continues into a second turn containing two commands, an accepted approval,
one file change, and the Review panel. CDP and real `BrowserWindow`
acceptance cover the standalone failure, recovered four-call group,
raw-output dialog, and mixed Review split within the 59-frame lifecycle
matrix. The current-build masked 906×820 regional gate passes at the strict
0.05 pixel threshold with changed-pixel ratios of 0.016253432 for the full
main region, 0.028989319 for the recovery region, 0.010849453 for the upper
activity/failure region, and 0.019065999 for the Composer region. The final
answer remains unmasked; CDP independently locks masked labels and computed
styles.

This promotes `thread.mcp-tool-events` and the newly split
`thread.mcp-tool-failure-retry` gate for the sampled current-build path.
Authentication, elicitation, MCP approvals, unavailable connectors, other
integrations, cancellation, and thread-transport retry remain open.

The long-thread continuity slice adds the `26.721.41059` default ten-message
threshold and measured 36×10 rows to `ThreadMessageNavigationRail`, exposes
the rail and 32×32 latest-message control as overlay slots on
`ConversationThreadShell`, and adds `ThreadInterruptionSummary` plus
`ThreadContextEvent`. Five external references independently gate medium
message navigation and compact scroll-away, interrupted, context-running, and
context-completed states. Their full-image deltas are 1.8139%, 2.9354%,
3.2975%, 3.6442%, and 3.4328%, with all named geometry and header/thread/
Composer regional limits passing.

The `26.721.41059` runtime evidence also records that the product's long-thread
viewport uses reverse-origin scrolling (`scrollTop = 0` at latest, negative
away from latest). The public package keeps the actual windowing and scroll
algorithm host-owned. Browser and Electron acceptance exercise the
placeholder, navigation, and follow contracts but not reverse scrolling or
windowing, so the virtualization row remains `partial_legacy`. The
interruption acceptance renders the observed summary statically rather than
driving a host run-to-stop-to-summary transition, so that row also remains
`partial_legacy`. The `26.721.81911` MCP tool-call error/retry state is now
captured separately; the broader thread-transport error/retry state has not
been safely reached and remains an unpromoted gate. Compaction acceptance
statically renders the observed running and completed states rather than
driving their host transition, so `thread.context-compaction` also remains
`partial_legacy`; it does not promote the still-unreached thread summary
panel.

This is a measurement- and raster-backed basic thread/workspace slice, not a
claim that the whole application or every lifecycle is pixel-perfect. Broader
Markdown variants, the exact host virtualization algorithm, code search,
other MCP and connector variants, thread-level retry recovery, approval
persistence and timeout, current-product binary/conflict reachability, PR
merge/review-submission states, current-product Terminal process lifecycle and
panel persistence, and native Codex window behavior
retain their own inventory gates.

The Markdown slice revalidates one synthetic completed response on build
`26.721.41059`. That build's CDP evidence records semantic heading, paragraph,
link, inline code, quote, list, table, fenced-code, and action/copy controls
together with their computed styles. The protocol replay adds a sixteenth
deterministic frame; Browser and Electron gates retain regression coverage for
external-link semantics, code-copy behavior, the four completed-response
actions, 736px content geometry, and the measured scroll clearance above the
736px Composer. A main-only 906×820 reference compares assistant, code-card,
and Composer ownership regions independently. This previously verified only
the sampled completed Markdown vocabulary against `26.721.41059`; its current
status is `partial_legacy`. Nested lists, task lists, images, math,
citations/sources, very large tables, streaming Markdown mutation, and error
variants remain open.
