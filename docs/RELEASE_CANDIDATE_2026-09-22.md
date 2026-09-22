# Release candidate audit — 2026-09-22

This is a preparation record for the private `0.1.0` candidate. It does not
authorize changing `private: true`, publishing to npm, creating a tag, or
changing registry credentials.

## Candidate identity

- Audit target: `main` at `46060a721a8e689fa15a792b25ffe3745a0ee03e`
- Package: `codex-ui-kit@0.1.0`
- Package privacy: `private: true`
- Package manager: pnpm 11.7.0
- Candidate command: `pnpm check:release:candidate`
- Packed files: 213
- Runtime exports: 199
- Documented exports: 199
- Tarball bytes: 1,108,103
- Tarball SHA-256: `80b4eb09522f53a9a304c0ba869ff0d0c5b86d8b84b828ae0679c672ddf76791`
- Provenance: dist-only public package; no playground, research, or host
  runtime files

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

The broader root `pnpm check` and playground acceptance evidence remain
separate gates. A later code or package change invalidates this exact-candidate
record and requires a new audit. No publication or registry read-back was
performed.
