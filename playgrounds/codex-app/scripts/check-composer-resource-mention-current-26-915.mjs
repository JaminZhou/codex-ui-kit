import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const frame = "workspace-composer-current-26-915-github-mentioned";
const directory = await mkdtemp(
  join(tmpdir(), "ui-kit-composer-resource-mention-26-915-"),
);

function sceneFor(width) {
  return {
    frame,
    id: `${frame}-${width}`,
    scenario: "workspace-workflow",
    sidebarState: width === 720 ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: width === 720 ? 680 : 820, width },
  };
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const composer = page.locator('[data-resource-mention="GitHub"]');
    const editor = composer.locator(
      ".demo-current-resource-mention-composer__textbox",
    );
    await composer.waitFor();
    assert.equal(await root.getAttribute("data-frame"), frame);
    assert.equal(
      await root.getAttribute("data-current-composer-controls-26-915"),
      "true",
    );
    assert.equal(await composer.getAttribute("data-resource-mention"), "GitHub");
    assert.equal(await editor.getAttribute("contenteditable"), "true");
    const geometry = await page.evaluate(() => {
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
        composer: bounds(document.querySelector('[data-resource-mention="GitHub"]')),
        editor: bounds(
          document.querySelector(
            ".demo-current-resource-mention-composer__textbox",
          ),
        ),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        root: bounds(document.querySelector(".demo-root")),
      };
    });
    assert.equal(geometry.overflow, 0, `${width}px mention route overflowed`);
    assert.ok(geometry.composer && geometry.editor && geometry.root);
    assert.ok(
      geometry.editor.left >= geometry.composer.left &&
        geometry.editor.right <= geometry.composer.right &&
        geometry.editor.top >= geometry.composer.top &&
        geometry.editor.bottom <= geometry.composer.bottom,
      `${width}px mention editor escaped Composer: ${JSON.stringify(geometry)}`,
    );

    await page.getByRole("button", { name: "Add files and more" }).click();
    const picker = page.locator(
      '[data-current-resource-catalog="26.915.31945"]',
    );
    await picker.waitFor();
    assert.equal(
      await picker.getByRole("option", { name: /^GitHub/ }).count(),
      1,
    );
    await picker.getByRole("option", { name: /^GitHub/ }).click();
    await page.waitForFunction(
      () =>
        document.activeElement?.classList.contains(
          "demo-current-resource-mention-composer__textbox",
        ),
    );
    assert.equal(await root.getAttribute("data-frame"), frame);
    assert.equal(await page.locator('[role="listbox"]').count(), 0);
    assert.equal(
      await page.locator('[data-resource-mention="GitHub"]').count(),
      1,
    );
    assert.equal(await page.locator(".codex-ui-composer-attachment").count(), 0);

    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `composer-resource-mention-26-915-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  try {
    const second = await capture(width, "second");
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
        `${width}px current 26.915 mention fixture drifted`,
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
    directory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayEvidence: "current 26.915 public GitHub resource mention",
    widths: [1180, 720],
  }),
);
