import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-footer-account-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-footer-account-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "footer-account-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-footer-account-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "footer-account-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-footer-account-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "footer-account-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-footer-account-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "footer-account-current-26-915",
    theme: "light",
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
        marker: root?.getAttribute("data-current-sidebar-footer-account-26-915"),
        sidebarState: root?.getAttribute("data-sidebar-state"),
        theme: root?.getAttribute("data-theme"),
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        sidebar: bounds ? { height: bounds.height, width: bounds.width } : null,
        footerAccount: document.querySelector(
          ".codex-ui-app-sidebar-footer__account",
        )?.textContent?.trim(),
      };
    });
    assert.deepEqual(shell, {
      frame: "sidebar-current",
      marker: "true",
      sidebarState: scene.sidebarState,
      theme: scene.theme,
      horizontalOverflow: 0,
      sidebar: { height: scene.windowSize.height, width: 321.875 },
      footerAccount: "DDemo account",
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
      return {
        focusRole: document.activeElement?.getAttribute("role"),
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        imageCount: element.querySelectorAll("img").length,
        labels: Array.from(
          element.querySelectorAll('[role="menuitem"]'),
          (item) => item.textContent?.trim(),
        ),
        menuRect: rect(element),
        dividerHeight: rect(
          element.querySelector(".demo-current-sidebar-account-menu__divider"),
        )?.height,
        separatorCount: element.querySelectorAll('[role="separator"]').length,
        triggerRect: rect(
          document.querySelector(".codex-ui-app-sidebar-footer__account"),
        ),
        footerActions: Array.from(
          document.querySelectorAll(
            ".codex-ui-app-sidebar-footer__actions button",
          ),
          (button) => button.getAttribute("aria-label"),
        ),
      };
    });
    const compact = scene.windowSize.width === 720;
    const expectedTop = compact ? 447.125 : 587.125;
    assert.equal(contract.focusRole, "menu");
    assert.equal(contract.imageCount, 1);
    assert.equal(contract.dividerHeight, 9);
    assert.equal(contract.separatorCount, 0);
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
    assert(near(contract.menuRect?.left, 9));
    assert(near(contract.menuRect?.top, expectedTop));
    assert(near(contract.menuRect?.width, 305.875));
    assert(near(contract.menuRect?.height, 188.375));
    assert(near(contract.triggerRect?.left, 8));
    assert(near(contract.triggerRect?.top, compact ? 643 : 783));
    assert.equal(contract.triggerRect?.height, 29);
    assert((contract.triggerRect?.width ?? 0) >= 150);
    assert.deepEqual(contract.footerActions, [
      "Start new voice chat",
      "Open help menu",
    ]);

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
    replayEvidence: "current 26.915 sidebar footer account lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
