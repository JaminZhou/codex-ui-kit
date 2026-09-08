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
    || !count(value.changedFiles) || !Array.isArray(value.files) || value.files.length > value.changedFiles
    || value.files.some((file: { path?: unknown; additions?: unknown; deletions?: unknown } | null) => !file || typeof file.path !== "string" || !count(file.additions) || !count(file.deletions))) {
    throw new Error("Invalid PR detail response.");
  }
  return { number: value.number, url: value.url, title: value.title, body: value.body, state: value.state, baseRefName: value.baseRefName,
    headRefOid: value.headRefOid, changedFiles: value.changedFiles, files: value.files.map((file: GitPullRequestDetail["files"][number]) => ({ path: file.path, additions: file.additions, deletions: file.deletions })) };
}

/** Read only a PR discovered for this trusted project's same-repository branch. */
export async function readGitPullRequestDetail(directory: string, remote: string, number: number): Promise<GitPullRequestDetail> {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Select a valid PR.");
  const preview = await readGitPullRequestPreview(directory, remote);
  const selected = preview.pullRequests.find(pr => pr.number === number);
  if (!selected) throw new Error("Refresh and select a PR belonging to the current branch.");
  const { stdout } = await promisify(execFile)("gh", ["pr", "view", String(number), "--repo", `github.com/${preview.repository}`, "--json", "number,url,title,body,state,baseRefName,headRefOid,changedFiles,files"], {
    cwd: directory, encoding: "utf8", timeout: 30000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const detail = parsePullRequestDetail(stdout, preview.repository, number);
  if (detail.headRefOid !== selected.headRefOid) throw new Error("PR changed while reading details. Refresh again.");
  return detail;
}
