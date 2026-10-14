# 0.1.2 security patch preparation — 2026-10-14

## Scope

Base: `3b61dad5e08aeacd8a27c547e20a5bf1f129e53d` (security maintenance
PR #673). Prepare the previously fixed public math runtime for npm users.
Affected files are `package.json`, `docs/RELEASE_NOTES.md`,
`docs/NPM_PUBLISHING.md`, `.github/workflows/npm-release-candidate.yml` and
this record. There are no component, stylesheet, dependency resolution or
public API changes in this preparation.

The candidate workflow now starts `pnpm check` under the same `xvfb-run`
virtual display already used by CI. The command includes Electron geometry
checks, which require a display on the hosted Linux runner. No publish job,
OIDC permission, environment restriction, assertion or timeout is changed.

The original Home checkout and existing feature/dependency PRs remain parked.
No installed-product capture or paid model conversation was started. The full
online `pnpm check:codex-app:acceptance` command was not run; the checks below
must not be represented as its exit 0. Publication and its validation-scope
decision are separate from this preparation record.

## Local execution

Execution head: `1d1c6efbc3be451c1e4aecdb88968c51722ad11b`; tree:
`97aad5813fe678349b4523b2e76dc9034c4e7894`. Node 22.22.2, pnpm 11.7.0.
The only descendant change is this Markdown record; execution inputs remain
content-identical.

| Command | Result | Exit |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Unchanged resolved dependency graph. | 0 |
| `VITEST_MAX_WORKERS=2 pnpm check` | Full research, types, tests, package, build, browser, accessibility, Electron and playground checks passed. | 0 |
| `pnpm audit --json` | Zero findings at every severity. | 0 |
| `RELEASE_VERSION=0.1.2 RELEASE_SHA=1d1c6efbc3be451c1e4aecdb88968c51722ad11b node scripts/release-pack.mjs` | One archive passed npm React 18/Bundler, React 19/Bundler, React 19/NodeNext and pnpm React 19/NodeNext consumers. | 0 |
| `node scripts/check-math-consumer.mjs <same-archive> npm` | Normal MathML, inherited-trust regression, bundled licenses and safe runtime graph; zero audit findings. | 0 |
| Same math consumer with `pnpm` | Same security and rendering assertions; zero audit findings. | 0 |

The first unbounded-worker `pnpm check` failed with four 5-second timeouts in
existing Git integration tests during high host load. The two affected files
then passed all 10 tests in isolation. Reducing only per-process test-worker
concurrency allowed the complete command to pass. No source, assertion or
timeout was changed to obtain the pass. Initial failure and retry logs are
retained outside the public repository.

The local archive contains 219 files, SHA-256
`c53fb592bfdc2e6fc8c2ac37a8971df81337b33c5547a7d644d5dcf2f3d9a8e3`,
integrity
`sha512-6DBJedWujE2EXGwZF4QBHH7njycVt2PCycsW/aJfwDhrv4IhXI4S+j2J5/oRlg3eQvhOodh/Zz+6x5bEuJci6g==`.
Every file was compared to the tested archive recorded in
[the maintenance validation](maintenance-security-2026-10-14.md). Only
`package/package.json` differs, solely in version 0.1.1 → 0.1.2. Runtime JS,
CSS, declarations, README and licenses are byte-identical. The existing
20-scene Markdown CDP/Electron and pixel evidence therefore remains applicable
regression evidence; it is not new installed-product or global parity evidence.

## Release and alert read-back

The local archive is preparation evidence, not the publish artifact. The
unchanged protected publishing flow requires successful CI for the exact
merged main, including all macOS CDP/Electron/pixel shards, then a canonical
main candidate run. Download and verify that run's immutable archive, run
its math consumers, publish those exact bytes once through OIDC, and verify
registry integrity plus fresh npm/pnpm registry consumers. Any failure remains
a gate; never retry a possibly accepted publication blindly.

The GitHub alert page's last dependency scan was still 2026-10-09. The official
Refresh Dependabot alerts action was requested once. Live API read-back then
reported #31, #32 and #33 as `fixed` at 2026-10-14 15:37:39–40 UTC, with
`dismissed_at: null` for all three. The page showed zero open alerts. This
resolves the stale dependency-graph boundary from the maintenance record;
it does not update the already published npm 0.1.1.
