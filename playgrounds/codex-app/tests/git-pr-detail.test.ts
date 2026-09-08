import { expect, it } from "vitest";
import { parsePullRequestDetail } from "../electron/git-pr-detail";

const detail = { number: 1, url: "https://github.com/owner/repo/pull/1", title: "Example", body: "Untrusted **body**", state: "OPEN", baseRefName: "main", headRefOid: "a".repeat(40), changedFiles: 2, files: [{ path: "a file.ts", additions: 1, deletions: 0 }] };
it("preserves file totals when the provider returns a partial file list", () => {
  expect(parsePullRequestDetail(JSON.stringify(detail), "owner/repo", 1)).toEqual(detail);
});
it("rejects mismatched PRs and malformed file counts", () => {
  for (const value of [{ ...detail, number: 2 }, { ...detail, url: "https://evil.test" }, { ...detail, changedFiles: 0 }, { ...detail, files: [{ path: "x", additions: -1, deletions: 0 }] }, { ...detail, body: null }]) {
    expect(() => parsePullRequestDetail(JSON.stringify(value), "owner/repo", 1)).toThrow();
  }
});
