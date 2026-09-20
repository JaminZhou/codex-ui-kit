import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-project-actions-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-actions-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "project-actions-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-actions-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "project-actions-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-actions-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "project-actions-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-actions-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "project-actions-current-26-915",
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
        marker: root?.getAttribute("data-current-sidebar-project-actions-26-915"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: bounds
          ? { height: bounds.height, width: bounds.width }
          : null,
      };
    });
    assert.deepEqual(shell, {
      frame: "sidebar-current",
      marker: "true",
      sidebarState: scene.sidebarState,
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 321.875 },
    });

    const trigger = page.getByRole("button", {
      exact: true,
      name: "Project actions for codex-ui-kit",
    });
    await trigger.click();
    const menu = page.getByRole("menu", {
      exact: true,
      name: "codex-ui-kit project menu",
    });
    await menu.waitFor({ state: "visible" });
    const projectMenu = await menu.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        focusRole: document.activeElement?.getAttribute("role"),
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        labels: Array.from(
          element.querySelectorAll('[role="menuitem"]'),
          (item) =>
            item.querySelector(".codex-ui-menu-item__copy")?.textContent?.trim() ??
            item.textContent?.trim(),
        ),
        rect: { height: bounds.height, width: bounds.width },
        separators: element.querySelectorAll('[role="separator"]').length,
      };
    });
    assert.deepEqual(projectMenu.labels, [
      "Unpin",
      "Edit",
      "Section",
      "Create permanent worktree",
      "Mark all as read",
      "Archive chats",
      "Remove project",
    ]);
    assert.deepEqual(projectMenu.icons, [
      "sidebar-project-menu-unpin",
      "sidebar-project-menu-edit",
      "sidebar-project-menu-section",
      "sidebar-project-menu-worktree",
      "sidebar-project-menu-mark-read",
      "sidebar-project-menu-archive",
      "sidebar-project-menu-remove",
    ]);
    assert.deepEqual(projectMenu.rect, { height: 212, width: 252 });
    assert.equal(projectMenu.separators, 3);
    assert.equal(projectMenu.focusRole, "menuitem");

    await menu.getByRole("menuitem", { name: "Section", exact: true }).hover();
    const submenu = page.getByRole("menu", { name: "Section" });
    await submenu.waitFor({ state: "visible" });
    assert.deepEqual(
      await submenu.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          icons: Array.from(
            element.querySelectorAll("[data-current-build-icon]"),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          item: element.querySelector('[role="menuitem"]')?.textContent?.trim(),
          rect: { height: bounds.height, width: bounds.width },
        };
      }),
      { icons: [], item: "New section…", rect: { height: 34, width: 118 } },
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await trigger.focus();
    assert.equal(
      await trigger.evaluate((element) => document.activeElement === element),
      true,
    );

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ shell, projectMenu }, null, 2)}\n`,
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
    replayEvidence: "current 26.915 sidebar project actions menu",
    scenes: scenes.map(({ id }) => id),
  }),
);
