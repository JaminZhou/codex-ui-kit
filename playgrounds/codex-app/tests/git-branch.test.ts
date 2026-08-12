import { execFile } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkoutGitBranch,
  createAndCheckoutGitBranch,
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

  it("preserves branch names when tags use the same short names", async () => {
    const repository = await temporaryRepository();
    await execFileAsync("git", ["tag", "main"], { cwd: repository });

    await expect(listGitBranches(repository)).resolves.toEqual({
      branches: ["main"],
      currentBranch: "main",
      unbornBranch: null,
    });
    await expect(
      createAndCheckoutGitBranch(repository, "main"),
    ).rejects.toMatchObject({ code: "duplicate" });
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

  it("lists and creates branches from detached and unborn HEAD states", async () => {
    const detachedRepository = await temporaryRepository();
    await execFileAsync("git", ["switch", "--detach"], {
      cwd: detachedRepository,
    });
    await expect(listGitBranches(detachedRepository)).resolves.toEqual({
      branches: ["main"],
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
