import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readPullRequestMergeStatus, type PullRequestMergeStatus, type PullRequestMergeTarget } from "./git-pr-merge.js";
import { githubRepository } from "./git-pr-preview.js";

const exec = promisify(execFile);
const git = (directory: string, ...args: string[]) => exec("git", args, {
  cwd: directory, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" },
}).then(value => value.stdout.trim());
export interface PullRequestCleanupResult { branch: "main"; head: string; removedBranch: string; remote: string }
async function ref(directory: string, name: string): Promise<string | null> {
  const value = await git(directory, "for-each-ref", "--format=%(refname) %(objectname)", name);
  const line = value.split("\n").find(line => line.startsWith(`${name} `));
  return line ? line.slice(name.length + 1) : null;
}
async function destination(directory: string, remote: string) {
  if (typeof remote !== "string" || !remote || remote.startsWith("-")) throw new Error("Choose a named remote.");
  const urls = (await git(directory, "remote", "get-url", "--push", "--all", remote)).split("\n");
  if (urls.length !== 1 || !urls[0]) throw new Error("Cleanup requires one remote destination.");
  return urls[0];
}

/** Internal Git implementation; callers must first verify this PR on its provider. */
export async function cleanupVerifiedMerge(directory: string, remote: string, url: string, merged: PullRequestMergeStatus): Promise<PullRequestCleanupResult> {
  if (merged.state !== "MERGED" || merged.baseRefName !== "main" || !merged.mergeCommit || !/^[a-f0-9]{40,64}$/.test(merged.mergeCommit)
    || !/^[a-f0-9]{40,64}$/.test(merged.head) || !merged.branch || merged.branch === "main" || merged.branch.startsWith("-")) throw new Error("Only an exact merged PR into main can be cleaned up.");
  const branchRef = `refs/heads/${merged.branch}`;
  const trackingMain = `refs/remotes/${remote}/main`;
  const trackingBranch = `refs/remotes/${remote}/${merged.branch}`;
  for (const name of [branchRef, trackingMain, trackingBranch]) await git(directory, "check-ref-format", name);
  if (await destination(directory, remote) !== url) throw new Error("Remote destination changed. Check it before cleanup.");
  const clean = async () => { if (await git(directory, "status", "--porcelain", "--untracked-files=all")) throw new Error("Working tree is not clean. Preserve your changes before cleanup."); };
  const current = await git(directory, "branch", "--show-current");
  if (!["main", merged.branch].includes(current)) throw new Error("Select main or the exact merged PR branch before cleanup.");
  await clean();
  const localBranch = await ref(directory, branchRef);
  const trackedBranch = await ref(directory, trackingBranch);
  if ((localBranch && localBranch !== merged.head) || (trackedBranch && trackedBranch !== merged.head)) throw new Error("The merged branch has changed. Cleanup will not delete new commits.");
  const remoteBranch = async () => {
    const lines = (await git(directory, "ls-remote", "--refs", "--", url, branchRef)).split("\n").filter(Boolean);
    if (lines.length > 1 || (lines[0] && lines[0].split("\t")[1] !== branchRef)) throw new Error("Ambiguous branch cleanup target.");
    return lines[0]?.split("\t")[0] ?? null;
  };
  const remoteHead = await remoteBranch();
  if (remoteHead && remoteHead !== merged.head) throw new Error("Remote branch has new commits. Cleanup stopped.");
  // Fetch one explicit base ref; do not follow configured fetch refspecs or tags.
  await git(directory, "fetch", "--no-tags", "--no-prune", "--no-recurse-submodules", "--", url, `+refs/heads/main:${trackingMain}`);
  const main = await ref(directory, trackingMain);
  if (!main) throw new Error("Remote main is unavailable.");
  await git(directory, "merge-base", "--is-ancestor", merged.mergeCommit, main);
  const localMain = await ref(directory, "refs/heads/main");
  if (localMain) await git(directory, "merge-base", "--is-ancestor", localMain, main);
  await clean();
  if (localMain) { await git(directory, "switch", "--no-recurse-submodules", "--no-overwrite-ignore", "main"); await git(directory, "-c", "submodule.recurse=false", "merge", "--ff-only", "--no-autostash", "--no-overwrite-ignore", "--no-edit", main); }
  else await git(directory, "switch", "--no-recurse-submodules", "--no-overwrite-ignore", "-c", "main", main);
  await clean();
  if (await git(directory, "branch", "--show-current") !== "main" || await git(directory, "rev-parse", "HEAD") !== main) throw new Error("Main changed during cleanup. Inspect the checkout.");
  const worktrees = await git(directory, "worktree", "list", "--porcelain");
  if (worktrees.split("\n").includes(`branch ${branchRef}`)) throw new Error("Merged branch is checked out in another worktree. It was not deleted.");
  if (await destination(directory, remote) !== url) throw new Error("Remote destination changed during cleanup.");
  if (remoteHead) {
    // Expected-object lease protects a branch recreated or advanced since the read.
    await git(directory, "-c", "push.followTags=false", "-c", "push.pushOption=", "push", "--porcelain", "--no-follow-tags", "--recurse-submodules=no", `--force-with-lease=${branchRef}:${merged.head}`, "--", url, `:${branchRef}`);
  }
  if (await remoteBranch()) throw new Error("Remote branch still exists. Cleanup is incomplete.");
  // Atomic expected-object deletions preserve concurrently advanced refs. They
  // do not discard files, reset history or touch any other branch.
  if (localBranch) await git(directory, "update-ref", "-d", branchRef, merged.head);
  if (trackedBranch) await git(directory, "update-ref", "-d", trackingBranch, merged.head);
  await clean();
  if (await ref(directory, branchRef) || await ref(directory, trackingBranch) || await git(directory, "branch", "--show-current") !== "main"
    || await git(directory, "rev-parse", "HEAD") !== main || await ref(directory, trackingMain) !== main) throw new Error("Cleanup changed concurrently. Inspect local refs before continuing.");
  return { branch: "main", head: main, removedBranch: merged.branch, remote };
}

export async function cleanupMergedPullRequest(directory: string, input: PullRequestMergeTarget & { cleanupConfirmed: boolean }): Promise<PullRequestCleanupResult> {
  if (input.cleanupConfirmed !== true) throw new Error("Explicit branch cleanup confirmation is required.");
  const merged = await readPullRequestMergeStatus(directory, input);
  if (merged.baseRefName !== input.baseRefName) throw new Error("PR base changed. Check the merge target before cleanup.");
  const url = await destination(directory, input.remote);
  if (githubRepository(url) !== input.repository) throw new Error("Project remote changed.");
  return cleanupVerifiedMerge(directory, input.remote, url, merged);
}
