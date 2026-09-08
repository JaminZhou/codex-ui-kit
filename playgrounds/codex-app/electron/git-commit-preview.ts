import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const exec = promisify(execFile);
export interface GitCommitPreview {
  branch: string | null;
  head: string | null;
  stagedPatch: string;
  stagedFiles: string[];
  hasUnstagedChanges: boolean;
  hasUntrackedFiles: boolean;
  fingerprint: string;
}

/** Explicit local commit only; preserve Git hooks and never stage or push. */
export async function commitGitPreview(directory: string, fingerprint: string, message: string): Promise<{ head: string }> {
  if (!/^[a-f0-9]{64}$/.test(fingerprint) || !message.trim() || message.length > 10000 || message.includes("\0")) {
    throw new Error("Review staged changes and provide a commit message.");
  }
  const preview = await readGitCommitPreview(directory);
  if (preview.fingerprint !== fingerprint) throw new Error("Git changed since the preview. Refresh and review again.");
  if (!preview.branch) throw new Error("Select a branch before committing.");
  if (!preview.stagedFiles.length) throw new Error("There are no staged changes to commit.");
  // Ordinary Git locking/hooks apply. The host queue serializes our own Git actions;
  // it cannot prevent another application from modifying this repository.
  await exec("git", ["commit", "-m", message.trim()], {
    cwd: directory, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  const { stdout } = await exec("git", ["rev-parse", "--verify", "HEAD"], { cwd: directory, encoding: "utf8", timeout: 30000 });
  return { head: stdout.trim() };
}

/** Read-only preview of the actual index. Never auto-stage or discard changes. */
export async function readGitCommitPreview(directory: string): Promise<GitCommitPreview> {
  const git = async (...args: string[]) => (await exec("git", args, {
    cwd: directory, encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  })).stdout;
  if ((await git("rev-parse", "--is-inside-work-tree")).trim() !== "true") throw new Error("Select a Git working tree.");
  const inspectHead = async () => {
    const branch = (await git("branch", "--show-current")).trim() || null;
    // Empty repositories have an unborn symbolic HEAD, not a commit.
    const head = (await git("rev-parse", "--verify", "--quiet", "HEAD").catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 1) return "";
      throw error;
    })).trim() || null;
    return { branch, head };
  };
  const before = await inspectHead();
  if ((await git("ls-files", "--unmerged", "-z")).length) throw new Error("Resolve merge conflicts before preparing a commit.");
  const stagedPatch = await git("diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-textconv", "--no-color");
  const stagedFiles = (await git("diff", "--cached", "--name-only", "-z", "--no-ext-diff")).split("\0").filter(Boolean);
  const hasUnstagedChanges = (await git("diff", "--name-only", "-z", "--no-ext-diff")).length > 0;
  const hasUntrackedFiles = (await git("ls-files", "--others", "--exclude-standard", "-z")).length > 0;
  const after = await inspectHead();
  const verifiedPatch = await git("diff", "--cached", "--binary", "--full-index", "--no-ext-diff", "--no-textconv", "--no-color");
  if (JSON.stringify(before) !== JSON.stringify(after) || stagedPatch !== verifiedPatch) throw new Error("Git changed while preparing the preview. Refresh and review again.");
  return { ...after, stagedPatch, stagedFiles, hasUnstagedChanges, hasUntrackedFiles,
    fingerprint: createHash("sha256").update(JSON.stringify([after.branch, after.head, stagedPatch])).digest("hex") };
}
