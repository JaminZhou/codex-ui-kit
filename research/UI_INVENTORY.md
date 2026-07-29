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

- Codex Desktop `26.721.41059` (`5848`)
- Sampled on 2026-07-26 and reverified on 2026-07-29
- `app.asar` SHA-256:
  `da39a51b06fb4c728d418b8f0f05fc8fd8c6b1f74c4fb4d47c20c7914a798f45`
- Computer Use automation: blocked by the environment safety policy for
  `com.openai.codex`
- Scoped CDP automation: available through a user-authorized second process;
  the Chromium profile is separate, but Codex application data and navigation
  are not fully isolated
- Current inventory: 63 surface groups; 43 have scoped runtime evidence, of
  which 29 include current-build structural evidence and 14 are previous-build
  only; another 20 remain `not_sampled`. Browser verification covers 22
  groups and Electron verification covers 19.

The current package exposes candidates far beyond the old transcript sample:
application and thread shells, local/remote conversation routes, projects and
workspace selection, PR review, editor diff, terminal, browser and artifact
panels, document previews, settings, MCP, plugins, skills, automations, remote
connections, and feature-gated surfaces.

The current CDP probe confirms loopback access, distinguishes the main
application-shell target from a second small application page, reaches the
new-chat destination/context setup plus the Project and Local environment
dialogs, and now revalidates the Pull requests index plus an aggregate
multi-file change/Review flow. It also measures the application-navigation
resize handle and its 240–520px range, the independent Review-panel resize
track, and one public PR's Summary, Timeline, and Code views. The broader
queue, Sources, Sites, Scheduled tasks, Plugins, Skills,
and Settings samples were recorded on `26.715.72359`. Those entries remain
`runtime_observed` with build-scoped evidence, but they do not satisfy the
current-build verification gate until reached again. The seed list is not an
exhaustive denominator: newly observed routes, variants, and cross-layer
transitions must add or split IDs.

## Priority

### P0: establish the real product skeleton

- Application shell, projects index, new-thread and workspace selection.
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

## Current implementation slice

The first P0 shell slice provides independently implemented `AppShell`,
`AppSidebar`, and `WorkspacePanel` compositions. It covers the measured wide
sidebar/side-panel/bottom-panel tracks, controlled landmarks and tab semantics,
an accessible 16px pointer/keyboard navigation resizer with current-build
240–520px clamps, and container-responsive overlay transitions that keep the
right panel inside medium and narrow viewports.

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

The current new-chat slice adds `NewConversationStart`,
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

The narrow `conversation.destination`, `conversation.context-controls`, and
`app.new-thread-workspace-selection` slices are current-build Browser and
Electron verified. Their implementation remains `partial` because the probe
does not establish Remote destination behavior, real project option contents,
creation workflows, or persistence. The broader project index, environment
settings, and worktree settings families remain partial, as does the legacy
host-defined route selector. Exact current-build PR review-detail behavior
remains `not_sampled`, so the generic review components do not establish
product parity. Native application-shell composition and the remaining P0
conversation/workspace variants also remain open. Final
H5/Electron visual unification is intentionally deferred until coverage
stabilizes.

The current-thread slice adds `ConversationThreadShell`, which composes the
existing header, scroll-following timeline, messages, and Composer into one
responsive public surface. Its current-build contract locks the 46px header,
768px outer thread column, 736px wide Composer card, 16px responsive insets,
98px multiline Composer, 28px submit/Stop control, user/assistant alignment,
completed assistant actions, and the measured user-to-assistant turn gap.

The H5 showcase verifies those relationships in Chromium at 1440×1000 light
and dark plus 820×680 compact light. The Electron acceptance flow verifies the
same composition in real 1180×820 and 820×680 BrowserWindows, including
top/bottom timeline positioning and the running Stop state. A separate
main-only dark fixture accepts a current-build PNG reference through
`CODEX_UI_KIT_THREAD_REFERENCE` and gates the full image plus the header,
message band, and Composer regions independently. The sampled completed state
matches all measured region geometry and stays below a 0.5% full-image raster
delta at the strict 0.05 pixel threshold.

The visual gate is now scenario-driven. A second external reference supplied
through `CODEX_UI_KIT_THREAD_STREAMING_REFERENCE` covers a current-build
running reply and 28px `Stop` control. It locks 14/22px running text, the 736px
reply/Composer columns, and the 736×98 Composer card. Its declared mask omits
only the workspace-owned Environment control from the thread-owned
comparison; the remaining full raster and header/message/Composer regions
stay independently bounded.

Three more current-build scenarios cover an expanded read-only command,
a pending command approval, and an applied file card with the Review panel
open. The command and approval remain turn-owned. The file scenario explicitly
splits its 666px conversation region from the independent 406px
workspace-owned Review panel, and its regional checker accepts optional
horizontal bounds so those owners are gated separately.

The workflow fixture extends `FileChange` with a host-owned leading indicator
slot and composes the existing `ActivityTimeline`, `CommandExecution`,
`ApprovalRequest`, `ConversationThreadShell`, `WorkspacePanel`, and `FileDiff`
primitives. Current-build Browser evidence plus the existing real
BrowserWindow acceptance promote the sampled command and approval states.

The protocol-backed Codex App playground now exercises command execution, a
real App Server approval request/response, the applied turn-owned file card,
and the host-owned Review split in a real BrowserWindow. CDP locks the named
surface geometry and computed layout, Electron acceptance closes and reopens
the Review panel, and reviewed pixels gate the five workflow frames. Paired
with the existing current-build captures, this promotes the sampled file card,
Review side-panel, and editor diff to Electron-verified. They remain
implementation-partial because broader content and error variants remain
open.

The multi-file slice adds public `FileChangeGroup` and `FileReview`
components. A protocol-backed two-file trace renders one aggregate
`Edited 2 files` card with group-level Undo/Review and stacks both independent
diffs in the workspace panel. CDP requires one card, two file rows, two Review
sections, exact focus labels, valid split geometry, and no horizontal
overflow. Electron drives close, file-specific reopen, group reopen, and
Undo, then repeats the geometry assertions in a real 800×600 BrowserWindow.
An optional 906×820 current-build raster gate compares the whole main region
and its 536px conversation/370px Review ownership regions separately. This
promotes `workspace.multi-file-review` to Browser- and Electron-verified while
remaining implementation-partial for mixed change kinds and broader real
PR-review variants.

The large-Review acceptance slice expands the deterministic public-protocol
fixture to eight files and 96 addition lines. Its Review region must overflow
internally, and selecting the eighth file must scroll that exact section fully
into view in both CDP and a real `BrowserWindow`. A thirteenth reviewed
full-frame pixel baseline guards the resulting layout. This validates large
file-set rendering and selection scrolling in the independent implementation;
it is not current-build evidence for an eight-file product state.

The Pull request detail slice adds a controlled, resizable workspace panel
with a public `PullRequestPanelSummary`, an icon-capable PR list row, and
Summary, Timeline, and Code tabs. CDP asserts the measured 352px index, 554px
detail, 16px separator, 320px panel minimum, 352px retained main track, and
expand/restore lifecycle. Electron drives pointer and keyboard resizing,
tab changes, comment entry, and full-panel expansion in a real
`BrowserWindow`. A fourteenth reviewed baseline covers the whole integration,
while an optional 906×820 current-build gate compares the index and detail
regions separately. This promotes `workspace.pull-request-route` and
`workspace.pull-request-review` to Browser- and Electron-verified for the
sampled public PR path; merge execution, review submission, loading/failure
states, and broader PR variants remain outside this slice.

The Terminal slice completes the bottom-panel interaction contract for the
sampled current build. Scoped CDP measured a 272px default bottom panel, 152px
minimum, half-height responsive maximum, 16px drag strip, 33px tab header,
239px content region, named tab/tabpanel, and `Terminal input`. The independent
`AppShell` adds controlled or uncontrolled pointer and Arrow/Home/End resizing
with accessible separator values, while `TerminalTranscript`,
`TerminalPrompt`, and `TerminalSession` keep output, input, and process status
protocol-neutral and host-owned.

The pinned public App Server client supplies `processId`, command output, and
`item/commandExecution/terminalInteraction` to a deterministic background
terminal trace. CDP gates the standard geometry and semantics across 15
frames. Electron drives pointer and keyboard resizing, local input submission,
close/restore, and 820×680 compact geometry. The reviewed pixel baseline also
accepts an optional 906×820 current-build reference; the accepted sample
differs by 1.2791% in the full Terminal panel and 0.7288% in its content at the
strict 0.05 threshold. Whole-main pixels are reported but not promoted because
the synthetic protocol conversation intentionally differs from the observed
product conversation. Multi-tab lifecycle, shell creation/termination,
background-process enumeration, failure recovery, and persisted panel state
remain outside this slice.

The compact tool/recovery slice splits the former combined
`thread.search-tool-mcp-events` candidate into independent search, Browser, and
MCP tool-event rows. Current-build CDP evidence promotes completed web search
and Browser activity, while the unsuccessful GitHub request is tracked
separately as `thread.tool-unavailable-recovery`: it proves the visible
assistant recovery message, not an MCP call. `BrowserActivity` supplies a
protocol-neutral completed/running/failed disclosure with ordered browser
steps, and the Electron playground exercises that public component without
claiming exact compact-window parity.

Four external 526×600 main-only references now gate completed web search,
expanded Browser steps, unavailable-MCP recovery, and a failed exit-code-7
command. The Browser fixture explicitly represents the sampled
auto-follow/scroll position. Search, unavailable recovery, and failed-command
geometry remain independent, so a passing plain assistant fallback cannot
promote MCP tool rendering and a failed command cannot promote thread-level
render/retry recovery.

The successful-MCP slice now samples a real read-only
`openaiDeveloperDocs` run on build `26.721.41059`. Current-build CDP records
the completed answer, the `Worked for 54s` disclosure, the
`Used OpenAI Developer Docs integration` group, and its three Search plus two
Fetch calls. The public App Server trace uses only schema-validated
`mcpToolCall` start, progress, result, and completion fields.
`McpToolCallGroup` composes the integration disclosure while
`ToolCallCard` renders each call. CDP locks the 14px/21px hierarchy and 25px
call rows; Electron expands the duration, group, and structured result; two
reviewed lifecycle frames cover running and completed states. An optional
906×820 current-build pixel gate limits the full main region to 3%, the tool
region to 4%, the answer region to 4%, and the Composer region to 2.5%. This
promotes only the sampled public-docs success path; authentication,
elicitation, approvals, failures, other connectors, and mixed MCP results
remain open.

The long-thread continuity slice adds the current-build default ten-message
threshold and measured 36×10 rows to `ThreadMessageNavigationRail`, exposes
the rail and 32×32 latest-message control as overlay slots on
`ConversationThreadShell`, and adds `ThreadInterruptionSummary` plus
`ThreadContextEvent`. Five external references independently gate medium
message navigation and compact scroll-away, interrupted, context-running, and
context-completed states. Their full-image deltas are 1.8139%, 2.9354%,
3.2975%, 3.6442%, and 3.4328%, with all named geometry and header/thread/
Composer regional limits passing.

Current runtime evidence also records that the product's long-thread viewport
uses reverse-origin scrolling (`scrollTop = 0` at latest, negative away from
latest). The public package keeps the actual windowing and scroll algorithm
host-owned. Browser and Electron acceptance exercise the placeholder,
navigation, and follow contracts but not reverse scrolling or windowing, so
the virtualization row remains `partial_legacy`. The interruption acceptance
renders the observed summary statically rather than driving a host
run-to-stop-to-summary transition, so that row also remains `partial_legacy`.
The current error/retry state was not safely reached and remains a separate
unpromoted gate. Compaction acceptance statically renders the observed running
and completed states rather than driving their host transition, so
`thread.context-compaction` also remains `partial_legacy`; it does not promote
the still-unreached thread summary panel.

This is a measurement- and raster-backed basic thread/workspace slice, not a
claim that the whole application or every lifecycle is pixel-perfect. Broader
Markdown variants, the exact host virtualization algorithm, code search,
other MCP and connector variants, thread-level retry recovery, approval
persistence and timeout, mixed multi-file change kinds, PR
merge/review-submission states, Terminal multi-tab and
process-creation/termination lifecycles, and native Codex window behavior
retain their own inventory gates.

The current Markdown slice revalidates one synthetic completed response on
build `26.721.41059`. CDP records semantic heading, paragraph, link, inline
code, quote, list, table, fenced-code, and action/copy controls together with
their computed styles. The protocol replay adds a sixteenth deterministic
frame; Browser and Electron gates verify external-link semantics, code-copy
behavior, the four completed-response actions, 736px content geometry, and
the measured scroll clearance above the 736px Composer. A main-only 906×820
reference compares assistant, code-card, and Composer ownership regions
independently. This promotes only the sampled completed Markdown vocabulary;
nested lists, task lists, images, math, citations/sources, very large tables,
streaming Markdown mutation, and error variants remain open.
