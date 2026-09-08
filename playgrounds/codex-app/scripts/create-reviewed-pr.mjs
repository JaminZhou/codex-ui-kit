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
  console.log(JSON.stringify({ passed: true, directory, expectedHead, expectedBranch, result, realGitHubWrite: true }));
} finally { await app.close(); }
