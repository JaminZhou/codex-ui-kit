import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";

const exec = promisify(execFile);
function git(directory: string, ...args: string[]) {
  return exec("git", args, {
    cwd: directory, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" },
  }).then(result => result.stdout);
}

export interface GitPushPreview {
  remote: string;
  destination: string;
  branch: string;
  target: string;
  head: string;
  remoteHead: string | null;
  commits: string[];
  commitCount: number;
  fingerprint: string;
}

/** Contact only the explicitly selected remote; never fetch or mutate refs. */
export async function readGitPushPreview(directory: string, remote: string, target?: string): Promise<GitPushPreview> {
  const remotes = (await git(directory, "remote")).trim().split("\n");
  if (!remote || remote.startsWith("-") || !remotes.includes(remote)) throw new Error("Select an existing named remote.");
  const branch = (await git(directory, "branch", "--show-current")).trim();
  if (!branch) throw new Error("Select a branch before pushing.");
  const targetBranch = target ?? branch;
  await git(directory, "check-ref-format", `refs/heads/${targetBranch}`);
  const head = (await git(directory, "rev-parse", "--verify", "HEAD")).trim();
  const urls = (await git(directory, "remote", "get-url", "--push", "--all", remote)).trim().split("\n");
  if (urls.length !== 1 || !urls[0] || urls[0].startsWith("-")) throw new Error("Exactly one push destination is required.");
  const destination = urls[0];
  // Avoid displaying embedded HTTP credentials in the renderer or logs.
  if (/^https?:\/\/[^/]*@/i.test(destination)) throw new Error("Use a credential helper instead of credentials embedded in the remote URL.");
  const targetRef = `refs/heads/${targetBranch}`;
  const lines = (await git(directory, "ls-remote", "--refs", "--", destination, targetRef)).trim().split("\n").filter(Boolean);
  const matching = lines.map(line => line.split("\t")).filter(([, ref]) => ref === targetRef);
  if (matching.length > 1) throw new Error("Ambiguous remote branch.");
  const remoteHead = matching[0]?.[0] ?? null;
  if (remoteHead) {
    // Missing remote objects or divergence require an explicit user fetch/reconcile,
    // not an implicit fetch, merge, reset, or force push.
    await git(directory, "merge-base", "--is-ancestor", remoteHead, head);
  }
  const range = remoteHead ? `${remoteHead}..${head}` : head;
  const commitCount = Number((await git(directory, "rev-list", "--count", range)).trim());
  const commits = (await git(directory, "log", "--format=%H %s", "-100", range)).trim().split("\n").filter(Boolean);
  if ((await git(directory, "rev-parse", "HEAD")).trim() !== head || (await git(directory, "branch", "--show-current")).trim() !== branch) {
    throw new Error("Local branch changed. Refresh the push preview.");
  }
  const snapshot = { remote, destination, branch, target: targetBranch, head, remoteHead, commits, commitCount };
  return { ...snapshot, fingerprint: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
}

/** Push exactly the reviewed object to one branch, without force or implicit tags. */
export async function pushGitPreview(directory: string, remote: string, target: string, fingerprint: string): Promise<{ head: string; target: string }> {
  const preview = await readGitPushPreview(directory, remote, target);
  if (preview.fingerprint !== fingerprint) throw new Error("Push preview changed. Refresh and confirm again.");
  if (!preview.commitCount) throw new Error("Nothing to push.");
  await git(directory, "-c", "push.followTags=false", "-c", "push.pushOption=", "push", "--porcelain", "--no-follow-tags", "--recurse-submodules=no", "--", preview.destination, `${preview.head}:refs/heads/${preview.target}`);
  return { head: preview.head, target: preview.target };
}
