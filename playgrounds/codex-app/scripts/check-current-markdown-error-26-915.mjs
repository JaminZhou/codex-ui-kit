import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-markdown-error-26-915-"),
);

// This is the public renderer-boundary fixture used by the Markdown error
// contract. The 26.915 wrapper records current-route coverage only; it is
// replay evidence and must not be read as an installed-product capture.
const scenes = [
  {
    frame: "markdown-current-26-825-error",
    id: "current-markdown-error-26-915-wide",
    scenario: "markdown-current-26-825-error",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    frame: "markdown-current-26-825-error",
    id: "current-markdown-error-26-915-compact",
    scenario: "markdown-current-26-825-error",
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

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const state = await page.evaluate(() => {
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
      const root = document.querySelector(".demo-root");
      const message = document.querySelector(
        '[data-item-id="assistant-markdown-current-26-825"]',
      );
      const error = message?.querySelector(".codex-ui-markdown__render-error");
      return {
        alert: error?.textContent?.trim() ?? null,
        buttonCount: error?.querySelectorAll("button").length ?? 0,
        composer: bounds(document.querySelector(".codex-ui-composer")),
        frame: root?.getAttribute("data-frame"),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        message: bounds(message),
        viewport: { height: innerHeight, width: innerWidth },
      };
    });

    assert.equal(state.frame, scene.frame);
    assert.match(state.alert ?? "", /Markdown couldn't render/);
    assert.equal(state.buttonCount, 1);
    assert.equal(state.horizontalOverflow, 0);
    assert.equal(state.viewport.width, scene.windowSize.width);
    assert.equal(state.viewport.height, scene.windowSize.height);
    assert.ok(state.message);
    assert.ok(state.composer);
    assert.equal(
      await page
        .locator('[data-item-id="assistant-markdown-current-26-825"]')
        .getByRole("button", { name: "Try again", exact: true })
        .count(),
      1,
    );

    await settleFonts(page);
    const errorScreenshot = await page.screenshot();
    const retry = page.getByRole("button", { name: "Try again", exact: true });
    await retry.focus();
    assert.equal(
      await retry.evaluate((element) => document.activeElement === element),
      true,
    );
    await retry.click();
    await page.locator(".codex-ui-markdown__render-error").waitFor({
      state: "detached",
    });
    await page.waitForSelector(
      '[data-item-id="assistant-markdown-current-26-825"] [data-markdown-table]',
    );
    await settleFonts(page);
    const recoveredState = await page.evaluate(() => ({
      tableCount: document.querySelectorAll(
        '[data-item-id="assistant-markdown-current-26-825"] [data-markdown-table]',
      ).length,
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    assert.equal(recoveredState.tableCount, 1);
    assert.equal(recoveredState.overflow, 0);
    const retryScreenshot = await page.screenshot();

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ recoveredState, state }, null, 2)}\n`,
    );
    return { errorScreenshot, retryScreenshot };
  } finally {
    await app.close();
  }
}

for (const scene of scenes) {
  const first = await capture(scene);
  const second = await capture(scene);
  for (const [label, firstScreenshot, secondScreenshot] of [
    ["error", first.errorScreenshot, second.errorScreenshot],
    ["retry", first.retryScreenshot, second.retryScreenshot],
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
      `${scene.id} ${label}: current 26.915 Markdown error replay drifted`,
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720 for error and retry",
    replayBaseline: "current-26.825-public-markdown-error",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    scenes: scenes.map(({ id }) => id),
  }),
);
