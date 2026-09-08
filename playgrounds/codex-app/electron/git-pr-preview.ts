import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readGitPushPreview } from "./git-push-preview.js";

const exec = promisify(execFile);

/** Resolve the exact public GitHub repository, never infer from another remote. */
export function githubRepository(destination: string): string {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(destination);
  if (!match || [match[1], match[2]].some(part => part === "." || part === ".." || part.startsWith("-"))) {
    throw new Error("Select an unambiguous github.com repository remote.");
  }
  return `${match[1]}/${match[2]}`;
}

export interface GitPullRequestPreview {
  repository: string;
  branch: string;
  head: string;
  fingerprint: string;
  pullRequests: Array<{ number: number; url: string; title: string; headRefOid: string; baseRefName: string }>;
}

export function parsePullRequests(raw: string, repository: string): GitPullRequestPreview["pullRequests"] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid GitHub pull request response.");
  return value.map(item => {
    if (!item || typeof item !== "object" || !Number.isSafeInteger(item.number) || item.number < 1
      || item.url !== `https://github.com/${repository}/pull/${item.number}`
      || typeof item.title !== "string" || typeof item.baseRefName !== "string" || typeof item.isCrossRepository !== "boolean"
      || typeof item.headRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(item.headRefOid)) {
      throw new Error("Invalid GitHub pull request response.");
    }
    return item.isCrossRepository ? null : { number: item.number, url: item.url, title: item.title, headRefOid: item.headRefOid, baseRefName: item.baseRefName };
  }).filter((item): item is GitPullRequestPreview["pullRequests"][number] => item !== null);
}

/** Read existing PRs only after the selected branch is confirmed pushed. No CI/review polling. */
export async function readGitPullRequestPreview(directory: string, remote: string): Promise<GitPullRequestPreview> {
  const push = await readGitPushPreview(directory, remote);
  if (push.remoteHead !== push.head) throw new Error("Push the current branch before preparing its pull request.");
  const repository = githubRepository(push.destination);
  const { stdout } = await exec("gh", ["pr", "list", "--repo", `github.com/${repository}`, "--head", push.branch,
    "--state", "open", "--limit", "100", "--json", "number,url,title,headRefOid,baseRefName,isCrossRepository"], {
    cwd: directory, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const verified = await readGitPushPreview(directory, remote);
  if (verified.fingerprint !== push.fingerprint) throw new Error("Branch changed while reading PRs. Refresh again.");
  const pullRequests = parsePullRequests(stdout, repository);
  const snapshot = { repository, branch: push.branch, head: push.head, pullRequests };
  return { ...snapshot, fingerprint: createHash("sha256").update(JSON.stringify([remote, push.fingerprint, snapshot])).digest("hex") };
}

export interface CreatePullRequestInput {
  remote: string;
  fingerprint: string;
  base: string;
  title: string;
  body: string;
}

export function pullRequestCreateArgs(preview: GitPullRequestPreview, input: CreatePullRequestInput): string[] {
  if (!input.title.trim() || input.title.length > 256 || input.body.length > 65000 || [input.title, input.body, input.base].some(value => value.includes("\0"))) throw new Error("Provide a valid PR title, body and base branch.");
  if (!input.base || input.base === preview.branch || input.base.startsWith("-") || /[\s~^:?*\[\\]/.test(input.base) || input.base.includes("..") || input.base.includes("@{")) throw new Error("Choose a different valid base branch.");
  if (preview.fingerprint !== input.fingerprint) throw new Error("PR preview changed. Refresh before creating.");
  if (preview.pullRequests.length) throw new Error("An open PR already exists for this branch. Refresh and use it instead.");
  // REST creation does not stage/push/fork or change repository configuration.
  return ["api", "--hostname", "github.com", "--method", "POST", `repos/${preview.repository}/pulls`, "-f", `head=${preview.branch}`, "-f", `base=${input.base}`, "-f", `title=${input.title.trim()}`, "-f", `body=${input.body}`];
}

export async function createGitPullRequest(directory: string, input: CreatePullRequestInput): Promise<{ number: number; url: string }> {
  const preview = await readGitPullRequestPreview(directory, input.remote);
  const args = pullRequestCreateArgs(preview, input);
  const { stdout } = await exec("gh", args, { cwd: directory, encoding: "utf8", timeout: 60000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" } });
  const result = JSON.parse(stdout);
  if (!Number.isSafeInteger(result.number) || result.number < 1 || result.html_url !== `https://github.com/${preview.repository}/pull/${result.number}`) throw new Error("Creation outcome is uncertain. Refresh PRs before retrying.");
  return { number: result.number, url: result.html_url };
}
