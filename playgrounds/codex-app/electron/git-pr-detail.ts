import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readGitPullRequestPreview } from "./git-pr-preview.js";

export interface GitPullRequestDetail {
  number: number;
  url: string;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  baseRefName: string;
  baseRefOid: string;
  headRefOid: string;
  changedFiles: number;
  files: Array<{ path: string; additions: number; deletions: number }>;
}

export function parsePullRequestDetail(raw: string, repository: string, number: number): GitPullRequestDetail {
  const value = JSON.parse(raw);
  const count = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  if (!value || value.number !== number || value.url !== `https://github.com/${repository}/pull/${number}`
    || typeof value.title !== "string" || typeof value.body !== "string" || typeof value.baseRefName !== "string"
    || !["OPEN", "CLOSED", "MERGED"].includes(value.state) || typeof value.headRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(value.headRefOid)
    || typeof value.baseRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(value.baseRefOid)
    || !count(value.changedFiles) || !Array.isArray(value.files) || value.files.length > value.changedFiles
    || value.files.some((file: { path?: unknown; additions?: unknown; deletions?: unknown } | null) => !file || typeof file.path !== "string" || !count(file.additions) || !count(file.deletions))) {
    throw new Error("Invalid PR detail response.");
  }
  return { number: value.number, url: value.url, title: value.title, body: value.body, state: value.state, baseRefName: value.baseRefName,
    baseRefOid: value.baseRefOid, headRefOid: value.headRefOid, changedFiles: value.changedFiles, files: value.files.map((file: GitPullRequestDetail["files"][number]) => ({ path: file.path, additions: file.additions, deletions: file.deletions })) };
}

/** Read only a PR discovered for this trusted project's same-repository branch. */
export async function readGitPullRequestDetail(directory: string, remote: string, number: number): Promise<GitPullRequestDetail> {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Select a valid PR.");
  const preview = await readGitPullRequestPreview(directory, remote);
  const selected = preview.pullRequests.find(pr => pr.number === number);
  if (!selected) throw new Error("Refresh and select a PR belonging to the current branch.");
  const { stdout } = await promisify(execFile)("gh", ["pr", "view", String(number), "--repo", `github.com/${preview.repository}`, "--json", "number,url,title,body,state,baseRefName,baseRefOid,headRefOid,changedFiles,files"], {
    cwd: directory, encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const detail = parsePullRequestDetail(stdout, preview.repository, number);
  if (detail.headRefOid !== selected.headRefOid) throw new Error("PR changed while reading details. Refresh again.");
  return detail;
}

export interface GitPullRequestDiff { number: number; head: string; patch: string }

export interface EditPullRequestInput {
  remote: string;
  number: number;
  title: string;
  body: string;
  expected: Pick<GitPullRequestDetail, "title" | "body" | "headRefOid" | "baseRefName" | "baseRefOid">;
}

/** Explicit metadata-only edit. Optimistic revalidation is not a server-side lock. */
export async function editGitPullRequest(directory: string, input: EditPullRequestInput): Promise<GitPullRequestDetail> {
  if (typeof input.title !== "string" || typeof input.body !== "string" || !input.title.trim()
    || input.title.length > 256 || input.body.length > 65000 || /\0/.test(input.title + input.body)) throw new Error("Provide a valid PR title and description.");
  const before = await readGitPullRequestDetail(directory, input.remote, input.number);
  const keys = ["title", "body", "headRefOid", "baseRefName", "baseRefOid"] as const;
  if (before.state !== "OPEN" || !input.expected || keys.some(key => before[key] !== input.expected[key])) throw new Error("PR changed. Refresh details before confirming edits.");
  const title = input.title.trim();
  if (title === before.title && input.body === before.body) throw new Error("No PR edits to save.");
  const repository = before.url.split("/").slice(3, 5).join("/");
  await promisify(execFile)("gh", ["pr", "edit", String(input.number), "--repo", `github.com/${repository}`, "--title", title, "--body", input.body], {
    cwd: directory, encoding: "utf8", timeout: 60000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const after = await readGitPullRequestDetail(directory, input.remote, input.number);
  if (after.state !== "OPEN" || after.title !== title || after.body !== input.body
    || after.headRefOid !== before.headRefOid || after.baseRefName !== before.baseRefName || after.baseRefOid !== before.baseRefOid) throw new Error("Edit outcome changed or is uncertain. Refresh before another edit.");
  return after;
}

/** Read GitHub's patch without checking out or modifying the working tree. */
export async function readGitPullRequestDiff(directory: string, remote: string, number: number, expectedHead: string): Promise<GitPullRequestDiff> {
  const before = await readGitPullRequestDetail(directory, remote, number);
  if (before.headRefOid !== expectedHead) throw new Error("PR head changed. Refresh details before reading the diff.");
  const repository = before.url.split("/").slice(3, 5).join("/");
  const { stdout } = await promisify(execFile)("gh", ["pr", "diff", String(number), "--repo", `github.com/${repository}`, "--color", "never"], {
    cwd: directory, encoding: "utf8", timeout: 60000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const after = await readGitPullRequestDetail(directory, remote, number);
  if (after.headRefOid !== before.headRefOid || after.baseRefName !== before.baseRefName || after.baseRefOid !== before.baseRefOid) throw new Error("PR changed while reading the diff. Refresh again.");
  return { number, head: after.headRefOid, patch: stdout };
}
