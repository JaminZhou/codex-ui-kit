# Electron playground

This workspace is a desktop acceptance shell for `codex-ui-kit`. It is not a
second component implementation and it is not published with the package.

## Responsibilities

- Load the workspace package in a real Electron Renderer.
- Follow `nativeTheme` in system, light, and dark modes.
- Exercise compact, standard, and wide BrowserWindow content sizes.
- Report the computed system sans and monospace font stacks.
- Validate a long, Renderer-owned scroll container.
- Validate thread follow state, turn spacing, user-message focus/edit actions,
  loading/reconnect/shimmer/skeleton states, virtualized estimates, and turn
  render errors at standard and compact window sizes.
- Validate draggable header geometry, compact navigation, transient side
  panels, and latest-message floating states.
- Exercise portalled tooltips, popovers, menus, submenus, and selects inside the
  real BrowserWindow.
- Exercise a compact modal dialog with focus trapping, focus restoration,
  descriptive choices, and document scroll locking.
- Keep `contextIsolation`, sandboxing, and a narrow preload API enabled.

Electron is intentionally declared only in this workspace's development
dependencies. The root `codex-ui-kit` package remains React-only.

## Run

From the repository root:

```bash
pnpm dev:electron
```

Electron 42 downloads its platform binary on first launch instead of during
package installation. The development and preview scripts run the official
`install-electron` helper before starting the app so they also work with
launchers such as `electron-vite` that resolve the binary eagerly.

Build without launching a graphical window:

```bash
pnpm build
pnpm build:electron
```

The Electron version is pinned to `42.3.0` to match the sampled Codex desktop
build documented in `research/26.715.31925.md`.

Set `CODEX_UI_KIT_ACCEPTANCE_DIR` while running `preview` to write package-safe
geometry JSON and screenshots for the composer, interactive primitive,
navigation, resource, generated-image, and preview surfaces. The same run now
asserts viewport overflow, theme, focus, overlay ownership, critical surfaces,
and thread top/bottom positioning; a mismatch exits non-zero instead of merely
writing a capture. Acceptance output belongs in `/private/tmp`, never in the
repository.
