# Validation model

Every deterministic scenario has one ID and produces four evidence layers:

1. **Protocol** — ordered App Server notifications checked against the pinned
   generated notification union.
2. **CDP** — DOM identity, computed layout, focus, scrolling, and named-surface
   geometry.
3. **Electron host** — real `BrowserWindow` bounds, renderer isolation, and
   sidebar interaction.
4. **Pixels** — full-frame regression screenshots after the structural gates
   pass.

The layers do not vote on the same claim. Protocol proves lifecycle behavior;
CDP explains layout; Electron proves the desktop host; pixels catch final
visual drift.

Computer Use remains an optional macOS acceptance layer for real pointer,
focus, menu, multi-window, and OS integration checks. It is intentionally not a
headless CI requirement. A run should record the scenario, app commit, macOS
version, display scale, theme, locale, window size, and reduced-motion state.

The screenshot baselines in this playground guard the integration demo. The
upstream UI Kit owns measured reference parity against the separately observed
Codex desktop build.
