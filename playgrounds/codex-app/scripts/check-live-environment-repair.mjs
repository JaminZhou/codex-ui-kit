import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Real App Server environment/status calls against a disposable loopback
// executor. The saved record survives an app restart while one status check
// deliberately reports a disconnect and the same UI recovers on retry.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-repair-"));
const appServerHome = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-repair-home-"));
const registryDirectory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-repair-registry-"));
const registryPath = join(registryDirectory, "environments.json");
const orphanLockPath = `${registryPath}.lock`;
const scene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");
assert.ok(scene, "environment route scene is present");

const methods = [];
let statusRequestCount = 0;
let failAtStatusRequest = null;
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
server.on("connection", (socket) => {
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      socket.close();
      return;
    }
    methods.push(message.method);
    if (message.method === "initialize") {
      socket.send(JSON.stringify({
        id: message.id,
        result: {
          environmentInfo: {
            cwd: `file://${directory}`,
            shell: { name: "zsh", path: "/bin/zsh" },
          },
          sessionId: "ui-kit-environment-repair-session",
        },
      }));
      return;
    }
    if (message.method === "initialized") return;
    if (message.method === "environment/status") {
      statusRequestCount += 1;
      if (statusRequestCount === failAtStatusRequest) {
        // The exec-server response schema only allows `ready`. Closing the
        // initialized socket is the real failure signal that app-server maps
        // to its public `disconnected` environment status.
        socket.close();
      } else {
        socket.send(JSON.stringify({ id: message.id, result: { status: "ready" } }));
      }
      return;
    }
    if (message.method === "environment/info") {
      socket.send(JSON.stringify({
        id: message.id,
        result: {
          cwd: `file://${directory}`,
          shell: { name: "zsh", path: "/bin/zsh" },
        },
      }));
      return;
    }
    socket.send(JSON.stringify({
      error: { code: -32601, message: `Unsupported exec-server method: ${message.method}` },
      id: message.id ?? -1,
    }));
  });
});
await new Promise((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object", "loopback executor is listening");
const execServerUrl = `ws://127.0.0.1:${address.port}`;
const environmentId = "ui-kit-repair";
const results = [];

try {
  await mkdir(orphanLockPath);
  await writeFile(
    join(orphanLockPath, "owner.json"),
    JSON.stringify({ pid: 2_147_483_647, startedAt: 1, token: "orphaned-environment-lock" }),
  );
  let orphanLockRecovered = false;
  for (const width of [1180, 720]) {
    const { app, page } = await launchScene(scene, {
      capture: false,
      currentSidebar: true,
      environment: {
        CODEX_HOME: appServerHome,
        CODEX_UI_KIT_LIVE_ENVIRONMENTS_PATH: registryPath,
        CODEX_UI_KIT_WORKSPACE: directory,
      },
      windowSize: { height: 820, width },
    });
    try {
      const liveLocal = page.getByRole("button", { name: "Live local", exact: true });
      if (!(await liveLocal.isVisible())) {
        await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      }
      await liveLocal.click();
      const navigation = page.getByRole("button", { name: "Environment status", exact: true });
      if (!(await navigation.isVisible())) {
        await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      }
      await navigation.click();
      const route = page.getByRole("region", { name: "Environments", exact: true });
      await route.waitFor();
      const saved = route.getByRole("region", { name: "Saved environments", exact: true });
      const input = route.getByRole("textbox", { name: "Environment ID", exact: true });
      const execUrl = route.getByRole("textbox", { name: "Exec server URL", exact: true });

      if (width === 1180) {
        await input.fill(environmentId);
        await execUrl.fill(execServerUrl);
        await route.getByRole("button", { name: "Add environment", exact: true }).click();
        await route.getByRole("heading", { name: "Environment added", exact: true }).waitFor();
        await expectNoPath(orphanLockPath);
        orphanLockRecovered = true;
      } else {
        await saved.getByRole("button", { name: `Use ${environmentId}`, exact: true }).click();
        assert.equal(await input.inputValue(), environmentId);
        await route.getByRole("button", { name: "Add environment", exact: true }).click();
        await route.getByRole("heading", { name: "Environment added", exact: true }).waitFor();
      }

      const check = route.getByRole("button", { name: "Check environment status", exact: true });
      failAtStatusRequest = statusRequestCount + 1;
      await check.click();
      await page.waitForTimeout(1500);
      const disconnected = route.getByRole("alert", { name: "Environment status result", exact: true });
      await disconnected.getByRole("heading", { name: "Disconnected", exact: true }).waitFor();
      await disconnected.getByText("exec-server transport disconnected", { exact: true }).waitFor();
      assert.match(await disconnected.innerText(), /ui-kit-repair/);

      await disconnected.getByRole("button", { name: "Retry environment status", exact: true }).click();
      const ready = route.getByRole("status", { name: "Environment status result", exact: true });
      await ready.getByRole("heading", { name: "Ready", exact: true }).waitFor();
      assert.match(await ready.innerText(), /ui-kit-repair/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `environment-repair-${width}.png`) });
      results.push({ width, recovered: true });
    } finally {
      await app.close();
    }
  }
  assert.ok(methods.includes("environment/status"));
  assert.ok(methods.filter((method) => method === "environment/status").length >= 4);
  assert.equal(orphanLockRecovered, true);
  console.log(JSON.stringify({
    passed: true,
    directory,
    environmentId,
    execServerUrl,
    widths: [1180, 720],
    results,
    persistedRegistry: true,
    orphanLockRecovered,
    disconnectedChecks: 2,
    realAppServer: true,
  }));
} finally {
  await new Promise((resolve) => server.close(resolve));
  // App Server may finish its disposable plugin Git clone immediately after
  // Electron closes. Retry transient ENOTEMPTY errors while removing the home.
  await rm(appServerHome, {
    force: true,
    recursive: true,
    maxRetries: 8,
    retryDelay: 250,
  });
  await rm(registryDirectory, { force: true, recursive: true });
  await rm(directory, { force: true, recursive: true });
}

async function expectNoPath(path) {
  await access(path).then(
    () => { throw new Error(`Orphan lock was not recovered: ${path}`); },
    (error) => {
      if (error?.code !== "ENOENT") throw error;
    },
  );
}
