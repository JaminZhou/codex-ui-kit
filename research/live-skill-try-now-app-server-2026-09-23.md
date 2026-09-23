# Skill Try now → local App Server/MCP evidence

Date: 2026-09-23

Target replay identity: installed Codex Desktop 26.915.31945
Implementation under test: private Electron playground, not the installed app

## Observed behavior

- Starting from the 26.915 installed-skill detail replay, clicking **Try now**
  opens the editable draft with its single OpenAI Docs mention at 1180×820 and
  720×680. The draft is not submitted until the user presses Send.
- In Live local mode, submitting that prefilled draft starts a real local Codex
  App Server session. The model was `gpt-5.6-luna` with `max` reasoning.
- The disposable stdio MCP server is registered as `openaiDeveloperDocs` and
  exposes `search_openai_docs` and `fetch_openai_doc`. Both MCP tool items
  completed successfully in order. The model searched with the exact query
  `Model Context Protocol MCP documentation`, then fetched the returned URL
  `https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features`.
- The fixture returns deterministic metadata for “Model Context Protocol”; it
  does not make an internet request or verify the linked page's contents.
  This is a successful App Server/MCP integration test, not proof that the
  installed OpenAI Docs skill itself executed.

## CDP and pixel checks

The shared MCP activity group is 736×359 at 1180×820 and 414×413 at 720×680.
Its computed font is `-apple-system, system-ui, "Segoe UI", sans-serif`, 14px
with 22px line-height. The two call cards are measured independently; the wide
search/fetch cards were 736×207 and 736×127. Both screenshots of the same
activity group were compared at each size with exact pixel matching: 0 differing
pixels wide and compact. This is a repeatability check on our own rendered
fixture, not a golden-image comparison against Codex Desktop.

The detail-to-draft transition also passes repeated own-playground screenshot
comparison with 0 differing pixels at 1180px and 720px. It does not promote
installed-product pixels; the installed-product capture remains read-only
structural evidence.

## Reproduction

- `pnpm --filter @codex-ui-kit/codex-app-playground check:current-skill-try-now-26-915`
- `pnpm --filter @codex-ui-kit/codex-app-playground check:live-skill-try-now`

The live script uses the user's signed-in App Server runtime by symlinking its
`auth.json` into a disposable Codex home, then unlinks that symlink after the
Electron process exits. It does not copy or print credential contents. Workspace
writes remain disabled. Runtime authorization, installed skill execution,
registry persistence, and live public documentation fetching remain unverified.
