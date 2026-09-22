import assert from "node:assert/strict";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Two real Electron hosts share the playground-owned environment and remote
// connection registries. A write made by one host must refresh the other
// without a focus event or a manual Retry action.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-registry-sync-"));
const environmentPath = join(directory, "environments.json");
const remotePath = join(directory, "connections.json");
const remoteScene = visualScenes.find(({ id }) => id === "workspace-connections-settings");
const environmentScene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");
assert.ok(remoteScene, "remote connections route scene is present");
assert.ok(environmentScene, "environment route scene is present");

const environment = {
  CODEX_UI_KIT_LIVE_ENVIRONMENTS_PATH: environmentPath,
  CODEX_UI_KIT_LIVE_REMOTE_CONNECTIONS_PATH: remotePath,
  CODEX_UI_KIT_WORKSPACE: directory,
};
let first;
let second;
const result = { passed: false, remote: {}, environment: {} };

try {
  first = await launchScene(remoteScene, { capture: false, currentSidebar: true, environment });
  second = await launchScene(remoteScene, { capture: false, currentSidebar: true, environment });
  for (const app of [first, second]) {
    await app.page.evaluate(() => {
      window.__registrySyncEvents = { environment: 0, remote: 0 };
      window.codexDemo.onLiveEnvironmentChange(() => { window.__registrySyncEvents.environment += 1; });
      window.codexDemo.onLiveRemoteConnectionsChange(() => { window.__registrySyncEvents.remote += 1; });
    });
  }

  await Promise.all([openLiveRoute(first, "Connections"), openLiveRoute(second, "Connections")]);
  const firstRemote = first.page.getByRole("region", { name: "Connections", exact: true });
  const secondRemote = second.page.getByRole("region", { name: "Connections", exact: true });
  await firstRemote.getByRole("button", { name: "Add connection", exact: true }).click();
  const form = firstRemote.getByRole("form", { name: "Connection editor", exact: true });
  await form.getByRole("textbox", { name: "Connection name", exact: true }).fill("Cross-instance runner");
  await form.getByRole("combobox", { name: "Connection type", exact: true }).selectOption("device");
  await form.getByRole("textbox", { name: "Host or device", exact: true }).fill("ws://127.0.0.1:9876");
  await form.getByRole("button", { name: "Save connection", exact: true }).click();
  await firstRemote.getByText("Cross-instance runner", { exact: true }).waitFor();
  await second.page.waitForFunction(() => window.__registrySyncEvents.remote > 0, undefined, { timeout: 5_000 });
  await secondRemote.getByText("Cross-instance runner", { exact: true }).waitFor();
  result.remote.savedOnSecondWithoutFocus = true;

  await firstRemote.getByRole("button", { name: "Forget", exact: true }).click();
  await second.page.waitForFunction(() => window.__registrySyncEvents.remote > 1, undefined, { timeout: 5_000 });
  await secondRemote.getByText("Cross-instance runner", { exact: true }).waitFor({ state: "hidden" });
  result.remote.forgottenOnSecondWithoutFocus = true;

  await Promise.all([openLiveRoute(first, "Environment status"), openLiveRoute(second, "Environment status")]);
  const environmentEntry = {
    directory,
    environmentId: "cross-instance-environment",
    execServerUrl: "ws://127.0.0.1:9877/",
    updatedAt: Date.now(),
  };
  await writeRegistry(environmentPath, { version: 1, environments: [environmentEntry] });
  await second.page.waitForFunction(() => window.__registrySyncEvents.environment > 0, undefined, { timeout: 5_000 });
  const secondEnvironment = second.page.getByRole("region", { name: "Environments", exact: true });
  const saved = secondEnvironment.getByRole("region", { name: "Saved environments", exact: true });
  await saved.getByRole("button", { name: "Use cross-instance-environment", exact: true }).waitFor();
  await saved.getByText("ws://127.0.0.1:9877/", { exact: true }).waitFor();
  result.environment.savedOnSecondWithoutFocus = true;

  environmentEntry.execServerUrl = "ws://127.0.0.1:9878/";
  environmentEntry.updatedAt += 1;
  await writeRegistry(environmentPath, { version: 1, environments: [environmentEntry] });
  await second.page.waitForFunction(() => window.__registrySyncEvents.environment > 1, undefined, { timeout: 5_000 });
  await saved.getByText("ws://127.0.0.1:9878/", { exact: true }).waitFor();
  result.environment.updatedOnSecondWithoutFocus = true;

  await second.page.screenshot({ path: join(directory, "registry-sync.png") });
  result.remote.events = await second.page.evaluate(() => window.__registrySyncEvents.remote);
  result.environment.events = await second.page.evaluate(() => window.__registrySyncEvents.environment);
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await second?.page.screenshot({ path: join(directory, "registry-sync-failed.png") }).catch(() => undefined);
} finally {
  await first?.app.close().catch(() => undefined);
  await second?.app.close().catch(() => undefined);
  await rm(directory, { recursive: true, force: true });
  console.log(JSON.stringify(result));
}

async function openLiveRoute(app, routeName) {
  const liveLocal = app.page.getByRole("button", { name: "Live local", exact: true });
  if (await liveLocal.isVisible()) await liveLocal.click();
  const navigation = app.page.getByRole("button", { name: routeName, exact: true });
  if (!(await navigation.isVisible())) {
    const showSidebar = app.page.getByRole("button", { name: "Show sidebar", exact: true });
    if (await showSidebar.count()) await showSidebar.click();
  }
  await navigation.click({ force: true });
  await app.page.getByRole("region", { name: routeName === "Connections" ? "Connections" : "Environments", exact: true }).waitFor();
}

async function writeRegistry(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: "wx" });
  await rename(temporary, path);
}
