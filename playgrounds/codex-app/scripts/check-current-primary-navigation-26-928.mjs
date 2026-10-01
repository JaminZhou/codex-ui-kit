import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";
import {
  assertCurrentBaselineObservationRecord,
  currentUpdatedBuildCandidateBaselineFingerprint,
} from "../../../scripts/current-baseline-contract.mjs";

const reference = JSON.parse(await readFile(
  new URL("../../../research/current-baseline-26.928.21956-candidate.json", import.meta.url),
  "utf8",
));
assertCurrentBaselineObservationRecord(reference, currentUpdatedBuildCandidateBaselineFingerprint);

const viewports = [
  { height: 820, theme: "dark", width: 1180, state: "wideNewChat" },
  { height: 680, theme: "dark", width: 820, state: "mediumNewChat" },
  { height: 680, theme: "dark", width: 721, state: "thresholdNewChat" },
  { height: 680, theme: "dark", width: 720, state: "compactPinned" },
  { height: 820, theme: "light", width: 1180, state: "wideNewChat" },
  { height: 680, theme: "light", width: 720, state: "compactPinned" },
];
const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) <= 0.02,
  `expected ${actual}px to match observed ${expected}px`,
);

for (const viewport of viewports) {
  const scene = {
    currentSidebar: true,
    frame: "sidebar-current",
    id: `current-primary-navigation-26-928-${viewport.theme}-${viewport.width}`,
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-928",
    view: "shell",
    ...viewport,
  };
  const { app, page } = await launchScene(scene, {
    capture: false,
    windowSize: { height: viewport.height, width: viewport.width },
  });
  try {
    await page.waitForSelector('.demo-root[data-current-primary-navigation-26-928="true"]');
    const native = await app.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      return { count: windows.length, bounds: windows[0].getContentBounds() };
    });
    assert.equal(native.count, 1);
    assert.equal(native.bounds.width, viewport.width);
    assert.equal(native.bounds.height, viewport.height);
    const sample = reference.states[viewport.state];
    const readLayout = () => page.evaluate(() => {
      const rail = document.querySelector('.codex-ui-app-primary-navigation-rail');
      const bounds = (element) => {
        const r = element.getBoundingClientRect();
        return { height: r.height, left: r.left, top: r.top, width: r.width };
      };
      return {
        build: rail.getAttribute('data-current-build'),
        overflow: document.documentElement.scrollWidth - innerWidth,
        rail: bounds(rail),
        sidebar: bounds(document.querySelector('.codex-ui-app-shell__sidebar')),
        main: bounds(document.querySelector('.codex-ui-app-shell__main')),
        items: [...rail.querySelectorAll('.codex-ui-app-primary-navigation-rail__items button, .codex-ui-app-primary-navigation-rail__footer button')]
          .map(button => ({ label: button.getAttribute('aria-label'), ...bounds(button) })),
        separator: bounds(rail.querySelector('[role="separator"]')),
        iconStatuses: [...rail.querySelectorAll('[data-current-build-icon-status]')].map(e => e.getAttribute('data-current-build-icon-status')),
      };
    });
    const layout = await readLayout();
    assert.equal(layout.build, reference.baseline.appVersion);
    assert.equal(layout.overflow, 0);
    near(layout.rail.width, sample.navigationRegions[0].rect.width);
    near(layout.sidebar.width, sample.navigationRegions[1].rect.width);
    near(layout.main.left, sample.main[0].left);
    assert.deepEqual(layout.items.map(e => e.label), sample.primaryRailObservation.items.map(e => e.label));
    for (const [index, item] of layout.items.entries()) {
      const expected = sample.primaryRailObservation.items[index].rect;
      for (const key of ['height', 'left', 'top', 'width']) near(item[key], expected[key]);
    }
    assert.deepEqual(layout.separator, { height: 1, left: 14, top: 272, width: 24 });
    assert.deepEqual([...new Set(layout.iconStatuses)], ['pending-26.928-capture']);
    assert.equal(await page.getByRole('button', { name: 'Help menu', exact: true }).count(), 0);
    assert.equal(await page.locator('.codex-ui-app-sidebar__footer').count(), 0);

    // Stable replay pixels only. Product glyphs and personal account content
    // remain absent, so these bytes must never be counted as product parity.
    const capture = async () => {
      await page.mouse.move(viewport.width - 2, viewport.height - 2);
      await page.evaluate(async () => { await document.fonts.ready; });
      return PNG.sync.read(await page.screenshot({
        animations: 'disabled', caret: 'hide',
        clip: { x: 0, y: 44, width: 52, height: viewport.height - 48 },
      }));
    };
    const first = await capture();
    const second = await capture();
    assert.equal(pixelmatch(first.data, second.data, null, first.width, first.height, { threshold: 0 }), 0);

    const profileTrigger = page.getByRole('button', { name: 'Open profile menu' });
    await profileTrigger.click();
    const profile = page.getByRole('menu', { name: 'Profile menu (account content not retained)', exact: true });
    await profile.waitFor();
    const profileBounds = await profile.boundingBox();
    near(profileBounds.width, reference.sidebarLifecycle.helpMenu.opened.menus[0].rect.width);
    near(profileBounds.height, reference.sidebarLifecycle.helpMenu.opened.menus[0].rect.height);
    const helpTrigger = profile.getByRole('menuitem', { name: 'Help', exact: true });
    await helpTrigger.hover();
    const help = page.getByRole('menu', { name: 'Help menu', exact: true });
    await help.waitFor();
    const helpBounds = await help.boundingBox();
    near(helpBounds.width, reference.sidebarLifecycle.helpMenu.opened.menus[1].rect.width);
    near(helpBounds.height, reference.sidebarLifecycle.helpMenu.opened.menus[1].rect.height);
    assert.equal(await help.getByRole('menuitem').count(), 9);
    assert.ok(helpBounds.x >= 0 && helpBounds.x + helpBounds.width <= viewport.width);
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'hidden' });
    await profile.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Open profile menu');
    assert.equal(await page.getByRole('menu').count(), reference.sidebarLifecycle.helpMenu.closed.visibleMenuCount);
    assert.equal(await profileTrigger.evaluate(e => e === document.activeElement), reference.sidebarLifecycle.helpMenu.closed.focusReturned);

    await page.getByRole('button', { name: 'Hide sidebar' }).click();
    await page.getByRole('button', { name: 'Show sidebar' }).waitFor();
    const collapsed = await readLayout();
    near(collapsed.main.left, 52);
    near(collapsed.rail.width, 52);
    assert.equal(collapsed.overflow, 0);
    await page.getByRole('button', { name: 'Show sidebar' }).click();
    await page.getByRole('button', { name: 'Hide sidebar' }).waitFor();
    near((await readLayout()).main.left, layout.main.left);
    console.log(`${scene.id}: observed navigation geometry, profile Help nesting, Escape focus, sidebar restoration, zero replay pixel drift`);
  } finally {
    await app.close();
  }
}
