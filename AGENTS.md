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

- Jamin's fast mode (confirmed 2026-10-08) remains effective until changed by
  Jamin. Every PR requires full `pnpm check` for its exact candidate tree and
  acceptance justified by the actual diff. Explicitly record affected files,
  component families, Browser/CDP, Electron, pixel and necessary live public-
  protocol checks, commands, head/tree, results and exit codes. Do not narrow
  the scope merely to obtain a pass. Prefer complete component-family PRs.
- Ordinary small UI PRs need not run every online acceptance scenario. Full
  `pnpm check:codex-app:acceptance` is required at stage closure, important
  integration batches and before release. Shared shell, public state/protocol,
  general acceptance infrastructure or unclear impact requires expanded
  validation, including the full suite when needed. Stage/release completion
  still requires full successful evidence; the delivery plan's 0–7 goal is
  unchanged. Replay, installed-product evidence, live protocol and product
  pixels cannot substitute for one another or promote the global baseline.
- Retain auditable stage results for the exact tree. Retry failed stages and
  their dependencies only when tree, tools/environment, prerequisite state
  and dependency validity are proven; changes invalidate affected evidence.
  Document-only descendants may reuse execution evidence only with an explicit
  diff/content-identity proof. Never call partial results a full command exit
  0, or manufacture success with skips, relaxed thresholds/timeouts or removed
  assertions. Known failures must be diagnosed before merging.
- Classify retry notices, terminal errors, timeouts, UI/process exits and quota/
  service errors separately. After two equivalent external/network failures,
  stop blind full-suite retries, diagnose/report the external gate and pursue
  independent work. Retry affected online scenarios only within a bounded
  plan; do not change global proxy/account/model/timeout settings unilaterally.
- Parallel tests need isolated instances and outputs; do not race builds or
  acceptance suites in the same directories. Clean only the exact processes
  and children created for that run, never the user's Codex/CDP instance.
- Use `gh` to read live PR/check state and perform authorized PR operations.
- After applicable local gates pass, attempt an authorized administrator
  squash merge against the verified head. Do not trigger, poll or wait for bot
  review, optional remote CI or post-merge CI. Required GitHub checks still
  apply; pending/queued/Expected is neither success nor an actual failure and
  does not delay the first merge attempt. A current-head actual failure blocks
  merging. If GitHub rejects the
  merge for a required status, do not change branch protection or fabricate a
  status; report the exact gate and continue only when it is satisfied.
- Preserve unrelated work. After an authorized merge, synchronize local
  `main` ff-only with `origin/main`, verify the merged PR and exact head branch,
  delete only that branch locally/remotely, and confirm a clean worktree with
  `main == origin/main`. Report the current branch.
