# Codex UI Kit

Independently designed React components for building Codex-style coding-agent interfaces.

> This is an unofficial, independently developed open-source project for the public Codex ecosystem. It is not affiliated with, sponsored by, or endorsed by OpenAI. Codex and OpenAI are trademarks of OpenAI.

## Status

Foundation preview for an initial public release. The public API may change
before 1.0.

The current milestones cover the thread, approval, and composer surfaces:
messages, grouped activities, commands, file changes, tool-call state,
responsive content, controlled decisions, and an agent input with keyboard and
running states. Run the local showcase with:

```bash
pnpm dev
```

For validation in a real desktop Renderer, run the independent Electron
playground:

```bash
pnpm dev:electron
```

The Electron app lives in `playgrounds/electron` and consumes this package via
the pnpm workspace. Electron is not a dependency of `codex-ui-kit`.

## Principles

- Keep the component model independent from any single agent protocol.
- Represent messages, tool calls, commands, file changes, and approvals as composable primitives.
- Use original styling, assets, and implementation code.
- Keep protocol-specific mapping in adapters rather than UI components.

## Components

- `AgentThread`: responsive thread content column.
- `AgentMessage`: user, assistant, and system message presentation.
- `AgentActivity`: accessible expandable activity primitive.
- `ActivityGroup`: compact grouping for related activities.
- `ToolCallCard`: tool-call convenience component.
- `ApprovalRequest`: controlled approve/reject surface with explicit outcomes.
- `CommandExecution`: command activity with working directory and exit metadata.
- `CommandOutput`: independently labeled stdout/stderr output surface.
- `FileChange`: file path, rename, change-kind, and diff-stat activity.
- `FileDiff`: structured context, hunk, addition, and deletion lines.
- `StatusIndicator`: visual state primitive.
- `AgentComposer`: controlled input surface with submit, stop, and slot APIs.
- `ComposerAttachment`: removable attachment metadata primitive.

The default stylesheet supports light, dark, and system color schemes. Set
`data-theme="light"` or `data-theme="dark"` on an ancestor to force a theme.

## Installation

The package is prepared as `codex-ui-kit@0.1.0`. After the first registry
release, install it with:

```bash
pnpm add codex-ui-kit
```

## Usage

```tsx
import {
  ActivityGroup,
  AgentActivity,
  AgentMessage,
  AgentThread,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";

export function Example() {
  return (
    <AgentThread aria-label="Coding agent thread">
      <AgentMessage role="user">Run the checks.</AgentMessage>
      <ActivityGroup>
        <AgentActivity status="running" summary="Running tests" />
      </ActivityGroup>
    </AgentThread>
  );
}
```

## Research and provenance

The component model is informed by read-only study of publicly observable
Codex interactions and locally installed packaged Renderer assets. Extracted
application files are never committed or redistributed. See
[`SOURCES.md`](SOURCES.md) and [`research/README.md`](research/README.md).

## Development

```bash
pnpm install
pnpm check
pnpm check:package
```

`pnpm check` builds the library, browser showcase, Electron main/preload
processes, Electron Renderer, and a dry-run npm tarball without launching a
graphical window in CI. `pnpm check:package` validates release metadata, export
targets, and package contents after the library build.

## License

MIT
