# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications, server requests, and
   request responses checked against the pinned generated schemas.
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
   running Enter-to-queue behavior, interruption/Resume, long-thread message
   navigation, scroll-away recovery, and deterministic windowing. A 12-row
   queue proves that its action menu is portaled without disabling bounded
   vertical scrolling, and replay controls prove that the Composer follows
   protocol running/completed positions while clearing stale Stop and paused
   interaction state, including leaving the disabled fixture frame. Scenario
   selection also resets the owned viewport before the scroll callback
   confirms following, while submission/navigation consume fixture-only
   Composer attachments, final-row removal leaves paused queue state, and
   completed replay positions reconcile queued work.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation,
   pointer and keyboard navigation/PR-panel resizing, Review-panel
   close/reopen behavior, compact 800×600 multi-file geometry, an eight-file
   scroll-to-selection flow, PR tab/comment/expansion interactions, and
   Terminal pointer/keyboard resizing, host-owned input, close/restore,
   compact 820×680 geometry, and App shell offline → retry → restored
   notification plus native 1180×820 → 720×680 → 1180×820 continuity; the
   conversation host also drives submit → queue → Stop → paused → Resume and
   return-to-latest in a real 1180×820 window.
4. **Pixels** — full-frame regression screenshots after the structural gates
   pass. The multi-file scenario can additionally compare a separately
   captured 906×820 current-build main region through
   `CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE`; the PR detail scenario accepts
   its own 906×820 reference through
   `CODEX_UI_KIT_PULL_REQUEST_REFERENCE`; the Terminal scenario accepts a
   906×820 reference through `CODEX_UI_KIT_TERMINAL_REFERENCE` and gates the
   shared panel and content regions separately; the completed-Markdown
   scenario accepts `CODEX_UI_KIT_MARKDOWN_REFERENCE` and gates assistant,
   fenced-code, and Composer regions separately; the successful-MCP scenario
   accepts `CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE` and gates full-main,
   tool-call, answer, and Composer regions separately; the current sidebar
   accepts a full 1180×820 external reference through
   `CODEX_UI_KIT_SIDEBAR_REFERENCE` and gates the owned top controls, selected
   row, and footer regions separately; the current MCP recovery scenario
   accepts a 906×820 main reference through
   `CODEX_UI_KIT_MCP_RECOVERY_REFERENCE` and gates the full main, recovered
   call group, user prompt, and Composer regions separately; the App shell
   accepts a 120×46 ownership-scoped reference through
   `CODEX_UI_KIT_WINDOW_CHROME_REFERENCE`. Queued and paused Composer states
   accept separate 792×320 current-build crops through
   `CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE` and
   `CODEX_UI_KIT_COMPOSER_PAUSED_REFERENCE`. Transparent
   Electron/CDP reference pixels are composited onto the observed `#181818`
   window background before comparison, and independently implemented UI
   regions are located from their DOM contracts rather than hard-coded
   vertical offsets.

The layers do not vote on the same claim. Protocol proves lifecycle behavior;
CDP explains layout; Electron proves the desktop host; pixels catch final
visual drift.

The current App shell sample measured a `0.039311594` changed-pixel ratio for
the 120×46 window-chrome crop at the strict 0.05 pixel threshold, under its
0.05 hard limit. Only loading and in-session Pull requests selection were
observed in Codex Desktop `26.721.81911`; offline/error/reconnecting/stale and
restored-notification frames are explicitly synthetic coverage.

The queued and paused Composer references measured `0.002722538` and
`0.004478378` changed-pixel ratios at the same strict 0.05 pixel threshold.
Their ownership masks exclude unrelated transcript text and fixture-specific
labels, while preserving the queue and card silhouettes, 13px queue inset,
controls, backgrounds, radii, and spacing.

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
stale, and restored states. The twenty-seventh through thirty-sixth frames
cover conversation ready, multiline, running, queued, queue-paused, disabled,
attachment, scroll-away, windowed history, and completion. The new frames use
a scoped 2.25% internal main-region limit for their dense 20/22-message thread,
covering the observed 1.84394% macOS-runner rasterization delta. CDP
independently locks the 736×98 Composer, 28px controls, 13px queue inset,
10/11 navigation markers, disabled semantics, and windowed placeholder.
