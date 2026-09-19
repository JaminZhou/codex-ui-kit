import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-projects-26-915-"),
);

const scenes = [
  {
    frame: "projects-index-current-26-915-ready",
    id: "projects-index-current-26-915-ready",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "projects",
  },
  {
    frame: "projects-index-current-26-915-ready",
    id: "projects-index-current-26-915-compact",
    scenario: "workspace-workflow",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "projects",
    windowSize: { height: 600, width: 600 },
  },
  {
    frame: "projects-index-current-26-915-expanded",
    id: "projects-index-current-26-915-expanded",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "projects",
  },
];

function closeEnough(actual, expected, tolerance = 1) {
  return Math.abs((actual ?? Number.NaN) - expected) <= tolerance;
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const contract = await page.evaluate(() => {
      const bounds = (element) => {
        if (!(element instanceof HTMLElement)) return null;
        const rect = element.getBoundingClientRect();
        return {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        };
      };
      const index = document.querySelector(".codex-ui-project-index");
      const rows = [...document.querySelectorAll("[data-project-row]")];
      const wrappers = [...document.querySelectorAll("[data-project-row-wrapper]")];
      return {
        columns: getComputedStyle(
          document.querySelector(".codex-ui-project-index__columns"),
        ).gridTemplateColumns,
        expandedGroups: document.querySelectorAll(
          '.codex-ui-project-index__recent[aria-label^="Recent chats in"]',
        ).length,
        index: bounds(index),
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        rows: rows.map(bounds),
        search: bounds(document.querySelector(".demo-projects-search")),
        searchInput: bounds(
          document.querySelector('.codex-ui-project-index input[type="search"]'),
        ),
        searchPlaceholder: document
          .querySelector('.codex-ui-project-index input[type="search"]')
          ?.getAttribute("placeholder"),
        title: bounds(document.querySelector(".codex-ui-project-index__header h3")),
        titleText: document
          .querySelector(".codex-ui-project-index__header h3")
          ?.textContent?.trim(),
        toggles: document.querySelectorAll(
          '[aria-label^="Expand project "], [aria-label^="Collapse project "]',
        ).length,
        wrappers: wrappers.map(bounds),
        view: document.querySelector(".demo-root")?.getAttribute("data-view"),
        viewport: { height: innerHeight, width: innerWidth },
      };
    });

    assert.equal(contract.view, "projects");
    assert.equal(contract.titleText, "Projects");
    assert.equal(contract.searchPlaceholder, "Search projects");
    assert.equal(contract.overflow, 0);
    assert.equal(contract.rows.length, 15);
    assert.equal(contract.toggles, 15);
    assert.equal(contract.expandedGroups, scene.id.endsWith("expanded") ? 1 : 0);
    assert.ok(contract.rows.every((row) => closeEnough(row?.height, 70)));
    assert.ok(contract.wrappers.some((row) => closeEnough(row?.height, scene.id.endsWith("expanded") ? 119 : 71)));
    assert.ok(closeEnough(contract.title?.height, 33.59375, 0.2));
    assert.ok(closeEnough(contract.searchInput?.height, 18, 0.2));

    if (scene.id.endsWith("compact")) {
      assert.equal(contract.viewport.width, 600);
      assert.equal(contract.viewport.height, 600);
      assert.ok(closeEnough(contract.index?.left, 1));
      assert.ok(closeEnough(contract.index?.width, 599));
      assert.ok(closeEnough(contract.index?.height, 554));
      assert.ok(closeEnough(contract.search?.left, 21));
      assert.ok(closeEnough(contract.search?.width, 559));
      assert.ok(closeEnough(contract.title?.left, 29));
      assert.equal(contract.columns, "415px 128px");
      assert.ok(closeEnough(contract.rows[0]?.left, 21));
      assert.ok(closeEnough(contract.rows[0]?.width, 559));
    } else {
      assert.equal(contract.viewport.width, 1180);
      assert.equal(contract.viewport.height, 820);
      assert.ok(closeEnough(contract.index?.left, 321.875));
      assert.ok(closeEnough(contract.index?.width, 858.125));
      assert.ok(closeEnough(contract.index?.height, 774));
      assert.ok(closeEnough(contract.search?.left, 382.9375));
      assert.ok(closeEnough(contract.search?.width, 736));
      assert.ok(closeEnough(contract.title?.left, 390.9375));
      assert.equal(contract.columns, "512px 64px 128px");
      assert.ok(closeEnough(contract.rows[0]?.left, 382.9375));
      assert.ok(closeEnough(contract.rows[0]?.width, 736));
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    return { app, page, screenshot: await page.screenshot() };
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
      `${scene.id}: current 26.915 Projects Index replay drifted`,
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
    pixelGate: "0% own-fixture drift at 1180 and 600",
    runtimeBaseline: "26.915.31945",
    rows: 15,
    scenes: scenes.map(({ id }) => id),
  }),
);
