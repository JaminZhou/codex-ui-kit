import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit local integration check: real sandboxed commands, no model turns.
// Keep it separate from deterministic replay acceptance and retain evidence.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-terminal-"));
const { app, page } = await launchScene(
  visualScenes.find(scene => scene.id === "pull-request-detail"),
  { capture: false, environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0" } },
);
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.getByRole("button", { name: "Toggle bottom panel", exact: true }).click();
  const panel = page.getByTestId("terminal-panel");
  await panel.waitFor();
  const input = panel.getByRole("textbox", { name: "Terminal input", exact: true });
  const submit = async command => { await input.fill(command); await input.press("Enter"); };
  const idle = () => panel.getByRole("button", { name: "Stop", exact: true }).waitFor({ state: "hidden" });
  await submit('printf "TERMINAL_UI_OK\\n"');
  await panel.getByText("TERMINAL_UI_OK", { exact: true }).waitFor({ timeout: 30000 });
  await panel.getByText("Process exited with code 0", { exact: true }).waitFor();
  await submit('printf "FAILURE_UI\\n" >&2; exit 7');
  await panel.getByText("Process exited with code 7", { exact: true }).waitFor();
  await submit('printf "STDIN_READY\\n"; read reply; printf "ECHO:%s\\n" "$reply"');
  await panel.getByText("STDIN_READY", { exact: true }).waitFor();
  await submit("INTERACTIVE_OK");
  await panel.getByText("STDIN_READY\nECHO:INTERACTIVE_OK", { exact: true }).waitFor();
  await idle();
  await submit('printf "STOP_READY\\n"; sleep 30');
  await panel.getByText("STOP_READY", { exact: true }).waitFor();
  await panel.getByRole("button", { name: "Stop", exact: true }).click();
  await idle();
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value, 820), width);
    await page.waitForFunction(value => innerWidth === value, width);
    await input.waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `terminal-${width}.png`) });
  }
  await submit('printf "LIFECYCLE_PID:%s\\n" "$$"; read reply');
  const pidRow = panel.locator('[data-kind="stdout"]').filter({ hasText: "LIFECYCLE_PID:" });
  await pidRow.waitFor();
  const pid = Number((await pidRow.innerText()).match(/LIFECYCLE_PID:(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(pid) && pid > 1);
  process.kill(pid, 0);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  let exited = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === "ESRCH") { exited = true; break; } throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(exited, true, "Leaving Live must terminate its owned process");
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.getByRole("button", { name: "Toggle bottom panel", exact: true }).click();
  assert.equal(await panel.locator('[data-kind="stdout"]').count(), 0);
  await submit('printf "FRESH_TERMINAL_OK\\n"');
  await panel.getByText("FRESH_TERMINAL_OK", { exact: true }).waitFor();
  await idle();
  await writeFile(join(directory, "result.json"), JSON.stringify({ passed: true, widths: [1180, 720], processTerminatedOnReplay: true, modelTurns: 0 }, null, 2));
  console.log(`Real Terminal success/failure, stdin, stop, compact layout and Live/Replay cleanup passed. Evidence: ${directory}`);
} catch (error) {
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
  await writeFile(join(directory, "failed.txt"), String(error));
  console.error(`Terminal evidence: ${directory}`);
  throw error;
} finally {
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
}
