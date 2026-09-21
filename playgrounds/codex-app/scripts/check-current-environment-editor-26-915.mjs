import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-environment-editor-26-915-"),
);

const scenes = [
  {
    frame: "workspace-environment-editor-current-26-915-error",
    id: "current-environment-editor-26-915-wide",
    scenario: "workspace-workflow",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-environment-editor-current-26-915-error",
    id: "current-environment-editor-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".codex-ui-environment-editor");
    const bounds = root?.getBoundingClientRect();
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      root: bounds
        ? { height: bounds.height, left: bounds.left, top: bounds.top, width: bounds.width }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      tabs: root ? Array.from(root.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent?.trim()) : [],
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertContract(contract, scene, status, frame = scene.frame) {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.deepEqual(contract.tabs, ["Setup", "Cleanup", "Actions"]);
  assert.ok(contract.root && contract.root.width > 350 && contract.root.height > 300);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.getByRole("region", { name: "Environment", exact: true }).waitFor();
    const initial = await readContract(page);
    assertContract(initial, scene, "error");
    assert.match(initial.alert ?? "", /Environment service failed to save this configuration/);
    const initialScreenshot = await page.screenshot();

    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await page.locator('.codex-ui-environment-editor[data-status="ready"]').waitFor();
    const retry = await readContract(page);
    assertContract(retry, scene, "ready");
    const retryScreenshot = await page.screenshot();

    await page.getByRole("tab", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Add action", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator('.codex-ui-environment-editor[data-status="saved"]').waitFor();
    const saved = await readContract(page);
    assertContract(saved, scene, "saved", "workspace-environment-editor-actions");
    const savedScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, retry, saved }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: { initialScreenshot, retryScreenshot, savedScreenshot },
    };
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
    `${name}: current 26.915 environment editor replay drifted`,
  );
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of ["initial", "retry", "saved"]) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[`${state}Screenshot`],
      second.screenshots[`${state}Screenshot`],
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled environment editor failure → Retry → Save",
    scenes: scenes.map(({ id }) => id),
  }),
);
