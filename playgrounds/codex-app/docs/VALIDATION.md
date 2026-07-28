# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications, server requests, and
   request responses checked against the pinned generated schemas.
2. **CDP** — DOM identity, computed layout, focus, scrolling, and named-surface
   geometry, including the 16px navigation separator and large-Review
   overflow/reveal contract.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation,
   pointer and keyboard navigation resizing, Review-panel close/reopen
   behavior, compact 800×600 multi-file geometry, and an eight-file
   scroll-to-selection flow.
4. **Pixels** — full-frame regression screenshots after the structural gates
   pass. The multi-file scenario can additionally compare a separately
   captured 906×820 current-build main region through
   `CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE`.

The layers do not vote on the same claim. Protocol proves lifecycle behavior;
CDP explains layout; Electron proves the desktop host; pixels catch final
visual drift.

Computer Use remains an optional macOS acceptance layer for real pointer,
focus, menu, multi-window, and OS integration checks. It is intentionally not a
headless CI requirement. A run should record the scenario, app commit, macOS
version, display scale, theme, locale, window size, and reduced-motion state.

The checked-in screenshot baselines guard the integration demo. External
Codex references remain untracked; their full, conversation, and Review
region thresholds are enforced separately so a passing internal baseline
cannot be mistaken for current-build parity.

The 12 standard lifecycle frames keep the 0.25% internal raster limit. The
large-Review frame uses a scoped 0.40% limit because its 96 dense monospace
lines amplify macOS text-rasterization differences; CDP and Electron still
gate file counts, overflow, split geometry, and exact last-file visibility
independently.
