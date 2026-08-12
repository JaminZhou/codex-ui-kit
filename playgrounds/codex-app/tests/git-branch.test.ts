import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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

  it("does not treat a plain directory as a repository", async () => {
    const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-plain-"));
    temporaryDirectories.push(directory);

    await expect(
      createAndCheckoutGitBranch(directory, "feat/current-branch"),
    ).rejects.toMatchObject({
      code: "not-repository",
    });
  });
});
