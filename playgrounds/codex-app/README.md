# Codex App playground

This workspace is an integration demo for validating:

- [`codex-ui-kit`](https://github.com/JaminZhou/codex-ui-kit)
- [`@jaminzhou/codex-app-server-client`](https://github.com/JaminZhou/codex-app-server-client)

It recreates public Codex client workflows from public protocol
contracts and independently observed behavior. It does not ship code or assets
extracted from the Codex desktop application.

The React-only UI Kit remains the root package. Electron and App Server
dependencies are isolated in this private workspace and are never published
with `codex-ui-kit`.

## First vertical slice

The first slice covers:

- streamed assistant text;
- transient error and automatic retry;
- Stop to interruption summary;
- context compaction from running to completed;
- replay and local stdio App Server modes;
- protocol, CDP, Electron-host, and pixel regression gates.

## Second vertical slice

The second slice follows a coding workflow end to end:

- running and completed command execution;
- a schema-validated command approval request and response;
- streaming and applied file changes;
- the host-owned Review side panel and file diff;
- live approval IPC between the sandboxed renderer and Electron main process.

The renderer is protocol-neutral. App Server notifications and server requests
are reduced into a small UI state contract before they reach `codex-ui-kit`.
The Electron main process owns `CodexAppServerClient`; the sandboxed renderer
receives sanitized events and returns explicit approval decisions through
preload IPC.

## Third vertical slice

The third slice extends the file workflow to the current multi-file shape:

- one aggregate `Edited 2 files` card per protocol file-change item;
- independent file rows with group-level Undo and Review;
- every file diff stacked in the same Review panel;
- file-specific focus without dropping sibling diffs;
- wide and real 800×600 Electron split geometry;
- an optional external current-build main-only pixel comparison.

## Development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check:codex-app
pnpm dev:codex-app:electron
```

`Live local` uses the pinned Codex runtime from
`@jaminzhou/codex-app-server-client`, with read-only sandboxing and explicit
on-request approvals. It opens the repository root by default; set
`CODEX_UI_KIT_WORKSPACE` to an absolute path to inspect another workspace.
Live turns can use the signed-in Codex account and are never required by CI.
Replay mode is deterministic and is the default test path.

The macOS Electron acceptance suite combines CDP geometry and computed styles,
native-window contracts, and reviewed pixel baselines:

```bash
pnpm check:codex-app:acceptance
```

To run the optional current-build multi-file pixel gate, keep the raw
application reference outside the repository and provide its absolute path:

```bash
CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE=/absolute/path/to/main-only-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

See [docs/VALIDATION.md](docs/VALIDATION.md) for the evidence model.
