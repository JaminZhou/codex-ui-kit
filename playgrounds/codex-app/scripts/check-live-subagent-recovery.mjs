import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find((candidate) => candidate.id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live mode.");

const prompt =
  "Do not reply with a plan. Immediately use Codex's multi-agent spawn_agent tool exactly once to spawn one subagent. Ask it to read only this disposable workspace package.json, then wait for the parent to interrupt it; do not send a result before the parent asks. The first and only tool call must be the collaboration spawn. Do not use Sites, MCP, browser, GitHub, connectors, approvals, shell, network, file writes, or any other tools. Keep this turn active while the subagent is waiting.";

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

async function readRateLimits() {
  const client = new CodexAppServerClient({
    capabilities: { experimentalApi: true },
    protocolValidation: "strict",
  });
  try {
    await client.connect();
    const response = await client.call("account/rateLimits/read");
    return response.rateLimitsByLimitId?.codex ?? response.rateLimits ?? null;
  } catch (error) {
    return { readError: String(error) };
  } finally {
    await client.close().catch(() => undefined);
  }
}

function hasSubscriptionQuota(rateLimits) {
  if (!rateLimits) return true;
  if (rateLimits.rateLimitReachedType) return false;
  const buckets = [rateLimits.primary, rateLimits.secondary].filter(Boolean);
  if (buckets.length === 0) return true;
  return buckets.some(
    (bucket) =>
      bucket &&
      typeof bucket.usedPercent === "number" &&
      bucket.usedPercent < 100,
  );
}

async function runAttempt(attempt) {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), "ui-kit-live-subagent-recovery-")),
  );
  const registryPath = join(directory, "registry.json");
  const rateLimits = await readRateLimits();
  // Purchased credits are separate from the subscription windows. A user can
  // have no extra credits while still having substantial subscription quota;
  // only shorten the probe when the subscription itself is exhausted.
  const subscriptionQuotaAvailable = hasSubscriptionQuota(rateLimits);
  const { app, page } = await launchScene(scene, {
    capture: false,
    environment: {
      CODEX_UI_KIT_LIVE_EPHEMERAL:
        process.env.CODEX_UI_KIT_LIVE_EPHEMERAL ?? "0",
      CODEX_UI_KIT_LIVE_MODEL:
        process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-sol",
      CODEX_UI_KIT_LIVE_REASONING_EFFORT:
        process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "ultra",
      CODEX_UI_KIT_LIVE_HISTORY_PATH: registryPath,
      CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
      CODEX_UI_KIT_WORKSPACE: directory,
    },
  });
  const result = {
    attempt,
    directory,
    evidence: "real signed-in App Server subAgentActivity/collabAgentToolCall plus UI Stop",
    modelTurns: 1,
    model: process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-sol",
    reasoningEffort:
      process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "ultra",
    passed: false,
    workspaceWrite: false,
    rateLimits,
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
    await composer.fill(prompt);
    await composer.press("Enter");

    await page.waitForFunction(
      () =>
        window.__liveSubagentEvidence?.some(
          (event) => {
            if (event.method === "turn/completed") return true;
            const item = event.params?.item;
            return (
              event.method === "item/started" &&
              item?.type === "subAgentActivity" &&
              item.kind === "started" &&
              typeof item.agentThreadId === "string"
            ) || (
              event.method === "item/started" &&
              item?.type === "collabAgentToolCall" &&
              item.tool !== "wait" &&
              (typeof item.tool === "string" ||
                (Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
                Object.keys(item.agentsStates ?? {}).length > 0)
            );
          },
        ),
      undefined,
      { timeout: subscriptionQuotaAvailable ? 180_000 : 30_000 },
    );
    const beforeStop = await page.evaluate(() => window.__liveSubagentEvidence);
    const collabStarted = beforeStop.find(isSubagentStart);
    assert.ok(collabStarted, "A real subagent activity must be observed.");
    const parentThreadId = collabStarted.params.threadId;
    assert.equal(typeof parentThreadId, "string");
    const callId = collabStarted.params.item.id;
    assert.equal(typeof callId, "string");

    const usesSubAgentActivity =
      collabStarted.params.item.type === "subAgentActivity";
    let collabWithReceiver = null;
    if (!usesSubAgentActivity) {
      await page.waitForFunction(
        (expectedCallId) =>
          window.__liveSubagentEvidence?.some((event) => {
            const item = event.params?.item;
            return (
              (event.method === "item/started" || event.method === "item/completed") &&
              item?.type === "collabAgentToolCall" &&
              item.id === expectedCallId &&
              ((Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
                Object.keys(item.agentsStates ?? {}).length > 0)
            );
          }),
        callId,
        { timeout: subscriptionQuotaAvailable ? 120_000 : 30_000 },
      );
      collabWithReceiver = await page.evaluate((expectedCallId) =>
        window.__liveSubagentEvidence.findLast((event) => {
          const item = event.params?.item;
          return (
            (event.method === "item/started" || event.method === "item/completed") &&
            item?.type === "collabAgentToolCall" &&
            item.id === expectedCallId &&
            ((Array.isArray(item.receiverThreadIds) && item.receiverThreadIds.length > 0) ||
              Object.keys(item.agentsStates ?? {}).length > 0)
          );
        }),
      callId);
    }
    const receiverItem = collabWithReceiver?.params?.item ?? collabStarted.params.item;
    const childThreadId = usesSubAgentActivity
      ? collabStarted.params.item.agentThreadId
      : receiverItem.receiverThreadIds?.[0] ??
        Object.keys(receiverItem.agentsStates ?? {})[0] ??
        null;
    threadId = childThreadId;
    assert.equal(typeof threadId, "string");
    result.initialCollab = {
      agentsStates: receiverItem.agentsStates ?? {},
      receiverThreadIds: receiverItem.receiverThreadIds ?? [],
      status: receiverItem.status ?? null,
      parentThreadId,
      childThreadId,
      type: collabStarted.params.item.type,
    };
    if (usesSubAgentActivity) {
      await page.waitForFunction(
        (expectedChildThreadId) =>
          window.__liveSubagentEvidence?.some(
            (event) =>
              event.method === "thread/status/changed" &&
              event.params?.threadId === expectedChildThreadId,
          ),
        childThreadId,
        { timeout: subscriptionQuotaAvailable ? 120_000 : 30_000 },
      );
    }
    result.receiverCollab =
      usesSubAgentActivity
        ? {
            agentsStates: {},
            receiverThreadIds: [childThreadId],
            status: "started",
          }
        : {
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
    const completed = afterStop.findLast((event) => event.method === "turn/completed");
    assert.equal(completed?.params?.threadId, parentThreadId);
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
    await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
  } finally {
    const eventSummaries = await page.evaluate(() =>
      (window.__liveSubagentEvidence ?? []).map((event) => {
        const item = event.params?.item;
        return {
          kind: event.kind ?? null,
          method: event.method ?? null,
          threadId: event.params?.threadId ?? null,
          turnStatus: event.params?.turn?.status ?? null,
          itemType: item?.type ?? null,
          itemKind: item?.kind ?? null,
          itemTool: item?.tool ?? null,
          itemStatus: item?.status ?? null,
        };
      }),
    ).catch(() => []);
    result.eventSummaries = eventSummaries;
    await writeFile(join(directory, "events.json"), JSON.stringify(eventSummaries, null, 2));
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
      } finally {
        await client.close();
      }
    }
    await writeFile(join(directory, "result.json"), JSON.stringify(result));
  }
  return result;
}

const attempts = [];
const maxAttempts = Number(
  process.env.CODEX_UI_KIT_LIVE_SUBAGENT_RECOVERY_ATTEMPTS ?? 2,
);
assert.ok(
  Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 2,
  "Subagent recovery attempts must be 1 or 2.",
);
let result;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  result = await runAttempt(attempt);
  attempts.push({
    attempt,
    directory: result.directory,
    passed: result.passed,
    error: result.error ?? null,
  });
  if (result.passed) break;
}
result.attempts = attempts;
if (!result.passed) process.exitCode = 1;
console.log(JSON.stringify(result));
