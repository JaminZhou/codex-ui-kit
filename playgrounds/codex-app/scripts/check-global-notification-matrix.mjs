import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-notification-matrix-"));

function sceneFor(width) {
  return {
    currentSidebar: true,
    frame: "shell-notification-queue",
    id: `shell-notification-queue-${width}`,
    scenario: "streaming-recovery",
    shellState: "ready",
    sidebarState: width === 720 ? "compact-collapsed" : undefined,
    theme: "dark",
    view: "shell",
    windowSize: { height: width === 720 ? 680 : 820, width },
  };
}

async function assertInitialMatrix(page, width) {
  const root = page.locator(".demo-root");
  const region = page.getByRole("region", { name: "Notifications alt+T" });
  await region.waitFor({ state: "attached" });
  assert.equal(await root.getAttribute("data-frame"), "shell-notification-queue");
  assert.equal(await region.getAttribute("aria-live"), "polite");
  assert.equal(await region.getAttribute("data-total-count"), "4");
  assert.equal(await region.getAttribute("data-visible-count"), "3");
  assert.equal(await region.getAttribute("data-hidden-count"), "1");

  const notifications = region.locator(".codex-ui-app-notification");
  assert.equal(await notifications.count(), 4);
  const matrix = await notifications.evaluateAll((items) =>
    items.map((item) => {
      const alert = item.querySelector(".codex-ui-app-notification__alert");
      const style = alert ? getComputedStyle(alert) : null;
      const rect = alert?.getBoundingClientRect();
      return {
        backgroundColor: style?.backgroundColor ?? null,
        color: style?.color ?? null,
        fontFamily: style?.fontFamily ?? null,
        height: rect?.height ?? 0,
        iconCount: item.querySelectorAll(".codex-ui-app-notification__leading path").length,
        index: item.getAttribute("data-index"),
        text: item.textContent?.replace(/\s+/g, " ").trim(),
        tone: item.getAttribute("data-tone"),
        visible: item.getAttribute("data-visible"),
        width: rect?.width ?? 0,
      };
    }),
  );
  assert.deepEqual(
    matrix.map(({ index }) => index),
    ["0", "1", "2", "3"],
  );
  assert.deepEqual(
    matrix.map(({ tone }) => tone),
    ["success", "warning", "info", "neutral"],
  );
  assert.deepEqual(
    matrix.map(({ visible }) => visible),
    ["true", "true", "true", "false"],
  );
  assert.deepEqual(
    matrix.map(({ text }) => text),
    [
      "Chat unpinned",
      "Permission requiredA local command is waiting for approval.Review",
      "Background task completedThe validation task finished successfully.Open",
      "Update availableRestart when your current work is saved.View",
    ],
  );
  for (const item of matrix) {
    assert.ok(item.fontFamily, `${width}px ${item.tone} notification lost its computed font`);
    assert.ok(item.backgroundColor, `${width}px ${item.tone} notification lost its computed background`);
    assert.ok(item.color, `${width}px ${item.tone} notification lost its computed color`);
    assert.ok(item.iconCount > 0, `${width}px ${item.tone} notification lost its icon`);
    assert.ok(item.width > 0 && item.height > 0, `${width}px ${item.tone} notification has no bounds`);
  }
  assert.equal(matrix[0].backgroundColor, "rgb(1, 28, 11)");
  assert.equal(matrix[0].color, "rgb(64, 201, 119)");
  assert.equal(matrix[1].backgroundColor, "rgb(40, 17, 5)");
  assert.equal(matrix[1].color, "rgb(251, 106, 34)");

  const front = notifications.nth(0);
  await front.hover();
  await page.waitForFunction(() =>
    document.querySelector(".codex-ui-app-notification-toaster")?.getAttribute("data-expanded") ===
      "true",
  );
  assert.deepEqual(
    await region.locator(".codex-ui-app-notification__action").allTextContents(),
    ["Review", "Open", "View"],
  );
  const expanded = await notifications.evaluateAll((items) =>
    items.map((item) => ({
      expanded: item.getAttribute("data-expanded"),
      opacity: getComputedStyle(item).opacity,
      pointerEvents: getComputedStyle(item).pointerEvents,
      visible: item.getAttribute("data-visible"),
    })),
  );
  assert.ok(expanded.every(({ expanded: value }) => value === "true"));
  assert.deepEqual(
    expanded.map(({ visible }) => visible),
    ["true", "true", "true", "false"],
  );
  assert.equal(expanded[3].opacity, "0");
  assert.equal(expanded[3].pointerEvents, "none");
}

async function waitForNotificationAction(page, action, expectedTotal) {
  await page.waitForFunction(
    ({ action: expectedAction, expectedTotal: total }) => {
      const root = document.querySelector(".demo-root");
      const region = document.querySelector(".codex-ui-app-notification-region");
      return (
        root?.getAttribute("data-notification-action") === expectedAction &&
        region?.getAttribute("data-total-count") === String(total)
      );
    },
    { action, expectedTotal },
  );
}

async function run(width, suffix) {
  const { app, page } = await launchScene(sceneFor(width), { capture: false });
  const screenshots = {};
  try {
    await assertInitialMatrix(page, width);
    screenshots.initial = await page.screenshot();

    const review = page.getByRole("button", { name: "Review", exact: true });
    await review.focus();
    assert.equal(await review.evaluate((element) => document.activeElement === element), true);
    await review.click();
    await waitForNotificationAction(page, "permission-reviewed", 3);
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Open");
    screenshots.afterReview = await page.screenshot();

    const open = page.getByRole("button", { name: "Open", exact: true });
    assert.equal(await open.count(), 1);
    await open.click();
    await waitForNotificationAction(page, "background-opened", 2);
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "View");
    screenshots.afterOpen = await page.screenshot();

    const view = page.getByRole("button", { name: "View", exact: true });
    assert.equal(await view.count(), 1);
    await view.click();
    await waitForNotificationAction(page, "update-viewed", 1);
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Close");
    screenshots.afterView = await page.screenshot();

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.waitForSelector(".codex-ui-app-notification-region", { state: "detached" });
    screenshots.dismissed = await page.screenshot();

    for (const [state, image] of Object.entries(screenshots)) {
      await writeFile(join(directory, `notification-${width}-${suffix}-${state}.png`), image);
    }
    return screenshots;
  } finally {
    await app.close();
  }
}

for (const width of [1180, 720]) {
  const first = await run(width, "first");
  const second = await run(width, "second");
  for (const state of Object.keys(first)) {
    const firstImage = PNG.sync.read(first[state]);
    const secondImage = PNG.sync.read(second[state]);
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
      `${width}px notification ${state} pixel gate drifted between identical runs`,
    );
  }
}

console.log(
  JSON.stringify({
    directory,
    evidence: "replay-only success/warning/info/neutral tone and action matrix",
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720 across initial and action states",
    states: ["initial", "afterReview", "afterOpen", "afterView", "dismissed"],
    widths: [1180, 720],
  }),
);
