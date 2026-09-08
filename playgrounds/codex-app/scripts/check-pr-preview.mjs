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
      globalThis.__prDetailFails = false;
      ipcMain.removeHandler("demo:git:pr-detail");
      ipcMain.handle("demo:git:pr-detail", () => {
        if (globalThis.__prDetailFails) throw new Error("synthetic detail failure");
        return { number: 1, url: "https://github.com/owner/repo/pull/1", title: "Existing details", body: "<script>not executed</script>\nBody text", state: "OPEN", baseRefName: "main", headRefOid: "a".repeat(40), changedFiles: 3, files: [{ path: "src/example.ts", additions: 2, deletions: 1 }] };
      });
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
    const link = dialog.getByRole("link", { name: "Open PR #1 on GitHub", exact: true });
    assert.equal(await link.getAttribute("href"), "https://github.com/owner/repo/pull/1");
    await dialog.getByRole("button", { name: "Read details #1", exact: true }).click();
    const detail = dialog.getByRole("region", { name: "PR details", exact: true });
    await detail.getByText("1 of 3 changed files shown", { exact: true }).waitFor();
    assert.ok((await detail.textContent()).includes("<script>not executed</script>"));
    assert.equal(await detail.locator("script").count(), 0);
    const detailBounds = await dialog.boundingBox();
    assert.ok(detailBounds && detailBounds.y >= 0 && detailBounds.y + detailBounds.height <= 820);
    const closeBounds = await dialog.getByRole("button", { name: "Close", exact: true }).boundingBox();
    assert.ok(closeBounds && closeBounds.y >= 0 && closeBounds.y + closeBounds.height <= 820, "Footer must remain inside the window");
    await page.screenshot({ path: join(directory, `details-${width}.png`) });
    await app.evaluate(() => { globalThis.__prDetailFails = true; });
    await dialog.getByRole("button", { name: "Read details #1", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await detail.count(), 0, "Failed detail refresh must clear obsolete contents");
    await app.evaluate(() => { globalThis.__prDetailFails = false; });
    await dialog.getByRole("button", { name: "Read details #1", exact: true }).click();
    await detail.waitFor();
    assert.equal(await dialog.getByLabel("PR description", { exact: true }).inputValue(), "Preserve this draft");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.textContent === "Prepare pull request");
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720], syntheticIpc: true, realGitHubWrites: 0 }));
