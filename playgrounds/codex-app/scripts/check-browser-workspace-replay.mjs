import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-browser-workspace-replay-"));

function sceneFor(width) {
  return {
    frame: "browser-workspace-legacy-shell",
    id: `browser-workspace-legacy-shell-${width}`,
    layoutMode: width === 720 ? "narrow" : undefined,
    scenario: "conversation-lifecycle",
    sidebarState: width === 720 ? "hidden" : undefined,
    theme: "dark",
    windowSize: { height: 820, width },
  };
}

async function capture(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  try {
    const root = page.locator(".demo-root");
    const panel = page.getByTestId("current-browser-workspace");
    const tabs = panel.getByRole("tab");
    await root.waitFor();
    if (!(await panel.isVisible())) {
      const state = await page.evaluate(() => {
        const shell = document.querySelector(".codex-ui-app-shell");
        const sidePanel = document.querySelector(
          ".codex-ui-app-shell__side-panel",
        );
        return {
          shellLayout: shell?.getAttribute("data-layout-mode"),
          shellPanelOpen: shell?.getAttribute("data-side-panel-open"),
          sidePanelAriaHidden: sidePanel?.getAttribute("aria-hidden"),
        };
      });
      throw new Error(`${width}px Browser panel was hidden: ${JSON.stringify(state)}`);
    }
    assert.equal(await tabs.count(), 1);
    assert.equal(await tabs.first().getAttribute("aria-selected"), "true");
    assert.equal(
      await panel.locator("[data-source-owned]").getAttribute("data-source-owned"),
      "external-web-content",
    );
    const layout = await page.evaluate(() => {
      const bounds = (element) => {
        if (!(element instanceof Element)) return null;
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      const rootElement = document.querySelector(".demo-root");
      const panelElement = document.querySelector("[data-testid='current-browser-workspace']");
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panel: bounds(panelElement),
        root: bounds(rootElement),
      };
    });
    assert.equal(layout.overflow, 0);
    assert.ok(layout.panel && layout.root);
    assert.ok(
      layout.panel.left >= layout.root.left &&
        layout.panel.right <= layout.root.right &&
        layout.panel.top >= layout.root.top &&
        layout.panel.bottom <= layout.root.bottom,
      `${width}px Browser panel must remain visible: ${JSON.stringify(layout)}`,
    );
    const screenshot = await page.screenshot();
    await writeFile(join(directory, `browser-workspace-${width}-${suffix}.png`), screenshot);
    return { app, page, panel, root, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await capture(width, "first");
  try {
    await first.panel.getByRole("button", { name: "New tab" }).click();
    assert.equal(await first.root.getAttribute("data-browser-workspace-action"), "new-tab");
    assert.equal(await first.panel.getByRole("tab").count(), 2);
    const documentation = first.panel.getByRole("tab", {
      name: "OpenAI developer documentation",
      exact: true,
    });
    assert.equal(await documentation.getAttribute("aria-selected"), "true");
    assert.equal(
      await first.root.getAttribute("data-browser-workspace-tab"),
      "documentation-2",
    );
    await first.panel.getByRole("button", { name: "Back" }).click();
    assert.equal(await first.root.getAttribute("data-browser-workspace-action"), "back");
    await first.panel
      .locator(".codex-ui-browser-workspace__tab-close")
      .nth(1)
      .click();
    assert.equal(await first.panel.getByRole("tab").count(), 1);
    assert.equal(
      await first.root.getAttribute("data-browser-workspace-tab"),
      "codex-page",
    );
    await first.panel
      .locator(".codex-ui-browser-workspace__tab-close")
      .first()
      .click();
    assert.equal(await first.root.getAttribute("data-browser-workspace-action"), "close:codex-page");
    await first.panel.waitFor({ state: "hidden" });
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
      `${width}px own-fixture Browser shell pixel gate drifted`,
    );
  } finally {
    await second.app.close();
  }
}

console.log(JSON.stringify({
  directory,
  passed: true,
  pixelGate: "0% own-fixture drift at 1180 and 720",
  widths: [1180, 720],
}));
