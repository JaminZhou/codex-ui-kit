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

## Fourth vertical slice

The fourth slice makes the shell and Review workspace resilient under load:

- a 16px navigation separator measured from the current desktop build;
- pointer resizing plus accessible Arrow/Home/End keyboard control;
- 240–520px navigation clamps, exercised through CDP and a real
  `BrowserWindow`;
- an eight-file, 96-line protocol trace whose Review panel overflows
  internally;
- exact last-file reveal in CDP and Electron without horizontal overflow;
- a thirteenth reviewed pixel-regression frame for the large Review state.

That observation establishes application-navigation resizing. Review-panel
resizing is covered by the next current-build slice.

## Fifth vertical slice

The fifth slice reaches the current public Pull request detail and completes
the resizable workspace contract:

- a 16px Review/PR separator with a measured 320px panel minimum and 352px
  retained main track;
- pointer plus Arrow/Home/End resizing and focus restoration;
- a 352/554px PR index/detail split at 1180×820;
- Summary, Timeline, and Code tabs with public PR summary and file-review
  components;
- full-main expansion and exact panel-width restoration;
- a fourteenth reviewed pixel frame plus an optional external current-build
  index/detail comparison.

## Sixth vertical slice

The sixth slice adds the current background Terminal workflow:

- a schema-validated command `processId`, output stream, and
  `item/commandExecution/terminalInteraction`;
- protocol-neutral `TerminalTranscript`, `TerminalPrompt`, and
  `TerminalSession` composition;
- a 272px bottom panel, 16px pointer/keyboard separator, 152px minimum, and
  responsive half-height maximum;
- close/restore, host-owned input submission, and real 820×680 compact
  Electron geometry;
- a fifteenth reviewed pixel frame plus an optional current-build Terminal
  panel/content comparison.

## Seventh vertical slice

The seventh slice adds current-build completed Markdown:

- a public-protocol replay for heading, paragraph, external link, inline code,
  quote, list, table, and fenced TypeScript;
- exact CDP semantic counts, computed styles, 736×357 assistant geometry,
  table alignment, and measured thread/Composer scroll clearance;
- Electron code-copy interaction, external-link semantics, four persistent
  response actions, and multiline Composer geometry;
- a sixteenth reviewed pixel frame plus optional current-build assistant,
  code-card, and Composer region comparisons.

## Eighth vertical slice

The eighth slice adds a real successful public MCP workflow:

- a read-only `openaiDeveloperDocs` run observed in the current Codex build;
- schema-validated `mcpToolCall` start, progress, result, and completion items;
- `McpToolCallGroup` composition for one integration and five Search/Fetch
  calls;
- completed-answer link semantics and structured-result disclosure;
- CDP computed-style and scroll-state gates plus real Electron expansion
  interactions;
- seventeenth and eighteenth reviewed frames for running and completed MCP;
- an optional 906×820 current-build comparison for full-main, tool-call,
  answer, and Composer regions.

## Ninth vertical slice

The ninth slice completes the first current-build application-sidebar
contract:

- the 274px shell, 46px titlebar-safe inset, 70px header, 30px rows, and fixed
  46px footer measured on Codex Desktop `26.721.81911`;
- primary routes, collapsible Pinned/Projects/Recents sections, long names,
  dense history, status indicators, keyboard-accessible row actions, account,
  and settings composition;
- normal responsive behavior with an 820×680 split and a default-hidden,
  focus-managed 720px modal sidebar;
- an explicit wide capture mode so pixel fixtures do not override normal
  responsive behavior;
- Browser and Electron interaction gates plus an optional current-build
  regional sidebar comparison.

## Tenth vertical slice

The tenth slice adds current-build MCP failure recovery and a mixed second
turn:

- a real OpenAI Developer Docs invalid-URL failure followed by Search and a
  valid Fetch in Codex Desktop `26.721.81911`;
- a recovered integration group whose earlier failed call remains expandable
  as neutral `plaintext / Invalid URL` output;
- a schema-validated two-turn replay that continues through two commands, one
  accepted approval, one file change, and Review;
- CDP computed-style and geometry gates plus a real Electron disclosure and
  mixed-thread interaction flow;
- four additional reviewed frames for failed, retrying, recovered, and mixed
  Review states;
- an optional 906×820 current-build comparison for full-main, recovery, user,
  and Composer regions.

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

The Pull request detail gate uses a separate 906×820 current-build reference:

```bash
CODEX_UI_KIT_PULL_REQUEST_REFERENCE=/absolute/path/to/pr-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The Terminal gate also uses a 906×820 main-only reference. It reports the
whole-main difference but gates only the shared 272px panel and 239px content
regions, because the protocol replay and observed task intentionally have
different conversation text:

```bash
CODEX_UI_KIT_TERMINAL_REFERENCE=/absolute/path/to/terminal-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The Markdown gate uses its own 906×820 main-only reference:

```bash
CODEX_UI_KIT_MARKDOWN_REFERENCE=/absolute/path/to/markdown-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The successful MCP gate uses the expanded 906×820 main-only reference:

```bash
CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE=/absolute/path/to/mcp-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The recovered MCP gate uses a separate expanded 906×820 main-only reference:

```bash
CODEX_UI_KIT_MCP_RECOVERY_REFERENCE=/absolute/path/to/mcp-recovery-main-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

The sidebar gate uses a full 1180×820 current-build reference and compares
only application-owned regions:

```bash
CODEX_UI_KIT_SIDEBAR_REFERENCE=/absolute/path/to/sidebar-reference.png \
  pnpm --filter @codex-ui-kit/codex-app-playground check:visual
```

See [docs/VALIDATION.md](docs/VALIDATION.md) for the evidence model.
