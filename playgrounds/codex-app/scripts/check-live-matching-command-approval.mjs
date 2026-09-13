import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in one-turn check. The model runs the exact same command
// twice; an exec-policy amendment must remove the second approval prompt.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-matching-command-approval-")),
);
const targetDirectory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-matching-command-target-")),
);
const filename = "matching-command-approval-proof.txt";
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
  clientDependency:
    playgroundPackage.dependencies["@jaminzhou/codex-app-server-client"],
  runtimeDependency: clientPackage.dependencies["@openai/codex"],
};

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__matchingApprovalEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__matchingApprovalEvidence.push(event),
    );
    window.codexDemo.onServerRequest((event) =>
      window.__matchingApprovalEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    `In this disposable workspace run exactly the terminal command \`touch ${targetPath}\` twice as two separate command executions in this same turn. The target is a disposable proof path outside the workspace, so request normal command approval. Do not use any other command, access another directory, use the network, change settings, or delegate. After both commands complete reply exactly MATCHING_COMMAND_APPROVAL_OK.`,
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__matchingApprovalEvidence.some(
        (event) =>
          event.kind === "request" || event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );

  const before = await page.evaluate(() => window.__matchingApprovalEvidence);
  const request = before.find(
    (event) =>
      event.kind === "request" &&
      event.method === "item/commandExecution/requestApproval",
  );
  assert.ok(request, "A real command approval request is required");
  assert.equal(request.params.cwd, directory);
  assert.ok(request.params.command.includes(`touch ${targetPath}`));
  assert.ok(
    Array.isArray(request.params.proposedExecpolicyAmendment) &&
      request.params.proposedExecpolicyAmendment.length > 0,
    "The server must expose a proposed matching-command rule",
  );

  const approval = page.getByTestId("approval-request");
  await approval.waitFor({ state: "visible" });
  await page.screenshot({ path: join(directory, "matching-command-pending.png") });
  await approval
    .getByRole("button", { name: "Approval options", exact: true })
    .click();
  const similarAction = page
    .locator('.codex-ui-approval-request__options-menu [role="menuitem"]')
    .filter({ hasText: "Allow similar commands" });
  await similarAction.waitFor();
  await similarAction.click();

  await page.waitForFunction(
    () =>
      window.__matchingApprovalEvidence.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("MATCHING_COMMAND_APPROVAL_OK", { exact: true }).waitFor();
  const events = await page.evaluate(() => window.__matchingApprovalEvidence);
  const requests = events.filter(
    (event) =>
      event.kind === "request" &&
      event.method === "item/commandExecution/requestApproval",
  );
  assert.equal(
    requests.length,
    1,
    "A matching command rule must suppress the second approval prompt",
  );
  const commandCompletions = events
    .filter((event) => event.method === "item/completed")
    .map((event) => event.params.item)
    .filter((item) => item?.type === "commandExecution");
  assert.ok(
    commandCompletions.length >= 2,
    "Both matching command executions must complete",
  );
  assert.ok(commandCompletions.every((item) => item.status === "completed"));
  assert.equal(
    events.find((event) => event.method === "turn/completed")?.params.turn.status,
    "completed",
  );
  assert.equal((await stat(targetPath)).size, 0);

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
    await page.screenshot({
      path: join(directory, `matching-command-completed-${width}.png`),
    });
  }
  Object.assign(result, {
    passed: true,
    modelTurns: 1,
    matchingCommandRule: request.params.proposedExecpolicyAmendment,
    approvalRequestCount: requests.length,
    completedCommandExecutions: commandCompletions.length,
    widths: [1180, 720],
  });
} catch (error) {
  result.error = String(error);
  result.eventSummary = await page
    .evaluate(() =>
      (window.__matchingApprovalEvidence ?? []).map((event) => ({
        kind: event.kind,
        method: event.method,
        decision: event.responseDecision,
        itemType: event.params?.item?.type,
        itemStatus: event.params?.item?.status,
        turnStatus: event.params?.turn?.status,
      })),
    )
    .catch(() => []);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(
    join(directory, "events.json"),
    JSON.stringify(
      await page.evaluate(() => window.__matchingApprovalEvidence ?? []).catch(
        () => [],
      ),
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
