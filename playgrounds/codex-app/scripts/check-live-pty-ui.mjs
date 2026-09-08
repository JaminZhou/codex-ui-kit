import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-pty-ui-"));
const { app, page } = await launchScene(
  visualScenes.find(scene => scene.id === "pull-request-detail"),
  { capture: false, environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0" } },
);
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  const toggle = page.getByRole("button", { name: "Toggle bottom panel", exact: true });
  await toggle.click();
  const panel = page.getByTestId("terminal-panel");
  const input = panel.getByRole("textbox", { name: "Interactive terminal input", exact: true });
  const waitText = text => page.waitForFunction(value => [...document.querySelectorAll('[data-testid="pty-terminal"] .xterm-accessibility-tree')].some(el => el.textContent.includes(value)), text);
  const submit = async command => { await input.pressSequentially(command); await input.press("Enter"); };
  await input.waitFor();
  await submit("unsetopt zle; stty -echo; export UI_KIT_STATE=retained; cd /tmp; printf 'READY_%s\\n' shell");
  await waitText("READY_shell");
  await submit("printf 'STATE:%s:%s\\n' \"$UI_KIT_STATE\" \"$PWD\"");
  await waitText("STATE:retained:/tmp");
  await submit("printf 'BUSY_%s\\n' ready; sleep 30");
  await waitText("BUSY_ready");
  await input.press("Control+c");
  await submit("printf 'AFTER_%s\\n' interrupt");
  await waitText("AFTER_interrupt");
  await submit("sleep 1; printf 'HIDDEN_%s\\n' output");
  await toggle.click();
  await toggle.click();
  await waitText("HIDDEN_output");
  await panel.getByRole("button", { name: "Open bottom panel tab", exact: true }).click();
  await page.getByRole("menuitem", { name: "Terminal", exact: true }).click();
  await input.waitFor();
  await submit("printf 'SECOND_%s\\n' terminal");
  await waitText("SECOND_terminal");
  await submit("printf 'CLOSE_PID:%s\\n' \"$$\"");
  await waitText("CLOSE_PID:");
  const secondText = await panel.locator(".xterm-accessibility-tree").innerText();
  const secondPid = Number(secondText.match(/CLOSE_PID:(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(secondPid) && secondPid > 1);
  process.kill(secondPid, 0);
  await panel.getByRole("button", { name: /Close .* tab/ }).last().click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="terminal-panel"] [role="tab"]').length === 1);
  let closed = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { process.kill(secondPid, 0); }
    catch (error) { if (error.code === "ESRCH") { closed = true; break; } throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(closed, true, "Closing a tab must terminate its shell");
  await panel.getByRole("tab").first().click();
  await waitText("HIDDEN_output");
  await submit("printf 'RETURN:%s\\n' \"$UI_KIT_STATE\"");
  await waitText("RETURN:retained");
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value, 820), width);
    await page.waitForFunction(value => innerWidth === value, width);
    await input.waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await submit(`printf 'WIDTH_${width}:%s\\n' "$(stty size)"`);
    await waitText(`WIDTH_${width}:`);
    await page.screenshot({ path: join(directory, `terminal-${width}.png`) });
  }
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("light");
  await page.waitForFunction(() => {
    const viewport = document.querySelector('[data-testid="pty-terminal"] .xterm .xterm-scrollable-element');
    const session = document.querySelector(".codex-ui-terminal-session");
    return viewport && session && getComputedStyle(viewport).backgroundColor === getComputedStyle(session).backgroundColor;
  });
  assert.notEqual(await panel.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(16, 16, 16)", "Light terminal header must not retain the dark fixed background");
  await page.screenshot({ path: join(directory, "terminal-light-720.png") });
  await submit("printf 'THEME:%s\\n' \"$UI_KIT_STATE\"");
  await waitText("THEME:retained");
  await submit("printf 'LIFECYCLE_PID:%s\\n' \"$$\"");
  await waitText("LIFECYCLE_PID:");
  const text = await panel.locator(".xterm-accessibility-tree").innerText();
  const pid = Number(text.match(/LIFECYCLE_PID:(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(pid) && pid > 1);
  process.kill(pid, 0);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  let exited = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === "ESRCH") { exited = true; break; } throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(exited, true, "Leaving Live must terminate its owned shell");
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await toggle.click();
  await submit("printf 'FRESH_%s\\n' terminal");
  await waitText("FRESH_terminal");
  await submit("exit 7");
  await waitText("Process exited with code 7");
  await writeFile(join(directory, "result.json"), JSON.stringify({ passed: true, widths: [1180, 720], persistentState: true, tabCloseTerminates: true, themeRetainsShell: true, interrupt: true, processTerminatedOnReplay: true, modelTurns: 0 }, null, 2));
  console.log(`Real persistent PTY UI passed. Evidence: ${directory}`);
} catch (error) {
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
  await writeFile(join(directory, "failed.txt"), String(error));
  console.error(`Terminal evidence: ${directory}`);
  throw error;
} finally {
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
}
