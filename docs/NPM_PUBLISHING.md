# npm and GitHub release flow

The package name is `codex-ui-kit`; the first authorized release target is
`0.1.0` on npm's public `latest` tag. This is an independently written partial
React UI foundation, not a complete Codex Desktop reconstruction. Publishing
is manual. Pushes, PRs, tags, Pages deployment and CI cannot publish.

## 1. Prepare an exact candidate

Merge a reviewed release change to protected `main`, then wait for the exact
commit's required CI, including all macOS acceptance shards, to pass. Dispatch:

```bash
gh workflow run npm-release-candidate.yml --ref main -f version=0.1.0
```

The candidate workflow verifies the current `main` and CI, checks npm version
availability, runs `pnpm check`, packs once and tests that archive in fresh npm
React 18/19 and pnpm React 19 consumers. It retains only the tarball and
`release-evidence.json` for 14 days. Its summary prints the full source SHA,
version, run ID and SHA-512 integrity. Download and retain those exact bytes;
any source change or expired artifact requires a new candidate. Never publish
a rebuilt local archive under the same approval.

## 2. Bootstrap the first release

npm requires the package to exist before a trusted publisher can be configured.
The first release therefore uses a one-time interactive npm account login and
publishes the **downloaded, verified candidate tarball** locally. There is no
GitHub `NPM_TOKEN` or automation-token fallback. This step requires the package
owner to complete npm's login and two-factor prompts. Do not store credentials
in the repository or an Actions secret.

Download the candidate artifact to `candidate/`. Verify it against the four
values in the candidate run summary:

```bash
RELEASE_VERSION=0.1.0 RELEASE_SHA=FULL_SOURCE_SHA \
RELEASE_INTEGRITY=sha512-APPROVED_INTEGRITY CANDIDATE_RUN_ID=RUN_ID \
  node scripts/trusted-release.mjs artifact

RELEASE_VERSION=0.1.0 RELEASE_SHA=FULL_SOURCE_SHA \
  node scripts/trusted-release.mjs before
```

After npm login and ownership are confirmed, publish exactly that archive
**once**:

```bash
npm publish candidate/codex-ui-kit-0.1.0.tgz \
  --tag latest --access public --registry=https://registry.npmjs.org/ --ignore-scripts
```

Then perform registry read-back using the same four environment values as the
artifact check:

```bash
RELEASE_VERSION=0.1.0 RELEASE_SHA=FULL_SOURCE_SHA \
RELEASE_INTEGRITY=sha512-APPROVED_INTEGRITY CANDIDATE_RUN_ID=RUN_ID \
  node scripts/trusted-release.mjs after
```

Run the exact-version npm and pnpm registry consumer checks with
`RELEASE_INTEGRITY` set to that same value. A publish error or timeout does not
prove npm did not accept the archive: inspect registry metadata and the run
evidence before any further write. Never blindly retry `npm publish`, unpublish
the version, or move `latest` as a recovery shortcut.

## 3. Bind subsequent releases to GitHub OIDC

After `0.1.0` exists, configure the GitHub environment `npm-publish` to allow
only the `main` **branch**. In the npm package's Trusted Publishing settings,
add GitHub Actions with these exact values:

| Field | Value |
| --- | --- |
| Organization or user | `JaminZhou` |
| Repository | `codex-ui-kit` |
| Workflow filename | `npm-publish.yml` |
| Environment | `npm-publish` |
| Allowed action | Direct `npm publish` |

Complete npm's required account verification. The workflow uses a GitHub-hosted
runner, Node 22.22.2, npm 11.6.2, and `id-token: write` only in its publish job.
An npm account-side setting is not proof of a working OIDC exchange; that can
only be proven by an actual later release.

For each later version, prepare a candidate as above and dispatch
`npm-publish.yml` on `main` with its exact `version`, `source_sha`,
`candidate_run_id`, and `integrity`. Verification and fresh consumer jobs have
no OIDC permission. The publish job downloads the same artifact ID, checks
current `main`, CI and registry state again, publishes once, then compares npm
metadata and downloaded bytes. An existing version, moved `main`, missing CI,
failed candidate, changed digest or an unregistered first package fails closed.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
