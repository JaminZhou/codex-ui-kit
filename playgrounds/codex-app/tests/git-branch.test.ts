import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkoutGitBranch,
  createAndCheckoutGitBranch,
  decodeGitOutput,
  listGitBranches,
} from "../electron/git-branch";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function temporaryRepository() {
  const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-branch-"));
  temporaryDirectories.push(directory);
  await execFileAsync("git", ["init", "-b", "main"], { cwd: directory });
  await execFileAsync(
    "git",
    [
      "-c",
      "user.name=Codex UI Kit",
      "-c",
      "user.email=codex-ui-kit@example.invalid",
      "commit",
      "--allow-empty",
      "-m",
      "test: initialize branch fixture",
    ],
    { cwd: directory },
  );
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("Git branch creation", () => {
  it("decodes multibyte branch output after joining stream chunks", () => {
    const output = Buffer.from("main\nfeat/修复-界面\n", "utf8");
    const split = output.indexOf(Buffer.from("修", "utf8")) + 1;

    expect(
      decodeGitOutput([output.subarray(0, split), output.subarray(split)]),
    ).toBe("main\nfeat/修复-界面");
  });

  it("creates and checks out a valid branch in the configured repository", async () => {
    const repository = await temporaryRepository();

    await expect(
      createAndCheckoutGitBranch(repository, " feat/current-branch "),
    ).resolves.toEqual({ branch: "feat/current-branch" });
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: repository, encoding: "utf8" },
    );
    expect(stdout.trim()).toBe("feat/current-branch");

    await expect(checkoutGitBranch(repository, "main")).resolves.toEqual({
      branch: "main",
    });
    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["feat/current-branch", "main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
    const checkedOut = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: repository, encoding: "utf8" },
    );
    expect(checkedOut.stdout.trim()).toBe("main");
  });

  it("rejects invalid and duplicate branch names without changing HEAD", async () => {
    const repository = await temporaryRepository();

    await expect(
      createAndCheckoutGitBranch(repository, "bad branch"),
    ).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(
      createAndCheckoutGitBranch(repository, "main"),
    ).rejects.toMatchObject({
      code: "duplicate",
    });
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: repository, encoding: "utf8" },
    );
    expect(stdout.trim()).toBe("main");
  });

  it("rejects checkout shorthands as literal branch names", async () => {
    const repository = await temporaryRepository();
    await execFileAsync("git", ["switch", "--detach"], { cwd: repository });
    await execFileAsync("git", ["switch", "main"], { cwd: repository });

    for (const invalidBranchName of ["@{-1}", "HEAD"]) {
      await expect(
        createAndCheckoutGitBranch(repository, invalidBranchName),
      ).rejects.toMatchObject({ code: "invalid" });
    }
    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
  });

  it("preserves branch names when tags use the same short names", async () => {
    const repository = await temporaryRepository();
    await execFileAsync("git", ["tag", "main"], { cwd: repository });

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(
      createAndCheckoutGitBranch(repository, "main"),
    ).rejects.toMatchObject({ code: "duplicate" });
  });

  it("checks out enumerated refs whose names start with a dash", async () => {
    const repository = await temporaryRepository();
    await execFileAsync(
      "git",
      ["update-ref", "refs/heads/-topic", "HEAD"],
      { cwd: repository },
    );

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["-topic", "main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(checkoutGitBranch(repository, "-topic")).resolves.toEqual({
      branch: "-topic",
    });
    await expect(
      createAndCheckoutGitBranch(repository, "-created"),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("rejects the lone-dash ref without changing HEAD", async () => {
    const repository = await temporaryRepository();
    await execFileAsync(
      "git",
      ["update-ref", "refs/heads/-", "HEAD"],
      { cwd: repository },
    );

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["-", "main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(checkoutGitBranch(repository, "-")).rejects.toMatchObject({
      code: "unavailable",
      message: "The branch - cannot be checked out safely.",
    });
    await expect(listGitBranches(repository)).resolves.toMatchObject({
      currentBranch: "main",
    });
  });

  it("preserves Unicode whitespace in distinct branch refs", async () => {
    const repository = await temporaryRepository();
    const unicodeWhitespaceBranch = "topic\u00a0";
    await execFileAsync("git", ["branch", "topic"], { cwd: repository });
    await execFileAsync("git", ["branch", unicodeWhitespaceBranch], {
      cwd: repository,
    });

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["main", "topic", unicodeWhitespaceBranch],
      branchesCheckedOutElsewhere: [],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(
      checkoutGitBranch(repository, unicodeWhitespaceBranch),
    ).resolves.toEqual({ branch: unicodeWhitespaceBranch });
    await expect(listGitBranches(repository)).resolves.toMatchObject({
      currentBranch: unicodeWhitespaceBranch,
    });
  });

  it("reconciles HEAD when a post-checkout hook returns nonzero", async () => {
    const repository = await temporaryRepository();
    const hook = join(repository, ".git", "hooks", "post-checkout");
    await writeFile(hook, "#!/bin/sh\nexit 1\n", "utf8");
    await chmod(hook, 0o755);

    await expect(
      createAndCheckoutGitBranch(repository, "feat/hook-warning"),
    ).resolves.toEqual({ branch: "feat/hook-warning" });
    await expect(checkoutGitBranch(repository, "main")).resolves.toEqual({
      branch: "main",
    });
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: repository, encoding: "utf8" },
    );
    expect(stdout.trim()).toBe("main");
  });

  it("reports branches checked out by other linked worktrees", async () => {
    const repository = await temporaryRepository();
    const linkedWorktree = join(repository, ".worktrees", "linked");
    await execFileAsync(
      "git",
      ["worktree", "add", "-b", "feat/linked-worktree", linkedWorktree],
      { cwd: repository },
    );
    await execFileAsync("git", ["branch", "feat/free"], { cwd: repository });

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["feat/free", "feat/linked-worktree", "main"],
      branchesCheckedOutElsewhere: ["feat/linked-worktree"],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(listGitBranches(linkedWorktree)).resolves.toEqual({
      branches: ["feat/free", "feat/linked-worktree", "main"],
      branchesCheckedOutElsewhere: ["main"],
      currentBranch: "feat/linked-worktree",
      unbornBranch: null,
    });
    await expect(
      checkoutGitBranch(repository, "feat/linked-worktree"),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("times out a hanging post-checkout hook without blocking later operations", async () => {
    const repository = await temporaryRepository();
    const hook = join(repository, ".git", "hooks", "post-checkout");
    const hookPidPath = join(repository, "post-checkout.pid");
    await writeFile(
      hook,
      '#!/bin/sh\nprintf "%s\\n" "$$" > post-checkout.pid\nexec sleep 30\n',
      "utf8",
    );
    await chmod(hook, 0o755);
    const startedAt = performance.now();

    await expect(
      createAndCheckoutGitBranch(repository, "feat/hook-timeout", {
        commandTimeoutMs: 2_000,
      }),
    ).resolves.toEqual({ branch: "feat/hook-timeout" });
    expect(performance.now() - startedAt).toBeLessThan(5_000);
    if (process.platform !== "win32") {
      const hookPid = Number(await readFile(hookPidPath, "utf8"));
      expect(() => process.kill(hookPid, 0)).toThrow();
    }
    await expect(listGitBranches(repository)).resolves.toMatchObject({
      currentBranch: "feat/hook-timeout",
    });
    await writeFile(hook, "#!/bin/sh\nexit 0\n", "utf8");
    await expect(checkoutGitBranch(repository, "main")).resolves.toEqual({
      branch: "main",
    });
  });

  it("lists and creates branches from detached and unborn HEAD states", async () => {
    const detachedRepository = await temporaryRepository();
    await execFileAsync("git", ["switch", "--detach"], {
      cwd: detachedRepository,
    });
    await expect(listGitBranches(detachedRepository)).resolves.toEqual({
      branches: ["main"],
      branchesCheckedOutElsewhere: [],
      currentBranch: null,
      unbornBranch: null,
    });
    await expect(
      createAndCheckoutGitBranch(detachedRepository, "feat/from-detached"),
    ).resolves.toEqual({ branch: "feat/from-detached" });

    const unbornRepository = await mkdtemp(
      join(tmpdir(), "codex-ui-kit-unborn-branch-"),
    );
    temporaryDirectories.push(unbornRepository);
    await execFileAsync("git", ["init", "-b", "main"], {
      cwd: unbornRepository,
    });
    await expect(listGitBranches(unbornRepository)).resolves.toEqual({
      branches: [],
      branchesCheckedOutElsewhere: [],
      currentBranch: null,
      unbornBranch: "main",
    });
    await expect(
      createAndCheckoutGitBranch(unbornRepository, "main"),
    ).rejects.toMatchObject({ code: "duplicate" });
    await expect(
      createAndCheckoutGitBranch(unbornRepository, "feat/from-unborn"),
    ).resolves.toEqual({ branch: "feat/from-unborn" });
  });

  it("does not treat a plain directory as a repository", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-plain-"));
    temporaryDirectories.push(directory);

    await expect(
      createAndCheckoutGitBranch(directory, "feat/current-branch"),
    ).rejects.toMatchObject({
      code: "not-repository",
    });
  });

  it("does not treat a bare repository as a working tree", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-bare-"));
    temporaryDirectories.push(directory);
    await execFileAsync("git", ["init", "--bare"], { cwd: directory });

    await expect(listGitBranches(directory)).rejects.toMatchObject({
      code: "not-repository",
      message: "The selected project is not a Git working tree.",
    });
    await expect(
      createAndCheckoutGitBranch(directory, "feat/unavailable"),
    ).rejects.toMatchObject({ code: "not-repository" });
  });
});
