import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in live check: update one existing file and delete another
// through two normal, separately approved file-change requests.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-file-variants-")),
);
const updateFile = "variant-update.txt";
const deleteFile = "variant-delete.txt";
const oldContent = "VARIANT_OLD\n";
const newContent = "VARIANT_UPDATED\n";
const deleteContent = "VARIANT_REMOVE_ME\n";
await writeFile(join(directory, updateFile), oldContent);
await writeFile(join(directory, deleteFile), deleteContent);
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
      CODEX_UI_KIT_LIVE_MODEL: "gpt-5.6-luna",
      CODEX_UI_KIT_LIVE_REASONING_EFFORT: "max",
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

const pendingApproval = () =>
  page.locator('[data-testid="approval-request"][data-decision="pending"]');

async function allowOnce() {
  const request = pendingApproval();
  await request.waitFor({ state: "visible" });
  await request.getByRole("button", { name: "Allow once", exact: true }).click();
}

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__fileVariantEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__fileVariantEvidence.push(event),
    );
    window.codexDemo.onServerRequest((event) =>
      window.__fileVariantEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    `In this disposable workspace use two separate apply_patch operations in this same turn. First update ${updateFile} by replacing exactly VARIANT_OLD with VARIANT_UPDATED. After that approval is granted, delete ${deleteFile}. Do not use shell commands, network, settings, or delegation. Request normal file approval for each operation. After the update and deletion are complete reply exactly FILE_VARIANTS_OK.`,
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__fileVariantEvidence.some(
        (event) => event.kind === "request" || event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );

  const before = await page.evaluate(() => window.__fileVariantEvidence);
  const firstRequest = before.find(
    (event) =>
      event.kind === "request" &&
      event.method === "item/fileChange/requestApproval",
  );
  assert.ok(firstRequest, "A real update approval request is required");
  const firstItem = before
    .filter((event) => event.method === "item/started")
    .map((event) => event.params.item)
    .find((item) => item?.id === firstRequest.params.itemId);
  assert.equal(firstItem?.type, "fileChange");
  assert.equal(firstItem.changes.length, 1);
  assert.equal(firstItem.changes[0].path, join(directory, updateFile));
  assert.equal(firstItem.changes[0].kind.type, "update");
  assert.match(firstItem.changes[0].diff, /VARIANT_UPDATED/);
  assert.equal(await readFile(join(directory, updateFile), "utf8"), oldContent);
  await allowOnce();

  await page.waitForFunction(
    () =>
      window.__fileVariantEvidence.filter(
        (event) =>
          event.kind === "request" &&
          event.method === "item/fileChange/requestApproval",
      ).length >= 2,
    undefined,
    { timeout: 180000 },
  );
  const secondRequest = await page.evaluate(
    () =>
      window.__fileVariantEvidence.filter(
        (event) =>
          event.kind === "request" &&
          event.method === "item/fileChange/requestApproval",
      )[1],
  );
  assert.ok(secondRequest, "A real delete approval request is required");
  const secondItem = await page.evaluate(
    (itemId) =>
      window.__fileVariantEvidence
        .filter((event) => event.method === "item/started")
        .map((event) => event.params.item)
        .find((item) => item?.id === itemId),
    secondRequest.params.itemId,
  );
  assert.equal(secondItem?.type, "fileChange");
  assert.equal(secondItem.changes.length, 1);
  assert.equal(secondItem.changes[0].path, join(directory, deleteFile));
  assert.equal(secondItem.changes[0].kind.type, "delete");
  assert.match(secondItem.changes[0].diff, /VARIANT_REMOVE_ME/);
  await allowOnce();

  await page.waitForFunction(
    () =>
      window.__fileVariantEvidence.some(
        (event) => event.method === "turn/completed",
      ),
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("FILE_VARIANTS_OK", { exact: true }).waitFor();
  assert.equal(await readFile(join(directory, updateFile), "utf8"), newContent);
  await assert.rejects(stat(join(directory, deleteFile)), { code: "ENOENT" });
  const events = await page.evaluate(() => window.__fileVariantEvidence);
  const fileCompletions = events
    .filter((event) => event.method === "item/completed")
    .map((event) => event.params.item)
    .filter((item) => item?.type === "fileChange");
  assert.ok(fileCompletions.length >= 2);

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
      path: join(directory, `file-variants-${width}.png`),
    });
  }
  Object.assign(result, {
    passed: true,
    modelTurns: 1,
    requestCount: 2,
    kinds: ["update", "delete"],
    updated: true,
    deleted: true,
    completedFileChanges: fileCompletions.length,
    widths: [1180, 720],
  });
} catch (error) {
  result.error = String(error);
  result.eventSummary = await page
    .evaluate(() =>
      (window.__fileVariantEvidence ?? []).map((event) => ({
        kind: event.kind,
        method: event.method,
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
      await page.evaluate(() => window.__fileVariantEvidence ?? []).catch(
        () => [],
      ),
      null,
      2,
    ),
  );
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await unlink(join(directory, updateFile)).catch(() => undefined);
  await unlink(join(directory, deleteFile)).catch(() => undefined);
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
