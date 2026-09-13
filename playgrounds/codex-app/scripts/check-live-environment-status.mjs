import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-status-"));
const scene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");

for (const width of [1180, 720]) {
  const { app, page } = await launchScene(scene, {
    capture: false,
    currentSidebar: true,
    windowSize: { width, height: 820 },
  });
  try {
    const rejectsUnsafeIdBeforeStartingLiveClient = await page.evaluate(async () => {
      try {
        await window.codexDemo.readEnvironmentStatus({
          projectToken: "startup-workspace",
          environmentId: "https://unsafe.example",
        });
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(rejectsUnsafeIdBeforeStartingLiveClient, true);
    const rejectsUnsafeExecUrlBeforeStartingLiveClient = await page.evaluate(async () => {
      try {
        await window.codexDemo.addEnvironment({
          projectToken: "startup-workspace",
          environmentId: "remote:unsafe",
          execServerUrl: "https://unsafe.example",
        });
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(rejectsUnsafeExecUrlBeforeStartingLiveClient, true);
    const rejectsUnsafeInfoIdBeforeStartingLiveClient = await page.evaluate(async () => {
      try {
        await window.codexDemo.readEnvironmentInfo({
          projectToken: "startup-workspace",
          environmentId: "../unsafe",
        });
        return false;
      } catch {
        return true;
      }
    });
    assert.equal(rejectsUnsafeInfoIdBeforeStartingLiveClient, true);
    await app.evaluate(({ ipcMain, BrowserWindow }, width) => {
      globalThis.__environmentCalls = [];
      globalThis.__environmentAddCalls = [];
      globalThis.__environmentInfoCalls = [];
      globalThis.__environmentLate = null;
      globalThis.__environmentFail = true;
      ipcMain.removeHandler("demo:environment:status");
      ipcMain.handle("demo:environment:status", (_event, input) => {
        globalThis.__environmentCalls.push(input);
        const environmentId = input?.environmentId;
        if (environmentId === "remote:late") {
          return new Promise(resolve => { globalThis.__environmentLate = resolve; });
        }
        if (environmentId === "remote:error" && globalThis.__environmentFail) {
          throw new Error("synthetic status error");
        }
        if (environmentId === "remote:pending") return { environmentId, status: "pending" };
        if (environmentId === "remote:offline") return { environmentId, status: "disconnected", error: "offline" };
        if (environmentId === "remote:unknown") return { environmentId, status: "unknown", error: "not configured" };
        return { environmentId, status: "ready" };
      });
      ipcMain.removeHandler("demo:environment:add");
      ipcMain.handle("demo:environment:add", (_event, input) => {
        globalThis.__environmentAddCalls.push(input);
        const environmentId = input?.environmentId;
        if (environmentId === "remote:error" && globalThis.__environmentFail) {
          throw new Error("synthetic add error");
        }
        return {
          environmentId,
          execServerUrl: new URL(input?.execServerUrl).toString(),
          status: "added",
        };
      });
      ipcMain.removeHandler("demo:environment:info");
      ipcMain.handle("demo:environment:info", (_event, input) => {
        globalThis.__environmentInfoCalls.push(input);
        if (input?.environmentId === "remote:error" && globalThis.__environmentFail) {
          throw new Error("synthetic info error");
        }
        return {
          environmentId: input?.environmentId,
          cwd: "file:///workspace/startup",
          shell: { name: "zsh", path: "/bin/zsh" },
        };
      });
      BrowserWindow.getAllWindows()[0].setContentSize(width, 820);
    }, width);
    const liveLocal = page.getByRole("button", { name: "Live local", exact: true });
    if (!(await liveLocal.isVisible())) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await liveLocal.click();
    const navigation = page.getByRole("button", { name: "Environment status", exact: true });
    if (!(await navigation.isVisible())) await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    await navigation.click();
    const route = page.getByRole("region", { name: "Environments", exact: true });
    await route.waitFor();
    assert.equal(await page.locator(".demo-root").getAttribute("data-mode"), "live");
    assert.equal(await page.locator(".demo-root").getAttribute("data-view"), "workspace");
    assert.equal(await route.getByText("Local environments unavailable", { exact: true }).count(), 0);

    const input = route.getByRole("textbox", { name: "Environment ID", exact: true });
    const execUrl = route.getByRole("textbox", { name: "Exec server URL", exact: true });
    const add = route.getByRole("button", { name: "Add environment", exact: true });
    const inspect = route.getByRole("button", { name: "Inspect environment", exact: true });
    const check = route.getByRole("button", { name: "Check environment status", exact: true });
    await input.fill("remote:ready");
    await execUrl.fill("wss://exec.test");
    await add.click();
    const added = route.getByRole("status", { name: "Add environment result", exact: true });
    await added.getByRole("heading", { name: "Environment added", exact: true }).waitFor();
    await inspect.click();
    const info = route.getByRole("status", { name: "Environment info result", exact: true });
    await info.getByRole("heading", { name: "Environment details", exact: true }).waitFor();
    assert.match(await info.innerText(), /zsh/);
    assert.match(await info.innerText(), /file:\/\/\/workspace\/startup/);
    assert.match(await added.innerText(), /wss:\/\/exec\.test\//);

    await input.fill("remote:late");
    await execUrl.fill("wss://exec.test");
    await check.click();
    await route.getByText("Checking environment status…", { exact: true }).waitFor();
    await input.fill("remote:ready");
    await check.click();
    const result = route.getByRole("status", { name: "Environment status result", exact: true });
    await result.getByRole("heading", { name: "Ready", exact: true }).waitFor();
    await app.evaluate(() => globalThis.__environmentLate({ environmentId: "remote:late", status: "disconnected", error: "late failure" }));
    await page.waitForTimeout(20);
    assert.match(await result.innerText(), /remote:ready is ready/);

    await input.fill("remote:pending");
    await check.click();
    await result.getByRole("heading", { name: "Pending", exact: true }).waitFor();
    await input.fill("remote:offline");
    await check.click();
    const alert = route.getByRole("alert", { name: "Environment status result", exact: true });
    await alert.getByRole("heading", { name: "Disconnected", exact: true }).waitFor();
    assert.match(await alert.innerText(), /offline/);
    await input.fill("remote:unknown");
    await check.click();
    await result.getByRole("heading", { name: "Not configured", exact: true }).waitFor();
    await app.evaluate(() => { globalThis.__environmentFail = true; });
    await input.fill("remote:error");
    await execUrl.fill("wss://exec.test");
    await check.click();
    const failure = route.getByRole("alert", { name: "Environment status result", exact: true });
    await failure.getByRole("heading", { name: "Environment status unavailable", exact: true }).waitFor();
    await app.evaluate(() => { globalThis.__environmentFail = false; });
    await failure.getByRole("button", { name: "Retry environment status", exact: true }).click();
    await result.getByRole("heading", { name: "Ready", exact: true }).waitFor();

    await app.evaluate(() => { globalThis.__environmentFail = true; });
    await input.fill("remote:error");
    await add.click();
    const addFailure = route.getByRole("alert", { name: "Add environment result", exact: true });
    await addFailure.getByRole("heading", { name: "Environment could not be added", exact: true }).waitFor();
    await app.evaluate(() => { globalThis.__environmentFail = false; });
    await addFailure.getByRole("button", { name: "Retry adding environment", exact: true }).click();
    await added.getByRole("heading", { name: "Environment added", exact: true }).waitFor();

    await app.evaluate(() => { globalThis.__environmentFail = true; });
    await input.fill("remote:error");
    await inspect.click();
    const infoFailure = route.getByRole("alert", { name: "Environment info result", exact: true });
    await infoFailure.getByRole("heading", { name: "Environment details unavailable", exact: true }).waitFor();
    await app.evaluate(() => { globalThis.__environmentFail = false; });
    await infoFailure.getByRole("button", { name: "Retry environment details", exact: true }).click();
    await info.getByRole("heading", { name: "Environment details", exact: true }).waitFor();

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const calls = await app.evaluate(() => globalThis.__environmentCalls);
    assert.ok(calls.every(({ projectToken, environmentId }) => projectToken === "startup-workspace" && typeof environmentId === "string"));
    const addCalls = await app.evaluate(() => globalThis.__environmentAddCalls);
    assert.ok(addCalls.every(({ projectToken, environmentId, execServerUrl }) => projectToken === "startup-workspace" && typeof environmentId === "string" && execServerUrl === "wss://exec.test"));
    const infoCalls = await app.evaluate(() => globalThis.__environmentInfoCalls);
    assert.ok(infoCalls.every(({ projectToken, environmentId }) => projectToken === "startup-workspace" && typeof environmentId === "string"));
    await page.screenshot({ path: join(directory, `environment-status-${width}.png`) });
    await page.getByRole("button", { name: "Back to ChatGPT", exact: true }).click();
    assert.equal(await page.locator(".demo-root").getAttribute("data-view"), "conversation");
  } finally {
    await app.close();
  }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720], syntheticIpc: true, realModelTurns: 0, publicProtocolMethods: ["environment/status", "environment/add", "environment/info"] }));
