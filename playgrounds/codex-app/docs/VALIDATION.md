# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications, server requests, and
   request responses checked against the pinned generated schemas. The current
   deterministic set contains 33 fixtures and 406 events.
2. **CDP** — DOM identity, computed layout, focus, scrolling, and named-surface
   geometry, including the current 274px sidebar, 46px titlebar inset, 70px
   header, 30px rows, fixed footer, collapsible groups, focusable row actions,
   and 820px split/720px modal transition; application-shell window controls,
   route loading/empty/error/offline/reconnecting/stale states, selected-route
   continuity, and responsive surface restoration; the 16px navigation
   separator and large-Review
   overflow/reveal contract, plus the 16px PR/Review separator, responsive
   limits, tab states, and expand/restore lifecycle, and the 16px Terminal
   separator, 272px default panel, responsive bounds, named tab/tabpanel, and
   terminal log/input semantics; plus Composer context/queue/input ownership,
   running Enter-to-queue behavior, Stop-to-automatic-continuation,
   four-line/long-input sizing, four-choice permissions, the scrollable inline
   Add-resource picker, long-thread message navigation, scroll-away recovery,
   and deterministic windowing. A 12-row
   queue proves that its action menu is portaled without disabling bounded
   vertical scrolling, and replay controls prove that the Composer follows
   protocol running/completed positions while clearing stale Stop and paused
   interaction state, including leaving the disabled fixture frame. Current
   pasted-image acceptance additionally locks the ready geometry, sent-message
   ownership, and Remove → Add → Submit → completion lifecycle. Scenario
   selection also resets the owned viewport before the scroll callback
   confirms following, while submission/navigation consume fixture-only
   Composer attachments, final-row removal leaves paused queue state, and
   completed replay positions reconcile queued work. Mode switches clear
   fixture-only host state, and message-navigation tooltips avoid duplicate
   label/preview content. The independent theme contract combines the current
   sidebar and workspace shell, locks 1180×820 light geometry and semantic
   colors, prevents captured dark SVG paint from remaining white on light
   surfaces, and themes the Project, Environment, and Worktree overlays. It
   keeps System/Light/Dark separate from lifecycle frames and rejects those
   preferences on conversation and Pull Request routes whose custom paint is
   not yet theme-complete.
   Mixed Review acceptance additionally requires
   ordered rename/delete/modified rows, two text diffs, explicit
   binary/conflict notices, focusable content, and synchronized file
   selection. The current rename replay separately requires two modified file
   rows, the marker-backed +1/-1 diffs observed on `26.730.61309`, keyboard
   destination selection, close/reopen preservation, and group Undo.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation,
   pointer and keyboard navigation/PR-panel resizing, Review-panel
   close/reopen behavior, compact 800×600 multi-file geometry, an eight-file
   scroll-to-selection flow, mixed-content selection/sibling/Undo lifecycle,
   PR tab/comment/expansion interactions, and
   Terminal pointer/keyboard resizing, host-owned input, legacy process
   close/restore, current local close-last/fresh creation, cross-worktree
   mismatch recovery, compact 820×680 geometry, and App shell offline → retry → restored
   notification plus native 1180×820 → 720×680 → 1180×820 continuity; the
   conversation host also drives submit → queue → Stop → automatic queued
   continuation and return-to-latest in a real 1180×820 window. A separate
   current Composer flow verifies permission selection, Escape/focus
   restoration, resource keyboard selection, and the 205px long-input clamp.
   A dedicated current image-attachment flow repeats removal, re-addition,
   submission, exact completion, focus restoration, and unchanged approval
   policy in the real window.
   The same real window now emulates a light system preference, switches the
   playground from explicit Dark to System, Light, and back to Dark, and gates
   pointer access through the draggable titlebar, root ownership, computed
   `color-scheme`, focus, sidebar geometry, main background, Composer
   foreground, Project/Environment/Worktree overlay paint, route-scoped
   control availability, a contrast-safe shell success indicator, a light
   native System backing before renderer load, and dark fallback after
   returning to an unsupported conversation route.
   A current long-thread flow verifies compact navigation selection, a
   seven-turn mounted window, negative away-from-latest scrolling, and
   return-to-latest at scroll origin zero. The current long-command flow
   expands the activity and command disclosures, verifies all 401 split
   output lines, then collapses and reopens the card to prove reverse-tail
   restoration.
4. **Pixels** — full-frame regression screenshots after the structural gates
   pass. The 113th reviewed frame is an internal light shell baseline that
   combines the current sidebar, window chrome, workspace entry, context bar,
   and Composer. It is not a current-product light reference. The multi-file
   scenario can additionally compare a separately captured 906×820
   current-build main region through
   `CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE`; the PR detail scenario accepts
   its own 906×820 reference through
   `CODEX_UI_KIT_PULL_REQUEST_REFERENCE`; the Terminal scenario accepts a
   906×820 reference through `CODEX_UI_KIT_TERMINAL_REFERENCE` and gates the
   current `terminal-current-single` panel and content regions separately; the completed-Markdown
   scenario accepts `CODEX_UI_KIT_MARKDOWN_REFERENCE` and gates assistant,
   fenced-code, and Composer regions separately; the successful-MCP scenario
   accepts `CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE` and gates full-main,
   tool-call, answer, and Composer regions separately; the current sidebar
   accepts a full 1180×820 external reference through
   `CODEX_UI_KIT_SIDEBAR_REFERENCE` and gates the owned top controls, selected
   row, and footer regions separately; the current MCP recovery scenario
   accepts a 906×820 main reference through
   `CODEX_UI_KIT_MCP_RECOVERY_REFERENCE` and gates the full main, recovered
   call/answer region, upper activity/failure region, and Composer separately
   while leaving the final answer unmasked. The current `26.803.41515` MCP
   refresh accepts its local-only 905×820 success main crop through
   `CODEX_UI_KIT_CURRENT_MCP_SUCCESS_REFERENCE` and the exact 720×680 recovery
   frame through `CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_REFERENCE`; these
   independently gate the aligned 736×100 tool group under 2% and the visible
   compact failure-card region under 1.2%. The unavailable/fallback replay
   accepts an exact local-only 720×680 frame through
   `CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_REFERENCE` and gates the owned
   688×71 recovered integration group under 1.3%; exact CDP and Electron
   contracts separately retain the unavailable response, missing false GitHub
   tool row, same-thread fallback order, and responsive layout. The App shell
   accepts a 120×46 ownership-scoped reference through
   `CODEX_UI_KIT_WINDOW_CHROME_REFERENCE`. Queued and automatic-continuation
   Composer states
   accept separate 792×320 current-build crops through
   `CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE` and
   `CODEX_UI_KIT_COMPOSER_CONTINUED_REFERENCE`; both use a 2% hard
   changed-pixel limit. `CODEX_UI_KIT_COMPOSER_PAUSED_REFERENCE` is retained
   only for the previous-build paused/Resume compatibility frame. Current
   multiline, permissions, and resources accept
   `CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE`,
   `CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE`, and
   `CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE`; their ownership masks retain
   geometry/boundaries and use hard 0.5%, 0.5%, and 0.8% limits. Goal and Plan
   main-region references use `CODEX_UI_KIT_COMPOSER_GOAL_REFERENCE` and
   `CODEX_UI_KIT_COMPOSER_PLAN_REFERENCE` with 0.5% limits. The current
   long-thread main-region reference uses
   `CODEX_UI_KIT_LONG_THREAD_REFERENCE`; its mask excludes all conversation
   content and retains the compact rail and floating control under a 1% hard
   limit. Current command approval uses separate 906×820
   `CODEX_UI_KIT_APPROVAL_PENDING_REFERENCE` and
   `CODEX_UI_KIT_APPROVAL_DENIED_REFERENCE` inputs. The current Allow-once
   completion additionally accepts
   `CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_REFERENCE`; their masks retain the
   approval/Composer silhouettes, actions, activity structure, and spacing
   under independent 1.5% hard limits. The matching-command flow accepts
   `CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_REFERENCE` and
   `CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_REFERENCE`; it retains the split
   menu, approval silhouette/actions, two-turn activity structure, and restored
   Composer under the same independent 1.5% hard limits. Current image
   attachments accept `CODEX_UI_KIT_ATTACHMENT_READY_REFERENCE` and
   `CODEX_UI_KIT_ATTACHMENT_COMPLETED_REFERENCE`; their masks retain the
   draft/sent 80px media geometry, message and Composer silhouettes, actions,
   and spacing under independent 1.5% hard limits. Current long command output
   accepts a full 1180×820 `CODEX_UI_KIT_COMMAND_OUTPUT_REFERENCE`; its ownership mask
   retains the command-card boundary, disclosure/Shell/output structure, and
   spacing under a 1.5% hard limit. Transparent
   Electron/CDP reference pixels are composited onto the observed `#181818`
   window background before comparison, and independently implemented UI
   regions are located from their DOM contracts rather than hard-coded
   vertical offsets.

The ordinary sidebar task-status scene accepts local-only 259×30 active and
unread row references through
`CODEX_UI_KIT_CURRENT_SIDEBAR_ACTIVE_STATUS_REFERENCE` and
`CODEX_UI_KIT_CURRENT_SIDEBAR_UNREAD_STATUS_REFERENCE`. It crops the final
28px status rail and compares foreground masks so selected/hover row paint
does not overwhelm glyph geometry. CDP separately requires the 20×20 rail,
4px right inset, exact 16×16 spinner paths, centered 8×8 dot, and computed
`rgb(131, 195, 255)` unread color; Electron verifies hover replacement by the
trailing actions.

The layers do not vote on the same claim. Protocol proves lifecycle behavior;
CDP explains layout; Electron proves the desktop host; pixels catch final
visual drift.

The current App shell sample measured a `0.039311594` changed-pixel ratio for
the 120×46 window-chrome crop at the strict 0.05 pixel threshold, under its
0.05 hard limit. Only loading and in-session Pull requests selection were
observed in Codex Desktop `26.721.81911`; offline/error/reconnecting/stale and
restored-notification frames are explicitly synthetic coverage.

The current queued and automatic-continuation Composer references measured
`0.003480114` and `0.005105745` changed-pixel ratios at the strict 0.05 pixel
threshold. The current multiline, permissions, and resource references
measured `0.000994318`, `0.001280084`, and `0.003352986`. Their ownership
masks exclude unrelated transcript text and fixture-specific labels while
preserving the queue, overlay, Composer silhouettes, controls, backgrounds,
radii, and spacing. Goal and Plan measured `0.003763528` and `0.003486243`.
The current long-thread rail/control comparison measured `0.005937382`.
Historical approval pending and denied comparisons measured `0.008493512` and
`0.001214128`. Current `26.730.61309` Allow-once pending and completed
comparisons measured `0.012554514617993862` and `0.002993592849835783`.
The current matching-command menu and repeated completed comparisons measured
`0.012100899154686911` and `0.013686534216335542`.
The current attachment-ready and attachment-completed comparisons measured
`0.0038954396166478223` and `0.007934905507995478`.
Current `26.730.61309` long command output measured
`0.001655643`.

Computer Use remains an optional macOS acceptance layer for real pointer,
focus, menu, multi-window, and OS integration checks. It is intentionally not a
headless CI requirement. A run should record the scenario, app commit, macOS
version, display scale, theme, locale, window size, and reduced-motion state.

The checked-in screenshot baselines guard the integration demo. External
Codex references remain untracked; their full, conversation, and Review
region thresholds—or full, index, and PR-detail thresholds—are enforced
separately so a passing internal baseline cannot be mistaken for
current-build parity. The Terminal comparison deliberately reports but does
not gate the whole-main ratio when the observed and replayed conversation
content differ.

The 13 standard lifecycle frames keep the original 0.25% internal raster limit
for the 906px main region. Their 274px sidebar is gated separately at 5%
because its expanded 13px navigation/history text density now produces a
repeatable 4.9190% cross-machine macOS runner delta while the same main region
measures 0%. This prevents sidebar raster variance from loosening the
conversation gate, while CDP locks the row contract and the ownership-scoped
current-build sidebar comparison retains its separate hard regional
thresholds. The
large-Review frame uses a scoped 0.45% main-region limit because
its 96 dense monospace lines produced a measured 0.4337% macOS-runner
text-rasterization delta; CDP and Electron still gate file counts, overflow,
split geometry, and exact last-file visibility independently. The fourteenth
PR frame uses a scoped 1.10% main-region limit because
its dense full-page text produces a measured 1.0630% macOS-runner
rasterization delta; CDP and Electron still lock the split, tabs, actions,
resizing, and expansion independently. Its optional current-build gate allows
at most 6.5% full-main, 5.5% index, and 7% detail difference at the stricter
0.05 pixel threshold. The fifteenth Terminal frame keeps the standard
0.25%-main/5%-sidebar regional limits; its optional current-build gate allows
at most 2% panel and 1% content difference at the same 0.05 threshold. The
sixteenth completed-Markdown
frame uses a scoped 1% main-region limit for dense text rasterization and hides
only the capture-time scrollbar so overlay and space-consuming macOS scrollbar
settings cannot shift the centered content by 7.5px. CDP still checks the real
scroll container and geometry. Its optional current-build gate allows at most
2% assistant, 2% fenced-code, and 2.5% Composer-region difference at the same
threshold. The seventeenth running-MCP frame uses a scoped 1% main-region limit.
The denser eighteenth completed-MCP frame uses a scoped 2.25% main-region limit
to cover the measured 2.0734% macOS-runner text-rasterization delta. It replays
the observed 72px expanded-follow scroll state, while CDP independently
verifies that exact scroll position, 14px/21px group typography, 25px call
rows, and five-call count. Its optional current-build gate remains stricter
and region-specific: at most 3% full-main, 4% tool-call, 4% answer, and 2.5%
Composer difference at the strict 0.05 pixel threshold.

The nineteenth through twenty-second frames cover a failed MCP call, an active
retry, a recovered group, and the recovered thread followed by a
command/approval/file/Review turn. CDP verifies the ordered Fetch, Search, and
Fetch rows, the expanded neutral `plaintext` error output, and the rule that an
earlier failed call followed by a successful final call leaves the historical
group completed. The reducer records terminal-event sequence so overlapping
calls are judged by completion order rather than start order. Electron expands
the same historical disclosure while the
Review split is open and verifies two user messages, two commands, the accepted
approval, one file change, the Review panel, and the failed call's functional
raw-output dialog with focus restoration. The recovery completed frame uses
the same 2.25% internal main-region limit; the mixed Review frame uses 1.3%
to cover its measured 1.1716% and 1.2530% macOS-runner deltas. The optional
current-build recovery gate allows at most 4.5% full-main, 7% recovery, 5%
user, and 3% Composer difference at the strict 0.05 pixel threshold. The
accepted sample measured 2.9202337%, 5.1956799%, 4.7369405%, and 1.5698995%
respectively.

The twenty-third through twenty-sixth frames cover App shell loading, offline,
stale, and restored states. The conversation matrix now additionally includes
current four-line, permission-menu, and resource-picker frames. These frames
use a scoped 2.25% internal main-region limit for their dense thread, while
CDP independently locks the current 736×134/736×259 Composer geometry,
480×222 permission menu, 736×320 resource picker, 28px controls, 13px queue
inset, navigation markers, disabled semantics, and windowed placeholder.

The reviewed matrix now totals 81 frames. Its historical two command-approval frames cover the
current 736×162 pending Composer-dock card and the denied completion with
response actions and restored 736×98 Composer. CDP verifies request state,
command/activity labels, dimensions, and permission restoration. Electron
opens and dismisses the scoped menu with focus restoration, then drives
`Deny` and confirms the approval disappears before the final response.
The final frame covers a successful 400-line command with `Shell`, two copy
controls, a 144px reverse-tail viewport, and Success. CDP locks its 401 split
lines and collapse/reopen restoration; Electron drives the same disclosures.
The current Allow-once pair adds an independent accept response, successful
command completion, exact final answer, unchanged approval policy, and focused
empty Composer restoration. Both Browser/CDP and real Electron drive this
transition, and separate current-build pending/completed references remain
under their 1.5% ownership-masked limits. The matching-command pair adds the
current split menu plus a two-turn trace in which only the first identical
command requests approval. Browser/CDP and Electron drive the menu selection,
verify both command completions and exact final responses, and prove the
second turn avoids another card without changing the global Ask policy.
The current attachment pair adds one ready and one completed state while
replacing the legacy generic attachment frame. Browser/CDP locks the exact
736×180 Composer, 80×80 draft/sent attachments, 78×78 draft image, Remove
action, ownership, radii, and completed 736×98 Composer; Electron drives the
same interaction and verifies the exact final response, focus, and permission.
