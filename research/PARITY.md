# Coverage and parity policy

This document no longer claims that the repository has complete Codex Desktop
parity. The previous matrix covered a selected conversation sample and could
not establish full conversation, workspace, application, or product coverage.

The authoritative current-build inventory is:

- [`26.715.72359.md`](26.715.72359.md) for the sampled package facts and
  research boundary;
- [`UI_INVENTORY.md`](UI_INVENTORY.md) for classification, evidence levels,
  priorities, and delivery order;
- [`ui-inventory.json`](ui-inventory.json) for machine-checked surface status;
- [`RUNTIME_CAPTURE.md`](RUNTIME_CAPTURE.md) for the required runtime flow and
  state evidence.

## Current conclusion

- Existing React primitives cover parts of the message, activity, composer,
  resource, approval, overlay, and thread-navigation vocabulary.
- The showcase proves only those implemented examples; it is not a complete
  Codex conversation or application reconstruction.
- The Electron playground validates the current package in a desktop
  BrowserWindow; it does not prove parity with unobserved product routes,
  panels, state transitions, or window types.
- Computer Use exploration is blocked by the environment safety policy for
  `com.openai.codex`. A user-authorized CDP sample provides scoped runtime
  evidence for a blank project chat, command success/failure/long-output,
  queue and stop states, Markdown content, Sources and terminal panels,
  portalled menus, Review and Environment panels, global PR/Sites/Scheduled/
  Plugins/Skills routes, and selected Settings sections; all other package
  candidates remain runtime-unobserved.
- Renderer viewport probing exposed a narrow-layout gap: the thread and
  Composer shrink, but the fixed app sidebar remains and the right workspace
  panel can be laid out beyond the simulated viewport. Native Electron window
  resizing remains a separate acceptance requirement.
- npm publication remains out of scope until the agreed P0/P1 coverage and
  release acceptance surfaces are complete.

## Completion gate

A surface can be described as verified only when all applicable evidence
exists:

1. The current installed build and package fingerprint are recorded.
2. The surface is reached in the running application through an allowed
   observation method.
3. Its ownership, trigger, lifecycle, composition, states, and responsive
   behavior are recorded.
4. A protocol-neutral implementation exists with behavioral and accessibility
   tests.
5. The H5 acceptance flow matches the observation.
6. The Electron acceptance flow matches the observation.
7. Related surfaces and cross-layer transitions have been checked together.

Passing `pnpm check` means the implemented repository contracts are healthy.
It does not expand the observed product denominator and must not be reported as
product-level parity.

## Visual optimization

H5 and Electron are used continuously as functional acceptance surfaces.
Final visual optimization is deliberately scheduled after the inventory,
component contracts, page compositions, and state transitions stabilize.
This avoids polishing a narrow or soon-to-be-replaced structure.
