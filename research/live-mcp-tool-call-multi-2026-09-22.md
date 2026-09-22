# Live MCP multi-tool evidence — 2026-09-22

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-multi-tool
```

The gate now exits `0` after two sequential Composer turns on the same Live
thread. The first turn calls `ui_kit_echo`; the second calls `ui_kit_upper`.
Both public `tools/call` results are completed and rendered as separate,
expandable cards:

- `MCP_TOOL_CALL_OK:pixel-check` — `736×53px` wide
- `MCP_TOOL_CALL_UPPER:PIXEL-CHECK` — `736×53px` wide
- the final compact card is `414×53px`
- model turns: `2`; tool order: `ui_kit_echo` → `ui_kit_upper`

The gate explicitly waits for both completed turn summaries and opens every
completed activity before inspecting its item card. This keeps protocol
success and rendered disclosure evidence aligned when the second turn is
mounted after the first turn settles. The loopback server, temporary
`CODEX_HOME`, and rollout are isolated and do not mutate production state.

Multi-tool failure, timeout, cancellation, remote HTTP/OAuth, and
installed-product pixels remain separate boundaries.
