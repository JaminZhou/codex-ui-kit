import { expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pushGitPreview, readGitPushPreview } from "../electron/git-push-preview";

const exec = promisify(execFile);
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-push-"));
  const bare = join(directory, "remote.git");
  const repo = join(directory, "working");
  await exec("git", ["init", "--bare", bare]);
  await exec("git", ["init", "-b", "main", repo]);
  const git = async (...args: string[]) => (await exec("git", args, { cwd: repo })).stdout.trim();
  await git("config", "user.name", "Push Test");
  await git("config", "user.email", "push@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await git("config", "core.hooksPath", ".git/hooks");
  await git("remote", "add", "origin", bare);
  const commit = async (text: string) => {
    await writeFile(join(repo, "file.txt"), `${text}\n`);
    await git("add", "file.txt");
    await git("commit", "-m", text);
  };
  await commit("initial");
  return { repo, bare, git, commit };
}

it("pushes only the reviewed branch even with follow-tags and mirror configured", async () => {
  const { repo, bare, git } = await fixture();
  await git("branch", "unapproved");
  await git("tag", "-a", "unapproved-tag", "-m", "tag");
  await git("config", "push.followTags", "true");
  await git("config", "remote.origin.mirror", "true");
  const preview = await readGitPushPreview(repo, "origin", "reviewed-target");
  expect(preview.remoteHead).toBeNull();
  expect(preview.commitCount).toBe(1);
  expect(await git("ls-remote", "origin")).toBe("");
  await pushGitPreview(repo, "origin", "reviewed-target", preview.fingerprint);
  const refs = (await exec("git", ["--git-dir", bare, "for-each-ref", "--format=%(refname)"])).stdout.trim();
  expect(refs).toBe("refs/heads/reviewed-target");
  const empty = await readGitPushPreview(repo, "origin", "reviewed-target");
  expect(empty.commitCount).toBe(0);
  await expect(pushGitPreview(repo, "origin", "reviewed-target", empty.fingerprint)).rejects.toThrow("Nothing to push");
});

it("rejects changed local commits and remote destinations before pushing", async () => {
  const { repo, git, commit } = await fixture();
  const preview = await readGitPushPreview(repo, "origin");
  await commit("later");
  await expect(pushGitPreview(repo, "origin", "main", preview.fingerprint)).rejects.toThrow("preview changed");
  expect(await git("ls-remote", "origin")).toBe("");
  await git("remote", "set-url", "--add", "--push", "origin", "https://example.invalid/a");
  await git("remote", "set-url", "--add", "--push", "origin", "https://example.invalid/b");
  await expect(readGitPushPreview(repo, "origin")).rejects.toThrow("Exactly one");
});

it("refuses divergent remote history rather than force pushing", async () => {
  const { repo, git, commit } = await fixture();
  const base = await git("rev-parse", "HEAD");
  await commit("remote change");
  const preview = await readGitPushPreview(repo, "origin");
  await pushGitPreview(repo, "origin", "main", preview.fingerprint);
  await git("checkout", "-b", "divergent", base);
  await commit("different change");
  const before = await git("ls-remote", "origin");
  await expect(readGitPushPreview(repo, "origin", "main")).rejects.toThrow();
  expect(await git("ls-remote", "origin")).toBe(before);
});
