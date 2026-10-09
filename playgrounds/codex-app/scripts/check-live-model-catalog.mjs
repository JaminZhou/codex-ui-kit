import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Public metadata only; isolated credential home, no model turn or selection.
const home = await mkdtemp(join(tmpdir(), "ui-kit-model-catalog-"));
let app;
try {
  for (const width of [1180, 720]) {
    const scene = { ...visualScenes.find(scene => scene.id === "workspace-environments-unavailable"), windowSize: { width, height: 820 } };
    const launched = await launchScene(scene, { capture: false, environment: { CODEX_HOME: home } });
    app = launched.app;
    const page = launched.page;
    const live = page.getByRole("button", { name: "Live local", exact: true });
    if (!await live.isVisible()) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await live.click();
    const token = await page.evaluate(() => {
      window.__modelCatalogEvents = [];
      window.codexDemo.onNotification(event => window.__modelCatalogEvents.push(event));
      return window.codexDemo.startupWorkspaceProjectToken;
    });
    assert.ok(token);
    await assert.rejects(page.evaluate(() => window.codexDemo.listLiveModels({ projectToken: "untrusted-project" })));
    await page.evaluate(() => window.codexDemo.closeLive());
    const concurrent = await page.evaluate(token => Promise.all([
      window.codexDemo.listLiveModels({ projectToken: token }),
      window.codexDemo.listLiveModels({ projectToken: token }),
      window.codexDemo.listLiveThreads({ projectToken: token }),
    ]), token);
    const expected = concurrent[0];
    assert.deepEqual(concurrent[1], expected, "Concurrent cold-start public reads must share initialization");
    assert.ok(expected.length > 0, "Actual runtime must return a catalog for this gate");
    const trigger = page.getByRole("button", { name: "Runtime model capabilities", exact: true });
    if (!await trigger.isVisible()) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Runtime model capabilities", exact: true });
    await dialog.getByRole("list", { name: "Runtime models", exact: true }).waitFor();
    const actual = await dialog.getByRole("list", { name: "Runtime models", exact: true }).locator(":scope > li").allTextContents();
    assert.equal(actual.length, expected.length);
    expected.forEach((model, i) => {
      assert.ok(actual[i].includes(model.displayName));
      assert.ok(actual[i].includes(`Default effort: ${model.defaultReasoningEffort}`));
      model.supportedReasoningEfforts.forEach(option => assert.ok(actual[i].includes(`${option.reasoningEffort}: ${option.description}`)));
    });
    assert.ok(await dialog.getByText(/This dialog does not select a model or start a task/).isVisible());
    await dialog.getByRole("button", { name: "Refresh models", exact: true }).click();
    await dialog.getByRole("list", { name: "Runtime models", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // The public read above is real. These owned-process handlers separately
    // exercise renderer error/stale-response behavior, not service evidence.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:live:models");
      ipcMain.handle("demo:live:models", () => { throw new Error("Synthetic catalog failure"); });
    });
    await dialog.getByRole("button", { name: "Refresh models", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await dialog.getByRole("list", { name: "Runtime models", exact: true }).count(), 0);
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:live:models");
      ipcMain.handle("demo:live:models", () => new Promise(resolve => { globalThis.__resolveModelCatalog = resolve; }));
    });
    await dialog.getByRole("button", { name: "Refresh models", exact: true }).click();
    await dialog.getByRole("status").waitFor();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    assert.equal(await dialog.count(), 0);
    const fresh = [{ ...expected[0], displayName: "Synthetic fresh catalog" }];
    await app.evaluate(({ ipcMain }, models) => {
      ipcMain.removeHandler("demo:live:models");
      ipcMain.handle("demo:live:models", () => models);
    }, fresh);
    await trigger.click();
    await dialog.getByText("Synthetic fresh catalog", { exact: true }).waitFor();
    await app.evaluate((_, models) => { globalThis.__resolveModelCatalog(models); delete globalThis.__resolveModelCatalog; }, expected);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await dialog.getByRole("list", { name: "Runtime models", exact: true }).locator(":scope > li").count(), 1);
    assert.equal(await dialog.getByText("Synthetic fresh catalog", { exact: true }).isVisible(), true);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    const chooser = page.getByRole("button", { name: "Choose live model", exact: true });
    if (!await chooser.isVisible()) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await chooser.click();
    const choiceDialog = page.getByRole("dialog", { name: "Next live turn model", exact: true });
    const modelControl = choiceDialog.getByRole("combobox", { name: "Runtime model", exact: true });
    await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), fresh[0].id);
    await modelControl.selectOption(fresh[0].id);
    assert.equal(await choiceDialog.getByRole("combobox", { name: "Runtime reasoning effort", exact: true }).inputValue(), fresh[0].defaultReasoningEffort);
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:live:models"); ipcMain.handle("demo:live:models", () => []);
    });
    await choiceDialog.getByRole("button", { name: "Refresh model choices", exact: true }).click();
    await choiceDialog.getByRole("alert").waitFor();
    assert.equal(await modelControl.inputValue(), "", "Removed catalog choices must clear the pending override");
    await app.evaluate(({ ipcMain }, models) => {
      ipcMain.removeHandler("demo:live:models"); ipcMain.handle("demo:live:models", () => models);
    }, fresh);
    await choiceDialog.getByRole("button", { name: "Refresh model choices", exact: true }).click();
    await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), fresh[0].id);
    await modelControl.selectOption(fresh[0].id);
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:live:models");
      ipcMain.handle("demo:live:models", () => { throw new Error("Synthetic selection catalog failure"); });
    });
    await choiceDialog.getByRole("button", { name: "Refresh model choices", exact: true }).click();
    await choiceDialog.getByRole("alert").waitFor();
    assert.equal(await modelControl.inputValue(), "");
    assert.equal(await choiceDialog.getByRole("combobox", { name: "Runtime reasoning effort", exact: true }).isDisabled(), true);
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("demo:live:models");
      ipcMain.handle("demo:live:models", () => new Promise(resolve => { globalThis.__resolveModelChoice = resolve; }));
    });
    await choiceDialog.getByRole("button", { name: "Refresh model choices", exact: true }).click();
    await choiceDialog.getByRole("status").waitFor();
    await choiceDialog.getByRole("button", { name: "Close model choices", exact: true }).click();
    await app.evaluate(({ ipcMain }, models) => {
      ipcMain.removeHandler("demo:live:models"); ipcMain.handle("demo:live:models", () => models);
    }, fresh);
    await chooser.click();
    await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), fresh[0].id);
    await app.evaluate((_, models) => { globalThis.__resolveModelChoice(models); delete globalThis.__resolveModelChoice; }, expected);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await modelControl.locator("option").count(), 2, "A closed old read must not replace the newly opened choices");
    await choiceDialog.getByRole("button", { name: "Close model choices", exact: true }).click();
    assert.equal(await page.evaluate(() => window.__modelCatalogEvents.some(event => /^(thread\/started|turn\/|item\/)/.test(event.method))), false);
    await app.close(); app = undefined;
    console.log(`live-model-catalog-${width}: complete public capability read and Electron/CDP rendering passed; no selection/turn or installed-product parity claim`);
  }
} finally {
  try { await app?.close(); } finally { await rm(home, { recursive: true, force: true }); }
}
