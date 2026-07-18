# Codex component parity matrix

This matrix defines completion for the component library. A foundation release,
a passing build, or a locally complete primitive does not make the project
complete. Each surface must reach component, state, visual-token, browser, and
Electron parity against the locked sampled build.

## Baseline

- Current sample: Codex Desktop `26.715.21425` (`5488`).
- Current Renderer archive hash:
  `5db4c67090c0521fa717e83e46cb0a6175cb6c16fb89064223753bdf05cff0aa`.
- Current runtime declaration: Electron `42.3.0`, React Renderer, Vite build,
  packaged for the Owl production runtime.
- The original measured geometry baseline remains `26.707.72221`; the shared
  conversation stylesheet is byte-identical in the current sample. Current
  terminology and lifecycle deltas are locked in `26.715.21425.md`.
- Raw extracted files remain outside the repository.

## Completion gates

A row is complete only when all applicable gates pass:

1. Public React API covers every observed state without protocol coupling.
2. DOM semantics and keyboard behavior match the observed interaction.
3. Namespaced tokens reproduce measured light, dark, spacing, type, radius,
   border, shadow, and motion roles.
4. The H5 showcase demonstrates the full state matrix.
5. The Electron playground verifies desktop theme, font fallback, scrolling,
   resizing, focus, and rendered geometry.
6. Automated tests and package-consumer checks protect the contract.

## Surface matrix

| Surface | Component/API | Visual parity | H5 states | Electron | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Global tokens and themes | Complete | Measured core | Complete | Complete | Good | Complete |
| Thread layout and turn spacing | Complete | Measured | Complete | Complete | Good | Complete |
| User, assistant, and system messages | Complete | Measured | Complete | Complete | Good | Complete |
| Markdown, inline code, code blocks, tables, and links | Complete | Measured | Complete | Complete | Good | Complete |
| Activity rows and grouped work | Complete | Measured | Complete | Complete | Good | Complete |
| Reasoning and plan states | Complete | Measured | Complete | Complete | Good | Complete |
| Command execution and output | Complete | Measured | Complete | Complete | Good | Complete |
| File changes and structured diffs | Complete | Measured | Complete | Complete | Good | Complete |
| Search, web, MCP, and connector calls | Complete | Measured | Complete | Complete | Good | Complete |
| Subagent and delegated work | Complete | Measured | Complete | Complete | Good | Complete |
| Approval and permission requests | Complete | Measured | Complete | Complete | Good | Complete |
| Errors, warnings, notices, retry, and interruption | Complete | Measured | Complete | Complete | Good | Complete |
| Composer shell and autosizing input | Complete | Measured | Complete | Complete | Good | Complete |
| Composer attachments, mentions, modes, and queued prompts | Complete | Measured | Complete | Complete | Good | Complete |
| Buttons, icon buttons, menus, tooltips, popovers, and selects | Complete | Measured | Complete | Complete | Good | Complete |
| Resource cards, citations, images, and artifacts | Complete | Measured | Complete | Complete | Good | Complete |
| Thread header, floating controls, and navigation affordances | Complete | Measured | Complete | Complete | Good | Complete |
| Loading, streaming, skeleton, hover, focus, and reduced motion | Complete | Measured | Complete | Complete | Good | Complete |
| Context compaction, conversation optimization, and handoff warning | Complete | Measured core | Complete | Complete | Good | Complete |
| Responsive and narrow-window behavior | Complete | Measured | Complete | Complete | Good | Complete |
| Package tokens, CSS exports, documentation, and provenance | Complete | Measured | N/A | N/A | Good | Complete |

## Code parity closure

- The H5 showcase covers every public state represented in this matrix and is
  acceptance-checked at `1280x720` without horizontal overflow.
- The Electron playground captures standard dark `1180x820` and compact light
  `820x680` windows. Thread acceptance records both top/message and
  bottom/loading state positions, including current context lifecycle states;
  all capture output remains in `/private/tmp`.
- The package contract checks root exports, stylesheet and token subpath
  exports, generated declarations, packed file boundaries, and a standalone
  TypeScript consumer.
- `SOURCES.md`, `research/README.md`, and the sampled-build note preserve the
  clean-room provenance and asset/IPC boundaries. No extracted Renderer files
  are tracked.

## Stop rule

The implementation loop stops only when every in-scope row is complete, the
showcase and Electron screenshots have no material visual discrepancy at the
agreed viewport matrix, CI is green, review threads are resolved, and the
public package/open-source release decision has been completed explicitly.

Bundled OpenAI fonts, logos, sounds, illustrations, and private IPC are not
redistributed. Those asset boundaries do not reduce the required parity of the
independently implemented component geometry, tokens, states, or behavior.
