import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveCodexBinary } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Transparent public JSON-RPC transport: do not alter responses or manufacture
// model success. Record only model/effort fields, not prompts or credentials.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-model-selection-")));
const wrapper = join(directory, "codex-protocol-tap.mjs");
const requestsPath = join(directory, "public-selection-requests.jsonl");
await writeFile(wrapper, `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { appendFileSync } from "node:fs";
const child = spawn(process.env.UI_KIT_PROBE_REAL_CODEX, process.argv.slice(2), { stdio: ["pipe", "pipe", "inherit"] });
child.stdout.pipe(process.stdout);
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", line => {
  try { const m = JSON.parse(line); if (["thread/start", "thread/resume", "turn/start"].includes(m.method)) {
    const p = m.params; appendFileSync(process.env.UI_KIT_PROBE_SELECTION_REQUESTS, JSON.stringify({ method: m.method, model: p.model, effort: p.effort, ephemeral: p.ephemeral, collaborationMode: p.collaborationMode }) + "\\n");
  } } catch {}
  child.stdin.write(line + "\\n");
});
lines.on("close", () => child.stdin.end());
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => { child.kill(signal); });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { lines.close(); process.exit(code ?? 1); });
`);
await chmod(wrapper, 0o700);
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false,
  environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
    CODEX_UI_KIT_LIVE_EPHEMERAL: "0", CODEX_UI_KIT_LIVE_HISTORY_PATH: join(directory, "owned-history.json"),
    CODEX_UI_KIT_LIVE_MODEL: "gpt-6.1-sol", CODEX_UI_KIT_LIVE_REASONING_EFFORT: "max",
    CODEX_UI_KIT_LIVE_CODEX_PATH: wrapper, UI_KIT_PROBE_REAL_CODEX: resolveCodexBinary().executablePath,
    UI_KIT_PROBE_SELECTION_REQUESTS: requestsPath },
});
const result = { passed: false, directory, evidence: "real public catalog, transparent request capture and actual inference; not installed-picker parity" };
let threadId;
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__modelSelectionEvents = [];
    window.codexDemo.onNotification(event => window.__modelSelectionEvents.push(event));
  });
  const token = await page.evaluate(() => window.codexDemo.startupWorkspaceProjectToken);
  const catalog = await page.evaluate(projectToken => window.codexDemo.listLiveModels({ projectToken }), token);
  const selected = catalog.find(row => row.model === "gpt-5.6-luna");
  assert.ok(selected, "The authorized economical test model must be present; do not silently substitute");
  assert.ok(selected.supportedReasoningEfforts.some(option => option.reasoningEffort === "medium"));
  assert.ok(selected.supportedReasoningEfforts.some(option => option.reasoningEffort === "max"));
  for (const modelSelection of [{ modelId: "forged-model", effort: "max" }, { modelId: selected.id, effort: "ultra" }]) {
    await assert.rejects(page.evaluate(input => window.codexDemo.startLive(input), { projectToken: token, prompt: "MUST_NOT_START", threadId: null, modelSelection }));
  }
  const requests = async () => (await readFile(requestsPath, "utf8").catch(error => { if (error.code === "ENOENT") return ""; throw error; })).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  assert.equal((await requests()).length, 0, "Rejected selections must not create/resume a thread or start a turn");
  await page.getByRole("button", { name: "Choose live model", exact: true }).click();
  const modelControl = page.getByRole("combobox", { name: "Runtime model", exact: true });
  await modelControl.waitFor();
  await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), selected.id);
  await modelControl.selectOption(selected.id);
  const effortControl = page.getByRole("combobox", { name: "Runtime reasoning effort", exact: true });
  const options = await effortControl.locator("option").evaluateAll(elements => elements.map(e => e.value));
  assert.deepEqual(options, selected.supportedReasoningEfforts.map(option => option.reasoningEffort));
  assert.equal(await effortControl.inputValue(), selected.defaultReasoningEffort);
  assert.equal((await requests()).length, 0, "Choosing a model must not start a task");
  await page.getByRole("button", { name: "Close model choices", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
  for (const [index, effort] of ["medium", "max"].entries()) {
    const chooser = page.getByRole("button", { name: "Choose live model", exact: true });
    if (!await chooser.isVisible()) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await chooser.click();
    await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), selected.id);
    await effortControl.selectOption(effort);
    await page.getByRole("button", { name: "Close model choices", exact: true }).click();
    const marker = `MODEL_SELECTION_${index + 1}_OK`;
    await composer.fill(`Do not use tools, access files or network, or delegate. Reply exactly ${marker}.`);
    await composer.press("Enter");
    await page.waitForFunction(count => window.__modelSelectionEvents.filter(event => event.method === "turn/completed").length === count, index + 1, { timeout: 180000 });
    const turns = await page.evaluate(() => window.__modelSelectionEvents.filter(event => event.method === "turn/completed"));
    assert.equal(turns[index].params.turn.status, "completed");
    if (threadId) assert.equal(turns[index].params.threadId, threadId);
    threadId = turns[index].params.threadId;
    await page.getByText(marker, { exact: true }).waitFor();
    const turnRequest = (await requests()).filter(request => request.method === "turn/start")[index];
    assert.equal(turnRequest.model, selected.model);
    assert.equal(turnRequest.effort, effort);
    assert.equal(turnRequest.collaborationMode.settings.model, selected.model);
    assert.equal(turnRequest.collaborationMode.settings.reasoning_effort, effort);
  }
  assert.equal((await requests()).filter(request => request.method === "thread/start").length, 1);
  assert.equal((await requests()).find(request => request.method === "thread/start").ephemeral, false);
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    const chooser = page.getByRole("button", { name: "Choose live model", exact: true });
    if (!await chooser.isVisible()) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await chooser.click();
    await page.waitForFunction(id => [...document.querySelectorAll('select[aria-label="Runtime model"] option')].some(option => option.value === id), selected.id);
    assert.equal(await modelControl.inputValue(), selected.id);
    assert.equal(await effortControl.inputValue(), "max");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(directory, `selection-${width}.png`) });
    await page.getByRole("button", { name: "Close model choices", exact: true }).click();
  }
  Object.assign(result, { passed: true, model: selected.model, efforts: ["medium", "max"], modelTurns: 2, sameThread: true, rejectedBeforeThreadMutation: true, widths: [1180, 720] });
} catch (error) {
  result.error = String(error); process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failure.png") }).catch(() => undefined);
} finally {
  if (threadId) await page.evaluate(async threadId => window.codexDemo.setLiveThreadArchived({ projectToken: window.codexDemo.startupWorkspaceProjectToken, threadId, archived: true }), threadId).then(response => { assert.equal(response.archived, true); result.archived = true; }).catch(error => { result.cleanupError = String(error); process.exitCode = 1; });
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
