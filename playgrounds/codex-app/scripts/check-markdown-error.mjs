import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-markdown-error-"));

function sceneFor(width) {
  const compact = width === 720;
  return {
    frame: "markdown-current-26-825-error",
    id: `markdown-current-26-825-error-${width}`,
    scenario: "markdown-current-26-825-error",
    sidebarState: compact ? "compact-collapsed" : undefined,
    theme: "dark",
    view: "conversation",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function captureError(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const message = page.locator(
      '[data-item-id="assistant-markdown-current-26-825"]',
    );
    const error = message.locator(".codex-ui-markdown__render-error");
    await error.waitFor();
    assert.equal(await root.getAttribute("data-frame"), "markdown-current-26-825-error");
    assert.equal(await error.getAttribute("role"), "alert");
    assert.equal(
      await error.locator(".codex-ui-markdown__render-error-title").textContent(),
      "Markdown couldn't render",
    );
    const retry = error.getByRole("button", { name: "Try again" });
    assert.equal(await retry.count(), 1);
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `markdown-error-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await captureError(width, "first");
  try {
    const retry = first.page.getByRole("button", { name: "Try again" });
    await retry.focus();
    assert.equal(
      await retry.evaluate((element) => document.activeElement === element),
      true,
    );
    await retry.click();
    await first.page.locator(".codex-ui-markdown__render-error").waitFor({
      state: "detached",
    });
    assert.equal(
      await first.page.locator('[data-item-id="assistant-markdown-current-26-825"] [data-markdown-table]').count(),
      1,
    );
  } finally {
    await first.app.close();
  }

  const second = await captureError(width, "second");
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
      `${width}px own-fixture Markdown error pixel gate drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(
  JSON.stringify({
    directory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.825.51511 replay contract",
    widths: [1180, 720],
  }),
);
