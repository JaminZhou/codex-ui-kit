import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-pr-ui-"));
for (const width of [1180, 720]) {
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), { capture: false });
  try {
    await app.evaluate(({ BrowserWindow, ipcMain }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(1180, 820);
      globalThis.__prCreateCalls = [];
      globalThis.__prReadFails = true;
      globalThis.__prCreated = false;
      ipcMain.removeHandler("demo:git:pr-preview");
      ipcMain.removeHandler("demo:git:pr-create");
      ipcMain.handle("demo:git:pr-preview", () => {
        if (globalThis.__prReadFails) throw new Error("synthetic read failure");
        return { repository: "owner/repo", branch: "feat/example", head: "a".repeat(40), fingerprint: "fresh", pullRequests: globalThis.__prCreated ? [{ number: 1, title: "existing", baseRefName: "main", headRefOid: "a".repeat(40), url: "https://github.com/owner/repo/pull/1" }] : [] };
      });
      ipcMain.handle("demo:git:pr-create", (_event, input) => {
        globalThis.__prCreateCalls.push(input);
        globalThis.__prCreated = true;
        throw new Error("synthetic lost response after creation");
      });
    });
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await page.getByRole("button", { name: "Prepare pull request", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Prepare pull request", exact: true });
    const confirm = dialog.getByRole("button", { name: "Confirm create PR", exact: true });
    await dialog.getByLabel("PR title", { exact: true }).fill("feat: example");
    await dialog.getByLabel("PR description", { exact: true }).fill("Preserve this draft");
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await dialog.getByLabel("PR description", { exact: true }).inputValue(), "Preserve this draft");
    await app.evaluate(() => { globalThis.__prReadFails = false; });
    await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
    await dialog.getByText("No open PR for this branch.", { exact: true }).waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 820);
    await page.screenshot({ path: join(directory, `preview-${width}.png`) });
    await confirm.click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await confirm.isDisabled(), true);
    const calls = await app.evaluate(() => globalThis.__prCreateCalls);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].title, "feat: example");
    assert.equal(calls[0].body, "Preserve this draft");
    assert.equal(calls[0].fingerprint, "fresh");
    await dialog.getByRole("button", { name: "Refresh PRs", exact: true }).click();
    await dialog.getByText(/Existing PR #1:/).waitFor();
    assert.equal(await confirm.isDisabled(), true, "Reconciled existing PR prevents blind retry");
    assert.equal(await dialog.getByLabel("PR description", { exact: true }).inputValue(), "Preserve this draft");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.textContent === "Prepare pull request");
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720], syntheticIpc: true, realGitHubWrites: 0 }));
