import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const baselineDirectory = join(process.cwd(), "tests", "visual", "baselines");
const artifactDirectory = join(process.cwd(), "artifacts", "current-notifications-26-915");
await mkdir(artifactDirectory, { recursive: true });
await mkdir(baselineDirectory, { recursive: true });

const scenes = [
  {
    currentSidebar: true,
    frame: "shell-notification-success-stack",
    id: "current-global-notifications-26-915-wide",
    scenario: "streaming-recovery",
    shellState: "ready",
    theme: "dark",
    view: "shell",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "shell-notification-success-stack",
    id: "current-global-notifications-26-915-compact",
    scenario: "streaming-recovery",
    shellState: "ready",
    sidebarState: "hidden",
    theme: "dark",
    view: "shell",
    windowSize: { height: 820, width: 720 },
  },
];

async function readState(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      if (!(element instanceof Element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const region = document.querySelector(".codex-ui-app-notification-region");
    const toaster = region?.querySelector("[data-sonner-toaster]");
    const notifications = Array.from(
      document.querySelectorAll(".codex-ui-app-notification"),
      (notification) => {
        const alert = notification.querySelector(
          ".codex-ui-app-notification__alert",
        );
        const style = alert ? getComputedStyle(alert) : null;
        return {
          alert: bounds(alert),
          alertStyle: style
            ? {
                backgroundColor: style.backgroundColor,
                borderRadius: style.borderRadius,
                boxShadow: style.boxShadow,
                color: style.color,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                lineHeight: style.lineHeight,
                padding: style.padding,
              }
            : null,
          expanded: notification.getAttribute("data-expanded"),
          front: notification.getAttribute("data-front"),
          index: notification.getAttribute("data-index"),
          text: notification.textContent?.replace(/\s+/g, " ").trim(),
          tone: notification.getAttribute("data-tone"),
          visible: notification.getAttribute("data-visible"),
        };
      },
    );
    return {
      activeElement: document.activeElement?.className ?? null,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      notifications,
      region: region
        ? {
            ariaLabel: region.getAttribute("aria-label"),
            ariaLive: region.getAttribute("aria-live"),
            hiddenCount: region.getAttribute("data-hidden-count"),
            position: region.getAttribute("data-position"),
            rect: bounds(region),
            totalCount: region.getAttribute("data-total-count"),
            visibleCount: region.getAttribute("data-visible-count"),
          }
        : null,
      toasterExpanded: toaster?.getAttribute("data-expanded") ?? null,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertState(state, scene) {
  assert.equal(state.viewport.width, scene.windowSize.width);
  assert.equal(state.viewport.height, scene.windowSize.height);
  assert.equal(state.horizontalOverflow, 0);
  assert.ok(state.region);
  assert.equal(state.region.ariaLabel, "Notifications alt+T");
  assert.equal(state.region.ariaLive, "polite");
  assert.equal(state.region.position, "top-center");
  assert.equal(state.region.totalCount, "4");
  assert.equal(state.region.visibleCount, "3");
  assert.equal(state.region.hiddenCount, "1");
  assert.equal(state.notifications.length, 4);
  assert.deepEqual(
    state.notifications.map(({ index }) => index),
    ["0", "1", "2", "3"],
  );
  assert.deepEqual(
    state.notifications.map(({ visible }) => visible),
    ["true", "true", "true", "false"],
  );
  assert.equal(state.notifications[0].text, "Chat unpinned");
  assert.equal(state.notifications[0].tone, "success");
  assert.equal(state.notifications[0].front, "true");
  assert.equal(state.notifications[0].expanded, "false");
  assert.deepEqual(state.notifications[0].alertStyle, {
    backgroundColor: "rgb(1, 28, 11)",
    borderRadius: "15px",
    boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px 0px",
    color: "rgb(64, 201, 119)",
    fontSize: "14px",
    fontWeight: "430",
    lineHeight: "21px",
    padding: "8px",
  });
  assert.ok(state.notifications[0].alert);
  assert.ok(Math.abs(state.notifications[0].alert.top - 48) <= 1);
  assert.ok(Math.abs(state.notifications[0].alert.height - 42) <= 1);
  assert.ok(Math.abs(state.notifications[0].alert.width - 170.4375) <= 1);
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  const prefix = scene.id;
  try {
    await page.waitForSelector(".codex-ui-app-notification[data-index=\"0\"]");
    const initial = await readState(page);
    assertState(initial, scene);
    await writeFile(
      join(artifactDirectory, `${prefix}.initial.json`),
      `${JSON.stringify(initial, null, 2)}\n`,
    );
    const initialScreenshot = await page.screenshot();

    await page
      .locator('.codex-ui-app-notification[data-index="0"]')
      .hover();
    await page.waitForFunction(() =>
      document
        .querySelector(".codex-ui-app-notification-toaster")
        ?.getAttribute("data-expanded") === "true",
    );
    const expanded = await readState(page);
    assert.equal(expanded.toasterExpanded, "true");
    assert.deepEqual(
      expanded.notifications.slice(0, 3).map(({ expanded: value }) => value),
      ["true", "true", "true"],
    );
    const expandedVisible = expanded.notifications
      .filter(({ visible }) => visible === "true")
      .map(({ alert }) => alert?.top ?? 0);
    assert.equal(expandedVisible.length, 3);
    assert.ok(
      expandedVisible.every(
        (top, index, tops) => index === 0 || Math.abs(top - tops[index - 1] - 50) <= 1,
      ),
    );
    await writeFile(
      join(artifactDirectory, `${prefix}.expanded.json`),
      `${JSON.stringify(expanded, null, 2)}\n`,
    );
    const expandedScreenshot = await page.screenshot();

    await page
      .locator('.codex-ui-app-notification[data-index="0"] .codex-ui-app-notification__dismiss')
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".codex-ui-app-notification-region")?.getAttribute(
          "data-total-count",
        ) === "3",
    );
    const dismissed = await readState(page);
    assert.equal(dismissed.region.totalCount, "3");
    assert.equal(dismissed.notifications.length, 3);
    assert.ok(dismissed.notifications.every(({ text }) => text === "Chat unpinned"));
    await writeFile(
      join(artifactDirectory, `${prefix}.dismissed.json`),
      `${JSON.stringify(dismissed, null, 2)}\n`,
    );

    const baselinePaths = [
      ["initial", join(baselineDirectory, `${prefix}-initial.png`), initialScreenshot],
      ["expanded", join(baselineDirectory, `${prefix}-expanded.png`), expandedScreenshot],
    ];
    for (const [stateName, baselinePath, screenshot] of baselinePaths) {
      const actualPath = join(artifactDirectory, `${prefix}-${stateName}.png`);
      await writeFile(actualPath, screenshot);
      if (update) {
        await copyFile(actualPath, baselinePath);
      } else {
        const baseline = PNG.sync.read(await readFile(baselinePath));
        const actual = PNG.sync.read(screenshot);
        assert.equal(actual.width, baseline.width);
        assert.equal(actual.height, baseline.height);
        assert.equal(
          pixelmatch(
            baseline.data,
            actual.data,
            null,
            actual.width,
            actual.height,
            { threshold: 0 },
          ),
          0,
          `${prefix} ${stateName}: own-fixture pixel drift`,
        );
      }
    }
  } finally {
    await app.close();
  }
}

for (const scene of scenes) await capture(scene);

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720",
    runtimeBaseline: "26.915.31945",
    scenes: scenes.map(({ id }) => id),
  }),
);
