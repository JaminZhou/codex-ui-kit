import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-worktree-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-worktree-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "worktree-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-worktree-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "worktree-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-worktree-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "worktree-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-worktree-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "worktree-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 680, width: 720 },
  },
];

function rect(element) {
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
}

async function readWorktree(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const sidebar = document.querySelector(".codex-ui-app-sidebar");
    const readRect = (element) => {
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
        "[data-sidebar-worktree-status-fixture^='current-worktree-']",
      ) ?? [],
      (item) => {
        const row = item.closest(".codex-ui-app-sidebar__item-row");
        const branch = row?.querySelector(
          ".codex-ui-app-sidebar__item-worktree-indicator",
        );
        const branchSvg = branch?.querySelector("svg");
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
        const actions = row?.querySelector(".codex-ui-app-sidebar__item-actions");
        const rowBounds = readRect(row);
        const branchBounds = readRect(branch);
        const statusBounds = readRect(status);
        return {
          actionLabels: Array.from(
            actions?.querySelectorAll("button") ?? [],
            (button) => button.getAttribute("aria-label"),
          ),
          actionsOpacity: actions ? getComputedStyle(actions).opacity : null,
          attentionColor: attention
            ? getComputedStyle(attention).backgroundColor
            : null,
          attentionRect: readRect(attention),
          branchPathCount: branchSvg?.querySelectorAll("path").length ?? 0,
          branchRect: branchBounds,
          branchRightInset:
            rowBounds && branchBounds ? rowBounds.right - branchBounds.right : null,
          branchViewBox: branchSvg?.getAttribute("viewBox") ?? null,
          errorColor: error ? getComputedStyle(error).color : null,
          errorPathCount: error?.querySelectorAll("path").length ?? 0,
          errorRect: readRect(error),
          fixture: item.getAttribute("data-sidebar-worktree-status-fixture"),
          rowRect: rowBounds,
          selected: row?.hasAttribute("data-selected") ?? false,
          status: item.getAttribute("data-status"),
          statusRect: statusBounds,
          statusRightInset:
            rowBounds && statusBounds ? rowBounds.right - statusBounds.right : null,
          spinnerAnimationDuration: spinner
            ? getComputedStyle(spinner).animationDuration
            : null,
          spinnerAnimationName: spinner
            ? getComputedStyle(spinner).animationName
            : null,
          spinnerPathCount: spinner?.querySelectorAll("path").length ?? 0,
          spinnerRect: readRect(spinner),
          visualStatus: status?.getAttribute("data-visual-status") ?? null,
          worktreeDescription:
            row?.querySelector(".codex-ui-app-sidebar__item-worktree-description")
              ?.textContent?.trim() ?? null,
          worktreeStatus: item.getAttribute("data-worktree-status"),
        };
      },
    );
    return {
      frame: root?.getAttribute("data-frame"),
      marker: root?.getAttribute("data-current-sidebar-worktree-26-915"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: readRect(sidebar),
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      fixtures,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const contract = await readWorktree(page);
    assert.equal(contract.frame, "sidebar-current");
    assert.equal(contract.marker, "true");
    assert.equal(contract.sidebarState, "worktree-lifecycle-current-26-915");
    assert.equal(contract.theme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.deepEqual(
      contract.sidebar && {
        height: contract.sidebar.height,
        width: contract.sidebar.width,
      },
      { height: scene.windowSize.height, width: 321.875 },
    );
    assert.equal(contract.fixtures.length, 4);

    const [active, failed, recovered, restored] = contract.fixtures;
    const expectedAttentionColor =
      scene.theme === "light" ? "rgb(51, 156, 255)" : "rgb(58, 131, 247)";
    const expectedErrorColor =
      scene.theme === "light" ? "rgb(186, 38, 35)" : "rgb(255, 103, 100)";
    for (const fixture of contract.fixtures) {
      assert.deepEqual(
        fixture.rowRect && {
          height: fixture.rowRect.height,
          width: fixture.rowRect.width,
        },
        { height: 30, width: 305.875 },
      );
      assert.equal(fixture.branchViewBox, "0 0 20 20");
      assert.equal(fixture.branchPathCount, 1);
      assert.deepEqual(
        fixture.branchRect && {
          height: fixture.branchRect.height,
          width: fixture.branchRect.width,
        },
        { height: 14, width: 14 },
      );
      assert.deepEqual(fixture.actionLabels, ["Pin chat", "Archive chat"]);
      assert.equal(fixture.actionsOpacity, "0");
    }

    assert.deepEqual(
      [active.fixture, failed.fixture, recovered.fixture, restored.fixture],
      [
        "current-worktree-active",
        "current-worktree-failed",
        "current-worktree-recovered",
        "current-worktree-restored",
      ],
    );
    assert.deepEqual(
      [active.worktreeStatus, failed.worktreeStatus, recovered.worktreeStatus, restored.worktreeStatus],
      ["setting-up", "failed", "restored", "restored"],
    );
    assert.equal(active.status, "loading");
    assert.equal(active.visualStatus, "loading");
    assert.equal(active.selected, true);
    assert.equal(active.branchRightInset, 39);
    assert.equal(active.statusRightInset, 8);
    assert.deepEqual(active.statusRect && {
      height: active.statusRect.height,
      width: active.statusRect.width,
    }, { height: 20, width: 20 });
    assert.deepEqual(active.spinnerRect && {
      height: active.spinnerRect.height,
      width: active.spinnerRect.width,
    }, { height: 16, width: 16 });
    assert.equal(active.spinnerPathCount, 2);
    assert.equal(active.spinnerAnimationDuration, "1e-06s");
    assert.equal(active.spinnerAnimationName, "none");

    assert.equal(failed.status, "error");
    assert.equal(failed.visualStatus, "error");
    assert.equal(failed.selected, false);
    assert.equal(failed.branchRightInset, 39);
    assert.equal(failed.statusRightInset, 8);
    assert.equal(failed.errorColor, expectedErrorColor);
    assert.deepEqual(failed.errorRect && {
      height: failed.errorRect.height,
      width: failed.errorRect.width,
    }, { height: 16, width: 16 });
    assert.equal(failed.errorPathCount, 3);

    assert.equal(recovered.status, "unread");
    assert.equal(recovered.visualStatus, "attention");
    assert.equal(recovered.selected, false);
    assert.equal(recovered.branchRightInset, 39);
    assert.equal(recovered.statusRightInset, 8);
    assert.equal(recovered.attentionColor, expectedAttentionColor);
    assert.deepEqual(recovered.attentionRect && {
      height: recovered.attentionRect.height,
      width: recovered.attentionRect.width,
    }, { height: 8, width: 8 });
    assert.equal(recovered.worktreeDescription, "Worktree is restored");

    assert.equal(restored.status, "idle");
    assert.equal(restored.visualStatus, null);
    assert.equal(restored.selected, false);
    assert.equal(restored.branchRightInset, 11);
    assert.equal(restored.statusRect, null);
    assert.equal(restored.worktreeDescription, "Worktree is restored");

    const activeRow = page
      .locator('[data-sidebar-worktree-status-fixture="current-worktree-active"]')
      .locator(
        "xpath=ancestor::*[contains(@class, 'codex-ui-app-sidebar__item-row')]",
      );
    await activeRow.hover();
    assert.deepEqual(
      await activeRow.evaluate((row) => ({
        actions: getComputedStyle(
          row.querySelector(".codex-ui-app-sidebar__item-actions"),
        ).opacity,
        branch: getComputedStyle(
          row.querySelector(".codex-ui-app-sidebar__item-worktree-indicator"),
        ).opacity,
        status: getComputedStyle(
          row.querySelector(".codex-ui-app-sidebar__item-status"),
        ).opacity,
      })),
      { actions: "1", branch: "0", status: "0" },
    );
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
    replayEvidence: "current 26.915 sidebar worktree status lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
