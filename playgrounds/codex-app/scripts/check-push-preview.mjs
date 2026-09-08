import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-push-ui-"));
const exec = promisify(execFile);
for (const width of [1180, 720]) {
  const repository = join(directory, `repo-${width}`);
  const bare = join(directory, `remote-${width}.git`);
  await exec("git", ["init", "--bare", bare]);
  await exec("git", ["init", "-b", "main", repository]);
  const git = async (...args) => (await exec("git", args, { cwd: repository })).stdout.trim();
  await git("config", "user.name", "UI Push Test");
  await git("config", "user.email", "ui-push@example.invalid");
  await git("config", "commit.gpgsign", "false");
  await git("config", "core.hooksPath", ".git/hooks");
  await git("remote", "add", "origin", bare);
  await writeFile(join(repository, "review.txt"), "REVIEWED_PUSH\n");
  await git("add", "review.txt");
  await git("commit", "-m", "test: reviewed push");
  let head = await git("rev-parse", "HEAD");
  await writeFile(join(repository, "review.txt"), "UNCOMMITTED_NOT_PUSHED\n");
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
    capture: false, environment: { CODEX_UI_KIT_WORKSPACE: repository },
  });
  try {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    assert.equal(await page.evaluate(async () => {
      try { await window.codexDemo.previewPush({ projectToken: "unknown", remote: "origin" }); return false; } catch { return true; }
    }), true);
    await page.getByRole("button", { name: "Review push", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Review push", exact: true });
    const confirm = dialog.getByRole("button", { name: "Confirm push", exact: true });
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByRole("button", { name: "Read remote preview", exact: true }).click();
    await dialog.getByRole("region", { name: "Push preview", exact: true }).waitFor();
    assert.equal(await git("ls-remote", "origin"), "", "Reading must not push");
    await dialog.getByLabel("Target branch", { exact: true }).fill("reviewed-target");
    assert.equal(await confirm.isDisabled(), true, "Changed destination must invalidate confirmation");
    await dialog.getByRole("button", { name: "Read remote preview", exact: true }).click();
    await dialog.getByText("main → reviewed-target", { exact: true }).waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 820);
    await page.screenshot({ path: join(directory, `preview-${width}.png`) });
    await git("commit", "--allow-empty", "-m", "test: later reviewed commit");
    head = await git("rev-parse", "HEAD");
    await confirm.click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await git("ls-remote", "origin"), "", "Stale confirmation must not push");
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByRole("button", { name: "Read remote preview", exact: true }).click();
    await dialog.getByText("2 commits to push", { exact: true }).waitFor();
    await confirm.click();
    await dialog.getByText(`Pushed ${head} to reviewed-target.`, { exact: true }).waitFor();
    assert.equal(await git("ls-remote", "--refs", "origin"), `${head}\trefs/heads/reviewed-target`);
    assert.equal(await git("show", "HEAD:review.txt"), "REVIEWED_PUSH");
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByLabel("Remote name", { exact: true }).fill("missing");
    await dialog.getByRole("button", { name: "Read remote preview", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await dialog.getByRole("region", { name: "Push preview", exact: true }).count(), 0);
    await dialog.getByLabel("Remote name", { exact: true }).fill("origin");
    await dialog.getByRole("button", { name: "Read remote preview", exact: true }).click();
    await dialog.getByText("0 commits to push", { exact: true }).waitFor();
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.textContent === "Review push");
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720], localBareRemotesOnly: true, modelTurns: 0 }));
