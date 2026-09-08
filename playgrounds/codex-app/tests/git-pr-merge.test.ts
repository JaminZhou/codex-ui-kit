import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exec: vi.fn(), detail: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.exec }));
vi.mock("../electron/git-pr-detail.js", () => ({ readGitPullRequestDetail: mocks.detail }));
import { mergePullRequest, readPullRequestMergeStatus } from "../electron/git-pr-merge";

const target = { remote: "origin", repository: "owner/repo", number: 1, head: "a".repeat(40), baseRefName: "main", baseRefOid: "b".repeat(40), adminConfirmed: true };
const open = { number: 1, url: "https://github.com/owner/repo/pull/1", state: "OPEN", headRefName: "feat/example", headRefOid: target.head, baseRefName: "main", baseRefOid: target.baseRefOid, mergeCommit: null, mergeable: "MERGEABLE" };
const merged = { ...open, state: "MERGED", mergeable: "UNKNOWN", mergeCommit: { oid: "c".repeat(40) } };
let remote = "git@github.com:owner/repo.git\n";
let ready: Omit<typeof open, "mergeCommit"> & { mergeCommit: { oid: string } | null } = open;
let after = merged;
let failedCommand = false;
beforeEach(() => {
  mocks.exec.mockReset(); mocks.detail.mockReset();
  remote = "git@github.com:owner/repo.git\n"; ready = open; after = merged; failedCommand = false;
  mocks.detail.mockResolvedValue(open);
  let attempted = false;
  mocks.exec.mockImplementation((command, args, _options, callback) => {
    if (command === "git") return callback(null, { stdout: remote });
    if (args[1] === "merge") { attempted = true; return callback(failedCommand ? new Error("response lost") : null, { stdout: "" }); }
    callback(null, { stdout: JSON.stringify(attempted ? after : ready) });
  });
});
const mutations = () => mocks.exec.mock.calls.filter(call => call[0] === "gh" && call[1][1] === "merge");
it("requires explicit admin confirmation, matches the exact head and verifies MERGED", async () => {
  expect(await mergePullRequest("/project", target)).toMatchObject({ state: "MERGED", mergeCommit: "c".repeat(40), head: target.head, branch: "feat/example" });
  expect(mutations()).toHaveLength(1);
  expect(mutations()[0].slice(0, 2)).toEqual(["gh", ["pr", "merge", "1", "--repo", "github.com/owner/repo", "--admin", "--squash", "--match-head-commit", target.head]]);
});
it("blocks missing confirmation, stale base/head, conflicts and unknown readiness", async () => {
  await expect(mergePullRequest("/project", { ...target, adminConfirmed: false })).rejects.toThrow("confirmation");
  for (const input of [{ ...target, head: "d".repeat(40) }, { ...target, baseRefOid: "d".repeat(40) }, { ...target, baseRefName: "release" }]) await expect(mergePullRequest("/project", input)).rejects.toThrow("changed");
  for (const mergeable of ["UNKNOWN", "CONFLICTING"]) {
    ready = { ...open, mergeable };
    await expect(mergePullRequest("/project", target)).rejects.toThrow("mergeable");
  }
  expect(mutations()).toHaveLength(0);
});
it("reconciles a lost response without repeating the merge", async () => {
  failedCommand = true;
  expect(await mergePullRequest("/project", target)).toMatchObject({ state: "MERGED" });
  expect(mutations()).toHaveLength(1);
});
it("does not treat an OPEN or wrong-head result as merge success", async () => {
  after = { ...merged, state: "OPEN" };
  await expect(mergePullRequest("/project", target)).rejects.toThrow("not verified");
  expect(mutations()).toHaveLength(1);
  after = { ...merged, headRefOid: "d".repeat(40) };
  await expect(readPullRequestMergeStatus("/project", target)).rejects.toThrow("identity");
});
it("reads status independently of a deleted head branch but rejects changed remotes and malformed results", async () => {
  ready = merged;
  expect(await readPullRequestMergeStatus("/project", target)).toMatchObject({ state: "MERGED" });
  expect(mocks.detail).not.toHaveBeenCalled();
  remote = "git@github.com:other/repo.git\n";
  await expect(readPullRequestMergeStatus("/project", target)).rejects.toThrow("repository");
  remote = "git@github.com:owner/repo.git\nhttps://github.com/owner/repo.git\n";
  await expect(readPullRequestMergeStatus("/project", target)).rejects.toThrow("repository");
  expect(mutations()).toHaveLength(0);
});
