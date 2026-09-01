# Research policy

This directory records evidence used to design and verify `codex-ui-kit`. It
does not contain copied or transformed application business logic. Exact
visual primitives may be retained for the exploratory parity playground only
when [`VISUAL_ASSETS.md`](VISUAL_ASSETS.md) and
[`visual-assets.json`](visual-assets.json) record their source, ownership,
hash, package boundary, and remaining approximation denominator.
The separately gated [`visual-raster-assets.json`](visual-raster-assets.json)
holds only named app-integration rasters whose exact bytes are required by a
pixel scene; it records the same build fingerprint and remains excluded from
the published npm package.

## Workflow

1. Identify the installed application version and hash the local `app.asar`.
2. Extract the archive only to a temporary directory outside the repository.
3. Record package-level route and feature candidates without treating their
   presence as runtime reachability.
4. Observe the running application through an allowed method and record each
   surface's owner, trigger, container, lifecycle, states, and transitions.
5. Update `ui-inventory.json`; keep package evidence, runtime evidence,
   implementation, H5 verification, and Electron verification separate.
6. Write a build note containing observations, not source snippets.
7. Implement reusable components independently against the build note and
   public API. Keep current-product reference visuals in the private playground
   boundary rather than the published package.
8. Delete or replace the temporary extraction when the sampled app updates.

Deterministic raster fixtures are declared in `visual-scenarios.json`. Current
application PNG references stay outside the repository and are passed to the
visual checker through each scenario's named environment variable. A mask
requires an explicit ownership reason and may exclude only a surface that is
outside the scenario being verified.

`current-mcp-settings-26-825.json` is the sanitized current-build evidence for
the MCP manager list, empty/Add states, STDIO/HTTP create forms, and update
detail. It retains only fixed labels, counts, geometry, screenshot hashes,
regional pixel ratios, and the explicit read-only mutation boundary; server
names, URLs, raw screenshots, and profile data remain local-only.

Raw inspection data belongs in `/private/tmp/codex-ui-kit-research` or a local
`.research/` directory. Both locations are intentionally outside version
control.

The current fatal App Server recovery comparison is also local-only. Pass an
exact 1180×820 product frame with
`CODEX_UI_KIT_APP_SERVER_CRASH_REFERENCE=/absolute/path/to/reference.png` when
running the `app-server-crashed` visual scene. The checker flattens transparent
pixels against black and enforces separate 0.2% full-frame and 2% owned-core
limits; the reference itself is never committed or published.

## Allowed observations

- Component taxonomy and parent/child relationships.
- User-visible behavior and state transitions.
- Accessibility roles, labels, and keyboard behavior.
- Representative dimensions, spacing, typography, radii, and color roles.
- Framework and packaging facts visible in shipped metadata.

## Excluded material

- Bundled JavaScript, CSS, source maps, and application business logic.
- Private IPC names, authentication details, credentials, or service endpoints.
- Code produced by formatting, deminifying, translating, or mechanically
  transforming bundled implementation code.

Fonts, images, icons, logos, and sounds are not accepted merely because they
exist in the installed package. A visual asset must satisfy the provenance and
distribution rules in [`VISUAL_ASSETS.md`](VISUAL_ASSETS.md); uncertain or
unused assets stay local until that evidence exists.

Each sampled build receives a separate note so observations can be compared
without treating one proprietary build as permanent source of truth.

`pnpm check:research` validates the inventory schema and prevents a surface
from being marked browser- or Electron-verified without current runtime
evidence.

[`DELIVERY_PLAN.md`](DELIVERY_PLAN.md) defines the ordered workstreams,
application-shell and sidebar coverage, per-surface exit gate, and planned PR
sequence. [`UI_INVENTORY.md`](UI_INVENTORY.md) remains the human-readable
status view, backed by `ui-inventory.json`.
