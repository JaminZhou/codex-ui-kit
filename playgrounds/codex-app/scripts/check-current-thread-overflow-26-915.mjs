import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const baselineDirectory = join(process.cwd(), "tests", "visual", "baselines");
const artifactDirectory = join(
  process.cwd(),
  "artifacts",
  "current-thread-overflow-26-915",
);
await mkdir(artifactDirectory, { recursive: true });
await mkdir(baselineDirectory, { recursive: true });

const scenes = [
  {
    currentSidebar: true,
    frame: "thread-overflow-current-26-915-open",
    id: "current-thread-overflow-26-915-wide",
    scenario: "current-basic-message-26-825",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 820, width: 1180 },
  },
  {
    currentSidebar: true,
    frame: "thread-overflow-current-26-915-open",
    id: "current-thread-overflow-26-915-compact",
    scenario: "current-basic-message-26-825",
    sidebarState: "compact-collapsed",
    theme: "dark",
    view: "conversation",
    windowSize: { height: 680, width: 720 },
  },
];

async function readState(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
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
    const trigger = document.querySelector(
      ".codex-ui-thread-overflow-menu__trigger",
    );
    const menu = document.querySelector(
      '.codex-ui-thread-overflow-menu[role="menu"]',
    );
    const triggerStyle = trigger ? getComputedStyle(trigger) : null;
    const menuStyle = menu ? getComputedStyle(menu) : null;
    return {
      activeLabel: document.activeElement?.getAttribute("aria-label") ?? null,
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      itemLabels: menu
        ? Array.from(
            menu.querySelectorAll(":scope > [role=menuitem]"),
            (item) =>
              item.querySelector(".codex-ui-menu-item__label")?.textContent?.trim() ??
              item.querySelector(".codex-ui-menu-item__copy")?.textContent?.trim(),
          )
        : [],
      menu: bounds(menu),
      menuBorderRadius: menuStyle?.borderRadius ?? null,
      separators:
        menu?.querySelectorAll(":scope > [role=separator]").length ?? 0,
      submenuLabels: menu
        ? Array.from(
            menu.querySelectorAll(
              ':scope > [role=menuitem][aria-haspopup="menu"]',
            ),
            (item) => item.textContent?.trim(),
          )
        : [],
      trigger: bounds(trigger),
      triggerBorderRadius: triggerStyle?.borderRadius ?? null,
      triggerExpanded: trigger?.getAttribute("aria-expanded") ?? null,
      triggerPadding: triggerStyle?.padding ?? null,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

function assertOpenState(state, scene) {
  const compact = scene.windowSize.width === 720;
  assert.deepEqual(state.viewport, scene.windowSize);
  assert.equal(state.horizontalOverflow, 0);
  assert.equal(state.triggerExpanded, "true");
  assert.equal(state.triggerBorderRadius, "12.5px");
  assert.equal(state.triggerPadding, "0px");
  assert.ok(state.trigger);
  assert.ok(Math.abs(state.trigger.top - 9) <= 1);
  assert.ok(Math.abs(state.trigger.width - 28) <= 1);
  assert.ok(Math.abs(state.trigger.height - 28) <= 1);
  assert.ok(state.menu);
  assert.ok(Math.abs(state.menu.width - 244) <= 1);
  assert.ok(state.menu.height >= 276 && state.menu.height <= 284);
  assert.ok(Math.abs(state.menu.top - state.trigger.bottom - 4) <= 1);
  assert.ok(Math.abs(state.menu.right - state.trigger.right) <= 1);
  assert.equal(state.menuBorderRadius, "12px");
  assert.equal(state.separators, 3);
  assert.deepEqual(state.itemLabels, [
    "Pin",
    "Rename",
    "Archive",
    "Share",
    "Copy",
    "New side chat",
    "Fork",
    "Add scheduled task…",
    "Open in",
    "Open in new window",
  ]);
  assert.deepEqual(state.submenuLabels, ["Copy›", "Fork›", "Open in›"]);
  assert.equal(compact, scene.windowSize.width === 720);
}

async function compareScreenshot(name, screenshot) {
  const actualPath = join(artifactDirectory, `${name}.png`);
  const baselinePath = join(baselineDirectory, `${name}.png`);
  await writeFile(actualPath, screenshot);
  if (update) {
    await copyFile(actualPath, baselinePath);
    return;
  }
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
    `${name}: own-fixture pixel drift`,
  );
}

async function capture(scene) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    const trigger = page.getByRole("button", { name: "Chat actions" });
    const rootMenu = page.getByRole("menu", { name: "Chat actions" });
    await page.waitForSelector('.codex-ui-thread-overflow-menu[role="menu"]');
    const open = await readState(page);
    assertOpenState(open, scene);
    await writeFile(
      join(artifactDirectory, `${scene.id}.open.json`),
      `${JSON.stringify(open, null, 2)}\n`,
    );
    await compareScreenshot(`${scene.id}-open`, await page.screenshot());

    await rootMenu.press("Escape");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          '.codex-ui-thread-overflow-menu[role="menu"]',
        ).length === 0,
    );
    assert.equal((await readState(page)).triggerExpanded, "false");
    // Make the closed-state capture deterministic: Escape should restore focus
    // to the trigger, and the focus ring is part of the pixel contract.
    await trigger.focus();
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Chat actions",
    );
    await compareScreenshot(`${scene.id}-closed`, await page.screenshot());

    await trigger.press("ArrowDown");
    const pin = page.getByRole("menuitem", { name: /^Pin\s+⌥⌘P$/ });
    await pin.waitFor();
    await page.waitForFunction(
      (element) => document.activeElement === element,
      await pin.elementHandle(),
    );
    const copy = page.getByRole("menuitem", { name: "Copy" });
    await copy.focus();
    await copy.press("ArrowRight");
    const copyMenu = page.getByRole("menu", { name: "Copy options" });
    await copyMenu.waitFor();
    assert.deepEqual(
      (await copyMenu.getByRole("menuitem").allTextContents()).map((value) =>
        value.trim(),
      ),
      ["Copy task link", "Copy Markdown"],
    );
    await copyMenu.press("Escape");
    assert.equal(await rootMenu.count(), 1);
    assert.equal(await copy.getAttribute("aria-expanded"), "false");
    await rootMenu.press("Escape");
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Chat actions",
    );

    await trigger.click();
    await page.getByRole("menuitem", { name: /^Pin\s+⌥⌘P$/ }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".demo-current-thread-overflow-anchor")
          ?.getAttribute("data-thread-overflow-action") === "pin",
    );
    assert.equal(
      await page
        .locator(".demo-current-thread-overflow-anchor")
        .getAttribute("data-thread-overflow-pinned"),
      "true",
    );
    await trigger.click();
    await page.getByRole("menuitem", { name: /^Unpin\s+⌥⌘P$/ }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".demo-current-thread-overflow-anchor")
          ?.getAttribute("data-thread-overflow-action") === "unpin" &&
        document
          .querySelector(".demo-current-thread-overflow-anchor")
          ?.getAttribute("data-thread-overflow-pinned") === "false",
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify({ open, interactions: { copySubmenu: ["Copy task link", "Copy Markdown"], pinState: ["true", "false"] } }, null, 2)}\n`,
    );
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
