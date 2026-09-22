import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const artifactDirectory = await mkdtemp(
  join(tmpdir(), "ui-kit-current-global-notifications-light-26-915-"),
);

function sceneFor(width) {
  const compact = width === 720;
  return {
    currentSidebar: true,
    frame: "shell-notification-queue",
    id: `current-global-notifications-light-26-915-${width}`,
    scenario: "streaming-recovery",
    shellState: "ready",
    sidebarState: compact ? "compact-collapsed" : undefined,
    theme: "light",
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
    const firstAlert = document.querySelector(
      '.codex-ui-app-notification[data-index="0"] .codex-ui-app-notification__alert',
    );
    const style = firstAlert ? getComputedStyle(firstAlert) : null;
    return {
      alert: style
        ? {
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
          }
        : null,
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      region: region
        ? {
            hidden: region.getAttribute("data-hidden-count"),
            total: region.getAttribute("data-total-count"),
            visible: region.getAttribute("data-visible-count"),
          }
        : null,
      tones: Array.from(
        document.querySelectorAll(".codex-ui-app-notification"),
        (item) => item.getAttribute("data-tone"),
      ),
      viewport: { height: innerHeight, width: innerWidth },
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
    assert.deepEqual(initial.tones, ["success", "warning", "info", "neutral"]);
    assert.equal(initial.overflow, 0);
    assert.deepEqual(initial.viewport, { height: width === 720 ? 680 : 820, width });
    assert.ok(initial.alert);
    assert.ok(initial.alert.backgroundColor && initial.alert.color && initial.alert.fontFamily);
    await settle(page);
    screenshots.initial = await page.screenshot();

    await page.locator('.codex-ui-app-notification[data-index="0"]').hover();
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

    for (const [state, image] of Object.entries(screenshots)) {
      await writeFile(join(artifactDirectory, `${sceneFor(width).id}-${suffix}-${state}.png`), image);
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
      `${width}px ${state}: current 26.915 light notification replay drifted`,
    );
  }
}

console.log(
  JSON.stringify({
    artifactDirectory,
    passed: true,
    pixelGate: "0% own-fixture drift at 1180 and 720 in light theme",
    replayBaseline: "public global notification queue light fixture",
    runtimeBaseline: "26.915.31945 candidate wrapper",
    installedProductBoundary: "light-theme installed-product pixels remain separate",
    states: ["initial", "expanded", "afterReview"],
    widths: [1180, 720],
  }),
);
