# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications, server requests, and
   request responses checked against the pinned generated schemas.
2. **CDP** — DOM identity, computed layout, focus, scrolling, and named-surface
   geometry, including the current 274px sidebar, 46px titlebar inset, 70px
   header, 30px rows, fixed footer, collapsible groups, focusable row actions,
   and 820px split/720px modal transition; the 16px navigation separator and
   large-Review
   overflow/reveal contract, plus the 16px PR/Review separator, responsive
   limits, tab states, and expand/restore lifecycle, and the 16px Terminal
   separator, 272px default panel, responsive bounds, named tab/tabpanel, and
   terminal log/input semantics.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation,
   pointer and keyboard navigation/PR-panel resizing, Review-panel
   close/reopen behavior, compact 800×600 multi-file geometry, an eight-file
   scroll-to-selection flow, PR tab/comment/expansion interactions, and
   Terminal pointer/keyboard resizing, host-owned input, close/restore, and
   compact 820×680 geometry.
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
   call group, user prompt, and Composer regions separately. Transparent
   Electron/CDP reference pixels are composited onto the observed `#181818`
   window background before comparison, and independently implemented UI
   regions are located from their DOM contracts rather than hard-coded
   vertical offsets.

The layers do not vote on the same claim. Protocol proves lifecycle behavior;
CDP explains layout; Electron proves the desktop host; pixels catch final
visual drift.

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
for the 906px main region. Their 274px sidebar is gated separately at 3%
because its expanded 13px navigation/history text density produced a measured
2.6687% cross-machine macOS runner delta while the same main region measured
0%. This prevents sidebar raster variance from loosening the conversation
gate, while CDP locks the row contract and the ownership-scoped current-build
sidebar comparison retains its separate hard regional thresholds. The
large-Review frame uses a scoped 0.40% main-region limit because
its 96 dense monospace
lines amplify macOS text-rasterization differences; CDP and Electron still
gate file counts, overflow, split geometry, and exact last-file visibility
independently. The fourteenth PR frame uses a scoped 1% main-region limit because
its dense full-page text produces a measured 0.8161% macOS-runner
rasterization delta; CDP and Electron still lock the split, tabs, actions,
resizing, and expansion independently. Its optional current-build gate allows
at most 6.5% full-main, 5.5% index, and 7% detail difference at the stricter
0.05 pixel threshold. The fifteenth Terminal frame keeps the standard
0.25%-main/3%-sidebar regional limits; its optional current-build gate allows
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
group completed. Electron expands the same historical disclosure while the
Review split is open and verifies two user messages, two commands, the accepted
approval, one file change, the Review panel, and the failed call's functional
raw-output dialog with focus restoration. The recovery completed frame uses
the same 2.25% internal main-region limit; its optional current-build recovery
gate allows at most 4.5% full-main, 7% recovery, 5% user, and 3%
Composer difference at the strict 0.05 pixel threshold. The accepted sample
measured 2.9202337%, 5.1956799%, 4.7369405%, and 1.5698995% respectively.
