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

- Codex Desktop `26.825.51511` (`7377`)
- Package and scoped shell lifecycle sampled on 2026-08-30
- `app.asar` SHA-256:
  `f56ac8d5254a10fc4a04e7417fa787d135c3bbca49bad7d668d4ae65833d40c7`
- Computer Use automation: blocked by the environment safety policy for
  `com.openai.codex`
- Scoped CDP automation: available through a user-authorized second process;
  the Chromium profile is separate, but Codex application data and navigation
  are not fully isolated
- Fresh current-build Renderer evidence covers the New chat shell,
  1180×820 and 820×680 shell, the exact 721→720 boundary where the sidebar now
  remains visible, explicit Hide/Show, Pull requests selection and return to
  New chat, current Composer geometry, zero horizontal overflow, and stable
  sidebar scroll ownership. Structural target ranking excludes the avatar
  overlay without using private text. The exact `scrollHeight` remains
  content-dependent, so the contract locks the unique scroll owner and visible
  geometry rather than private task counts. It revalidates the 320px Help menu
  and content-dependent Projects Index. The sidebar is now 321.875px wide;
  the collapsed 600px Projects route remains 559px with 415/128 columns.
  Explore is present and `Sites` is absent from the sampled fixed-route stack.
  Details are in
  [`26.825.51511.md`](26.825.51511.md). Rich Markdown streaming, Plan progress,
  and long-thread navigation are current on 26.825.51511; activity and
  Search/Browser follow-ups remain 26.825.31414 regression evidence. That
  previous activity follow-up re-observes the 14/21px
  cadenced `Thinking` label with its 38.5% base and 75% sweep, plus
  collapsed/expanded `Worked for` and `Ran …` command rows. The tight
  previous-product `Thinking` comparison passes at 0.6%. The current Plan
  follow-up shows that simple ordinary and Plan-mode prompts may settle without
  progress, while a complex read-only audit still reaches `Step 5 / 8`, the
  Composer-dock chip, 95.578125×200px hover card, all-complete removal, and the
  settled answer. The replay retains its accessible button and tooltip roles
  even though the sampled product now exposes nonsemantic `div`/`span`
  containers. CDP/Electron continue to gate the lifecycle and the tight
  current-product comparison passes at 3.5294%. Broader reasoning remains
  incomplete. A separate current read-only Search/Browser probe covers the
  two-level Web Search disclosure, the generic MCP-backed Browser activity
  group, and the
  419.59375px one-tab Browser workspace. CDP gates six frames; Electron repeats
  both open lifecycles and collapse/reopen. The local-only Search, Browser
  activity, and Browser-chrome comparisons pass at 10.32%, 8.45%, and 2.80%.
  External page content is explicitly source-owned and excluded. Multi-tab,
  authentication, download, permission, history, and page error states remain
  incomplete.
  The same-build follow-up now also covers the six-item Account menu across
  Dark/Light and wide/compact states, the 22-row Settings rail, General,
  Appearance, and a naturally completed basic turn across 1180, 721, and
  720px widths. Other feature-state and lifecycle captures remain
  previous-build evidence until recaptured.
- A previous 26.820 route-continuity probe locks Projects → Back → Forward
  location restoration, x=88/120/152 titlebar controls, `opacity: 0.4`
  unavailable navigation, 720px pinned continuity, explicit Hide/Show, and
  1180px restoration. Browser/CDP and Electron also preserve a selected
  project chat across Back/Forward. Local-only current-product comparisons pass
  at 2.6428% for the titlebar, 4.9332% for Create, and 0.3054% for the masked
  Projects route. The fresh profile's unified source omitted Pull requests, so
  that fixed-entry drift remains source-scoped rather than being relabeled as
  an ASAR change.
- The previous 26.818 New chat home sample covers the sampled Dark and Light product
  preferences at 1180×820 and 720×680. It locks the persisted 322.90625px
  sidebar, 56px mark, four wide/two compact prompt cards, exact five SVG
  sources, prompt-to-Composer selection, project-dialog portal and focus
  return, and zero compact overflow. Four unmasked owned-main comparisons pass
  between 0.2708% and 1.7855% under a 2.5% hard limit; the product preference
  was restored to System after capture.
- The current 26.825 Account-menu sample covers Dark and Light at 1180×820 and
  720×680. It locks the 321.875px sidebar, 305.875×188.375px portalled menu,
  six weight-400 items, zero compact overflow, Escape dismissal, trigger focus
  return, and restoration to System. The account trigger width remains
  content-dependent and is gated by inset, height, footer position,
  containment, and a minimum usable width. The previous 26.820 privacy-masked
  product comparisons remain regression evidence; current raw account
  screenshots remain local-only.
- The project action menu remains on the frozen
  `electronBridge.showContextMenu` path. The independent replica now locks the
  current provider separately from the rendered AppKit composition. The
  provider contains Section and Reveal; the sampled native layer filters
  Reveal and renders six actions in a 252×187 window. Section opens the one-row
  118×34 `New section…` submenu. The exact 16×16 Section source, conditional
  unread variant, ArrowRight/ArrowLeft/Escape lifecycle, two reviewed frames,
  and local-only 3.8155%/6.9542% unmasked region comparisons are current.
- The current 26.825 fixed-message task revalidates the sampled completed
  conversation shell. It locks the 736×98 Composer at 1180×820, the exact
  721px open/720px collapsed boundary, 14/22.75px message typography, the 22px
  user bubble, the separate project/title header composition, four exact
  response actions, and all five Composer targets. Three reviewed baselines
  and nine local-only product regions pass independent 7% header, 0.6% thread,
  and 1% Composer limits. The prior 26.818 0.4320% crop remains regression
  evidence.
- The current 26.825 thirty-turn task refreshes the responsive
  virtualization/navigation evidence. Wide mode exposes the 30-button
  36×10px rail, 12 mounted turns, message-15 materialization at
  `scrollTop = -2394`, and the viewport-derived message-11 current marker.
  Compact mode hides the rail at zero content offset and retains nine mounted
  turns at `scrollTop = -968`. Both widths now expose the observed two-stage
  return: the first click lands at `-402` with message 28 selected, and the
  second reaches latest with eight mounted turns and hides the floating
  control. Browser/CDP and Electron repeat both flows; local-only structural
  comparisons pass at 1.5731% and 1.3954% under 2% limits. The previous
  26.820 stale message-30 marker remains historical drift evidence.
- The current 26.825 command tasks revalidate an 8-second success, an exact
  exit-code-7 acknowledgement with same-thread recovery, and a stopped
  120-second loop with a second same-thread recovery. The current Renderer uses
  neutral noninteractive `Ran …` rows for both exit 0 and exit 7, hides Shell,
  output, and exit-code cards while the protocol retains output/exit code, and
  uses a square `Background terminal stopped with …` row after interruption.
  The sampled interruption changes from `You stopped after 0s` to a 20-second
  settled duration; that one timing is not generalized. Browser/CDP covers nine
  frames, Electron repeats wide/compact states, and unmasked current-product
  regions pass at 1.2761% current failure recovery, 4.9372% stopped,
  and 2.0661% compact recovery under independent hard limits.
- A fresh `26.818.41509` MCP slice reaches a real OpenAI Developer Docs
  Search → Fetch success and an invalid-URL Fetch → Search → Fetch recovery.
  It also records the 300×189 pinned Sources summary, its 316px layout
  ownership, the pinned → floating → outside-dismissed → repinned lifecycle,
  and the 720×680 recovery card. Browser/CDP and Electron repeat those states.
  Unmasked sampled-product regions pass at 2.1854% for success, 1.1649% for
  compact recovery, and 2.5926% for Sources under independent hard limits.
- A fresh `26.825.31414` no-tool Markdown task reaches a semantic heading,
  strong text, inline code, a real public external link with favicon,
  blockquote, list, a two-column table, a TypeScript code block, one rendered
  double-dollar equation, and one literal single-dollar equation. Browser/CDP
  and Electron lock the 736/688px roots, 14/22.75px typography, table alignment,
  code language/action icons, word-wrap and Copy interactions, four exact
  response actions, KaTeX plus MathML semantics, and zero horizontal overflow.
  The unmasked current-product response-root comparison passes at 1.3292%
  under an independent 2% hard limit. The prior 26.818 Markdown slice remains
  regression coverage rather than current evidence.
- A previous 26.820 no-tool follow-up reaches one double-dollar block equation
  and records the current 736/687px response roots and 14/22px computed
  typography. Single-dollar math, the escaped heading/image source, and
  footnote reference/definition remain literal in both sampled replies. The
  installed renderer source separately confirms KaTeX 0.16.45, image grouping,
  immersive preview, loading/unavailable fallbacks, and render retry. The
  independent wide/compact replay verifies KaTeX/MathML semantics, 200px loaded
  media, a 96px unavailable external-source link, real pointer preview and
  focus restoration in Browser/CDP and Electron, plus two reviewed internal
  pixel baselines. That historical reachability gap is now superseded by the
  current media slice below.
- A current 26.825 media follow-up reaches a public 48×48 favicon, a disabled
  96×96 unavailable state, and the pointer-opened immersive preview. Five
  Browser/CDP frames and five Electron flows cover wide/compact geometry,
  empty preview payload, caption, Close, zoom, body lock, and focus return.
  Five reviewed baselines and five local-only product comparisons pass: four
  response roots differ by 0.0197–1.2369%, while preview-owned regions remain
  at or below 3.4912%.
- The previous 26.818 sidebar task reaches sampled project-task and Recents hover actions
  plus active, completed, and unread ordinary states. Both task families use
  19×20 Pin/Archive controls with an 8px gap and 35px/8px right insets. The
  20×20 status rail owns the exact 16×16 spinner and centered 8×8 blue dot.
  Browser/CDP and Electron pass; privacy-safe action/status tail comparisons
  pass between 0% and 3.1944%. Recents row count and text remain
  content-dependent rather than frozen.
- The broader `26.810.52044` Review and Settings,
  waiting/error sidebar variants, and exact-asset results remain
  previous-build regression evidence.
  They are not relabeled as current merely because the shell capture passes.

The current Keyboard shortcuts and Voice follow-up splits the former combined
candidate into independently owned `settings.keyboard-shortcuts` and
`settings.voice-dictation` groups. It records the 129-row shortcut catalog,
search/edit/capture and sticky-scroll lifecycle, plus microphone, nine-voice
picker, screen-context, hotkey, dictionary, recording, wide/compact and
bottom-scroll states. CDP geometry, controlled Electron interaction, ten
reviewed replay baselines, and seven local-only full-window product comparisons
now gate those two groups. The host supplies Voice artwork; only that artwork
region is masked in the picker comparison.

The same current build now independently promotes Usage & billing and its
embedded View plans route. The Usage shell records the plan and credits cards,
three limit meters, reset/cancellation sections, 768px and 358.125px columns,
and top/bottom reachability. The host-owned plan surface records Personal and
Business, 5x/20x and annual/monthly selectors, the two-column wide layout, and
the 720px Pro-first stack. Checkout, gifting, external billing, and purchase
effects remain callbacks owned by the host. CDP, Electron, seven reviewed
replay baselines, and seven local-only current-product comparisons gate the
slice. The Usage comparisons exclude only the translucent 321.875px native
Settings rail; plan comparisons are unmasked full-window frames.

Current inventory: 91 surface groups; 49 have current-build runtime evidence, 31 have previous-build-only runtime evidence, 11 remain `not_sampled`, and 0 are `blocked_by_policy`. Current-build Browser verification covers 44 groups and Electron verification covers 44.
Prior acceptance outside those sampled current-build groups remains
recorded as `partial_legacy` until current-build re-observation.

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
- Remaining Settings pages, including Hooks and code-review preferences. The
  shell/search, Git/review-delivery, and Appearance slices are now
  current-build verified.
- MCP, plugins, skills, and automations.

### P2: confirm scope before implementing

- Quick/hotkey windows and remaining subscription purchase/provider
  lifecycles.
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
glyph; and sampled project-task rows do not render a leading glyph. Browser/CDP
and Electron independently gate the hover semantics and geometry. The Recents
follow-up adds six 24×24 Pin/Archive pairs with a 4px gap, zero leading glyphs,
and a dedicated ownership-masked regional gate. The
1180×820 current-build regional comparison passes at 3.4526% for the top,
0.1163% for the ownership-masked selected row, and 0.4126% for the footer,
where only account-owned content is masked and the Help control remains under
comparison; the Recents region passes at 2.5356%.

The previous `26.818.41509` follow-up supersedes only the task-row action and
ordinary-status geometry from that older slice. Project tasks and Recents now
share two 19×20 Pin/Archive buttons with an 8px gap and 8px toolbar right
inset. Active and unread use the same 20×20 rail at 8px, with the exact 16×16
spinner or centered 8×8 blue dot; completed has no status glyph. Browser/CDP,
Electron, and four local-only action/status tail comparisons gate this sampled
boundary. The older slice also adds its `Needs input` pill and an independent
16×16 ordinary error row. It reaches a live 29px `No chats` project row and
locks sampled-ASAR loading (one heading plus four shimmer rows) and the
five-item `Show more` boundary; a privacy-safe 140×29 empty crop passes at
1.8227%.

A second `26.818.41509` sidebar probe now supersedes the worktree-specific
status boundary as well. Two isolated disposable repositories reach real
create/loading/restored, controlled `.git/worktrees` failure, failed-plus-unread
composition, and successful Retry recovery. Loading/restored use 56×30
privacy-safe tails; failed-plus-unread uses 84×30. Their unmasked pixel ratios
are 2.0833%, 0.7540%, and 0.1786%, while Browser/CDP and Electron lock the
30px row, 14px branch marker, 20px loading rail, exact spinner/error paths,
three-track failure composition, action replacement, and recovery.

The previous `26.820.60940` follow-up re-observes the shared ordinary row
system without relabelling the unsampled states. Project tasks and Recents
remain 30px rows with the same current 19×20 Pin/Archive controls, 8px gap,
35px/8px right insets, and exact current SVG paths. A real active task and
real unread rows retain the 20×20 rail, 16×16 two-path spinner, and centered
8×8 blue dot. Privacy-safe current product crops pass at 3.3796% project
actions, 3.1944% Recents actions, 1.9048% active, and 3.5714% unread. The
unread cap is 4% solely for the measured 306.90625px row's fractional raster
origin; CDP and Electron still require exact geometry and color. A disposable
waiting-on-approval task shows that 26.820 replaced the old text pill with the
same 16×16 spinner, and a live project collection now performs a one-way
five-to-eleven reveal with no `Show less`. Independent replay keeps a
content-independent five-to-twelve gate; waiting and `Show more` product
regions pass at 2.7381% and 3.8393%. A separate empty project re-reaches the
306.90625×29 `No chats` row with exact 14px/21px type, `4px 32px` padding,
0.5 opacity, and a 2.4138% foreground-only product comparison. A disposable
real New-local-worktree task also re-reaches loading → restored: the 30px row
keeps the 14px branch at 39px beside the 20px spinner rail, then returns the
branch to an 11px inset. Its privacy-safe 56×30 tails pass at 1.0714% and 0%.
A second current disposable probe now re-reaches controlled worktree failure,
distinguishes foreground-read failure from background failed-plus-unread, and
completes through the real `Retry` control with exactly one child worktree.
The current three-track row keeps the 14px branch at 67px, red 16px error at
38px, and blue 8px unread dot at 14px; its privacy-safe 84×30 tail passes at
0%. The same installed ASAR now independently locks the ordinary error's exact
three-path 21×21 icon and the collection loader's polite status,
screen-reader-only label, 18% heading, and four seeded shimmer rows through
Browser/CDP and Electron. Safe isolated attempts reached global app-server
crash recovery and persisted-row hydration, not those two row-level runtime
states, so ordinary error and collection loading remain previous-build runtime
evidence.

The current sidebar lifecycle follow-up splits the broad historical project,
action, and footer rows into three independently gated current-build groups:
`app.sidebar-project-group-lifecycle`,
`app.sidebar-project-actions-menu`, and `app.sidebar-help-menu`. The product
record contains six expandable groups with 30px project rows, 30px task rows,
2px/8px child-list block padding, 1px row/group separators,
pointer/Enter/Space transitions, the current 721→720 visible-sidebar rule,
explicit Hide/Show, a 221×187 native project menu with six fixed actions and
one conditional unread action, and a 320×272.06 Help menu with a `What's new` heading
and eight items. The 46px footer now contains a 75.67×28 Voice action plus
32×32 Help. The previous 26.820 account-menu follow-up additionally locks the
Dark/Light × wide/compact 306.90625×188.375px account surface, menu-surface
focus, 400 weight, responsive pinning, and its six-row focus-return lifecycle.
Browser/CDP and Electron repeat the lifecycle; the current
local-only 133×46 Voice/Help comparison passes at 3.1219%. Four older
26.803.61601 ownership-masked comparisons remain regression evidence for
collapsed projects, the previous Help menu, and the compact sidebar; they are
not relabeled as current pixels. The project menu instead has a current
unmasked 221×187 native-region gate at 3.8449%. The account menu has four
26.820 privacy-masked region gates between 0.3794% and 0.5284%. The broader
project-navigation and mutation/status rows remain `partial_legacy` because
these narrower observations do not prove every state they own; full Settings
routes remain separately owned Stage 4 surfaces.

The current `26.825.51511` ordinary thread follow-up reaches one selected
running task, one background-completed unread task, ordinary idle rows, and
the shared hover actions in an isolated profile. Both 1180×820 and 720×680
retain the 321.875px sidebar and 305.875×30px rows with
`5px 5px 5px 8px` padding and 13/18.5714px weight-400 type. The running row
uses the exact two-path 16×16 spinner; the completed unread row uses an 8×8
`#3a83f7` info-solid dot. Hover exposes exact `Pin chat`/`Archive chat`
19×20px controls with an 8px gap and hides the status rail. Browser/CDP,
Electron, three reviewed wide/hover/compact frames, and local-only shape gates
at 2.9762%, 0.3571%, and 0% promote `app.sidebar-thread-history`,
`app.sidebar-item-actions`, and `app.sidebar-status-indicators` for this
sampled lifecycle. Waiting, error, worktree, mutations, and longer history
remain partial or previous-build evidence.

The first current `26.825.51511` worktree follow-up uses an isolated profile and a
disposable repository to reach one real setting-up row, a controlled
initialization failure, successful Retry, a recovered background-unread row,
and restored idle. Its selected/read failure sample shows branch plus red
error without unread. A later background failure shows the same branch/error
with a simultaneous blue unread dot, establishing notification/read state as
an independent track rather than a universal failure rule. Browser/CDP and
Electron lock the 305.875×30 row, exact 14×14
branch, 16×16 spinner/error glyphs and source paths, `#ff6764` error,
`#3a83f7` unread, 39/11px branch insets, exact actions, and wide/compact
containment. Two reviewed frames and local-only active/failed/recovered
84×30 masks pass at 3.7698%, 0%, and 0%. This promotes
`app.sidebar-worktree-status-indicators` to current Browser/Electron evidence
for the sampled lifecycle.

The adjacent current-build workspace follow-up reaches the real
`Worktree setup failed` card, its `More details`/`Less details` disclosure,
sanitized failure log, `Edit environment`, and Retry. It then observes the
two-stage `Creating a worktree` transition and the terminal `Worktree
created`/`Starting a task` handoff. The 1180×820 card is 736×247.5px expanded
and 736×112px collapsed; the two 21px stage rows use an 8px gap, the log is
710×123.5px, and the card owns 15px/12px radius/inset geometry. The 720×680
frame retains a 366.125px root with no horizontal overflow. Browser/CDP locks
the computed geometry, colors, exact observed branch/success/failure paths,
disclosure, and Retry state machine. Electron repeats Retry, Cancel, and the
Edit-environment route. Five reviewed baselines pass, and the local-only
failure-card foreground comparison is 5.2082% under 6.5%. This promotes
`workspace.worktrees` to current Browser/Electron evidence for the sampled
failure/recovery workspace. Settings retention, permanent worktrees, missing
directory variants, and other unsampled worktree paths keep the broader
implementation `partial`.

The adjacent `26.825.51511` Worktrees Settings follow-up reaches the four
current preferences, one real disposable managed-worktree card, project-level
Refresh, New chat, conversation linkage, and product-owned Delete. Moving the
exact disposable directory aside and refreshing removes its card; restoring
the path and refreshing restores the card. Product Delete then removes the
same worktree from both disk and Git registration immediately, without a
confirmation dialog. This is reconciliation behavior, not a missing-directory
repair surface. At 1180×820 the route uses the current 321.875px Settings rail,
768px content column, 276.31px preference card, 46px project header, and
124.58px managed card. The 720×680 route keeps fixed-size controls and has no
document-level horizontal overflow. Browser/CDP covers six deterministic
wide, compact, light, empty, conversation, and missing-refresh frames;
Electron repeats preference/action state and route persistence. Six reviewed
baselines pass, and the local-only owned-route product comparison is 4.5984%
under 5%. Native `Create permanent worktree` remains current-menu evidence but
was not activated, so permanent creation, timed pruning, and broader retention
lifecycles keep `workspace.worktrees` implementation `partial`.

The ordinary task-status follow-up reached one real active thread and one
background-completed unread thread on `26.803.61601`. It locked the 20×20
trailing rail, exact 16×16 active spinner geometry, and centered 8×8 unread dot
using the current `rgb(58, 131, 247)` info-solid color. A queued follow-up does not
replace the active spinner, so ordinary thread presentation is classified as
`active | waiting | unread | idle`. The previous `26.810.52044` refresh
superseded the primary worktree anchor with a real disposable create, controlled
`.git/worktrees` failure, and successful Retry. Pending worktree phases retain
the loading visual and restored retains the 14×14 branch marker, while a failed
unread row keeps branch, red error, and blue unread as three simultaneous
tracks. Ordinary status rails end 8px from the row edge; pending, failed, and
restored branch insets are 39px, 67px, and 11px. Browser/CDP covers 198
lifecycle frames and Electron repeats geometry, accessibility, and full
action replacement. Three local-only row crops gate the owned trailing pixels;
loading/error/restored pass at 2.9762%, 0%, and 0% under independent 6%, 6.5%,
and 2.5% ceilings. The earlier active/unread ratios remain build-scoped
regression evidence rather than current visual results.

The previous `26.818.41509` refresh re-reaches that lifecycle with new product
entry semantics and supersedes those older worktree pixels. `Work in` now
contains `New local worktree` and disabled `Cloud`; the selected context uses
the generic accessible labels `Select where to run the chat`, `Select a local
environment`, and `What branch should this chat start from?`. Its 264×91.125
Environment menu contains only `Work without environment` and `Set up
project`. Real success, controlled failure, Retry, and restored states promote
`conversation.context-controls`, `composer.project-worktree-selection`,
`app.new-thread-workspace-selection`, `workspace.worktrees`, and
`app.sidebar-worktree-status-indicators` to current-build Browser/Electron
verification for this sampled lifecycle.

The `26.820.60940` success follow-up re-reaches the same real selection and
submission path. It selects
`New local worktree`, retains `No environment` and `main`, submits an exact
no-tool/no-file task, reaches loading and restored sidebar states, verifies the
Worktree workspace summary, and cleans the exact task/worktree. This promotes
current runtime evidence for `conversation.context-controls`,
`composer.project-worktree-selection`, `app.new-thread-workspace-selection`,
`workspace.worktrees`, and `app.sidebar-worktree-status-indicators`; their
broader implementation/Browser/Electron status remains partial.
The subsequent current failure continuation promotes that sampled repair
boundary as well. A disposable regular-file `.git/worktrees` blocker produces
the real failure surface and background branch/error/unread composition;
moving it aside and activating `Retry` creates one child worktree and removes
the failure. The current 84×30 failure tail has 0% foreground-mask difference
from the replay, while ordinary error and collection loading remain unsampled
on 26.820.

The same current-build manifest now supplies exact visible Sidebar, Back, and
Forward primitives to the private playground window chrome. Browser/CDP and
Electron lock the 28×28 buttons, 16×16 icons, disabled navigation state, and
semantic IDs; a 120×46 external crop passes at 3.2609%. Hidden layout copies
are excluded by computed visibility before capture.

The independent shell/workspace composition now exposes System, Light, and
Dark as a separate state axis and combines the current sidebar with the
workspace route without overloading the replay frame. Conversation and Pull
Request routes remain explicitly dark until their custom paint is converted.
Browser/CDP, Electron, and one reviewed internal pixel baseline gate the
1180×820 light shell, semantic token changes, focus, geometry, and theme-aware
`currentColor` paint for the exact dark-build SVG geometry. Electron also opens
the Project, Environment, and Worktree overlays and requires light semantic
surfaces with readable foregrounds, requires a contrast-safe shell success
indicator, and resolves System through the native Electron theme before the
Renderer loads. A later `26.818.41509` isolated sample closes the New chat
home's light-theme evidence gap: the real Light preference, computed paint,
wide/compact geometry, prompt focus/selection, and external Light pixels are
now recorded, and the preference was restored to System. This remains scoped
to the visible current home and shell. The later account-menu matrix closes
the footer/account Light and compact gap; broader Settings routes, route
lifecycle feedback, and unsampled notification tones still require live
evidence.

The application-shell continuity slice splits window navigation, route
lifecycle feedback, route selection/restoration, fatal App Server recovery,
and global notifications into independently owned inventory rows.
`26.727.40816` CDP records the 46px
chrome, Sidebar/Back/Forward controls, Pull requests loading status, and
detail auto-hide/reopen through 1180, 960, 820, and 720px. The broader
961/960, 721/720, 1920×1080, 2560×1440, first-use-dialog, and hard-reload
results remain build-scoped evidence from `26.721.81911`.

The public `AppWindowChrome`, `AppRouteOutlet`, and `AppNotificationRegion`
contracts cover host-owned navigation, ready/loading/empty/error/offline/
reconnecting/stale outlet states, and portalled global feedback. Browser CDP
passes the shared lifecycle matrix. Real Electron acceptance drives offline → retry →
loading → ready → restored notification and the native 1180×820 → 720×680 →
1180×820 responsive transition while preserving the selected route and
restoring only auto-collapsed surfaces. Four deterministic App shell pixel
frames pass. The 3.93% 120×46 window-chrome comparison is retained as a
`26.721.81911` regression result. Offline/error/reconnecting/stale and global
notification variants remain incomplete, so the implementation remains
`partial`. A previous 26.820 isolated ChatGPT task now reaches the reversible
Pin chat → `⌘Z` success path and emits `Chat unpinned`. The public region
matches its top-center Sonner structure, polite `Notifications alt+T` section,
focusable unstyled list item, exact success/Close paths, computed 170.4375×42px
dark geometry, three-visible mounted queue, interaction expansion, viewport-safe
bottom anchoring, and dialog-owned layering. Browser/CDP, Electron, one
reviewed baseline, and an unmasked 0.8029% product crop promote
`cross-layer.global-notifications` to current runtime evidence for the sampled
success path. A later four-chat Pin → `⌘Z` probe reaches four simultaneous
success items, restores every chat, and locks the real three-visible/four-
mounted stack, 1/0.95/0.90/0.85 scales, 0/8/16/24px offsets, centered transform
origin, hover expansion, Browser/Electron contracts, and a 0.2907% unmasked
172×64 product crop. The unsampled info, warning, and danger replays reuse exact
current-source icon paths but are not promoted to runtime evidence.

A separate current-build probe safely terminates only one isolated process's
validated App Server child and reaches the dedicated 408×400 fatal recovery
Renderer. Restart creates a new child and restores the app in about 1.4
seconds. `AppServerCrashRecovery` exposes the observed copy and host callbacks;
Browser/CDP and Electron gate 1180×820 and 720×680 geometry plus Restart. Its
local-only product comparison passes at 0.1101% full-frame and 1.1993% in the
owned core. This new `app.app-server-crash-recovery` row is current-runtime
verified and remains separate from `thread.error-retry-recovery`.

The thread transport replay follows current package structure through
Reconnecting 1/5, in-place 2/5 progress, recovered completion, terminal system
error, and successful same-thread follow-up. Browser/CDP, Electron, and five
reviewed state pixels pass with the observed 14/21px notice and Stop/Send
transitions. A real response-stream disconnect remains unsampled, so the
transport row retains `not_sampled` rather than borrowing fatal-process
evidence.

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
branches. The current `26.803.61601` follow-up supersedes the execution-location
entry model with a 216×189.31 five-action Work in menu. Codex web is an
external anchor rather than an environment selection, and disabled Send to
cloud cannot produce a synthetic working directory. New worktree exposes the
264×125.69 no-environment menu and routes Environment settings to the current
768px unavailable composition. Browser/CDP, Electron, and local-only product
comparisons pass at 3.9193%, 3.0724%, and 0.0708% without creating an
environment. Implementation remains `partial` because populated environment
creation/editing, repair variants, and real Remote connection lifecycles remain
open. The previous `26.818.41509` follow-up supersedes that entry vocabulary:
`New local worktree`, disabled `Cloud`, a 264×91.125 two-action Environment
menu without a static empty row, and `Set up project`. Two disposable
repositories then reach real success, controlled failure, Retry, and restored
states. Browser/CDP, Electron, and sampled-product tail gates cover the
entry and repair lifecycle; populated environment editing and Remote remain
open. A later `26.803.61601`
isolated probe creates a real worktree/task and proves project/task persistence
across an app restart while keeping exact thread-route restoration conditional
on selecting the retained task. Moving that disposable worktree aside reaches
a 736×37.125 missing-working-directory notice and unavailable PR status while
the 736×98 Composer and a model-only turn remain usable. Restoring the
directory does not clear the warning in-session; the next app restart does.
Browser/CDP, Electron, and a 3.2572% local-only notice-region gate cover that
observed boundary without inventing a Retry or repair control. The searchable
600×600 `LocalEnvironmentDialog` remains a protocol-neutral host capability;
it is no longer presented as the current New worktree entry behavior. The
broader projects index remains partial/legacy;
the worktree family has current Browser/Electron verification for the delivered
creation/persistence/missing-directory slice but remains partially implemented
because settings and additional repair variants are still open. The legacy
host-defined route selector also remains partial/legacy. Global
notification runtime observation and light-theme shell evidence also remain
open.

The previous `26.810.52044` project-entry refresh superseded the narrower
sample. A live isolated Renderer now exposes a 260×249.5 project picker with a
13/18.5714px search field, fourteen 28.56px options in a 252×142.81 scroll
owner, and two fixed actions: `New project` and
`Don't work in a project`. The two action glyphs are promoted from the current
runtime into the 97-icon exact manifest. Empty search retains both actions and
shows `No projects found`; Escape returns focus to the initiating project
control; clearing switches to `Choose project`; and the original project can
be selected again without creating a task or project. Browser/CDP covers all
202 lifecycle frames, Electron repeats the empty/Escape/clear/restore flow,
and the local-only ownership-masked current listbox differs by 0.9546% under
an 8% ceiling. The secure Electron host continues to own directory selection
through an explicit IPC boundary and deterministic fixtures prove selected-
path return without touching a user project.

The installed `projects-index-page` chunk structurally confirms the separate
Projects route: `Projects`, `Search projects`, Name/Updated sorting, local
project and pending-worktree status, 70px rows with 32px icons, row actions,
and up to ten expandable recent chats. The independent full-app replay covers
ready, expanded, loading, error, partial-error, search-empty, and 720px compact
presentations. The isolated `26.810.52044` Renderer additionally locked
the primary route's fourteen 70px rows, 736px 512/64/128 table, three 32px row
actions, ready/expanded/sort/empty/focus behavior, and the explicitly collapsed
600×600 416/128 compact table. Browser/CDP covers the same three primary
frames, Electron repeats project creation and two distinct recent-chat routes,
and the local-only ownership-masked route passes at 0.2221% while Create passes
at 3.7068%. The implementation remains partial for the wider loading/error/
pending-worktree denominator, but the primary current route is no longer
classified as previous-build-only.

The `26.803.61601` branch-entry follow-up replaces the incorrect local-
environment reuse with a dedicated branch workflow. The live Renderer exposes
a 296×280 branch menu with seven selectable rows plus a fixed create action,
then a 400×190.56 `Create and checkout branch` dialog with a 360×40 branch
field, disabled empty submit, `Set prefix`, Close, and create actions. `Set
prefix` routes to the current Git settings page. The public component keeps Git validation and
mutation host-owned, while the Electron bridge creates and checks out a branch
and switches back to `main` only through host-issued project tokens. A
two-repository Electron check proves the selected host-registered directory is
authoritative, creation retains modal focus and blocks dismissal until Git
settles, and delayed checkout results cannot overwrite a newly selected
project. The new project's branch control remains disabled with explicit
pending feedback until Git settles. Browser/CDP and reviewed pixels now gate
166 lifecycle frames; the
local-only dialog crop differs by 3.0916% under an 8% ceiling. Current-product
submission remains unpromoted until the same mutation is completed in the
isolated disposable product repository.

The follow-up Settings slice separates `settings.shell-search`,
`settings.general`, `settings.appearance`, `settings.git-preferences`, and
`settings.hooks-review` so a reached page does not falsely complete an
independent Settings lifecycle. The current full-page route keeps the
322.91px navigation, 21 items, grouped global search, 768px Git content, five
preference rows, and two instruction editors. Twenty-four exact navigation
icons raise the scoped manifest to 77. Browser/CDP and Electron verify the
Branch → Set prefix → Settings → Back lifecycle, while local-only wide and
720px comparisons pass at 2.4214% and 3.0210%.

The current-build Appearance follow-up reaches the full theme and Preferences
scroll surface without reading or changing account-private values. It records
three responsive theme previews, the 768×110 two-column diff preview, Light
and Dark theme editors, the 240×328 sixteen-option code-theme menu, four real
switches, two constrained contrast ranges, Dock icon radios, keyboard-operable
Reduce motion and Diff markers groups, and the 11–16px / 8–24px numeric
bounds. The public controlled component accepts host-supplied Dock artwork, so
the proprietary product raster stays local-only while the exact Settings
navigation assets remain in the existing provenance manifest. Browser/CDP and
Electron verify route switching and state persistence across Git and
Appearance; four reviewed internal scenes bring the matrix to 174. Local-only
wide, 720px, and bottom-Preferences comparisons differ by 1.2787%, 1.8977%,
and 3.4665% after ownership masks. General, Hooks, and every other Settings
page remain independently open.

The next current-build slice reaches General from top to bottom and records 21
rows across Permissions, General, Composer, Popout Window, and Notifications.
`GeneralSettingsPage` is controlled and keeps file-opening behavior, license
presentation, shortcut registration, notifications, and persistence
host-owned. Browser/CDP covers all five menus, the searchable 66-language
list, twelve switches, both keyboard-operable segmented choices, shortcut
capture/cancel, 1180px and 720px geometry, light paint, and bottom scroll.
Electron repeats the route and proves General, Git, and Appearance state remain
independent across navigation. Six reviewed frames bring the matrix to 180,
including a dedicated 720px shortcut-capture frame;
optional current-product comparisons cover the full wide, compact top-crop,
shortcut-capture, and bottom frames at 4.6143%, 6.7412%, 4.7654%, and 4.8818%
without committing raw screenshots. The captured values are observed host
fixtures rather than product defaults.

The following Hooks/code-review slice preserves a stricter evidence split.
The current `26.803.61601` Renderer reaches Hooks in the visible Coding group,
including the stable `No hooks found` card, read-only reload feedback,
current documentation link, 1180×820 geometry, and the exact 720×680 wrapped
layout. Current ASAR structure confirms Config/Plugin/Project/other source
groups, eleven lifecycle events, changed/new/trusted/managed states, load
issues, entry details, and the independent Code review preferences module.
The latter is registered but absent from current navigation and settings
search, so it remains a clearly labelled `package-observed` deep fixture and
is not introduced as a false current sidebar item. Both public pages are
controlled and retain reload, persistence, config opening, trust, and cloud
mutation as host responsibilities. Browser/CDP and Electron cover
empty/loading/error/configured states, refresh and route continuity,
trust-before-enable, review trigger selection, exhaustive review, and optional
credit use. Eight reviewed frames bring the matrix to 188. Local-only,
unmasked full-frame Hooks comparisons pass at 1.7651% wide and 1.8064% at
720px; the exact reload icon raises the provenance manifest to 78. All
remaining Settings pages stay independently open.

The current `26.825.51511` Personalization follow-up reaches the complete
visible route without persisting any product setting. It records the 768px
wide and 358.125px compact content columns, 147.94px Custom instructions
editor, two enabled 32×20 memory switches, Delete action, warning, and the
268×105.13 Friendly/Pragmatic menu. The public controlled component keeps
save, deletion, persistence, and host memory ownership outside the package.
Browser/CDP verifies dirty/restore, menu selection and Escape focus return,
wide/compact geometry, bottom scrolling, and zero horizontal overflow;
Electron renders the same four states and native 720×680 resize. Four reviewed
internal frames pass. Local-only ownership-masked comparisons differ by
5.4469% wide, 4.5811% with the menu open, and 7.4199% compact under independent
5.5%/5.5%/8% ceilings. Keyboard, Voice, and Usage are now independently
delivered; other Settings routes remain open.

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

The visual gate is now scenario-driven. Its streaming references are refreshed
on `26.803.61601` through `CODEX_UI_KIT_THREAD_STREAMING_REFERENCE` and
`CODEX_UI_KIT_THREAD_STREAMING_COMPACT_REFERENCE`. They cover one live
1180→720 running resize, 14/22px running text, the 736px/688px columns,
736×98/688×98 Composer cards, reverse-origin clipping, exact 16px Stop SVG,
and completion recovery. No owner mask remains; full raster and
header/message/Composer regions are independently bounded.

The current `26.803.61601` completed-thread follow-up supersedes the basic
shell/message evidence above without relabeling later lifecycle states. A
fresh synthetic exact reply locks the settled 1180×820 and 720×680 layouts:
46px header, 20px user bubble, 14/22px messages, four 26px assistant actions,
25px-radius 736×98 or 688×98 Composer, 16px compact insets, and zero horizontal
overflow. Twelve exact thread primitives raise the visual manifest from 78 to
90. The titlebar also replays its separately hashed, playground-only VS Code
integration PNG. Browser/CDP and Electron pass with no geometry violations;
local-only regional comparisons pass at 0.3272% wide and 0.6456% compact. The source
captures remain untracked.

The previous `26.818.41509` fixed-message follow-up supersedes that shell
and basic-message evidence without promoting the remaining conversation
lifecycle. The live product and independent replay use the exact prompt and
reply `CURRENT BASIC MESSAGE.`. CDP locks the 1180×820 thread, user bubble,
assistant row, four 26×26 actions, five Composer controls, exact current SVG
sources, and zero overflow; Electron repeats the wide contract and an
820×680 compact resize. A 768×774 product-owned crop passes with no masks at
`0.004320090439276485` changed pixels under a `0.005` hard limit. The capture
profile and product screenshots remain local-only.

The current streaming follow-up adds zero-violation wide and compact geometry.
Its full-frame deltas are 0.3066% and 0.5074%; message-region deltas are
0.2706% and 0%, while Composer deltas are 0.5372% and 0.8761%. Completion
returns the wide turn from y=-4.83/y=123.17 to y=78/y=206 and replaces Stop
with the empty usable Send state.

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

The previous `26.820.60940` permission follow-up supersedes the old four-mode
menu. It now exposes exactly three 47.109375px rows — `Ask for approval`,
`Approve for me`, and `Full access` — inside a 476.46875×175.375px menu at
x=425/y=591 in the sampled product frame. `Custom (config.toml)` is no longer
present. The descriptions are also current: Ask always requests external-file
and internet approval, Approve asks only for potentially unsafe actions, and
Full access is unrestricted. Ask is not an every-shell-command guarantee: the
sampled `/private/tmp` write and Calculator launch ran directly, while a
Desktop file edit produced a real approval. Browser/CDP and Electron lock all
three rows, the checked mode, exact menu geometry, Escape dismissal, and focus
restoration; the reviewed internal permission-menu raster is updated.

The independent public contract adds `ComposerDock`,
`ComposerContextBar`, `ComposerContextControl`, `ComposerPermissionMenu`, and
`ComposerResourcePicker`, keeps context, queue, overlays, and input ownership
separate, and lets a running `AgentComposer` route Enter to a host-owned queue
while Stop remains the primary control. The 46-event
conversation replay contains 11 turns and covers multiline, disabled,
attachment, running, queued, queue-paused, completed, scroll-away,
message-navigation, and windowed-history frames. Its default interaction now
drives submit → running → queue → Stop → automatic queued continuation, then
message navigation and return-to-latest. The old paused/Resume frame initially
remained an explicit compatibility fixture. The current 26.825 follow-up below
supersedes that status with a newly observed two-stage paused/Resume contract.
Real Electron repeats both the automatic-continuation regression and the
current lifecycle.

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

The `26.820.60940` refresh supersedes that legacy mode sample. Goal now uses
736/688×134 wide/compact surfaces with a 20.5px input inset; Plan retains
736/688×98 with a 14px inset. Browser/CDP and Electron verify both responsive
geometries, exact placeholders, 28px mode controls, clear/focus restoration,
and Add-resources transitions. Unmasked surface-only product ratios are
3.9787%/4.2390% for Goal and 3.6241%/3.6130% for Plan under 4.5% and 4%
ceilings, promoting `composer.modes` to current-build Browser/Electron
verification for this sampled vocabulary.

The same refresh supersedes the prior project-picker structure. The outer
dialog remains 260×249.5, but one 252×208.9375 listbox now owns a 142.8125px
scroll region, 9px divider, and 57.125px fixed region. `New project` and
`Don't work in a project` are options in the same keyboard order; a no-match
query leaves exactly those two options. Wide/compact Browser/CDP and Electron
verify focus, search, reversible no-project selection, and the adjacent
project/local/main context geometry. Unmasked 252×209 product crops pass at
4.3119% and 3.0702% under 5%, promoting `conversation.project-picker` and
the sampled `conversation.context-controls` path to current-build
Browser/Electron verification.

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

The previous `26.820.60940` follow-up supersedes that sampled runtime boundary
with one disposable 30-turn thread whose prompts and replies were exact and
tool-free. At 1180×820, after hiding the sidebar and closing the pinned
summary, the 768px thread has 205.5px of start-side space, so the 30-button
36×10px compact rail is visible. The product mounts 11 nearby turns after
jumping to message 15, keeps reverse-origin `scrollTop = -2346`, and retains
the last message as `aria-current`; navigation still materializes message 15,
so the stale current marker is recorded as a current-product boundary rather
than silently corrected. At 720×680 the content start offset is zero, the rail
is absent, nine turns remain mounted at `scrollTop = -900`, and the 32×32px
return control restores latest with eight turns mounted and `scrollTop = 0`.
Current source establishes an independent four-item minimum and a 48px spatial
gate. The public component now defaults to the observed compact density and
four-item threshold, hides the overlay below the 864px shell gate, and keeps
host-owned window selection explicit. Browser/CDP and Electron drive message
29 → 15 → latest plus compact return; local-only structural product pixels
pass at `0.008084952` wide and `0.008396650` compact under a 1% limit. This
promotes `thread.shell`, `thread.messages-basic`,
`thread.virtualized-timeline`, and `thread.message-navigation` for the sampled
current-build slice while retaining `partial` implementation status for
unobserved eviction policies and broader thread variants.

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

That previous eight-event replay raised the matrix to 21 fixtures and 254 events.
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

A previous `26.810.52044` refresh replaced that older gate for the sampled
card and Review family. A real three-file task renders one 737×174 `Edited 3
files` card with `+2 −4`, opens a 382.4375px Review workspace at 1180×820, and
keeps a 336.19px independently scroll-owned overlay at 720×680. Public
`FileReviewWorkspace` and `FileRevertErrorDialog` compositions cover the six
scope choices, filter, collapse/expand, jump, unified/split, files hide/show,
per-file controls, and the observed 420×192 Undo failure without discarding the
card or panel state. Seventeen exact current Review SVGs replace hand-drawn
playground approximations; context-dependent computed layout styles are
removed before replay while SVG paint and geometry remain exact.

The protocol matrix is now 34 fixtures and 426 events. Browser/CDP and a real
Electron `BrowserWindow` drive the current Review controls, focus return,
selection, responsive panel, and Undo failure. Three reviewed integrated
baselines guard the file card, open workspace, and failure dialog frames. The
independent 383×820 product-panel gate passes at 4.3339% overall, while the
737×174 product file-card gate passes at 4.4683%; both retain exact declared
geometry contracts.
`thread.file-change-diff`, `workspace.side-panel-shell`,
`workspace.editor-diff`, and `workspace.multi-file-review` therefore regain
current-build Browser/Electron verification for this sampled three-file and
failure family. Binary/conflict notices and successful Undo remain outside the
current product sample, so implementation status remains partial.

The previous `26.820.60940` Review refresh supersedes that runtime boundary.
One disposable three-file task now produces the exact `+4 −4` aggregate in a
737×174 wide card and 688×174 compact card. A marker-backed move remains two
modified source/destination files with `+1 −0` and `+0 −1` in 737×138 and
688×138 cards. The real workspace expands to 419.59375×820 wide and uses a
345.671875×680 compact overlay; its 46px header, 40px toolbar, 250px wide file
cap, compact 40/60 split, 203/159.796875px filters, and six-item 200×197.375px
scope menu are independently hard-gated.

Undo now has a sampled reversible success path through Reapply. An external
edit then reaches the current 420×247.6875 `No changes reverted` dialog with a
single skipped path while preserving both card and panel state. Browser/CDP
and Electron drive all eight wide/compact file, rename, and conflict frames;
eight reviewed internal screenshots pass. Local-only product crops pass at
2.9976%/3.0323% for the wide/compact file card, 4.6219% for the wide
three-file workspace, and 3.3747% for the compact rename workspace under 5%
limits. This keeps `thread.file-change-diff`,
`workspace.side-panel-shell`, `workspace.editor-diff`, and
`workspace.multi-file-review` current-build Browser/Electron verified.
Implementation remains partial for unsampled binary/merge-conflict content,
larger file sets, and additional host failure variants.

The current `26.825.51511` Review anchor supersedes that runtime boundary for
the sampled ordinary file-edit path. One isolated `apply_patch` task renders a
736×173.5px wide card and 688×173.5px compact card with three aggregate rows
and `+5 −5`; the underlying protocol keeps four raw diffs because `alpha.txt`
is represented as delete plus add. Opening Review changes the card subtitle to
`Review changes ↗`, expands only the added file initially, and mounts the four
raw diff/tree entries in a 591.828125×820 wide panel or 344.671875×680 compact
overlay. The current card-files and Undo SVGs are exact same-build captures.

Browser/CDP gates four wide/compact card and workspace frames, including the
three aggregate paths, duplicate raw `alpha.txt`, four response actions,
`Worked for 20s`, Send/Stop settlement, and zero horizontal overflow. Electron
repeats the same native-window geometry and content contract. Four reviewed
internal baselines pass. Local-only product crops pass at 4.2901% and 4.9780%
for the wide/compact closed card, 6.4586% for the narrower open card, and
1.9445%/2.5733% for the wide/compact Review panel under independent 6.6% and
3% limits. This refreshes `thread.file-change-diff`,
`workspace.side-panel-shell`, `workspace.editor-diff`, and
`workspace.multi-file-review` on the current build while retaining partial
implementation status for unsampled binary/conflict, larger-set, and broader
Undo/failure variants.

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

The `26.803.61601` follow-up sharpens that boundary. Running
`sh -c 'printf terminal-direct-out; exit 7'` inside the direct Terminal returns
to the same prompt with no failure notice, while ordinary `exit` closes the
tab and reopening Terminal creates a new local shell. A disposable agent turn
also starts a real 120-line background loop, finishes its response while the
process remains active, exposes the exact command under `Background processes`,
and opens the live output in a 381.44px side-panel tab. Closing that tab returns
to the summary and the still-active process can be reopened. The public replay
therefore keeps command exit, shell failure, and background-process ownership
as three separate states. `TerminalReloadNotice` implements the current
package-structural crash copy and Reload action without claiming that the
product pty was intentionally crashed. Browser/CDP and Electron cover all four
new frames and the close/reopen interaction; reviewed internal pixels raise
the matrix to 192 frames.

Changing the chat worktree with an older Terminal active now has its own
`workspace.terminal-context-mismatch` surface. The observed warning says
`This terminal's workspace does not match this chat's current worktree` and
offers `Dismiss` plus `Open new terminal` without discarding the older
session. `TerminalWorkspaceMismatchNotice` implements that recovery contract.
Browser/CDP covers 192 lifecycle frames and Electron repeats the session,
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

Build `26.803.41515` refreshes both P0 rows again. A real successful task now
contains Search OpenAI docs → Search OpenAI docs → Fetch OpenAI doc under one
`Used OpenAI Developer Docs integration` group and completes in 35 seconds.
The current per-call disclosure is a transparent content-width button labelled
by the visible call summary, rather than the older text-trigger contract.

A second real task begins with an invalid-URL Fetch, keeps that failure inside
the same integration group, then recovers through Search → Fetch and completes
in 16 seconds. The expanded neutral failure card remains 736×67.3125px at
1180×820 with a 12.5px radius, 0.05 white background, 0.157 white border,
13/18.5714px language label, and 14/22.75px 445-weight monospace output. At
720×680 the product auto-hides navigation, retains zero document overflow,
and exposes the 688px card with its left edge clipped by 12px in the centered
conversation layout.

Two schema-valid current-build replays preserve those exact call orders and
durations across five lifecycle states plus one compact variant. Browser/CDP
gates status, content-width disclosure ownership, accessibility names, expanded failure output, computed
styles, and compact overflow; Electron repeats the success/recovery
interaction and native 720×680 resize. Six reviewed internal baselines pass.
Optional local-only product comparisons keep the successful 736×100 tool
group at 1.6440% changed pixels under 2% and the compact recovery-card region
at 1.1017% under 1.2%. Product screenshots remain outside the repository.
`thread.mcp-tool-events` and `thread.mcp-tool-failure-retry` are therefore
current-build Browser/Electron verified while their implementation remains
partial for the open variants below.

Build `26.810.52044` refreshed both MCP rows and promoted the previously
unsampled transport-recovery row. The accepted real success performs exactly
one Search OpenAI docs call and one Fetch OpenAI doc call, completes in 25
seconds, and returns `Model Context Protocol` with the canonical
`https://developers.openai.com/codex/mcp` URL. A second accepted real turn
performs invalid-URL Fetch → Search → canonical Fetch in the same integration
group and completes in 18 seconds. Its wide neutral failure card remains
736×67.3125px with a 12.5px radius, 0.05 white background, 0.157 white border,
13/18.5714px language label, and 14/22.75px 445-weight monospace output; after
an explicit product-sidebar hide, the 720×680 card is 688×67.3125px at x=16.

The first accepted turn also reached a real transient `Reconnecting 2/5` row
and then completed successfully without a new turn. The asset capture promotes
the exact current MCP glyph, 14×14 disclosure chevron, and four-path 16×16
reconnect glyph; all repeated group/call geometry is checked before writing the
95-icon manifest. Browser/CDP now covers the two-call success, three-call
failure recovery, content-width disclosure ownership, exact path assets,
compact card, and existing reconnect/recovered lifecycle. Electron repeats
the MCP interactions and native compact resize. Nine reviewed internal MCP /
reconnect baselines pass. Optional local-only 26.810 comparisons keep the
736×80 successful tool region at 1.956521739130435% under 2% and the full
688×67 compact failure card at 1.2018396390142311% under 1.21%; product frames
remain outside the repository.

This makes `thread.mcp-tool-events`, `thread.mcp-tool-failure-retry`, and
`thread.error-retry-recovery` current-build runtime-observed and
Browser/Electron verified. Implementation remains partial because
authentication, elicitation, MCP approvals, cancellation, same-transport final
failure, and other integrations are still open.

The same build now refreshes `thread.tool-unavailable-recovery` with a separate
real two-turn task. The first turn permits only GitHub MCP, emits no fabricated
tool row, and terminates with the exact assistant fallback `GitHub MCP
integration is unavailable.` The second turn stays in the same thread, permits
only OpenAI Developer Docs, and completes Search → Fetch under one expanded
`Used OpenAI Developer Docs integration` group in 34 seconds. At 720×680 the
688px group, 14/21px system typography, 445 weight, 0.6 secondary color,
antialiased rendering, hidden navigation, and zero horizontal overflow match
the current Renderer. Browser/CDP covers unavailable, recovering, recovered,
and compact states; Electron opens both timelines and the tool group before a
real native compact resize. Four reviewed internal baselines pass, and the
optional local-only 688×71 group comparison differs by 0.6449% under a 1.3%
hard limit. This promotes the row to current-build Browser/Electron verified
without claiming that the unavailable GitHub transport itself reconnected.

Build `26.820.60940` now supersedes the sampled primary MCP and Sources
anchors. One real turn completes Search → Fetch in 34 seconds; another starts
with a standalone invalid Fetch and completes Search → Fetch in a separate
integration group within the same turn in 17 seconds. Completed and failed
call rows are 21px noninteractive text rows on this build: they expose neither
the former disclosure button nor the neutral failure output card. The observed
recovery is one captured outcome rather than a claim that every failed call
automatically retries.

At 720×680 the activity and group begin at x=16 and the call labels at x=38,
with zero horizontal overflow. The 300×189 Sources summary remains mounted
offscreen after unpinning and an outside click; repinning restores it and the
reserved conversation track. Browser/CDP and Electron cover success, direct
failure, deterministic retrying/completed replay states, compact geometry, and
the Sources lifecycle. Seven reviewed internal baselines pass. Optional
local-only product comparisons differ by 2.1978% for success, 3.3530% for the
direct failed row, 1.2123% for compact recovery, and 1.7707% for Sources under
independent 2.3%, 3.4%, 1.3%, and 2% hard limits. The replay-only in-progress
Search frame is not promoted as a current-product pixel because that transient
state was not captured live.

Build `26.825.51511` supersedes those sampled primary MCP and Sources anchors
again with one real same-thread two-turn lifecycle. The first turn completes
Search → Fetch in 20 seconds; the second completes invalid-URL Fetch →
Search → valid Fetch in 10 seconds. Both integration groups and every call
row are flat, expanded, and noninteractive. At 1180×820 the success and
recovery groups start at x=222/y=303 and x=222/y=501; at 720×680 the recovery
group starts at x=16/y=338 with call labels at x=38 and zero horizontal
overflow.

The current pinned summary is now 300×313px at x=864/y=59 and combines
Environment plus Sources with 272×29px rows. Clearing the pinned toggle closes
it, an outside click leaves it closed, and the same header control repins it.
Browser/CDP and Electron cover the two turns, compact resize, and summary
lifecycle. Four reviewed internal baselines pass. Local-only product regions
differ by 2.6742% success, 4.8070% recovery, 3.8995% compact recovery, and
2.9276% pinned summary under independent 2.8%, 5%, 4.1%, and 3.1% limits.

This promotes `thread.mcp-tool-events`, `thread.mcp-tool-failure-retry`,
`thread.panel-system`, and `thread.sources-panel` to current-build runtime,
Browser, and Electron evidence. Their implementation remains partial for the
open variants below.

Authentication, elicitation, MCP approvals, same-transport disconnect/reconnect,
other integrations, and cancellation remain open.

The independent `current-mixed-tool-thread` trace now joins the separately
validated search, Browser, MCP, command, approval, file Review, and subagent
contracts in one schema-valid multi-turn reducer path. It records 39 events
and eight named checkpoints; a ninth 720×680 scene reuses the completed frame.
Browser/CDP verifies action order, disclosure ownership, approval semantics,
Review content, subagent status, system typography, compact Composer width,
hidden navigation, and zero overflow. Electron reopens every disclosure,
switches Review to the subagent transcript, and performs the native compact
resize. Nine reviewed internal pixel baselines pass. This expands the
regression matrix to 33 traces, 406 events, and 156 visual frames without
changing the current 15 runtime / 52 previous-only / 17 unsampled inventory
counts: no single current-product task supplied whole-thread runtime or pixel
evidence for this composition.

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
verification for the sampled one-time and matching-command paths.

The installed `26.803.41515` package and pinned public protocol add two narrower
structural facts without promoting them to runtime reachability: file-change
approval accepts the distinct `acceptForSession` decision and exposes `Allow
all edits`, while `item/autoApprovalReview/started|completed` carries
`inProgress`, `approved`, `denied`, `timedOut`, and `aborted` states. The public
`AutomaticApprovalReview` primitive and Electron approval bridge now preserve
those semantics. Two schema-validated traces bring the current matrix to 26
fixtures and 306 events; Browser/CDP, Electron, and four reviewed internal pixel
scenes cover the session file-edit repeat path and `inProgress → timedOut`
review path. This remains structural plus independent replay evidence: a safe
real-product `acceptForSession` or auto-review timeout transition has not been
sampled. Repeated denial, other non-command approval kinds, and rule lifetime
across thread/restart boundaries also remain open; the denial runtime sample
is now current-build evidence.

The previous `26.810.52044` denial refresh used a single outside-project empty-file
sentinel because `open -a Calculator` no longer prompts under the sampled
current policy. The real 736×162 pending card locks `Working for 1m 15s`, exact
Terminal/chevron assets, 28px actions, `Esc`/`⏎` keycaps, and the
193.22×67.13 two-choice menu. Escape restores trigger focus; Deny leaves the
sentinel absent, settles as `Worked for 1m 53s`, and restores the 736×98 empty
Composer with `Ask for approval`. Browser/CDP and Electron repeat the path.
The local-only card, menu, and Composer comparisons pass at 3.2558%, 4.7096%,
and 2.1642% under 4%, 5%, and 3.5% limits. This promotes only command denial;
Allow once/matching-rule paths retain their previous-build evidence and other
approval kinds remain open.

The previous `26.820.60940` external-file follow-up supersedes that sampled
card/menu boundary. A disposable Desktop edit produces a turn-owned
Permissions card measuring 736×149.5px at x=222.239/y=654.5 wide and
688×149.5px at x=16/y=514.5 compact. The card has a 25px radius, exact
`Deny`/`Allow once` split actions, and an options menu containing only
`Allow once` and `Allow this conversation`; the older `Allow all edits`
wording is absent. Deny leaves the target absent and yields the exact sanitized
denial reply after 130 seconds. A separate real Allow-once transition creates
the exact requested content, verifies its SHA-256, and the disposable file is
then moved to Trash. Browser/CDP covers six pending/options/settled frames,
Electron repeats both decisions, and six reviewed internal baselines are
committed. Unmasked product card/menu regions differ by 6.0489% wide, 6.1328%
compact, and 5.1795% for the compact options menu under independent 6.2%,
6.3%, and 5.5% ceilings. Exact geometry remains separately hard-gated, so the
regional ratio is not used to conceal layout drift. Session approval lifetime,
automatic-review runtime reachability, and other approval kinds remain open.

The earlier attachment slice used a separate `26.730.61309` new chat and a
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
This promotes the current product runtime evidence only for the sampled
pasted-image path. The later `26.803.41515` follow-up adds source-structural
evidence for 256px file cards, 40px icon wells, extension/line/folder
subtitles, file-copy upload/error labels, and image progress semantics. The
independent package and playground now cover file/folder/image cards,
attachment-only submit, five-item wrapping containment, bounded progress, failure/retry,
preview recovery, and a trusted Electron file/folder selection bridge. The
real product native panel could not be automated in that slice.

The `26.820.60940` follow-up closes the post-picker and immersive-preview gap
with a user-authorized native selection in two isolated processes. At 720×680
the real Composer is 640×178px; its 640×94 wrapping tray bottom-aligns a
224×52 text-file card and an 80×80 image card with an 8px gap. The exact
document and Remove assets, 24×24/16×16 geometry, 17px radii, 78×78 image,
`TXT` metadata, and zero document overflow are locked. Opening the image owns
the whole viewport, fits it at 56% compact and 82% wide, exposes top-right
Download/Close plus a bottom 152×44 zoom toolbar, and restores trigger focus
after Escape. Edit image remains optional because it appeared in one product
feature state but not a fresh profile. Browser/CDP covers four frames,
Electron drives open/zoom/dismiss/remove, and local-only product regions pass
at 1.6117%, 0%, 0.2811%, and 1.9288%. Actual upload failure/progress and plugin
resources remain open.

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

The `26.803.61601` current-command follow-up supersedes the sampled success,
failure/recovery, interruption, and background-process boundary above. A
bounded twelve-line command completed successfully; one exact command emitted
stdout/stderr and exited 7 before a no-tool recovery; and a 120-second command
was stopped before a later recovery. The Renderer keeps a finished shell card
inside a still-settling turn, changes the 28×28 Composer Stop back to Send at
turn interruption, then independently exposes background-terminal Stop all
and per-process Stop until settlement. The exact ownerless 16×16 terminal
glyph contains three fill paths in a 20×20 viewBox. Its command text/output is
13px, 19.5px, weight 445. The public H5 gate covers 1180×820, 690×820, and
720×680 without overflow; the protocol playground drives Stop → Stop all →
settlement → recovery in 188 CDP frames and a real Electron window. Local-only
690×820 command/composer comparisons pass at 2.3321% and 1.3947%. Raw product
screenshots and private task text remain untracked.

The previous `26.810.52044` command refresh superseded the failure and interruption
presentation above. One exact command exited 7 after producing stderr and
stdout, exposed `Worked for 5s`, and accepted a successful no-tool follow-up in
the same task. A second long command was stopped after eight seconds; after its
process ended and the recovery turn completed, the 656.59×21px row remained
`Background terminal stopped with …` instead of changing to `Ran …`. The
independent H5 fixture and protocol replay now preserve that stopped row across
settlement and recovery. Browser/CDP covers 202 lifecycle frames, with current
failure and interruption semantics at 1180×820, 690×820, and 720×680. The
local-only current-product gates compare only owned regions: failure command
4.2564%, failure Composer 2.2194%, stopped summary/command 2.5875%, and stopped
Composer 2.2101%, all below their independent ceilings. Electron repeats the
Stop → background Stop → settlement → same-thread recovery transition. Raw
product screenshots and private navigation content remain untracked.

The previous `26.818.41509` command refresh supersedes that earlier-build
verification for the three sampled command groups. One exact read-only shell
command emitted the current two-line stdout/stderr sample, exited 7, exposed
`Worked for 10s`, and accepted an exact no-tool recovery. A second exact
120-second command was stopped after 58 seconds, retained the stopped
background-terminal row, and accepted an exact no-tool recovery in the same
task. Browser/CDP locks current computed geometry, typography, labels, glyphs,
response actions, and Composer state. Electron repeats both lifecycles at
1180×820 and 720×680. Local-only unmasked product-region comparisons pass at
4.4354% under 5% for failure and 3.9512% under 4.5% for interruption. This
promotes `thread.command-execution`, `thread.command-failure-recovery`, and
`thread.interruption-stop` on the current build; other command kinds,
truncation variants, and process-management surfaces retain separate gates.

The current `26.825.51511` command anchor now independently re-observes one
successful `/usr/bin/uuidgen` execution. Its unpredictable UUID proves the
terminal call occurred; the public trace substitutes a same-length sanitized
value. Browser/CDP and Electron gate `Worked for 8s`, the expanded
`Ran /usr/bin/uuidgen` row, hidden protocol output, four response actions,
Stop removal, Send recovery, native wide/720 resize, and zero overflow. Two
reviewed baselines pass. Local-only activity, Composer, and header comparisons
pass at 1.9196%–6.5485% under independent 2.3%/1.2%/7% ceilings. This promotes
`thread.command-execution`; the following current-build follow-ups cover
failure and interruption while broader command/process surfaces remain open.

A second current `26.825.51511` command task independently re-observes an
exit-code-7 failure followed by a successful no-tool turn in the same thread.
The product exposes `Worked for 15s` and a neutral, noninteractive
`Ran printf …; exit 7` row; it does not expose stdout, stderr, a Shell card, or
an exit-code footer even though the replay retains the exact protocol output
and exit code. Browser/CDP gates completed, recovered, and 720×680 frames;
Electron repeats the lifecycle in native windows. Three reviewed baselines
pass, and the unmasked 736×125 product/replay activity region differs by
1.2761% under the independent 2% limit. This promotes
`thread.command-failure-recovery` on the current build while interruption,
background-process, direct Terminal-tab, and broader command-kind variants
retain separate gates.

A third current `26.825.51511` command task independently re-observes a real
turn stop and same-thread recovery. The 120-second read-only loop first exposes
`Working for 19s` and the 28×28 Stop control. Immediately after Stop the turn
shows `You stopped after 0s`; after the child process settles it updates to
`You stopped after 20s` and retains the square
`Background terminal stopped with …` row. An exact no-tool follow-up then
completes in the same task while the stopped row remains visible. The public
trace separates running, immediate-stop, settled, recovered, and compact
composition without retaining command output. Browser/CDP gates four rendered
frames and Electron repeats all four native states. Four reviewed baselines
pass; local-only unmasked stopped-wide and recovered-compact regions differ by
4.9372% and 2.0661% under independent 5.5% and 3% limits. This promotes
`thread.interruption-stop` on the current build. Full background-process
management, direct Terminal tabs, command-output truncation, and broader
command kinds remain separate gates.

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
as separate hierarchy-ordered blocks. The unchanged `26.803.41515` package
adds source-structural evidence for the seven collaboration statuses,
Active/Done classification, and 4/10 panel limits. A schema-valid twelve-agent
replay now covers waiting-before-initialization, streamed updates, errored,
interrupted, shutdown, and unavailable terminal results, both pagination
  paths, and the failed-agent transcript. Browser/CDP reaches 156 frames;
Electron repeats the pagination and transcript interactions. Nine
reviewed scenes gate ten current-build regions. Panel/summary/transcript ratios
range from `0.013328938694792354` to `0.046708160442600274`; the compact
text-heavy nested main-activity band passes at `0.11495227995758218` under its
independent 0.125 limit, and three reviewed internal recovery baselines pass.
Product runtime reachability for those recovery transitions and transport
recovery remain separate gates.

This is a measurement- and raster-backed basic thread/workspace slice, not a
claim that the whole application or every lifecycle is pixel-perfect. Broader
Markdown variants, unsampled host eviction heuristics and window sizes, code search,
other MCP and connector variants, thread-level retry recovery, approval
persistence and timeout, current-product binary/conflict reachability, PR
merge/review-submission states, direct-shell failure/restart semantics,
background agent-process reopening, and native Codex window behavior
retain their own inventory gates.

The original Markdown slice revalidates one synthetic completed response on
build `26.721.41059`. That build's CDP evidence records semantic heading,
paragraph, link, inline code, quote, list, table, fenced-code, and action/copy
controls together with their computed styles. The protocol replay adds a
sixteenth deterministic frame; Browser and Electron gates retain regression
coverage for external-link semantics, code-copy behavior, the four
completed-response actions, 736px content geometry, and the measured scroll
clearance above the 736px Composer. A main-only 906×820 reference compares
assistant, code-card, and Composer ownership regions independently. That
product-level evidence still verifies only the sampled completed Markdown
vocabulary against `26.721.41059`; its current status remains
`partial_legacy`.

The previous `26.820.60940` follow-up supersedes that status for the sampled
Markdown group. Two isolated no-tool replies render double-dollar block math
through KaTeX while leaving single-dollar math, escaped heading/image source,
and footnote syntax literal. Package inspection separately confirms the image
preview, loading/unavailable, media-grid, and render-error branches. The public
component now ships the exact KaTeX 0.16.45 CSS/fonts and models those source
branches without private IPC. Wide/compact Browser/CDP and Electron verify the
736/688px roots, KaTeX plus MathML semantics, 200px loaded media, 96px external
fallback, four response actions, pointer-opened immersive preview, focus
restoration, and zero overflow. Two reviewed replay rasters are committed; a
current-product media raster remains unclaimed because the live replies did
not emit raw image media.

The current `26.825.51511` follow-up re-observes rich Markdown mutation against
the installed product. One real no-tool task reaches link-only output, an open
empty TypeScript card, two task rows, filled code, a seven-column table, 36 H2
sections, running tail, and completion. It locks the 736px root, 14/22.75px
body, 21/28px H1, 17.5/24.5px H2, 14px round task controls, 122.75px table,
reverse-origin follow, explicit scroll-away, Stop removal, and four response
actions. The empty-fence capture exposed and fixed a public `undefined` text
leak. Browser/CDP covers six checkpoints; Electron repeats code copy, table
focus, scroll-away/return, native bounds, and completion. Five reviewed
baselines and four local-only product regions pass at 2.4398%, 4.7698%,
2.7219%, and 1.7196% under 8%. This advances the group to current evidence; it
does not claim renderer/table errors or plugin-provided Markdown variants.
Citations and live media are now independently current.

Read-only structural inspection continues to support `inline-markdown`, the
in-progress boundary, the latest-turn follow controller and table container/
scroller/actions ownership. The refreshed ten-event replay uses the exact
sanitized 26.825.51511 content and six checkpoints rather than promoting the
older twelve-section synthetic stream.

A later isolated current-build task reaches an 18-column table's Copy, Expand,
and viewport preview path. The public five-event replay contributes to the
156-frame matrix; Electron repeats raw Markdown/HTML copy, horizontal wheel,
preview interaction, and 720×680 action reachability, and three reviewed
internal baselines pass. A local-only
1180×820 reference gates the preview and close regions at 3.9737% and 0.5929%
under 4% and 1% ceilings. Rich streaming, citations/sources, and live media
product reachability are now current; plugin variants, table error variants,
and broader Markdown error reachability remain open.

The latest `26.825.51511` context-control follow-up supersedes the previous
`26.820.60940` sample for the project/Local/main entry family. It re-observes
the 736×28 context row, 260×249.5 project dialog at wide and 720×680 compact,
216×189.3125 `Work in` menu, four-part New local worktree state,
264×91.125 Environment menu, and 296×280.125 Branches menu. The current
branch list uses eight ordinary `menuitem` rows, no `aria-checked`, a
project-specific search placeholder, no legacy Select local environment row,
and one Create and checkout action.

The public listbox adds a host-supplied selected icon without changing option
or focus semantics. Seven Browser/CDP frames lock roles, focus restoration,
geometry, responsive containment, 20px radius, 8px blur, and weight-400
typography. Electron drives the full project → New local worktree →
Environment → Local → Branches lifecycle and a separate compact native
window. Seven reviewed baselines pass; seven local-only product-region ratios
are 0.7909%, 2.9154%, 2.9108%, 11.1381%, 1.7372%, 1.3736%, and 4.1699%
under independent ceilings. This promotes the sampled paths of
`conversation.context-controls`, `conversation.project-picker`, and
`composer.project-worktree-selection` to current Browser/Electron
verification. Their implementation remains partial because populated
environment creation/editing, Remote, branch-operation failures, and other
provider-specific states are still open.

The adjacent current Composer-control follow-up supersedes the previous
`26.820.60940` permission and mode anchors. The sampled permission overlay is
438.6875×161.6875px with 4px padding, 20px radius, 8px backdrop blur, three
42.5625px ordinary `menuitem` rows, no radio-state attributes, and the exact
current permission/check primitives. Ask for approval selection, menu
dismissal, and trigger-focus restoration are reversible in Browser/CDP and
Electron. Goal retains the 736×134px wide and 688×134px compact Composer;
Plan retains 736×98px and 688×98px. Both use the current SVG geometry,
placeholder, clear action, and editor-focus restoration. Six reviewed
wide/compact baselines pass. Local-only product comparisons pass at 6.5300%
and 6.5272% for the text-dense permission overlay under a 7% limit, 3.2000%
and 3.6825% for Goal, and 2.9919% and 3.5062% for Plan under 5% limits. This
promotes the sampled current paths of `composer.permissions` and
`composer.modes`; custom permission policy, unavailable modes, persistence,
and other host-owned variants keep their implementations `partial`.

The next current Composer follow-up promotes `composer.queue` and
`composer.resources` from previous-build evidence. The resource picker is
736×320 wide and 687×320 compact, with 4px padding, 20px radius, 8px blur, a
310px scroller, and 28.5625px rows. Its fixed top controls and sanitized plugin
examples are keyboard reachable; Escape restores Add focus. Four-line editors
measure 712/663×80 inside 736/687×134 Composer cards. Twenty lines clamp to
712×205 inside 736×259 wide and 663×170 inside 687×224 compact, with local
scrolling and 14/20px weight-400 typography.

The pending queue is 710×37px. Stop exposes a current 710×72px paused tray,
header Resume, queued row, and an independent empty-Composer Resume primary.
Header Resume, Composer Resume, restarted primary completion, automatic queued
continuation, and final settlement are all explicit public states. Ten
wide/compact Browser/CDP frames and ten reviewed baselines pass; Electron
repeats resource, multiline, and the real click-driven queue lifecycle. The
ten local-only product ratios range from 0.6557% to 3.7314%. This promotes the
sampled current paths of `composer.queue`, `composer.resources`, and long-input
`composer.shell`; delete/reorder edge failures, resource-provider errors, and
other host-owned plugin inventories keep their implementations `partial`.
