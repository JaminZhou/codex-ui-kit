import { describe, expect, it } from "vitest";
import { branchStateAfterSuccessfulCreation } from "../src/workspace-branch-state";

describe("workspace branch state", () => {
  it("preserves a newly attached ref when the refresh is unavailable", () => {
    expect(
      branchStateAfterSuccessfulCreation(
        {
          branches: ["main", "feat/existing"],
          branchesCheckedOutElsewhere: ["feat/existing"],
          currentBranch: "main",
          status: "ready",
          unbornBranch: null,
        },
        "feat/created",
      ),
    ).toEqual({
      branches: ["main", "feat/existing", "feat/created"],
      branchesCheckedOutElsewhere: ["feat/existing"],
      currentBranch: "feat/created",
      status: "ready",
      unbornBranch: null,
    });
  });

  it("keeps a repository unborn until its first commit creates the ref", () => {
    expect(
      branchStateAfterSuccessfulCreation(
        {
          branches: [],
          branchesCheckedOutElsewhere: [],
          currentBranch: null,
          status: "ready",
          unbornBranch: "main",
        },
        "feat/created",
      ),
    ).toEqual({
      branches: [],
      branchesCheckedOutElsewhere: [],
      currentBranch: null,
      status: "ready",
      unbornBranch: "feat/created",
    });
  });
});
