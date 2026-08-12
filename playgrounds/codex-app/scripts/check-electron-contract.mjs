import { launchScene } from "./electron-harness.mjs";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const scene = {
  frame: "recovered",
  id: "electron",
  scenario: "streaming-recovery",
};
const { app, page } = await launchScene(scene, { capture: false });

try {
  const nativeState = await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows();
    const active = windows[0];
    return {
      bounds: active?.getContentBounds(),
      count: windows.length,
      destroyed: active?.isDestroyed(),
      title: active?.getTitle(),
      webPreferences: active?.webContents.getLastWebPreferences(),
    };
  });

  if (
    nativeState.count !== 1 ||
    nativeState.destroyed ||
    nativeState.bounds?.width !== 1180 ||
    nativeState.bounds?.height !== 820 ||
    nativeState.webPreferences?.contextIsolation !== true ||
    nativeState.webPreferences?.nodeIntegration !== false ||
    nativeState.webPreferences?.sandbox !== true
  ) {
    throw new Error(
      `Electron host contract failed: ${JSON.stringify(nativeState)}`,
    );
  }

  const projectActions = page.getByRole("toolbar", {
    name: "session-browser project actions",
  });
  await projectActions.locator("..").hover();
  const projectActionContract = await projectActions.evaluate((toolbar) => {
    const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
    const rowRect = row?.getBoundingClientRect();
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    const rects = buttons.map((button) => {
      const value = button.getBoundingClientRect();
      return {
        height: value.height,
        rightInset: rowRect ? rowRect.right - value.right : null,
        width: value.width,
      };
    });
    return {
      gap: buttons[1]
        ? buttons[1].getBoundingClientRect().left -
          buttons[0].getBoundingClientRect().right
        : null,
      icons: buttons.map((button) =>
        button
          .querySelector("[data-current-build-icon]")
          ?.getAttribute("data-current-build-icon"),
      ),
      opacity: getComputedStyle(toolbar).opacity,
      rects,
    };
  });
  const taskActions = page.getByRole("toolbar", {
    name: "session-browser task actions",
  });
  await taskActions.locator("..").hover();
  const taskActionContract = await taskActions.evaluate((toolbar) => {
    const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
    const rowRect = row?.getBoundingClientRect();
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    const rects = buttons.map((button) => {
      const value = button.getBoundingClientRect();
      return {
        height: value.height,
        rightInset: rowRect ? rowRect.right - value.right : null,
        width: value.width,
      };
    });
    return {
      gap: buttons[1]
        ? buttons[1].getBoundingClientRect().left -
          buttons[0].getBoundingClientRect().right
        : null,
      icons: buttons.map((button) =>
        button
          .querySelector("[data-current-build-icon]")
          ?.getAttribute("data-current-build-icon"),
      ),
      opacity: getComputedStyle(toolbar).opacity,
      rects,
    };
  });
  const recentActions = page.getByRole("toolbar", {
    name: /Sidebar task actions for/,
  });
  await recentActions.first().locator("..").hover();
  const recentActionContract = await recentActions
    .first()
    .evaluate((toolbar) => {
      const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
      const rowRect = row?.getBoundingClientRect();
      const buttons = Array.from(toolbar.querySelectorAll("button"));
      const rects = buttons.map((button) => {
        const value = button.getBoundingClientRect();
        return {
          height: value.height,
          rightInset: rowRect ? rowRect.right - value.right : null,
          width: value.width,
        };
      });
      return {
        gap: buttons[1]
          ? buttons[1].getBoundingClientRect().left -
            buttons[0].getBoundingClientRect().right
          : null,
        icons: buttons.map((button) =>
          button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
        ),
        opacity: getComputedStyle(toolbar).opacity,
        rects,
      };
    });
  const sidebarAssetContract = await page.evaluate(() => {
    const help = document.querySelector(
      '.codex-ui-app-sidebar-footer__actions button[aria-label="Open help menu"]',
    );
    const icon = help?.querySelector("[data-current-build-icon]");
    const helpRect = help?.getBoundingClientRect();
    const iconRect = icon?.getBoundingClientRect();
    return {
      help: helpRect
        ? {
            height: helpRect.height,
            iconHeight: iconRect?.height,
            iconName: icon?.getAttribute("data-current-build-icon"),
            iconWidth: iconRect?.width,
            width: helpRect.width,
          }
        : null,
      recentItemCount: document.querySelectorAll(
        '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-row',
      ).length,
      recentActionIcons: Array.from(
        document.querySelectorAll(
          '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-actions button [data-current-build-icon]',
        ),
        (currentIcon) =>
          currentIcon.getAttribute("data-current-build-icon"),
      ),
      recentLeadingCount: document.querySelectorAll(
        '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-leading',
      ).length,
      settingsAction: Boolean(
        document.querySelector(
          '.codex-ui-app-sidebar-footer__actions button[aria-label="Open settings"]',
        ),
      ),
    };
  });
  if (
    projectActionContract.opacity !== "1" ||
    projectActionContract.gap !== 6 ||
    JSON.stringify(projectActionContract.icons) !==
      JSON.stringify(["sidebar-more", "sidebar-new-chat"]) ||
    JSON.stringify(projectActionContract.rects) !==
      JSON.stringify([
        { height: 24, rightInset: 32, width: 24 },
        { height: 24, rightInset: 2, width: 24 },
      ]) ||
    taskActionContract.opacity !== "1" ||
    taskActionContract.gap !== 8 ||
    JSON.stringify(taskActionContract.icons) !==
      JSON.stringify(["sidebar-pin", "sidebar-archive"]) ||
    JSON.stringify(taskActionContract.rects) !==
      JSON.stringify([
        { height: 20, rightInset: 32, width: 20 },
        { height: 20, rightInset: 4, width: 20 },
      ]) ||
    recentActionContract.opacity !== "1" ||
    recentActionContract.gap !== 4 ||
    JSON.stringify(recentActionContract.icons) !==
      JSON.stringify(["sidebar-pin", "sidebar-archive"]) ||
    JSON.stringify(recentActionContract.rects) !==
      JSON.stringify([
        { height: 24, rightInset: 32, width: 24 },
        { height: 24, rightInset: 4, width: 24 },
      ]) ||
    sidebarAssetContract.settingsAction ||
    sidebarAssetContract.recentItemCount !== 6 ||
    sidebarAssetContract.recentLeadingCount !== 0 ||
    JSON.stringify(sidebarAssetContract.recentActionIcons) !==
      JSON.stringify(
        Array.from({ length: 6 }, () => [
          "sidebar-pin",
          "sidebar-archive",
        ]).flat(),
      ) ||
    sidebarAssetContract.help?.width !== 32 ||
    sidebarAssetContract.help?.height !== 32 ||
    sidebarAssetContract.help?.iconWidth !== 18 ||
    sidebarAssetContract.help?.iconHeight !== 18 ||
    sidebarAssetContract.help?.iconName !== "sidebar-help"
  ) {
    throw new Error(
      `Electron current-build sidebar action assets failed: ${JSON.stringify({
        projectActionContract,
        recentActionContract,
        sidebarAssetContract,
        taskActionContract,
      })}`,
    );
  }

  const projectGroup = page.getByRole("button", {
    exact: true,
    name: "session-browser",
  });
  const projectTask = page.getByRole("button", {
    exact: true,
    name: "Inspect timeline structure",
  });
  await projectGroup.click();
  const pointerCollapsed = {
    expanded: await projectGroup.getAttribute("aria-expanded"),
    focusOnGroup: await projectGroup.evaluate(
      (element) => document.activeElement === element,
    ),
    taskVisible: await projectTask.isVisible(),
  };
  await projectGroup.press("Enter");
  await projectGroup.press("Space");
  const spaceCollapsed = {
    expanded: await projectGroup.getAttribute("aria-expanded"),
    focusOnGroup: await projectGroup.evaluate(
      (element) => document.activeElement === element,
    ),
    taskVisible: await projectTask.isVisible(),
  };
  await projectGroup.press("Space");
  if (
    pointerCollapsed.expanded !== "false" ||
    !pointerCollapsed.focusOnGroup ||
    pointerCollapsed.taskVisible ||
    spaceCollapsed.expanded !== "false" ||
    !spaceCollapsed.focusOnGroup ||
    spaceCollapsed.taskVisible ||
    (await projectGroup.getAttribute("aria-expanded")) !== "true" ||
    !(await projectTask.isVisible())
  ) {
    throw new Error(
      `Electron project expansion lifecycle failed: ${JSON.stringify({ pointerCollapsed, spaceCollapsed })}`,
    );
  }

  const projectMenuTrigger = page.getByRole("button", {
    name: "Project actions for session-browser",
  });
  await projectActions.locator("..").hover();
  await projectMenuTrigger.click();
  const projectMenu = page.getByRole("menu", {
    name: "session-browser project menu",
  });
  await projectMenu.waitFor({ state: "visible" });
  const projectMenuIcons = await projectMenu
    .locator("[data-current-build-icon]")
    .evaluateAll((icons) =>
      icons.map((icon) => icon.getAttribute("data-current-build-icon")),
    );
  await page.keyboard.press("Escape");
  await projectMenu.waitFor({ state: "hidden" });
  const projectMenuFocusReturned = await projectMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    JSON.stringify(projectMenuIcons) !==
      JSON.stringify([
        "sidebar-project-menu-unpin",
        "sidebar-project-menu-reveal",
        "sidebar-project-menu-worktree",
        "sidebar-project-menu-edit",
        "sidebar-project-menu-archive",
        "sidebar-project-menu-remove",
      ]) ||
    !projectMenuFocusReturned
  ) {
    throw new Error(
      `Electron project menu lifecycle failed: ${JSON.stringify({ projectMenuFocusReturned, projectMenuIcons })}`,
    );
  }

  const helpMenuTrigger = page.getByRole("button", {
    name: "Open help menu",
  });
  await helpMenuTrigger.click();
  const helpMenu = page.getByRole("menu", { name: "Help menu" });
  await helpMenu.waitFor({ state: "visible" });
  const helpMenuIcons = await helpMenu
    .locator("[data-current-build-icon]")
    .evaluateAll((icons) =>
      icons.map((icon) => icon.getAttribute("data-current-build-icon")),
    );
  const helpMenuStructure = await helpMenu.evaluate((menu) => ({
    heading: menu.querySelector(
      ".demo-current-sidebar-help-menu__heading",
    )?.textContent,
    itemCount: menu.querySelectorAll('[role="menuitem"]').length,
    separatorCount: menu.querySelectorAll('[role="separator"]').length,
  }));
  await page.keyboard.press("Escape");
  await helpMenu.waitFor({ state: "hidden" });
  if (
    helpMenuIcons.length !== 8 ||
    helpMenuStructure.heading !== "What's new" ||
    helpMenuStructure.itemCount !== 8 ||
    helpMenuStructure.separatorCount !== 1 ||
    !(await helpMenuTrigger.evaluate(
      (element) => document.activeElement === element,
    ))
  ) {
    throw new Error(
      `Electron Help menu lifecycle failed: ${JSON.stringify({ helpMenuIcons, helpMenuStructure })}`,
    );
  }

  const accountMenuTrigger = page.getByRole("button", {
    exact: true,
    name: "Demo account",
  });
  await accountMenuTrigger.click();
  const accountMenu = page.getByRole("menu", { name: "Account menu" });
  await accountMenu.waitFor({ state: "visible" });
  const accountMenuContract = await accountMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return {
      dividerHeight: menu
        .querySelector(".demo-current-sidebar-account-menu__divider")
        ?.getBoundingClientRect().height,
      focusRole: document.activeElement?.getAttribute("role"),
      icons: Array.from(
        menu.querySelectorAll("[data-current-build-icon]"),
        (icon) => icon.getAttribute("data-current-build-icon"),
      ),
      imageCount: menu.querySelectorAll("img").length,
      itemCount: menu.querySelectorAll('[role="menuitem"]').length,
      rect: { height: bounds.height, width: bounds.width },
      separatorCount: menu.querySelectorAll('[role="separator"]').length,
    };
  });
  await page.keyboard.press("Escape");
  await accountMenu.waitFor({ state: "hidden" });
  accountMenuContract.focusReturned = await accountMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    accountMenuContract.itemCount !== 6 ||
    accountMenuContract.imageCount !== 1 ||
    accountMenuContract.separatorCount !== 0 ||
    accountMenuContract.dividerHeight !== 9 ||
    accountMenuContract.focusRole !== "menuitem" ||
    !accountMenuContract.focusReturned ||
    Math.abs(accountMenuContract.rect.width - 258) > 1 ||
    Math.abs(accountMenuContract.rect.height - 188.38) > 1 ||
    JSON.stringify(accountMenuContract.icons) !==
      JSON.stringify([
        "sidebar-account-menu-usage",
        "sidebar-account-menu-usage-chevron",
        "sidebar-account-menu-pet",
        "sidebar-account-menu-invite",
        "sidebar-account-menu-settings",
        "sidebar-account-menu-logout",
      ])
  ) {
    throw new Error(
      `Electron account menu lifecycle failed: ${JSON.stringify(accountMenuContract)}`,
    );
  }

  const sidebarToggle = page.getByRole("button", { name: "Hide sidebar" });
  await sidebarToggle.click();
  await page.waitForSelector(
    ".codex-ui-app-shell:not([data-sidebar-open])",
  );
  const showSidebar = page.getByRole("button", { name: "Show sidebar" });
  await showSidebar.click();
  await page.waitForSelector(".codex-ui-app-shell[data-sidebar-open]");

  const sidebarResizer = page.getByRole("separator", {
    name: "Resize navigation sidebar",
  });
  const initialSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  const initialResizerBox = await sidebarResizer.boundingBox();
  if (!initialResizerBox || Math.abs(initialSidebarWidth - 274) > 1) {
    throw new Error(
      `Electron navigation resizer baseline failed: ${JSON.stringify({
        initialResizerBox,
        initialSidebarWidth,
      })}`,
    );
  }
  await page.mouse.move(
    initialResizerBox.x + initialResizerBox.width / 2,
    initialResizerBox.y + 200,
  );
  await page.mouse.down();
  await page.mouse.move(
    initialResizerBox.x + initialResizerBox.width / 2 + 64,
    initialResizerBox.y + 200,
    { steps: 8 },
  );
  await page.mouse.up();
  const draggedSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(draggedSidebarWidth - 338) > 1) {
    throw new Error(
      `Electron navigation pointer resize failed: ${draggedSidebarWidth}`,
    );
  }
  await sidebarResizer.press("Home");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  await sidebarResizer.press("ArrowRight");
  const restoredSidebarWidth = await page
    .locator(".codex-ui-app-shell__sidebar")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(restoredSidebarWidth - 272) > 1) {
    throw new Error(
      `Electron navigation keyboard resize failed: ${restoredSidebarWidth}`,
    );
  }

  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const defaultTheme = await page.evaluate(() => ({
    controls: document.querySelectorAll('[aria-label="Theme"]').length,
    html: document.documentElement.dataset.theme,
    root: document.querySelector(".demo-root")?.getAttribute("data-theme"),
  }));
  if (
    defaultTheme.controls !== 0 ||
    defaultTheme.html !== "dark" ||
    defaultTheme.root !== "dark"
  ) {
    throw new Error(
      `Electron default theme contract failed: ${JSON.stringify(defaultTheme)}`,
    );
  }

  await page.getByRole("button", { exact: true, name: "Live" }).click();
  await page.waitForSelector('.demo-root[data-mode="live"]');
  const liveTheme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  if (liveTheme !== "dark") {
    throw new Error(
      `Electron live theme contract failed: ${JSON.stringify(liveTheme)}`,
    );
  }
} finally {
  await app.close();
}

const sidebarStatusScene = {
  currentSidebar: true,
  frame: "sidebar-current",
  id: "electron-current-sidebar-status-lifecycle",
  scenario: "streaming-recovery",
  sidebarState: "status-lifecycle",
};
const { app: sidebarStatusApp, page: sidebarStatusPage } = await launchScene(
  sidebarStatusScene,
  { capture: false },
);

try {
  const statusContract = await sidebarStatusPage.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '[data-sidebar-status-fixture]:not([data-status="idle"])',
      ),
      (item) => {
        const row = item.closest(".codex-ui-app-sidebar__item-row");
        const status = row?.querySelector(
          ".codex-ui-app-sidebar__item-status",
        );
        const attention = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-attention",
        );
        const spinner = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-spinner",
        );
        const error = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-error",
        );
        const metric = (element) => {
          if (!(element instanceof Element)) return null;
          const bounds = element.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        };
        const rowBounds = row?.getBoundingClientRect();
        const statusBounds = status?.getBoundingClientRect();
        return {
          animationDuration: spinner
            ? getComputedStyle(spinner).animationDuration
            : null,
          animationName: spinner
            ? getComputedStyle(spinner).animationName
            : null,
          attentionColor: attention
            ? getComputedStyle(attention).backgroundColor
            : null,
          attentionRect: metric(attention),
          errorRect: metric(error),
          fixture: item.getAttribute("data-sidebar-status-fixture"),
          rowRect: metric(row),
          rightInset:
            rowBounds && statusBounds
              ? rowBounds.right - statusBounds.right
              : null,
          status: status?.getAttribute("data-status"),
          statusOpacity: status ? getComputedStyle(status).opacity : null,
          statusRect: metric(status),
          visualStatus: status?.getAttribute("data-visual-status"),
        };
      },
    ),
  );
  const worktreeContract = await sidebarStatusPage.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        "[data-sidebar-worktree-status-fixture]",
      ),
      (item) => {
        const row = item.closest(".codex-ui-app-sidebar__item-row");
        const status = row?.querySelector(
          ".codex-ui-app-sidebar__item-status",
        );
        const branch = row?.querySelector(
          ".codex-ui-app-sidebar__item-worktree-indicator",
        );
        const description = row?.querySelector(
          ".codex-ui-app-sidebar__item-worktree-description",
        );
        const metric = (element) => {
          if (!(element instanceof Element)) return null;
          const bounds = element.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        };
        const rowBounds = row?.getBoundingClientRect();
        const branchBounds = branch?.getBoundingClientRect();
        const describedBy = new Set(
          item.getAttribute("aria-describedby")?.split(/\s+/) ?? [],
        );
        return {
          branchRect: metric(branch),
          branchRightInset:
            rowBounds && branchBounds
              ? rowBounds.right - branchBounds.right
              : null,
          fixture: item.getAttribute(
            "data-sidebar-worktree-status-fixture",
          ),
          hasActions: row?.hasAttribute("data-has-actions") ?? false,
          itemPaddingInlineEnd: getComputedStyle(item).paddingInlineEnd,
          status: item.getAttribute("data-status"),
          visualStatus: status?.getAttribute("data-visual-status"),
          worktreeDescription:
            description?.textContent?.trim() || null,
          worktreeDescriptionLinked:
            description instanceof HTMLElement &&
            describedBy.has(description.id),
          worktreeStatus: item.getAttribute("data-worktree-status"),
        };
      },
    ),
  );
  const expectedStatuses = [
    ["session-browser:0", "active", "loading"],
    ["desktop-cleanup:0", "waiting", "attention"],
    ["codex-ui-kit:0", "unread", "attention"],
    ["codex-ui-kit:1", "queued", "loading"],
    ["design-assets:0", "loading", "loading"],
    ["design-assets:1", "loading", "loading"],
    ["design-assets:2", "error", "error"],
  ];
  const actualStatuses = statusContract.map(
    ({ fixture, status, visualStatus }) => [fixture, status, visualStatus],
  );
  if (
    JSON.stringify(actualStatuses) !== JSON.stringify(expectedStatuses) ||
    statusContract.some(
      (fixture) =>
        fixture.statusOpacity !== "1" ||
        fixture.rowRect?.height !== 30 ||
        fixture.statusRect?.width !== 20 ||
        fixture.statusRect?.height !== 20 ||
        fixture.rightInset !== 4 ||
        (fixture.visualStatus === "attention" &&
          (fixture.attentionRect?.width !== 8 ||
            fixture.attentionRect?.height !== 8 ||
            fixture.attentionColor !== "rgb(131, 195, 255)")) ||
        (fixture.visualStatus === "error" &&
          (fixture.errorRect?.width !== 16 ||
            fixture.errorRect?.height !== 16)) ||
        (fixture.visualStatus === "loading" &&
          (fixture.animationDuration !== "1e-06s" ||
            fixture.animationName !== "none")),
    )
  ) {
    throw new Error(
      `Electron current sidebar status lifecycle failed: ${JSON.stringify(statusContract)}`,
    );
  }
  const expectedWorktreeStatuses = [
    ["codex-ui-kit:1", "queued", "queued", "loading", null],
    ["design-assets:0", "creating", "loading", "loading", null],
    ["design-assets:1", "setting-up", "loading", "loading", null],
    ["design-assets:2", "failed", "error", "error", null],
    ["protocol-client:0", "restored", "idle", null, "Worktree is restored"],
  ];
  const actualWorktreeStatuses = worktreeContract.map(
    ({
      fixture,
      status,
      visualStatus,
      worktreeDescription,
      worktreeStatus,
    }) => [
      fixture,
      worktreeStatus,
      status,
      visualStatus ?? null,
      worktreeDescription,
    ],
  );
  if (
    JSON.stringify(actualWorktreeStatuses) !==
      JSON.stringify(expectedWorktreeStatuses) ||
    worktreeContract.some(
      (fixture) =>
        fixture.branchRect?.width !== 14 ||
        fixture.branchRect?.height !== 14 ||
        fixture.branchRightInset !==
          (fixture.worktreeStatus === "restored" ? 7 : 35) ||
        (fixture.worktreeStatus === "restored" &&
          (fixture.hasActions ||
            fixture.itemPaddingInlineEnd !== "32px" ||
            !fixture.worktreeDescriptionLinked)),
    )
  ) {
    throw new Error(
      `Electron current sidebar worktree lifecycle failed: ${JSON.stringify(worktreeContract)}`,
    );
  }

  const activeItem = sidebarStatusPage.locator(
    '[data-sidebar-status-fixture="session-browser:0"]',
  );
  const activeRow = activeItem.locator(
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
  if (hovered.actions !== "1" || hovered.status !== "0") {
    throw new Error(
      `Electron current sidebar status/action replacement failed: ${JSON.stringify(hovered)}`,
    );
  }

  const worktreeItem = sidebarStatusPage.locator(
    '[data-sidebar-worktree-status-fixture="design-assets:2"]',
  );
  const worktreeRow = worktreeItem.locator(
    "xpath=ancestor::*[contains(@class, 'codex-ui-app-sidebar__item-row')]",
  );
  await worktreeRow.hover();
  const hoveredWorktree = await worktreeRow.evaluate((row) => ({
    actions: getComputedStyle(
      row.querySelector(".codex-ui-app-sidebar__item-actions"),
    ).opacity,
    branch: getComputedStyle(
      row.querySelector(".codex-ui-app-sidebar__item-worktree-indicator"),
    ).opacity,
  }));
  if (hoveredWorktree.actions !== "1" || hoveredWorktree.branch !== "0") {
    throw new Error(
      `Electron current sidebar worktree/action replacement failed: ${JSON.stringify(hoveredWorktree)}`,
    );
  }
} finally {
  await sidebarStatusApp.close();
}

const themeScene = {
  currentSidebar: true,
  frame: "workspace-ready",
  id: "electron-light-shell",
  scenario: "workspace-workflow",
  theme: "system",
  view: "workspace",
};
const themeWorkspaceGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-theme-branch-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: themeWorkspaceGitDirectory,
});
await execFileAsync(
  "git",
  [
    "-c",
    "user.name=Codex UI Kit",
    "-c",
    "user.email=codex-ui-kit@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "test: initialize theme branch fixture",
  ],
  { cwd: themeWorkspaceGitDirectory },
);
const { app: themeApp, page: themePage } = await launchScene(themeScene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_WORKSPACE: themeWorkspaceGitDirectory,
  },
  nativeThemeSource: "light",
});

try {
  await themePage.emulateMedia({
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const themeControl = themePage.getByRole("combobox", { name: "Theme" });
  const nativeSystemTheme = await themeApp.evaluate(
    ({ BrowserWindow, nativeTheme }) => ({
      background: BrowserWindow.getAllWindows()[0]
        ?.getBackgroundColor()
        .toLowerCase(),
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      themeSource: nativeTheme.themeSource,
    }),
  );
  if (
    (await themeControl.inputValue()) !== "system" ||
    !["#ffffff", "#ffffffff"].includes(
      nativeSystemTheme.background ?? "",
    ) ||
    nativeSystemTheme.shouldUseDarkColors ||
    nativeSystemTheme.themeSource !== "light"
  ) {
    throw new Error(
      `Electron native System theme contract failed: ${JSON.stringify(nativeSystemTheme)}`,
    );
  }

  const themeSidebarResizer = themePage.getByRole("separator", {
    name: "Resize navigation sidebar",
  });
  await themeSidebarResizer.press("Home");
  await themeSidebarResizer.press("ArrowRight");
  await themeSidebarResizer.press("ArrowRight");
  await themeSidebarResizer.press("ArrowRight");
  await themeSidebarResizer.press("ArrowRight");

  await themeControl.click();
  const themePointerContract = await themeControl.evaluate((control) => ({
    active: document.activeElement === control,
  }));
  if (!themePointerContract.active) {
    throw new Error(
      `Electron theme pointer contract failed: ${JSON.stringify(themePointerContract)}`,
    );
  }
  await themeControl.selectOption("dark");
  await themePage.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await themeControl.selectOption("system");
  await themePage.waitForFunction(
    () =>
      document.documentElement.dataset.theme === undefined &&
      document
        .querySelector(".demo-root")
        ?.getAttribute("data-theme") === "system" &&
      getComputedStyle(document.documentElement).colorScheme === "light",
  );

  await themeControl.selectOption("light");
  await themePage.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  const lightTheme = await themePage.evaluate(() => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const value = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        height: value.height,
        width: value.width,
      };
    };
    return {
      activeElement: document.activeElement?.getAttribute("aria-label"),
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      composer: bounds(".codex-ui-composer"),
      html: document.documentElement.dataset.theme,
      main: bounds(".codex-ui-app-shell__main"),
      root: document.querySelector(".demo-root")?.getAttribute("data-theme"),
      sidebar: bounds(".codex-ui-app-shell__sidebar"),
    };
  });
  if (
    lightTheme.activeElement !== "Theme" ||
    lightTheme.colorScheme !== "light" ||
    lightTheme.html !== "light" ||
    lightTheme.root !== "light" ||
    lightTheme.main?.backgroundColor !== "rgb(255, 255, 255)" ||
    Math.abs((lightTheme.sidebar?.width ?? 0) - 272) > 1 ||
    !lightTheme.composer ||
    lightTheme.composer.color !== "rgb(26, 28, 31)"
  ) {
    throw new Error(
      `Electron light theme contract failed: ${JSON.stringify(lightTheme)}`,
    );
  }

  const themeProjectTrigger = themePage.getByRole("button", {
    name: "Change project: codex-ui-kit",
  });
  const themeProjectDialog = themePage.getByRole("dialog", {
    name: "Choose a project",
  });
  await themeProjectTrigger.click();
  const projectOverlayPaint = await themeProjectDialog.evaluate((dialog) => ({
    action: getComputedStyle(
      dialog.querySelector(
        ".demo-workspace-project-dialog__actions button",
      ),
    ).color,
    background: getComputedStyle(dialog).backgroundColor,
    border: getComputedStyle(dialog).borderColor,
    input: getComputedStyle(dialog.querySelector("input")).color,
    option: getComputedStyle(dialog.querySelector('[role="option"]')).color,
  }));
  if (
    projectOverlayPaint.background !== "rgba(255, 255, 255, 0.94)" ||
    projectOverlayPaint.border !== "rgba(26, 28, 31, 0.1)" ||
    projectOverlayPaint.input !== "rgb(26, 28, 31)" ||
    projectOverlayPaint.action !== "rgb(26, 28, 31)" ||
    projectOverlayPaint.option !== "rgb(26, 28, 31)"
  ) {
    throw new Error(
      `Electron light project overlay contract failed: ${JSON.stringify(projectOverlayPaint)}`,
    );
  }
  await themeProjectDialog
    .getByRole("searchbox", { name: "Search projects" })
    .press("Escape");
  await themeProjectDialog.waitFor({ state: "hidden" });

  await themePage
    .getByRole("button", { name: "Change run location: Local" })
    .click();
  const themeEnvironmentMenu = themePage.getByRole("menu", {
    name: "Start in",
  });
  const environmentOverlayPaint = await themeEnvironmentMenu.evaluate(
    (menu) => ({
      background: getComputedStyle(menu).backgroundColor,
      border: getComputedStyle(menu).borderColor,
      item: getComputedStyle(
        menu.querySelector('[role="menuitemradio"]'),
      ).color,
      label: getComputedStyle(
        menu.querySelector(".codex-ui-menu-section-label"),
      ).color,
    }),
  );
  if (
    environmentOverlayPaint.background !== "rgba(255, 255, 255, 0.94)" ||
    environmentOverlayPaint.border !== "rgba(26, 28, 31, 0.1)" ||
    environmentOverlayPaint.item !== "rgb(26, 28, 31)" ||
    environmentOverlayPaint.label !== "rgb(93, 93, 93)"
  ) {
    throw new Error(
      `Electron light environment overlay contract failed: ${JSON.stringify(environmentOverlayPaint)}`,
    );
  }
  await themePage.keyboard.press("Escape");
  await themeEnvironmentMenu.waitFor({ state: "hidden" });

  await themePage
    .getByRole("button", {
      name: "Change worktree: main",
    })
    .click();
  const themeWorktreeMenu = themePage.getByRole("menu", {
    name: "Branches",
  });
  const worktreeOverlayPaint = await themeWorktreeMenu.evaluate((menu) => ({
    background: getComputedStyle(menu).backgroundColor,
    border: getComputedStyle(menu).borderColor,
    input: getComputedStyle(menu.querySelector("input")).color,
    item: getComputedStyle(menu.querySelector('[role="menuitemradio"]')).color,
  }));
  if (
    worktreeOverlayPaint.background !== "rgba(255, 255, 255, 0.94)" ||
    worktreeOverlayPaint.border !== "rgba(26, 28, 31, 0.1)" ||
    worktreeOverlayPaint.input !== "rgb(26, 28, 31)" ||
    worktreeOverlayPaint.item !== "rgb(26, 28, 31)"
  ) {
    throw new Error(
      `Electron light worktree overlay contract failed: ${JSON.stringify(worktreeOverlayPaint)}`,
    );
  }
  await themePage.keyboard.press("Escape");
  await themeWorktreeMenu.waitFor({ state: "hidden" });

  await themePage
    .getByRole("button", {
      exact: true,
      name: "Complete attachment lifecycle test",
    })
    .click();
  await themePage.waitForSelector('.demo-root[data-view="conversation"]');
  const unsupportedTheme = await themePage.evaluate(() => ({
    controls: document.querySelectorAll('[aria-label="Theme"]').length,
    html: document.documentElement.dataset.theme,
    root: document.querySelector(".demo-root")?.getAttribute("data-theme"),
  }));
  if (
    unsupportedTheme.controls !== 0 ||
    unsupportedTheme.html !== "dark" ||
    unsupportedTheme.root !== "dark"
  ) {
    throw new Error(
      `Electron unsupported route theme contract failed: ${JSON.stringify(unsupportedTheme)}`,
    );
  }

  await themePage.getByRole("button", { exact: true, name: "New chat" }).click();
  await themePage.waitForSelector('.demo-root[data-view="workspace"]');
  const restoredTheme = await themePage.evaluate(() => ({
    html: document.documentElement.dataset.theme,
    root: document.querySelector(".demo-root")?.getAttribute("data-theme"),
  }));
  if (
    (await themeControl.inputValue()) !== "light" ||
    restoredTheme.html !== "light" ||
    restoredTheme.root !== "light"
  ) {
    throw new Error(
      `Electron restored workspace theme contract failed: ${JSON.stringify(restoredTheme)}`,
    );
  }
  await themeControl.selectOption("dark");
  await themePage.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
} finally {
  await themeApp.close();
  await rm(themeWorkspaceGitDirectory, { force: true, recursive: true });
}

const shellLightScene = {
  frame: "recovered",
  id: "electron-light-shell-route",
  scenario: "streaming-recovery",
  shellState: "ready",
  theme: "light",
  view: "shell",
};
const { app: shellLightApp, page: shellLightPage } = await launchScene(
  shellLightScene,
  { capture: false },
);

try {
  const shellLightStatus = await shellLightPage.evaluate(() => {
    const main = document.querySelector(".codex-ui-app-shell__main");
    const status = document.querySelector(".demo-shell-route-status");
    return {
      mainBackground: main ? getComputedStyle(main).backgroundColor : null,
      statusBackground: status
        ? getComputedStyle(status).backgroundColor
        : null,
      statusColor: status ? getComputedStyle(status).color : null,
    };
  });
  if (
    shellLightStatus.mainBackground !== "rgb(255, 255, 255)" ||
    shellLightStatus.statusColor !== "rgb(0, 105, 42)"
  ) {
    throw new Error(
      `Electron light shell status contract failed: ${JSON.stringify(shellLightStatus)}`,
    );
  }
} finally {
  await shellLightApp.close();
}

const narrowReachabilityScene = {
  frame: "recovered",
  id: "electron-narrow-reachability",
  scenario: "streaming-recovery",
};
const { app: narrowApp, page: narrowPage } = await launchScene(
  narrowReachabilityScene,
  { capture: false },
);

try {
  const defaultMinimum = await narrowApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getMinimumSize(),
  );
  if (defaultMinimum?.[0] !== 720) {
    throw new Error(
      `Electron default minimum width does not reach narrow mode: ${JSON.stringify(defaultMinimum)}`,
    );
  }
  await narrowApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await narrowPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
  );
  const narrowedState = await narrowApp.evaluate(({ BrowserWindow }) => ({
    bounds: BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    minimum: BrowserWindow.getAllWindows()[0]?.getMinimumSize(),
  }));
  if (
    narrowedState.bounds?.width !== 720 ||
    narrowedState.bounds?.height !== 680
  ) {
    throw new Error(
      `Electron default window did not resize into narrow mode: ${JSON.stringify(narrowedState)}`,
    );
  }
  const showNarrowSidebar = narrowPage.getByRole("button", {
    name: "Show sidebar",
  });
  await showNarrowSidebar.click();
  await narrowPage.waitForSelector(
    ".codex-ui-app-shell[data-layout-mode=\"narrow\"][data-narrow-sidebar-behavior=\"current-build\"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])",
  );
  const pinnedMainWidth = await narrowPage
    .locator(".codex-ui-app-shell__main")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(pinnedMainWidth - 446) > 1) {
    throw new Error(
      `Electron current-build pinned sidebar geometry failed: ${pinnedMainWidth}`,
    );
  }
  await narrowPage
    .getByRole("button", { exact: true, name: "Pull requests" })
    .click();
  await narrowPage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const shell = document.querySelector(".codex-ui-app-shell");
    const main = document.querySelector(".codex-ui-app-shell__main");
    return (
      root?.getAttribute("data-view") === "pull-request" &&
      shell?.hasAttribute("data-sidebar-open") &&
      Math.abs((main?.getBoundingClientRect().width ?? 0) - 446) <= 1
    );
  });
  await narrowPage.getByRole("button", { name: "Hide sidebar" }).click();
  await narrowPage.waitForSelector(
    ".codex-ui-app-shell[data-layout-mode=\"narrow\"]:not([data-sidebar-open]) .codex-ui-app-shell__main:not([inert])",
  );
} finally {
  await narrowApp.close();
}

const shellScene = {
  frame: "shell-offline",
  id: "electron-shell-continuity",
  scenario: "streaming-recovery",
  shellState: "offline",
  view: "shell",
};
const { app: shellApp, page: shellPage } = await launchScene(shellScene, {
  capture: false,
});

try {
  const shellBounds = await shellApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (shellBounds?.width !== 1180 || shellBounds?.height !== 820) {
    throw new Error(
      `Electron shell native bounds failed: ${JSON.stringify(shellBounds)}`,
    );
  }
  const shellChrome = await shellPage.evaluate(() =>
    Array.from(
      document.querySelectorAll(".codex-ui-app-window-chrome button"),
      (button) => {
        const icon = button.querySelector("[data-current-build-icon]");
        const iconRect = icon?.getBoundingClientRect();
        const rect = button.getBoundingClientRect();
        return {
          disabled: button.disabled,
          iconHeight: iconRect?.height,
          iconName: icon?.getAttribute("data-current-build-icon"),
          iconWidth: iconRect?.width,
          label: button.getAttribute("aria-label"),
          left: rect.left,
          size: rect.width,
        };
      },
    ),
  );
  if (
    JSON.stringify(shellChrome) !==
    JSON.stringify([
      {
        disabled: false,
        iconHeight: 16,
        iconName: "window-chrome-sidebar",
        iconWidth: 16,
        label: "Hide sidebar",
        left: 88,
        size: 28,
      },
      {
        disabled: true,
        iconHeight: 16,
        iconName: "window-chrome-back",
        iconWidth: 16,
        label: "Back",
        left: 120,
        size: 28,
      },
      {
        disabled: true,
        iconHeight: 16,
        iconName: "window-chrome-forward",
        iconWidth: 16,
        label: "Forward",
        left: 152,
        size: 28,
      },
    ])
  ) {
    throw new Error(
      `Electron current window chrome assets failed: ${JSON.stringify(shellChrome)}`,
    );
  }
  const shellOffline = shellPage.getByRole("alert");
  if (!(await shellOffline.textContent())?.includes("You’re offline")) {
    throw new Error("Electron shell did not expose the offline route state.");
  }
  await shellPage.getByRole("button", { name: "Try again" }).click();
  await shellPage.waitForSelector(
    '.demo-root[data-shell-state="loading"] .codex-ui-app-route-outlet[data-status="loading"]:not([aria-busy]) > .codex-ui-app-route-outlet__state[role="status"]',
  );
  await shellPage.waitForFunction(
    () =>
      document
        .querySelector(".demo-root")
        ?.getAttribute("data-shell-state") === "ready" &&
      document.querySelector(".codex-ui-app-notification") !== null,
  );
  const restored = await shellPage.evaluate(() => ({
    notification: document
      .querySelector(".codex-ui-app-notification")
      ?.textContent?.replace(/\s+/g, " ").trim(),
    selected: Array.from(
      document.querySelectorAll(
        '.codex-ui-app-sidebar__item[aria-current="page"]',
      ),
      (item) => item.textContent?.trim(),
    ),
  }));
  if (
    !restored.notification?.includes("Connection restored") ||
    restored.selected.length !== 1 ||
    restored.selected[0] !== "Pull requests"
  ) {
    throw new Error(
      `Electron shell retry did not restore route continuity: ${JSON.stringify(restored)}`,
    );
  }

  await shellApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await shellPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open])',
  );
  await shellApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(1180, 820);
  });
  await shellPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="wide"][data-sidebar-open]',
  );
  const resizedSelection = await shellPage.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    selected: Array.from(
      document.querySelectorAll(
        '.codex-ui-app-sidebar__item[aria-current="page"]',
      ),
      (item) => item.textContent?.trim(),
    ),
  }));
  if (
    resizedSelection.overflow > 1 ||
    resizedSelection.selected.length !== 1 ||
    resizedSelection.selected[0] !== "Pull requests"
  ) {
    throw new Error(
      `Electron shell resize lost route selection: ${JSON.stringify(resizedSelection)}`,
    );
  }
} finally {
  await shellApp.close();
}

const attachmentScene = {
  frame: "attachment-ready",
  id: "electron-attachment-lifecycle",
  scenario: "attachment-lifecycle",
};
const { app: attachmentApp, page: attachmentPage } = await launchScene(
  attachmentScene,
  { capture: false },
);

try {
  const composer = attachmentPage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill(
    "Reply using three uppercase words describing this test: attachment, lifecycle, complete. Include a final period and no other text.",
  );
  await composer.press("Enter");
  await attachmentPage.waitForSelector(
    '.demo-root[data-frame="attachment-completed"][data-composer-phase="idle"]',
  );
  await attachmentPage
    .getByText("ATTACHMENT LIFECYCLE COMPLETE.", { exact: true })
    .waitFor();
  await attachmentPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Message composer",
  );
  const attachmentState = await attachmentPage.evaluate(() => ({
    composerAttachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    composerHeight: document
      .querySelector(".codex-ui-composer")
      ?.getBoundingClientRect().height,
    messageAttachmentCount: document.querySelectorAll(
      ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
    ).length,
  }));
  if (
    attachmentState.composerAttachmentCount !== 0 ||
    attachmentState.messageAttachmentCount !== 1 ||
    Math.abs((attachmentState.composerHeight ?? 0) - 98) > 1
  ) {
    throw new Error(
      `Electron attachment lifecycle failed: ${JSON.stringify(attachmentState)}`,
    );
  }
} finally {
  await attachmentApp.close();
}

const repositoryRoot = resolve(process.cwd(), "../..");
const nativeAttachmentScene = {
  frame: "attachment-empty",
  id: "electron-native-attachment-selection",
  scenario: "attachment-lifecycle",
};
const {
  app: nativeAttachmentApp,
  page: nativeAttachmentPage,
} = await launchScene(nativeAttachmentScene, {
  capture: false,
  environment: {
    CODEX_DEMO_ATTACHMENT_FIXTURE_PATHS: JSON.stringify([
      resolve(repositoryRoot, "README.md"),
      resolve(repositoryRoot, "package.json"),
      resolve(repositoryRoot, "tsconfig.json"),
      resolve(repositoryRoot, "src"),
      resolve(repositoryRoot, "research"),
      "/",
    ]),
  },
});
try {
  await nativeAttachmentPage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await nativeAttachmentPage
    .getByRole("option", { name: "Files and folders" })
    .click();
  await nativeAttachmentPage.waitForSelector(
    '.demo-root[data-frame="attachment-native-ready"] .codex-ui-composer-attachment',
  );
  const nativeSelection = await nativeAttachmentPage.evaluate(() => {
    const tray = document.querySelector(".codex-ui-composer__attachments");
    return {
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      labels: Array.from(
        document.querySelectorAll(
          ".codex-ui-composer-attachment__label",
        ),
        (element) => element.textContent?.trim(),
      ),
      overflow: tray ? tray.scrollWidth - tray.clientWidth : null,
      submitDisabled: document
        .querySelector('.codex-ui-composer [data-action="submit"]')
        ?.hasAttribute("disabled"),
    };
  });
  if (
    nativeSelection.attachmentCount !== 6 ||
    !nativeSelection.labels.includes("README.md") ||
    !nativeSelection.labels.includes("src") ||
    !nativeSelection.labels.includes("/") ||
    !(nativeSelection.overflow > 0) ||
    nativeSelection.submitDisabled
  ) {
    throw new Error(
      `Electron native attachment selection failed: ${JSON.stringify(nativeSelection)}`,
    );
  }
  await nativeAttachmentPage
    .getByRole("button", { name: "Remove README.md" })
    .click();
  if (
    (await nativeAttachmentPage
      .locator(".codex-ui-composer .codex-ui-composer-attachment")
      .count()) !== 5
  ) {
    throw new Error("Electron native attachment removal did not update the tray.");
  }
  await nativeAttachmentPage
    .getByRole("button", { name: "Send message" })
    .click();
  await nativeAttachmentPage.waitForSelector(
    '.demo-root[data-frame="attachment-completed"][data-composer-phase="idle"]',
  );
  const submittedNativeAttachments = await nativeAttachmentPage.evaluate(
    () => ({
      composerAttachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      messageAttachmentCount: document.querySelectorAll(
        ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
      ).length,
      messageAttachmentLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
        ),
        (element) => element.getAttribute("aria-label"),
      ),
    }),
  );
  if (
    submittedNativeAttachments.composerAttachmentCount !== 0 ||
    submittedNativeAttachments.messageAttachmentCount !== 5 ||
    submittedNativeAttachments.messageAttachmentLabels.includes("README.md") ||
    !submittedNativeAttachments.messageAttachmentLabels.includes("package.json") ||
    !submittedNativeAttachments.messageAttachmentLabels.includes("src") ||
    !submittedNativeAttachments.messageAttachmentLabels.includes("/")
  ) {
    throw new Error(
      `Electron native attachment submission did not preserve the selected tray: ${JSON.stringify(submittedNativeAttachments)}`,
    );
  }
} finally {
  await nativeAttachmentApp.close();
}

const cancelledAttachmentScene = {
  frame: "attachment-ready",
  id: "electron-cancelled-attachment-selection",
  scenario: "attachment-lifecycle",
};
const {
  app: cancelledAttachmentApp,
  page: cancelledAttachmentPage,
} = await launchScene(cancelledAttachmentScene, {
  capture: false,
  environment: {
    CODEX_DEMO_ATTACHMENT_FIXTURE_PATHS: "[]",
  },
});
try {
  const composer = cancelledAttachmentPage.getByRole("textbox", {
    name: "Message composer",
  });
  const valueBefore = await composer.inputValue();
  await cancelledAttachmentPage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await cancelledAttachmentPage
    .getByRole("option", { name: "Files and folders" })
    .click();
  await cancelledAttachmentPage.waitForSelector(
    '.demo-root[data-frame="attachment-ready"][data-composer-phase="attachment"]',
  );
  await cancelledAttachmentPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const cancelledSelection = await cancelledAttachmentPage.evaluate(() => ({
    attachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    label: document
      .querySelector(".codex-ui-composer-attachment__label")
      ?.textContent?.trim(),
  }));
  if (
    cancelledSelection.attachmentCount !== 1 ||
    cancelledSelection.label !== "codex-ui-kit-current.png" ||
    (await composer.inputValue()) !== valueBefore
  ) {
    throw new Error(
      `Electron cancelled attachment selection changed the draft: ${JSON.stringify(cancelledSelection)}`,
    );
  }
} finally {
  await cancelledAttachmentApp.close();
}

const markdownScene = {
  frame: "markdown-complete",
  id: "electron-markdown",
  scenario: "markdown",
};
const { app: markdownApp, page: markdownPage } = await launchScene(
  markdownScene,
  { capture: false },
);

try {
  const markdownNativeState = await markdownApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (
    markdownNativeState?.width !== 1180 ||
    markdownNativeState?.height !== 820
  ) {
    throw new Error(
      `Electron Markdown native bounds failed: ${JSON.stringify(markdownNativeState)}`,
    );
  }

  await markdownPage.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__codexMarkdownCopiedText = value;
        },
      },
    });
  });
  const markdownCopy = markdownPage.getByRole("button", {
    name: "Copy code",
  });
  await markdownCopy.click();
  await markdownPage.getByRole("button", { name: "Copied" }).waitFor();
  const markdownInteraction = await markdownPage.evaluate(() => {
    const tableScroll = document.querySelector(
      ".codex-ui-markdown__table-scroll",
    );
    tableScroll?.focus();
    return {
      actionCount: document.querySelectorAll(
        '[aria-label="Markdown response actions"] button',
      ).length,
      copiedText: window.__codexMarkdownCopiedText,
      copyFocused:
        document
          .querySelector(".codex-ui-code-block__copy")
          ?.getAttribute("data-copied") === "true",
      linkTarget: document
        .querySelector(
          '[data-item-id="assistant-markdown"] a[href^="https://example.com"]',
        )
        ?.getAttribute("target"),
      tableFocused: document.activeElement === tableScroll,
    };
  });
  if (
    markdownInteraction.actionCount !== 4 ||
    markdownInteraction.copiedText !== "const ready = true;" ||
    !markdownInteraction.copyFocused ||
    markdownInteraction.linkTarget !== "_blank" ||
    !markdownInteraction.tableFocused
  ) {
    throw new Error(
      `Electron Markdown interaction failed: ${JSON.stringify(markdownInteraction)}`,
    );
  }
} finally {
  await markdownApp.close();
}

const markdownStreamingScene = {
  frame: "markdown-stream-complete",
  id: "electron-markdown-streaming-large",
  scenario: "markdown-streaming-large",
};
const {
  app: markdownStreamingApp,
  page: markdownStreamingPage,
} = await launchScene(markdownStreamingScene, { capture: false });

try {
  const nativeBounds = await markdownStreamingApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (nativeBounds?.width !== 1180 || nativeBounds?.height !== 820) {
    throw new Error(
      `Electron streaming Markdown native bounds failed: ${JSON.stringify(nativeBounds)}`,
    );
  }

  await markdownStreamingPage.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__codexMarkdownStreamingCopiedText = value;
        },
      },
    });
  });
  const streamingMessage = markdownStreamingPage.locator(
    '[data-item-id="assistant-markdown-streaming-large"]',
  );
  const tableScroll = streamingMessage.locator(
    ".codex-ui-markdown__table-scroll",
  );
  await tableScroll.scrollIntoViewIfNeeded();
  await tableScroll.focus();

  const copy = streamingMessage.getByRole("button", { name: "Copy code" });
  await copy.click();
  await streamingMessage.getByRole("button", { name: "Copied" }).waitFor();
  const markdownViewport = markdownStreamingPage.locator(
    ".codex-ui-conversation-thread-shell__viewport",
  );
  const markdownScrollToBottom = markdownStreamingPage.getByRole("button", {
    name: "Scroll to bottom",
  });
  await markdownScrollToBottom.click();
  await markdownStreamingPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      viewport instanceof HTMLElement &&
      Math.abs(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ) <= 1
    );
  });
  await markdownScrollToBottom.waitFor({ state: "hidden" });
  await tableScroll.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Streaming Markdown table scroller is not focusable");
    }
    element.focus({ preventScroll: true });
  });
  await markdownViewport.hover();
  await markdownStreamingPage.mouse.wheel(0, -120);
  await markdownScrollToBottom.waitFor({ state: "visible" });
  const awayState = await markdownStreamingPage.evaluate(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    const table = document.querySelector(
      '[data-item-id="assistant-markdown-streaming-large"] .codex-ui-markdown__table-scroll',
    );
    return {
      actionCount: document.querySelectorAll(
        '[aria-label="Markdown response actions"] button',
      ).length,
      copiedText: window.__codexMarkdownStreamingCopiedText,
      distanceFromBottom: viewport
        ? viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop
        : null,
      tableFocused: document.activeElement === table,
    };
  });
  if (
    awayState.actionCount !== 4 ||
    awayState.copiedText !==
      'const chunks = ["link", "list", "code"];\nconsole.log(chunks.join(" -> "));' ||
    (awayState.distanceFromBottom ?? 0) <= 100 ||
    !awayState.tableFocused
  ) {
    throw new Error(
      `Electron streaming Markdown interaction failed: ${JSON.stringify(awayState)}`,
    );
  }

  await markdownScrollToBottom.click();
  await markdownStreamingPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      viewport instanceof HTMLElement &&
      Math.abs(
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      ) <= 1
    );
  });
} finally {
  await markdownStreamingApp.close();
}

const markdownTableActionsScene = {
  frame: "markdown-table-complete",
  id: "electron-markdown-table-actions",
  scenario: "markdown-table-actions",
};
const {
  app: markdownTableActionsApp,
  page: markdownTableActionsPage,
} = await launchScene(markdownTableActionsScene, { capture: false });

try {
  const nativeBounds = await markdownTableActionsApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  if (nativeBounds?.width !== 1180 || nativeBounds?.height !== 820) {
    throw new Error(
      `Electron table actions native bounds failed: ${JSON.stringify(nativeBounds)}`,
    );
  }

  await markdownTableActionsPage.evaluate(() => {
    class TestClipboardItem {
      constructor(items) {
        this.items = items;
      }
    }
    window.ClipboardItem = TestClipboardItem;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async ([item]) => {
          const entries = await Promise.all(
            Object.entries(item.items).map(async ([type, blob]) => [
              type,
              await blob.text(),
            ]),
          );
          window.__codexMarkdownTableClipboard = Object.fromEntries(entries);
        },
        writeText: async (value) => {
          window.__codexMarkdownTableClipboard = { "text/plain": value };
        },
      },
    });
  });
  const tableContainer = markdownTableActionsPage.locator(
    '[data-item-id="assistant-markdown-table-actions"] [data-markdown-table]',
  );
  const tableScroller = tableContainer.locator(
    ".codex-ui-markdown__table-scroll",
  );
  await tableContainer.hover();
  await tableContainer.getByRole("button", { name: "Copy table" }).click();
  await tableContainer.getByRole("button", { name: "Copied" }).waitFor();

  await tableScroller.hover();
  await markdownTableActionsPage.mouse.wheel(360, 0);
  await markdownTableActionsPage.waitForFunction(() => {
    const scroller = document.querySelector(
      '[data-item-id="assistant-markdown-table-actions"] .codex-ui-markdown__table-scroll',
    );
    return scroller instanceof HTMLElement && scroller.scrollLeft > 100;
  });

  await tableContainer.hover();
  const expandButton = tableContainer.getByRole("button", {
    name: "Expand table",
  });
  await expandButton.click();
  const previewDialog = markdownTableActionsPage.getByRole("dialog", {
    name: "Table preview",
  });
  await previewDialog.waitFor({ state: "visible" });
  await markdownTableActionsPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Close table preview",
  );
  const openState = await markdownTableActionsPage.evaluate(() => {
    const dialog = document.querySelector(
      '.codex-ui-dialog__surface[role="dialog"]',
    );
    const previewTable = dialog?.querySelector("table");
    const scroller = document.querySelector(
      '[data-item-id="assistant-markdown-table-actions"] .codex-ui-markdown__table-scroll',
    );
    return {
      activeElement: document.activeElement?.getAttribute("aria-label"),
      clipboard: window.__codexMarkdownTableClipboard,
      columns:
        previewTable instanceof HTMLTableElement
          ? previewTable.rows[0]?.cells.length ?? 0
          : 0,
      rows:
        previewTable instanceof HTMLTableElement
          ? previewTable.rows.length
          : 0,
      scrollLeft: scroller instanceof HTMLElement ? scroller.scrollLeft : 0,
    };
  });
  const previewClose = previewDialog.getByRole("button", {
    name: "Close table preview",
  });
  const previewSurface = previewDialog.locator(
    ".codex-ui-markdown-table-preview__surface",
  );
  const tallPreview = await previewSurface.evaluate((surface) => {
    const body = surface.parentElement;
    const tbody = surface.querySelector("tbody");
    const row = tbody?.lastElementChild;
    if (tbody && row) {
      for (let index = 0; index < 16; index += 1) {
        tbody.append(row.cloneNode(true));
      }
    }
    const bodyStyle = body ? getComputedStyle(body) : null;
    const surfaceStyle = getComputedStyle(surface);
    return {
      bodyClientHeight: body?.clientHeight ?? 0,
      bodyPointerEvents: bodyStyle?.pointerEvents,
      bodyScrollHeight: body?.scrollHeight ?? 0,
      surfaceClientHeight: surface.clientHeight,
      surfaceOverflowY: surfaceStyle.overflowY,
      surfacePointerEvents: surfaceStyle.pointerEvents,
      surfaceScrollHeight: surface.scrollHeight,
    };
  });
  await previewSurface.hover();
  await markdownTableActionsPage.mouse.wheel(0, 480);
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-markdown-table-preview__surface",
      )?.scrollTop ?? 0) > 0,
  );
  const tallPreviewScrollTop = await previewSurface.evaluate(
    (surface) => surface.scrollTop,
  );
  await previewClose.press("Tab");
  await markdownTableActionsPage.waitForFunction(
    () =>
      document.activeElement?.classList.contains(
        "codex-ui-markdown-table-preview__surface",
      ) === true,
  );
  await markdownTableActionsPage.keyboard.press("ArrowRight");
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-markdown-table-preview__surface",
      )?.scrollLeft ?? 0) > 0,
  );
  const previewKeyboard = await markdownTableActionsPage.evaluate(() => {
    const surface = document.querySelector(
      ".codex-ui-markdown-table-preview__surface",
    );
    return {
      active: document.activeElement === surface,
      scrollLeft: surface?.scrollLeft ?? 0,
      tabIndex: surface instanceof HTMLElement ? surface.tabIndex : -1,
    };
  });
  await previewClose.click();
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  const returnedFocus = await markdownTableActionsPage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  const appLayout = markdownTableActionsPage.locator(
    ".codex-ui-app-shell__layout",
  );
  await appLayout.evaluate((layout) => {
    layout.style.setProperty("--codex-ui-app-shell-side-panel-track", "20rem");
  });
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-conversation-thread-shell",
      )?.getBoundingClientRect().width ?? Number.POSITIVE_INFINITY) < 53 * 16,
  );
  await tableContainer.hover();
  await markdownTableActionsPage.waitForTimeout(150);
  const splitPaneState = await markdownTableActionsPage.evaluate(() => {
    const actions = document.querySelector(
      '[data-item-id="assistant-markdown-table-actions"] .codex-ui-markdown__table-actions',
    );
    const container = actions?.closest("[data-markdown-table]");
    const conversation = document.querySelector(
      ".codex-ui-conversation-thread-shell",
    );
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        width: value.width,
      };
    };
    return {
      actions: actions
        ? {
            opacity: getComputedStyle(actions).opacity,
            rect: rect(actions),
          }
        : null,
      buttons: Array.from(actions?.querySelectorAll("button") ?? [], rect),
      container: rect(container),
      conversation: rect(conversation),
      viewportWidth: window.innerWidth,
    };
  });
  await expandButton.click();
  await previewDialog.waitFor({ state: "visible" });
  await previewClose.click();
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  await appLayout.evaluate((layout) => {
    layout.style.removeProperty("--codex-ui-app-shell-side-panel-track");
  });
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-conversation-thread-shell",
      )?.getBoundingClientRect().width ?? 0) >= 53 * 16,
  );
  await markdownTableActionsApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await markdownTableActionsPage.waitForFunction(
    () => window.innerWidth === 720 && window.innerHeight === 680,
  );
  await tableContainer.scrollIntoViewIfNeeded();
  await tableContainer.hover();
  const narrowState = await markdownTableActionsPage.evaluate(() => {
    const actions = document.querySelector(
      '[data-item-id="assistant-markdown-table-actions"] .codex-ui-markdown__table-actions',
    );
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
      };
    };
    const actionsRect =
      actions instanceof Element ? actions.getBoundingClientRect() : null;
    const lowerRailHit = actionsRect
      ? document.elementFromPoint(
          actionsRect.left + actionsRect.width / 2,
          actionsRect.bottom - 8,
        )
      : null;
    return {
      actions: actions
        ? {
            interceptsLowerEdge: Boolean(
              lowerRailHit?.closest(".codex-ui-markdown__table-actions"),
            ),
            pointerEvents: getComputedStyle(actions).pointerEvents,
            rect: rect(actions),
          }
        : null,
      buttons: Array.from(
        actions?.querySelectorAll("button") ?? [],
        (button) => ({
          pointerEvents: getComputedStyle(button).pointerEvents,
          rect: rect(button),
        }),
      ),
      height: window.innerHeight,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      width: window.innerWidth,
    };
  });
  await expandButton.click();
  await previewDialog.waitFor({ state: "visible" });
  await previewDialog
    .getByRole("button", { name: "Close table preview" })
    .click();
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  const narrowReturnedFocus = await markdownTableActionsPage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  if (
    openState.activeElement !== "Close table preview" ||
    openState.columns !== 18 ||
    openState.rows !== 4 ||
    openState.scrollLeft <= 100 ||
    !previewKeyboard.active ||
    previewKeyboard.scrollLeft <= 0 ||
    previewKeyboard.tabIndex !== 0 ||
    tallPreview.bodyPointerEvents !== "none" ||
    tallPreview.bodyScrollHeight - tallPreview.bodyClientHeight > 1 ||
    tallPreview.surfaceOverflowY !== "auto" ||
    tallPreview.surfacePointerEvents !== "auto" ||
    tallPreview.surfaceScrollHeight <= tallPreview.surfaceClientHeight ||
    tallPreviewScrollTop <= 0 ||
    openState.clipboard?.["text/plain"]?.length !== 1_863 ||
    !openState.clipboard?.["text/html"]?.startsWith("<table>") ||
    returnedFocus !== "Expand table" ||
    splitPaneState.viewportWidth !== 1_180 ||
    !splitPaneState.conversation ||
    splitPaneState.conversation.width >= 53 * 16 ||
    !splitPaneState.container ||
    splitPaneState.actions?.opacity !== "1" ||
    !splitPaneState.actions?.rect ||
    splitPaneState.actions.rect.right > splitPaneState.container.right ||
    splitPaneState.actions.rect.left < splitPaneState.conversation.left ||
    splitPaneState.actions.rect.right > splitPaneState.conversation.right ||
    splitPaneState.buttons.some(
      (rect) =>
        !rect ||
        rect.left < splitPaneState.conversation.left ||
        rect.right > splitPaneState.conversation.right,
    ) ||
    narrowState.width !== 720 ||
    narrowState.height !== 680 ||
    narrowState.horizontalOverflow > 1 ||
    !narrowState.actions ||
    narrowState.actions.pointerEvents !== "none" ||
    narrowState.actions.interceptsLowerEdge !== false ||
    !narrowState.actions.rect ||
    narrowState.actions.rect.left < 0 ||
    narrowState.actions.rect.right > narrowState.width ||
    narrowState.buttons.some(
      ({ pointerEvents, rect }) =>
        pointerEvents !== "auto" ||
        !rect ||
        rect.left < 0 ||
        rect.right > narrowState.width,
    ) ||
    narrowReturnedFocus !== "Expand table"
  ) {
    throw new Error(
      `Electron table actions interaction failed: ${JSON.stringify({ narrowReturnedFocus, narrowState, openState, previewKeyboard, returnedFocus, splitPaneState, tallPreview, tallPreviewScrollTop })}`,
    );
  }
} finally {
  await markdownTableActionsApp.close();
}

const mcpScene = {
  frame: "mcp-tool-calls",
  id: "electron-mcp",
  scenario: "mcp-tool-call",
};
const { app: mcpApp, page: mcpPage } = await launchScene(mcpScene, {
  capture: false,
});

try {
  const timelineToggle = mcpPage.getByRole("button", {
    name: "Worked for 31s",
  });
  if ((await timelineToggle.getAttribute("aria-expanded")) !== "false") {
    throw new Error("Electron MCP timeline should start collapsed.");
  }
  await timelineToggle.click();
  const group = mcpPage.getByTestId("mcp-tool-call-group");
  const groupToggle = group.locator(
    ":scope > details > summary",
  );
  if (
    (await groupToggle.getAttribute("aria-expanded")) !== "false" ||
    (await group.getAttribute("data-source")) !== "openaiDeveloperDocs"
  ) {
    throw new Error("Electron MCP integration group baseline is invalid.");
  }
  await groupToggle.click();
  const calls = group.locator(".codex-ui-tool-call");
  if (
    (await calls.count()) !== 2 ||
    (await group.getByText("Search OpenAI docs", { exact: true }).count()) !==
      1 ||
    (await group.getByText("Fetch OpenAI doc", { exact: true }).count()) !== 1
  ) {
    throw new Error("Electron MCP integration did not reveal all calls.");
  }
  await calls.first().locator("summary").click();
  const mcpInteraction = await mcpPage.evaluate(() => {
    const structuredText = document.querySelector(
      ".codex-ui-tool-call__structured",
    )?.textContent;
    let resultHasCanonicalUrl = false;
    try {
      const structuredResult = JSON.parse(structuredText ?? "null");
      resultHasCanonicalUrl =
        typeof structuredResult === "object" &&
        structuredResult !== null &&
        structuredResult.url ===
          "https://learn.chatgpt.com/docs/extend/mcp";
    } catch {
      resultHasCanonicalUrl = false;
    }
    return {
      groupExpanded:
        document
          .querySelector(".codex-ui-mcp-tool-call-group details")
          ?.hasAttribute("open") ?? false,
      resultHasCanonicalUrl,
      timelineExpanded:
        document
          .querySelector(".codex-ui-activity-timeline")
          ?.hasAttribute("data-expanded") ?? false,
    };
  });
  if (
    !mcpInteraction.groupExpanded ||
    !mcpInteraction.resultHasCanonicalUrl ||
    !mcpInteraction.timelineExpanded
  ) {
    throw new Error(
      `Electron MCP interaction failed: ${JSON.stringify(mcpInteraction)}`,
    );
  }
} finally {
  await mcpApp.close();
}

const currentMcpScene = {
  frame: "mcp-current-success",
  id: "electron-current-mcp",
  scenario: "mcp-current-success",
};
const { app: currentMcpApp, page: currentMcpPage } = await launchScene(
  currentMcpScene,
  { capture: false },
);

try {
  const timeline = currentMcpPage.getByRole("button", {
    name: "Worked for 35s",
  });
  if ((await timeline.getAttribute("aria-expanded")) !== "false") {
    throw new Error("Current Electron MCP timeline should start collapsed.");
  }
  await timeline.click();
  const group = currentMcpPage.getByTestId("mcp-tool-call-group");
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const rows = group.locator(".codex-ui-tool-call");
  const rowButtons = rows.getByRole("button");
  const currentState = await currentMcpPage.evaluate(() => ({
    callLabels: Array.from(
      document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
      ),
      (element) => element.textContent?.trim(),
    ),
    labelledButtons: Array.from(
      document.querySelectorAll(
        '.codex-ui-mcp-tool-call-group .codex-ui-tool-call button[aria-labelledby]',
      ),
      (button) => ({
        expanded: button.getAttribute("aria-expanded"),
        label: document
          .getElementById(button.getAttribute("aria-labelledby") ?? "")
          ?.textContent?.trim(),
      }),
    ),
  }));
  if (
    (await rows.count()) !== 3 ||
    (await rowButtons.count()) !== 3 ||
    JSON.stringify(currentState.callLabels) !==
      JSON.stringify([
        "Search OpenAI docs",
        "Search OpenAI docs",
        "Fetch OpenAI doc",
      ]) ||
    currentState.labelledButtons.length !== 3 ||
    currentState.labelledButtons.some(
      ({ expanded, label }) => expanded !== "false" || !label,
    )
  ) {
    throw new Error(
      `Current Electron MCP rows drifted: ${JSON.stringify(currentState)}`,
    );
  }
} finally {
  await currentMcpApp.close();
}

const currentMcpRecoveryScene = {
  frame: "mcp-current-recovery-completed",
  id: "electron-current-mcp-recovery",
  scenario: "mcp-current-recovery",
};
const {
  app: currentMcpRecoveryApp,
  page: currentMcpRecoveryPage,
} = await launchScene(currentMcpRecoveryScene, { capture: false });

try {
  await currentMcpRecoveryPage
    .getByRole("button", { name: "Worked for 16s" })
    .click();
  const group = currentMcpRecoveryPage.getByTestId("mcp-tool-call-group");
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const failedToggle = group.getByRole("button", {
    name: "Fetch OpenAI doc failed",
  });
  await failedToggle.click();
  const wideState = await currentMcpRecoveryPage.evaluate(() => {
    const error = document.querySelector(
      '[data-item-id="mcp-current-fetch-invalid"] .codex-ui-tool-call__error[data-presentation="output"]',
    );
    const bounds = error?.getBoundingClientRect();
    const style = error ? getComputedStyle(error) : null;
    return {
      callLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
        ),
        (element) => element.textContent?.trim(),
      ),
      error: error
        ? {
            backgroundColor: style?.backgroundColor,
            borderColor: style?.borderColor,
            borderRadius: style?.borderRadius,
            height: bounds?.height,
            role: error.getAttribute("role"),
            text: error.textContent?.replace(/\s+/g, " ").trim(),
            width: bounds?.width,
          }
        : null,
      failedExpanded: document
        .querySelector(
          '[data-item-id="mcp-current-fetch-invalid"] button[aria-labelledby]',
        )
        ?.getAttribute("aria-expanded"),
      groupStatus: document
        .querySelector(".codex-ui-mcp-tool-call-group")
        ?.getAttribute("data-status"),
    };
  });
  await currentMcpRecoveryApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await currentMcpRecoveryPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      window.innerHeight === 680 &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
    undefined,
    { timeout: 5_000 },
  );
  const compactState = await currentMcpRecoveryPage.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    visibleNavigation: Array.from(document.querySelectorAll("nav")).some(
      (element) =>
        element instanceof HTMLElement &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
    ),
  }));
  if (
    JSON.stringify(wideState.callLabels) !==
      JSON.stringify([
        "Fetch OpenAI doc",
        "Search OpenAI docs",
        "Fetch OpenAI doc",
      ]) ||
    wideState.error?.role !== "alert" ||
    !wideState.error.text?.includes("plaintextInvalid URL") ||
    wideState.error.backgroundColor !== "rgba(255, 255, 255, 0.05)" ||
    wideState.error.borderColor !== "rgba(255, 255, 255, 0.157)" ||
    wideState.error.borderRadius !== "12.5px" ||
    Math.abs((wideState.error.height ?? 0) - 67.3125) > 1 ||
    (wideState.error.width ?? 0) < 700 ||
    wideState.failedExpanded !== "true" ||
    wideState.groupStatus !== "completed" ||
    compactState.clientWidth !== 720 ||
    compactState.horizontalOverflow > 1 ||
    compactState.visibleNavigation
  ) {
    throw new Error(
      `Current Electron MCP recovery drifted: ${JSON.stringify({ compactState, wideState })}`,
    );
  }
} finally {
  await currentMcpRecoveryApp.close();
}

const currentIntegrationRecoveryScene = {
  frame: "mcp-current-integration-recovered",
  id: "electron-current-integration-recovery",
  scenario: "mcp-current-integration-recovery",
};
const {
  app: currentIntegrationRecoveryApp,
  page: currentIntegrationRecoveryPage,
} = await launchScene(currentIntegrationRecoveryScene, { capture: false });

try {
  const unavailableTimeline = currentIntegrationRecoveryPage.getByRole(
    "button",
    { name: "Worked for 16s" },
  );
  const recoveryTimeline = currentIntegrationRecoveryPage.getByRole(
    "button",
    { name: "Worked for 34s" },
  );
  if (
    (await unavailableTimeline.getAttribute("aria-expanded")) !== "false" ||
    (await recoveryTimeline.getAttribute("aria-expanded")) !== "false"
  ) {
    throw new Error(
      "Current integration recovery timelines should start collapsed.",
    );
  }
  await unavailableTimeline.click();
  await recoveryTimeline.click();
  const group = currentIntegrationRecoveryPage.getByTestId(
    "mcp-tool-call-group",
  );
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const wideState = await currentIntegrationRecoveryPage.evaluate(() => ({
    callLabels: Array.from(
      document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
      ),
      (element) => element.textContent?.trim(),
    ),
    groupExpanded:
      document
        .querySelector(
          ".codex-ui-mcp-tool-call-group > .codex-ui-activity__disclosure",
        )
        ?.getAttribute("data-open") === "true",
    recoveryHref: document
      .querySelector(
        '[data-item-id="assistant-current-integration-recovered"] a',
      )
      ?.getAttribute("href"),
    recoveryText: document
      .querySelector(
        '[data-item-id="assistant-current-integration-recovered"]',
      )
      ?.textContent?.replace(/\s+/g, " ")
      .trim(),
    unavailableCommentary: document
      .querySelector(
        '[data-item-id="assistant-current-integration-unavailable-intro"]',
      )
      ?.textContent?.replace(/\s+/g, " ")
      .trim(),
    unavailableText: document
      .querySelector(
        '[data-item-id="assistant-current-integration-unavailable"]',
      )
      ?.textContent?.trim(),
  }));
  await currentIntegrationRecoveryApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await currentIntegrationRecoveryPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      window.innerHeight === 680 &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
    undefined,
    { timeout: 5_000 },
  );
  const compactState = await currentIntegrationRecoveryPage.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    visibleNavigation: Array.from(document.querySelectorAll("nav")).some(
      (element) =>
        element instanceof HTMLElement &&
        element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
    ),
    groupWidth: document
      .querySelector(".codex-ui-mcp-tool-call-group")
      ?.getBoundingClientRect().width,
  }));
  if (
    wideState.unavailableText !==
      "GitHub MCP integration is unavailable." ||
    !wideState.unavailableCommentary?.includes("GitHub MCP") ||
    JSON.stringify(wideState.callLabels) !==
      JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
    !wideState.groupExpanded ||
    wideState.recoveryHref !==
      "https://learn.chatgpt.com/docs/extend/mcp" ||
    !wideState.recoveryText?.includes(
      "Recovery complete: Model Context Protocol",
    ) ||
    compactState.clientWidth !== 720 ||
    compactState.horizontalOverflow > 1 ||
    compactState.visibleNavigation ||
    Math.abs((compactState.groupWidth ?? 0) - 688) > 1
  ) {
    throw new Error(
      `Current Electron integration recovery drifted: ${JSON.stringify({ compactState, wideState })}`,
    );
  }
} finally {
  await currentIntegrationRecoveryApp.close();
}

const currentMixedToolScene = {
  frame: "current-mixed-completed",
  id: "electron-current-mixed-tool-thread",
  scenario: "current-mixed-tool-thread",
};
const {
  app: currentMixedToolApp,
  page: currentMixedToolPage,
} = await launchScene(currentMixedToolScene, { capture: false });

try {
  const researchTimeline = currentMixedToolPage.getByRole("button", {
    exact: true,
    name: "Worked for 22s",
  });
  const mcpTimeline = currentMixedToolPage.getByRole("button", {
    exact: true,
    name: "Worked for 34s",
  });
  const subagentTimeline = currentMixedToolPage.getByRole("button", {
    exact: true,
    name: "Worked for 45s",
  });
  if (
    (await researchTimeline.getAttribute("aria-expanded")) !== "false" ||
    (await mcpTimeline.getAttribute("aria-expanded")) !== "false" ||
    (await subagentTimeline.getAttribute("aria-expanded")) !== "false"
  ) {
    throw new Error(
      "Current mixed-tool timelines should start collapsed outside capture mode.",
    );
  }

  await researchTimeline.click();
  const search = currentMixedToolPage.locator(
    ".codex-ui-search-activity",
  );
  const browser = currentMixedToolPage.locator(
    ".codex-ui-browser-activity",
  );
  await search.locator("summary").click();
  await browser.locator("summary").click();
  const researchState = await currentMixedToolPage.evaluate(() => ({
    browserExpanded:
      document
        .querySelector(".codex-ui-browser-activity details")
        ?.hasAttribute("open") ?? false,
    browserSteps: Array.from(
      document.querySelectorAll(
        ".codex-ui-browser-activity__steps li",
      ),
      (element) => element.textContent?.replace(/\s+/g, " ").trim(),
    ),
    searchEntries: Array.from(
      document.querySelectorAll(
        ".codex-ui-search-activity__entries li",
      ),
      (element) => element.textContent?.replace(/\s+/g, " ").trim(),
    ),
    searchExpanded:
      document
        .querySelector(".codex-ui-search-activity details")
        ?.hasAttribute("open") ?? false,
  }));

  await mcpTimeline.click();
  const mixedMcpGroup = currentMixedToolPage.getByTestId(
    "mcp-tool-call-group",
  );
  await mixedMcpGroup
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const mcpState = await currentMixedToolPage.evaluate(() => ({
    callLabels: Array.from(
      document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
      ),
      (element) => element.textContent?.trim(),
    ),
    groupExpanded:
      document
        .querySelector(
          ".codex-ui-mcp-tool-call-group > .codex-ui-activity__disclosure",
        )
        ?.getAttribute("data-open") === "true",
    rowDisclosures: Array.from(
      document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call",
      ),
      (element) => {
        const button = element.querySelector("button[aria-labelledby]");
        const labelledBy = button?.getAttribute("aria-labelledby");
        return {
          expanded: button?.getAttribute("aria-expanded"),
          label: labelledBy
            ? document.getElementById(labelledBy)?.textContent?.trim()
            : null,
        };
      },
    ),
    source: document
      .querySelector(".codex-ui-mcp-tool-call-group")
      ?.getAttribute("data-source"),
  }));

  await currentMixedToolPage
    .locator('[data-item-id="file-current-mixed-note"]')
    .getByRole("button", { exact: true, name: "Review" })
    .click();
  await currentMixedToolPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const reviewState = await currentMixedToolPage.evaluate(() => ({
    fileCount: document.querySelectorAll(
      ".codex-ui-file-review__file",
    ).length,
    path: document
      .querySelector(".codex-ui-file-review__file code")
      ?.textContent?.trim(),
  }));

  await subagentTimeline.click();
  await currentMixedToolPage
    .getByRole("button", { name: "Open Mixed audit subagent" })
    .click();
  await currentMixedToolPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="subagent-transcript"]',
  );
  const transcript = (
    await currentMixedToolPage.getByTestId("subagent-transcript").textContent()
  )?.replace(/\s+/g, " ").trim();

  await currentMixedToolApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await currentMixedToolPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      window.innerHeight === 680 &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
    undefined,
    { timeout: 5_000 },
  );
  const compactState = await currentMixedToolPage.evaluate(() => {
    const composer = document.querySelector(".codex-ui-composer");
    return {
      composerWidth: composer?.getBoundingClientRect().width,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      visibleNavigation: Array.from(document.querySelectorAll("nav")).some(
        (element) =>
          element instanceof HTMLElement &&
          element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          }),
      ),
    };
  });

  if (
    !researchState.searchExpanded ||
    JSON.stringify(researchState.searchEntries) !==
      JSON.stringify(["Model Context Protocol"]) ||
    !researchState.browserExpanded ||
    researchState.browserSteps.length !== 2 ||
    JSON.stringify(researchState.browserSteps) !==
      JSON.stringify([
        "Opened https://learn.chatgpt.com/docs/extend/mcp",
        "Found Model Context Protocol in https://learn.chatgpt.com/docs/extend/mcp",
      ]) ||
    !mcpState.groupExpanded ||
    mcpState.source !== "openaiDeveloperDocs" ||
    JSON.stringify(mcpState.callLabels) !==
      JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
    JSON.stringify(mcpState.rowDisclosures) !==
      JSON.stringify([
        { expanded: "false", label: "Search OpenAI docs" },
        { expanded: "false", label: "Fetch OpenAI doc" },
      ]) ||
    reviewState.fileCount !== 1 ||
    reviewState.path !== "research/MIXED_TOOL_THREAD.md" ||
    !transcript?.includes("Mixed audit") ||
    !transcript.includes("All listed mixed-tool surfaces are represented.") ||
    compactState.visibleNavigation ||
    compactState.horizontalOverflow > 1 ||
    Math.abs((compactState.composerWidth ?? 0) - 688) > 1
  ) {
    throw new Error(
      `Current Electron mixed-tool workflow drifted: ${JSON.stringify({ compactState, mcpState, researchState, reviewState, transcript })}`,
    );
  }
} finally {
  await currentMixedToolApp.close();
}

const recoveryScene = {
  frame: "mixed-review-open",
  id: "electron-mcp-recovery-mixed-thread",
  scenario: "mcp-recovery-mixed-thread",
};
const { app: recoveryApp, page: recoveryPage } = await launchScene(
  recoveryScene,
  { capture: false, layoutMode: "wide" },
);

try {
  const recoveryTimeline = recoveryPage.getByRole("button", {
    name: "Worked for 51s",
  });
  await recoveryTimeline.click();
  const recoveryGroup = recoveryPage.getByTestId("mcp-tool-call-group");
  await recoveryGroup.locator(":scope > details > summary").click();
  const recoveryCalls = recoveryGroup.locator(".codex-ui-tool-call");
  const failedCall = recoveryPage.locator(
    '[data-item-id="mcp-fetch-invalid"]',
  );
  await failedCall.locator("summary").click();

  const recoveryInteraction = await recoveryPage.evaluate(() => {
    const group = document.querySelector(
      ".codex-ui-mcp-tool-call-group",
    );
    const failed = document.querySelector(
      '[data-item-id="mcp-fetch-invalid"]',
    );
    return {
      approvalDecision: document
        .querySelector(
          '.codex-ui-approval-request[data-item-id="command-recovery-note"]',
        )
        ?.getAttribute("data-decision"),
      commandCount: document.querySelectorAll(
        ".codex-ui-command-execution",
      ).length,
      errorPresentation: failed
        ?.querySelector(".codex-ui-tool-call__error")
        ?.getAttribute("data-presentation"),
      errorText: failed
        ?.querySelector(".codex-ui-tool-call__error")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      fileCount: document.querySelectorAll(
        ".codex-ui-file-change-group__file",
      ).length,
      groupLabel: group
        ?.querySelector(".codex-ui-mcp-tool-call-group__label")
        ?.textContent?.trim(),
      groupStatus: group?.getAttribute("data-status"),
      reviewFileCount: document.querySelectorAll(
        ".codex-ui-file-review__file",
      ).length,
      reviewPanelOpen: Boolean(
        document.querySelector(
          '.codex-ui-workspace-panel[data-placement="side"]',
        ),
      ),
      toolCount: group?.querySelectorAll(".codex-ui-tool-call").length,
      responseActionLabels: Array.from(
        document.querySelectorAll(".demo-turn-actions"),
        (element) => element.getAttribute("aria-label"),
      ),
      userCount: document.querySelectorAll(
        '.codex-ui-agent-message[data-role="user"]',
      ).length,
    };
  });
  if (
    recoveryInteraction.approvalDecision !== "approved" ||
    recoveryInteraction.commandCount !== 2 ||
    recoveryInteraction.errorPresentation !== "output" ||
    !recoveryInteraction.errorText?.includes("plaintext") ||
    !recoveryInteraction.errorText?.includes("Invalid URL") ||
    recoveryInteraction.fileCount !== 1 ||
    recoveryInteraction.groupLabel !==
      "Used OpenAI Developer Docs integration" ||
    recoveryInteraction.groupStatus !== "completed" ||
    recoveryInteraction.reviewFileCount !== 1 ||
    !recoveryInteraction.reviewPanelOpen ||
    JSON.stringify(recoveryInteraction.responseActionLabels) !==
      JSON.stringify(["MCP response actions", "Response actions"]) ||
    recoveryInteraction.toolCount !== 4 ||
    recoveryInteraction.userCount !== 2
  ) {
    throw new Error(
      `Electron MCP recovery and mixed-thread interaction failed: ${JSON.stringify(recoveryInteraction)}`,
    );
  }

  await recoveryPage.getByRole("button", {
    name: "Show raw tool call output",
  }).click();
  const rawOutputDialog = recoveryPage.getByRole("dialog", {
    name: "Fetch OpenAI doc raw output",
  });
  await rawOutputDialog.waitFor({ state: "visible" });
  const rawOutputText = await rawOutputDialog.textContent();
  if (
    !rawOutputText?.includes("not-a-valid-url") ||
    !rawOutputText.includes("Invalid URL")
  ) {
    throw new Error(
      `Electron MCP raw-output dialog omitted the call payload: ${rawOutputText}`,
    );
  }
  await rawOutputDialog.getByRole("button", {
    name: "Close dialog",
  }).click();
  await rawOutputDialog.waitFor({ state: "hidden" });
} finally {
  await recoveryApp.close();
}

const workflowScene = {
  frame: "review-open",
  id: "electron-workflow",
  scenario: "workspace-workflow",
};
const { app: workflowApp, page: workflowPage } =
  await launchScene(workflowScene, {
    capture: false,
    layoutMode: "wide",
  });

try {
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const reviewResizer = workflowPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  const initialReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  const initialReviewResizerBox = await reviewResizer.boundingBox();
  if (
    !initialReviewResizerBox ||
    Math.abs(initialReviewWidth - 370) > 1 ||
    (await reviewResizer.getAttribute("aria-valuemin")) !== "320" ||
    (await reviewResizer.getAttribute("aria-valuemax")) !== "554"
  ) {
    throw new Error(
      `Electron Review resizer baseline failed: ${JSON.stringify({
        initialReviewResizerBox,
        initialReviewWidth,
      })}`,
    );
  }
  await workflowPage.mouse.move(
    initialReviewResizerBox.x + initialReviewResizerBox.width / 2,
    initialReviewResizerBox.y + 200,
  );
  await workflowPage.mouse.down();
  await workflowPage.mouse.move(
    initialReviewResizerBox.x + initialReviewResizerBox.width / 2 - 64,
    initialReviewResizerBox.y + 200,
    { steps: 8 },
  );
  await workflowPage.mouse.up();
  const draggedReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(draggedReviewWidth - 434) > 1) {
    throw new Error(
      `Electron Review pointer resize failed: ${draggedReviewWidth}`,
    );
  }
  await reviewResizer.press("End");
  const maximumReviewGeometry = await workflowPage.evaluate(() => {
    const shell = document
      .querySelector(".codex-ui-app-shell")
      ?.getBoundingClientRect();
    const header = document
      .querySelector(".codex-ui-thread-header")
      ?.getBoundingClientRect();
    const resizer = document
      .querySelector(".codex-ui-app-shell__side-panel-resizer")
      ?.getBoundingClientRect();
    return {
      ariaMax: document
        .querySelector(".codex-ui-app-shell__side-panel-resizer")
        ?.getAttribute("aria-valuemax"),
      ariaNow: document
        .querySelector(".codex-ui-app-shell__side-panel-resizer")
        ?.getAttribute("aria-valuenow"),
      mainWidth: header?.width,
      trackWidth:
        shell && resizer
          ? shell.right - (resizer.left + resizer.width / 2)
          : null,
    };
  });
  if (
    maximumReviewGeometry.ariaMax !== "554" ||
    maximumReviewGeometry.ariaNow !== "554" ||
    Math.abs((maximumReviewGeometry.mainWidth ?? 0) - 352) > 1 ||
    Math.abs((maximumReviewGeometry.trackWidth ?? 0) - 554) > 1
  ) {
    throw new Error(
      `Electron Review maximum track failed: ${JSON.stringify(maximumReviewGeometry)}`,
    );
  }
  await reviewResizer.press("Home");
  for (let index = 0; index < 6; index += 1) {
    await reviewResizer.press("ArrowLeft");
  }
  const restoredReviewWidth = await workflowPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(restoredReviewWidth - 368) > 1) {
    throw new Error(
      `Electron Review keyboard resize failed: ${restoredReviewWidth}`,
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  const commandDisclosure = workflowPage
    .locator('[data-testid="command-execution"] details')
    .first();
  await commandDisclosure.locator("summary").click();
  if (!(await commandDisclosure.evaluate((element) => element.open))) {
    throw new Error("Electron command disclosure did not expand.");
  }
  const fileGroup = workflowPage.locator(
    '[data-testid="file-change-group"]',
  );
  if (
    (await fileGroup.count()) !== 1 ||
    (await fileGroup.locator(".codex-ui-file-change-group__file").count()) !==
      2
  ) {
    throw new Error("Electron file changes were not aggregated into one card.");
  }
  await workflowPage.getByRole("button", { name: "Open CHECKS.md" }).click();
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const workflowDiff = workflowPage.getByRole("list", {
    name: "Review diff for WORKFLOW.md",
  });
  const checksDiff = workflowPage.getByRole("list", {
    name: "Review diff for CHECKS.md",
  });
  if (
    !(await workflowDiff.isVisible()) ||
    !(await checksDiff.isVisible()) ||
    !(await workflowPage
      .getByRole("listitem", { name: "Review file CHECKS.md" })
      .getAttribute("data-selected"))
  ) {
    throw new Error(
      "Electron Review panel did not preserve both diffs and exact file focus.",
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  await workflowPage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const selectedTerminalText = await workflowPage
    .getByRole("log", { name: "Terminal output" })
    .textContent();
  if (
    !selectedTerminalText?.includes("pnpm test -- protocol-state") ||
    selectedTerminalText.includes("apply_patch WORKFLOW.md")
  ) {
    throw new Error(
      `Electron command-specific Terminal selection failed: ${selectedTerminalText}`,
    );
  }
  const workflowTerminalInput = workflowPage.getByRole("textbox", {
    name: "Terminal input",
  });
  await workflowTerminalInput.fill("first-terminal-only");
  await workflowTerminalInput.press("Enter");
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .nth(1)
    .click();
  const secondTerminalText = await workflowPage
    .getByRole("log", { name: "Terminal output" })
    .textContent();
  if (
    !secondTerminalText?.includes("apply_patch WORKFLOW.md") ||
    secondTerminalText.includes("first-terminal-only")
  ) {
    throw new Error(
      `Electron Terminal local-history isolation failed: ${secondTerminalText}`,
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  if (
    !(await workflowPage
      .getByRole("log", { name: "Terminal output" })
      .textContent())?.includes("first-terminal-only")
  ) {
    throw new Error(
      "Electron Terminal did not restore command-specific local history.",
    );
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Review" })
    .click();
  if (
    !(await workflowDiff.isVisible()) ||
    !(await checksDiff.isVisible())
  ) {
    throw new Error("Electron Review action did not restore both file diffs.");
  }
  await workflowPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await workflowPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  await workflowPage.waitForSelector('[data-testid="file-change-group"]', {
    state: "detached",
  });
} finally {
  await workflowApp.close();
}

const terminalScene = {
  frame: "terminal-open",
  id: "electron-background-terminal",
  scenario: "background-terminal",
};
const { app: terminalApp, page: terminalPage } = await launchScene(
  terminalScene,
  { capture: false },
);

try {
  await terminalPage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const terminalResizer = terminalPage.getByRole("separator", {
    name: "Resize bottom panel",
  });
  const initialTerminal = await terminalPage.evaluate(() => ({
    height: document
      .querySelector(".codex-ui-app-shell__bottom-panel")
      ?.getBoundingClientRect().height,
    input: Boolean(
      document.querySelector('input[aria-label="Terminal input"]'),
    ),
    max: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuemax"),
    min: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuemin"),
    now: document
      .querySelector(".codex-ui-app-shell__bottom-panel-resizer")
      ?.getAttribute("aria-valuenow"),
    transcriptText: document
      .querySelector('[role="log"][aria-label="Terminal output"]')
      ?.textContent,
  }));
  const terminalResizerBox = await terminalResizer.boundingBox();
  if (
    !terminalResizerBox ||
    Math.abs((initialTerminal.height ?? 0) - 272) > 1 ||
    initialTerminal.min !== "152" ||
    initialTerminal.max !== "402" ||
    initialTerminal.now !== "272" ||
    !initialTerminal.input ||
    !initialTerminal.transcriptText?.includes("VITE ready in 438 ms") ||
    !initialTerminal.transcriptText.includes("q")
  ) {
    throw new Error(
      `Electron Terminal baseline failed: ${JSON.stringify(initialTerminal)}`,
    );
  }

  await terminalPage.mouse.move(
    terminalResizerBox.x + terminalResizerBox.width / 2,
    terminalResizerBox.y + terminalResizerBox.height / 2,
  );
  await terminalPage.mouse.down();
  await terminalPage.mouse.move(
    terminalResizerBox.x + terminalResizerBox.width / 2,
    terminalResizerBox.y + terminalResizerBox.height / 2 - 64,
    { steps: 8 },
  );
  await terminalPage.mouse.up();
  const draggedTerminalHeight = await terminalPage
    .locator(".codex-ui-app-shell__bottom-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  if (Math.abs(draggedTerminalHeight - 336) > 1) {
    throw new Error(
      `Electron Terminal pointer resize failed: ${draggedTerminalHeight}`,
    );
  }

  await terminalResizer.press("Home");
  for (let index = 0; index < 15; index += 1) {
    await terminalResizer.press("ArrowUp");
  }
  const keyboardTerminalHeight = await terminalPage
    .locator(".codex-ui-app-shell__bottom-panel")
    .evaluate((element) => element.getBoundingClientRect().height);
  if (Math.abs(keyboardTerminalHeight - 272) > 1) {
    throw new Error(
      `Electron Terminal keyboard resize failed: ${keyboardTerminalHeight}`,
    );
  }

  const terminalInput = terminalPage.getByRole("textbox", {
    name: "Terminal input",
  });
  await terminalInput.fill("pwd");
  await terminalInput.press("Enter");
  if (
    (await terminalInput.inputValue()) !== "" ||
    !(await terminalPage
      .getByRole("log", { name: "Terminal output" })
      .textContent())?.includes(
      "Replay input is host-owned and was not executed.",
    )
  ) {
    throw new Error("Electron Terminal input did not stay host-owned.");
  }

  await terminalPage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await terminalPage.waitForSelector(
    ".codex-ui-app-shell:not([data-bottom-panel-open])",
  );
  const terminalToggle = terminalPage.getByRole("button", {
    name: "Toggle bottom panel",
  });
  if ((await terminalToggle.getAttribute("aria-pressed")) !== "false") {
    throw new Error("Electron Terminal close did not update the toggle.");
  }
  await terminalToggle.click();
  await terminalPage.waitForSelector(
    ".codex-ui-app-shell[data-bottom-panel-open]",
  );
  if (
    Math.abs(
      (await terminalPage
        .locator(".codex-ui-app-shell__bottom-panel")
        .evaluate((element) => element.getBoundingClientRect().height)) - 272,
    ) > 1
  ) {
    throw new Error("Electron Terminal did not restore its last height.");
  }
} finally {
  await terminalApp.close();
}

const terminalLifecycleScene = {
  frame: "terminal-multi-tab",
  id: "electron-terminal-lifecycle",
  scenario: "terminal-lifecycle",
};
const {
  app: terminalLifecycleApp,
  page: terminalLifecyclePage,
} = await launchScene(terminalLifecycleScene, { capture: false });

try {
  const terminalTabs = terminalLifecyclePage.getByRole("tab");
  if (
    (await terminalTabs.count()) !== 3 ||
    (await terminalTabs.nth(0).getAttribute("aria-label")) !==
      "codex-ui-kit 1, Running" ||
    (await terminalTabs.nth(1).getAttribute("aria-label")) !==
      "codex-ui-kit 2, Failed" ||
    (await terminalTabs.nth(2).getAttribute("aria-label")) !==
      "codex-ui-kit 3, Exited" ||
    (await terminalTabs.nth(0).textContent())?.trim() !==
      "●codex-ui-kit 1" ||
    (await terminalTabs.nth(1).textContent())?.trim() !==
      "!codex-ui-kit 2" ||
    (await terminalTabs.nth(2).textContent())?.trim() !==
      "□codex-ui-kit 3" ||
    (await terminalTabs.nth(2).getAttribute("aria-selected")) !== "true"
  ) {
    throw new Error("Electron multi-terminal tab baseline failed.");
  }
  const tabStatuses = await terminalLifecyclePage
    .locator(".codex-ui-terminal-panel__tab-label")
    .evaluateAll((labels) =>
      labels.map((label) => label.getAttribute("data-status")),
    );
  if (
    JSON.stringify(tabStatuses) !==
    JSON.stringify(["running", "failed", "exited"])
  ) {
    throw new Error(
      `Electron multi-terminal statuses failed: ${JSON.stringify(tabStatuses)}`,
    );
  }

  await terminalTabs.nth(2).focus();
  await terminalTabs.nth(2).press("ArrowLeft");
  const failedTab = terminalLifecyclePage.getByRole("tab", {
    name: "codex-ui-kit 2, Failed",
    selected: true,
  });
  if (
    !(await failedTab.isVisible()) ||
    (await terminalLifecyclePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "codex-ui-kit 2, Failed"
  ) {
    throw new Error("Electron Terminal ArrowLeft navigation failed.");
  }

  const terminalInput = terminalLifecyclePage.getByRole("textbox", {
    name: "Terminal input",
  });
  await terminalInput.fill("retry");
  await terminalLifecyclePage
    .getByRole("tab", { name: "codex-ui-kit 1, Running" })
    .click();
  await terminalInput.fill("status");
  await terminalLifecyclePage
    .getByRole("tab", { name: "codex-ui-kit 2, Failed" })
    .click();
  if ((await terminalInput.inputValue()) !== "retry") {
    throw new Error(
      "Electron Terminal did not preserve per-session controlled input.",
    );
  }
  for (let index = 0; index < 10; index += 1) {
    await terminalInput.fill(`history-${index}`);
    await terminalInput.press("Enter");
  }
  const terminalTranscript = terminalLifecyclePage.locator(
    ".codex-ui-terminal-transcript",
  );
  const terminalScrollRange = await terminalTranscript.evaluate(
    (element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }),
  );
  if (
    terminalScrollRange.scrollHeight <= terminalScrollRange.clientHeight
  ) {
    throw new Error(
      "Electron Terminal history did not become scrollable.",
    );
  }
  await terminalTranscript.evaluate((element) => {
    element.scrollTop = 0;
  });
  await terminalInput.fill("draft while reviewing history");
  if (
    (await terminalTranscript.evaluate((element) => element.scrollTop)) >
    1
  ) {
    throw new Error(
      "Electron Terminal typing changed the reviewed transcript position.",
    );
  }

  await terminalLifecyclePage
    .getByRole("button", { name: "Close codex-ui-kit 2 tab" })
    .click();
  const selectedAfterClose = terminalLifecyclePage.getByRole("tab", {
    name: "codex-ui-kit 2, Exited",
    selected: true,
  });
  if (
    !(await selectedAfterClose.isVisible()) ||
    (await terminalLifecyclePage.getByRole("tab").count()) !== 2
  ) {
    throw new Error(
      "Electron Terminal close did not select the nearest remaining tab.",
    );
  }

  await terminalLifecyclePage
    .getByRole("button", { name: "Open bottom panel tab" })
    .click();
  const terminalPicker = terminalLifecyclePage.getByRole("menu", {
    name: "Open bottom panel tab",
  });
  if (
    !(await terminalPicker.isVisible()) ||
    (await terminalPicker.getByRole("menuitem").count()) !== 4
  ) {
    throw new Error("Electron Terminal tab picker did not open.");
  }
  await terminalPicker
    .getByRole("menuitem", { name: "Terminal" })
    .click();
  if (
    (await terminalLifecyclePage.getByRole("tab").count()) !== 3 ||
    !(await terminalLifecyclePage
      .getByRole("tab", {
        name: "codex-ui-kit 3",
        selected: true,
      })
      .isVisible())
  ) {
    throw new Error("Electron Terminal picker did not create a session.");
  }

  for (let count = 3; count > 0; count -= 1) {
    const selected = terminalLifecyclePage.locator(
      '[role="tab"][aria-selected="true"]',
    );
    const label = (await selected.getAttribute("aria-label"))?.replace(
      /, (Exited|Failed|Idle|Restoring|Running)$/,
      "",
    );
    if (!label) {
      throw new Error("Electron Terminal selected tab lost its label.");
    }
    await terminalLifecyclePage
      .getByRole("button", { name: `Close ${label} tab` })
      .click();
  }
  await terminalLifecyclePage.waitForSelector(
    ".codex-ui-app-shell:not([data-bottom-panel-open])",
  );
  if (
    (await terminalLifecyclePage
      .getByRole("button", { name: "Restore last terminal" })
      .count()) !== 0
  ) {
    throw new Error("Electron Terminal retained stale restore UI.");
  }
  await terminalLifecyclePage
    .getByRole("button", { name: "Toggle bottom panel" })
    .click();
  if (
    !(await terminalLifecyclePage
      .getByRole("tab", {
        name: "codex-ui-kit",
        selected: true,
      })
      .isVisible()) ||
    (await terminalLifecyclePage
      .getByRole("log", { name: "Terminal output" })
      .textContent()) !== ""
  ) {
    throw new Error("Electron Terminal did not reopen a fresh local session.");
  }

  await terminalLifecyclePage
    .getByRole("button", { name: /Failed process/ })
    .click();
  if (
    (await terminalLifecyclePage
      .locator(
        '[role="tab"][aria-selected="true"] .codex-ui-terminal-panel__tab-label',
      )
      .getAttribute("data-status")) !== "failed"
  ) {
    throw new Error(
      "Electron background process selection did not reopen the failed terminal.",
    );
  }
} finally {
  await terminalLifecycleApp.close();
}

const currentTerminalScene = {
  frame: "terminal-current-mismatch",
  id: "electron-current-terminal-mismatch",
  scenario: "terminal-lifecycle",
};
const {
  app: currentTerminalApp,
  page: currentTerminalPage,
} = await launchScene(currentTerminalScene, { capture: false });

try {
  const currentTabs = currentTerminalPage.getByRole("tab");
  if (
    (await currentTabs.count()) !== 2 ||
    !(await currentTabs.nth(0).textContent())?.trim().endsWith("assets 1") ||
    !(await currentTabs.nth(1).textContent())
      ?.trim()
      .endsWith("codex-ui-kit 2") ||
    (await currentTabs.nth(1).getAttribute("aria-label")) !==
      "codex-ui-kit 2"
  ) {
    throw new Error("Electron current Terminal labels drifted.");
  }
  const currentTerminalPanel = currentTerminalPage.getByTestId("terminal-panel");
  const mismatch = currentTerminalPanel.getByRole("status");
  if (
    !(await mismatch.textContent())?.includes(
      "does not match this chat's current worktree",
    )
  ) {
    throw new Error("Electron current Terminal mismatch notice is missing.");
  }
  await mismatch
    .getByRole("button", { name: "Open new terminal" })
    .click();
  if (
    (await currentTabs.count()) !== 3 ||
    !(await currentTerminalPage
      .getByRole("tab", { name: "assets 3", selected: true })
      .isVisible()) ||
    (await currentTerminalPanel.getByRole("status").count()) !== 0
  ) {
    throw new Error(
      "Electron current Terminal mismatch recovery did not open the matching workspace.",
    );
  }
} finally {
  await currentTerminalApp.close();
}

const pullRequestScene = {
  frame: "pr-summary-ready",
  id: "electron-pull-request-detail",
  scenario: "workspace-workflow",
  view: "pull-request",
};
const { app: pullRequestApp, page: pullRequestPage } = await launchScene(
  pullRequestScene,
  { capture: false, layoutMode: "wide" },
);

try {
  await pullRequestPage.waitForSelector(
    '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
  );
  const pullRequestGeometry = await pullRequestPage.evaluate(() => {
    const bounds = (selector) =>
      document.querySelector(selector)?.getBoundingClientRect().toJSON() ??
      null;
    return {
      main: bounds(".codex-ui-app-shell__main"),
      panel: bounds(".codex-ui-app-shell__side-panel"),
      resizer: bounds(".codex-ui-app-shell__side-panel-resizer"),
      selectedTab: document
        .querySelector('[aria-label="Pull request view"] [aria-selected="true"]')
        ?.textContent?.trim(),
    };
  });
  if (
    !pullRequestGeometry.main ||
    !pullRequestGeometry.panel ||
    !pullRequestGeometry.resizer ||
    Math.abs(pullRequestGeometry.main.width - 906) > 1 ||
    Math.abs(pullRequestGeometry.panel.width - 370) > 1 ||
    Math.abs(pullRequestGeometry.resizer.width - 16) > 0.5 ||
    pullRequestGeometry.selectedTab !== "Summary"
  ) {
    throw new Error(
      `Electron pull request baseline failed: ${JSON.stringify(pullRequestGeometry)}`,
    );
  }

  if (
    (await pullRequestPage
      .getByLabel("Pull request timeline")
      .locator("article")
      .count()) !== 2
  ) {
    throw new Error("Electron pull request integrated timeline is missing.");
  }
  await pullRequestPage.getByRole("tab", { name: "Code" }).click();
  if (
    (await pullRequestPage
      .getByRole("list", { name: "Pull request code review" })
      .getAttribute("data-file-count")) !== "3"
  ) {
    throw new Error("Electron pull request Code tab did not render three files.");
  }
  await pullRequestPage
    .getByRole("button", { name: "Review options" })
    .click();
  await pullRequestPage
    .getByRole("menuitem", { name: "Open synthetic review" })
    .click();
  await pullRequestPage
    .getByRole("textbox", { name: "Review summary" })
    .fill("Current-head review is clean.");
  await pullRequestPage
    .getByRole("button", { name: "Submit review" })
    .click();
  await pullRequestPage.waitForSelector(
    '.codex-ui-pull-request-review-composer[data-status="submitted"]',
  );
  const mergePullRequest = pullRequestPage.getByRole("button", {
    exact: true,
    name: "Merge",
  });
  if (!(await mergePullRequest.isEnabled())) {
    throw new Error(
      "Electron pull request review did not unlock the merge action.",
    );
  }
  await mergePullRequest.click();
  await pullRequestPage
    .getByRole("button", { exact: true, name: "Merged" })
    .waitFor();

  const pullRequestResizer = pullRequestPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  const pullRequestResizerBox = await pullRequestResizer.boundingBox();
  if (!pullRequestResizerBox) {
    throw new Error("Electron pull request resize separator is missing.");
  }
  await pullRequestPage.mouse.move(
    pullRequestResizerBox.x + pullRequestResizerBox.width / 2,
    pullRequestResizerBox.y + 200,
  );
  await pullRequestPage.mouse.down();
  await pullRequestPage.mouse.move(
    pullRequestResizerBox.x + pullRequestResizerBox.width / 2 + 64,
    pullRequestResizerBox.y + 200,
    { steps: 8 },
  );
  await pullRequestPage.mouse.up();
  const narrowedPullRequestWidth = await pullRequestPage
    .locator(".codex-ui-app-shell__side-panel")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(narrowedPullRequestWidth - 322) > 1) {
    throw new Error(
      `Electron pull request pointer resize failed: ${narrowedPullRequestWidth}`,
    );
  }
  await pullRequestResizer.press("End");

  await pullRequestPage.getByRole("button", { name: "Expand panel" }).click();
  const expandedPullRequest = await pullRequestPage.evaluate(() => ({
    expanded: document
      .querySelector(".codex-ui-app-shell")
      ?.hasAttribute("data-side-panel-expanded"),
    panelWidth: document
      .querySelector(".codex-ui-app-shell__side-panel")
      ?.getBoundingClientRect().width,
    resizer: Boolean(
      document.querySelector(".codex-ui-app-shell__side-panel-resizer"),
    ),
  }));
  if (
    !expandedPullRequest.expanded ||
    expandedPullRequest.resizer ||
    Math.abs((expandedPullRequest.panelWidth ?? 0) - 906) > 1
  ) {
    throw new Error(
      `Electron pull request expansion failed: ${JSON.stringify(expandedPullRequest)}`,
    );
  }
  await pullRequestPage
    .getByRole("button", { name: "Restore panel width" })
    .click();
  await pullRequestPage.getByRole("tab", { name: "Summary" }).click();
  await pullRequestPage
    .getByRole("textbox", { name: "Comment" })
    .fill("Current-head checks are green.");
  await pullRequestPage
    .getByRole("button", { name: "Post comment" })
    .click();
  await pullRequestPage.waitForSelector(
    '.codex-ui-pull-request-comment-composer[data-status="submitted"]',
  );
  await pullRequestPage.getByRole("button", { name: "Live local" }).click();
  await pullRequestPage.waitForSelector(
    '.demo-root[data-view="conversation"][data-mode="live"]',
  );
  if (
    (await pullRequestPage
      .getByRole("button", { name: "Live local" })
      .getAttribute("aria-current")) !== "page" ||
    (await pullRequestPage
      .getByRole("button", { name: "Pull requests" })
      .getAttribute("aria-current")) !== null
  ) {
    throw new Error(
      "Electron Live local navigation did not leave the pull request view.",
    );
  }
  await pullRequestPage
    .getByRole("button", { name: "Pull requests" })
    .click();
  await pullRequestPage.waitForSelector(
    '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
  );
  if (
    (await pullRequestPage
      .getByRole("button", {
        name: "Open pull request 80: feat: add terminal session lifecycle",
      })
      .getAttribute("aria-current")) !== "page" ||
    (await pullRequestPage
      .getByRole("tab", { name: "Summary" })
      .getAttribute("aria-selected")) !== "true"
  ) {
    throw new Error(
      "Electron pull request route did not restore its selected detail.",
    );
  }
} finally {
  await pullRequestApp.close();
}

const compactScene = {
  frame: "review-open",
  id: "electron-multi-file-compact",
  scenario: "multi-file-review",
};
const { app: compactApp, page: compactPage } = await launchScene(
  compactScene,
  {
    capture: false,
    windowSize: { height: 600, width: 800 },
  },
);

try {
  const compactNativeState = await compactApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/alpha.txt",
    })
    .click();
  await compactPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const compactContract = await compactPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
      };
    };
    const headerActions = document.querySelector(".demo-header-actions");
    return {
      backdropVisible:
        window.getComputedStyle(
          document.querySelector(
            '.codex-ui-app-shell__backdrop[data-backdrop="side-panel"]',
          ),
        ).display !== "none",
      fileGroups: document.querySelectorAll(
        ".codex-ui-file-change-group",
      ).length,
      fileRows: document.querySelectorAll(
        ".codex-ui-file-change-group__file",
      ).length,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      headerActionsVisible:
        headerActions !== null &&
        window.getComputedStyle(headerActions).visibility === "visible",
      layoutMode: document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode"),
      main: rect(".codex-ui-app-shell__main"),
      mainAriaHidden: document
        .querySelector(".codex-ui-app-shell__main")
        ?.getAttribute("aria-hidden"),
      mainInert: document
        .querySelector(".codex-ui-app-shell__main")
        ?.hasAttribute("inert"),
      reviewDiffs: document.querySelectorAll(
        ".codex-ui-file-review .codex-ui-file-diff",
      ).length,
      sidePanelResizer: (() => {
        const element = document.querySelector(
          ".codex-ui-app-shell__side-panel-resizer",
        );
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return {
          ariaMax: element.getAttribute("aria-valuemax"),
          ariaMin: element.getAttribute("aria-valuemin"),
          ariaNow: element.getAttribute("aria-valuenow"),
          width: bounds.width,
        };
      })(),
      sidePanel: rect(".codex-ui-app-shell__side-panel"),
      sidePanelAriaHidden: document
        .querySelector(".codex-ui-app-shell__side-panel")
        ?.getAttribute("aria-hidden"),
      sidePanelInert: document
        .querySelector(".codex-ui-app-shell__side-panel")
        ?.hasAttribute("inert"),
      sidebar: rect(".codex-ui-app-shell__sidebar"),
    };
  });

  if (
    compactNativeState?.width !== 800 ||
    compactNativeState?.height !== 600 ||
    compactContract.horizontalOverflow > 1 ||
    compactContract.fileGroups !== 1 ||
    compactContract.fileRows !== 2 ||
    compactContract.reviewDiffs !== 2 ||
    !compactContract.headerActionsVisible ||
    compactContract.layoutMode !== "medium" ||
    !compactContract.backdropVisible ||
    compactContract.mainAriaHidden !== null ||
    !compactContract.mainInert ||
    compactContract.sidePanelAriaHidden !== "false" ||
    compactContract.sidePanelInert ||
    !compactContract.sidebar ||
    !compactContract.main ||
    !compactContract.sidePanel ||
    compactContract.sidePanelResizer !== null ||
    Math.abs(compactContract.sidebar.width - 274) > 1 ||
    Math.abs(compactContract.main.width - 526) > 1 ||
    Math.abs(compactContract.sidePanel.width - 320) > 1 ||
    compactContract.sidePanel.right > 801
  ) {
    throw new Error(
      `Compact Electron multi-file geometry failed: ${JSON.stringify({
        native: compactNativeState,
        renderer: compactContract,
      })}`,
    );
  }

  await compactPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/beta.txt",
    })
    .click();
  await compactPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  if (
    !(await compactPage
      .getByRole("list", {
        name: "Review diff for .research/ui-kit-multifile-probe/alpha.txt",
      })
      .isVisible()) ||
    !(await compactPage
      .getByRole("list", {
        name: "Review diff for .research/ui-kit-multifile-probe/beta.txt",
      })
      .isVisible())
  ) {
    throw new Error(
      "Compact Electron Review overlay did not preserve both file diffs.",
    );
  }

  await compactPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await compactPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await compactPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  await compactPage.evaluate(() => {
    HTMLElement.prototype.scrollIntoView = function (options) {
      if (this.matches(".codex-ui-file-review__file[data-selected]")) {
        this.dataset.scrollRequest = JSON.stringify(options);
      }
    };
  });
  await compactPage
    .getByRole("button", {
      name: "Open .research/ui-kit-multifile-probe/beta.txt",
    })
    .click();
  const repeatedScrollRequest = await compactPage
    .getByRole("listitem", {
      name: "Review file .research/ui-kit-multifile-probe/beta.txt",
    })
    .getAttribute("data-scroll-request");
  if (
    !repeatedScrollRequest ||
    JSON.parse(repeatedScrollRequest).block !== "nearest" ||
    JSON.parse(repeatedScrollRequest).inline !== "nearest"
  ) {
    throw new Error(
      `Repeated file activation did not reveal the selected diff: ${repeatedScrollRequest}`,
    );
  }
} finally {
  await compactApp.close();
}

const compactTerminalScene = {
  frame: "terminal-open",
  id: "electron-background-terminal-compact",
  scenario: "background-terminal",
};
const {
  app: compactTerminalApp,
  page: compactTerminalPage,
} = await launchScene(compactTerminalScene, {
  capture: false,
  windowSize: { height: 680, width: 820 },
});

try {
  const compactTerminal = await compactTerminalPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        width: bounds.width,
      };
    };
    const resizer = document.querySelector(
      ".codex-ui-app-shell__bottom-panel-resizer",
    );
    return {
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      panel: rect(".codex-ui-app-shell__bottom-panel"),
      panelContent: rect(
        '.codex-ui-workspace-panel[data-placement="bottom"] [role="tabpanel"]',
      ),
      resizer: resizer
        ? {
            max: resizer.getAttribute("aria-valuemax"),
            min: resizer.getAttribute("aria-valuemin"),
            now: resizer.getAttribute("aria-valuenow"),
            rect: rect(".codex-ui-app-shell__bottom-panel-resizer"),
          }
        : null,
    };
  });
  if (
    compactTerminal.horizontalOverflow > 1 ||
    !compactTerminal.panel ||
    !compactTerminal.panelContent ||
    !compactTerminal.resizer?.rect ||
    Math.abs(compactTerminal.panel.width - 546) > 1 ||
    Math.abs(compactTerminal.panel.left - 274) > 1 ||
    Math.abs(compactTerminal.panel.height - 272) > 1 ||
    Math.abs(compactTerminal.panelContent.height - 239) > 1 ||
    Math.abs(compactTerminal.resizer.rect.height - 16) > 0.5 ||
    Math.abs(
      compactTerminal.resizer.rect.left -
        compactTerminal.panel.left,
    ) > 1 ||
    Math.abs(
      compactTerminal.resizer.rect.right -
        compactTerminal.panel.right,
    ) > 1 ||
    compactTerminal.resizer.min !== "152" ||
    compactTerminal.resizer.max !== "332" ||
    compactTerminal.resizer.now !== "272"
  ) {
    throw new Error(
      `Compact Electron Terminal geometry failed: ${JSON.stringify(compactTerminal)}`,
    );
  }
} finally {
  await compactTerminalApp.close();
}

const currentReviewScene = {
  frame: "review-open",
  id: "electron-current-review-rename",
  scenario: "current-review-rename",
};
const { app: currentReviewApp, page: currentReviewPage } = await launchScene(
  currentReviewScene,
  { capture: false },
);

try {
  await currentReviewPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const initialCurrentReview = await currentReviewPage.evaluate(() => ({
    changeKinds: Array.from(
      document.querySelectorAll(".codex-ui-file-change-group__file"),
      (element) => element.getAttribute("data-change"),
    ),
    diffCount: document.querySelectorAll(
      ".codex-ui-file-review .codex-ui-file-diff",
    ).length,
    fileCount: document.querySelectorAll(
      ".codex-ui-file-review__file",
    ).length,
    markerLines: Array.from(
      document.querySelectorAll(".codex-ui-file-diff__line"),
      (element) => element.textContent?.trim(),
    ).filter((text) => text?.includes("__CODEX_TEMP_RENAME_MARKER__")),
    paths: Array.from(
      document.querySelectorAll(".codex-ui-file-review__header"),
      (element) => element.textContent?.replace(/\s+/g, " ").trim(),
    ),
  }));
  if (
    JSON.stringify(initialCurrentReview.changeKinds) !==
      JSON.stringify(["modified", "modified"]) ||
    initialCurrentReview.diffCount !== 2 ||
    initialCurrentReview.fileCount !== 2 ||
    initialCurrentReview.markerLines.length !== 2 ||
    !initialCurrentReview.paths[0]?.includes("rename-only.txt") ||
    !initialCurrentReview.paths[1]?.includes("renamed-only.txt")
  ) {
    throw new Error(
      `Electron current Review rename content failed: ${JSON.stringify(initialCurrentReview)}`,
    );
  }

  const renamedPath =
    ".research/current-review-probe/renamed-only.txt";
  await currentReviewPage
    .getByRole("button", { name: `Select review for ${renamedPath}` })
    .click();
  if (
    (await currentReviewPage
      .getByRole("listitem", { name: `Review file ${renamedPath}` })
      .getAttribute("data-selected")) !== "true"
  ) {
    throw new Error(
      "Electron current Review did not synchronize rename destination selection.",
    );
  }

  await currentReviewPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await currentReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await currentReviewPage
    .getByRole("button", { name: `Open ${renamedPath}` })
    .click();
  if (
    (await currentReviewPage
      .getByRole("listitem", { name: `Review file ${renamedPath}` })
      .getAttribute("data-selected")) !== "true" ||
    (await currentReviewPage
      .getByRole("list", {
        name: "Review diff for .research/current-review-probe/rename-only.txt",
      })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron current Review did not preserve the source diff on destination reopen.",
    );
  }

  await currentReviewPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  await currentReviewPage.waitForSelector('[data-testid="file-change-group"]', {
    state: "detached",
  });
  await currentReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
} finally {
  await currentReviewApp.close();
}

const mixedReviewScene = {
  frame: "review-open",
  id: "electron-mixed-file-review",
  scenario: "mixed-file-review",
};
const { app: mixedReviewApp, page: mixedReviewPage } = await launchScene(
  mixedReviewScene,
  { capture: false, layoutMode: "wide" },
);

try {
  await mixedReviewPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  const initialMixedReview = await mixedReviewPage.evaluate(() => ({
    changeKinds: Array.from(
      document.querySelectorAll(".codex-ui-file-change-group__file"),
      (element) => element.getAttribute("data-change"),
    ),
    diffCount: document.querySelectorAll(
      ".codex-ui-file-review .codex-ui-file-diff",
    ).length,
    fileCount: document.querySelectorAll(
      ".codex-ui-file-review__file",
    ).length,
    noticeKinds: Array.from(
      document.querySelectorAll(".codex-ui-file-review-notice"),
      (element) => element.getAttribute("data-kind"),
    ),
    renamedPath: document
      .querySelector(
        '.codex-ui-file-review__file[data-change="renamed"] .codex-ui-file-review__header',
      )
      ?.textContent?.replace(/\s+/g, " ")
      .trim(),
  }));
  if (
    JSON.stringify(initialMixedReview.changeKinds) !==
      JSON.stringify(["renamed", "deleted", "modified", "modified"]) ||
    initialMixedReview.diffCount !== 2 ||
    initialMixedReview.fileCount !== 4 ||
    JSON.stringify(initialMixedReview.noticeKinds) !==
      JSON.stringify(["binary", "conflict"]) ||
    !initialMixedReview.renamedPath?.includes(
      ".research/mixed-review/old-name.ts → .research/mixed-review/new-name.ts",
    )
  ) {
    throw new Error(
      `Electron mixed Review content failed: ${JSON.stringify(initialMixedReview)}`,
    );
  }

  const binaryPath = ".research/mixed-review/preview.png";
  await mixedReviewPage
    .getByRole("button", { name: `Select review for ${binaryPath}` })
    .click();
  if (
    (await mixedReviewPage
      .getByRole("listitem", { name: `Review file ${binaryPath}` })
      .getAttribute("data-selected")) !== "true" ||
    !(await mixedReviewPage
      .getByRole("group", {
        name: `Review binary change for ${binaryPath}`,
      })
      .isVisible())
  ) {
    throw new Error(
      "Electron mixed Review did not synchronize binary-file selection.",
    );
  }

  await mixedReviewPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await mixedReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await mixedReviewPage
    .getByRole("button", {
      name: "Open .research/mixed-review/new-name.ts",
    })
    .click();
  if (
    (await mixedReviewPage
      .getByRole("listitem", {
        name: "Review file .research/mixed-review/new-name.ts",
      })
      .getAttribute("data-selected")) !== "true" ||
    (await mixedReviewPage
      .getByRole("list", {
        name: "Review diff for .research/mixed-review/obsolete.ts",
      })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron mixed Review did not preserve siblings on row reopen.",
    );
  }

  await mixedReviewPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  await mixedReviewPage.waitForSelector('[data-testid="file-change-group"]', {
    state: "detached",
  });
  await mixedReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
} finally {
  await mixedReviewApp.close();
}

const largeReviewScene = {
  frame: "review-open",
  id: "electron-large-file-review",
  scenario: "large-file-review",
};
const { app: largeReviewApp, page: largeReviewPage } = await launchScene(
  largeReviewScene,
  { capture: false },
);

try {
  const reviewBefore = await largeReviewPage.evaluate(() => {
    const review = document.querySelector(".codex-ui-file-review");
    return review
      ? {
          clientHeight: review.clientHeight,
          fileCount: review.querySelectorAll(
            ".codex-ui-file-review__file",
          ).length,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          scrollHeight: review.scrollHeight,
          scrollTop: review.scrollTop,
        }
      : null;
  });
  if (
    !reviewBefore ||
    reviewBefore.fileCount !== 8 ||
    reviewBefore.horizontalOverflow > 1 ||
    reviewBefore.scrollHeight <= reviewBefore.clientHeight
  ) {
    throw new Error(
      `Electron large Review overflow failed: ${JSON.stringify(reviewBefore)}`,
    );
  }

  await largeReviewPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await largeReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await largeReviewPage.waitForSelector(
    ".codex-ui-app-shell__main:not([inert])",
  );
  const selectedPath = ".research/large-review/08.ts";
  await largeReviewPage
    .getByRole("button", { name: `Open ${selectedPath}` })
    .click();
  const reviewAfter = await largeReviewPage.evaluate((path) => {
    const review = document.querySelector(".codex-ui-file-review");
    const selected = document.querySelector(
      '.codex-ui-file-review__file[data-selected]',
    );
    if (!review || !selected) return null;
    const reviewRect = review.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    return {
      current: selected.getAttribute("aria-label") === `Review file ${path}`,
      fullyVisible:
        selectedRect.top >= reviewRect.top - 1 &&
        selectedRect.bottom <= reviewRect.bottom + 1,
      scrollTop: review.scrollTop,
    };
  }, selectedPath);
  if (
    !reviewAfter?.current ||
    !reviewAfter.fullyVisible ||
    reviewAfter.scrollTop <= 0
  ) {
    throw new Error(
      `Electron large Review selection failed: ${JSON.stringify(reviewAfter)}`,
    );
  }
} finally {
  await largeReviewApp.close();
}

const codingWorkspaceScene = {
  frame: "workspace-ready",
  id: "electron-coding-workspace",
  scenario: "workspace-workflow",
  view: "workspace",
};
const codingWorkspaceGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-branch-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: codingWorkspaceGitDirectory,
});
await execFileAsync(
  "git",
  [
    "-c",
    "user.name=Codex UI Kit",
    "-c",
    "user.email=codex-ui-kit@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "test: initialize electron branch fixture",
  ],
  { cwd: codingWorkspaceGitDirectory },
);
const {
  app: codingWorkspaceApp,
  page: codingWorkspacePage,
} = await launchScene(codingWorkspaceScene, {
  capture: false,
  environment: {
    CODEX_DEMO_GIT_BRANCH_DELAY_MS: "750",
    CODEX_DEMO_WORKSPACE_PROJECT_ID: "app-server-client",
    CODEX_UI_KIT_WORKSPACE: codingWorkspaceGitDirectory,
  },
});
try {
  const nativeWindow = await codingWorkspaceApp.evaluate(
    ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window
        ? {
            destroyed: window.isDestroyed(),
            size: window.getContentSize(),
            visible: window.isVisible(),
          }
        : null;
    },
  );
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820])
  ) {
    throw new Error(
      `Electron coding workspace window failed: ${JSON.stringify(nativeWindow)}`,
    );
  }

  for (const expected of [
    {
      composerWidth: 736,
      height: 820,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1180,
    },
    {
      composerWidth: 654,
      height: 680,
      layoutMode: "medium",
      rootWidth: 686,
      sidebarOpen: true,
      width: 960,
    },
    {
      composerWidth: 514,
      height: 680,
      layoutMode: "medium",
      rootWidth: 546,
      sidebarOpen: true,
      width: 820,
    },
    {
      composerWidth: 688,
      height: 680,
      layoutMode: "narrow",
      rootWidth: 720,
      sidebarOpen: false,
      width: 720,
    },
    {
      composerWidth: 736,
      height: 1080,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1920,
    },
    {
      composerWidth: 736,
      height: 1326,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 2560,
    },
    {
      composerWidth: 736,
      height: 820,
      layoutMode: "wide",
      rootWidth: 768,
      sidebarOpen: true,
      width: 1180,
    },
  ]) {
    await codingWorkspaceApp.evaluate(
      ({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(
          size.width,
          size.height,
        );
      },
      expected,
    );
    await codingWorkspacePage.waitForFunction(
      (target) => {
        const shell = document.querySelector(".codex-ui-app-shell");
        return (
          window.innerWidth === target.width &&
          window.innerHeight === target.height &&
          shell?.getAttribute("data-layout-mode") ===
            target.layoutMode &&
          shell.hasAttribute("data-sidebar-open") ===
            target.sidebarOpen
        );
      },
      expected,
      { timeout: 5_000 },
    );
    const geometry = await codingWorkspacePage.evaluate(() => ({
      composerWidth: document
        .querySelector(".demo-workspace-start .codex-ui-composer")
        ?.getBoundingClientRect().width,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      rootWidth: document
        .querySelector(".demo-workspace-start")
        ?.getBoundingClientRect().width,
    }));
    if (
      Math.abs((geometry.rootWidth ?? 0) - expected.rootWidth) > 1 ||
      Math.abs(
        (geometry.composerWidth ?? 0) - expected.composerWidth,
      ) > 1 ||
      geometry.horizontalOverflow > 1
    ) {
      throw new Error(
        `Electron coding workspace responsive geometry failed at ${expected.width}x${expected.height}: ${JSON.stringify(geometry)}`,
      );
    }
  }

  const workspaceCurrentIcons = await codingWorkspacePage.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        ".demo-workspace-start [data-current-build-icon]",
      ),
      (icon) => {
        const rect = icon.getBoundingClientRect();
        return {
          height: rect.height,
          name: icon.getAttribute("data-current-build-icon"),
          width: rect.width,
        };
      },
    ),
  );
  if (
    JSON.stringify(workspaceCurrentIcons) !==
    JSON.stringify([
      { height: 16, name: "composer-project", width: 16 },
      { height: 16, name: "composer-worktree", width: 16 },
      { height: 16, name: "composer-branch", width: 16 },
      { height: 16, name: "composer-add-files", width: 16 },
      { height: 16, name: "composer-permission", width: 16 },
      { height: 14, name: "composer-model-chevron", width: 14 },
      { height: 16, name: "composer-dictate", width: 16 },
      { height: 16, name: "composer-voice", width: 16 },
    ])
  ) {
    throw new Error(
      `Electron current Composer assets failed: ${JSON.stringify(workspaceCurrentIcons)}`,
    );
  }

  const projectDestination = codingWorkspacePage.locator(
    "#demo-workspace-destination-trigger",
  );
  const projectTrigger = codingWorkspacePage.getByRole("button", {
    name: "Change project: codex-ui-kit",
  });
  const projectDialog = codingWorkspacePage.getByRole("dialog", {
    name: "Choose a project",
  });
  const projectSearch = projectDialog.getByRole("searchbox", {
    name: "Search projects",
  });
  await projectDestination.click();
  const destinationPopupState = await codingWorkspacePage.evaluate(() => {
    const destination = document.querySelector(
      "#demo-workspace-destination-trigger",
    );
    const contextTrigger = document.querySelector(
      "#demo-workspace-project-trigger",
    );
    return {
      contextExpanded: contextTrigger?.getAttribute("aria-expanded"),
      controls: destination?.getAttribute("aria-controls"),
      destinationExpanded: destination?.getAttribute("aria-expanded"),
      hasPopup: destination?.getAttribute("aria-haspopup"),
    };
  });
  if (
    destinationPopupState.contextExpanded === "true" ||
    destinationPopupState.controls !== "demo-workspace-project-dialog" ||
    destinationPopupState.destinationExpanded !== "true" ||
    destinationPopupState.hasPopup !== "dialog"
  ) {
    throw new Error(
      `Electron coding workspace destination popup semantics are invalid: ${JSON.stringify(destinationPopupState)}.`,
    );
  }
  await projectSearch.press("Escape");
  await projectDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.id,
    )) !== "demo-workspace-destination-trigger"
  ) {
    throw new Error(
      "Electron coding workspace did not restore destination focus after Escape.",
    );
  }
  await projectTrigger.click();
  await projectSearch.press("Escape");
  await projectDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForTimeout(50);
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Change project: codex-ui-kit"
  ) {
    throw new Error(
      "Electron coding workspace did not restore project-trigger focus after Escape.",
    );
  }
  await projectTrigger.click();
  await projectTrigger.focus();
  await codingWorkspacePage
    .getByRole("textbox", { name: "Do anything" })
    .focus();
  await projectDialog.waitFor({ state: "hidden" });
  await projectDestination.click();
  if (
    (await projectDialog.getByRole("button", { name: "New project" }).count()) !==
      1 ||
    (await projectDialog.getByText("Don't work in a project").count()) !== 0
  ) {
    throw new Error(
      "Electron coding workspace project picker does not match the current action boundary.",
    );
  }
  await projectSearch.fill("app-server");
  await projectDialog
    .getByRole("option", {
      name: "Select project codex-app-server-client",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change project: codex-app-server-client"]',
  );
  await codingWorkspacePage.waitForTimeout(50);

  await codingWorkspacePage
    .getByRole("button", { name: "Change run location: Local" })
    .press("ArrowDown");
  await codingWorkspacePage.waitForTimeout(50);
  const environmentMenu = codingWorkspacePage.getByRole("menu", {
    name: "Start in",
  });
  const localEnvironment = environmentMenu.getByRole("menuitemradio", {
    name: "Work locally",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.matches(
        ".demo-workspace-environment-menu .codex-ui-menu-item:first-of-type",
      ) ?? false,
  );
  if ((await localEnvironment.getAttribute("aria-checked")) !== "true") {
    throw new Error(
      "Electron coding workspace did not preserve the local environment selection.",
    );
  }
  await environmentMenu
    .getByRole("menuitemradio", { name: "New worktree" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-frame="workspace-new-worktree"]',
  );
  const newWorktreeState = await codingWorkspacePage.evaluate(() => ({
    contextLabels: Array.from(
      document.querySelectorAll(
        ".demo-workspace-start .codex-ui-conversation-context-bar button",
      ),
      (button) => button.getAttribute("aria-label"),
    ),
    contextKinds: Array.from(
      document.querySelectorAll(
        ".demo-workspace-start .codex-ui-conversation-context-bar button",
      ),
      (button) => button.getAttribute("data-kind"),
    ),
  }));
  if (
    JSON.stringify(newWorktreeState.contextKinds) !==
      JSON.stringify([
        "project",
        "run-location",
        "environment",
        "starting-state",
      ]) ||
    !newWorktreeState.contextLabels.includes(
      "Change environment: No environment",
    ) ||
    !newWorktreeState.contextLabels.includes("Starting state: main")
  ) {
    throw new Error(
      `Electron coding workspace did not enter the current New worktree state: ${JSON.stringify(newWorktreeState)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Change environment: No environment" })
    .click();
  const worktreeEnvironmentMenu = codingWorkspacePage.getByRole("menu", {
    name: "Environment",
  });
  await worktreeEnvironmentMenu.waitFor();
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Change environment: No environment"
  ) {
    throw new Error(
      "Electron coding workspace pointer-opened environment picker moved focus away from its trigger.",
    );
  }
  const worktreeEnvironmentState = {
    empty: (
      await worktreeEnvironmentMenu
        .locator(".demo-workspace-context-menu__empty")
        .textContent()
    )?.trim(),
    items: await worktreeEnvironmentMenu.getByRole("menuitem").allTextContents(),
  };
  if (
    worktreeEnvironmentState.empty !== "No environments found" ||
    JSON.stringify(worktreeEnvironmentState.items.map((item) => item.trim())) !==
      JSON.stringify([
        "Work without environment✓",
        "Environment settings↗",
      ])
  ) {
    throw new Error(
      `Electron coding workspace environment picker is invalid: ${JSON.stringify(worktreeEnvironmentState)}.`,
    );
  }
  await codingWorkspacePage.keyboard.press("Tab");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Starting state: main",
  );
  await codingWorkspacePage
    .getByRole("button", { name: "Change environment: No environment" })
    .press("ArrowDown");
  await worktreeEnvironmentMenu.waitFor();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Work without environment✓",
  );
  await codingWorkspacePage.keyboard.press("Escape");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Change environment: No environment",
  );
  await codingWorkspacePage.keyboard.press("Enter");
  await worktreeEnvironmentMenu.waitFor();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Work without environment✓",
  );
  await codingWorkspacePage.keyboard.press("Escape");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage
    .getByRole("button", { name: "Change run location: New worktree" })
    .click();
  await environmentMenu
    .getByRole("menuitemradio", { name: "Work locally" })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change run location: Local"]',
  );
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: main"]',
  );

  await codingWorkspacePage
    .getByRole("button", {
      name: "Change worktree: main",
    })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  const worktreeMenu = codingWorkspacePage.getByRole("menu", {
    name: "Branches",
  });
  const branchSearch = worktreeMenu.getByRole("searchbox", {
    name: "Search branches",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Search branches",
  );
  const appServerWorktreeLabels = await worktreeMenu
    .getByRole("menuitemradio")
    .evaluateAll((items) =>
      items.map((item) =>
        (item.textContent ?? "").replace(/[⑂✓]/g, "").trim(),
      ),
    );
  if (
    JSON.stringify(appServerWorktreeLabels) !== JSON.stringify(["main"])
  ) {
    throw new Error(
      `Electron coding workspace did not enumerate its host repository branches: ${JSON.stringify(appServerWorktreeLabels)}.`,
    );
  }
  await worktreeMenu
    .getByRole("menuitem", {
      name: "Create and checkout new branch…",
    })
    .click();
  const branchDialog = codingWorkspacePage.getByRole("dialog", {
    name: "Create and checkout branch",
  });
  const branchInput = branchDialog.getByRole("textbox", {
    name: "Branch name",
  });
  const createBranch = branchDialog.getByRole("button", {
    name: "Create and checkout",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "Branch name",
  );
  const branchDialogContract = await branchDialog.evaluate((dialog) => {
    const surface = dialog.getBoundingClientRect();
    const input = dialog
      .querySelector('input[aria-label="Branch name"]')
      ?.getBoundingClientRect();
    return {
      buttonLabels: Array.from(dialog.querySelectorAll("button"), (button) =>
        button.textContent?.trim(),
      ),
      input: input
        ? { height: input.height, width: input.width }
        : null,
      surface: { height: surface.height, width: surface.width },
    };
  });
  if (
    Math.abs(branchDialogContract.surface.width - 400) > 1 ||
    Math.abs(branchDialogContract.surface.height - 190.56) > 1 ||
    Math.abs((branchDialogContract.input?.width ?? 0) - 360) > 1 ||
    Math.abs((branchDialogContract.input?.height ?? 0) - 40) > 1 ||
    JSON.stringify(branchDialogContract.buttonLabels) !==
      JSON.stringify([
        "×",
        "Set prefix",
        "Close",
        "Create and checkout",
      ]) ||
    !(await createBranch.isDisabled())
  ) {
    throw new Error(
      `Electron branch creation geometry is invalid: ${JSON.stringify(branchDialogContract)}.`,
    );
  }
  await branchInput.fill("bad branch");
  await createBranch.click();
  await branchDialog.getByRole("alert").waitFor();
  if (
    (await branchDialog.getByRole("alert").textContent())?.trim() !==
      "Enter a valid Git branch name." ||
    (await branchInput.getAttribute("aria-invalid")) !== "true"
  ) {
    throw new Error(
      "Electron branch creation did not preserve the host validation error.",
    );
  }
  await branchInput.fill("main");
  await createBranch.click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.querySelector(
        ".codex-ui-branch-creation-dialog [role=\"alert\"]",
      )?.textContent === "A branch named main already exists.",
  );
  // This name exists in the replay-only renderer list but not in the host
  // repository. The main-process Git state must remain authoritative.
  await branchInput.fill("feature/sidebar-shell");
  await createBranch.click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document
        .querySelector(
          '.codex-ui-branch-creation-dialog button[aria-label="Close branch creation dialog"]',
        )
        ?.hasAttribute("disabled") ?? false,
  );
  await branchDialog.press("Escape");
  await branchDialog.locator("xpath=..").dispatchEvent("pointerdown");
  if (!(await branchDialog.isVisible())) {
    throw new Error(
      "Electron branch creation allowed dismissal while Git was still running.",
    );
  }
  await branchDialog.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: feature/sidebar-shell"]',
  );
  const createdGitBranch = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: codingWorkspaceGitDirectory, encoding: "utf8" },
  );
  if (createdGitBranch.stdout.trim() !== "feature/sidebar-shell") {
    throw new Error(
      `Electron branch creation did not checkout the host repository: ${createdGitBranch.stdout.trim()}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", {
      name: "Change worktree: feature/sidebar-shell",
    })
    .click();
  await codingWorkspacePage.waitForTimeout(50);
  await branchSearch.press("m");
  const branchSearchKeyboardState = await codingWorkspacePage.evaluate(() => ({
    activeLabel: document.activeElement?.getAttribute("aria-label"),
    value: (
      document.querySelector(
        '.demo-workspace-worktree-menu input[aria-label="Search branches"]',
      )
    )?.value,
  }));
  if (
    branchSearchKeyboardState.activeLabel !== "Search branches" ||
    branchSearchKeyboardState.value !== "m"
  ) {
    throw new Error(
      `Electron worktree search lost typed input to menu typeahead: ${JSON.stringify(branchSearchKeyboardState)}.`,
    );
  }
  await branchSearch.press("ArrowDown");
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("role"),
    )) !== "menuitemradio"
  ) {
    throw new Error(
      "Electron worktree search did not retain arrow navigation into filtered branches.",
    );
  }
  await worktreeMenu
    .getByRole("menuitemradio", {
      name: "main",
    })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: main"]',
  );
  const checkedOutMain = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: codingWorkspaceGitDirectory, encoding: "utf8" },
  );
  if (checkedOutMain.stdout.trim() !== "main") {
    throw new Error(
      `Electron branch switch did not update the host repository: ${checkedOutMain.stdout.trim()}.`,
    );
  }
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Change run location: Local"]',
  );

  const workspaceComposer = codingWorkspacePage.getByRole("textbox", {
    name: "Do anything",
  });
  await workspaceComposer.fill(
    "Run the protocol-backed coding workspace lifecycle.",
  );
  await workspaceComposer.press("Enter");
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  if (
    (await codingWorkspacePage
      .getByText("Run the protocol-backed coding workspace lifecycle.", {
        exact: true,
      })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron coding workspace discarded the submitted prompt.",
    );
  }
  if (
    (await codingWorkspacePage
      .getByTestId("command-execution")
      .count()) !== 2
  ) {
    throw new Error(
      "Electron coding workspace did not reach command execution.",
    );
  }
  const workspaceCommandCwds = await codingWorkspacePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    workspaceCommandCwds.some(
      (cwd) => cwd !== "cwd\n/workspace/codex-app-server-client",
    )
  ) {
    throw new Error(
      `Electron coding workspace did not route commands through the selected project: ${JSON.stringify(workspaceCommandCwds)}.`,
    );
  }
  await codingWorkspacePage
    .getByTestId("approval-request")
    .getByRole("button", { name: "Allow once" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"] [data-testid="file-change-group"]',
  );
  const fileGroup = codingWorkspacePage.locator(
    '[data-testid="file-change-group"]',
  );
  if (
    (await fileGroup.count()) !== 1 ||
    (await fileGroup.locator(".codex-ui-file-change-group__file").count()) !==
      2
  ) {
    throw new Error(
      "Electron coding workspace did not reach protocol-backed file changes.",
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Open CHECKS.md" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Open terminal" })
    .first()
    .click();
  await codingWorkspacePage.waitForSelector(
    '.codex-ui-app-shell[data-bottom-panel-open] [data-testid="terminal-panel"]',
  );
  const workspaceTerminalTab = codingWorkspacePage.getByRole("tab", {
    name: "codex-app-server-client, Exited",
  });
  const workspaceTerminalLabel = (
    await workspaceTerminalTab.textContent()
  )?.trim();
  if (
    !(await workspaceTerminalTab.isVisible()) ||
    workspaceTerminalLabel !== "□codex-app-server-client"
  ) {
    throw new Error(
      `Electron coding workspace terminal tab did not use the routed project: ${JSON.stringify(workspaceTerminalLabel)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Close terminal" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { exact: true, name: "Pull requests" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
  );
} finally {
  await codingWorkspaceApp.close();
  await rm(codingWorkspaceGitDirectory, {
    force: true,
    recursive: true,
  });
}

const cloudWorkspaceScene = {
  frame: "workspace-ready",
  id: "electron-cloud-coding-workspace",
  scenario: "workspace-workflow",
  view: "workspace",
};
const cloudWorkspaceGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-cloud-branch-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: cloudWorkspaceGitDirectory,
});
await execFileAsync(
  "git",
  [
    "-c",
    "user.name=Codex UI Kit",
    "-c",
    "user.email=codex-ui-kit@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "test: initialize cloud branch fixture",
  ],
  { cwd: cloudWorkspaceGitDirectory },
);
await execFileAsync(
  "git",
  ["branch", "feat/current-workspace-entry-refresh"],
  { cwd: cloudWorkspaceGitDirectory },
);
const {
  app: cloudWorkspaceApp,
  page: cloudWorkspacePage,
} = await launchScene(cloudWorkspaceScene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_WORKSPACE: cloudWorkspaceGitDirectory,
  },
});
try {
  await cloudWorkspacePage
    .getByRole("button", { name: "Change run location: Local" })
    .click();
  await cloudWorkspacePage
    .getByRole("menu", { name: "Start in" })
    .getByRole("menuitemradio", { name: "Connect Codex web" })
    .click();
  await cloudWorkspacePage.waitForSelector(
    'button[aria-label="Change run location: Codex web"]',
  );
  await cloudWorkspacePage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  await cloudWorkspacePage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", {
      name: "feat/current-workspace-entry-refresh",
    })
    .click();
  await cloudWorkspacePage.waitForSelector(
    'button[aria-label="Change worktree: feat/current-workspace-entry-refresh"]',
  );
  await cloudWorkspacePage
    .getByRole("textbox", { name: "Do anything" })
    .fill("Run the cloud worktree lifecycle.");
  await cloudWorkspacePage
    .getByRole("textbox", { name: "Do anything" })
    .press("Enter");
  await cloudWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  const cloudWorkspaceCommandCwds = await cloudWorkspacePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    cloudWorkspaceCommandCwds.some(
      (cwd) =>
        cwd !==
        "cwd\n/cloud/codex-ui-kit/.worktrees/feat-current-workspace-entry-refresh",
    )
  ) {
    throw new Error(
      `Electron cloud coding workspace discarded the selected worktree: ${JSON.stringify(cloudWorkspaceCommandCwds)}.`,
    );
  }
} finally {
  await cloudWorkspaceApp.close();
  await rm(cloudWorkspaceGitDirectory, {
    force: true,
    recursive: true,
  });
}

const rejectedApprovalScene = {
  frame: "approval-pending",
  id: "electron-workspace-approval-rejected",
  scenario: "workspace-workflow",
};
const {
  app: rejectedApprovalApp,
  page: rejectedApprovalPage,
} = await launchScene(rejectedApprovalScene, { capture: false });
try {
  const rejectedApproval = rejectedApprovalPage.getByTestId(
    "approval-request",
  );
  await rejectedApproval.getByRole("button", { name: "Deny" }).click();
  await rejectedApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-rejected"] [data-testid="approval-request"][data-decision="rejected"]',
  );
  if (
    (await rejectedApproval.getByRole("button", { name: "Deny" }).count()) !==
    0
  ) {
    throw new Error(
      "Electron workspace approval remained actionable after rejection.",
    );
  }
} finally {
  await rejectedApprovalApp.close();
}

const currentDeniedApprovalScene = {
  frame: "approval-current-pending",
  id: "electron-current-approval-denied",
  scenario: "approval-denied",
};
const {
  app: currentDeniedApprovalApp,
  page: currentDeniedApprovalPage,
} = await launchScene(currentDeniedApprovalScene, { capture: false });
try {
  const currentApproval = currentDeniedApprovalPage.getByTestId(
    "current-approval-request",
  );
  if (
    (await currentApproval.getAttribute("data-presentation")) !==
      "composer" ||
    (await currentApproval.getByRole("button", { name: "Deny" }).count()) !==
      1 ||
    (await currentApproval
      .getByRole("button", { name: "Allow once" })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron current approval did not expose the pending Composer-dock actions.",
    );
  }
  const options = currentApproval.getByRole("button", {
    name: "Approval options",
  });
  await options.click();
  await currentDeniedApprovalPage
    .getByRole("menuitem", { name: "Allow similar commands" })
    .waitFor();
  await currentDeniedApprovalPage.keyboard.press("Escape");
  if (
    !(await options.evaluate(
      (element) => element === document.activeElement,
    ))
  ) {
    throw new Error(
      "Electron current approval options did not restore trigger focus.",
    );
  }
  await currentApproval.getByRole("button", { name: "Deny" }).click();
  await currentDeniedApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-denied"]',
  );
  const currentApprovalCount = await currentDeniedApprovalPage
    .getByTestId("current-approval-request")
    .count();
  const assistantFinalCount = await currentDeniedApprovalPage
    .getByText(
      "Approval was not granted, so the command was not run.",
      { exact: true },
    )
    .count();
  const permissionLabel = (await currentDeniedApprovalPage
    .locator(".demo-composer-permission-trigger")
    .textContent())
    ?.replace(/^◉/, "")
    .trim();
  if (
    currentApprovalCount !== 0 ||
    assistantFinalCount !== 1 ||
    permissionLabel !== "Ask for approval"
  ) {
    throw new Error(
      `Electron current approval rejection did not remove the card and complete without execution: ${JSON.stringify({
        assistantFinalCount,
        currentApprovalCount,
        permissionLabel,
      })}`,
    );
  }
} finally {
  await currentDeniedApprovalApp.close();
}

const currentApprovedApprovalScene = {
  frame: "approval-current-allow-once-pending",
  id: "electron-current-approval-approved",
  scenario: "approval-allow-once",
};
const {
  app: currentApprovedApprovalApp,
  page: currentApprovedApprovalPage,
} = await launchScene(currentApprovedApprovalScene, { capture: false });
try {
  await currentApprovedApprovalPage
    .getByTestId("current-approval-request")
    .getByRole("button", { name: "Allow once" })
    .click();
  await currentApprovedApprovalPage
    .getByText(
      "ALLOW ONCE COMPLETE.",
      { exact: true },
    )
    .waitFor();
  const approvalCount = await currentApprovedApprovalPage
    .getByTestId("current-approval-request")
    .count();
  const restoredComposer = await currentApprovedApprovalPage.evaluate(() => {
    const composer = document.querySelector(
      '.codex-ui-composer textarea',
    );
    return {
      activeLabel:
        document.activeElement?.getAttribute("aria-label") ?? null,
      composerValue:
        composer instanceof HTMLTextAreaElement ? composer.value : null,
      permissionLabel:
        document
          .querySelector(".demo-composer-permission-trigger")
          ?.textContent?.replace(/^◉/, "")
          .trim() ?? null,
    };
  });
  await currentApprovedApprovalPage
    .getByRole("button", { exact: true, name: "Worked for 4m 50s" })
    .click();
  const commandExecution = currentApprovedApprovalPage.getByTestId(
    "command-execution",
  );
  await commandExecution.waitFor();
  const commandStatus = await commandExecution.getAttribute(
    "data-execution-status",
  );
  const commandSummary = (
    await commandExecution.locator(".codex-ui-activity__summary").textContent()
  )
    ?.replace(/\s+/g, " ")
    .trim();
  if (
    approvalCount !== 0 ||
    commandStatus !== "completed" ||
    commandSummary !== "Completed open -a Calculator" ||
    restoredComposer.activeLabel !== "Message composer" ||
    restoredComposer.composerValue !== "" ||
    restoredComposer.permissionLabel !== "Ask for approval"
  ) {
    throw new Error(
      `Electron current approval acceptance did not settle the command replay: ${JSON.stringify({
        approvalCount,
        commandSummary,
        commandStatus,
        restoredComposer,
      })}`,
    );
  }
} finally {
  await currentApprovedApprovalApp.close();
}

const currentSimilarApprovalScene = {
  frame: "approval-current-similar-pending",
  id: "electron-current-approval-similar-commands",
  scenario: "approval-similar-commands",
};
const {
  app: currentSimilarApprovalApp,
  page: currentSimilarApprovalPage,
} = await launchScene(currentSimilarApprovalScene, { capture: false });
try {
  const approval = currentSimilarApprovalPage.getByTestId(
    "current-approval-request",
  );
  await approval
    .getByRole("button", { name: "Approval options" })
    .click();
  const similarAction = currentSimilarApprovalPage
    .locator(
      '.codex-ui-approval-request__options-menu [role="menuitem"]',
    )
    .filter({ hasText: "Allow similar commands" });
  await similarAction.waitFor();
  if (
    (await currentSimilarApprovalPage
      .getByLabel(
        "Allow future commands that match this proposed rule",
      )
      .count()) !== 1
  ) {
    throw new Error(
      "Electron matching approval option did not expose its rule information.",
    );
  }
  await similarAction.click();
  await currentSimilarApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-similar-first-completed"]',
  );
  await currentSimilarApprovalPage
    .getByText("SESSION APPROVAL FIRST COMPLETE.", { exact: true })
    .waitFor();
  await currentSimilarApprovalPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const secondPrompt =
    "Run the exact same harmless command again; the matching approval rule should avoid another prompt.";
  await currentSimilarApprovalPage
    .getByLabel("Message composer")
    .fill(secondPrompt);
  await currentSimilarApprovalPage
    .getByLabel("Message composer")
    .press("Enter");
  await currentSimilarApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-similar-repeated-completed"]',
  );
  await currentSimilarApprovalPage
    .getByText("SESSION APPROVAL SECOND COMPLETE.", { exact: true })
    .waitFor();
  await currentSimilarApprovalPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const repeated = await currentSimilarApprovalPage.evaluate(() => {
    const composer = document.querySelector(
      ".codex-ui-composer textarea",
    );
    return {
      activeLabel:
        document.activeElement?.getAttribute("aria-label") ?? null,
      approvalCount: document.querySelectorAll(
        '[data-testid="current-approval-request"]',
      ).length,
      composerValue:
        composer instanceof HTMLTextAreaElement ? composer.value : null,
      permissionLabel:
        document
          .querySelector(".demo-composer-permission-trigger")
          ?.textContent?.replace(/^◉/, "")
          .trim() ?? null,
      workedLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-activity-timeline__toggle",
        ),
        (element) => element.textContent?.replace(/\s+/g, " ").trim(),
      ),
    };
  });
  if (
    repeated.activeLabel !== "Message composer" ||
    repeated.approvalCount !== 0 ||
    repeated.composerValue !== "" ||
    repeated.permissionLabel !== "Ask for approval" ||
    JSON.stringify(repeated.workedLabels) !==
      JSON.stringify(["Worked for 1m 41s", "Worked for 7s"])
  ) {
    throw new Error(
      `Electron matching approval did not persist for the repeated command: ${JSON.stringify(repeated)}`,
    );
  }
  await currentSimilarApprovalPage
    .getByRole("button", {
      exact: true,
      name: "Worked for 1m 41s",
    })
    .click();
  await currentSimilarApprovalPage
    .getByRole("button", { exact: true, name: "Worked for 7s" })
    .click();
  const commandStatuses = await currentSimilarApprovalPage
    .locator('[data-testid="command-execution"]')
    .evaluateAll((elements) =>
      elements.map((element) =>
        element.getAttribute("data-execution-status"),
      ),
    );
  if (
    JSON.stringify(commandStatuses) !==
    JSON.stringify(["completed", "completed"])
  ) {
    throw new Error(
      `Electron matching approval commands did not both complete: ${JSON.stringify(commandStatuses)}`,
    );
  }
} finally {
  await currentSimilarApprovalApp.close();
}

const currentSessionApprovalScene = {
  frame: "approval-current-session-pending",
  id: "electron-current-approval-for-session",
  scenario: "approval-for-session",
};
const {
  app: currentSessionApprovalApp,
  page: currentSessionApprovalPage,
} = await launchScene(currentSessionApprovalScene, { capture: false });
try {
  const approval = currentSessionApprovalPage.getByTestId(
    "current-approval-request",
  );
  await approval
    .getByRole("button", { name: "Approval options" })
    .click();
  const allowAllEdits = currentSessionApprovalPage
    .locator(
      '.codex-ui-approval-request__options-menu [role="menuitem"]',
    )
    .filter({ hasText: "Allow all edits" });
  await allowAllEdits.waitFor();
  if (
    (await currentSessionApprovalPage
      .getByLabel(
        "Allow this and future file edits in this conversation without asking again",
      )
      .count()) !== 1
  ) {
    throw new Error(
      "Electron session approval option did not expose its conversation scope.",
    );
  }
  await allowAllEdits.click();
  await currentSessionApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-session-first-completed"]',
  );
  await currentSessionApprovalPage
    .getByRole("button", { exact: true, name: "Previous" })
    .click();
  await currentSessionApprovalPage.waitForFunction(
    () => {
      const position = document.querySelector(
        'input[aria-label="Protocol event position"]',
      );
      return position instanceof HTMLInputElement && position.value === "9";
    },
  );
  await currentSessionApprovalPage
    .getByRole("button", { exact: true, name: "Next" })
    .click();
  await currentSessionApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-session-first-completed"]',
  );
  const secondPrompt =
    "Apply the second edit under the same session approval.";
  await currentSessionApprovalPage
    .getByLabel("Message composer")
    .fill(secondPrompt);
  await currentSessionApprovalPage
    .getByLabel("Message composer")
    .press("Enter");
  await currentSessionApprovalPage.waitForSelector(
    '.demo-root[data-frame="approval-current-session-repeated-completed"]',
  );
  const repeated = await currentSessionApprovalPage.evaluate(() => ({
    approvalCount: document.querySelectorAll(
      '[data-testid="current-approval-request"]',
    ).length,
    fileChangeCount: document.querySelectorAll(
      ".codex-ui-file-change-group",
    ).length,
    finalText:
      Array.from(
        document.querySelectorAll(
          '.codex-ui-agent-message[data-role="assistant"]',
        ),
      )
        .at(-1)
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    permissionLabel:
      document
        .querySelector(".demo-composer-permission-trigger")
        ?.textContent?.trim() ?? null,
  }));
  if (
    repeated.approvalCount !== 0 ||
    repeated.fileChangeCount !== 2 ||
    repeated.finalText !== "SESSION FILE APPROVAL SECOND COMPLETE." ||
    repeated.permissionLabel !== "Ask for approval"
  ) {
    throw new Error(
      `Electron session approval did not persist for the second edit: ${JSON.stringify(repeated)}`,
    );
  }
} finally {
  await currentSessionApprovalApp.close();
}

const {
  app: liveSessionApprovalApp,
  page: liveSessionApprovalPage,
} = await launchScene(
  {
    frame: "recovered",
    id: "electron-live-file-approval-for-session",
    scenario: "streaming-recovery",
  },
  { capture: false },
);
try {
  await liveSessionApprovalPage
    .getByRole("button", { exact: true, name: "Live" })
    .click();
  await liveSessionApprovalPage.waitForSelector(
    '.demo-root[data-mode="live"]',
  );
  await liveSessionApprovalApp.evaluate(
    ({ BrowserWindow, ipcMain }) => {
      globalThis.__codexUiKitApprovalResponse = null;
      ipcMain.removeHandler("demo:approval:respond");
      ipcMain.handle("demo:approval:respond", (_event, input) => {
        globalThis.__codexUiKitApprovalResponse = input;
      });
      const window = BrowserWindow.getAllWindows()[0];
      window?.webContents.send("demo:notification", {
        method: "item/started",
        params: {
          item: {
            changes: [
              {
                diff: "+session approval probe",
                kind: { type: "update" },
                path: "notes/live-session.md",
              },
            ],
            id: "file-live-session",
            status: "inProgress",
            type: "fileChange",
          },
          threadId: "thread-live-session",
          turnId: "turn-live-session",
        },
      });
      window?.webContents.send("demo:server-request", {
        id: "approval-live-session",
        kind: "request",
        method: "item/fileChange/requestApproval",
        params: {
          itemId: "file-live-session",
          reason: "Apply the live session approval probe.",
          threadId: "thread-live-session",
          turnId: "turn-live-session",
        },
      });
    },
  );
  const liveApproval = liveSessionApprovalPage.getByTestId(
    "approval-request",
  );
  await liveApproval.waitFor();
  await liveApproval
    .getByRole("button", { name: "Approval options" })
    .click();
  const liveAllowAllEdits = liveSessionApprovalPage
    .locator(
      '.codex-ui-approval-request__options-menu [role="menuitem"]',
    )
    .filter({ hasText: "Allow all edits" });
  await liveAllowAllEdits.waitFor();
  if (
    (await liveSessionApprovalPage
      .getByLabel(
        "Allow this and future file edits in this conversation without asking again",
      )
      .count()) !== 1
  ) {
    throw new Error(
      "Electron live file approval did not expose its conversation scope.",
    );
  }
  await liveAllowAllEdits.click();
  const liveApprovalResponse = await liveSessionApprovalApp.evaluate(
    () => globalThis.__codexUiKitApprovalResponse,
  );
  if (
    JSON.stringify(liveApprovalResponse) !==
    JSON.stringify({
      decision: "acceptForSession",
      requestId: "approval-live-session",
    })
  ) {
    throw new Error(
      `Electron live file approval did not emit its session decision: ${JSON.stringify(liveApprovalResponse)}`,
    );
  }
} finally {
  await liveSessionApprovalApp.close();
}

for (const alternateDecision of ["Allow once", "Deny"]) {
  const { app: alternateApp, page: alternatePage } = await launchScene(
    {
      frame: "approval-current-session-pending",
      id: `electron-current-file-${alternateDecision.toLowerCase().replace(/\s+/g, "-")}`,
      scenario: "approval-for-session",
    },
    { capture: false },
  );
  try {
    await alternatePage
      .getByTestId("current-approval-request")
      .getByRole("button", { exact: true, name: alternateDecision })
      .click();
    await alternatePage.waitForSelector(
      `.demo-root[data-frame="${
        alternateDecision === "Allow once"
          ? "approval-current-session-first-completed"
          : "approval-current-session-denied"
      }"]`,
    );
    if (alternateDecision === "Allow once") {
      const secondPrompt =
        "Apply the second edit under the same session approval.";
      await alternatePage.getByLabel("Message composer").fill(secondPrompt);
      await alternatePage.getByLabel("Message composer").press("Enter");
      await alternatePage.waitForTimeout(240);
      const oneTime = await alternatePage.evaluate(() => ({
        composerValue:
          document.querySelector(".codex-ui-composer textarea") instanceof
          HTMLTextAreaElement
            ? document.querySelector(".codex-ui-composer textarea").value
            : null,
        frame: document
          .querySelector(".demo-root")
          ?.getAttribute("data-frame"),
        liveErrorCount: document.querySelectorAll(
          '.codex-ui-status-banner[data-tone="error"]',
        ).length,
        mode: document
          .querySelector(".demo-root")
          ?.getAttribute("data-mode"),
        secondCompletionCount: Array.from(
          document.querySelectorAll(
            '.codex-ui-agent-message[data-role="assistant"]',
          ),
        ).filter(
          (element) =>
            element.textContent?.trim() ===
            "SESSION FILE APPROVAL SECOND COMPLETE.",
        ).length,
        secondPathCount: Array.from(
          document.querySelectorAll(".codex-ui-file-change-group"),
        ).filter((element) => element.textContent?.includes("notes/second.md"))
          .length,
      }));
      if (
        oneTime.composerValue !== secondPrompt ||
        oneTime.frame !== "approval-current-session-first-completed" ||
        oneTime.liveErrorCount !== 0 ||
        oneTime.mode !== "replay" ||
        oneTime.secondCompletionCount !== 0 ||
        oneTime.secondPathCount !== 0
      ) {
        throw new Error(
          `Electron one-time file approval incorrectly installed session scope: ${JSON.stringify(oneTime)}`,
        );
      }
    } else {
      const nextPrompt = "Try another file edit after denial.";
      await alternatePage.getByLabel("Message composer").fill(nextPrompt);
      await alternatePage.getByLabel("Message composer").press("Enter");
      await alternatePage.waitForTimeout(240);
      const declined = await alternatePage.evaluate(() => ({
        approvalCount: document.querySelectorAll(
          '[data-testid="current-approval-request"]',
        ).length,
        composerValue:
          document.querySelector(".codex-ui-composer textarea") instanceof
          HTMLTextAreaElement
            ? document.querySelector(".codex-ui-composer textarea").value
            : null,
        fileStatus: document
          .querySelector('[data-testid="file-change-group"]')
          ?.getAttribute("data-file-status"),
        frame: document
          .querySelector(".demo-root")
          ?.getAttribute("data-frame"),
        liveErrorCount: document.querySelectorAll(
          '.codex-ui-status-banner[data-tone="error"]',
        ).length,
        mode: document
          .querySelector(".demo-root")
          ?.getAttribute("data-mode"),
        status: document
          .querySelector(".demo-root")
          ?.getAttribute("data-status"),
        secondCompletionCount: Array.from(
          document.querySelectorAll(
            '.codex-ui-agent-message[data-role="assistant"]',
          ),
        ).filter(
          (element) =>
            element.textContent?.trim() ===
            "SESSION FILE APPROVAL SECOND COMPLETE.",
        ).length,
        secondPathCount: Array.from(
          document.querySelectorAll(".codex-ui-file-change-group"),
        ).filter((element) => element.textContent?.includes("notes/second.md"))
          .length,
      }));
      if (
        declined.approvalCount !== 0 ||
        declined.composerValue !== nextPrompt ||
        declined.fileStatus !== "rejected" ||
        declined.frame !== "approval-current-session-denied" ||
        declined.liveErrorCount !== 0 ||
        declined.mode !== "replay" ||
        declined.status !== "completed" ||
        declined.secondCompletionCount !== 0 ||
        declined.secondPathCount !== 0
      ) {
        throw new Error(
          `Electron denied file approval advanced the session trace: ${JSON.stringify(declined)}`,
        );
      }
    }
  } finally {
    await alternateApp.close();
  }
}

for (const reviewScene of [
  {
    frame: "approval-review-running",
    id: "electron-approval-review-running",
    scenario: "approval-review-timeout",
    status: "inProgress",
    title: "Auto-reviewing",
  },
  {
    frame: "approval-review-timeout",
    id: "electron-approval-review-timeout",
    scenario: "approval-review-timeout",
    status: "timedOut",
    title: "Auto-review timed out",
  },
]) {
  const { app: reviewApp, page: reviewPage } = await launchScene(
    reviewScene,
    { capture: false },
  );
  try {
    const review = reviewPage.getByTestId("automatic-approval-review");
    await review.waitFor();
    const contract = await review.evaluate((element) => ({
      action: element
        .querySelector(".codex-ui-auto-review__action")
        ?.textContent?.trim(),
      status: element.getAttribute("data-status"),
      summary: element
        .querySelector(".codex-ui-auto-review__summary")
        ?.textContent?.trim(),
      title: element
        .querySelector(".codex-ui-auto-review__title")
        ?.textContent?.trim(),
    }));
    if (
      contract.action !== "Network access to https://example.com/health" ||
      contract.status !== reviewScene.status ||
      contract.title !== reviewScene.title ||
      contract.summary !==
        (reviewScene.status === "timedOut"
          ? "A carefully prompted reviewer agent timed out before ChatGPT ran this request"
          : undefined)
    ) {
      throw new Error(
        `${reviewScene.id}: Electron automatic approval review failed: ${JSON.stringify(contract)}`,
      );
    }
  } finally {
    await reviewApp.close();
  }
}

const longCommandOutputScene = {
  frame: "command-output-expanded",
  id: "electron-current-long-command-output",
  scenario: "long-command-output",
};
const {
  app: longCommandOutputApp,
  page: longCommandOutputPage,
} = await launchScene(longCommandOutputScene, { capture: false });
try {
  const timelineToggle = longCommandOutputPage.getByRole("button", {
    name: "Worked for 10s",
  });
  await timelineToggle.click();
  const commandSummary = longCommandOutputPage
    .locator('[data-item-id="command-long-output"] summary')
    .first();
  if ((await commandSummary.textContent())?.trim() !== "Ran seq 1 400") {
    throw new Error(
      "Electron current long command did not expose its sampled collapsed summary.",
    );
  }
  await commandSummary.click();
  const output = longCommandOutputPage.getByRole("region", {
    name: "Standard output",
  });
  await output.waitFor({ state: "visible" });
  const expanded = await longCommandOutputPage.evaluate(() => {
    const command = document.querySelector(
      '[data-item-id="command-long-output"]',
    );
    const output = command?.querySelector(
      ".codex-ui-command-output pre",
    );
    return {
      copyCount:
        command?.querySelectorAll('button[aria-label="Copy"]').length ?? 0,
      lineCount:
        (output?.querySelector("code")?.textContent ?? "").split("\n")
          .length,
      scrollBottom: output ? output.scrollTop : null,
      shellLabel:
        command
          ?.querySelector(".codex-ui-command-execution__shell-label")
          ?.textContent?.trim() ?? null,
      success:
        command
          ?.querySelector(".codex-ui-command-execution__footer")
          ?.textContent?.trim() ?? null,
    };
  });
  if (
    expanded.copyCount !== 2 ||
    expanded.lineCount !== 401 ||
    expanded.scrollBottom === null ||
    Math.abs(expanded.scrollBottom) > 1 ||
    expanded.shellLabel !== "Shell" ||
    expanded.success !== "Success"
  ) {
    throw new Error(
      `Electron current long command output did not restore the bottom-following shell: ${JSON.stringify(expanded)}`,
    );
  }
  const copyButtons = longCommandOutputPage.getByRole("button", {
    name: "Copy",
  });
  await copyButtons.first().click();
  await copyButtons.last().click();
  await commandSummary.click();
  if (await output.isVisible()) {
    throw new Error(
      "Electron current long command output remained visible after collapse.",
    );
  }
  await commandSummary.click();
  await output.waitFor({ state: "visible" });
  const restoredBottom = await output.evaluate(
    (element) => element.scrollTop,
  );
  if (Math.abs(restoredBottom) > 1) {
    throw new Error(
      `Electron current long command output lost its bottom-following position: ${restoredBottom}`,
    );
  }
} finally {
  await longCommandOutputApp.close();
}

const commandFailureScene = {
  frame: "command-failure-recovered",
  id: "electron-current-command-failure-recovery",
  scenario: "command-failure-recovery",
};
const {
  app: commandFailureApp,
  page: commandFailurePage,
} = await launchScene(commandFailureScene, { capture: false });
try {
  await commandFailurePage.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__codexCommandFailureCopiedText = value;
        },
      },
    });
  });
  const failureTimeline = commandFailurePage.getByRole("button", {
    exact: true,
    name: "Worked for 12s",
  });
  await failureTimeline.click();
  const failureCommand = commandFailurePage.locator(
    '[data-item-id="command-failure-output"]',
  );
  const failureSummary = failureCommand.locator("summary").first();
  await failureSummary.click();
  const failureOutput = failureCommand.getByRole("region", {
    name: "Standard output",
  });
  await failureOutput.waitFor({ state: "visible" });
  const failureState = await commandFailurePage.evaluate(() => {
    const command = document.querySelector(
      '[data-item-id="command-failure-output"]',
    );
    const output = command?.querySelector(
      ".codex-ui-command-output pre",
    );
    const text = output?.querySelector("code")?.textContent ?? "";
    return {
      followUpAccepted:
        document.body.textContent?.includes(
          "Recovery follow-up accepted.",
        ) ?? false,
      lineCount: text.split("\n").length,
      outputEnd: text.slice(-18),
      outputStart: text.slice(0, 12),
      scrollBottom: output ? output.scrollTop : null,
      status: command?.getAttribute("data-status"),
      footer: command
        ?.querySelector(".codex-ui-command-execution__footer")
        ?.textContent?.trim(),
    };
  });
  if (
    !failureState.followUpAccepted ||
    failureState.lineCount !== 161 ||
    failureState.outputStart !== "stderr-001\ns" ||
    !failureState.outputEnd.endsWith("080\nstderr-080\n") ||
    failureState.scrollBottom === null ||
    Math.abs(failureState.scrollBottom) > 1 ||
    failureState.status !== "failed" ||
    failureState.footer !== "Exit code 7"
  ) {
    throw new Error(
      `Electron current command failure recovery is incomplete: ${JSON.stringify(failureState)}`,
    );
  }
  const copyButtons = failureCommand.getByRole("button", {
    name: "Copy",
  });
  await copyButtons.last().click();
  const copiedOutput = await commandFailurePage.evaluate(
    () => window.__codexCommandFailureCopiedText,
  );
  if (
    typeof copiedOutput !== "string" ||
    !copiedOutput.startsWith("stderr-001\nstdout-001") ||
    !copiedOutput.endsWith("stdout-080\nstderr-080\n")
  ) {
    throw new Error(
      "Electron current command failure output copy omitted the observed transcript.",
    );
  }
  await failureSummary.click();
  if (await failureOutput.isVisible()) {
    throw new Error(
      "Electron current command failure output remained visible after collapse.",
    );
  }
  await failureSummary.press("Enter");
  await failureOutput.waitFor({ state: "visible" });
} finally {
  await commandFailureApp.close();
}

const commandInterruptionScene = {
  frame: "command-interruption-running",
  id: "electron-current-command-interruption",
  scenario: "interruption",
};
const {
  app: commandInterruptionApp,
  page: commandInterruptionPage,
} = await launchScene(commandInterruptionScene, { capture: false });
try {
  const stop = commandInterruptionPage.getByRole("button", {
    exact: true,
    name: "Stop",
  });
  if ((await stop.count()) !== 1) {
    throw new Error(
      "Electron current command interruption did not expose one Stop action.",
    );
  }
  await stop.click();
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-stopping"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const stopping = await commandInterruptionPage.evaluate(() => ({
    commandSummary:
      document
        .querySelector(
          '[data-item-id="command-interruption"] .codex-ui-activity__summary',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    interruption:
      document
        .querySelector(".codex-ui-thread-interruption-summary__label")
        ?.textContent?.trim() ?? null,
  }));
  if (
    !stopping.commandSummary?.startsWith(
      "Background terminal stopped with seq 1 120",
    ) ||
    stopping.interruption !== "You stopped after 1m 35s"
  ) {
    throw new Error(
      `Electron current command Stop transition failed: ${JSON.stringify(stopping)}`,
    );
  }

  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-settled"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="background-finished"]',
  );
  const composer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill(
    "Do not use tools. Reply with exactly: INTERRUPTION RECOVERY ACCEPTED",
  );
  await composer.press("Enter");
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-recovered"][data-status="completed"][data-composer-phase="idle"]',
  );
  await commandInterruptionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const recovered = await commandInterruptionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    assistantText:
      document
        .querySelector(
          '[data-item-id="assistant-command-interruption-recovery"] .codex-ui-markdown',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    commandStatus: document
      .querySelector('[data-item-id="command-interruption"]')
      ?.getAttribute("data-execution-status"),
    interruption:
      document
        .querySelector(".codex-ui-thread-interruption-summary__label")
        ?.textContent?.trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) =>
        button.getAttribute("aria-label") === "Stop" ||
        button.textContent?.trim() === "Stop",
    ).length,
  }));
  if (
    recovered.activeElement !== "Message composer" ||
    recovered.assistantText !== "INTERRUPTION RECOVERY ACCEPTED" ||
    recovered.commandStatus !== "background-finished" ||
    recovered.interruption !== "You stopped after 1m 35s" ||
    recovered.stopCount !== 0
  ) {
    throw new Error(
      `Electron current command same-thread recovery failed: ${JSON.stringify(recovered)}`,
    );
  }
  await composer.fill(
    "Navigation must retain focus while submission is pending",
  );
  const navigationLabel = "Protocol event position";
  await commandInterruptionPage.evaluate(async () => {
    const composer = document.querySelector('[aria-label="Message composer"]');
    if (!(composer instanceof HTMLTextAreaElement)) {
      throw new Error(
        "Message composer is unavailable for navigation focus probe.",
      );
    }
    composer.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Enter",
        key: "Enter",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve));
    const input = document.querySelector(
      '[aria-label="Protocol event position"]',
    );
    if (!(input instanceof HTMLInputElement)) {
      throw new Error(
        "Replay position is unavailable for navigation focus probe.",
      );
    }
    input.focus();
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setValue?.call(
      input,
      String(Math.max(Number(input.min), Number(input.value) - 1)),
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await commandInterruptionPage.waitForTimeout(250);
  const navigationFocus = await commandInterruptionPage.evaluate(
    (label) => ({
      activeElementAriaLabel:
        document.activeElement?.getAttribute("aria-label") ?? null,
      activeElementTagName: document.activeElement?.tagName ?? null,
      composerFocused:
        document.activeElement?.getAttribute("aria-label") ===
        "Message composer",
      label,
    }),
    navigationLabel,
  );
  if (navigationFocus.composerFocused) {
    throw new Error(
      `Electron replay navigation focus was stolen after canceling a pending submission: ${JSON.stringify(navigationFocus)}`,
    );
  }
} finally {
  await commandInterruptionApp.close();
}

const contextCompactionScene = {
  frame: "context-compaction-ready",
  id: "electron-current-context-compaction",
  scenario: "compaction",
};
const {
  app: contextCompactionApp,
  page: contextCompactionPage,
} = await launchScene(contextCompactionScene, { capture: false });
try {
  const composer = contextCompactionPage.getByRole("textbox", {
    name: "Message composer",
  });
  const prematurePrompt = "Do not skip the compaction prerequisite";
  await composer.fill(prematurePrompt);
  await composer.press("Enter");
  const premature = await contextCompactionPage.evaluate(() => ({
    composerValue: (() => {
      const composer = document.querySelector(
        '[aria-label="Message composer"]',
      );
      return composer && "value" in composer ? composer.value : null;
    })(),
    frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
    recoveryCount: document.querySelectorAll(
      '[data-item-id="assistant-context-compaction-recovery"]',
    ).length,
  }));
  if (
    premature.composerValue !== prematurePrompt ||
    premature.frame !== "context-compaction-ready" ||
    premature.recoveryCount !== 0
  ) {
    throw new Error(
      `Electron current context compaction prerequisite gate failed: ${JSON.stringify(premature)}`,
    );
  }
  await composer.fill("/compact");
  const compactCommand = contextCompactionPage.getByRole("option", {
    name: "Compact this chat's context (9% full)",
  });
  await compactCommand.waitFor({ state: "visible" });
  await compactCommand.click();
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-running"][data-status="running"][data-composer-phase="running"] .codex-ui-thread-context-event[data-status="running"]',
  );
  const running = await contextCompactionPage.evaluate(() => ({
    label:
      document
        .querySelector(".codex-ui-thread-context-optimization")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
    working:
      document
        .querySelector(".codex-ui-thread-context-event__working")
        ?.textContent?.trim() ?? null,
  }));
  if (
    running.label !== "Compacting context" ||
    running.stopCount !== 1 ||
    running.working !== "Working"
  ) {
    throw new Error(
      `Electron current context compaction running transition failed: ${JSON.stringify(running)}`,
    );
  }
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-completed"][data-status="completed"][data-composer-phase="idle"] .codex-ui-thread-context-event[data-status="completed"]',
  );
  await composer.fill(
    "Do not use tools. Reply with exactly: COMPACTION RECOVERY ACCEPTED",
  );
  await composer.press("Enter");
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-recovered"][data-status="completed"][data-composer-phase="idle"] [data-item-id="assistant-context-compaction-recovery"]',
  );
  await contextCompactionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const recovered = await contextCompactionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    assistantText:
      document
        .querySelector(
          '[data-item-id="assistant-context-compaction-recovery"] .codex-ui-markdown',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    contextLabel:
      document
        .querySelector(".codex-ui-thread-context-optimization")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
  }));
  if (
    recovered.activeElement !== "Message composer" ||
    recovered.assistantText !== "COMPACTION RECOVERY ACCEPTED" ||
    recovered.contextLabel !== "Context compacted" ||
    recovered.stopCount !== 0
  ) {
    throw new Error(
      `Electron current context compaction same-thread recovery failed: ${JSON.stringify(recovered)}`,
    );
  }
  await composer.fill("/compact");
  await composer.press("Enter");
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-running"][data-status="running"] button[aria-label="Stop"]',
  );
  await contextCompactionPage.getByRole("button", { name: "Stop" }).click();
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-ready"][data-status="completed"][data-composer-phase="idle"]',
  );
  await contextCompactionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const stopped = await contextCompactionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    composerValue: (() => {
      const composer = document.querySelector(
        '[aria-label="Message composer"]',
      );
      return composer && "value" in composer ? composer.value : null;
    })(),
    contextCount: document.querySelectorAll(
      ".codex-ui-thread-context-event",
    ).length,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
  }));
  if (
    stopped.activeElement !== "Message composer" ||
    stopped.composerValue !== "" ||
    stopped.contextCount !== 0 ||
    stopped.stopCount !== 0
  ) {
    throw new Error(
      `Electron current context compaction Stop reset failed: ${JSON.stringify(stopped)}`,
    );
  }
} finally {
  await contextCompactionApp.close();
}

const acceptedMixedApprovalScene = {
  frame: "mixed-approval-pending",
  id: "electron-mixed-approval-accepted",
  scenario: "mcp-recovery-mixed-thread",
};
const {
  app: acceptedMixedApprovalApp,
  page: acceptedMixedApprovalPage,
} = await launchScene(acceptedMixedApprovalScene, { capture: false });
try {
  const acceptedMixedApproval =
    acceptedMixedApprovalPage.getByTestId("approval-request");
  await acceptedMixedApproval
    .getByRole("button", { name: "Allow once" })
    .click();
  await acceptedMixedApprovalPage.waitForSelector(
    '.demo-root[data-frame="mixed-review-open"][data-status="completed"] [data-testid="file-change-group"]',
  );
  if (
    (await acceptedMixedApproval.getAttribute("data-decision")) !==
      "approved" ||
    (await acceptedMixedApprovalPage
      .getByText(
        "The recovery check passed and RECOVERY.md is ready for review.",
        { exact: true },
      )
      .count()) !== 1
  ) {
    throw new Error(
      "Electron accepted mixed replay approval did not advance through completion.",
    );
  }
} finally {
  await acceptedMixedApprovalApp.close();
}

const conversationLifecycleScene = {
  frame: "conversation-thread-ready",
  id: "electron-conversation-lifecycle",
  scenario: "conversation-lifecycle",
};
const {
  app: conversationLifecycleApp,
  page: conversationLifecyclePage,
} = await launchScene(conversationLifecycleScene, { capture: false });
try {
  const nativeWindow = await conversationLifecycleApp.evaluate(
    ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window
        ? {
            destroyed: window.isDestroyed(),
            size: window.getContentSize(),
            visible: window.isVisible(),
          }
        : null;
    },
  );
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820])
  ) {
    throw new Error(
      `Electron conversation window contract failed: ${JSON.stringify(nativeWindow)}`,
    );
  }

  const composer = conversationLifecyclePage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill("Start the Electron lifecycle.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"]',
  );
  await composer.fill("Queue the Electron follow-up.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-queue-count="1"]',
  );
  await conversationLifecyclePage
    .getByRole("button", { exact: true, name: "Stop" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-status="running"][data-queue-count="0"]',
  );
  if (
    (await conversationLifecyclePage
      .getByText("You stopped after 2s", { exact: true })
      .count()) !== 1 ||
    (await conversationLifecyclePage
      .getByText("Queue the Electron follow-up.", { exact: true })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron Stop did not promote the queued follow-up automatically.",
    );
  }

  await conversationLifecyclePage
    .getByRole("button", {
      exact: true,
      name: "Jump to user message 1",
    })
    .click();
  await conversationLifecyclePage.waitForSelector(
    ".codex-ui-thread-floating-button[data-show]",
  );
  await conversationLifecyclePage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-thread-following="true"]',
  );

  const lifecycle = await conversationLifecyclePage.evaluate(() => ({
    contextControls: document.querySelectorAll(
      ".codex-ui-composer-context button",
    ).length,
    navigationButtons: document.querySelectorAll(
      ".codex-ui-message-navigation-rail button",
    ).length,
    queueRows: document.querySelectorAll(
      ".codex-ui-composer-queue__row",
    ).length,
    status: document
      .querySelector(".demo-root")
      ?.getAttribute("data-status"),
    stopButtons: document.querySelectorAll(
      '.codex-ui-composer button[aria-label="Stop"]',
    ).length,
    threadFollowing: document
      .querySelector(".demo-root")
      ?.getAttribute("data-thread-following"),
  }));
  if (
    lifecycle.contextControls !== 0 ||
    lifecycle.navigationButtons !== 12 ||
    lifecycle.queueRows !== 0 ||
    lifecycle.status !== "running" ||
    lifecycle.stopButtons !== 1 ||
    lifecycle.threadFollowing !== "true"
  ) {
    throw new Error(
      `Electron conversation lifecycle failed: ${JSON.stringify(lifecycle)}`,
    );
  }
} finally {
  await conversationLifecycleApp.close();
}

const currentWindowedScene = {
  frame: "thread-windowed",
  id: "electron-current-windowed-thread",
  scenario: "conversation-lifecycle",
};
const {
  app: currentWindowedApp,
  page: currentWindowedPage,
} = await launchScene(currentWindowedScene, { capture: false });
try {
  await currentWindowedPage.waitForSelector(
    '.demo-root[data-windowed-timeline="current"][data-thread-following="false"] [data-selected-message-index="40"]',
  );
  const currentWindowedGeometry = await currentWindowedPage.evaluate(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    const list = document.querySelector(
      ".codex-ui-message-navigation-rail__list",
    );
    const selected = document.querySelector(
      '.codex-ui-message-navigation-rail__button[aria-current="true"]',
    );
    const marker = selected?.querySelector(
      ".codex-ui-message-navigation-rail__marker",
    );
    if (!viewport || !list || !selected || !marker) return null;
    const listRect = list.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    return {
      list: {
        clientHeight: list.clientHeight,
        height: listRect.height,
        left: listRect.left,
        scrollHeight: list.scrollHeight,
        top: listRect.top,
        width: listRect.width,
      },
      marker: {
        height: markerRect.height,
        opacity: getComputedStyle(marker).opacity,
        width: markerRect.width,
      },
      mountedTurns: document.querySelectorAll("[data-windowed-turn]")
        .length,
      mountedUserBubbles: document.querySelectorAll(
        '[data-mounted-turn-count] .codex-ui-agent-message[data-role="user"]',
      ).length,
      navigationButtons: document.querySelectorAll(
        ".codex-ui-message-navigation-rail__button",
      ).length,
      selectedButton: {
        height: selectedRect.height,
        width: selectedRect.width,
      },
      viewport: {
        flexDirection: getComputedStyle(viewport).flexDirection,
        latestOrigin: viewport.getAttribute("data-latest-origin"),
        scrollHeight: viewport.scrollHeight,
        scrollTop: viewport.scrollTop,
      },
    };
  });
  if (
    !currentWindowedGeometry ||
    currentWindowedGeometry.navigationButtons !== 82 ||
    currentWindowedGeometry.mountedTurns !== 7 ||
    currentWindowedGeometry.mountedUserBubbles !== 7 ||
    currentWindowedGeometry.viewport.latestOrigin !== "start" ||
    currentWindowedGeometry.viewport.flexDirection !== "column-reverse" ||
    currentWindowedGeometry.viewport.scrollTop >= -10_000 ||
    currentWindowedGeometry.viewport.scrollHeight < 40_000 ||
    currentWindowedGeometry.list.clientHeight !== 574 ||
    currentWindowedGeometry.list.scrollHeight !== 820 ||
    Math.abs(currentWindowedGeometry.list.left - 290) > 1 ||
    Math.abs(currentWindowedGeometry.list.top - 146.5) > 1 ||
    Math.abs(currentWindowedGeometry.list.width - 36) > 1 ||
    Math.abs(currentWindowedGeometry.list.height - 574) > 1 ||
    Math.abs(currentWindowedGeometry.selectedButton.width - 36) > 1 ||
    Math.abs(currentWindowedGeometry.selectedButton.height - 10) > 1 ||
    Math.abs(currentWindowedGeometry.marker.width - 26) > 1 ||
    Math.abs(currentWindowedGeometry.marker.height - 2) > 1 ||
    currentWindowedGeometry.marker.opacity !== "1"
  ) {
    throw new Error(
      `Electron current windowed-thread geometry failed: ${JSON.stringify(currentWindowedGeometry)}`,
    );
  }

  await currentWindowedPage
    .getByRole("button", { name: "Jump to user message 20" })
    .click();
  await currentWindowedPage.waitForSelector(
    '[data-selected-message-index="20"] [data-item-id="current-windowed-user-20"]',
  );
  await currentWindowedPage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await currentWindowedPage.waitForFunction(
    () =>
      document
        .querySelector(".demo-root")
        ?.getAttribute("data-thread-following") === "true" &&
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "82" &&
      document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      )?.scrollTop === 0,
  );
} finally {
  await currentWindowedApp.close();
}

const composerMenusScene = {
  frame: "composer-multiline",
  id: "electron-composer-current-menus",
  scenario: "conversation-lifecycle",
};
const {
  app: composerMenusApp,
  page: composerMenusPage,
} = await launchScene(composerMenusScene, { capture: false });
try {
  const composerInput = composerMenusPage.getByRole("textbox", {
    name: "Message composer",
  });
  const initialComposerGeometry = await composerMenusPage.evaluate(() => {
    const measure = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        height: rect.height,
        left: rect.left,
        lineHeight: style.lineHeight,
        overflowY: style.overflowY,
        top: rect.top,
        width: rect.width,
      };
    };
    return {
      input: measure(".codex-ui-composer__input"),
      surface: measure(".codex-ui-composer"),
    };
  });
  if (
    !initialComposerGeometry.surface ||
    !initialComposerGeometry.input ||
    Math.abs(initialComposerGeometry.surface.left - 359) > 1 ||
    Math.abs(initialComposerGeometry.surface.top - 670) > 1 ||
    Math.abs(initialComposerGeometry.surface.width - 736) > 1 ||
    Math.abs(initialComposerGeometry.surface.height - 134) > 1 ||
    Math.abs(initialComposerGeometry.input.left - 371) > 1 ||
    Math.abs(initialComposerGeometry.input.top - 684) > 1 ||
    Math.abs(initialComposerGeometry.input.width - 712) > 1 ||
    Math.abs(initialComposerGeometry.input.height - 80) > 1 ||
    initialComposerGeometry.input.lineHeight !== "20px"
  ) {
    throw new Error(
      `Electron current Composer multiline geometry failed: ${JSON.stringify(initialComposerGeometry)}`,
    );
  }

  const permissionTrigger = composerMenusPage.getByRole("button", {
    name: "Change permissions",
  });
  await permissionTrigger.click();
  await composerMenusPage.waitForSelector(
    '.demo-root[data-composer-overlay="permissions"] .codex-ui-composer',
  );
  const permissionGeometry = await composerMenusPage.evaluate(() => {
    const menu = document.querySelector(
      ".codex-ui-composer-permission-menu",
    );
    const items = [
      ...document.querySelectorAll(
        ".codex-ui-composer-permission-menu__option",
      ),
    ];
    if (!menu) return null;
    const rect = menu.getBoundingClientRect();
    return {
      height: rect.height,
      itemHeights: items.map(
        (item) => item.getBoundingClientRect().height,
      ),
      left: rect.left,
      top: rect.top,
      width: rect.width,
    };
  });
  if (
    !permissionGeometry ||
    Math.abs(permissionGeometry.left - 401) > 1 ||
    Math.abs(permissionGeometry.top - 544) > 1 ||
    Math.abs(permissionGeometry.width - 480.375) > 1 ||
    Math.abs(permissionGeometry.height - 222.5) > 1 ||
    permissionGeometry.itemHeights.length !== 4 ||
    permissionGeometry.itemHeights.some(
      (height) => Math.abs(height - 47.125) > 1,
    )
  ) {
    throw new Error(
      `Electron current Composer permission menu geometry failed: ${JSON.stringify(permissionGeometry)}`,
    );
  }
  await composerMenusPage
    .getByRole("menuitemradio", { name: /Approve for me/ })
    .click();
  if (
    (await permissionTrigger.textContent())?.includes("Approve for me") !==
    true
  ) {
    throw new Error(
      "Electron Composer permission selection did not update the trigger.",
    );
  }
  await permissionTrigger.click();
  await composerMenusPage.keyboard.press("Escape");
  await composerMenusPage.waitForSelector(
    '.demo-root:not([data-composer-overlay])',
  );
  await composerMenusPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Change permissions",
  );
  const permissionFocus = await composerMenusPage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  if (permissionFocus !== "Change permissions") {
    throw new Error(
      `Electron Composer permission Escape focus failed: ${JSON.stringify(permissionFocus)}`,
    );
  }

  const resourceTrigger = composerMenusPage.getByRole("button", {
    name: "Add files and more",
  });
  await resourceTrigger.click();
  await composerMenusPage.waitForSelector(
    '.demo-root[data-composer-overlay="resources"] .codex-ui-composer-resource-picker',
  );
  const resourceGeometry = await composerMenusPage.evaluate(() => {
    const measure = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        clientHeight: element.clientHeight,
        height: rect.height,
        left: rect.left,
        scrollHeight: element.scrollHeight,
        top: rect.top,
        width: rect.width,
      };
    };
    return {
      picker: measure(".codex-ui-composer-resource-picker"),
      scroller: measure(".codex-ui-composer-resource-picker__scroller"),
      visibleOptions: [
        ...document.querySelectorAll(
          ".codex-ui-composer-resource-picker__option",
        ),
      ].filter((option) => option.getBoundingClientRect().top < 666)
        .length,
    };
  });
  if (
    !resourceGeometry.picker ||
    !resourceGeometry.scroller ||
    Math.abs(resourceGeometry.picker.left - 359) > 1 ||
    Math.abs(resourceGeometry.picker.top - 346) > 1 ||
    Math.abs(resourceGeometry.picker.width - 736) > 1 ||
    Math.abs(resourceGeometry.picker.height - 320) > 1 ||
    Math.abs(resourceGeometry.scroller.left - 364) > 1 ||
    Math.abs(resourceGeometry.scroller.top - 351) > 1 ||
    Math.abs(resourceGeometry.scroller.width - 726) > 1 ||
    resourceGeometry.scroller.clientHeight !== 310 ||
    resourceGeometry.scroller.scrollHeight < 990 ||
    resourceGeometry.visibleOptions < 9
  ) {
    throw new Error(
      `Electron current Composer resource picker geometry failed: ${JSON.stringify(resourceGeometry)}`,
    );
  }
  const resourcePicker = composerMenusPage.getByRole("listbox", {
    name: "Composer resources",
  });
  await resourcePicker.focus();
  await resourcePicker.press("End");
  await resourcePicker.press("Enter");
  await composerMenusPage.waitForSelector(
    '.demo-root:not([data-composer-overlay])',
  );
  await composerMenusPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );

  await resourceTrigger.click();
  await composerMenusPage
    .getByRole("option", { name: /Goal/ })
    .click();
  await composerMenusPage.waitForSelector(
    '.demo-root[data-composer-mode="goal"][data-composer-phase="goal"]',
  );
  const goalMode = await composerMenusPage.evaluate(() => {
    const mode = document.querySelector(".codex-ui-composer-mode");
    const input = document.querySelector(".codex-ui-composer__input");
    if (!mode || !input) return null;
    const rect = mode.getBoundingClientRect();
    return {
      clearLabel: mode.getAttribute("aria-label"),
      height: rect.height,
      inputLabel: input.getAttribute("aria-label"),
      kind: mode.getAttribute("data-kind"),
      left: rect.left,
      top: rect.top,
    };
  });
  if (
    !goalMode ||
    goalMode.kind !== "goal" ||
    goalMode.clearLabel !== "Clear goal" ||
    goalMode.inputLabel !==
      "Describe your goal, define measurable outcomes for best results" ||
    Math.abs(goalMode.left - 512) > 1 ||
    Math.abs(goalMode.top - 768) > 1 ||
    Math.abs(goalMode.height - 28) > 1
  ) {
    throw new Error(
      `Electron current Composer Goal mode failed: ${JSON.stringify(goalMode)}`,
    );
  }
  await composerMenusPage
    .getByRole("button", { name: "Clear goal" })
    .click();
  await composerMenusPage.waitForFunction(
    () =>
      !document
        .querySelector(".demo-root")
        ?.hasAttribute("data-composer-mode") &&
      document.activeElement?.getAttribute("aria-label") ===
        "Message composer",
  );

  await resourceTrigger.click();
  await composerMenusPage
    .getByRole("option", { name: /Plan mode/ })
    .click();
  await composerMenusPage.waitForSelector(
    '.demo-root[data-composer-mode="plan"][data-composer-phase="plan"]',
  );
  const planMode = await composerMenusPage.evaluate(() => ({
    buttonCount: document.querySelectorAll(
      '.codex-ui-composer-mode[data-kind="plan"][aria-label="Plan"]',
    ).length,
    inputLabel: document
      .querySelector(".codex-ui-composer__input")
      ?.getAttribute("aria-label"),
  }));
  if (
    planMode.buttonCount !== 1 ||
    planMode.inputLabel !== "Describe your task to generate a plan..."
  ) {
    throw new Error(
      `Electron current Composer Plan mode failed: ${JSON.stringify(planMode)}`,
    );
  }
  await composerMenusPage
    .getByRole("button", { exact: true, name: "Plan" })
    .click();
  await composerMenusPage.waitForFunction(
    () =>
      !document
        .querySelector(".demo-root")
        ?.hasAttribute("data-composer-mode") &&
      document.activeElement?.getAttribute("aria-label") ===
        "Message composer",
  );

  await composerInput.fill(
    Array.from(
      { length: 20 },
      (_, index) => `Current Composer line ${index + 1}.`,
    ).join("\n"),
  );
  const longComposerGeometry = await composerMenusPage.evaluate(() => {
    const input = document.querySelector(
      ".codex-ui-composer__input",
    );
    const surface = document.querySelector(".codex-ui-composer");
    if (!input || !surface) return null;
    const inputRect = input.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      input: {
        height: inputRect.height,
        left: inputRect.left,
        scrollHeight: input.scrollHeight,
        top: inputRect.top,
        width: inputRect.width,
      },
      surface: {
        height: surfaceRect.height,
        top: surfaceRect.top,
      },
    };
  });
  if (
    !longComposerGeometry ||
    Math.abs(longComposerGeometry.input.left - 371) > 1 ||
    Math.abs(longComposerGeometry.input.top - 559) > 1 ||
    Math.abs(longComposerGeometry.input.width - 712) > 1 ||
    Math.abs(longComposerGeometry.input.height - 205) > 1 ||
    longComposerGeometry.input.scrollHeight < 400 ||
    Math.abs(longComposerGeometry.surface.top - 545) > 1 ||
    Math.abs(longComposerGeometry.surface.height - 259) > 1
  ) {
    throw new Error(
      `Electron current Composer long-input geometry failed: ${JSON.stringify(longComposerGeometry)}`,
    );
  }
} finally {
  await composerMenusApp.close();
}

const contextSummaryScene = {
  frame: "context-summary-open",
  id: "electron-context-summary",
  scenario: "context-summary",
};
const { app: contextSummaryApp, page: contextSummaryPage } = await launchScene(
  contextSummaryScene,
  { capture: false },
);
try {
  const nativeBounds = await contextSummaryApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  const summary = await contextSummaryPage.evaluate(() => {
    const measure = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left,
        top: value.top,
        width: value.width,
      };
    };
    const panel = document.querySelector(".codex-ui-thread-summary-panel");
    const panelStyle = panel ? getComputedStyle(panel) : null;
    return {
      disabledRows: document.querySelectorAll(
        ".codex-ui-thread-summary-item:disabled",
      ).length,
      panel: measure(".codex-ui-thread-summary-panel"),
      panelStyle: panelStyle
        ? {
            backgroundColor: panelStyle.backgroundColor,
            borderRadius: panelStyle.borderRadius,
            fontSize: panelStyle.fontSize,
            fontWeight: panelStyle.fontWeight,
            lineHeight: panelStyle.lineHeight,
          }
        : null,
      popover: measure(".codex-ui-thread-summary-popover"),
      rowCount: document.querySelectorAll(".codex-ui-thread-summary-item").length,
      rows: [...document.querySelectorAll(".codex-ui-thread-summary-item")].map(
        (element) => {
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        },
      ),
    };
  });
  if (
    nativeBounds?.width !== 1180 ||
    nativeBounds?.height !== 820 ||
    !summary.panel ||
    !summary.popover ||
    Math.abs(summary.popover.left - 804) > 1 ||
    Math.abs(summary.popover.top - 45) > 1 ||
    Math.abs(summary.popover.width - 300) > 1 ||
    Math.abs(summary.popover.height - 199) > 1 ||
    summary.panelStyle?.backgroundColor !== "rgb(45, 45, 45)" ||
    summary.panelStyle?.borderRadius !== "25px" ||
    summary.panelStyle?.fontSize !== "14px" ||
    summary.panelStyle?.fontWeight !== "445" ||
    summary.panelStyle?.lineHeight !== "21px" ||
    summary.rowCount !== 5 ||
    summary.rows.some(
      (row) =>
        !row ||
        Math.abs(row.height - 29) > 1 ||
        Math.abs(row.width - 272) > 1,
    ) ||
    summary.disabledRows !== 1
  ) {
    throw new Error(
      `Electron current thread summary geometry failed: ${JSON.stringify({ nativeBounds, summary })}`,
    );
  }

  const trigger = contextSummaryPage.getByRole("button", {
    exact: true,
    name: "Toggle summary",
  });
  const dialog = contextSummaryPage.getByRole("dialog", {
    exact: true,
    name: "Thread summary",
  });
  await dialog.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await contextSummaryPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Toggle summary",
  );
  await trigger.click();
  await dialog.waitFor({ state: "visible" });
  const sectionToggle = contextSummaryPage.getByRole("button", {
    name: "Toggle environment summary",
  });
  await sectionToggle.click();
  if (
    (await contextSummaryPage.locator(".codex-ui-thread-summary-item").count()) !== 0
  ) {
    throw new Error("Electron thread summary section did not collapse.");
  }
  await sectionToggle.click();
  await contextSummaryPage.getByRole("textbox", { name: "Message composer" }).click();
  await dialog.waitFor({ state: "hidden" });
} finally {
  await contextSummaryApp.close();
}

const {
  app: contextSummaryCompactApp,
  page: contextSummaryCompactPage,
} = await launchScene(contextSummaryScene, {
  capture: false,
  windowSize: { height: 680, width: 720 },
});
try {
  const nativeBounds = await contextSummaryCompactApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  const compact = await contextSummaryCompactPage.evaluate(() => {
    const popover = document.querySelector(
      ".codex-ui-thread-summary-popover",
    );
    const value = popover?.getBoundingClientRect();
    return {
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      popover: value
        ? {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            right: value.right,
            top: value.top,
            width: value.width,
          }
        : null,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });
  if (
    nativeBounds?.width !== 720 ||
    nativeBounds?.height !== 680 ||
    compact.viewport.width !== 720 ||
    compact.viewport.height !== 680 ||
    !compact.popover ||
    Math.abs(compact.popover.width - 300) > 1 ||
    Math.abs(compact.popover.height - 199) > 1 ||
    compact.popover.left < 8 ||
    compact.popover.right > compact.viewport.width - 8 ||
    compact.popover.top < 8 ||
    compact.popover.bottom > compact.viewport.height - 8 ||
    compact.horizontalOverflow > 1
  ) {
    throw new Error(
      `Electron compact thread summary containment failed: ${JSON.stringify({ compact, nativeBounds })}`,
    );
  }
} finally {
  await contextSummaryCompactApp.close();
}

const subagentScene = {
  frame: "subagent-current-summary-completed",
  id: "electron-subagent-delegation",
  scenario: "subagent-delegation",
};
const { app: subagentApp, page: subagentPage } = await launchScene(
  subagentScene,
  { capture: false },
);
try {
  const measureSubagentLayout = () =>
    subagentPage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          right: value.right,
          top: value.top,
          width: value.width,
        };
      };
      const shell = document.querySelector(".codex-ui-app-shell");
      return {
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        main: rect(".codex-ui-app-shell__main"),
        panel: rect('[data-testid="subagent-panel"]'),
        panelOpen: shell?.hasAttribute("data-side-panel-open") ?? false,
        panelOverlay:
          shell?.hasAttribute("data-side-panel-overlay") ?? false,
        side: rect(".codex-ui-app-shell__side-panel"),
        sidebar: rect(".codex-ui-app-shell__sidebar"),
        sidebarOpen: shell?.hasAttribute("data-sidebar-open") ?? false,
        summary: rect(".demo-subagent-summary-panel"),
        transcript: rect('[data-testid="subagent-transcript"]'),
        viewport: { height: window.innerHeight, width: window.innerWidth },
      };
    });

  const initialSubagent = await measureSubagentLayout();
  if (
    initialSubagent.panelOpen ||
    !initialSubagent.summary ||
    Math.abs(initialSubagent.summary.left - 804) > 1 ||
    Math.abs(initialSubagent.summary.top - 45) > 1 ||
    Math.abs(initialSubagent.summary.width - 300) > 1 ||
    Math.abs(initialSubagent.summary.height - 241) > 1 ||
    !(await subagentPage
      .getByRole("button", { name: "Open subagents" })
      .textContent())
      ?.includes("1 done")
  ) {
    throw new Error(
      `Electron subagent summary baseline failed: ${JSON.stringify(initialSubagent)}`,
    );
  }

  await subagentPage
    .getByRole("button", { name: "Open subagents" })
    .click();
  await subagentPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="subagent-panel"]',
  );
  const wideSubagent = await measureSubagentLayout();
  if (
    !wideSubagent.panelOpen ||
    wideSubagent.summary ||
    !wideSubagent.side ||
    !wideSubagent.panel ||
    Math.abs(wideSubagent.side.left - 810.71875) > 1 ||
    Math.abs(wideSubagent.side.width - 369.28125) > 1 ||
    Math.abs(wideSubagent.panel.top - 46) > 1 ||
    Math.abs(wideSubagent.panel.height - 774) > 1
  ) {
    throw new Error(
      `Electron subagent panel open failed: ${JSON.stringify(wideSubagent)}`,
    );
  }

  await subagentPage.locator(".codex-ui-subagent-panel__item").click();
  await subagentPage.waitForSelector('[data-testid="subagent-transcript"]');
  const transcriptText = (
    await subagentPage.getByTestId("subagent-transcript").textContent()
  )?.replace(/\s+/g, " ").trim();
  if (
    !transcriptText?.includes("Long probe") ||
    !transcriptText.includes("SUBAGENT LONG PROBE DONE") ||
    (await subagentPage
      .getByRole("toolbar", { name: "Subagent response actions" })
      .count()) !== 1
  ) {
    throw new Error(
      `Electron subagent transcript failed: ${JSON.stringify(transcriptText)}`,
    );
  }
  await subagentPage
    .getByRole("button", { name: "Back to subagents" })
    .click();
  await subagentPage.waitForSelector('[data-testid="subagent-panel"]');

  await subagentApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(820, 680);
  });
  await subagentPage.waitForFunction(
    () =>
      window.innerWidth === 820 &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-side-panel-open"),
  );
  await subagentPage
    .locator(
      '.codex-ui-conversation-thread-shell__header button[aria-label="Toggle side panel"]',
    )
    .click();
  await subagentPage.waitForFunction(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    const side = document.querySelector(
      ".codex-ui-app-shell__side-panel",
    )?.getBoundingClientRect();
    return (
      shell?.hasAttribute("data-side-panel-open") &&
      Math.abs((side?.left ?? 0) - 501) <= 1 &&
      Math.abs((side?.width ?? 0) - 319) <= 1
    );
  });
  const compact820Subagent = await measureSubagentLayout();
  if (
    !compact820Subagent.sidebarOpen ||
    !compact820Subagent.panelOverlay ||
    compact820Subagent.sidebar?.width !== 274 ||
    compact820Subagent.horizontalOverflow > 1
  ) {
    throw new Error(
      `Electron 820px subagent continuity failed: ${JSON.stringify(compact820Subagent)}`,
    );
  }
  await subagentPage
    .locator(
      '.demo-subagent-workspace-panel button[aria-label="Toggle side panel"]',
    )
    .click();
  await subagentPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );

  await subagentApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await subagentPage.waitForFunction(
    () =>
      window.innerWidth === 720 &&
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
  );
  await subagentPage
    .locator(
      '.codex-ui-conversation-thread-shell__header button[aria-label="Toggle side panel"]',
    )
    .click();
  await subagentPage.waitForFunction(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    const side = document.querySelector(
      ".codex-ui-app-shell__side-panel",
    )?.getBoundingClientRect();
    return (
      shell?.hasAttribute("data-side-panel-open") &&
      Math.abs((side?.left ?? 0) - 390.6875) <= 1 &&
      Math.abs((side?.width ?? 0) - 329.3125) <= 1
    );
  });
  const compact720Subagent = await measureSubagentLayout();
  if (
    compact720Subagent.sidebarOpen ||
    !compact720Subagent.panelOverlay ||
    compact720Subagent.sidebar?.right !== 0 ||
    compact720Subagent.main?.width !== 720 ||
    compact720Subagent.horizontalOverflow > 1
  ) {
    throw new Error(
      `Electron 720px subagent continuity failed: ${JSON.stringify(compact720Subagent)}`,
    );
  }
} finally {
  await subagentApp.close();
}

for (const collaborationScene of [
  {
    frame: "subagent-concurrent-panel-mixed",
    id: "electron-subagent-concurrency",
    scenario: "subagent-concurrency",
    agents: ["Beta", "Alpha"],
    active: 1,
    done: 1,
    transcriptAgent: "Alpha",
    transcriptMessage: "ALPHA SUBAGENT DONE",
  },
  {
    frame: "subagent-nested-panel-mixed",
    id: "electron-subagent-nested",
    scenario: "subagent-nested",
    agents: ["Parent", "Child"],
    active: 1,
    done: 1,
    transcriptAgent: "Child",
    transcriptMessage: "CHILD SUBAGENT DONE",
  },
]) {
  const { app, page } = await launchScene(collaborationScene, {
    capture: false,
  });
  try {
    const panel = page.getByTestId("subagent-panel");
    await panel.waitFor();
    const panelText = (await panel.textContent())?.replace(/\s+/g, " ").trim();
    const panelAgentNames = await panel
      .locator(
        ".codex-ui-subagent-panel__item-heading > span:first-child",
      )
      .allTextContents();
    if (
      !panelText?.includes(`Active · ${collaborationScene.active}`) ||
      !panelText.includes(`Done · ${collaborationScene.done}`) ||
      JSON.stringify(panelAgentNames) !==
        JSON.stringify(collaborationScene.agents)
    ) {
      throw new Error(
        `Electron ${collaborationScene.scenario} mixed lifecycle failed: ${JSON.stringify({ panelAgentNames, panelText })}`,
      );
    }
    await panel
      .locator(".codex-ui-subagent-panel__item")
      .filter({ hasText: collaborationScene.transcriptAgent })
      .click();
    const transcript = page.getByTestId("subagent-transcript");
    await transcript.waitFor();
    const transcriptText = (await transcript.textContent())
      ?.replace(/\s+/g, " ")
      .trim();
    if (
      !transcriptText?.includes(collaborationScene.transcriptAgent) ||
      !transcriptText.includes(collaborationScene.transcriptMessage)
    ) {
      throw new Error(
        `Electron ${collaborationScene.scenario} transcript failed: ${JSON.stringify(transcriptText)}`,
      );
    }
    await page.getByRole("button", { name: "Back to subagents" }).click();
    await panel.waitFor();
  } finally {
    await app.close();
  }
}

for (const recoveryScene of [
  {
    activity: "updated",
    active: 12,
    frame: "subagent-recovery-panel-streaming",
    initialRows: 4,
    message: "Parsed 4 of 12 lifecycle events.",
    pageSize: 4,
  },
  {
    activity: "interrupted",
    active: 0,
    done: 12,
    frame: "subagent-recovery-panel-terminal",
    initialRows: 10,
    message: "Validation failed: fixture mismatch.",
    pageSize: 2,
  },
]) {
  const { app, page } = await launchScene(
    {
      frame: recoveryScene.frame,
      id: `electron-${recoveryScene.frame}`,
      scenario: "subagent-recovery",
    },
    { capture: false },
  );
  try {
    const panel = page.getByTestId("subagent-panel");
    await panel.waitFor();
    const panelText = (await panel.textContent())?.replace(/\s+/g, " ").trim();
    const timeline = page.locator(".demo-subagent-activity-timeline");
    await timeline.locator("button").first().click();
    const timelineText = (
      await timeline.textContent()
    )?.replace(/\s+/g, " ").trim();
    if (
      !panelText?.includes(`Active · ${recoveryScene.active}`) ||
      (recoveryScene.done !== undefined &&
        !panelText.includes(`Done · ${recoveryScene.done}`)) ||
      !panelText.includes(recoveryScene.message) ||
      !timelineText?.endsWith(recoveryScene.activity) ||
      (await panel.locator(".codex-ui-subagent-panel__item").count()) !==
        recoveryScene.initialRows
    ) {
      throw new Error(
        `Electron ${recoveryScene.frame} lifecycle failed: ${JSON.stringify({ panelText, timelineText })}`,
      );
    }

    await panel
      .getByRole("button", { name: `Show ${recoveryScene.pageSize} more` })
      .click();
    const firstExpandedCount = await panel
      .locator(".codex-ui-subagent-panel__item")
      .count();
    if (
      firstExpandedCount !==
      recoveryScene.initialRows + recoveryScene.pageSize
    ) {
      throw new Error(
        `Electron ${recoveryScene.frame} first pagination step failed: ${firstExpandedCount}`,
      );
    }
    if (recoveryScene.frame.endsWith("streaming")) {
      await panel.getByRole("button", { name: "Show 4 more" }).click();
      if (
        (await panel.locator(".codex-ui-subagent-panel__item").count()) !== 12
      ) {
        throw new Error(
          `Electron ${recoveryScene.frame} second pagination step failed.`,
        );
      }
    }
  } finally {
    await app.close();
  }
}

const { app: recoveryTranscriptApp, page: recoveryTranscriptPage } =
  await launchScene(
    {
      frame: "subagent-recovery-transcript-validator",
      id: "electron-subagent-recovery-transcript-validator",
      scenario: "subagent-recovery",
    },
    { capture: false },
  );
try {
  const transcript = recoveryTranscriptPage.getByTestId("subagent-transcript");
  await transcript.waitFor();
  const transcriptText = (await transcript.textContent())
    ?.replace(/\s+/g, " ")
    .trim();
  if (
    !transcriptText?.includes("Validator") ||
    !transcriptText.includes("Validation failed: fixture mismatch.") ||
    (await recoveryTranscriptPage
      .getByRole("toolbar", { name: "Subagent response actions" })
      .count()) !== 1
  ) {
    throw new Error(
      `Electron recovery subagent transcript failed: ${JSON.stringify(transcriptText)}`,
    );
  }
} finally {
  await recoveryTranscriptApp.close();
}

const liveSubagentScene = {
  frame: "recovered",
  id: "electron-live-subagent",
  scenario: "streaming-recovery",
};
const { app: liveSubagentApp, page: liveSubagentPage } = await launchScene(
  liveSubagentScene,
  { capture: false },
);
try {
  await liveSubagentPage.evaluate(() => {
    const activeIntervals = new Set();
    const originalSetInterval = window.setInterval.bind(window);
    const originalClearInterval = window.clearInterval.bind(window);
    window.__demoOneSecondIntervals = activeIntervals;
    window.setInterval = (handler, timeout, ...arguments_) => {
      const intervalId = originalSetInterval(handler, timeout, ...arguments_);
      if (timeout === 1_000) activeIntervals.add(intervalId);
      return intervalId;
    };
    window.clearInterval = (intervalId) => {
      activeIntervals.delete(intervalId);
      originalClearInterval(intervalId);
    };
  });
  await liveSubagentPage
    .getByRole("button", { exact: true, name: "Live" })
    .click();
  await liveSubagentPage.waitForSelector('.demo-root[data-mode="live"]');
  await liveSubagentApp.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0]?.webContents;
    const startedAtMs = Date.now() - 2_000;
    contents?.send("demo:notification", {
      method: "turn/started",
      params: {
        threadId: "thread-live-subagent",
        turn: {
          completedAt: null,
          durationMs: null,
          error: null,
          id: "turn-live-subagent",
          items: [],
          itemsView: "full",
          startedAt: 1,
          status: "inProgress",
        },
      },
    });
    contents?.send("demo:notification", {
      method: "item/started",
      params: {
        item: {
          agentsStates: {
            "long-probe": { message: null, status: "running" },
          },
          id: "collab-live-subagent",
          model: null,
          prompt: "Run the bounded live subagent probe.",
          reasoningEffort: null,
          receiverThreadIds: ["long-probe"],
          senderThreadId: "thread-live-subagent",
          status: "inProgress",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        startedAtMs,
        threadId: "thread-live-subagent",
        turnId: "turn-live-subagent",
      },
    });
  });
  const liveActivity = liveSubagentPage.getByRole("button", {
    name: "Open Long probe subagent",
  });
  await liveActivity.waitFor({ state: "visible" });
  const liveDuration = liveSubagentPage.locator(
    ".demo-subagent-activity-timeline .codex-ui-turn-duration",
  );
  const firstLiveDuration = await liveDuration.textContent();
  await liveSubagentPage.waitForFunction(
    (firstValue) => {
      const currentValue = document.querySelector(
        ".demo-subagent-activity-timeline .codex-ui-turn-duration",
      )?.textContent;
      return (
        currentValue?.startsWith("Working for ") && currentValue !== firstValue
      );
    },
    firstLiveDuration,
    { timeout: 4_000 },
  );
  const secondLiveDuration = await liveDuration.textContent();
  if (
    !firstLiveDuration?.startsWith("Working for ") ||
    !secondLiveDuration?.startsWith("Working for ") ||
    firstLiveDuration === secondLiveDuration
  ) {
    throw new Error(
      `Electron live subagent duration did not tick: ${JSON.stringify({ firstLiveDuration, secondLiveDuration })}`,
    );
  }
  await liveActivity.click();
  await liveSubagentPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="subagent-transcript"]',
  );

  await liveSubagentApp.evaluate(({ BrowserWindow }) => {
    const contents = BrowserWindow.getAllWindows()[0]?.webContents;
    contents?.send("demo:notification", {
      method: "item/completed",
      params: {
        completedAtMs: Date.now(),
        item: {
          agentsStates: {
            "long-probe": {
              message: "SUBAGENT LIVE PROBE DONE",
              status: "completed",
            },
          },
          id: "collab-live-subagent",
          model: null,
          prompt: "Run the bounded live subagent probe.",
          reasoningEffort: null,
          receiverThreadIds: ["long-probe"],
          senderThreadId: "thread-live-subagent",
          status: "completed",
          tool: "spawnAgent",
          type: "collabAgentToolCall",
        },
        threadId: "thread-live-subagent",
        turnId: "turn-live-subagent",
      },
    });
    contents?.send("demo:notification", {
      method: "turn/completed",
      params: {
        threadId: "thread-live-subagent",
        turn: {
          completedAt: 46,
          durationMs: 45_000,
          error: null,
          id: "turn-live-subagent",
          items: [],
          itemsView: "full",
          startedAt: 1,
          status: "completed",
        },
      },
    });
  });
  await liveSubagentPage.waitForFunction(
    () =>
      (document
        .querySelector('[data-testid="subagent-transcript"]')
        ?.textContent?.includes("SUBAGENT LIVE PROBE DONE") ?? false) &&
      document.querySelector(
        ".demo-subagent-activity-timeline .codex-ui-subagent-activity, .demo-subagent-activity-timeline .codex-ui-subagent-activity-group",
      ) === null,
  );
  if ((await liveDuration.textContent()) !== "Worked for 45s") {
    throw new Error(
      `Electron live subagent duration did not settle: ${JSON.stringify(await liveDuration.textContent())}`,
    );
  }
  if (
    (await liveSubagentPage
      .getByRole("button", { exact: true, name: "Worked for 45s" })
      .getAttribute("aria-expanded")) !== "false"
  ) {
    throw new Error("Electron live subagent timeline did not settle collapsed.");
  }
  await liveSubagentPage
    .getByRole("button", { name: "Back to subagents" })
    .click();
  await liveSubagentPage.waitForSelector('[data-testid="subagent-panel"]');
  const livePanelTime = liveSubagentPage.locator(
    '[data-testid="subagent-panel"] time',
  );
  const firstLivePanelTime = await livePanelTime.textContent();
  const livePanelDateTime = await livePanelTime.getAttribute("datetime");
  await liveSubagentPage.waitForFunction(
    (initialTime) =>
      document.querySelector('[data-testid="subagent-panel"] time')
        ?.textContent !== initialTime,
    firstLivePanelTime,
    { timeout: 3_000 },
  );
  const secondLivePanelTime = await livePanelTime.textContent();
  if (
    !firstLivePanelTime?.match(/^\d+[smhd] ago$/) ||
    firstLivePanelTime === "1m ago" ||
    firstLivePanelTime === secondLivePanelTime ||
    !livePanelDateTime ||
    Math.abs(Date.now() - Date.parse(livePanelDateTime)) > 10_000
  ) {
    throw new Error(
      `Electron live subagent panel time was not protocol-backed: ${JSON.stringify({ firstLivePanelTime, livePanelDateTime, secondLivePanelTime })}`,
    );
  }

  await liveSubagentApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send("demo:notification", {
      method: "item/completed",
      params: {
        completedAtMs: Date.now(),
        item: {
          changes: [
            {
              diff: "@@ -0,0 +1 @@\n+review remains reachable after delegation\n",
              kind: { type: "add" },
              path: "SUBAGENT_REVIEW.md",
            },
          ],
          id: "file-live-after-subagent",
          status: "completed",
          type: "fileChange",
        },
        threadId: "thread-live-subagent",
        turnId: "turn-live-subagent",
      },
    });
  });
  const liveReviewAction = liveSubagentPage.getByRole("button", {
    exact: true,
    name: "Review",
  });
  await liveReviewAction.waitFor({ state: "visible" });
  await liveReviewAction.click();
  await liveSubagentPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  await liveSubagentPage.waitForFunction(
    () => window.__demoOneSecondIntervals?.size === 0,
  );
  if (await liveSubagentPage.getByTestId("subagent-panel").isVisible()) {
    throw new Error(
      "Electron live file Review remained hidden behind the historical subagent panel.",
    );
  }
  await liveSubagentPage
    .locator(
      '.codex-ui-conversation-thread-shell__header button[aria-label="Toggle side panel"]',
    )
    .click();
  await liveSubagentPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="subagent-panel"]',
  );
  await liveSubagentPage
    .locator(
      '.demo-subagent-workspace-panel button[aria-label="Toggle side panel"]',
    )
    .click();
  await liveSubagentPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await liveSubagentPage
    .locator(
      '.codex-ui-conversation-thread-shell__header button[aria-label="Toggle side panel"]',
    )
    .click();
  await liveSubagentPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="subagent-panel"]',
  );
  await liveSubagentPage.locator(".codex-ui-subagent-panel__item").click();
  const liveTranscript = liveSubagentPage.getByTestId(
    "subagent-transcript",
  );
  await liveTranscript.waitFor({ state: "visible" });
  if (
    !(await liveTranscript.textContent())?.includes(
      "SUBAGENT LIVE PROBE DONE",
    )
  ) {
    throw new Error(
      "Electron live subagent did not preserve completed transcript access.",
    );
  }
  const settledTimeline = liveSubagentPage.getByRole("button", {
    exact: true,
    name: "Worked for 45s",
  });
  if ((await settledTimeline.getAttribute("aria-expanded")) !== "false") {
    throw new Error("Electron live subagent timeline reopened unexpectedly.");
  }
  await settledTimeline.click();
  if (
    !(await liveSubagentPage
      .getByRole("button", { name: "Open Long probe subagent" })
      .isVisible())
  ) {
    throw new Error(
      "Electron live subagent did not preserve manually reopenable completed activity.",
    );
  }
} finally {
  await liveSubagentApp.close();
}

const workspaceMissingScene = {
  currentSidebar: true,
  frame: "workspace-directory-missing",
  id: "workspace-directory-missing-electron",
  scenario: "workspace-workflow",
  view: "workspace",
};
const { app: workspaceMissingApp, page: workspaceMissingPage } =
  await launchScene(workspaceMissingScene, { capture: false });
try {
  const missingNotice = workspaceMissingPage.getByRole("complementary", {
    name: "Workspace status",
  });
  await missingNotice.waitFor({ state: "visible" });
  const workspaceComposer = workspaceMissingPage.getByRole("textbox", {
    name: "Do anything",
  });
  await workspaceComposer.fill(
    "Reply exactly MODEL-ONLY WORKTREE TURN COMPLETE.",
  );
  if (
    (await workspaceComposer.inputValue()) !==
      "Reply exactly MODEL-ONLY WORKTREE TURN COMPLETE." ||
    !(await workspaceMissingPage
      .getByText("Pull request status unavailable", { exact: true })
      .isVisible())
  ) {
    throw new Error(
      "Electron missing-worktree state did not preserve the Composer and unavailable PR summary.",
    );
  }
  await workspaceComposer.press("Enter");
  await workspaceMissingPage
    .getByText("MODEL-ONLY WORKTREE TURN COMPLETE.", { exact: true })
    .waitFor({ state: "visible" });
  if (
    (await workspaceComposer.inputValue()) !== "" ||
    !(await missingNotice.isVisible()) ||
    (await workspaceMissingPage
      .locator(".demo-workspace-persisted-thread .codex-ui-agent-message")
      .count()) !== 6
  ) {
    throw new Error(
      "Electron missing-worktree model-only turn did not preserve the latched thread state.",
    );
  }
  const summaryToggle = workspaceMissingPage.getByRole("button", {
    name: "Toggle workspace summary",
  });
  await summaryToggle.click();
  await workspaceMissingPage
    .getByRole("dialog", { name: "Workspace summary" })
    .waitFor({ state: "hidden" });
  await summaryToggle.click();
  await workspaceMissingPage
    .getByRole("dialog", { name: "Workspace summary" })
    .waitFor({ state: "visible" });
  await workspaceMissingPage
    .getByRole("button", { exact: true, name: "New chat" })
    .click();
  await workspaceMissingPage.waitForSelector(
    '.demo-root[data-frame="workspace-ready"]',
  );
  const retainedTask = workspaceMissingPage.getByRole("button", {
    exact: true,
    name: "Verify worktree persistence",
  });
  await retainedTask.waitFor({ state: "visible" });
  if ((await retainedTask.getAttribute("aria-current")) !== null) {
    throw new Error(
      "Electron persisted worktree task remained selected after opening New chat.",
    );
  }
  await workspaceMissingApp.evaluate(({ BrowserWindow }) => {
    const active = BrowserWindow.getAllWindows()[0];
    active?.setMinimumSize(480, 480);
    active?.setContentSize(600, 680);
  });
  await workspaceMissingPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open])',
  );
  await workspaceMissingPage
    .getByRole("button", { name: "Show sidebar" })
    .click();
  await workspaceMissingPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main[inert]',
  );
  await retainedTask.click();
  await workspaceMissingPage.waitForSelector(
    '.demo-root[data-frame="workspace-directory-missing"]',
  );
  await workspaceMissingPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open]) .codex-ui-app-shell__main:not([inert])',
  );
  const replaySummary = workspaceMissingPage.getByRole("dialog", {
    name: "Workspace summary",
  });
  if (!(await replaySummary.isVisible())) {
    await summaryToggle.click();
    await replaySummary.waitFor({ state: "visible" });
  }
  const replayNoticeVisible = await missingNotice.isVisible();
  const replayPullRequestUnavailable = await workspaceMissingPage
    .getByText("Pull request status unavailable", { exact: true })
    .isVisible();
  const replaySelectedWorktreeMarkers = await workspaceMissingPage
    .locator(
      '.codex-ui-app-sidebar__item-row[data-selected="true"] .codex-ui-app-sidebar__item-worktree-indicator svg',
    )
    .count();
  const replayMessageCount = await workspaceMissingPage
    .locator(".demo-workspace-persisted-thread .codex-ui-agent-message")
    .count();
  if (
    !replayNoticeVisible ||
    !replayPullRequestUnavailable ||
    replaySelectedWorktreeMarkers !== 1 ||
    replayMessageCount !== 6
  ) {
    throw new Error(
      `Electron missing-worktree replay did not retain the task, model-only turn, and session-latched warning: ${JSON.stringify(
        {
          replayMessageCount,
          replayNoticeVisible,
          replayPullRequestUnavailable,
          replaySelectedWorktreeMarkers,
        },
      )}`,
    );
  }
} finally {
  await workspaceMissingApp.close();
}

const projectCreationScene = {
  frame: "workspace-project-menu",
  id: "electron-project-creation",
  scenario: "workspace-workflow",
  view: "workspace",
};
const { app: projectCreationApp, page: projectCreationPage } =
  await launchScene(projectCreationScene, {
    environment: {
      CODEX_DEMO_PROJECT_FIXTURE_PATHS: JSON.stringify([
        resolve(process.cwd(), "scripts"),
        resolve(process.cwd(), "src"),
      ]),
    },
  });
try {
  const projectDialog = projectCreationPage.getByRole("dialog", {
    name: "Choose a project",
  });
  await projectDialog.waitFor({ state: "visible" });
  if (
    (await projectDialog.getByRole("button", { name: "New project" }).count()) !==
      1 ||
    (await projectDialog.getByText("Don't work in a project").count()) !== 0
  ) {
    throw new Error(
      "Electron current project picker retained a removed legacy action.",
    );
  }
  await projectDialog.getByRole("button", { name: "New project" }).click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"]',
  );
  const createdProjectTrigger = projectCreationPage.getByRole("button", {
    name: "Change project: scripts",
  });
  if (
    !(await createdProjectTrigger.isVisible()) ||
    (await projectDialog.isVisible())
  ) {
    throw new Error(
      "Electron project-directory selection did not return to the created workspace.",
    );
  }
  await createdProjectTrigger.click();
  await projectDialog.waitFor({ state: "visible" });
  await projectDialog.getByRole("button", { name: "New project" }).click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"]',
  );
  const secondCreatedProjectTrigger = projectCreationPage.getByRole(
    "button",
    { name: "Change project: src" },
  );
  await secondCreatedProjectTrigger.click();
  await projectDialog.waitFor({ state: "visible" });
  if (
    !(await projectDialog
      .getByRole("option", { name: "Select project scripts" })
      .isVisible()) ||
    !(await projectDialog
      .getByRole("option", { name: "Select project src" })
      .isVisible())
  ) {
    throw new Error(
      "Electron project picker did not preserve every project added during the session.",
    );
  }
  await projectCreationPage.keyboard.press("Escape");
  await projectDialog.waitFor({ state: "hidden" });
  await projectCreationPage
    .getByRole("button", { name: "View projects" })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="projects"][data-frame="projects-index-ready"]',
  );
  if (
    !(await projectCreationPage
      .getByRole("button", { name: "Open project scripts" })
      .isVisible()) ||
    !(await projectCreationPage
      .getByRole("button", { name: "Open project src" })
      .isVisible())
  ) {
    throw new Error(
      "Electron created projects did not remain visible in the project index.",
    );
  }
  if (
    !(await projectCreationPage
      .getByRole("button", { name: "Open project component-lab" })
      .isDisabled())
  ) {
    throw new Error(
      "Electron failed project row remained interactive and could route to a fallback workspace.",
    );
  }

  await projectCreationPage
    .getByRole("button", {
      name: "Show recent chats in codex-ui-kit",
    })
    .click();
  await projectCreationPage
    .getByRole("button", {
      name: "Open chat Match the current projects index",
    })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="projects-index-chat"] .demo-project-index-chat-route[data-project-id="codex-ui-kit"][data-chat-id="project-index-parity"]',
  );
  if (
    !(await projectCreationPage
      .locator(".demo-project-index-chat-route")
      .getByText("Match the current projects index", { exact: true })
      .isVisible())
  ) {
    throw new Error(
      "Electron project-index chat route did not retain the selected chat label.",
    );
  }

  await projectCreationPage
    .getByRole("button", { name: "View projects" })
    .click();
  await projectCreationPage
    .getByRole("button", {
      name: "Show recent chats in codex-ui-kit",
    })
    .click();
  await projectCreationPage
    .getByRole("button", {
      name: "Open chat Verify sidebar project behavior",
    })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="projects-index-chat"] .demo-project-index-chat-route[data-project-id="codex-ui-kit"][data-chat-id="sidebar-contract"]',
  );
  const projectChatNewChat = projectCreationPage.getByRole("button", {
    exact: true,
    name: "New chat",
  });
  if (
    !(await projectCreationPage
      .locator(".demo-project-index-chat-route")
      .getByText("Verify sidebar project behavior", { exact: true })
      .isVisible()) ||
    (await projectChatNewChat.getAttribute("aria-current")) !== null
  ) {
    throw new Error(
      "Electron project-index routing collapsed distinct recent chats or selected New chat on a saved-chat route.",
    );
  }
  const projectChatComposer = projectCreationPage.getByRole("textbox", {
    name: "Do anything",
  });
  await projectChatComposer.fill("Continue sidebar verification.");
  await projectChatComposer.press("Enter");
  await projectCreationPage
    .getByText("Continue sidebar verification.", { exact: true })
    .waitFor({ state: "visible" });
  if (
    (await projectChatComposer.inputValue()) !== "" ||
    !(await projectCreationPage
      .locator(
        '.demo-root[data-view="workspace"][data-frame="projects-index-chat"] .demo-project-index-chat-route[data-project-id="codex-ui-kit"][data-chat-id="sidebar-contract"]',
      )
      .isVisible()) ||
    !(await projectCreationPage
      .getByText("The selected project chat has been updated.", {
        exact: true,
      })
      .isVisible())
  ) {
    throw new Error(
      "Electron project chat submission did not retain the selected project/chat route.",
    );
  }
} finally {
  await projectCreationApp.close();
}

const createdProjectStartupGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-startup-project-"),
);
const createdProjectTargetGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-selected-project-"),
);
for (const directory of [
  createdProjectStartupGitDirectory,
  createdProjectTargetGitDirectory,
]) {
  await execFileAsync("git", ["init", "-b", "main"], { cwd: directory });
  await execFileAsync(
    "git",
    [
      "-c",
      "user.name=Codex UI Kit",
      "-c",
      "user.email=codex-ui-kit@example.invalid",
      "commit",
      "--allow-empty",
      "-m",
      "test: initialize routed project fixture",
    ],
    { cwd: directory },
  );
}
await execFileAsync("git", ["branch", "feat/disappearing"], {
  cwd: createdProjectStartupGitDirectory,
});
const createdProjectBranchScene = {
  frame: "workspace-project-menu",
  id: "electron-created-project-branch-routing",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: createdProjectBranchApp,
  page: createdProjectBranchPage,
} = await launchScene(createdProjectBranchScene, {
  capture: false,
  environment: {
    CODEX_DEMO_GIT_BRANCH_DELAY_MS: "750",
    CODEX_DEMO_PROJECT_FIXTURE_PATH: createdProjectTargetGitDirectory,
    CODEX_UI_KIT_WORKSPACE: createdProjectStartupGitDirectory,
  },
});
try {
  const untrustedProjectResponse = await createdProjectBranchPage.evaluate(
    () =>
      window.codexDemo?.createAndCheckoutBranch({
        branchName: "feat/untrusted-project",
        projectToken: "unregistered-project-token",
      }),
  );
  if (
    !untrustedProjectResponse ||
    untrustedProjectResponse.ok ||
    untrustedProjectResponse.code !== "unavailable"
  ) {
    throw new Error(
      `Electron host accepted an unregistered project token: ${JSON.stringify(untrustedProjectResponse)}.`,
    );
  }
  const untrustedProjectListResponse = await createdProjectBranchPage.evaluate(
    () =>
      window.codexDemo?.listBranches({
        projectToken: "unregistered-project-token",
      }),
  );
  if (
    !untrustedProjectListResponse ||
    untrustedProjectListResponse.ok ||
    untrustedProjectListResponse.code !== "unavailable"
  ) {
    throw new Error(
      `Electron host listed branches for an unregistered project token: ${JSON.stringify(untrustedProjectListResponse)}.`,
    );
  }
  await createdProjectBranchPage
    .getByRole("dialog", { name: "Choose a project" })
    .getByRole("button", { name: "New project" })
    .click();
  await createdProjectBranchPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"]',
  );
  await createdProjectBranchPage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  const selectedProjectBranchMenu = createdProjectBranchPage.getByRole(
    "menu",
    { name: "Branches" },
  );
  const selectedProjectInitialBranches = await selectedProjectBranchMenu
    .getByRole("menuitemradio")
    .evaluateAll((items) =>
      items.map((item) =>
        (item.textContent ?? "").replace(/[⑂✓]/g, "").trim(),
      ),
    );
  if (
    JSON.stringify(selectedProjectInitialBranches) !== JSON.stringify(["main"])
  ) {
    throw new Error(
      `Electron selected project did not enumerate its host branches: ${JSON.stringify(selectedProjectInitialBranches)}.`,
    );
  }
  await selectedProjectBranchMenu
    .getByRole("menuitem", { name: "Create and checkout new branch…" })
    .click();
  const routedBranchDialog = createdProjectBranchPage.getByRole("dialog", {
    name: "Create and checkout branch",
  });
  await routedBranchDialog
    .getByRole("textbox", { name: "Branch name" })
    .fill("feat/selected-project");
  await routedBranchDialog
    .getByRole("button", { name: "Create and checkout" })
    .click();
  await routedBranchDialog.waitFor({ state: "hidden" });
  const [startupBranch, selectedBranch] = await Promise.all(
    [createdProjectStartupGitDirectory, createdProjectTargetGitDirectory].map(
      (cwd) =>
        execFileAsync("git", ["branch", "--show-current"], {
          cwd,
          encoding: "utf8",
        }),
    ),
  );
  if (
    startupBranch.stdout.trim() !== "main" ||
    selectedBranch.stdout.trim() !== "feat/selected-project"
  ) {
    throw new Error(
      `Electron branch operation did not route to the host-registered selected project: ${JSON.stringify({
        selected: selectedBranch.stdout.trim(),
        startup: startupBranch.stdout.trim(),
      })}`,
    );
  }
  await createdProjectBranchPage
    .getByRole("button", {
      name: "Change worktree: feat/selected-project",
    })
    .click();
  await createdProjectBranchPage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", { name: "main" })
    .click();
  await createdProjectBranchPage.waitForSelector(
    'button[aria-label="Change worktree: main"]',
  );
  await createdProjectBranchPage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  await createdProjectBranchPage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", { name: "feat/selected-project" })
    .click();
  await createdProjectBranchPage
    .locator("#demo-workspace-project-trigger")
    .click();
  await createdProjectBranchPage
    .getByRole("dialog", { name: "Choose a project" })
    .getByRole("option", {
      exact: true,
      name: "Select project codex-ui-kit",
    })
    .click();
  const pendingCurrentProjectBranch = createdProjectBranchPage.getByRole(
    "button",
    { name: "Change worktree: main" },
  );
  if (
    !(await pendingCurrentProjectBranch.isDisabled()) ||
    !(await createdProjectBranchPage
      .getByText("Waiting for the current Git checkout to finish.", {
        exact: true,
      })
      .isVisible())
  ) {
    throw new Error(
      "Electron checkout did not block the newly selected project's branch control.",
    );
  }
  let staleCheckoutBranch = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await execFileAsync("git", ["branch", "--show-current"], {
      cwd: createdProjectTargetGitDirectory,
      encoding: "utf8",
    });
    staleCheckoutBranch = result.stdout.trim();
    if (staleCheckoutBranch === "feat/selected-project") break;
    await createdProjectBranchPage.waitForTimeout(100);
  }
  await createdProjectBranchPage.waitForFunction(
    () => {
      const button = document.querySelector(
        'button[aria-label="Change worktree: main"]',
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    },
  );
  await createdProjectBranchPage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  const currentProjectMainBranch = createdProjectBranchPage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", { name: "main" });
  if (
    staleCheckoutBranch !== "feat/selected-project" ||
    (await currentProjectMainBranch.getAttribute("aria-checked")) !== "true"
  ) {
    throw new Error(
      "Electron stale checkout result leaked into the newly selected project.",
    );
  }
  await createdProjectBranchPage.keyboard.press("Escape");
  await execFileAsync("git", ["branch", "-D", "feat/disappearing"], {
    cwd: createdProjectStartupGitDirectory,
  });
  await createdProjectBranchPage
    .getByRole("button", { name: "Change worktree: main" })
    .click();
  await createdProjectBranchPage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", { name: "feat/disappearing" })
    .click();
  await createdProjectBranchPage
    .getByText("Couldn’t checkout branch", { exact: true })
    .waitFor({ state: "visible" });
  await createdProjectBranchPage
    .locator("#demo-workspace-project-trigger")
    .click();
  await createdProjectBranchPage
    .getByRole("dialog", { name: "Choose a project" })
    .getByRole("option", {
      exact: true,
      name: "Select project desktop-shell",
    })
    .click();
  const unboundProjectBranchControl = createdProjectBranchPage.getByRole(
    "button",
    { name: "Change worktree: main" },
  );
  if (
    !(await unboundProjectBranchControl.isDisabled()) ||
    (await createdProjectBranchPage
      .getByText("Couldn’t checkout branch", { exact: true })
      .count()) !== 0 ||
    !(await createdProjectBranchPage
      .getByText(
        "Add this project from a local directory before managing its Git branches.",
        { exact: true },
      )
      .isVisible())
  ) {
    throw new Error(
      "Electron exposed branch operations for a project without a trusted host token.",
    );
  }
  await createdProjectBranchPage
    .locator("#demo-workspace-project-trigger")
    .click();
  await createdProjectBranchPage
    .getByRole("dialog", { name: "Choose a project" })
    .getByRole("button", { name: "New project" })
    .click();
  await createdProjectBranchPage.waitForSelector(
    'button[aria-label="Change worktree: feat/selected-project"]',
  );
  await createdProjectBranchPage
    .getByRole("textbox", { name: "Do anything" })
    .fill("Verify the in-place branch route.");
  await createdProjectBranchPage
    .getByRole("textbox", { name: "Do anything" })
    .press("Enter");
  await createdProjectBranchPage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  const inPlaceBranchCommandCwds = await createdProjectBranchPage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    inPlaceBranchCommandCwds.some(
      (cwd) => cwd !== `cwd\n${createdProjectTargetGitDirectory}`,
    )
  ) {
    throw new Error(
      `Electron in-place branch routed commands through a worktree path: ${JSON.stringify(inPlaceBranchCommandCwds)}.`,
    );
  }
} finally {
  await createdProjectBranchApp.close();
  await Promise.all(
    [createdProjectStartupGitDirectory, createdProjectTargetGitDirectory].map(
      (directory) => rm(directory, { force: true, recursive: true }),
    ),
  );
}

const knownProjectCreationScene = {
  frame: "workspace-project-menu",
  id: "electron-known-project-creation",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: knownProjectCreationApp,
  page: knownProjectCreationPage,
} = await launchScene(knownProjectCreationScene, {
  environment: {
    CODEX_DEMO_PROJECT_FIXTURE_SELECTIONS: JSON.stringify([
      {
        label: "codex-ui-kit",
        path: "/workspace/codex-ui-kit",
      },
    ]),
  },
  capture: false,
});
try {
  await knownProjectCreationPage
    .getByRole("dialog", { name: "Choose a project" })
    .getByRole("button", { name: "New project" })
    .click();
  await knownProjectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-ready"]',
  );
  await knownProjectCreationPage
    .getByRole("button", { name: "Change project: codex-ui-kit" })
    .click();
  const knownProjectDialog = knownProjectCreationPage.getByRole("dialog", {
    name: "Choose a project",
  });
  await knownProjectDialog.waitFor({ state: "visible" });
  if (
    (await knownProjectDialog
      .getByRole("option", { name: "Select project codex-ui-kit" })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron known-directory selection duplicated the project picker entry.",
    );
  }
  await knownProjectCreationPage.keyboard.press("Escape");
  await knownProjectCreationPage
    .getByRole("button", { name: "View projects" })
    .click();
  if (
    (await knownProjectCreationPage
      .locator(".demo-projects-route")
      .getByRole("button", { name: "Open project codex-ui-kit" })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron known-directory selection duplicated the Projects Index entry.",
    );
  }
} finally {
  await knownProjectCreationApp.close();
}

const projectCreationFailureScene = {
  currentSidebar: true,
  frame: "projects-index-ready",
  id: "electron-project-creation-failure",
  scenario: "workspace-workflow",
  view: "projects",
};
const {
  app: projectCreationFailureApp,
  page: projectCreationFailurePage,
} = await launchScene(projectCreationFailureScene, {
  environment: {
    CODEX_DEMO_PROJECT_FIXTURE_PATH: resolve(
      process.cwd(),
      "missing-project-fixture",
    ),
  },
  capture: false,
});
try {
  await projectCreationFailurePage
    .locator(".demo-projects-route")
    .getByRole("button", { name: "New project" })
    .click();
  const projectCreationAlert = projectCreationFailurePage.getByRole("alert");
  await projectCreationAlert.waitFor({ state: "visible" });
  if (
    (await projectCreationAlert.textContent())?.trim() !==
    "Couldn’t add that project. Try again."
  ) {
    throw new Error(
      "Electron Projects Index did not surface the project-creation failure.",
    );
  }
} finally {
  await projectCreationFailureApp.close();
}

const sidebarProjectCreationFailureScene = {
  currentSidebar: true,
  frame: "workspace-ready",
  id: "electron-sidebar-project-creation-failure",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: sidebarProjectCreationFailureApp,
  page: sidebarProjectCreationFailurePage,
} = await launchScene(sidebarProjectCreationFailureScene, {
  environment: {
    CODEX_DEMO_PROJECT_FIXTURE_PATH: resolve(
      process.cwd(),
      "missing-project-fixture",
    ),
  },
  capture: false,
});
try {
  const sidebarProjectCreationRouteBefore =
    await sidebarProjectCreationFailurePage
      .locator(".demo-root")
      .evaluate((element) => ({
        frame: element.getAttribute("data-frame"),
        view: element.getAttribute("data-view"),
      }));
  await sidebarProjectCreationFailurePage
    .getByRole("button", { name: "New project" })
    .click();
  const sidebarProjectCreationAlert =
    sidebarProjectCreationFailurePage.locator(".demo-sidebar-project-error");
  await sidebarProjectCreationAlert.waitFor({ state: "visible" });
  const sidebarProjectCreationRouteAfter =
    await sidebarProjectCreationFailurePage
      .locator(".demo-root")
      .evaluate((element) => ({
        frame: element.getAttribute("data-frame"),
        view: element.getAttribute("data-view"),
      }));
  if (
    (await sidebarProjectCreationAlert.textContent())?.trim() !==
      "Couldn't add that project" ||
    JSON.stringify(sidebarProjectCreationRouteAfter) !==
      JSON.stringify(sidebarProjectCreationRouteBefore)
  ) {
    throw new Error(
      `Electron sidebar project creation did not surface its failure in the invoking UI: ${JSON.stringify({
        routeAfter: sidebarProjectCreationRouteAfter,
        routeBefore: sidebarProjectCreationRouteBefore,
        text: (await sidebarProjectCreationAlert.textContent())?.trim(),
      })}`,
    );
  }
} finally {
  await sidebarProjectCreationFailureApp.close();
}

const projectCreationPanelCleanupScene = {
  currentSidebar: true,
  frame: "review-open",
  id: "electron-project-creation-panel-cleanup",
  scenario: "workspace-workflow",
};
const {
  app: projectCreationPanelCleanupApp,
  page: projectCreationPanelCleanupPage,
} = await launchScene(projectCreationPanelCleanupScene, {
  capture: false,
  environment: {
    CODEX_DEMO_PROJECT_FIXTURE_PATH: resolve(process.cwd(), "scripts"),
  },
  layoutMode: "wide",
});
try {
  await projectCreationPanelCleanupPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="review-panel"]',
  );
  await projectCreationPanelCleanupPage
    .getByRole("button", { name: "New project" })
    .click();
  await projectCreationPanelCleanupPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"] .codex-ui-app-shell:not([data-side-panel-open])',
  );
} finally {
  await projectCreationPanelCleanupApp.close();
}

const narrowProjectCreationScene = {
  currentSidebar: true,
  frame: "workspace-ready",
  id: "electron-narrow-project-creation",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: narrowProjectCreationApp,
  page: narrowProjectCreationPage,
} = await launchScene(narrowProjectCreationScene, {
  environment: {
    CODEX_DEMO_PROJECT_FIXTURE_PATH: resolve(process.cwd(), "scripts"),
  },
  capture: false,
});
try {
  await narrowProjectCreationApp.evaluate(({ BrowserWindow }) => {
    const active = BrowserWindow.getAllWindows()[0];
    active?.setMinimumSize(480, 480);
    active?.setContentSize(600, 680);
  });
  await narrowProjectCreationPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open])',
  );
  await narrowProjectCreationPage
    .getByRole("button", { name: "Show sidebar" })
    .click();
  await narrowProjectCreationPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main[inert]',
  );
  await narrowProjectCreationPage
    .getByRole("button", { name: "New project" })
    .click();
  await narrowProjectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"] .codex-ui-app-shell[data-layout-mode="narrow"]:not([data-sidebar-open]) .codex-ui-app-shell__main:not([inert])',
  );
} finally {
  await narrowProjectCreationApp.close();
}

console.log(
  "Electron host, native-window, current project-directory creation, coding-workspace routing and persisted/missing-worktree recovery replay, conversation/Composer and current image-attachment lifecycle plus current menus, current long, failed, and interrupted command output plus manual context compaction, thread summary, replay/live single, concurrent, nested, and mixed-recovery subagent delegation with 4/10 pagination, current mixed Search/Browser/MCP/approval/file/subagent flow, default 720px narrow reachability, resizable navigation/Review/Terminal/PR detail, PR tabs and expansion, MCP disclosure/result/unavailable-fallback, multi-file and mixed-content Review, selection/Undo, large diff scrolling, and compact geometry contracts passed.",
);
