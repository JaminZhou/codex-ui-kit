import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Real Git operations in one disposable repository. No model or remote Git.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-branch-recovery-")));
const repository = join(directory, "repository");
await mkdir(repository);
const exec = promisify(execFile);
const git = async (...args) => (await exec("git", args, { cwd: repository, encoding: "utf8" })).stdout.trim();
await git("init", "-b", "main");
await git("config", "user.name", "Playground fixture");
await git("config", "user.email", "fixture@example.invalid");
await git("config", "commit.gpgsign", "false");
await writeFile(join(repository, "document.txt"), "base\n");
await git("add", "document.txt");
await git("commit", "-m", "test: initial fixture");
await git("switch", "-c", "feat/target");
await writeFile(join(repository, "document.txt"), "target branch\n");
await git("commit", "-am", "test: target fixture");
await git("switch", "main");
const scene = visualScenes.find(scene => scene.id === "workspace-ready");
const result = { passed: false, directory, modelTurns: 0 };
try {
  for (const width of [1180, 720]) {
    const draft = `uncommitted draft ${width}\n`;
    await writeFile(join(repository, "document.txt"), draft);
    const before = await git("rev-parse", "HEAD");
    const { app, page } = await launchScene(scene, {
      capture: false, windowSize: { width, height: 820 },
      environment: { CODEX_UI_KIT_WORKSPACE: repository, CODEX_DEMO_WORKSPACE_BRANCH_FIXTURE: "0" },
    });
    try {
      const choose = async name => {
        await page.getByRole("button", { name: "Switch branch", exact: true }).click();
        await page.getByRole("menu", { name: "Branches", exact: true }).getByRole("menuitemradio", { name, exact: true }).click();
      };
      await choose("feat/target");
      await page.getByText("Couldn’t checkout branch", { exact: true }).waitFor();
      assert.equal(await git("branch", "--show-current"), "main");
      assert.equal(await git("rev-parse", "HEAD"), before);
      assert.equal(await readFile(join(repository, "document.txt"), "utf8"), draft);
      assert.equal(await git("status", "--porcelain"), "M document.txt");
      await page.screenshot({ path: join(directory, `dirty-failure-${width}.png`) });
      // Preserve the exact fixture change in its original branch, never force
      // checkout, reset, stash-drop, or discard content to make the retry pass.
      await git("commit", "-am", `test: preserve draft ${width}`);
      await choose("feat/target");
      await page.waitForFunction(() => document.querySelector('button[aria-label="Switch branch"]')?.textContent?.includes("feat/target"));
      await page.getByText("Couldn’t checkout branch", { exact: true }).waitFor({ state: "hidden" });
      assert.equal(await git("branch", "--show-current"), "feat/target");
      assert.equal(await readFile(join(repository, "document.txt"), "utf8"), "target branch\n");
      assert.equal(await git("show", "main:document.txt"), draft.trim());
      await choose("main");
      await page.waitForFunction(() => document.querySelector('button[aria-label="Switch branch"]')?.textContent?.includes("main"));
      assert.equal(await readFile(join(repository, "document.txt"), "utf8"), draft);
      assert.equal(await git("status", "--porcelain"), "");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `recovered-${width}.png`) });
    } catch (error) {
      await page.screenshot({ path: join(directory, `failed-${width}.png`) }).catch(() => undefined);
      throw error;
    } finally { await app.close(); }
  }
  result.passed = true;
  result.widths = [1180, 720];
  result.dirtyChangesPreserved = true;
  result.retrySucceeded = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
