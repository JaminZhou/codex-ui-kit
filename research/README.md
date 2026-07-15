# Research policy

This directory records abstract findings used to design `codex-ui-kit`. It does
not contain extracted application files or copied source code.

## Workflow

1. Identify the installed application version and hash the local `app.asar`.
2. Extract the archive only to a temporary directory outside the repository.
3. Inspect package structure, Renderer chunks, CSS token families, semantic DOM
   attributes, interaction states, and representative layout measurements.
4. Write a build note containing observations, not source snippets.
5. Implement components independently against the build note and public API.
6. Delete or replace the temporary extraction when the sampled app updates.

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
