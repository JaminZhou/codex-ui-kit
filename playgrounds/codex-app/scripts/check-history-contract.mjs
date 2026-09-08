import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Synthetic owned-registry and history-response fixture; no model turn.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-history-contract-"));
const registry = join(directory, "registry.json");
await writeFile(registry, "broken registry");
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false, environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_HISTORY_PATH: registry },
});
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.getByText("Couldn’t load chats.", { exact: true }).waitFor();
  await writeFile(registry, JSON.stringify({ version: 1, threads: [] }));
  await page.getByRole("button", { name: "Retry chats", exact: true }).click();
  await page.getByText("No chats in this project yet.", { exact: true }).waitFor();
  const denied = await page.evaluate(async () => {
    try { await window.codexDemo.readLiveThread({ projectToken: "startup-workspace", threadId: "foreign-thread" }); return false; }
    catch { return true; }
  });
  assert.equal(denied, true, "Unowned IDs must fail before contacting App Server");
  await writeFile(registry, JSON.stringify({ version: 1, threads: Array.from({ length: 25 }, (_, i) => ({ id: `owned-${i}`, title: `Owned chat ${i}`, directory, updatedAt: 100 - i })) }));
  await page.getByRole("button", { name: "Refresh chats", exact: true }).click();
  await page.getByRole("button", { name: "Owned chat 19", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Owned chat 24", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Load more chats", exact: true }).click();
  await page.getByRole("button", { name: "Owned chat 24", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Load more chats", exact: true }).count(), 0);
  assert.equal(await page.evaluate(async () => {
    try { await window.codexDemo.renameLiveThread({ projectToken: "startup-workspace", threadId: "foreign-thread", name: "No" }); return false; }
    catch { return true; }
  }), true, "Rename must reject unowned threads before contacting the server");
  await page.getByRole("button", { name: "Owned chat 19", exact: true }).hover();
  await page.getByRole("button", { name: "Rename Owned chat 19", exact: true }).click();
  await page.getByRole("textbox", { name: "Chat name", exact: true }).fill("   ");
  assert.equal(await page.getByRole("button", { name: "Save name", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("demo:live:thread:rename");
    let attempts = 0;
    ipcMain.handle("demo:live:thread:rename", async (_event, input) => {
      if (++attempts === 1) throw new Error("synthetic transport failure");
      return { threadId: input.threadId, title: input.name.trim() };
    });
  });
  await page.getByRole("button", { name: "Rename Owned chat 19", exact: true }).click();
  await page.getByRole("textbox", { name: "Chat name", exact: true }).fill("Renamed fixture chat");
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await page.getByText("Couldn’t rename chat. Try again.", { exact: true }).waitFor();
  // Seed the successful remote result from the harness, outside Electron's eval context.
  const renamedFixture = JSON.parse(await readFile(registry, "utf8"));
  renamedFixture.threads.find(row => row.id === "owned-19").title = "Renamed fixture chat";
  await writeFile(registry, JSON.stringify(renamedFixture));
  await page.getByRole("button", { name: "Save name", exact: true }).click();
  await page.getByRole("button", { name: "Renamed fixture chat", exact: true }).waitFor();
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("demo:live:thread:read");
    ipcMain.handle("demo:live:thread:read", (_event, input) => {
      const response = new Promise(resolve => setTimeout(() => resolve({ threadId: input.threadId, turns: [{ id: "stored-turn", status: "completed", items: [{ type: "agentMessage", id: "stored-answer", text: "STORED_FIXTURE_ANSWER" }] }] }), 250));
      globalThis.__historyRead = response;
      return response;
    });
  });
  await page.getByRole("button", { name: "Owned chat 0", exact: true }).click();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Owned chat 0", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "New chat", exact: true }).first().click();
  assert.equal(await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Owned chat 1", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await app.evaluate(() => globalThis.__historyRead);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).count(), 0, "Late history must not replace Replay");
  console.log(JSON.stringify({ passed: true, modelTurns: 0, directory, registryRecovery: true, pagination: true, unownedRejected: true, staleReadIgnored: true }));
} finally { await app.close(); }
