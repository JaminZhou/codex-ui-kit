# On-demand maintenance

Effective 2026-10-14, this project is maintained on demand for security issues
and concrete user needs. New feature expansion, continuous synchronization
with the official Codex interface, and ongoing pixel replication are paused.
There is no promise of a release cadence or coverage of new official UI.
Finishing the historical reconstruction plan is not a prerequisite for pausing.

## Retained capabilities

- Existing npm releases and the GitHub Pages demo remain available.
- Push/PR CI, weekly CodeQL, Dependabot alerts and security updates remain on.
- Release workflows and permissions remain available; publishing requires a
  separate release instruction. A merge does not update npm consumers.
- Routine npm and GitHub Actions version PR creation is paused with
  `open-pull-requests-limit: 0` for both ecosystems. Security updates use a
  separate limit ([GitHub reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#open-pull-requests-limit)).
  The configuration is retained so version updates can be resumed deliberately.
- Historical research, inventory and failures remain evidence at their stated
  build/date. They are not a promise to complete stages 0–7 or keep observing
  each new installed build.

## Retained work at the transition

| Work | Disposition |
| --- | --- |
| `feat/current-home-interactions` | Parked intact: staged, unstaged and untracked Home, model-menu, geometry, Electron and acceptance work. Existing pixel/calibration failures remain failures. A verified local backup preserves source, index state and available ignored evidence. |
| [#669](https://github.com/JaminZhou/codex-ui-kit/pull/669), `feat/live-model-choice` | Open, retained for an explicit future decision. No feature merge is required for maintenance mode. |
| [#650](https://github.com/JaminZhou/codex-ui-kit/pull/650), [#652](https://github.com/JaminZhou/codex-ui-kit/pull/652), [#670](https://github.com/JaminZhou/codex-ui-kit/pull/670), [#671](https://github.com/JaminZhou/codex-ui-kit/pull/671), [#672](https://github.com/JaminZhou/codex-ui-kit/pull/672) | Existing routine dependency PRs remain open. None is merged or closed merely to clear the backlog. In particular, the direct KaTeX version bump does not remove the math adapters' vulnerable transitive range. |

No Codex automation associated with this repository or its existing project
chat was found in the local automation configuration on 2026-10-14. No other
project's automation was changed. Resume any parked work only with an explicit
request and re-evaluate its scope and evidence first.

Local recovery instructions and raw evidence are kept outside the public
repository. Missing temporary logs are recorded as missing, never converted
to passing evidence. The safety review and validation record are in
[`research/validation/maintenance-security-2026-10-14.md`](research/validation/maintenance-security-2026-10-14.md).
