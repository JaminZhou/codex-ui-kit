# Research policy

This directory records abstract findings used to design `codex-ui-kit`. It does
not contain extracted application files or copied source code.

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
7. Implement components independently against the build note and public API.
8. Delete or replace the temporary extraction when the sampled app updates.

Raw inspection data belongs in `/private/tmp/codex-ui-kit-research` or a local
`.research/` directory. Both locations are intentionally outside version
control.

## Allowed observations

- Component taxonomy and parent/child relationships.
- User-visible behavior and state transitions.
- Accessibility roles, labels, and keyboard behavior.
- Representative dimensions, spacing, typography, radii, and color roles.
- Framework and packaging facts visible in shipped metadata.

## Excluded material

- Bundled JavaScript, CSS, source maps, fonts, images, icons, logos, and sounds.
- Private IPC names, authentication details, credentials, or service endpoints.
- Code produced by formatting, deminifying, translating, or mechanically
  transforming bundled implementation code.

Each sampled build receives a separate note so observations can be compared
without treating one proprietary build as permanent source of truth.

`pnpm check:research` validates the inventory schema and prevents a surface
from being marked browser- or Electron-verified without current runtime
evidence.
