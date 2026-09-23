import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock("node:child_process", () => ({ execFile: mocks.exec }));

import { parsePullRequestHistoryPage, readGitPullRequestHistory } from "../electron/git-pr-history";

function payload(state: "OPEN" | "CLOSED" | "MERGED" = "CLOSED") {
  return {
    data: {
      repository: {
        pullRequests: {
          totalCount: 31,
          pageInfo: { hasNextPage: true, endCursor: "opaque-cursor/+=1" },
          nodes: [{ number: 42, url: "https://github.com/owner/repo/pull/42", title: "Historical PR", state,
            headRefOid: "a".repeat(40), baseRefName: "main", updatedAt: "2026-09-23T09:00:00Z", author: { login: "jamin" } }],
        },
      },
    },
  };
}

function configureHistory(state: "OPEN" | "CLOSED" | "MERGED" = "CLOSED") {
  mocks.exec.mockImplementation((command, args, _options, callback) => {
    if (command == null) return;
    if (command === "git" && args[0] === "remote" && args.length === 1) callback(null, { stdout: "origin\n" });
    else if (command === "git" && args[0] === "remote" && args[1] === "get-url") callback(null, { stdout: "https://github.com/owner/repo.git\n" });
    else if (command === "gh" && args[0] === "api") {
      const value = payload(state);
      if (args.some((argument: string) => argument.startsWith("after="))) value.data.repository.pullRequests.pageInfo.endCursor = "opaque-cursor-next";
      callback(null, { stdout: JSON.stringify(value) });
    }
    else throw new Error(`Unexpected invocation: ${JSON.stringify([command, args, _options, typeof callback])}`);
  });
}

beforeEach(() => mocks.exec.mockReset());

it("parses bounded closed history including merged pull requests", () => {
  expect(parsePullRequestHistoryPage(JSON.stringify(payload("MERGED")), "owner/repo", "closed")).toMatchObject({
    totalCount: 31,
    hasMore: true,
    nextCursor: "opaque-cursor/+=1",
    items: [{ number: 42, state: "MERGED", author: "jamin" }],
  });
  expect(() => parsePullRequestHistoryPage(JSON.stringify(payload("OPEN")), "owner/repo", "closed")).toThrow("outside the closed filter");
});

it("reads one read-only repository history page with a filter-bound opaque cursor", async () => {
  configureHistory();
  const page = await readGitPullRequestHistory("/project", "origin", "closed", "opaque-cursor/+=1");
  expect(page).toMatchObject({ repository: "owner/repo", filter: "closed", totalCount: 31, hasMore: true, items: [{ number: 42, state: "CLOSED" }] });
  const queryCalls = mocks.exec.mock.calls.filter(call => call[0] === "gh");
  expect(queryCalls).toHaveLength(1);
  expect(queryCalls[0][1]).toContain("after=opaque-cursor/+=1");
  expect(queryCalls[0][1].find((argument: string) => argument.startsWith("query="))).toContain("states:[CLOSED,MERGED]");
  expect(queryCalls[0][2]).toMatchObject({ cwd: "/project", timeout: 30_000, maxBuffer: 2 * 1024 * 1024, env: { GH_PROMPT_DISABLED: "1" } });
  expect(queryCalls[0][1].some((argument: string) => /POST|PUT|PATCH|DELETE/.test(argument))).toBe(false);
});

it("rejects invalid filters, unsafe cursors and a changed repository remote", async () => {
  configureHistory();
  await expect(readGitPullRequestHistory("/project", "origin", "open", "bad\nvalue")).rejects.toThrow("valid pull request history cursor");
  await expect(readGitPullRequestHistory("/project", "origin", "everything" as never)).rejects.toThrow("valid pull request history filter");
  expect(mocks.exec).not.toHaveBeenCalled();

  let urls = 0;
  mocks.exec.mockImplementation((command, args, _options, callback) => {
    if (command == null) return;
    if (command === "git" && args[0] === "remote" && args.length === 1) callback(null, { stdout: "origin\n" });
    else if (command === "git" && args[1] === "get-url") callback(null, { stdout: `${urls++ < 1 ? "https://github.com/owner/repo.git" : "https://github.com/other/repo.git"}\n` });
    else if (command === "gh" && args[0] === "api") callback(null, { stdout: JSON.stringify(payload("OPEN")) });
    else throw new Error(`Unexpected invocation: ${JSON.stringify([command, args, _options, typeof callback])}`);
  });
  await expect(readGitPullRequestHistory("/project", "origin", "open")).rejects.toThrow("remote changed");
});
