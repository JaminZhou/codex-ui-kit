# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications, server requests, and
   request responses checked against the pinned generated schemas.
2. **CDP** — DOM identity, computed layout, focus, scrolling, and named-surface
   geometry, including the 16px navigation separator and large-Review
   overflow/reveal contract, plus the 16px PR/Review separator, responsive
   limits, tab states, and expand/restore lifecycle.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation,
   pointer and keyboard navigation/PR-panel resizing, Review-panel
   close/reopen behavior, compact 800×600 multi-file geometry, an eight-file
   scroll-to-selection flow, and PR tab/comment/expansion interactions.
4. **Pixels** — full-frame regression screenshots after the structural gates
   pass. The multi-file scenario can additionally compare a separately
   captured 906×820 current-build main region through
   `CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE`; the PR detail scenario accepts
   its own 906×820 reference through
   `CODEX_UI_KIT_PULL_REQUEST_REFERENCE`.

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
current-build parity.

The 12 standard lifecycle frames keep the 0.25% internal raster limit. The
large-Review frame uses a scoped 0.40% limit because its 96 dense monospace
lines amplify macOS text-rasterization differences; CDP and Electron still
gate file counts, overflow, split geometry, and exact last-file visibility
independently. The fourteenth PR frame uses the standard internal limit; its
optional current-build gate allows at most 6.5% full-main, 5.5% index, and 7%
detail difference at the stricter 0.05 pixel threshold.
