// Explicit opt-in real GitHub write for the current development PR, never full acceptance.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const [repository, expectedHead, expectedBranch, title, body] = process.argv.slice(2);
assert.equal(process.env.CODEX_UI_KIT_CONFIRM_PR_CREATE, "yes", "Explicit PR creation opt-in required");
assert.ok(repository && expectedHead && expectedBranch && title && body);
const exec = promisify(execFile);
const git = async (...args) => (await exec("git", args, { cwd: repository })).stdout.trim();
assert.equal(await git("rev-parse", "HEAD"), expectedHead);
assert.equal(await git("branch", "--show-current"), expectedBranch);
assert.equal(await git("status", "--porcelain"), "");
const directory = await mkdtemp(join(tmpdir(), "ui-kit-real-pr-"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false, environment: { CODEX_UI_KIT_WORKSPACE: repository },
});
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.getByRole("button", { name: "Prepare pull request", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare pull request", exact: true });
  await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
  await dialog.getByText("No open PR for this branch.", { exact: true }).waitFor({ timeout: 120000 });
  assert.ok((await dialog.getByRole("region", { name: "PR preview" }).textContent()).includes(expectedHead));
  await dialog.getByLabel("PR base branch", { exact: true }).fill("main");
  await dialog.getByLabel("PR title", { exact: true }).fill(title);
  await dialog.getByLabel("PR description", { exact: true }).fill(body);
  await page.screenshot({ path: join(directory, "confirmed-input.png") });
  await dialog.getByRole("button", { name: "Confirm create PR", exact: true }).click();
  const status = dialog.getByText(/^Created PR #/);
  await status.waitFor({ timeout: 120000 });
  const result = await status.textContent();
  await page.screenshot({ path: join(directory, "created.png") });
  const number = Number(result.match(/^Created PR #(\d+):/)?.[1]);
  assert.ok(Number.isSafeInteger(number) && number > 0);
  await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
  await dialog.getByRole("button", { name: `Read details #${number}`, exact: true }).click({ timeout: 120000 });
  const detail = dialog.getByRole("region", { name: "PR details", exact: true });
  await detail.waitFor({ timeout: 120000 });
  assert.ok((await detail.textContent()).includes(expectedHead));
  assert.ok((await detail.textContent()).includes(title));
  await page.screenshot({ path: join(directory, "real-details.png") });
  await detail.getByRole("button", { name: "Read PR diff", exact: true }).click();
  const patch = dialog.getByLabel("PR diff", { exact: true });
  await patch.waitFor({ timeout: 180000 });
  assert.ok((await patch.textContent()).includes("diff --git "));
  await patch.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(directory, "real-diff.png") });
  await detail.getByRole("button", { name: "Edit title and description", exact: true }).click();
  const editor = dialog.getByRole("region", { name: "Edit existing PR", exact: true });
  const editedBody = `${body}\n\nReal playground verification: PR creation, detail, diff and this explicit description update completed through the Electron UI.`;
  await editor.getByLabel("Existing PR description", { exact: true }).fill(editedBody);
  await editor.getByRole("button", { name: "Confirm update PR", exact: true }).click();
  await dialog.getByText(`Updated PR #${number}.`, { exact: true }).waitFor({ timeout: 180000 });
  assert.ok((await detail.textContent()).includes(editedBody));
  await page.screenshot({ path: join(directory, "real-edited.png") });
  console.log(JSON.stringify({ passed: true, directory, expectedHead, expectedBranch, result, realGitHubWrite: true }));
} finally { await app.close(); }
