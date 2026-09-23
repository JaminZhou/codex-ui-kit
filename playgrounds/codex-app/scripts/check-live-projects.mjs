import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in check: three read-only model turns in two disposable projects.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-projects-")));
const second = join(directory, "project-b");
await mkdir(second);
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false,
  environment: {
    CODEX_UI_KIT_WORKSPACE: directory,
    CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
    CODEX_UI_KIT_LIVE_MODEL: process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-luna",
    CODEX_UI_KIT_LIVE_REASONING_EFFORT:
      process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "max",
    CODEX_DEMO_PROJECT_FIXTURE_PATH: second,
  },
});
const result = { passed: false, directory };
try {
  const visibleTextCount = async (text) =>
    page.locator("body *").evaluateAll((elements, expected) =>
      elements.filter((element) => {
        const actual = element.textContent?.trim();
        if (actual !== expected && actual !== `${expected}.`) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      }).length,
      text,
    );
  const waitForVisibleReply = async (text) =>
    page.waitForFunction((expected) =>
      Array.from(document.querySelectorAll("*")).some((element) => {
        const actual = element.textContent?.trim();
        if (actual !== expected && actual !== `${expected}.`) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      }), text);
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__projectEvents = [];
    window.codexDemo.onNotification(event => window.__projectEvents.push(event));
    window.codexDemo.onLiveSession(event => window.__projectEvents.push(event));
  });
  const submit = async (text) => {
    const count = await page.evaluate(() => window.__projectEvents.filter(event => event.method === "turn/completed").length);
    const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
    await composer.fill(`Do not use tools, read or write files, access network, or delegate. Reply exactly ${text}.`);
    await composer.press("Enter");
    await page.waitForFunction(before => window.__projectEvents.filter(event => event.method === "turn/completed").length > before, count, { timeout: 180000 });
    await waitForVisibleReply(text);
  };
  await submit("PROJECT_A_FIRST");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByText("No chats in this project yet.", { exact: true }).waitFor();
  assert.equal(await visibleTextCount("PROJECT_A_FIRST"), 0);
  await submit("PROJECT_B_ONLY");
  const toggle = page.getByRole("button", { name: "Toggle projects", exact: true });
  if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
  const projects = page.locator('.codex-ui-app-sidebar__section').filter({ has: toggle });
  // The Projects section, not the similarly named current-task row.
  await projects.getByRole("button", { name: "codex-ui-kit", exact: true }).click();
  await waitForVisibleReply("PROJECT_A_FIRST");
  assert.equal(await visibleTextCount("PROJECT_B_ONLY"), 0);
  await submit("PROJECT_A_RETURN");
  const bindings = await page.evaluate(() => window.__projectEvents.filter(event => event.kind === "live-bind"));
  assert.equal(bindings.length, 3);
  assert.equal(bindings[0].threadId, bindings[2].threadId);
  assert.notEqual(bindings[0].threadId, bindings[1].threadId);
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0].setContentSize(width, 820), width);
    await page.waitForFunction(width => innerWidth === width, width);
    await waitForVisibleReply("PROJECT_A_FIRST");
    await waitForVisibleReply("PROJECT_A_RETURN");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `project-a-restored-${width}.png`) });
  }
  result.passed = true;
  result.modelTurns = 3;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(join(directory, "events.json"), JSON.stringify(await page.evaluate(() => window.__projectEvents ?? []).catch(() => []), null, 2));
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
