# Codex App playground

This workspace is an integration demo for validating:

- [`codex-ui-kit`](https://github.com/JaminZhou/codex-ui-kit)
- [`@jaminzhou/codex-app-server-client`](https://github.com/JaminZhou/codex-app-server-client)

It recreates public Codex client workflows from public protocol
contracts and independently observed behavior. It does not ship code or assets
extracted from the Codex desktop application.

The React-only UI Kit remains the root package. Electron and App Server
dependencies are isolated in this private workspace and are never published
with `codex-ui-kit`.

## First vertical slice

The first slice covers:

- streamed assistant text;
- transient error and automatic retry;
- Stop to interruption summary;
- context compaction from running to completed;
- replay and local stdio App Server modes;
- protocol, CDP, Electron-host, and pixel regression gates.

## Second vertical slice

The second slice follows a coding workflow end to end:

- running and completed command execution;
- a schema-validated command approval request and response;
- streaming and applied file changes;
- the host-owned Review side panel and file diff;
- live approval IPC between the sandboxed renderer and Electron main process.

The renderer is protocol-neutral. App Server notifications and server requests
are reduced into a small UI state contract before they reach `codex-ui-kit`.
The Electron main process owns `CodexAppServerClient`; the sandboxed renderer
receives sanitized events and returns explicit approval decisions through
preload IPC.

## Third vertical slice

The third slice extends the file workflow to the current multi-file shape:

- one aggregate `Edited 2 files` card per protocol file-change item;
- independent file rows with group-level Undo and Review;
- every file diff stacked in the same Review panel;
- file-specific focus without dropping sibling diffs;
- wide and real 800×600 Electron split geometry;
- an optional external current-build main-only pixel comparison.

## Fourth vertical slice

The fourth slice makes the shell and Review workspace resilient under load:

- a 16px navigation separator measured from the current desktop build;
- pointer resizing plus accessible Arrow/Home/End keyboard control;
- 240–520px navigation clamps, exercised through CDP and a real
  `BrowserWindow`;
- an eight-file, 96-line protocol trace whose Review panel overflows
  internally;
- exact last-file reveal in CDP and Electron without horizontal overflow;
- a thirteenth reviewed pixel-regression frame for the large Review state.

That observation establishes application-navigation resizing. Review-panel
resizing is covered by the next current-build slice.

## Fifth vertical slice

The fifth slice established the previous-build public Pull request detail and
the first resizable workspace contract:

- a 16px Review/PR separator with a measured 320px panel minimum and 352px
  retained main track;
- pointer plus Arrow/Home/End resizing and focus restoration;
- a 352/554px PR index/detail split at 1180×820;
- Summary, Timeline, and Code tabs with public PR summary and file-review
  components;
- full-main expansion and exact panel-width restoration;
- a fourteenth reviewed pixel frame plus an optional external current-build
  index/detail comparison.

Its 352/554px split remains a regression fixture for `26.721.41059`; the
current-build overlay and complete deterministic lifecycle are described in
the sixteenth slice below.

## Sixth vertical slice

The sixth slice added the original background Terminal workflow:

- a schema-validated command `processId`, output stream, and
  `item/commandExecution/terminalInteraction`;
- protocol-neutral `TerminalTranscript`, `TerminalPrompt`, and
  `TerminalSession` composition;
- a 272px bottom panel, 16px pointer/keyboard separator, 152px minimum, and
  responsive half-height maximum;
- close/reopen, host-owned input submission, and real 820×680 compact
  Electron geometry;
- a fifteenth reviewed pixel frame plus an optional build-scoped Terminal
  panel/content comparison.

## Seventh vertical slice

The seventh slice adds current-build completed Markdown:

- a public-protocol replay for heading, paragraph, external link, inline code,
  quote, list, table, and fenced TypeScript;
- exact CDP semantic counts, computed styles, 736×357 assistant geometry,
  table alignment, and measured thread/Composer scroll clearance;
- Electron code-copy interaction, external-link semantics, four persistent
  response actions, and multiline Composer geometry;
- a sixteenth reviewed pixel frame plus optional current-build assistant,
  code-card, and Composer region comparisons.

## Eighth vertical slice

The eighth slice adds a real successful public MCP workflow:

- a read-only `openaiDeveloperDocs` run observed in the current Codex build;
- schema-validated `mcpToolCall` start, progress, result, and completion items;
- `McpToolCallGroup` composition for one integration and five Search/Fetch
  calls;
- completed-answer link semantics and structured-result disclosure;
- CDP computed-style and scroll-state gates plus real Electron expansion
  interactions;
- seventeenth and eighteenth reviewed frames for running and completed MCP;
- an optional 906×820 current-build comparison for full-main, tool-call,
  answer, and Composer regions.

## Ninth vertical slice

The ninth slice completes the application-sidebar contract and is refreshed
against Codex Desktop `26.730.61309`:

- the 274px shell, 46px titlebar-safe inset, 70px header, 30px rows, fixed
  46px footer, and 54px scroll clearance;
- primary routes, collapsible Pinned/Projects/Recents sections, long names,
  five reusable expandable project groups, dense history, status indicators,
  keyboard-accessible row actions, account, and settings composition;
- normal responsive behavior with an 820×680 split, a default-hidden 720px
  sidebar, no edge-hover preview, and explicit pinning into the regular column
  across route navigation;
- an explicit wide capture mode so pixel fixtures do not override normal
  responsive behavior;
- the refreshed composition is used by normal interaction and its dedicated
  `current-sidebar` capture, while historical lifecycle captures keep their
  prior sidebar fixture so one owned sidebar change cannot invalidate unrelated
  main-region baselines;
- Browser and Electron interaction gates plus an optional current-build
  regional sidebar comparison across top, masked selected-row, and masked
  footer regions.

## Tenth vertical slice

The tenth slice adds current-build MCP failure recovery and a mixed second
turn:

- a refreshed real OpenAI Developer Docs invalid-URL failure followed by three
  Search calls and a valid Fetch in Codex Desktop `26.727.40816`;
- a standalone failed Fetch whose neutral `plaintext / Invalid URL` output
  remains expandable before the later recovered integration group;
- a schema-validated two-turn replay that continues through two commands, one
  accepted approval, one file change, and Review;
- CDP computed-style and geometry gates plus a real Electron disclosure and
  mixed-thread interaction flow;
- four additional reviewed frames for failed, retrying, recovered, and mixed
  Review states;
- an optional masked 906×820 current-build comparison for full-main, recovery,
  upper activity/failure, and Composer regions while leaving the final answer
  unmasked.

## Eleventh vertical slice

The eleventh slice completes the first application-shell continuity contract:

- a current-build 46px window chrome with 28px Sidebar, Back, and Forward
  controls at x=88/120/152;
- protocol-neutral ready, loading, empty, error, offline, reconnecting, and
  stale route-outlet states;
- responsive side-surface auto-collapse and restoration that does not reopen a
  surface the user closed manually;
- exact 961/960 and 721/720 boundary gates, current-build auto-collapse versus
  explicit pinning without an edge-hover preview, and structural
  1920×1080/2560×1440 checks;
- a body-portalled global notification region;
- Browser CDP coverage across the shared lifecycle matrix and real Electron
  offline → retry → ready plus 1180×820 → 720×680 → 1180×820 acceptance;
- four deterministic pixel frames and an optional 120×46 current-build
  window-chrome comparison.

## Twelfth vertical slice

The twelfth slice adds current-build conversation and Composer lifecycle:

- a real `26.721.81911` empty/focused/multiline Composer, submit/Stop,
  completion, interruption, queue, pause, Resume, permissions, and Add files
  menu observation;
- public `ComposerDock`, context controls, host-owned queue submission while
  Stop remains primary, and an exposed timeline viewport ref;
- an 11-turn, 46-event protocol replay with message navigation,
  return-to-latest, and a deterministic windowed-history placeholder;
- ten reviewed lifecycle frames, shared 36-frame CDP acceptance, and a real
  Electron submit → queue → Stop → Resume flow;
- optional external 792×320 queued and paused Composer pixel comparisons.

## Thirteenth vertical slice

The thirteenth slice starts the coding-workspace lifecycle from the current
new-chat entry:

- the `26.721.81911` 768px start column, 736×98 Composer, and 736×28
  project/environment/worktree context row;
- a 260×250 project dialog with a 252×143 listbox, searchable synthetic
  projects, selected-row icons/check, and focus return;
- `Start in` and searchable branch menus plus a 600×600 grouped local
  environment dialog whose repairing checkout remains inspectable but cannot
  be selected;
- one real Electron route from project and worktree selection through command,
  approval, two-file Review, Terminal, and Pull request navigation;
- six reviewed workspace frames and optional current-build main/listbox pixel
  comparisons.

## Fourteenth vertical slice

The fourteenth slice broadens Review content and synchronization:

- current-build delete-card, Undo/Review, side-panel, and deletion-diff
  evidence plus the observed rename-as-zero-line-items boundary;
- an explicit `FileReviewContent` contract for text diff, binary, and conflict
  presentation while retaining the public protocol `move_path` semantic;
- a schema-validated four-file trace covering rename, delete, binary patch
  text, and host-derived conflict markers;
- Review-header selection, exact row reopen, sibling preservation, and
  group-Undo lifecycle in a real Electron window;
- a forty-third CDP/pixel frame with ordered change/content-kind gates.

## Fifteenth vertical slice

The fifteenth slice expanded Terminal from one background session into the
`26.721.81911` session-tab contract and an independent process lifecycle:

- `26.721.81911` CDP evidence for three auto-numbered tabs, per-tab close
  buttons, nearest-tab selection, the Review/Terminal/Browser/Files picker,
  `Terminal input`, and three-tab compact fit at 820×680;
- public `TerminalPanel` and `TerminalProcessList` compositions that leave
  process execution, creation, restore policy, and input handling with the
  host;
- a 15-event protocol trace with running, failed, exited, three-tab, picker,
  legacy close-all/restore, and compact states;
- real Electron pointer and keyboard tab selection, independent per-session
  values, close-nearest, picker creation, legacy close-all/restore, and failed-process
  reopening;
- six additional reviewed visual frames and a shared 49-frame CDP/pixel
  matrix.

That current-product probe did not execute a shell process. Running, failed,
exited, and restore states are deterministic public-host acceptance rather
than promoted current-product lifecycle evidence. The later
`26.727.40816` read-only probe found a project-named tab instead of the
auto-numbered presentation. The independent single-session model already
uses the project name plus close/add controls and now passes the current
Terminal regional gate at 1.79% panel and 0.73% content difference, so the
session shell was verified for that build. The newer current lifecycle is
recorded in the thirty-second slice below.

## Sixteenth vertical slice

The sixteenth slice refreshes Pull request behavior against
`26.727.40816` and expands it into a deterministic host-owned lifecycle:

- read-only current-product evidence for Summary/Code tabs, Timeline integrated
  into Summary, successful multi-file Code content, display options,
  Auto-merge, non-modal overlay geometry, and responsive
  1180/960/820/720px auto-hide/reopen behavior;
- public `PullRequestQueryState`, `PullRequestMergeReadiness`,
  `PullRequestReviewComposer`, and `PullRequestCommentComposer` contracts;
- index/detail loading and failure/retry, running/failed/passed checks, comment
  failure/recovery, review submission, merge blocked/ready/merging/merged, and
  compact states;
- real Electron review/comment/merge interaction against deterministic local
  state, without GitHub side effects;
- nine additional reviewed visual frames and a shared 61-frame CDP/pixel
  matrix;
- a current 906×820 regional comparison passing at 5.75% full-main, 4.68%
  index, and 6.44% detail difference without relaxing the existing thresholds.

The current-product probe did not submit a real comment, review, or merge.
Its Review options menu contains word-wrap, rich-preview, and word-diff
display settings rather than review submission. Mutating states therefore
remain independent acceptance rather than promoted runtime evidence.

## Seventeenth vertical slice

The seventeenth slice refreshes the successful MCP/tool-call path against
`26.727.40816`:

- a real disposable OpenAI Developer Docs Search → Fetch turn with no shell,
  browser, or file action;
- a two-call schema-validated replay with the current 31-second disclosure,
  intermediate assistant explanation, integrated group, and linked Markdown
  answer;
- CDP gates for ordered labels, expanded state, 14/21px typography, system
  font, 445 weight, and 0.6 secondary color;
- a current 906×820 comparison passing at 2.03% masked full-main, 0.05%
  masked tool structure, 1.87% answer, and 1.92% Composer difference without
  relaxing the existing thresholds.

The pixel masks exclude dynamic header/task/intermediate/group-label glyphs
and the non-owning scrollbar only; the answer remains unmasked. CDP separately
verifies the masked regions' surrounding geometry and computed typography.
Failure/retry is refreshed in the next slice.

## Eighteenth vertical slice

The eighteenth slice refreshes MCP failure/recovery against `26.727.40816`:

- a real invalid-URL Fetch failure followed by three Search calls and one
  successful Fetch, with no shell, browser-navigation, or file action;
- the current standalone failed row and neutral 736×67.3125px
  `plaintext / Invalid URL` output before the recovered integration group;
- Browser and Electron contracts for ordering, disclosure ownership,
  accessibility, typography, and failed-card geometry;
- a current regional gate passing at 1.63% full-main, 2.90% recovery, 1.08%
  upper activity/failure, and 1.91% Composer difference.

## Nineteenth vertical slice

The nineteenth slice refreshes the Composer queue and Stop lifecycle against
`26.727.40816`:

- a real 710×39px queued tray with a 684×28px row, 14/16px typography, and
  Steer/Delete queued message/queued message actions;
- the current 28×28 Stop transition to `You stopped after 2s`;
- automatic promotion and execution of the queued follow-up, replacing the
  previous paused header and Resume behavior;
- deterministic Browser/CDP and real Electron acceptance for that default
  state machine, while the former paused/Resume frame remains available as
  explicit legacy compatibility;
- two current 792×320 regional gates passing at 0.35% queued and 0.51%
  automatic-continuation difference under a 2% hard limit.

## Twentieth vertical slice

The twentieth slice refreshes current multiline, permission, and Add-resource
Composer behavior against `26.727.40816`:

- exact 736×134 four-line and 736×259 long-input Composer geometry, including
  the 712×80 draft area and 205px `25dvh` clamp;
- a public `ComposerPermissionMenu` for the current Ask/Approve/Full/Custom
  choices and a public, data-driven `ComposerResourcePicker` for the new
  736×320 inline Add surface;
- 61-frame CDP coverage plus real Electron selection, Escape/focus, scrolling,
  and keyboard acceptance;
- strict ownership-masked current regional gates passing at 0.10% multiline,
  0.13% permissions, and 0.34% resources difference.

## Twenty-first vertical slice

The twenty-first slice refreshes active Goal and Plan Composer modes against
`26.727.40816`:

- an unsubmitted new-chat draft records each mode's accessible prompt,
  736×98 Composer, 712×44 input, and 28px clearable footer control;
- the public `ComposerModeIndicator` uses independently drawn SVG geometry and
  current pill sizing;
- shared CDP/pixel coverage increases to 63 frames, while Electron selects and
  clears both modes through the Add-resource path and verifies focus recovery;
- strict ownership-masked current regional gates pass at 0.38% for Goal and
  0.35% for Plan under a 0.5% hard limit.

That probe could not automate the native macOS file panel, so it did not add
an attachment. The later thirtieth slice independently verifies the current
Renderer paste path; native file-panel behavior remains a separate gate.

## Twenty-second vertical slice

The twenty-second slice refreshes long-conversation navigation against
`26.727.40816`:

- a read-only current thread establishes an 82-message compact navigation
  rail, a seven-turn mounted window, reverse-origin scrolling, and a floating
  return-to-latest control;
- public viewport and navigation contracts expose reverse latest-origin,
  compact 36×10px navigation rows, active 26×2px markers, and initial
  end-positioning without owning host virtualization;
- synthetic Browser/CDP and Electron acceptance jumps to message 20, keeps
  seven turns mounted, then returns to message 82 at scroll origin zero;
- the current 906×820 regional gate compares only the navigation rail and
  floating return control, excluding all real and synthetic conversation
  content.

## Twenty-third vertical slice

The twenty-third slice refreshes successful long command output against
`26.730.61309`:

- one real `seq 1 400` command, auto-run by the current low-risk Ask policy
  without an approval card;
- a public schema-validated trace with exactly one command pair and all 400
  output lines;
- the current collapsed `Ran seq 1 400` disclosure and expanded 736×227px
  `Shell` card, two copy controls, 144px reverse-tail output viewport, and
  Success state;
- 66-frame Browser/CDP coverage plus real Electron disclosure,
  collapse/reopen, 401-split-line, and latest-line restoration checks;
- a full 1180×820 ownership-masked current comparison passing at 0.17% under
  the 1.5% hard limit.

## Twenty-fourth vertical slice

The twenty-fourth slice adds current command failure and same-thread recovery
against `26.730.61309`:

- one real read-only shell loop emits 80 stdout and 80 stderr records before
  exiting with code 7, followed by one successful no-tool turn in the same
  disposable task;
- a schema-validated public replay separates live output, collapsed failure,
  expanded failure, and recovered follow-up frames;
- Browser/CDP locks 161 split lines, the 736×246.58px failed `Shell` card,
  734×144px reverse-tail viewport, 3136px scroll height, two copy controls,
  keyboard disclosure, and `Exit code 7`;
- Electron verifies exact copied output, failure state, same-thread recovery,
  collapse/reopen, and tail restoration;
- the 70-frame matrix includes three new reviewed baselines, and a full
  1180×820 ownership-masked current comparison passes at 0.89% under a 1%
  hard limit.

## Twenty-fifth vertical slice

The twenty-fifth slice refreshes command interruption and same-thread recovery
against `26.730.61309`:

- one real read-only 120-second command is stopped after 95 seconds through
  the current 28×28 Stop action;
- a schema-validated public replay separates the expanded running command,
  immediate `Background terminal stopped with …` row, later `Ran …`
  settlement, and exact recovered follow-up;
- Browser/CDP clicks Stop, waits for background settlement, sends the recovery
  prompt, and verifies the retained `You stopped after 1m 35s` summary plus
  Composer focus restoration;
- Electron repeats the same transition in a real 1180×820 `BrowserWindow`;
- the 75-frame matrix includes four reviewed baselines, and the
  ownership-masked immediate-stop full-window comparison passes at 0.44%
  under a 0.5% hard limit.

## Twenty-sixth vertical slice

The twenty-sixth slice refreshes manual context compaction and same-thread
recovery against `26.730.61309`:

- a disposable task establishes an exact no-tool baseline, then opens the
  `/compact` row reporting 9% context usage;
- the public replay separates command-menu, `Compacting context`, `Context
  compacted`, and exact recovered-follow-up frames;
- Browser/CDP clicks the slash command, checks the `Working` separator and
  28×28 Stop action, waits for completion, submits the recovery prompt, and
  verifies the restored empty Composer focus; it also gates Enter/Send command
  submission, refuses recovery before completion, scopes manual labels to the
  replay, and provides a replay-local Stop reset without claiming the
  unobserved native cancellation result;
- Electron repeats the same lifecycle in a real 1180×820 `BrowserWindow`;
- the 75-frame matrix replaces two legacy static compaction frames with four
  current reviewed baselines, and the ownership-masked running comparison
  passes at 0.16% under a 0.5% hard limit.

## Twenty-seventh vertical slice

The twenty-seventh slice reaches the current thread summary overlay on
`26.730.61309`:

- one no-tool disposable task exposes the 28×28 header toggle and the
  thread-owned Environment/Git workflow surface;
- the public component family adds controlled or uncontrolled popover,
  section, item, delta, and icon-button primitives without importing private
  state or mutations;
- Browser/CDP and Electron verify Escape focus return, section collapse,
  outside dismissal, the 300×199 surface, five 272×29 rows, 25px radius, and
  14/21px weight-445 system typography;
- the 76-frame reviewed matrix adds the summary overlay, and its ownership-
  scoped component comparison differs by 2.86% under a 3% hard limit.

## Twenty-eighth vertical slice

The twenty-eighth slice reaches a successful current command approval on
`26.730.61309`:

- one disposable task requests only `open -a Calculator`, confirms the app is
  absent before approval, activates `Allow once`, and closes Calculator after
  the exact `ALLOW ONCE COMPLETE.` response;
- a dedicated schema-validated accept trace records pending approval,
  resolution, successful command completion, and final turn completion;
- Browser/CDP and Electron drive the transition and verify the approval card
  disappears, the command completes once, the empty Composer regains focus,
  and the permission remains `Ask for approval`;
- two reviewed frames raise the matrix to 78, while ownership-masked pending
  and completed comparisons measure 1.26% and 0.30% under 1.5% limits.

## Twenty-ninth vertical slice

The twenty-ninth slice reaches the current matching-command approval rule on
`26.730.61309`:

- the real split menu exposes `Allow once` and `Allow similar commands` with
  rule information in a 194×68px surface;
- selecting the matching rule completes the first `open -a Calculator`, then
  an identical second command completes without another approval card while
  the global Composer policy remains `Ask for approval`;
- a schema-validated two-turn trace records the
  `acceptWithExecpolicyAmendment` decision and deliberately contains only one
  approval request for two completed commands;
- Browser/CDP and Electron drive the complete menu → first completion →
  repeated completion flow, including exact 1m 41s/7s activity labels, final
  responses, focus restoration, and command counts;
- two reviewed frames raise the matrix to 80, while ownership-masked menu and
  repeated-completion comparisons measure 1.21% and 1.37% under independent
  1.5% limits.

## Thirtieth vertical slice

The thirtieth slice reaches the current pasted-image lifecycle on
`26.730.61309`:

- one separate new chat receives a synthetic PNG through the real Renderer
  paste path, then verifies removal, focus restoration, re-attachment,
  submission, and the exact `ATTACHMENT LIFECYCLE COMPLETE.` response;
- public `ComposerAttachment` and `MessageAttachment` ownership keeps the
  removable draft card in the Composer and the sent media outside the editable
  user bubble;
- a five-event schema-validated trace raises the suite to 20 fixtures and 246
  events;
- Browser/CDP locks the observed coordinates, 80×80 attachment geometry,
  radii, ownership, focus, permission, and full interaction; Electron repeats
  the lifecycle in a real 1180×820 `BrowserWindow`;
- the reviewed matrix totals 81 frames, while ownership-masked ready and
  completed comparisons measure 0.39% and 0.79% under independent 1.5%
  limits.

## Thirty-first vertical slice

The thirty-first slice refreshes Review rename/delete evidence on
`26.730.61309`:

- a real ignored-file delete still produces one `Edited …` card and one
  deletion diff in the 370px `Last Turn` side region;
- a real rename is now displayed as separate source and destination files,
  with `__CODEX_TEMP_RENAME_MARKER__` added to the source diff and removed from
  the destination diff; the public `move_path` arrow remains an independent
  App Server semantic rather than a claim about current-product rendering;
- a new eight-event deterministic replay raises the suite to 21 fixtures and
  254 events, while Browser/CDP reaches 86 reviewed frames;
- Browser/CDP and Electron select the destination, close and reopen it without
  dropping the source diff, then apply group Undo and verify that both the card
  and Review panel close;
- the exact 906×820 current-build reference passes at 6.21% for the full main
  region, 5.23% for the conversation region, and 7.62% for the Review region,
  below independent 6.5%, 5.5%, and 8% limits.

## Thirty-second vertical slice

The thirty-second slice refreshes Terminal against `26.730.61639`:

- real CDP evidence locks project-labelled tabs, global visible numbering
  across workspaces, close-nearest selection, label reindexing, the four-item
  picker, and three-tab fit at 820×680;
- a bounded `sleep 3; echo terminal-after-reopen` verifies running/completed
  transcript settlement, independent per-session histories, and panel
  close/reopen persistence while the command is active;
- closing the last tab now collapses the panel, and the top Toggle creates a
  fresh empty current-workspace terminal instead of restoring the last closed
  session;
- `TerminalWorkspaceMismatchNotice` reproduces the current cross-worktree
  warning plus `Dismiss` and `Open new terminal` recovery while preserving the
  older session;
- seven current scenes extend Browser/CDP and pixel coverage to 93 frames;
  Electron repeats the mismatch recovery, session input, picker, close, and
  resizing interactions;
- the exact 906×820 external reference passes at 1.5120% for the shared panel
  and 0.4004% for the xterm content, below independent 2% and 1% limits.

Failed/exited process summaries and reopen actions remain host-owned public
compatibility coverage. A failed direct shell command did not add a native tab
status badge, so this slice does not infer one.

## Thirty-third vertical slice

The thirty-third slice reaches real subagent delegation on
`26.730.61639`:

- one isolated task records a `collabAgentToolCall` from active work through
  the exact successful result and final assistant response;
- the current thread-summary row opens the 369.28px `Subagents` panel, whose
  active/done sections lead into a nested transcript and back navigation;
- explicit reopen matches the observed 319px panel with a retained sidebar at
  820×680 and the 329.31px overlay after sidebar collapse at 720×680;
- the schema-validated replay raises the suite to 22 fixtures and 260 events;
- nine reviewed scenes extend Browser/CDP and pixel coverage to 102 frames,
  while Electron drives summary → panel → transcript → back, responsive
  auto-close, explicit reopen, and an injected Live notification path that
  preserves completed transcript access and derives ticking/settled duration
  labels plus panel-row relative time and machine-readable dates from protocol
  timestamps; the row clock runs only while that Live list is visible;
- Live conversations explicitly select between `Subagents` and `Review`, so a
  completed delegation remains reopenable without hiding later file changes;
- external current-build summary/panel/transcript crops pass at
  4.1812%/1.3451%/1.5969% under independent hard limits.

Waiting, failure, cancellation, pagination, and streaming transcript states
remain separate gates.

## Thirty-fourth vertical slice

The thirty-fourth slice reaches current sibling concurrency and nested
delegation on `26.730.61639`:

- a real Alpha/Beta task passes through two working, one working plus one done,
  and two done, with live progress preview and two independent transcripts;
- a real Parent task delegates Child, preserves `/root/parent/child` through
  public `subAgentActivity.agentPath`, and matches the current flat shared
  panel instead of inventing a visual tree;
- the protocol reducer derives stable public names from paths, groups sibling
  root activity, keeps nested Child and Parent activity blocks independently
  ordered by hierarchy, and retains both levels in summary, panel, and
  transcript navigation;
- the schema-validated suite reaches 24 fixtures and 281 events, Browser/CDP
  reaches 112 lifecycle frames, and Electron drives both mixed-state lists;
- nine current-build scenes exercise ten ownership-scoped comparisons across
  concurrent running/mixed summaries, mixed/completed panels, transcript,
  the nested running/mixed/completed/transcript lifecycle, and the nested
  Child/Parent main activity band. Panel/summary/transcript regions pass from
  1.3329% to 4.6708% under a 5.5% hard limit; the compact text-heavy activity
  band passes at 11.4952% under its independent 12.5% limit.

## Thirty-fifth vertical slice

The thirty-fifth slice makes theme ownership explicit without treating a
forced media query as current-product evidence:

- the theme-complete shell and workspace routes accept `theme=system`,
  `theme=light`, and `theme=dark`; conversation and Pull Request routes keep
  the existing deterministic dark presentation until their custom surfaces
  are converted;
- a non-capture Theme control appears only on those completed routes and
  switches the same state model while preserving sidebar width, Composer
  state, and keyboard focus; its fixed titlebar position is explicitly
  non-draggable so pointer input reaches the native selector;
- current sidebar, window-chrome, context, and Composer SVG geometry is reused
  in light mode, while theme-dependent paint follows the owning control's
  semantic `currentColor` instead of replaying captured dark paint on a light
  surface;
- Project, Environment, and Worktree overlays use the same semantic surface,
  border, field, selection, and text contract instead of retaining captured
  dark paint;
- the shell success indicator uses a contrast-safe light success color, while
  Electron resolves a System launch through `nativeTheme` before choosing the
  native window background;
- the current sidebar is now an independent composition axis, so it can be
  combined with workspace and theme states without falsifying the lifecycle
  frame;
- Browser/CDP and reviewed internal pixels reach 122 frames, and Electron
  drives System → Light → Dark inside one real `BrowserWindow`;
- the light screenshot is an independent regression baseline only. A real
  Codex Light preference capture and ownership-scoped external pixel
  comparison are still required before promoting current-build light-theme
  evidence.

## Thirty-sixth vertical slice

The thirty-sixth slice covers current-build integration unavailability and
same-thread fallback without inventing a successful call for the unavailable
provider:

- a real GitHub-MCP-only turn completes with the exact unavailable response and
  no MCP event/group;
- the next turn stays in the same thread and recovers through OpenAI Developer
  Docs Search → Fetch under one completed integration group;
- a schema-valid replay separates unavailable, recovering, recovered, and
  compact states, preserving the observed 16s/34s durations and exact answer;
- the deterministic protocol set reaches 33 fixtures and 406 events, while the
  Browser/CDP and reviewed-pixel matrix reaches 142 lifecycle frames;
- Browser/CDP locks the missing false call, ordered fallback calls, expanded
  ownership, current typography, 1180×820 and 720×680 geometry, hidden compact
  navigation, and zero horizontal overflow;
- Electron opens both timelines and the recovered group before a native
  720×680 resize, while four reviewed internal baselines cover the lifecycle;
- an optional local-only compact product comparison gates the owned 688×71
  integration group at 0.6449% changed pixels under a 1.3% hard limit.

This proves fallback to another available integration in the same thread. A
true disconnect/reconnect of the same transport remains a separate open gate.

## Thirty-seventh vertical slice

The thirty-seventh slice refreshes the current sidebar project and Help
lifecycle on Codex Desktop `26.803.41515`:

- the sanitized product contract records six project groups, 30px project and
  task rows, 2px/8px child-list padding, 1px separators,
  pointer/Enter/Space expansion, the 721→720 automatic collapse boundary,
  explicit 720px pinning, and zero horizontal overflow;
- the six-item project menu and eight-item Help menu use twelve newly promoted
  exact runtime icons; Help retains its `What's new` heading and one separator;
- Browser/CDP covers project focus, both menus, Escape, and wide → medium →
  collapsed → pinned restoration; real Electron repeats the interactions;
- four reviewed internal frames extend both matrices to 155 lifecycle frames;
- optional local-only product comparisons gate collapsed projects at 1.54%,
  the project menu at 0.13%, the Help menu at 0.30%, and the full 720×680
  pinned sidebar at 3.12%.

Product text, screenshots, raw CDP records, profiles, and private application
resources are not committed.

## Thirty-eighth vertical slice

The thirty-eighth slice refreshes the global shell baseline on Codex Desktop
`26.803.61601`:

- the fail-closed capture pins build `6396`, Chromium `151.0.7922.76`, the
  223451508-byte ASAR, and its SHA-256 before and after sampling;
- the 1180/820/721/720 geometry, automatic collapse, explicit compact pinning,
  six project groups, project/Help menus, route restoration, and 37 visible
  assets are re-observed without promoting unrelated previous-build evidence;
- the new `current-dark-shell` scene composes the selected New chat route,
  current sidebar, window chrome, workspace destination, context bar, and
  Composer in one exact 1180×820 frame;
- Browser/CDP locks dark theme ownership, New chat selection, 274/906/736px
  geometry, exact icon order, disabled Back/Forward `not-allowed` cursors, and
  zero horizontal overflow; Electron renders the same lifecycle frame;
- the local-only current-product comparison passes at 3.1387% for the
  semi-transparent top band, 0.4126% for the account-masked footer, and
  0.3146% for the content-masked main region, extending the shared matrix to
  156 reviewed lifecycle frames.

The top comparison uses a 0.08 pixel color threshold for native transparency
and text-antialias compositing while retaining a separate 4.5% regional hard
limit. Raw product screenshots and records remain local-only.

## Thirty-ninth vertical slice

The thirty-ninth slice reaches ordinary sidebar task status on Codex Desktop
`26.803.61601`:

- one real active task and one background-completed unread task establish the
  20×20 trailing rail, exact 16×16 spinner, centered 8×8 unread dot, and
  computed `rgb(131, 195, 255)` color;
- queuing a follow-up preserves the active spinner, while read-only package
  structure separates pending-worktree loading/error phases from ordinary
  active/waiting/unread state;
- the public status contract retains compatibility aliases but exposes the
  current canonical visual mapping, exact error glyph, and trailing
  status-to-actions replacement;
- Browser/CDP reaches 158 lifecycle frames and Electron repeats the status and
  pointer replacement contract;
- one reviewed internal frame plus local-only active/unread foreground masks
  pass at 5.12% and 1.90%, with exact geometry/color gated separately.

Pending-worktree phases remain previous-build-only until runtime-reached on
this fingerprint. Product screenshots, profiles, and raw application data
remain untracked.

## Current branch creation slice

- Current Codex `26.803.61601` evidence locks the 296×280 branch menu, seven
  branch rows, fixed creation action, and 400×190.56 create-and-checkout modal.
- `BranchCreationDialog` exposes controlled blank, creating, host-error, Close,
  optional Set prefix, Escape, focus trap, and launcher-focus-return behavior.
- The Electron host issues opaque tokens for host-registered project
  directories, enumerates the selected repository's actual local branches,
  validates branch names, rejects duplicates, creates and checks out a real
  branch, and switches branches through guarded main-frame IPC. Fixture-only
  projects remain visible for replay but their Git controls stay disabled
  until the host binds a trusted directory token.
  Host-switched branches keep command routing on the project directory; only
  actual worktree selections derive a `.worktrees/...` execution path.
  Codex web is an external navigation anchor rather than a selectable run
  location, so host branch changes never synthesize a cloud execution path.
  Detached and unborn HEAD states remain branch-creation-capable instead of
  being collapsed into a repository-unavailable error; unborn symbolic names
  are shown as context, not advertised as selectable refs.
  Creating blocks every dismissal path until Git settles. Acceptance routes a
  selected project across two generated disposable Git repositories only,
  retains modal focus while pending, and discards checkout UI results after
  the user changes projects. The new project's branch control stays disabled
  with an explicit pending notice until the original checkout settles; stale
  repository errors are cleared when project ownership changes.
- Three reviewed blank/error/created frames extend Browser/CDP and pixels to
  166 lifecycle frames. The untracked current-product dialog crop passes at
  3.0916% under the 8% external ceiling.

The current-product mutation itself remains a separate runtime gate until the
isolated native project selector can attach the disposable repository. Raw
screenshots and product project names remain local-only.

## Current Settings and Git slice

- Branch → Set prefix now opens the independent full-page `SettingsShell` and
  `GitSettingsPage`; Back restores the app and the branch workflow continues.
- The replay uses all 24 exact current Settings icons, 21 navigation items,
  grouped `git` search results, Branch prefix, Merge/Squash, two switches,
  review delivery, and dirty-gated instruction saves.
- Browser/CDP verifies 169 lifecycle frames including wide and 720px geometry,
  semantics, icons, search, and interactions. Electron repeats the real route,
  saves a harmless fixture, returns, and continues through real
  temporary-repository branch creation.
- Reviewed internal wide/compact baselines pass. Optional local-only product
  gates pass at 2.4214% and 3.0210%; screenshots are never tracked.

## Current environment-entry slice

- Current Codex `26.803.61601` evidence replaces the former Start in model
  with the five-action Work in menu: Local, New worktree, an external Codex
  web anchor, disabled Send to cloud, and Usage remaining.
- New worktree exposes the separate no-environment menu. Environment settings
  routes to the current 768px page with a Local environments unavailable
  status card; the historical 600×600 `LocalEnvironmentDialog` remains an
  independent host capability, not this current route.
- `MenuLinkItem` preserves menu styling and semantics for the external anchor,
  while `EnvironmentSettingsPage` independently exposes ready, loading,
  unavailable, and error states. No fake cloud environment or cloud working
  directory is introduced.
- Browser/CDP locks tags, roles, href, disabled state, exact icons, geometry,
  route and Back restoration. Real Electron repeats the interactions. Three
  reviewed internal scenes and three local-only current-product comparisons
  pass at 3.9193%, 3.0724%, and 0.0708%.

This slice does not create an environment or claim populated environment
editing/repair coverage. Raw product screenshots and capture records remain
local-only.

## Development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check:codex-app
pnpm dev:codex-app:electron
```

`Live local` uses the pinned Codex runtime from
`@jaminzhou/codex-app-server-client`, with read-only sandboxing and explicit
on-request approvals. It opens the repository root by default; set
`CODEX_UI_KIT_WORKSPACE` to an absolute path to inspect another workspace.
Live turns can use the signed-in Codex account and are never required by CI.
Replay mode is deterministic and is the default test path.

The macOS Electron acceptance suite combines CDP geometry and computed styles,
native-window contracts, and reviewed pixel baselines:

```bash
pnpm check:codex-app:acceptance
```

The optional current branch-dialog gate accepts the unmodified 1180×820
current-product screenshot and compares only the 400×191 modal crop:

```bash
CODEX_UI_KIT_WORKSPACE_BRANCH_CREATE_REFERENCE=/absolute/path/to/branch-create.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=workspace-branch-create
```

The current environment-entry gates accept two exact overlay crops and one
857×774 current settings-page capture. They compare only environment-owned
regions and keep every product reference outside the repository:

```bash
CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_REFERENCE=/absolute/path/to/environment-menu.png \
CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_PICKER_REFERENCE=/absolute/path/to/no-environment-menu.png \
CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_SETTINGS_REFERENCE=/absolute/path/to/environments-route.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=workspace-environment-menu,workspace-environment-picker,workspace-environments-unavailable
```

The current Git Settings gates accept unmodified 1180×820 and 720×680
full-page references. Dynamic/private text regions are masked internally while
layout, backgrounds, separators, controls, exact icons, and remaining owned
pixels stay gated:

```bash
CODEX_UI_KIT_GIT_SETTINGS_REFERENCE=/absolute/path/to/git-settings-wide.png \
CODEX_UI_KIT_GIT_SETTINGS_COMPACT_REFERENCE=/absolute/path/to/git-settings-compact.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=workspace-git-settings,workspace-git-settings-compact
```

To run the optional current-build multi-file pixel gate, keep the raw
application reference outside the repository and provide its absolute path:

```bash
CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE=/absolute/path/to/main-only-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current rename gate accepts the exact 906×820 current-build main-region
capture and checks the conversation and Review ownership regions separately:

```bash
CODEX_UI_KIT_CURRENT_REVIEW_REFERENCE=/absolute/path/to/current-review-rename.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual --scenes=current-review-rename
```

The command-failure gate accepts the unmodified full-window current-build
reference and masks non-owning private/dynamic regions internally:

```bash
CODEX_UI_KIT_COMMAND_FAILURE_REFERENCE=/absolute/path/to/command-failure.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The manual context-compaction gate accepts its raw 1180×820 running screenshot
and masks private/non-owning regions internally:

```bash
CODEX_UI_KIT_CONTEXT_COMPACTION_REFERENCE=/absolute/path/to/compacting.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The thread-summary gate accepts the raw 1180×820 current-build screenshot but
compares only the owned 300×199 overlay region:

```bash
CODEX_UI_KIT_CONTEXT_SUMMARY_REFERENCE=/absolute/path/to/context-summary.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual --scenes=context-summary-open
```

The Pull request detail gate uses a separate 906×820 current-build reference:

```bash
CODEX_UI_KIT_PULL_REQUEST_REFERENCE=/absolute/path/to/pr-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The Terminal gate also uses a 906×820 main-only reference. It reports the
whole-main difference but gates only the shared 272px panel and 239px content
regions, because the protocol replay and observed task intentionally have
different conversation text. The current external comparison is scoped to
`terminal-current-single`:

```bash
CODEX_UI_KIT_TERMINAL_REFERENCE=/absolute/path/to/terminal-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual \
  -- --scenes=terminal-current-single
```

The subagent gate accepts raw 1180×820 screenshots and compares only the
owned 300×241 summary, 370×820 panel, and 370×820 transcript crops:

```bash
CODEX_UI_KIT_SUBAGENT_SUMMARY_REFERENCE=/absolute/path/to/subagent-summary.png \
CODEX_UI_KIT_SUBAGENT_PANEL_REFERENCE=/absolute/path/to/subagent-panel.png \
CODEX_UI_KIT_SUBAGENT_TRANSCRIPT_REFERENCE=/absolute/path/to/subagent-transcript.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual \
  -- --scenes=subagent-current-summary-completed,subagent-current-panel-completed,subagent-current-transcript
```

The collaboration extension accepts the raw current-build concurrent and
nested screenshots while comparing only the owned summary, panel, transcript,
and nested main-activity regions:

```bash
CODEX_UI_KIT_SUBAGENT_CONCURRENT_SUMMARY_REFERENCE=/absolute/path/to/concurrent-summary.png \
CODEX_UI_KIT_SUBAGENT_CONCURRENT_MIXED_REFERENCE=/absolute/path/to/concurrent-mixed.png \
CODEX_UI_KIT_SUBAGENT_CONCURRENT_COMPLETED_REFERENCE=/absolute/path/to/concurrent-completed.png \
CODEX_UI_KIT_SUBAGENT_CONCURRENT_TRANSCRIPT_REFERENCE=/absolute/path/to/concurrent-transcript.png \
CODEX_UI_KIT_SUBAGENT_NESTED_RUNNING_REFERENCE=/absolute/path/to/nested-running.png \
CODEX_UI_KIT_SUBAGENT_NESTED_MIXED_REFERENCE=/absolute/path/to/nested-mixed.png \
CODEX_UI_KIT_SUBAGENT_NESTED_COMPLETED_REFERENCE=/absolute/path/to/nested-completed.png \
CODEX_UI_KIT_SUBAGENT_NESTED_TRANSCRIPT_REFERENCE=/absolute/path/to/nested-transcript.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=subagent-concurrent-summary-running,subagent-concurrent-summary-mixed,subagent-concurrent-panel-mixed,subagent-concurrent-panel-completed,subagent-concurrent-transcript-beta,subagent-nested-panel-running,subagent-nested-panel-mixed,subagent-nested-panel-completed,subagent-nested-transcript-child
```

The Markdown gate uses its own 906×820 main-only reference:

```bash
CODEX_UI_KIT_MARKDOWN_REFERENCE=/absolute/path/to/markdown-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The successful MCP gate uses the expanded 906×820 main-only reference:

```bash
CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE=/absolute/path/to/mcp-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The recovered MCP gate uses a separate expanded 906×820 main-only reference:

```bash
CODEX_UI_KIT_MCP_RECOVERY_REFERENCE=/absolute/path/to/mcp-recovery-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current `26.803.41515` MCP gates accept an untracked 905×820 expanded
success main crop, an exact 720×680 compact recovery frame, and an exact
720×680 unavailable/fallback frame:

```bash
CODEX_UI_KIT_CURRENT_MCP_SUCCESS_REFERENCE=/absolute/path/to/current-mcp-success-main.png \
CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_REFERENCE=/absolute/path/to/current-mcp-recovery-compact.png \
CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_REFERENCE=/absolute/path/to/current-integration-recovery-compact.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=mcp-current-success,mcp-current-recovery-compact,mcp-current-integration-recovered-compact
```

The success comparison gates the aligned 736×100 integration group under 2%;
the compact failure comparison gates the visible card region under 1.2%; and
the fallback comparison gates the exact 688×71 integration group under 1.3%.
Product references remain local-only.

The sidebar gate uses a full 1180×820 current-build reference and compares
only application-owned regions:

```bash
CODEX_UI_KIT_SIDEBAR_REFERENCE=/absolute/path/to/sidebar-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current dark-shell gate uses a same-state 1180×820 New chat reference:

```bash
CODEX_UI_KIT_CURRENT_DARK_SHELL_REFERENCE=/absolute/path/to/current-dark-shell.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=current-dark-shell
```

The current sidebar lifecycle gates accept four 1180×820 product frames and
one exact 720×680 compact frame. All references remain untracked and local:

```bash
CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_COLLAPSED_REFERENCE=/absolute/path/to/current-sidebar-project-collapsed.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_MENU_REFERENCE=/absolute/path/to/current-sidebar-project-menu.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_HELP_MENU_REFERENCE=/absolute/path/to/current-sidebar-help-menu.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_REFERENCE=/absolute/path/to/current-sidebar-account-menu.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_COMPACT_PINNED_REFERENCE=/absolute/path/to/current-sidebar-compact-pinned.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=current-sidebar-project-collapsed,current-sidebar-project-menu,current-sidebar-help-menu,current-sidebar-account-menu,current-sidebar-compact-pinned
```

The combined ordinary/worktree task-status gate accepts five exact 259×30
local-only product row captures. Ordinary states compare the final 28px status
rail; worktree states compare the final 56px branch/status region. Each region
is reduced to a foreground mask while CDP independently locks state identity,
geometry, animation, color, and restored presentation:

```bash
CODEX_UI_KIT_CURRENT_SIDEBAR_ACTIVE_STATUS_REFERENCE=/absolute/path/to/current-sidebar-active-row.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_UNREAD_STATUS_REFERENCE=/absolute/path/to/current-sidebar-unread-row.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_LOADING_REFERENCE=/absolute/path/to/current-sidebar-worktree-loading-row.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_ERROR_REFERENCE=/absolute/path/to/current-sidebar-worktree-error-row.png \
CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_RESTORED_REFERENCE=/absolute/path/to/current-sidebar-worktree-restored-row.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual -- \
  --scenes=current-sidebar-status-lifecycle
```

The App shell gate uses only the 120×46 application-owned titlebar crop:

```bash
CODEX_UI_KIT_WINDOW_CHROME_REFERENCE=/absolute/path/to/window-chrome.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current queue gates accept two untracked 792×320 crops captured from the
same 1180×820 current-build Renderer:

```bash
CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE=/absolute/path/to/composer-queued.png \
CODEX_UI_KIT_COMPOSER_CONTINUED_REFERENCE=/absolute/path/to/composer-continued.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

`CODEX_UI_KIT_COMPOSER_PAUSED_REFERENCE` remains available only for the
previous-build paused/Resume compatibility frame.

The current multiline/menu/mode gates accept one 792×320 Composer crop and
four 906×820 main-only crops:

```bash
CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE=/absolute/path/to/composer-multiline.png \
CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE=/absolute/path/to/composer-permissions-main.png \
CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE=/absolute/path/to/composer-resources-main.png \
CODEX_UI_KIT_COMPOSER_GOAL_REFERENCE=/absolute/path/to/composer-goal-main.png \
CODEX_UI_KIT_COMPOSER_PLAN_REFERENCE=/absolute/path/to/composer-plan-main.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current long-thread gate accepts one 906×820 main-only crop and masks all
conversation content:

```bash
CODEX_UI_KIT_LONG_THREAD_REFERENCE=/absolute/path/to/long-thread-main.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current command-approval gates accept 906×820 main-only crops. The
matching-command pair independently locks the open split menu and the repeated
completed state:

```bash
CODEX_UI_KIT_APPROVAL_PENDING_REFERENCE=/absolute/path/to/approval-pending-main.png \
CODEX_UI_KIT_APPROVAL_DENIED_REFERENCE=/absolute/path/to/approval-denied-main.png \
CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_REFERENCE=/absolute/path/to/approval-allow-once-completed-main.png \
CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_REFERENCE=/absolute/path/to/approval-similar-menu-main.png \
CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_REFERENCE=/absolute/path/to/approval-similar-completed-main.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current long-command gate accepts one full 1180×820 screenshot:

```bash
CODEX_UI_KIT_COMMAND_OUTPUT_REFERENCE=/absolute/path/to/command-output.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The current image-attachment gates accept separate 906×820 main-only ready and
completed screenshots:

```bash
CODEX_UI_KIT_ATTACHMENT_READY_REFERENCE=/absolute/path/to/attachment-ready-main.png \
CODEX_UI_KIT_ATTACHMENT_COMPLETED_REFERENCE=/absolute/path/to/attachment-completed-main.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

See [docs/VALIDATION.md](docs/VALIDATION.md) for the evidence model.
