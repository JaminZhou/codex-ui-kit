import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { launchScene, visualScenes } from "./electron-harness.mjs";
import { fileURLToPath } from "node:url";

// This is an opt-in integration gate. The App Server client is real; the
// loopback executor speaks the public exec-server JSON-RPC handshake so the
// test never needs credentials or a production Remote registry.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-remote-"));
const scene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");
assert.ok(scene, "environment route scene is present");

const remoteEnvironmentId = "ui-kit-local-remote";
const remoteCwd = "file:///tmp/ui-kit-local-remote";
const remoteInfo = {
  cwd: remoteCwd,
  shell: { name: "zsh", path: "/bin/zsh" },
};
const methods = [];
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
            sessionId: "ui-kit-local-remote-session",
          },
        }),
      );
      return;
    }
    if (message.method === "initialized") return;
    if (message.method === "environment/info") {
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
assert.ok(address && typeof address === "object", "loopback exec server is listening");
const execServerUrl = `ws://127.0.0.1:${address.port}`;

const appServerHome = await mkdtemp(join(tmpdir(), "ui-kit-live-environment-codex-home-"));
const clientModulePath = fileURLToPath(
  import.meta.resolve("@jaminzhou/codex-app-server-client"),
);
const results = [];
try {
  for (const width of [1180, 720]) {
    const { app, page } = await launchScene(scene, {
      capture: false,
      currentSidebar: true,
      environment: { CODEX_HOME: appServerHome },
      windowSize: { width, height: 820 },
    });
    try {
      await app.evaluate(async ({ ipcMain }, input) => {
        const { CodexAppServerClient } = process.mainModule.require(
          input.clientModulePath,
        );
        const client = new CodexAppServerClient({
          capabilities: { experimentalApi: true },
          clientInfo: {
            name: "ui_kit_live_environment_remote",
            title: "UI Kit Live Environment Remote",
            version: "0.0.0",
          },
          env: { ...process.env, CODEX_HOME: input.codexHome },
          protocolValidation: "strict",
          requestTimeoutMs: 15_000,
        });
        await client.connect();
        globalThis.__liveEnvironmentRemoteClient = client;
        ipcMain.removeHandler("demo:environment:add");
        ipcMain.handle("demo:environment:add", async (_event, value) => {
          if (value?.projectToken !== "startup-workspace") {
            throw new Error("Unexpected project token.");
          }
          const environmentId = value?.environmentId;
          const execServerUrl = value?.execServerUrl;
          const result = await client.call("environment/add", {
            connectTimeoutMs: 5_000,
            environmentId,
            execServerUrl,
          });
          return { environmentId, execServerUrl: new URL(execServerUrl).toString(), status: "added", ...result };
        });
        ipcMain.removeHandler("demo:environment:status");
        ipcMain.handle("demo:environment:status", async (_event, value) => {
          if (value?.projectToken !== "startup-workspace") {
            throw new Error("Unexpected project token.");
          }
          return {
            environmentId: value.environmentId,
            ...(await client.call("environment/status", { environmentId: value.environmentId })),
          };
        });
        ipcMain.removeHandler("demo:environment:info");
        ipcMain.handle("demo:environment:info", async (_event, value) => {
          if (value?.projectToken !== "startup-workspace") {
            throw new Error("Unexpected project token.");
          }
          return {
            environmentId: value.environmentId,
            ...(await client.call("environment/info", { environmentId: value.environmentId })),
          };
        });
      }, { clientModulePath, codexHome: appServerHome });

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

      const input = route.getByRole("textbox", { name: "Environment ID", exact: true });
      const execUrl = route.getByRole("textbox", { name: "Exec server URL", exact: true });
      const add = route.getByRole("button", { name: "Add environment", exact: true });
      const inspect = route.getByRole("button", { name: "Inspect environment", exact: true });
      const check = route.getByRole("button", { name: "Check environment status", exact: true });
      await input.fill(remoteEnvironmentId);
      await execUrl.fill(execServerUrl);
      await add.click();
      const added = route.getByRole("status", { name: "Add environment result", exact: true });
      await added.getByRole("heading", { name: "Environment added", exact: true }).waitFor();
      assert.match(await added.innerText(), new RegExp(execServerUrl.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));

      await inspect.click();
      const info = route.getByRole("status", { name: "Environment info result", exact: true });
      await info.getByRole("heading", { name: "Environment details", exact: true }).waitFor();
      assert.match(await info.innerText(), /zsh/);
      assert.match(await info.innerText(), /file:\/\/\/tmp\/ui-kit-local-remote/);

      await check.click();
      const status = route.getByRole("status", { name: "Environment status result", exact: true });
      await status.waitFor();
      assert.match(await status.innerText(), /ready|pending/i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `environment-remote-${width}.png`) });
      results.push({ width, status: await status.innerText() });
    } finally {
      await app.evaluate(async () => {
        await globalThis.__liveEnvironmentRemoteClient?.close();
        delete globalThis.__liveEnvironmentRemoteClient;
      }).catch(() => undefined);
      await app.close();
    }
  }
  assert.ok(methods.includes("initialize"));
  assert.ok(methods.includes("environment/info"));
  console.log(JSON.stringify({
    passed: true,
    directory,
    execServerUrl,
    widths: [1180, 720],
    methods,
    results,
    realAppServer: true,
    modelTurns: 0,
    productionRemoteRegistry: false,
  }));
} finally {
  await new Promise((resolve) => server.close(resolve));
  await rm(appServerHome, { recursive: true, force: true });
}
