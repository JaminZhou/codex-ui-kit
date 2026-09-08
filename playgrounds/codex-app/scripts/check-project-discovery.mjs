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
const external = join(directory, "external-project");
await mkdir(restored);
await mkdir(empty);
await mkdir(external);
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
    assert.equal(projects.length, width === 1180 ? 2 : 4);
    assert.ok(projects.find(row => row.path === restored).projectToken);
    assert.equal(projects.find(row => row.path === missing).projectToken, undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `projects-${width}.png`) });
    const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
    await composer.fill(`Unsubmitted project draft ${width}`);
    const beforeRefresh = JSON.parse(await readFile(registry, "utf8"));
    const refreshed = { ...beforeRefresh, version: 2, projects: beforeRefresh.projects ?? projects.map(({ path, label }) => ({ path, label, updatedAt: 1 })) };
    refreshed.projects = [...refreshed.projects.filter(project => project.path !== external), { path: external, label: `External project ${width}`, updatedAt: 10 }];
    await writeFile(registry, JSON.stringify(refreshed));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const externalRow = page.getByRole("button", { name: `External project ${width}`, exact: true });
    await externalRow.waitFor();
    assert.equal(await externalRow.isEnabled(), true);
    assert.equal(await available.getAttribute("aria-pressed"), "true", "Discovery must not switch the current project");
    assert.equal(await composer.inputValue(), `Unsubmitted project draft ${width}`);
    await page.getByRole("button", { name: "Restored project chat", exact: true }).waitFor();
    const afterTokens = await page.evaluate(() => window.codexDemo.listLiveProjects());
    assert.equal(afterTokens.find(row => row.path === restored).projectToken, projects.find(row => row.path === restored).projectToken);
    await writeFile(registry, "corrupt external update");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Couldn’t restore projects.", { exact: true }).waitFor();
    assert.equal(await available.getAttribute("aria-pressed"), "true");
    assert.equal(await composer.inputValue(), `Unsubmitted project draft ${width}`);
    await writeFile(registry, JSON.stringify(refreshed));
    await page.getByRole("button", { name: "Retry projects", exact: true }).click();
    await page.getByText("Couldn’t restore projects.", { exact: true }).waitFor({ state: "hidden" });
    // Project retry and conversation retry are independent. A fresh focus
    // revalidates both after the shared registry is repaired.
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.getByText("Couldn’t load chats.", { exact: true }).waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Restored project chat", exact: true }).waitFor();
    assert.equal(await composer.inputValue(), `Unsubmitted project draft ${width}`);
    await page.screenshot({ path: join(directory, `focus-refresh-${width}.png`) });
    await composer.fill("");
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
console.log(JSON.stringify({ passed: true, directory, modelTurns: 0, restarted: true, emptyProjectRestored: true, focusDiscovery: true, draftAndSelectionPreserved: true, widths: [1180, 720] }));
