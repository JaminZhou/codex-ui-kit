# Codex component parity matrix

This matrix defines completion for the component library. A foundation release,
a passing build, or a locally complete primitive does not make the project
complete. Each surface must reach component, state, visual-token, browser, and
Electron parity against the locked sampled build.

## Baseline

- Sample: Codex Desktop `26.707.72221` (`5307`).
- Renderer archive hash: `b5da51e5df6e996076e4cb19045cec46dd4c08cf61c19cdbc5cb426b8413b73c`.
- Runtime: Electron `42.1.0`, React Renderer, Vite build.
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
| Thread layout and turn spacing | Foundation | Partial | Partial | Partial | Basic | Gap |
| User, assistant, and system messages | Foundation | Partial | Partial | Partial | Basic | Gap |
| Markdown, inline code, code blocks, tables, and links | GFM + lazy highlighting | Measured core + syntax | Complete | Complete | Good | Gap |
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
| Resource cards, citations, images, and artifacts | Missing | Missing | Missing | Missing | Missing | Gap |
| Thread header, floating controls, and navigation affordances | Missing | Missing | Missing | Missing | Missing | Gap |
| Loading, streaming, skeleton, hover, focus, and reduced motion | Partial + code-prefix retention | Partial | Expanded | Expanded | Good | Gap |
| Responsive and narrow-window behavior | Partial | Partial | Partial | Partial | Basic | Gap |
| Package tokens, CSS exports, documentation, and provenance | Foundation | Partial | N/A | N/A | Good | Gap |

## Stop rule

The implementation loop stops only when every in-scope row is complete, the
showcase and Electron screenshots have no material visual discrepancy at the
agreed viewport matrix, CI is green, review threads are resolved, and the
public package/open-source release decision has been completed explicitly.

Bundled OpenAI fonts, logos, sounds, illustrations, and private IPC are not
redistributed. Those asset boundaries do not reduce the required parity of the
independently implemented component geometry, tokens, states, or behavior.
