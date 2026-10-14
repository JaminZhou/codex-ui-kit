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
claims. Schema traces/tests in `pnpm check` cover AJV. No live public-protocol
request or paid model turn is necessary. Full online
`check:codex-app:acceptance` is not applicable to this maintenance batch.
Push/PR CI, weekly CodeQL, Pages and release workflow files are unchanged.

## Execution results

Exact tree, commands and terminal exit codes are recorded after execution.
Initial targeted regression failed because the fixture made inherited `trust`
non-writable, preventing normal assignment. Making pollution writable matches
the advisory; assertions were retained. Targeted Markdown then passed 30/30.
The failed diagnostic log is retained. Workspace audit reported zero
vulnerabilities at all severities.

## Release boundary

A separately authorized patch release is necessary to protect users of the
published math runtime. A source merge or fixed Dependabot alert cannot change
npm 0.1.1. Retain the tested archive and integrity as an unpublished candidate;
do not publish it under the existing version. No version bump, release workflow
dispatch, npm publication or npm deprecation is part of this transition.
