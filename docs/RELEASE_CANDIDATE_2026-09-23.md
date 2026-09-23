# Release candidate audit — 2026-09-23

This is a preparation record for the private `0.1.0` candidate. It does not
authorize changing `private: true`, publishing to npm, creating a tag, or
changing registry credentials.

## Candidate identity

- Audit target: `main` at `2fe4f131a4ee774bbf900883866401e2b328a3cc`
- Candidate commit: `docs: refresh release candidate audit (#601)`
- Package: `codex-ui-kit@0.1.0`
- Package privacy: `private: true`
- Node: `v22.22.2`
- pnpm: `11.7.0`
- Candidate command: `pnpm check:release:candidate`
- Packed files: `213`
- Runtime exports: `199`
- Documented exports: `199`
- Tarball bytes: `1,108,103`
- Tarball SHA-256: `80b4eb09522f53a9a304c0ba869ff0d0c5b86d8b84b828ae0679c672ddf76791`
- Provenance: dist-only public package; no playground, research, or host
  runtime files

The package contract and tarball provenance check passed for this exact
candidate. The check never publishes, changes package privacy, or leaves a
tarball in the repository.

## Compatibility evidence

The exact candidate passed all three consumer commands used by the CI matrix:

```text
node scripts/react-compatibility-smoke.mjs 18.3.1 18.3.1 18.3.27 18.3.7 Bundler
React 18.3.1 / Bundler compatibility ok: codex-ui-kit@0.1.0

node scripts/react-compatibility-smoke.mjs 19.2.7 19.2.7 19.2.17 19.2.3 Bundler
React 19.2.7 / Bundler compatibility ok: codex-ui-kit@0.1.0

node scripts/react-compatibility-smoke.mjs 19.2.7 19.2.7 19.2.17 19.2.3 NodeNext
React 19.2.7 / NodeNext compatibility ok: codex-ui-kit@0.1.0
```

The root `pnpm check` and complete App Server acceptance are required again
after this candidate-record commit; the fast-mode workflow runs them locally
before merge and does not wait for bot review or remote CI.

## Publication boundary

The package remains private and unpublished. A separate explicit release
decision is still required before changing privacy, versioning, registry
destination, credentials, tags, or publication state. The reconstruction
evidence in `research/` is not package provenance and is not included in the
packed artifact.
