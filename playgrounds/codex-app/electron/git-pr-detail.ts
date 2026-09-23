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

export interface GitPullRequestConversationComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  url: string;
}

export interface GitPullRequestReviewThread {
  id: string;
  path: string;
  line: number | null;
  resolved: boolean;
  outdated: boolean;
  comments: Array<GitPullRequestConversationComment & {
    diffHunk: string;
    line: number | null;
  }>;
  totalComments: number;
  hasMoreComments: boolean;
  nextCommentsCursor: string | null;
}

export interface GitPullRequestReview {
  id: string;
  author: string;
  body: string;
  submittedAt: string | null;
  url: string;
  state: string;
}

export interface GitPullRequestConversation {
  number: number;
  headRefOid: string;
  baseRefOid: string;
  comments: GitPullRequestConversationComment[];
  totalComments: number;
  hasMoreComments: boolean;
  nextCommentsCursor: string | null;
  reviews: GitPullRequestReview[];
  totalReviews: number;
  hasMoreReviews: boolean;
  nextReviewsCursor: string | null;
  reviewThreads: GitPullRequestReviewThread[];
  totalReviewThreads: number;
  hasMoreReviewThreads: boolean;
  nextReviewThreadsCursor: string | null;
}

export interface GitPullRequestConversationPageRequest {
  commentsAfter?: string;
  reviewsAfter?: string;
  reviewThreadsAfter?: string;
}

export interface GitPullRequestReviewThreadReplies {
  threadId: string;
  headRefOid: string;
  comments: GitPullRequestReviewThread["comments"];
  totalComments: number;
  hasMoreComments: boolean;
  nextCommentsCursor: string | null;
}

const conversationLimits = Object.freeze({
  comments: 50,
  reviews: 50,
  reviewThreads: 25,
  threadComments: 5,
});

const conversationQuery = [
  "query($owner:String!,$name:String!,$number:Int!,$commentsAfter:String,$reviewsAfter:String,$threadsAfter:String){",
  "repository(owner:$owner,name:$name){",
  "pullRequest(number:$number){",
  "number headRefOid baseRefOid",
  "comments(first:50,after:$commentsAfter){totalCount pageInfo{hasNextPage endCursor} nodes{id body createdAt url author{login}}}",
  "reviews(first:50,after:$reviewsAfter){totalCount pageInfo{hasNextPage endCursor} nodes{id body submittedAt url state author{login}}}",
  "reviewThreads(first:25,after:$threadsAfter){totalCount pageInfo{hasNextPage endCursor} nodes{id path line isResolved isOutdated comments(first:5){totalCount pageInfo{hasNextPage endCursor} nodes{id body createdAt url diffHunk path line author{login}}}}}",
  "}",
  "}",
  "}",
].join("\n");

const threadRepliesQuery = [
  "query($threadId:ID!,$after:String!){",
  "node(id:$threadId){",
  "... on PullRequestReviewThread{",
  "id pullRequest{number headRefOid baseRefOid}",
  "comments(first:5,after:$after){totalCount pageInfo{hasNextPage endCursor} nodes{id body createdAt url diffHunk path line author{login}}}",
  "}",
  "}",
  "}",
].join("\n");

function parseConnection<T>(
  value: unknown,
  limit: number,
  label: string,
  parseNode: (node: unknown) => T,
): { nodes: T[]; totalCount: number; hasNextPage: boolean; endCursor: string | null } {
  if (!value || typeof value !== "object") throw new Error(`Invalid ${label} connection.`);
  const connection = value as Record<string, unknown>;
  const pageInfo = connection.pageInfo as Record<string, unknown> | null;
  const endCursor = pageInfo?.endCursor;
  if (!Array.isArray(connection.nodes) || connection.nodes.length > limit
    || !Number.isSafeInteger(connection.totalCount) || (connection.totalCount as number) < connection.nodes.length
    || !pageInfo || typeof pageInfo.hasNextPage !== "boolean"
    || (endCursor !== null && (typeof endCursor !== "string" || endCursor.length === 0 || endCursor.length > 2_048))
    || (pageInfo.hasNextPage && typeof endCursor !== "string")) {
    throw new Error(`Invalid ${label} connection.`);
  }
  return {
    nodes: connection.nodes.map(parseNode),
    totalCount: connection.totalCount as number,
    hasNextPage: pageInfo.hasNextPage,
    endCursor: endCursor as string | null,
  };
}

function parseConversationBase(node: unknown) {
  if (!node || typeof node !== "object") throw new Error("Invalid PR conversation comment.");
  const value = node as Record<string, unknown>;
  const author = value.author as Record<string, unknown> | null;
  const url = typeof value.url === "string" ? new URL(value.url) : null;
  if (typeof value.id !== "string" || !value.id || value.id.length > 200
    || typeof value.body !== "string" || value.body.length > 20_000
    || !url || url.protocol !== "https:" || url.hostname !== "github.com"
    || (author !== null && author !== undefined && (typeof author.login !== "string" || author.login.length > 100))) {
    throw new Error("Invalid PR conversation comment.");
  }
  return {
    id: value.id,
    author: typeof author?.login === "string" ? author.login : "Deleted user",
    body: value.body,
    url: url.toString(),
  };
}

function parseConversationComment(node: unknown): GitPullRequestConversationComment {
  if (!node || typeof node !== "object") throw new Error("Invalid PR conversation comment.");
  const value = node as Record<string, unknown>;
  if (typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) {
    throw new Error("Invalid PR conversation comment.");
  }
  return { ...parseConversationBase(node), createdAt: value.createdAt };
}

/** Parse a bounded, read-only snapshot of PR comments, reviews, and inline threads. */
export function parsePullRequestConversation(
  raw: string,
  number: number,
  expectedHead: string,
): GitPullRequestConversation {
  const envelope = JSON.parse(raw) as Record<string, unknown>;
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new Error("GitHub could not read PR conversation data.");
  }
  const data = envelope.data as Record<string, unknown> | null;
  const repository = data?.repository as Record<string, unknown> | null;
  const pullRequest = repository?.pullRequest as Record<string, unknown> | null;
  if (!pullRequest || pullRequest.number !== number
    || pullRequest.headRefOid !== expectedHead
    || typeof pullRequest.baseRefOid !== "string" || !/^[a-f0-9]{40,64}$/.test(pullRequest.baseRefOid)) {
    throw new Error("PR head changed or conversation data is unavailable. Refresh details.");
  }
  const comments = parseConnection(
    pullRequest.comments,
    conversationLimits.comments,
    "PR comments",
    parseConversationComment,
  );
  const reviews = parseConnection(
    pullRequest.reviews,
    conversationLimits.reviews,
    "PR reviews",
      (node) => {
        const review = node as Record<string, unknown> | null;
      if (!review || typeof review.state !== "string"
        || !["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"].includes(review.state)
        || (review.submittedAt !== null && (typeof review.submittedAt !== "string" || !Number.isFinite(Date.parse(review.submittedAt))))) {
        throw new Error("Invalid PR review.");
      }
      return { ...parseConversationBase(review), submittedAt: review.submittedAt as string | null, state: review.state };
    },
  );
  const reviewThreads = parseConnection(
    pullRequest.reviewThreads,
    conversationLimits.reviewThreads,
    "PR review threads",
    (node) => {
      const thread = node as Record<string, unknown> | null;
      if (!thread || typeof thread.id !== "string" || !thread.id || thread.id.length > 200
        || typeof thread.path !== "string" || !thread.path || thread.path.length > 4_096
        || (thread.line !== null && (!Number.isSafeInteger(thread.line) || (thread.line as number) < 1))
        || typeof thread.isResolved !== "boolean" || typeof thread.isOutdated !== "boolean") {
        throw new Error("Invalid PR review thread.");
      }
      const commentsInThread = parseConnection(
        thread.comments,
        conversationLimits.threadComments,
        "PR review-thread comments",
        (commentNode) => {
          const commentValue = commentNode as Record<string, unknown> | null;
          if (!commentValue || typeof commentValue.diffHunk !== "string"
            || commentValue.diffHunk.length > 20_000
            || (commentValue.line !== null && (!Number.isSafeInteger(commentValue.line) || (commentValue.line as number) < 1))) {
            throw new Error("Invalid PR review-thread comment.");
          }
          return {
            ...parseConversationComment(commentValue),
            diffHunk: commentValue.diffHunk,
            line: commentValue.line as number | null,
          };
        },
      );
      return {
        id: thread.id,
        path: thread.path,
        line: thread.line as number | null,
        resolved: thread.isResolved,
        outdated: thread.isOutdated,
        comments: commentsInThread.nodes,
        totalComments: commentsInThread.totalCount,
        hasMoreComments: commentsInThread.hasNextPage,
        nextCommentsCursor: commentsInThread.endCursor,
      };
    },
  );
  return {
    number,
    headRefOid: expectedHead,
    baseRefOid: pullRequest.baseRefOid,
    comments: comments.nodes,
    totalComments: comments.totalCount,
    hasMoreComments: comments.hasNextPage,
    nextCommentsCursor: comments.endCursor,
    reviews: reviews.nodes,
    totalReviews: reviews.totalCount,
    hasMoreReviews: reviews.hasNextPage,
    nextReviewsCursor: reviews.endCursor,
    reviewThreads: reviewThreads.nodes,
    totalReviewThreads: reviewThreads.totalCount,
    hasMoreReviewThreads: reviewThreads.hasNextPage,
    nextReviewThreadsCursor: reviewThreads.endCursor,
  };
}

/** Read-only GitHub conversation data for the current branch's exact PR head. */
export async function readGitPullRequestConversation(
  directory: string,
  remote: string,
  number: number,
  expectedHead: string,
  page: GitPullRequestConversationPageRequest = {},
): Promise<GitPullRequestConversation> {
  if (!Number.isSafeInteger(number) || number < 1 || !/^[a-f0-9]{40,64}$/.test(expectedHead)) {
    throw new Error("Select a valid current PR revision.");
  }
  const preview = await readGitPullRequestPreview(directory, remote);
  const selected = preview.pullRequests.find((pr) => pr.number === number);
  if (!selected || selected.headRefOid !== expectedHead) {
    throw new Error("Refresh and select the current PR revision.");
  }
  for (const cursor of Object.values(page)) {
    if (cursor !== undefined && (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 2_048 || /[\0\r\n]/.test(cursor))) {
      throw new Error("Select a valid PR conversation page cursor.");
    }
  }
  const before = await readGitPullRequestDetail(directory, remote, number);
  if (before.headRefOid !== expectedHead) throw new Error("PR head changed. Refresh details before reading conversation.");
  const [owner, name] = preview.repository.split("/");
  const args = [
    "api", "graphql", "-f", `query=${conversationQuery}`,
    "-F", `owner=${owner}`, "-F", `name=${name}`, "-F", `number=${number}`,
  ];
  if (page.commentsAfter !== undefined) args.push("-f", `commentsAfter=${page.commentsAfter}`);
  if (page.reviewsAfter !== undefined) args.push("-f", `reviewsAfter=${page.reviewsAfter}`);
  if (page.reviewThreadsAfter !== undefined) args.push("-f", `threadsAfter=${page.reviewThreadsAfter}`);
  const { stdout } = await promisify(execFile)("gh", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const conversation = parsePullRequestConversation(stdout, number, expectedHead);
  const after = await readGitPullRequestDetail(directory, remote, number);
  if (after.headRefOid !== before.headRefOid || after.baseRefOid !== before.baseRefOid
    || conversation.baseRefOid !== before.baseRefOid) {
    throw new Error("PR changed while reading conversation. Refresh details again.");
  }
  return conversation;
}

/** Read one bounded page of replies after confirming thread ownership and PR head. */
export async function readGitPullRequestReviewThreadReplies(
  directory: string,
  remote: string,
  number: number,
  expectedHead: string,
  threadId: string,
  after: string,
): Promise<GitPullRequestReviewThreadReplies> {
  if (!Number.isSafeInteger(number) || number < 1 || !/^[a-f0-9]{40,64}$/.test(expectedHead)
    || typeof threadId !== "string" || !threadId || threadId.length > 512
    || typeof after !== "string" || !after || after.length > 2_048 || /[\0\r\n]/.test(after)) {
    throw new Error("Select a valid current PR thread page.");
  }
  const preview = await readGitPullRequestPreview(directory, remote);
  const selected = preview.pullRequests.find((pr) => pr.number === number);
  if (!selected || selected.headRefOid !== expectedHead) {
    throw new Error("Refresh and select the current PR revision.");
  }
  const before = await readGitPullRequestDetail(directory, remote, number);
  if (before.headRefOid !== expectedHead) throw new Error("PR head changed. Refresh details before reading thread replies.");
  const { stdout } = await promisify(execFile)("gh", [
    "api", "graphql", "-f", `query=${threadRepliesQuery}`,
    "-f", `threadId=${threadId}`, "-f", `after=${after}`,
  ], {
    cwd: directory,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, GH_PROMPT_DISABLED: "1" },
  });
  const envelope = JSON.parse(stdout) as Record<string, unknown>;
  if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
    throw new Error("GitHub could not read PR review-thread replies.");
  }
  const data = envelope.data as Record<string, unknown> | null;
  const node = data?.node as Record<string, unknown> | null;
  const parent = node?.pullRequest as Record<string, unknown> | null;
  if (!node || node.id !== threadId || !parent || parent.number !== number
    || parent.headRefOid !== expectedHead || parent.baseRefOid !== before.baseRefOid) {
    throw new Error("PR thread changed or does not belong to the selected revision.");
  }
  const comments = parseConnection(
    node.comments,
    conversationLimits.threadComments,
    "PR review-thread comments",
    (commentNode) => {
      const commentValue = commentNode as Record<string, unknown> | null;
      if (!commentValue || typeof commentValue.diffHunk !== "string"
        || commentValue.diffHunk.length > 20_000
        || (commentValue.line !== null && (!Number.isSafeInteger(commentValue.line) || (commentValue.line as number) < 1))) {
        throw new Error("Invalid PR review-thread comment.");
      }
      return {
        ...parseConversationComment(commentValue),
        diffHunk: commentValue.diffHunk,
        line: commentValue.line as number | null,
      };
    },
  );
  const afterDetail = await readGitPullRequestDetail(directory, remote, number);
  if (afterDetail.headRefOid !== before.headRefOid || afterDetail.baseRefOid !== before.baseRefOid) {
    throw new Error("PR changed while reading thread replies. Refresh again.");
  }
  return {
    threadId,
    headRefOid: expectedHead,
    comments: comments.nodes,
    totalComments: comments.totalCount,
    hasMoreComments: comments.hasNextPage,
    nextCommentsCursor: comments.endCursor,
  };
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
