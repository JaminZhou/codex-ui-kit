# Live MCP tool-call boundary evidence — 2026-09-22

The same disposable signed-in App Server recipe now passes the remaining MCP
tool-call transport boundaries. Each run uses a temporary `CODEX_HOME`, a
loopback server, and a disposable rollout; no production configuration,
credentials, or remote provider state is mutated.

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-timeout
```

- `ui_kit_echo` exceeds the configured one-second tool timeout.
- One failed item is rendered without a retry or fabricated result.
- The card is `736×191px` wide and `688×191px` at 720px.
- The reported error is the public `tool call failed ... timed out awaiting
  tools/call after 1000ms` boundary.

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-cancel
```

- A real stdio `tools/call` is active when the owning Composer Stop action is
  clicked.
- The turn settles as `interrupted`; the started item remains `inProgress`,
  has no completion item, and the server emits no result token.
- Wide and compact screenshots pass the no-overflow contract without a
  fabricated tool card.

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-remote
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-tool-oauth
```

- A loopback Streamable HTTP server receives the expected `initialize`,
  `tools/list`, and one `tools/call` sequence; the completed card is
  `736×53px` wide and `414×53px` compact.
- The OAuth run additionally completes dynamic client registration,
  authorization-code exchange, and bearer-authenticated MCP transport. It
  starts with `notLoggedIn` and ends with `oAuth` status.
- Both remote modes render the same deterministic
  `MCP_TOOL_CALL_OK:pixel-check` result and keep the wide/compact card
  geometry bounded.

These runs close the sampled timeout, cancellation, Streamable HTTP, and
OAuth client boundaries. Provider-specific cancellation, production relay or
account policy, and installed-product pixels remain separate evidence gaps.
