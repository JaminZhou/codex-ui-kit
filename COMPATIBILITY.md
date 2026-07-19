# Compatibility

## Package format

`codex-ui-kit` is an ESM-only React package. It exports JavaScript and declarations from the package root, the complete stylesheet from `codex-ui-kit/styles.css`, and the standalone token contract from `codex-ui-kit/tokens.css`.

The emitted declarations use explicit `.js` specifiers and are verified with
both `Bundler` and `NodeNext` module resolution. Package linting also runs
Publint and Are The Types Wrong before release.

The package does not bundle React, React DOM, `react-markdown`, `remark-gfm`, or highlight.js language modules. npm installs runtime dependencies while React and React DOM remain peer dependencies.

## React

| Version | Status | Verification |
| --- | --- | --- |
| React 18 | Supported | Packed-package type check and server-render smoke in CI |
| React 19 | Supported | Full development suite plus packed-package consumer smoke in CI |

The declared peer range is `react >=18` and `react-dom >=18`. New major React versions are not considered supported until the consumer matrix is updated.

## Browsers and Electron

The stylesheet and interaction primitives target current evergreen Chromium, Safari, and Firefox releases. Exact historical browser versions are not pinned before the first npm release.

The Electron playground uses Electron 42 and validates the same public package in an isolated, sandboxed Renderer. Electron is not a package dependency.

Features such as `ResizeObserver`, `MutationObserver`, `inert`, container queries, `color-mix()`, and modern focus selectors are expected. Hosts targeting older embedded browsers must provide appropriate platform support or fallbacks.

## SSR and React Server Components

Importing the JavaScript package and server-rendering non-portalled surfaces are covered by the consumer smoke test. Interactive components use client-side hooks and browser APIs after mount.

In React Server Components environments, import interactive kit components from a host module marked `"use client"`. Stylesheets should be imported at the framework's supported application or layout boundary.

Portalled overlays and dialogs render only when a browser document is available. Hydration should use the same initial controlled state on the server and client.

## Styling

- Import `codex-ui-kit/styles.css` for the full component system.
- Import `codex-ui-kit/tokens.css` only when building additional surfaces against the public token contract.
- Set `data-theme="light"` or `data-theme="dark"` on an ancestor for an explicit theme.
- Do not depend on private class structure; only `--codex-ui-*` custom properties are part of the theming contract.

## Accessibility

The built showcase is checked in desktop light, desktop dark, and compact light
viewports. The gate covers WCAG A/AA/2.2 violations plus strict labels, ARIA
relationships, and keyboard-accessible scroll regions. The same viewports also
exercise open tooltip, nested-menu, popover, select, modal, image-preview, and
approval-menu states. Portalled ID references, popup roles, modal state, and
dialog focus containment are verified directly before Axe's
`controlsWithinPopup` uncertainty can enter the manual-review path. Axe results
that cannot determine contrast through gradients or overlapping showcase
surfaces remain a manual visual-review requirement rather than being treated as
an automatic pass.

Semantic foreground/background pairs switch atomically between themes when an
intermediate animated color could fall below the contrast threshold. Preserve
that behavior when extending danger controls or adding host-level transitions.

Public hit targets and semantic colors may intentionally be more generous than
the sampled product geometry. Hosts that override these tokens are responsible
for preserving equivalent contrast, keyboard focus, and target-size behavior.

## Protocol boundary

The package contains no Codex app-server client, authentication, Electron IPC, filesystem access, or privileged execution. Integrations should map protocol-specific data and actions into the public component props.

## Pre-1.0 policy

Compatibility claims apply to the current `main` revision until the first npm release. Public APIs may change before 1.0, with changes recorded in pull requests and eventual release notes.
