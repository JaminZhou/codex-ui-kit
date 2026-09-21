import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-hooks-26-915-"),
);

const scenes = [
  {
    frame: "workspace-hooks-settings-current-26-915-error",
    id: "current-hooks-26-915-error-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "workspace-hooks-settings-current-26-915-error",
    id: "current-hooks-26-915-error-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "workspace-hooks-settings-current-26-915-loading",
    id: "current-hooks-26-915-loading-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".codex-ui-hooks-settings"));
    const root =
      roots
        .map((element) => ({
          element,
          visibleArea: (() => {
            const rect = element.getBoundingClientRect();
            const width = Math.max(
              0,
              Math.min(innerWidth, rect.right) - Math.max(0, rect.left),
            );
            const height = Math.max(
              0,
              Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top),
            );
            return width * height;
          })(),
        }))
        .sort((left, right) => right.visibleArea - left.visibleArea)[0]
        ?.element ?? roots[0];
    const bounds = root?.getBoundingClientRect();
    return {
      alert: root?.querySelector('[role="alert"]')?.textContent?.trim() ?? null,
      busy: root?.getAttribute("aria-busy") ?? null,
      empty: root?.querySelector(".codex-ui-hooks-settings__empty")?.textContent?.trim() ?? null,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      loading: root?.querySelector(".codex-ui-hooks-settings__loading")?.textContent?.trim() ?? null,
      refreshing: root?.getAttribute("data-refreshing") ?? null,
      root: bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null,
      status: root?.getAttribute("data-status") ?? null,
      viewport: { height: innerHeight, width: innerWidth },
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

function assertContract(contract, scene, status) {
  assert.deepEqual(contract.viewport, scene.windowSize);
  assert.equal(contract.frame, scene.frame);
  assert.equal(contract.status, status);
  assert.equal(contract.overflow, 0);
  assert.ok(contract.root && contract.root.width > 300 && contract.root.height > 120);
}

async function settleFonts(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const settings = page.locator(".codex-ui-hooks-settings");
    await settings.waitFor({ state: "attached" });
    const initial = await readContract(page);
    assertContract(initial, scene, scene.frame.endsWith("-loading") ? "loading" : "error");
    await settleFonts(page);
    const initialScreenshot = await page.screenshot();

    if (scene.frame.endsWith("-loading")) {
      assert.equal(initial.busy, "true");
      assert.match(initial.loading ?? "", /Loading hooks/);
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ initial }, null, 2)}\n`,
      );
      return { app, screenshots: { initialScreenshot } };
    }

    assert.match(initial.alert ?? "", /Could not load hooks/);
    await settings
      .getByRole("button", { name: "Retry", exact: true })
      .evaluate((button) => button.click());
    await page.waitForFunction(
      () => document.querySelector(".codex-ui-hooks-settings")?.dataset.refreshing === "true",
    );
    const refreshing = await readContract(page);
    assertContract(refreshing, scene, "error");
    assert.equal(refreshing.busy, "true");
    assert.equal(refreshing.refreshing, "true");
    const refreshingScreenshot = await page.screenshot();

    await page
      .locator('.codex-ui-hooks-settings[data-status="ready"]')
      .waitFor({ state: "attached" });
    await page.waitForFunction(
      () => document.querySelector(".codex-ui-hooks-settings")?.dataset.refreshing !== "true",
    );
    const ready = await readContract(page);
    assertContract(ready, scene, "ready");
    assert.equal(ready.empty, "No hooks foundConfigured hooks will appear here");
    const readyScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, refreshing, ready }, null, 2)}\n`,
    );
    return {
      app,
      screenshots: { initialScreenshot, refreshingScreenshot, readyScreenshot },
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
    `${name}: current 26.915 Hooks replay drifted`,
  );
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  await second.app.close();
  for (const state of Object.keys(first.screenshots)) {
    assertRepeatPixel(
      `${scene.id} ${state}`,
      first.screenshots[state],
      second.screenshots[state],
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Hooks error → Retry → refreshing → empty and loading",
    scenes: scenes.map(({ id }) => id),
  }),
);
