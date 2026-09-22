import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Two real Electron hosts share one playground-owned registry. The second
// host must see writes from the first without relying on a window focus event.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-history-sync-")));
const historyPath = join(directory, "registry.json");
const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for history sync.");
const environment = {
  CODEX_UI_KIT_LIVE_EPHEMERAL: "0",
  CODEX_UI_KIT_LIVE_HISTORY_PATH: historyPath,
  CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
  CODEX_UI_KIT_WORKSPACE: directory,
};
const owned = new Set();
const archivedByProbe = new Set();
const result = {
  directory,
  passed: false,
  widths: [1180, 720],
};
let first;
let second;

async function openLive(app) {
  await app.page.getByRole("button", { name: "Live local", exact: true }).click();
  await app.page.getByText("No chats in this project yet.", { exact: true }).waitFor();
}

async function runFirst(marker) {
  const before = await first.page.evaluate(
    () => window.__historySyncEvents.filter((event) => event.method === "turn/completed").length,
  );
  const composer = first.page.getByRole("textbox", { name: "Message composer", exact: true });
  await composer.fill(`Reply exactly ${marker}. Do not use tools or delegate.`);
  await composer.press("Enter");
  await first.page.waitForFunction(
    (count) => window.__historySyncEvents.filter((event) => event.method === "turn/completed").length > count,
    before,
    { timeout: 180_000 },
  );
  const completed = await first.page.evaluate(
    () => window.__historySyncEvents.filter((event) => event.method === "turn/completed").at(-1),
  );
  assert.equal(completed.params.turn.status, "completed");
  owned.add(completed.params.threadId);
  await first.page.getByText(marker, { exact: true }).waitFor();
  return completed.params.threadId;
}

try {
  first = await launchScene(scene, { capture: false, environment });
  second = await launchScene(scene, { capture: false, environment });
  for (const app of [first, second]) {
    await app.page.evaluate(() => {
      window.__historySyncEvents = [];
      window.__historySyncChanges = 0;
      window.codexDemo.onNotification((event) => window.__historySyncEvents.push(event));
      window.codexDemo.onLiveHistoryChange(() => { window.__historySyncChanges += 1; });
    });
  }
  await Promise.all([openLive(first), openLive(second)]);

  const threadId = await runFirst("SYNC_INITIAL");
  await second.page.waitForFunction(() => window.__historySyncChanges > 0, undefined, { timeout: 30_000 });
  await second.page.getByRole("button", { name: "Reply exactly SYNC_INITIAL. Do not use tools or delegate.", exact: true }).waitFor();

  const firstTitle = "Reply exactly SYNC_INITIAL. Do not use tools or delegate.";
  await first.page.getByRole("button", { name: firstTitle, exact: true }).hover();
  await first.page.getByRole("button", { name: `Rename ${firstTitle}`, exact: true }).click();
  await first.page.getByRole("textbox", { name: "Chat name", exact: true }).fill("SYNC_RENAMED");
  await first.page.getByRole("button", { name: "Save name", exact: true }).click();
  await first.page.getByRole("button", { name: "SYNC_RENAMED", exact: true }).waitFor();
  await second.page.waitForFunction(() => window.__historySyncChanges > 1, undefined, { timeout: 30_000 });
  await second.page.getByRole("button", { name: "SYNC_RENAMED", exact: true }).waitFor();
  assert.equal(await second.page.getByRole("button", { name: firstTitle, exact: true }).count(), 0);

  await first.page.getByRole("button", { name: "SYNC_RENAMED", exact: true }).hover();
  await first.page.getByRole("button", { name: "Archive SYNC_RENAMED", exact: true }).click();
  await first.page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await first.page.getByRole("dialog", { name: "Archive chat", exact: true }).waitFor({ state: "hidden" });
  archivedByProbe.add(threadId);
  await second.page.waitForFunction(() => window.__historySyncChanges > 2, undefined, { timeout: 30_000 });
  await second.page.getByRole("button", { name: "SYNC_RENAMED", exact: true }).waitFor({ state: "hidden" });
  await second.page.getByRole("button", { name: "Show archived chats", exact: true }).click();
  await second.page.getByRole("button", { name: "SYNC_RENAMED", exact: true }).waitFor();

  await second.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(720, 820));
  await second.page.waitForFunction(() => innerWidth === 720);
  assert.equal(await second.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await second.page.screenshot({ path: join(directory, "sync-compact.png") });
  result.historyChanges = await second.page.evaluate(() => window.__historySyncChanges);
  result.threadId = threadId;
  result.renamed = true;
  result.archived = true;
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await second?.page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  for (const app of [first, second]) {
    await app?.page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
    await app?.app.close().catch(() => undefined);
  }
  const client = new CodexAppServerClient({ capabilities: { experimentalApi: true }, protocolValidation: "strict" });
  result.archivedThreadIds = [];
  try {
    await client.connect();
    for (const id of owned) {
      if (archivedByProbe.has(id)) {
        result.archivedThreadIds.push(id);
        continue;
      }
      const { thread } = await client.threadRead({ threadId: id, includeTurns: false });
      assert.equal(thread.cwd, directory, "Never archive outside the disposable test project");
      if (thread.status.type !== "archived") {
        await client.threadArchive({ threadId: id });
      }
      result.archivedThreadIds.push(id);
    }
  } catch (error) {
    result.cleanupError = String(error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
