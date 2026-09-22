import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-notification-actions-26-915-"),
);

// This is a current-candidate wrapper around the public queue fixture. Live
// App Server notification reachability is validated by separate live probes.
function sceneFor(width) {
  const compact = width === 720;
  return {
    currentSidebar: true,
    frame: "shell-notification-queue",
    id: `current-global-notification-actions-26-915-${width}`,
    scenario: "streaming-recovery",
    shellState: "ready",
    sidebarState: compact ? "compact-collapsed" : undefined,
    theme: "dark",
    view: "shell",
    windowSize: { height: compact ? 680 : 820, width },
  };
}

async function settle(page) {
  await page.waitForTimeout(700);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function readState(page) {
  return page.evaluate(() => {
    const region = document.querySelector(".codex-ui-app-notification-region");
    const notifications = Array.from(
      document.querySelectorAll(".codex-ui-app-notification"),
      (item) => ({
        expanded: item.getAttribute("data-expanded"),
        index: item.getAttribute("data-index"),
        text: item.textContent?.replace(/\s+/g, " ").trim(),
        tone: item.getAttribute("data-tone"),
        visible: item.getAttribute("data-visible"),
      }),
    );
    return {
      active: document.activeElement?.textContent?.trim() ?? null,
      action: document.querySelector(".demo-root")?.getAttribute("data-notification-action"),
      notifications,
      region: region
        ? {
            hidden: region.getAttribute("data-hidden-count"),
            total: region.getAttribute("data-total-count"),
            visible: region.getAttribute("data-visible-count"),
          }
        : null,
    };
  });
}

async function run(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  const screenshots = {};
  try {
    const region = page.getByRole("region", { name: "Notifications alt+T" });
    await region.waitFor({ state: "attached" });
    const initial = await readState(page);
    assert.deepEqual(initial.region, { hidden: "1", total: "4", visible: "3" });
    assert.deepEqual(initial.notifications.map(({ index }) => index), ["0", "1", "2", "3"]);
    assert.deepEqual(initial.notifications.map(({ tone }) => tone), ["success", "warning", "info", "neutral"]);
    assert.deepEqual(initial.notifications.map(({ visible }) => visible), ["true", "true", "true", "false"]);
    assert.deepEqual(
      initial.notifications.map(({ text }) => text),
      [
        "Chat unpinned",
        "Permission requiredA local command is waiting for approval.Review",
        "Background task completedThe validation task finished successfully.Open",
        "Update availableRestart when your current work is saved.View",
      ],
    );
    await settle(page);
    screenshots.initial = await page.screenshot();

    const front = page.locator('.codex-ui-app-notification[data-index="0"]');
    await front.hover();
    await page.waitForFunction(
      () => document.querySelector(".codex-ui-app-notification-toaster")?.getAttribute("data-expanded") === "true",
    );
    assert.deepEqual(
      await region.locator(".codex-ui-app-notification__action").allTextContents(),
      ["Review", "Open", "View"],
    );
    screenshots.expanded = await page.screenshot();

    const review = page.getByRole("button", { name: "Review", exact: true });
    await review.focus();
    assert.equal(await review.evaluate((element) => document.activeElement === element), true);
    await review.click();
    await page.waitForFunction(
      () =>
        document.querySelector(".demo-root")?.getAttribute("data-notification-action") === "permission-reviewed" &&
        document.querySelector(".codex-ui-app-notification-region")?.getAttribute("data-total-count") === "3",
    );
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Open");
    await settle(page);
    screenshots.afterReview = await page.screenshot();

    await page.getByRole("button", { name: "Open", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".demo-root")?.getAttribute("data-notification-action") === "background-opened" &&
        document.querySelector(".codex-ui-app-notification-region")?.getAttribute("data-total-count") === "2",
    );
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "View");
    await settle(page);
    screenshots.afterOpen = await page.screenshot();

    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".demo-root")?.getAttribute("data-notification-action") === "update-viewed" &&
        document.querySelector(".codex-ui-app-notification-region")?.getAttribute("data-total-count") === "1",
    );
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Close");
    await settle(page);
    screenshots.afterView = await page.screenshot();

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForSelector(".codex-ui-app-notification-region", { state: "detached" });
    await settle(page);
    screenshots.dismissed = await page.screenshot();
    for (const [state, image] of Object.entries(screenshots)) {
      await writeFile(join(artifactDirectory, `${sceneFor(width).id}-${suffix}-${state}.png`), image);
    }
    return screenshots;
  } finally {
    await app.close();
  }
}

const first = {};
const second = {};
for (const width of [1180, 720]) {
  first[width] = await run(width, "first");
  second[width] = await run(width, "second");
  for (const state of Object.keys(first[width])) {
    const firstImage = PNG.sync.read(first[width][state]);
    const secondImage = PNG.sync.read(second[width][state]);
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
      `${width}px ${state}: current 26.915 notification action replay drifted`,
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift across queue/actions/dismissal at 1180 and 720",
    replayBaseline: "public global notification queue action fixture",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    liveBoundary: "App Server notification reachability remains separate",
    states: ["initial", "expanded", "afterReview", "afterOpen", "afterView", "dismissed"],
    widths: [1180, 720],
  }),
);
