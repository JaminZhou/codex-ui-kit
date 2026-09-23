import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exec: vi.fn(), preview: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.exec }));
vi.mock("../electron/git-pr-preview.js", () => ({ readGitPullRequestPreview: mocks.preview }));
import { editGitPullRequest, parsePullRequestConversation, parsePullRequestDetail, readGitPullRequestConversation, readGitPullRequestDiff } from "../electron/git-pr-detail";

const detail = { number: 1, url: "https://github.com/owner/repo/pull/1", title: "Example", body: "Untrusted **body**", state: "OPEN", baseRefName: "main", baseRefOid: "b".repeat(40), headRefOid: "a".repeat(40), changedFiles: 2, files: [{ path: "a file.ts", additions: 1, deletions: 0 }] };
beforeEach(() => {
  mocks.exec.mockReset(); mocks.preview.mockReset();
  mocks.preview.mockResolvedValue({ repository: "owner/repo", pullRequests: [detail] });
});
function responses(after = detail, failure = false) {
  let reads = 0;
  mocks.exec.mockImplementation((_command, args, _options, callback) => {
    if (args[1] === "diff") callback(failure ? new Error("maxBuffer exceeded") : null, { stdout: "diff --git a/a b/a\n+example" });
    else callback(null, { stdout: JSON.stringify(reads++ ? after : detail) });
  });
}
it("reads a same-branch diff with bounded output and verifies both revisions", async () => {
  responses();
  expect(await readGitPullRequestDiff("/project", "origin", 1, detail.headRefOid)).toEqual({ number: 1, head: detail.headRefOid, patch: "diff --git a/a b/a\n+example" });
  expect(mocks.exec.mock.calls[1].slice(0, 2)).toEqual(["gh", ["pr", "diff", "1", "--repo", "github.com/owner/repo", "--color", "never"]]);
  expect(mocks.exec.mock.calls[1][2]).toMatchObject({ cwd: "/project", timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  expect(mocks.preview).toHaveBeenCalledTimes(2);
});
it("rejects stale heads, changed bases, unavailable output and unrelated PRs", async () => {
  responses();
  await expect(readGitPullRequestDiff("/project", "origin", 1, "c".repeat(40))).rejects.toThrow("head changed");
  expect(mocks.exec).toHaveBeenCalledTimes(1);
  for (const after of [{ ...detail, baseRefOid: "c".repeat(40) }, { ...detail, baseRefName: "release" }, { ...detail, headRefOid: "c".repeat(40) }]) {
    responses(after);
    await expect(readGitPullRequestDiff("/project", "origin", 1, detail.headRefOid)).rejects.toThrow(/changed/);
  }
  responses(detail, true);
  await expect(readGitPullRequestDiff("/project", "origin", 1, detail.headRefOid)).rejects.toThrow("maxBuffer");
  mocks.preview.mockResolvedValue({ repository: "owner/repo", pullRequests: [] });
  await expect(readGitPullRequestDiff("/project", "origin", 1, detail.headRefOid)).rejects.toThrow("current branch");
});
it("preserves file totals when the provider returns a partial file list", () => {
  expect(parsePullRequestDetail(JSON.stringify(detail), "owner/repo", 1)).toEqual(detail);
});
it("rejects mismatched PRs and malformed file counts", () => {
  for (const value of [{ ...detail, number: 2 }, { ...detail, url: "https://evil.test" }, { ...detail, changedFiles: 0 }, { ...detail, files: [{ path: "x", additions: -1, deletions: 0 }] }, { ...detail, body: null }]) {
    expect(() => parsePullRequestDetail(JSON.stringify(value), "owner/repo", 1)).toThrow();
  }
});

const comment = { id: "issue-comment-1", body: "Plain comment", createdAt: "2026-09-23T10:00:00Z", url: "https://github.com/owner/repo/pull/1#issuecomment-1", author: { login: "reviewer" } };
const conversationPayload = {
  data: { repository: { pullRequest: {
    number: 1, headRefOid: detail.headRefOid, baseRefOid: detail.baseRefOid,
    comments: { totalCount: 1, pageInfo: { hasNextPage: false }, nodes: [comment] },
    reviews: { totalCount: 1, pageInfo: { hasNextPage: false }, nodes: [{ ...comment, id: "review-1", state: "CHANGES_REQUESTED", submittedAt: comment.createdAt }] },
    reviewThreads: { totalCount: 1, pageInfo: { hasNextPage: false }, nodes: [{
      id: "thread-1", path: "src/example.ts", line: 42, isResolved: false, isOutdated: false,
      comments: { totalCount: 1, pageInfo: { hasNextPage: false }, nodes: [{ ...comment, id: "review-comment-1", diffHunk: "@@ -1 +1 @@\n-old\n+new", line: 42 }] },
    }] },
  } } },
};

it("reads bounded comments, reviews and inline threads for the exact current head", async () => {
  let detailReads = 0;
  mocks.exec.mockImplementation((_command, args, _options, callback) => {
    if (args[1] === "graphql") callback(null, { stdout: JSON.stringify(conversationPayload) });
    else { detailReads++; callback(null, { stdout: JSON.stringify(detail) }); }
  });
  const result = await readGitPullRequestConversation("/project", "origin", 1, detail.headRefOid);
  expect(result).toMatchObject({
    number: 1,
    headRefOid: detail.headRefOid,
    baseRefOid: detail.baseRefOid,
    comments: [{ author: "reviewer", body: "Plain comment" }],
    reviews: [{ state: "CHANGES_REQUESTED", author: "reviewer" }],
    reviewThreads: [{ path: "src/example.ts", line: 42, resolved: false, outdated: false, comments: [{ line: 42, diffHunk: "@@ -1 +1 @@\n-old\n+new" }] }],
  });
  const [command, args, options] = mocks.exec.mock.calls.find((call) => call[1][1] === "graphql")!;
  expect(command).toBe("gh");
  expect(args.slice(0, 3)).toEqual(["api", "graphql", "-f"]);
  expect(args[3]).toContain("reviewThreads(first:25)");
  expect(args).toContain("-F");
  expect(options).toMatchObject({ cwd: "/project", timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  expect(options.env.GH_PROMPT_DISABLED).toBe("1");
  expect(args.some((argument: string) => /POST|PUT|PATCH|DELETE/.test(argument))).toBe(false);
  expect(detailReads).toBe(2);
});

it("marks bounded pages and rejects stale or malformed conversation snapshots", () => {
  const paged = structuredClone(conversationPayload);
  paged.data.repository.pullRequest.comments.pageInfo.hasNextPage = true;
  paged.data.repository.pullRequest.reviewThreads.nodes[0].comments.pageInfo.hasNextPage = true;
  expect(parsePullRequestConversation(JSON.stringify(paged), 1, detail.headRefOid)).toMatchObject({ hasMoreComments: true, reviewThreads: [{ hasMoreComments: true }] });
  expect(() => parsePullRequestConversation(JSON.stringify({ ...conversationPayload, errors: [{ message: "unauthorized" }] }), 1, detail.headRefOid)).toThrow("could not read");
  const stale = structuredClone(conversationPayload);
  stale.data.repository.pullRequest.headRefOid = "c".repeat(40);
  expect(() => parsePullRequestConversation(JSON.stringify(stale), 1, detail.headRefOid)).toThrow("head changed");
  const malformed = structuredClone(conversationPayload);
  malformed.data.repository.pullRequest.reviewThreads.nodes[0].comments.nodes[0].url = "https://evil.test/comment";
  expect(() => parsePullRequestConversation(JSON.stringify(malformed), 1, detail.headRefOid)).toThrow("Invalid PR conversation comment");
});

const edit = { remote: "origin", number: 1, title: "Updated title", body: "Updated description", expected: detail };
it("edits only confirmed metadata and verifies the saved response", async () => {
  const updated = { ...detail, title: edit.title, body: edit.body };
  responses(updated);
  expect(await editGitPullRequest("/project", edit)).toEqual(updated);
  expect(mocks.exec.mock.calls[1].slice(0, 2)).toEqual(["gh", ["pr", "edit", "1", "--repo", "github.com/owner/repo", "--title", edit.title, "--body", edit.body]]);
});
it("rejects invalid, unchanged and stale edits before any mutation", async () => {
  for (const input of [
    { ...edit, title: " " }, { ...edit, body: "bad\0body" }, { ...edit, title: detail.title, body: detail.body },
    ...(["title", "body", "headRefOid", "baseRefName", "baseRefOid"] as const).map(key => ({ ...edit, expected: { ...detail, [key]: "outdated" } })),
  ]) {
    mocks.exec.mockClear(); responses();
    await expect(editGitPullRequest("/project", input)).rejects.toThrow();
    expect(mocks.exec.mock.calls.some(call => call[1][1] === "edit")).toBe(false);
  }
});
it("does not report success or retry after a failed or unverified edit", async () => {
  responses();
  await expect(editGitPullRequest("/project", edit)).rejects.toThrow("uncertain");
  expect(mocks.exec.mock.calls.filter(call => call[1][1] === "edit")).toHaveLength(1);
  mocks.exec.mockClear();
  mocks.exec.mockImplementation((_command, args, _options, callback) => {
    if (args[1] === "edit") callback(new Error("lost response"));
    else callback(null, { stdout: JSON.stringify(detail) });
  });
  await expect(editGitPullRequest("/project", edit)).rejects.toThrow("lost response");
  expect(mocks.exec.mock.calls.filter(call => call[1][1] === "edit")).toHaveLength(1);
});
