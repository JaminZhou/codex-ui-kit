import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-actions-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-actions-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "item-actions-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-actions-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "item-actions-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-actions-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "item-actions-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-actions-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "item-actions-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

async function readShell(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const sidebar = document.querySelector(".codex-ui-app-sidebar");
    const sidebarBounds = sidebar?.getBoundingClientRect();
    return {
      frame: root?.getAttribute("data-frame"),
      marker: root?.getAttribute("data-current-sidebar-item-actions-26-915"),
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: sidebarBounds
        ? { height: sidebarBounds.height, width: sidebarBounds.width }
        : null,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await readShell(page);
    assert.deepEqual(shell, {
      frame: "sidebar-current",
      marker: "true",
      sidebarState: "item-actions-current-26-915",
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 321.875 },
    });

    const projectTrigger = page.getByRole("button", {
      name: "Project actions for codex-ui-kit",
      exact: true,
    });
    await projectTrigger.click();
    const menu = page.getByRole("menu", {
      name: "codex-ui-kit project menu",
      exact: true,
    });
    await menu.waitFor({ state: "visible" });
    const projectMenu = await menu.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        focusRole: document.activeElement?.getAttribute("role"),
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
    assert.deepEqual(projectMenu.rect, { height: 212, width: 252 });
    assert.equal(projectMenu.separators, 3);
    assert.equal(projectMenu.focusRole, "menuitem");

    await menu.getByRole("menuitem", { name: "Section", exact: true }).hover();
    const sectionMenu = page.getByRole("menu", { name: "Section" });
    await sectionMenu.waitFor({ state: "visible" });
    assert.deepEqual(
      await sectionMenu.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          item: element.querySelector('[role="menuitem"]')?.textContent?.trim(),
          rect: { height: bounds.height, width: bounds.width },
        };
      }),
      { item: "New section…", rect: { height: 34, width: 118 } },
    );
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await projectTrigger.focus();
    assert.equal(
      await projectTrigger.evaluate((element) => document.activeElement === element),
      true,
    );

    const taskRow = page
      .getByText("Match current sidebar", { exact: true })
      .locator(
        "xpath=ancestor::*[contains(@class, 'codex-ui-app-sidebar__item-row')]",
      );
    const taskActions = taskRow.locator(
      ".codex-ui-app-sidebar__item-actions button",
    );
    assert.deepEqual(await taskActions.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")).filter(Boolean)), [
      "Pin task codex-ui-kit-1",
      "Archive task codex-ui-kit-1",
    ]);
    const beforeHover = await taskRow.evaluate((row) => ({
      actions: getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-actions")).opacity,
      status: row.querySelector(".codex-ui-app-sidebar__item-status")
        ? getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-status")).opacity
        : null,
    }));
    assert.deepEqual(beforeHover, { actions: "0", status: null });
    await taskRow.hover();
    assert.deepEqual(
      await taskRow.evaluate((row) => ({
        actions: getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-actions")).opacity,
        status: row.querySelector(".codex-ui-app-sidebar__item-status")
          ? getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-status")).opacity
          : null,
      })),
      { actions: "1", status: null },
    );
    await taskActions.first().focus();
    assert.equal(
      await taskRow.evaluate((row) => getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-actions")).opacity),
      "1",
    );
    await page.mouse.move(640, 100);
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
    replayEvidence: "current 26.915 sidebar item-actions lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
