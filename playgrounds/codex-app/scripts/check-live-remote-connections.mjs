import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// The connection test is real host IPC plus a disposable loopback device. No
// credentials or production Remote registry are involved.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-remote-connections-"));
const registryPath = join(directory, "connections.json");
const scene = visualScenes.find(({ id }) => id === "workspace-connections-settings");
assert.ok(scene, "remote connections route scene is present");

const methods = [];
const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
server.on("connection", (socket) => {
  methods.push("connection");
  socket.on("close", () => methods.push("close"));
});
await new Promise((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const initialEndpoint = `ws://127.0.0.1:${address.port}`;
const updatedServer = new WebSocketServer({ host: "127.0.0.1", port: 0 });
updatedServer.on("connection", (socket) => {
  methods.push("updated-connection");
  socket.on("close", () => methods.push("updated-close"));
});
await new Promise((resolve) => updatedServer.once("listening", resolve));
const updatedAddress = updatedServer.address();
assert.ok(updatedAddress && typeof updatedAddress === "object");
const updatedEndpoint = `ws://127.0.0.1:${updatedAddress.port}`;

try {
  for (const width of [1180, 720]) {
    const { app, page } = await launchScene(scene, {
      capture: false,
      environment: { CODEX_UI_KIT_LIVE_REMOTE_CONNECTIONS_PATH: registryPath },
      currentSidebar: true,
      windowSize: { width, height: 820 },
    });
    try {
      const backToApp = page.getByRole("button", { name: "Back to app", exact: true });
      if (await backToApp.count() && await backToApp.first().isVisible()) {
        await backToApp.first().click();
      }
      const liveLocal = page.getByRole("button", { name: "Live local", exact: true });
      if (!(await liveLocal.isVisible())) {
        const showSidebar = page.getByRole("button", { name: "Show sidebar", exact: true });
        if (await showSidebar.count()) await showSidebar.click();
      }
      await liveLocal.click({ force: true });
      const navigation = page.getByRole("button", { name: "Connections", exact: true });
      if (!(await navigation.isVisible())) {
        const showSidebar = page.getByRole("button", { name: "Show sidebar", exact: true });
        if (await showSidebar.count()) await showSidebar.click();
      }
      await navigation.click({ force: true });
      const route = page.getByRole("region", { name: "Connections", exact: true });
      await route.waitFor();
      await route.getByText("Available connections", { exact: true }).waitFor();

      if (width === 1180) {
        await route.getByRole("button", { name: "Add connection", exact: true }).click();
        const form = route.getByRole("form", { name: "Connection editor", exact: true });
        await form.getByRole("textbox", { name: "Connection name", exact: true }).fill("Loopback runner");
        await form.getByRole("combobox", { name: "Connection type", exact: true }).selectOption("device");
        await form.getByRole("textbox", { name: "Host or device", exact: true }).fill(initialEndpoint);
        await form.getByRole("button", { name: "Save connection", exact: true }).click();
        await route.getByText("Loopback runner", { exact: true }).waitFor();
      }

      const row = route.locator(".codex-ui-remote-connections__row").filter({ hasText: "Loopback runner" });
      await row.getByRole("button", { name: "Test", exact: true }).click();
      await row.getByText("Connected", { exact: true }).waitFor();
      await page.getByText("Loopback device connection is ready.", { exact: true }).waitFor();

      if (width === 1180) {
        await row.getByRole("button", { name: "Edit", exact: true }).click();
        const form = route.getByRole("form", { name: "Connection editor", exact: true });
        await form.getByRole("textbox", { name: "Host or device", exact: true }).fill(updatedEndpoint);
        await form.getByRole("button", { name: "Save connection", exact: true }).click();
        await route.getByText("Loopback runner", { exact: true }).waitFor();
      }
      await row.getByRole("button", { name: "Test", exact: true }).click();
      await row.getByText("Connected", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: join(directory, `remote-connections-${width}.png`) });

      if (width === 720) {
        await row.getByRole("button", { name: "Forget", exact: true }).click();
        await row.waitFor({ state: "detached" });
      }
    } finally {
      await app.close();
    }
  }
  assert.ok(methods.includes("connection"));
  assert.ok(methods.includes("updated-connection"));
  console.log(JSON.stringify({
    passed: true,
    directory,
    endpoints: [initialEndpoint, updatedEndpoint],
    widths: [1180, 720],
    loopbackTests: methods.filter((method) => method.includes("connection")).length,
    persistedRegistry: true,
    productionRemoteRegistry: false,
  }));
} finally {
  await Promise.all([
    new Promise((resolve) => server.close(resolve)),
    new Promise((resolve) => updatedServer.close(resolve)),
  ]);
  await rm(directory, { recursive: true, force: true });
}
