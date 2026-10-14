# On-demand maintenance and security review — 2026-10-14

## Scope and starting state

Base: `0110848ac65282037a96a0d02ce704e86175c397`. Live GitHub main matched;
its CI aggregate, React consumers, CodeQL and Pages deploy checks succeeded.
The repository was not archived. Dependabot alerts returned HTTP 204 (enabled)
and security updates were enabled. Required checks and administrator enforcement
are unchanged. npm latest was read back as 0.1.1, with KaTeX 0.18.7,
rehype-katex 7.0.1 and remark-math 6.0.0 in its runtime manifest.

This change uses a separate clean checkout. The original dirty Home branch was
not stashed, reset, cleaned or merged. A local Git bundle, separate staged and
unstaged binary patches and an archive of 5,406 files preserve source and
available ignored evidence. Restoration into a new directory verified every
file hash/symlink and exact index/worktree status. The 201 referenced temporary
log paths were absent; no reconstruction is claimed. The live-model-choice
checkout was clean and remains intact.

No repository/project-chat automation was found in local configurations. The
existing project chat was not running; no other project's task was changed.
Six existing PRs are parked as documented in [MAINTENANCE.md](../../MAINTENANCE.md).
This is not a UI stage closure, release or completion of reconstruction.

## Advisory analysis and fixes

| Alert | Dependency path and exposure | Fix |
| --- | --- | --- |
| [#32](https://github.com/JaminZhou/codex-ui-kit/security/dependabot/32), high, [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | Vite / PostCSS → source-map-js 1.2.1; build tooling, absent from public package runtime. Indexed source maps can block the event loop. | Override affected versions to 1.2.2. |
| [#31](https://github.com/JaminZhou/codex-ui-kit/security/dependabot/31), medium, [GHSA-hrr3-gc8f-f4qj](https://github.com/fastify/fast-uri/security/advisories/GHSA-hrr3-gc8f-f4qj) | Private app playground → AJV (direct and via app-server client) → fast-uri 3.1.7. Runtime in that playground, absent from public UI package. Host case normalization can be inconsistent. | Raise affected-3.x override to 3.1.8; no client/API or model change. |
| [#33](https://github.com/JaminZhou/codex-ui-kit/security/dependabot/33), low, [GHSA-238p-pmpm-9mq7](https://github.com/KaTeX/KaTeX/security/advisories/GHSA-238p-pmpm-9mq7) | Public package → rehype-katex and remark-math / micromark-extension-math → KaTeX 0.16.45, despite direct 0.18.7. Exploitation requires existing prototype pollution plus attacker-controlled math; KaTeX does not itself create the pollution. | Resolve affected ranges to existing 0.18.7. Bundle lazy math adapters and keep pinned KaTeX external, removing vulnerable adapter ranges from the consumer manifest. |

Upstream latest rehype-katex 7.0.1 and micromark-extension-math 3.1.0 still
require KaTeX `^0.16.0`. A workspace override does not travel with an npm
dependency, so the packaging change is necessary to fix consumers. Full bundled
dependency licenses are generated, shipped and checked. No public API, visual
baseline, threshold, timeout or model setting changes. No alert is dismissed.

## Impact and applicable gates

Affected files: maintenance documentation (`AGENTS.md`, README, CONTRIBUTING,
SECURITY, MAINTENANCE, release notes, research README/delivery-plan notice and
this record); Dependabot config; package/workspace manifests and lockfile;
Vite config and notices; package/release checks; math-consumer script/fixture;
Markdown tests. Affected family: Markdown math, package consumers, build tools
and private playground schema validation.

Required: full `pnpm check`; fresh npm/pnpm packed math consumers with normal
math, inherited-trust attack, resolved graph, audit and notices; React 18/19
consumer matrix; existing Markdown Electron/CDP and pixel regression family.
These are replay/regression checks, not installed-product captures or parity
claims. Schema traces/tests in `pnpm check` cover AJV. The existing isolated
public-runtime compatibility smoke also performs initialization and read-only
thread/model listing; it reports no model turn and no mutating protocol method.
No additional live scenario or paid model turn is needed. Full online
`check:codex-app:acceptance` is not applicable to this maintenance batch.
Push/PR CI, weekly CodeQL, Pages and release workflow files are unchanged.

## Execution results

Execution head: `8c9e6a810c3d0c100ca5bdf1bfca215acb632ae4`; tree:
`87236748bcc473d5e1e8f0b881ddbf3d3c039632`. Node 22.22.2, pnpm 11.7.0.
Final documentation-only descendants reuse this evidence: the 1,648 tracked
non-Markdown files have identical path/content SHA-256
`e80cb3e60d14cc0e5d16e7e2e0a55db022da15ce16cfa109709393d56da742e0`.
Only AGENTS formatting and this validation record changed after execution.

| Command / evidence | Result | Exit |
| --- | --- | --- |
| `pnpm check` (final tree) | Full command passed; 1,476 package tests, 7 Electron-playground tests, 485 app-playground tests; research/type/package/build/browser/a11y/protocol/geometry stages passed. | 0 |
| `pnpm audit --json` | Zero vulnerabilities at all severities. Resolved graph contains only KaTeX 0.18.7, fast-uri 3.1.8, source-map-js 1.2.2 for these packages. | 0 |
| `node scripts/check-math-consumer.mjs <candidate.tgz> npm` | Fresh isolated npm consumer: safe runtime graph, normal MathML, inherited-trust attack blocked, notices present, zero audit findings. One service-endpoint retry was needed. | 0 |
| Same command with `pnpm` | Fresh isolated pnpm consumer, same assertions, zero audit findings. | 0 |
| `node scripts/react-compatibility-smoke.mjs 18.3.1 18.3.1 18.3.27 18.3.7 Bundler --tarball <candidate.tgz>` | React 18 complete export/type/SSR contract. | 0 |
| Same smoke with `19.2.7 19.2.7 19.2.17 19.2.3 Bundler` | React 19 Bundler contract. | 0 |
| Same smoke with `19.2.7 19.2.7 19.2.17 19.2.3 NodeNext` | React 19 NodeNext contract. | 0 |
| `node scripts/check-cdp-contract.mjs --scenes=<Markdown family>` in app playground | All 20 selected lifecycle frames, local Electron/CDP contracts. | 0 |
| `node scripts/check-visual-contract.mjs --scenes=<Markdown family>` in app playground | All 20 selected pixel frames; existing baselines/thresholds unchanged. | 0 |

The exact Markdown family is every `markdown*` ID in `visualScenes` from
`playgrounds/codex-app/scripts/electron-harness.mjs` at the execution tree:

```text
markdown-complete
markdown-current-26-818
markdown-current-26-818-compact
markdown-current-26-820-media
markdown-current-26-820-media-compact
markdown-current-26-825
markdown-current-26-825-compact
markdown-current-26-825-media-loaded
markdown-current-26-825-media-loaded-compact
markdown-current-26-825-media-preview
markdown-current-26-825-media-unavailable
markdown-current-26-825-media-unavailable-compact
markdown-table-actions-hover
markdown-table-actions-narrow
markdown-table-actions-preview
markdown-stream-fence
markdown-stream-table
markdown-stream-large
markdown-stream-tail
markdown-stream-complete
```

The tested archive has 219 entries and SHA-256
`48e8060619a2e80a379f61f3d694952e8514066477ad7d074308698ccd39d3b3`,
SHA-512 integrity
`sha512-qgdUuXX3RtfeJWi/A7kKJ9S3rqJeANRSnYoX6elSBtPgEk6VrhHj7W0vH4jCPOQmNyCLMNOUg+IZjHaWyq+YiA==`.
It was packed from the full-check build, then every archived file was compared
byte-for-byte to the final candidate. Consumers run against these exact bytes;
subsequent test-fixture and documentation edits do not change the archive.
Raw command logs, exit receipts, hashes and replay artifacts remain local.

Diagnostics retained, not relabeled as passes:

- Initial pollution fixture used a non-writable inherited property; making it
  writable matched the advisory and preserved every security assertion.
- The new consumer harness needed an explicit test DOM and ESM import
  resolution for this ESM-only package. Both installers passed after correction.
- npm audit once returned HTTP 400 from its retiring quick-audit endpoint; one
  unchanged retry succeeded. No global registry/proxy/auth setting changed.
- A full check exposed an existing table-copy test race: observing the host
  callback did not imply React had committed the asynchronous `Copied` state.
  Awaiting that same state with the existing default timeout fixed the test;
  no assertion or threshold was removed. The final full command passed.
- Public Pages HTTPS probes twice failed locally at TLS negotiation. GitHub
  Pages configuration and the base deployment check were verified; no public
  HTTP-success claim or global network-setting change is made.

All five workflow files are byte-identical to the base. Existing Home
pixel/calibration failures on the parked branch remain unrelated open evidence.

## Release boundary

A separately authorized patch release is necessary to protect users of the
published math runtime. A source merge or fixed Dependabot alert cannot change
npm 0.1.1. Retain the tested archive and integrity as an unpublished candidate;
do not publish it under the existing version. No version bump, release workflow
dispatch, npm publication or npm deprecation is part of this transition.
