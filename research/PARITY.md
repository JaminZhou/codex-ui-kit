# Coverage and parity policy

This document no longer claims that the repository has complete Codex Desktop
parity. The previous matrix covered a selected conversation sample and could
not establish full conversation, workspace, application, or product coverage.

The authoritative current-build inventory is:

- [`26.721.41059.md`](26.721.41059.md) for the current package facts, scoped
  CDP revalidation, and research boundary;
- [`26.715.72359.md`](26.715.72359.md) for the previous build's broader
  historical runtime sample;
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
  `com.openai.codex`. User-authorized CDP probes revalidated current-build
  access, the main-shell target shape, a de-identified Projects entry/list,
  the new-chat destination/context split, Project and Local environment
  overlays, and a disposable synthetic task's basic thread lifecycle. They did
  not expose private project contents, Remote behavior, real cancellation
  results, or the broader command, queue, Markdown, panel, menu, global-route,
  and Settings states; those remain historical evidence from `26.715.72359`
  until sampled again.
- Renderer viewport probing exposed a narrow-layout gap: the thread and
  Composer shrink, but the fixed app sidebar remains and the right workspace
  panel can be laid out beyond the simulated viewport. The independently
  implemented current-thread shell is now Browser- and Electron-verified at
  its measured wide and compact geometry, but native Codex window behavior and
  the remaining app-shell/panel interactions stay separate acceptance
  requirements.
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

H5 and Electron are used continuously as functional acceptance surfaces. The
current thread slice now has scenario-driven, main-only completed and
streaming raster fixtures with independent selectors, ownership masks, and
regional PNG diff thresholds. The references remain build-scoped external
evidence rather than redistributed application assets.

Broader final visual optimization remains scheduled after the remaining
inventory, page compositions, and state transitions stabilize. A passing
thread scenario must not be generalized to unobserved routes or states.
