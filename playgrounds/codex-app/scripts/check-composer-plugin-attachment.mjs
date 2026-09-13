import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-composer-plugin-attachment-"));
const attachmentId = "current-plugin-github-triage-26-908";

function sceneFor(width, frame) {
  const compact = width === 720;
  return {
    frame,
    id: `${frame}-${width}`,
    scenario: "workspace-workflow",
    sidebarState: compact ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function assertSelected(page, width) {
  const root = page.locator(".demo-root");
  const composer = page.locator(".codex-ui-composer");
  const attachment = page.locator(
    `[data-composer-attachment-id="${attachmentId}"]`,
  );
  await attachment.waitFor();
  assert.equal(
    await root.getAttribute("data-frame"),
    "workspace-composer-current-26-908-plugin-selected",
  );
  assert.equal(
    await root.getAttribute("data-current-composer-controls-26-908"),
    "true",
  );
  assert.equal(await attachment.getAttribute("data-kind"), "file");
  assert.equal(await attachment.getAttribute("data-layout"), "card");
  assert.equal(await attachment.getAttribute("data-status"), "ready");
  assert.equal(
    await attachment
      .locator(".codex-ui-composer-attachment__label")
      .textContent(),
    "GitHub Triage",
  );
  assert.equal(
    await attachment
      .locator(".codex-ui-composer-attachment__meta")
      .textContent(),
    "Plugin",
  );
  assert.equal(
    await composer.getByRole("group", { name: "Attachments" }).count(),
    1,
  );
  assert.equal(
    await page.locator('[data-action="submit"]').isDisabled(),
    true,
  );
  const geometry = await page.evaluate((id) => {
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
    const rootElement = document.querySelector(".demo-root");
    const composerElement = document.querySelector(".codex-ui-composer");
    const attachmentElement = document.querySelector(
      `[data-composer-attachment-id="${id}"]`,
    );
    return {
      attachment: bounds(attachmentElement),
      composer: bounds(composerElement),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      root: bounds(rootElement),
    };
  }, attachmentId);
  assert.equal(
    geometry.overflow,
    0,
    `${width}px plugin attachment overflowed the route`,
  );
  assert.ok(geometry.attachment && geometry.composer && geometry.root);
  assert.ok(
    geometry.attachment.left >= geometry.composer.left &&
      geometry.attachment.right <= geometry.composer.right &&
      geometry.attachment.top >= geometry.composer.top &&
      geometry.attachment.bottom <= geometry.composer.bottom,
    `${width}px plugin attachment escaped its Composer: ${JSON.stringify(geometry)}`,
  );
}

async function captureSelected(width, suffix) {
  const { app, page } = await launchScene(
    sceneFor(width, "workspace-composer-current-26-908-plugin-selected"),
    { capture: false },
  );
  try {
    await assertSelected(page, width);
    const screenshot = await page.screenshot();
    await writeFile(
      join(directory, `composer-plugin-attachment-${width}-${suffix}.png`),
      screenshot,
    );
    return { app, page, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await captureSelected(width, "first");
  try {
    const remove = first.page.getByRole("button", {
      name: "Remove GitHub Triage",
    });
    await remove.focus();
    assert.equal(
      await remove.evaluate((element) => document.activeElement === element),
      true,
    );
    await remove.click();
    await first.page.waitForFunction(
      () =>
        !document.querySelector(
          '[data-composer-attachment-id="current-plugin-github-triage-26-908"]',
        ),
    );
    assert.equal(
      await first.page.locator(".demo-root").getAttribute("data-frame"),
      "workspace-composer-current-26-908-ready",
    );
    assert.equal(
      await first.page.locator("textarea[aria-label='Do anything']").evaluate(
        (element) => document.activeElement === element,
      ),
      true,
    );
  } finally {
    await first.app.close();
  }

  const second = await captureSelected(width, "second");
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
      `${width}px own-fixture plugin attachment pixel gate drifted`,
    );
  } finally {
    await second.app.close();
  }
}

for (const width of [1180, 720]) {
  const { app, page } = await launchScene(
    sceneFor(width, "workspace-composer-current-26-908-resources"),
    { capture: false },
  );
  try {
    await page.getByRole("option", { name: /GitHub Triage/ }).click();
    await assertSelected(page, width);
    assert.equal(
      await page.locator('[data-composer-overlay="resources"]').count(),
      0,
    );
  } finally {
    await app.close();
  }
}

console.log(
  JSON.stringify({
    directory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.908.40834",
    widths: [1180, 720],
  }),
);
