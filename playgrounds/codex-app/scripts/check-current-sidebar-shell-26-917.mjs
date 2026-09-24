import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-shell-26-917-"),
);

const scenes = [
  { height: 820, id: "wide", width: 1_180 },
  { height: 680, id: "medium", width: 820 },
  { height: 680, id: "threshold", width: 721 },
  { height: 680, id: "compact", width: 720 },
].map(({ height, id, width }) => ({
  currentSidebar: true,
  frame: "sidebar-current",
  id: `current-sidebar-shell-26-917-${id}`,
  scenario: "streaming-recovery",
  sidebarState: "shell-current-26-917",
  theme: "dark",
  ...(width === 720 ? { layoutMode: "narrow" } : {}),
  windowSize: { height, width },
}));

async function capture(scene, { exerciseCompactControls = false } = {}) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await page.evaluate(() => {
      const readRect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const root = document.querySelector(".demo-root");
      const appShell = document.querySelector(".codex-ui-app-shell");
      const sidebar = document.querySelector(".codex-ui-app-sidebar");
      const navigation = sidebar?.querySelector(
        ".codex-ui-app-sidebar__navigation",
      );
      const primary = sidebar?.querySelector(
        ".codex-ui-app-sidebar__primary",
      );
      const scrollStyle = navigation
        ? getComputedStyle(navigation)
        : null;
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute("data-current-sidebar-shell-26-917"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        viewport: { height: innerHeight, width: innerWidth },
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        appShell: {
          layoutMode: appShell?.getAttribute("data-layout-mode"),
          sidebarOpen: appShell?.hasAttribute("data-sidebar-open") ?? false,
          sidebarPinned: appShell?.hasAttribute("data-sidebar-pinned") ?? false,
        },
        sidebar: readRect(sidebar),
        header: readRect(
          sidebar?.querySelector(".codex-ui-app-sidebar__header"),
        ),
        navigation: readRect(navigation),
        navigationScroll: navigation
          ? {
              clientHeight: navigation.clientHeight,
              clientWidth: navigation.clientWidth,
              overflowY: scrollStyle?.overflowY,
              scrollHeight: navigation.scrollHeight,
              scrollWidth: navigation.scrollWidth,
            }
          : null,
        primaryItems: Array.from(
          primary?.querySelectorAll(".codex-ui-app-sidebar__item") ?? [],
          (item) => ({
            label: item
              .querySelector(".codex-ui-app-sidebar__item-label")
              ?.textContent?.trim(),
            rect: readRect(item),
          }),
        ),
        projectGroups: Array.from(
          sidebar?.querySelectorAll(
            ".codex-ui-app-sidebar__project-group",
          ) ?? [],
          (group) => ({
            expanded: group.getAttribute("data-expanded"),
            label: group
              .querySelector(
                ".codex-ui-app-sidebar__item-label",
              )
              ?.textContent?.trim(),
            row: readRect(
              group.querySelector(".codex-ui-app-sidebar__item"),
            ),
          }),
        ),
        footer: readRect(
          sidebar?.querySelector(".codex-ui-app-sidebar__footer"),
        ),
        main: readRect(
          document.querySelector(".codex-ui-app-shell__main"),
        ),
      };
    });

    const width = scene.windowSize.width;
    const height = scene.windowSize.height;
    const sidebarWidth = 321.875;
    assert.deepEqual(
      {
        frame: shell.frame,
        marker: shell.marker,
        sidebarState: shell.sidebarState,
        theme: shell.theme,
        viewport: shell.viewport,
        horizontalOverflow: shell.horizontalOverflow,
        sidebarOpen: shell.appShell.sidebarOpen,
      },
      {
        frame: "sidebar-current",
        marker: "true",
        sidebarState: "shell-current-26-917",
        theme: "dark",
        viewport: { height, width },
        horizontalOverflow: 0,
        sidebarOpen: true,
      },
    );
    assert.deepEqual(shell.sidebar, {
      height,
      left: 0,
      top: 0,
      width: sidebarWidth,
    });
    assert.deepEqual(shell.header, {
      height: 70,
      left: 0,
      top: 46,
      width: sidebarWidth,
    });
    assert.deepEqual(shell.navigation, {
      height: height - 162,
      left: 0,
      top: 116,
      width: sidebarWidth,
    });
    assert(shell.navigationScroll);
    assert.equal(shell.navigationScroll.overflowY, "auto");
    assert.equal(
      shell.navigationScroll.scrollWidth,
      shell.navigationScroll.clientWidth,
    );
    assert(shell.navigationScroll.scrollHeight > shell.navigationScroll.clientHeight);
    assert.equal(shell.projectGroups.length, 15);
    assert.equal(
      shell.projectGroups.filter(({ expanded }) => expanded === "true").length,
      9,
    );
    for (const group of shell.projectGroups) {
      assert.equal(group.row.height, 30);
      assert.equal(group.row.left, 8);
      assert.equal(group.row.width, 305.875);
    }
    assert.deepEqual(
      shell.primaryItems.map(({ label }) => label),
      ["Pull requests", "Scheduled", "Plugins"],
    );
    for (const [index, item] of shell.primaryItems.entries()) {
      assert.deepEqual(item.rect, {
        height: 30,
        left: 8,
        top: 116 + index * 30,
        width: 305.875,
      });
    }
    assert.deepEqual(shell.footer, {
      height: 46,
      left: 0,
      top: height - 46,
      width: sidebarWidth,
    });
    assert.deepEqual(shell.main, {
      height,
      left: sidebarWidth,
      top: 0,
      width: width - sidebarWidth,
    });

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    const screenshot = await page
      .locator(".codex-ui-app-sidebar")
      .screenshot({ animations: "disabled" });

    if (exerciseCompactControls) {
      assert.equal(width, 720);
      assert.equal(shell.appShell.layoutMode, "narrow");
      assert.equal(shell.appShell.sidebarPinned, true);
      await page.getByRole("button", { name: "Hide sidebar", exact: true }).click();
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".codex-ui-app-shell")
            ?.hasAttribute("data-sidebar-open"),
      );
      const collapsed = await page.evaluate(() => ({
        readMainRect: (() => {
          const bounds = document
            .querySelector(".codex-ui-app-shell__main")
            ?.getBoundingClientRect();
          return bounds
            ? {
                height: bounds.height,
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
              }
            : null;
        })(),
        activeControlLabel:
          document.activeElement?.getAttribute("aria-label") ?? null,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        navigationVisible: document
          .querySelector(".codex-ui-app-shell__sidebar")
          ?.getAttribute("aria-hidden") === "false",
      }));
      assert.equal(collapsed.horizontalOverflow, 0);
      assert.deepEqual(collapsed.readMainRect, {
        height,
        left: 0,
        top: 0,
        width,
      });
      assert.equal(collapsed.navigationVisible, false);
      assert.equal(collapsed.activeControlLabel, "Show sidebar");

      await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
      await page.waitForFunction(() =>
        document
          .querySelector(".codex-ui-app-shell")
          ?.hasAttribute("data-sidebar-open"),
      );
      const restored = await page.evaluate(() => ({
        readMainRect: (() => {
          const bounds = document
            .querySelector(".codex-ui-app-shell__main")
            ?.getBoundingClientRect();
          return bounds
            ? {
                height: bounds.height,
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
              }
            : null;
        })(),
        activeControlLabel:
          document.activeElement?.getAttribute("aria-label") ?? null,
        navigationVisible: document
          .querySelector(".codex-ui-app-shell__sidebar")
          ?.getAttribute("aria-hidden") === "false",
        sidebarPinned: document
          .querySelector(".codex-ui-app-shell")
          ?.hasAttribute("data-sidebar-pinned"),
      }));
      assert.equal(restored.navigationVisible, true);
      assert.equal(restored.sidebarPinned, true);
      assert.equal(restored.activeControlLabel, "Hide sidebar");
      assert.deepEqual(restored.readMainRect, {
        height,
        left: sidebarWidth,
        top: 0,
        width: width - sidebarWidth,
      });
      shell.compactTransition = { collapsed, restored };
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(shell, null, 2)}\n`,
    );
    return { app, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const scene of scenes) {
  const first = await capture(scene, {
    exerciseCompactControls: scene.windowSize.width === 720,
  });
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
      `${scene.id}: own-fixture sidebar pixel drift`,
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
    pixelGate: "0% own-fixture sidebar-region drift at 1180/820/721/720",
    replayEvidence: "controlled structural replay of installed 26.917.62051",
    transitions: "720px explicit hide/show, focus continuity, and pinned restore",
    scenes: scenes.map(({ id }) => id),
  }),
);
