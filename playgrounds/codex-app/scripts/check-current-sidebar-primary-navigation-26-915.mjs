import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-primary-navigation-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-primary-navigation-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-primary-navigation-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-primary-navigation-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-primary-navigation-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

function rect(element) {
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
}

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
      const primary = sidebar?.querySelector(
        ".codex-ui-app-sidebar__primary",
      );
      const items = Array.from(primary?.querySelectorAll("button") ?? []);
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute(
          "data-current-sidebar-primary-navigation-26-915",
        ),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: readRect(sidebar),
        primary: readRect(primary),
        items: items.map((item) => ({
          ariaCurrent: item.getAttribute("aria-current"),
          icon: item.querySelector("[data-current-build-icon]")?.getAttribute(
            "data-current-build-icon",
          ),
          label: item.querySelector(
            ".codex-ui-app-sidebar__item-label",
          )?.textContent?.trim(),
          rect: readRect(item),
          style: {
            fontSize: getComputedStyle(item).fontSize,
            lineHeight: getComputedStyle(item).lineHeight,
            padding: getComputedStyle(item).padding,
          },
        })),
      };
    });
    assert.equal(shell.frame, "sidebar-current");
    assert.equal(shell.marker, "true");
    assert.equal(shell.sidebarState, "primary-navigation-current-26-915");
    assert.equal(shell.theme, scene.theme);
    assert.equal(shell.horizontalOverflow, 0);
    assert.deepEqual(
      shell.sidebar && {
        height: shell.sidebar.height,
        width: shell.sidebar.width,
      },
      { height: scene.windowSize.height, width: 321.875 },
    );
    assert.deepEqual(shell.primary && {
      height: shell.primary.height,
      left: shell.primary.left,
      width: shell.primary.width,
    }, { height: 120, left: 0, width: 321.875 });
    assert.deepEqual(
      shell.items.map(({ label, icon }) => ({ label, icon })),
      [
        { label: "Pull requests", icon: "sidebar-pull-request" },
        { label: "Sites", icon: "sidebar-sites" },
        { label: "Scheduled", icon: "sidebar-scheduled" },
        { label: "Plugins", icon: "sidebar-plugins" },
      ],
    );
    assert.deepEqual(shell.items.map(({ ariaCurrent }) => ariaCurrent), [
      null,
      null,
      null,
      null,
    ]);
    for (const item of shell.items) {
      assert.deepEqual(item.rect && {
        height: item.rect.height,
        left: item.rect.left,
        width: item.rect.width,
      }, { height: 30, left: 8, width: 305.875 });
      assert.deepEqual(item.style, {
        fontSize: "13px",
        lineHeight: "18.5714px",
        padding: "5px 5px 5px 8px",
      });
    }

    const firstItem = page.getByRole("button", {
      exact: true,
      name: "Pull requests",
    });
    await firstItem.focus();
    assert.equal(
      await firstItem.evaluate((element) => document.activeElement === element),
      true,
    );
    await page.evaluate(() => document.activeElement?.blur());
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
    replayEvidence: "current 26.915 sidebar primary navigation",
    scenes: scenes.map(({ id }) => id),
  }),
);
