import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in one-turn check. The command writes only to a disposable
// path outside the selected workspace so the sandbox must surface approval.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-command-approval-")),
);
const targetDirectory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-command-target-")),
);
const filename = "command-approval-proof.txt";
const targetPath = join(targetDirectory, filename);
const playgroundPackage = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const clientPackage = JSON.parse(
  await readFile(
    new URL(
      "../package.json",
      import.meta.resolve("@jaminzhou/codex-app-server-client"),
    ),
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
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__commandApprovalEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__commandApprovalEvidence.push(event),
    );
    window.codexDemo.onServerRequest((event) =>
      window.__commandApprovalEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    `In this disposable workspace run exactly the terminal command \`touch ${targetPath}\` once. The target is a disposable proof path outside the workspace, so request the command approval normally. Do not use another command, access other directories or network, change settings, or delegate. After the command succeeds reply exactly COMMAND_APPROVAL_OK.`,
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__commandApprovalEvidence.some(
        (event) => event.kind === "request" || event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );

  const before = await page.evaluate(() => window.__commandApprovalEvidence);
  const request = before.find((event) => event.kind === "request");
  assert.ok(request, "A real command approval request is required");
  assert.equal(request.method, "item/commandExecution/requestApproval");
  assert.equal(request.params.cwd, directory);
  assert.ok(request.params.command.includes(`touch ${targetPath}`));
  const started = before
    .filter((event) => event.method === "item/started")
    .map((event) => event.params.item)
    .find((item) => item?.id === request.params.itemId);
  assert.equal(started?.type, "commandExecution");

  const approval = page.getByTestId("approval-request");
  await approval.waitFor({ state: "visible" });
  await page.screenshot({ path: join(directory, "command-approval-pending.png") });
  await approval.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.__commandApprovalEvidence.filter(
        (event) => event.method === "turn/completed",
      ).length === 1,
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("COMMAND_APPROVAL_OK", { exact: true }).waitFor();
  const events = await page.evaluate(() => window.__commandApprovalEvidence);
  const completed = events.find((event) => event.method === "turn/completed");
  assert.equal(completed.params.turn.status, "completed");
  assert.equal(
    events.filter((event) => event.kind === "request").length,
    1,
    "The command must use one approval request",
  );
  const commandCompletion = events
    .filter((event) => event.method === "item/completed")
    .map((event) => event.params.item)
    .find((item) => item?.id === request.params.itemId);
  assert.equal(commandCompletion?.type, "commandExecution");
  assert.equal(commandCompletion?.status, "completed");
  assert.equal((await stat(targetPath)).size, 0);

  for (const width of [1180, 720]) {
    await app.evaluate(
      ({ BrowserWindow }, value) =>
        BrowserWindow.getAllWindows()[0].setContentSize(value, 820),
      width,
    );
    await page.waitForFunction((value) => innerWidth === value, width);
    await page.getByText("COMMAND_APPROVAL_OK", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: join(directory, `command-approved-${width}.png`) });
  }
  Object.assign(result, {
    passed: true,
    modelTurns: 1,
    approvedOnce: true,
    commandCompleted: true,
    commandCreatedFile: true,
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
      await page.evaluate(() => window.__commandApprovalEvidence ?? []).catch(() => []),
      null,
      2,
    ),
  );
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await rm(join(directory, filename), { force: true }).catch(() => undefined);
  await rm(targetDirectory, { force: true, recursive: true }).catch(() => undefined);
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
