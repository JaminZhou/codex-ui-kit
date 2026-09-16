import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Real host Git validation for invalid/duplicate branch creation and recovery.
// Each width gets a fresh disposable repository; no remote or model turn is used.
const exec = promisify(execFile);
const scene = visualScenes.find((candidate) => candidate.id === "workspace-ready");
assert.ok(scene, "The workspace-ready scene is required.");

async function createRepository(directory) {
  const repository = join(directory, "repository");
  await mkdir(repository);
  const git = async (...args) =>
    (await exec("git", args, { cwd: repository, encoding: "utf8" })).stdout.trim();
  await git("init", "-b", "main");
  await git("config", "user.name", "Playground fixture");
  await git("config", "user.email", "fixture@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await writeFile(join(repository, "document.txt"), "base\n");
  await git("add", "document.txt");
  await git("commit", "-m", "test: initial fixture");
  return { git, repository };
}

const result = { passed: false, widths: [1180, 720], failuresRecovered: 0 };
try {
  for (const width of result.widths) {
    const directory = await realpath(
      await mkdtemp(join(tmpdir(), "ui-kit-branch-operation-recovery-")),
    );
    const { git, repository } = await createRepository(directory);
    const { app, page } = await launchScene(scene, {
      capture: false,
      environment: {
        CODEX_DEMO_WORKSPACE_BRANCH_FIXTURE: "0",
        CODEX_UI_KIT_WORKSPACE: repository,
      },
      windowSize: { height: 820, width },
    });
    try {
      const openCreation = async () => {
        await page.getByRole("button", { name: "Switch branch", exact: true }).click();
        const menu = page.getByRole("menu", { name: "Branches", exact: true });
        await menu
          .getByRole("menuitem", { name: "Create and checkout new branch…", exact: true })
          .click();
      };
      const dialog = page.getByRole("dialog", {
        name: "Create and checkout branch",
        exact: true,
      });
      const branchName = dialog.getByRole("textbox", { name: "Branch name", exact: true });
      const create = dialog.getByRole("button", {
        name: "Create and checkout",
        exact: true,
      });

      await openCreation();
      await branchName.fill("bad..name");
      await create.click();
      await dialog.getByRole("alert").getByText("Enter a valid Git branch name.", { exact: true }).waitFor();
      assert.equal(await git("branch", "--show-current"), "main");
      result.failuresRecovered += 1;

      await branchName.fill("feat/recovered");
      await create.click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await git("branch", "--show-current"), "feat/recovered");

      await openCreation();
      await branchName.fill("feat/recovered");
      await create.click();
      await dialog.getByRole("alert").getByText("A branch named feat/recovered already exists.", { exact: true }).waitFor();
      assert.equal(await git("branch", "--show-current"), "feat/recovered");
      result.failuresRecovered += 1;

      await branchName.fill("feat/recovered-again");
      await create.click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await git("branch", "--show-current"), "feat/recovered-again");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `recovered-${width}.png`) });
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  }
  result.passed = true;
  console.log(JSON.stringify(result));
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  console.log(JSON.stringify(result));
}
