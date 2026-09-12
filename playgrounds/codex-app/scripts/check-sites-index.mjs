import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-sites-index-"));
const workspaceScene = visualScenes.find(({ id }) => id === "workspace-environments-unavailable");

async function captureSites(width, suffix) {
  const { app, page } = await launchScene(workspaceScene, {
    capture: false,
    currentSidebar: true,
    windowSize: { height: 820, width },
  });
  try {
    const sites = page.getByRole("button", { name: "Sites", exact: true });
    if (!(await sites.isVisible())) {
      await page.getByRole("button", { name: "Show sidebar", exact: true }).click();
    }
    await sites.click();
    const route = page.getByRole("main", { name: "Sites", exact: true });
    await route.waitFor();
    assert.equal(await page.locator(".demo-root").getAttribute("data-view"), "sites");
    const layout = await page.evaluate(() => {
      const root = document.querySelector(".codex-ui-sites-index");
      const search = root?.querySelector('input[aria-label="Search sites"]');
      const bounds = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return { height: value.height, left: value.left, top: value.top, width: value.width };
      };
      const actionContainer = (element) => {
        if (!(element instanceof Element)) return null;
        const style = getComputedStyle(element);
        return { ...bounds(element), position: style.position, right: style.right };
      };
      return {
        actionCount: root?.querySelectorAll(".codex-ui-sites-index__site-actions button").length,
        actions: Array.from(root?.querySelectorAll(".codex-ui-sites-index__site-actions button") ?? [], bounds),
        actionContainers: Array.from(root?.querySelectorAll(".codex-ui-sites-index__site-actions") ?? [], actionContainer),
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        items: root?.querySelectorAll(".codex-ui-sites-index__site").length,
        root: bounds(root),
        search: bounds(search),
        sites: Array.from(root?.querySelectorAll(".codex-ui-sites-index__site") ?? [], bounds),
      };
    });
    assert.equal(layout.items, 2);
    assert.ok(layout.actionCount >= 4);
    assert.equal(layout.horizontalOverflow, 0);
    assert.ok(layout.root?.width > 0 && layout.search?.width > 0);
    assert.ok(layout.actions.every((action) => (
      action
      && action.height >= 32
      && action.left >= layout.root.left
      && action.left + action.width <= layout.root.left + layout.root.width
    )), `${width}px site actions must remain visible inside the route: ${JSON.stringify(layout)}`);
    const screenshot = await page.screenshot();
    await writeFile(join(directory, `sites-${width}-${suffix}.png`), screenshot);
    return { app, layout, page, route, screenshot };
  } catch (error) {
    await app.close();
    throw error;
  }
}

for (const width of [1180, 720]) {
  const first = await captureSites(width, "first");
  try {
    const search = first.route.getByRole("searchbox", { name: "Search sites", exact: true });
    await search.fill("launch");
    await first.route.getByText("Launch notes", { exact: true }).waitFor();
    assert.equal(await first.route.getByText("Product brief", { exact: true }).count(), 0);
    await search.fill("");
    await first.route.getByRole("button", { name: "Refresh", exact: true }).click();
    assert.equal(await first.route.getAttribute("data-action"), "refresh");
    await first.route.getByRole("button", { name: "Create", exact: true }).click();
    assert.equal(await first.route.getAttribute("data-action"), "create");
    await first.route.getByRole("button", { name: "Open Product brief", exact: true }).click();
    assert.equal(await first.route.getAttribute("data-action"), "open:product-brief");
    await first.route.getByRole("button", { name: "Share Product brief", exact: true }).click();
    assert.equal(await first.route.getAttribute("data-action"), "share:product-brief");
    await first.route.getByRole("button", { name: "More actions for Product brief", exact: true }).click();
    await first.page.getByRole("menuitem", { name: "Copy link", exact: true }).click();
    assert.equal(await first.route.getAttribute("data-action"), "copy-link:product-brief");
  } finally {
    await first.app.close();
  }

  const second = await captureSites(width, "second");
  try {
    const baseline = PNG.sync.read(first.screenshot);
    const replay = PNG.sync.read(second.screenshot);
    assert.equal(replay.width, baseline.width);
    assert.equal(replay.height, baseline.height);
    const mismatch = pixelmatch(
      baseline.data,
      replay.data,
      null,
      baseline.width,
      baseline.height,
      { threshold: 0 },
    );
    assert.equal(mismatch, 0, `${width}px own-fixture pixel gate drifted`);
  } finally {
    await second.app.close();
  }
}

const unavailable = await launchScene(
  {
    currentSidebar: true,
    frame: "sites-unavailable",
    id: "sites-unavailable",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "sites",
  },
  { capture: false, windowSize: { height: 820, width: 1180 } },
);
try {
  const route = unavailable.page.getByRole("main", { name: "Sites", exact: true });
  await route.getByRole("heading", { name: "Sites unavailable", exact: true }).waitFor();
  await route.getByRole("button", { name: "Retry", exact: true }).click();
  await route.getByText("Product brief", { exact: true }).waitFor();
  assert.equal(await route.getAttribute("data-action"), "retry");
} finally {
  await unavailable.app.close();
}

console.log(JSON.stringify({
  directory,
  passed: true,
  pixelGate: "0% own-fixture drift at 1180 and 720",
  widths: [1180, 720],
}));
