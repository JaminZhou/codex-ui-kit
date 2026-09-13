import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-subagent-recovery-")),
);
const registryPath = join(directory, "registry.json");
const scene = visualScenes.find((candidate) => candidate.id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live mode.");

const evidence = [];
const environment = {
  CODEX_UI_KIT_LIVE_EPHEMERAL: "0",
  CODEX_UI_KIT_LIVE_HISTORY_PATH: registryPath,
  CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
  CODEX_UI_KIT_WORKSPACE: directory,
};
const { app, page } = await launchScene(scene, {
  capture: false,
  environment,
});

const result = {
  directory,
  evidence: "real signed-in App Server collabAgentToolCall plus UI Stop",
  modelTurns: 1,
  passed: false,
  workspaceWrite: false,
};
let threadId;

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__liveSubagentEvidence = [];
    window.codexDemo.onNotification((event) => {
      window.__liveSubagentEvidence.push(event);
    });
  });

  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    "Use exactly one collaboration tool to spawn one subagent. Ask it to read only this disposable workspace package.json, then wait for the parent to interrupt it; do not send a result before the parent asks. Do not use shell, network, file writes, or any other tools. Keep this turn active while the subagent is waiting.",
  );
  await composer.press("Enter");

  await page.waitForFunction(
    () =>
      window.__liveSubagentEvidence?.some(
        (event) =>
          event.method === "item/started" &&
          event.params?.item?.type === "collabAgentToolCall",
      ),
    undefined,
    { timeout: 180_000 },
  );
  const beforeStop = await page.evaluate(() => window.__liveSubagentEvidence);
  evidence.push(...beforeStop);
  const collabStarted = beforeStop.find(
    (event) =>
      event.method === "item/started" &&
      event.params?.item?.type === "collabAgentToolCall",
  );
  assert.ok(collabStarted, "A real collabAgentToolCall must be observed.");
  threadId = collabStarted.params.threadId;
  assert.equal(typeof threadId, "string");
  const callId = collabStarted.params.item.id;
  result.initialCollab = {
    agentsStates: collabStarted.params.item.agentsStates ?? {},
    receiverThreadIds: collabStarted.params.item.receiverThreadIds ?? [],
    status: collabStarted.params.item.status ?? null,
  };
  assert.equal(typeof callId, "string");

  await page.waitForFunction(
    (expectedCallId) =>
      window.__liveSubagentEvidence?.some(
        (event) =>
          (event.method === "item/started" || event.method === "item/completed") &&
          event.params?.item?.type === "collabAgentToolCall" &&
          event.params.item.id === expectedCallId &&
          ((Array.isArray(event.params.item.receiverThreadIds) &&
            event.params.item.receiverThreadIds.length > 0) ||
            Object.keys(event.params.item.agentsStates ?? {}).length > 0),
      ),
    callId,
    { timeout: 120_000 },
  );
  const collabWithReceiver = await page.evaluate((expectedCallId) => {
    return window.__liveSubagentEvidence.findLast(
      (event) =>
        (event.method === "item/started" || event.method === "item/completed") &&
        event.params?.item?.type === "collabAgentToolCall" &&
        event.params.item.id === expectedCallId &&
        ((Array.isArray(event.params.item.receiverThreadIds) &&
          event.params.item.receiverThreadIds.length > 0) ||
          Object.keys(event.params.item.agentsStates ?? {}).length > 0),
    );
  }, callId);
  result.receiverCollab = {
    agentsStates: collabWithReceiver?.params?.item?.agentsStates ?? {},
    receiverThreadIds: collabWithReceiver?.params?.item?.receiverThreadIds ?? [],
    status: collabWithReceiver?.params?.item?.status ?? null,
  };
  assert.equal(
    result.receiverCollab.receiverThreadIds.length ||
      Object.keys(result.receiverCollab.agentsStates).length,
    1,
  );

  const activity = page.getByRole("button", { name: /Open .* subagent/ }).first();
  await activity.waitFor({ state: "visible" });
  const activityContract = await activity.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      height: rect.height,
      text: element.textContent?.replace(/\s+/g, " ").trim(),
      width: rect.width,
    };
  });
  assert.ok(activityContract.fontFamily);
  assert.ok(activityContract.width > 0 && activityContract.height > 0);
  result.activity = activityContract;
  result.width = await page.evaluate(() => innerWidth);
  result.initialScreenshot = join(directory, "subagent-running.png");
  await page.screenshot({ path: result.initialScreenshot });

  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.waitFor({ state: "visible" });
  await stop.click();
  await page.waitForFunction(
    () =>
      window.__liveSubagentEvidence?.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180_000 },
  );
  const afterStop = await page.evaluate(() => window.__liveSubagentEvidence);
  evidence.push(...afterStop.slice(beforeStop.length));
  const completed = afterStop.findLast((event) => event.method === "turn/completed");
  assert.equal(completed?.params?.threadId, threadId);
  result.turnStatus = completed?.params?.turn?.status ?? null;
  assert.equal(result.turnStatus, "interrupted");
  const stoppedStatus = page.getByText("Stopped", { exact: true }).first();
  await stoppedStatus.waitFor({ state: "visible" });
  result.stoppedStatus = await stoppedStatus.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      height: rect.height,
      text: element.textContent?.replace(/\s+/g, " ").trim(),
      width: rect.width,
    };
  });
  result.stoppedScreenshot = join(directory, "subagent-stopped.png");
  await page.screenshot({ path: result.stoppedScreenshot });
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(join(directory, "events.json"), JSON.stringify(evidence, null, 2));
  await page.evaluate(() => window.codexDemo?.closeLive()).catch(() => undefined);
  await app.close();
  if (threadId) {
    const client = new CodexAppServerClient({
      capabilities: { experimentalApi: true },
      protocolValidation: "strict",
    });
    try {
      await client.connect();
      const { thread } = await client.threadRead({ threadId, includeTurns: false });
      assert.equal(thread.cwd, directory);
      await client.threadArchive({ threadId });
      result.archived = true;
    } catch (error) {
      result.cleanupError = String(error);
      process.exitCode = 1;
    } finally {
      await client.close();
    }
  }
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
