# Coverage and parity policy

This document no longer claims that the repository has complete Codex Desktop
parity. The previous matrix covered a selected conversation sample and could
not establish full conversation, workspace, application, or product coverage.

The authoritative current-build inventory is:

- [`26.721.81911.md`](26.721.81911.md) for the current package fingerprint,
  main-Renderer sidebar and MCP recovery captures, and remaining
  runtime-capture boundary;
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
- Codex Desktop `26.721.81911` (`5973`) now has fresh dark main-Renderer
  captures for all six left-sidebar groups and a real OpenAI Developer Docs
  failed-Fetch → Search → successful-Fetch recovery. Target selection uses the
  `app://-/index.html` URL plus application-shell landmarks and excludes the
  small auxiliary page. The independent Browser and Electron flows verify the
  sidebar at 1180×820, the 961/960 and 721/720 boundaries, 1920×1080, and
  2560×1440. Narrow behavior distinguishes the 12px edge preview from an
  explicit pinned sidebar. The shell flow additionally covers window chrome,
  loading/offline/stale/restored route states, in-session selection
  restoration, and global feedback, while the MCP recovery continues through
  its following command/approval/file/Review turn. External regional gates
  verify the sidebar, window chrome, and MCP-owned regions. Offline/error/
  reconnecting/stale and global-notification runtime states remain synthetic
  independent coverage, not current-build observations. Older evidence
  outside these sampled slices remains `partial_legacy`.
- Renderer viewport probing exposed a narrow-layout gap: the thread and
  Composer shrink, but the fixed app sidebar remains and the right workspace
  panel can be laid out beyond the simulated viewport. The independently
  implemented current-thread shell retains Browser and Electron regression
  coverage at its measured wide and compact geometry, but native Codex window
  behavior, the updated build, and the remaining app-shell/panel interactions
  stay separate acceptance requirements.
- npm publication remains out of scope until the agreed P0/P1 coverage and
  release acceptance surfaces are complete.

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
current thread slice now has scenario-driven, main-only completed, streaming,
expanded-command, pending-approval, file-review, web-search, Browser,
unavailable-MCP, failed-command, message-navigation, scroll-away,
post-interruption, and context-compaction raster fixtures with independent
selectors, ownership masks, horizontally scoped left/right regions, and
regional PNG diff thresholds. The references remain build-scoped external
evidence rather than redistributed application assets. The 526×600 compact
Browser scenes lock the sampled follow and scroll-away positions; they are not
represented as native window resizes.

The protocol-backed Electron playground adds a separate completed-Markdown
frame. Its optional 906×820 current-build comparison gates the assistant,
fenced-code, and Composer regions at the strict 0.05 pixel threshold, while
CDP separately locks semantic counts and computed geometry.

The current-build MCP recovery adds four further frames for failure, retry,
completion, and a mixed follow-up turn. Its optional 906×820 comparison gates
the full main, recovered tool group, user prompt, and Composer independently
at the same strict threshold. CDP locks call order, labels, expansion, error
semantics, and group recovery; Electron locks the mixed Review composition.

Broader final visual optimization remains scheduled after the remaining
inventory, page compositions, and state transitions stabilize. A passing
thread scenario must not be generalized to unobserved routes or states.
