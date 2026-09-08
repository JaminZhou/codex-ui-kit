import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Deterministic Electron UI/IPC contract, not a real model request or parity evidence.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-input-contract-"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), { capture: false });
const request = {
  id: "question-a", kind: "request", method: "item/tool/requestUserInput", params: {
    threadId: "input-thread", turnId: "input-turn", itemId: "input-item", isBlocking: true,
    questions: [
      { id: "choice", header: "Direction", question: "Which route should we take?", options: [{ label: "Small scope", description: "One focused change" }, { label: "Full scope", description: "All remaining changes" }] },
      { id: "note", header: "Details", question: "What should be included?", isOther: true, options: [{ label: "Default", description: "Use the default scope" }] },
      { id: "secret", header: "Sensitive value", question: "Enter the test-only value", isSecret: true },
    ],
  },
};
const send = (channel, event) => app.evaluate(({ BrowserWindow }, { channel, event }) => {
  BrowserWindow.getAllWindows()[0].webContents.send(channel, event);
}, { channel, event });
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  const planToggle = page.getByRole("button", { name: "Plan mode", exact: true });
  await planToggle.click();
  await page.getByRole("textbox", { name: "Describe your task to generate a plan...", exact: true }).waitFor();
  await planToggle.click();
  await page.getByRole("textbox", { name: "Message composer", exact: true }).waitFor();
  const rejected = await page.evaluate(async () => {
    try {
      await window.codexDemo.respondToUserInput({ requestId: "expired", threadId: "input-thread", answers: {} });
      return false;
    } catch { return true; }
  });
  assert.equal(rejected, true, "The actual host must reject absent requests");

  // Test harness only: substitute the transport response after checking real-host rejection.
  await app.evaluate(({ ipcMain }) => {
    globalThis.__inputPayloads = [];
    ipcMain.removeHandler("demo:input:respond");
    ipcMain.handle("demo:input:respond", (_event, input) => {
      globalThis.__inputPayloads.push(input);
    });
  });
  await send("demo:server-request", request);
  const form = page.getByRole("form", { name: "Questions from Codex" });
  assert.equal(await form.count(), 0, "Unbound thread must not show a question");
  await send("demo:live:session", { kind: "live-bind", projectToken: "startup-workspace", threadId: "input-thread" });
  await form.waitFor();
  await send("demo:live:session", { kind: "live-bind", projectToken: "startup-workspace", threadId: "other-thread" });
  await form.waitFor({ state: "detached" });
  await send("demo:live:session", { kind: "live-bind", projectToken: "startup-workspace", threadId: "input-thread" });
  await form.waitFor();
  assert.equal(await form.getByRole("button", { name: "Send answers" }).isEnabled(), false);
  assert.equal(await form.getByRole("radio", { checked: true }).count(), 0, "Never autosubmit or preselect an option");
  await form.getByRole("radio", { name: "Small scope One focused change" }).check();
  await form.getByLabel("Or enter your own answer", { exact: true }).fill("Only the input flow");
  const secret = form.getByLabel("Sensitive answer", { exact: true });
  assert.equal(await secret.getAttribute("type"), "password");
  await secret.fill("test-only-sensitive-value");
  assert.equal(await form.getByRole("button", { name: "Send answers" }).isEnabled(), true);
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const dock = page.locator(".codex-ui-conversation-thread-shell__above-composer");
    assert.ok((await dock.boundingBox()).height >= 200, "Questions must not be clipped to the plan-summary slot height");
    await dock.evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: join(directory, `questions-${width}.png`) });
  }
  await form.getByRole("button", { name: "Send answers" }).click();
  await form.waitFor({ state: "detached" });
  const payloads = await app.evaluate(() => globalThis.__inputPayloads);
  assert.deepEqual(payloads, [{ requestId: request.id, threadId: request.params.threadId, answers: {
    choice: ["Small scope"], note: ["Only the input flow"], secret: ["test-only-sensitive-value"],
  } }]);
  assert.equal(await page.getByText("test-only-sensitive-value", { exact: true }).count(), 0);
  await send("demo:server-request", { ...request, id: "cancelled" });
  await form.waitFor();
  await send("demo:notification", { method: "serverRequest/resolved", params: { threadId: "input-thread", requestId: "cancelled" } });
  await form.waitFor({ state: "detached" });
  await send("demo:server-request", { ...request, id: "reset" });
  await form.waitFor();
  await send("demo:live:session", { kind: "live-reset" });
  await form.waitFor({ state: "detached" });
  console.log(JSON.stringify({ passed: true, evidence: "synthetic Electron UI/IPC contract", directory, realModelRequest: false }));
} finally {
  await app.close();
}
