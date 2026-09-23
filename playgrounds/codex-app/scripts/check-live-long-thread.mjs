import assert from "node:assert/strict";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in live check: many short no-tool turns in one thread,
// followed by scroll-away/follow convergence at wide and compact widths.
const directory = await realpath(
  await mkdtemp(join(tmpdir(), "ui-kit-live-long-thread-")),
);
const turnCount = 12;
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
      CODEX_UI_KIT_LIVE_MODEL:
        process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-luna",
      CODEX_UI_KIT_LIVE_REASONING_EFFORT:
        process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "max",
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

function marker(index) {
  return `LIVE_LONG_${String(index).padStart(2, "0")}`;
}

async function viewportMetrics() {
  return page.evaluate(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    if (!(viewport instanceof HTMLElement)) return null;
    return {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      latestOrigin: viewport.getAttribute("data-latest-origin"),
      visibleMessages: document.querySelectorAll(
        '.codex-ui-agent-message[data-role="user"], .codex-ui-agent-message[data-role="assistant"]',
      ).length,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__longThreadEvidence = [];
    window.codexDemo.onNotification((event) =>
      window.__longThreadEvidence.push(event),
    );
    window.codexDemo.onLiveSession((event) =>
      window.__longThreadEvidence.push(event),
    );
  });
  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  let threadId = null;
  for (let index = 1; index <= turnCount; index += 1) {
    const expected = marker(index);
    const completedBefore = await page.evaluate(
      () =>
        window.__longThreadEvidence.filter(
          (event) => event.method === "turn/completed",
        ).length,
    );
    await composer.fill(
      `Reply exactly ${expected}. Do not use tools, write files, access network, or delegate. Keep the answer to one line.`,
    );
    await composer.press("Enter");
    await page.waitForFunction(
      (count) =>
        window.__longThreadEvidence.filter(
          (event) => event.method === "turn/completed",
        ).length > count,
      completedBefore,
      { timeout: 180000 },
    );
    const completed = await page.evaluate(
      () =>
        window.__longThreadEvidence
          .filter((event) => event.method === "turn/completed")
          .at(-1),
    );
    assert.equal(completed.params.turn.status, "completed");
    threadId ??= completed.params.threadId;
    assert.equal(completed.params.threadId, threadId);
    await page.getByText(expected, { exact: true }).waitFor();
  }

  const events = await page.evaluate(() => window.__longThreadEvidence);
  const completedTurns = events.filter(
    (event) => event.method === "turn/completed",
  );
  assert.equal(completedTurns.length, turnCount);
  assert.equal(new Set(completedTurns.map((event) => event.params.threadId)).size, 1);
  const bindings = events.filter((event) => event.kind === "live-bind");
  assert.ok(bindings.length >= 1, "A real live thread must be bound");
  assert.equal(
    new Set(bindings.map((event) => event.threadId)).size,
    1,
    "Repeated live bindings must keep the same thread",
  );
  await page.getByText(marker(turnCount), { exact: true }).waitFor();

  const screenshots = [];
  const widths = [1180, 720];
  for (const width of widths) {
    await app.evaluate(
      ({ BrowserWindow }, value) =>
        BrowserWindow.getAllWindows()[0].setContentSize(value, 820),
      width,
    );
    await page.waitForFunction((value) => innerWidth === value, width);
    const latest = await viewportMetrics();
    assert.ok(latest);
    assert.equal(latest.overflow > 0, false);
    assert.ok(
      latest.scrollHeight > latest.clientHeight,
      `${width}px thread must expose a scrollable timeline`,
    );
    await page.screenshot({ path: join(directory, `long-thread-${width}-latest.png`) });
    screenshots.push({ width, latest });

    await page.evaluate(() => {
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      if (viewport instanceof HTMLElement) {
        viewport.scrollTop = 0;
      }
    });
    await page.waitForTimeout(120);
    const away = await viewportMetrics();
    assert.ok(away);
    assert.equal(away.overflow > 0, false);
    assert.ok(
      away.scrollTop < latest.scrollTop - 24,
      `${width}px thread did not scroll away from latest content`,
    );
    await page.screenshot({ path: join(directory, `long-thread-${width}-away.png`) });
    screenshots.at(-1).away = away;

    await page.evaluate(() => {
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      if (viewport instanceof HTMLElement) viewport.scrollTop = viewport.scrollHeight;
    });
    await page.waitForFunction(() => {
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      return (
        viewport instanceof HTMLElement &&
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1
      );
    });
    await page.getByText(marker(turnCount), { exact: true }).waitFor();
  }
  Object.assign(result, {
    passed: true,
    modelTurns: turnCount,
    sameThread: true,
    liveBindCount: bindings.length,
    scrollAwayAndFollow: true,
    widths,
    screenshots,
  });
} catch (error) {
  result.error = String(error);
  result.eventSummary = await page
    .evaluate(() =>
      (window.__longThreadEvidence ?? []).map((event) => ({
        kind: event.kind,
        method: event.method,
        threadId: event.params?.threadId,
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
      await page.evaluate(() => window.__longThreadEvidence ?? []).catch(
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
