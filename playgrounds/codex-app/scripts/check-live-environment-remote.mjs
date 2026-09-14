import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// This is an opt-in integration gate. The App Server client is real; the
// loopback executor speaks the public exec-server JSON-RPC handshake so the
// test never needs credentials or a production Remote registry.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-remote-"));
const scene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");
assert.ok(scene, "environment route scene is present");

const remoteEnvironmentId = "ui-kit-local-remote";
const createRemoteServer = async (label, { failInfoCount = 0 } = {}) => {
  const methods = [];
  let remainingInfoFailures = failInfoCount;
  const remoteInfo = {
    cwd: `file:///tmp/ui-kit-local-remote-${label}`,
    shell: { name: "zsh", path: "/bin/zsh" },
  };
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
        socket.send(
          JSON.stringify({
            id: message.id,
            result: {
              environmentInfo: remoteInfo,
              sessionId: `ui-kit-local-remote-${label}-session`,
            },
          }),
        );
        return;
      }
      if (message.method === "initialized") return;
      if (message.method === "environment/info") {
        if (remainingInfoFailures > 0) {
          remainingInfoFailures -= 1;
          socket.send(JSON.stringify({ id: message.id, result: { cwd: remoteInfo.cwd, shell: {} } }));
          return;
        }
        socket.send(JSON.stringify({ id: message.id, result: remoteInfo }));
        return;
      }
      if (message.method === "environment/status") {
        socket.send(JSON.stringify({ id: message.id, result: { status: "ready" } }));
        return;
      }
      socket.send(
        JSON.stringify({
          error: { code: -32601, message: `Unsupported exec-server method: ${message.method}` },
          id: message.id ?? -1,
        }),
      );
    });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object", `${label} loopback exec server is listening`);
  return {
    methods,
    remoteInfo,
    server,
    url: `ws://127.0.0.1:${address.port}`,
  };
};

const initialServer = await createRemoteServer("initial");
const updatedServer = await createRemoteServer("updated", { failInfoCount: 1 });
const initialExecServerUrl = initialServer.url;
const updatedExecServerUrl = updatedServer.url;
const updatedExecServerValue = `${updatedExecServerUrl}/`;

const appServerHome = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-codex-home-"));
const registryDirectory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-registry-"));
const registryPath = join(registryDirectory, "environments.json");
const results = [];
try {
  for (const width of [1180, 720]) {
    const { app, page } = await launchScene(scene, {
      capture: false,
      currentSidebar: true,
      environment: {
        CODEX_HOME: appServerHome,
        CODEX_UI_KIT_LIVE_ENVIRONMENTS_PATH: registryPath,
      },
      windowSize: { width, height: 820 },
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
      if (width === 720) {
        await saved.getByRole("button", { name: `Use ${remoteEnvironmentId}`, exact: true }).waitFor();
        assert.match(await saved.innerText(), new RegExp(updatedExecServerUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }

      const input = route.getByRole("textbox", { name: "Environment ID", exact: true });
      const execUrl = route.getByRole("textbox", { name: "Exec server URL", exact: true });
      const inspect = route.getByRole("button", { name: "Inspect environment", exact: true });
      const check = route.getByRole("button", { name: "Check environment status", exact: true });
      if (width === 1180) {
        const add = route.getByRole("button", { name: "Add environment", exact: true });
        await input.fill(remoteEnvironmentId);
        await execUrl.fill(initialExecServerUrl);
        await add.click();
        const added = route.getByRole("status", { name: "Add environment result", exact: true });
        await added.getByRole("heading", { name: "Environment added", exact: true }).waitFor();
        assert.match(await added.innerText(), new RegExp(initialExecServerUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        await saved.getByRole("button", { name: `Use ${remoteEnvironmentId}`, exact: true }).waitFor();
        assert.match(await saved.innerText(), new RegExp(remoteEnvironmentId));
        await saved.getByRole("button", { name: `Edit ${remoteEnvironmentId}`, exact: true }).click();
        const update = route.getByRole("button", { name: "Update environment", exact: true });
        await update.waitFor();
        await execUrl.fill(updatedExecServerUrl);
        await update.click();
        const updated = route.getByRole("status", { name: "Add environment result", exact: true });
        await updated.getByRole("heading", { name: "Environment updated", exact: true }).waitFor();
        assert.match(await updated.innerText(), new RegExp(updatedExecServerUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.match(await saved.innerText(), new RegExp(updatedExecServerUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      } else {
        await saved.getByRole("button", { name: `Edit ${remoteEnvironmentId}`, exact: true }).click();
        const update = route.getByRole("button", { name: "Update environment", exact: true });
        await update.waitFor();
        assert.equal(await input.inputValue(), remoteEnvironmentId);
        assert.equal(await execUrl.inputValue(), updatedExecServerValue);
        await update.click();
        const updated = route.getByRole("status", { name: "Add environment result", exact: true });
        await updated.getByRole("heading", { name: "Environment updated", exact: true }).waitFor();
        assert.match(await updated.innerText(), new RegExp(updatedExecServerUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }

      await inspect.click();
      const infoError = route.getByRole("alert", { name: "Environment info result", exact: true });
      if (width === 1180) {
        await infoError.getByRole("heading", { name: "Environment details unavailable", exact: true }).waitFor();
        await infoError.getByRole("button", { name: "Retry environment details", exact: true }).click();
      }
      const info = route.getByRole("status", { name: "Environment info result", exact: true });
      await info.getByRole("heading", { name: "Environment details", exact: true }).waitFor();
      assert.match(await info.innerText(), /zsh/);
      assert.match(await info.innerText(), /file:\/\/\/tmp\/ui-kit-local-remote-updated/);

      await check.click();
      const status = route.getByRole("status", { name: "Environment status result", exact: true });
      await status.waitFor();
      assert.match(await status.innerText(), /ready|pending/i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `environment-remote-${width}.png`) });
      results.push({ width, status: await status.innerText() });
      if (width === 720) {
        await saved.getByRole("button", { name: `Forget ${remoteEnvironmentId}`, exact: true }).click();
        await saved.waitFor({ state: "detached" });
      }
    } finally {
      await app.close();
    }
  }
  assert.ok(initialServer.methods.includes("initialize"));
  assert.ok(updatedServer.methods.includes("initialize"));
  assert.ok(updatedServer.methods.includes("environment/info"));
  assert.ok(updatedServer.methods.includes("environment/status"));
  assert.equal(updatedServer.methods.filter((method) => method === "environment/info").length, 3);
  console.log(JSON.stringify({
    passed: true,
    directory,
    initialExecServerUrl,
    updatedExecServerUrl,
    widths: [1180, 720],
    methods: {
      initial: initialServer.methods,
      updated: updatedServer.methods,
    },
    results,
    repair: "malformed environment/info once, then UI Retry recovery",
    realAppServer: true,
    modelTurns: 0,
    productionRemoteRegistry: false,
  }));
} finally {
  await Promise.all([
    new Promise((resolve) => initialServer.server.close(resolve)),
    new Promise((resolve) => updatedServer.server.close(resolve)),
  ]);
  await rm(appServerHome, { recursive: true, force: true });
  await rm(registryDirectory, { recursive: true, force: true });
}
