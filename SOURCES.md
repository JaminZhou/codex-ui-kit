# Sources and provenance

## Interaction research

This project studies interaction patterns from OpenAI Codex Desktop and other coding-agent products. Research may include read-only inspection of a locally installed Codex distribution, including its packaged Renderer assets, to understand component boundaries, layout behavior, state models, accessibility semantics, and design-token architecture.

Raw extracted files stay outside this repository. The repository contains only abstract observations, measurements, and independently written implementation code. It does not redistribute bundled JavaScript, CSS, fonts, images, icons, logos, or other extracted assets.

The project intentionally separates research from implementation:

1. Inspect a specific installed build in a temporary, untracked location.
2. Record component taxonomy, behavior, and representative measurements without copying source snippets.
3. Design a protocol-neutral public API and independently implement it with original names, markup, styling, and assets.
4. Verify the result against the recorded behavior and accessibility requirements.

See [`research/README.md`](research/README.md) for the research policy and build notes.
Current-build coverage candidates and runtime evidence requirements are tracked
in [`research/UI_INVENTORY.md`](research/UI_INVENTORY.md) and
[`research/RUNTIME_CAPTURE.md`](research/RUNTIME_CAPTURE.md).

## Boundaries

- Do not copy or mechanically transform bundled implementation code into this project.
- Do not commit extracted files or private OpenAI assets.
- Do not depend on private Electron IPC, private service behavior, or undocumented authentication flows.
- Do not ship OpenAI or Codex logos, fonts, sounds, illustrations, or other brand assets.
- Do not present this project as an official OpenAI package.

## Public references

- [OpenAI Codex documentation](https://developers.openai.com/codex/)
- [OpenAI Codex repository](https://github.com/openai/codex)
- [Codex app-server protocol](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
