import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-plugin-attachment-26-915-"),
);

// This candidate wrapper deliberately reuses the public 26.908 plugin-card
// fixture. The installed 26.915 product currently inserts an inline mention;
// this gate does not promote the replay-only card to installed-product parity.
const selectedFrame = "workspace-composer-current-26-908-plugin-selected";
const resourcesFrame = "workspace-composer-current-26-908-resources";
const attachmentId = "current-plugin-github-triage-26-908";

function sceneFor(width, frame) {
  const compact = width === 720;
  return {
    frame,
    id: `current-plugin-attachment-26-915-${frame}-${width}`,
    scenario: "workspace-workflow",
    sidebarState: compact ? "hidden" : undefined,
    theme: "dark",
    view: "workspace",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function readGeometry(page) {
  return page.evaluate((id) => {
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
      attachment: bounds(
        document.querySelector(`[data-composer-attachment-id="${id}"]`),
      ),
      composer: bounds(document.querySelector(".codex-ui-composer")),
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, attachmentId);
}

async function assertSelected(page, width) {
  const root = page.locator(".demo-root");
  const composer = page.locator(".codex-ui-composer");
  const attachment = page.locator(
    `[data-composer-attachment-id="${attachmentId}"]`,
  );
  await attachment.waitFor();
  assert.equal(await root.getAttribute("data-frame"), selectedFrame);
  assert.equal(
    await root.getAttribute("data-current-composer-controls-26-908"),
    "true",
  );
  assert.equal(await attachment.getAttribute("data-kind"), "file");
  assert.equal(await attachment.getAttribute("data-layout"), "card");
  assert.equal(await attachment.getAttribute("data-status"), "ready");
  assert.equal(
    await attachment.locator(".codex-ui-composer-attachment__label").textContent(),
    "GitHub Triage",
  );
  assert.equal(
    await attachment.locator(".codex-ui-composer-attachment__meta").textContent(),
    "Plugin",
  );
  assert.equal(await composer.getByRole("group", { name: "Attachments" }).count(), 1);
  assert.equal(await page.locator('[data-action="submit"]').isDisabled(), true);
  const geometry = await readGeometry(page);
  assert.equal(geometry.overflow, 0, `${width}px plugin attachment overflowed`);
  assert.ok(geometry.attachment && geometry.composer);
  assert.ok(
    geometry.attachment.left >= geometry.composer.left &&
      geometry.attachment.right <= geometry.composer.right &&
      geometry.attachment.top >= geometry.composer.top &&
      geometry.attachment.bottom <= geometry.composer.bottom,
    `${width}px plugin attachment escaped Composer: ${JSON.stringify(geometry)}`,
  );
}

async function captureSelected(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width, selectedFrame), {
    capture: false,
  });
  try {
    await assertSelected(page, width);
    const screenshot = await page.screenshot();
    await writeFile(
      join(artifactDirectory, `current-plugin-attachment-${width}-${suffix}.png`),
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
      (id) => !document.querySelector(`[data-composer-attachment-id="${id}"]`),
      attachmentId,
    );
    assert.equal(
      await first.page.locator(".demo-root").getAttribute("data-frame"),
      "workspace-composer-current-26-908-ready",
    );
    assert.equal(
      await first.page.locator('textarea[aria-label="Do anything"]').evaluate(
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
      `${width}px current 26.915 plugin attachment replay drifted`,
    );
  } finally {
    await second.app.close();
  }

  const { app, page } = await launchScene(sceneFor(width, resourcesFrame), {
    capture: false,
  });
  try {
    await page.getByRole("option", { name: /GitHub Triage/ }).click();
    await assertSelected(page, width);
    assert.equal(await page.locator('[data-composer-overlay="resources"]').count(), 0);
  } finally {
    await app.close();
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    replayBaseline: "current-26.908.70816 public plugin-card fixture",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    installedProductBoundary: "26.915 inline mention remains separate from plugin-card replay",
    widths: [1180, 720],
  }),
);
