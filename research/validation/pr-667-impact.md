# PR #667 impact and validation scope

Date: 2026-10-08. Implementation candidate: `cbde6771bec95d6085aac797bfbf4b70733a5f28`,
tree `f017a1c9223fc5e1b743d148cfcf88f1f69dc7c4`. Later policy/record-only changes
require an explicit content-identity diff and full candidate `pnpm check`;
final head/tree and execution exit codes are recorded in the PR validation
receipt, without committing temporary logs or process identifiers.

## Affected files and families

- `CurrentHome26930.tsx`, `App.tsx`, scoped `styles.css`: dedicated current
  empty-Home layout, not other route paint or shared public state/protocol.
- `current-home-composer-layout-26.930.61225.json` and
  `check-current-home-geometry-26-930-61225.mjs`: eight measured dark/light ×
  1180/820/721/720 samples, computed geometry/styles, zero overflow.
- Playground package scripts retain historical Home checks alongside current
  geometry checks; existing scenes remain regression evidence.
- `check-live-mcp-tool-call.mjs` and `live-mcp-waits.mjs`: shared MCP acceptance
  waiter for every mode in this script. Explicit `willRetry: true` keeps
  waiting under unchanged timeouts; terminal errors/turn failures remain
  failures. No production protocol/state implementation changed.
- `live-mcp-waits.test.mjs`: eight regression cases for retry, required tool
  count, terminal errors, failed/interrupted turns and missing tool evidence.
- AGENTS and delivery plan: current fast-mode policy and evidence boundaries;
  no runtime behavior, protection or inventory promotion.

## Required acceptance for this diff

1. Full `pnpm check` on the final candidate, including root/package/demo/a11y,
   playground tests, Electron tests and historical/current Home contracts.
2. `check:current-home-composer-26-930`: real Electron/Renderer execution of
   historical Home and current eight geometry/style samples. Synthetic turn
   lifecycle is replay evidence only, not installed-product behavior.
3. Expanded shared MCP waiter matrix: `check:live-mcp-tool-call`,
   `check:live-thread-attachments`, `check:live-skill-try-now`,
   `check:live-mcp-multi-tool`, `check:live-mcp-tool-retry`,
   `check:live-mcp-tool-timeout`, `check:live-mcp-tool-approval-denied`,
   `check:live-mcp-tool-cancel`, `check:live-mcp-tool-remote`, and
   `check:live-mcp-tool-oauth`. Each uses the real public App Server protocol
   and its own temporary Electron instance/evidence. Success still requires
   actual tool outcomes, not a reconnect notice or model text alone.
4. Known failed PTY stage must be diagnosed and retried, not excluded by the
   new policy. System logs show a Quit AppleEvent followed by approved app
   termination; its sender is unproven. Isolated instrumented retry passed,
   with requested end-of-test cleanup, exit 0 and no renderer-crash event.
   This supports a recovered test stage, not a claim to identify the sender.
5. Preserve broad CDP/visual/other Electron stage results from the unchanged
   implementation tree when their source, tools, prerequisite build and
   dependency identity remain valid. The failed monolithic command is still
   exit 1; never relabel it as complete success.

## Pixel and completion boundaries

This PR changes a geometry/style-only current Home replay; current icon
identity, native resize, populated installed-product lifecycle and Home
regional product pixels remain open. Existing historical own-fixture visual
regression and narrow rail/shell product comparisons do not establish Home
product parity or promote the global baseline. Next work is the complete
current Home/Composer asset/style/product-region family, not another global
completion claim. Full-suite closure is still required at the delivery-plan
stage/batch/release milestones.
