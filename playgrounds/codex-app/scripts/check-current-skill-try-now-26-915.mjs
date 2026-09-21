import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-skill-try-now-26-915-"),
);

const scenes = [
  {
    frame: "integration-skill-detail-current-26-915-try-now-failure",
    id: "current-skill-try-now-26-915-wide",
    scenario: "workspace-workflow",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "integration-skill-detail-current-26-915-try-now-failure-compact",
    id: "current-skill-try-now-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "conversation",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const toRect = (target) =>
      target
        ? {
            height: target.height,
            left: target.left,
            top: target.top,
            width: target.width,
          }
        : null;
    const root = document.querySelector('[data-testid="current-skill-try-now"]');
    const value = (selector) => root?.querySelector(selector)?.getBoundingClientRect();
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      draft: root ? {
        height: root.getBoundingClientRect().height,
        left: root.getBoundingClientRect().left,
        top: root.getBoundingClientRect().top,
        width: root.getBoundingClientRect().width,
      } : null,
      mention: toRect(value(".codex-ui-skill-prompt-mention")),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      status: root?.getAttribute("data-status"),
      submitted: root?.getAttribute("data-submitted"),
      textbox: toRect(value('[role="textbox"][aria-label="Do anything"]')),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, expectedStatus = "ready") {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.dialogCount, 0);
  assert.equal(contract.status, expectedStatus);
  assert.equal(contract.submitted, "false");
  assert.equal(contract.overflow, 0);
  assert.ok(contract.draft && contract.draft.width > 400 && contract.draft.height >= 84);
  assert.ok(contract.textbox && contract.textbox.width > 350 && contract.textbox.height >= 40);
  assert.ok(contract.mention && contract.mention.width > 80);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const initial = await readContract(page);
    assertContract(initial, scene);
    const initialScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByRole("alert").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="current-skill-try-now"]')?.getAttribute("data-status") ===
        "error",
    );
    const failed = await readContract(page);
    assertContract(failed, scene, "error");
    assert.match(failed.alert ?? "", /Couldn’t run skill/);
    const failedScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="current-skill-try-now"]')?.getAttribute("data-status") ===
          "ready" &&
        !document.querySelector('[data-testid="current-skill-try-now"] [role="alert"]'),
    );
    const retry = await readContract(page);
    assertContract(retry, scene);
    const retryScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, failed, retry }, null, 2)}\n`,
    );
    return { app, screenshots: { initialScreenshot, failedScreenshot, retryScreenshot } };
  } catch (error) {
    await app.close();
    throw error;
  }
}

function assertRepeatPixel(name, first, second) {
  const firstImage = PNG.sync.read(first);
  const secondImage = PNG.sync.read(second);
  assert.equal(secondImage.width, firstImage.width);
  assert.equal(secondImage.height, firstImage.height);
  assert.equal(
    pixelmatch(
      firstImage.data,
      secondImage.data,
      null,
      firstImage.width,
      firstImage.height,
      { threshold: 0 },
    ),
    0,
    `${name}: current 26.915 Try now replay drifted`,
  );
}

const results = [];
for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of ["initial", "failed", "retry"]) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[`${state}Screenshot`],
      second.screenshots[`${state}Screenshot`],
    );
  }
  results.push(scene.id);
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Skill Try now failure → Retry",
    scenes: results,
  }),
);
