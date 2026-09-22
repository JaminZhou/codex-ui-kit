# Live MCP tool-call evidence — 2026-09-22

This record captures one successful local App Server MCP tool call through the
private Electron playground. It is evidence for the Stage 5 live protocol
boundary, not installed-Codex product parity.

## Command and runtime

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-call
```

The gate completed with exit code `0` on 2026-09-22. It created a disposable
loopback stdio MCP server, configured it through a temporary `CODEX_HOME`, and
used the public `CodexAppServerClient` plus the playground's Live Electron
bridge. No production MCP configuration, server, credential, or repository
file was changed.

Observed result:

- App Server live mode: `true`
- MCP server: `ui_kit_echo`
- exposed tool: `ui_kit_echo`
- model turns: `1`
- completed item status: `completed`
- returned text: `MCP_TOOL_CALL_OK:pixel-check`
- wide tool card: `736×53px`
- compact tool card: `414×53px`
- cleanup: the ephemeral rollout was already closed; the disposable server
  directory and temporary process were still closed by the gate

The live status query reported `authStatus: unsupported` for the local server;
that is an explicit provider capability value, not a failed authentication
assertion. The test does not infer OAuth, remote HTTP transport, provider
availability, or installed-product notification/pixel behavior from this run.

## Evidence boundary

This closes one real success path from Composer submission through
`tools/list`, `tools/call`, item completion, rendered tool-card disclosure, and
wide/720 resize without horizontal overflow. Retry, timeout, approval-denied,
cancel, remote HTTP, OAuth, and current installed-product pixels remain
separate gates.
