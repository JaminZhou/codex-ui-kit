import assert from "node:assert/strict";
import { mkdtemp, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find((candidate) => candidate.id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live mode.");

const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-background-terminal-")),
);
const prompt = [
  "In this disposable workspace, use the terminal tool to start exactly this command as a detached background terminal and leave it running after your response:",
  "printf 'live-background-handle ready\\n'; sleep 600",
  "Return as soon as the process has started; do not wait for command completion, poll it, run any other command or tool, or stop it. Reply exactly LIVE_BACKGROUND_OK once it is running.",
].join(" ");
const evidence = [];
const { app, page } = await launchScene(scene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_LIVE_EPHEMERAL: "1",
    CODEX_UI_KIT_LIVE_HISTORY_PATH: join(directory, "history.json"),
    CODEX_UI_KIT_LIVE_MODEL: "gpt-5.6-luna",
    CODEX_UI_KIT_LIVE_REASONING_EFFORT: "max",
    CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "1",
    CODEX_UI_KIT_WORKSPACE: directory,
  },
});

const result = {
  directory,
  evidence: "real signed-in App Server background terminal list/open/terminate",
  modelTurns: 1,
  passed: false,
};
let threadId = null;
let processId = null;

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__liveBackgroundEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__liveBackgroundEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(prompt);
  await composer.press("Enter");

  await page.waitForFunction(
    () =>
      window.__liveBackgroundEvidence?.some(
        (event) =>
          event.method === "item/started" &&
          event.params?.item?.type === "commandExecution" &&
          event.params.item.processId,
      ),
    undefined,
    { timeout: 180_000 },
  );
  const started = await page.evaluate(() =>
    window.__liveBackgroundEvidence.find(
      (event) =>
        event.method === "item/started" &&
        event.params?.item?.type === "commandExecution" &&
        event.params.item.processId,
    ),
  );
  assert.ok(started, "A real background commandExecution must be observed.");
  threadId = started.params.threadId;
  const commandId = started.params.item.id;
  processId = started.params.item.processId;
  assert.equal(typeof threadId, "string");
  assert.equal(typeof commandId, "string");
  assert.match(String(started.params.item.command ?? ""), /sleep 600/);
  result.startedItem = {
    command: started.params.item.command,
    cwd: started.params.item.cwd,
    id: commandId,
    processId,
  };

  await page.waitForFunction(
    () =>
      window.__liveBackgroundEvidence?.some(
        (event) =>
          event.method === "turn/completed" &&
          event.params?.turn?.status === "completed",
      ),
    undefined,
    { timeout: 120_000 },
  );
  result.turnCompletedWhileProcessExpectedToRemain = true;

  // App Server can publish item/started before the background-terminal index
  // catches up. Keep the real list assertion strict, but allow the async
  // registry a little longer than the normal live-turn timeout.
  const rowsDeadline = Date.now() + 60_000;
  let rows = [];
  while (Date.now() < rowsDeadline) {
    rows = await page.evaluate(async (expectedThreadId) =>
      window.codexDemo.listLiveBackgroundTerminals({
        projectToken: window.codexDemo.startupWorkspaceProjectToken,
        threadId: expectedThreadId,
      }),
    threadId);
    if (rows.length === 1 && rows[0]?.itemId === commandId) break;
    await page.waitForTimeout(250);
  }
  result.rowsAtDiscovery = rows;
  result.eventTimeline = await page.evaluate(() =>
    (window.__liveBackgroundEvidence ?? []).flatMap((event) => {
      if (event.method === "turn/completed") {
        return [{ method: event.method, status: event.params?.turn?.status }];
      }
      if (event.method === "item/started" || event.method === "item/completed") {
        return [{ method: event.method, type: event.params?.item?.type }];
      }
      return [];
    }),
  );
  assert.equal(rows.length, 1, "Exactly one background terminal is expected.");
  assert.equal(rows[0].itemId, commandId);
  result.backgroundTerminal = rows[0];

  const processList = page.getByTestId("live-background-terminal-process-list");
  await processList.waitFor({ state: "visible", timeout: 30_000 });
  assert.match(await processList.textContent(), /live-background-handle/);
  result.listScreenshot = join(directory, "background-terminal-list.png");
  await page.screenshot({ path: result.listScreenshot });

  await processList.locator(".codex-ui-terminal-process-list__open").first().click();
  const panel = page.getByTestId("terminal-current-background-panel");
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  assert.match(await panel.textContent(), /live-background-handle/);
  result.openScreenshot = join(directory, "background-terminal-open.png");
  await page.screenshot({ path: result.openScreenshot });

  await panel.getByRole("button", { name: "Close background terminal", exact: true }).click();
  await processList.waitFor({ state: "visible", timeout: 30_000 });
  await processList
    .getByRole("button", { name: "Stop all background terminals", exact: true })
    .click();
  await page.waitForFunction(
    async (expectedThreadId) => {
      const rows = await window.codexDemo.listLiveBackgroundTerminals({
        projectToken: window.codexDemo.startupWorkspaceProjectToken,
        threadId: expectedThreadId,
      });
      return rows.length === 0;
    },
    threadId,
    { timeout: 30_000 },
  );
  const notifications = page.getByRole("region", {
    name: "Notifications alt+T",
    exact: true,
  });
  await notifications.getByText("Background task stopped", { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
  result.stopNotification = await notifications.textContent();
  await processList.waitFor({ state: "detached", timeout: 30_000 });
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
} finally {
  if (!result.passed && threadId && processId) {
    try {
      await page.evaluate(
        ({ processId: targetProcessId, targetThreadId }) =>
          window.codexDemo.terminateLiveBackgroundTerminal({
            processId: targetProcessId,
            projectToken: window.codexDemo.startupWorkspaceProjectToken,
            threadId: targetThreadId,
          }),
        { processId, targetThreadId: threadId },
      );
      result.failureCleanupTerminatedProcess = true;
    } catch (error) {
      result.cleanupError = String(error);
    }
  }
  await app.close();
}

console.log(JSON.stringify(result, null, 2));
