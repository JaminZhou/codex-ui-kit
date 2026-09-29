import assert from "node:assert/strict";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene } from "./electron-harness.mjs";

const viewports = [
  { height: 820, theme: "dark", width: 1180 },
  { height: 680, theme: "dark", width: 721 },
  { height: 680, theme: "dark", width: 720 },
  { height: 820, theme: "light", width: 1180 },
  { height: 680, theme: "light", width: 720 },
];

async function captureNavigationRegion(page, viewport) {
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.mouse.move(viewport.width - 4, viewport.height - 4);
  return page.screenshot({
    animations: "disabled",
    caret: "hide",
    clip: {
      height: viewport.height - 48,
      width: Math.min(321.875, viewport.width),
      x: 0,
      y: 44,
    },
  });
}

function assertSameRegionPixels(firstBytes, secondBytes, sceneId, state) {
  const first = PNG.sync.read(firstBytes);
  const second = PNG.sync.read(secondBytes);
  assert.equal(first.width, second.width);
  assert.equal(first.height, second.height);
  assert.equal(
    pixelmatch(
      first.data,
      second.data,
      null,
      first.width,
      first.height,
      { threshold: 0 },
    ),
    0,
    `${sceneId} ${state}: own-fixture navigation-region pixel drift`,
  );
}

for (const viewport of viewports) {
  const scene = {
    currentSidebar: true,
    frame: "sidebar-current",
    id: `current-primary-navigation-26-924-${viewport.theme}-${viewport.width}`,
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-924",
    view: "shell",
    ...viewport,
  };
  const { app, page } = await launchScene(scene, {
    capture: false,
    windowSize: { height: viewport.height, width: viewport.width },
  });
  let expandedRegion;
  let collapsedRegion;

  try {
    await page.waitForSelector(
      '.demo-root[data-current-primary-navigation-26-924="true"]',
    );
    const layout = await page.evaluate(() => {
      const bounds = (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect
          ? {
              bottom: rect.bottom,
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            }
          : null;
      };
      const shell = document.querySelector(".codex-ui-app-shell");
      const railAside = shell?.querySelector(
        ".codex-ui-app-shell__navigation-rail",
      );
      const rail = railAside?.querySelector(
        ".codex-ui-app-primary-navigation-rail",
      );
      const itemButtons = Array.from(
        rail?.querySelectorAll(
          ".codex-ui-app-primary-navigation-rail__items button",
        ) ?? [],
      );
      const footerButtons = Array.from(
        rail?.querySelectorAll(
          ".codex-ui-app-primary-navigation-rail__footer button",
        ) ?? [],
      );
      return {
        build: rail?.getAttribute("data-current-build"),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        footerLabels: footerButtons.map((button) =>
          button.getAttribute("aria-label"),
        ),
        iconEvidence: Array.from(
          rail?.querySelectorAll("[data-current-build-icon-status]") ?? [],
          (icon) => icon.getAttribute("data-current-build-icon-status"),
        ),
        homeContentPending: document.querySelector(
          '[data-content-status="not-observed-on-26-924.22138"]',
        )?.textContent,
        itemLabels: itemButtons.map((button) =>
          button.getAttribute("aria-label"),
        ),
        itemRects: itemButtons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { height: rect.height, width: rect.width };
        }),
        layoutMode: shell?.getAttribute("data-layout-mode"),
        main: bounds(".codex-ui-app-shell__main"),
        navigationRail: bounds(".codex-ui-app-shell__navigation-rail"),
        navigationRailInner: bounds(
          ".codex-ui-app-primary-navigation-rail",
        ),
        railPadding: rail ? getComputedStyle(rail).padding : null,
        railGap: rail
          ? getComputedStyle(
              rail.querySelector(
                ".codex-ui-app-primary-navigation-rail__items",
              ),
            ).gap
          : null,
        sidebar: bounds(".codex-ui-app-shell__sidebar"),
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
        theme: document
          .querySelector(".demo-root")
          ?.getAttribute("data-theme"),
      };
    });
    const nativeWindow = await app.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      const active = windows[0];
      const preferences = active?.webContents.getLastWebPreferences();
      return {
        bounds: active?.getContentBounds(),
        count: windows.length,
        contextIsolation: preferences?.contextIsolation,
        nodeIntegration: preferences?.nodeIntegration,
        sandbox: preferences?.sandbox,
      };
    });

    assert.equal(nativeWindow.count, 1);
    assert.equal(nativeWindow.bounds?.width, viewport.width);
    assert.equal(nativeWindow.bounds?.height, viewport.height);
    assert.equal(nativeWindow.contextIsolation, true);
    assert.equal(nativeWindow.nodeIntegration, false);
    assert.equal(nativeWindow.sandbox, true);
    assert.equal(layout.build, "26.924.22138");
    assert.equal(layout.theme, viewport.theme);
    assert.equal(layout.documentOverflow, 0);
    assert.match(
      layout.homeContentPending ?? "",
      /Home \/ New chat content has not been fully captured/,
    );
    assert.equal(layout.sidebarOpen, true);
    assert.deepEqual(layout.itemLabels, [
      "Home",
      "Scheduled",
      "Library",
      "Images",
      "Customize",
      "Explore",
    ]);
    assert.deepEqual(layout.footerLabels, ["Help menu", "Open profile menu"]);
    assert.equal(layout.itemRects.length, 6);
    for (const item of layout.itemRects) {
      assert.deepEqual(item, { height: 36, width: 36 });
    }
    assert.equal(layout.navigationRail?.width, 52);
    assert.equal(layout.sidebar?.left, 52);
    assert.equal(layout.sidebar?.width, 269.875);
    assert.equal(layout.main?.left, 321.875);
    assert.equal(layout.railPadding, "8px 8px 4px");
    assert.equal(layout.railGap, "8px");
    assert.equal(
      new Set(layout.iconEvidence).size,
      1,
      "the structural fixture must keep uncollected product glyphs explicitly pending",
    );
    assert.equal(
      layout.iconEvidence[0],
      "pending-26.924-capture",
    );
    assert.equal(layout.navigationRailInner?.top, 44);
    assert.equal(
      layout.navigationRailInner?.height,
      viewport.height - 48,
      "the rail inner height follows the window height, not a fixed viewport fixture",
    );
    if (viewport.width === 720) {
      assert.equal(layout.layoutMode, "narrow");
      assert.equal(layout.sidebar?.width, 269.875);
    }

    const home = page.getByRole("button", { name: "Home" });
    assert.equal(await home.getAttribute("aria-current"), "page");
    assert.equal(await home.getAttribute("aria-pressed"), "true");
    expandedRegion = await captureNavigationRegion(page, viewport);

    const hideSidebar = page.getByRole("button", { name: "Hide sidebar" });
    await hideSidebar.click();
    await page.getByRole("button", { name: "Show sidebar" }).waitFor();
    const collapsed = await page.evaluate(() => {
      const shell = document.querySelector(".codex-ui-app-shell");
      const rect = (selector) => {
        const value = document.querySelector(selector)?.getBoundingClientRect();
        return value
          ? { left: value.left, width: value.width }
          : null;
      };
      const sidebar = shell?.querySelector(".codex-ui-app-shell__sidebar");
      return {
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        main: rect(".codex-ui-app-shell__main"),
        navigationRail: rect(".codex-ui-app-shell__navigation-rail"),
        sidebar: sidebar
          ? {
              ariaHidden: sidebar.getAttribute("aria-hidden"),
              inert: sidebar.hasAttribute("inert"),
              left: sidebar.getBoundingClientRect().left,
              width: sidebar.getBoundingClientRect().width,
            }
          : null,
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      };
    });
    assert.equal(collapsed.documentOverflow, 0);
    assert.deepEqual(collapsed.navigationRail, { left: 0, width: 52 });
    assert.equal(collapsed.main?.left, 52);
    assert.equal(collapsed.sidebar?.ariaHidden, "true");
    assert.equal(collapsed.sidebar?.inert, true);
    assert.equal(collapsed.sidebarOpen, false);
    collapsedRegion = await captureNavigationRegion(page, viewport);

    await page.getByRole("button", { name: "Show sidebar" }).click();
    await page.getByRole("button", { name: "Hide sidebar" }).waitFor();
    const restored = await page.evaluate(() => {
      const shell = document.querySelector(".codex-ui-app-shell");
      const rect = (selector) => {
        const value = document.querySelector(selector)?.getBoundingClientRect();
        return value
          ? { left: value.left, width: value.width }
          : null;
      };
      return {
        main: rect(".codex-ui-app-shell__main"),
        navigationRail: rect(".codex-ui-app-shell__navigation-rail"),
        sidebar: rect(".codex-ui-app-shell__sidebar"),
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      };
    });
    assert.equal(restored.sidebarOpen, true);
    assert.deepEqual(restored.navigationRail, { left: 0, width: 52 });
    assert.deepEqual(restored.sidebar, {
      left: layout.sidebar.left,
      width: layout.sidebar.width,
    });
    assert.deepEqual(restored.main, {
      left: layout.main.left,
      width: layout.main.width,
    });
    console.log(
      `${scene.id}: 52px rail, 269.875px sidebar and collapse/restore; structural evidence only`,
    );
  } finally {
    await app.close();
  }

  const replay = await launchScene(scene, {
    capture: false,
    windowSize: { height: viewport.height, width: viewport.width },
  });
  try {
    await replay.page.waitForSelector(
      '.demo-root[data-current-primary-navigation-26-924="true"]',
    );
    const repeatedExpanded = await captureNavigationRegion(replay.page, viewport);
    await replay.page.getByRole("button", { name: "Hide sidebar" }).click();
    await replay.page.getByRole("button", { name: "Show sidebar" }).waitFor();
    const repeatedCollapsed = await captureNavigationRegion(replay.page, viewport);
    assertSameRegionPixels(expandedRegion, repeatedExpanded, scene.id, "expanded");
    assertSameRegionPixels(collapsedRegion, repeatedCollapsed, scene.id, "collapsed");
  } finally {
    await replay.app.close();
  }
}

for (const primaryRoute of ["projects", "library", "images"]) {
  const routeTitle =
    primaryRoute === "library"
      ? "Library"
      : primaryRoute === "images"
        ? "Images"
        : "Projects";
  const scene = {
    currentSidebar: true,
    frame: `${primaryRoute}-shell-only-current-26-924`,
    id: `current-primary-navigation-26-924-${primaryRoute}-rail-only`,
    primaryRoute,
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-924",
    theme: "dark",
    view: "projects",
    width: 1180,
    height: 820,
  };
  const replay = await launchScene(scene, {
    capture: false,
    windowSize: { height: scene.height, width: scene.width },
  });
  try {
    await replay.page.waitForSelector(
      `.demo-root[data-current-primary-rail-only-route-26-924="${primaryRoute}"]`,
    );
    const route = await replay.page.evaluate(() => {
      const shell = document.querySelector(".codex-ui-app-shell");
      const bounds = (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect
          ? {
              height: rect.height,
              left: rect.left,
              right: rect.right,
              width: rect.width,
            }
          : null;
      };
      const sidebar = shell?.querySelector(".codex-ui-app-shell__sidebar");
      const pending = document.querySelector(
        '[data-content-status="not-observed-on-26-924.22138"]',
      );
      return {
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        chromeActionLabels: Array.from(
          document.querySelectorAll(
            ".codex-ui-app-window-chrome button",
          ),
          (button) =>
            button.getAttribute("aria-label") ?? button.textContent?.trim(),
        ),
        main: bounds(".codex-ui-app-shell__main"),
        navigationRail: bounds(".codex-ui-app-shell__navigation-rail"),
        activeRailItems: Array.from(
          document.querySelectorAll(
            ".demo-current-primary-navigation-rail button[aria-current='page']",
          ),
          (button) => button.getAttribute("aria-label"),
        ),
        sidebar: sidebar
          ? {
              ariaHidden: sidebar.getAttribute("aria-hidden"),
              inert: sidebar.hasAttribute("inert"),
            }
          : null,
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
        pendingRoute: pending?.getAttribute("data-primary-route"),
        pendingContent: pending?.textContent,
      };
    });
    assert.equal(route.documentOverflow, 0);
    assert.deepEqual(route.navigationRail, {
      height: 772,
      left: 0,
      right: 52,
      width: 52,
    });
    assert.deepEqual(route.sidebar, { ariaHidden: "true", inert: true });
    assert.equal(route.sidebarOpen, false);
    assert.equal(route.main?.left, 52);
    assert.equal(route.main?.width, 1124);
    assert.deepEqual(route.activeRailItems, []);
    assert.equal(route.chromeActionLabels?.includes("Create"), false);
    assert.equal(route.chromeActionLabels?.includes("Show sidebar"), false);
    assert.equal(route.pendingRoute, primaryRoute);
    assert.match(
      route.pendingContent ?? "",
      new RegExp(`${routeTitle} page content has not been captured for build 26\\.924\\.22138`),
    );
    console.log(
      `${scene.id}: 52px rail-only shell; route content explicitly unobserved`,
    );
  } finally {
    await replay.app.close();
  }
}

for (const currentPrimaryRouteShell of [
  "customize",
  "settings-notifications",
]) {
  const routeTitle =
    currentPrimaryRouteShell === "settings-notifications"
      ? "Settings → Notifications"
      : "Customize";
  const scene = {
    currentPrimaryRouteShell,
    currentSidebar: true,
    frame: `${currentPrimaryRouteShell}-route-shell-current-26-924`,
    id: `current-primary-navigation-26-924-${currentPrimaryRouteShell}-route-shell`,
    scenario: "streaming-recovery",
    sidebarState: "primary-navigation-current-26-924",
    theme: "dark",
    view: "shell",
    width: 1180,
    height: 820,
  };
  const replay = await launchScene(scene, {
    capture: false,
    windowSize: { height: scene.height, width: scene.width },
  });
  let firstRegion;
  try {
    await replay.page.waitForSelector(
      `.demo-root[data-current-primary-route-shell-26-924="${currentPrimaryRouteShell}"]`,
    );
    const route = await replay.page.evaluate((expectedRouteShell) => {
      const bounds = (selector) => {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        return rect
          ? {
              left: rect.left,
              right: rect.right,
              width: rect.width,
            }
          : null;
      };
      const shell = document.querySelector(".codex-ui-app-shell");
      const rail = shell?.querySelector(
        ".codex-ui-app-shell__navigation-rail",
      );
      const sidebar = shell?.querySelector(".codex-ui-app-shell__sidebar");
      const pending = document.querySelector(
        `.demo-current-primary-route-pending[data-route-shell="${expectedRouteShell}"]`,
      );
      return {
        activeRailItems: Array.from(
          rail?.querySelectorAll("button[aria-current='page']") ?? [],
          (button) => button.getAttribute("aria-label"),
        ),
        documentOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        main: bounds(".codex-ui-app-shell__main"),
        navigationRail: bounds(
          ".codex-ui-app-shell__navigation-rail",
        ),
        pendingContent: pending?.textContent,
        pendingStatus: pending?.getAttribute("data-content-status"),
        routeShell: document
          .querySelector(".demo-root")
          ?.getAttribute("data-current-primary-route-shell-26-924"),
        sidebar: sidebar
          ? {
              ariaHidden: sidebar.getAttribute("aria-hidden"),
              inert: sidebar.hasAttribute("inert"),
              left: sidebar.getBoundingClientRect().left,
              width: sidebar.getBoundingClientRect().width,
            }
          : null,
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      };
    }, currentPrimaryRouteShell);

    assert.equal(route.documentOverflow, 0);
    assert.equal(route.routeShell, currentPrimaryRouteShell);
    assert.deepEqual(route.navigationRail, {
      left: 0,
      right: 52,
      width: 52,
    });
    assert.deepEqual(route.sidebar, {
      ariaHidden: "false",
      inert: false,
      left: 52,
      width: 269.875,
    });
    assert.equal(route.sidebarOpen, true);
    assert.deepEqual(route.main, {
      left: 321.875,
      right: 1176,
      width: 854.125,
    });
    assert.deepEqual(
      route.activeRailItems,
      [],
      "route-specific active rail state remains unasserted until observed",
    );
    assert.equal(
      route.pendingStatus,
      "not-observed-on-26-924.22138",
    );
    assert.match(
      route.pendingContent ?? "",
      new RegExp(
        `${routeTitle} route body has not been observed for build 26\\.924\\.22138`,
      ),
    );
    firstRegion = await captureNavigationRegion(replay.page, scene);
  } finally {
    await replay.app.close();
  }

  const repeated = await launchScene(scene, {
    capture: false,
    windowSize: { height: scene.height, width: scene.width },
  });
  try {
    await repeated.page.waitForSelector(
      `.demo-root[data-current-primary-route-shell-26-924="${currentPrimaryRouteShell}"]`,
    );
    const repeatedRegion = await captureNavigationRegion(repeated.page, scene);
    assertSameRegionPixels(
      firstRegion,
      repeatedRegion,
      scene.id,
      "expanded shell",
    );
    console.log(
      `${scene.id}: 52px rail + 269.875px sidebar; route body unobserved; repeat drift 0%`,
    );
  } finally {
    await repeated.app.close();
  }
}

console.log(
  "26.924 own-fixture navigation-region pixel drift is 0%; product glyph sources and installed-product pixels remain unverified.",
);
