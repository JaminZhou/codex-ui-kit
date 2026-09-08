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
  for (const archived of [true, false]) {
    assert.equal(await page.evaluate(async archived => {
      try { await window.codexDemo.setLiveThreadArchived({ projectToken: "startup-workspace", threadId: "foreign-thread", archived }); return false; }
      catch { return true; }
    }, archived), true, "Archive and restore must reject unowned IDs before contacting App Server");
  }
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
  await page.getByRole("button", { name: "Owned chat 0", exact: true }).hover();
  await page.getByRole("button", { name: "Archive Owned chat 0", exact: true }).click();
  await page.getByText("Archive this chat and its spawned child chats. This does not permanently delete them.", { exact: true }).waitFor();
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    const bounds = await page.getByRole("dialog", { name: "Archive chat", exact: true }).boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 820);
    await page.screenshot({ path: join(directory, `archive-confirm-${width}.png`) });
  }
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler("demo:live:thread:archive");
    let calls = 0;
    ipcMain.handle("demo:live:thread:archive", (_event, input) => {
      if (++calls === 1) throw new Error("synthetic archive transport failure");
      return { threadId: input.threadId, archived: input.archived, changedThreadIds: [input.threadId] };
    });
  });
  await page.getByRole("button", { name: "Archive Owned chat 0", exact: true }).click();
  await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await page.getByText("Couldn’t update chat archive. Try again.", { exact: true }).waitFor();
  const archiveFixture = JSON.parse(await readFile(registry, "utf8"));
  archiveFixture.threads.find(row => row.id === "owned-0").archived = true;
  await writeFile(registry, JSON.stringify(archiveFixture));
  await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await page.getByRole("dialog", { name: "Archive chat", exact: true }).waitFor({ state: "hidden" });
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Show archived chats", exact: true }).click();
  await page.getByRole("button", { name: "Owned chat 0", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Owned chat 0", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Owned chat 0", exact: true }).hover();
  await page.getByRole("button", { name: "Restore Owned chat 0", exact: true }).click();
  await page.getByText("Restore this chat only. Archived child chats are not restored automatically.", { exact: true }).waitFor();
  archiveFixture.threads.find(row => row.id === "owned-0").archived = false;
  await writeFile(registry, JSON.stringify(archiveFixture));
  await page.getByRole("button", { name: "Confirm restore", exact: true }).click();
  await page.getByText("No archived chats in this project.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Show active chats", exact: true }).click();
  await page.getByRole("button", { name: "Owned chat 0", exact: true }).click();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  // Simulate another writer changing only this fixture registry. Focus reads
  // the real host registry; no synthetic notification is sent to the renderer.
  const external = JSON.parse(await readFile(registry, "utf8"));
  await page.getByRole("button", { name: "Rename Owned chat 0", exact: true }).click();
  await page.getByRole("textbox", { name: "Chat name", exact: true }).fill("Unsaved draft");
  external.threads.find(row => row.id === "owned-0").title = "External rename";
  await writeFile(registry, JSON.stringify(external));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  assert.equal(await page.getByRole("textbox", { name: "Chat name", exact: true }).inputValue(), "Unsaved draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "External rename", exact: true }).waitFor();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  await writeFile(registry, "broken external registry");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByText("Couldn’t load chats.", { exact: true }).waitFor();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  // More archived records than one page: selection invalidation must not be
  // inferred from absence in the active page or limited to the archived page.
  for (const row of external.threads) if (row.id !== "owned-1") row.archived = true;
  external.threads.find(row => row.id === "owned-0").updatedAt = -1;
  await writeFile(registry, JSON.stringify(external));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor({ state: "hidden" });
  const snapshot = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: true }));
  assert.equal(snapshot.archivedThreadIds.length, 24);
  assert.ok(!snapshot.threads.some(row => row.id === "owned-0"));
  assert.ok(snapshot.archivedThreadIds.includes("owned-0"));
  for (const row of external.threads) row.archived = false;
  external.threads.find(row => row.id === "owned-0").updatedAt = 100;
  await writeFile(registry, JSON.stringify(external));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("button", { name: "External rename", exact: true }).click();
  await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).waitFor();
  await page.getByRole("button", { name: "New chat", exact: true }).first().click();
  assert.equal(await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Owned chat 1", exact: true }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await app.evaluate(() => globalThis.__historyRead);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await page.getByText("STORED_FIXTURE_ANSWER", { exact: true }).count(), 0, "Late history must not replace Replay");
  console.log(JSON.stringify({ passed: true, modelTurns: 0, directory, registryRecovery: true, pagination: true, unownedRejected: true, staleReadIgnored: true, externalFocusRefresh: true, offPageArchiveInvalidation: true }));
} finally { await app.close(); }
