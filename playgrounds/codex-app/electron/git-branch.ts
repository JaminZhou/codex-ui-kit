import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitBranchCreationResult {
  branch: string;
}

export interface GitBranchListResult {
  branches: string[];
  currentBranch: string | null;
  unbornBranch: string | null;
}

export class GitBranchCreationError extends Error {
  readonly code: "duplicate" | "invalid" | "not-repository" | "unavailable";

  constructor(
    code: GitBranchCreationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "GitBranchCreationError";
    this.code = code;
  }
}

function normalizedBranchName(value: string) {
  return value.trim();
}

async function runGit(cwd: string, args: readonly string[]) {
  const result = await execFileAsync("git", [...args], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function assertGitRepository(cwd: string) {
  if (!(await stat(cwd).catch(() => null))?.isDirectory()) {
    throw new GitBranchCreationError(
      "unavailable",
      "The project directory is unavailable.",
    );
  }
  try {
    await runGit(cwd, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    throw new GitBranchCreationError(
      "not-repository",
      "The selected project is not a Git repository.",
    );
  }
}

async function assertValidBranchName(cwd: string, branchName: string) {
  if (!branchName || branchName.startsWith("-")) {
    throw new GitBranchCreationError(
      "invalid",
      "Enter a valid Git branch name.",
    );
  }
  try {
    await runGit(cwd, [
      "check-ref-format",
      "--branch",
      branchName,
    ]);
  } catch {
    throw new GitBranchCreationError(
      "invalid",
      "Enter a valid Git branch name.",
    );
  }
}

async function branchExists(cwd: string, branchName: string) {
  const branches = await runGit(cwd, [
    "branch",
    "--list",
    "--format=%(refname:short)",
    "--",
    branchName,
  ]);
  return branches.split(/\r?\n/).includes(branchName);
}

async function switchGitBranch(
  cwd: string,
  branchName: string,
  args: readonly string[],
  failureMessage: string,
  mismatchMessage: string,
) {
  let switchFailed = false;
  try {
    await runGit(cwd, args);
  } catch {
    switchFailed = true;
  }
  let currentBranch: string;
  try {
    currentBranch = await runGit(cwd, ["branch", "--show-current"]);
  } catch {
    throw new GitBranchCreationError("unavailable", failureMessage);
  }
  if (currentBranch === branchName) return currentBranch;
  throw new GitBranchCreationError(
    "unavailable",
    switchFailed ? failureMessage : mismatchMessage,
  );
}

export async function listGitBranches(
  cwd: string,
): Promise<GitBranchListResult> {
  await assertGitRepository(cwd);
  try {
    const [branchOutput, currentBranch] = await Promise.all([
      runGit(cwd, [
        "for-each-ref",
        "--format=%(refname:short)",
        "refs/heads",
      ]),
      runGit(cwd, ["branch", "--show-current"]),
    ]);
    const branches = branchOutput
      .split(/\r?\n/)
      .map((branch) => branch.trim())
      .filter(Boolean);
    const attached = Boolean(currentBranch && branches.includes(currentBranch));
    return {
      branches,
      currentBranch: attached ? currentBranch : null,
      unbornBranch: currentBranch && !attached ? currentBranch : null,
    };
  } catch (error) {
    if (error instanceof GitBranchCreationError) throw error;
    throw new GitBranchCreationError(
      "unavailable",
      "Git could not list the repository branches.",
    );
  }
}

export async function createAndCheckoutGitBranch(
  cwd: string,
  rawBranchName: string,
): Promise<GitBranchCreationResult> {
  const branchName = normalizedBranchName(rawBranchName);
  await assertGitRepository(cwd);
  await assertValidBranchName(cwd, branchName);
  const symbolicBranch = await runGit(cwd, ["branch", "--show-current"]);
  if (
    symbolicBranch === branchName ||
    (await branchExists(cwd, branchName))
  ) {
    throw new GitBranchCreationError(
      "duplicate",
      `A branch named ${branchName} already exists.`,
    );
  }
  const currentBranch = await switchGitBranch(
    cwd,
    branchName,
    ["switch", "-c", branchName],
    "Git could not create and checkout the branch.",
    "Git created the branch but did not report it as checked out.",
  );
  return { branch: currentBranch };
}

export async function checkoutGitBranch(
  cwd: string,
  rawBranchName: string,
): Promise<GitBranchCreationResult> {
  const branchName = normalizedBranchName(rawBranchName);
  await assertGitRepository(cwd);
  await assertValidBranchName(cwd, branchName);
  if (!(await branchExists(cwd, branchName))) {
    throw new GitBranchCreationError(
      "unavailable",
      `The branch ${branchName} is unavailable.`,
    );
  }
  const currentBranch = await switchGitBranch(
    cwd,
    branchName,
    ["switch", branchName],
    "Git could not checkout the branch.",
    "Git did not report the requested branch as checked out.",
  );
  return { branch: currentBranch };
}
