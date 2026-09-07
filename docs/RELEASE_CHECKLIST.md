# First public package release checklist

Status: preparation only. `package.json` remains `private: true`; this checklist
does not authorize an npm publication, tag, credential change, or account setup.
Package readiness and complete Codex product reconstruction are separate claims.

## Candidate record

Before checking any item, record the exact commit, proposed version, Node/pnpm
versions, packed artifact digest, and links to that candidate's validation.
A new commit invalidates candidate-specific evidence until it is rechecked.
Unrun or unavailable checks stay open, not implicitly passed.

- [ ] Freeze root runtime exports against `scripts/public-runtime-exports.mjs`.
- [ ] Review generated public declarations and `docs/COMPONENTS.md` together;
  document controlled state, callbacks, defaults, and host-owned effects.
- [ ] Document the root ESM import and both stylesheet entrypoints, with a
  minimal host example. Private CSS structure is not an API.
- [ ] Write release notes with additions, fixes, known limitations, and migration
  examples for changed props, state shapes, exports, or public CSS tokens.
- [ ] Apply the pre-1.0 version policy in `COMPATIBILITY.md`. Do not describe
  previous-build pixel evidence as current product parity.

## Verification against the candidate

- [ ] Frozen install and complete `pnpm check` exit 0.
- [ ] Complete `pnpm check:codex-app:acceptance` exits 0 after `pnpm check`,
  not concurrently with a build writing the same output directories.
- [ ] Packed React 18/Bundler, React 19/Bundler, and React 19/NodeNext consumers
  pass the matrix in `.github/workflows/ci.yml`, including runtime export and
  server-render checks. Check exact revisions, not an earlier green run.
- [ ] Review accessibility's manual/indeterminate findings and keyboard/focus
  behavior; a passing automated scan alone is not a complete accessibility audit.
- [ ] Confirm supported browser claims with actual browser evidence. Chromium
  acceptance does not by itself verify Safari or Firefox behavior.
- [ ] Verify sandboxed Electron consumers and public App Server boundary.
  Replay acceptance is not proof of a successful live local coding workflow.

## Artifact and provenance review

- [ ] Build and inspect the actual tarball, not only `dist/`. Record its SHA-256
  and file list; test installation from that same tarball in a clean consumer.
- [ ] Confirm required JavaScript, declarations, lazy chunks, styles, README,
  license, and package metadata are present, using `scripts/check-package.mjs`.
- [ ] Confirm no research captures, credentials, private IPC, proprietary assets,
  app-server/Electron host code, or development fixtures are included. Follow
  `SOURCES.md`; a package file allowlist does not prove source provenance.
- [ ] Review runtime dependency advisories and licenses; record unresolved
  issues and their impact rather than equating successful installation with safety.

## Separate publication decision

- [ ] Obtain explicit approval for the named version and candidate artifact.
- [ ] In a reviewed release change, remove `private: true` and update the
  foundation-only version/privacy assertions in `scripts/check-package.mjs`
  consistently. Do not simply disable package validation.
- [ ] Re-run the candidate checks and inspect the final tarball after that
  change; earlier artifact digests no longer identify the release candidate.
- [ ] Verify registry destination, package ownership, tag, and release notes
  before the separately authorized publish action.
- [ ] Verify registry version, integrity, exports, CSS, and clean consumer install
  after publication. Record how consumers can pin the previous version if a
  regression is discovered; do not rely on deletion as a rollback strategy.

No boxes are pre-completed here: each requires evidence attached to the actual
release candidate. Full reconstruction still follows `research/DELIVERY_PLAN.md`.
