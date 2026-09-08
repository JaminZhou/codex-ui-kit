import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exec: vi.fn(), preview: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.exec }));
vi.mock("../electron/git-pr-preview.js", () => ({ readGitPullRequestPreview: mocks.preview }));
import { parsePullRequestDetail, readGitPullRequestDiff } from "../electron/git-pr-detail";

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
