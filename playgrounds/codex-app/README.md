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

The renderer is protocol-neutral. App Server notifications are reduced into a
small UI state contract before they reach `codex-ui-kit`. The Electron main
process owns `CodexAppServerClient`; the sandboxed renderer receives sanitized
events through preload IPC.

## Development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check:codex-app
pnpm dev:codex-app:electron
```

`Live local` uses the pinned Codex runtime from
`@jaminzhou/codex-app-server-client`, with read-only sandboxing, no approvals,
and no required account-backed CI. It opens the repository root by default;
set `CODEX_UI_KIT_WORKSPACE` to an absolute path to inspect another workspace.
Replay mode is deterministic and is the default test path.

The macOS Electron acceptance suite combines CDP geometry and computed styles,
native-window contracts, and reviewed pixel baselines:

```bash
pnpm check:codex-app:acceptance
```

See [docs/VALIDATION.md](docs/VALIDATION.md) for the evidence model.
