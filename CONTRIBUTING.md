# Contributing

## Development setup

Use Node.js 22 and the pnpm version declared in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs TypeScript checks, package tests, the library build, the npm package contract, the browser showcase build, the headless-Chrome accessibility contract, and the Electron main/preload/Renderer checks.

The accessibility contract checks the built showcase for WCAG A/AA/2.2
violations, labels, valid ARIA relationships, and keyboard-accessible scroll
regions. It opens tooltips, nested menus, popovers, selects, choice dialogs,
image previews, and approval menus in every checked viewport. Portalled
`aria-controls` and `aria-describedby` targets must exist in the same document,
carry the expected role, and keep modal focus inside dialogs. Axe's narrowly
identified `controlsWithinPopup` uncertainty is accepted only after that DOM
relationship is verified; unrelated ARIA uncertainty still fails. Indeterminate
gradient/overlap contrast results remain part of manual visual review. Set
`PUPPETEER_EXECUTABLE_PATH` when Chrome or Chromium is installed outside the
standard macOS and Linux locations.

The generated `dist/` directory is not tracked. `npm pack` runs `pnpm build`
through the package `prepack` lifecycle before assembling a tarball; do not
commit generated package output.

## Component changes

1. Add or update the public component API and types.
2. Cover behavior, accessibility, keyboard interaction, and visual contracts in tests.
3. Add every public state to the browser showcase.
4. Add desktop-specific geometry or interaction states to the Electron playground when relevant.
5. Run `pnpm check` before opening a pull request.

For desktop visual or interaction changes, also run the executable Electron
acceptance matrix with a temporary output directory:

```bash
CODEX_UI_KIT_ACCEPTANCE_DIR="$(mktemp -d)" \
  pnpm --filter @codex-ui-kit/electron-playground preview
```

The command exits non-zero when a locked theme, overflow, focus, overlay,
surface, or thread-position contract is violated.

The package supports React 18 and React 19. CI installs the packed artifact into
isolated consumers for both majors and verifies the complete public runtime
export manifest before server rendering a representative component.

## Research and implementation boundaries

Read [`SOURCES.md`](SOURCES.md) and [`research/README.md`](research/README.md) before contributing parity work.

- Record only abstract observations, public behavior, accessibility semantics, and representative measurements.
- Keep extracted application files and raw inspection data outside the repository.
- Do not copy, deminify, translate, or mechanically transform bundled implementation code.
- Do not contribute private IPC, authentication details, service endpoints, fonts, logos, icons, sounds, or other OpenAI assets.
- Implement public APIs, markup, styling, and assets independently.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Include verification commands and screenshots for visual changes.
- Preserve the protocol-neutral component boundary.
- Resolve automated review threads after fixing and pushing.
- Do not resolve human review threads unless the reviewer asks.

## Commit style

Use a lowercase conventional prefix such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `ci:` followed by a concise summary.
