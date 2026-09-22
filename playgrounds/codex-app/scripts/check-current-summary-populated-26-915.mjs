import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-summary-populated-26-915-"),
);

// This public context-summary fixture is wrapped for current-route coverage
// only. It is replay evidence, not an installed-product summary capture.
const scenes = [
  {
    frame: "context-summary-populated",
    id: "current-summary-populated-26-915-wide",
    scenario: "context-summary",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "context-summary-populated",
    id: "current-summary-populated-26-915-compact",
    scenario: "context-summary",
    sidebarState: "hidden",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 680, width: 720 },
  },
];

async function settleFonts(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  });
}

async function readContract(page, scene) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
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
      artifactButtonCount: dialog?.querySelectorAll("button").length ?? 0,
      dialog: bounds(dialog),
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      readmeCount: dialog
        ? Array.from(dialog.querySelectorAll("button")).filter(
            (button) => button.textContent?.includes("README.md"),
          ).length
        : 0,
      sourcesText: dialog?.textContent?.match(/3 sources/g)?.length ?? 0,
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const dialog = page.getByRole("dialog", { name: "Thread summary" });
    await dialog.waitFor();
    const initial = await readContract(page, scene);
    assert.equal(initial.frame, scene.frame);
    assert.equal(initial.readmeCount, 1);
    assert.equal(initial.sourcesText, 1);
    assert.equal(initial.overflow, 0);
    assert.equal(initial.viewport.width, scene.windowSize.width);
    assert.equal(initial.viewport.height, scene.windowSize.height);
    assert.ok(initial.dialog);
    assert.ok(initial.dialog.width > 0 && initial.dialog.height > 0);
    assert.equal(await dialog.getByRole("button", { name: "OpenAI Developer Docs" }).count(), 1);
    assert.equal(await dialog.getByRole("button", { name: "GitHub Triage" }).count(), 1);
    assert.equal(await dialog.getByText("Artifact · 2 pages").count(), 1);

    const outputsToggle = dialog.getByRole("button", {
      name: "Toggle outputs summary",
    });
    await outputsToggle.focus();
    assert.equal(
      await outputsToggle.evaluate((element) => document.activeElement === element),
      true,
    );
    await outputsToggle.click();
    assert.equal((await readContract(page, scene)).readmeCount, 0);
    await outputsToggle.click();
    const reopened = await readContract(page, scene);
    assert.equal(reopened.readmeCount, 1);
    assert.equal(reopened.overflow, 0);
    await settleFonts(page);
    const screenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ initial, reopened }, null, 2)}\n`,
    );
    return screenshot;
  } finally {
    await app.close();
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
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
    `${scene.id}: current 26.915 populated summary replay drifted`,
  );
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayBaseline: "current-26.825-public-context-summary",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    scenes: scenes.map(({ id }) => id),
  }),
);
