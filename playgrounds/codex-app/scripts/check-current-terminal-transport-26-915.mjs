import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-terminal-transport-26-915-"),
);

// The public terminal transport fixture is wrapped for the current route only.
// It is replay evidence, not an installed-product transport-drop capture.
const scenes = [
  {
    frame: "terminal-current-26-825-transport-failed",
    id: "current-terminal-transport-26-915-wide",
    scenario: "terminal-lifecycle",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "terminal-current-26-825-transport-failed",
    id: "current-terminal-transport-26-915-compact",
    scenario: "terminal-lifecycle",
    sidebarState: "compact-collapsed",
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
    const panel = document.querySelector('[data-testid="terminal-panel"]');
    const alert = panel?.querySelector('[role="alert"]');
    const root = document.querySelector(".demo-root");
    return {
      alert: alert?.textContent?.trim() ?? null,
      failedTabCount: panel?.querySelectorAll(
        '.codex-ui-terminal-panel__tab-label[data-status="failed"]',
      ).length ?? 0,
      frame: root?.getAttribute("data-frame"),
      inputCount: panel?.querySelectorAll("input, textarea").length ?? 0,
      logCount: panel?.querySelectorAll('[role="log"]').length ?? 0,
      panel: bounds(panel),
      reconnectCount: alert?.querySelectorAll("button").length ?? 0,
      viewport: { height: innerHeight, width: innerWidth },
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.waitForSelector('[data-testid="terminal-panel"] [role="alert"]');
    const failed = await readContract(page, scene);
    assert.equal(failed.frame, scene.frame);
    assert.match(
      failed.alert ?? "",
      /Terminal connection lost.*terminal transport disconnected/i,
    );
    assert.equal(failed.reconnectCount, 1);
    assert.equal(failed.failedTabCount, 1);
    assert.equal(failed.inputCount, 0);
    assert.equal(failed.logCount, 0);
    assert.equal(failed.overflow, 0);
    assert.equal(failed.viewport.width, scene.windowSize.width);
    assert.equal(failed.viewport.height, scene.windowSize.height);
    assert.ok(failed.panel);

    await settleFonts(page);
    const failureScreenshot = await page.screenshot();
    const reconnect = page.getByRole("button", { name: "Reconnect", exact: true });
    await reconnect.focus();
    assert.equal(
      await reconnect.evaluate((element) => document.activeElement === element),
      true,
    );
    await reconnect.click();
    await page.waitForSelector(
      '.demo-root[data-frame="terminal-current-26-825-transport-recovered"]',
    );
    const recovered = await readContract(page, scene);
    assert.equal(recovered.frame, "terminal-current-26-825-transport-recovered");
    assert.equal(recovered.alert, null);
    assert.equal(recovered.inputCount, 1);
    assert.equal(recovered.logCount, 1);
    assert.equal(recovered.overflow, 0);
    await settleFonts(page);
    const recoveredScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ failed, recovered }, null, 2)}\n`,
    );
    return { failureScreenshot, recoveredScreenshot };
  } finally {
    await app.close();
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
  for (const [label, firstScreenshot, secondScreenshot] of [
    ["failure", first.failureScreenshot, second.failureScreenshot],
    ["recovered", first.recoveredScreenshot, second.recoveredScreenshot],
  ]) {
    const firstImage = PNG.sync.read(firstScreenshot);
    const secondImage = PNG.sync.read(secondScreenshot);
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
      `${scene.id} ${label}: current 26.915 terminal transport replay drifted`,
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720 for failure and recovery",
    replayBaseline: "current-26.825-public-terminal-transport",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    scenes: scenes.map(({ id }) => id),
  }),
);
