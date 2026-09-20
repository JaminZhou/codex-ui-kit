import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-sidebar-thread-history-26-915-"),
);

const scenes = [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-thread-history-26-915-wide",
    scenario: "streaming-recovery",
    sidebarState: "thread-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-thread-history-26-915-compact",
    scenario: "streaming-recovery",
    sidebarState: "thread-lifecycle-current-26-915",
    theme: "dark",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-thread-history-26-915-wide-light",
    scenario: "streaming-recovery",
    sidebarState: "thread-lifecycle-current-26-915",
    theme: "light",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "current-sidebar-thread-history-26-915-compact-light",
    scenario: "streaming-recovery",
    sidebarState: "thread-lifecycle-current-26-915",
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

async function readSidebar(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const navigation = document.querySelector(
      ".codex-ui-app-sidebar__navigation",
    );
    const fixtures = Array.from(
      document.querySelectorAll("[data-sidebar-thread-lifecycle-fixture]"),
      (item) => {
        const row = item.closest(".codex-ui-app-sidebar__item-row");
        const status = row?.querySelector(".codex-ui-app-sidebar__item-status");
        const attention = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-attention",
        );
        const actions = row?.querySelector(
          ".codex-ui-app-sidebar__item-actions",
        );
        const style = getComputedStyle(item);
        const rowRect = row?.getBoundingClientRect();
        return {
          actionLabels: Array.from(
            actions?.querySelectorAll("button") ?? [],
            (button) => button.getAttribute("aria-label"),
          ),
          actionsOpacity: actions ? getComputedStyle(actions).opacity : null,
          attentionColor: attention
            ? getComputedStyle(attention).backgroundColor
            : null,
          attentionRect: attention
            ? (() => {
                const value = attention.getBoundingClientRect();
                return { height: value.height, width: value.width };
              })()
            : null,
          fixture: item.getAttribute("data-sidebar-thread-lifecycle-fixture"),
          itemRect: (() => {
            const value = item.getBoundingClientRect();
            return { height: value.height, width: value.width };
          })(),
          itemStyle: {
            borderRadius: style.borderRadius,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            padding: style.padding,
          },
          rowRect: rowRect
            ? { height: rowRect.height, width: rowRect.width }
            : null,
          selected: row?.hasAttribute("data-selected") ?? false,
          status: status?.getAttribute("data-status") ?? "idle",
          statusRect: status
            ? (() => {
                const value = status.getBoundingClientRect();
                return { height: value.height, width: value.width };
              })()
            : null,
          visualStatus: status?.getAttribute("data-visual-status") ?? null,
        };
      },
    );
    return {
      currentHistory: root?.getAttribute(
        "data-current-sidebar-thread-history-26-915",
      ),
      frame: root?.getAttribute("data-frame"),
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      navigation: {
        clientHeight: navigation?.clientHeight ?? null,
        scrollHeight: navigation?.scrollHeight ?? null,
      },
      sidebar: sidebar
        ? (() => {
            const value = sidebar.getBoundingClientRect();
            return {
              height: value.height,
              width: value.width,
            };
          })()
        : null,
      sidebarState: root?.getAttribute("data-sidebar-state"),
      theme: root?.getAttribute("data-theme"),
      fixtures,
    };
  });
}

async function capture(scene) {
  const { app, page } = await launchScene(scene);
  try {
    const contract = await readSidebar(page);
    assert.equal(contract.frame, "sidebar-current");
    assert.equal(contract.currentHistory, "true");
    assert.equal(contract.sidebarState, "thread-lifecycle-current-26-915");
    assert.equal(contract.theme, scene.theme);
    assert.equal(contract.horizontalOverflow, 0);
    assert.ok(contract.sidebar);
    assert.equal(contract.sidebar.width, 321.875);
    assert.equal(contract.sidebar.height, scene.windowSize.height);
    assert.ok(contract.navigation.scrollHeight >= contract.navigation.clientHeight);
    assert.equal(contract.fixtures.length, 6);
    const [active, unread, ...idle] = contract.fixtures;
    assert.equal(active.fixture, "active");
    assert.equal(active.status, "active");
    assert.equal(active.visualStatus, "loading");
    assert.equal(active.selected, true);
    assert.equal(active.actionsOpacity, "0");
    assert.deepEqual(active.itemRect, { height: 30, width: 305.875 });
    assert.deepEqual(active.rowRect, { height: 30, width: 305.875 });
    assert.deepEqual(active.itemStyle, {
      borderRadius: "12.5px",
      fontSize: "13px",
      fontWeight: "400",
      lineHeight: "18.5714px",
      padding: "5px 5px 5px 8px",
    });
    assert.deepEqual(active.statusRect, { height: 20, width: 20 });
    assert.deepEqual(active.actionLabels, ["Pin chat", "Archive chat"]);
    assert.equal(unread.fixture, "unread");
    assert.equal(unread.status, "unread");
    assert.equal(unread.visualStatus, "attention");
    assert.equal(unread.selected, false);
    assert.equal(unread.attentionColor, scene.theme === "light" ? "rgb(51, 156, 255)" : "rgb(58, 131, 247)");
    assert.deepEqual(unread.attentionRect, { height: 8, width: 8 });
    assert.ok(
      idle.every(
        (fixture) =>
          fixture.fixture === "idle" &&
          fixture.status === "idle" &&
          fixture.visualStatus === null,
      ),
    );

    const activeRow = page
      .locator('[data-sidebar-thread-lifecycle-fixture="active"]')
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
    replayEvidence: "current 26.915 sidebar thread history lifecycle",
    scenes: scenes.map(({ id }) => id),
  }),
);
