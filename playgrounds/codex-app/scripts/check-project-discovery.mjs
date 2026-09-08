import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Only synthetic playground-owned records; no server listing or model turn.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-project-discovery-"));
const restored = join(directory, "restored-project");
const missing = join(directory, "missing-project");
const empty = join(directory, "empty-project");
await mkdir(restored);
await mkdir(empty);
const registry = join(directory, "registry.json");
const records = { version: 1, threads: [
  { id: "owned-restored", directory: restored, title: "Restored project chat", updatedAt: 2 },
  { id: "owned-missing", directory: missing, title: "Missing project chat", updatedAt: 1 },
] };
await writeFile(registry, "broken");
for (const width of [1180, 720]) {
  const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
    capture: false, environment: {
      CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_HISTORY_PATH: registry,
      CODEX_DEMO_PROJECT_FIXTURE_SELECTIONS: JSON.stringify([{ path: empty, label: "Empty selected project" }]),
    },
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
    assert.equal(projects.length, width === 1180 ? 2 : 3);
    assert.ok(projects.find(row => row.path === restored).projectToken);
    assert.equal(projects.find(row => row.path === missing).projectToken, undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `projects-${width}.png`) });
    if (width === 1180) {
      await page.getByRole("button", { name: "New project", exact: true }).click();
      await page.getByText("No chats in this project yet.", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Empty selected project", exact: true }).waitFor();
      const saved = JSON.parse(await readFile(registry, "utf8"));
      assert.equal(saved.version, 2);
      assert.equal(saved.threads.length, 2, "Selecting an empty project must not create a model thread");
      assert.ok(saved.projects.some(project => project.path === empty && project.label === "Empty selected project"));
    }
    if (width === 720) {
      await mkdir(missing);
      await page.getByRole("button", { name: "Retry unavailable projects", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "missing-project" && !button.disabled));
      await page.getByRole("button", { name: "missing-project", exact: true }).click();
      await page.getByRole("button", { name: "Missing project chat", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Restored project chat", exact: true }).count(), 0);
      await page.getByRole("button", { name: "Empty selected project", exact: true }).click();
      await page.getByText("No chats in this project yet.", { exact: true }).waitFor();
      assert.equal(await page.getByRole("textbox", { name: "Message composer", exact: true }).isEnabled(), true);
      await page.screenshot({ path: join(directory, "empty-project-restored-720.png") });
    }
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, modelTurns: 0, restarted: true, emptyProjectRestored: true, widths: [1180, 720] }));
