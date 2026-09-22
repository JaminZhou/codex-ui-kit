import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find((candidate) => candidate.id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live mode.");

const prompt =
  "Immediately invoke the spawnAgent collaboration tool exactly once. Ask one subagent to reply with exactly CHILD_DONE and then wait for it to finish. After it finishes, reply with exactly PARENT_DONE. Do not use shell, MCP, browser, network, file writes, or any other tools.";
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-descendant-archive-")));
const registryPath = join(directory, "registry.json");
const environment = {
  CODEX_UI_KIT_WORKSPACE: directory,
  CODEX_UI_KIT_LIVE_HISTORY_PATH: registryPath,
  CODEX_UI_KIT_LIVE_EPHEMERAL: "0",
  CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
};
const result = { passed: false, directory, evidence: "real signed-in App Server descendant query plus Electron archive/restore UI" };
const owned = new Set();
let app;
let page;

async function listServerDescendants(threadId) {
  const client = new CodexAppServerClient({ capabilities: { experimentalApi: true }, protocolValidation: "strict" });
  try {
    await client.connect();
    const response = await client.threadList({ ancestorThreadId: threadId, archived: false, cwd: directory, limit: 100 });
    return response.data.filter((thread) => thread.cwd === directory);
  } finally {
    await client.close();
  }
}

try {
  ({ app, page } = await launchScene(scene, { capture: false, environment }));
  await page.evaluate(() => {
    window.__descendantArchiveEvents = [];
    window.codexDemo.onLiveSession((event) => window.__descendantArchiveEvents.push(event));
    window.codexDemo.onNotification((event) => window.__descendantArchiveEvents.push(event));
  });
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
  await composer.fill(prompt);
  await composer.press("Enter");
  await page.waitForFunction(
    () => window.__descendantArchiveEvents?.some((event) => event.kind === "live-bind"),
    undefined,
    { timeout: 180_000 },
  );
  const bound = await page.evaluate(() => window.__descendantArchiveEvents.find((event) => event.kind === "live-bind"));
  const parentThreadId = bound?.threadId;
  assert.equal(typeof parentThreadId, "string");
  owned.add(parentThreadId);
  await page.waitForFunction(
    () => window.__descendantArchiveEvents?.some((event) => event.method === "turn/completed" && event.params?.turn?.status === "completed"),
    undefined,
    { timeout: 240_000 },
  );
  await page.getByText("PARENT_DONE", { exact: true }).waitFor({ timeout: 60_000 });

  const descendants = await listServerDescendants(parentThreadId);
  assert.ok(descendants.length >= 1, "The completed parent must expose at least one server descendant.");
  const child = descendants.find((thread) => thread.parentThreadId === parentThreadId) ?? descendants[0];
  assert.ok(child, "A direct descendant must be discoverable from the server.");
  owned.add(child.id);
  result.parentThreadId = parentThreadId;
  result.childThreadId = child.id;
  result.serverDescendantCount = descendants.length;

  const active = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: false }));
  const parentRow = active.threads.find((thread) => thread.id === parentThreadId);
  assert.ok(parentRow, "The parent must be present in the playground-owned active history.");
  await page.getByRole("button", { name: parentRow.title, exact: true }).hover();
  await page.getByRole("button", { name: `Archive ${parentRow.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await page.getByRole("dialog", { name: "Archive chat", exact: true }).waitFor({ state: "hidden" });
  await page.waitForFunction(
    (threadId) => window.__descendantArchiveEvents?.some((event) => event.method === "thread/archived" && event.params?.threadId === threadId),
    parentThreadId,
    { timeout: 60_000 },
  );
  const archived = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: true }));
  const archivedIds = archived.threads.map((thread) => thread.id);
  assert.ok(archivedIds.includes(parentThreadId), "The archived parent must be listed after the remote mutation.");
  assert.ok(archivedIds.includes(child.id), "The server-discovered child must be listed after the remote mutation.");
  result.archivedThreadIds = archivedIds;

  await page.getByRole("button", { name: "Show archived chats", exact: true }).click();
  await page.getByRole("button", { name: parentRow.title, exact: true }).waitFor();
  await page.getByRole("button", { name: parentRow.title, exact: true }).hover();
  await page.getByRole("button", { name: `Restore ${parentRow.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Confirm restore", exact: true }).click();
  await page.getByRole("dialog", { name: "Restore chat", exact: true }).waitFor({ state: "hidden" });
  await page.waitForFunction(
    (threadId) => window.__descendantArchiveEvents?.some((event) => event.method === "thread/unarchived" && event.params?.threadId === threadId),
    parentThreadId,
    { timeout: 60_000 },
  );
  const remainingArchived = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: true }));
  const activeAfterRestore = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: false }));
  assert.ok(remainingArchived.threads.some((thread) => thread.id === child.id), "Restoring the root must not restore its child.");
  assert.ok(!remainingArchived.threads.some((thread) => thread.id === parentThreadId), "The restored root must leave archived history.");
  assert.ok(activeAfterRestore.threads.some((thread) => thread.id === parentThreadId), "The restored root must return to active history.");
  result.remainingArchivedThreadIds = remainingArchived.threads.map((thread) => thread.id);
  result.activeAfterRestoreThreadIds = activeAfterRestore.threads.map((thread) => thread.id);
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page?.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  const events = await page?.evaluate(() => window.__descendantArchiveEvents ?? []).catch(() => []);
  if (app) {
    await page?.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
    await app.close();
  }
  const client = new CodexAppServerClient({ capabilities: { experimentalApi: true }, protocolValidation: "strict" });
  try {
    await client.connect();
    for (const id of owned) {
      const { thread } = await client.threadRead({ threadId: id, includeTurns: false });
      assert.equal(thread.cwd, directory, "Never archive outside the disposable test project");
      await client.threadArchive({ threadId: id }).catch(() => undefined);
    }
  } catch (error) {
    result.cleanupError = String(error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
  await writeFile(join(directory, "events.json"), JSON.stringify(events, null, 2));
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
