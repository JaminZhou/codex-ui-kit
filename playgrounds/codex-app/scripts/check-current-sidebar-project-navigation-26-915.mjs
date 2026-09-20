import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-project-navigation-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-navigation-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "project-navigation-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-navigation-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "project-navigation-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-navigation-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "project-navigation-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-navigation-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "project-navigation-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await page.evaluate(() => {
      const readRect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              bottom: bounds.bottom,
              height: bounds.height,
              left: bounds.left,
              right: bounds.right,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const root = document.querySelector(".demo-root");
      const sidebar = document.querySelector(".codex-ui-app-sidebar");
      const navigation = sidebar?.querySelector(
        ".codex-ui-app-sidebar__navigation",
      );
      const groups = Array.from(
        sidebar?.querySelectorAll(".codex-ui-app-sidebar__project-group") ?? [],
      );
      const groupData = groups.map((group) => {
        const header = group.querySelector(
          ":scope .codex-ui-app-sidebar__item",
        );
        const children = group.querySelector(
          ":scope > .codex-ui-app-sidebar__project-children",
        );
        const tasks = Array.from(
          children?.querySelectorAll(".codex-ui-app-sidebar__item") ?? [],
        );
        return {
          expanded: group.getAttribute("data-expanded"),
          header: {
            ariaCurrent: header?.getAttribute("aria-current"),
            ariaExpanded: header?.getAttribute("aria-expanded"),
            label: header
              ?.querySelector(".codex-ui-app-sidebar__item-label")
              ?.textContent?.trim(),
            rect: readRect(header),
            status: header?.getAttribute("data-status"),
          },
          tasks: tasks.map((task) => ({
            depth: task.getAttribute("data-depth"),
            label: task
              .querySelector(".codex-ui-app-sidebar__item-label")
              ?.textContent?.trim(),
            rect: readRect(task),
            status: task.getAttribute("data-status"),
          })),
          childrenHidden: children?.hasAttribute("hidden") ?? null,
        };
      });
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute(
          "data-current-sidebar-project-navigation-26-915",
        ),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: readRect(sidebar),
        navigation: readRect(navigation),
        navigationScroll: navigation
          ? {
              clientHeight: navigation.clientHeight,
              clientWidth: navigation.clientWidth,
              scrollHeight: navigation.scrollHeight,
              scrollWidth: navigation.scrollWidth,
            }
          : null,
        groups: groupData,
      };
    });

    assert.equal(shell.frame, scene.frame);
    assert.equal(shell.marker, "true");
    assert.equal(shell.sidebarState, "project-navigation-current-26-915");
    assert.equal(shell.theme, scene.theme);
    assert.equal(shell.horizontalOverflow, 0);
    assert.deepEqual(
      shell.sidebar && {
        height: shell.sidebar.height,
        width: shell.sidebar.width,
      },
      { height: scene.windowSize.height, width: 321.875 },
    );
    assert(shell.navigationScroll);
    assert.equal(shell.navigationScroll.scrollWidth, shell.navigationScroll.clientWidth);
    assert.equal(shell.groups.length, 5);
    assert.deepEqual(
      shell.groups.map(({ header, expanded, childrenHidden }) => [
        header.label,
        header.ariaExpanded,
        expanded,
        childrenHidden,
      ]),
      [
        ["session-browser", "true", "true", false],
        ["desktop-cleanup", "true", "true", false],
        ["codex-ui-kit", "true", "true", false],
        ["design-assets", "true", "true", false],
        ["protocol-client", "true", "true", false],
      ],
    );
    assert.deepEqual(
      shell.groups.map(({ tasks }) => tasks.map(({ label }) => label)),
      [
        ["Inspect timeline structure"],
        ["Verify recent item cleanup", "Inspect failed task"],
        ["Match current sidebar", "Review responsive shell"],
        ["Audit monthly layout", "Compare visual baseline", "Tune compact spacing"],
        ["Check compatibility matrix"],
      ],
    );
    assert.deepEqual(
      shell.groups.map(({ tasks }) => tasks.map(({ depth }) => depth)),
      [["1"], ["1", "1"], ["1", "1"], ["1", "1", "1"], ["1"]],
    );
    assert.equal(
      shell.groups.filter(({ header }) => header.ariaCurrent === "page").length,
      1,
    );
    assert.equal(
      shell.groups.find(({ header }) => header.ariaCurrent === "page")?.header.label,
      "codex-ui-kit",
    );
    for (const group of shell.groups) {
      assert.deepEqual(group.header.rect && {
        height: group.header.rect.height,
        left: group.header.rect.left,
        width: group.header.rect.width,
      }, { height: 30, left: 8, width: 305.875 });
      for (const task of group.tasks) {
        assert.deepEqual(task.rect && {
          height: task.rect.height,
          left: task.rect.left,
          width: task.rect.width,
        }, { height: 30, left: 8, width: 305.875 });
      }
    }

    const firstGroup = page.getByRole("button", {
      exact: true,
      name: "session-browser",
    });
    await firstGroup.click();
    assert.equal(await firstGroup.getAttribute("aria-expanded"), "false");
    await firstGroup.click();
    assert.equal(await firstGroup.getAttribute("aria-expanded"), "true");
    await firstGroup.focus();
    assert.equal(
      await firstGroup.evaluate((element) => document.activeElement === element),
      true,
    );
    await page.evaluate(() => document.activeElement?.blur());
    await page.mouse.move(640, 100);
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(shell, null, 2)}\n`,
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
    replayEvidence: "current 26.915 sidebar project navigation",
    scenes: scenes.map(({ id }) => id),
  }),
);
