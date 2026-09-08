import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rename, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-cleanup-ui-"));
const exec = promisify(execFile);
for (const width of [1180, 720]) {
  const repo = join(directory, `repo-${width}`), bare = join(directory, `remote-${width}.git`);
  await exec("git", ["init", "--bare", bare]); await exec("git", ["init", "-b", "main", repo]);
  const git = async (...args) => (await exec("git", args, { cwd: repo })).stdout.trim();
  await git("config", "user.name", "UI Cleanup Test"); await git("config", "user.email", "cleanup@example.invalid");
  await git("config", "commit.gpgsign", "false"); await git("config", "core.hooksPath", ".git/hooks");
  await git("remote", "add", "origin", bare);
  await writeFile(join(repo, "file.txt"), "initial"); await git("add", "file.txt"); await git("commit", "-m", "initial");
  const base = await git("rev-parse", "HEAD"); await git("push", "-u", "origin", "main");
  await git("branch", "untouched"); await git("switch", "-c", "feat/example");
  await writeFile(join(repo, "file.txt"), "feature"); await git("add", "file.txt"); await git("commit", "-m", "feature");
  const head = await git("rev-parse", "HEAD"); await git("push", "-u", "origin", "feat/example");
  await git("switch", "main"); await git("merge", "--squash", "feat/example"); await git("commit", "-m", "merged");
  const mergeCommit = await git("rev-parse", "HEAD"); await git("push", "origin", "main");
  await git("switch", "feat/example"); await git("update-ref", "refs/heads/main", base, mergeCommit);
  await writeFile(join(repo, "preserve.txt"), "DIRTY_FILE_MUST_SURVIVE");
  const merged = { number: 1, url: "https://github.com/owner/repo/pull/1", state: "MERGED", head, branch: "feat/example", baseRefName: "main", baseRefOid: base, mergeable: "UNKNOWN", mergeCommit };
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), { capture: false, environment: { CODEX_UI_KIT_WORKSPACE: repo } });
  try {
    await app.evaluate(async ({ BrowserWindow, ipcMain }, input) => {
      BrowserWindow.getAllWindows()[0].setContentSize(input.width, 820);
      const requireModule = process.getBuiltinModule("module").createRequire(input.module);
      const { cleanupVerifiedMerge } = requireModule(process.getBuiltinModule("url").fileURLToPath(input.module));
      for (const name of ["pr-preview", "pr-detail", "pr-merge-status", "pr-cleanup"]) ipcMain.removeHandler(`demo:git:${name}`);
      ipcMain.handle("demo:git:pr-preview", () => ({ repository: "owner/repo", branch: "feat/example", head: input.merged.head, fingerprint: "fixture", pullRequests: [{ number: 1, title: "Cleanup test", baseRefName: "main", headRefOid: input.merged.head, url: input.merged.url }] }));
      ipcMain.handle("demo:git:pr-detail", () => ({ number: 1, url: input.merged.url, title: "Cleanup test", body: "", state: "OPEN", baseRefName: "main", baseRefOid: input.merged.baseRefOid, headRefOid: input.merged.head, changedFiles: 1, files: [] }));
      ipcMain.handle("demo:git:pr-merge-status", () => input.merged);
      globalThis.__cleanupCalls = 0;
      globalThis.__cleanupLostResponse = true;
      ipcMain.handle("demo:git:pr-cleanup", async (_event, raw) => {
        if (raw.cleanupConfirmed !== true || raw.head !== input.merged.head) throw new Error("Wrong cleanup confirmation");
        globalThis.__cleanupCalls++;
        const result = await cleanupVerifiedMerge(input.repo, "origin", input.bare, input.merged);
        if (globalThis.__cleanupLostResponse) { globalThis.__cleanupLostResponse = false; throw new Error("synthetic lost cleanup response"); }
        return result;
      });
    }, { width, merged, repo, bare, module: pathToFileURL(resolve("dist-electron/git-pr-cleanup.js")).href });
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await page.getByRole("button", { name: "Prepare pull request", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Prepare pull request", exact: true });
    await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
    await dialog.getByRole("button", { name: "Read details #1", exact: true }).click();
    await dialog.getByRole("button", { name: "Prepare admin squash merge", exact: true }).click();
    const panel = dialog.getByRole("region", { name: "Confirm PR merge", exact: true });
    await panel.getByRole("button", { name: "Check merge result", exact: true }).click();
    await panel.getByText(/^Merged PR #1 at/).waitFor();
    const confirm = panel.getByRole("button", { name: "Confirm main sync and cleanup", exact: true });
    assert.equal(await confirm.isDisabled(), true);
    await panel.getByLabel("Authorize merged branch cleanup", { exact: true }).check(); await confirm.click();
    await panel.getByRole("alert").waitFor();
    assert.equal(await readFile(join(repo, "preserve.txt"), "utf8"), "DIRTY_FILE_MUST_SURVIVE");
    assert.equal(await git("branch", "--show-current"), "feat/example");
    assert.equal(await confirm.isDisabled(), true);
    await page.screenshot({ path: join(directory, `blocked-${width}.png`) });
    await rename(join(repo, "preserve.txt"), join(directory, `preserved-${width}.txt`));
    await panel.getByLabel("Authorize merged branch cleanup", { exact: true }).check(); await confirm.click();
    await panel.getByRole("alert").waitFor();
    assert.equal(await git("branch", "--show-current"), "main");
    assert.equal(await git("ls-remote", "--heads", bare), `${mergeCommit}\trefs/heads/main`);
    await panel.getByLabel("Authorize merged branch cleanup", { exact: true }).check(); await confirm.click();
    await panel.getByText(/^Cleanup complete:/).waitFor();
    assert.equal(await git("status", "--porcelain"), "");
    assert.equal(await git("rev-parse", "HEAD", "origin/main"), `${mergeCommit}\n${mergeCommit}`);
    assert.equal(await git("rev-parse", "untouched"), base);
    assert.equal(await git("for-each-ref", "--format=%(refname)", "refs/heads/feat/example", "refs/remotes/origin/feat/example"), "");
    assert.equal(await app.evaluate(() => globalThis.__cleanupCalls), 3);
    const footer = await dialog.getByRole("button", { name: "Close", exact: true }).boundingBox();
    assert.ok(footer && footer.y >= 0 && footer.y + footer.height <= 820);
    await page.screenshot({ path: join(directory, `cleaned-${width}.png`) });
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720], localBareRemotesOnly: true, syntheticProviderStatus: true, modelTurns: 0 }));
