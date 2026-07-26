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
- Sampled and runtime-probed on 2026-07-26
- `app.asar` SHA-256:
  `da39a51b06fb4c728d418b8f0f05fc8fd8c6b1f74c4fb4d47c20c7914a798f45`
- Computer Use automation: blocked by the environment safety policy for
  `com.openai.codex`
- Scoped CDP automation: available through a user-authorized second process;
  the Chromium profile is separate, but Codex application data and navigation
  are not fully isolated
- Current inventory: 58 surface groups; 33 have scoped runtime evidence, of
  which 12 include current-build structural evidence and 21 are previous-build
  only; another 25 remain `not_sampled`

The current package exposes candidates far beyond the old transcript sample:
application and thread shells, local/remote conversation routes, projects and
workspace selection, PR review, editor diff, terminal, browser and artifact
panels, document previews, settings, MCP, plugins, skills, automations, remote
connections, and feature-gated surfaces.

The current CDP probe confirms loopback access, distinguishes the main
application-shell target from a second small application page, and reaches the
new-chat destination/context setup plus the Project and Local environment
dialogs. The broader command, queue, Markdown, Sources, terminal, Review, Pull
requests, Sites, Scheduled tasks, Plugins, Skills, and Settings samples were
recorded on `26.715.72359`. Those entries remain `runtime_observed` with
build-scoped evidence, but they do not satisfy the current-build verification
gate until reached again. The seed list is not an exhaustive denominator:
newly observed routes, variants, and cross-layer transitions must add or split
IDs.

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
and container-responsive overlay transitions that keep the right panel inside
medium and narrow viewports.

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
product parity. Native application-shell composition, panel resizing, and the
remaining P0 conversation/workspace variants also remain open. Final
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
BrowserWindow acceptance promote the sampled command, approval, and turn file
card states. The Review side-panel/file-diff composition is Browser-verified
but remains Electron-partial until that exact cross-owner split is added to
the Electron acceptance surface.

This is a measurement- and raster-backed basic thread slice, not a claim that
the whole application or every thread lifecycle is pixel-perfect. Markdown
variants, virtualization, cancellation results, search/MCP/browser tools,
approval persistence and timeout, multi-file review, failure states, and
native window behavior retain their own inventory gates.
