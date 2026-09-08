import { expect, it } from "vitest";
import { githubRepository, parsePullRequests, pullRequestCreateArgs } from "../electron/git-pr-preview";

it("resolves only exact GitHub repository remotes", () => {
  for (const url of ["https://github.com/owner/repo.git", "git@github.com:owner/repo.git", "ssh://git@github.com/owner/repo.git", "https://github.com/owner/repo/"]) {
    expect(githubRepository(url)).toBe("owner/repo");
  }
  for (const url of ["https://github.com.evil.test/owner/repo", "https://token@github.com/owner/repo", "https://github.com/owner/repo?other", "https://github.com/../repo", "https://github.com/owner/repo/tree/main", "/tmp/repo", "git@other.test:owner/repo"]) {
    expect(() => githubRepository(url)).toThrow();
  }
});

it("creates only a reviewed same-repository PR with explicit content, not an implicit push", () => {
  const preview = { repository: "owner/repo", branch: "feat/example", head: "a".repeat(40), fingerprint: "reviewed", pullRequests: [] };
  const input = { remote: "origin", fingerprint: "reviewed", base: "main", title: "feat: example", body: "literal $(content)\nsecond line" };
  expect(pullRequestCreateArgs(preview, input)).toEqual(["api", "--hostname", "github.com", "--method", "POST", "repos/owner/repo/pulls", "-f", "head=feat/example", "-f", "base=main", "-f", "title=feat: example", "-f", "body=literal $(content)\nsecond line"]);
  expect(() => pullRequestCreateArgs(preview, { ...input, fingerprint: "old" })).toThrow("preview changed");
  expect(() => pullRequestCreateArgs(preview, { ...input, title: " " })).toThrow();
  expect(() => pullRequestCreateArgs(preview, { ...input, base: "feat/example" })).toThrow();
  expect(() => pullRequestCreateArgs({ ...preview, pullRequests: [{ number: 1, url: "https://github.com/owner/repo/pull/1", title: "existing", headRefOid: preview.head, baseRefName: "main" }] }, input)).toThrow("already exists");
});

it("validates PR identities and rejects unexpected destinations", () => {
  const pr = { number: 1, url: "https://github.com/owner/repo/pull/1", title: "example", headRefOid: "a".repeat(40), baseRefName: "main" };
  expect(parsePullRequests(JSON.stringify([{ ...pr, isCrossRepository: false }]), "owner/repo")).toEqual([pr]);
  expect(parsePullRequests(JSON.stringify([{ ...pr, isCrossRepository: true }]), "owner/repo")).toEqual([]);
  expect(parsePullRequests("[]", "owner/repo")).toEqual([]);
  for (const invalid of [{ ...pr, url: "https://example.invalid" }, { ...pr, number: -1 }, { ...pr, headRefOid: "bad" }, { ...pr, title: null }]) {
    expect(() => parsePullRequests(JSON.stringify([{ isCrossRepository: false, ...invalid }]), "owner/repo")).toThrow();
  }
  expect(() => parsePullRequests("{}", "owner/repo")).toThrow();
});
