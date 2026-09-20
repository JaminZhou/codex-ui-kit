import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-status-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-status-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "status-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-status-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "status-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-status-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "status-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-status-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "status-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

async function readStatus(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const sidebar = document.querySelector(".codex-ui-app-sidebar");
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        right: value.right,
        top: value.top,
        width: value.width,
      };
    };
    const fixtures = Array.from(
      sidebar?.querySelectorAll(
        '[data-sidebar-status-fixture]:not([data-status="idle"])',
      ) ?? [],
      (item) => {
        const row = item.closest(".codex-ui-app-sidebar__item-row");
        const status = row?.querySelector(".codex-ui-app-sidebar__item-status");
        const attention = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-attention",
        );
        const spinner = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-spinner",
        );
        const error = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-error",
        );
        const secondary = row?.querySelector(
          ".codex-ui-app-sidebar__item-secondary-status",
        );
        const secondaryAttention = secondary?.querySelector(
          ".codex-ui-app-sidebar__item-status-attention",
        );
        const rowBounds = row?.getBoundingClientRect();
        const statusBounds = status?.getBoundingClientRect();
        const secondaryBounds = secondary?.getBoundingClientRect();
        return {
          attentionColor: attention
            ? getComputedStyle(attention).backgroundColor
            : null,
          attentionRect: rect(attention),
          errorRect: rect(error),
          errorPathCount: error?.querySelectorAll("path").length ?? 0,
          fixture: item.getAttribute("data-sidebar-status-fixture"),
          rowRect: rect(row),
          rightInset:
            rowBounds && statusBounds
              ? rowBounds.right - statusBounds.right
              : null,
          secondaryAttentionColor: secondaryAttention
            ? getComputedStyle(secondaryAttention).backgroundColor
            : null,
          secondaryAttentionRect: rect(secondaryAttention),
          secondaryRightInset:
            rowBounds && secondaryBounds
              ? rowBounds.right - secondaryBounds.right
              : null,
          secondaryStatus: secondary?.getAttribute("data-status") ?? null,
          secondaryStatusRect: rect(secondary),
          spinnerAnimationDuration: spinner
            ? getComputedStyle(spinner).animationDuration
            : null,
          spinnerAnimationName: spinner
            ? getComputedStyle(spinner).animationName
            : null,
          spinnerPathCount: spinner?.querySelectorAll("path").length ?? 0,
          status: status?.getAttribute("data-status") ?? null,
          statusRect: rect(status),
          visualStatus: status?.getAttribute("data-visual-status") ?? null,
        };
      },
    );
    return {
      frame: root?.getAttribute("data-frame"),
      historyStatus: root?.getAttribute("data-current-sidebar-status-26-915"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: rect(sidebar),
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      fixtures,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const contract = await readStatus(page);
    assert.equal(contract.frame, "sidebar-current");
    assert.equal(contract.historyStatus, "true");
    assert.equal(contract.sidebarState, "status-lifecycle-current-26-915");
    assert.equal(contract.theme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.deepEqual(
      contract.sidebar && {
        height: contract.sidebar.height,
        width: contract.sidebar.width,
      },
      { height: scene.windowSize.height, width: 321.875 },
    );
    assert.equal(contract.fixtures.length, 8);
    const expected = [
      ["session-browser:0", "active", "loading"],
      ["desktop-cleanup:0", "waiting", "loading"],
      ["desktop-cleanup:1", "error", "error"],
      ["codex-ui-kit:0", "unread", "attention"],
      ["codex-ui-kit:1", "queued", "loading"],
      ["design-assets:0", "loading", "loading"],
      ["design-assets:1", "loading", "loading"],
      ["design-assets:2", "error", "error"],
    ];
    assert.deepEqual(
      contract.fixtures.map(({ fixture, status, visualStatus }) => [
        fixture,
        status,
        visualStatus,
      ]),
      expected,
    );
    const expectedAttentionColor =
      scene.theme === "light" ? "rgb(51, 156, 255)" : "rgb(58, 131, 247)";
    for (const fixture of contract.fixtures) {
      assert.deepEqual(fixture.rowRect && {
        height: fixture.rowRect.height,
        width: fixture.rowRect.width,
      }, { height: 30, width: 305.875 });
      assert.deepEqual(fixture.statusRect && {
        height: fixture.statusRect.height,
        width: fixture.statusRect.width,
      }, { height: 20, width: 20 });
      assert.equal(
        fixture.rightInset,
        fixture.fixture === "design-assets:2" ? 36 : 8,
      );
      if (fixture.visualStatus === "loading") {
        assert.equal(fixture.spinnerPathCount, 2);
        assert.equal(fixture.spinnerAnimationDuration, "1e-06s");
        assert.equal(fixture.spinnerAnimationName, "none");
      }
      if (fixture.visualStatus === "attention") {
        assert.equal(fixture.attentionColor, expectedAttentionColor);
        assert.deepEqual(fixture.attentionRect && {
          height: fixture.attentionRect.height,
          width: fixture.attentionRect.width,
        }, { height: 8, width: 8 });
      }
      if (fixture.visualStatus === "error") {
        assert.equal(fixture.errorPathCount, 3);
        assert.deepEqual(fixture.errorRect && {
          height: fixture.errorRect.height,
          width: fixture.errorRect.width,
        }, { height: 16, width: 16 });
      }
      if (fixture.fixture === "design-assets:2") {
        assert.equal(fixture.secondaryStatus, "unread");
        assert.equal(fixture.secondaryRightInset, 8);
        assert.equal(fixture.secondaryAttentionColor, expectedAttentionColor);
        assert.deepEqual(fixture.secondaryStatusRect && {
          height: fixture.secondaryStatusRect.height,
          width: fixture.secondaryStatusRect.width,
        }, { height: 20, width: 20 });
        assert.deepEqual(fixture.secondaryAttentionRect && {
          height: fixture.secondaryAttentionRect.height,
          width: fixture.secondaryAttentionRect.width,
        }, { height: 8, width: 8 });
      }
    }
    const activeRow = page
      .locator('[data-sidebar-status-fixture="session-browser:0"]')
      .locator(
        "xpath=ancestor::*[contains(@class, 'codex-ui-app-sidebar__item-row')]",
      );
    await activeRow.hover();
    const hovered = await activeRow.evaluate((row) => ({
      actions: getComputedStyle(
        row.querySelector(".codex-ui-app-sidebar__item-actions"),
      ).opacity,
      status: getComputedStyle(
        row.querySelector(".codex-ui-app-sidebar__item-status"),
      ).opacity,
    }));
    assert.deepEqual(hovered, { actions: "1", status: "0" });
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
    replayEvidence: "current 26.915 sidebar status lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
