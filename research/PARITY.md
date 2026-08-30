# Coverage and parity policy

This document no longer claims that the repository has complete Codex Desktop
parity. The previous matrix covered a selected conversation sample and could
not establish full conversation, workspace, application, or product coverage.

The authoritative current-build inventory is:

- [`26.825.51511.md`](26.825.51511.md) for the current package fingerprint,
  reproducible shell baseline, responsive Composer, Help menu, Projects Index,
  and the project-menu provider/rendered Section-submenu boundary;
- [`26.825.31414.md`](26.825.31414.md) for the previous shell, activity, Plan,
  Search/Browser, long-thread, Markdown, and Projects evidence;
- [`26.820.60940.md`](26.820.60940.md) for the previous broader shell,
  reproducible global-shell baseline, Help menu, responsive Composer shell,
  route restoration, native project-menu provider, and Projects Index drift;
- [`26.818.41509.md`](26.818.41509.md) for the previous New chat home,
  account-menu, conversation, command, MCP, Markdown, sidebar-state, worktree,
  and product-pixel slices;
- [`26.810.52044.md`](26.810.52044.md) for the previous broader sidebar/menu,
  115 scoped visual assets, Settings/Git navigation, command, MCP, worktree,
  approval, and Review observations;
- [`26.803.61601.md`](26.803.61601.md) for the previous shell, command,
  Terminal, workspace, Settings, and same-state dark-shell acceptance;
- [`26.803.41515.md`](26.803.41515.md) for the previous Markdown table,
  attachment, MCP, sidebar/Composer, and window-chrome captures;
- [`26.730.61639.md`](26.730.61639.md) for the previous Terminal
  session/process/mismatch and subagent captures;
- [`26.730.61309.md`](26.730.61309.md) for the previous sidebar, command,
  approval, thread-overlay, pasted-image attachment, workspace-entry, and
  Review captures;
- [`26.727.40816.md`](26.727.40816.md) for the previous main-Renderer shell,
  New chat, Terminal, PR, Composer, MCP, long-thread, approval, and command
  runtime sample;
- [`26.721.81911.md`](26.721.81911.md) for the previous sidebar, Composer,
  MCP recovery, Review, Terminal, and PR runtime sample;
- [`26.721.41059.md`](26.721.41059.md) for the previous runtime-sampled build,
  scoped CDP evidence, and research boundary;
- [`26.715.72359.md`](26.715.72359.md) for the previous build's broader
  historical runtime sample;
- [`UI_INVENTORY.md`](UI_INVENTORY.md) for classification, evidence levels,
  priorities, and delivery order;
- [`ui-inventory.json`](ui-inventory.json) for machine-checked surface status;
- [`RUNTIME_CAPTURE.md`](RUNTIME_CAPTURE.md) for the required runtime flow and
  state evidence.

## Current conclusion

- Existing React primitives cover parts of the message, activity, composer,
  resource, approval, overlay, and thread-navigation vocabulary.
- The showcase proves only those implemented examples; it is not a complete
  Codex conversation or application reconstruction.
- The Electron playground validates the current package in a desktop
  BrowserWindow; it does not prove parity with unobserved product routes,
  panels, state transitions, or window types.
- A scoped Codex Desktop `26.825.51511` (`7377`) probe revalidates the shell,
  responsive Composer, primary navigation, project-group lifecycle, Help menu,
  route restoration, project-menu provider, and Projects Index. Explicitly hiding the
  720px sidebar now removes Back and Forward alongside the navigation, and the collapsed
  Projects content remains 559px with 415/128 columns. The sidebar is now
  321.875px wide and `Sites` is absent from the sampled fixed-route stack. The
  project action menu still uses the frozen Electron native context-menu
  provider. The provider now includes Section and Reveal, while the sampled
  AppKit render filters Reveal and presents a 252×187 six-action main menu plus
  a 118×34 `New section…` submenu. Browser/CDP, Electron, exact 16×16 Section
  source, reviewed baselines, and local-only 3.8155%/6.9542% regional pixel
  comparisons gate the split boundary.
- A previous 26.825.31414 read-only Search/Browser follow-up reaches real Web Search and the
  in-app Browser without project-file access. It locks `Worked for 21s` →
  `Searched the web`, the current generic MCP-backed `Used the browser, loaded
  a tool` group, and the 419.59375px one-tab Browser workspace with 46px/40px
  chrome rows. Six Browser/CDP frames, two Electron lifecycle checks, and six
  reviewed replay baselines cover the sampled states. Local-only product
  comparisons pass at 10.32% for Search text, 8.45% for Browser activity, and
  2.80% for Browser chrome. External page pixels and unsampled multi-tab,
  authentication, download, permission, history, and error states are not
  claimed.
- A current no-tool rich Markdown stream reaches link-only output, an open
  empty TypeScript card, task rows, filled code, a seven-column table, 36 H2
  sections, running tail, Stop, and completion. The public `AgentMarkdown`
  compact density locks 14/22.75px body, 17.5/24.5px H2s, 14px round task
  controls, and the 122.75px table while eliminating an empty-fence
  `undefined` leak. Six Browser/CDP checkpoints, Electron code/table/scroll
  interaction, five reviewed baselines, and four local product regions pass;
  the latter differ by 1.72–4.77% under 8%. Citations, live media,
  table/error, and plugin Markdown variants remain open.
- A current `26.825.51511` sidebar follow-up reaches one selected running task
  and one naturally completed background-unread task in an isolated profile.
  It keeps the sidebar at 321.875px at both 1180 and 720, locks the
  305.875×30px row, 13/18.5714px weight-400 type, exact spinner, 8×8
  `#3a83f7` unread dot, and `Pin chat`/`Archive chat` hover replacement.
  Browser/CDP, Electron, three reviewed frames, and local-only action/active/
  unread shape comparisons at 2.9762%, 0.3571%, and 0% promote the sampled
  thread-history, item-action, and status inventory groups. Waiting, error,
  worktree, mutations, and longer history variants remain incomplete.
- A second current sidebar lifecycle probe reaches one real disposable
  worktree through setting-up, controlled initialization failure, Retry,
  recovered unread, and restored-idle states. The current failed background
  row intentionally has no unread marker; the blue unread dot appears only
  after Retry succeeds and the recovered response completes. Browser/CDP and
  Electron lock 305.875×30 rows, the exact 14×14 branch plus spinner/error
  sources, `#ff6764`/`#3a83f7` paint, 39/11px branch insets, actions, and the
  720px boundary. Local-only active/failed/recovered tail masks pass at
  3.7698%, 0%, and 0%. Queued/creating and the full failure workspace remain
  open, so implementation stays partial.
- The previous 26.820 account-menu matrix supersedes the previous focus and
  typography boundary at Dark/Light × 1180×820/720×680. The portalled surface
  remains 306.90625×188.375px with six 28.5625px rows, five exact icons, one
  avatar, zero role separators, zero overflow, Escape dismissal, and trigger
  focus return; pointer open now focuses `role=menu` and every row computes to
  weight 400. Content-dependent trigger width is no longer frozen.
  Browser/CDP and Electron repeat the matrix, while privacy-masked current
  product comparisons pass between 0.3794% and 0.5284% under the Dark
  0.5%/Light 0.6% limits.
- A separate previous 26.818 sidebar task revalidated project-task and Recents history,
  their unified 19×20 Pin/Archive hover actions, and ordinary active,
  completed, and unread presentation. Browser/CDP and Electron lock the
  geometry and replacement behavior; local-only 72×30 action and 28×30 status
  tails pass between 0% and 3.1944%. Content-dependent Recents count is not a
  parity constant. The older follow-up locks its sampled ordinary `Needs
  input` and error rows plus `No chats` and the exact one-heading/four-row
  loading skeleton; a privacy-safe 140×29 live empty crop differs by 1.8227%.
  The previous 26.820 recapture supersedes waiting and long-list behavior: a
  real waiting-on-approval project task keeps the shared 16×16 spinner, while
  a five-row `Show more` control reveals all current rows and disappears with
  no `Show less`. Browser/CDP and Electron repeat the one-way reveal; local
  waiting/Show-more regions pass at 2.7381% and 3.8393%. A current empty
  project additionally re-reaches the exact 306.90625×29 `No chats` row and
  passes its foreground-only 140×29 comparison at 2.4138%. A current
  disposable New-local-worktree success re-reaches loading → restored with
  the same 30px row and 14px branch geometry; its 56×30 tails pass at 1.0714%
  and 0%. The real selection, context, workspace summary, exact response, and
  cleanup additionally promote the five sampled worktree-related inventory
  groups to 26.820 runtime evidence while retaining partial verification. A
  second current disposable probe now distinguishes foreground-read failure
  from a real background failed-plus-unread task, moves the scoped blocker
  aside, and proves that `Retry` creates exactly one child worktree. The
  current failed row retains the 14px branch at 67px, red 16px error at 38px,
  and blue 8px unread dot at 14px; its privacy-safe 84×30 tail has 0%
  foreground-mask difference from the replay. The previous
  loading/error/restored ratios of
  2.0833%, 0.7540%, and 0.1786% remain build-scoped regression evidence.
- The previous Codex Desktop `26.810.52044` (`6662`) visual probe revalidated the
  exact 1180×820 dark/resting asset fingerprint and now retains 115 exact
  sidebar/menu/window-chrome/Composer/environment/Settings/completed-thread icons plus
  one separately hashed, playground-only VS Code integration raster. Its sampled sidebar
  hover/footer contract also
  passes Browser/CDP and Electron acceptance; its independently scrolled
  Recents sample removes the leading Thread approximation while the broader
  routes and lifecycles remain on their separately recorded builds. The visible
  Sidebar/Back/Forward titlebar controls and all eight visible Composer
  context/action icons are exact. This empties the scoped visible-shell
  approximation list without making the broader inventory or lifecycle
  denominator complete. The current Project picker additionally restores its
  260×249.5 two-action composition, exact New/Clear glyphs, empty-search state,
  Escape focus return, and clear/restore lifecycle. The account-menu slice now locks five real icons, six
  items, one de-identified avatar, zero role separators, and Escape focus
  return; Usage no longer has a trailing chevron. The ordinary sidebar status
  slice now locks real active/unread geometry, color, actions replacement, and
  local-only pixels. A new `26.810.52044` disposable-repository probe supersedes
  the prior worktree anchor with real create, controlled failure, Retry
  recovery, and restored rows. It locks all five worktree phases and the
  sampled failed-plus-unread three-track composition: 14×14 branch marker,
  16×16 red error, 8×8 blue unread dot, and exact 8/36/67px rail/branch
  insets. Browser/CDP, Electron, and owned local-only row pixels gate the same
  26.810 boundary. A later real-worktree probe proves project/task persistence
  across an app restart while also proving that New chat, rather than the exact
  thread, is the initial restored route. Selecting the retained task restores
  the conversation. Removing its disposable directory reaches the exact
  missing-working-directory notice and unavailable PR status while the
  Composer and a model-only turn remain usable; restoring the directory clears
  the session-latched warning only after another app restart. Browser/CDP,
  Electron, and a 3.2572% local-only notice crop gate that observed boundary.
  Broader unsampled inventory still keeps global pixel parity ineligible.
- The current 26.825 Review anchor reaches a real `+5 −5` three-row card whose
  protocol retains four raw diffs because one path is deleted and re-added.
  It locks 736/688×173.5px wide/compact cards and
  591.828125×820/344.671875×680 Review panels, exact card-files and Undo SVGs,
  initial single-diff expansion, duplicate-path preservation, and settled
  Send/Stop behavior. Four CDP/Electron frames and reviewed baselines pass;
  local-only card crops are 4.2901%–6.4586% and panel crops are
  1.9445%–2.5733% under separate limits. Binary/conflict, larger-set, and
  broader Undo/failure variants remain open.
- The previous 26.820 Review follow-up reaches an exact `+4 −4`
  added/modified/deleted card, the marker-backed two-file rename presentation,
  successful Undo → Reapply, and an externally induced Undo conflict. The
  Review workspace is 419.59375×820 wide and 345.671875×680 compact, with the
  current 40/60 diff/files split and six-item scope menu. Browser/CDP and
  Electron gate eight wide/compact lifecycle frames; eight reviewed internal
  baselines pass. Local-only product crops pass at 2.9976%/3.0323% for the
  file card, 4.6219% for the wide workspace, and 3.3747% for the compact rename
  workspace. This supersedes 26.810 for the sampled
  file-card/side-panel/editor/multi-file family while binary/merge-conflict
  content, larger file sets, and additional host failures remain open.
- The previous 26.810 command follow-up reached bounded success, exact `exit 7`, Stop,
  persistent stopped-command settlement, and same-thread recovery on
  `26.810.52044`.
  It adds the exact three-path terminal glyph; matches the 13px/19.5px/445
  command typography; and separates current-turn Stop from host-owned Stop all
  and per-process background controls. Unlike the previous build, settlement
  and recovery retain `Background terminal stopped with …` rather than
  rewriting it to `Ran …`. Browser covers wide/690/720 geometry, the protocol
  app passes 198-frame CDP and real Electron interactions, and the four new
  local-only failure/stopped command and Composer regions pass between
  2.2101% and 4.2564%.
- That installed fingerprint owned the machine-readable baseline at the time. A
  sanitized capture selects the main `app://-/index.html` Renderer by URL,
  area, shell landmarks, and visible-control density; it excludes the avatar
  overlay and stores no private text or screenshot. It records the 274.11px
  fresh-profile sidebar at 1180/820/721, the exact 720px collapsed state,
  explicit 720px
  pinning, Pull requests selection, New chat restoration, stable 44px editor
  geometry, internal scroll ownership, and zero horizontal overflow. Matching
  Browser/CDP, Electron, and owned regional-pixel gates promote only those
  sampled shell groups. The capture is Renderer emulation, not native-window
  resize evidence.
- The previous-build sidebar lifecycle follow-up records six project groups, 30px
  project and task rows, 2px/8px child-list padding, 1px separators,
  pointer/Enter/Space expansion, the conditional six-/seven-item project menu,
  the eight-item Help menu, and explicit 720px pinning. Twelve
  newly promoted menu icons are exact runtime primitives. Browser/CDP,
  Electron, and four local-only comparisons pass at 1.54%, 0.13%, 0.30%, and
  3.12%; the references and raw product records remain untracked. The
  `26.803.61601` refresh repeats the structural lifecycle and adds a same-state
  dark New chat composition. Its sampled-product top/footer/main regions pass
  at 3.1387%, 0.4126%, and 0.3146%, while evidence not re-reached on this build
  retains its previous build prefix.
- A second previous-build capture proves a persisted 322.91px sidebar within
  the wide 240–520px resize contract and the stricter 240–368px compact-pinned
  evidence range, adds the five-action Work in menu, separates
  the external Codex web anchor from local execution state, and reaches the
  no-environment menu plus the current 768px unavailable Environments route.
  Ten more exact primitives raise the scoped manifest to 53. Browser/CDP,
  Electron, and three local-only product comparisons pass without creating an
  environment; populated environment editing/repair and Remote connections
  remain open. The previous `26.818.41509` refresh supersedes the entry wording
  with `New local worktree`, disabled `Cloud`, generic accessible context
  labels, and a 264×91.125 two-action Environment menu. Two disposable
  repositories additionally prove success, controlled failure, Retry, and
  restored states in the real product; Browser/CDP, Electron, and three
  privacy-safe tail gates repeat that sampled lifecycle.
- A later previous-build Settings capture promotes 24 exact Back/Search/item
  icons and reaches the full-page 322.91px navigation plus the 768px Git
  preferences page. The independent public shell and Git components pass
  Browser/CDP, Electron, reviewed wide/720 baselines, and local-only
  sampled-product comparisons at 2.4214% and 3.0210%. At that slice Hooks and
  all other Settings pages remained separate, and the scoped asset manifest
  reached 77 without closing the broader P1 denominator.
- The next read-only capture splits Appearance from General and reaches its
  complete top-to-bottom scroll surface at 1180, 820, and 720 widths. The
  controlled public page covers three theme radios/previews, Light/Dark theme
  editors, the sixteen-option code-theme menu, diff preview, four switches,
  two contrast ranges, Dock radios, keyboard groups, and bounded font-size
  fields. Browser/CDP and Electron prove Git ↔ Appearance routing and retained
  state; four reviewed frames bring the matrix to 174. Local-only wide,
  compact, and Preferences comparisons pass at 1.2787%, 1.8977%, and 3.4665%.
  Dock rasters remain host-owned/untracked, so exact navigation provenance is
  preserved without importing proprietary product artwork. General, Hooks,
  and the other Settings rows remain open.
- General is now a separate controlled Settings slice rather than coverage
  inherited from the shell. Its 21 rows span Permissions, General, Composer,
  Popout Window, and Notifications, with five single-select menus exposing
  current-value descriptions and radio checked states, a searchable 66-language
  list with a dialog-plus-listbox hierarchy that preserves native Home/End
  caret editing, twelve switches, two keyboard groups, and locally controlled shortcut
  capture/formatting/clear/cancel.
  Browser/CDP and Electron prove geometry, light/compact/bottom states,
  interactions, persistent-value continuity, and transient shortcut-capture
  cleanup across General, Git, and Appearance. Hotkey/bottom snapshot frames
  are initial-only and normalize after route navigation.
  Six reviewed frames extend the matrix to 180, including a dedicated 720px
  shortcut-capture frame. Optional local-only product
  gates compare the full wide, 720px top crop, hotkey capture, and bottom
  frames at 4.6143%, 6.7412%, 4.7654%, and 4.8818%; captured selections remain
  observed fixtures, not declared defaults.
  At that point Hooks/code review and the remaining Settings rows remained
  open.
- Hooks/code review now forms its own controlled family. The visible current
  Hooks route covers empty/loading/error/configured sources, reload feedback,
  trust-before-enable, exact navigation and reload assets, 1180px/720px
  geometry, and route/search continuity. The separately registered Code
  review module remains explicitly `package-observed` because current
  navigation and search do not expose it; its controlled deep fixture covers
  automatic review, PR-open/every-push/smart triggers, exhaustive review, and
  optional credit use without adding a false current row. Browser/CDP,
  Electron, and eight reviewed frames extend the matrix to 188. Untracked,
  unmasked full-frame current Hooks comparisons pass at 1.7651% wide and
  1.8064% at 720px. The runtime-captured reload SVG raises the exact asset
  manifest to 78; the later completed-thread slice raises it to 90. Remaining
  P1 Settings/integration families stay open.
- Computer Use exploration is blocked by the environment safety policy for
  `com.openai.codex`. User-authorized CDP probes on `26.721.41059` revalidated
  access, the main-shell target shape, a de-identified Projects entry/list,
  the new-chat destination/context split, Project and Local environment
  overlays, a disposable synthetic task's basic thread lifecycle, an expanded
  read-only command, a pending command approval, and the split between a
  turn-owned file-change card and workspace-owned Review diff. A later compact
  probe also reached completed web search, expanded Browser activity, a failed
  exit-code-7 command, and the assistant fallback shown when no GitHub
  connector/MCP tool is available. A further synthetic long-thread probe
  reached the stable ten-message navigation rail, reverse-origin scroll-away
  state, post-stop summary, and `/compact` running/completed lifecycle. A
  synthetic Markdown probe on that build also revalidated heading, inline
  code, link, quote, list, table, fenced code, copy control, and completed
  response actions. A later real read-only `openaiDeveloperDocs` run reached a
  successful five-call MCP group and completed linked answer. The unavailable-
  tool fallback remains a separate recovery state and does not establish an
  MCP call. The probes did not expose private project contents, Remote
  behavior, code search, broader connectors, or the wider thread-error, queue,
  Markdown variants, menu, global-route, and Settings states; those remain
  historical evidence from `26.715.72359` until sampled again.
- The current Codex Desktop `26.803.61601` (`6396`) Terminal follow-up proves
  that a child command `exit 7` leaves the direct interactive shell usable and
  does not show a terminal failure, while ordinary shell `exit` closes its tab.
  A real agent-created background loop remains active after the response,
  appears in `Background processes`, and opens live output in a 381.44px side
  panel. The independent state machine closes and reopens that tab while the
  process remains active. The installed package supplies the separate crash
  title/description/Reload structure; deliberately crashing the product pty is
  not treated as required runtime evidence. Four new Browser/CDP, Electron,
  and reviewed internal pixel scenes bring the visual matrix to 192.
- The previous Codex Desktop `26.730.61639` (`6234`) Terminal refresh locks the
  local project-labelled session shell, global visible numbering across
  workspaces, nearest-tab selection, label reindexing, the four-item picker,
  three-tab compact fit, and independent transcript state. A real bounded
  command verifies close/reopen persistence while running and completed
  settlement. Closing the last tab collapses the panel; the top Toggle creates
  a fresh empty current-workspace terminal. The cross-worktree warning exposes
  exact `Dismiss`/`Open new terminal` recovery without discarding older
  sessions. Browser/CDP covers 93 frames, Electron repeats the owned
  interactions, and the exact 906×820 reference passes at 1.5120% panel and
  0.4004% content difference. The current follow-up now owns the remaining
  direct-command, crash-reload, and background agent-process gates above.
- The previous Codex Desktop `26.730.61309` (`6223`) sidebar refresh locks the
  274px dark column, 46px titlebar, 70px header, 30px routes, five expandable
  project groups, dense history, actions/status, fixed 46px footer, and 16px
  resize target. The regular split remains through 721px and auto-hides at
  720px. Explicit Show pins a non-modal 274/446 split across Pull requests
  navigation; explicit Hide restores the full 720px route, and an inline-start
  hover no longer opens the historical edge preview. The de-identified public
  scene remains covered by the 93-frame Browser/CDP and pixel matrix plus
  Electron interaction.
  Current-build regional ratios are 3.6234% for the top, 0.1292% for the
  text-masked selected row, and 0% for the text-masked footer. The UIKit
  keyboard-resize semantics exceed the sampled native separator and are
  documented as an accessibility improvement, not inferred parity.
- The previous Codex Desktop `26.727.40816` (`6067`) snapshot has dark
  main-Renderer
  captures for all six left-sidebar groups, the New chat Composer/project
  picker, the read-only Terminal shell, a real successful OpenAI Developer
  Docs Search → Fetch turn, and public PR `#80`. Target selection uses the
  `app://-/index.html` URL plus application-shell landmarks and excludes the
  small auxiliary page. The successful MCP path now matches its two-call
  integrated activity disclosure and passes a current regional pixel gate.
  The failure/recovery path now matches a standalone invalid-URL Fetch,
  intermediate explanation, three Search rows, successful Fetch, linked
  answer, and a second current regional pixel gate. A read-only 82-message
  thread additionally establishes compact navigation, seven mounted nearby
  turns, reverse-origin scrolling, and return-to-latest behavior.
  The current PR changed to Summary/Code tabs with
  Timeline integrated into Summary, loaded real multi-file Code content, and
  exposed a display-only Review options menu. The independent Browser and
  Electron flows verify the matched shell/New chat/PR structures and all 66
  deterministic lifecycle frames. The refreshed PR regional gate passes at
  5.75% full-main, 4.68% index, and 6.44% detail difference. A third
  text-only current probe verifies the 710×39 Composer queue, visible
  Steer/Delete/message-actions controls, 28×28 Stop, `You stopped after 2s`,
  and automatic queued continuation. Browser, Electron, and 792×320 regional
  gates pass at 0.35% queued and 0.51% continued difference; the previous
  paused/Resume behavior is retained only as legacy compatibility.
  A fourth current probe verifies the 736×134 four-line Composer, 205px
  long-input clamp, four-choice 480×222 permission menu, and the new 736×320
  inline Add-resource picker. Public `ComposerPermissionMenu` and
  `ComposerResourcePicker` contracts, CDP, real Electron, and three regional
  gates pass at 0.10%, 0.13%, and 0.34% changed pixels. Active Goal/Plan modes
  are independently current-observed. That probe did not automate native
  attachment selection; the later current-build pasted-image lifecycle is
  recorded separately rather than inferred from the resource menu.
  Terminal multi-tab/process lifecycle, Review variants, broader
  shell matrices, and their external pixels remain `26.721.81911` historical
  evidence. That build's project-named single Terminal tab and close/add
  controls independently passed Browser, Electron, and regional pixel gates;
  the broader current lifecycle is recorded above.
  Offline/error/reconnecting/stale and global-notification runtime states
  remain synthetic independent coverage, not current-build observations.
- Renderer viewport probing exposed a narrow-layout gap: the thread and
  Composer shrink, but the fixed app sidebar remains and the right workspace
  panel can be laid out beyond the simulated viewport. The independently
  implemented current-thread shell retains Browser and Electron regression
  coverage at its measured wide and compact geometry, but native Codex window
  behavior, the updated build, and the remaining app-shell/panel interactions
  stay separate acceptance requirements.
- A later read-only `26.727.40816` public-PR probe established that build's
  non-modal PR overlay, Summary/Code content with integrated Timeline,
  successful Code loading, responsive 1180/960/820/720px geometry, and
  explicit row reopen after responsive auto-hide. The
  independent public state machine adds list/detail loading and failure,
  checks, comments, review submission, merge readiness/completion, and compact
  recovery through 65 Browser/CDP, Electron, and reviewed-pixel frames. No
  review, comment, or merge was sent to the real PR, and successful
  review submission remains synthetic because the current Review options menu
  contains display settings only; those mutating states must not be reported
  as current-product runtime parity.
- The `26.727.40816` Composer mode slice independently observed unsubmitted
  Goal and Plan drafts. Both preserve the measured 736×98 shell, expose
  mode-specific accessible prompts, and clear back to the default focused
  input. Browser/CDP, real Electron, and masked regional pixels pass at 0.38%
  and 0.35%. The native attachment panel was not automated and remains
  outside that build's parity and is now previous-build evidence.
- The `26.727.40816` long-thread slice observed 82 compact navigation buttons,
  a seven-turn mounted window around message 40, negative away-from-latest
  scrolling, and a 32×32px return control. Browser/CDP and Electron reproduce
  selection and restoration with synthetic content, while a masked regional
  gate compares only the rail and floating control at 0.59%. Host eviction
  policy outside this sampled state remains an open product boundary.
- The previous `26.820.60940` long-thread refresh uses one exact 30-prompt,
  tool-free disposable thread. It supersedes the runtime anchor with the
  current four-item source minimum, 48px spatial gate, 36×10px compact rail,
  11-turn wide and nine-turn compact mounted windows, reverse-origin
  `scrollTop` values, and eight-turn return-to-latest state. At 1180×820,
  navigation materializes message 15 while the sampled product keeps message
  30 as `aria-current`; at 720×680 the rail is absent and the 32×32px return
  control remains. Browser/CDP and Electron exercise message 29 → 15 → latest
  and compact return. Reviewed internal baselines pass, and optional
  local-only current-product structural comparisons pass at 0.8085% wide and
  0.8397% compact under a 1% hard limit. This verifies the sampled current
  shell, basic messages, virtualized timeline, and message navigation without
  claiming unsampled host eviction behavior or whole-product parity.
- The `26.727.40816` approval slice observed a real 736×162 command approval,
  drives `Deny`, confirms the command did not execute, and verifies the
  completed activity, final response, response actions, restored 736×98
  Composer, and `Ask for approval` permission mode. The public declined trace,
  CDP, Electron, and ownership-masked build pixels pass at 0.85% pending and
  0.12% denied. Allow-once completion, persistent approval, timeout, repeated
  denial, and other approval kinds remain open.
- The current `26.730.61309` long-command slice observes one real
  `seq 1 400` run.
  Ask mode auto-ran the low-risk command without an approval card, so this is
  not allow-once evidence. Browser/CDP and Electron reproduce the collapsed
  and expanded `Shell` surface, 144px reverse-tail viewport, 401 split lines,
  copy controls, Success state, and collapse/reopen restoration. The
  ownership-masked full-window comparison passes at 0.17%.
- A second current-build command slice observes one real read-only loop with
  80 stdout records, 80 stderr records, and exit code 7. Browser/CDP and
  Electron reproduce its running output, failed/collapsed and failed/expanded
  states, exact copied transcript, reverse-tail restoration, and the
  successful no-tool follow-up in the same thread. The ownership-masked full
  1180×820 comparison passes at 0.89% under a 1% hard limit. This is evidence
  for command-level failure recovery, not transport-level retry parity.
- A third current-build command slice drives the real 28×28 Stop action after
  95 seconds, observes the immediate and background-settled command rows, and
  completes an exact no-tool recovery turn in the same thread. Four public
  frames plus Browser/CDP and Electron interaction preserve the interruption
  summary and focus restoration; the ownership-masked running comparison is
  below its 0.5% hard limit.
- A fourth current-build task drives `/compact` from the 9%-usage command row
  through manual running/completed states and an exact same-thread recovery.
  Browser/CDP and Electron reproduce the command menu, `Working` separator,
  Stop/Send transition, `Context compacted`, and focus restoration. Its
  ownership-masked full-window running comparison is 0.16%, promoting only the
  sampled manual compaction lifecycle; automatic/work modes, cancellation,
  repetition, and the thread summary remain open.
- A fifth current-build task independently reaches the thread summary as an
  environment/Git workflow overlay rather than context-compaction text. Its
  public 300×199 surface, Browser/CDP behavior, real Electron interaction, and
  ownership-scoped pixel gate pass; populated resource sections and compact or
  pinned variants remain open.
- Two current command-approval tasks complete the previously open success
  paths. One drives `Allow once`; the other selects `Allow similar commands`
  and proves an identical second command no longer asks while the global
  policy remains `Ask for approval`. Browser/CDP, Electron, schema-validated
  traces, and four ownership-masked current-build frames pass under their 1.5%
  limits. Approval timeout, repeated denial, other approval kinds, and rule
  lifetime across restart boundaries remain open.
- A separate current-build pasted-image task drives attachment ready, Remove,
  focus restoration, re-add, submit, sent-media ownership, exact completion,
  and empty-Composer restoration. The public `ComposerAttachment`,
  `MessageAttachment`, five-event trace, 81-frame Browser/CDP matrix, real
  Electron flow, and two ownership-masked comparisons pass at 0.39% and 0.79%
  under independent 1.5% limits. Native file-panel selection, non-image and
  multi-attachment states, upload/error, overflow, and plugin variants remain
  open.
- Three current-build subagent tasks now separate the single-success contract
  from collaboration. The original task covers one agent, summary, panel,
  transcript, and 820/720 reopen. A sibling Alpha/Beta task and a nested
  Parent/Child task cover two-working, mixed active/done, two-done, live
  progress preview, and independent transcripts. The nested reducer preserves
  public `/root/parent/child` identity while the visual panel stays flat, as
  observed, while the main conversation keeps Child and Parent activity as
  separate hierarchy-ordered blocks. The unchanged `26.803.41515` package
  additionally confirms all seven public collaboration thread states plus the
  current Active/Done classifier and 4/10 list limits. A twelve-agent public
  replay now covers pending initialization, updated progress, errored,
  interrupted, shutdown, and unavailable results, both pagination limits, and
  failed-agent transcript access. Browser/CDP covers 156 frames, Electron
  drives both mixed lists, and nine collaboration scenes gate ten current-build
  regions: panel/summary/transcript crops pass between 1.33% and 4.67%, while
  the compact main-activity crop passes at 11.50% under its independent 12.5%
  limit; three additional internal recovery baselines pass their regional
  regression gate. Real-product reachability for recovery transitions and
  transport recovery remain open.
- npm publication remains out of scope until the agreed P0/P1 coverage and
  release acceptance surfaces are complete.
- Pixel ratios are regression evidence for their explicitly owned regions,
  not a global pixel-parity claim. The machine-checked
  [`visual-assets.json`](visual-assets.json) denominator keeps global parity
  ineligible while any visible element still uses an inferred or approximate
  source.

## Completion gate

A surface can be described as verified only when all applicable evidence
exists:

1. The current installed build and package fingerprint are recorded.
2. The surface is reached in the running application through an allowed
   observation method.
3. Its ownership, trigger, lifecycle, composition, states, and responsive
   behavior are recorded.
4. A protocol-neutral implementation exists with behavioral and accessibility
   tests.
5. The H5 acceptance flow matches the observation.
6. The Electron acceptance flow matches the observation.
7. Related surfaces and cross-layer transitions have been checked together.

Passing `pnpm check` means the implemented repository contracts are healthy.
It does not expand the observed product denominator and must not be reported as
product-level parity.

## Visual optimization

H5 and Electron are used continuously as functional acceptance surfaces. The
thread suite has scenario-driven, main-only completed, streaming,
expanded-command, pending-approval, file-review, web-search, Browser,
unavailable-MCP, failed-command, message-navigation, scroll-away,
post-interruption, and context-compaction raster fixtures with independent
selectors, ownership masks, horizontally scoped left/right regions, and
regional PNG diff thresholds. The references remain build-scoped external
evidence rather than redistributed application assets. The 526×600 compact
Browser scenes lock the sampled follow and scroll-away positions; they are not
represented as native window resizes.

The protocol-backed Electron playground adds a separate completed-Markdown
frame. Its optional 906×820 `26.721.41059` comparison gates the assistant,
fenced-code, and Composer regions at the strict 0.05 pixel threshold, while
CDP separately locks semantic counts and computed geometry.

The `26.825.51511` rich-stream refresh supersedes that old product composition
for the sampled mutation lifecycle. Its sanitized ten-event replay covers
link, empty fence, code/table, 20-heading, 37-heading, and completed states.
Browser/CDP validates semantics, exact styles and geometry, reverse-origin
follow, and zero overflow. Electron repeats code copy, table focus, real
scroll-away/return, native bounds, and Stop-to-actions settlement. Five
reviewed internal baselines pass; optional local-only fence, table, long, and
completed regions differ by 2.4398%, 4.7698%, 2.7219%, and 1.7196% under 8%.

The unchanged `26.803.41515` fingerprint adds source-structural evidence for
inline-Markdown in-progress ownership, the latest-turn follow state machine,
and dedicated Table container/scroller plus Copy/Expand/Preview controls. A
The current replay now uses the exact sanitized 36-section stream and six
checkpoints; the older twelve-section synthetic mutation remains historical
regression evidence rather than the current product anchor.
An isolated 18-column runtime follow-up then reaches Copy, Expand, and Table
preview on the same build. `AgentMarkdown` copies exact raw Markdown plus HTML,
and `allowWideTables` opts into the measured 1665.86px table, hover/focus rail,
and viewport preview. Browser/CDP now covers 156 frames; Electron repeats copy,
horizontal wheel, open/close, focus restoration, and 720×680 action
reachability; three reviewed internal baselines pass. A local-only 1180×820 reference gates the owned preview and
close regions at 3.9737% and 0.5929% under 4% and 1% ceilings. Citations,
live media emission, table error variants, and plugin-specific Markdown remain
open. Plain-text streaming product reachability is now current on
`26.803.61601`: one live 1180→720 resize proves reverse-origin follow,
negative compact clipping, the exact Stop vector, and natural Send recovery in
Browser/CDP with external wide/compact regional pixels. Rich Markdown mutation
streaming is now independently current on `26.825.51511`.

The `26.727.40816` MCP recovery adds four further frames for failure, retry,
completion, and a mixed follow-up turn. Its optional 906×820 comparison gates
the full main, recovered tool group, user prompt, and Composer independently
at the same strict threshold. CDP locks call order, labels, expansion, error
semantics, and group recovery; Electron locks the mixed Review composition.

The `26.803.41515` MCP refresh supersedes those two primary runtime anchors.
The successful group now contains Search → Search → Fetch and completes in 35
seconds; recovery keeps invalid-URL Fetch → Search → Fetch inside the same
group and completes in 16 seconds. Public `ToolCallCard` rows can now use the
current transparent content-width labelled disclosure while retaining the
legacy `details` mode. Browser/CDP and Electron cover five lifecycle states plus a
native compact variant, including the 736×67.3125px failure output and zero
overflow at 720×680. Six reviewed internal baselines pass. Optional local-only
product comparisons gate the success group at 1.6440% under 2% and the compact
failure card at 1.1017% under 1.2%; external screenshots remain uncommitted.

The `26.810.52044` MCP refresh supersedes the primary success/recovery anchors
again. The accepted success now uses one Search → Fetch pair, completes in 25
seconds, and returns the canonical `https://developers.openai.com/codex/mcp`
URL. The accepted 18-second recovery keeps invalid-URL Fetch → Search → Fetch
inside one integration group. A real `Reconnecting 2/5` row also recovered in
place and completed the same turn. The exact MCP, disclosure, and reconnect
SVG paths are promoted into the current asset contract. Browser/CDP and
Electron cover the current call orders, labelled content-width disclosures,
expanded neutral failure output, transport retry/recovery, and native compact
resize. Nine reviewed internal frames pass. Optional local-only comparisons
gate the 736×80 success region at 1.9565% under 2% and the complete 688×67
compact failure card at 1.20184% under 1.21%; product screenshots remain
uncommitted.

The `26.825.51511` MCP refresh now supersedes the sampled primary MCP and
Sources anchors. One real same-thread task completes Search → Fetch in 20
seconds, then invalid-URL Fetch → Search → valid Fetch in 10 seconds.
Completed and failed calls are flat noninteractive rows with no legacy error
card or disclosure. Browser/CDP and Electron cover both expanded groups,
native compact geometry, and the current 300×313 Environment + Sources summary
close/repin lifecycle. Four reviewed internal frames pass. Local-only product
ratios are 2.6742% success, 4.8070% recovery, 3.8995% compact recovery, and
2.9276% pinned summary under independent 2.8%, 5%, 4.1%, and 3.1% limits.
Product screenshots remain uncommitted, and unobserved integration variants
remain partial.

A separate `26.803.41515` unavailable/fallback task now promotes
`thread.tool-unavailable-recovery`. Its GitHub-MCP-only turn emits no false MCP
row and completes with the exact unavailable response; the next same-thread
turn uses OpenAI Developer Docs Search → Fetch and completes in 34 seconds.
Browser/CDP covers four states and exact compact geometry, while Electron opens
both timelines and the recovered group before a native 720×680 resize. Four
reviewed baselines pass, and the local-only 688×71 group comparison differs by
0.6449% under 1.3%. This is same-thread fallback evidence, not proof of a
same-transport disconnect/reconnect.

The independent `current-mixed-tool-thread` replay then composes the already
separately evidenced current contracts in one public state model: Web Search,
Browser open/find, OpenAI Developer Docs Search → Fetch, a completed command,
pending-to-approved command approval, an applied file change with Review, and
one delegated audit. Eight lifecycle checkpoints plus a 720×680 final scene
bring the shared Browser/CDP and reviewed-pixel matrix to 156 frames; Electron
opens the search, Browser, MCP, Review, and subagent transcript surfaces before
performing a native compact resize. The nine rasters are internal regression
baselines. This closes the independent mixed-composition gap without claiming
that one current-product task runtime-reached the entire sequence or promoting
the inventory evidence denominator.

The `26.727.40816` Pull request slice adds nine lifecycle frames beyond the
previous 49-frame matrix. Its independent gates cover index/detail loading and
failure, running checks, review submission, comment failure, merge readiness,
and 720×680 compact composition. The current-product comparison remains
ownership-scoped and read-only.

The `26.727.40816` long-thread comparison uses an external 906×820 main crop,
keeps all real and synthetic transcript content outside the pixel denominator,
and gates only the compact navigation rail and floating return control under a
1% hard limit. CDP separately checks 82 navigation entries, seven mounted
turns, reverse scroll origin, and the return-to-latest transition.

The `26.727.40816` approval comparison uses separate pending and denied
906×820 references. Ownership masks exclude task/header text, localized or
synthetic response glyphs, and the non-owning scrollbar while preserving the
approval/Composer silhouettes, activity and command structure, approval
actions, response actions, and spacing. Both gates use a 1.5% hard limit;
CDP and Electron independently verify decision semantics and focus.

The current `26.730.61309` long-command comparison uses one full 1180×820
reference.
Its ownership mask excludes the sidebar, task/header text, final-answer
glyphs, Composer internals, and non-owning scrollbars while retaining the
command-card boundary, disclosure structure, Shell/output geometry, and
surrounding spacing under a 1.5% hard limit. CDP separately verifies all
unmasked semantics plus the masked command and status typography.

The current command-failure comparison uses a separate full 1180×820
reference from the same build. It masks the private sidebar, current task
title, dynamic response text/actions, Composer internals, and non-owning
scrollbar while preserving the timeline, failed command disclosure, Shell
card, reverse-tail viewport, and exit footer. The hard threshold is 1%; CDP
and Electron independently lock every masked semantic and interaction.

The current image-attachment comparison uses separate 906×820 ready and
completed references. Its masks exclude the private sidebar, header/task
labels, dynamic transcript glyphs, Composer text, and non-owning scrollbar
while retaining the draft/sent attachment geometry, user-message silhouette,
Composer boundary, actions, and spacing. The comparisons measure 0.39% and
0.79% under independent 1.5% hard limits; CDP and Electron separately drive
the ownership and full Remove → Add → Submit → completion lifecycle.

The current `26.730.61639` Terminal comparison uses a clean 906×820 main-only
reference. It reports the full main as a diagnostic, then gates only the
shared 272px bottom panel and 239px xterm content ownership regions. Those
regions differ by 1.5120% and 0.4004%, below independent 2% and 1% hard
limits. CDP and Electron separately lock the text, accessible names, focus,
session/mismatch lifecycle, and compact geometry that pixels cannot establish.

The `26.803.61601` command-exit, crash-reload, background-summary, and
background-side-panel frames are reviewed internal regression baselines rather
than product screenshots. Product runtime establishes direct `exit 7`, ordinary
shell close, and live background-process opening; package structure establishes
the crash Reload copy. CDP computed geometry and Electron interaction remain
the semantic gates, so an internal zero-diff baseline is never presented as a
current-product pixel ratio.

Broader final visual optimization remains scheduled after the remaining
inventory, page compositions, and state transitions stabilize. A passing
thread scenario must not be generalized to unobserved routes or states.
