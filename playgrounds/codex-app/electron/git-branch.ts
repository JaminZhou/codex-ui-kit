import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";

const defaultGitCommandTimeoutMs = 30_000;
const gitCommandMaxBufferBytes = 1024 * 1024;

export interface GitCommandOptions {
  commandTimeoutMs?: number;
}

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

export function decodeGitOutput(chunks: readonly Uint8Array[]) {
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
    .toString("utf8")
    .trim();
}

async function runGit(
  cwd: string,
  args: readonly string[],
  options: GitCommandOptions,
) {
  const requestedTimeoutMs = options.commandTimeoutMs;
  const timeoutMs =
    requestedTimeoutMs !== undefined &&
    Number.isFinite(requestedTimeoutMs) &&
    requestedTimeoutMs > 0
      ? requestedTimeoutMs
      : defaultGitCommandTimeoutMs;
  return new Promise<string>((resolve, reject) => {
    let failure: Error | undefined;
    let finished = false;
    let forcedSettlementTimer: ReturnType<typeof setTimeout> | undefined;
    const stdoutChunks: Buffer[] = [];
    let capturedBytes = 0;
    let terminationStarted = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(
      "git",
      [...args],
      {
        cwd,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    const killProcessTree = () => {
      if (process.platform === "win32" && child.pid !== undefined) {
        const terminator = spawn(
          "taskkill",
          ["/pid", String(child.pid), "/T", "/F"],
          { stdio: "ignore", windowsHide: true },
        );
        terminator.on("error", () => child.kill("SIGKILL"));
        terminator.unref();
        return;
      }
      if (process.platform !== "win32" && child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // Fall through to killing the direct child when the group is gone.
        }
      }
      child.kill("SIGKILL");
    };
    const clearTimers = () => {
      if (timer !== undefined) clearTimeout(timer);
      if (forcedSettlementTimer !== undefined) {
        clearTimeout(forcedSettlementTimer);
      }
    };
    const rejectOnce = (error: Error) => {
      if (finished) return;
      finished = true;
      clearTimers();
      reject(error);
    };
    const resolveOnce = (value: string) => {
      if (finished) return;
      finished = true;
      clearTimers();
      resolve(value);
    };
    const terminateAndBoundSettlement = (error: Error) => {
      failure ??= error;
      if (terminationStarted) return;
      terminationStarted = true;
      killProcessTree();
      forcedSettlementTimer = setTimeout(() => {
        rejectOnce(failure ?? error);
      }, 1_000);
    };
    const capture = (chunk: Buffer, includeInStdout: boolean) => {
      capturedBytes += chunk.length;
      if (capturedBytes > gitCommandMaxBufferBytes) {
        terminateAndBoundSettlement(
          new Error("Git command output exceeded the allowed size."),
        );
        return;
      }
      if (includeInStdout) stdoutChunks.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => capture(chunk, true));
    child.stderr.on("data", (chunk: Buffer) => capture(chunk, false));
    child.on("error", (error) => {
      rejectOnce(error);
    });
    child.on("close", (code) => {
      if (failure) {
        rejectOnce(failure);
        return;
      }
      if (code !== 0) {
        rejectOnce(new Error(`Git exited with status ${code ?? "unknown"}.`));
        return;
      }
      resolveOnce(decodeGitOutput(stdoutChunks));
    });
    timer = setTimeout(() => {
      terminateAndBoundSettlement(
        new GitBranchCreationError(
          "unavailable",
          "The Git operation timed out.",
        ),
      );
    }, timeoutMs);
  });
}

async function assertGitRepository(cwd: string, options: GitCommandOptions) {
  if (!(await stat(cwd).catch(() => null))?.isDirectory()) {
    throw new GitBranchCreationError(
      "unavailable",
      "The project directory is unavailable.",
    );
  }
  try {
    const isInsideWorkTree = await runGit(
      cwd,
      ["rev-parse", "--is-inside-work-tree"],
      options,
    );
    if (isInsideWorkTree !== "true") {
      throw new Error("The selected project is not a working tree.");
    }
  } catch (error) {
    if (error instanceof GitBranchCreationError) throw error;
    throw new GitBranchCreationError(
      "not-repository",
      "The selected project is not a Git working tree.",
    );
  }
}

async function assertValidBranchName(
  cwd: string,
  branchName: string,
  options: GitCommandOptions,
) {
  if (!branchName || branchName.startsWith("-")) {
    throw new GitBranchCreationError(
      "invalid",
      "Enter a valid Git branch name.",
    );
  }
  try {
    const validatedBranchName = await runGit(
      cwd,
      ["check-ref-format", "--branch", branchName],
      options,
    );
    if (validatedBranchName !== branchName) {
      throw new Error("Git expanded the branch shorthand.");
    }
    await runGit(
      cwd,
      ["check-ref-format", `refs/heads/${branchName}`],
      options,
    );
  } catch (error) {
    if (error instanceof GitBranchCreationError) throw error;
    throw new GitBranchCreationError(
      "invalid",
      "Enter a valid Git branch name.",
    );
  }
}

async function branchExists(
  cwd: string,
  branchName: string,
  options: GitCommandOptions,
) {
  const branches = await runGit(
    cwd,
    [
      "branch",
      "--list",
      "--format=%(refname:lstrip=2)",
      "--",
      branchName,
    ],
    options,
  );
  return branches.split(/\r?\n/).includes(branchName);
}

async function switchGitBranch(
  cwd: string,
  branchName: string,
  args: readonly string[],
  failureMessage: string,
  mismatchMessage: string,
  options: GitCommandOptions,
) {
  let switchError: unknown;
  try {
    await runGit(cwd, args, options);
  } catch (error) {
    switchError = error;
  }
  let currentBranch: string;
  try {
    currentBranch = await runGit(
      cwd,
      ["branch", "--show-current"],
      options,
    );
  } catch (error) {
    if (error instanceof GitBranchCreationError) throw error;
    throw new GitBranchCreationError("unavailable", failureMessage);
  }
  if (currentBranch === branchName) return currentBranch;
  if (switchError instanceof GitBranchCreationError) throw switchError;
  throw new GitBranchCreationError(
    "unavailable",
    switchError ? failureMessage : mismatchMessage,
  );
}

export async function listGitBranches(
  cwd: string,
  options: GitCommandOptions = {},
): Promise<GitBranchListResult> {
  await assertGitRepository(cwd, options);
  try {
    const [branchOutput, currentBranch] = await Promise.all([
      runGit(
        cwd,
        [
          "for-each-ref",
          "--format=%(refname:lstrip=2)",
          "refs/heads",
        ],
        options,
      ),
      runGit(cwd, ["branch", "--show-current"], options),
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
  options: GitCommandOptions = {},
): Promise<GitBranchCreationResult> {
  const branchName = normalizedBranchName(rawBranchName);
  await assertGitRepository(cwd, options);
  await assertValidBranchName(cwd, branchName, options);
  const symbolicBranch = await runGit(
    cwd,
    ["branch", "--show-current"],
    options,
  );
  if (
    symbolicBranch === branchName ||
    (await branchExists(cwd, branchName, options))
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
    options,
  );
  return { branch: currentBranch };
}

export async function checkoutGitBranch(
  cwd: string,
  rawBranchName: string,
  options: GitCommandOptions = {},
): Promise<GitBranchCreationResult> {
  const branchName = normalizedBranchName(rawBranchName);
  await assertGitRepository(cwd, options);
  await assertValidBranchName(cwd, branchName, options);
  if (!(await branchExists(cwd, branchName, options))) {
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
    options,
  );
  return { branch: currentBranch };
}
