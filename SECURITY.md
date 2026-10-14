# Security policy

## Supported versions

Security fixes are developed against `main` for the latest published release.
Older releases do not have separate maintenance branches. The project is
[maintained on demand](MAINTENANCE.md); security reports, Dependabot alerts and
security updates, push/PR CI, and weekly CodeQL remain enabled. A source fix
does not update an already published package: consumer fixes require a
separately authorized patch release.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for this repository. Do not disclose a suspected vulnerability in a public issue, discussion, or pull request.

Include the affected commit, reproduction steps, impact, and any suggested mitigation. Never include active Codex, OpenAI, GitHub, or third-party credentials.

## Security boundary

Relevant reports include unsafe markup handling, URL or resource handling that creates an unexpected execution path, focus escape from modal surfaces, and package or workflow supply-chain issues.

`AgentMarkdown` does not enable raw HTML. The built-in code highlighter escapes untrusted code. Hosts that provide a custom `CodeHighlighter` returning `html` are responsible for escaping untrusted content before returning it.

The project does not implement authentication, privileged command execution, filesystem access, Codex app-server transport, or private Electron IPC. Report vulnerabilities in upstream projects to their respective maintainers.
