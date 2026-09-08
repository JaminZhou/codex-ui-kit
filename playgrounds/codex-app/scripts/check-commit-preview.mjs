import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-commit-preview-ui-"));
const exec = promisify(execFile);
for (const width of [1180, 720]) {
const repository = join(directory, `repository-${width}`);
await mkdir(repository);
const git = async (...args) => (await exec("git", args, { cwd: repository })).stdout;
await git("init", "-b", "main");
await git("config", "user.name", "UI Commit Test");
await git("config", "user.email", "ui-commit@example.invalid");
await git("config", "commit.gpgsign", "false");
await git("config", "core.hooksPath", ".git/hooks");
await writeFile(join(repository, "review.txt"), "STAGED_PREVIEW_ONLY\n");
await git("add", "review.txt");
await writeFile(join(repository, "review.txt"), "UNSTAGED_NOT_APPROVED\n");
await writeFile(join(repository, "untracked.txt"), "UNTRACKED_NOT_APPROVED\n");
const before = await git("status", "--porcelain");
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
    capture: false, environment: { CODEX_UI_KIT_WORKSPACE: repository },
  });
  try {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    assert.equal(await page.evaluate(async () => {
      try { await window.codexDemo.previewCommit({ projectToken: "unknown" }); return false; } catch { return true; }
    }), true);
    await page.getByRole("button", { name: "Review staged changes", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Review staged changes", exact: true });
    const patch = dialog.getByLabel("Staged patch", { exact: true });
    await patch.waitFor();
    assert.ok((await patch.textContent()).includes("+STAGED_PREVIEW_ONLY"));
    assert.ok(!(await dialog.textContent()).includes("UNSTAGED_NOT_APPROVED"));
    assert.ok(!(await dialog.textContent()).includes("UNTRACKED_NOT_APPROVED"));
    await dialog.getByText("Unstaged or untracked changes are excluded.", { exact: true }).waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 820);
    await page.screenshot({ path: join(directory, `preview-${width}.png`) });
    assert.equal(await git("status", "--porcelain"), before);
    assert.equal(await readFile(join(repository, "review.txt"), "utf8"), "UNSTAGED_NOT_APPROVED\n");
    const confirm = dialog.getByRole("button", { name: "Confirm local commit", exact: true });
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByLabel("Commit message", { exact: true }).fill("test: approved staged change");
    await confirm.click();
    await dialog.getByText(/^Committed locally:/).waitFor();
    assert.equal((await git("show", "HEAD:review.txt")).trim(), "STAGED_PREVIEW_ONLY");
    assert.equal((await git("ls-tree", "--name-only", "HEAD")).trim(), "review.txt");
    assert.equal(await readFile(join(repository, "review.txt"), "utf8"), "UNSTAGED_NOT_APPROVED\n");
    assert.equal(await readFile(join(repository, "untracked.txt"), "utf8"), "UNTRACKED_NOT_APPROVED\n");
    assert.equal(await confirm.isDisabled(), true, "Success must invalidate the consumed preview");
    await page.screenshot({ path: join(directory, `committed-${width}.png`) });
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:git:commit-preview");
      ipcMain.handle("demo:git:commit-preview", () => { throw new Error("synthetic read failure"); });
    });
    await dialog.getByRole("button", { name: "Refresh preview", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await patch.count(), 0, "Failed refresh must not present an old patch as current");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.textContent === "Review staged changes");
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:git:commit-preview");
      ipcMain.handle("demo:git:commit-preview", () => new Promise(resolve => {
        globalThis.__resolveCommitPreview = () => resolve({ stagedFiles: ["late"], stagedPatch: "STALE_PROJECT_PATCH", fingerprint: "late" });
      }));
    });
    await page.getByRole("button", { name: "Review staged changes", exact: true }).click();
    await dialog.getByRole("status").waitFor();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Replay", exact: true }).click();
    await app.evaluate(() => globalThis.__resolveCommitPreview());
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.equal(await page.getByText("STALE_PROJECT_PATCH", { exact: true }).count(), 0);
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, modelTurns: 0, widths: [1180, 720], stagedOnlyCommit: true, staleReadIgnored: true }));
