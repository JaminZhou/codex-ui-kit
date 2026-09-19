import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-document-media-26-915-"),
);

const scenes = [
  {
    expectedKind: "document",
    frame: "workspace-current-26-915-doc-preview-ready",
    id: "workspace-current-26-915-doc-preview-ready",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    expectedKind: "document",
    frame: "workspace-current-26-915-doc-preview-ready",
    id: "workspace-current-26-915-doc-preview-ready-compact",
    scenario: "workspace-workflow",
    sidebarState: "hidden",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    expectedKind: "image",
    frame: "workspace-current-26-915-image-preview-ready",
    id: "workspace-current-26-915-image-preview-ready",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    expectedKind: "image",
    frame: "workspace-current-26-915-image-preview-ready",
    id: "workspace-current-26-915-image-preview-ready-compact",
    scenario: "workspace-workflow",
    sidebarState: "hidden",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await page.evaluate(() => {
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
      const panel = document.querySelector(
        '[data-testid="document-preview-panel"]',
      );
      return {
        aside: bounds(document.querySelector(".codex-ui-app-shell__sidebar")),
        frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
        kind: panel?.getAttribute("data-kind"),
        main: bounds(document.querySelector(".codex-ui-app-shell__main")),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        panel: bounds(panel),
      };
    });
    assert.equal(contract.frame, scene.frame);
    assert.equal(contract.kind, scene.expectedKind);
    assert.equal(contract.overflow, 0);
    assert.ok(contract.aside && contract.main && contract.panel);
    if (scene.windowSize.width === 1180) {
      assert.ok(Math.abs(contract.aside.width - 321.875) <= 1);
      assert.ok(Math.abs(contract.main.left - 321.875) <= 1);
      assert.ok(contract.panel.width >= 500);
    } else {
      assert.ok(contract.aside.left <= -320);
      assert.equal(contract.main.left, 0);
      assert.ok(contract.panel.width >= 300);
    }
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    return { app, page, screenshot: await page.screenshot() };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  await first.app.close();
  const second = await capture(scene);
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
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
      `${scene.id}: current 26.911 document/media replay drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.915.31945",
    scenes: scenes.map(({ id }) => id),
  }),
);
