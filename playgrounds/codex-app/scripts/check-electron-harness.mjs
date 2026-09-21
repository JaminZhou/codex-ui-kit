import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { launchScene } from "./electron-harness.mjs";
import { launchIsolatedElectron } from "./electron-session.mjs";

const sessions = [];
const directories = [];
try {
  // allSettled keeps ownership of the successful sibling if one launch fails.
  const results = await Promise.allSettled([0, 1].map(async (index) => {
    const session = await launchScene({ id: `harness-${index}`, frame: "shell-restored", scenario: "streaming-recovery", view: "shell" });
    sessions.push(session);
    return session;
  }));
  for (const result of results) if (result.status === "rejected") throw result.reason;
  for (const { app } of sessions) {
    const paths = await app.evaluate(({ app }) => ({
      user: app.getPath("userData"),
      session: app.getPath("sessionData"),
      expected: process.env.CODEX_UI_KIT_TEST_USER_DATA_DIR,
      coordinatedStartup: typeof globalThis.__playwright_run === "function",
      unthrottledTimers: app.commandLine.hasSwitch("disable-background-timer-throttling"),
    }));
    assert.equal(paths.user, paths.expected);
    assert.equal(paths.session, paths.expected);
    assert.equal(paths.coordinatedStartup, true, "Playwright's Electron loader must coordinate app readiness");
    assert.equal(paths.unthrottledTimers, true, "Hidden test windows must use Playwright's background timer policy");
    directories.push(paths.user);
  }
  assert.notEqual(directories[0], directories[1]);
  await sessions[0].page.evaluate(() => localStorage.setItem("harness-isolation", "first"));
  assert.equal(await sessions[1].page.evaluate(() => localStorage.getItem("harness-isolation")), null);
} finally {
  await Promise.all(sessions.map(({ app }) => app.close()));
}
for (const directory of directories) await assert.rejects(access(directory));

let failedProcess;
let failedDirectory;
const preparationFailure = new Error("intentional scene preparation failure");
await assert.rejects(launchIsolatedElectron({
  args: ["."],
  env: { ...process.env, CODEX_DEMO_HEADLESS: "1", CODEX_UI_KIT_LIVE_EPHEMERAL: "1" },
}, async (app) => {
  failedProcess = app.process();
  failedDirectory = await app.evaluate(({ app }) => app.getPath("userData"));
  throw preparationFailure;
}), (error) => error === preparationFailure);
assert.ok(failedProcess.exitCode !== null || failedProcess.signalCode !== null);
await assert.rejects(access(failedDirectory));
console.log("Electron harness passed: concurrent profile/storage isolation and failed-scene process cleanup.");
