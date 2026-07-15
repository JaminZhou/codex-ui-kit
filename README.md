# Codex UI Kit

Independently designed React components for building Codex-style coding-agent interfaces.

> This is an unofficial, independently developed open-source project for the public Codex ecosystem. It is not affiliated with, sponsored by, or endorsed by OpenAI. Codex and OpenAI are trademarks of OpenAI.

## Status

Early private development. The public API is not stable yet.

The current milestones cover the thread, approval, and composer surfaces:
messages, grouped activities, tool-call state, responsive content, controlled
decisions, and an agent input with keyboard and running states. Run the local
showcase with:

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
- `StatusIndicator`: visual state primitive.
- `AgentComposer`: controlled input surface with submit, stop, and slot APIs.
- `ComposerAttachment`: removable attachment metadata primitive.

The default stylesheet supports light, dark, and system color schemes. Set
`data-theme="light"` or `data-theme="dark"` on an ancestor to force a theme.

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
```

`pnpm check` builds the library, browser showcase, Electron main/preload
processes, and Electron Renderer without launching a graphical window in CI.

## License

MIT
