import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-account-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "current-home-dark-wide",
    id: "current-sidebar-account-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "account-menu-current-26-915",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "current-home-dark-compact",
    id: "current-sidebar-account-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "account-menu-current-26-915",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "current-home-light-wide",
    id: "current-sidebar-account-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "account-menu-current-26-915",
    theme: "light",
    view: "workspace",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "current-home-light-compact",
    id: "current-sidebar-account-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "account-menu-current-26-915",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

function near(actual, expected, tolerance = 0.25) {
  return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const shell = await page.evaluate(() => {
      const root = document.querySelector(".demo-root");
      const sidebar = document.querySelector(".codex-ui-app-sidebar");
      const bounds = sidebar?.getBoundingClientRect();
      return {
        frame: root?.getAttribute("data-frame"),
        marker: root?.getAttribute("data-current-sidebar-account-26-915"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: bounds ? { height: bounds.height, width: bounds.width } : null,
      };
    });
    assert.deepEqual(shell, {
        frame: scene.frame,
      marker: "true",
      sidebarState: "account-menu-current-26-915",
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 322.90625 },
    });

    const menu = page.getByRole("menu", { name: "Account menu" });
    const trigger = page.getByRole("button", {
      exact: true,
      name: "Demo account",
    });
    await menu.waitFor({ state: "visible" });
    const contract = await menu.evaluate((element) => {
      const rect = (target) => {
        const bounds = target?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const menuStyle = getComputedStyle(element);
      const items = Array.from(element.querySelectorAll('[role="menuitem"]'));
      const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
      return {
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        dividerHeight: rect(
          element.querySelector(".demo-current-sidebar-account-menu__divider"),
        )?.height,
        focusRole: document.activeElement?.getAttribute("role"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        imageCount: element.querySelectorAll("img").length,
        itemRects: items.map(rect),
        itemStyles: items.map((item) => {
          const style = getComputedStyle(item);
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            padding: style.padding,
          };
        }),
        labels: items.map((item) => item.textContent?.trim()),
        menuRect: rect(element),
        menuStyle: {
          backgroundColor: menuStyle.backgroundColor,
          borderRadius: menuStyle.borderRadius,
          boxShadow: menuStyle.boxShadow,
          color: menuStyle.color,
        },
        separatorCount: element.querySelectorAll('[role="separator"]').length,
        sidebarRect: rect(sidebar),
        triggerRect: rect(
          document.querySelector(
            '.codex-ui-app-sidebar-footer button[aria-label="Demo account"]',
          ),
        ),
      };
    });
    contract.triggerRect = await trigger.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      };
    });
    const compact = scene.windowSize.width === 720;
    const expectedTop = compact ? 447.5 : 587.5;
    const expectedItemTops = [
      expectedTop + 4,
      expectedTop + 41.5625,
      expectedTop + 70.125,
      expectedTop + 98.6875,
      expectedTop + 127.25,
      expectedTop + 155.8125,
    ];
    const expectedBackground =
      scene.theme === "light"
        ? "oklab(0.999994 0.0000455678 0.0000200868 / 0.9)"
        : "oklab(0.297161 0.0000135154 0.00000594556 / 0.9)";
    const expectedColor =
      scene.theme === "light" ? "rgb(26, 28, 31)" : "rgb(255, 255, 255)";
    assert.equal(contract.colorScheme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.equal(contract.focusRole, "menu");
    assert.equal(contract.imageCount, 1);
    assert.equal(contract.separatorCount, 0);
    assert.equal(contract.dividerHeight, 9);
    assert(near(contract.sidebarRect?.width, 322.90625));
    assert(near(contract.menuRect?.left, 9));
    assert(near(contract.menuRect?.top, expectedTop));
    assert(near(contract.menuRect?.width, 305.875));
    assert(near(contract.menuRect?.height, 188.375));
    assert(near(contract.triggerRect?.left, 8));
    assert((contract.triggerRect?.width ?? 0) >= 150);
    assert(
      (contract.triggerRect?.left ?? 0) + (contract.triggerRect?.width ?? 0) <=
        (contract.sidebarRect?.left ?? 0) + (contract.sidebarRect?.width ?? 0),
    );
    assert.equal(contract.triggerRect?.height, 29);
    assert(near(contract.triggerRect?.top, compact ? 643 : 783));
    assert.deepEqual(contract.icons, [
      "sidebar-account-menu-usage",
      "sidebar-account-menu-pet",
      "sidebar-account-menu-invite",
      "sidebar-account-menu-settings",
      "sidebar-account-menu-logout",
    ]);
    assert.deepEqual(contract.labels.slice(1), [
      "Usage94% left",
      "Show pet",
      "Invite a friend",
      "Settings⌘,",
      "Log out",
    ]);
    assert.equal(contract.menuStyle.backgroundColor, expectedBackground);
    assert.equal(contract.menuStyle.color, expectedColor);
    assert.equal(contract.menuStyle.borderRadius, "20px");
    assert(contract.menuStyle.boxShadow.includes(
      scene.theme === "light"
        ? "rgba(26, 28, 31, 0.08)"
        : "rgba(255, 255, 255, 0.082)",
    ));
    assert.equal(contract.itemRects.length, 6);
    assert(
      contract.itemRects.every(
        (rect, index) =>
          near(rect?.left, 13) &&
          near(rect?.top, expectedItemTops[index]) &&
          near(rect?.width, 297.875) &&
          near(rect?.height, 28.5625),
      ),
    );
    assert(
      contract.itemStyles.every(
        (style) =>
          style.backgroundColor === "rgba(0, 0, 0, 0)" &&
          style.borderRadius === "15px" &&
          style.fontSize === "13px" &&
          style.fontWeight === "400" &&
          style.lineHeight === "18.5714px" &&
          style.padding === "5px 8px",
      ),
    );

    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.textContent?.includes("Demo account"));
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
    replayEvidence: "current 26.915 sidebar account menu lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
