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

- Codex Desktop `26.730.61639` (`6234`)
- Package sampled and reverified on 2026-08-06
- `app.asar` SHA-256:
  `3fea92820c0fb7a69473e7a8308a8e5b8e91524289a84181a33533ec6cb51d45`
- Computer Use automation: blocked by the environment safety policy for
  `com.openai.codex`
- Scoped CDP automation: available through a user-authorized second process;
  the Chromium profile is separate, but Codex application data and navigation
  are not fully isolated
- Fresh current-build Renderer evidence covers the Terminal session shell,
  direct-shell running/completed persistence, and the cross-worktree mismatch
  recovery. It verifies project-labelled tabs, multi-tab reindexing,
  close-nearest selection, the four-item picker, 820×680 fit, independent
  transcripts, close/reopen while a process runs, close-last collapse, fresh
  creation from the top Toggle, and `Dismiss`/`Open new terminal` recovery.
  A separate current-build task now also covers one real delegated subagent
  from active work through completion, the thread-summary row, wide side-panel
  list, nested transcript, and explicit 820×680 and 720×680 panel reopen. Two
  additional tasks cover concurrent siblings and a Parent → Child delegation:
  both reach active, mixed active/done, completed, summary, flat panel, and
  independent transcript states while public `agentPath` metadata preserves
  the nested hierarchy.
  All `26.730.61309` observations remain previous-build evidence until each
  surface is separately reached on `26.730.61639`.

A later, deliberately narrower `26.803.41515` (`6321`) probe refreshes the
sidebar visual/action slice and binds 14 icon primitives to exact runtime
evidence. It also confirms current project/task hover actions, the Help footer,
and the absence of leading thread glyphs. It is documented in
[`26.803.41515.md`](26.803.41515.md) and does not change this broader
inventory's `26.730.61639` current-build counts or promote untested routes and
lifecycles.

Current inventory: 81 surface groups; 5 have current-build runtime evidence, 59 have previous-build-only runtime evidence, 17 remain `not_sampled`, and 0 are `blocked_by_policy`. Current-build Browser verification covers 5 groups and Electron verification covers 5.
Prior acceptance outside the sampled Terminal session, process, and mismatch
slices remains recorded as `partial_legacy` until current-build
re-observation.

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

## Build-scoped implementation history

The implementation history below names the exact observed build. Acceptance
that previously matched `26.721.81911` or earlier remains regression coverage,
but every
affected inventory row was `partial_legacy` until it was re-observed on
`26.727.40816`. After the `26.730.61639` update, every row below is again
`partial_legacy` except the explicitly refreshed Terminal session,
direct-shell lifecycle, and context-mismatch rows. The
machine-readable inventory is authoritative when historical prose describes
a build as current at its capture time.

The previous sidebar slice re-observed all six application-sidebar groups on
`26.730.61309`. It independently implements the 274px shell, 46px
traffic-light-safe titlebar inset, 70px header, 30px rows, Codex/Search/
activity controls, New chat/Quick chat, five reusable expandable project
groups with nested tasks, Pinned/Projects/Recents sections, dense history,
actions/status, and a fixed 46px footer with 54px scroll clearance. The
normal H5 and Electron composition retains the 960px right-panel coordination
boundary and locks the exact 721/720 sidebar boundary: the sidebar remains in
flow through 721px and auto-hides at 720px. An explicit Show action pins the
regular 274px column, including after navigating to Pull requests; a hidden
sidebar no longer opens from the legacy 12px edge hover. `AppShell` keeps its
focus-managed modal mode only as an explicit safety fallback for widths that
cannot fit the pinned split. The current product's separator exposes
`role=separator` but no keyboard value semantics; UIKit intentionally retains
Arrow/Home/End resizing and value attributes as an accessibility improvement.
The dedicated de-identified scene passes within the 93-frame Browser/CDP and
pixel matrix,
Electron interaction, and current-build regional ratios of 3.6234% for the
top, 0.1292% for the masked selected row, and 0% for the masked footer.
Implementation stays `partial` because light-theme runtime evidence, dynamic
right-panel sizing, context-menu mutations, and broader route coverage remain
separate work.

The narrower `26.803.41515` follow-up keeps that implementation boundary while
correcting current dark-state details: project rows expose 24×24 More/New chat
controls with a 6px gap; nested task rows expose 20×20 Pin/Archive controls
with an 8px gap; the footer exposes a 32×32 Help control with an 18×18 exact
glyph; and current task rows do not render a leading thread glyph. Browser/CDP
and Electron independently gate the hover semantics and geometry. The
1180×820 current-build regional comparison passes at 3.4526% for the top,
0.1163% for the ownership-masked selected row, and 0.4126% for the footer,
where only account-owned content is masked and the Help control remains under
comparison.

The application-shell continuity slice splits window navigation, route
lifecycle feedback, route selection/restoration, and global notifications
into independently owned inventory rows. `26.727.40816` CDP records the 46px
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

The `26.730.61309` workspace refresh promotes
`conversation.destination`, `conversation.context-controls`,
`conversation.project-picker`, `composer.project-worktree-selection`, and
`app.new-thread-workspace-selection` to current-build Browser and Electron
verification. The selected-project and no-project headings, two suggestion
rows, 14-option project picker, five-item Start in menu, seven-branch menu,
inline New worktree state, environment empty menu, and exact 720px layout are
all independently gated. Browser/CDP now covers 86 lifecycle frames and six
responsive widths; Electron drives the safe transitions and continues through
the protocol-backed command → approval → Review → Terminal → PR path.

External current-build ratios are 0.5437% for ready, 0.2248% for no project,
0.2378% for New worktree, 2.9943% for the environment picker, 0.4619% for
compact, 2.9046% for the project list, 3.2800% for Start in, and 7.1320% for
branches. Implementation remains `partial` because project/branch creation,
environment settings, persistence, Remote/Codex web execution, and unavailable
environment behavior were not mutated in the current product. The searchable
600×600 `LocalEnvironmentDialog` remains a protocol-neutral host capability;
it is no longer presented as the current New worktree entry behavior. The
broader projects index, environment settings, and worktree settings families
remain partial/legacy, as does the legacy host-defined route selector. Global
notification runtime observation and light-theme shell evidence also remain
open.

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
historical source for non-image attachment, active mode, and paused/Resume
variants.

The `26.727.40816` text-only probe re-observed the 736px Composer
column, 712×44 textbox, 28×28 Stop button, and a real queued follow-up. The
queue shell is inset 13px and measures 710×39px; its 708×38 scroll region
contains a 684×28 row using 14/16px typography with Steer,
Delete queued message, and queued message actions. Stop produced
`You stopped after 2s`, removed the tray, promoted the queued prompt, and
started the next turn automatically. The current product did not expose the
old paused header or Resume action.

A second exact `26.727.40816` Composer probe reached four-line and long-input
states without submitting the draft. The four-line Composer measures 736×134
at x=359/y=670 with a 712×80 textbox at x=371/y=684. Twenty lines clamp the
textbox to the current 205px `25dvh` maximum and grow the surface to 736×259.
The permission trigger measures 101.06×28 and opens the four current choices
in a 480.36×222.44 menu: Ask for approval, Approve for me, Full access, and
Custom (`config.toml`). `Add files and more` now opens a 736×320 inline,
scrollable resource picker rather than the previous simple menu. Its visible
top groups cover files/folders, active-app attachment, project, Goal, Plan
mode, skill recording, and plugin resources. Lower installed entries are
host-provided data and are not copied into the public fixture.

The independent public contract adds `ComposerDock`,
`ComposerContextBar`, `ComposerContextControl`, `ComposerPermissionMenu`, and
`ComposerResourcePicker`, keeps context, queue, overlays, and input ownership
separate, and lets a running `AgentComposer` route Enter to a host-owned queue
while Stop remains the primary control. The 46-event
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
changed-pixel ratios are `0.003480114` and `0.005105745`. The
queue/automatic-continuation contract was Browser/Electron verified on
`26.727.40816` and remains `partial_legacy`; the independent real-command Stop
contract is refreshed on `26.730.61309` below.
The four-line, permission, and Add-resource frames add two more reviewed
Browser/CDP/pixel frames and real Electron interaction. Their strict
ownership-masked changed-pixel ratios are `0.000994318`, `0.001280084`, and
`0.003352986`, under hard 0.5%, 0.5%, and 0.8% limits respectively.
Permissions, Add resources, and multiline growth were verified on
`26.727.40816` and are now `partial_legacy`. A separate unsubmitted-draft
probe verifies active Goal and Plan
labels, prompts, 736×98 geometry, 28px clear controls, and focus restoration.
Their 906×820 regional gates pass at `0.003763528` and `0.003486243`, so
`composer.modes` was Browser/Electron verified on `26.727.40816` and is now
`partial_legacy`. Native file-panel selection remains outside Renderer CDP;
the current pasted-image lifecycle is independently refreshed below.

The `26.727.40816` long-thread probe re-observes an 82-message compact
navigation
rail, its 36×10px buttons and 26×2px selected marker, a seven-turn mounted
window around message 40, reverse-origin scrolling, and the 32×32px
return-to-latest control. The independent fixture keeps labels synthetic and
the host responsible for choosing which turns stay mounted. Browser/CDP and
real Electron jump to message 20, retain seven mounted turns, and return to
message 82 at `scrollTop = 0`. Its ownership-masked 906×820 gate retains only
the rail and floating control and passes at `0.005937382` under a 1% hard
limit. `thread.virtualized-timeline` was Browser/Electron verified for this
sampled `26.727.40816` contract and is now `partial_legacy`; unobserved window
sizes
and host eviction heuristics do not become product-level claims.

Three `26.721.41059` scenarios cover an expanded read-only command, a
pending command approval, and an applied file card with the Review panel open.
The command and approval remain turn-owned. The file scenario explicitly
splits its 666px conversation region from the independent 406px
workspace-owned Review panel, and its regional checker accepts optional
horizontal bounds so those owners are gated separately.

The workflow fixture extends `FileChange` with a host-owned leading indicator
slot and composes the existing `ActivityTimeline`, `CommandExecution`,
`ApprovalRequest`, `ConversationThreadShell`, `WorkspacePanel`, and `FileDiff`
primitives. Browser evidence and real `BrowserWindow` acceptance previously
verified the sampled command and approval states against `26.721.41059`. The
command-approval denial path and long-output command contract are refreshed
against `26.727.40816` below.

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

A refreshed `26.730.61309` disposable ignored-file probe re-observes the
28px Undo/Review actions, 370px `Last Turn` side region, and one real deletion
diff. The rename-only `apply_patch` path still renders separate source and
destination entries rather than one rename-arrow row, but it no longer exposes
the old two-row `No content` state: the source now contains one added
`__CODEX_TEMP_RENAME_MARKER__` line and the destination removes the same line,
producing `+1 −0` and `+0 −1` diffs. The independent mapper therefore keeps
the public `move_path` semantic and adds a separate current-product replay for
the marker-backed presentation.

That eight-event replay raises the matrix to 21 fixtures and 254 events.
Browser/CDP covers 86 reviewed frames, drives keyboard selection, close/reopen,
sibling preservation, and Undo; Electron repeats the lifecycle in a real
1180×820 `BrowserWindow`. The exact 906×820 current-build comparison passes at
`0.06206724815592527` full, `0.05229341099381143` conversation, and
`0.07620303230059328` Review-panel ratios under 6.5%, 5.5%, and 8% limits.
`thread.file-change-diff`, `workspace.side-panel-shell`,
`workspace.editor-diff`, and `workspace.multi-file-review` are current-build
Browser/Electron verified for this sampled delete/rename family. Binary and
conflict notices remain synthetic host-state coverage, so the broader Review
family remains implementation-partial rather than product-level complete.

The refreshed Pull request lifecycle keeps the controlled, resizable workspace
panel but follows the `26.727.40816` non-modal overlay geometry. The
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
reviewed pixels verify the resulting 61-frame matrix, so
`workspace.pull-request-route` and `workspace.pull-request-review` are now
independently Browser/Electron verified.

The `26.727.40816` product evidence covers the two-tab Summary/Code structure,
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
verifies the session-tab surface. `26.721.81911` CDP observed three
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

The current `26.730.61639` refresh reaches the complete local session shell:
project-labelled tabs, global visible numbering across workspaces,
close-nearest selection, label reindexing, the four-item picker, and three-tab
fit at 820×680. Closing the last tab collapses the panel; the top Toggle then
creates a fresh current-workspace terminal with an empty transcript instead of
restoring the closed session. `TerminalPanel` exposes plain local accessible
labels through `showStatus={false}` while retaining status-rich labels for the
host-supplied process-list compatibility fixture.

A real bounded `sleep 3; echo terminal-after-reopen` command additionally
verifies running/completed transcript settlement, independent per-session
history, and close/reopen persistence while the process is active. A failed
direct shell command does not add a product tab status badge, so
`TerminalProcessList` remains an explicitly host-owned presentation for
running/failed/exited process summaries and reopen actions rather than an
inferred native tab contract.

Changing the chat worktree with an older Terminal active now has its own
`workspace.terminal-context-mismatch` surface. The observed warning says
`This terminal's workspace does not match this chat's current worktree` and
offers `Dismiss` plus `Open new terminal` without discarding the older
session. `TerminalWorkspaceMismatchNotice` implements that recovery contract.
Browser/CDP covers 93 lifecycle frames and Electron repeats the session,
mismatch, input, picker, close, and resizing interactions. Against the exact
906×820 current-build reference, the shared panel and content differ by
1.5120% and 0.4004%, below independent 2% and 1% limits.

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
Markdown answer. The independent two-call replay matches the
`26.727.40816` group order, 14/21px typography, system font, 445 weight, 0.6
secondary color, and response layout. Its build-scoped 906×820 gate passes at
2.03% full-main,
0.05% tool-structure, 1.87% answer, and 1.92% Composer difference without
changing the existing limits. Dynamic header/task/intermediate/group-label
glyphs and the non-owning scrollbar are masked; the answer stays unmasked,
and CDP separately gates the masked typography and disclosure properties.
`thread.mcp-tool-events` was Browser/Electron verified on `26.727.40816` and
is now `partial_legacy`.

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
raw-output dialog, and mixed Review split within the 61-frame lifecycle
matrix. The `26.727.40816` masked 906×820 regional gate passes at the strict
0.05 pixel threshold with changed-pixel ratios of 0.016253432 for the full
main region, 0.028989319 for the recovery region, 0.010849453 for the upper
activity/failure region, and 0.019065999 for the Composer region. The final
answer remains unmasked; CDP independently locks masked labels and computed
styles.

This promoted `thread.mcp-tool-events` and the newly split
`thread.mcp-tool-failure-retry` gate for the sampled `26.727.40816` path;
both are now `partial_legacy`.
Authentication, elicitation, MCP approvals, unavailable connectors, other
integrations, cancellation, and thread-transport retry remain open.

The long-thread continuity slice adds the default ten-message threshold and
measured 36×10 rows to `ThreadMessageNavigationRail`, exposes
the rail and 32×32 latest-message control as overlay slots on
`ConversationThreadShell`, and adds `ThreadInterruptionSummary` plus
`ThreadContextEvent`. Five external references independently gate medium
message navigation and compact scroll-away, interrupted, context-running, and
context-completed states. Their full-image deltas are 1.8139%, 2.9354%,
3.2975%, 3.6442%, and 3.4328%, with all named geometry and header/thread/
Composer regional limits passing.

The `26.727.40816` refresh confirms that the product's long-thread viewport
uses reverse-origin scrolling (`scrollTop = 0` at latest, negative away from
latest) and samples 82 navigation items with seven nearby turns mounted. The
public package keeps the actual eviction policy host-owned while exposing
reverse-origin viewport and compact-rail contracts. Browser and Electron now
exercise selection, reverse scrolling, the seven-turn window, and return to
latest, so the virtualization row is verified for the sampled current
contract.

The `26.727.40816` command-approval slice used a dedicated disposable task and
requests only `open -a Calculator`. The 736×162 turn-owned pending surface
appears at x=359/y=642 with `Terminal`, the command preview, `Deny`,
`Allow once`, and a split `Approval options` menu. Selecting `Deny` removes
the card, completes the activity as `Worked for 23s`, restores the 736×98
Composer with `Ask for approval`, and produces a final response while the
command retains empty output, no exit code, and no Calculator process.

The historical decline trace records request/decline/resolution without
executing the command. A new `26.730.61309` disposable task requests only
`open -a Calculator`; Calculator is absent before approval, appears only after
the real `Allow once` action, and is closed after the exact final response
`ALLOW ONCE COMPLETE.`. The current 736×162 card still replaces the Composer,
and completion restores the empty focused 736×98 Composer while its policy
remains `Ask for approval`.

The schema-validated approval traces bring the set to 19 fixtures and 241
events. Browser/CDP covers 80 frames and verifies the pending geometry,
computed state, exact approval transition, completed command, final response,
permission preservation, focus restoration, and the matching-rule second
execution without another approval. Electron repeats both interactions in a
real 1180×820 `BrowserWindow`. Ownership-masked current-build 906×820
comparisons pass at `0.012554514617993862` for Allow-once pending,
`0.002993592849835783` for Allow-once completed, `0.012100899154686911` for
the matching-rule menu, and `0.013686534216335542` for the repeated completed
state, under independent 1.5% hard limits. This promotes
`thread.approval-permission-events` to current-build Browser and Electron
verification for the sampled one-time and matching-command paths. Approval
timeout, repeated denial, `acceptForSession`, non-command approval kinds, and
rule lifetime across thread/restart boundaries remain open; the denial runtime
sample remains previous-build evidence.

The current attachment slice used a separate `26.730.61309` new chat and a
synthetic 1×1 PNG delivered through the Composer paste path, avoiding the
native macOS file panel. The ready Composer measures 736×180px at
x=359.05/y=624. Its attachment surface is 80×80px with a 78×78px image,
17px radius, 16%-white border, and a 16×16px Remove action. Removing it clears
the card and restores input focus; adding the same image again and submitting
produces one 80×80px user-message attachment, the exact final response
`ATTACHMENT LIFECYCLE COMPLETE.`, and an empty focused 736×98px Composer.

The independent `attachment-lifecycle` trace adds public image input to the
protocol reducer and brings the matrix to 20 fixtures and 246 events. Public
`MessageAttachment` ownership keeps sent media outside the editable user
bubble, while `ComposerAttachment` owns the removable draft card. Browser/CDP
now covers 81 frames and drives Remove → Add → Submit → completion; Electron
repeats the lifecycle in a real 1180×820 `BrowserWindow`. Ownership-masked
current-build 906×820 comparisons pass at `0.0038954396166478223` for ready
and `0.007934905507995478` for completed, below independent 1.5% hard limits.
This promotes `composer.attachments` only for the sampled pasted-image path.
Native file selection, pasted text, ordinary file cards, multiple attachments,
horizontal overflow, upload progress/failure, preview failure, and plugin
resources remain separate gates.

The current long-command slice uses a separate disposable task on
`26.730.61309` and requests
only `seq 1 400`. Ask mode classified that exact command as low risk and ran it
without showing an approval card; this observation therefore does not promote
the allow-once approval state. The collapsed `Ran seq 1 400` disclosure opens
to a 736×227px command card with a `Shell` label, copy controls, a 144px
scrolling output viewport, and `Success`. Its reverse column keeps lines
394–400 visible at `scrollTop = 0` while preserving all 400 output lines plus
the trailing newline.

The independent trace contains exactly one command request/output pair.
Browser/CDP now covers 75 lifecycle frames and verifies command identity,
401 split lines, computed typography, output overflow, keyboard disclosure,
and latest-line restoration after collapse/reopen. Electron drives the same
interaction in a real 1180×820 `BrowserWindow`. The ownership-masked full
1180×820 comparison passes at `0.001655643` under a 1.5% hard limit. This
promotes `thread.command-execution` for the sampled current long-output
contract.

A second `26.730.61309` disposable task ran one read-only shell loop that
emitted 80 stdout and 80 stderr lines before exiting with code 7. The current
Renderer exposed `Worked for 12s`, a failed 736×246.58px `Shell` card, two
copy controls, a 734×144px reverse-tail output viewport, 161 split lines
including the trailing newline, and `Exit code 7`. A no-tool follow-up then
completed successfully in the same thread. The independent trace models the
running-output, collapsed failure, expanded failure, first completed turn,
and recovered follow-up states. Browser/CDP now covers 75 lifecycle frames;
Electron repeats disclosure, exact copied output, collapse/reopen, failure,
and recovery. The ownership-masked full-window gate passes at
`0.008898305084745763` under a 1% hard limit. This additionally promotes
`thread.command-failure-recovery` only for recovery after a command-level failure.
Active truncation copy affordances, broader background processes,
transport-level retry, and other command kinds remain open.

A third `26.730.61309` disposable task ran the exact read-only 120-second
probe and used the current 28×28 Stop action after 95 seconds. The Renderer
first exposed `You stopped after 1m 35s` plus the transient
`Background terminal stopped with …` row; after the background-terminal
settlement the row became `Ran …`. A second no-tool message in the same thread
returned exactly `INTERRUPTION RECOVERY ACCEPTED` and restored Composer focus.
The public trace separates running, immediate-stop, settled, and recovered
frames. Browser/CDP and real Electron drive the Stop and recovery transitions
rather than merely rendering a static summary. Computed contracts lock the
736px rows, 14/21px weight-445 system typography, summary rule, action states,
and focus restoration. The ownership-masked full-window comparison measures
`0.0043520049607275735` under a 0.5% hard limit. This promotes
`thread.interruption-stop` for the sampled command-interruption lifecycle;
queue continuation and broader background-process management retain their own
gates. The `26.721.81911` MCP tool-call error/retry state is now
captured separately; the broader thread-transport error/retry state has not
been safely reached and remains an unpromoted gate.

A fourth `26.730.61309` disposable task entered `/compact` only after an exact
no-tool baseline response. The current menu exposed `Compact this chat's
context (9% full)`, then transitioned through `Working`, `Compacting context`,
and the 28×28 Stop action before settling to `Context compacted`. The 131 CDP
samples observed the running-to-completed transition over 8.136 seconds. A
second no-tool message in the same task returned exactly `COMPACTION RECOVERY
ACCEPTED` and restored the empty Composer. The public replay now adds command
menu, running, completed, and recovered frames; Browser/CDP and real Electron
drive the menu and same-thread recovery instead of accepting static rendering.
Computed contracts lock manual mode, 736px event geometry, 14/21px weight-445
typography, separator, Stop/Send states, and focus restoration. The
interactive playground additionally routes Enter/Send through the selected
command, refuses recovery before completion, scopes manual labels away from
Live automatic events, and gives its visible Stop control a deterministic
local reset; this does not promote an unobserved native cancellation outcome.
The ownership-masked full-window running comparison measures
`0.0016256717651922281` under a 0.5% hard limit. This promotes
`thread.context-compaction` for the sampled manual lifecycle, while automatic
and work-mode compaction, cancellation outcome, and repeated compaction remain
separate gates. The thread summary panel is now independently sampled below.

The fifth `26.730.61309` disposable task used a single no-tool prompt, then
opened the 28×28 `Toggle summary` header action. At 1180×820 the resulting
thread-owned overlay is anchored 8px below the control at x=804/y=45 and
measures 300×199px with a 25px radius. It exposes an `Environment` section,
a 28px setup action, five 272×29px rows for Changes, Local execution, branch,
Commit/Push, and pull-request creation, plus the current +0/-0 delta and one
disabled action. The panel uses 14/21px weight-445 system typography on the
current dark 45/45/45 surface.

The independent public composition adds `ThreadSummaryPanel`, section, item,
delta, icon-button, and controlled/uncontrolled popover primitives. Browser/CDP
and Electron verify open/close, Escape focus return, section collapse, outside
dismissal, exact geometry, computed styles, and responsive viewport clamping.
The ownership-scoped 300×199 current-build comparison differs by
`0.028609715242881074`, below a 3% hard limit, and the full reviewed matrix now
covers 76 frames. This promotes `thread.context-summary` only for the sampled
Environment/Git workflow overlay; populated artifact/source sections,
light theme, pinned layout, and host mutations remain separate gates.

A `26.730.61639` isolated task then delegated one real long-running subagent,
observed its `working` and completed states, and opened the populated
`Subagents` summary, side-panel list, and nested transcript. CDP measurements
lock the 300×241 summary, 369.28px wide panel at 1180×820, 319px explicit
reopen with the sidebar at 820×680, and 329.31px overlay reopen after the
sidebar collapses at 720×680. The public trace maps the current
`collabAgentToolCall` lifecycle into one protocol-neutral subagent timeline;
Browser/CDP and Electron verify summary → list → transcript → back navigation,
responsive auto-close, explicit reopen, text, focusable controls, and computed
row typography/spacing. Nine reviewed frames bring the matrix to 102 scenes.
The three ownership-scoped current-build comparisons differ by
4.1812% for the summary, 1.3451% for the panel, and 1.5969% for the transcript,
all below their hard limits.
This promotes `thread.subagent-delegation` only for the sampled single-agent
success path. The independent `thread.subagent-collaboration` row now covers
two sibling agents and one Parent → Child delegation across running, mixed,
completed, summary, flat-panel, live-progress, and transcript states. It keeps
the public `agentPath` hierarchy without inferring a tree that the current UI
does not draw; the main conversation still renders Child and Parent activity
as separate hierarchy-ordered blocks. Browser/CDP covers 111 frames and nine
reviewed scenes gate ten current-build regions. Panel/summary/transcript ratios
range from `0.013328938694792354` to `0.046708160442600274`; the compact
text-heavy nested main-activity band passes at `0.11495227995758218` under its
independent 0.125 limit. Waiting-before-initialization, failure,
interruption/cancel, pagination, transcript streaming, and transport recovery
remain separate gates.

This is a measurement- and raster-backed basic thread/workspace slice, not a
claim that the whole application or every lifecycle is pixel-perfect. Broader
Markdown variants, unsampled host eviction heuristics and window sizes, code search,
other MCP and connector variants, thread-level retry recovery, approval
persistence and timeout, current-product binary/conflict reachability, PR
merge/review-submission states, direct-shell failure/restart semantics,
background agent-process reopening, and native Codex window behavior
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
