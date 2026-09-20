import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sources-26-915-"),
);

const scenes = [
  {
    frame: "sources-current-26-915-error",
    id: "sources-current-26-915-error-wide",
    scenario: "current-citations-26-825",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "sources-current-26-915-empty",
    id: "sources-current-26-915-empty-compact",
    scenario: "current-citations-26-825",
    sidebarState: "hidden",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "sources-current-26-915-loading",
    id: "sources-current-26-915-loading-wide",
    scenario: "current-citations-26-825",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
];

async function readState(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const panel = document.querySelector('[data-testid="current-citations-sources"]');
    const sourceList = document.querySelector(".codex-ui-source-list");
    const bounds = (element) => {
      if (!(element instanceof Element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    return {
      activeLabel: document.activeElement?.getAttribute("aria-label") ?? null,
      frame: root?.getAttribute("data-frame"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panel: bounds(panel),
      sourceList: sourceList
        ? {
            bounds: bounds(sourceList),
            status: sourceList.getAttribute("data-status"),
            items: sourceList.querySelectorAll(".codex-ui-source-list__items > li").length,
          }
        : null,
      status: root?.getAttribute("data-current-sources-status"),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.waitForSelector('[data-testid="current-sources-lifecycle"]', {
      state: "attached",
    });
    const initial = await readState(page);
    assert.equal(initial.frame, scene.frame);
    assert.equal(initial.status, scene.frame.endsWith("-error") ? "error" : scene.frame.endsWith("-empty") ? "empty" : "loading");
    assert.equal(initial.sourceList?.status, initial.status);
    assert.equal(initial.horizontalOverflow, 0);
    assert.ok(initial.panel && initial.sourceList?.bounds);

    if (scene.frame.endsWith("-error")) {
      assert.equal(initial.sourceList.items, 0);
      await page.getByRole("button", { name: "Try again" }).click();
      await page.waitForFunction(
        () => document.querySelector(".codex-ui-source-list")?.getAttribute("data-status") === "ready",
      );
      const recovered = await readState(page);
      assert.equal(recovered.status, "ready");
      assert.equal(recovered.sourceList?.items, 2);
      await page.getByRole("button", { name: "View all sources" }).click();
      assert.equal((await readState(page)).sourceList?.items, 4);
    } else if (scene.frame.endsWith("-empty")) {
      assert.equal(initial.sourceList.items, 0);
      assert.equal(await page.locator('.codex-ui-source-list [role="status"]').count(), 1);
    } else {
      assert.equal(initial.sourceList.items, 0);
      assert.equal(await page.locator('.codex-ui-source-list [role="status"]').count(), 1);
    }

    const screenshot = await page.screenshot();
    await writeFile(join(artifactDirectory, `${scene.id}.json`), `${JSON.stringify(await readState(page), null, 2)}\n`);
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  try {
    const second = await capture(scene);
    try {
      const firstImage = PNG.sync.read(first.screenshot);
      const secondImage = PNG.sync.read(second.screenshot);
      assert.equal(firstImage.width, secondImage.width);
      assert.equal(firstImage.height, secondImage.height);
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
        `${scene.id}: own-fixture pixel drift`,
      );
    } finally {
      await second.app.close();
    }
  } finally {
    await first.app.close();
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 controlled Sources lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
