export type ReadyWorkspaceHostBranchState = {
  branches: string[];
  currentBranch: string | null;
  status: "ready";
  unbornBranch: string | null;
};

/**
 * Keeps a successful host checkout truthful when the follow-up branch listing
 * is temporarily unavailable. An unborn repository stays unborn, while an
 * attached or detached repository now owns a real branch ref.
 */
export function branchStateAfterSuccessfulCreation(
  previous: ReadyWorkspaceHostBranchState | undefined,
  branch: string,
): ReadyWorkspaceHostBranchState | undefined {
  if (!previous) return undefined;
  if (previous.unbornBranch) {
    return {
      branches: previous.branches,
      currentBranch: null,
      status: "ready",
      unbornBranch: branch,
    };
  }
  return {
    branches: [...previous.branches.filter((item) => item !== branch), branch],
    currentBranch: branch,
    status: "ready",
    unbornBranch: null,
  };
}
