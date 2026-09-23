import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readGitHubRepository } from "./git-pr-preview.js";

const exec = promisify(execFile);

export type PullRequestHistoryFilter = "open" | "closed" | "all";
export type PullRequestHistoryState = "OPEN" | "CLOSED" | "MERGED";

export interface GitPullRequestHistoryItem {
  number: number;
  url: string;
  title: string;
  state: PullRequestHistoryState;
  headRefOid: string;
  baseRefName: string;
  updatedAt: string;
  author: string;
}

export interface GitPullRequestHistoryPage {
  repository: string;
  filter: PullRequestHistoryFilter;
  items: GitPullRequestHistoryItem[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export const pullRequestHistoryPageSize = 30;

const stateQuery: Record<PullRequestHistoryFilter, string> = {
  open: "[OPEN]",
  closed: "[CLOSED,MERGED]",
  all: "[OPEN,CLOSED,MERGED]",
};

function validFilter(value: unknown): value is PullRequestHistoryFilter {
  return value === "open" || value === "closed" || value === "all";
}

function parseHistoryState(value: unknown): PullRequestHistoryState {
  if (value !== "OPEN" && value !== "CLOSED" && value !== "MERGED") {
    throw new Error("Invalid pull request history state.");
  }
  return value;
}

/** Parse one bounded same-repository GraphQL page; bodies and diffs are deliberately excluded. */
export function parsePullRequestHistoryPage(
  raw: string,
  repositoryName: string,
  filter: PullRequestHistoryFilter,
): Omit<GitPullRequestHistoryPage, "repository" | "filter"> {
  const envelope = JSON.parse(raw) as Record<string, unknown>;
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new Error("GitHub could not read pull request history.");
  }
  const data = envelope.data as Record<string, unknown> | null;
  const repository = data?.repository as Record<string, unknown> | null;
  const connection = repository?.pullRequests as Record<string, unknown> | null;
  const pageInfo = connection?.pageInfo as Record<string, unknown> | null;
  const cursor = pageInfo?.endCursor;
  if (!connection || !Array.isArray(connection.nodes) || connection.nodes.length > pullRequestHistoryPageSize
    || !Number.isSafeInteger(connection.totalCount) || (connection.totalCount as number) < connection.nodes.length
    || !pageInfo || typeof pageInfo.hasNextPage !== "boolean"
    || (cursor !== null && (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 2_048 || /[\0\r\n]/.test(cursor)))
    || (pageInfo.hasNextPage && typeof cursor !== "string")) {
    throw new Error("Invalid pull request history page.");
  }

  const items = connection.nodes.map((node: unknown): GitPullRequestHistoryItem => {
    if (!node || typeof node !== "object") throw new Error("Invalid pull request history item.");
    const value = node as Record<string, unknown>;
    const state = parseHistoryState(value.state);
    const author = value.author as Record<string, unknown> | null;
    if (!Number.isSafeInteger(value.number) || (value.number as number) < 1
      || value.url !== `https://github.com/${repositoryName}/pull/${value.number}`
      || typeof value.title !== "string" || value.title.length > 1_000
      || typeof value.headRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(value.headRefOid)
      || typeof value.baseRefName !== "string" || value.baseRefName.length > 255
      || typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))
      || (author !== null && author !== undefined && (typeof author.login !== "string" || author.login.length > 100))) {
      throw new Error("Invalid pull request history item.");
    }
    if (filter === "open" && state !== "OPEN") throw new Error("GitHub returned an item outside the open filter.");
    if (filter === "closed" && state === "OPEN") throw new Error("GitHub returned an item outside the closed filter.");
    return {
      number: value.number as number,
      url: value.url as string,
      title: value.title,
      state,
      headRefOid: value.headRefOid,
      baseRefName: value.baseRefName,
      updatedAt: value.updatedAt,
      author: typeof author?.login === "string" ? author.login : "Deleted user",
    };
  });

  return {
    items,
    totalCount: connection.totalCount as number,
    hasMore: pageInfo.hasNextPage,
    nextCursor: pageInfo.hasNextPage ? cursor as string : null,
  };
}

/** Read project-wide PR history independent of the current branch; no GitHub writes or CI polling. */
export async function readGitPullRequestHistory(
  directory: string,
  remote: string,
  filter: PullRequestHistoryFilter,
  after?: string,
): Promise<GitPullRequestHistoryPage> {
  if (!validFilter(filter)) throw new Error("Choose a valid pull request history filter.");
  if (after !== undefined && (typeof after !== "string" || !after || after.length > 2_048 || /[\0\r\n]/.test(after))) {
    throw new Error("Choose a valid pull request history cursor.");
  }
  const resolved = await readGitHubRepository(directory, remote);
  const [owner, name] = resolved.repository.split("/");
  const query = [
    "query($owner:String!,$name:String!,$after:String){",
    `repository(owner:$owner,name:$name){pullRequests(first:${pullRequestHistoryPageSize},after:$after,states:${stateQuery[filter]},orderBy:{field:UPDATED_AT,direction:DESC}){totalCount pageInfo{hasNextPage endCursor} nodes{number url title state headRefOid baseRefName updatedAt author{login}}}}`,
    "}",
  ].join("\n");
  const args = ["api", "graphql", "-f", `query=${query}`, "-F", `owner=${owner}`, "-F", `name=${name}`];
  if (after !== undefined) args.push("-f", `after=${after}`);
  const { stdout } = await exec("gh", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const page = parsePullRequestHistoryPage(stdout, resolved.repository, filter);
  if (after !== undefined && page.hasMore && page.nextCursor === after) {
    throw new Error("GitHub did not advance the pull request history cursor. Refresh the list before retrying.");
  }
  const verified = await readGitHubRepository(directory, remote);
  if (verified.repository !== resolved.repository || verified.destination !== resolved.destination) {
    throw new Error("Project GitHub remote changed while reading PR history. Refresh again.");
  }
  return { repository: resolved.repository, filter, ...page };
}
