import { expect, it } from "vitest";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanupVerifiedMerge } from "../electron/git-pr-cleanup";
import type { PullRequestMergeStatus } from "../electron/git-pr-merge";

const exec = promisify(execFile);
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-cleanup-"));
  const repo = join(directory, "working"); const bare = join(directory, "remote.git");
  await exec("git", ["init", "--bare", bare]); await exec("git", ["init", "-b", "main", repo]);
  const git = async (...args: string[]) => (await exec("git", args, { cwd: repo })).stdout.trim();
  await git("config", "user.name", "Cleanup Test"); await git("config", "user.email", "cleanup@example.invalid");
  await git("config", "commit.gpgsign", "false"); await git("config", "core.hooksPath", ".git/hooks");
  await git("remote", "add", "origin", bare);
  const commit = async (text: string) => { await writeFile(join(repo, "file.txt"), text); await git("add", "file.txt"); await git("commit", "-m", text); };
  await commit("initial"); const base = await git("rev-parse", "HEAD");
  await git("push", "-u", "origin", "main"); await git("branch", "untouched");
  await git("switch", "-c", "feat/example"); await commit("feature"); const head = await git("rev-parse", "HEAD");
  await git("push", "-u", "origin", "feat/example");
  await git("switch", "main"); await git("merge", "--squash", "feat/example"); await git("commit", "-m", "squash merge");
  const mergeCommit = await git("rev-parse", "HEAD"); await git("push", "origin", "main");
  await git("switch", "feat/example"); await git("update-ref", "refs/heads/main", base, mergeCommit);
  const merged: PullRequestMergeStatus = { number: 1, url: "https://github.com/owner/repo/pull/1", state: "MERGED", head, branch: "feat/example", baseRefName: "main", baseRefOid: base, mergeable: "UNKNOWN", mergeCommit };
  return { directory, repo, bare, git, commit, merged, base };
}
it("fast-forwards main and removes only exact merged refs, including an idempotent retry", async () => {
  const { repo, bare, git, merged, base } = await fixture();
  await git("config", "remote.origin.mirror", "true"); await git("config", "push.followTags", "true");
  await git("tag", "-a", "untouched-tag", "-m", "not authorized");
  expect(await cleanupVerifiedMerge(repo, "origin", bare, merged)).toEqual({ branch: "main", head: merged.mergeCommit, removedBranch: "feat/example", remote: "origin" });
  expect(await git("status", "--porcelain")).toBe(""); expect(await git("branch", "--show-current")).toBe("main");
  expect(await git("rev-parse", "HEAD", "origin/main")).toBe(`${merged.mergeCommit}\n${merged.mergeCommit}`);
  expect(await git("rev-parse", "untouched")).toBe(base);
  expect(await git("for-each-ref", "--format=%(refname)", "refs/heads/feat/example", "refs/remotes/origin/feat/example")).toBe("");
  expect(await git("ls-remote", "--heads", bare)).toBe(`${merged.mergeCommit}\trefs/heads/main`);
  expect(await git("ls-remote", "--tags", bare)).toBe("");
  expect(await cleanupVerifiedMerge(repo, "origin", bare, merged)).toMatchObject({ branch: "main" });
});
it("accepts GitHub's prior head deletion and never deletes advanced local or remote heads", async () => {
  const { repo, bare, git, commit, merged } = await fixture();
  await commit("new local work");
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow("changed");
  await git("push", "origin", "feat/example");
  const newer = await git("rev-parse", "HEAD");
  await git("switch", "main"); await git("update-ref", "refs/heads/feat/example", merged.head, newer);
  await git("update-ref", "refs/remotes/origin/feat/example", merged.head, newer);
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow("new commits");
  expect(await git("ls-remote", bare, "refs/heads/feat/example")).toBe(`${newer}\trefs/heads/feat/example`);
  await git("push", "origin", "--delete", "feat/example");
  expect(await cleanupVerifiedMerge(repo, "origin", bare, merged)).toMatchObject({ branch: "main" });
});
it("preserves dirty files and rejects unrelated checkout, divergent main and unmerged targets", async () => {
  const { repo, bare, git, commit, merged } = await fixture();
  await writeFile(join(repo, "untracked.txt"), "keep this");
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow("not clean");
  await git("add", "untracked.txt"); await git("commit", "-m", "preserved work");
  await git("switch", "untouched");
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow("exact merged");
  await git("switch", "main"); await commit("divergent main");
  const changedFeature = await git("rev-parse", "feat/example");
  await git("update-ref", "refs/heads/feat/example", merged.head, changedFeature);
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow();
  expect(await git("branch", "--show-current")).toBe("main");
  expect(await git("ls-remote", bare, "refs/heads/feat/example")).toBe(`${merged.head}\trefs/heads/feat/example`);
  await expect(cleanupVerifiedMerge(repo, "origin", bare, { ...merged, state: "OPEN" })).rejects.toThrow("exact merged");
});
it("does not delete a branch in another worktree", async () => {
  const { directory, repo, bare, git, merged } = await fixture();
  await git("switch", "main"); await git("worktree", "add", join(directory, "other-worktree"), "feat/example");
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow("another worktree");
  expect(await git("rev-parse", "feat/example")).toBe(merged.head);
  expect(await git("ls-remote", bare, "refs/heads/feat/example")).toBe(`${merged.head}\trefs/heads/feat/example`);
});
it("preserves ignored local files that a remote main update would overwrite", async () => {
  const { repo, bare, git, merged } = await fixture();
  await git("switch", "-c", "remote-update", merged.mergeCommit!);
  await writeFile(join(repo, "ignored.txt"), "remote content"); await git("add", "ignored.txt"); await git("commit", "-m", "remote file");
  await git("push", "origin", "HEAD:refs/heads/main"); await git("switch", "feat/example");
  await writeFile(join(repo, ".git/info/exclude"), "ignored.txt\n"); await writeFile(join(repo, "ignored.txt"), "KEEP LOCAL IGNORED");
  expect(await git("status", "--porcelain")).toBe("");
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow();
  expect(await readFile(join(repo, "ignored.txt"), "utf8")).toBe("KEEP LOCAL IGNORED");
  expect(await git("ls-remote", bare, "refs/heads/feat/example")).toBe(`${merged.head}\trefs/heads/feat/example`);
});
it("uses a lease to preserve a remote head advanced during cleanup", async () => {
  const { repo, bare, git, commit, merged } = await fixture();
  await git("switch", "-c", "preserved-work"); await commit("concurrent work"); const newer = await git("rev-parse", "HEAD");
  await git("push", "origin", "preserved-work"); await git("switch", "feat/example");
  const hook = join(repo, ".git/hooks/pre-push");
  await writeFile(hook, `#!/bin/sh\ngit --git-dir='${bare}' update-ref refs/heads/feat/example ${newer} ${merged.head}\n`);
  await chmod(hook, 0o755);
  await expect(cleanupVerifiedMerge(repo, "origin", bare, merged)).rejects.toThrow();
  expect(await git("ls-remote", bare, "refs/heads/feat/example")).toBe(`${newer}\trefs/heads/feat/example`);
  expect(await git("rev-parse", "feat/example")).toBe(merged.head);
});
