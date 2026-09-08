import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Only synthetic playground-owned records; no server listing or model turn.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-project-discovery-"));
const restored = join(directory, "restored-project");
const missing = join(directory, "missing-project");
await mkdir(restored);
const registry = join(directory, "registry.json");
const records = { version: 1, threads: [
  { id: "owned-restored", directory: restored, title: "Restored project chat", updatedAt: 2 },
  { id: "owned-missing", directory: missing, title: "Missing project chat", updatedAt: 1 },
] };
await writeFile(registry, "broken");
for (const width of [1180, 720]) {
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
    capture: false, environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_HISTORY_PATH: registry },
  });
  try {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await page.getByRole("button", { name: "Toggle projects", exact: true }).click();
    if (width === 1180) {
      await page.getByText("Couldn’t restore projects.", { exact: true }).waitFor();
      await writeFile(registry, JSON.stringify(records));
      await page.getByRole("button", { name: "Retry projects", exact: true }).click();
    }
    const available = page.getByRole("button", { name: "restored-project", exact: true });
    await available.waitFor();
    assert.equal(await available.isEnabled(), true);
    assert.equal(await page.getByRole("button", { name: "missing-project", exact: true }).isDisabled(), true);
    await available.click();
    await page.getByRole("button", { name: "Restored project chat", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Missing project chat", exact: true }).count(), 0);
    const projects = await page.evaluate(() => window.codexDemo.listLiveProjects());
    assert.equal(projects.length, 2);
    assert.ok(projects.find(row => row.path === restored).projectToken);
    assert.equal(projects.find(row => row.path === missing).projectToken, undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `projects-${width}.png`) });
    if (width === 720) {
      await mkdir(missing);
      await page.getByRole("button", { name: "Retry unavailable projects", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "missing-project" && !button.disabled));
      await page.getByRole("button", { name: "missing-project", exact: true }).click();
      await page.getByRole("button", { name: "Missing project chat", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Restored project chat", exact: true }).count(), 0);
    }
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, modelTurns: 0, restarted: true, widths: [1180, 720] }));
