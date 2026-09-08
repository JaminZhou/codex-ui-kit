import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in persistent-history probe; only its own three turns/threads.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-history-")));
const scene = visualScenes.find(scene => scene.id === "pull-request-detail");
const environment = { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_HISTORY_PATH: join(directory, "registry.json"), CODEX_UI_KIT_LIVE_EPHEMERAL: "0", CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0" };
const owned = new Set();
const evidence = [];
let app, page;
const result = { passed: false, directory };
async function launch() {
  ({ app, page } = await launchScene(scene, { capture: false, environment }));
  await page.evaluate(() => {
    window.__historyEvents = [];
    window.codexDemo.onLiveSession(event => window.__historyEvents.push(event));
    window.codexDemo.onNotification(event => window.__historyEvents.push(event));
  });
  await page.getByRole("button", { name: "Live local", exact: true }).click();
}
async function collect() {
  const events = await page.evaluate(() => window.__historyEvents ?? []).catch(() => []);
  for (const event of events) if (event.kind === "live-bind") owned.add(event.threadId);
  evidence.push(events);
}
async function run(marker) {
  const count = await page.evaluate(() => window.__historyEvents.filter(event => event.method === "turn/completed").length);
  const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
  await composer.fill(`Reply exactly ${marker}. Do not use tools or delegate.`);
  await composer.press("Enter");
  await page.waitForFunction(count => window.__historyEvents.filter(event => event.method === "turn/completed").length > count, count, { timeout: 180000 });
  const completed = await page.evaluate(() => window.__historyEvents.filter(event => event.method === "turn/completed").at(-1));
  assert.equal(completed.params.turn.status, "completed");
  owned.add(completed.params.threadId);
  await page.getByText(marker, { exact: true }).waitFor();
  return completed.params.threadId;
}
try {
  await launch();
  await page.getByText("No chats in this project yet.", { exact: true }).waitFor();
  const a = await run("HISTORY_A_ONE");
  await page.getByRole("button", { name: "New chat", exact: true }).first().click();
  assert.equal(await page.getByText("HISTORY_A_ONE", { exact: true }).count(), 0);
  const b = await run("HISTORY_B_ONE");
  assert.notEqual(a, b);
  await page.getByRole("button", { name: "Reply exactly HISTORY_A_ONE. Do not use tools or delegate.", exact: true }).click();
  await page.getByText("HISTORY_A_ONE", { exact: true }).waitFor();
  assert.equal(await page.getByText("HISTORY_B_ONE", { exact: true }).count(), 0);
  await collect();
  await page.evaluate(() => window.codexDemo.closeLive());
  await app.close();
  app = null;
  await launch();
  await page.getByRole("button", { name: "Reply exactly HISTORY_A_ONE. Do not use tools or delegate.", exact: true }).click();
  await page.getByText("HISTORY_A_ONE", { exact: true }).waitFor();
  assert.equal(await page.getByText("HISTORY_B_ONE", { exact: true }).count(), 0);
  assert.equal(await run("HISTORY_A_TWO"), a);
  await page.getByText("HISTORY_A_ONE", { exact: true }).waitFor();
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `restored-${width}.png`) });
  }
  Object.assign(result, { passed: true, modelTurns: 3, threads: [a, b], restarted: true, restoredAndContinued: true });
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page?.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  if (app) {
    await collect();
    await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
    await app.close();
  }
  const client = new CodexAppServerClient({ capabilities: { experimentalApi: true }, protocolValidation: "strict" });
  result.archived = [];
  try {
    await client.connect();
    for (const id of owned) {
      const { thread } = await client.threadRead({ threadId: id, includeTurns: false });
      assert.equal(thread.cwd, directory, "Never archive outside the disposable test project");
      await client.threadArchive({ threadId: id });
      result.archived.push(id);
    }
  } catch (error) { result.cleanupError = String(error); process.exitCode = 1; }
  finally { await client.close(); }
  await writeFile(join(directory, "events.json"), JSON.stringify(evidence, null, 2));
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
