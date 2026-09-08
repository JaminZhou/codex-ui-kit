import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { githubRepository } from "./git-pr-preview.js";
import { readGitPullRequestDetail } from "./git-pr-detail.js";

const exec = promisify(execFile);
export interface PullRequestMergeTarget {
  remote: string; repository: string; number: number; head: string;
  baseRefName: string; baseRefOid: string;
}
export interface PullRequestMergeStatus {
  number: number; url: string; state: "OPEN" | "CLOSED" | "MERGED";
  head: string; branch: string; baseRefName: string; baseRefOid: string;
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN"; mergeCommit: string | null;
}

/** Read the exact target even after GitHub deletes its head branch. No CI polling. */
export async function readPullRequestMergeStatus(directory: string, target: PullRequestMergeTarget): Promise<PullRequestMergeStatus> {
  if (!Number.isSafeInteger(target.number) || target.number < 1 || typeof target.head !== "string" || !/^[a-f0-9]{40,64}$/.test(target.head)
    || typeof target.remote !== "string" || !target.remote || target.remote.startsWith("-")) throw new Error("Select a valid PR merge target.");
  const { stdout: urls } = await exec("git", ["remote", "get-url", "--push", "--all", target.remote], { cwd: directory, encoding: "utf8", timeout: 10000, maxBuffer: 65536 });
  const destinations = urls.trim().split("\n");
  if (destinations.length !== 1 || githubRepository(destinations[0]) !== target.repository) throw new Error("PR repository changed. Refresh the PR preview.");
  const { stdout } = await exec("gh", ["pr", "view", String(target.number), "--repo", `github.com/${target.repository}`, "--json", "number,url,state,headRefName,headRefOid,baseRefName,baseRefOid,mergeCommit,mergeable"], {
    cwd: directory, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const value = JSON.parse(stdout);
  if (!value || value.number !== target.number || value.url !== `https://github.com/${target.repository}/pull/${target.number}`
    || value.headRefOid !== target.head || typeof value.headRefName !== "string" || !value.headRefName
    || typeof value.baseRefName !== "string" || typeof value.baseRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(value.baseRefOid)
    || !["OPEN", "CLOSED", "MERGED"].includes(value.state) || !["MERGEABLE", "CONFLICTING", "UNKNOWN"].includes(value.mergeable)
    || (value.state === "MERGED" && !/^[a-f0-9]{40,64}$/.test(value.mergeCommit?.oid ?? ""))) throw new Error("PR identity or merge result changed. Verify it on GitHub.");
  return { number: value.number, url: value.url, state: value.state, head: value.headRefOid, branch: value.headRefName,
    baseRefName: value.baseRefName, baseRefOid: value.baseRefOid, mergeable: value.mergeable, mergeCommit: value.state === "MERGED" ? value.mergeCommit.oid : null };
}

/** User-confirmed admin squash only; never enables auto-merge or edits protection. */
export async function mergePullRequest(directory: string, input: PullRequestMergeTarget & { adminConfirmed: boolean }): Promise<PullRequestMergeStatus> {
  if (input.adminConfirmed !== true) throw new Error("Explicit administrator merge confirmation is required.");
  const before = await readGitPullRequestDetail(directory, input.remote, input.number);
  if (before.state !== "OPEN" || before.url !== `https://github.com/${input.repository}/pull/${input.number}` || before.headRefOid !== input.head
    || before.baseRefName !== input.baseRefName || before.baseRefOid !== input.baseRefOid) throw new Error("PR changed. Read details and confirm the new target.");
  const ready = await readPullRequestMergeStatus(directory, input);
  if (ready.state !== "OPEN" || ready.mergeable !== "MERGEABLE" || ready.baseRefName !== input.baseRefName || ready.baseRefOid !== input.baseRefOid) throw new Error("PR is conflicting, changed or not yet known to be mergeable. Refresh before confirming.");
  // GitHub enforces the exact expected head at the mutation boundary. Base checks
  // above are optimistic; they are not a transaction against external writers.
  try {
    await exec("gh", ["pr", "merge", String(input.number), "--repo", `github.com/${input.repository}`, "--admin", "--squash", "--match-head-commit", input.head], {
      cwd: directory, encoding: "utf8", timeout: 60000, maxBuffer: 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
    });
  } catch {
    // The command may have merged before losing its response. Reconcile once,
    // never repeat a mutation merely because its response was lost.
  }
  const after = await readPullRequestMergeStatus(directory, input);
  if (after.state !== "MERGED" || after.baseRefName !== input.baseRefName) throw new Error("Merge was not verified. Check the result before trying again.");
  return after;
}
