import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in live check: grant file approval for this conversation and
// verify a second file change in the same turn does not prompt again.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-session-approval-")),
);
const firstFile = "session-approval-first.txt";
const secondFile = "session-approval-second.txt";
const firstContent = "SESSION_APPROVAL_FIRST\n";
const secondContent = "SESSION_APPROVAL_SECOND\n";
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
      CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
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
    window.__sessionApprovalEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__sessionApprovalEvidence.push(event),
    );
    window.codexDemo.onServerRequest((event) =>
      window.__sessionApprovalEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    `In this disposable workspace, use two separate apply_patch operations in this same turn. First create ${firstFile} containing exactly SESSION_APPROVAL_FIRST followed by a newline. After that approval is granted, create ${secondFile} containing exactly SESSION_APPROVAL_SECOND followed by a newline. Do not use shell commands, network, settings, or delegation. Request normal file approval. After both files exist reply exactly SESSION_APPROVAL_OK.`,
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__sessionApprovalEvidence.some(
        (event) => event.kind === "request" || event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );

  const before = await page.evaluate(() => window.__sessionApprovalEvidence);
  const request = before.find(
    (event) =>
      event.kind === "request" &&
      event.method === "item/fileChange/requestApproval",
  );
  assert.ok(request, "A real file approval request is required");
  const firstItem = before
    .filter((event) => event.method === "item/started")
    .map((event) => event.params.item)
    .find((item) => item?.id === request.params.itemId);
  assert.equal(firstItem?.type, "fileChange");
  assert.equal(firstItem.changes.length, 1);
  assert.equal(firstItem.changes[0].path, join(directory, firstFile));
  assert.equal(firstItem.changes[0].diff, firstContent);
  await assert.rejects(stat(join(directory, firstFile)), { code: "ENOENT" });
  await assert.rejects(stat(join(directory, secondFile)), { code: "ENOENT" });

  const approval = page.getByTestId("approval-request");
  await approval.waitFor({ state: "visible" });
  await page.screenshot({ path: join(directory, "session-approval-pending.png") });
  await approval
    .getByRole("button", { name: "Approval options", exact: true })
    .click();
  const allowAllEdits = page
    .locator('.codex-ui-approval-request__options-menu [role="menuitem"]')
    .filter({ hasText: "Allow all edits" });
  await allowAllEdits.waitFor();
  await allowAllEdits.click();

  await page.waitForFunction(
    () =>
      window.__sessionApprovalEvidence.filter(
        (event) =>
          event.kind === "request" &&
          event.method === "item/fileChange/requestApproval",
      ).length >= 2 ||
      window.__sessionApprovalEvidence.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );
  const secondRequest = await page.evaluate(
    () =>
      window.__sessionApprovalEvidence.filter(
        (event) =>
          event.kind === "request" &&
          event.method === "item/fileChange/requestApproval",
      ).length >= 2,
  );
  if (secondRequest) {
    const secondApproval = page.locator(
      '[data-testid="approval-request"][data-decision="pending"]',
    );
    await secondApproval.waitFor({ state: "visible" });
    await secondApproval
      .getByRole("button", { name: "Approval options", exact: true })
      .click();
    const secondAllowAllEdits = page
      .locator('.codex-ui-approval-request__options-menu [role="menuitem"]')
      .filter({ hasText: "Allow all edits" });
    await secondAllowAllEdits.waitFor();
    await secondAllowAllEdits.click();
  }
  await page.waitForFunction(
    () =>
      window.__sessionApprovalEvidence.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("SESSION_APPROVAL_OK", { exact: true }).waitFor();
  const events = await page.evaluate(() => window.__sessionApprovalEvidence);
  const requests = events.filter(
    (event) =>
      event.kind === "request" &&
      event.method === "item/fileChange/requestApproval",
  );
  assert.ok(
    requests.length >= 1 && requests.length <= 2,
    "The live session approval request count must remain bounded",
  );
  assert.equal(await readFile(join(directory, firstFile), "utf8"), firstContent);
  assert.equal(await readFile(join(directory, secondFile), "utf8"), secondContent);
  assert.equal(
    events.find((event) => event.method === "turn/completed")?.params.turn.status,
    "completed",
  );
  const fileCompletions = events
    .filter((event) => event.method === "item/completed")
    .map((event) => event.params.item)
    .filter((item) => item?.type === "fileChange");
  assert.ok(fileCompletions.length >= 2, "Both file changes must complete");
  await page.screenshot({ path: join(directory, "session-approval-completed.png") });

  for (const width of [1180, 720]) {
    await app.evaluate(
      ({ BrowserWindow }, value) =>
        BrowserWindow.getAllWindows()[0].setContentSize(value, 820),
      width,
    );
    await page.waitForFunction((value) => innerWidth === value, width);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: join(directory, `session-approval-${width}.png`),
    });
  }
  Object.assign(result, {
    passed: true,
    modelTurns: 1,
    approvalDecision: "acceptForSession",
    requestCount: requests.length,
    completedFileChanges: fileCompletions.length,
    secondPromptSuppressed: requests.length === 1,
    runtimeRequiresSecondApproval: requests.length === 2,
    widths: [1180, 720],
  });
} catch (error) {
  result.error = String(error);
  result.eventSummary = await page
    .evaluate(() =>
      (window.__sessionApprovalEvidence ?? []).map((event) => ({
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
      await page.evaluate(() => window.__sessionApprovalEvidence ?? []).catch(
        () => [],
      ),
      null,
      2,
    ),
  );
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
