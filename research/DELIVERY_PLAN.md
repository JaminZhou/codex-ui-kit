# Delivery plan

This plan turns the current component foundation into a broad, evidence-backed
Codex-style application surface. It does not treat a passing test suite, a
single screenshot, or a generic primitive as product-level parity.

The machine-readable surface denominator remains
[`ui-inventory.json`](ui-inventory.json). This plan defines delivery order and
exit gates; it does not replace the inventory.

## Current position

- The current installed package is Codex Desktop `26.727.40816` (`6067`).
- The inventory contains 75 surface groups: 48 P0, 18 P1, and 9 P2.
- 22 groups have current-build runtime evidence, 34 have previous-build-only
  runtime evidence, and 19 have not been sampled.
- The current-build refresh covers all six left-sidebar groups, window
  navigation, route loading/restoration, the New chat Composer and project
  picker, the read-only Terminal shell, and the public Pull request route.
  The PR lifecycle now follows the two-tab Summary/Code contract with Timeline
  integrated into Summary, successful read-only Code content, Auto-merge, and
  responsive detail restoration. Its independent state machine adds
  index/detail loading and failure, checks, comments, review submission,
  merge-readiness, merge completion, compact layout, and route restoration.
  Together the playground gates cover 58 CDP/pixel frames, and the refreshed
  PR detail passes the current 906×820 regional pixel gate. The refreshed
  real MCP success path now matches Search → Fetch, the integrated activity
  disclosure, computed typography, and a current regional pixel gate. MCP
  failure recovery, full Composer queue/Stop lifecycle, Terminal
  multi-tab/process behavior,
  Review rename/delete variants, and broader shell evidence from
  `26.721.81911` remain historical regression evidence until re-observed. The
  current project-named single Terminal tab and close/add controls now pass
  independent Browser, Electron, and regional pixel gates.
  Global notification runtime evidence, light-theme shell evidence, exact
  current-build long-thread virtualization, real current-product Terminal
  process execution/persistence, current-product review submission and
  mutating comment/merge transitions, and the remaining Markdown, tool, and
  attachment variants remain on their recorded evidence levels.
- Existing Browser and Electron results remain useful regression evidence, but
  they are `partial_legacy` until the affected surface is re-observed on the
  current build.
- The React package has a mature conversation/workflow foundation and a
  protocol-backed full-app playground. It is not yet a complete desktop
  reconstruction.

## Definition of done

A surface can move through the following gate only in order:

1. **Current-build evidence**: freeze version, build, ASAR fingerprint, and
   Chromium version; reach the surface in the running application.
2. **Observed contract**: record ownership, trigger, container, states,
   transitions, accessibility semantics, geometry, and computed styles.
3. **Public state contract**: model the surface without private IPC or
   extracted application code.
4. **Independent UI**: implement the reusable component or host composition.
5. **Replay acceptance**: exercise deterministic data and lifecycle states.
6. **Browser/CDP acceptance**: verify semantics, keyboard behavior, geometry,
   responsive behavior, and computed styles.
7. **Electron acceptance**: drive the same lifecycle in a real
   `BrowserWindow`.
8. **Regional pixel gate**: compare only like-owned regions, with explicit
   masks and hard thresholds.
9. **Live App Server acceptance**: require a real public-protocol path when the
   surface depends on App Server behavior.

`implemented`, `browser_verified`, and `electron_verified` remain separate.
No surface becomes product-level complete merely because one fixture passes.

## Workstreams

### 0. Refresh the current baseline

The application updated after the previous current-build gates. Before adding
new parity claims:

- capture the current main Renderer target by URL, area, and application-shell
  landmarks rather than selecting the first CDP page;
- record Chromium, main viewport, theme, compact viewport, and shell
  measurements;
- re-observe the shell, left sidebar, conversation, Composer, Review, Terminal,
  Markdown, and MCP anchors;
- retain previous-build results as regression fixtures while promoting only
  surfaces re-observed on `26.727.40816`;
- update inventory evidence prefixes and the current build note.

Exit: the current build has a reproducible CDP capture recipe and no
`verified` status relies solely on a previous build.

### 1. Complete the application shell and left sidebar

The left sidebar is a P0 application-owned system, not one generic navigation
slot. It is split into:

- `app.sidebar-shell`: width, resize, collapse, overlay, focus restoration,
  scroll ownership, and wide/medium/narrow transitions;
- `app.sidebar-primary-navigation`: New chat and global destinations, active
  route, badges, and route restoration;
- `app.sidebar-project-navigation`: project/workspace sections, expansion,
  selection, long names, overflow, and worktree context;
- `app.sidebar-thread-history`: recent tasks, grouping, pinning, running,
  queued, unread, error, empty, loading, and long-list states;
- `app.sidebar-item-actions-status`: hover/focus actions, context menu,
  rename/archive/delete affordances, status indicators, and keyboard access;
- `app.sidebar-footer-account-settings`: account, settings, update/status, and
  footer overflow behavior.

The same workstream also covers shell gaps that otherwise distort every
feature:

- native-window/titlebar spacing, drag and no-drag regions, top controls, and
  traffic-light-safe insets;
- route outlet loading, empty, failure, offline, reconnect, and stale-data
  states;
- global toast/banner/status feedback and command/shortcut surfaces;
- selection persistence across route, project, thread, and window-size
  changes;
- portal layering and focus return across sidebar, workspace panels, dialogs,
  menus, and notifications.

Acceptance matrix:

| Axis | Required states |
| --- | --- |
| Width | wide split, medium constrained split, narrow modal sidebar |
| Theme | light and dark |
| Content | empty, normal, long names, dense history, overflow |
| Lifecycle | loading, selected, running, queued, unread, error, restored |
| Input | pointer, keyboard, focus-visible, Escape, resize keys |
| Evidence | current CDP styles, Browser, Electron, regional pixels |

Exit: all six sidebar IDs have current-build evidence and an explicit status;
the shell remains usable without horizontal overflow at the compact gate.

### 2. Finish conversation and Composer lifecycle

- successful, failed, cancelled, unavailable, and retried MCP/tool calls;
- search, browser, command, file, approval, and subagent events in one
  multi-turn thread;
- interruption, retry, compaction, context summary, message navigation,
  virtualized history, scroll-away, and scroll-follow behavior;
- Composer queue, attachments, modes, permissions, environment/worktree
  context, long input, disabled/submitting/Stop states, and recovery.

The first slice after the sidebar should be a real MCP failure/unavailable/retry
flow followed by a mixed multi-turn replay. This prevents the successful MCP
slice from becoming the only integration denominator.

Exit: every P0 turn/thread lifecycle has a deterministic replay, current-build
structural evidence, Browser acceptance, and Electron acceptance.

### 3. Complete coding workspace workflows

- projects index and workspace/worktree creation, switching, repair, and
  persistence;
- single- and multi-file changes, large diffs, binary/rename/delete/conflict
  variants, Undo, Review, and selection synchronization;
- Terminal sessions, multiple tabs, background/running/failed processes,
  input, close/restore, and compact layout;
- Pull request index/detail, loading/failure, checks, reviewers, comments,
  review submission, merge-readiness, and route restoration;
- side, bottom, expanded, stacked, and compact panel compositions.

Exit: a protocol-backed coding task can travel from project selection through
command, approval, file review, terminal, and PR review without fixture-only
state jumps.

### 4. Add P1 resource and integration surfaces

- Browser and artifact panels;
- image, notebook, PDF, Office, and document previews;
- environments and remote connections;
- Settings shell, search, appearance, Git/hooks/review preferences;
- MCP servers, plugins, skills, and automations, including unavailable and
  permission states.

P2 surfaces remain scope decisions until runtime reachability is confirmed.

Exit: each in-scope P1 family has a documented ownership boundary and at least
one end-to-end vertical slice.

### 5. Validate the full-app playground

The existing private `playgrounds/codex-app` remains inside this repository so
it can validate both `codex-ui-kit` and
`@jaminzhou/codex-app-server-client` without putting Electron or transport
dependencies in the public root package.

- deterministic replay remains the CI default;
- live local mode validates signed-in public App Server behavior;
- renderer state remains protocol-neutral and sanitized across preload IPC;
- one full application route composes sidebar, conversation, Composer,
  workspace panel, global overlays, and status feedback;
- failures in either repository are attributable to protocol mapping, host
  lifecycle, or UI contract rather than hidden fixture behavior.

Exit: the demo can reproduce a complete coding workflow in replay and live
local modes with the same UI state model.

### 6. Perform global visual convergence

Fine visual tuning comes after structural coverage stabilizes:

- typography, color roles, icons, radii, borders, shadows, spacing, and motion;
- wide/compact and light/dark matrices;
- stable computed-style assertions for named surfaces;
- regional pixel thresholds by ownership, plus a small whole-window
  diagnostic threshold;
- current-build refresh protocol so an app update downgrades affected gates
  without discarding independent regression fixtures.

Exit: every in-scope P0 surface and selected P1 integration has current-build
regional pixel evidence, not only a visually plausible showcase.

### 7. Prepare public release

- freeze and document the public component/state contracts;
- complete examples, accessibility notes, compatibility, migration guidance,
  and provenance boundaries;
- test React 18/19, SSR, bundler, NodeNext, Electron, demo, and package export
  consumers;
- define pre-1.0 versioning and the first npm publication checklist;
- keep extracted assets, private IPC, credentials, and proprietary references
  outside the repository and package.

Exit: package publication can be approved as a separate release decision
without confusing package readiness with full product reconstruction.

## Planned pull-request sequence

1. **Plan and evidence reset**: record the new package baseline, split the
   sidebar inventory, publish this roadmap, and prevent count drift.
2. **Current sidebar parity**: fresh CDP capture, sidebar state contract,
   full-app playground scene, Browser/Electron interaction, and regional pixel
   gates.
3. **Tool recovery and mixed thread**: real MCP failure/unavailable/retry plus
   a multi-turn command/approval/file/tool composition.
4. **App shell continuity**: window chrome, global feedback, loading/error/
   offline states, route and selection restoration. The independent replay and
   gates are implemented; current-build evidence covers window chrome,
   loading, and in-session route restoration, while unsafely unreachable
   recovery/notification states remain explicitly synthetic.
5. **Conversation and Composer lifecycle**: real current-build Composer,
   Stop, queue/pause/Resume, permissions/add-menu evidence; deterministic
   long-thread navigation/windowing; Browser/CDP, Electron, and regional
   current-build pixels.
6. **Coding workspace entry**: current project/context entry plus independent
   project → environment/worktree → command → approval → Review → Terminal →
   PR acceptance.
7. **Review content variants**: current delete and rename/no-content evidence,
   public rename/delete/binary/conflict replay, selection synchronization, and
   Undo.
8. **Terminal session lifecycle**: current multi-tab/close/picker/compact
   evidence plus independent running/failed/exited processes, per-session
   input, close-all/restore, and process reopening.
9. **Pull request lifecycle**: delivered for the public component contract and
   deterministic Browser/Electron/pixel gates: index/detail loading and
   failure, checks, reviewers, comments, review submission, merge-readiness,
   merge completion, responsive non-modal panel composition, and route
   restoration. Current-product evidence remains deliberately read-only.
10. **Remaining P0 turn/tool gaps**: long command output and truncation,
    approval denial/timeout/persistence, attachment lifecycle, Markdown
    mutation/large content, subagents, and transport recovery.
11. **P1 resources and integrations**: Browser/artifact/document previews,
    environments, remote connections, Settings, MCP, plugins, skills, and
    automations, each with one end-to-end vertical slice.
12. **Full-app validation and global convergence**: replay/live App Server
    attribution, dark/light and wide/compact matrices, current-build regional
    pixels, public contract freeze, compatibility matrix, and release
    checklist.

Each PR uses the same merge gate: current-head CI green, a fresh clean bot
result after the latest push, zero unresolved review threads, squash merge,
branch cleanup, and post-merge CI verification.

## Planning rules

- Split an inventory ID whenever independently owned states or transitions can
  pass and fail separately.
- Do not promote evidence from an older installed build to the current build.
- Do not copy bundled Renderer source, CSS, assets, fonts, or private service
  details.
- Keep the root package React-only; Electron and App Server integration remain
  in private playgrounds.
- Correctness, state coverage, responsiveness, and accessibility precede the
  final visual-polish pass.
