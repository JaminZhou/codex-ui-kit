# Live MCP elicitation evidence — 2026-09-22

The signed-in App Server and Electron Live bridge now have a fresh local
matrix for `elicitation/create`. Every run uses a temporary `CODEX_HOME`, a
disposable stdio server, and an ephemeral rollout; no production MCP server,
credential, or browser state is touched.

```text
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-elicitation
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-elicitation-decline
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-elicitation-cancel
pnpm --filter @codex-ui-kit/codex-app-playground check:live-mcp-elicitation-url
```

- Form Accept validates the required Project and Name fields, then completes
  `ui_kit_elicit` with `MCP_ELICITATION_OK:{"project":"codex-ui-kit","name":"Jamin"}`.
- Form Decline and Cancel both settle the same tool as failed with their exact
  `MCP_ELICITATION_DECLINED` and `MCP_ELICITATION_CANCELLED` tokens.
- The form is `710×265px` at the wide viewport and remains overflow-free at
  720px; the URL-mode form is `710×206px` and also stays in the same window.
- URL mode exposes the exact authorization link with `_blank` targeting and
  does not navigate or open a browser automatically before the explicit Cancel.

This refreshes the client-side form/URL decision boundary. OAuth provider
policy, credential exchange, external-page rendering, production MCP
reachability, and installed-product pixels remain host-owned boundaries.
