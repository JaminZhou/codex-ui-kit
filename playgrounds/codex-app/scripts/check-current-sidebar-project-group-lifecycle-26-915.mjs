import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-project-group-lifecycle-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-group-lifecycle-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "project-group-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-group-lifecycle-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "project-group-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-group-lifecycle-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "project-group-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-project-group-lifecycle-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "project-group-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

async function readContract(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value
        ? {
            height: value.height,
            left: value.left,
            width: value.width,
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
    ).map((group) => {
      const header = group.querySelector(":scope .codex-ui-app-sidebar__item");
      const children = group.querySelector(
        ":scope > .codex-ui-app-sidebar__project-children",
      );
      const tasks = Array.from(
        children?.querySelectorAll(":scope .codex-ui-app-sidebar__item") ?? [],
      );
      return {
        childrenId: children?.id ?? null,
        childrenHidden: children?.hasAttribute("hidden") ?? null,
        expanded: group.getAttribute("data-expanded"),
        header: {
          ariaControls: header?.getAttribute("aria-controls"),
          ariaCurrent: header?.getAttribute("aria-current"),
          ariaExpanded: header?.getAttribute("aria-expanded"),
          label: header
            ?.querySelector(".codex-ui-app-sidebar__item-label")
            ?.textContent?.trim(),
          rect: rect(header),
          status: header?.getAttribute("data-status"),
        },
        tasks: tasks.map((task) => ({
          depth: task.getAttribute("data-depth"),
          label: task
            .querySelector(".codex-ui-app-sidebar__item-label")
            ?.textContent?.trim(),
          rect: rect(task),
        })),
      };
    });
    return {
      frame: root?.getAttribute("data-frame"),
      marker: root?.getAttribute(
        "data-current-sidebar-project-group-lifecycle-26-915",
      ),
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: rect(sidebar),
      navigation: navigation
        ? {
            clientWidth: navigation.clientWidth,
            scrollWidth: navigation.scrollWidth,
          }
        : null,
      groups,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const contract = await readContract(page);
    assert.equal(contract.frame, "sidebar-current");
    assert.equal(contract.marker, "true");
    assert.equal(contract.sidebarState, scene.sidebarState);
    assert.equal(contract.theme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.deepEqual(contract.sidebar, {
      height: scene.windowSize.height,
      left: 0,
      width: 321.875,
    });
    assert(contract.navigation);
    assert.equal(contract.navigation.clientWidth, contract.navigation.scrollWidth);
    assert.ok(contract.navigation.clientWidth > 0);
    assert.equal(contract.groups.length, 5);
    assert.deepEqual(
      contract.groups.map(({ header, expanded, childrenHidden }) => [
        header.label,
        header.ariaExpanded,
        expanded,
        childrenHidden,
        header.ariaControls === contract.groups.find(({ childrenId }) => childrenId === header.ariaControls)?.childrenId,
      ]),
      [
        ["session-browser", "true", "true", false, true],
        ["desktop-cleanup", "true", "true", false, true],
        ["codex-ui-kit", "true", "true", false, true],
        ["design-assets", "true", "true", false, true],
        ["protocol-client", "true", "true", false, true],
      ],
    );
    assert.deepEqual(
      contract.groups.map(({ tasks }) => tasks.map(({ label }) => label)),
      [
        ["Inspect timeline structure"],
        ["Verify recent item cleanup", "Inspect failed task"],
        ["Match current sidebar", "Review responsive shell"],
        ["Audit monthly layout", "Compare visual baseline", "Tune compact spacing"],
        ["Check compatibility matrix"],
      ],
    );
    assert.deepEqual(
      contract.groups.map(({ tasks }) => tasks.map(({ depth }) => depth)),
      [["1"], ["1", "1"], ["1", "1"], ["1", "1", "1"], ["1"]],
    );
    assert.equal(
      contract.groups.filter(({ header }) => header.ariaCurrent === "page").length,
      1,
    );
    assert.equal(
      contract.groups.find(({ header }) => header.ariaCurrent === "page")?.header.label,
      "codex-ui-kit",
    );
    assert.equal(
      contract.groups.find(({ header }) => header.label === "design-assets")?.header.status,
      "unread",
    );
    for (const group of contract.groups) {
      assert.deepEqual(group.header.rect, { height: 30, left: 8, width: 305.875 });
      for (const task of group.tasks) {
        assert.deepEqual(task.rect, { height: 30, left: 8, width: 305.875 });
      }
    }

    const firstGroup = page.getByRole("button", {
      exact: true,
      name: "session-browser",
    });
    await firstGroup.focus();
    await firstGroup.press("Space");
    assert.equal(await firstGroup.getAttribute("aria-expanded"), "false");
    assert.equal(
      await firstGroup.evaluate((element) => document.activeElement === element),
      true,
    );
    await firstGroup.press("Space");
    assert.equal(await firstGroup.getAttribute("aria-expanded"), "true");
    assert.equal(
      await firstGroup.evaluate((element) => document.activeElement === element),
      true,
    );
    await firstGroup.hover();
    const hoveredActions = await firstGroup.evaluate((element) => {
      const row = element.closest(".codex-ui-app-sidebar__item-row");
      return row
        ? getComputedStyle(row.querySelector(".codex-ui-app-sidebar__item-actions")).opacity
        : null;
    });
    assert.equal(hoveredActions, "1");
    await page.mouse.move(640, 100);
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
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
    replayEvidence: "current 26.915 sidebar project-group lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
