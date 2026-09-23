import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find((candidate) => candidate.id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live mode.");

const prompt =
  "Do not reply with a plan. Immediately invoke the spawnAgent collaboration tool exactly once to spawn one subagent. Ask it to reply with exactly CHILD_DONE, then wait for it to finish. After it finishes, reply with exactly PARENT_DONE. The first and only tool call must be the collaboration spawn. Do not use Sites, MCP, browser, GitHub, connectors, approvals, shell, network, file writes, or any other tools.";
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-descendant-archive-")));
const registryPath = join(directory, "registry.json");
const environment = {
  CODEX_UI_KIT_WORKSPACE: directory,
  CODEX_UI_KIT_LIVE_HISTORY_PATH: registryPath,
  CODEX_UI_KIT_LIVE_EPHEMERAL: "0",
  CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
  CODEX_UI_KIT_LIVE_MODEL:
    process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-sol",
  CODEX_UI_KIT_LIVE_REASONING_EFFORT:
    process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "ultra",
};
const result = { passed: false, directory, evidence: "real signed-in App Server descendant query plus Electron archive/restore UI" };
const owned = new Set();
let app;
let page;

function isSubagentStart(event) {
  const item = event?.params?.item;
  if (event?.method !== "item/started" || !item) return false;
  if (
    item.type === "subAgentActivity" &&
    item.kind === "started" &&
    typeof item.agentThreadId === "string"
  ) {
    return true;
  }
  return (
    item.type === "collabAgentToolCall" &&
    item.tool !== "wait" &&
    (typeof item.tool === "string" ||
      (Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
      Object.keys(item.agentsStates ?? {}).length > 0)
  );
}

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
    () => window.__descendantArchiveEvents?.some((event) => {
      const item = event?.params?.item;
      if (event?.method !== "item/started" || !item) return false;
      if (
        item.type === "subAgentActivity" &&
        item.kind === "started" &&
        typeof item.agentThreadId === "string"
      ) {
        return true;
      }
      return (
        item.type === "collabAgentToolCall" &&
        item.tool !== "wait" &&
        (typeof item.tool === "string" ||
          (Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
          Object.keys(item.agentsStates ?? {}).length > 0)
      );
    }),
    undefined,
    { timeout: 180_000 },
  );
  const events = await page.evaluate(() => window.__descendantArchiveEvents);
  const collabStarted = events.find(isSubagentStart);
  const parentThreadId = collabStarted?.params?.threadId;
  assert.equal(typeof parentThreadId, "string");
  owned.add(parentThreadId);

  const callId = collabStarted.params.item.id;
  assert.equal(typeof callId, "string");
  const usesSubAgentActivity = collabStarted.params.item.type === "subAgentActivity";
  const initialChildThreadId = usesSubAgentActivity
    ? collabStarted.params.item.agentThreadId
    : null;
  await page.waitForFunction(
    ({ expectedCallId, expectedChildThreadId, usesSubAgentActivity: currentProtocol }) =>
      window.__descendantArchiveEvents?.some((event) => {
        const item = event.params?.item;
        if (
          currentProtocol &&
          expectedChildThreadId &&
          event.method === "thread/status/changed" &&
          event.params?.threadId === expectedChildThreadId
        ) {
          return true;
        }
        return !currentProtocol && (
          (event.method === "item/started" || event.method === "item/completed") &&
          item?.type === "collabAgentToolCall" &&
          item.id === expectedCallId &&
          ((Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
            Object.keys(item.agentsStates ?? {}).length > 0)
        );
      }),
    {
      expectedCallId: callId,
      expectedChildThreadId: initialChildThreadId,
      usesSubAgentActivity,
    },
    { timeout: 120_000 },
  );
  const receiverEvents = await page.evaluate(() => window.__descendantArchiveEvents);
  const receiverEvent = usesSubAgentActivity
    ? null
    : receiverEvents.findLast((event) => {
        const item = event.params?.item;
        return (
          (event.method === "item/started" || event.method === "item/completed") &&
          item?.type === "collabAgentToolCall" &&
          item.id === callId &&
          ((Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
            Object.keys(item.agentsStates ?? {}).length > 0)
        );
      });
  const childThreadId = usesSubAgentActivity
    ? initialChildThreadId
    : receiverEvent?.params?.item?.receiverThreadIds?.[0] ?? null;
  assert.equal(typeof childThreadId, "string");
  owned.add(childThreadId);
  await page.waitForFunction(
    (threadId) => window.__descendantArchiveEvents?.some(
      (event) => event.method === "turn/completed" && event.params?.threadId === threadId && event.params?.turn?.status === "completed",
    ),
    parentThreadId,
    { timeout: 240_000 },
  );
  await page.getByText("PARENT_DONE", { exact: true }).waitFor({ timeout: 60_000 });

  const descendants = await listServerDescendants(parentThreadId);
  assert.ok(descendants.length >= 1, "The completed parent must expose at least one server descendant.");
  const child = descendants.find((thread) => thread.id === childThreadId) ?? descendants.find((thread) => thread.parentThreadId === parentThreadId) ?? descendants[0];
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
  const childRow = remainingArchived.threads.find((thread) => thread.id === child.id);
  assert.ok(childRow, "The archived child must remain available for explicit deletion.");
  await page.getByRole("button", { name: childRow.title, exact: true }).hover();
  await page.getByRole("button", { name: `Delete ${childRow.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete chat permanently", exact: true }).waitFor({ state: "hidden" });
  await page.waitForFunction(
    (threadId) => window.__descendantArchiveEvents?.some((event) => event.method === "thread/deleted" && event.params?.threadId === threadId),
    child.id,
    { timeout: 60_000 },
  );
  owned.delete(child.id);
  const afterChildDelete = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: true }));
  assert.ok(!afterChildDelete.threads.some((thread) => thread.id === child.id), "Explicit deletion must remove the archived child.");
  await page.getByRole("button", { name: "Show active chats", exact: true }).click();
  const restoredRoot = activeAfterRestore.threads.find((thread) => thread.id === parentThreadId);
  assert.ok(restoredRoot, "The restored root must remain available for cleanup.");
  await page.getByRole("button", { name: restoredRoot.title, exact: true }).hover();
  await page.getByRole("button", { name: `Archive ${restoredRoot.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await page.getByRole("dialog", { name: "Archive chat", exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Show archived chats", exact: true }).click();
  await page.getByRole("button", { name: restoredRoot.title, exact: true }).waitFor();
  await page.getByRole("button", { name: restoredRoot.title, exact: true }).hover();
  await page.getByRole("button", { name: `Delete ${restoredRoot.title}`, exact: true }).click();
  await page.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete chat permanently", exact: true }).waitFor({ state: "hidden" });
  await page.waitForFunction(
    (threadId) => window.__descendantArchiveEvents?.some((event) => event.method === "thread/deleted" && event.params?.threadId === threadId),
    parentThreadId,
    { timeout: 60_000 },
  );
  owned.delete(parentThreadId);
  const afterRootDelete = await page.evaluate(() => window.codexDemo.listLiveThreads({ projectToken: "startup-workspace", archived: true }));
  assert.equal(afterRootDelete.threads.length, 0, "Explicit deletion must remove the archived root.");
  result.deletedThreadIds = [child.id, parentThreadId];
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
