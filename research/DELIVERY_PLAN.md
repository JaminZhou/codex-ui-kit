# Delivery plan

This plan turns the current component foundation into a broad, evidence-backed
Codex-style application surface. It does not treat a passing test suite, a
single screenshot, or a generic primitive as product-level parity.

The machine-readable surface denominator remains
[`ui-inventory.json`](ui-inventory.json). This plan defines delivery order and
exit gates; it does not replace the inventory.

## Current position

- Installed-package discovery on 2026-09-12 now resolves to Codex Desktop
  `26.903.71938` (`8576`), Chromium `152.0.7977.83`, and ASAR SHA-256
  `58fef82480b9064e209b5b2fd934992e8d71515aea8084482369cfeaff1b8ee0`;
  see [the current baseline](26.903.71938.md). The previous package-only
  `26.901.51231` note is superseded. Existing surface evidence remains tied to
  its recorded build until each affected surface is re-observed; old fixtures
  remain regression evidence rather than current-product proof.
- The installed app now reports `26.908.70816` (`9275`), Chromium
  `152.0.7977.83`, and ASAR SHA-256
  `100b3a06768326eec58ae32e54fa7b85368fef8d4ead5a5866ecb0e8751bdeaa`.
  The earlier `26.908.40834` (`8881`) package remains recorded as a prior
  candidate; neither newer package silently replaces the promoted baseline.
- A dedicated isolated `26.908.40834` shell/sidebar candidate baseline is now
  recorded in [`current-baseline-26.908.json`](current-baseline-26.908.json)
  and [`26.908.40834.md`](26.908.40834.md). It covers eight renderer states,
  the wide/compact Project Index, sidebar keyboard/pointer lifecycle, Help
  menu geometry, and the native project-menu boundary. It remains a candidate
  until the affected surface families are re-observed on this build; the
  promoted global baseline is still `26.903.71938`. Same-recipe recaptures on
  2026-09-14 reselected the main Renderer after an additional avatar-overlay
  target appeared and recorded the content-dependent Recent chats/scroll-height
  changes instead of freezing prior row geometry; the latest capture refreshed
  the candidate identity and kept the scroll-owner assertion invariant.
- A fresh isolated `26.908.70816` shell/sidebar candidate is now recorded in
  [`current-baseline-26.908.70816.json`](current-baseline-26.908.70816.json)
  and [`26.908.70816.md`](26.908.70816.md). It repeats the eight renderer
  states, Projects wide/compact geometry, sidebar collapse/pin/keyboard
  lifecycle, Help menu, and native project-menu boundary without claiming
  untouched surface families. The promoted global baseline remains
  `26.903.71938` until affected families are re-observed.
- The same isolated `26.908.70816` build now has a separate Composer resource
  observation in
  [`current-composer-resources-26.908.70816.json`](current-composer-resources-26.908.70816.json).
  CDP computed layout records the unified `Add files and more` menu at
  `736×320px`, its `726×310px` scroll owner, `28.5625px` rows, and a
  sanitized public Plugins/skills catalog. Account-, tab-, and app-specific
  rows are excluded; no selection, upload, authorization, execution, or
  product-pixel promotion is inferred. `composer.resources` and
  `composer.plugins` therefore remain partial until their host-owned selected
  lifecycle and product-region pixels are captured safely.
- Stage 0 shell refresh is now captured at 26.903: the isolated Renderer was
  selected by URL, area, landmarks, and visible-control density; New chat,
  explicit Hide/Show, Pull requests → New chat restoration, sidebar
  expansion/focus, Help, and Projects wide/collapsed geometry pass the
  current baseline contract with zero horizontal overflow. The native project
  action trigger is verified, but its AppKit item list is intentionally marked
  unavailable because the new Renderer no longer exposes the old Fiber provider
  and CDP cannot inspect native windows. No unsampled menu contents are
  promoted.
- The inventory contains 92 surface groups: 59 P0, 22 P1, and 11 P2.
- 18 groups have current-build runtime evidence, 65 have previous-build-only
  runtime evidence, and 9 have not been sampled. Browser/Electron verified
  statuses remain intentionally scoped: the current 26.903 PDF slice is
  promoted, while older and broader families stay regression fixtures until
  their affected slices are re-observed.
- The current mixed-attachment refresh promotes `composer.attachments` to
  `26.825.51511` Browser/Electron verification with trusted-CDP image/file
  selection, wide/compact preview and pixels, focus-preserving removal, exact
  completion, and sent-media ownership. Upload failure/progress and plugin
  variants remain open.
- A current-build `26.903.71938` isolated approval probe now records the real
  external-file denial boundary: the contents-specific `Edit files` card,
  `Deny`/`Allow once` actions, and the exact no-write response after denial.
  The deterministic replay is covered at wide and compact sizes by Browser/CDP
  and Electron contracts and is intentionally not treated as product-pixel
  promotion. Allow, command/directory, session-lifetime, automatic-review,
  and other approval variants remain open.
- The current subagent refresh promotes `thread.subagent-delegation` and
  `thread.subagent-collaboration` from previous-build presentation evidence to
  `26.825.51511`. Three real tasks lock the active inline chip, completed-chip
  removal, flat preview-free Active/Done panel, root-only Parent activity,
  Parent → Child transcript drilldown, five exact observed avatars, and the
  419.59375/319/345.671875px wide/820/720 panel widths. Twenty-one focused
  CDP frames, native Electron interactions, and reviewed pixels gate the
  deterministic replay; failure/interruption reachability remains a separate
  product capture.
- The current transport-recovery follow-up promotes
  `thread.error-retry-recovery`. A real response stream in one isolated
  per-process proxy instance keeps the standard `Reconnecting 1/5` row, emits
  at least six open-ended `Reconnecting... waiting for network` rows, then
  completes in place and accepts an exact same-thread follow-up after network
  restoration. CDP and native Electron gate six wide/compact lifecycle frames;
  six reviewed baselines and a 3.3371% local-only owned-row product comparison
  gate the current appearance. Terminal transport failure and other retry
  causes remain P0 work.
- The current manual context-compaction follow-up promotes
  `thread.context-compaction`. A fresh isolated task reaches the dynamic
  `10% full` command, running, completed, and exact recovery states; a second
  `/compact` in the same task also settles and recovers. CDP, Electron, eight
  reviewed baselines, wide/compact zero-overflow contracts, and a 1.3189%
  ownership-masked product comparison gate the slice.
- The current Pull request review follow-up promotes
  `workspace.pull-request-review`. Its read-only PR #228 replay locks five
  Summary facts, two running checks, two Activity entries before the comment
  composer, normal/858.125px expanded detail continuity, four Code controls,
  nine file headers, and two image previews. CDP, Electron, three reviewed
  baselines, and local-only product comparisons at 3.7043%/3.3240%/4.8822%
  gate Summary, Code, and expanded Summary without exercising comment, review,
  or merge mutations.
- The current Pull requests route follow-up promotes
  `app.route-lifecycle-feedback` and `workspace.pull-request-route`. It locks
  the current persistent 321.875/437.53125/419.59375px sidebar/list/detail
  split, five-row loading skeleton, settled tabs/search/filter empty state,
  exact labels and SVG paths. CDP, Electron, two reviewed baselines, and
  local-only product comparisons at 0.3508%/0.6348% for the list and 0.1339%
  for the detail region gate the slice.
- The current Thread summary follow-up promotes `thread.context-summary`. Its
  28px trigger now anchors the 300×199 Environment/Git overlay at x=804/y=53,
  with a 25px radius, 14/21px weight-400 visible labels, five 272×29px rows,
  enabled Commit and PR actions, collapse, Escape, and outside dismissal. CDP,
  Electron, a reviewed baseline, and a dynamic-delta-masked 2.6918% product
  comparison gate the slice. The same probe reached the current `/compact`
  menu and running state, but the remote compact task failed and exposed
  Resume; successful compaction/recovery therefore remains previous-build P0
  evidence rather than being promoted.
- The current Web Search follow-up reaches two real public searches, settles as
  `Worked for 23s`, and exposes the current `Searched the web for Codex app
  desktop` / `Searched the web for "desktop"` rows. Three CDP frames, native
  Electron disclosure interaction, three reviewed baselines, and a 4.0506%
  foreground comparison promote `thread.search-tool-events`. A later Browser-
  only probe now naturally settles with exact missing-Chromium and unsupported-
  service errors. Its 12-event/two-turn replay, three wide/720 CDP and Electron
  frames, three reviewed baselines, and 1.08–3.11% owned-region comparisons
  promote the sampled `thread.tool-unavailable-recovery` path. An independent
  current success task now promotes `thread.browser-tool-events`: it settles
  as `Worked for 50s`, expands to `Used the browser, ran a command` plus three
  exact rows, returns `CURRENT BROWSER SUCCESS 26.825`, and mounts no Browser
  workspace at wide or 720px. Four CDP frames, wide/compact Electron, four
  reviewed baselines, and 6.0517%/5.7941% local-only foreground comparisons
  under 6.5% cover the slice. `workspace.browser` remains 26.825.31414
  regression evidence.
- The current command-failure follow-up reaches a real exit-code-7 command and
  an exact same-thread no-tool recovery. The Renderer keeps the failure as a
  neutral `Ran …` row and hides stdout, stderr, Shell, and exit-code cards while
  the protocol replay retains them. Three CDP frames, native Electron, three
  reviewed baselines, and a 1.2761% unmasked activity-region comparison promote
  `thread.command-failure-recovery` on 26.825. A third real task promotes
  `thread.interruption-stop`: it records the 19-second running state, the
  immediate `You stopped after 0s` frame, 20-second settlement with a
  persistent stopped-terminal row, and exact same-thread recovery. Four CDP
  and Electron frames, four reviewed baselines, and 4.9372%/2.0661% wide and
  compact product-region gates pass. Full background-process management stays
  previous-build P0 evidence.
- The current Plan follow-up confirms that simple ordinary and Plan-mode
  prompts can now settle without progress, while one complex read-only audit
  reaches `Step 5 / 8`, opens the eight-row 95.578125×200px hover card, removes
  the chip after completion, and settles cleanly. Its local-only product
  comparison passes at 3.5294%; the replay deliberately retains button and
  tooltip semantics absent from the sampled product. A separate current
  no-tool turn now covers the generated `Defining evidence categories and
  priorities` shimmer summary, a sampled `Worked for 14s` completion, and the
  final answer with zero command/MCP rows. CDP and native Electron gate both
  frames. The tight product crop is pixel-identical at 0% difference and the
  wider prompt/activity/summary region passes at 3.3389%.
  Unsampled reasoning variants keep the combined implementation partial.
- The current thirty-turn follow-up refreshes timeline virtualization and
  message navigation across 1180×820 and 720×680. It locks 12/9 mounted turns,
  the viewport-derived message-11 rail marker, compact rail suppression, and
  the observed two-stage return-to-latest lifecycle through CDP, Electron, and
  two local-only structural pixel gates.
- The current Composer-control follow-up re-observes the exact three-row
  permission overlay plus active Goal and Plan across 1180×820 and 720×680.
  Browser/CDP, Electron, six reviewed baselines, and six local-only
  current-product comparisons promote the sampled permission/mode paths while
  leaving custom policy, persistence, unavailable modes, and other host-owned
  variants partial.
- The scoped `26.825.51511` refresh revalidates the global shell, responsive
  Composer, primary navigation, project-group lifecycle, project-menu
  provider plus rendered Section submenu, Help menu, route restoration, and
  Projects Index. It locks the
  321.875px sidebar, the existing 559px/415px compact Projects layout, and the
  current Explore entry, and the continued absence of `Sites` from the sampled
  fixed-route stack. The native
  project menu is now 252×187 and its one-row `New section…` submenu is
  118×34; provider-only `Reveal in Finder` is explicitly separated from the
  six visible AppKit actions. The same-build Account/Settings follow-up now
  verifies the six-item 305.875×188.375px Account menu across Dark/Light and
  wide/compact states, the 321.875px Settings rail with twenty-two visible
  navigation rows, General, and Appearance while restoring System. The
  completed basic-message follow-up now verifies the header, exact no-period
  answer, four response actions, five Composer controls, and the 721→720
  responsive transition through CDP, Electron, three reviewed baselines, and
  nine ownership-scoped product pixel regions. Other lifecycle variants and
  the following 26.820 slices remain previous-build evidence until re-observed.
  The previous 26.825.31414 30-turn long-thread slice additionally promotes
  `thread.shell`, `thread.messages-basic`, `thread.virtualized-timeline`, and
  `thread.message-navigation`: the 1180×820 frame mounts 11 turns, exposes the
  30-button compact rail, materializes message 15 while retaining the sampled
  stale message-30 current marker, and returns to latest with eight turns. The
  720×680 frame hides the rail at zero content offset, mounts nine turns at
  `scrollTop = -900`, and restores latest through the 32×32px control. CDP,
  Electron, reviewed baselines, and local-only product references gate the
  current responsive boundary under a 1% structural pixel limit.
  The previous 26.825.31414 activity follow-up additionally re-observes
  `thread.activity-reasoning-plan` and `thread.command-execution` for one
  no-tool turn and two safe terminal turns. It replaces the continuous
  gradient with the installed 600ms-delay, 1s/48-step, 4s-period cadenced
  loading text; locks the 14/21px, weight-400 Thinking label with a
  38.5%-foreground base and 75%-foreground sweep; and confirms 60%-foreground
  collapsed/expanded `Worked for` plus `Ran …` rows. Browser/CDP, Electron, a
  reviewed 1180×820 baseline, and a 0.6% tight current-product foreground
  comparison gate the pre-answer state. A second 26.825.31414 follow-up
  originally gated Plan writing/completion: 3/5/8/10-step probes established
  Composer-dock ownership, `Step n / total` progress, variable-height tooltip
  lists, and removal after every step completed. The current 26.825.51511
  revalidation supersedes that sampled Plan runtime with one real eight-step
  read-only audit, exact Step 5/8 and completion states, and a 3.5294%
  foreground product comparison. Browser/CDP and Electron retain the active,
  expanded, progress, all-complete, and settled contracts. The current
  free-form no-tool probe additionally reaches `Thinking`, a generated
  reasoning summary, `Worked for 14s`, and the final answer; its CDP/Electron
  contracts prove zero tool rows; its foreground comparison is 0% and its
  wider product-region comparison is 3.3389%.
  Unsampled reasoning variants remain P0 work, so the combined implementation
  stays partial while its sampled current Browser/Electron status is verified.
  A further read-only probe originally covered
  `thread.search-tool-events`, `thread.browser-tool-events`, and
  `workspace.browser`. Web Search is now refreshed on 26.825.51511 with the
  two-level `Worked for 23s` → `Searched the web` disclosure and two 14/21px
  current result rows. The current successful Browser flow now presents
  `Used the browser, ran a command`, exact instructions/connect/verification
  rows, and no Browser workspace in wide or compact layouts. The historical
  26.825.31414 sample still preserves the 419.59375px one-tab workspace with a
  46px tab strip and 40px navigation toolbar as regression-only evidence. A
  current 26.825.51511 failure slice independently locks
  the naturally settled missing-Chromium and unsupported-service answers,
  3m46s/27s durations, terminal collapse, four response actions, and writable
  wide/720 Composer recovery without inferring successful navigation.
  Search Browser/CDP covers three collapsed/expanded frames, Electron repeats
  its open lifecycle, and its local-only foreground comparison passes at
  4.0506% under 5%. Browser success adds four current frames plus
  6.0517%/5.7941% wide/compact foreground gates; the previous Browser chrome
  comparison remains historical at 2.80%. External page
  pixels remain source-owned and are excluded behind an explicit content
  boundary. Multi-tab, authentication, downloads, permission prompts, and
  page-owned states remain incomplete.
  The current 26.825.51511 rich-stream follow-up promotes
  `thread.messages-markdown`.
  One real no-tool task reaches the link-only delta, an open empty TypeScript
  card, two task rows, a filled code block, a seven-column table, 36 streamed
  H2 sections, the running tail, and natural completion. It locks reverse-
  origin follow and scroll-away, 14/22.75px root typography, 17.5/24.5px H2s,
  14px round task controls, a 122.75px table, Stop-to-four-action settlement,
  and the empty-fence boundary that previously rendered `undefined`.
  Browser/CDP and Electron cover the six deterministic checkpoints, code copy,
  table focus, user scroll-away/return, native bounds, and zero overflow. Five
  reviewed baselines are committed; four local-only product regions pass at
  2.4398%, 4.7698%, 2.7219%, and 1.7196% under 8%. Citations now have an
  independent current slice. A separate same-build media slice promotes real
  loaded, unavailable, compact, and immersive-preview states through five
  CDP, Electron, and pixel gates. Table/Markdown errors and plugin variants
  remain P0 work.
  A second current `26.825.51511` sidebar follow-up promotes
  `app.sidebar-thread-history`, `app.sidebar-item-actions`, and
  `app.sidebar-status-indicators` for the sampled ordinary lifecycle. It locks
  the persistent 321.875px width at 1180 and 720, 305.875×30px rows,
  selected-running spinner, background-completed `#3a83f7` unread dot, exact
  Pin/Archive hover replacement, and 13/18.5714px row typography. Browser/CDP,
  Electron, three reviewed baselines, and local-only 2.9762%/0.3571%/0%
  shape comparisons cover wide, hover, and compact states. Waiting, error,
  worktree, mutation, and longer history variants remain incomplete.
  A third current `26.825.51511` sidebar follow-up promotes
  `app.sidebar-worktree-status-indicators` for one real disposable worktree
  lifecycle. It reaches selected setting-up, controlled initialization
  failure, successful Retry, background-completed unread, and restored-idle
  states. Its selected/read failure sample has no unread dot; a later
  background failure has error and unread together, proving that notification
  state is independent from worktree failure. CDP and
  Electron lock the 305.875×30 row, 14×14 branch, exact spinner/error SVGs,
  `#ff6764` error and `#3a83f7` unread colors, 39/11px branch insets, hover
  replacement, and the 720px boundary. Two reviewed frames and local-only
  3.7698%/0%/0% shape comparisons cover active, failed, and recovered rails.
  Queued/creating sidebar variants remain incomplete.
  A fourth current `26.825.51511` worktree follow-up promotes
  `workspace.worktrees` for the sampled setup workspace. One real controlled
  failure exposes expanded/collapsed details, the sanitized log, Edit
  environment, and Retry; removing the blocker then reaches Preparing,
  Checking out files, Worktree created, and Starting a task. Browser/CDP locks
  the 736×247.5 expanded and 736×112 collapsed cards, 710×123.5 log, 21px
  stages, exact observed status paths/colors, and the Retry transition.
  Electron repeats Retry, Cancel, and Edit-environment routing at wide and
  720px widths. Five reviewed baselines pass, while a local-only product crop
  passes at 5.2082% foreground difference under 6.5%. Retention, permanent,
  missing-directory, and other worktree variants remain partial.
  A fifth current `26.825.51511` follow-up closes the sampled managed-worktree
  Settings gap. It locks the four preferences, project grouping, Refresh,
  immediate Delete, New chat, conversation linkage, and the observed rule that
  Refresh removes a missing directory instead of presenting a repair card.
  The centered 768px route uses a 321.875px Settings rail, a 768×276.31px
  preference card, 46px project header, and 768×124.58px managed card; the
  720×680 frame preserves the fixed controls and zero document overflow.
  Browser/CDP covers six wide/compact/light/empty/conversation/missing-refresh
  frames, Electron repeats controlled state and route persistence, and six
  reviewed baselines pass. The local-only same-build owned-route comparison is
  4.5984% under 5%. Product Delete removed the exact disposable worktree and
  Git registration without a confirmation dialog. Native `Create permanent
  worktree` remains menu-observed but deliberately unactivated, so permanent
  creation and broader retention/pruning lifecycles keep the group partial.
  The public `WorktreeSettingsPage` now also exposes host-controlled loading,
  saving, saved, and error states with retry copy and a locked control surface;
  filesystem, Git, refresh, and conversation effects remain host-owned.
  The current fixed-message task promotes `thread.shell` and
  `thread.messages-basic` on 26.825.51511: exact 1180×820, 721×680, and
  720×680 geometry, the separate project/title header composition, four exact
  response actions, all five Composer hit targets, and independent header,
  thread, and Composer product comparisons. The prior 26.818 fixed-message
  task remains regression coverage with its 0.4320% unmasked crop.
  The current command anchor additionally promotes
  `thread.command-execution` for one real `/usr/bin/uuidgen` success. The
  unpredictable result proves terminal execution; the replay keeps only a
  same-length sanitized UUID. Browser/CDP and Electron cover the expanded
  `Worked for 8s` → `Ran /usr/bin/uuidgen` composition, hidden raw protocol
  output, response actions, Send recovery, and the 1180/720 native boundary.
  Two reviewed baselines and six local-only activity/Composer/header regions
  pass under independent 2.3%/1.2%/7% limits. The following current tasks
  refresh failure and interruption; broader background-process and direct
  Terminal-tab paths remain previous-build work.
  A second current command task now promotes
  `thread.command-failure-recovery`: an exit-code-7 command settles as the
  neutral `Worked for 15s` → `Ran …; exit 7` composition without visible raw
  output or exit-code card, then accepts an exact no-tool recovery. Three CDP
  frames, native Electron, three reviewed baselines, and an unmasked 1.2761%
  activity-region comparison gate this current path.
  A third current command task promotes `thread.interruption-stop`: one
  120-second read-only loop exposes `Working for 19s`, changes from
  `You stopped after 0s` to `You stopped after 20s` after settlement, retains
  the square stopped-terminal row, and accepts an exact no-tool recovery in the
  same task. Four CDP frames, native Electron, four reviewed baselines, and
  4.9372%/2.0661% stopped-wide/recovered-compact comparisons gate this path.
  Full background-process management and direct Terminal tabs remain
  previous-build work.
  The previous 26.820 command tasks promote `thread.command-execution`,
  `thread.command-failure-recovery`, and `thread.interruption-stop`. They reach
  one 12-second success, one exit-code-7 stdout/stderr command followed by an
  exact no-tool recovery, and one stopped 120-second loop followed by a second
  exact recovery. The current Renderer presents exit 0 and exit 7 as neutral,
  noninteractive `Ran …` rows, hides the old Shell/output/exit-code cards while
  the protocol retains those fields, and uses a square
  `Background terminal stopped with …` row. The sampled stop reports 0 seconds
  immediately and 16 seconds after settlement; it is one observation rather
  than a universal timing rule. Browser/CDP gates ten frames, Electron repeats
  the wide/compact terminal states, and unmasked current-product regions pass
  at 1.5813%, 1.5826%, 5.4109%, and 2.3502% under independent 2%, 2%, 5.5%, and
  3% ceilings. The previous 26.820 external-file approval task promotes
  `thread.approval-permission-events` and `composer.permissions`. It replaces
  the historical four-mode Composer menu with the current three-mode
  Ask/Approve/Full contract, proves that Ask is risk-scoped rather than an
  every-shell guarantee, and reaches real pending → denied/no-file plus
  pending → Allow once/file-created transitions. Browser/CDP locks six
  approval frames and the permission menu; Electron repeats both decisions.
  Unmasked product regions pass at 6.0489% wide, 6.1328% compact, and 5.1795%
  for the options menu under 6.2%, 6.3%, and 5.5% ceilings, with exact geometry
  independently gated. The current 26.825 external-file refresh replaces that
  previous-build boundary with a 736/688×177px card, current `Edit files` and
  `Allow ChatGPT to edit the following file?` copy, independent path/delta
  semantics, and the `Allow once`/`Allow all edits` options menu. Real deny and
  allow transitions prove absent and exact-created file outcomes. Six CDP,
  Electron, and reviewed replay frames pass; unmasked current-product regions
  pass at 3.1787%, 3.3225%, and 1.3415%. This promotes
  `thread.approval-permission-events` to current-build verification while
  leaving session-wide acceptance, automatic review, other approval kinds, and
  restart lifetime open. The previous 26.820 MCP task promotes `thread.mcp-tool-events`,
  `thread.mcp-tool-failure-retry`, `thread.panel-system`, and
  `thread.sources-panel`. It reaches one real Search → Fetch success and one
  captured invalid-URL Fetch → Search → Fetch recovery. Current completed and
  failed call rows are noninteractive, keep the failed call outside the
  recovered group, and do not expose the old error card or row disclosures.
  The 300×189 Sources summary stays mounted offscreen after unpinning and an
  outside click, then repins in place. Browser/CDP and Electron repeat the
  deterministic frames; unmasked sampled-product regions pass at 2.1978% for
  success, 3.3530% for the direct failed row, 1.2123% for compact recovery,
  and 1.7707% for Sources under independent hard limits. The live capture
  establishes one same-turn recovery, not a universal automatic-retry rule,
  and the replay-only in-progress Search frame is not promoted as a product
  pixel. The current 26.825 MCP refresh supersedes that sampled primary
  anchor with one real same-thread two-turn task: 20-second Search → Fetch,
  then 10-second invalid-URL Fetch → Search → valid Fetch. It also updates
  Sources to the current 300×313 Environment + Sources summary and verifies
  close/outside-click/repin behavior. Browser/CDP and Electron cover four
  frames; local-only regions pass at 2.6742%, 4.8070%, 3.8995%, and 2.9276%
  under independent 2.8%, 5%, 4.1%, and 3.1% limits. Authentication,
  elicitation, MCP approvals, cancellation, terminal same-transport failure,
  and other integrations remain open. A fresh 26.903.71938 read-only task now
  adds a success-only Search → Fetch observation: `Search OpenAI docs · 3
  calls`, `Fetch OpenAI doc`, and the current `Model Context Protocol` answer.
  CDP, Electron, wide/720 replay, Sources pinning, and three optional local
  product regions pass at 4.386%, 4.391%, and 4.260% under independent 5%
  ceilings. This does not promote recovery, approval, authentication, or other
  MCP transitions, and the native product references remain local-only. The
  current 26.903.71938 recovery task separately captures an invalid
  `Fetch OpenAI doc` followed in the same turn by `Search OpenAI docs` and a
  valid `Fetch OpenAI doc`. The three flat rows retain the failed status without
  an error card or row disclosure, and the canonical final answer is
  `CURRENT MCP 26.903 RECOVERY — Model Context Protocol —
  https://learn.chatgpt.com/docs/extend/mcp`. Wide, compact, and pinned-Sources
  Browser/CDP, Electron, and replay pixels pass; local-only product regions
  differ by 5.9622%, 4.1367%, and 3.7687% under 6.5%, 5%, and 5% ceilings.
  This is one same-turn recovery observation, not a universal automatic-retry
  rule. Authentication, approval, elicitation, cancellation, and other MCP
  transitions remain open, and native references remain local-only. The
  playground now adds an isolated public-protocol MCP elicitation form with
  typed string/enum/boolean fields, explicit Accept/Decline/Cancel responses,
  thread ownership, deterministic replay, and a real Electron responsive
  contract. It is own-playground App Server evidence only; it does not promote
  installed-product elicitation or current-build pixel parity. Authentication,
  approval, and cancellation therefore remain open product work.
  The current citations follow-up separately
  reaches three real inline OpenAI citations and the five-query Web Search
  Sources workspace. Six wide/compact replay frames pass Browser/CDP,
  Electron, reviewed pixels, and optional local-only product regions; the
  compact layout locks the 374.328125/345.671875px conversation/Sources split.
  This closes the sampled inline-citation and Web Search Sources slice without
  generalizing to other providers, failure/empty/loading states, or live
  media. The public SourceList contract now also models loading, empty, and
  retryable error states without promoting a provider or product pixel claim.
  A separate previous
  26.818 no-tool task remains regression evidence for
  `thread.messages-markdown`. It reaches heading,
  strong text, inline code, blockquote, list, a narrow table, and TypeScript
  code at 1180×820 and 720×680. The sampled external URL is source-owned and
  leaves plain visible text instead of an inline anchor. Browser/CDP and
  Electron lock the 736/688×358 roots, full-width table, 73px code block with
  word-wrap/Copy actions, four exact response actions, sampled typography, and
  zero overflow; unmasked
  root comparisons pass at
  1.1682% and 1.1932% under 1.3% limits. The same capture exposed
  that the expanded Projects wrapper is
  content-dependent; the sanitized gate now derives its height from the live
  Recent chats group instead of freezing a private-data-dependent 119px value.
  A previous 26.820 follow-up reaches double-dollar block math while preserving
  single-dollar math, escaped heading/image source, and footnote syntax as
  literal text. The installed renderer independently confirms KaTeX 0.16.45,
  media grouping, preview, loading/unavailable fallbacks, and render retry.
  The public implementation ships the matching fonts and exercises a loaded
  image plus an unavailable external source at 1180×820 and 720×680.
  Browser/CDP and Electron lock KaTeX/MathML semantics, 200px/96px media
  geometry, four response actions, immersive preview and focus restoration;
  two reviewed replay pixels are committed. A current-product media raster was
  not reached, so the result is not a whole-Markdown pixel-parity claim.
  A previous 26.818 sidebar task promoted thread history, task actions, and
  ordinary active/completed/unread status. Project tasks and Recents share
  19×20 Pin/Archive controls with an 8px gap; the 20×20 status rail keeps the
  exact 16×16 spinner or centered 8×8 unread dot. Browser/CDP, Electron, and
  four privacy-safe tail comparisons pass between 0% and 3.1944%. The sampled
  eight-row Recents count remains content-dependent and is not frozen.
  A second previous 26.818 sidebar probe promoted the New local worktree entry,
  real create/loading/restored, controlled failure, failed-plus-unread
  composition, and Retry recovery. It locks the sampled generic context
  labels, 264×91.125 two-action Environment menu, 30px worktree rows, exact
  branch/spinner/error/unread tracks, and action replacement. Browser/CDP,
  Electron, and three privacy-safe tail gates pass at 2.0833%, 0.7540%, and
  0.1786%.
  The previous 26.818 New chat home slice locks the sampled Dark and Light
  product preferences at 1180×820 and 720×680: persisted 322.90625px sidebar,
  exact 56px mark, four wide/two compact prompt cards, five exact SVG sources,
  prompt-to-Composer selection, project-dialog portal/focus return, and zero
  overflow. Browser/CDP and Electron pass all four states; unmasked owned-main
  pixel differences range from 0.2708% to 1.7855% under a 2.5% hard limit.
  The broader `26.810.52044` refresh remains
  previous-build regression evidence; it revalidated 115
  sidebar/menu/window-chrome/Composer/Settings/completed-thread icons against
  exact runtime evidence. It added Voice and Activity-attention, widened Help to
  320px, removes the Account Usage chevron and thread-header New chat action,
  renamed summary/Fork assets, and proved that a 720px resize kept the sidebar
  visible before explicit Hide/Show.
  That previous MCP follow-up also re-reached one Search → Fetch success, an
  invalid-URL Fetch → Search → Fetch recovery, and a transient
  `Reconnecting 2/5` row that completed in place. It promoted the exact MCP,
  disclosure, and reconnect glyphs and added Browser/Electron/pixel gates for
  that build without claiming the remaining MCP variants.
  The previous command follow-up additionally re-reached exit-code-7 recovery
  and command interruption. It proved that 26.810 retained the stopped
  background-command row after process settlement and same-thread recovery,
  superseding the previous `Ran …` rewrite.
  The previous worktree follow-up re-reached real create, controlled failure,
  failed-plus-unread composition, Retry, and recovery. It superseded the
  previous single-status replay with the observed branch/error/unread
  three-track row and exact 8/36/67px trailing insets.
  The previous Project picker follow-up restored the 260×249.5 two-action
  composition, promoted its exact New/Clear glyphs, and verified empty search,
  Escape focus return, clear, and original-project restoration in Browser/CDP,
  Electron, and a 0.9546% local-only listbox comparison.
  The previous Projects Index follow-up separately reached the real
  `26.818.41509` route and locks fourteen 70px rows, 512/64/128 wide columns,
  416/128 explicitly collapsed compact columns, sorting, empty search,
  expansion, and focus continuity. Browser/CDP and Electron acceptance retain
  the structural gate. The 0.2221% route and 3.7068% Create-region comparisons
  remain explicitly scoped to the previous 26.810 build until 26.820 pixels
  are recaptured.
  The previous approval follow-up reached one real outside-project command
  prompt, options menu, safe denial, proven no-execution state, and Composer
  recovery. It distinguished the exact Ask-mode hand glyph from the non-ask
  shield and added Browser/CDP, Electron, and three regional pixel gates
  without promoting Allow or other approval kinds.
  The previous Review follow-up reaches the real `+4 −4` three-file card,
  two-file rename presentation, 419.59375/345.671875px wide/compact workspace,
  all six scopes and toolbar controls, successful Undo → Reapply, and the
  420×247.6875 skipped-file conflict. It promotes build-scoped Review assets
  and adds Browser/CDP, Electron, eight integrated visuals, and four
  2.9976%–4.6219% local-only product gates for the same four inventory groups
  while keeping unsampled binary/merge-conflict and broader host variants open.
  The current `26.825.51511` anchor now supersedes that sampled ordinary edit
  path with a `+5 −5` three-row card backed by four raw add/delete diffs,
  591.828125/344.671875px wide/compact Review panels, exact card/Undo assets,
  four CDP and Electron frames, four reviewed baselines, and independent
  card/panel product gates. The duplicate raw `alpha.txt` delete/add entries
  remain intentionally distinct in the workspace while the card aggregates
  them into one modified row.
  Earlier hover/footer slices promoted More, Pin,
  Archive, and Help, confirmed that Settings is absent from the sampled footer
  and that sampled project-task rows have no leading glyph. The Recents follow-up
  independently scrolled to one section, paired six Pin/Archive rows, confirmed
  zero leading SVGs. The window-chrome follow-up promoted the visible
  Sidebar/Back/Forward controls and reduced the explicit visual approximation
  denominator from 15 to 8. The Composer follow-up promoted Project, Worktree,
  Branch, Add files, Permission, Model chevron, Dictate, and Voice, reducing
  the scoped visible-shell denominator to zero while explicitly retaining the
  broader inventory/lifecycle blocker. The `26.803.61601` command follow-up ran
  bounded success, exact `exit 7`, and a stopped 120-second command. It adds
  the exact three-path terminal glyph, separates the current-turn 28px Stop
  action from background-terminal Stop all/per-process controls, proved
  settlement and same-thread recovery, and promoted command execution/failure,
  interruption, and background-process management through Browser/CDP, real
  Electron, and local-only owned pixels.
  The previous Terminal follow-up separately proves that a child command's
  `exit 7` returns to the same interactive shell instead of producing a
  terminal failure, while ordinary shell `exit` closes the tab. A real
  agent-created background process appears in the thread summary and opens a
  live side-panel terminal. Package structure supplies the otherwise unsafe
  crash-only title/description/Reload contract. The independent replay keeps
  those evidence classes separate and adds four Browser/CDP, Electron, and
  reviewed pixel gates for command exit, reload, background summary, and
  close/reopen side-panel behavior.
  The previous account-menu follow-up added six exact icons and gated its six-item,
  one-avatar, zero-role-separator structure, 258.11×188.38 geometry, dismissal,
  focus return, and owned pixels at 0.1979%. The previous `26.818.41509`
  refresh now supersedes that layout with a Dark/Light × wide/compact matrix,
  322.90625px sidebar, 306.90625×188.375px menu, 28.5625px rows, zero compact
  overflow, and privacy-masked ratios from 0.3968% to 0.5458%. The current
  26.820 matrix supersedes its focus/typography boundary: pointer open focuses
  the menu surface, rows compute to weight 400, responsive compact pinning is
  explicit, and four privacy-masked ratios pass from 0.3794% to 0.5284%.
  Sidebar actions and ordinary task status were separate verified denominators
  on the previous build. The previous-build status
  slice reached active and unread runtime states, preserved the active spinner
  while a follow-up is queued, and locks the exact trailing rail, spinner, dot,
  computed color, action replacement, and glyph pixels. The separate
  pending-worktree slice reached a real disposable worktree create, a
  deterministic create failure, and a successful Retry recovery. It preserved
  queued/creating/setting-up/failed/restored semantics, locks the 14×14 branch
  marker plus 20×20 status rail, and added Browser/CDP, Electron, and local-only
  loading/error/restored pixel gates. The persistence follow-up creates a real
  worktree and task, proved project/task survival across an isolated app
  restart, recorded that the exact thread route is restored only after selecting
  the retained task, and reached the 736×37.125 missing-working-directory
  notice. It separately proved that an editable Composer and model-only turn
  remained available, that restoring the directory did not clear the notice in
  the existing app session, and that the next app restart recovers it. The
  independent previous-build sidebar replay, Browser/CDP, Electron, and a local-only
  notice-region gate cover the same observed boundary without inventing a
  Retry or repair control.
- A reproducible sanitized global-shell capture now selects the main Renderer
  structurally, records dark 1180×820, 820×680, 721×680, and 720×680 geometry,
  normalizes collapsed and explicitly pinned narrow states, verifies Pull
  requests → New chat restoration, and records zero horizontal overflow. Its
  Browser/CDP and Electron counterparts cover the same structural boundary.
  The capture is Renderer emulation; native resize remains a separate Electron
  gate. The 3.1387%, 0.4126%, and 0.3146% same-state dark New chat product
  pixel results remain scoped to 26.810 until recaptured. Earlier lifecycle
  evidence that was not re-reached retains its
  original build prefix.
- The previous `26.730.61639` refresh covers the local Terminal session shell,
  a real bounded running/completed command with panel persistence, and the
  cross-worktree mismatch warning plus recovery actions. It locks
  project-labelled/global-indexed tabs, close-nearest and label reindexing,
  the four-item picker, three-tab 820×680 fit, independent transcript state,
  close/reopen while running, close-last collapse, and fresh terminal creation
  from the top Toggle. That previous refresh also covered one real delegated
  subagent through active work, completion, summary, panel, transcript, and
  explicit 820×680/720×680 reopen. Two more current tasks now cover concurrent
  siblings plus a Parent → Child delegation through active, mixed, completed,
  summary, flat-panel, live-progress, and independent transcript states while
  retaining public `agentPath` hierarchy. The current `26.825.51511` refresh
  supersedes the success presentation with root-only Parent activity, child
  drilldown inside the Parent transcript, preview-free flat lists, current
  avatars, and 419.59375/345.671875px wide/720 widths. Browser/CDP retains the
  broader regression matrix while independently gating the focused current
  lifecycle; Electron repeats
  the session, mismatch, input, picker, close, and resize interactions; the
  current 906×820 panel/content pixel ratios pass at 1.5120%/0.4004%.
  The single-subagent summary/panel/transcript regional ratios pass at
  4.1812%/1.3451%/1.5969%. Nine concurrent/nested scenes now gate ten regions:
  panel/summary/transcript comparisons pass between 1.3329% and 4.6708%, and
  the compact nested main-activity band passes at 11.4952% under its separate
  12.5% limit.
- A source-structural follow-up on the unchanged `26.803.41515` fingerprint
  confirms `pendingInit`, `running`, `interrupted`, `completed`, `errored`,
  `shutdown`, and `notFound` agent states; Active/Done grouping by the public
  three-state presentation; and 4/10 panel limits. A schema-valid twelve-agent
  replay now covers waiting, streamed progress, errored/interrupted/shutdown/
  unavailable terminal results, Active and Done pagination, and failed-agent
  transcript access. Browser/CDP, Electron, and three reviewed internal pixel
  baselines pass. These are independent implementation gates, not a claim that
  the unsampled recovery transitions were runtime-reached in the product.
- The same unchanged fingerprint now supplies source-structural evidence for
  inline-Markdown in-progress ownership, the latest-turn follow state machine,
  and the current Table container/scroller plus Copy/Expand/Preview controls.
  A separate schema-valid replay mutates an incomplete link and code fence
  across four deltas, then completes a nested/task-list, multi-column, twelve-
  section response. Browser/CDP gates five checkpoints and computed geometry;
  Electron verifies code copy, user scroll-away, and return to latest; four
  reviewed internal baselines pass. A later current-build 18-column task
  runtime-reaches the table Copy, Expand, and preview path. The public
  `allowWideTables` contract, exact Markdown/HTML copy, 156-frame Browser/CDP
  matrix, real Electron flow, three internal baselines including a 720×680
  action-reachability state, and local-only 4%/1% preview/close gates now pass.
  Product reachability and pixel attribution for
  the streaming mutations remain open, as do table error variants.

  The Markdown error follow-up now adds a controlled renderer-boundary replay:
  the current rich response first shows the public `Markdown couldn't render`
  alert and `Try again` action, then restores the table after retry. Electron
  checks the alert semantics, focus reachability, retry transition, zero
  overflow, and 1180px/720px own-fixture screenshots with zero drift. This is
  implementation/replay evidence only; it does not claim that the installed
  product emitted the same renderer failure or that provider/plugin Markdown
  errors are covered.
  A bounded terminal-transport replay now covers the current terminal panel's
  disconnected state, session-scoped `Reconnect` action, focus reachability,
  recovery to a fresh prompt, responsive containment, and zero-drift
  1180px/720px own-fixture screenshots in Electron. This remains replay-only
  evidence; it does not claim a real PTY/IPC transport drop in the installed
  product.
  A bounded context-summary replay now populates the Outputs and Sources
  sections with an artifact, source count, and plugin source. Electron checks
  section collapse/expand, focus reachability, computed typography, responsive
  containment, and zero-drift 1180px/720px own-fixture screenshots. This is
  replay-only evidence and does not claim a populated summary from an
  installed-product task.
- The previous `26.730.61309` refresh covered all six left-sidebar groups,
  selected/no-project and New worktree entry, plus sampled command, approval,
  interruption, compaction, summary, and pasted-image surfaces. The sidebar capture locks the
  274px column, 46px titlebar, 70px navigation header, 30px rows, five
  expandable project groups, dense history, item actions/status, fixed 46px
  footer, 16px resize target, and the exact 721/720 responsive boundary. At
  720px it auto-hides; an explicit Show action pins the normal 274px split
  across route navigation, while an inline-start hover no longer opens the
  legacy edge preview. The dedicated de-identified scene passes Browser,
  Electron, internal pixels, and current-build top/selected/footer regional
  gates. The `26.803.41515` follow-up additionally locks the current project
  More/New chat and task Pin/Archive hover toolbars, the Help footer action,
  and the scoped absence of leading glyphs in sampled project-task rows in both
  Browser/CDP and Electron. The Recents follow-up adds six current rows with
  24×24 Pin/Archive actions, a 4px action gap, and no leading glyph.
  Its current-build top/selected/footer pixel ratios are 3.4526%, 0.1163%, and
  0.4126%, with the Help control left unmasked; the dedicated masked Recents
  region passes at 2.5356%. The visible window-chrome icons now come from the
  exact manifest, and their independent 120×46 crop passes at 3.2609%. The
  visible Composer context/actions now also use eight exact manifest assets.
  CDP and Electron gate their order and 14/16px geometry across current
  conversation/workspace states; an external workspace comparison passes at
  0.4651%, and the eight asset crops have zero changed pixels. The newest
  lifecycle pass adds six project-group stacks with 30px project/task rows,
  2px/8px child-list padding, and 1px separators,
  pointer/Enter/Space expansion, a conditional six-/seven-item project menu,
  an eight-item Help
  menu with its `What's new` heading, and explicit 720px pinned continuity.
  Twelve additional menu icons are exact runtime primitives. Browser/CDP,
  Electron, and four local-only current-product comparisons pass at 1.54%,
  0.13%, 0.30%, and 3.12% under scoped hard limits. The
  preceding `26.727.40816`
  refresh covered window navigation, route loading/restoration, the New chat
  Composer and project picker, the read-only Terminal shell, and the public
  Pull request route.
  The PR lifecycle now follows the two-tab Summary/Code contract with Timeline
  integrated into Summary, successful read-only Code content, Auto-merge, and
  responsive detail restoration. Its independent state machine adds
  index/detail loading and failure, checks, comments, review submission,
  merge-readiness, merge completion, compact layout, and route restoration.
  Together the playground gates now cover 125 CDP/pixel frames, including one
  independently implemented light shell/sidebar/Composer composition. Light
  is route-scoped to the theme-complete shell/workspace; conversation and Pull
  Request retain their deterministic dark presentation. Project, Environment,
  and Worktree overlays, the shell success indicator, and the native System
  background are included in the light Electron contract. The internal theme
  frame does not promote current-product light evidence. The
  refreshed PR detail passes the current 906×820 regional pixel gate. The
  earlier MCP refresh matches Search → Fetch and the previous standalone
  failure/recovery composition. The `26.803.41515` refresh now supersedes those
  primary anchors with a 35-second Search → Search → Fetch success group and a
  16-second invalid-URL Fetch → Search → Fetch recovery inside one group. Five
  lifecycle states plus one compact variant pass Browser/CDP, native Electron,
  six internal baselines, and local-only current-product group/card pixel
  gates. The historical Composer queue/Stop probe locks its 710×39 tray,
  28×28 Stop control, `You stopped after 2s` summary, and automatic queued
  continuation. The current 26.825 refresh now supersedes it with 710×37
  pending and 710×72 paused trays, two Resume entry points, restarted-primary
  → automatic queued continuation → settled transitions, exact icons, and
  wide/compact Browser, Electron, and product-region pixel gates. The same
  refresh locks four-line/20-line growth and the 736/687×320 inline
  Add-resource picker. Earlier permission evidence remains historical. A
  third read-only probe locks active
  Goal and Plan labels, prompts, 736×98 geometry, clear/focus restoration,
  and two sub-0.5% regional pixel gates. A fourth read-only slice locks the
  82-message compact navigation rail, seven-turn mounted window,
  reverse-origin scrolling, return-to-latest interaction, and a sub-1%
  ownership-masked regional gate. A fifth disposable-task slice locks the
  736×162 command-approval card, denial without execution, response actions,
  and restored 736×98 Composer through CDP, Electron, and sub-1% regional
  gates. After the `26.730.61309` update, a fresh disposable-task slice
  re-locks a real 400-line successful
  command, collapsed/expanded Shell card, 144px reverse-tail viewport,
  copy controls, and collapse/reopen restoration through CDP, Electron, and
  a 0.17% ownership-masked full-window gate. A second real command now locks
  mixed stdout/stderr, an exit-code-7 failed Shell card, exact copied output,
  collapse/reopen restoration, and a successful no-tool follow-up in the same
  thread. Its three independent frames pass Browser/CDP, Electron, and a
  0.89% ownership-masked full-window gate under a 1% hard limit. A third real
  command now locks the 28×28 Stop action, `You stopped after
  1m 35s`, the transient `Background terminal stopped with …` row, its later
  `Ran …` settlement, and exact same-thread no-tool recovery. Four independent
  frames plus Browser and Electron interaction pass, and the immediate-stop
  full-window comparison measures 0.44% under a 0.5% hard limit. A fourth
  disposable task drives `/compact` from its 9%-usage command row through
  `Compacting context`, Stop, `Context compacted`, and exact same-thread
  recovery. Four current frames plus Browser and Electron interaction pass;
  the ownership-masked running comparison measures 0.16% under the same 0.5%
  hard limit. A fifth current task identifies the thread summary as a distinct
  environment/Git workflow overlay, locks its 28px trigger, 300x199px panel,
  five compact rows, keyboard/dismissal behavior, and 2.86% ownership-scoped
  pixel result in Browser and Electron. Populated resource sections and the
  current compact/pinned layouts remain separate evidence gates. A sixth
  disposable task now locks a real `open -a Calculator` approval from the
  736×162 pending Composer-dock surface through `Allow once`, command success,
  the exact final response, unchanged `Ask for approval` policy, and focused
  empty 736×98 Composer restoration. Its independent accept trace, Browser/CDP,
  Electron, and pending/completed current-build pixel gates pass at 1.26% and
  0.30% under 1.5% limits. A seventh disposable task now locks the current
  `Allow similar commands` menu and proposed execpolicy-amendment path: the
  first command completes after approval, an identical second command
  completes without another prompt, the global Composer policy remains Ask,
  and Browser/CDP, Electron, and two current-build pixel gates pass at 1.21%
  and 1.37% under 1.5% limits. An eighth current disposable task now locks the
  pasted-image attachment lifecycle:
  a 736×180 Composer, 80×80 attachment with a 78×78 preview and 16×16 Remove,
  removal/focus restoration, re-attachment and submission, an 80×80 sent
  message attachment, the exact final response, and the restored focused
  736×98 Composer. Browser/CDP covers 81 frames, Electron drives the same
  lifecycle, and current-build ready/completed regional gates pass at 0.39%
  and 0.79% under 1.5% limits. The `26.803.41515` attachment follow-up now
  adds current source-structural file-card/upload/error/progress evidence,
  public file/folder/image/error components, five-item wrapping containment,
  retry and preview recovery, and a trusted Electron file/folder selection
  bridge. Browser/CDP and Electron verify the independent variants at
  1180×820 and 820×680. The `26.820.60940` follow-up now reaches real
  post-picker text/image cards and immersive image preview in isolated
  processes, then locks their wide/compact Browser/CDP, Electron, and
  local-only product pixels. The `26.825.51511` refresh supersedes those
  measurements with 736/688×154px mixed-image/file Composers, Edit-first
  preview, multiplicative zoom, focus-preserving removal, exact completion,
  and sent-attachment ownership across Browser/CDP, Electron, reviewed
  baselines, and local-only product pixels. Actual failure/progress
  transitions, plugin attachment variants, and a public non-image App Server
  input type remain open.
  The preceding `26.727.40816` results remain previous-build evidence.
  Attachment variants outside that sampled image path and Terminal
  multi-tab/process behavior remain historical regression evidence. Review
  rename/delete is now re-observed on `26.730.61309`: delete remains a
  single-file diff, while rename is presented as separate source/destination
  files backed by a temporary marker line rather than a public `move_path`
  arrow. The dedicated replay, Browser/CDP, Electron, and current-build pixel
  gates pass; binary/conflict reachability remains host-derived. That build's
  project-named single Terminal tab and close/add controls passed independent
  Browser, Electron, and regional pixel gates before the broader current
  Terminal refresh superseded them.
  Installed-product global notification tones beyond the sampled success path,
  live light-theme shell evidence, unsampled
  long-thread window sizes/eviction heuristics, direct-shell failure/restart
  semantics, background agent-process reopening, current-product review submission and
  mutating comment/merge transitions, and the remaining Markdown, tool, and
  attachment variants remain on their recorded evidence levels.
- The current `26.825.51511` context-control follow-up now supersedes the
  previous project/Local/main sample. Seven Browser/CDP, Electron, reviewed
  baseline, and local-only product-region gates cover the wide/compact project
  picker, five-action run-location menu, New local worktree controls,
  Environment menu, and current non-radio Branches menu. A follow-up adds a
  deterministic populated-environment registry replay at 1180px/720px in dark
  and light themes, with saved local/remote records, edit/update, Forget, and
  a disconnected repair → Retry path. Browser/CDP, Electron, and five reviewed
  baselines pass for that replay. This promotes the sampled
  `conversation.context-controls`, `conversation.project-picker`, and
  `composer.project-worktree-selection` paths while keeping production Remote,
  installed-product environment repair, and branch-mutation failures open.
- Existing Browser and Electron results remain useful regression evidence, but
  they are `partial_legacy` until the affected surface is re-observed on the
  current build. The sampled unavailable-tool recovery is now current verified;
  successful Browser activity/workspace deliberately remain partial legacy.
- The current-style mixed-tool thread is now delivered as one schema-valid,
  protocol-backed composition: Web Search → Browser open/find, OpenAI
  Developer Docs Search → Fetch, command approval, file Review, and one
  delegated audit across eight lifecycle states plus a 720×680 final state.
  The replay matrix now contains 33 traces and 406 events, with 156 reviewed
  CDP/pixel frames and real Electron interaction. Its nine committed rasters
  are internal regression baselines. Because no single current-product task
  was captured with the entire sequence, it does not promote any inventory
  row or claim whole-thread product runtime/pixel parity.
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
  surfaces re-observed on `26.825.51511`;
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
- `app.sidebar-project-group-lifecycle`: row/task geometry, pointer and
  keyboard expansion, focus, and responsive continuity;
- `app.sidebar-project-actions-menu`: the fixed project action menu, keyboard
  access, icons, dismissal, and focus behavior;
- `app.sidebar-thread-history`: recent tasks, grouping, pinning, running,
  queued, unread, error, empty, loading, and long-list states;
- `app.sidebar-item-actions`: hover/focus actions, context menu,
  rename/archive/delete affordances, and keyboard access;
- `app.sidebar-status-indicators`: ordinary active, waiting, unread, and idle
  task presentation across project and recent rows;
- `app.sidebar-worktree-status-indicators`: pending worktree queued, creating,
  setting-up, failed, and restored presentation. The previous 26.818 slice
  re-reached real create, controlled failure, failed-plus-unread composition,
  Retry recovery, and exact 30px trailing geometry through product CDP,
  Browser/CDP, Electron, and local-only pixels. The previous 26.820 slices now
  re-reach real loading, controlled failure, foreground-read failure,
  failed-plus-unread composition, Retry recovery, and restored success. The
  current 84×30 failure tail has 0% foreground-mask difference while the
  existing Browser/CDP and Electron contracts keep exact geometry, paths,
  color, animation, and action replacement. The current 26.825 slice
  supersedes the sampled sidebar lifecycle with selected setting-up,
  failure-without-unread, Retry recovery, restored-plus-unread, and idle
  restored states. It passes active/failed/recovered 84×30 shape comparisons
  at 3.7698%/0%/0%; queued/creating and the broader failure workspace remain
  open;
- `app.sidebar-footer-account-settings`: account, settings, update/status, and
  footer overflow behavior. The 26.820 Dark/Light × wide/compact account menu
  is current Browser/Electron verified with menu-surface focus, weight 400,
  responsive pinning, Escape return, and local-only privacy-masked pixels;
  full Settings routes remain owned by Stage 4.
- `app.sidebar-help-menu`: current release-note grouping, support/setup actions,
  geometry, dismissal, and focus return.

Previous-build progress: 26.818 thread history, hover actions, ordinary
active/completed/unread/waiting/error presentation, worktree-specific
create/failure/Retry status, and empty/loading/long-list collection states were
verified. Its empty state is tied to a live `No chats` project row; loading and
the five-item `Show more` boundary are locked to that build's ASAR structure,
then repeated through Browser/CDP, Electron, and reviewed pixels. The New chat
selection, project portal, Dark/Light, 1180/720, and footer/account matrices are
also previous-build evidence. The previous 26.820 slices revalidate the global
shell, primary navigation, project-group lifecycle, project-actions provider,
Help menu, account-menu matrix, Projects Index, shared 30px project/Recents
history rows, shared Pin/Archive actions, and real active/unread status rails.
The current edge refresh additionally re-observes a real waiting-on-approval
project row as the shared spinner visual and replaces the older reversible
long-list replay with the live one-way `Show more` lifecycle. The current
worktree follow-ups re-observe a real empty collection and the complete sampled
loading → controlled failure → failed-plus-unread → Retry → restored boundary.
The playground now also exposes a deterministic `collection-error` replay with
the same `role="alert"`, copy, typography, and compact geometry as the shared
collection state component. This closes the implementation/acceptance gap for
the failed collection branch without promoting a synthetic failure to current
installed-product evidence. Remaining Stage 1 work includes re-observing
ordinary error and collection loading on the installed build, plus broader
route lifecycle feedback and installed-product notification reachability. The
shared ProjectIndex implementation now also exposes host-controlled
loading/error/disabled locks for project sorting, selection, expansion, and
recent-chat opening; partial-error data remains selectable so hosts can keep
recovery-oriented navigation available.
The linked conversation project picker and local-environment dialog now expose
the same host-controlled disabled boundary for option selection, keyboard
focus, search, and environment selection; dismissal and host-provided footer
actions remain explicit host-owned escape hatches.
Thread navigation controls, the message rail, and the latest-message floating
button now expose the same disabled boundary, preventing route transitions from
emitting sidebar, history, scrub, or jump callbacks while preserving their
observed geometry.
The contenteditable ComposerEditor now exposes the same disabled boundary,
including non-editable semantics and suppression of host editing callbacks
during route or submission transitions.
The AppWindowChrome navigation group now propagates the same disabled boundary
to Sidebar, Back, and Forward actions without taking ownership of host routing
or native-window behavior.
Sidebar sections, project groups, and bounded history collections now expose
the same host-controlled lock for collapse, project expansion, and Show more;
row and footer action slots remain host-owned.
The Browser workspace shell now propagates the same disabled boundary to tab,
close, and toolbar actions while keeping page content and browser effects
host-owned.
Document and PDF preview chrome now propagates the same disabled boundary to
open/retry, paging, zoom, annotation, download, and external-open actions while
leaving renderer and file effects host-owned.
File-change disclosure, changed-file opening, and diff-copy controls now use
the same disabled boundary while preserving host-owned diff text and file
effects.
The FileReview and FileReviewWorkspace compositions now expose the same
host-controlled disabled boundary across file selection, scope/filter/layout
controls, diff disclosure, copy/open actions, and Git actions while preserving
host-owned review content and effects.
ApprovalRequest now exposes that boundary on its root semantics, decision
buttons, scoped approval menu, and document-level hotkeys; ApprovalCommandPreview
also locks its collapse/expand action while preserving host-owned approval
decisions and command content.
SearchActivity, BrowserActivity, McpToolCallGroup, and ToolCallCard now pass the
same boundary through AgentActivity and their result/step/raw-output actions,
preventing host callbacks while preserving protocol content and disclosure
ownership.
CommandExecution and CommandOutput now expose the same boundary for command
disclosure, command/output copy, and internal output rendering while leaving
host-provided child surfaces explicitly host-owned.
ResourceList, ArtifactList, SourceList, and SourceSearchActivity now expose the
same boundary for progressive reveal, retry, source opening, and query
expansion; static or caller-provided child content remains host-owned.
GeneratedImageGallery and ImagePreviewDialog now expose the same boundary for
image opening, paging, download/edit, navigation, and zoom; dialog close and
Escape remain explicit host-owned escape hatches.
AgentReasoning, AgentPlan, ProposedPlan, and ActivityTimeline now expose the
same boundary for their built-in disclosure, copy, download, and plan actions;
caller-provided child/action slots remain host-owned.

Previous 26.820 Projects → Back → Forward now preserves the product
location key across 1180/720, explicit Hide/Show, and width restoration. The
independent Browser/Electron route stack additionally preserves a selected
project chat through Back/Forward, closing the previous selection-continuity
gap beyond New chat. The sampled 26.820 success path is reached through
reversible Pin chat → `⌘Z`; its exact top-center
Sonner structure, live-region semantics, SVG paths, geometry, Browser/CDP,
Electron, and 0.8029% product crop pass. The previous 26.820 ASAR
source also locks the exact info, warning, and danger notification icons used
by replay without promoting those unsampled tones. Browser/Electron gates lock
the exact ordinary-error paths and loading accessibility/skeleton structure,
but isolated app-server termination
and blocked/latency-injected ChatGPT loading did not reach either row-level
state; those negative probes do not satisfy the runtime gate.
The `26.825.51511` same-contract refresh now promotes the sampled success and
bounded stack to the active baseline through title-hash-only CDP evidence,
exact computed styles, two regional screenshots, reversible Pin/Undo state,
and precise disposable-task cleanup. A replay-only tone/action matrix now
covers success, warning, info, and neutral queue entries at 1180px and 720px
with computed-style, focus, action-transition, and repeat-screenshot gates;
this does not promote unsampled tones or their triggers to installed-product
runtime evidence, and error/danger reachability remains open.
The same build now also supersedes the legacy App Server recovery card with
the full-window fatal page. A fail-closed isolated capture proves the exact
terminated → fatal replacement → post-Restart three-process transition,
wide/compact styles and geometry, Browser/CDP, native Electron, and a
local-only product comparison that masks only the non-distributed
illustration. Broader route failures remain separate, but the sampled fatal
recovery surface is current-build verified.

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
| Width | wide split, medium constrained split, 720px visible persistent sidebar, explicit Hide/Show, modal safety fallback below the persistent-track minimum |
| Theme | light and dark |
| Content | empty, normal, long names, dense history, overflow |
| Lifecycle | loading, selected, running, queued, unread, error, restored |
| Input | pointer, keyboard, focus-visible, Escape, resize keys |
| Evidence | current CDP styles, Browser, Electron, regional pixels |

Exit: all ten sidebar IDs have current-build evidence and an explicit status;
the shell remains usable without horizontal overflow at the compact gate.

### 2. Finish conversation and Composer lifecycle

- successful, failed, cancelled, unavailable, and retried MCP/tool calls;
- search, browser, command, file, approval, and subagent events in one
  multi-turn thread;
- interruption, retry, compaction, context summary, message navigation,
  virtualized history, scroll-away, and scroll-follow behavior;
- Composer queue, attachments, modes, permissions, environment/worktree
  context, long input, disabled/submitting/Stop states, and recovery.

The previous-build MCP success and invalid-URL failure/retry paths were
refreshed on `26.818.41509`, including the sampled public URL mention, 720px
compact card, and Sources summary ownership lifecycle. The unavailable-
integration fallback remains previous-build evidence: it observes GitHub
integration unavailability followed by OpenAI Developer Docs Search → Fetch
recovery in the same thread, but does not claim that the unavailable transport
itself reconnected. The current-style mixed multi-turn replay now composes search,
Browser, MCP, command, approval, file Review, and subagent events under one
public reducer and one Browser/Electron/pixel matrix. It is composition
evidence, not a synthetic promotion of whole-thread current-product reachability.

The Markdown composition is now refreshed on `26.825.51511` with a real rich
stream. Six replay checkpoints independently lock link-only output, an open
empty fence, task rows, the filled code/table state, 20- and 37-heading long
states, and completion. Reverse-origin follow, explicit scroll-away/return,
code copy, table focus, current response actions, exact computed styles, five
reviewed baselines, and four local-only product regions pass Browser/CDP,
Electron, and pixel gates. Very-wide-table actions remain independently
versioned current runtime evidence. Inline citations and live media now have
their own current slices; table/Markdown error variants remain open.

The previous-build completed conversation core was refreshed on `26.818.41509` with
one fresh exact reply. Settled 1180×820 and 820×680 CDP/Electron evidence,
12 exact thread primitives, Browser geometry, regional pixel comparisons, and
a real Electron BrowserWindow cover the header, user/assistant turn, four
assistant actions, all five Composer controls, responsive containment, and
zero overflow. The unmasked 768×774 sampled product region differs by 0.4320%
under a 0.5% hard limit. Streaming, approval,
file, interruption, compaction, and long-thread rows initially retained their
separately versioned evidence. The streaming row is now also refreshed on the
same previous build with one real 1180→720 running resize and natural
completion: reverse-origin follow, negative compact clipping, exact 16px Stop
SVG in its 28px control, and Send recovery pass Browser/CDP plus independent
  wide/compact regional pixels. Command denial is verified on that build as well;
  remaining approval kinds and long-thread convergence remain the next Stage 2
  work. The real command-approval probe now
  runs in full playground acceptance and verifies one
  `item/commandExecution/requestApproval` request, host-owned cwd, `Allow once`,
  completed command/turn, and a scoped write boundary outside one disposable
  proof file at 1180/720px. The live matching-command follow-up now reaches a
  real `proposedExecpolicyAmendment`, sends that exact rule through the
  Electron bridge, and proves two identical commands complete with one
  approval request at 1180/720px. The real live-stop probe now runs in full playground
  acceptance and
  separately verifies a pending file approval, owning-thread Stop, interrupted
  settlement, resolved approval, no file write, and a same-thread recovery
  turn at 1180/720px. The real manual-compaction probe now runs in full
  playground acceptance and uses the host-owned project/thread bridge to require
  context-compaction item start/completion plus same-thread recovery at
  1180/720px. The current runtime emits no separate `thread/compacted`
  notification, so the item lifecycle is the authoritative observed signal;
  automatic threshold compaction remains a separate boundary. The shared
surface-token change affected 28 deterministic lifecycle baselines; each was
reviewed and refreshed, and all 188 frames still pass their existing thresholds.
The real session-approval probe now runs in full playground acceptance and
exercises two separate file changes in one turn, recording the current
`acceptForSession`/`Allow all edits` response for each request at 1180/720px.
The pinned CLI 0.153.4 runtime still emits a second request for the independent
  second file change, so this promotes the current decision UI and bounded file
  outcomes without claiming session-lifetime suppression. The live
  matching-command follow-up now proves the amendment-backed two-command path;
  network and installed-product approval parity remain separate boundaries.
The Live Electron host now also maps the public
`item/permissions/requestApproval` profile into the shared Permissions card and
schema-shaped `{ permissions, scope }` response. Reducer and gate contracts
cover this path, but the signed-in reachability probe encountered App Server
TLS/network recovery before emitting a permissions request; live permissions
and current-product pixels therefore remain explicitly unpromoted.
An opt-in real file-variant probe now verifies separate current-build
`fileChange` update and delete requests, exact absolute paths/diffs, two
`Allow once` decisions, final updated/deleted files, and 1180/720 no-overflow
frames. Rename, binary, upload-failure, and installed-product parity remain
separate boundaries. The probe is now part of full playground acceptance, so
the same disposable real-update/delete evidence runs on every complete local
acceptance pass.
The real long-thread probe now runs twelve no-tool turns on one stable thread,
proves repeated live bindings keep same-thread completion, and exercises
scroll-away/latest-follow convergence at 1180/720px with no overflow. It is now
part of full playground acceptance with disposable workspace evidence. The
30-turn windowed replay and installed-product eviction heuristics remain
separate boundaries.

The real local MCP tool-call probe is now part of full playground acceptance.
It starts a disposable stdio server, drives one signed-in App Server/model turn,
accepts only the MCP tool-call elicitation, and proves the completed tool item,
deterministic result token, nested Activity/integration/card disclosure, and
1180/720 computed geometry with no horizontal overflow. This is current
playground protocol/UI evidence, not production MCP server or OAuth parity.
Before the turn, the same probe reads the public `mcpServerStatus/list` full
inventory and requires the disposable server, tool map, and auth/runtime status
to be present. A multi-tool mode now runs against the same real server, requires
two completed tool items with exact deterministic results, and checks both
visible cards at 1180/720 without overflow. A retry mode returns one real MCP
tool error, requires the same tool to be called again, and verifies failed-then-
completed item states plus the exact recovery token. Permission variants,
streaming beyond this bounded retry, and installed-product pixels remain open
follow-up boundaries. The live timeout mode now adds a
deliberately slow MCP server with a one-second tool limit and verifies the
failed item state without a retry; OAuth/permission variants remain open. The
approval-denied mode now verifies the real MCP approval request, rejects it
before the server's `tools/call`, and locks the failed item and 1180/720 card
geometry. A remote mode now serves the same tool over a loopback Streamable
HTTP `/mcp` endpoint and proves the real `initialize`/`tools/list`/`tools/call`
sequence, completed card, and 1180/720 geometry; OAuth credential exchange and
production remote-provider reachability remain open.
The follow-up OAuth mode now hosts a disposable protected-resource/OAuth
provider, runs DCR plus authorization-code/token exchange through the public
`mcpServer/oauth/login` method, and proves the resulting authenticated remote
MCP tool call with the same card and 1180/720 geometry. Production provider
discovery, account policy, and installed-product parity remain open.
The cancellation follow-up now holds a real stdio `tools/call`, drives the
Composer `Stop` action while that item is active, and proves the public turn
settles as `interrupted` while the started MCP item does not fabricate a
completion or server result at 1180/720. This closes the sampled client
cancellation lifecycle while leaving provider-specific server cancellation
and installed-product parity as separate boundaries.

The companion live MCP elicitation probe is now part of full playground
acceptance. A disposable stdio server sends a real `elicitation/create` from
inside `tools/call`; the signed-in App Server forwards the form, and the
renderer enforces required fields and visible Accept gating. Full acceptance
runs the same public path with Accept, Decline, and Cancel: Accept completes
the tool with the deterministic `MCP_ELICITATION_OK` result, while Decline and
Cancel settle the same tool as failed with their exact response tokens. Each
action records the 1180/720 form geometry and compact no-overflow contract.
This promotes the sampled local form-to-tool decision lifecycle, not URL-mode
elicitation, authentication, permission variants, multi-turn/multi-tool
behavior, production server reachability, or installed-product pixel parity.
The same live acceptance now adds a URL-mode request with an exact
authorization link, `_blank` target, no implicit browser navigation, and safe
Cancel response. This proves the public URL-mode forwarding boundary only;
OAuth provider behavior, credential exchange, and external-page rendering stay
host-owned.

The Composer context family is now independently current on `26.825.51511`.
Project search and fixed actions, Local/New local worktree selection,
No environment, starting branch, the current Branches search/roles, Escape
focus return, exact overlay geometry/style, and the 720px boundary pass
Browser/CDP, Electron, and seven reviewed/product-region pixel gates.
The same Composer contract now has a light wide/720 compact replay matrix for
the three-mode permissions menu, Goal/Plan modes, resource picker, multiline
and long-input clamps, and pending/paused queue states. Sixteen light scenes
reuse the public state contract and pass independent CDP geometry plus
regional pixel gates; they remain replay evidence rather than installed-product
theme promotion.
The real 26.903 MCP success and same-thread recovery contracts now have a
matching light wide/720 compact replay matrix, including the pinned Sources
summary. Six scenes reuse the observed search/fetch and invalid-fetch recovery
state contracts and pass independent CDP geometry, Electron lifecycle, and
regional pixel gates; the light matrix remains replay evidence rather than
installed-product theme promotion.
This same evidence also promotes `app.new-thread-workspace-selection`; its
remaining gaps are production Remote providers and repair variants rather than
the sampled entry composition. Installed-product environment repair and
Remote/branch mutation remain Stage 3 work rather than blockers for this
sampled Stage 2 context path.

Exit: every P0 turn/thread lifecycle has a deterministic replay, current-build
structural evidence, Browser acceptance, and Electron acceptance.

### 3. Complete coding workspace workflows

- projects index and workspace/worktree creation, switching, repair, and
  persistence;
- single- and multi-file changes, large diffs, binary/rename/delete/conflict
  variants, Undo, Review, and selection synchronization;
- Terminal sessions, multiple tabs, background/running/failed processes,
  input, close/reopen, close-last/fresh creation, mismatch recovery, and
  compact layout;
- Pull request index/detail, loading/failure, checks, reviewers, comments,
  review submission, merge-readiness, and route restoration;
- side, bottom, expanded, stacked, and compact panel compositions.

Delivered workspace-entry slice: current `26.730.61309` selected/no-project
destinations, two suggestions, 14-option project picker, Local/New worktree
run-location transition, environment empty menu, seven-branch picker, and
1180→720 responsive geometry now pass Browser/CDP, Electron, and external
pixel gates. The historical 600×600 local-environment dialog remains an
independent host capability rather than the current New worktree entry path.
The `26.825.51511` refresh supersedes its context-menu visuals and semantics:
the current project picker, `Work in`, New local worktree, Environment, and
Branches lifecycle now passes same-build wide/compact CDP, Electron, and
product-region gates. Continue with installed-product environment repair,
Remote connections, and installed-product branch mutation.
The previous `26.818.41509` Projects Index follow-up delivers the primary
ready/expanded/sort/empty/compact route at both 1180×820 and explicitly
collapsed 600×600, with sampled structural geometry and Browser/CDP evidence.
Full Electron creation and distinct recent-chat routing remain implementation
acceptance, while the ownership-masked product pixels remain scoped to 26.810
until they are recaptured against the current build.
The previous follow-up adds the five-action `Work in` menu, treats Codex web as
an external anchor rather than a synthetic execution environment, covers the
New-worktree no-environment menu, and implements the sampled 768px unavailable
Environments route. Browser/CDP, Electron, and three local-only product gates
pass without creating an environment. Populated environment repair variants
and real Remote connection lifecycles remain in this phase.
The `26.818.41509` follow-up supersedes the worktree entry vocabulary with
`New local worktree`, disabled `Cloud`, generic accessible context labels, and
a 264×91.125 Environment menu containing only `Work without environment` and
`Set up project`. Two isolated disposable repositories reach real success,
controlled failure, Retry, and restored states. Browser/CDP, Electron, and
three sampled-product tail comparisons now gate that entry/repair
lifecycle. Projects-route loading/error/partial-error, installed-product
environment repair, and Remote connections remain independent work.
The previous `26.820.60940` continuation repeats the controlled failure with a
regular-file `.git/worktrees` blocker scoped to one disposable repository.
It observes the exact branch/error/unread three-track row, removes the blocker,
uses the real `Retry` control, and verifies root plus one child worktree before
exact cleanup. The current failure tail passes at 0%; ordinary sidebar error,
collection loading, and production Remote/branch mutation remain independent
work.

The current 26.825 Terminal session, running/completed process, picker,
worktree-mismatch, and compact sidebar contracts now have a matching light
wide/720 replay matrix. Eight scenes reuse the current terminal state contract
and pass CDP geometry, Electron native-window/zero-overflow checks, and
regional pixel gates; terminal surfaces that intentionally retain their dark
transcript paint remain host-owned visual behavior rather than a product-theme
promotion.

Current branch-entry slice: `26.803.61601` Browser/CDP now locks the 296×280
branch menu and 400×190.56 create-and-checkout dialog. The public
`BranchCreationDialog` replaces the previous local-environment reuse, and the
Electron host validates, creates, checks out, and switches branches only in a
host-registered project selected by an opaque token. Checkout choices are
enumerated from that repository rather than fixture names; unbound replay
projects keep their Git controls disabled. Acceptance proves routing across
two generated disposable Git repositories and blocks dismissal while creation
is pending while retaining modal focus. Delayed checkout results are discarded
after a project change, the new project's branch control stays disabled with
explicit pending feedback until Git settles, and repository-scoped errors are
cleared on project change. In-place host branches keep execution rooted at the
project directory instead of deriving a nonexistent worktree path; detached
and unborn HEAD states still allow new-branch creation. Blank, error, and
created states extend the reviewed matrix to 166 frames; the local-only dialog
crop passes at 3.0916%.
Host-backed branch selection also restores the Local run location and trusted
project cwd when the Composer was previously set to Codex web.
Current-product create submission is still pending the isolated native
directory selection, so this is not yet a claim that branch mutation/
persistence is complete in the product runtime.

The playground's real dirty-checkout recovery gate now uses an isolated Git
repository at 1180/720px. Switching through the rendered branch menu fails on
conflicting uncommitted content without changing HEAD or the file. The harness
preserves that exact draft as a commit on its original branch, then the same UI
successfully switches to the target and back; the preserved content and clean
Git status are checked independently of the UI. Error and recovered screenshots
are retained outside the repository. `check:branch-recovery` is included in full
acceptance. This closes the sampled host dirty-checkout/retry path, not current
installed-product evidence, user-facing conflict repair, or the full PR workflow.

The companion branch-operation gate now exercises the host create path at both
1180px and 720px with a real disposable repository: an invalid ref reports the
Git validation error without changing HEAD, a duplicate ref reports the
conflict without changing HEAD, and each error recovers through the same dialog
to a successful create-and-checkout. The gate also asserts zero horizontal
overflow and retains only local screenshots. This closes the host invalid/
duplicate/retry lifecycle while leaving installed-product mutation and broader
merge/worktree conflict semantics explicitly open.

The companion `check:live-branch-mutation` gate now drives the same workspace
context through the public Electron Git bridge against a fresh disposable
repository. At both 1180px and 720px it creates and checks out a namespaced
branch, switches back to `main`, verifies the real Git refs, and requires zero
horizontal overflow. The gate is local-only host evidence: native directory
selection, provider authentication, remote branch mutation, and installed
Codex pixels remain separate boundaries.

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

The first P1 vertical slice is now delivered: current-build Settings
shell/search and Git/review-delivery preferences have independent components,
Browser/CDP, Electron, exact assets, and wide/720 regional pixels. The next
slice splits Appearance from General and delivers the three theme previews,
Light/Dark editors, sixteen-option code-theme menu, responsive diff preview,
and complete Preferences card as a controlled public component. Browser/CDP
and Electron verify Git ↔ Appearance route/state continuity; four reviewed
scenes extend the matrix to 174. Local-only current-build comparisons pass at
1.2787% wide, 1.8977% at 720px, and 3.4665% for the bottom Preferences state.
Proprietary Dock rasters remain host-supplied/local-only while exact public
Settings navigation assets retain their manifest provenance. General,
Hooks/code-review, and the remaining Settings/integration pages stay separate
open rows; these slices do not imply Stage 4 completion.

Appearance now also exposes host-controlled loading, saving, saved, and error
states with retry copy, status semantics, and a locked control surface while
the host persists changes. This lifecycle contract remains presentation-only:
hosts still own persistence, validation, import/copy effects, and Dock assets.

The following General slice is now delivered independently: a controlled
`GeneralSettingsPage` covers the 21 current rows in Permissions, General,
Composer, Popout Window, and Notifications. Browser/CDP verifies five
single-select menus with current-value descriptions and radio checked states,
language search with a dialog-plus-listbox hierarchy and native Home/End caret
editing, twelve switches, two keyboard groups, shortcut capture/
formatting/clear/cancel,
1180px/720px layout, light paint, and bottom scroll. Electron repeats the
route and retains General state while switching through Git and Appearance.
Transient shortcut capture is cancelled when navigation leaves General while
the captured shortcut value remains controlled state; hotkey and bottom
snapshot frames are initial-only and return to the normal top frame after
route navigation.
Six reviewed frames extend the matrix to 180, with optional local-only full-
frame comparisons for wide, compact, shortcut-capture, and bottom states at
4.6143%, 6.7412%, 4.7654%, and 4.8818%.
Observed host selections are fixture evidence rather than product defaults.

General now also exposes host-controlled loading, saving, saved, and error
states with retry copy, status semantics, and a locked control surface while
the host persists changes. This lifecycle remains presentation-only: hosts
still own persistence, folder and license actions, global shortcut registration,
and notification delivery.

The Hooks/code-review family is now delivered with its evidence levels kept
separate. An isolated current `26.803.61601` Renderer reaches the visible
Hooks route, stable empty state, read-only reload feedback, exact 1180×820 and
720×680 geometry, and the public `developers.openai.com/codex/hooks` link.
The current ASAR independently confirms configured Config/Plugin/Project
groups, eleven lifecycle event labels, trust/changed/managed states, load
issues, and the separately registered Code review preferences module. Because
the current navigation and settings search do not expose Code review, the
playground keeps it as an explicit `package-observed` deep fixture rather than
adding a false sidebar row. `HooksSettingsPage` and
`CodeReviewSettingsPage` are controlled; reload, persistence, config opening,
trust, and cloud preference mutation remain host-owned. Browser/CDP and
Electron verify empty/loading/error/configured states, refresh/search/route
continuity, trust-before-enable, three review triggers, exhaustive review, and
the optional credits preference. Eight reviewed frames extend the matrix to
188. The untracked full-frame current Hooks comparisons pass without masks at
1.7651% wide and 1.8064% at 720px. The exact runtime reload SVG raised the
asset manifest to 78 icons; the later completed-thread slice raises it to 90.
Git preferences, Worktrees, and Hooks now also have explicit wide/720
light-theme Browser/CDP, Electron, and regional-pixel coverage; these are
controlled replay evidence and do not claim host persistence or hook mutation.
Remaining P1 families keep their existing open
gates, so Stage 4 is still in progress.

The current Plugins/Skills index slice adds a shared controlled
`IntegrationCatalogPage` without claiming installation, permission, or
settings completion. An isolated `26.825.51511` Renderer
records wide/720 navigation, 728px bounded search, Installed/Public/Personal
plugin groups, Installed/Personal/System/Project/Recommended skill groups,
two-column wrapping, and visible search/scope/action behavior. The catalog
now also exposes host-controlled page busy/disabled locking while preserving
explicit retry recovery. Browser/CDP and native Electron replay both routes
and unavailable-to-retry recovery. Four
reviewed wide/compact baselines are paired with optional local-only current
product comparisons; their main-region differences range from 3.3067% to
5.1784%, including host-owned third-party icon differences. The public
component therefore keeps exact plugin artwork and installation effects
host-supplied. The Plugins and Skills catalogs now also have explicit wide/720
light-theme Browser/CDP, Electron, and regional-pixel coverage; this remains
controlled read-only evidence and does not promote install, permission, or
connection side effects.

The index item contract now also models per-item pending/success/error/retry
feedback and busy locking; this is a host-controlled UI state and does not
claim installation, authorization, or execution reachability.

The follow-up Plugin detail slice adds controlled `PluginDetailPage` and
`PluginDetailBreadcrumb` primitives for installed/discovery identity,
suggestions, Apps, Information, disclosure, bottom scrolling, and the
uninstall/connection menus. One isolated same-build Renderer supplies eight
wide/720 read-only states; Browser/CDP gates all eight, Electron repeats four
representatives, and eight reviewed replay baselines pair with current-product
regional comparisons below an 8% ceiling. Product artwork, hero artwork, and
suggestion-brand icons stay host-supplied. Clipboard/navigation, real install
or uninstall, connection persistence, OAuth/permissions, external links, and
failure effects stay open. The detail now exposes host-controlled disabled
locking for navigation, suggestions, app rows, and primary actions. The
installed detail now also has explicit wide/720
light-theme Browser/CDP, Electron, and regional-pixel coverage; it remains a
read-only visual contract and does not promote install, uninstall, or OAuth
side effects.

The adjacent Skill detail/entry slice adds controlled `SkillDetailDialog` and
`SkillPromptMention` primitives for the installed modal, enabled switch,
three-item actions menu, long instruction scroll, footer actions, two-step
Escape dismissal, and the unsent Try now draft. One isolated same-build
Renderer supplies wide/720 geometry and five local-only product frames.
Browser/CDP gates all five scenes, Electron repeats them, and regional chrome
comparisons remain below 1%. The installed detail now also has explicit
wide/720 light-theme Browser/CDP, Electron, and regional-pixel coverage.
Enable/uninstall/menu effects, prompt submission, successful skill execution,
failure/retry, Automations detail/mutation, and remaining Settings families
stay open; the dialog now also exposes a host-wide disabled lock alongside its
updating/error/retry lifecycle, so Stage 4 remains in progress.

The current thread-overflow slice closes the former unsampled P1 root menu.
`ThreadOverflowMenu` exposes the observed ten actions, three separators, four
shortcuts, and host-supplied Copy/Fork/Open-in submenus without performing any
thread mutation. The product uses a native macOS menu, so the acceptance stack
combines exact CDP trigger/computed-style evidence, Browser/Electron keyboard
and focus contracts, reviewed wide/720 baselines, and an unmasked tight-menu
comparison under a dedicated 9.5% native-vs-Renderer budget. The trigger and
menu now also have explicit wide/720 light-theme Browser/CDP, Electron, and
regional-pixel coverage. Submenu contents, real effects, disabled variants,
and keyboard-only native opening remain open; `thread.overflow-actions` is
therefore still `partial` rather than complete.

The current MCP Settings manager slice adds controlled
`PluginManagerTabs`, `IntegrationAddMenu`, `McpServersPage`, and
`McpServerEditor` primitives plus deterministic list, empty, Add-menu,
STDIO/HTTP create, compact HTTP, and update-detail playground states. An
isolated `26.825.51511` Renderer supplies the current five-tab counts, 4+2 row
grouping, 52/42.5625px rows, wide/720 geometry, and create/update field
contracts. Six CDP frames, four native Electron representatives, six reviewed
baselines, and six local-only product main-region comparisons pass under a 4%
limit. The same list/compact replay now has explicit light-theme
Browser/CDP, Electron, and regional-pixel coverage; this remains controlled
UI evidence rather than a claim about provider state. This delivers one
read-only end-to-end `integrations.mcp` slice while keeping real
save/toggle/uninstall, OAuth/permission, and failure effects open. The manager
now also exposes host-controlled busy/disabled locking for tabs, search,
directory/add actions, settings, and switches while preserving explicit retry;
Stage 4 therefore remains in progress.

The Sites index slice adds a controlled `SitesIndexPage` for the older
runtime-observed search, refresh, create, share, and overflow affordances.
The replay fixture covers two site rows plus loading, empty, unavailable, and
retry states at 1180px and 720px. Its Browser/Electron contract checks each
host callback, requires every compact row action to remain inside the visible
route boundary, and repeats the two own-fixture screenshots with zero pixel
drift. This is deliberately only `partial_legacy`: the only runtime evidence
is the older `26.715.72359` observation, the fixture is our own, and it does
not invoke an installed Codex Sites list, creation, sharing, or removal flow.
The current index also exposes host-controlled busy/disabled locking for search,
refresh, creation, row navigation, sharing, and overflow actions while keeping
retry explicit. Stage 4 therefore remains in progress.

The Composer plugin-connect slice makes the legacy-observed `Connect plugins`
entry explicit without claiming to install or authorize a plugin. The shared
resource picker now supports a host-owned footer, and an isolated replay frame
uses it with four controlled plugin choices. Electron checks selection,
connection callback, dismissal, focus return, zero overflow, and 1180px/720px
own-fixture replay with zero pixel drift. Its only product evidence is the
older `26.721.81911` resource menu, so `composer.plugins` remains
`partial_legacy`; discovery, installation, permissions, and real execution
remain host-owned and open.

The `26.908.40834` follow-up records the current unified `Add files and more`
catalog separately from that legacy connect entry. It replays the seven observed
top-level actions plus 14 sampled Plugins/skills rows at wide and compact sizes,
requires scroll containment, keyboard End/Enter dismissal, Escape focus
restoration, and two zero-drift own-fixture captures. The real sample was
strictly read-only: an existing application-layer draft made selection unsafe,
so it intentionally records neither a selected skill attachment/pill nor a
plugin installation/authorization effect. Browser-context rows remain dynamic
and excluded. This improves current menu coverage while retaining
`composer.resources` and `composer.plugins` as partial verification until a
safe selected-skill lifecycle and product-region pixel reference are captured.
It is intentionally a scoped newer-build observation, not a silent replacement
for the full `26.903.71938` package-fingerprint baseline.

The bounded Composer follow-up now also replays one selected `GitHub Triage`
plugin card from that catalog. Browser/Electron checks cover the card's
ready/selected semantics, remove action, focus return, zero overflow, and
1180px/720px own-fixture screenshots with zero drift. This is intentionally a
playground replay-only lifecycle: it does not claim installed-plugin selection,
authorization, network execution, or a real product attachment effect. The
26.908 resource observation remains partial until those host-owned boundaries
are captured safely on the installed product.

The current-build replay now has a separate `26.908.70816` catalog variant.
It uses the latest observed public labels (`GitHub` rather than the older
`GitHub Triage` label), keeps account-dependent browser/app rows out of the
fixture, and verifies 19 options, scroll containment, End → Enter dismissal,
Escape/focus recovery, a selected GitHub card, and 0% own-fixture drift at
1180px/720px. The installed product observation remains computed-layout only;
selection, upload, authorization, execution, and product-pixel promotion stay
host-owned boundaries.

The follow-up also models the current-build GitHub selection as an inline
editor mention, based on the isolated CDP observation that showed no attachment
card. The public `ComposerResourceMention` API marks the token non-editable and
replays the measured transparent 14px/20px/500 style. Electron coverage checks
wide and compact action reachability, zero overflow, no attachment-card
regression, and zero repeated-capture drift; this does not promote a product
pixel baseline or claim plugin authorization/execution.

The Browser workspace slice activates the historical one-tab shell only in an
isolated controlled replay. It covers tab creation, selection, close-to-empty
dismissal, toolbar event delegation, responsive panel reachability, and
1180px/720px own-fixture pixel stability. The content pane remains explicitly
source-owned and exposes only a URL boundary; it neither loads nor reproduces
external pages. Its product evidence remains the legacy `26.825.31414` shell,
while the current `26.825.51511` Browser success path is separately verified
to have no mounted workspace. `workspace.browser` therefore remains
`partial_legacy`; multi-tab product behavior, authentication, downloads,
permission prompts, and page-owned states remain open.

The public package now supplies a controlled `DocumentPreviewPanel` shell for
PDF, document, notebook, spreadsheet, and presentation previews. It covers
ready/loading/empty/error semantics and explicit host-owned Open/Retry actions,
but does not decode or embed files. The full-app playground now exposes a
workspace artifact route with ready, loading, and error/retry states plus a
wide/compact format matrix for DOCX, notebooks, spreadsheets, and
presentations. Browser/CDP, Electron, and owned-pixel contracts gate that
matrix as a controlled replay regression; they do not claim installed-product
runtime decoding parity.
The public ArtifactList composition now also exposes controlled loading,
empty, and retryable error states so artifact discovery failures do not collapse
into a missing region; file decoding and provider effects remain host-owned.
The subsequent [26.903 real PDF capture](26.903.71938-pdf.md) now reaches the
product through an unsent synthetic draft attachment. It disproves the
centered-card layout as a PDF reconstruction: the actual surface is a right
workspace tab with a 40px toolbar, page-aware navigation, fit/percentage zoom,
annotation mode, one document scroller, expansion, and compact hide/reopen.
Fourteen recorded Renderer states are scoped to a new
`workspace.pdf-preview` inventory row; its current Browser/Electron and
owned-panel pixel gates are verified independently. `workspace.artifact-shell`
now also has an explicit controlled Browser/CDP and Electron contract for the
side-placed tab shell: selected tab, tab panel, close affordance, expand/restore
affordance, and compact reopen ownership. It retains only the host-owned
right-workspace reachability boundary, while the
`workspace.document-previews` row now has a controlled format matrix for
notebook, DOCX, spreadsheet, and presentation formats. The implementation now
has a dedicated
`PdfPreviewPanel` and a real private PDF.js workspace replay. Targeted Electron
paging/zoom/expand/resize/close/reopen checks pass, and the complete owned-panel
comparison passes at 0.1544% wide / 0.2600% compact with no masks under the
unchanged 1% ceiling. The decoded bitmap is pixel-identical before CSS
composition; the replay also preserves the observed relative positioning and
paint-isolation boundaries. Seven new visual baselines are now committed for
this slice; the full local acceptance passes with the expanded CDP lifecycle,
Electron, and owned-pixel format matrix. Other host effects and installed-
product decoding remain open.

The adjacent `workspace.media-generated-content` row now has a controlled image
artifact route with ready/error/loading states at wide and compact sizes. The
public preview shell exposes an explicit `image` kind, while the playground
uses a checked-in image fixture and states that generation and file decoding
remain host-owned. Browser/CDP, Electron, and owned-pixel contracts cover the
route; no product-generation or runtime-decoder claim is made.

The `app.onboarding-login` row now has a controlled `LoginPage` surface based
on the current package's login-route provider labels and desktop geometry. It
covers the primary ChatGPT sign-in route, expanded provider options, API-key
entry, device-code handoff, browser-pending, loading, and error/retry states at
wide and 720px compact sizes. Browser/CDP, Electron, and owned-pixel gates
cover the five lifecycle frames. Credential exchange, browser navigation,
account discovery, and first-run persistence remain host-owned; this slice is
not evidence that the installed product's authentication flow was executed.

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

Live progress (2026-09-08): actual Composer submission, file creation, Node
assertion, and raw-added-file Review now pass at 1180/720px. The command-oriented
Terminal follow-up reaches real success/failure, stdin, stop and mode-change
process cleanup through Electron using sandboxed App Server execution. See
the explicit local gate and limitations in
[`VALIDATION.md`](../playgrounds/codex-app/docs/VALIDATION.md). The persistent
PTY follow-up now retains shell state and emulator output independently of
panel mounting and adds raw input, resize and tab-close ownership checks.
The granted-approval follow-up now runs in full playground acceptance and
verifies a real Composer submission in a read-only temporary workspace,
exact-file `Allow once`, completed file write, wide/compact Review, and a PTY
read-back in one application session. It also switches projects while the
approval is pending, rejects a wrong-thread Stop, restores the owning-project
approval, and retains that project's terminal cwd/environment after returning
to the other project. It does not approve broader roots or session-wide access.
Other approval kinds and real PR operations remain outside this sampled path.
The live subagent follow-up now runs in full playground acceptance and verifies
one real public-protocol `collabAgentToolCall`, receiver-thread materialization,
Agent activity geometry, owning-thread Stop, interrupted turn settlement, and
visible `Stopped` status in the same Electron Live bridge. Its disposable
workspace is write-disabled, the child prompt forbids shell/network/file
writes, and the created thread is archived after capture. This closes the
sampled playground delegation/Stop slice on every complete acceptance pass; it
does not promote replay fixtures to installed-product evidence or claim
successful subagent completion.
The companion opt-in live-stop follow-up now verifies a real pending
file-approval request, owning-thread Stop, interrupted turn settlement,
approval resolution, no file write, and a same-thread recovery turn at
1180/720px. It uses the pinned public client and a write-disabled disposable
workspace; protocol logs and screenshots remain local-only. Other approval
kinds and installed-product visual parity remain open.
The running-command cancellation follow-up now asks the public App Server to
execute a real disposable `sleep 30` command, waits for the
`commandExecution` item to enter `inProgress`, and drives the owning Composer
Stop control. It requires the same turn to settle as `interrupted` without a
successful command completion, reads the public item's `processId`, and
requires that process to exit after Stop. It captures the running/stopped
states at 1180/720px. This closes the sampled local App Server
process-termination lifecycle; provider-specific external process-group
behavior, broader command-policy variants, and installed-product visual parity
remain separate boundaries.
The companion opt-in command-approval follow-up now verifies one real
`touch command-approval-proof.txt` request, the Terminal card's `Allow once`
action, completed command/turn settlement, and wide/compact no-overflow
screenshots in the same pinned client/runtime. The empty proof file is removed
during cleanup; the protocol log and screenshots remain local-only.
Matching-command/session approvals and installed-product visual parity remain
separately scoped.
The opt-in live-compaction follow-up now uses a host-owned project/thread
bridge to call the public client's `CodexThread.compact()`, verifies real
`contextCompaction` item lifecycle plus compact-turn completion, and completes
a same-thread recovery turn at 1180/720px. The current CLI 0.153.4 run did not
emit a separate `thread/compacted` notification; the item lifecycle is retained
as the observed protocol signal. Active-turn and cross-project thread
ownership are rejected by the bridge; automatic threshold compaction and
installed-product visual parity remain separate boundaries.
The project-continuity follow-up now verifies A → B → A with three real
Composer turns, same-thread reuse for A, isolated histories, and wide/compact
captures. A further one-turn approval probe switches projects while A waits,
checks B cannot display A's approval or stop it using a non-owning thread ID,
returns to approve A, and retains A's PTY cwd and shell variable after another
switch to B. A separate two-turn probe now clicks the owning-thread Stop during
pending file approval, requires interrupted completion and resolved approval
without a file write, then completes a same-thread Composer follow-up with
wide/720 captures. This is independent playground evidence; running-tool Stop
variants, concurrent approvals, and additional approval types remain open.
The persistent PTY host/UI probe now also runs as `check:live-terminal` inside
full playground acceptance, covering retained shell state, resize, interruption,
hidden-panel output, tab ownership, theme switching, and Live/Replay cleanup.
Model-background-process integration and current-product PTY visual evidence
remain open; this does not close the complete-workflow exit gate.

The user-input follow-up registers public `item/tool/requestUserInput` with a
thread-owned host answer gate and a pending-question form (options, free text,
masked sensitive input). Resolved requests, completed turns and client resets
clear pending questions; answers are not added to conversation history.
Unit tests and a deterministic Electron UI/IPC contract cover submission,
stale-request rejection, thread visibility and cancellation at 1180/720px.
The subsequent Plan/Default wiring uses public collaboration-mode settings with
the model and reasoning effort returned by thread start. An explicit two-turn
Electron probe now verifies a real model question, rejects a wrong-thread answer,
submits BLUE through the visible form, observes `serverRequest/resolved` and the
model's completion, then switches to Default and completes a same-thread reply.
The Composer and host share the same mode state. Wide/720 captures document this
functional path, and `check:live-input` is now part of the full playground
acceptance command; current Codex pixel parity and other question variants
remain open.

The live-history follow-up replaces replay-only Recents and pinned sample tasks
in Live mode with playground-owned, project-scoped conversation rows. New chat
creates a distinct persisted thread; selected history hydrates from the public
App Server snapshot and later Composer submissions resume that exact thread.
A private local ID registry—not the server source label—defines ownership:
the pinned runtime reported `vscode` for this integration in the isolated probe.
The registry excludes unrelated Codex sessions, and malformed storage fails
closed instead of being overwritten. Deterministic acceptance covers empty,
failure/Retry, 20-row pagination, unowned-ID rejection and late-read cancellation.
An explicit three-turn Electron probe creates two chats, switches between them,
restarts the application, restores the first chat and continues its same thread
at 1180/720px; its two disposable threads are archived after verification.
The project-discovery follow-up restores project entries from that same owned
history registry after application restart. The host checks directory existence
and reissues opaque project tokens; unavailable directories are disabled and can
be retried after recovery. Synthetic Electron acceptance covers corrupt-registry
retry, restart at 1180/720px, project-scoped history and missing-directory recovery
without listing external sessions or starting a model turn. The empty-project
follow-up persists native directory selections and labels before any conversation
exists. Registry version 2 preserves these independently of threads and migrates
version 1 ownership records on write. The Electron gate now selects an empty
project, restarts and restores its empty history with an enabled Composer, without
creating a model thread. It does not import a global Codex project index.
A separate live project-continuity probe now creates two disposable project
directories and performs read-only A → B → A model turns, proving distinct B
thread ownership, same-thread A restoration, and wide/720 captures. Its
`check:live-projects` command is included in full playground acceptance; the
captures remain workflow evidence rather than current Codex product pixel parity.
The rename follow-up adds a keyboard-accessible row action and confirmation form,
with empty-name validation, Cancel, pending state and retryable failure. The host
checks registry ownership and the public thread cwd before `thread/name/set`;
only a successful remote response updates the local title. Timestamp updates are
serialized independently so new turns cannot overwrite a renamed title with an
older snapshot. Deterministic contracts cover cancellation, failure/retry and
unowned-ID rejection. The explicit three-turn live-history probe now verifies
UI rename, application restart, same-thread continuation and the public stored
thread name at 1180/720px. Its two disposable threads are archived afterward.
This three-turn signed-in probe is now part of full playground acceptance, with
fresh registry ownership and exact disposable-thread cleanup on every run.
The archive/restore follow-up adds an explicit subtree-scope confirmation,
project-scoped archived list, restore-one confirmation, cancellation and retry.
The host shares the turn-start lock, rejects active roots and foreign IDs, and
updates only registered IDs from actual archive notifications. Archived caches
are invalidated; unarchive metadata does not fabricate an empty transcript that
could mask a later history read. A real three-turn probe now archives its own
renamed chat, restarts the application, restores it and continues the same ID
with the original history and name intact at 1180/720px. The two disposable
threads are archived after verification. Synthetic tests separately cover
descendant notification bookkeeping and restore-one semantics; an actual
multi-descendant archive lifecycle is not yet claimed.
The cross-process registry follow-up serializes reads, remote acknowledgement,
and atomic writes with an exclusive sibling lock directory. Four independent
Node processes concurrently create and rename 40 records without losing project
or title metadata. Contention times out before remote mutation; failed operations
release their lock. Crash-orphaned locks deliberately fail closed and require
explicit recovery with all playground instances closed, rather than age-based
lock stealing. See the recovery instructions in `VALIDATION.md`.
Current-product pixels, permanent deletion, real descendant-archive coverage,
automatic orphan-lock recovery and continuous cross-instance UI synchronization
remain open. A focus-refresh follow-up now reloads the selected project's chats
when its window regains focus, deferring while a draft/dialog or request is open.
Same-snapshot complete archived IDs invalidate host and renderer caches without
mistaking a missing paginated row for an archive. The deterministic Electron
gate covers external rename, draft preservation, corrupt-read recovery and
selected archive beyond the first archived page. Project discovery now also
revalidates on Live window focus without changing the active project or Composer
draft. The wide/720 Electron gate covers externally added/renamed owned projects,
stable project tokens and recovery after a corrupt registry. Continuous
background synchronization remains separate work.

The Live environment-status follow-up adds one deliberately narrow Stage 3
vertical slice: an owned-project sidebar route accepts a single opaque public
App Server environment ID and renders ready, pending, disconnected, unknown,
error/retry, and late-response replacement states. Main-process IPC verifies
the trusted project token and rejects paths and URLs before it can start a
Live App Server client; the only public protocol method in scope is
`environment/status`. It neither lists, creates, edits, connects, recovers,
nor persists environments. Focused unit coverage and synthetic Electron IPC
exercise the actual preload/renderer route at 1180px and 720px, including the
preflight rejection and the return-to-conversation action, without a model
turn or a real remote-environment request. It is own-playground functional
evidence, not installed-Codex visual parity or coverage of configured remote
environment workflows.
The follow-up now adds a guarded `environment/add` path to the same route. The
host validates a credential-free `ws://`/`wss://` exec-server endpoint before
starting the client, maps success/failure/retry states, and keeps the renderer
bound to the selected project token. Browser/Electron contracts cover both
wide and compact layouts, but no real Remote environment creation is promoted
until a reachable exec server and current-product pixels are captured.
The next read-only `environment/info` slice now exposes the public shell/cwd
details for the same selected ID, with malformed responses rejected at the
host boundary and loading/failure/retry UI contracts at wide and compact
sizes. A follow-up local protocol gate now drives the same route
through a real `CodexAppServerClient` and an isolated loopback WebSocket that
implements the public exec-server handshake: both 1180/720 Electron windows
complete `environment/add`, `environment/info`, and `environment/status`, and
render the returned shell/cwd and Ready state without a model turn. This
promotes the public App Server-to-exec-server mapping, not production Remote
registry/Noise-relay reachability. The same real gate now persists the
credential-free endpoint by host-owned project directory across a second
Electron process. It drives an explicit Edit → Update flow that re-registers
the same opaque ID against a second loopback endpoint, then verifies
`environment/info` and `environment/status` through that updated connection at
both 1180px and 720px. The UI exposes a local-only Forget action. Because the
public protocol has no remote-delete method, this does not claim cloud
registration, remote deletion, Noise relay, authentication, or production
Remote registry parity.
The same gate also injects one malformed `environment/info` response at 1180px
and requires the visible details Retry action to recover on the next public
call before the 720px reload. This closes one deterministic environment repair
variant while leaving production outage/recovery semantics unclaimed. A
companion saved-environment gate now keeps one real endpoint in the host-owned
registry across two Electron processes, forces one `environment/status`
disconnect at each 1180/720 width, and recovers the same selected environment
through the visible `Retry environment status` action without changing its ID
or endpoint. This is current playground host evidence; production registry/
relay outage recovery remains open.
The public surface now also includes a controlled `EnvironmentEditorPage`.
Its Setup/Cleanup/Actions tabs, name/script fields, action add/delete controls,
Save/Discard actions, and conflict/error Retry states are covered by the wide,
720px compact, Browser/CDP, Electron, and regional pixel scenes. These are
host-owned editor and replay contracts: they intentionally do not claim that
the installed product exposes the same save protocol or that a Remote
environment can be provisioned without the product's private registry and
relay services.
The editor contract now also exposes saving feedback and retry-label overrides;
while a save is in flight its mutable fields, tabs, and action controls are
locked behind `aria-busy`, while host-owned discard and conflict/error retry
actions remain explicit. A host-wide disabled lock now covers the same editor
controls and settings retry entry, validating the renderer lifecycle boundary
without claiming production environment persistence.
The Hooks settings surface now exposes host-configurable loading/error/retry
copy and marks both initial loading and refresh with `aria-busy`; a refresh
keeps the current rows visible but locks trust, enablement, and config-open
actions until the host finishes. Hook discovery and execution remain host-owned.
The Personalization settings surface now models saving/saved/error feedback,
custom retry copy, and a busy contract that locks custom instructions, Memory,
and Personality controls while the host persists changes. Local-memory storage,
profile services, and persistence semantics remain outside the renderer.
The Git settings surface now follows the same persistence boundary for branch,
merge/review preferences, and commit/PR instructions: saving is announced with
`aria-busy`, mutable controls are locked, and error recovery can use host-owned
retry copy. Git configuration writes and credential/remote semantics remain
outside this renderer contract.
The shared Settings shell now exposes host-configurable loading copy and marks
the navigation frame `aria-busy` while its section index is loading; route
selection and private settings ownership remain with the host.
The Code review preferences surface now exposes host-configurable loading and
error/retry copy and marks its page busy while preferences load; review
trigger/credits mutations remain controlled callbacks and never start a review
or alter account limits in the renderer.
The Environment settings list now marks initial loading with `aria-busy`,
supports host-configurable loading/retry copy, and exposes a controlled Retry
callback for error and unavailable states while keeping registry/provisioning
ownership in the host.
The Settings `Connections` slice now adds a controlled `RemoteConnectionsPage`
with device/SSH rows, connected/disconnected status, Add/Edit/Forget actions,
Test connection recovery, and a host-owned connection form. Wide, 720px,
error, form, and light-theme wide/compact replays pass Browser/CDP, Electron,
and regional pixel gates. The form deliberately keeps credentials outside the renderer;
The public form contract now also models saving/error/retry feedback and locks
its fields while a host-owned save is in flight; page loading and a host-wide
disabled state now lock the corresponding page/form actions while preserving
explicit retry. This remains replay/component
evidence rather than a claim about production pairing or registry mutation.
real account pairing, Noise relay, SSH key exchange, and production Remote
registry writes remain outside this public contract. The next host-backed slice
adds a credential-free loopback registry with atomic persistence, Edit/Forget,
and a real WebSocket Test path through Electron IPC. A disposable pair of
loopback servers proves connected, updated-endpoint, and compact-width
disconnect/Forget recovery at 1180px and 720px without touching production
Remote state; installed-product pairing and relay-backed registry semantics
remain explicitly open.

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
2. **Current sidebar parity — delivered for the sampled dark contract**:
   fresh CDP capture, sidebar state contract, full-app playground scene,
   Browser/Electron interaction, and regional pixel gates. Light-theme
   current-product evidence and unsampled lifecycle variants remain separate
   follow-up evidence rather than blockers for the observed dark contract. The
   own-playground sidebar now also has a light wide/720 compact matrix for
   navigation, Recents, status/worktree lifecycle, collection loading/empty/
   error, project menus, Help, and compact pinned states; each variant is
   covered by the same CDP geometry and pixel gates without promoting replay
   captures to installed-product evidence.
   The later `26.803.41515` action slice also replaces the sampled More, Pin,
   Archive, and Help glyphs with exact runtime primitives and removes
   Settings/thread-leading assumptions disproved by the current build.
   The current lifecycle follow-up splits and verifies project expansion,
   project actions, and Help-menu ownership, promotes twelve menu assets, and
   adds four local-only product pixel gates without promoting the broader
   navigation, mutation, or account/settings denominators. The ordinary
   task-status follow-up separately reaches active and unread on
   `26.803.61601`, corrects task rows from the former 40px approximation to the
   current 30px structure, and gates trailing status geometry, color, action
   replacement, and pixels. The previous `26.818.41509` worktree follow-up then
   reaches a real create, controlled failure, and Retry recovery in isolated
   disposable repositories; it gates the new entry vocabulary,
   queued/creating/setting-up/failed/restored semantics, the exact
   branch/error/spinner primitives, and owned pixels. The current
   `26.820.60940` continuation now re-reaches controlled failure twice to
   distinguish a foreground-read error from the real background
   failed-plus-unread composition, then proves that Retry creates exactly one
   child worktree. Its current 84×30 product tail has 0% foreground-mask
   difference from the replay.
3. **Tool recovery and mixed thread — current sampled success/recovery evidence**:
   `26.820.60940` covers one real Search → Fetch success, one real invalid-URL
   Fetch → Search → Fetch recovery, 720×680 compact geometry, and the pinned →
   offscreen-unpinned → repinned Sources summary, with Browser/CDP, Electron,
   and unmasked local-only pixel gates. Completed and failed call rows are
   intentionally noninteractive on this build; the direct failure has no
   expanded error card. The previous `26.803.41515` unavailable
   GitHub integration followed by same-thread OpenAI Developer Docs fallback
   remains regression evidence. The schema-valid current-style mixed
   replay now adds Web Search → Browser open/find, MCP Search → Fetch,
   command approval, file Review, and delegated audit across wide and 720px
   layouts. Current 26.825 evidence now covers a true isolated
   same-transport disconnect/reconnect with six open-ended network-wait rows;
   retain terminal transport failure and a single real product task spanning
   the full composition as separate unsampled boundaries.
4. **App shell continuity — fatal recovery and sampled success notification
   delivered**: window chrome, global feedback, loading/error/offline
   states, route and selection restoration. Current-build evidence covers
   window chrome, loading, in-session route restoration, and a safely reached
   fatal App Server child exit through dedicated recovery Renderer and Restart.
   The public fatal-recovery component passes Browser/CDP, Electron, compact
   geometry, and local-only full/core pixels. The bounded four-item global
   notification queue now matches the real top-center three-visible Sonner
   contract and a reversible current success transition in Browser/CDP,
   Electron, and product pixels. A fingerprint-verified `26.825.51511` refresh
   repeats the single success and four-item stack with computed-style and
   notification-only screenshot evidence. Four reversible Pin/Undo transitions also
   lock simultaneous same-tone stacking, centered 5%/8px layer geometry, hover
   expansion, and a 0.2907% product crop. The replay-only notification
   tone/action matrix additionally covers success/warning/info/neutral entries,
   Review → Open → View transitions, focus restoration, computed colors, and
   1180/720 repeat pixels; installed-product evidence remains limited to the
  sampled success/stack path. A separate four-scene light wide/720 replay
  matrix now locks the same queue/stack counts, success/warning colors,
  zero-overflow shell geometry, and hover/action behavior; it remains
  controlled replay evidence rather than installed-product reachability. The
  complete response-stream
   retry/failure/follow-up state machine retains its recorded evidence level.
5. **Conversation and Composer lifecycle**: current queue/Stop automatic
   continuation is delivered through real current-build evidence,
   Browser/CDP, Electron, and regional pixels. Current permissions, Add
   resources, multiline/long-input geometry, active Goal/Plan modes, and the
   sampled long-thread navigation/windowing contract are also delivered. The
   `26.825.51511` Composer-control refresh replaces the older permission/mode
   anchor with the 438.6875×161.6875 three-item permission overlay, ordinary
   `menuitem` semantics, exact current permission/check and Goal/Plan SVGs,
   wide/compact geometry, selection/dismissal, clear, and focus restoration.
   Six reviewed frames and six local-only product comparisons gate the slice.
   The
   current Plan-writing follow-up additionally locks schema-valid
   `turn/plan/updated` ownership, `Step n / total`, the variable-height tooltip,
   progress, completion removal, and Worked/final-answer ordering across CDP,
   Electron, reviewed pixels, and a local-only current-product crop. Current
   free-form reasoning now also locks a no-tool generated summary and a
   `Worked for 14s` settled answer across CDP, Electron, a pixel-identical
   foreground crop, and a 3.3389% wider region; unsampled reasoning variants
   remain partial. The
   previous `26.820.60940` refresh replaces the old runtime anchor with the
   sampled four-item/48px rail gates, 30-message responsive composition,
   11/9/8 mounted-turn windows, message materialization, stale-current-marker
   boundary, and wide/compact structural pixel comparisons. Broader host
   eviction heuristics remain partial. Current external-file approval now
   covers pending → denied/no-file and pending → Allow once/file-created at
   wide and compact widths, while the Composer permission selector is the
   exact three-mode 26.820 menu. Historical matching-command persistence
   remains regression evidence, while the live follow-up now proves one real
   amendment-backed approval for two identical commands. Schema-validated
   `acceptForSession` file approval and automatic-review timeout replays now
   pass Browser/CDP, Electron, and internal regional pixels against current
   `26.803.41515` structural evidence; safe real-product reachability remains
   an explicit evidence gap. File/folder/multi-item/upload/error/preview
   attachment variants and the independent Electron picker bridge are now
   delivered. The current post-picker text/image composition and immersive
   preview are runtime-observed on `26.825.51511` and pass Browser/CDP,
   Electron, reviewed wide/compact baselines, and local-only product-region
   pixels through exact completion. Actual upload failure/progress and plugin
   variants remain open. A current 26.908.70816 selection probe records that
   choosing the public GitHub resource inserts an inline editor mention rather
   than a ComposerAttachment card, so replay-only plugin cards remain separate
   from current product attachment evidence. The Electron contract now also drives the replay-only
   uploading state at 1180×820 and upload-error → Retry → ready recovery at
   720×680, asserting accessible progress, Send enablement, focus restoration,
   and zero tray overflow. Current queue
   pause/Resume, resource-picker, and long-input paths are delivered on
   `26.825.51511`; retain the older automatic-continuation-only path as
   regression compatibility coverage.
6. **Coding workspace entry**: current selected/no-project destination,
   project/Local/branch context, New worktree/environment-empty state, and
   720px layout are delivered; independent project → environment/worktree →
   command → approval → Review → Terminal → PR acceptance remains covered.
   Real worktree creation and cross-restart project/task persistence are now
   reached on `26.803.61601`. The retained task restores its exact thread only
   after selection; a missing working directory leaves the Composer usable,
   exposes unavailable PR status, and remains session-latched until an app
   restart after the directory is restored. Project and branch creation are
   delivered. The current Work in/no-environment entry and unavailable
   Environments route are also delivered without inventing a cloud working
   directory. The latest 26.825 follow-up additionally refreshes the exact
   wide/compact project picker, five-action run-location menu, four-control New
   local worktree state, two-action Environment menu, and non-radio Branches
   menu through CDP, Electron, reviewed baselines, and local-only product
   regions. The own-playground host-backed branch mutation gate now covers
   create, checkout, and switch-back at 1180/720 without overflow; continue
   with installed-product environment repair, native directory selection,
   installed-product branch mutations, and production Remote lifecycles.
7. **Review content variants — delivered for the sampled current card,
   workspace, and Undo/Reapply family**: `26.820.60940` now covers a real
   added/modified/deleted `+4 −4` group, marker-backed two-file rename,
   wide/compact card and 419.59375/345.671875px Review workspace, scope/filter/
   selection/layout controls, successful Undo → Reapply, and the current
   420×247.6875 skipped-file conflict dialog. Browser/CDP, Electron, eight
   reviewed internal frames, and four local-only product crop gates verify the
   sampled family. Continue with real binary/merge-conflict content, larger
   file sets, and additional host failure variants; retain their public replay
   coverage without relabeling it as current-product runtime evidence.
8. **Terminal session lifecycle — delivered for the current local-shell and
   background-process contracts**: current project-labelled multi-tab/close/picker/compact
   evidence, per-session transcript ownership, real running/completed
   close/reopen persistence, close-all/fresh creation, and cross-worktree
   mismatch recovery; direct command `exit 7` continuing in the same shell;
   ordinary shell exit closing the tab; and an agent-created background
   process opening, closing, and reopening in the side panel. Failed/exited
   process summaries remain host-owned compatibility coverage. The terminal
   crash Reload copy is current package-structural evidence plus independent
   Browser/Electron coverage because intentionally crashing the product pty
   is not a safe runtime requirement. The `26.825.51511` refresh now locks the
   280px outer track, 40px header, 239px content, 156px tabs, 280×122.25px
   picker, 1180×820 current-sidebar split, and both 720×820 hidden/pinned
   sidebar layouts. CDP computed-style and interaction gates, native Electron,
   reviewed pixels, and three local-only product-region comparisons promote
   the session, bounded-process, and worktree-mismatch inventory rows to
   current-build verified.
9. **Pull request lifecycle**: delivered for the public component contract and
   deterministic Browser/Electron/pixel gates: index/detail loading and
   failure, checks, reviewers, comments, review submission, merge-readiness,
   merge completion, responsive non-modal panel composition, and route
   restoration. The current 26.825.51511 read-only refresh additionally gates
   the persistent selected-row Summary, Activity-before-comment ordering,
   normal/expanded detail continuity, and the nine-file Code view with two
   image previews through CDP, Electron, and three product-region pixel gates.
   Comment, review, and merge mutations remain deliberately unexercised.
10. **Remaining P0 turn/tool gaps**: current long command output, bounded
    scrolling, expansion, latest-line restoration, mixed stdout/stderr,
    exit-code failure, interruption/settlement, manual context compaction,
    thread-summary Environment/Git state, and same-thread recovery are
    delivered. Approval allow-once and matching-command persistence are also
    delivered. Session-scoped file approval and automatic-review timeout now
    have pinned protocol semantics plus independent Browser/Electron/pixel
    gates, without claiming an unsampled product transition. The sampled
    pasted-image attachment lifecycle and single-agent successful delegation
    lifecycle are also delivered. Native file/folder selection, multi-item
    overflow, upload/error, and preview recovery now have independent
    Browser/Electron gates plus current source-structural evidence. The real
    post-picker mixed text/image cards and immersive preview are now reached
    and pixel-gated on `26.820.60940`; retain actual upload failure/progress and
    plugin attachment variants as explicit gaps. Markdown
    link/fence mutation, nested/task lists, a multi-column table, long-content
    following, completion actions, and Electron scroll-away/return are now
    delivered independently. Very-large-table Copy/Expand/Preview is now also
    current-runtime-observed and delivered through public Browser/Electron/
    pixel gates. The current 26.825 completed-Markdown composition now also
    locks compact typography, a favicon link, current code assets, literal
    inline math, rendered block math, and wide/compact response geometry.
    The current 26.825.51511 rich-stream mutation is now delivered through
    link, empty-fence, task-list, code/table, long-tail, Stop, completion,
    reverse-origin scroll, Electron, and product-region pixel gates. Continue
    A separate current-media replay now locks real loaded and unavailable
    images, wide/compact geometry, immersive caption/Close/zoom, focus
    restoration, and five product-region pixel gates. The replay-only plugin
    attachment, Markdown error, terminal transport-failure, populated summary,
    and notification tone/action slices are now delivered. The opt-in live
    playground probe now covers real public-protocol subagent delegation and
    owning-thread Stop settlement; continue with installed-product/background
    process evidence and broader real global notification reachability. The
    real active `commandExecution` Stop follow-up now also settles an in-flight
    `sleep 30` command as an interrupted turn without a successful completion;
    provider-specific process-group behavior and installed-product evidence
    remain open. The bounded terminal transport-failure replay is delivered
    separately; current
    real transport recovery is delivered
    through an isolated proxy plus CDP/Electron/pixel gates. The independent
    transport state machine and
    subagent
    waiting/failure/interruption/streaming/pagination matrix is delivered.
11. **P1 resources and integrations**: Browser/artifact/document previews,
    environments, remote connections, Settings, MCP, plugins, skills, and
    automations, each with one end-to-end vertical slice. The current
    `settings.personalization` slice is delivered for Custom instructions,
    Memory controls, warning, Personality menu, wide/compact/bottom geometry,
    Browser/CDP, Electron, and local-only current-product pixels. The
    Personalization, Keyboard shortcuts, Voice/Dictation, and Usage & billing
    settings now also have explicit wide/720 light-theme Browser/CDP, Electron,
    and regional-pixel coverage; these are controlled replay evidence and do
    not claim host persistence or billing side effects.
    General and Appearance now also have explicit wide/720 light-theme
    Browser/CDP, Electron, and regional-pixel coverage; this remains controlled
    replay evidence and does not claim host preference persistence.
    Keyboard shortcuts and Voice/Dictation are now separate delivered slices:
    the first
    gates all 129 visible commands, filtering, edit/capture, sticky scrolling,
    and the current narrow-column behavior; the second gates microphone and
    nine-voice selection, screen context, hotkeys, dictionary, recordings,
    wide/compact scrolling, and host-supplied voice artwork boundaries. The
    keyboard surface now also exposes host-controlled loading, saving, saved,
    and error states with retry copy and locked search/capture controls. The
    voice surface follows the same lifecycle contract for microphone, voice,
    hotkey, and dictionary controls. Usage & billing now exposes the same
    host-controlled loading, saving, saved, and error boundary while keeping
    account, billing, and checkout effects outside the renderer. Usage
    & billing and its embedded Personal/Business plan surface are now a third
    delivered slice: plan/credits/reset cards, three meters, 5x/20x and
    annual/monthly selectors, host-owned checkout callbacks, matching
    loading/saving/saved/error boundaries, wide/compact scrolling, CDP,
    Electron, and current-product pixel gates. Real purchase,
    gifting, and billing-provider flows stay open. The Scheduled tasks slice is
    now delivered for wide/compact index layout, status/search empty states,
    suggestions, split Create choices, navigator/manual editor, unavailable
    recovery, Browser/CDP, Electron, and four local-only current-product pixel
    comparisons. The promoted 26.903.71938 native baseline now has a separate
    four-frame current-build replay (wide/compact index plus manual editor)
    with CDP, Electron, and regional-pixel gates; 26.825 remains historical
    regression evidence. The controlled `ScheduledTaskDetail` follow-up now
    covers replay-owned create/edit/save, pause/resume, detail facts, run
    success, and permission-shaped failure/retry at wide and 720px through
    Browser/CDP, Electron, and pixel gates. Persistence, cloud execution,
    delivery, real permissions, and installed-product automation mutations
    remain host-owned and open. The same current-build index and the
    ScheduledTaskDetail ready/error states now also have explicit wide/720
    light-theme Browser/CDP, Electron, and regional-pixel coverage; the light
    matrix is replay evidence and does not claim cloud persistence or mutation
    reachability. The Scheduled tasks index now also exposes host-controlled
    page/navigator disabled locking for search, filters, row navigation, toggles,
    and suggestion actions while preserving explicit retry. The current manual editor and permission-error detail now
    also have explicit light wide/720 and compact-error Browser/CDP, Electron,
    and regional-pixel coverage; controlled form mutation is covered while
    cloud persistence and execution remain host-owned. Plugin detail
    is now separately delivered for installed/discovery identity, suggestions,
    Apps, Information, disclosure, bottom scrolling, controlled uninstall and
    connection menus, wide/720 Browser/CDP, Electron, and eight local-only
    current-product regional comparisons. Real clipboard/navigation, install
    or uninstall, connection persistence, OAuth/permissions, external links,
    and failure effects remain open.
12. **Full-app validation and global convergence**: replay/live App Server
    attribution, dark/light and wide/compact matrices, current-build regional
    pixels, public contract freeze, compatibility matrix, and release
    checklist.

Each PR uses the fast local merge gate: latest-head `pnpm check` plus complete
`pnpm check:codex-app:acceptance`. Once those pass, squash merge and clean the
exact branch immediately. GitHub CI and bot review are not queried or awaited
for this exploration workflow; failures discovered by the required local gates
still block the merge.

## Local staged commit follow-up

The own-playground Live sidebar now exposes a staged-change preview and an
explicit local commit confirmation with a required message. Trusted project
tokens scope both IPC calls; the host Git queue serializes its operations.
The preview records branch, parent, exact staged patch and a fingerprint;
confirmation re-reads it and rejects stale, empty, conflicted or detached state.
It never auto-stages, discards files or pushes, and ordinary Git hooks remain
enabled. External Git writers are not serialized by this queue, so users must
avoid concurrent edits during confirmation. A command error is not described
as proof that nothing changed; refresh is required before another attempt.

Real temporary-Git tests cover unborn/detached HEAD, binary/rename/deletion,
conflicts, stale previews, hook rejection and staged-only successful commits.
The 1180/720 Electron gate confirms the rendered preview and local commit,
preserves unstaged/untracked contents, invalidates consumed previews, clears
failed refreshes and ignores a late read after leaving Live. It is included in
full acceptance. This is own-host functional evidence, not installed-Codex
pixel parity. Push/remote confirmation and the complete PR mutation workflow
remain open; this section does not mark Stage 5 complete.

## Confirmed single-branch push follow-up

The own-playground Live sidebar now separates reading a remote preview from
explicit push confirmation. A named remote must resolve to one push URL;
embedded HTTP credentials are rejected before sending the destination to the
renderer. The preview shows the exact destination, local/target branch, local
and remote commits, and outgoing commit count (listing at most 100 subjects).
Confirmation revalidates the fingerprint and sends the reviewed SHA to exactly
one branch, without force, implicit tags or recursive submodule pushes.
Missing remote objects or divergent history require explicit fetch/reconcile;
no background fetch, merge, reset or staging is performed. Git hooks remain
enabled. External writers are not locked; command failure is not represented
as proof that the remote remained unchanged.

Real temporary bare-repository tests verify single-ref scope even with mirror
and follow-tags configuration, stale local previews, multiple destination
rejection, no-op and divergent-history rejection. The 1180/720 Electron gate
checks read-only preview, changed-target invalidation, stale-confirm rejection,
refresh/retry, successful explicit push, read failure recovery and focus return.
Screenshots are outside the fixture repositories. `check:push-preview` now runs
in full acceptance. No real hosting remote was mutated by these tests and no
model turn was used. Authentication UI, provider-specific protection errors,
current installed-Codex visual parity and the complete PR workflow remain open.

## Explicit PR preparation and creation follow-up

The own-playground Live sidebar can prepare a same-repository github.com PR
from an already pushed branch. It resolves the selected remote explicitly,
excludes fork PRs with the same branch name, rechecks the pushed head after
reading PRs, and fingerprints the preview. Creation checks it again, rejects
an existing open PR, and sends the user's base/title/body through the public
GitHub REST API using `gh`. It does not push, fork, merge, change protection
rules or request reviews. External branch writers are not locked.

The 1180/720 synthetic Electron gate verifies draft retention, read failure
recovery and reconciliation after a simulated lost creation response. This
gate is in acceptance and performs zero GitHub writes. Real creation is a
separate explicit opt-in script, `create-reviewed-pr.mjs`, restricted by an
expected local head/branch and a clean checkout; use it for the development
PR itself, never as an automatic recurring test. Synthetic evidence alone is
not proof of real GitHub creation. Fork/enterprise flows, PR mutations beyond the metadata slice below,
provider authentication UX and current installed-product pixels remain open.

## Same-branch PR detail follow-up

Existing PR entries now expose GitHub links and a trusted-project detail read.
The host accepts only a PR discovered for the current same-repository branch,
validates its identity and detects a changed PR head during the read. The UI
shows status, base, head, plain-text body and file additions/deletions. It reports
both returned and total file counts rather than implying partial data is complete.
Failed reads clear old details; drafts remain intact. The content area scrolls
within a bounded height so the 720px footer remains reachable.

The existing synthetic 1180/720 PR gate covers detail success/failure/retry,
literal HTML-like text, links and expanded-dialog/footer bounds. The separate
explicit development-PR creation script now also reads that actual PR's detail
through the UI. Neither test is evidence of installed-Codex pixel parity. Full
diff support beyond the bounded text patch below, PR edits beyond title/body, merge modes beyond the explicit admin slice below, closed-PR history and provider-specific flows remain
open; this does not mark the complete PR workflow finished.

## Same-branch PR diff follow-up

The Live PR detail now reads a plain-text GitHub diff on explicit request, without
checkout or working-tree writes. The host revalidates current-project PR ownership
and the selected head before reading, then checks head, base name and base SHA
again afterward. Changed revisions reject the result; this is not a transactional
lock against external writers. Output is bounded to 8 MiB and provider failures
clear previous patch contents with a refresh/retry message. Binary contents and
provider-limited diffs are not claimed as complete previews.

The 1180/720 synthetic Electron gate covers literal patch rendering, bounded
scrolling/footer reachability and failed-read recovery. Backend tests cover
stale heads, changed bases, unrelated PRs and command/output failure. The opt-in
development-PR script also reads the real PR diff through the UI. These are own
playground functional checks, not current installed-Codex pixel parity.

## Explicit existing-PR metadata edit follow-up

Live PR details now open a separate title/description editor. Only explicit
confirmation writes GitHub; cancel and unchanged values perform no mutation.
The host re-reads the same-project open PR and compares its original title,
body, head, base name and base SHA before issuing a metadata-only edit. A fresh
detail read verifies the saved values. This optimistic check is not an atomic
server-side lock against other writers. Failed or uncertain outcomes preserve
the draft, clear obsolete detail/diff and require a detail refresh before another
confirmation; an already-saved draft becomes a no-op rather than a blind retry.

Backend tests cover successful and stale edits, validation, no-op and uncertain
responses. The 1180/720 synthetic Electron gate covers explicit confirmation,
lost-response reconciliation, a subsequent successful edit, cancel and footer
reachability. The opt-in development-PR script verifies one real description edit
through Electron. Base/reviewer/label mutations, other merge modes and closed history remain
open; no installed-product pixel-parity claim is made for this own-host editor.

## Explicit administrator squash-merge follow-up

The Live PR panel now prepares a separate merge target and requires both explicit
administrator/local-validation acknowledgement and the exact head SHA. This
own-host action is intentionally labelled as bypassing required checks/reviews;
it does not change repository protection, enqueue auto-merge or perform local Git
cleanup. The backend revalidates the current project's open PR, head and base,
rejects conflicting/unknown readiness and passes `--match-head-commit` to GitHub.
The base recheck is optimistic, not a server-side transactional lock.

Success requires a matching `MERGED` result and a merge commit SHA, not just exit
zero from the command. Lost responses reconcile once with a read; the UI exposes
read-only result checks and blocks blind mutation retries. Result reads resolve
the selected project's exact GitHub remote and still work after head deletion.
The 1180/720 synthetic gate covers confirmation, wrong heads, pending dismissal,
lost-response/status-error recovery and footer bounds with zero GitHub writes.
Backend tests gate exact arguments, stale targets, conflicts and result identity.

`merge-reviewed-pr.mjs` is a separate explicit opt-in real development-PR action,
never acceptance. It requires a clean expected head/branch and a receipt proving
both complete local gates exited zero for that head before clicking the UI merge.
The UI checkbox itself is an acknowledgement, not execution of local validation.
After a real merge, the agent still synchronizes main and removes only that PR's
branch. Normal non-admin/queue/rebase merge modes, cleanup beyond the explicit slice below,
closed-PR history and current installed-product pixels remain open.

## Confirmed post-merge main synchronization and cleanup

The verified-merged panel now offers a separate explicit cleanup confirmation.
It re-reads the exact PR from the selected project's GitHub remote, requires a
merge into main, and refuses dirty/untracked files, changed local/tracking/remote
heads, unrelated checkouts, divergent main and branches occupied by another
worktree. One explicit base ref is fetched without tags or broad pruning, and
main is fast-forwarded only after it is proven to contain the merge commit.
Ignored local files are not overwritten; no reset, autostash, force checkout or
recursive submodule update is used. Remote branch deletion uses an exact-head
lease; local and remote-tracking refs use expected-object atomic deletion.
Only the verified PR branch is removed. Unused branch config may remain; the
cleanup does not broadly rewrite Git configuration.

The operation is not a transaction across GitHub and local Git. Failures may
leave safe partial progress, so the UI says incomplete, clears confirmation and
refreshes host branch state rather than claiming rollback. Reconfirmation safely
revalidates already-removed refs and already-synchronized main. Six real Git
tests cover dirty/divergent/advanced refs, remote deletion races, ignored files,
another worktree and idempotence. The 1180/720 Electron gate runs the actual Git
cleanup against disposable bare remotes with synthetic provider identity, checks
dirty-file preservation and lost-response recovery, and is part of acceptance.

The separate real development-PR merge script now also confirms cleanup through
the UI and independently checks clean main, main/origin-main equality and exact
local/remote branch absence. It still requires both complete local gates for the
final head before any real merge. Closed history, other merge modes and current
installed-product pixel convergence remain incomplete.

## Current-branch Live PR workspace route

The sidebar Pull requests entry now preserves Live mode instead of switching to
replay fixtures. Its own-host route reads open PRs for the current pushed branch
on origin, retains search state across navigation, and opens non-modal Summary
and Code panels backed by the existing detail and bounded-diff APIs. Loading,
empty, provider errors and retries are explicit; failed reads clear stale data.
Project changes and refreshed requests invalidate older detail responses.
Existing create/edit/merge/cleanup actions remain available from this route.

The synthetic Electron gate covers 1180/720/600 widths and dark/light cases,
route restoration, literal description rendering, retry and panel geometry.
Below 680px the detail replaces the list and fills the window. The opt-in real
development-PR script also reads the created PR through this route. These are
own-playground functional and responsive checks, not current installed-product
pixel evidence. Project-wide and closed history, comments/reviews and broader
PR workflows remain incomplete.

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
