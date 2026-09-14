import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in one-turn check. The command is harmless and runs only in
// a disposable workspace; the UI Stop action owns the interruption.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-command-cancel-")),
);
const playgroundPackage = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const clientPackage = JSON.parse(
  await readFile(
    new URL("../package.json", import.meta.resolve("@jaminzhou/codex-app-server-client")),
    "utf8",
  ),
);
const { app, page } = await launchScene(
  visualScenes.find((scene) => scene.id === "pull-request-detail"),
  {
    capture: false,
    environment: {
      CODEX_UI_KIT_WORKSPACE: directory,
      CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "1",
    },
  },
);
const result = {
  passed: false,
  directory,
  clientDependency: playgroundPackage.dependencies["@jaminzhou/codex-app-server-client"],
  runtimeDependency: clientPackage.dependencies["@openai/codex"],
};

async function waitForProcessExit(processId) {
  const pid = Number(processId);
  assert.ok(Number.isInteger(pid) && pid > 0, "A numeric command processId is required.");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return true;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__commandCancelEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__commandCancelEvidence.push(event),
    );
    window.codexDemo.onServerRequest((event) =>
      window.__commandCancelEvidence.push(event),
    );
    window.codexDemo.onLiveSession((event) =>
      window.__commandCancelEvidence.push(event),
    );
  });

  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    "In this disposable workspace run exactly the terminal command `sleep 30`. Do not use any other command, tool, file, network, or delegation. Keep the turn active until the user stops it.",
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__commandCancelEvidence?.some(
        (event) =>
          (event.method === "item/started" &&
            event.params?.item?.type === "commandExecution") ||
          event.method === "item/commandExecution/requestApproval" ||
          event.kind === "request" ||
          event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180_000 },
  );

  const initial = await page.evaluate(() => window.__commandCancelEvidence);
  const approval = initial.find(
    (event) =>
      event.method === "item/commandExecution/requestApproval" ||
      (event.kind === "request" &&
        event.method === "item/commandExecution/requestApproval"),
  );
  if (approval) {
    const approvalCard = page.getByTestId("approval-request");
    await approvalCard.waitFor({ state: "visible", timeout: 30_000 });
    await approvalCard.getByRole("button", { name: "Allow once", exact: true }).click();
  }

  await page.waitForFunction(
    () =>
      window.__commandCancelEvidence?.some(
        (event) =>
          event.method === "item/started" &&
          event.params?.item?.type === "commandExecution",
      ),
    undefined,
    { timeout: 180_000 },
  );
  const beforeStop = await page.evaluate(() => window.__commandCancelEvidence);
  const started = beforeStop.find(
    (event) =>
      event.method === "item/started" &&
      event.params?.item?.type === "commandExecution",
  );
  assert.ok(started, "A real commandExecution item must be observed.");
  const threadId = started.params.threadId;
  const commandId = started.params.item.id;
  assert.equal(typeof threadId, "string");
  assert.equal(typeof commandId, "string");
  assert.match(String(started.params.item.processId ?? ""), /^\d+$/);
  assert.match(JSON.stringify(started.params.item.command ?? ""), /sleep/);
  result.startedItem = {
    id: commandId,
    processId: started.params.item.processId,
    status: started.params.item.status ?? null,
    command: started.params.item.command ?? null,
    cwd: started.params.item.cwd ?? null,
  };
  result.runningScreenshot = join(directory, "command-cancel-running.png");
  await page.screenshot({ path: result.runningScreenshot });

  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.waitFor({ state: "visible", timeout: 30_000 });
  await stop.click();
  await page.waitForFunction(
    () =>
      window.__commandCancelEvidence?.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 60_000 },
  );
  const events = await page.evaluate(() => window.__commandCancelEvidence);
  const completedTurn = events.findLast((event) => event.method === "turn/completed");
  assert.equal(completedTurn?.params?.threadId, threadId);
  assert.equal(completedTurn?.params?.turn?.status, "interrupted");
  const processTerminated = await waitForProcessExit(started.params.item.processId);
  assert.equal(processTerminated, true, "Stop must terminate the active command process.");
  const commandCompletions = events
    .filter(
      (event) =>
        event.method === "item/completed" &&
        event.params?.item?.type === "commandExecution" &&
        event.params.item.id === commandId,
    )
    .map((event) => event.params.item);
  assert.ok(
    commandCompletions.length === 0 ||
      commandCompletions.every((item) => item.status === "interrupted"),
    "An interrupted command must not report a successful completion.",
  );
  await page.waitForSelector('.demo-root[data-status="interrupted"]', {
    state: "attached",
    timeout: 30_000,
  });
  result.stoppedScreenshot = join(directory, "command-cancel-stopped.png");
  await page.screenshot({ path: result.stoppedScreenshot });

  for (const width of [1180, 720]) {
    await app.evaluate(
      ({ BrowserWindow }, value) =>
        BrowserWindow.getAllWindows()[0].setContentSize(value, 820),
      width,
    );
    await page.waitForFunction((value) => innerWidth === value, width);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: join(directory, `command-cancel-${width}.png`) });
  }
  Object.assign(result, {
    passed: true,
    interrupted: true,
    commandCompletionCount: commandCompletions.length,
    processTerminated,
    turnStatus: completedTurn.params.turn.status,
    widths: [1180, 720],
  });
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(
    join(directory, "events.json"),
    JSON.stringify(
      await page.evaluate(() => window.__commandCancelEvidence ?? []).catch(() => []),
      null,
      2,
    ),
  );
  await page.evaluate(() => window.codexDemo?.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
