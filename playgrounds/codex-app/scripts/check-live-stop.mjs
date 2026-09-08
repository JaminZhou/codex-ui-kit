import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in two-turn check. No approval is ever granted.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-stop-")));
const filename = "must-not-be-created.txt";
const playgroundPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const clientPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.resolve("@jaminzhou/codex-app-server-client")), "utf8"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false,
  environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0" },
});
const result = {
  passed: false, directory,
  clientDependency: playgroundPackage.dependencies["@jaminzhou/codex-app-server-client"],
  runtimeDependency: clientPackage.dependencies["@openai/codex"],
};
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__stopEvidence = [];
    window.codexDemo.onNotification(event => window.__stopEvidence.push(event));
    window.codexDemo.onServerRequest(event => window.__stopEvidence.push(event));
    window.codexDemo.onLiveSession(event => window.__stopEvidence.push(event));
  });
  const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
  await composer.fill(`In this disposable workspace only, use apply_patch to create ${filename} containing STOP_PROBE followed by a newline. Request the file-change approval; do not bypass the read-only sandbox, use shell writes, access other directories or network, or delegate. This is an interruption test.`);
  await composer.press("Enter");
  await page.waitForFunction(() => window.__stopEvidence.some(event => event.kind === "request" || event.method === "turn/completed"), undefined, { timeout: 180000 });
  const request = await page.evaluate(() => window.__stopEvidence.find(event => event.kind === "request"));
  assert.equal(request?.method, "item/fileChange/requestApproval", "A real pending file approval is required");
  await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  await page.getByTestId("approval-request").waitFor();
  await page.screenshot({ path: join(directory, "before-stop.png") });
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.waitForFunction(() => window.__stopEvidence.some(event => event.method === "turn/completed"), undefined, { timeout: 60000 });
  const stopped = await page.evaluate(() => window.__stopEvidence);
  const completed = stopped.find(event => event.method === "turn/completed");
  assert.equal(completed.params.turn.status, "interrupted");
  assert.equal(completed.params.threadId, request.params.threadId);
  assert.ok(stopped.some(event => event.method === "serverRequest/resolved" && event.params.requestId === request.id));
  await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  await page.waitForSelector('.demo-root[data-status="interrupted"]');
  await page.screenshot({ path: join(directory, "after-stop.png") });
  await composer.fill("The prior file request was cancelled. Do not retry it, use tools, write files, access network, or delegate. Reply exactly STOP_RECOVERY_OK.");
  await composer.press("Enter");
  await page.waitForFunction(() => window.__stopEvidence.filter(event => event.method === "turn/completed").length === 2, undefined, { timeout: 180000 });
  const events = await page.evaluate(() => window.__stopEvidence);
  const turns = events.filter(event => event.method === "turn/completed");
  assert.equal(turns[1].params.turn.status, "completed");
  assert.equal(turns[1].params.threadId, turns[0].params.threadId);
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  await page.getByText("STOP_RECOVERY_OK", { exact: true }).waitFor();
  await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    await page.getByText("STOP_RECOVERY_OK", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `recovered-${width}.png`) });
  }
  Object.assign(result, { passed: true, modelTurns: 2, interrupted: true, pendingApprovalResolved: true, noFileWrite: true, sameThreadRecovery: true });
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(join(directory, "events.json"), JSON.stringify(await page.evaluate(() => window.__stopEvidence ?? []).catch(() => []), null, 2));
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
