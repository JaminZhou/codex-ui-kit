import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in manual-compaction check. The bridge is project/thread scoped.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-compaction-")),
);
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
  clientDependency: playgroundPackage.dependencies["@jaminzhou/codex-app-server-client"],
  runtimeDependency: clientPackage.dependencies["@openai/codex"],
};

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__compactionEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__compactionEvidence.push(event),
    );
    window.codexDemo.onLiveSession((event) =>
      window.__compactionEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    "Reply exactly COMPACTION_BASELINE. Do not use tools or delegate. Keep the answer short.",
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__compactionEvidence.filter(
        (event) => event.method === "turn/completed",
      ).length === 1,
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("COMPACTION_BASELINE", { exact: true }).waitFor();
  const bound = await page.evaluate(() =>
    window.__compactionEvidence.find((event) => event.kind === "live-bind"),
  );
  assert.ok(bound?.threadId, "A real live thread must be bound before compaction");

  await page.evaluate(
    ({ projectToken, threadId }) =>
      window.codexDemo.compactLive({ projectToken, threadId }),
    { projectToken: "startup-workspace", threadId: bound.threadId },
  );
  await page.waitForFunction(
    () =>
      window.__compactionEvidence.some(
        (event) =>
          event.method === "thread/compacted" ||
          (event.method === "item/completed" &&
            event.params.item?.type === "contextCompaction"),
      ),
    undefined,
    { timeout: 180000 },
  );
  const events = await page.evaluate(() => window.__compactionEvidence);
  const compactStarted = events
    .filter((event) => event.method === "item/started")
    .map((event) => event.params.item)
    .find((item) => item?.type === "contextCompaction");
  const compactCompleted = events
    .filter((event) => event.method === "item/completed")
    .map((event) => event.params.item)
    .find((item) => item?.type === "contextCompaction");
  assert.equal(compactStarted?.type, "contextCompaction");
  assert.equal(compactCompleted?.type, "contextCompaction");
  const compacted = events.find((event) => event.method === "thread/compacted");
  if (compacted) assert.equal(compacted.params.threadId, bound.threadId);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="thread-context-compaction"]') ||
      document.querySelector('[data-status="completed"]'),
  );
  await page.screenshot({ path: join(directory, "compaction-completed.png") });

  await composer.fill(
    "The compaction completed. Reply exactly COMPACTION_RECOVERY. Do not use tools or delegate.",
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__compactionEvidence.filter(
        (event) => event.method === "turn/completed",
      ).length === 2,
    undefined,
    { timeout: 180000 },
  );
  await page.getByText("COMPACTION_RECOVERY", { exact: true }).waitFor();
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
    await page.screenshot({ path: join(directory, `compaction-recovery-${width}.png`) });
  }
  Object.assign(result, {
    passed: true,
    modelTurns: 2,
    compacted: true,
    threadCompactedNotification: Boolean(compacted),
    sameThreadRecovery: true,
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
      await page.evaluate(() => window.__compactionEvidence ?? []).catch(() => []),
      null,
      2,
    ),
  );
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
