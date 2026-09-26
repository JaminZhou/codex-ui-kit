# Release notes

This file records public-package changes. Registry publication is a separate
step from building or merging the reviewed source.

## 0.1.1 README correction (unpublished candidate)

- Correct the npm package README to reflect registry availability without
  hard-coding a version that will become stale at the next release.
- No runtime API, dependency, or stylesheet changes from 0.1.0.
- Registry availability is established only after this candidate's own
  publication read-back succeeds.

## 0.1.0 foundation (published 2026-09-26)

### Added

- Public controlled surfaces for settings, environments, remote connections,
  scheduled tasks, sites, login/onboarding, PDF previews, plugin/skill detail,
  workspace recovery, terminal notices, Composer permissions/resources, and
  thread-summary docking.
- Current 26.915 settings recovery contracts for Personalization, Appearance,
  Git, Hooks, and Code review, including loading/error/retry and preference
  transitions at wide and compact widths.
- Protocol-neutral callback contracts for loading, retry, error, empty,
  running, completed, and unavailable states.
- React 18/19, SSR/NodeNext, Electron, accessibility, Browser/CDP, and
  deterministic pixel-gate coverage documented in
  [`COMPATIBILITY.md`](../COMPATIBILITY.md) and
  [`COMPONENTS.md`](COMPONENTS.md).

### Migration guidance

The package remains pre-1.0. Hosts should treat all public prop and state
shapes as versioned contracts and keep transport effects outside the kit. A
typical host mapping looks like this:

```tsx
import {
  RemoteConnectionsPage,
  ScheduledTaskDetail,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";

<RemoteConnectionsPage
  connections={connections}
  formOpen={editorOpen}
  formValue={draft}
  onChangeForm={setDraft}
  onSave={saveConnection}
  onTest={testConnection}
/>;
```

Every callback is an intent boundary: the host validates, persists, performs
network/filesystem/account work, and feeds the resulting controlled state back
to the component. The kit does not ship App Server, Electron IPC, credentials,
OAuth, SSH, Noise relay, GitHub, billing, or file-decoding clients.

### Known limitations

- Codex Desktop reconstruction evidence is build-scoped and separated from
  public package readiness. Replay and playground evidence is not a claim of
  installed-product parity or provider authentication.
- Host-supplied brand artwork, fonts, credentials, private IPC, and extracted
  application resources are intentionally excluded from the package.
- Browser support is limited to the evergreen Chromium/Safari/Firefox target
  described in [`COMPATIBILITY.md`](../COMPATIBILITY.md); Electron acceptance
  does not replace host browser QA.

### Provenance and audit

The candidate audit is `pnpm check:release:candidate`. It builds a temporary
tarball, checks the runtime export list and required files, rejects playground,
research, fixture, source, and credential paths, and prints a digest. It never
publishes or changes package privacy. A release PR must attach that output and
the complete `pnpm check` plus
`pnpm check:codex-app:acceptance` results for the exact candidate commit.
