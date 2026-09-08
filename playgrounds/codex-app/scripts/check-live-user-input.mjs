import assert from "node:assert/strict";
import { mkdtemp, realpath, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in two-turn probe. No synthetic requests or approval grants.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-input-")));
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false, environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0" },
});
const result = { passed: false, directory, clientDependency: packageJson.dependencies["@jaminzhou/codex-app-server-client"] };
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  const planToggle = page.getByRole("button", { name: "Plan mode", exact: true });
  await planToggle.click();
  assert.equal(await planToggle.getAttribute("aria-pressed"), "true");
  await page.evaluate(() => {
    window.__inputEvidence = [];
    window.codexDemo.onNotification(event => window.__inputEvidence.push(event));
    window.codexDemo.onServerRequest(event => window.__inputEvidence.push(event));
  });
  const composer = page.getByRole("textbox", { name: /^(Message composer|Describe your task to generate a plan\.\.\.)$/ });
  await composer.fill("This is a user-input integration test. Do not inspect files, run shell commands, write files, access network, delegate or call any tools except request_user_input. Call request_user_input now with exactly one question: id color, header Color, question Which color should the plan use?, options BLUE (Use blue) and GREEN (Use green). Ask through the tool, not ordinary prose. After receiving BLUE, reply with USER_INPUT_BLUE_OK and finish; do not implement anything or ask another question.");
  await composer.press("Enter");
  await page.waitForFunction(() => window.__inputEvidence.some(event => event.kind === "request" || event.method === "turn/completed"), undefined, { timeout: 180000 });
  const request = await page.evaluate(() => window.__inputEvidence.find(event => event.kind === "request"));
  assert.equal(request?.method, "item/tool/requestUserInput", "A real model question is required");
  assert.equal(request.params.questions.length, 1);
  assert.ok(request.params.questions[0].options.some(option => option.label === "BLUE"));
  const form = page.getByRole("form", { name: "Questions from Codex" });
  await form.waitFor();
  assert.equal(await form.getByRole("button", { name: "Send answers" }).isEnabled(), false);
  assert.equal(await planToggle.isEnabled(), false);
  const wrongThreadRejected = await page.evaluate(async ({ requestId }) => {
    try {
      await window.codexDemo.respondToUserInput({ requestId, threadId: "non-owning-thread", answers: { color: ["BLUE"] } });
      return false;
    } catch { return true; }
  }, { requestId: request.id });
  assert.equal(wrongThreadRejected, true);
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `pending-${width}.png`) });
  }
  await form.getByRole("radio", { name: /^BLUE\b/ }).check();
  await form.getByRole("button", { name: "Send answers" }).click();
  await form.waitFor({ state: "detached" });
  await page.waitForFunction(() => window.__inputEvidence.some(event => event.method === "turn/completed"), undefined, { timeout: 180000 });
  const firstEvents = await page.evaluate(() => window.__inputEvidence);
  assert.equal(firstEvents.find(event => event.method === "turn/completed").params.turn.status, "completed");
  assert.ok(firstEvents.some(event => event.method === "serverRequest/resolved" && event.params.requestId === request.id && event.params.threadId === request.params.threadId));
  assert.ok(firstEvents.some(event => event.method === "item/completed" && event.params.item?.type === "agentMessage" && event.params.item.text.includes("USER_INPUT_BLUE_OK")));
  await page.getByText("USER_INPUT_BLUE_OK", { exact: true }).waitFor();
  await planToggle.click();
  assert.equal(await planToggle.getAttribute("aria-pressed"), "false");
  await composer.fill("We have returned to Default mode. Do not use tools, ask questions, write files, access network or delegate. Reply exactly DEFAULT_RECOVERY_OK.");
  await composer.press("Enter");
  await page.waitForFunction(() => window.__inputEvidence.filter(event => event.method === "turn/completed").length === 2, undefined, { timeout: 180000 });
  const events = await page.evaluate(() => window.__inputEvidence);
  const turns = events.filter(event => event.method === "turn/completed");
  assert.equal(turns[1].params.turn.status, "completed");
  assert.equal(turns[1].params.threadId, turns[0].params.threadId);
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  assert.equal(events.some(event => ["commandExecution", "fileChange", "mcpToolCall", "webSearch", "collabAgentToolCall"].includes(event.params?.item?.type)), false);
  await page.getByText("DEFAULT_RECOVERY_OK", { exact: true }).waitFor();
  await page.screenshot({ path: join(directory, "completed-720.png") });
  Object.assign(result, { passed: true, modelTurns: 2, userInputResolved: true, wrongThreadRejected, sameThreadDefaultRecovery: true });
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(join(directory, "events.json"), JSON.stringify(await page.evaluate(() => window.__inputEvidence ?? []).catch(() => []), null, 2));
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
