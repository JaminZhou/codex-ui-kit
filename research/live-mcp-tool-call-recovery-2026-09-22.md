# Live MCP recovery evidence — 2026-09-22

These two runs extend the successful live MCP path with failure ownership and
approval denial. Both use the same disposable loopback stdio server,
temporary `CODEX_HOME`, public `CodexAppServerClient`, and private Electron
Live bridge as the success record in
[`live-mcp-tool-call-2026-09-22.md`](live-mcp-tool-call-2026-09-22.md).

## Retry recovery

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-retry
```

The command exited `0`. The first `ui_kit_echo` item returned
`MCP_TOOL_CALL_RETRYABLE_ERROR` with status `failed`; the second call with the
same argument returned `MCP_TOOL_CALL_OK:pixel-check` with status `completed`.
The wide cards measured `736×79px` for the failure and `736×53px` for the
recovered result; the compact recovered card measured `414×53px`.

## Approval denial

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-approval-denied
```

The command exited `0`. Exactly one MCP tool-call approval was declined, the
item settled as `failed`, and the loopback server observed zero `tools/call`
requests. The rendered failure card measured `736×121px` wide and `414×121px`
compact, with the visible `plaintextuser rejected MCP tool call` explanation.

## Boundary

These runs prove public-protocol retry and approval ownership through the real
Live Electron route without writing production files or credentials. Timeout,
cancellation, multi-tool ordering, remote HTTP/OAuth, provider-specific
errors, and installed-product pixels remain separate gates.
