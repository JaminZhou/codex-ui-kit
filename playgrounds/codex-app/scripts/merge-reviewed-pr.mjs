// Explicit development-PR merge, never part of acceptance. Requires both final-head local gates.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const [repository, expectedHead, expectedBranch, rawNumber, receiptPath] = process.argv.slice(2);
assert.equal(process.env.CODEX_UI_KIT_CONFIRM_PR_MERGE, "yes", "Explicit administrator merge opt-in required");
assert.ok(repository && expectedHead && expectedBranch && receiptPath);
const number = Number(rawNumber);
assert.ok(Number.isSafeInteger(number) && number > 0);
const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
assert.equal(receipt.head, expectedHead);
for (const command of ["check", "check:codex-app:acceptance"]) {
  const results = receipt.results.filter(result => result.command === command);
  assert.equal(results.length, 1);
  assert.equal(results[0].exitCode, 0);
  assert.equal(results[0].signal, null);
}
const exec = promisify(execFile);
const git = async (...args) => (await exec("git", args, { cwd: repository })).stdout.trim();
assert.equal(await git("rev-parse", "HEAD"), expectedHead);
assert.equal(await git("branch", "--show-current"), expectedBranch);
assert.equal(await git("status", "--porcelain"), "");
const directory = await mkdtemp(join(tmpdir(), "ui-kit-real-merge-"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false, environment: { CODEX_UI_KIT_WORKSPACE: repository },
});
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.getByRole("button", { name: "Prepare pull request", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare pull request", exact: true });
  await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
  await dialog.getByRole("button", { name: `Read details #${number}`, exact: true }).click({ timeout: 120000 });
  const detail = dialog.getByRole("region", { name: "PR details", exact: true });
  await detail.waitFor({ timeout: 120000 });
  assert.ok((await detail.textContent()).includes(expectedHead));
  await dialog.getByRole("button", { name: "Prepare admin squash merge", exact: true }).click();
  const panel = dialog.getByRole("region", { name: "Confirm PR merge", exact: true });
  await panel.getByLabel("Authorize admin merge after local validation", { exact: true }).check();
  await panel.getByLabel("Confirm merge head", { exact: true }).fill(expectedHead);
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(directory, "confirmed-merge.png") });
  await panel.getByRole("button", { name: "Confirm admin squash merge", exact: true }).click();
  const result = panel.getByText(new RegExp(`^Merged PR #${number} at`));
  await result.waitFor({ timeout: 180000 });
  await page.screenshot({ path: join(directory, "merged.png") });
  console.log(JSON.stringify({ passed: true, directory, expectedHead, expectedBranch, number, result: await result.textContent(), realGitHubMerge: true, localCleanupStillRequired: true }));
} finally { await app.close(); }
