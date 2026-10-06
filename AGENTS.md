# Project instructions for coding agents

This file is a short routing guide, not a second source of truth. Keep build-
specific findings in the research records linked below.

## Read before parity work

- [`research/DELIVERY_PLAN.md`](research/DELIVERY_PLAN.md) for sequence, open
  gates, and current candidate status.
- [`research/UI_INVENTORY.md`](research/UI_INVENTORY.md) and
  [`research/ui-inventory.json`](research/ui-inventory.json) for the surface
  denominator, ownership, and evidence coverage.
- [`research/RUNTIME_CAPTURE.md`](research/RUNTIME_CAPTURE.md) for installed
  app inspection, CDP, screenshot, and cleanup procedures.
- [`research/README.md`](research/README.md), [`SOURCES.md`](SOURCES.md), and
  [`research/VISUAL_ASSETS.md`](research/VISUAL_ASSETS.md) for research,
  provenance, and asset boundaries.

Before making build-specific claims, inspect the installed app's exact version,
build, and package fingerprint and verify the current branch and working tree.
Do not pin a moving “latest build” value in this file; update the dated research
record and inventory instead.

## Evidence and implementation boundaries

- Keep package candidates, runtime observations, independent implementation,
  Browser/CDP verification, Electron verification, and pixel comparisons as
  separate evidence classes. Package strings and passing replays do not prove
  installed-product reachability or parity.
- A narrow passing slice does not promote the global baseline. Follow the
  full-denominator re-audit and promotion gates in the delivery plan; retain
  older-build observations as regression evidence.
- Classify UI ownership by lifecycle (`turn`, `thread`, `workspace`, `app`, or
  `cross-layer`), not by screen position.
- Implement independently. Never copy or transform bundled application code,
  private IPC, credentials, or service internals. For exploratory visual
  assets, follow the provenance, license, manifest, and package-exclusion rules
  in `research/VISUAL_ASSETS.md`.
- Keep raw screenshots, account-specific text, process IDs, ports, profiles,
  and temporary extraction outside committed research records. Commit only
  sanitized observations and explicitly approved assets.

## Installed-app CDP captures

Follow the **Reproducible CDP double-open probe** in
[`research/RUNTIME_CAPTURE.md`](research/RUNTIME_CAPTURE.md); do not improvise a
connection to the user's current Codex window. When authorized, start one
separate `open -na` instance with a unique temporary profile and an unused
`127.0.0.1` debugging port. Verify the exact executable, PID, arguments,
profile, and loopback listener before connecting. Select the main Renderer by
the documented structural checks, not by taking the first `page` target.

The separate Chromium profile does not isolate the Codex account, task store,
or navigation data. Default to read-only routes and synthetic disposable test
content; submitting a task requires explicit user authorization. Do not ask to
unlock the Mac preemptively: try the documented flow and request help only if
an actual OS permission boundary blocks it. On cleanup, stop only the exact
spawned process and its children, verify its listener is gone, then remove only
that probe's exact temporary profile. Never use broad process-kill or cleanup
commands.

## Validation and pull requests

- `pnpm check` is the full repository check. For product acceptance work, use
  `pnpm check:codex-app:acceptance` as required by the affected scope. Reuse a
  successful result only when it is tied to the exact tree being merged; do not
  restart an already completed exact-head acceptance run without a change that
  invalidates it.
- Use `gh` to read live PR/check state and perform authorized PR operations.
- Jamin's current fast-mode instruction is: after full local `pnpm check` and
  full local acceptance pass for the exact candidate, do not wait for bot
  review, optional remote CI, or post-merge CI before attempting an authorized
  squash merge. Required GitHub checks still apply. If GitHub rejects the
  merge for a required status, do not change branch protection or fabricate a
  status; report the exact gate and continue only when it is satisfied.
- Preserve unrelated work. After an authorized merge, synchronize local
  `main` with `origin/main` and delete only that PR's exact merged branch.
