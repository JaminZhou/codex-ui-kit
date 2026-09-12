import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-composer-plugin-connect-"));

function sceneFor(width) {
  return {
    frame: "composer-plugins-menu",
    id: `composer-plugins-menu-${width}`,
    scenario: "conversation-lifecycle",
    theme: "dark",
    windowSize: { height: 820, width },
  };
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const picker = page.getByRole("listbox", { name: "Composer resources" });
    const connect = page.getByRole("button", { name: "Connect plugins", exact: true });
    await picker.waitFor();
    await connect.waitFor();
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.equal(await picker.getAttribute("data-has-footer"), "true");
    assert.ok(await picker.getByText("Available plugins", { exact: true }).count() >= 1);
    const layout = await page.evaluate(() => {
      const bounds = (element) => {
        if (!(element instanceof Element)) return null;
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, height: rect.height, left: rect.left, right: rect.right, top: rect.top, width: rect.width };
      };
      const rootElement = document.querySelector(".demo-root");
      const pickerElement = document.querySelector(".codex-ui-composer-resource-picker");
      const connectElement = Array.from(document.querySelectorAll("button"))
        .find((button) => button.getAttribute("aria-label") === "Connect plugins");
      return {
        connect: bounds(connectElement),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        picker: bounds(pickerElement),
        root: bounds(rootElement),
      };
    });
    assert.equal(layout.overflow, 0);
    assert.ok(layout.picker && layout.connect && layout.root);
    assert.ok(
      layout.connect.left >= layout.root.left &&
        layout.connect.right <= layout.root.right &&
        layout.connect.top >= layout.root.top &&
        layout.connect.bottom <= layout.root.bottom,
      `${width}px Connect plugins must remain visible: ${JSON.stringify(layout)}`,
    );
    const screenshot = await page.screenshot();
    await writeFile(join(directory, `composer-plugins-${width}-${suffix}.png`), screenshot);
    return { app, connect, page, root, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  try {
    await first.connect.click();
    assert.equal(await first.root.getAttribute("data-composer-plugin-action"), "connect");
    assert.equal(await first.root.getAttribute("data-composer-overlay"), null);
    await first.page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Message composer",
    );
  } finally {
    await first.app.close();
  }

  const second = await capture(width, "second");
  try {
    const firstImage = PNG.sync.read(first.screenshot);
    const secondImage = PNG.sync.read(second.screenshot);
    assert.equal(secondImage.width, firstImage.width);
    assert.equal(secondImage.height, firstImage.height);
    assert.equal(
      pixelmatch(firstImage.data, secondImage.data, null, firstImage.width, firstImage.height, { threshold: 0 }),
      0,
      `${width}px own-fixture plugin menu pixel gate drifted`,
    );
  } finally {
    await second.app.close();
  }
}

const selection = await capture(1180, "selection");
try {
  await selection.page.getByRole("option", { name: /Documents/ }).click();
  assert.equal(await selection.root.getAttribute("data-composer-plugin-action"), "select:documents");
  assert.equal(await selection.root.getAttribute("data-composer-overlay"), null);
} finally {
  await selection.app.close();
}

console.log(JSON.stringify({
  directory,
  passed: true,
  pixelGate: "0% own-fixture drift at 1180 and 720",
  widths: [1180, 720],
}));
