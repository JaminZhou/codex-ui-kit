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
- Current inventory: 56 surface groups; 30 have scoped runtime evidence, of
  which 3 include current-build structural evidence and 27 are previous-build
  only; another 26 remain `not_sampled`

The current package exposes candidates far beyond the old transcript sample:
application and thread shells, local/remote conversation routes, projects and
workspace selection, PR review, editor diff, terminal, browser and artifact
panels, document previews, settings, MCP, plugins, skills, automations, remote
connections, and feature-gated surfaces.

The current CDP probe confirms loopback access and distinguishes the main
application-shell target from a second small application page. The broader
blank-chat, command, queue, Markdown, Sources, terminal, Composer, Review,
Environment, Pull requests, Sites, Scheduled tasks, Plugins, Skills, and
Settings samples were recorded on `26.715.72359`. Those entries remain
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
`ConversationRouteSelector`, and `WorktreeList`. It composes the
application-owned project list with an explicit local/remote/ChatGPT route
choice and workspace-owned checkout selection. The controls remain
protocol-neutral and every privileged operation stays host-owned. The H5 and
Electron showcases exercise project, route, and worktree transitions in split
and compact stacked layouts.

All affected inventory entries remain `partial`. The current-build probe
establishes only the global Projects entry and de-identified list structure;
it does not expose the exact project contents or local/remote/ChatGPT
conversation transitions. Worktree comparison remains `partial_legacy`
because its runtime evidence is from `26.715.72359`. Exact current-build PR
review-detail behavior remains `not_sampled`, so the generic review components
do not establish product parity. Native application-shell composition, route
persistence, panel resizing, and the remaining P0 conversation/workspace
variants also remain open. Final H5/Electron visual unification is
intentionally deferred until coverage stabilizes.
