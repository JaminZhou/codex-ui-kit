import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-help-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-help-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "help-menu-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-help-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "help-menu-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-help-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "help-menu-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-help-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "help-menu-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await page.evaluate(() => {
      const root = document.querySelector(".demo-root");
      const sidebar = document.querySelector(".codex-ui-app-sidebar");
      const bounds = sidebar?.getBoundingClientRect();
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute("data-current-sidebar-help-26-915"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: bounds ? { height: bounds.height, width: bounds.width } : null,
      };
    });
    assert.deepEqual(shell, {
      frame: "sidebar-current",
      marker: "true",
      sidebarState: "help-menu-current-26-915",
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 321.875 },
    });

    const menu = page.getByRole("menu", { name: "Help menu" });
    const trigger = page.getByRole("button", {
      exact: true,
      name: "Open help menu",
    });
    await menu.waitFor({ state: "visible" });
    const contract = await menu.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        focusRole: document.activeElement?.getAttribute("role"),
        heading: element.querySelector(
          ".demo-current-sidebar-help-menu__heading",
        )?.textContent,
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        itemCount: element.querySelectorAll('[role="menuitem"]').length,
        labels: Array.from(
          element.querySelectorAll('[role="menuitem"]'),
          (item) => item.textContent?.trim(),
        ),
        rect: { height: bounds.height, left: bounds.left, top: bounds.top, width: bounds.width },
        separatorCount: element.querySelectorAll('[role="separator"]').length,
      };
    });
    assert.equal(contract.focusRole, "menuitem");
    assert.equal(contract.heading, "What's new");
    assert.equal(contract.itemCount, 8);
    assert.equal(contract.separatorCount, 1);
    assert.deepEqual(contract.icons, [
      "sidebar-help-menu-release-note",
      "sidebar-help-menu-release-note",
      "sidebar-help-menu-release-note",
      "sidebar-help-menu-changelog",
      "sidebar-help-menu-changelog-external",
      "sidebar-help-menu-chrome",
      "sidebar-help-menu-remote",
      "sidebar-help-menu-keyboard",
      "sidebar-help-menu-support",
    ]);
    assert(Math.abs(contract.rect.width - 320) <= 1);
    assert(Math.abs(contract.rect.height - 272.06) <= 1);
    assert(contract.rect.left >= 0);
    assert(contract.rect.top >= 0);
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Open help menu",
    );
    assert.equal(
      await trigger.evaluate((element) => document.activeElement === element),
      true,
    );
    await trigger.click();
    await menu.waitFor({ state: "visible" });
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ shell, contract }, null, 2)}\n`,
    );
    return { app, screenshot: await page.screenshot() };
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
      `${scene.id}: own-fixture pixel drift`,
    );
    await second.app.close();
  } catch (error) {
    await second.app.close();
    throw error;
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift across 1180/720 and dark/light",
    replayEvidence: "current 26.915 sidebar help menu lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
