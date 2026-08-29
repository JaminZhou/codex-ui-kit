import { launchScene } from "./electron-harness.mjs";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const currentSidebarErrorPathData = [
  "M10.6 9.70459C11.0142 9.70461 11.35 10.0404 11.35 10.4546V13.7876C11.35 14.2018 11.0142 14.5376 10.6 14.5376C10.1858 14.5376 9.84998 14.2018 9.84998 13.7876V10.4546C9.84998 10.0404 10.1858 9.70459 10.6 9.70459Z",
  "M10.6 6.2876C11.1292 6.28762 11.558 6.71732 11.558 7.24658C11.5578 7.77569 11.1291 8.20457 10.6 8.20459C10.0708 8.20459 9.64215 7.7757 9.64197 7.24658C9.64197 6.71731 10.0707 6.2876 10.6 6.2876Z",
  "M10.6 2.53955C14.9713 2.53955 18.515 6.08326 18.515 10.4546C18.515 14.8259 14.9713 18.3696 10.6 18.3696C6.22864 18.3696 2.68494 14.8259 2.68494 10.4546C2.68494 6.08326 6.22864 2.53955 10.6 2.53955ZM10.6 3.86963C6.96318 3.86963 4.01501 6.81779 4.01501 10.4546C4.01501 14.0914 6.96318 17.0396 10.6 17.0396C14.2368 17.0396 17.1849 14.0914 17.1849 10.4546C17.1849 6.81779 14.2368 3.86963 10.6 3.86963Z",
];

async function waitForBranchLabel(targetPage, label) {
  await targetPage
    .getByRole("button", { name: "Switch branch" })
    .getByText(label, { exact: true })
    .waitFor();
}

const scene = {
  frame: "markdown-complete",
  id: "electron",
  scenario: "markdown",
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
        { height: 20, rightInset: 35, width: 19 },
        { height: 20, rightInset: 8, width: 19 },
      ]) ||
    recentActionContract.opacity !== "1" ||
    recentActionContract.gap !== 8 ||
    JSON.stringify(recentActionContract.icons) !==
      JSON.stringify(["sidebar-pin", "sidebar-archive"]) ||
    JSON.stringify(recentActionContract.rects) !==
      JSON.stringify([
        { height: 20, rightInset: 35, width: 19 },
        { height: 20, rightInset: 8, width: 19 },
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
  const projectMenuContract = await projectMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    const relativeRect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left - bounds.left,
        top: value.top - bounds.top,
        width: value.width,
      };
    };
    const style = getComputedStyle(menu);
    const firstItem = menu.querySelector('[role="menuitem"]');
    const firstItemStyle = firstItem ? getComputedStyle(firstItem) : null;
    return {
      itemCount: menu.querySelectorAll('[role="menuitem"]').length,
      itemRects: Array.from(menu.querySelectorAll('[role="menuitem"]'),
        relativeRect,
      ),
      labels: Array.from(
        menu.querySelectorAll('[role="menuitem"]'),
        (item) => item.textContent?.trim(),
      ),
      rect: { height: bounds.height, width: bounds.width },
      separatorCount: menu.querySelectorAll('[role="separator"]').length,
      separatorRects: Array.from(
        menu.querySelectorAll('[role="separator"]'),
        relativeRect,
      ),
      style: {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderTopColor: style.borderTopColor,
        borderTopWidth: style.borderTopWidth,
        fontSize: firstItemStyle?.fontSize,
        fontWeight: firstItemStyle?.fontWeight,
        gap: firstItemStyle?.gap,
        padding: style.padding,
      },
    };
  });
  await page.keyboard.press("Escape");
  await projectMenu.waitFor({ state: "hidden" });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Project actions for session-browser",
  );
  const projectMenuFocusReturned = await projectMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    JSON.stringify(projectMenuIcons) !==
      JSON.stringify([
        "sidebar-project-menu-unpin",
        "sidebar-project-menu-edit",
        "sidebar-project-menu-reveal",
        "sidebar-project-menu-worktree",
        "sidebar-project-menu-archive",
        "sidebar-project-menu-remove",
      ]) ||
    projectMenuContract.itemCount !== 6 ||
    projectMenuContract.separatorCount !== 3 ||
    JSON.stringify(projectMenuContract.labels) !==
      JSON.stringify([
        "Unpin",
        "Edit",
        "Reveal in Finder",
        "Create permanent worktree",
        "Archive chats",
        "Remove project",
      ]) ||
    Math.abs(projectMenuContract.rect.width - 221) > 1 ||
    Math.abs(projectMenuContract.rect.height - 187) > 1 ||
    JSON.stringify(projectMenuContract.itemRects) !==
      JSON.stringify([
        { height: 25, left: 5, top: 5, width: 211 },
        { height: 25, left: 5, top: 30, width: 211 },
        { height: 25, left: 5, top: 64, width: 211 },
        { height: 25, left: 5, top: 89, width: 211 },
        { height: 25, left: 5, top: 123, width: 211 },
        { height: 25, left: 5, top: 157, width: 211 },
      ]) ||
    JSON.stringify(projectMenuContract.separatorRects) !==
      JSON.stringify([
        { height: 1, left: 16, top: 58, width: 189 },
        { height: 1, left: 16, top: 117, width: 189 },
        { height: 1, left: 16, top: 152, width: 189 },
      ]) ||
    JSON.stringify(projectMenuContract.style) !==
      JSON.stringify({
        backgroundColor: "rgb(26, 26, 26)",
        borderRadius: "11px",
        borderTopColor: "rgb(94, 94, 94)",
        borderTopWidth: "1px",
        fontSize: "13px",
        fontWeight: "400",
        gap: "6px",
        padding: "4px",
      }) ||
    !projectMenuFocusReturned
  ) {
    throw new Error(
      `Electron project menu lifecycle failed: ${JSON.stringify({ projectMenuContract, projectMenuFocusReturned, projectMenuIcons })}`,
    );
  }
  const unreadProjectMenuTrigger = page.getByRole("button", {
    name: "Project actions for codex-ui-kit",
  });
  await unreadProjectMenuTrigger.scrollIntoViewIfNeeded();
  await unreadProjectMenuTrigger.click();
  const unreadProjectMenu = page.getByRole("menu", {
    name: "codex-ui-kit project menu",
  });
  await unreadProjectMenu.waitFor({ state: "visible" });
  const unreadProjectMenuContract = await unreadProjectMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return {
      labels: Array.from(
        menu.querySelectorAll('[role="menuitem"]'),
        (item) => item.textContent?.trim(),
      ),
      rect: { height: bounds.height, width: bounds.width },
      separatorCount: menu.querySelectorAll('[role="separator"]').length,
    };
  });
  if (
    JSON.stringify(unreadProjectMenuContract.labels) !==
      JSON.stringify([
        "Unpin",
        "Edit",
        "Reveal in Finder",
        "Create permanent worktree",
        "Mark all as read",
        "Archive chats",
        "Remove project",
      ]) ||
    unreadProjectMenuContract.separatorCount !== 3 ||
    Math.abs(unreadProjectMenuContract.rect.width - 221) > 1 ||
    Math.abs(unreadProjectMenuContract.rect.height - 212) > 1 ||
    !(await unreadProjectMenu
      .getByRole("menuitem", { name: "Mark all as read" })
      .isVisible())
  ) {
    throw new Error(
      `Electron unread project menu variant failed: ${JSON.stringify(unreadProjectMenuContract)}`,
    );
  }
  await page.keyboard.press("Escape");
  await unreadProjectMenu.waitFor({ state: "hidden" });

  const sidebarVoice = page.locator(
    '.codex-ui-app-sidebar-footer__actions button[aria-label="Start new voice chat"]',
  );
  const sidebarVoiceContract = await sidebarVoice.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const icon = button.querySelector("[data-current-build-icon]");
    const iconBounds = icon?.getBoundingClientRect();
    return {
      height: bounds.height,
      iconHeight: iconBounds?.height,
      iconName: icon?.getAttribute("data-current-build-icon"),
      iconWidth: iconBounds?.width,
      label: button.textContent?.trim(),
      width: bounds.width,
    };
  });
  if (
    Math.abs(sidebarVoiceContract.width - 75.67) > 1 ||
    sidebarVoiceContract.height !== 28 ||
    sidebarVoiceContract.iconWidth !== 16 ||
    sidebarVoiceContract.iconHeight !== 16 ||
    sidebarVoiceContract.iconName !== "sidebar-voice" ||
    sidebarVoiceContract.label !== "Voice"
  ) {
    throw new Error(
      `Electron sidebar Voice control failed: ${JSON.stringify(sidebarVoiceContract)}`,
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
    rect: (() => {
      const bounds = menu.getBoundingClientRect();
      return { height: bounds.height, width: bounds.width };
    })(),
    heading: menu.querySelector(
      ".demo-current-sidebar-help-menu__heading",
    )?.textContent,
    itemCount: menu.querySelectorAll('[role="menuitem"]').length,
    separatorCount: menu.querySelectorAll('[role="separator"]').length,
  }));
  await page.keyboard.press("Escape");
  await helpMenu.waitFor({ state: "hidden" });
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Open help menu",
  );
  if (
    helpMenuIcons.length !== 9 ||
    helpMenuStructure.heading !== "What's new" ||
    helpMenuStructure.itemCount !== 8 ||
    helpMenuStructure.separatorCount !== 1 ||
    Math.abs(helpMenuStructure.rect.width - 320) > 1 ||
    Math.abs(helpMenuStructure.rect.height - 272.06) > 1 ||
    JSON.stringify(helpMenuIcons) !==
      JSON.stringify([
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-changelog",
        "sidebar-help-menu-changelog-external",
        "sidebar-help-menu-chrome",
        "sidebar-help-menu-remote",
        "sidebar-help-menu-keyboard",
        "sidebar-help-menu-support",
      ]) ||
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
  await page.waitForFunction(() => {
    const active = document.activeElement;
    return (
      active instanceof HTMLButtonElement &&
      active.getAttribute("role") !== "menuitem" &&
      (active.textContent?.includes("Demo account") ?? false)
    );
  });
  accountMenuContract.focusReturned = await accountMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    accountMenuContract.itemCount !== 6 ||
    accountMenuContract.imageCount !== 1 ||
    accountMenuContract.separatorCount !== 0 ||
    accountMenuContract.dividerHeight !== 9 ||
    accountMenuContract.focusRole !== "menu" ||
    !accountMenuContract.focusReturned ||
    Math.abs(accountMenuContract.rect.width - 258) > 1 ||
    Math.abs(accountMenuContract.rect.height - 188.38) > 1 ||
    JSON.stringify(accountMenuContract.icons) !==
      JSON.stringify([
        "sidebar-account-menu-usage",
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
        const statusPill = status?.querySelector(
          ".codex-ui-app-sidebar__item-status-pill",
        );
        const secondaryStatus = row?.querySelector(
          ".codex-ui-app-sidebar__item-secondary-status",
        );
        const secondaryAttention = secondaryStatus?.querySelector(
          ".codex-ui-app-sidebar__item-status-attention",
        );
        const metric = (element) => {
          if (!(element instanceof Element)) return null;
          const bounds = element.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        };
        const rowBounds = row?.getBoundingClientRect();
        const statusBounds = status?.getBoundingClientRect();
        const secondaryStatusBounds = secondaryStatus?.getBoundingClientRect();
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
          errorPathData: Array.from(
            error?.querySelectorAll("path") ?? [],
            (path) => path.getAttribute("d"),
          ),
          fixture: item.getAttribute("data-sidebar-status-fixture"),
          rowRect: metric(row),
          rightInset:
            rowBounds && statusBounds
              ? rowBounds.right - statusBounds.right
              : null,
          secondaryAttentionColor: secondaryAttention
            ? getComputedStyle(secondaryAttention).backgroundColor
            : null,
          secondaryAttentionRect: metric(secondaryAttention),
          secondaryRightInset:
            rowBounds && secondaryStatusBounds
              ? rowBounds.right - secondaryStatusBounds.right
              : null,
          secondaryStatus:
            secondaryStatus?.getAttribute("data-status") ?? null,
          secondaryStatusRect: metric(secondaryStatus),
          secondaryVisualStatus:
            secondaryStatus?.getAttribute("data-visual-status") ?? null,
          status: status?.getAttribute("data-status"),
          statusOpacity: status ? getComputedStyle(status).opacity : null,
          statusPillRect: metric(statusPill),
          statusPillText: statusPill?.textContent?.trim() ?? null,
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
        const secondaryStatus = row?.querySelector(
          ".codex-ui-app-sidebar__item-secondary-status",
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
          secondaryStatus:
            secondaryStatus?.getAttribute("data-status") ?? null,
          secondaryVisualStatus:
            secondaryStatus?.getAttribute("data-visual-status") ?? null,
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
    ["desktop-cleanup:0", "waiting", "loading"],
    ["desktop-cleanup:1", "error", "error"],
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
        fixture.rightInset !==
          (fixture.fixture === "design-assets:2" ? 36 : 8) ||
        (fixture.visualStatus === "attention" &&
          (fixture.attentionRect?.width !== 8 ||
            fixture.attentionRect?.height !== 8 ||
            fixture.attentionColor !== "rgb(131, 195, 255)")) ||
        (fixture.visualStatus === "error" &&
          (fixture.errorRect?.width !== 16 ||
            fixture.errorRect?.height !== 16 ||
            JSON.stringify(fixture.errorPathData) !==
              JSON.stringify(currentSidebarErrorPathData))) ||
        (fixture.visualStatus === "loading" &&
          (fixture.animationDuration !== "1e-06s" ||
            fixture.animationName !== "none")) ||
        (fixture.fixture === "design-assets:2" &&
          (fixture.secondaryStatus !== "unread" ||
            fixture.secondaryVisualStatus !== "attention" ||
            fixture.secondaryStatusRect?.width !== 20 ||
            fixture.secondaryStatusRect?.height !== 20 ||
            fixture.secondaryRightInset !== 8 ||
            fixture.secondaryAttentionRect?.width !== 8 ||
            fixture.secondaryAttentionRect?.height !== 8 ||
            fixture.secondaryAttentionColor !== "rgb(131, 195, 255)")),
    )
  ) {
    throw new Error(
      `Electron current sidebar status lifecycle failed: ${JSON.stringify(statusContract)}`,
    );
  }
  const expectedWorktreeStatuses = [
    ["codex-ui-kit:1", "queued", "queued", "loading", null, null],
    ["design-assets:0", "creating", "loading", "loading", null, null],
    ["design-assets:1", "setting-up", "loading", "loading", null, null],
    ["design-assets:2", "failed", "error", "error", "unread", null],
    [
      "protocol-client:0",
      "restored",
      "idle",
      null,
      null,
      "Worktree is restored",
    ],
  ];
  const actualWorktreeStatuses = worktreeContract.map(
    ({
      fixture,
      secondaryStatus,
      status,
      visualStatus,
      worktreeDescription,
      worktreeStatus,
    }) => [
      fixture,
      worktreeStatus,
      status,
      visualStatus ?? null,
      secondaryStatus,
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
          (fixture.worktreeStatus === "restored"
            ? 11
            : fixture.secondaryStatus
              ? 67
              : 39) ||
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

  const rtlWorktreeGeometry = await sidebarStatusPage.evaluate(async () => {
    const item = document.querySelector(
      '[data-sidebar-worktree-status-fixture="design-assets:2"]',
    );
    const row = item?.closest(".codex-ui-app-sidebar__item-row");
    if (!(row instanceof HTMLElement)) return null;
    row.dir = "rtl";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rowBounds = row.getBoundingClientRect();
    const inlineStart = (selector) => {
      const element = row.querySelector(selector);
      if (!(element instanceof Element)) return null;
      return element.getBoundingClientRect().left - rowBounds.left;
    };
    const geometry = {
      branch: inlineStart(".codex-ui-app-sidebar__item-worktree-indicator"),
      secondaryStatus: inlineStart(
        ".codex-ui-app-sidebar__item-secondary-status",
      ),
      status: inlineStart(".codex-ui-app-sidebar__item-status"),
    };
    row.removeAttribute("dir");
    return geometry;
  });
  if (
    !rtlWorktreeGeometry ||
    Math.abs(rtlWorktreeGeometry.secondaryStatus - 8) > 0.1 ||
    Math.abs(rtlWorktreeGeometry.status - 36) > 0.1 ||
    Math.abs(rtlWorktreeGeometry.branch - 67) > 0.1
  ) {
    throw new Error(
      `Electron RTL worktree status geometry failed: ${JSON.stringify(rtlWorktreeGeometry)}`,
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
    secondaryStatus: getComputedStyle(
      row.querySelector(".codex-ui-app-sidebar__item-secondary-status"),
    ).opacity,
    status: getComputedStyle(
      row.querySelector(".codex-ui-app-sidebar__item-status"),
    ).opacity,
  }));
  if (
    hoveredWorktree.actions !== "1" ||
    hoveredWorktree.branch !== "0" ||
    hoveredWorktree.status !== "0" ||
    hoveredWorktree.secondaryStatus !== "0"
  ) {
    throw new Error(
      `Electron current sidebar worktree/action replacement failed: ${JSON.stringify(hoveredWorktree)}`,
    );
  }
} finally {
  await sidebarStatusApp.close();
}

for (const collectionScene of [
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "electron-current-sidebar-collection-empty",
    scenario: "streaming-recovery",
    sidebarState: "collection-empty",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "electron-current-sidebar-collection-loading",
    scenario: "streaming-recovery",
    sidebarState: "collection-loading",
  },
  {
    currentSidebar: true,
    frame: "sidebar-current",
    id: "electron-current-sidebar-collection-long-list",
    scenario: "streaming-recovery",
    sidebarSectionKind: "threads",
    sidebarState: "collection-long-list",
  },
]) {
  const { app: collectionApp, page: collectionPage } = await launchScene(
    collectionScene,
    { capture: false },
  );
  try {
    const collection = await collectionPage.evaluate(() => {
      const element = document.querySelector(
        "[data-sidebar-collection-fixture]",
      );
      if (!(element instanceof HTMLElement)) return null;
      const bounds = element.getBoundingClientRect();
      const toggle = element.querySelector(
        ".codex-ui-app-sidebar__collection-toggle",
      );
      const style = getComputedStyle(element);
      return {
        accessibleLabelCount: element.querySelectorAll(
          ".codex-ui-app-sidebar__collection-loading-label",
        ).length,
        ariaLabel: element.getAttribute("aria-label"),
        ariaLive: element.getAttribute("aria-live"),
        fixture: element.getAttribute("data-sidebar-collection-fixture"),
        height: bounds.height,
        itemCount: element.querySelectorAll(
          '.codex-ui-app-sidebar__collection-item[role="listitem"]:not(.codex-ui-app-sidebar__collection-toggle-item)',
        ).length,
        loadingHeadingCount: element.querySelectorAll(
          ".codex-ui-app-sidebar__collection-loading-heading > span",
        ).length,
        loadingRowCount: element.querySelectorAll(
          ".codex-ui-app-sidebar__collection-loading-rows > span",
        ).length,
        role: element.getAttribute("role"),
        state: element.getAttribute("data-state"),
        style: {
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          opacity: style.opacity,
          padding: style.padding,
        },
        text: element.textContent?.replace(/\s+/g, " ").trim() ?? null,
        toggleExpanded: toggle?.getAttribute("aria-expanded") ?? null,
        toggleText: toggle?.textContent?.trim() ?? null,
      };
    });
    if (!collection) {
      throw new Error(`${collectionScene.id}: collection fixture missing.`);
    }
    if (
      collectionScene.sidebarState === "collection-empty" &&
      (collection.fixture !== "empty" ||
        collection.state !== "empty" ||
        collection.text !== "No chats" ||
        collection.height !== 29 ||
        collection.style.fontSize !== "14px" ||
        collection.style.lineHeight !== "21px" ||
        collection.style.opacity !== "0.5" ||
        collection.style.padding !== "4px 32px")
    ) {
      throw new Error(
        `${collectionScene.id}: Electron empty collection drifted: ${JSON.stringify(collection)}`,
      );
    }
    if (
      collectionScene.sidebarState === "collection-loading" &&
      (collection.fixture !== "loading" ||
        collection.state !== "loading" ||
        collection.accessibleLabelCount !== 1 ||
        collection.ariaLabel !== null ||
        collection.ariaLive !== "polite" ||
        collection.loadingHeadingCount !== 1 ||
        collection.loadingRowCount !== 4 ||
        collection.role !== "status" ||
        collection.text !== "Loading chats")
    ) {
      throw new Error(
        `${collectionScene.id}: Electron loading collection drifted: ${JSON.stringify(collection)}`,
      );
    }
    if (collectionScene.sidebarState === "collection-long-list") {
      if (
        collection.fixture !== "long-list" ||
        collection.itemCount !== 5 ||
        collection.toggleExpanded !== null ||
        collection.toggleText !== "Show more"
      ) {
        throw new Error(
          `${collectionScene.id}: Electron long collection drifted: ${JSON.stringify(collection)}`,
        );
      }
      const toggle = collectionPage.getByRole("button", {
        exact: true,
        name: "Show more",
      });
      await toggle.focus();
      await collectionPage.keyboard.press("Enter");
      const expanded = await collectionPage.evaluate(() => {
        const element = document.querySelector(
          '[data-sidebar-collection-fixture="long-list"]',
        );
        const navigation = document.querySelector(
          ".codex-ui-app-sidebar__navigation",
        );
        const toggle = element?.querySelector(
          ".codex-ui-app-sidebar__collection-toggle",
        );
        return {
          dataExpanded: element?.getAttribute("data-expanded") ?? null,
          itemCount:
            element?.querySelectorAll(
              '.codex-ui-app-sidebar__collection-item[role="listitem"]:not(.codex-ui-app-sidebar__collection-toggle-item)',
            ).length ?? 0,
          scrollOverflow: navigation
            ? navigation.scrollHeight - navigation.clientHeight
            : null,
          showLessCount: [...(element?.querySelectorAll("button") ?? [])]
            .filter((button) => button.textContent?.trim() === "Show less")
            .length,
          toggleExists: Boolean(toggle),
        };
      });
      if (
        expanded.itemCount !== 12 ||
        expanded.dataExpanded !== "true" ||
        expanded.toggleExists ||
        expanded.showLessCount !== 0 ||
        !(expanded.scrollOverflow > 0)
      ) {
        throw new Error(
          `${collectionScene.id}: Electron long collection expansion drifted: ${JSON.stringify(expanded)}`,
        );
      }
    }
  } finally {
    await collectionApp.close();
  }
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
        ".codex-ui-conversation-project-options__pinned [role=option]",
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
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  const themeEnvironmentMenu = themePage.getByRole("menu", {
    name: "Work in",
  });
  const environmentOverlayPaint = await themeEnvironmentMenu.evaluate(
    (menu) => ({
      background: getComputedStyle(menu).backgroundColor,
      border: getComputedStyle(menu).borderColor,
      item: getComputedStyle(
        menu.querySelector('[role="menuitem"]'),
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
  await themeEnvironmentMenu
    .getByRole("menuitem", { name: "New local worktree" })
    .click();
  await themeEnvironmentMenu.waitFor({ state: "hidden" });
  await themePage
    .getByRole("button", { name: "Select a local environment" })
    .click();
  await themePage
    .getByRole("menu", { name: "Environment" })
    .getByRole("menuitem", { name: "Set up project" })
    .click();
  const lightEnvironmentSettings = themePage.getByRole("region", {
    name: "Environments",
  });
  await lightEnvironmentSettings.waitFor();
  const lightEnvironmentSettingsPaint =
    await lightEnvironmentSettings.evaluate((region) => {
      const route = region.closest(
        ".demo-workspace-environment-settings-route",
      );
      const title = region.querySelector("h1");
      const statusHeading = region.querySelector("h2");
      return {
        routeBackground: route
          ? getComputedStyle(route).backgroundColor
          : null,
        root: document
          .querySelector(".demo-root")
          ?.getAttribute("data-theme"),
        statusHeadingColor: statusHeading
          ? getComputedStyle(statusHeading).color
          : null,
        titleColor: title ? getComputedStyle(title).color : null,
      };
    });
  if (
    lightEnvironmentSettingsPaint.routeBackground !== "rgb(255, 255, 255)" ||
    lightEnvironmentSettingsPaint.root !== "light" ||
    lightEnvironmentSettingsPaint.statusHeadingColor !== "rgb(26, 28, 31)" ||
    lightEnvironmentSettingsPaint.titleColor !== "rgb(26, 28, 31)"
  ) {
    throw new Error(
      `Electron light environment settings contract failed: ${JSON.stringify(lightEnvironmentSettingsPaint)}`,
    );
  }
  await themePage
    .getByRole("button", { exact: true, name: "New chat" })
    .click();
  await lightEnvironmentSettings.waitFor({ state: "hidden" });

  await themePage
    .getByRole("button", {
      name: "Switch branch",
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
  frame: "markdown-complete",
  id: "electron-narrow-reachability",
  scenario: "markdown",
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
      document
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
  const pinnedMainWidth = await narrowPage
    .locator(".codex-ui-app-shell__main")
    .evaluate((element) => element.getBoundingClientRect().width);
  if (Math.abs(pinnedMainWidth - 446) > 1) {
    throw new Error(
      `Electron current-build visible narrow sidebar geometry failed: ${pinnedMainWidth}`,
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
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open]',
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

const currentAttachmentPickerScene = {
  currentSidebar: true,
  frame: "attachment-current-post-picker",
  id: "electron-current-attachment-picker",
  scenario: "attachment-lifecycle",
  sidebarState: "hidden",
  windowSize: { height: 680, width: 720 },
};
const {
  app: currentAttachmentPickerApp,
  page: currentAttachmentPickerPage,
} = await launchScene(currentAttachmentPickerScene, { capture: false });

try {
  const currentAttachments = currentAttachmentPickerPage.locator(
    ".codex-ui-composer .codex-ui-composer-attachment",
  );
  await currentAttachments.first().waitFor();
  const currentPickerGeometry = await currentAttachmentPickerPage.evaluate(() => {
    const composer = document.querySelector(".codex-ui-composer");
    const tray = document.querySelector(".codex-ui-composer__attachments");
    const rect = composer?.getBoundingClientRect();
    return {
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      composer: rect ? { height: rect.height, width: rect.width } : null,
      overflow: tray ? tray.scrollWidth - tray.clientWidth : null,
    };
  });
  if (
    currentPickerGeometry.attachmentCount !== 2 ||
    Math.abs((currentPickerGeometry.composer?.width ?? 0) - 640) > 1 ||
    Math.abs((currentPickerGeometry.composer?.height ?? 0) - 178) > 1 ||
    (currentPickerGeometry.overflow ?? Infinity) > 1
  ) {
    throw new Error(
      `Electron current attachment picker geometry failed: ${JSON.stringify(currentPickerGeometry)}`,
    );
  }

  const imageTrigger = currentAttachmentPickerPage.getByRole("button", {
    exact: true,
    name: "shell-notification-success-stack.png",
  });
  await imageTrigger.click();
  const previewDialog = currentAttachmentPickerPage.getByRole("dialog", {
    exact: true,
    name: "Image preview",
  });
  await previewDialog.waitFor();
  const initialPreview = await currentAttachmentPickerPage.evaluate(() => ({
    activeElementRole: document.activeElement?.getAttribute("role"),
    zoom: document
      .querySelector(".codex-ui-image-preview__zoom-toolbar span")
      ?.textContent?.trim(),
  }));
  if (
    initialPreview.activeElementRole !== "dialog" ||
    initialPreview.zoom !== "56%"
  ) {
    throw new Error(
      `Electron current attachment preview initial state failed: ${JSON.stringify(initialPreview)}`,
    );
  }
  await currentAttachmentPickerPage
    .getByRole("button", { name: "Zoom in image" })
    .click();
  await currentAttachmentPickerPage
    .getByText("66%", { exact: true })
    .waitFor();
  await currentAttachmentPickerPage
    .getByRole("button", { name: "Zoom out image" })
    .click();
  await currentAttachmentPickerPage
    .getByText("56%", { exact: true })
    .waitFor();
  await previewDialog.press("Escape");
  await previewDialog.waitFor({ state: "detached" });
  if (!(await imageTrigger.evaluate((element) => element === document.activeElement))) {
    throw new Error(
      "Electron current attachment preview did not restore image-trigger focus.",
    );
  }

  await currentAttachmentPickerPage
    .getByRole("button", {
      name: "Remove codex-ui-kit-attachment-evidence.txt",
    })
    .click();
  await currentAttachmentPickerPage
    .getByRole("button", {
      name: "Remove shell-notification-success-stack.png",
    })
    .click();
  if ((await currentAttachments.count()) !== 0) {
    throw new Error(
      "Electron current attachment removal did not empty the picker tray.",
    );
  }
} finally {
  await currentAttachmentPickerApp.close();
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
    (nativeSelection.overflow ?? Infinity) > 1 ||
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
        '[data-item-id="assistant-markdown"] .demo-turn-actions button',
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

async function currentMarkdown26818Contract(page) {
  return page.evaluate(() => {
    const root = document.querySelector(
      '[data-item-id="assistant-markdown"] .codex-ui-markdown',
    );
    const metric = (selector) => {
      const element = root?.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        height: rect.height,
        left: rect.left,
        width: rect.width,
      };
    };
    const rootRect = root?.getBoundingClientRect();
    const rootStyle = root ? getComputedStyle(root) : null;
    return {
      actionCount: document.querySelectorAll(
        '[data-item-id="assistant-markdown"] .demo-turn-actions button',
      ).length,
      actions: Array.from(
        document.querySelectorAll(
          '[data-item-id="assistant-markdown"] .demo-turn-actions button',
        ),
        (button) => ({
          icon: button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
          label: button.getAttribute("aria-label"),
        }),
      ),
      codeBlock: metric(".codex-ui-code-block"),
      codeActions: Array.from(
        root?.querySelectorAll(".codex-ui-code-block__header button") ?? [],
        (button) => ({
          label: button.getAttribute("aria-label"),
          pressed: button.getAttribute("aria-pressed"),
        }),
      ),
      copyLabel: root
        ?.querySelector(".codex-ui-code-block__copy")
        ?.getAttribute("aria-label"),
      fontFamily: rootStyle?.fontFamily,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      inlineLinkCount: root?.querySelectorAll("a").length,
      root: rootRect
        ? {
            color: rootStyle?.color,
            height: rootRect.height,
            left: rootRect.left,
            width: rootRect.width,
          }
        : null,
      table: metric("table"),
      tableScroll: metric(".codex-ui-markdown__table-scroll"),
    };
  });
}

async function currentMarkdown26825Contract(page) {
  return page.evaluate(() => {
    const item = document.querySelector(
      '[data-item-id="assistant-markdown-current-26-825"]',
    );
    const root = item?.querySelector(".codex-ui-markdown");
    const rect = (element) => {
      const bounds = element?.getBoundingClientRect();
      return bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null;
    };
    const style = (element) => {
      if (!(element instanceof Element)) return null;
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        padding: computed.padding,
        rect: rect(element),
        textAlign: computed.textAlign,
      };
    };
    const link = root?.querySelector('a[href="https://openai.com/codex/"]');
    const display = root?.querySelector(".katex-display");
    return {
      actions: Array.from(
        item?.querySelectorAll(".demo-turn-actions button") ?? [],
        (button) => ({
          icon: button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
          label: button.getAttribute("aria-label"),
          rect: rect(button),
        }),
      ),
      code: style(root?.querySelector(".codex-ui-code-block__body code")),
      codeActions: Array.from(
        root?.querySelectorAll(".codex-ui-code-block__header button") ?? [],
        (button) => ({
          label: button.getAttribute("aria-label"),
          pressed: button.getAttribute("aria-pressed"),
          rect: rect(button),
        }),
      ),
      codeBlock: style(root?.querySelector(".codex-ui-code-block")),
      codeHeader: style(root?.querySelector(".codex-ui-code-block__header")),
      codeLanguageLabel: root
        ?.querySelector(".codex-ui-code-block__language-label")
        ?.textContent?.trim(),
      duration: document
        .querySelector(".demo-current-markdown-26-825__duration")
        ?.textContent?.replace(/\s+/g, " ")
        .trim(),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      inlineCode: style(root?.querySelector(".codex-ui-inline-code")),
      link: link
        ? {
            favicon: rect(link.querySelector("img")),
            href: link.getAttribute("href"),
            label: link.textContent?.trim(),
            target: link.getAttribute("target"),
          }
        : null,
      math: {
        annotation: root?.querySelector(".katex annotation")?.textContent,
        display: rect(display),
        katexCount: root?.querySelectorAll(".katex").length,
        mathMlCount: root?.querySelectorAll("math").length,
      },
      root: style(root),
      semantics: {
        blockquotes: root?.querySelectorAll("blockquote").length,
        codeBlocks: root?.querySelectorAll(".codex-ui-code-block").length,
        headings: root?.querySelectorAll("h1").length,
        lists: root?.querySelectorAll("ul").length,
        paragraphs: root?.querySelectorAll("p").length,
        tables: root?.querySelectorAll("table").length,
      },
      table: style(root?.querySelector("table")),
      tableHeaders: Array.from(root?.querySelectorAll("th") ?? [], (header) => ({
        style: style(header),
        text: header.textContent?.trim(),
      })),
      tableScroll: rect(
        root?.querySelector(".codex-ui-markdown__table-scroll"),
      ),
      text: root?.textContent,
    };
  });
}

async function currentMarkdown26820MediaContract(page) {
  return page.evaluate(() => {
    const item = document.querySelector(
      '[data-item-id="assistant-markdown-media"]',
    );
    const root = item?.querySelector(".codex-ui-markdown");
    const rect = (element) => {
      const bounds = element?.getBoundingClientRect();
      return bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null;
    };
    const rootStyle = root ? getComputedStyle(root) : null;
    const display = root?.querySelector(".katex-display");
    const displayStyle = display ? getComputedStyle(display) : null;
    const grid = root?.querySelector(
      ".codex-ui-markdown__media-grid-paragraph",
    );
    return {
      actions: Array.from(
        item?.querySelectorAll(".demo-turn-actions button") ?? [],
        (button) => ({
          icon: button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
          label: button.getAttribute("aria-label"),
          rect: rect(button),
        }),
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      math: {
        annotation: root?.querySelector(".katex annotation")?.textContent,
        display: rect(display),
        marginBlockEnd: displayStyle?.marginBlockEnd,
        marginBlockStart: displayStyle?.marginBlockStart,
        mathMlCount: root?.querySelectorAll("math").length,
      },
      media: {
        footnoteSections: root?.querySelectorAll("section[data-footnotes]").length,
        grid: rect(grid),
        items: Array.from(
          root?.querySelectorAll(
            "[data-markdown-image-preview-trigger], [data-markdown-image-state]",
          ) ?? [],
          (element) => ({
            href: element.getAttribute("href"),
            image: rect(element.querySelector("img")),
            label: element.getAttribute("aria-label"),
            rect: rect(element),
            state:
              element.getAttribute("data-markdown-image-state") ?? "ready",
            tag: element.tagName,
          }),
        ),
        literalText: root?.textContent,
      },
      paragraphCount: root?.querySelectorAll("p").length,
      root: root
        ? {
            color: rootStyle?.color,
            fontFamily: rootStyle?.fontFamily,
            fontSize: rootStyle?.fontSize,
            fontWeight: rootStyle?.fontWeight,
            lineHeight: rootStyle?.lineHeight,
            rect: rect(root),
          }
        : null,
    };
  });
}

for (const currentMarkdownScene of [
  {
    currentSidebar: true,
    frame: "markdown-current-26-818-complete",
    id: "electron-markdown-current-26-818",
    scenario: "markdown-current-26-818",
  },
  {
    currentSidebar: true,
    frame: "markdown-current-26-818-complete",
    id: "electron-markdown-current-26-818-compact",
    scenario: "markdown-current-26-818",
    sidebarState: "hidden",
    windowSize: { height: 680, width: 720 },
  },
]) {
  const { app: currentMarkdownApp, page: currentMarkdownPage } =
    await launchScene(currentMarkdownScene, { capture: false });
  try {
    const compact = currentMarkdownScene.id.endsWith("-compact");
    const expectedWidth = compact ? 688 : 736;
    const expectedActions = [
      ["Copy", "thread-assistant-copy"],
      ["Good response", "thread-assistant-good"],
      ["Bad response", "thread-assistant-bad"],
      ["Fork chat from here", "thread-assistant-fork"],
    ];
    const nativeBounds = await currentMarkdownApp.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const contract = await currentMarkdown26818Contract(currentMarkdownPage);
    if (
      nativeBounds?.width !== (compact ? 720 : 1180) ||
      nativeBounds?.height !== (compact ? 680 : 820) ||
      !contract.root ||
      Math.abs(contract.root.width - expectedWidth) > 1 ||
      Math.abs(contract.root.height - 358) > 1 ||
      Math.abs(contract.root.left - (compact ? 16 : 359)) > 1 ||
      contract.root.color !== "rgb(223, 223, 223)" ||
      contract.fontFamily !==
        '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
      contract.actionCount !== 4 ||
      contract.actions.some(
        (action, index) =>
          action.label !== expectedActions[index]?.[0] ||
          action.icon !== expectedActions[index]?.[1],
      ) ||
      contract.inlineLinkCount !== 0 ||
      contract.copyLabel !== "Copy code" ||
      contract.codeActions.length !== 2 ||
      contract.codeActions[0].label !== "Enable word wrap" ||
      contract.codeActions[0].pressed !== "false" ||
      contract.codeActions[1].label !== "Copy code" ||
      !contract.table ||
      Math.abs(contract.table.width - expectedWidth) > 1 ||
      Math.abs(contract.table.height - 89) > 1 ||
      !contract.tableScroll ||
      Math.abs(contract.tableScroll.width - expectedWidth) > 1 ||
      !contract.codeBlock ||
      Math.abs(contract.codeBlock.width - expectedWidth) > 1 ||
      Math.abs(contract.codeBlock.height - 73) > 1 ||
      contract.codeBlock.backgroundColor !== "rgba(255, 255, 255, 0.05)" ||
      contract.horizontalOverflow !== 0
    ) {
      throw new Error(
        `${currentMarkdownScene.id}: current 26.818 Markdown Electron contract failed: ${JSON.stringify({ contract, nativeBounds })}`,
      );
    }
    await currentMarkdownPage
      .getByRole("button", { name: "Enable word wrap" })
      .click();
    const wrapped = await currentMarkdownPage.evaluate(() => {
      const block = document.querySelector(
        '[data-item-id="assistant-markdown"] .codex-ui-code-block',
      );
      const toggle = block?.querySelector(".codex-ui-code-block__wrap");
      return {
        label: toggle?.getAttribute("aria-label"),
        pressed: toggle?.getAttribute("aria-pressed"),
        wrapped: block?.getAttribute("data-wrap"),
      };
    });
    if (
      wrapped.label !== "Disable word wrap" ||
      wrapped.pressed !== "true" ||
      wrapped.wrapped !== "true"
    ) {
      throw new Error(
        `${currentMarkdownScene.id}: current 26.818 Markdown Electron wrap toggle failed: ${JSON.stringify(wrapped)}`,
      );
    }
  } finally {
    await currentMarkdownApp.close();
  }
}

for (const currentMarkdownScene of [
  {
    currentSidebar: true,
    frame: "markdown-current-26-825-complete",
    id: "electron-markdown-current-26-825",
    scenario: "markdown-current-26-825",
  },
  {
    currentSidebar: true,
    frame: "markdown-current-26-825-complete",
    id: "electron-markdown-current-26-825-compact",
    scenario: "markdown-current-26-825",
    sidebarState: "hidden",
    windowSize: { height: 680, width: 720 },
  },
]) {
  const { app: currentMarkdownApp, page: currentMarkdownPage } =
    await launchScene(currentMarkdownScene, { capture: false });
  try {
    const compact = currentMarkdownScene.id.endsWith("-compact");
    const expectedWidth = compact ? 688 : 736;
    const expectedActions = [
      ["Copy", "thread-assistant-copy"],
      ["Good response", "thread-assistant-good"],
      ["Bad response", "thread-assistant-bad"],
      ["Fork chat from here", "thread-assistant-fork"],
    ];
    const nativeBounds = await currentMarkdownApp.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const contract = await currentMarkdown26825Contract(currentMarkdownPage);
    const [surfaceHeader, stateHeader] = contract.tableHeaders;
    const [wrapAction, copyAction] = contract.codeActions;
    if (
      nativeBounds?.width !== (compact ? 720 : 1180) ||
      nativeBounds?.height !== (compact ? 680 : 820) ||
      !contract.root?.rect ||
      Math.abs(contract.root.rect.width - expectedWidth) > 0.5 ||
      Math.abs(contract.root.rect.height - 465.4375) > 0.5 ||
      Math.abs(contract.root.rect.left - (compact ? 16 : 383.453125)) > 0.5 ||
      contract.root.color !== "rgb(255, 255, 255)" ||
      contract.root.fontFamily !==
        '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
      contract.root.fontSize !== "14px" ||
      contract.root.fontWeight !== "400" ||
      !contract.root.lineHeight.startsWith("22.75") ||
      contract.duration !== "Worked for 15s" ||
      contract.semantics.headings !== 1 ||
      contract.semantics.paragraphs !== 4 ||
      contract.semantics.blockquotes !== 1 ||
      contract.semantics.lists !== 1 ||
      contract.semantics.tables !== 1 ||
      contract.semantics.codeBlocks !== 1 ||
      contract.actions.length !== 4 ||
      contract.actions.some(
        (action, index) =>
          action.label !== expectedActions[index]?.[0] ||
          action.icon !== expectedActions[index]?.[1] ||
          Math.abs(action.rect.width - 26) > 0.5 ||
          Math.abs(action.rect.height - 26) > 0.5 ||
          Math.abs(
            action.rect.left -
              (contract.root.rect.left - 4 + index * 28),
          ) > 0.5,
      ) ||
      contract.link?.href !== "https://openai.com/codex/" ||
      contract.link.label !== "public link" ||
      contract.link.target !== "_blank" ||
      Math.abs(contract.link.favicon.width - 16) > 0.5 ||
      Math.abs(contract.link.favicon.height - 16) > 0.5 ||
      !contract.table?.rect ||
      Math.abs(contract.table.rect.width - expectedWidth) > 0.5 ||
      Math.abs(contract.table.rect.height - 81.5) > 0.5 ||
      !contract.tableScroll ||
      Math.abs(contract.tableScroll.width - expectedWidth) > 0.5 ||
      surfaceHeader?.text !== "Surface" ||
      stateHeader?.text !== "State" ||
      surfaceHeader.style.textAlign !== "start" ||
      stateHeader.style.textAlign !== "start" ||
      contract.codeLanguageLabel !== "TypeScript" ||
      !contract.codeBlock?.rect ||
      contract.codeBlock.backgroundColor !== "rgba(255, 255, 255, 0.05)" ||
      Math.abs(contract.codeBlock.rect.width - expectedWidth) > 0.5 ||
      Math.abs(contract.codeBlock.rect.height - 82) > 0.5 ||
      !contract.codeHeader?.rect ||
      contract.codeHeader.fontSize !== "13px" ||
      contract.codeHeader.fontWeight !== "500" ||
      contract.codeHeader.padding !== "6px 6px 6px 20px" ||
      Math.abs(contract.codeHeader.rect.height - 48) > 0.5 ||
      !contract.code?.rect ||
      contract.code.fontSize !== "12px" ||
      contract.code.lineHeight !== "20px" ||
      !contract.inlineCode?.rect ||
      contract.inlineCode.fontSize !== "12.25px" ||
      contract.inlineCode.fontWeight !== "500" ||
      contract.codeActions.length !== 2 ||
      wrapAction.label !== "Enable word wrap" ||
      wrapAction.pressed !== "false" ||
      copyAction.label !== "Copy" ||
      contract.math.katexCount !== 1 ||
      contract.math.mathMlCount !== 1 ||
      contract.math.annotation !==
        "\\int_0^1 x^2 \\, dx = \\frac{1}{3}" ||
      !contract.math.display ||
      Math.abs(contract.math.display.width - expectedWidth) > 0.5 ||
      Math.abs(contract.math.display.height - 41.9375) > 0.5 ||
      !contract.text.includes("Inline math: $E = mc^2$.") ||
      !contract.text.includes("CURRENT MARKDOWN DONE") ||
      contract.horizontalOverflow !== 0
    ) {
      throw new Error(
        `${currentMarkdownScene.id}: current 26.825 Markdown Electron contract failed: ${JSON.stringify({ contract, nativeBounds })}`,
      );
    }

    await currentMarkdownPage.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.__codexMarkdownCurrent26825CopiedText = value;
          },
        },
      });
    });
    const currentMarkdownCodeCopy = currentMarkdownPage.locator(
      '[data-item-id="assistant-markdown-current-26-825"] .codex-ui-code-block__copy',
    );
    await currentMarkdownCodeCopy.click();
    await currentMarkdownPage
      .locator(
        '[data-item-id="assistant-markdown-current-26-825"] .codex-ui-code-block__copy[data-copied="true"]',
      )
      .waitFor();
    await currentMarkdownPage
      .getByRole("button", { name: "Enable word wrap" })
      .click();
    const interaction = await currentMarkdownPage.evaluate(() => {
      const block = document.querySelector(
        '[data-item-id="assistant-markdown-current-26-825"] .codex-ui-code-block',
      );
      const toggle = block?.querySelector(".codex-ui-code-block__wrap");
      const tableScroll = document.querySelector(
        '[data-item-id="assistant-markdown-current-26-825"] .codex-ui-markdown__table-scroll',
      );
      tableScroll?.focus();
      return {
        copiedText: window.__codexMarkdownCurrent26825CopiedText,
        tableFocused: document.activeElement === tableScroll,
        wrapLabel: toggle?.getAttribute("aria-label"),
        wrapPressed: toggle?.getAttribute("aria-pressed"),
        wrapped: block?.getAttribute("data-wrap"),
      };
    });
    if (
      interaction.copiedText !== "const ready = true;" ||
      !interaction.tableFocused ||
      interaction.wrapLabel !== "Disable word wrap" ||
      interaction.wrapPressed !== "true" ||
      interaction.wrapped !== "true"
    ) {
      throw new Error(
        `${currentMarkdownScene.id}: current 26.825 Markdown Electron interaction failed: ${JSON.stringify(interaction)}`,
      );
    }
  } finally {
    await currentMarkdownApp.close();
  }
}

for (const currentMarkdownMediaScene of [
  {
    currentSidebar: true,
    frame: "markdown-current-26-820-media-complete",
    id: "electron-markdown-current-26-820-media",
    scenario: "markdown-current-26-820-media",
  },
  {
    currentSidebar: true,
    frame: "markdown-current-26-820-media-complete",
    id: "electron-markdown-current-26-820-media-compact",
    scenario: "markdown-current-26-820-media",
    sidebarState: "hidden",
    windowSize: { height: 680, width: 720 },
  },
]) {
  const { app: markdownMediaApp, page: markdownMediaPage } =
    await launchScene(currentMarkdownMediaScene, { capture: false });
  try {
    const compact = currentMarkdownMediaScene.id.endsWith("-compact");
    const expectedWidth = compact ? 688 : 736;
    const expectedActions = [
      ["Copy", "thread-assistant-copy"],
      ["Good response", "thread-assistant-good"],
      ["Bad response", "thread-assistant-bad"],
      ["Fork chat from here", "thread-assistant-fork"],
    ];
    const nativeBounds = await markdownMediaApp.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const contract = await currentMarkdown26820MediaContract(markdownMediaPage);
    const [loaded, unavailable] = contract.media.items;
    if (
      nativeBounds?.width !== (compact ? 720 : 1180) ||
      nativeBounds?.height !== (compact ? 680 : 820) ||
      !contract.root?.rect ||
      Math.abs(contract.root.rect.width - expectedWidth) > 1 ||
      Math.abs(contract.root.rect.height - 442.515625) > 1 ||
      Math.abs(contract.root.rect.left - (compact ? 16 : 359)) > 1 ||
      contract.root.color !== "rgb(223, 223, 223)" ||
      contract.root.fontFamily !==
        '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
      contract.root.fontSize !== "14px" ||
      contract.root.fontWeight !== "445" ||
      contract.root.lineHeight !== "22px" ||
      contract.paragraphCount !== 7 ||
      contract.actions.length !== 4 ||
      contract.actions.some(
        (action, index) =>
          action.label !== expectedActions[index]?.[0] ||
          action.icon !== expectedActions[index]?.[1] ||
          Math.abs(action.rect.width - 26) > 0.5 ||
          Math.abs(action.rect.height - 26) > 0.5,
      ) ||
      contract.math.annotation !==
        "\\int_0^1 x^2 \\, dx = \\frac{1}{3}" ||
      contract.math.mathMlCount !== 1 ||
      !contract.math.display ||
      Math.abs(contract.math.display.width - expectedWidth) > 1 ||
      Math.abs(contract.math.display.height - 41.9375) > 1 ||
      contract.math.marginBlockStart !== "14px" ||
      contract.math.marginBlockEnd !== "14px" ||
      contract.media.footnoteSections !== 0 ||
      !contract.media.literalText.includes("# Current 26.820 media output") ||
      !contract.media.literalText.includes("$E = mc^2$") ||
      !contract.media.literalText.includes("[^1]") ||
      !contract.media.literalText.includes("![External preview]") ||
      !contract.media.grid ||
      Math.abs(contract.media.grid.width - expectedWidth) > 1 ||
      Math.abs(contract.media.grid.height - 163.578125) > 1 ||
      contract.media.items.length !== 2 ||
      loaded?.tag !== "BUTTON" ||
      loaded.state !== "ready" ||
      loaded.label !== "Loaded preview" ||
      !loaded.image ||
      Math.abs(loaded.rect.width - 200) > 1 ||
      Math.abs(loaded.image.width - 199.96875) > 1 ||
      Math.abs(loaded.image.height - 139.578125) > 1 ||
      unavailable?.tag !== "A" ||
      unavailable.state !== "unavailable" ||
      unavailable.label !== "Unavailable preview" ||
      unavailable.href !==
        "https://example.invalid/codex-ui-kit-missing.png" ||
      Math.abs(unavailable.rect.width - 96) > 1 ||
      Math.abs(unavailable.rect.height - 96) > 1 ||
      contract.horizontalOverflow !== 0
    ) {
      throw new Error(
        `${currentMarkdownMediaScene.id}: current 26.820 Markdown media Electron contract failed: ${JSON.stringify({ contract, nativeBounds })}`,
      );
    }

    const trigger = markdownMediaPage.getByRole("button", {
      name: "Loaded preview",
    });
    await trigger.click();
    const dialog = markdownMediaPage.getByRole("dialog", {
      name: "Loaded preview",
    });
    await dialog.waitFor({ state: "visible" });
    const preview = await dialog.evaluate((element) => ({
      imageCount: element.querySelectorAll(
        ".codex-ui-image-preview__immersive-stage img",
      ).length,
      presentation: element.getAttribute("data-presentation"),
    }));
    if (preview.presentation !== "immersive" || preview.imageCount !== 1) {
      throw new Error(
        `${currentMarkdownMediaScene.id}: current 26.820 Markdown media preview failed: ${JSON.stringify(preview)}`,
      );
    }
    await markdownMediaPage
      .getByRole("button", { name: "Close image preview" })
      .click();
    await dialog.waitFor({ state: "detached" });
    if (!(await trigger.evaluate((element) => element === document.activeElement))) {
      throw new Error(
        `${currentMarkdownMediaScene.id}: current 26.820 Markdown preview did not restore focus.`,
      );
    }
  } finally {
    await markdownMediaApp.close();
  }
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
    name: "Worked for 25s",
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
    (await rows.count()) !== 2 ||
    (await rowButtons.count()) !== 2 ||
    JSON.stringify(currentState.callLabels) !==
      JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
    currentState.labelledButtons.length !== 2 ||
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
    .getByRole("button", { name: "Worked for 18s" })
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
      document
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
    !compactState.visibleNavigation
  ) {
    throw new Error(
      `Current Electron MCP recovery drifted: ${JSON.stringify({ compactState, wideState })}`,
    );
  }
} finally {
  await currentMcpRecoveryApp.close();
}

const currentMcp26818SuccessScene = {
  currentSidebar: true,
  frame: "mcp-current-26-818-success",
  id: "electron-current-mcp-26-818-success",
  scenario: "mcp-current-26-818-success",
  sidebarState: "hidden",
  summaryState: "hidden",
};
const {
  app: currentMcp26818SuccessApp,
  page: currentMcp26818SuccessPage,
} = await launchScene(currentMcp26818SuccessScene, { capture: false });

try {
  const timeline = currentMcp26818SuccessPage.getByRole("button", {
    name: "Worked for 37s",
  });
  if ((await timeline.getAttribute("aria-expanded")) !== "false") {
    throw new Error("26.818 Electron MCP timeline should start collapsed.");
  }
  await timeline.click();
  const group = currentMcp26818SuccessPage.getByTestId(
    "mcp-tool-call-group",
  );
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const currentState = await currentMcp26818SuccessPage.evaluate(() => {
    const group = document.querySelector(".codex-ui-mcp-tool-call-group");
    const answer = document.querySelector(".demo-current-mcp-answer");
    const link = answer?.querySelector("a");
    const favicon = link?.querySelector("img");
    return {
      answer: answer?.textContent?.replace(/\s+/g, " ").trim(),
      callLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
        ),
        (element) => element.textContent?.trim(),
      ),
      callStatuses: Array.from(
        document.querySelectorAll(
          ".codex-ui-mcp-tool-call-group .codex-ui-tool-call",
        ),
        (element) => element.getAttribute("data-status"),
      ),
      faviconSource: favicon?.getAttribute("src"),
      groupSource: group?.getAttribute("data-source"),
      groupStatus: group?.getAttribute("data-status"),
      linkHref: link?.getAttribute("href"),
      timelineExpanded:
        document
          .querySelector(".codex-ui-activity-timeline")
          ?.getAttribute("data-expanded") ?? null,
    };
  });
  if (
    JSON.stringify(currentState.callLabels) !==
      JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
    currentState.callStatuses.some((status) => status !== "completed") ||
    currentState.groupSource !== "openaiDeveloperDocs" ||
    currentState.groupStatus !== "completed" ||
    currentState.timelineExpanded !== "true" ||
    currentState.answer !==
      "Model Context Protocol — https://learn.chatgpt.com/docs/extend/mcp" ||
    currentState.linkHref !== "https://learn.chatgpt.com/docs/extend/mcp" ||
    !currentState.faviconSource?.startsWith("data:image/png;base64,")
  ) {
    throw new Error(
      `26.818 Electron MCP success drifted: ${JSON.stringify(currentState)}`,
    );
  }
} finally {
  await currentMcp26818SuccessApp.close();
}

const currentMcp26818RecoveryScene = {
  currentSidebar: true,
  frame: "mcp-current-26-818-recovery-completed",
  id: "electron-current-mcp-26-818-recovery",
  scenario: "mcp-current-26-818-recovery",
  sidebarState: "hidden",
  summaryState: "pinned",
};
const {
  app: currentMcp26818RecoveryApp,
  page: currentMcp26818RecoveryPage,
} = await launchScene(currentMcp26818RecoveryScene, { capture: false });

try {
  const readSourcesState = () =>
    currentMcp26818RecoveryPage.evaluate(() => {
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const dock = document.querySelector(
        ".demo-current-mcp-source-summary-dock",
      );
      const panel = dock?.querySelector(
        ".demo-current-mcp-source-summary-panel",
      );
      const surface = dock?.querySelector(
        ".codex-ui-thread-summary-dock__surface",
      );
      return {
        composer: rect(document.querySelector(".codex-ui-composer")),
        dockOpen: dock?.getAttribute("data-open"),
        dockPinned: dock?.getAttribute("data-pinned"),
        panel: rect(panel),
        panelBackground: panel ? getComputedStyle(panel).backgroundColor : null,
        rowLabels: Array.from(
          panel?.querySelectorAll(".codex-ui-thread-summary-item__label") ?? [],
          (element) => element.textContent?.trim(),
        ),
        surfaceOpacity: surface ? getComputedStyle(surface).opacity : null,
        surfacePointerEvents: surface
          ? getComputedStyle(surface).pointerEvents
          : null,
        thread: rect(
          document.querySelector(".codex-ui-thread-viewport__content"),
        ),
        togglePressed: document
          .querySelector('button[aria-label="Toggle pinned summary"]')
          ?.getAttribute("aria-pressed"),
      };
    });

  const initialSources = await readSourcesState();
  const summaryToggle = currentMcp26818RecoveryPage.getByRole("button", {
    name: "Toggle pinned summary",
  });
  await summaryToggle.click();
  const floatingSources = await readSourcesState();
  await currentMcp26818RecoveryPage.mouse.click(600, 620);
  await currentMcp26818RecoveryPage.waitForSelector(
    '.demo-current-mcp-source-summary-dock[data-open="false"]',
  );
  const dismissedSources = await readSourcesState();
  await summaryToggle.click();
  const repinnedSources = await readSourcesState();

  if (
    initialSources.dockOpen !== "true" ||
    initialSources.dockPinned !== "true" ||
    initialSources.togglePressed !== "true" ||
    Math.abs((initialSources.panel?.left ?? 0) - 864) > 1 ||
    Math.abs((initialSources.panel?.top ?? 0) - 59) > 1 ||
    Math.abs((initialSources.panel?.width ?? 0) - 300) > 1 ||
    Math.abs((initialSources.panel?.height ?? 0) - 189) > 1 ||
    initialSources.panelBackground !== "rgb(45, 45, 45)" ||
    JSON.stringify(initialSources.rowLabels) !==
      JSON.stringify([
        "Create a file or site",
        "openai-docs-mcp",
        "View all",
      ]) ||
    Math.abs((initialSources.thread?.left ?? 0) + 158) > 1 ||
    Math.abs((initialSources.composer?.left ?? 0) - 64) > 1 ||
    floatingSources.dockOpen !== "true" ||
    floatingSources.dockPinned !== "false" ||
    Math.abs((floatingSources.thread?.left ?? 0) - 0) > 1 ||
    Math.abs((floatingSources.composer?.left ?? 0) - 222) > 1 ||
    dismissedSources.dockOpen !== "false" ||
    dismissedSources.surfaceOpacity !== "0" ||
    dismissedSources.surfacePointerEvents !== "none" ||
    repinnedSources.dockOpen !== "true" ||
    repinnedSources.dockPinned !== "true" ||
    Math.abs((repinnedSources.thread?.left ?? 0) + 158) > 1 ||
    Math.abs((repinnedSources.composer?.left ?? 0) - 64) > 1
  ) {
    throw new Error(
      `26.818 Electron MCP Sources interaction drifted: ${JSON.stringify({ dismissedSources, floatingSources, initialSources, repinnedSources })}`,
    );
  }

  await summaryToggle.click();
  await currentMcp26818RecoveryPage.mouse.click(600, 620);
  await currentMcp26818RecoveryPage
    .getByRole("button", { name: "Worked for 33s" })
    .click();
  const group = currentMcp26818RecoveryPage.getByTestId(
    "mcp-tool-call-group",
  );
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  await group
    .getByRole("button", { name: "Fetch OpenAI doc failed" })
    .click();
  const wideState = await currentMcp26818RecoveryPage.evaluate(() => {
    const error = document.querySelector(
      '[data-item-id="mcp-current-26-818-fetch-invalid"] .codex-ui-tool-call__error[data-presentation="output"]',
    );
    const bounds = error?.getBoundingClientRect();
    const link = document.querySelector(
      '.demo-current-mcp-answer a[href="https://learn.chatgpt.com/docs/mcp-server"]',
    );
    return {
      answer: (() => {
        const answer = document.querySelector(".demo-current-mcp-answer");
        return answer instanceof HTMLElement
          ? answer.innerText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .join("\n")
          : null;
      })(),
      callLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
        ),
        (element) => element.textContent?.trim(),
      ),
      error: error
        ? {
            height: bounds?.height,
            role: error.getAttribute("role"),
            text: error.textContent?.replace(/\s+/g, " ").trim(),
            width: bounds?.width,
          }
        : null,
      linkHref: link?.getAttribute("href"),
    };
  });

  await currentMcp26818RecoveryApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await currentMcp26818RecoveryPage.waitForFunction(
    () => window.innerWidth === 720 && window.innerHeight === 680,
    undefined,
    { timeout: 5_000 },
  );
  await currentMcp26818RecoveryPage
    .locator(".codex-ui-conversation-thread-shell__viewport")
    .evaluate((element) => {
      element.scrollTop = 55;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
  const compactState = await currentMcp26818RecoveryPage.evaluate(() => {
    const error = document.querySelector(
      '[data-item-id="mcp-current-26-818-fetch-invalid"] .codex-ui-tool-call__error[data-presentation="output"]',
    );
    const bounds = error?.getBoundingClientRect();
    return {
      clientHeight: document.documentElement.clientHeight,
      clientWidth: document.documentElement.clientWidth,
      error: bounds
        ? { height: bounds.height, left: bounds.left, top: bounds.top, width: bounds.width }
        : null,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  if (
    JSON.stringify(wideState.callLabels) !==
      JSON.stringify([
        "Fetch OpenAI doc",
        "Search OpenAI docs",
        "Fetch OpenAI doc",
      ]) ||
    wideState.error?.role !== "alert" ||
    wideState.error.text !== "plaintextInvalid URL" ||
    Math.abs((wideState.error.height ?? 0) - 67.3125) > 1 ||
    Math.abs((wideState.error.width ?? 0) - 736) > 1 ||
    wideState.answer !==
      "RECOVERY COMPLETE\nUse Codex with the Agents SDK\nhttps://learn.chatgpt.com/docs/mcp-server" ||
    wideState.linkHref !== "https://learn.chatgpt.com/docs/mcp-server" ||
    compactState.clientWidth !== 720 ||
    compactState.clientHeight !== 680 ||
    compactState.horizontalOverflow > 1 ||
    Math.abs((compactState.error?.left ?? 0) - 16) > 1 ||
    Math.abs((compactState.error?.top ?? 0) - 271) > 1 ||
    Math.abs((compactState.error?.width ?? 0) - 688) > 1 ||
    Math.abs((compactState.error?.height ?? 0) - 67.3125) > 1
  ) {
    throw new Error(
      `26.818 Electron MCP recovery drifted: ${JSON.stringify({ compactState, wideState })}`,
    );
  }
} finally {
  await currentMcp26818RecoveryApp.close();
}

const currentMcp26820SuccessScene = {
  currentSidebar: true,
  frame: "mcp-current-26-820-success",
  id: "electron-current-mcp-26-820-success",
  scenario: "mcp-current-26-820-success",
  sidebarState: "hidden",
  summaryState: "hidden",
};
const {
  app: currentMcp26820SuccessApp,
  page: currentMcp26820SuccessPage,
} = await launchScene(currentMcp26820SuccessScene, { capture: false });

try {
  const timeline = currentMcp26820SuccessPage.getByRole("button", {
    name: "Worked for 34s",
  });
  if ((await timeline.getAttribute("aria-expanded")) !== "false") {
    throw new Error("26.820 Electron MCP timeline should start collapsed.");
  }
  await timeline.click();
  const group = currentMcp26820SuccessPage.getByTestId(
    "mcp-tool-call-group",
  );
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const currentState = await currentMcp26820SuccessPage.evaluate(() => {
    const answer = document.querySelector(".demo-current-mcp-answer");
    const group = document.querySelector(".codex-ui-mcp-tool-call-group");
    return {
      answer: answer instanceof HTMLElement
        ? answer.innerText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .join("\n")
        : null,
      callLabels: Array.from(
        document.querySelectorAll(
          ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
        ),
        (element) => element.textContent?.trim(),
      ),
      errorCards: document.querySelectorAll(
        ".codex-ui-tool-call__error, .codex-ui-tool-call__result",
      ).length,
      groupStatus: group?.getAttribute("data-status"),
      linkHref: answer?.querySelector("a")?.getAttribute("href"),
      rowButtons: document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call button, .codex-ui-mcp-tool-call-group .codex-ui-tool-call summary",
      ).length,
      title: document
        .querySelector(".codex-ui-thread-header__title")
        ?.textContent?.trim(),
    };
  });
  if (
    currentState.title !== "查找 MCP 官方文档" ||
    JSON.stringify(currentState.callLabels) !==
      JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
    currentState.groupStatus !== "completed" ||
    currentState.rowButtons !== 0 ||
    currentState.errorCards !== 0 ||
    currentState.answer !==
      "Model Context Protocol\nhttps://learn.chatgpt.com/docs/extend/mcp" ||
    currentState.linkHref !== "https://learn.chatgpt.com/docs/extend/mcp"
  ) {
    throw new Error(
      `26.820 Electron MCP success drifted: ${JSON.stringify(currentState)}`,
    );
  }
} finally {
  await currentMcp26820SuccessApp.close();
}

const currentMcp26820FailureScene = {
  currentSidebar: true,
  frame: "mcp-current-26-820-recovery-failed",
  id: "electron-current-mcp-26-820-failed",
  scenario: "mcp-current-26-820-recovery",
  sidebarState: "hidden",
  summaryState: "hidden",
};
const {
  app: currentMcp26820FailureApp,
  page: currentMcp26820FailurePage,
} = await launchScene(currentMcp26820FailureScene, { capture: false });

try {
  await currentMcp26820FailurePage
    .getByRole("button", { name: "Working for 3s" })
    .click();
  const failedState = await currentMcp26820FailurePage.evaluate(() => {
    const failed = document.querySelector(
      '[data-item-id="mcp-current-26-820-fetch-invalid"]',
    );
    return {
      errorCards: document.querySelectorAll(
        ".codex-ui-tool-call__error, .codex-ui-tool-call__result",
      ).length,
      failedLabel: failed
        ?.querySelector(".codex-ui-tool-call__label")
        ?.textContent?.trim(),
      groupCount: document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group",
      ).length,
      rowButtons:
        failed?.querySelectorAll("button, details, summary").length ?? 0,
      stopButton: Boolean(
        document.querySelector('button[aria-label="Stop"]'),
      ),
      thinking: Boolean(document.querySelector(".codex-ui-thread-thinking")),
    };
  });
  if (
    failedState.failedLabel !== "Fetch OpenAI doc" ||
    failedState.groupCount !== 0 ||
    failedState.errorCards !== 0 ||
    failedState.rowButtons !== 0 ||
    !failedState.stopButton ||
    failedState.thinking
  ) {
    throw new Error(
      `26.820 Electron failed MCP row drifted: ${JSON.stringify(failedState)}`,
    );
  }
} finally {
  await currentMcp26820FailureApp.close();
}

const currentMcp26820RecoveryScene = {
  currentSidebar: true,
  frame: "mcp-current-26-820-recovery-completed",
  id: "electron-current-mcp-26-820-recovery",
  scenario: "mcp-current-26-820-recovery",
  sidebarState: "hidden",
  summaryState: "pinned",
};
const {
  app: currentMcp26820RecoveryApp,
  page: currentMcp26820RecoveryPage,
} = await launchScene(currentMcp26820RecoveryScene, { capture: false });

try {
  const readSources = () =>
    currentMcp26820RecoveryPage.evaluate(() => {
      const rect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const dock = document.querySelector(
        ".demo-current-mcp-source-summary-dock",
      );
      return {
        composer: rect(document.querySelector(".codex-ui-composer")),
        open: dock?.getAttribute("data-open"),
        panel: rect(
          dock?.querySelector(".demo-current-mcp-source-summary-panel"),
        ),
        pinned: dock?.getAttribute("data-pinned"),
        thread: rect(
          document.querySelector(".codex-ui-thread-viewport__content"),
        ),
      };
    });
  const toggle = currentMcp26820RecoveryPage.getByRole("button", {
    name: "Toggle pinned summary",
  });
  const pinnedSources = await readSources();
  await toggle.click();
  const unpinnedSources = await readSources();
  await currentMcp26820RecoveryPage.mouse.click(600, 600);
  const outsideSources = await readSources();
  await toggle.click();
  const repinnedSources = await readSources();
  if (
    pinnedSources.open !== "true" ||
    pinnedSources.pinned !== "true" ||
    Math.abs((pinnedSources.panel?.left ?? 0) - 864) > 1 ||
    Math.abs((pinnedSources.panel?.height ?? 0) - 189) > 1 ||
    Math.abs((pinnedSources.composer?.left ?? 0) - 64) > 1 ||
    unpinnedSources.open !== "true" ||
    unpinnedSources.pinned !== "false" ||
    Math.abs((unpinnedSources.panel?.left ?? 0) - 1235) > 2 ||
    Math.abs((unpinnedSources.thread?.left ?? 0)) > 1 ||
    outsideSources.open !== "true" ||
    outsideSources.pinned !== "false" ||
    Math.abs((outsideSources.panel?.left ?? 0) - 1235) > 2 ||
    repinnedSources.open !== "true" ||
    repinnedSources.pinned !== "true" ||
    Math.abs((repinnedSources.panel?.left ?? 0) - 864) > 1
  ) {
    throw new Error(
      `26.820 Electron MCP Sources drifted: ${JSON.stringify({ outsideSources, pinnedSources, repinnedSources, unpinnedSources })}`,
    );
  }

  await toggle.click();
  await currentMcp26820RecoveryPage
    .getByRole("button", { name: "Worked for 17s" })
    .click();
  const group = currentMcp26820RecoveryPage.getByTestId(
    "mcp-tool-call-group",
  );
  await group
    .getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    })
    .click();
  const wideState = await currentMcp26820RecoveryPage.evaluate(() => ({
    callLabels: Array.from(
      document.querySelectorAll(
        ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
      ),
      (element) => element.textContent?.trim(),
    ),
    errorCards: document.querySelectorAll(
      ".codex-ui-tool-call__error, .codex-ui-tool-call__result",
    ).length,
    rowButtons: document.querySelectorAll(
      ".codex-ui-mcp-tool-call-group .codex-ui-tool-call button, .codex-ui-mcp-tool-call-group .codex-ui-tool-call summary",
    ).length,
  }));
  await currentMcp26820RecoveryApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await currentMcp26820RecoveryPage.waitForFunction(
    () => window.innerWidth === 720 && window.innerHeight === 680,
    undefined,
    { timeout: 5_000 },
  );
  const compactState = await currentMcp26820RecoveryPage.evaluate(() => {
    const group = document.querySelector(
      ".codex-ui-mcp-tool-call-group > .codex-ui-activity__disclosure > .codex-ui-activity__header",
    );
    const bounds = group?.getBoundingClientRect();
    return {
      group: bounds
        ? { left: bounds.left, top: bounds.top }
        : null,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });
  if (
    JSON.stringify(wideState.callLabels) !==
      JSON.stringify([
        "Fetch OpenAI doc",
        "Search OpenAI docs",
        "Fetch OpenAI doc",
      ]) ||
    wideState.errorCards !== 0 ||
    wideState.rowButtons !== 0 ||
    compactState.horizontalOverflow > 1 ||
    Math.abs((compactState.group?.left ?? 0) - 16) > 1 ||
    Math.abs((compactState.group?.top ?? 0) - 120) > 1
  ) {
    throw new Error(
      `26.820 Electron MCP recovery drifted: ${JSON.stringify({ compactState, wideState })}`,
    );
  }
} finally {
  await currentMcp26820RecoveryApp.close();
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
      document
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
    !compactState.visibleNavigation ||
    Math.abs((compactState.groupWidth ?? 0) - 414) > 1
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
      document
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
    !compactState.visibleNavigation ||
    compactState.horizontalOverflow > 1 ||
    Math.abs((compactState.composerWidth ?? 0) - 414) > 1
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

const directTerminalExitScene = {
  frame: "terminal-current-command-exit-7",
  id: "electron-current-terminal-command-exit-7",
  scenario: "terminal-lifecycle",
};
const {
  app: directTerminalExitApp,
  page: directTerminalExitPage,
} = await launchScene(directTerminalExitScene, { capture: false });

try {
  const output = await directTerminalExitPage
    .getByRole("log", { name: "Terminal output" })
    .textContent();
  if (
    !output?.includes("terminal-direct-out") ||
    !output.trim().startsWith("/workspace/codex-ui-kit %") ||
    !(await directTerminalExitPage
      .getByRole("textbox", { name: "Terminal input" })
      .isVisible()) ||
    (await directTerminalExitPage.getByRole("alert").count()) !== 0
  ) {
    throw new Error(
      "Electron command exit status was confused with a Terminal process failure.",
    );
  }
} finally {
  await directTerminalExitApp.close();
}

const terminalReloadScene = {
  frame: "terminal-current-reload",
  id: "electron-current-terminal-reload",
  scenario: "terminal-lifecycle",
};
const { app: terminalReloadApp, page: terminalReloadPage } =
  await launchScene(terminalReloadScene, { capture: false });

try {
  const terminalReloadPanel = terminalReloadPage.getByTestId("terminal-panel");
  let alert = terminalReloadPanel.getByRole("alert");
  const reloadContract = {
    alertText: await alert.textContent(),
    logCount: await terminalReloadPanel.getByRole("log").count(),
    textboxCount: await terminalReloadPanel.getByRole("textbox").count(),
  };
  if (
    !reloadContract.alertText?.includes(
      "Try reloading the terminal to continue",
    ) ||
    reloadContract.logCount !== 0 ||
    reloadContract.textboxCount !== 0
  ) {
    throw new Error(
      `Electron Terminal reload surface is incomplete: ${JSON.stringify(reloadContract)}`,
    );
  }
  await terminalReloadPanel
    .getByRole("button", { name: "Open bottom panel tab" })
    .click();
  await terminalReloadPage
    .getByRole("menuitem", { name: "Terminal", exact: true })
    .click();
  if (
    !(await terminalReloadPanel
      .getByRole("tab", { name: "codex-ui-kit 2", selected: true })
      .isVisible()) ||
    !(await terminalReloadPanel
      .getByRole("textbox", { name: "Terminal input" })
      .isVisible()) ||
    (await terminalReloadPanel.getByRole("alert").count()) !== 0
  ) {
    throw new Error(
      "Electron fresh Terminal inherited the crashed session's reload state.",
    );
  }
  await terminalReloadPanel
    .getByRole("tab", { name: "codex-ui-kit 1" })
    .click();
  alert = terminalReloadPanel.getByRole("alert");
  if (!(await alert.isVisible())) {
    throw new Error(
      "Electron crashed Terminal lost its session-scoped reload state.",
    );
  }
  await alert.getByRole("button", { name: "Reload" }).click();
  await terminalReloadPage.waitForSelector(
    '.demo-root[data-frame="terminal-current-single"]',
  );
  if (
    (await terminalReloadPanel.getByRole("alert").count()) !== 0 ||
    !(await terminalReloadPanel
      .getByRole("textbox", { name: "Terminal input" })
      .isVisible())
  ) {
    throw new Error(
      "Electron Terminal reload did not restore a fresh interactive shell.",
    );
  }
} finally {
  await terminalReloadApp.close();
}

const backgroundTerminalScene = {
  frame: "terminal-current-background-list",
  id: "electron-current-background-terminal",
  scenario: "terminal-lifecycle",
};
const {
  app: backgroundTerminalApp,
  page: backgroundTerminalPage,
} = await launchScene(backgroundTerminalScene, { capture: false });

try {
  const summary = backgroundTerminalPage.getByTestId(
    "terminal-current-background-summary",
  );
  const openProcess = summary.locator(
    ".codex-ui-terminal-process-list__open",
  );
  if (
    !(await openProcess.textContent())?.includes(
      "terminal-background-handle",
    ) ||
    (await backgroundTerminalPage
      .locator(".codex-ui-app-shell[data-bottom-panel-open]")
      .count()) !== 0
  ) {
    throw new Error("Electron background process summary is incomplete.");
  }
  await openProcess.click();
  await backgroundTerminalPage.waitForSelector(
    '[data-testid="terminal-current-background-panel"]',
  );
  const backgroundOutput = await backgroundTerminalPage
    .getByRole("log", { name: "Background terminal output" })
    .textContent();
  if (
    !backgroundOutput?.includes("terminal-background-handle-066") ||
    !backgroundOutput.includes("terminal-background-handle-110") ||
    (await backgroundTerminalPage
      .locator(".codex-ui-app-shell[data-bottom-panel-open]")
      .count()) !== 0
  ) {
    throw new Error(
      "Electron background process did not open in the side-panel Terminal.",
    );
  }
  await backgroundTerminalPage
    .getByRole("button", { name: "Close background terminal" })
    .click();
  await backgroundTerminalPage.waitForSelector(
    '[data-testid="terminal-current-background-summary"]',
  );
  if (
    !(await backgroundTerminalPage
      .getByTestId("terminal-current-background-summary")
      .isVisible()) ||
    (await backgroundTerminalPage
      .locator('.demo-root[data-frame="terminal-current-background-list"]')
      .count()) !== 1
  ) {
    throw new Error(
      "Electron background panel Close did not preserve the process reopen path.",
    );
  }
  await backgroundTerminalPage
    .getByTestId("terminal-current-background-summary")
    .locator(".codex-ui-terminal-process-list__open")
    .click();
  await backgroundTerminalPage
    .locator(".codex-ui-workspace-panel__tab-close")
    .click();
  await backgroundTerminalPage.waitForSelector(
    '[data-testid="terminal-current-background-summary"]',
  );
  await backgroundTerminalPage
    .getByTestId("terminal-current-background-summary")
    .locator(".codex-ui-terminal-process-list__open")
    .click();
  if (
    !(await backgroundTerminalPage
      .getByTestId("terminal-current-background-panel")
      .isVisible())
  ) {
    throw new Error(
      "Electron background Terminal could not be reopened while its process stayed active.",
    );
  }
  await backgroundTerminalApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await backgroundTerminalPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  if (
    (await backgroundTerminalPage
      .getByTestId("terminal-current-background-panel")
      .isVisible()) ||
    (await backgroundTerminalPage
      .locator('.demo-root[data-frame="terminal-current-background-open"]')
      .count()) !== 1
  ) {
    throw new Error(
      "Electron responsive close changed the background Terminal content state.",
    );
  }
  await backgroundTerminalApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(1180, 820);
  });
  await backgroundTerminalPage.waitForSelector(
    ".codex-ui-app-shell[data-side-panel-open]",
  );
  await backgroundTerminalPage
    .getByRole("button", { name: "Pull requests" })
    .click();
  await backgroundTerminalPage.waitForSelector(
    '.demo-root[data-view="pull-request"]',
  );
  const pullRequestShell = await backgroundTerminalPage.evaluate(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    return {
      overlay: shell?.hasAttribute("data-side-panel-overlay") ?? false,
      view: document.querySelector(".demo-root")?.getAttribute("data-view"),
    };
  });
  if (!pullRequestShell.overlay || pullRequestShell.view !== "pull-request") {
    throw new Error(
      `Electron background Terminal navigation lost the pull-request overlay: ${JSON.stringify(pullRequestShell)}`,
    );
  }
} finally {
  await backgroundTerminalApp.close();
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
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="current-review-workspace"]',
  );
  const initialCurrentReview = await currentReviewPage.evaluate(() => ({
    changeKinds: Array.from(
      document.querySelectorAll(".codex-ui-file-change-group__file"),
      (element) => element.getAttribute("data-change"),
    ),
    diffCount: document.querySelectorAll(
      ".codex-ui-file-review-workspace__diff",
    ).length,
    fileCount: document.querySelectorAll(
      '.codex-ui-file-review-workspace__tree [role="treeitem"]',
    ).length,
    markerLines: Array.from(
      document.querySelectorAll(".codex-ui-file-diff__line"),
      (element) => element.textContent?.trim(),
    ).filter((text) => text?.includes("__CODEX_TEMP_RENAME_MARKER__")),
    paths: Array.from(
      document.querySelectorAll(".codex-ui-file-review-workspace__file-identity"),
      (element) => element.textContent?.replace(/\s+/g, " ").trim(),
    ),
  }));
  if (
    JSON.stringify(initialCurrentReview.changeKinds) !==
      JSON.stringify(["modified", "modified"]) ||
    initialCurrentReview.diffCount !== 2 ||
    initialCurrentReview.fileCount !== 2 ||
    initialCurrentReview.markerLines.length !== 2 ||
    !initialCurrentReview.paths[0]?.includes("rename-source.txt") ||
    !initialCurrentReview.paths[1]?.includes("rename-destination.txt")
  ) {
    throw new Error(
      `Electron current Review rename content failed: ${JSON.stringify(initialCurrentReview)}`,
    );
  }

  const renamedPath = "rename-destination.txt";
  await currentReviewPage
    .getByRole("treeitem", { name: `Select ${renamedPath}` })
    .click();
  if (
    (await currentReviewPage
      .getByRole("treeitem", { name: `Select ${renamedPath}` })
      .getAttribute("data-selected")) !== "true"
  ) {
    throw new Error(
      "Electron current Review did not synchronize rename destination selection.",
    );
  }

  await currentReviewPage
    .getByRole("button", { exact: true, name: "Close tab" })
    .click();
  await currentReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await currentReviewPage
    .getByRole("button", { name: `Open ${renamedPath}` })
    .click();
  if (
    (await currentReviewPage
      .getByRole("treeitem", { name: `Select ${renamedPath}` })
      .getAttribute("data-selected")) !== "true" ||
    (await currentReviewPage
      .getByRole("listitem", {
        name: "Review file rename-source.txt",
      })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron current Review did not preserve the source diff on destination reopen.",
    );
  }

  await currentReviewPage
    .getByRole("button", { exact: false, name: /^Undo/ })
    .click();
  await currentReviewPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  if (
    (await currentReviewPage.locator('[data-testid="file-change-group"]').count()) !==
      1 ||
    (await currentReviewPage
      .getByRole("button", { exact: false, name: /^Reapply/ })
      .count()) !== 1
  ) {
    throw new Error("Electron current Review Undo did not retain a Reapply card.");
  }
  await currentReviewPage
    .getByRole("button", { exact: false, name: /^Reapply/ })
    .click();
  await currentReviewPage
    .getByRole("button", { exact: false, name: /^Undo/ })
    .click();
  const conflictDialog = currentReviewPage.getByRole("dialog", {
    name: "No changes reverted",
  });
  await conflictDialog.waitFor();
  if (
    (await conflictDialog.getByText("Skipped (1)").count()) !== 1 ||
    (await conflictDialog.getByText(renamedPath, { exact: true }).count()) !== 1
  ) {
    throw new Error("Electron current Review conflict did not identify the skipped file.");
  }
} finally {
  await currentReviewApp.close();
}

const currentReviewFilesScene = {
  frame: "review-open",
  id: "electron-current-review-files",
  scenario: "current-review-files",
};
const { app: currentReviewFilesApp, page: currentReviewFilesPage } =
  await launchScene(currentReviewFilesScene, { capture: false });
try {
  await currentReviewFilesPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="current-review-workspace"]',
  );
  const initialReviewFiles = await currentReviewFilesPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return { height: value.height, left: value.left, top: value.top, width: value.width };
    };
    return {
      changeKinds: Array.from(
        document.querySelectorAll(".codex-ui-file-change-group__file"),
        (element) => element.getAttribute("data-change"),
      ),
      diffCount: document.querySelectorAll(
        ".codex-ui-file-review-workspace__diff",
      ).length,
      exactIconNames: Array.from(
        document.querySelectorAll(
          '.codex-ui-file-review-workspace [data-current-build-icon^="review-"]',
        ),
        (element) => element.getAttribute("data-current-build-icon"),
      ),
      filter: rect(".codex-ui-file-review-workspace__filter input"),
      panel: rect(".codex-ui-app-shell__side-panel"),
      toolbar: rect(".codex-ui-file-review-workspace__toolbar"),
      treeCount: document.querySelectorAll(
        '.codex-ui-file-review-workspace__tree [role="treeitem"]',
      ).length,
    };
  });
  if (
    JSON.stringify(initialReviewFiles.changeKinds) !==
      JSON.stringify(["added", "modified", "deleted"]) ||
    initialReviewFiles.diffCount !== 3 ||
    initialReviewFiles.treeCount !== 3 ||
    initialReviewFiles.exactIconNames.length < 17 ||
    Math.abs((initialReviewFiles.panel?.width ?? 0) - 419.59375) > 1 ||
    Math.abs((initialReviewFiles.toolbar?.height ?? 0) - 40) > 1 ||
    Math.abs((initialReviewFiles.filter?.height ?? 0) - 18) > 1 ||
    Math.abs((initialReviewFiles.filter?.width ?? 0) - 203) > 1
  ) {
    throw new Error(
      `Electron current Review workspace failed: ${JSON.stringify(initialReviewFiles)}`,
    );
  }

  const requestedReviewPath = "alpha.txt";
  await currentReviewFilesPage
    .getByRole("button", { exact: true, name: "Close tab" })
    .click();
  await currentReviewFilesPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await currentReviewFilesPage
    .getByRole("button", { exact: true, name: `Open ${requestedReviewPath}` })
    .click();
  await currentReviewFilesPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="current-review-workspace"]',
  );
  if (
    (await currentReviewFilesPage
      .getByRole("treeitem", { name: `Select ${requestedReviewPath}` })
      .getAttribute("data-selected")) !== "true"
  ) {
    throw new Error(
      "Electron current Review file-card reopen did not reveal the requested path.",
    );
  }

  const scope = currentReviewFilesPage.getByRole("button", {
    exact: true,
    name: "Last Turn",
  });
  await scope.click();
  const scopeItems = currentReviewFilesPage.getByRole("menuitemradio");
  if ((await scopeItems.count()) !== 6) {
    throw new Error("Electron current Review scope menu is incomplete.");
  }
  if (
    (await currentReviewFilesPage.evaluate(
      () => document.activeElement?.textContent?.trim(),
    )) !== "Last Turn"
  ) {
    throw new Error("Electron current Review scope did not focus its selection.");
  }
  await scopeItems.filter({ hasText: "Last Turn" }).press("ArrowDown");
  if (
    (await currentReviewFilesPage.evaluate(
      () => document.activeElement?.textContent?.trim(),
    )) !== "Uncommitted"
  ) {
    throw new Error("Electron current Review scope ignored ArrowDown.");
  }
  await scopeItems.filter({ hasText: "Uncommitted" }).press("End");
  if (
    (await currentReviewFilesPage.evaluate(
      () => document.activeElement?.textContent?.trim(),
    )) !== "Branch"
  ) {
    throw new Error("Electron current Review scope ignored End.");
  }
  await scopeItems.filter({ hasText: "Branch" }).press("Escape");
  await currentReviewFilesPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-haspopup") === "menu" &&
      !document.querySelector('[role="menu"][aria-label="Review scope"]'),
  );
  await scope.click();
  await currentReviewFilesPage
    .getByRole("menuitemradio", { name: "Uncommitted" })
    .click();
  await currentReviewFilesPage
    .getByRole("button", { name: "Collapse all diffs" })
    .click();
  await currentReviewFilesPage
    .getByRole("button", { name: "Expand all diffs" })
    .click();
  await currentReviewFilesPage
    .getByRole("button", { name: "Switch to split diff" })
    .click();
  const splitDiff = await currentReviewFilesPage.evaluate(() => {
    const pairedRow = [...document.querySelectorAll(
      ".codex-ui-file-diff__split-row",
    )].find((element) =>
      element.getAttribute("aria-label")?.includes("alpha baseline"),
    );
    return {
      after: pairedRow
        ?.querySelector('[data-side="new"] code')
        ?.textContent?.trim(),
      before: pairedRow
        ?.querySelector('[data-side="old"] code')
        ?.textContent?.trim(),
      paneCount: document.querySelectorAll(
        ".codex-ui-file-diff__split-pane",
      ).length,
      splitDiffCount: document.querySelectorAll(
        '.codex-ui-file-diff[data-layout="split"]',
      ).length,
    };
  });
  if (
    splitDiff.splitDiffCount !== 3 ||
    splitDiff.paneCount !== 14 ||
    splitDiff.before !== "alpha baseline" ||
    splitDiff.after !== "alpha updated"
  ) {
    throw new Error(
      `Electron current Review split diff did not create paired panes: ${JSON.stringify(splitDiff)}`,
    );
  }
  await currentReviewFilesPage
    .getByRole("button", { name: "Hide files" })
    .click();
  const visibleHeaderPathCount = await currentReviewFilesPage.evaluate(
    () =>
      [...document.querySelectorAll(
        ".codex-ui-file-review-workspace__file-identity code",
      )].filter((element) => getComputedStyle(element).display !== "none")
        .length,
  );
  if (visibleHeaderPathCount !== 3) {
    throw new Error(
      `Electron current Review hidden tree lost file identities: ${visibleHeaderPathCount}`,
    );
  }
  await currentReviewFilesPage
    .getByRole("button", { name: "Show files" })
    .click();

  const reviewResizer = currentReviewFilesPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  await reviewResizer.press("Home");
  const narrowToolbar = await currentReviewFilesPage.evaluate(() => {
    const panel = document.querySelector(".codex-ui-app-shell__side-panel");
    const toolbar = document.querySelector(
      ".codex-ui-file-review-workspace__toolbar",
    );
    const optionalActions = [...document.querySelectorAll(
      ".codex-ui-file-review-workspace__optional-action",
    )];
    const gitActions = document.querySelector(
      ".codex-ui-file-review-workspace__git-actions",
    );
    return {
      clientWidth: toolbar?.clientWidth ?? null,
      gitDisplay: gitActions ? getComputedStyle(gitActions).display : null,
      optionalVisibleCount: optionalActions.filter(
        (element) => getComputedStyle(element).display !== "none",
      ).length,
      panelWidth: panel?.getBoundingClientRect().width ?? null,
      scrollWidth: toolbar?.scrollWidth ?? null,
    };
  });
  if (
    Math.abs((narrowToolbar.panelWidth ?? 0) - 320) > 1 ||
    narrowToolbar.gitDisplay !== "none" ||
    narrowToolbar.optionalVisibleCount !== 0 ||
    narrowToolbar.clientWidth === null ||
    narrowToolbar.scrollWidth === null ||
    narrowToolbar.scrollWidth > narrowToolbar.clientWidth + 1
  ) {
    throw new Error(
      `Electron current Review narrow toolbar overflowed: ${JSON.stringify(narrowToolbar)}`,
    );
  }

  await currentReviewFilesPage
    .getByRole("button", { exact: false, name: /^Undo/ })
    .click();
  const revertedState = await currentReviewFilesPage.evaluate(() => ({
    fileGroupCount: document.querySelectorAll(
      '[data-testid="file-change-group"]',
    ).length,
    panelOpen:
      document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-side-panel-open") ?? false,
    reapplyCount: [...document.querySelectorAll("button")].filter((button) =>
      button.textContent?.trim().startsWith("Reapply"),
    ).length,
  }));
  if (
    revertedState.fileGroupCount !== 1 ||
    revertedState.panelOpen ||
    revertedState.reapplyCount !== 1
  ) {
    throw new Error(
      `Electron current Review Undo settlement lost state: ${JSON.stringify(revertedState)}`,
    );
  }
  await currentReviewFilesPage
    .getByRole("button", { exact: false, name: /^Reapply/ })
    .click();
} finally {
  await currentReviewFilesApp.close();
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

const currentHomeElectronScenes = [
  {
    currentSidebar: true,
    frame: "current-home-dark-wide",
    id: "electron-current-home-dark-wide",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "current-home-light-wide",
    id: "electron-current-home-light-wide",
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "current-home-dark-compact",
    id: "electron-current-home-dark-compact",
    scenario: "workspace-workflow",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "current-home-light-compact",
    id: "electron-current-home-light-compact",
    scenario: "workspace-workflow",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

for (const currentHomeScene of currentHomeElectronScenes) {
  const { app: currentHomeApp, page: currentHomePage } =
    await launchScene(currentHomeScene);
  try {
    const nativeBounds = await currentHomeApp.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const contract = await currentHomePage.evaluate(() => {
      const visibleCards = Array.from(
        document.querySelectorAll(
          ".codex-ui-new-conversation-prompt-grid > button",
        ),
      ).filter((button) => getComputedStyle(button).display !== "none");
      const sidebar = document.querySelector(
        ".codex-ui-app-shell__sidebar",
      );
      const main = document.querySelector(".codex-ui-app-shell__main");
      return {
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        frame: document
          .querySelector(".demo-root")
          ?.getAttribute("data-frame"),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        iconNames: Array.from(
          document.querySelectorAll(
            ".codex-ui-new-conversation-prompt-grid [data-current-build-icon]",
          ),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        mainWidth: main?.getBoundingClientRect().width,
        markSize: document
          .querySelector('[data-current-build-icon="home-mark"]')
          ?.getBoundingClientRect().width,
        sidebarWidth: sidebar?.getBoundingClientRect().width,
        visibleCards: visibleCards.length,
      };
    });
    const compact = currentHomeScene.frame.endsWith("-compact");
    const expectedWidth = compact ? 720 : 1180;
    const expectedHeight = compact ? 680 : 820;
    if (
      nativeBounds?.width !== expectedWidth ||
      nativeBounds?.height !== expectedHeight ||
      contract.frame !== currentHomeScene.frame ||
      contract.colorScheme !== currentHomeScene.theme ||
      contract.horizontalOverflow > 1 ||
      Math.abs((contract.sidebarWidth ?? 0) - 322.90625) > 0.1 ||
      Math.abs(
        (contract.mainWidth ?? 0) - (compact ? 397.09375 : 857.09375),
      ) > 0.1 ||
      contract.markSize !== 56 ||
      contract.visibleCards !== (compact ? 2 : 4) ||
      JSON.stringify(contract.iconNames) !==
        JSON.stringify([
          "home-suggestion-explore",
          "home-suggestion-build",
          "home-suggestion-review",
          "home-suggestion-fix",
        ])
    ) {
      throw new Error(
        `Electron current home geometry failed: ${JSON.stringify({ contract, nativeBounds })}`,
      );
    }

    const firstPrompt = currentHomePage.getByRole("button", {
      name: "Explore and understand code",
    });
    await firstPrompt.click();
    const composer = currentHomePage.getByRole("textbox", {
      name: "Do anything",
    });
    if ((await composer.inputValue()) !== "Explore and understand code") {
      throw new Error("Electron current home prompt selection failed.");
    }
    await composer.fill("");

    const destination = currentHomePage.locator(
      "#demo-workspace-destination-trigger",
    );
    await destination.click();
    const projectDialog = currentHomePage.getByRole("dialog", {
      name: "Choose a project",
    });
    const projectSearch = projectDialog.getByRole("searchbox", {
      name: "Search projects",
    });
    await projectSearch.waitFor();
    await projectSearch.press("Escape");
    await projectDialog.waitFor({ state: "hidden" });
    await currentHomePage.waitForTimeout(20);
    if (
      (await currentHomePage.evaluate(
        () => document.activeElement?.id,
      )) !== "demo-workspace-destination-trigger"
    ) {
      throw new Error(
        "Electron current home project portal did not restore focus.",
      );
    }
  } finally {
    await currentHomeApp.close();
  }
}

const currentAccountMenuElectronScenes = [
  {
    currentSidebar: true,
    frame: "current-home-dark-wide",
    id: "electron-current-sidebar-account-menu",
    scenario: "workspace-workflow",
    sidebarState: "account-menu",
    theme: "dark",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "current-home-light-wide",
    id: "electron-current-sidebar-account-menu-light",
    scenario: "workspace-workflow",
    sidebarState: "account-menu",
    theme: "light",
    view: "workspace",
  },
  {
    currentSidebar: true,
    frame: "current-home-dark-compact",
    id: "electron-current-sidebar-account-menu-compact",
    scenario: "workspace-workflow",
    sidebarState: "account-menu",
    theme: "dark",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
  {
    currentSidebar: true,
    frame: "current-home-light-compact",
    id: "electron-current-sidebar-account-menu-light-compact",
    scenario: "workspace-workflow",
    sidebarState: "account-menu",
    theme: "light",
    view: "workspace",
    windowSize: { height: 680, width: 720 },
  },
];

for (const accountMenuScene of currentAccountMenuElectronScenes) {
  const { app: accountMenuApp, page: accountMenuPage } =
    await launchScene(accountMenuScene);
  try {
    const menu = accountMenuPage.getByRole("menu", { name: "Account menu" });
    const trigger = accountMenuPage.getByRole("button", {
      exact: true,
      name: "Demo account",
    });
    await menu.waitFor({ state: "visible" });
    const nativeBounds = await accountMenuApp.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const contract = await menu.evaluate((element) => {
      const rect = (target) => {
        const bounds = target?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const menuStyle = getComputedStyle(element);
      const items = Array.from(
        element.querySelectorAll('[role="menuitem"]'),
      );
      return {
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        dividerHeight: rect(
          element.querySelector(
            ".demo-current-sidebar-account-menu__divider",
          ),
        )?.height,
        focusRole: document.activeElement?.getAttribute("role"),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        icons: Array.from(
          element.querySelectorAll("[data-current-build-icon]"),
          (icon) => icon.getAttribute("data-current-build-icon"),
        ),
        imageCount: element.querySelectorAll("img").length,
        itemRects: items.map(rect),
        itemStyles: items.map((item) => {
          const style = getComputedStyle(item);
          return {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            padding: style.padding,
          };
        }),
        menuRect: rect(element),
        menuStyle: {
          backgroundColor: menuStyle.backgroundColor,
          borderRadius: menuStyle.borderRadius,
          boxShadow: menuStyle.boxShadow,
          color: menuStyle.color,
        },
        separatorCount: element.querySelectorAll('[role="separator"]')
          .length,
        sidebarRect: rect(
          document.querySelector(".codex-ui-app-shell__sidebar"),
        ),
        triggerRect: rect(
          document.querySelector(
            '.codex-ui-app-sidebar-footer button[aria-label="Demo account"]',
          ),
        ),
      };
    });
    contract.triggerRect = await trigger.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      };
    });
    const compact = accountMenuScene.id.endsWith("compact");
    const expectedTop = compact ? 447 : 587;
    const expectedItemTops = [
      expectedTop + 4,
      expectedTop + 41.5625,
      expectedTop + 70.125,
      expectedTop + 98.6875,
      expectedTop + 127.25,
      expectedTop + 155.8125,
    ];
    const expectedBackground =
      accountMenuScene.theme === "light"
        ? "oklab(0.999994 0.0000455678 0.0000200868 / 0.9)"
        : "oklab(0.297161 0.0000135154 0.00000594556 / 0.9)";
    const expectedColor =
      accountMenuScene.theme === "light"
        ? "rgb(26, 28, 31)"
        : "rgb(223, 223, 223)";
    const near = (actual, expected, tolerance = 0.15) =>
      typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
    if (
      nativeBounds?.width !== (compact ? 720 : 1180) ||
      nativeBounds?.height !== (compact ? 680 : 820) ||
      contract.colorScheme !== accountMenuScene.theme ||
      contract.horizontalOverflow > 1 ||
      contract.focusRole !== "menu" ||
      contract.imageCount !== 1 ||
      contract.separatorCount !== 0 ||
      contract.dividerHeight !== 9 ||
      !near(contract.sidebarRect?.width, 322.90625) ||
      !near(contract.menuRect?.left, 9) ||
      !near(contract.menuRect?.top, expectedTop) ||
      !near(contract.menuRect?.width, 306.90625) ||
      !near(contract.menuRect?.height, 188.375) ||
      !near(contract.triggerRect?.left, 8) ||
      contract.triggerRect?.width < 150 ||
      contract.triggerRect?.left + contract.triggerRect?.width >
        contract.sidebarRect?.left + contract.sidebarRect?.width ||
      contract.triggerRect?.height !== 29 ||
      !near(contract.triggerRect?.top, compact ? 642.5 : 782.5) ||
      JSON.stringify(contract.icons) !==
        JSON.stringify([
          "sidebar-account-menu-usage",
          "sidebar-account-menu-pet",
          "sidebar-account-menu-invite",
          "sidebar-account-menu-settings",
          "sidebar-account-menu-logout",
        ]) ||
      contract.menuStyle.backgroundColor !== expectedBackground ||
      contract.menuStyle.color !== expectedColor ||
      contract.menuStyle.borderRadius !== "15px" ||
      !contract.menuStyle.boxShadow.includes(
        accountMenuScene.theme === "light"
          ? "rgba(26, 28, 31, 0.08)"
          : "rgba(255, 255, 255, 0.082)",
      ) ||
      contract.itemRects.length !== 6 ||
      contract.itemRects.some(
        (rect, index) =>
          !near(rect?.left, 13) ||
          !near(rect?.top, expectedItemTops[index]) ||
          !near(rect?.width, 298.90625) ||
          !near(rect?.height, 28.5625),
      ) ||
      contract.itemStyles.some(
        (style) =>
          style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          style.borderRadius !== "12.5px" ||
          style.fontSize !== "13px" ||
          style.fontWeight !== "400" ||
          style.lineHeight !== "18.5714px" ||
          style.padding !== "5px 8px",
      )
    ) {
      throw new Error(
        `${accountMenuScene.id}: current account menu geometry failed: ${JSON.stringify({ contract, nativeBounds })}`,
      );
    }
    await accountMenuPage.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await accountMenuPage.waitForFunction(() => {
      const active = document.activeElement;
      return (
        active instanceof HTMLButtonElement &&
        (active.textContent?.includes("Demo account") ?? false)
      );
    });
    if (!(await trigger.evaluate((element) => document.activeElement === element))) {
      throw new Error(
        `${accountMenuScene.id}: account menu did not restore trigger focus.`,
      );
    }
  } finally {
    await accountMenuApp.close();
  }
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
await execFileAsync(
  "git",
  ["update-ref", "refs/heads/-topic", "HEAD"],
  { cwd: codingWorkspaceGitDirectory },
);
await execFileAsync(
  "git",
  ["update-ref", "refs/heads/-", "HEAD"],
  { cwd: codingWorkspaceGitDirectory },
);
const codingWorkspaceHead = (
  await execFileAsync("git", ["rev-parse", "HEAD"], {
    cwd: codingWorkspaceGitDirectory,
    encoding: "utf8",
  })
).stdout.trim();
await writeFile(
  join(codingWorkspaceGitDirectory, ".git", "packed-refs"),
  Buffer.concat([
    Buffer.from("# pack-refs with: peeled fully-peeled sorted \n"),
    Buffer.from(`${codingWorkspaceHead} refs/heads/bad-`),
    Buffer.from([0xfe]),
    Buffer.from("\n"),
    Buffer.from(`${codingWorkspaceHead} refs/heads/bad-`),
    Buffer.from([0xff]),
    Buffer.from("\n"),
  ]),
);
const occupiedLinkedWorktreeBranch = "feat/linked-worktree";
const occupiedLinkedWorktreeDirectory = join(
  codingWorkspaceGitDirectory,
  ".worktrees",
  "linked",
);
await execFileAsync(
  "git",
  [
    "worktree",
    "add",
    "-b",
    occupiedLinkedWorktreeBranch,
    occupiedLinkedWorktreeDirectory,
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
    CODEX_DEMO_GIT_BRANCH_LIST_RESPONSE_DELAY_MS: "1000",
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
      composerWidth: 414,
      height: 680,
      layoutMode: "narrow",
      rootWidth: 446,
      sidebarOpen: true,
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
      { height: 16, name: "workspace-run-location-local", width: 16 },
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
    (await projectDialog.getByRole("option", { name: "New project" }).count()) !==
      1 ||
    (await projectDialog
      .getByRole("option", { name: "Don't work in a project" })
      .count()) !== 1
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

  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Switch branch"]:not([disabled])',
  );
  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await codingWorkspacePage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitem", { name: "Select local environment…" })
    .click();
  const reachableLocalEnvironmentDialog = codingWorkspacePage.getByRole(
    "dialog",
    { name: "Select local environment" },
  );
  await reachableLocalEnvironmentDialog
    .getByRole("heading", { name: "codex-app-server-client" })
    .waitFor();
  await reachableLocalEnvironmentDialog.press("Escape");
  await reachableLocalEnvironmentDialog.waitFor({ state: "hidden" });

  await codingWorkspacePage
    .getByRole("button", { name: "Select where to run the chat" })
    .press("ArrowDown");
  await codingWorkspacePage.waitForTimeout(50);
  const environmentMenu = codingWorkspacePage.getByRole("menu", {
    name: "Work in",
  });
  const localEnvironment = environmentMenu.getByRole("menuitem", {
    name: "Local",
    exact: true,
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.matches(
        ".demo-workspace-environment-menu .codex-ui-menu-item:first-of-type",
      ) ?? false,
  );
  const environmentMenuContract = await environmentMenu.evaluate((menu) => ({
    disabled: Array.from(menu.querySelectorAll('[role="menuitem"]'), (item) =>
      item.getAttribute("aria-disabled") === "true" ||
      (item instanceof HTMLButtonElement && item.disabled),
    ),
    href: menu
      .querySelector('a[role="menuitem"]')
      ?.getAttribute("href"),
    icons: Array.from(
      menu.querySelectorAll("[data-current-build-icon]"),
      (icon) => icon.getAttribute("data-current-build-icon"),
    ),
    labels: Array.from(
      menu.querySelectorAll('[role="menuitem"]'),
      (item) =>
        item.querySelector(".codex-ui-menu-item__label")?.textContent?.trim(),
    ),
    roles: Array.from(
      menu.querySelectorAll('[role="menuitem"]'),
      (item) => item.getAttribute("role"),
    ),
    tags: Array.from(
      menu.querySelectorAll('[role="menuitem"]'),
      (item) => item.tagName,
    ),
  }));
  if (
    JSON.stringify(environmentMenuContract.labels) !==
      JSON.stringify([
        "Local",
        "New local worktree",
        "Connect Codex web",
        "Cloud",
        "Usage remaining",
      ]) ||
    JSON.stringify(environmentMenuContract.roles) !==
      JSON.stringify(Array(5).fill("menuitem")) ||
    JSON.stringify(environmentMenuContract.tags) !==
      JSON.stringify(["BUTTON", "BUTTON", "A", "BUTTON", "BUTTON"]) ||
    JSON.stringify(environmentMenuContract.disabled) !==
      JSON.stringify([false, false, false, true, false]) ||
    environmentMenuContract.href !== "https://chatgpt.com/codex/cloud" ||
    JSON.stringify(environmentMenuContract.icons) !==
      JSON.stringify([
        "workspace-run-location-local",
        "workspace-selection-check",
        "workspace-run-location-worktree",
        "workspace-run-location-codex-web",
        "workspace-run-location-external",
        "workspace-run-location-send-cloud",
        "workspace-run-location-usage",
        "workspace-run-location-usage-chevron",
      ]) ||
    (await localEnvironment.locator(
      '[data-current-build-icon="workspace-selection-check"]',
    ).count()) !== 1
  ) {
    throw new Error(
      `Electron coding workspace run-location menu is invalid: ${JSON.stringify(environmentMenuContract)}.`,
    );
  }
  await environmentMenu
    .getByRole("menuitem", { name: "New local worktree" })
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
      "Select a local environment",
    ) ||
    !newWorktreeState.contextLabels.includes(
      "What branch should this chat start from?",
    )
  ) {
    throw new Error(
      `Electron coding workspace did not enter the current New local worktree state: ${JSON.stringify(newWorktreeState)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Select a local environment" })
    .click();
  const worktreeEnvironmentMenu = codingWorkspacePage.getByRole("menu", {
    name: "Environment",
  });
  await worktreeEnvironmentMenu.waitFor();
  if (
    (await codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    )) !== "Select a local environment"
  ) {
    throw new Error(
      "Electron coding workspace pointer-opened environment picker moved focus away from its trigger.",
    );
  }
  const worktreeEnvironmentState = {
    emptyCount: await worktreeEnvironmentMenu
      .locator(".demo-workspace-context-menu__empty")
      .count(),
    icons: await worktreeEnvironmentMenu
      .locator("[data-current-build-icon]")
      .evaluateAll((icons) =>
        icons.map((icon) => icon.getAttribute("data-current-build-icon")),
      ),
    items: await worktreeEnvironmentMenu
      .locator(".codex-ui-menu-item__label")
      .allTextContents(),
  };
  if (
    worktreeEnvironmentState.emptyCount !== 0 ||
    JSON.stringify(worktreeEnvironmentState.items.map((item) => item.trim())) !==
      JSON.stringify([
        "Work without environment",
        "Set up project",
      ]) ||
    JSON.stringify(worktreeEnvironmentState.icons) !==
      JSON.stringify([
        "workspace-selection-check",
        "workspace-environment-settings",
      ])
  ) {
    throw new Error(
      `Electron coding workspace environment picker is invalid: ${JSON.stringify(worktreeEnvironmentState)}.`,
    );
  }
  await worktreeEnvironmentMenu
    .getByRole("menuitem", { name: "Set up project" })
    .click();
  const environmentsRoute = codingWorkspacePage.getByRole("region", {
    name: "Environments",
  });
  await environmentsRoute.waitFor();
  const environmentUnavailable = await environmentsRoute.evaluate((region) => {
    const rect = (element) => {
      const bounds = element.getBoundingClientRect();
      return {
        height: bounds.height,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const heading = region.querySelector("h1");
    const statusHeading = region.querySelector("h2");
    const status = region.querySelector('[role="status"]');
    const message = status?.querySelector("div");
    return {
      heading: {
        rect: rect(heading),
        style: {
          fontSize: getComputedStyle(heading).fontSize,
          fontWeight: getComputedStyle(heading).fontWeight,
          lineHeight: getComputedStyle(heading).lineHeight,
        },
        text: heading?.textContent?.trim(),
      },
      message: {
        style: {
          fontSize: getComputedStyle(message).fontSize,
          fontWeight: getComputedStyle(message).fontWeight,
          padding: getComputedStyle(message).padding,
        },
        text: message?.textContent?.trim(),
      },
      region: rect(region),
      status: {
        rect: rect(status),
        style: {
          backgroundColor: getComputedStyle(status).backgroundColor,
          borderRadius: getComputedStyle(status).borderRadius,
        },
      },
      statusHeading: {
        rect: rect(statusHeading),
        style: {
          fontSize: getComputedStyle(statusHeading).fontSize,
          fontWeight: getComputedStyle(statusHeading).fontWeight,
          lineHeight: getComputedStyle(statusHeading).lineHeight,
        },
        text: statusHeading?.textContent?.trim(),
      },
    };
  });
  if (
    environmentUnavailable.heading.text !== "Environments" ||
    environmentUnavailable.statusHeading.text !==
      "Local environments unavailable" ||
    environmentUnavailable.message.text !==
      "We could not load local environment settings for this project" ||
    Math.abs(environmentUnavailable.region.width - 768) > 1 ||
    Math.abs(environmentUnavailable.heading.rect.left - 343) > 1 ||
    Math.abs(environmentUnavailable.heading.rect.top - 66) > 1 ||
    environmentUnavailable.heading.style.fontSize !== "24px" ||
    environmentUnavailable.heading.style.fontWeight !== "400" ||
    environmentUnavailable.heading.style.lineHeight !== "28.8px" ||
    Math.abs(environmentUnavailable.statusHeading.rect.top - 136.3) > 0.5 ||
    environmentUnavailable.statusHeading.style.fontSize !== "14px" ||
    environmentUnavailable.statusHeading.style.fontWeight !== "500" ||
    Math.abs(environmentUnavailable.status.rect.top - 172.8) > 0.5 ||
    Math.abs(environmentUnavailable.status.rect.height - 44.56) > 0.2 ||
    environmentUnavailable.status.style.backgroundColor !==
      "rgb(35, 35, 35)" ||
    environmentUnavailable.status.style.borderRadius !== "20px" ||
    environmentUnavailable.message.style.fontSize !== "13px" ||
    environmentUnavailable.message.style.fontWeight !== "445" ||
    environmentUnavailable.message.style.padding !== "12px"
  ) {
    throw new Error(
      `Electron environment settings route is invalid: ${JSON.stringify(environmentUnavailable)}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "New chat", exact: true })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Select where to run the chat"]',
  );
  if ((await environmentsRoute.count()) !== 0) {
    throw new Error(
      "Electron workspace navigation retained the environment settings route.",
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  await environmentMenu.waitFor();
  await environmentMenu
    .getByRole("menuitem", { name: "New local worktree" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { name: "Select a local environment" })
    .click();
  await worktreeEnvironmentMenu.waitFor();
  await worktreeEnvironmentMenu
    .getByRole("menuitem", { name: "Set up project" })
    .click();
  await environmentsRoute.waitFor();
  await codingWorkspacePage
    .getByRole("button", { name: "Back to ChatGPT" })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Select where to run the chat"]',
  );
  await codingWorkspacePage
    .getByRole("button", { name: "Select a local environment" })
    .click();
  await worktreeEnvironmentMenu.waitFor();
  await codingWorkspacePage.keyboard.press("Tab");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "What branch should this chat start from?",
  );
  await codingWorkspacePage
    .getByRole("button", { name: "Select a local environment" })
    .press("ArrowDown");
  await worktreeEnvironmentMenu.waitFor();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Work without environment",
  );
  await codingWorkspacePage.keyboard.press("Escape");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Select a local environment",
  );
  await codingWorkspacePage.keyboard.press("Enter");
  await worktreeEnvironmentMenu.waitFor();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.textContent?.trim() ===
      "Work without environment",
  );
  await codingWorkspacePage.keyboard.press("Escape");
  await worktreeEnvironmentMenu.waitFor({ state: "hidden" });
  await codingWorkspacePage
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  await environmentMenu
    .getByRole("menuitem", { name: "Local", exact: true })
    .click();
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Select where to run the chat"]',
  );
  await waitForBranchLabel(codingWorkspacePage, "main");

  await codingWorkspacePage
    .getByRole("button", {
      name: "Switch branch",
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
  const appServerWorktreeItems = await worktreeMenu
    .getByRole("menuitemradio")
    .evaluateAll((items) =>
      items.map((item) => ({
        branch: item
          .querySelector(".codex-ui-menu-item__label")
          ?.textContent?.trim(),
        checked: item.getAttribute("aria-checked"),
        disabled:
          item instanceof HTMLButtonElement ? item.disabled : undefined,
        status: item
          .querySelector(".codex-ui-menu-item__subtext")
          ?.textContent?.trim(),
      })),
    );
  if (
    JSON.stringify(appServerWorktreeItems) !==
    JSON.stringify([
      {
        branch: "-",
        checked: "false",
        disabled: true,
        status: "Unavailable for checkout",
      },
      {
        branch: "-topic",
        checked: "false",
        disabled: false,
      },
      {
        branch: "Non-UTF-8 branch [6261642dfe]",
        checked: "false",
        disabled: true,
        status: "Unavailable for checkout",
      },
      {
        branch: "Non-UTF-8 branch [6261642dff]",
        checked: "false",
        disabled: true,
        status: "Unavailable for checkout",
      },
      {
        branch: occupiedLinkedWorktreeBranch,
        checked: "false",
        disabled: true,
        status: "Checked out in another worktree",
      },
      {
        branch: "main",
        checked: "true",
        disabled: false,
      },
    ])
  ) {
    throw new Error(
      `Electron coding workspace did not classify its host repository branches: ${JSON.stringify(appServerWorktreeItems)}.`,
    );
  }
  await worktreeMenu
    .getByRole("menuitemradio", { name: "-topic" })
    .click();
  await waitForBranchLabel(codingWorkspacePage, "-topic");
  const checkedOutDashBranch = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: codingWorkspaceGitDirectory, encoding: "utf8" },
  );
  if (checkedOutDashBranch.stdout.trim() !== "-topic") {
    throw new Error(
      `Electron did not checkout the enumerated dash-prefixed branch: ${checkedOutDashBranch.stdout.trim()}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await worktreeMenu
    .getByRole("menuitemradio", { name: "main" })
    .click();
  await waitForBranchLabel(codingWorkspacePage, "main");
  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
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
  await branchDialog
    .getByRole("button", { name: "Set prefix", exact: true })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-frame="workspace-git-settings"]',
  );
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.matches(
        ".codex-ui-settings-shell__back",
      ) && document.activeElement.textContent?.trim() === "Back to app",
  );
  const gitSettingsNavigation = codingWorkspacePage.getByRole("navigation", {
    name: "Settings",
  });
  const gitSettingsMain = codingWorkspacePage.getByRole("main");
  await gitSettingsNavigation.waitFor({ state: "visible" });
  if (
    (await gitSettingsNavigation.getByRole("button").count()) !== 22 ||
    (await codingWorkspacePage.locator('main, [role="main"]').count()) !== 1 ||
    (await codingWorkspacePage
      .locator('[role="region"][aria-label="Settings route"]')
      .count()) !== 1 ||
    (await gitSettingsMain.getByRole("heading", { name: "Git" }).count()) !==
      1 ||
    (await codingWorkspacePage
      .locator(".codex-ui-app-shell__sidebar:visible")
      .count()) !== 0 ||
    (await codingWorkspacePage
      .locator("[data-current-build-icon^=settings-]")
      .count()) !== 24
  ) {
    throw new Error("Electron Set prefix did not open the complete Git Settings route.");
  }
  const settingsSearch = gitSettingsNavigation.getByRole("searchbox");
  await settingsSearch.fill("git");
  await gitSettingsNavigation
    .getByText("Right before ChatGPT ends its turn", { exact: true })
    .waitFor();
  if (
    (await gitSettingsNavigation
      .getByRole("button", { name: "Plugins", exact: true })
      .count()) !== 0
  ) {
    throw new Error("Electron Git Settings search retained an unrelated result.");
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "Hooks", exact: true })
    .click();
  await gitSettingsMain
    .getByRole("heading", { level: 1, name: "Hooks", exact: true })
    .waitFor();
  const hooksGeometry = await gitSettingsMain.evaluate((main) => {
    const rect = (selector) => {
      const element = main.querySelector(selector);
      const value = element?.getBoundingClientRect();
      return value
        ? {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          }
        : null;
    };
    return {
      card: rect(".codex-ui-hooks-settings__empty"),
      evidence: main
        .querySelector(".codex-ui-hooks-settings")
        ?.getAttribute("data-evidence"),
      heading: rect(".codex-ui-hooks-settings h1"),
      reload: rect('.codex-ui-hooks-settings__reload[aria-label="Reload hooks"]'),
      reloadIcon: main
        .querySelector('[data-current-build-icon="settings-hooks-reload"]')
        ?.getAttribute("data-current-build-icon"),
    };
  });
  if (
    (await gitSettingsNavigation
      .getByRole("button", { name: "Hooks", exact: true })
      .getAttribute("aria-current")) !== "page" ||
    (await gitSettingsMain.getByText("No hooks found", { exact: true }).count()) !==
      1 ||
    (await settingsSearch.inputValue()) !== "git" ||
    hooksGeometry.evidence !== "runtime-observed" ||
    hooksGeometry.heading?.top !== 66 ||
    hooksGeometry.heading?.width !== 726 ||
    hooksGeometry.reload?.height !== 26 ||
    hooksGeometry.reload?.width !== 26 ||
    hooksGeometry.card?.top !== 153.796875 ||
    hooksGeometry.card?.width !== 768 ||
    Math.abs((hooksGeometry.card?.height ?? 0) - 62.578125) > 0.1 ||
    hooksGeometry.reloadIcon !== "settings-hooks-reload"
  ) {
    throw new Error(
      `Electron Hooks Settings route is incomplete: ${JSON.stringify(hooksGeometry)}.`,
    );
  }
  await gitSettingsMain
    .getByRole("button", { name: "Reload hooks", exact: true })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.querySelector(".demo-settings-action-status")?.textContent ===
      "Refreshed hooks",
  );
  const clearSettingsSearch = gitSettingsNavigation.getByRole("button", {
    name: "Clear settings search",
  });
  await clearSettingsSearch.focus();
  await clearSettingsSearch.click();
  if (!(await settingsSearch.evaluate((input) => input === document.activeElement))) {
    throw new Error("Electron clearing Settings search did not restore input focus.");
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "Git", exact: true })
    .click();
  await gitSettingsMain
    .getByRole("heading", { name: "Git", exact: true })
    .waitFor();
  const forcePushSwitch = gitSettingsMain.getByRole("switch", {
    name: "Always force push",
  });
  await forcePushSwitch.click();
  const mergeRadio = gitSettingsMain.getByRole("radio", { name: "Merge" });
  const squashRadio = gitSettingsMain.getByRole("radio", { name: "Squash" });
  await mergeRadio.focus();
  await mergeRadio.press("ArrowRight");
  const commitInstructions = gitSettingsMain.getByRole("textbox", {
    name: "Commit instructions",
  });
  await commitInstructions.fill("Use conventional commits.");
  const gitSettingsSave = gitSettingsMain
    .getByRole("button", { name: "Save" })
    .first();
  if (
    (await forcePushSwitch.getAttribute("aria-checked")) !== "true" ||
    (await mergeRadio.getAttribute("tabindex")) !== "-1" ||
    (await squashRadio.getAttribute("aria-checked")) !== "true" ||
    (await squashRadio.getAttribute("tabindex")) !== "0" ||
    (await gitSettingsSave.isDisabled())
  ) {
    throw new Error("Electron Git Settings controls did not update controlled state.");
  }
  await gitSettingsSave.click();
  await gitSettingsNavigation
    .getByRole("button", { name: "Appearance", exact: true })
    .click();
  const appearanceSettingsMain = codingWorkspacePage.getByRole("main");
  await appearanceSettingsMain
    .getByRole("heading", { name: "Appearance", exact: true })
    .waitFor();
  const appearanceGeometry = await appearanceSettingsMain.evaluate((main) => {
    const heading = main
      .querySelector(".codex-ui-appearance-settings > h1")
      ?.getBoundingClientRect();
    const preview = main
      .querySelector(".codex-ui-appearance-settings__diff-preview")
      ?.getBoundingClientRect();
    const themePreviews = Array.from(
      main.querySelectorAll(".codex-ui-appearance-settings__theme-preview"),
      (element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      },
    );
    return {
      heading: heading
        ? { top: heading.top, width: heading.width }
        : null,
      preview: preview
        ? { height: preview.height, width: preview.width }
        : null,
      themePreviews,
    };
  });
  if (
    (await gitSettingsNavigation
      .getByRole("button", { name: "Appearance", exact: true })
      .getAttribute("aria-current")) !== "page" ||
    appearanceGeometry.heading?.top !== 66 ||
    appearanceGeometry.heading?.width !== 768 ||
    appearanceGeometry.preview?.height !== 110 ||
    appearanceGeometry.preview?.width !== 768 ||
    appearanceGeometry.themePreviews.length !== 3 ||
    appearanceGeometry.themePreviews.some(
      ({ height, width }) => Math.abs(height - 175) > 1 || width !== 248,
    ) ||
    (await appearanceSettingsMain.getByRole("switch").count()) !== 4 ||
    (await appearanceSettingsMain.getByRole("slider").count()) !== 2 ||
    (await appearanceSettingsMain.getByRole("spinbutton").count()) !== 2
  ) {
    throw new Error(
      `Electron Appearance Settings route is incomplete: ${JSON.stringify(appearanceGeometry)}.`,
    );
  }
  await appearanceSettingsMain
    .locator('label:has(input[aria-label="Dark"])')
    .click();
  await appearanceSettingsMain
    .getByRole("switch", { name: "Light translucent sidebar" })
    .click();
  await appearanceSettingsMain
    .getByRole("button", { name: "Copy Light theme" })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.querySelector(".demo-settings-action-status")?.textContent ===
      "Light theme copied",
  );
  await appearanceSettingsMain
    .getByRole("button", { name: "Light code theme" })
    .click();
  const appearanceCodeThemes = codingWorkspacePage.getByRole("menuitem");
  if (
    (await appearanceCodeThemes.count()) !== 16 ||
    !(await appearanceCodeThemes.first().textContent())?.includes("Absolutely") ||
    !(await appearanceCodeThemes.last().textContent())?.includes("Xcode")
  ) {
    throw new Error("Electron Appearance code theme menu is incomplete.");
  }
  await appearanceCodeThemes.filter({ hasText: "GitHub" }).click();
  await appearanceSettingsMain
    .getByRole("heading", { name: "Preferences", exact: true })
    .scrollIntoViewIfNeeded();
  const pointerCursor = appearanceSettingsMain.getByRole("switch", {
    name: "Use pointer cursors",
  });
  await pointerCursor.click();
  await appearanceSettingsMain
    .locator('label:has(input[aria-label="Use ChatGPT Dock icon"])')
    .click();
  const systemMotion = appearanceSettingsMain.getByRole("button", {
    name: "System",
    exact: true,
  });
  await systemMotion.focus();
  await systemMotion.press("ArrowRight");
  await appearanceSettingsMain
    .getByRole("spinbutton", { name: "Sans font size" })
    .fill("15");
  await appearanceSettingsMain
    .getByRole("spinbutton", { name: "Code font size" })
    .fill("13");
  const colorMarkers = appearanceSettingsMain.getByRole("button", {
    name: "Color diff markers",
  });
  await colorMarkers.focus();
  await colorMarkers.press("ArrowRight");
  await appearanceSettingsMain
    .getByRole("switch", { name: "Font smoothing" })
    .click();
  const appearanceInteraction = await appearanceSettingsMain.evaluate((main) => ({
    codeTheme: main
      .querySelector('button[aria-label="Light code theme"]')
      ?.textContent?.trim(),
    darkTheme: main.querySelector('input[aria-label="Dark"]')?.checked,
    dockIcon: main.querySelector(
      'input[aria-label="Use ChatGPT Dock icon"]',
    )?.checked,
    fontSmoothing: main
      .querySelector('[role="switch"][aria-label="Font smoothing"]')
      ?.getAttribute("aria-checked"),
    lightSidebar: main
      .querySelector(
        '[role="switch"][aria-label="Light translucent sidebar"]',
      )
      ?.getAttribute("aria-checked"),
    markers: main
      .querySelector('button[aria-label="Plus / minus diff markers"]')
      ?.getAttribute("aria-pressed"),
    motion: main
      .querySelector('button[aria-label="On"]')
      ?.getAttribute("aria-pressed"),
    pointer: main
      .querySelector('[role="switch"][aria-label="Use pointer cursors"]')
      ?.getAttribute("aria-checked"),
    sizes: Array.from(
      main.querySelectorAll('input[type="number"]'),
      (input) => Number(input.value),
    ),
  }));
  if (
    !appearanceInteraction.codeTheme?.includes("GitHub") ||
    appearanceInteraction.darkTheme !== true ||
    appearanceInteraction.dockIcon !== true ||
    appearanceInteraction.fontSmoothing !== "false" ||
    appearanceInteraction.lightSidebar !== "false" ||
    appearanceInteraction.markers !== "true" ||
    appearanceInteraction.motion !== "true" ||
    appearanceInteraction.pointer !== "true" ||
    JSON.stringify(appearanceInteraction.sizes) !== JSON.stringify([15, 13])
  ) {
    throw new Error(
      `Electron Appearance Settings controls did not update controlled state: ${JSON.stringify(appearanceInteraction)}.`,
    );
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "General", exact: true })
    .click();
  const generalSettingsMain = codingWorkspacePage.getByRole("main");
  await generalSettingsMain
    .getByRole("heading", { level: 1, name: "General", exact: true })
    .waitFor();
  const generalGeometry = await generalSettingsMain.evaluate((main) => {
    const heading = main
      .querySelector(".codex-ui-general-settings > h1")
      ?.getBoundingClientRect();
    const cards = Array.from(
      main.querySelectorAll(".codex-ui-general-settings__card"),
      (element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      },
    );
    return {
      cards,
      heading: heading ? { top: heading.top, width: heading.width } : null,
      rowCount: main.querySelectorAll(".codex-ui-general-settings__row").length,
      sectionHeadings: Array.from(
        main.querySelectorAll(".codex-ui-general-settings__section > h2"),
        (heading) => heading.textContent,
      ),
    };
  });
  if (
    (await gitSettingsNavigation
      .getByRole("button", { name: "General", exact: true })
      .getAttribute("aria-current")) !== "page" ||
    generalGeometry.heading?.top !== 66 ||
    generalGeometry.heading?.width !== 768 ||
    generalGeometry.cards.length !== 5 ||
    generalGeometry.cards.some(({ width }) => width !== 768) ||
    generalGeometry.rowCount !== 21 ||
    JSON.stringify(generalGeometry.sectionHeadings) !==
      JSON.stringify([
        "Permissions",
        "General",
        "Composer",
        "Popout Window",
        "Notifications",
      ]) ||
    (await generalSettingsMain.getByRole("switch").count()) !== 12 ||
    (await generalSettingsMain
      .locator('.codex-ui-general-settings__segmented[role="group"]')
      .count()) !== 2
  ) {
    throw new Error(
      `Electron General Settings route is incomplete: ${JSON.stringify(generalGeometry)}.`,
    );
  }
  const readGeneralFocusedLabel = async (label) => {
    await codingWorkspacePage.waitForFunction(
      (expected) =>
        document.activeElement?.getAttribute("aria-label") === expected,
      label,
    );
    return codingWorkspacePage.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    );
  };
  const readGeneralMenuState = () =>
    codingWorkspacePage.getByRole("menuitemradio").evaluateAll((items) =>
      items.map((item) => ({
        checked: item.getAttribute("aria-checked"),
        label: item.textContent?.trim(),
      })),
    );
  const readGeneralDescribedValue = (label) =>
    generalSettingsMain.getByRole("button", { name: label }).evaluate((control) => {
      const descriptionId = control.getAttribute("aria-describedby");
      return descriptionId
        ? document.getElementById(descriptionId)?.textContent?.trim()
        : null;
    });
  const generalMenuFocus = {};
  const generalMenuStates = {};
  const autoReviewSwitch = generalSettingsMain.getByRole("switch", {
    name: "Show Auto-review in the composer",
  });
  await autoReviewSwitch.click();
  await generalSettingsMain
    .getByRole("button", { name: "Default file open destination" })
    .click();
  const fileDestinations = codingWorkspacePage.getByRole("menuitemradio");
  generalMenuStates.fileDestination = await readGeneralMenuState();
  if (
    (await fileDestinations.count()) !== 7 ||
    !(await fileDestinations.first().textContent())?.includes("VS Code") ||
    !(await fileDestinations.last().textContent())?.includes("Xcode")
  ) {
    throw new Error("Electron General file destination menu is incomplete.");
  }
  const xcodeDestination = fileDestinations.filter({ hasText: "Xcode" });
  await xcodeDestination.focus();
  await xcodeDestination.press("Enter");
  generalMenuFocus.fileDestination = await readGeneralFocusedLabel(
    "Default file open destination",
  );
  await generalSettingsMain.getByRole("button", { name: "Language" }).click();
  const languageSearch = codingWorkspacePage.getByRole("searchbox", {
    name: "Search languages",
  });
  const generalLanguageStructure = await codingWorkspacePage.evaluate(() => {
    const dialog = document.querySelector(
      '.codex-ui-general-settings__language-popover[role="dialog"]',
    );
    const listbox = dialog?.querySelector('[role="listbox"]');
    const search = dialog?.querySelector('input[aria-label="Search languages"]');
    return {
      controlsListbox:
        search?.getAttribute("aria-controls") === listbox?.getAttribute("id"),
      dialogContainsListbox: Boolean(dialog && listbox && dialog.contains(listbox)),
      dialogContainsSearch: Boolean(dialog && search && dialog.contains(search)),
      listboxContainsSearch: Boolean(listbox && search && listbox.contains(search)),
    };
  });
  await languageSearch.fill("简体");
  await codingWorkspacePage.evaluate(() => {
    window.__codexGeneralLanguageKeyEvents = [];
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Home" && event.key !== "End") return;
      window.__codexGeneralLanguageKeyEvents.push({
        defaultPrevented: event.defaultPrevented,
        key: event.key,
      });
    });
  });
  await languageSearch.press("Home");
  const generalLanguageHomeFocus = await codingWorkspacePage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  await languageSearch.press("End");
  const generalLanguageEditing = await codingWorkspacePage.evaluate(
    (homeFocus) => ({
      endFocus: document.activeElement?.getAttribute("aria-label"),
      events: window.__codexGeneralLanguageKeyEvents,
      homeFocus,
    }),
    generalLanguageHomeFocus,
  );
  await languageSearch.press("ArrowDown");
  const generalLanguageArrowFocus = await codingWorkspacePage.evaluate(
    () => document.activeElement?.getAttribute("role"),
  );
  const simplifiedChinese = codingWorkspacePage.getByRole("option", {
    name: "简体中文",
    exact: true,
  });
  await simplifiedChinese.focus();
  await simplifiedChinese.press("Enter");
  generalMenuFocus.language = await readGeneralFocusedLabel("Language");
  await generalSettingsMain.getByRole("button", { name: "Language" }).click();
  await languageSearch.focus();
  await languageSearch.press("Escape");
  generalMenuFocus.languageEscape = await readGeneralFocusedLabel("Language");
  const bottomTerminal = generalSettingsMain.getByRole("button", {
    name: "Bottom",
    exact: true,
  });
  await generalSettingsMain.getByRole("button", { name: "Language" }).click();
  await codingWorkspacePage
    .getByRole("searchbox", { name: "Search languages" })
    .waitFor();
  await bottomTerminal.click();
  generalMenuFocus.languageOutside = await readGeneralFocusedLabel("Bottom");
  await bottomTerminal.focus();
  await bottomTerminal.press("ArrowRight");
  await generalSettingsMain.getByRole("button", { name: "Speed" }).click();
  const speedOptions = codingWorkspacePage.getByRole("menuitemradio");
  generalMenuStates.speed = await readGeneralMenuState();
  if ((await speedOptions.count()) !== 2) {
    throw new Error("Electron General speed menu is incomplete.");
  }
  const fastSpeed = speedOptions.filter({ hasText: /^Fast/ });
  await fastSpeed.focus();
  await fastSpeed.press("Enter");
  generalMenuFocus.speed = await readGeneralFocusedLabel("Speed");
  const contextUsageSwitch = generalSettingsMain.getByRole("switch", {
    name: "Show context window usage in the composer",
  });
  await contextUsageSwitch.click();
  await generalSettingsMain
    .getByRole("button", { name: "Send shortcut" })
    .click();
  const commandEnter = codingWorkspacePage
    .getByRole("menuitemradio")
    .filter({ hasText: "⌘ + Enter always" });
  generalMenuStates.sendShortcut = await readGeneralMenuState();
  await commandEnter.focus();
  await commandEnter.press("Enter");
  generalMenuFocus.sendShortcut = await readGeneralFocusedLabel("Send shortcut");
  const queueBehavior = generalSettingsMain.getByRole("button", {
    name: "Queue",
    exact: true,
  });
  await queueBehavior.focus();
  await queueBehavior.press("ArrowRight");
  await generalSettingsMain
    .getByRole("button", { name: "Set shortcut for Popout Window hotkey" })
    .click();
  await generalSettingsMain
    .getByRole("button", { name: "Press shortcut", exact: true })
    .waitFor();
  await codingWorkspacePage.waitForFunction(
    () => document.activeElement?.textContent?.trim() === "Press shortcut",
  );
  const generalHotkeyRecord = generalSettingsMain.getByRole("button", {
    name: "Press shortcut",
    exact: true,
  });
  await generalHotkeyRecord.press("Meta");
  await generalHotkeyRecord.press("Meta+Shift+K");
  const generalHotkeyEdit = generalSettingsMain.getByRole("button", {
    name: "Set shortcut for Popout Window hotkey",
  });
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Set shortcut for Popout Window hotkey",
  );
  const generalHotkeyCaptured = await generalHotkeyEdit
    .locator("span")
    .first()
    .textContent();
  await generalHotkeyEdit.click();
  await generalSettingsMain
    .getByRole("button", { name: "Press shortcut", exact: true })
    .press("Delete");
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Set shortcut for Popout Window hotkey",
  );
  const generalHotkeyCleared = await generalHotkeyEdit
    .locator("span")
    .first()
    .textContent();
  await generalHotkeyEdit.click();
  await generalSettingsMain
    .getByRole("button", { name: "Press shortcut", exact: true })
    .press("Meta+Shift+K");
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Set shortcut for Popout Window hotkey",
  );
  await generalHotkeyEdit.click();
  await generalSettingsMain
    .getByRole("button", { name: "Press shortcut", exact: true })
    .press("Escape");
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Set shortcut for Popout Window hotkey",
  );
  const generalHotkeyEscapePreserved = await generalHotkeyEdit
    .locator("span")
    .first()
    .textContent();
  await generalHotkeyEdit.click();
  await generalSettingsMain
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Set shortcut for Popout Window hotkey",
  );
  const generalHotkeyFocusRestored = await codingWorkspacePage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  await generalSettingsMain
    .getByRole("button", { name: "Turn completion notifications" })
    .click();
  const alwaysNotifications = codingWorkspacePage.getByRole("menuitemradio", {
    name: "Always",
    exact: true,
  });
  generalMenuStates.completionNotifications = await readGeneralMenuState();
  await alwaysNotifications.focus();
  await alwaysNotifications.press("Enter");
  generalMenuFocus.completionNotifications = await readGeneralFocusedLabel(
    "Turn completion notifications",
  );
  const generalDescribedValues = Object.fromEntries(
    await Promise.all(
      [
        "Default file open destination",
        "Language",
        "Speed",
        "Send shortcut",
        "Set shortcut for Popout Window hotkey",
        "Turn completion notifications",
      ].map(async (label) => [label, await readGeneralDescribedValue(label)]),
    ),
  );
  await generalSettingsMain
    .getByRole("button", { name: "View", exact: true })
    .click();
  await codingWorkspacePage.waitForFunction(
    () =>
      document.querySelector(".demo-settings-action-status")?.textContent ===
      "Open source licenses requested",
  );
  const generalInteraction = await generalSettingsMain.evaluate((main, focus) => ({
    autoReview: main
      .querySelector('[role="switch"][aria-label="Show Auto-review in the composer"]')
      ?.getAttribute("aria-checked"),
    completionNotifications: main
      .querySelector('button[aria-label="Turn completion notifications"]')
      ?.textContent?.trim(),
    contextUsage: main
      .querySelector('[role="switch"][aria-label="Show context window usage in the composer"]')
      ?.getAttribute("aria-checked"),
    fileDestination: main
      .querySelector('button[aria-label="Default file open destination"]')
      ?.textContent?.trim(),
    followUp: main
      .querySelector('button[aria-label="Steer"]')
      ?.getAttribute("aria-pressed"),
    hotkeyCapture: Boolean(
      main.querySelector(".codex-ui-general-settings__hotkey-capture"),
    ),
    hotkeyCaptured: focus.hotkeyCaptured,
    hotkeyCleared: focus.hotkeyCleared,
    hotkeyEscapePreserved: focus.hotkeyEscapePreserved,
    hotkeyFocus: focus.hotkey,
    language: main.querySelector('button[aria-label="Language"]')
      ?.textContent?.trim(),
    languageEditing: focus.languageEditing,
    languageArrowFocus: focus.languageArrowFocus,
    languageStructure: focus.languageStructure,
    menuFocus: focus.menu,
    menuStates: focus.menuStates,
    describedValues: focus.describedValues,
    sendShortcut: main.querySelector('button[aria-label="Send shortcut"]')
      ?.textContent?.trim(),
    speed: main.querySelector('button[aria-label="Speed"]')
      ?.textContent?.trim(),
    terminal: main
      .querySelector('button[aria-label="Right"]')
      ?.getAttribute("aria-pressed"),
  }), {
    hotkey: generalHotkeyFocusRestored,
    hotkeyCaptured: generalHotkeyCaptured,
    hotkeyCleared: generalHotkeyCleared,
    hotkeyEscapePreserved: generalHotkeyEscapePreserved,
    languageEditing: generalLanguageEditing,
    languageArrowFocus: generalLanguageArrowFocus,
    languageStructure: generalLanguageStructure,
    menu: generalMenuFocus,
    menuStates: generalMenuStates,
    describedValues: generalDescribedValues,
  });
  if (
    generalInteraction.autoReview !== "false" ||
    generalInteraction.completionNotifications !== "Always⌄" ||
    generalInteraction.contextUsage !== "true" ||
    !generalInteraction.fileDestination?.includes("Xcode") ||
    generalInteraction.followUp !== "true" ||
    generalInteraction.hotkeyCapture ||
    generalInteraction.hotkeyCaptured !== "⌘ ⇧ K" ||
    generalInteraction.hotkeyCleared !== "Off" ||
    generalInteraction.hotkeyEscapePreserved !== "⌘ ⇧ K" ||
    generalInteraction.hotkeyFocus !== "Set shortcut for Popout Window hotkey" ||
    generalInteraction.language !== "简体中文⌄" ||
    generalInteraction.languageEditing.endFocus !== "Search languages" ||
    generalInteraction.languageEditing.homeFocus !== "Search languages" ||
    generalInteraction.languageEditing.events.length !== 2 ||
    generalInteraction.languageEditing.events.some(
      ({ defaultPrevented }) => defaultPrevented,
    ) ||
    generalInteraction.languageArrowFocus !== "option" ||
    !generalInteraction.languageStructure.controlsListbox ||
    !generalInteraction.languageStructure.dialogContainsListbox ||
    !generalInteraction.languageStructure.dialogContainsSearch ||
    generalInteraction.languageStructure.listboxContainsSearch ||
    Object.values(generalInteraction.menuStates).some(
      (states) =>
        states.length === 0 ||
        states.filter(({ checked }) => checked === "true").length !== 1,
    ) ||
    JSON.stringify(generalInteraction.describedValues) !==
      JSON.stringify({
        "Default file open destination": "Xcode",
        Language: "简体中文",
        Speed: "Fast",
        "Send shortcut": "⌘ + Enter always",
        "Set shortcut for Popout Window hotkey": "⌘ ⇧ K",
        "Turn completion notifications": "Always",
      }) ||
    generalInteraction.menuFocus.completionNotifications !==
      "Turn completion notifications" ||
    generalInteraction.menuFocus.fileDestination !==
      "Default file open destination" ||
    generalInteraction.menuFocus.language !== "Language" ||
    generalInteraction.menuFocus.languageEscape !== "Language" ||
    generalInteraction.menuFocus.languageOutside !== "Bottom" ||
    generalInteraction.menuFocus.sendShortcut !== "Send shortcut" ||
    generalInteraction.menuFocus.speed !== "Speed" ||
    generalInteraction.sendShortcut !== "⌘ + Enter always⌄" ||
    !generalInteraction.speed?.includes("Fast") ||
    generalInteraction.terminal !== "true"
  ) {
    throw new Error(
      `Electron General Settings controls did not update controlled state: ${JSON.stringify(generalInteraction)}.`,
    );
  }
  await generalHotkeyEdit.click();
  await generalSettingsMain
    .getByRole("button", { name: "Press shortcut", exact: true })
    .waitFor();
  await gitSettingsNavigation
    .getByRole("button", { name: "Git", exact: true })
    .click();
  await gitSettingsMain.getByRole("heading", { name: "Git", exact: true }).waitFor();
  if (
    (await gitSettingsMain
      .getByRole("switch", { name: "Always force push" })
      .getAttribute("aria-checked")) !== "true" ||
    (await gitSettingsMain
      .getByRole("radio", { name: "Squash" })
      .getAttribute("aria-checked")) !== "true"
  ) {
    throw new Error("Electron Settings route switching lost Git controlled state.");
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "General", exact: true })
    .click();
  await generalSettingsMain
    .getByRole("heading", { level: 1, name: "General", exact: true })
    .waitFor();
  await codingWorkspacePage.waitForFunction(
    () =>
      !document.querySelector(".codex-ui-general-settings__hotkey-capture") &&
      document.activeElement?.textContent?.trim() === "General",
  );
  const generalRouteLifecycle = await generalSettingsMain.evaluate((main) => ({
    hotkey: main
      .querySelector('button[aria-label="Set shortcut for Popout Window hotkey"] span')
      ?.textContent?.trim(),
    hotkeyCapture: Boolean(
      main.querySelector(".codex-ui-general-settings__hotkey-capture"),
    ),
    scrollTop: main.scrollTop,
  }));
  if (
    generalRouteLifecycle.hotkey !== "⌘ ⇧ K" ||
    generalRouteLifecycle.hotkeyCapture ||
    generalRouteLifecycle.scrollTop !== 0
  ) {
    throw new Error(
      `Electron General route retained transient shortcut capture: ${JSON.stringify(generalRouteLifecycle)}.`,
    );
  }
  if (
    (await generalSettingsMain
      .getByRole("switch", { name: "Show Auto-review in the composer" })
      .getAttribute("aria-checked")) !== "false" ||
    (await generalSettingsMain
      .getByRole("button", { name: "Right", exact: true })
      .getAttribute("aria-pressed")) !== "true"
  ) {
    throw new Error("Electron Settings route switching lost General controlled state.");
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "Appearance", exact: true })
    .click();
  if (
    (await appearanceSettingsMain
      .getByRole("switch", { name: "Use pointer cursors" })
      .getAttribute("aria-checked")) !== "true"
  ) {
    throw new Error("Electron Settings route switching lost Appearance controlled state.");
  }
  await gitSettingsNavigation
    .getByRole("button", { name: "Back to app" })
    .click();
  await codingWorkspacePage.waitForSelector(
    '.demo-root[data-frame="workspace-ready"]',
  );
  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await worktreeMenu
    .getByRole("menuitem", { name: "Create and checkout new branch…" })
    .click();
  await branchDialog.waitFor({ state: "visible" });
  await codingWorkspacePage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Branch name",
  );
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
  await waitForBranchLabel(codingWorkspacePage, "feature/sidebar-shell");
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
      name: "Switch branch",
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
  await waitForBranchLabel(codingWorkspacePage, "main");
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
    'button[aria-label="Select where to run the chat"]',
  );

  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await worktreeMenu
    .getByRole("menuitemradio", { name: "feature/sidebar-shell" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  const codexWebLink = environmentMenu.getByRole("menuitem", {
    name: "Connect Codex web",
  });
  if (
    (await codexWebLink.evaluate((element) => element.tagName)) !== "A" ||
    (await codexWebLink.getAttribute("href")) !==
      "https://chatgpt.com/codex/cloud"
  ) {
    throw new Error("Electron Codex web action is not the current external link.");
  }
  await codingWorkspacePage.keyboard.press("Escape");
  await waitForBranchLabel(codingWorkspacePage, "feature/sidebar-shell");
  const branchAfterRunLocationChange = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: codingWorkspaceGitDirectory, encoding: "utf8" },
  );
  if (branchAfterRunLocationChange.stdout.trim() !== "feature/sidebar-shell") {
    throw new Error(
      `Electron branch checkout did not settle after the run-location change: ${branchAfterRunLocationChange.stdout.trim()}.`,
    );
  }
  await codingWorkspacePage
    .getByRole("button", {
      name: "Switch branch",
    })
    .click();
  await worktreeMenu
    .getByRole("menuitemradio", { name: "main" })
    .click();
  await waitForBranchLabel(codingWorkspacePage, "main");
  await codingWorkspacePage.waitForSelector(
    'button[aria-label="Select where to run the chat"]',
  );

  await codingWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await worktreeMenu
    .getByRole("menuitemradio", { name: "feature/sidebar-shell" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { name: "Change project: codex-app-server-client" })
    .click();
  await projectSearch.fill("codex-ui-kit");
  await projectDialog
    .getByRole("option", { name: "Select project codex-ui-kit" })
    .click();
  await codingWorkspacePage
    .getByRole("button", { name: "Change project: codex-ui-kit" })
    .click();
  await projectSearch.fill("app-server");
  await projectDialog
    .getByRole("option", {
      name: "Select project codex-app-server-client",
    })
    .click();
  await waitForBranchLabel(codingWorkspacePage, "feature/sidebar-shell");
  await codingWorkspacePage.waitForTimeout(1_100);
  if (
    !(await codingWorkspacePage
      .getByRole("button", {
        name: "Switch branch",
      })
      .isVisible())
  ) {
    throw new Error(
      "Electron stale branch refresh overwrote the completed checkout.",
    );
  }
  await codingWorkspacePage
    .getByRole("button", {
      name: "Switch branch",
    })
    .click();
  await worktreeMenu
    .getByRole("menuitemradio", { name: "main" })
    .click();
  await waitForBranchLabel(codingWorkspacePage, "main");

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
      (cwd) => cwd !== `cwd\n${codingWorkspaceGitDirectory}`,
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

const currentCheckoutGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-current-checkout-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: currentCheckoutGitDirectory,
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
    "test: initialize current checkout fixture",
  ],
  { cwd: currentCheckoutGitDirectory },
);
await execFileAsync("git", ["switch", "-c", "feat/current-host-checkout"], {
  cwd: currentCheckoutGitDirectory,
});
const currentCheckoutScene = {
  frame: "workspace-environment",
  id: "electron-current-checkout-environment",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: currentCheckoutApp,
  page: currentCheckoutPage,
} = await launchScene(currentCheckoutScene, {
  capture: false,
  environment: {
    CODEX_DEMO_WORKSPACE_PROJECT_ID: "app-server-client",
    CODEX_UI_KIT_WORKSPACE: currentCheckoutGitDirectory,
  },
});
try {
  const currentCheckoutDialog = currentCheckoutPage.getByRole("dialog", {
    name: "Select local environment",
  });
  await currentCheckoutDialog
    .getByRole("heading", { name: "codex-app-server-client" })
    .waitFor();
  if (
    (await currentCheckoutDialog
      .getByRole("button", { name: "Use local environment Coding workspace" })
      .count()) !== 0
  ) {
    throw new Error(
      "Electron local environment dialog leaked another project's linked worktree.",
    );
  }
  const currentCheckoutItem = currentCheckoutDialog.getByRole("button", {
    name: "Use local environment Current checkout",
  });
  await currentCheckoutItem.waitFor();
  if (
    (await currentCheckoutItem.locator("code").textContent())?.trim() !==
    "feat/current-host-checkout"
  ) {
    throw new Error(
      "Electron local environment dialog did not expose the real current branch.",
    );
  }
  await currentCheckoutItem.click();
  await waitForBranchLabel(currentCheckoutPage, "feat/current-host-checkout");
  await currentCheckoutPage.waitForSelector(
    'button[aria-label="Change project: codex-app-server-client"]',
  );
  const selectedCurrentCheckout = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: currentCheckoutGitDirectory, encoding: "utf8" },
  );
  if (selectedCurrentCheckout.stdout.trim() !== "feat/current-host-checkout") {
    throw new Error(
      `Electron current-checkout selection changed the host branch: ${selectedCurrentCheckout.stdout.trim()}.`,
    );
  }
} finally {
  await currentCheckoutApp.close();
  await rm(currentCheckoutGitDirectory, {
    force: true,
    recursive: true,
  });
}

const linkedWorktreeGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-linked-worktree-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: linkedWorktreeGitDirectory,
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
    "test: initialize linked worktree fixture",
  ],
  { cwd: linkedWorktreeGitDirectory },
);
const linkedWorktreeScene = {
  frame: "workspace-environment",
  id: "electron-linked-worktree-routing",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: linkedWorktreeApp,
  page: linkedWorktreePage,
} = await launchScene(linkedWorktreeScene, {
  capture: false,
  environment: {
    CODEX_DEMO_GIT_BRANCH_LIST_DELAY_MS: "750",
    CODEX_UI_KIT_WORKSPACE: linkedWorktreeGitDirectory,
  },
});
try {
  const hostLocalEnvironmentDialog = linkedWorktreePage.getByRole("dialog", {
    name: "Select local environment",
  });
  if (
    (await hostLocalEnvironmentDialog
      .getByRole("button", { name: "Use local environment Coding workspace" })
      .count()) !== 0
  ) {
    throw new Error(
      "Electron host mode exposed a replay-only linked worktree fixture.",
    );
  }
  await linkedWorktreePage.waitForTimeout(1_000);
  const hostCurrentCheckout = hostLocalEnvironmentDialog.getByRole("button", {
    name: "Use local environment Main",
  });
  if (
    (await hostLocalEnvironmentDialog.locator("li").count()) !== 1 ||
    (await hostCurrentCheckout.isDisabled())
  ) {
    throw new Error(
      "Electron host mode did not expose exactly one available current checkout.",
    );
  }
  await hostCurrentCheckout.click();
  await waitForBranchLabel(linkedWorktreePage, "main");
  await linkedWorktreePage
    .getByRole("textbox", { name: "Do anything" })
    .fill("Run the host current-checkout lifecycle.");
  await linkedWorktreePage
    .getByRole("textbox", { name: "Do anything" })
    .press("Enter");
  await linkedWorktreePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  const hostCurrentCheckoutCommandCwds = await linkedWorktreePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    hostCurrentCheckoutCommandCwds.some(
      (cwd) => cwd !== `cwd\n${linkedWorktreeGitDirectory}`,
    )
  ) {
    throw new Error(
      `Electron host current checkout routed to the wrong cwd: ${JSON.stringify(hostCurrentCheckoutCommandCwds)}.`,
    );
  }
} finally {
  await linkedWorktreeApp.close();
  await rm(linkedWorktreeGitDirectory, { force: true, recursive: true });
}

const externalWorkspaceScene = {
  frame: "workspace-ready",
  id: "electron-external-codex-web-action",
  scenario: "workspace-workflow",
  view: "workspace",
};
const externalWorkspaceGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-external-action-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: externalWorkspaceGitDirectory,
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
  { cwd: externalWorkspaceGitDirectory },
);
await execFileAsync(
  "git",
  ["branch", "feat/current-workspace-entry-refresh"],
  { cwd: externalWorkspaceGitDirectory },
);
const {
  app: externalWorkspaceApp,
  page: externalWorkspacePage,
} = await launchScene(externalWorkspaceScene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_WORKSPACE: externalWorkspaceGitDirectory,
  },
});
try {
  await externalWorkspacePage
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  const externalAction = externalWorkspacePage
    .getByRole("menu", { name: "Work in" })
    .getByRole("menuitem", { name: "Connect Codex web" });
  if (
    (await externalAction.evaluate((element) => element.tagName)) !== "A" ||
    (await externalAction.getAttribute("href")) !==
      "https://chatgpt.com/codex/cloud"
  ) {
    throw new Error("Electron Codex web action lost its external-link contract.");
  }
  await externalWorkspacePage.keyboard.press("Escape");
  await externalWorkspacePage
    .getByRole("button", { name: "Switch branch" })
    .click();
  await externalWorkspacePage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", {
      name: "feat/current-workspace-entry-refresh",
    })
    .click();
  await waitForBranchLabel(
    externalWorkspacePage,
    "feat/current-workspace-entry-refresh",
  );
  await externalWorkspacePage.waitForSelector(
    'button[aria-label="Select where to run the chat"]',
  );
  await externalWorkspacePage
    .getByRole("textbox", { name: "Do anything" })
    .fill("Run the local worktree lifecycle.");
  await externalWorkspacePage
    .getByRole("textbox", { name: "Do anything" })
    .press("Enter");
  await externalWorkspacePage.waitForSelector(
    '.demo-root[data-view="conversation"][data-scenario="workspace-workflow"][data-frame="approval-pending"]',
  );
  const externalWorkspaceCommandCwds = await externalWorkspacePage
    .locator(
      '[data-testid="command-execution"] .codex-ui-command-execution__shell',
    )
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("title")),
    );
  if (
    externalWorkspaceCommandCwds.some(
      (cwd) => cwd !== `cwd\n${externalWorkspaceGitDirectory}`,
    )
  ) {
    throw new Error(
      `Electron external action changed the trusted local project route: ${JSON.stringify(externalWorkspaceCommandCwds)}.`,
    );
  }
} finally {
  await externalWorkspaceApp.close();
  await rm(externalWorkspaceGitDirectory, {
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

const current26820FileApprovalBaseScene = {
  currentSidebar: true,
  scenario: "approval-current-26-820-file",
  sidebarState: "hidden",
  windowSize: { height: 680, width: 720 },
};

const {
  app: current26820FileApprovalOptionsApp,
  page: current26820FileApprovalOptionsPage,
} = await launchScene(
  {
    ...current26820FileApprovalBaseScene,
    frame: "approval-current-26-820-file-deny-pending",
    id: "electron-current-26-820-file-approval-options",
  },
  { capture: false },
);
try {
  const approval = current26820FileApprovalOptionsPage.getByTestId(
    "current-approval-request",
  );
  await approval
    .getByRole("button", { name: "Approval options" })
    .click();
  const menu = current26820FileApprovalOptionsPage.locator(
    ".codex-ui-approval-request__options-menu",
  );
  await menu.waitFor();
  const options = await menu
    .locator('[role="menuitem"]')
    .allTextContents();
  const menuRect = await menu.evaluate((element) => {
    const value = element.getBoundingClientRect();
    return {
      height: value.height,
      left: value.left,
      top: value.top,
      width: value.width,
    };
  });
  if (
    JSON.stringify(options.map((value) => value.trim())) !==
      JSON.stringify(["Allow once", "Allow this conversation"]) ||
    Math.abs(menuRect.left - 519) > 1 ||
    Math.abs(menuRect.top - 551) > 1 ||
    Math.abs(menuRect.width - 168) > 1 ||
    Math.abs(menuRect.height - 67.125) > 1
  ) {
    throw new Error(
      `Electron current 26.820 file approval options drifted: ${JSON.stringify({ menuRect, options })}`,
    );
  }
  await current26820FileApprovalOptionsPage.keyboard.press("Escape");
  await current26820FileApprovalOptionsPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
        "Approval options" &&
      document.querySelectorAll(
        ".codex-ui-approval-request__options-menu",
      ).length === 0,
  );
} finally {
  await current26820FileApprovalOptionsApp.close();
}

for (const decision of ["Deny", "Allow once"]) {
  const denied = decision === "Deny";
  const { app, page } = await launchScene(
    {
      ...current26820FileApprovalBaseScene,
      frame: denied
        ? "approval-current-26-820-file-deny-pending"
        : "approval-current-26-820-file-allow-pending",
      id: `electron-current-26-820-file-${denied ? "denied" : "allowed"}`,
    },
    { capture: false },
  );
  try {
    await page
      .getByTestId("current-approval-request")
      .getByRole("button", { exact: true, name: decision })
      .click();
    const expectedFrame = denied
      ? "approval-current-26-820-file-denied"
      : "approval-current-26-820-file-allowed";
    const expectedReply = denied
      ? "Jamin，写入权限被拒绝，文件未创建。"
      : "Jamin，文件已创建。";
    await page.waitForSelector(
      `.demo-root[data-frame="${expectedFrame}"]`,
    );
    await page.getByText(expectedReply, { exact: true }).waitFor();
    const settled = await page.evaluate(() => ({
      approvalCount: document.querySelectorAll(
        '[data-testid="current-approval-request"]',
      ).length,
      composerLabel:
        document
          .querySelector(".codex-ui-composer textarea")
          ?.getAttribute("aria-label") ?? null,
      permissionIcon:
        document
          .querySelector(
            ".demo-composer-permission-trigger [data-current-build-icon]",
          )
          ?.getAttribute("data-current-build-icon") ?? null,
      permissionLabel:
        document
          .querySelector(".demo-composer-permission-trigger")
          ?.textContent?.trim() ?? null,
      status:
        document.querySelector(".demo-root")?.getAttribute("data-status") ??
        null,
    }));
    if (
      settled.approvalCount !== 0 ||
      settled.composerLabel !== "Message composer" ||
      settled.permissionIcon !== "composer-permission-ask" ||
      settled.permissionLabel !== "Ask for approval" ||
      settled.status !== "completed"
    ) {
      throw new Error(
        `Electron current 26.820 file approval did not settle ${decision}: ${JSON.stringify(settled)}`,
      );
    }
  } finally {
    await app.close();
  }
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
      "未获批准，命令未执行。",
      { exact: true },
    )
    .count();
  await currentDeniedApprovalPage
    .getByRole("button", { exact: true, name: "Worked for 1m 53s" })
    .click();
  const declinedCommandCount = await currentDeniedApprovalPage
    .getByText(
      "Did not run touch /outside/project/approval-sentinel",
      { exact: true },
    )
    .count();
  const permissionLabel = (await currentDeniedApprovalPage
    .locator(".demo-composer-permission-trigger")
    .textContent())
    ?.replace(/^◉/, "")
    .trim();
  const permissionIconName = await currentDeniedApprovalPage
    .locator(
      ".demo-composer-permission-trigger [data-current-build-icon]",
    )
    .getAttribute("data-current-build-icon");
  if (
    currentApprovalCount !== 0 ||
    assistantFinalCount !== 1 ||
    declinedCommandCount !== 1 ||
    permissionLabel !== "Ask for approval" ||
    permissionIconName !== "composer-permission-ask"
  ) {
    throw new Error(
      `Electron current approval rejection did not remove the card and complete without execution: ${JSON.stringify({
        assistantFinalCount,
        currentApprovalCount,
        declinedCommandCount,
        permissionIconName,
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
    frame: "markdown-complete",
    id: "electron-live-file-approval-for-session",
    scenario: "markdown",
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
    name: "Worked for 10s",
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
          "CURRENT COMMAND RECOVERY ACCEPTED",
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
    failureState.lineCount !== 3 ||
    failureState.outputStart !== "CURRENT FAIL" ||
    !failureState.outputEnd.endsWith("FAILURE STDERR\n") ||
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
    copiedOutput !== "CURRENT FAILURE STDOUT\nCURRENT FAILURE STDERR\n"
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
    stopAllCount: document.querySelectorAll(
      '[aria-label="Stop all background terminals"]',
    ).length,
    stopProcessCount: document.querySelectorAll(
      '[aria-label="Stop Background terminal"]',
    ).length,
  }));
  if (
    !stopping.commandSummary?.startsWith(
      "Background terminal stopped with for i in $(seq 1 120)",
    ) ||
    stopping.interruption !== "You stopped after 58s" ||
    stopping.stopAllCount !== 1 ||
    stopping.stopProcessCount !== 1
  ) {
    throw new Error(
      `Electron current command Stop transition failed: ${JSON.stringify(stopping)}`,
    );
  }

  const prematureRecoveryPrompt =
    "Do not use tools. Reply exactly: CURRENT INTERRUPTION RECOVERY ACCEPTED";
  const prematureComposer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  await prematureComposer.fill(prematureRecoveryPrompt);
  await prematureComposer.press("Enter");
  await commandInterruptionPage.waitForTimeout(1_100);
  await commandInterruptionPage
    .getByRole("button", { name: "Stop all background terminals" })
    .waitFor({ state: "visible" });
  if (
    (await commandInterruptionPage
      .locator('.demo-root[data-frame="command-interruption-stopping"]')
      .count()) !== 1
  ) {
    throw new Error(
      "Electron current command interruption accepted premature recovery.",
    );
  }
  await commandInterruptionPage
    .getByRole("button", { name: "Stop all background terminals" })
    .click();
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-settled"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const composer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill(
    "Do not use tools. Reply exactly: CURRENT INTERRUPTION RECOVERY ACCEPTED",
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
    recovered.assistantText !== "CURRENT INTERRUPTION RECOVERY ACCEPTED" ||
    recovered.commandStatus !== "interrupted" ||
    recovered.interruption !== "You stopped after 58s" ||
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

const currentCommandResponsiveCases = [
  {
    frame: "command-failure-recovered",
    id: "current-command-failure-expanded",
    kind: "failure",
    scenario: "command-failure-recovery",
    windowSize: { height: 820, width: 1_180 },
  },
  {
    frame: "command-failure-recovered",
    id: "electron-current-command-failure-compact",
    kind: "failure",
    scenario: "command-failure-recovery",
    windowSize: { height: 680, width: 720 },
  },
  {
    frame: "command-interruption-recovered",
    id: "current-command-interruption-recovered",
    kind: "interruption",
    scenario: "interruption",
    windowSize: { height: 820, width: 1_180 },
  },
  {
    frame: "command-interruption-recovered",
    id: "electron-current-command-interruption-compact",
    kind: "interruption",
    scenario: "interruption",
    windowSize: { height: 680, width: 720 },
  },
];

for (const responsiveCase of currentCommandResponsiveCases) {
  const { app: responsiveApp, page: responsivePage } = await launchScene(
    {
      ...responsiveCase,
      currentSidebar: true,
      sidebarState: "hidden",
      theme: "dark",
    },
    { capture: true },
  );
  try {
    if (responsiveCase.kind === "failure") {
      const failure = responsivePage.locator(
        '[data-item-id="command-failure-output"]',
      );
      const output = failure.locator(".codex-ui-command-output");
      if (!(await output.isVisible())) {
        const timeline = responsivePage.getByRole("button", {
          exact: true,
          name: "Worked for 10s",
        });
        if ((await timeline.getAttribute("aria-expanded")) !== "true") {
          await timeline.click();
        }
        await failure.locator("summary").first().click();
        await output.waitFor({ state: "visible" });
      }
    }
    const nativeBounds = await responsiveApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]?.getContentBounds(),
    );
    const responsive = await responsivePage.evaluate((kind) => {
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value
          ? {
              height: value.height,
              left: value.left,
              top: value.top,
              width: value.width,
            }
          : null;
      };
      const command = document.querySelector(
        kind === "failure"
          ? '[data-item-id="command-failure-output"]'
          : '[data-item-id="command-interruption"]',
      );
      const assistant = document.querySelector(
        kind === "failure"
          ? '[data-item-id="assistant-command-failure-recovered"] .codex-ui-markdown'
          : '[data-item-id="assistant-command-interruption-recovery"] .codex-ui-markdown',
      );
      const output = command?.querySelector(
        ".codex-ui-command-output pre code",
      );
      return {
        actionLabels: [...document.querySelectorAll("button")]
          .filter((button) => button.checkVisibility())
          .map(
            (button) =>
              button.getAttribute("aria-label") ??
              button.textContent?.replace(/\s+/g, " ").trim(),
          )
          .filter(Boolean),
        assistant: assistant?.textContent?.trim() ?? null,
        command: rect(command),
        commandStatus: command?.getAttribute("data-execution-status"),
        composer: rect(document.querySelector(".codex-ui-composer")),
        footer:
          command
            ?.querySelector(".codex-ui-command-execution__footer")
            ?.textContent?.trim() ?? null,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        interruption:
          document
            .querySelector(
              ".codex-ui-thread-interruption-summary__label",
            )
            ?.textContent?.trim() ?? null,
        output: output?.textContent ?? null,
        sidebarResizerCount: document.querySelectorAll(
          '.codex-ui-app-shell__sidebar-resizer[role="separator"]',
        ).length,
        sidebarWidth:
          document
            .querySelector(".codex-ui-app-shell__sidebar")
            ?.getBoundingClientRect().width ?? null,
      };
    }, responsiveCase.kind);
    const wide = responsiveCase.windowSize.width === 1_180;
    const expectedComposer = wide
      ? { height: 98, left: 222, top: 706, width: 736 }
      : { height: 98, left: 16, top: 566, width: 688 };
    const expectedAssistant =
      responsiveCase.kind === "failure"
        ? "CURRENT COMMAND FAILURE OBSERVED"
        : "CURRENT INTERRUPTION RECOVERY ACCEPTED";
    if (
      nativeBounds?.width !== responsiveCase.windowSize.width ||
      nativeBounds?.height !== responsiveCase.windowSize.height ||
      responsive.horizontalOverflow !== 0 ||
      responsive.sidebarWidth !== 0 ||
      responsive.sidebarResizerCount !== 0 ||
      responsive.assistant !== expectedAssistant ||
      Math.abs(
        (responsive.command?.width ?? 0) - expectedComposer.width,
      ) > 1 ||
      Math.abs((responsive.command?.left ?? 0) - expectedComposer.left) > 1 ||
      Math.abs((responsive.composer?.height ?? 0) - expectedComposer.height) >
        1 ||
      Math.abs((responsive.composer?.left ?? 0) - expectedComposer.left) > 1 ||
      Math.abs((responsive.composer?.top ?? 0) - expectedComposer.top) > 1 ||
      Math.abs((responsive.composer?.width ?? 0) - expectedComposer.width) > 1 ||
      !["Copy response", "Good response", "Bad response", "Share response"].every(
        (label) => responsive.actionLabels.includes(label),
      ) ||
      (responsiveCase.kind === "failure"
        ? responsive.commandStatus !== "failed" ||
          responsive.footer !== "Exit code 7" ||
          responsive.output !==
            "CURRENT FAILURE STDOUT\nCURRENT FAILURE STDERR\n"
        : responsive.commandStatus !== "interrupted" ||
          responsive.interruption !== "You stopped after 58s" ||
          responsive.output !== null)
    ) {
      throw new Error(
        `${responsiveCase.id}: Electron current command responsive contract failed: ${JSON.stringify({ nativeBounds, responsive })}`,
      );
    }
  } finally {
    await responsiveApp.close();
  }
}

const currentCommand26820ElectronCases = [
  {
    assistantTexts: ["CURRENT 26.820 LONG COMMAND OBSERVED"],
    commandStatus: "completed",
    frame: "command-current-26-820-success-completed",
    interruption: null,
    scenario: "command-current-26-820-success",
    timelineLabel: "Worked for 22s",
    title: "Observe long-running shell command",
  },
  {
    assistantTexts: [
      "CURRENT 26.820 COMMAND FAILURE OBSERVED",
      "CURRENT 26.820 COMMAND RECOVERY ACCEPTED",
    ],
    commandStatus: "failed",
    frame: "command-current-26-820-failure-recovered",
    interruption: null,
    scenario: "command-current-26-820-failure",
    timelineLabel: "Worked for 12s",
    title: "Observe command failure",
  },
  {
    assistantTexts: [],
    commandStatus: "interrupted",
    frame: "command-current-26-820-interruption-stopped-immediate",
    interruption: "You stopped after 0s",
    scenario: "command-current-26-820-interruption",
    timelineLabel: null,
    title: "监控 CURRENT 26.820 中断",
  },
  {
    assistantTexts: ["CURRENT 26.820 INTERRUPTION RECOVERY ACCEPTED"],
    commandStatus: "interrupted",
    frame: "command-current-26-820-interruption-recovered",
    interruption: "You stopped after 16s",
    scenario: "command-current-26-820-interruption",
    timelineLabel: null,
    title: "监控 CURRENT 26.820 中断",
  },
];

for (const currentCase of currentCommand26820ElectronCases) {
  const { app: currentCommandApp, page: currentCommandPage } =
    await launchScene(
      {
        currentSidebar: true,
        frame: currentCase.frame,
        id: `electron-${currentCase.frame}`,
        scenario: currentCase.scenario,
        sidebarState: "hidden",
      },
      { capture: false },
    );
  try {
    if (currentCase.timelineLabel) {
      const timeline = currentCommandPage.getByRole("button", {
        exact: true,
        name: currentCase.timelineLabel,
      });
      if ((await timeline.getAttribute("aria-expanded")) !== "true") {
        await timeline.click();
      }
    }
    const readCurrentCommand = () =>
      currentCommandPage.evaluate(() => {
        const rect = (element) => {
          const value = element?.getBoundingClientRect();
          return value
            ? {
                height: value.height,
                left: value.left,
                width: value.width,
              }
            : null;
        };
        const command = document.querySelector(
          '[data-item-id^="command-current-26-820-"]',
        );
        const commandHeader = command?.querySelector(
          ":scope > .codex-ui-activity__header",
        );
        return {
          assistantTexts: Array.from(
            document.querySelectorAll(
              '[data-item-id^="assistant-command-current-26-820-"] .codex-ui-markdown',
            ),
            (element) => element.textContent?.trim(),
          ),
          command: rect(commandHeader),
          commandStatus: command?.getAttribute("data-execution-status"),
          composer: rect(document.querySelector(".codex-ui-composer")),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          interruption:
            document
              .querySelector(".codex-ui-thread-interruption-summary__label")
              ?.textContent?.trim() ?? null,
          rowDisclosureCount:
            command?.querySelectorAll(
              "button, details, summary, [role=button]",
            ).length ?? 0,
          shellCount:
            command?.querySelectorAll(
              ".codex-ui-command-execution__shell, .codex-ui-command-output, pre",
            ).length ?? 0,
          stopCount: document.querySelectorAll(
            'button[aria-label="Stop"]',
          ).length,
          title: document
            .querySelector(".codex-ui-thread-header__title")
            ?.textContent?.trim(),
        };
      });
    const wide = await readCurrentCommand();
    await currentCommandApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
    });
    await currentCommandPage.waitForFunction(
      () => window.innerWidth === 720 && window.innerHeight === 680,
      undefined,
      { timeout: 5_000 },
    );
    const compact = await readCurrentCommand();
    if (
      wide.title !== currentCase.title ||
      compact.title !== currentCase.title ||
      wide.commandStatus !== currentCase.commandStatus ||
      compact.commandStatus !== currentCase.commandStatus ||
      JSON.stringify(wide.assistantTexts) !==
        JSON.stringify(currentCase.assistantTexts) ||
      JSON.stringify(compact.assistantTexts) !==
        JSON.stringify(currentCase.assistantTexts) ||
      wide.interruption !== currentCase.interruption ||
      compact.interruption !== currentCase.interruption ||
      wide.horizontalOverflow !== 0 ||
      compact.horizontalOverflow !== 0 ||
      wide.rowDisclosureCount !== 0 ||
      compact.rowDisclosureCount !== 0 ||
      wide.shellCount !== 0 ||
      compact.shellCount !== 0 ||
      wide.stopCount !== 0 ||
      compact.stopCount !== 0 ||
      Math.abs((wide.command?.left ?? 0) - 222) > 1 ||
      Math.abs((wide.command?.width ?? 0) - 736) > 1 ||
      Math.abs((compact.command?.left ?? 0) - 16) > 1 ||
      Math.abs((compact.command?.width ?? 0) - 688) > 1 ||
      Math.abs((wide.composer?.left ?? 0) - 222) > 1 ||
      Math.abs((wide.composer?.width ?? 0) - 736) > 1 ||
      Math.abs((compact.composer?.left ?? 0) - 16) > 1 ||
      Math.abs((compact.composer?.width ?? 0) - 688) > 1
    ) {
      throw new Error(
        `${currentCase.frame}: Electron current 26.820 command contract drifted: ${JSON.stringify({ compact, wide })}`,
      );
    }
  } finally {
    await currentCommandApp.close();
  }
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
        .querySelector(
          ".codex-ui-thread-context-optimization .codex-ui-loading-shimmer",
        )
        ?.firstChild?.textContent?.replace(/\s+/g, " ")
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

const currentThinkingScene = {
  frame: "conversation-thinking-current-26-825",
  id: "electron-conversation-thinking-current-26-825",
  scenario: "conversation-lifecycle",
  sidebarState: "hidden",
};
const {
  app: currentThinkingApp,
  page: currentThinkingPage,
} = await launchScene(currentThinkingScene, { capture: false });
try {
  await currentThinkingPage.waitForSelector(
    '.demo-root[data-frame="conversation-thinking-current-26-825"] .codex-ui-thread-thinking',
  );
  const nativeWindow = await currentThinkingApp.evaluate(
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
  const currentThinking = await currentThinkingPage.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const thinking = document.querySelector(".codex-ui-thread-thinking");
    if (!(thinking instanceof HTMLElement)) return null;
    const shimmer = thinking.querySelector(".codex-ui-loading-shimmer");
    const highlight = thinking.querySelector(
      ".codex-ui-loading-shimmer__highlight",
    );
    const bounds = thinking.getBoundingClientRect();
    const style = getComputedStyle(thinking);
    const shimmerBounds = shimmer?.getBoundingClientRect();
    const shimmerStyle = shimmer ? getComputedStyle(shimmer) : null;
    const highlightStyle = highlight ? getComputedStyle(highlight) : null;
    return {
      animationName: style.animationName,
      ariaLive: thinking.getAttribute("aria-live"),
      backgroundImage: style.backgroundImage,
      color: style.color,
      composerCount: document.querySelectorAll(
        'textarea[aria-label="Message composer"]',
      ).length,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      height: bounds.height,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      label: thinking
        .querySelector(".codex-ui-loading-shimmer")
        ?.firstChild?.textContent?.trim(),
      lineHeight: style.lineHeight,
      role: thinking.getAttribute("role"),
      shimmerCount: thinking.querySelectorAll(".codex-ui-loading-shimmer")
        .length,
      shimmerColor: shimmerStyle?.color,
      shimmerDuplicateCount: thinking.querySelectorAll(
        '.codex-ui-loading-shimmer__sweep[aria-hidden="true"] .codex-ui-loading-shimmer__highlight',
      ).length,
      shimmerHeight: shimmerBounds?.height,
      shimmerHighlightColor: highlightStyle?.color,
      shimmerWidth: shimmerBounds?.width,
      status: root?.getAttribute("data-status"),
      stopButton: Boolean(
        document.querySelector('button[aria-label="Stop"]'),
      ),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
  const currentThinkingColor = currentThinking?.color ?? "";
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820]) ||
    !currentThinking ||
    currentThinking.animationName !== "none" ||
    currentThinking.ariaLive !== "polite" ||
    currentThinking.backgroundImage !== "none" ||
    !currentThinkingColor.includes("0.75") ||
    currentThinking.composerCount !== 1 ||
    currentThinking.fontSize !== "14px" ||
    currentThinking.fontWeight !== "400" ||
    Math.abs(currentThinking.height - 21) > 0.1 ||
    currentThinking.horizontalOverflow > 1 ||
    currentThinking.label !== "Thinking" ||
    currentThinking.lineHeight !== "21px" ||
    currentThinking.role !== "status" ||
    currentThinking.shimmerCount !== 1 ||
    !currentThinking.shimmerColor?.includes("0.385") ||
    currentThinking.shimmerDuplicateCount !== 1 ||
    Math.abs((currentThinking.shimmerHeight ?? 0) - 21) > 0.1 ||
    !currentThinking.shimmerHighlightColor?.includes("0.75") ||
    Math.abs((currentThinking.shimmerWidth ?? 0) - 55.296875) > 0.1 ||
    currentThinking.status !== "running" ||
    !currentThinking.stopButton ||
    JSON.stringify(currentThinking.viewport) !==
      JSON.stringify({ height: 820, width: 1180 })
  ) {
    throw new Error(
      `Electron current 26.825 Thinking contract failed: ${JSON.stringify({ currentThinking, nativeWindow })}`,
    );
  }
} finally {
  await currentThinkingApp.close();
}

const currentPlanScene = {
  frame: "conversation-plan-current-26-825",
  id: "electron-conversation-plan-current-26-825",
  scenario: "current-plan-26-825",
  sidebarState: "hidden",
};
const { app: currentPlanApp, page: currentPlanPage } =
  await launchScene(currentPlanScene, { capture: false });
try {
  const trigger = currentPlanPage.getByRole("button", {
    exact: true,
    name: "Step 1 / 8. Show plan",
  });
  await trigger.waitFor({ state: "visible" });
  const nativeWindow = await currentPlanApp.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return window
      ? {
          destroyed: window.isDestroyed(),
          size: window.getContentSize(),
          visible: window.isVisible(),
        }
      : null;
  });
  const active = await currentPlanPage.evaluate(() => {
    const rect = (element) => {
      const bounds = element?.getBoundingClientRect();
      return bounds
        ? {
            height: bounds.height,
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
          }
        : null;
    };
    const summary = document.querySelector(
      ".codex-ui-composer-plan-progress__summary",
    );
    const summaryStyle = summary ? getComputedStyle(summary) : null;
    return {
      aboveComposer: rect(
        document.querySelector(
          ".codex-ui-conversation-thread-shell__above-composer",
        ),
      ),
      composer: rect(document.querySelector(".codex-ui-composer")),
      duration: document
        .querySelector('[data-testid="current-plan-duration"]')
        ?.textContent?.trim(),
      label: summary?.textContent?.trim(),
      ring: rect(
        document.querySelector(
          ".codex-ui-composer-plan-progress__summary-ring",
        ),
      ),
      status: document
        .querySelector(".demo-root")
        ?.getAttribute("data-status"),
      stopButton: Boolean(
        document.querySelector('button[aria-label="Stop"]'),
      ),
      summaryStyle: summaryStyle
        ? {
            color: summaryStyle.color,
            fontSize: summaryStyle.fontSize,
            lineHeight: summaryStyle.lineHeight,
          }
        : null,
      trigger: rect(
        document.querySelector(
          ".codex-ui-composer-plan-progress__trigger",
        ),
      ),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
  if (
    !nativeWindow ||
    nativeWindow.destroyed ||
    JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820]) ||
    !active.aboveComposer ||
    Math.abs(active.aboveComposer.height - 32) > 0.1 ||
    Math.abs(active.aboveComposer.width - 736) > 0.1 ||
    !active.composer ||
    Math.abs(active.composer.top - 706) > 0.1 ||
    active.duration !== "Working for 7s" ||
    active.label !== "Step 1 / 8" ||
    !active.ring ||
    Math.abs(active.ring.height - 12) > 0.1 ||
    Math.abs(active.ring.width - 12) > 0.1 ||
    active.status !== "running" ||
    !active.stopButton ||
    !active.summaryStyle?.color.includes("0.65") ||
    active.summaryStyle.fontSize !== "14px" ||
    active.summaryStyle.lineHeight !== "21px" ||
    !active.trigger ||
    Math.abs(active.trigger.height - 38) > 0.1 ||
    Math.abs(active.trigger.top - 660) > 0.1 ||
    Math.abs(active.trigger.width - 106.671875) > 0.1 ||
    JSON.stringify(active.viewport) !==
      JSON.stringify({ height: 820, width: 1180 })
  ) {
    throw new Error(
      `Electron current 26.825 Plan active contract failed: ${JSON.stringify({ active, nativeWindow })}`,
    );
  }
  await trigger.hover();
  const tooltip = currentPlanPage.getByRole("tooltip");
  await tooltip.waitFor({ state: "visible" });
  const expanded = await tooltip.evaluate((element) => {
    const rect = (target) => {
      const bounds = target?.getBoundingClientRect();
      return bounds
        ? {
            bottom: bounds.bottom,
            height: bounds.height,
            top: bounds.top,
            width: bounds.width,
          }
        : null;
    };
    const steps = Array.from(
      element.querySelectorAll(
        ".codex-ui-composer-plan-progress__step",
      ),
    );
    return {
      labels: steps.map((step) =>
        step
          .querySelector(
            ".codex-ui-composer-plan-progress__step-text",
          )
          ?.textContent?.trim(),
      ),
      statusRings: steps.map((step) =>
        rect(
          step.querySelector(
            ".codex-ui-composer-plan-progress__step-status",
          ),
        ),
      ),
      stepRects: steps.map(rect),
      tooltip: rect(element),
    };
  });
  if (
    expanded.labels.length !== 8 ||
    expanded.labels[0] !== "确认目标" ||
    expanded.labels.at(-1) !== "报告完成" ||
    expanded.statusRings.some(
      (rect) =>
        !rect ||
        Math.abs(rect.height - 16) > 0.1 ||
        Math.abs(rect.width - 16) > 0.1,
    ) ||
    expanded.stepRects.some(
      (rect, index) =>
        !rect ||
        Math.abs(rect.height - 16) > 0.1 ||
        (index > 0 &&
          Math.abs(rect.top - expanded.stepRects[index - 1].top - 24) > 0.1),
    ) ||
    !expanded.tooltip ||
    Math.abs(expanded.tooltip.bottom - 656) > 0.1 ||
    Math.abs(expanded.tooltip.height - 200) > 0.1 ||
    Math.abs(expanded.tooltip.width - 95.578125) > 0.1
  ) {
    throw new Error(
      `Electron current 26.825 Plan tooltip contract failed: ${JSON.stringify(expanded)}`,
    );
  }
} finally {
  await currentPlanApp.close();
}

for (const [frame, expected] of [
  [
    "conversation-plan-current-26-825-progress",
    { duration: "Working for 7s", label: "Step 5 / 8" },
  ],
  [
    "conversation-plan-current-26-825-all-complete",
    { duration: "Working for 7s", label: null },
  ],
  [
    "conversation-plan-current-26-825-completed",
    { duration: "Worked for 32s", label: null },
  ],
]) {
  const { app, page } = await launchScene(
    {
      frame,
      id: `electron-${frame}`,
      scenario: "current-plan-26-825",
      sidebarState: "hidden",
    },
    { capture: false },
  );
  try {
    const lifecycle = await page.evaluate(() => ({
      duration: document
        .querySelector('[data-testid="current-plan-duration"]')
        ?.textContent?.trim(),
      label:
        document
          .querySelector(
            ".codex-ui-composer-plan-progress__summary-text",
          )
          ?.textContent?.trim() ?? null,
      present: Boolean(
        document.querySelector(".codex-ui-composer-plan-progress"),
      ),
      status: document
        .querySelector(".demo-root")
        ?.getAttribute("data-status"),
    }));
    if (
      lifecycle.duration !== expected.duration ||
      lifecycle.label !== expected.label ||
      lifecycle.present !== (expected.label !== null) ||
      lifecycle.status !==
        (frame.endsWith("completed") ? "completed" : "running")
    ) {
      throw new Error(
        `Electron current 26.825 Plan ${frame} lifecycle failed: ${JSON.stringify(lifecycle)}`,
      );
    }
  } finally {
    await app.close();
  }
}

for (const browserSurface of [false, true]) {
  const frame = browserSurface
    ? "conversation-browser-current-26-825-open"
    : "conversation-search-current-26-825-open";
  const { app, page } = await launchScene(
    {
      currentSidebar: true,
      frame,
      id: `electron-${frame}`,
      scenario: browserSurface
        ? "current-browser-26-825"
        : "current-search-26-825",
      windowSize: { height: 820, width: 1180 },
    },
    { capture: false },
  );
  try {
    const nativeWindow = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window
        ? {
            destroyed: window.isDestroyed(),
            size: window.getContentSize(),
          }
        : null;
    });
    const contract = await page.evaluate((withBrowser) => {
      const rect = (element) => {
        const bounds = element?.getBoundingClientRect();
        return bounds
          ? {
              height: bounds.height,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
            }
          : null;
      };
      const activity = document.querySelector(
        withBrowser
          ? ".demo-current-browser-26-825-timeline .codex-ui-browser-activity"
          : ".demo-current-search-26-825-timeline .codex-ui-search-activity",
      );
      const browser = document.querySelector(
        '[data-testid="current-browser-workspace"]',
      );
      return {
        activityOpen:
          activity
            ?.querySelector(".codex-ui-activity__disclosure")
            ?.hasAttribute("open") ?? false,
        activitySummary:
          activity
            ?.querySelector(".codex-ui-activity__summary")
            ?.textContent?.trim() ?? null,
        browser: browser
          ? {
              content: rect(
                browser.querySelector(
                  ".codex-ui-browser-workspace__content",
                ),
              ),
              rect: rect(browser),
              tabs: rect(
                browser.querySelector(
                  ".codex-ui-browser-workspace__tabs",
                ),
              ),
              toolbar: rect(
                browser.querySelector(
                  ".codex-ui-browser-workspace__toolbar",
                ),
              ),
              toolbarLabels: Array.from(
                browser.querySelectorAll(
                  ".codex-ui-browser-workspace__toolbar button",
                ),
                (button) => button.getAttribute("aria-label"),
              ),
            }
          : null,
        composerCount: document.querySelectorAll(
          ".codex-ui-conversation-thread-shell__composer .codex-ui-composer",
        ).length,
        details: Array.from(
          activity?.querySelectorAll(
            withBrowser
              ? ".codex-ui-browser-activity__steps li"
              : ".codex-ui-search-activity__entries li",
          ) ?? [],
          (entry) => entry.textContent?.trim(),
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        timelineExpanded:
          activity?.closest(".codex-ui-activity-timeline")?.hasAttribute(
            "data-expanded",
          ) ?? false,
      };
    }, browserSurface);
    const expectedDetails = browserSurface
      ? [
          "Read Control In App Browser skill",
          "连接 Browser",
          "打开页面并查找 desktop",
        ]
      : [
          "Searched the web for Codex app desktop | openai.com",
          "Searched the web for 'desktop'",
        ];
    const expectedToolbarLabels = [
      "Back",
      "Next",
      "Reload",
      "Site information",
      "Site tools",
      "Open in external browser",
      "Annotate",
      "Browser options",
    ];
    if (
      !nativeWindow ||
      nativeWindow.destroyed ||
      JSON.stringify(nativeWindow.size) !== JSON.stringify([1180, 820]) ||
      !contract.activityOpen ||
      !contract.timelineExpanded ||
      contract.composerCount !== 1 ||
      contract.horizontalOverflow > 1 ||
      JSON.stringify(contract.details) !== JSON.stringify(expectedDetails) ||
      contract.activitySummary !==
        (browserSurface
          ? "Used the browser, loaded a tool"
          : "Searched the web") ||
      (browserSurface &&
        (!contract.browser ||
          Math.abs(contract.browser.rect.width - 418.59375) > 0.1 ||
          Math.abs(contract.browser.tabs.height - 46) > 0.1 ||
          Math.abs(contract.browser.toolbar.height - 40) > 0.1 ||
          Math.abs(contract.browser.content.top - 86) > 0.1 ||
          JSON.stringify(contract.browser.toolbarLabels) !==
            JSON.stringify(expectedToolbarLabels))) ||
      (!browserSurface && contract.browser !== null)
    ) {
      throw new Error(
        `Electron current 26.825 search/Browser contract failed: ${JSON.stringify({ browserSurface, contract, nativeWindow })}`,
      );
    }
    const disclosureSelector = browserSurface
        ? ".demo-current-browser-26-825-timeline .codex-ui-browser-activity summary"
        : ".demo-current-search-26-825-timeline .codex-ui-search-activity summary";
    const disclosure = page.locator(disclosureSelector);
    await disclosure.click();
    await page.waitForFunction(
      ({ expected, selector }) =>
        document.querySelector(selector)?.getAttribute("aria-expanded") ===
        expected,
      { expected: "false", selector: disclosureSelector },
    );
    if ((await disclosure.getAttribute("aria-expanded")) !== "false") {
      throw new Error(
        `Electron current 26.825 ${browserSurface ? "Browser" : "Search"} disclosure did not collapse.`,
      );
    }
    await disclosure.click();
    await page.waitForFunction(
      ({ expected, selector }) =>
        document.querySelector(selector)?.getAttribute("aria-expanded") ===
        expected,
      { expected: "true", selector: disclosureSelector },
    );
    if ((await disclosure.getAttribute("aria-expanded")) !== "true") {
      throw new Error(
        `Electron current 26.825 ${browserSurface ? "Browser" : "Search"} disclosure did not reopen.`,
      );
    }
  } finally {
    await app.close();
  }
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

const current26820LongThreadScene = {
  currentSidebar: true,
  frame: "thread-current-26-820-middle",
  id: "electron-current-26-820-long-thread",
  scenario: "conversation-lifecycle",
  sidebarState: "hidden",
};
const {
  app: current26820LongThreadApp,
  page: current26820LongThreadPage,
} = await launchScene(current26820LongThreadScene, { capture: false });
try {
  await current26820LongThreadPage.waitForSelector(
    '.demo-root[data-windowed-timeline="current-26-820"][data-thread-following="false"] [data-selected-message-index="15"][data-mounted-turn-count="11"]',
  );
  const current26820Geometry =
    await current26820LongThreadPage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      const activeNavigation = document.querySelector(
        '.codex-ui-message-navigation-rail__button[aria-current="true"]',
      );
      return {
        activeNavigation:
          activeNavigation?.getAttribute("aria-label") ?? null,
        composer: rect(".codex-ui-composer"),
        mountedTurns: document.querySelectorAll("[data-windowed-turn]")
          .length,
        navigation: rect(".codex-ui-message-navigation-rail"),
        navigationButtons: document.querySelectorAll(
          ".codex-ui-message-navigation-rail__button",
        ).length,
        placeholders: document.querySelectorAll(
          ".codex-ui-thread-virtualized-placeholder",
        ).length,
        viewport:
          viewport instanceof HTMLElement
            ? {
                flexDirection: getComputedStyle(viewport).flexDirection,
                rect: rect(
                  ".codex-ui-conversation-thread-shell__viewport",
                ),
                scrollHeight: viewport.scrollHeight,
                scrollTop: viewport.scrollTop,
              }
            : null,
      };
    });
  if (
    current26820Geometry.activeNavigation !==
      "Jump to user message 30" ||
    current26820Geometry.navigationButtons !== 30 ||
    current26820Geometry.mountedTurns !== 11 ||
    current26820Geometry.placeholders !== 2 ||
    !current26820Geometry.navigation ||
    Math.abs(current26820Geometry.navigation.left - 17) > 1 ||
    Math.abs(current26820Geometry.navigation.top - 283.5) > 1 ||
    Math.abs(current26820Geometry.navigation.width - 36) > 1 ||
    Math.abs(current26820Geometry.navigation.height - 300) > 1 ||
    !current26820Geometry.composer ||
    Math.abs(current26820Geometry.composer.left - 222.5) > 1 ||
    Math.abs(current26820Geometry.composer.top - 706) > 1 ||
    Math.abs(current26820Geometry.composer.width - 736) > 1 ||
    Math.abs(current26820Geometry.composer.height - 98) > 1 ||
    !current26820Geometry.viewport ||
    current26820Geometry.viewport.flexDirection !== "column-reverse" ||
    Math.abs(current26820Geometry.viewport.scrollTop + 2_346) > 1 ||
    Math.abs(current26820Geometry.viewport.scrollHeight - 4_618) > 2
  ) {
    throw new Error(
      `Electron current 26.820 long-thread geometry failed: ${JSON.stringify(current26820Geometry)}`,
    );
  }

  await current26820LongThreadPage
    .getByRole("button", { name: "Jump to user message 29" })
    .click();
  await current26820LongThreadPage.waitForSelector(
    '[data-selected-message-index="29"] [data-item-id="current-windowed-user-29"]',
  );
  await current26820LongThreadPage
    .getByRole("button", { name: "Jump to user message 15" })
    .click();
  await current26820LongThreadPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "15" &&
      document.querySelector(
        '[data-item-id="current-windowed-user-15"]',
      ) &&
      document
        .querySelector(
          '.codex-ui-message-navigation-rail__button[aria-current="true"]',
        )
        ?.getAttribute("aria-label") === "Jump to user message 30" &&
      viewport instanceof HTMLElement &&
      Math.abs(viewport.scrollTop + 2_346) <= 1
    );
  });
  await current26820LongThreadPage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await current26820LongThreadPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      document
        .querySelector(".demo-root")
        ?.getAttribute("data-thread-following") === "true" &&
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "30" &&
      document.querySelectorAll("[data-windowed-turn]").length === 8 &&
      viewport instanceof HTMLElement &&
      viewport.scrollTop === 0
    );
  });
} finally {
  await current26820LongThreadApp.close();
}

const current26820CompactAwayScene = {
  currentSidebar: true,
  frame: "thread-current-26-820-compact-away",
  id: "electron-current-26-820-compact-away",
  scenario: "conversation-lifecycle",
  sidebarState: "hidden",
  windowSize: { height: 680, width: 720 },
};
const {
  app: current26820CompactAwayApp,
  page: current26820CompactAwayPage,
} = await launchScene(current26820CompactAwayScene, { capture: false });
try {
  await current26820CompactAwayPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    const navigation = document.querySelector(
      ".codex-ui-conversation-thread-shell__message-navigation",
    );
    return (
      document.querySelectorAll("[data-windowed-turn]").length === 9 &&
      viewport instanceof HTMLElement &&
      Math.abs(viewport.scrollTop + 900) <= 1 &&
      navigation instanceof HTMLElement &&
      getComputedStyle(navigation).display === "none"
    );
  });
  const compactGeometry = await current26820CompactAwayPage.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left,
        top: value.top,
        width: value.width,
      };
    };
    return {
      composer: rect(".codex-ui-composer"),
      floating: rect(".codex-ui-thread-floating-button"),
      viewport: rect(
        ".codex-ui-conversation-thread-shell__viewport",
      ),
    };
  });
  if (
    !compactGeometry.composer ||
    Math.abs(compactGeometry.composer.left - 16) > 1 ||
    Math.abs(compactGeometry.composer.top - 566) > 1 ||
    Math.abs(compactGeometry.composer.width - 688) > 1 ||
    Math.abs(compactGeometry.composer.height - 98) > 1 ||
    !compactGeometry.floating ||
    Math.abs(compactGeometry.floating.left - 344) > 1 ||
    Math.abs(compactGeometry.floating.top - 510) > 1 ||
    Math.abs(compactGeometry.floating.width - 32) > 1 ||
    Math.abs(compactGeometry.floating.height - 32) > 1 ||
    !compactGeometry.viewport ||
    Math.abs(compactGeometry.viewport.top - 47) > 1 ||
    Math.abs(compactGeometry.viewport.width - 720) > 1 ||
    Math.abs(compactGeometry.viewport.height - 633) > 1
  ) {
    throw new Error(
      `Electron current 26.820 compact-away geometry failed: ${JSON.stringify(compactGeometry)}`,
    );
  }
  await current26820CompactAwayPage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await current26820CompactAwayPage.waitForFunction(() => {
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      document
        .querySelector("[data-selected-message-index]")
        ?.getAttribute("data-selected-message-index") === "30" &&
      document.querySelectorAll("[data-windowed-turn]").length === 8 &&
      viewport instanceof HTMLElement &&
      viewport.scrollTop === 0
    );
  });
} finally {
  await current26820CompactAwayApp.close();
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
    Math.abs(permissionGeometry.top - 591.171875) > 1 ||
    Math.abs(permissionGeometry.width - 476.46875) > 1 ||
    Math.abs(permissionGeometry.height - 175.375) > 1 ||
    permissionGeometry.itemHeights.length !== 3 ||
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
    const surface = document.querySelector(".codex-ui-composer");
    if (!mode || !input || !surface) return null;
    const rect = mode.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      clearLabel: mode.getAttribute("aria-label"),
      height: rect.height,
      input: {
        height: inputRect.height,
        left: inputRect.left,
        top: inputRect.top,
        width: inputRect.width,
      },
      inputLabel: input.getAttribute("aria-label"),
      kind: mode.getAttribute("data-kind"),
      left: rect.left,
      surface: {
        height: surfaceRect.height,
        left: surfaceRect.left,
        top: surfaceRect.top,
        width: surfaceRect.width,
      },
      top: rect.top,
      width: rect.width,
    };
  });
  if (
    !goalMode ||
    goalMode.kind !== "goal" ||
    goalMode.clearLabel !== "Clear goal" ||
    goalMode.inputLabel !==
      "Describe your goal, define measurable outcomes for best results" ||
    Math.abs(goalMode.left - 516.0625) > 1 ||
    Math.abs(goalMode.top - 768) > 1 ||
    Math.abs(goalMode.width - 63.796875) > 1 ||
    Math.abs(goalMode.height - 28) > 1 ||
    Math.abs(goalMode.surface.left - 359) > 1 ||
    Math.abs(goalMode.surface.top - 670) > 1 ||
    Math.abs(goalMode.surface.width - 736) > 1 ||
    Math.abs(goalMode.surface.height - 134) > 1 ||
    Math.abs(goalMode.input.left - 371) > 1 ||
    Math.abs(goalMode.input.top - 690.5) > 1 ||
    Math.abs(goalMode.input.width - 712) > 1 ||
    Math.abs(goalMode.input.height - 44) > 1
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
  const planMode = await composerMenusPage.evaluate(() => {
    const mode = document.querySelector(
      '.codex-ui-composer-mode[data-kind="plan"][aria-label="Plan"]',
    );
    const input = document.querySelector(".codex-ui-composer__input");
    const surface = document.querySelector(".codex-ui-composer");
    if (!mode || !input || !surface) return null;
    const modeRect = mode.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      input: {
        height: inputRect.height,
        left: inputRect.left,
        top: inputRect.top,
        width: inputRect.width,
      },
      inputLabel: input.getAttribute("aria-label"),
      mode: {
        height: modeRect.height,
        left: modeRect.left,
        top: modeRect.top,
      },
      surface: {
        height: surfaceRect.height,
        left: surfaceRect.left,
        top: surfaceRect.top,
        width: surfaceRect.width,
      },
    };
  });
  if (
    !planMode ||
    planMode.inputLabel !== "Describe your task to generate a plan..." ||
    Math.abs(planMode.mode.left - 516.0625) > 1 ||
    Math.abs(planMode.mode.top - 768) > 1 ||
    Math.abs(planMode.mode.height - 28) > 1 ||
    Math.abs(planMode.surface.left - 359) > 1 ||
    Math.abs(planMode.surface.top - 706) > 1 ||
    Math.abs(planMode.surface.width - 736) > 1 ||
    Math.abs(planMode.surface.height - 98) > 1 ||
    Math.abs(planMode.input.left - 371) > 1 ||
    Math.abs(planMode.input.top - 720) > 1 ||
    Math.abs(planMode.input.width - 712) > 1 ||
    Math.abs(planMode.input.height - 44) > 1
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

const compactComposerModesScene = {
  frame: "composer-goal",
  id: "electron-composer-modes-compact",
  scenario: "conversation-lifecycle",
  sidebarState: "hidden",
  windowSize: { height: 680, width: 720 },
};
const {
  app: compactComposerModesApp,
  page: compactComposerModesPage,
} = await launchScene(compactComposerModesScene, { capture: false });
try {
  const measureCompactComposerMode = (kind) =>
    compactComposerModesPage.evaluate((expectedKind) => {
      const mode = document.querySelector(
        `.codex-ui-composer-mode[data-kind="${expectedKind}"]`,
      );
      const input = document.querySelector(".codex-ui-composer__input");
      const surface = document.querySelector(".codex-ui-composer");
      if (!mode || !input || !surface) return null;
      const measure = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        };
      };
      return {
        input: measure(input),
        mode: measure(mode),
        surface: measure(surface),
      };
    }, kind);
  const compactGoalMode = await measureCompactComposerMode("goal");
  if (
    !compactGoalMode ||
    Math.abs(compactGoalMode.surface.left - 16) > 1 ||
    Math.abs(compactGoalMode.surface.top - 530) > 1 ||
    Math.abs(compactGoalMode.surface.width - 688) > 1 ||
    Math.abs(compactGoalMode.surface.height - 134) > 1 ||
    Math.abs(compactGoalMode.input.left - 28) > 1 ||
    Math.abs(compactGoalMode.input.top - 550.5) > 1 ||
    Math.abs(compactGoalMode.input.width - 664) > 1 ||
    Math.abs(compactGoalMode.input.height - 44) > 1 ||
    Math.abs(compactGoalMode.mode.left - 173.0625) > 1 ||
    Math.abs(compactGoalMode.mode.top - 628) > 1 ||
    Math.abs(compactGoalMode.mode.height - 28) > 1
  ) {
    throw new Error(
      `Electron compact Composer Goal geometry failed: ${JSON.stringify(compactGoalMode)}`,
    );
  }
  await compactComposerModesPage
    .getByRole("button", { name: "Clear goal" })
    .click();
  await compactComposerModesPage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await compactComposerModesPage
    .getByRole("option", { name: /Plan mode/ })
    .click();
  await compactComposerModesPage.waitForSelector(
    '.demo-root[data-composer-mode="plan"][data-composer-phase="plan"]',
  );
  const compactPlanMode = await measureCompactComposerMode("plan");
  if (
    !compactPlanMode ||
    Math.abs(compactPlanMode.surface.left - 16) > 1 ||
    Math.abs(compactPlanMode.surface.top - 566) > 1 ||
    Math.abs(compactPlanMode.surface.width - 688) > 1 ||
    Math.abs(compactPlanMode.surface.height - 98) > 1 ||
    Math.abs(compactPlanMode.input.left - 28) > 1 ||
    Math.abs(compactPlanMode.input.top - 580) > 1 ||
    Math.abs(compactPlanMode.input.width - 664) > 1 ||
    Math.abs(compactPlanMode.input.height - 44) > 1 ||
    Math.abs(compactPlanMode.mode.left - 173.0625) > 1 ||
    Math.abs(compactPlanMode.mode.top - 628) > 1 ||
    Math.abs(compactPlanMode.mode.height - 28) > 1
  ) {
    throw new Error(
      `Electron compact Composer Plan geometry failed: ${JSON.stringify(compactPlanMode)}`,
    );
  }
} finally {
  await compactComposerModesApp.close();
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
      document
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
      Math.abs((side?.left ?? 0) - 420) <= 1 &&
      Math.abs((side?.width ?? 0) - 300) <= 1
    );
  });
  const compact720Subagent = await measureSubagentLayout();
  if (
    !compact720Subagent.sidebarOpen ||
    !compact720Subagent.panelOverlay ||
    compact720Subagent.sidebar?.right !== 274 ||
    compact720Subagent.main?.width !== 446 ||
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
  frame: "markdown-complete",
  id: "electron-live-subagent",
  scenario: "markdown",
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
  await workspaceMissingPage
    .getByRole("button", { name: "Select where to run the chat" })
    .click();
  await workspaceMissingPage
    .getByRole("menu", { name: "Work in" })
    .getByRole("menuitem", { name: "New local worktree" })
    .click();
  await workspaceMissingPage
    .getByRole("button", { name: "Select a local environment" })
    .click();
  await workspaceMissingPage
    .getByRole("menu", { name: "Environment" })
    .getByRole("menuitem", { name: "Set up project" })
    .click();
  const persistedEnvironmentSettings = workspaceMissingPage.getByRole(
    "region",
    { name: "Environments" },
  );
  await persistedEnvironmentSettings.waitFor();
  await retainedTask.click();
  await workspaceMissingPage.waitForSelector(
    '.demo-root[data-frame="workspace-directory-missing"]',
  );
  if ((await persistedEnvironmentSettings.count()) !== 0) {
    throw new Error(
      "Electron persisted-task navigation retained the environment settings route.",
    );
  }
  await workspaceMissingPage
    .getByRole("button", { name: "New chat", exact: true })
    .click();
  await workspaceMissingPage.waitForSelector(
    '.demo-root[data-frame="workspace-ready"]',
  );
  await workspaceMissingApp.evaluate(({ BrowserWindow }) => {
    const active = BrowserWindow.getAllWindows()[0];
    active?.setMinimumSize(480, 480);
    active?.setContentSize(600, 680);
  });
  await workspaceMissingPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])',
  );
  await retainedTask.click();
  await workspaceMissingPage.waitForSelector(
    '.demo-root[data-frame="workspace-directory-missing"]',
  );
  await workspaceMissingPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])',
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
  const projectPickerStructure = await projectDialog.evaluate((dialog) => {
    const measure = (selector) => {
      const element = dialog.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        width: rect.width,
      };
    };
    const listbox = dialog.querySelector('[role="listbox"]');
    const dialogRect = dialog.getBoundingClientRect();
    return {
      actionButtonCount: dialog.querySelectorAll(
        '.codex-ui-conversation-project-options__pinned button:not([role="option"])',
      ).length,
      dialog: {
        height: dialogRect.height,
        width: dialogRect.width,
      },
      divider: measure(
        ".codex-ui-conversation-project-options__divider",
      ),
      listbox: measure('[role="listbox"]'),
      listboxChildCount: listbox?.children.length ?? 0,
      optionCount: listbox?.querySelectorAll('[role="option"]').length ?? 0,
      pinned: measure(
        ".codex-ui-conversation-project-options__pinned",
      ),
      scroll: measure(
        ".codex-ui-conversation-project-options__scroll",
      ),
    };
  });
  if (
    !projectPickerStructure.dialog ||
    !projectPickerStructure.listbox ||
    !projectPickerStructure.scroll ||
    !projectPickerStructure.divider ||
    !projectPickerStructure.pinned ||
    Math.abs(projectPickerStructure.dialog.width - 260) > 1 ||
    Math.abs(projectPickerStructure.dialog.height - 249.5) > 0.2 ||
    Math.abs(projectPickerStructure.listbox.width - 252) > 1 ||
    Math.abs(projectPickerStructure.listbox.height - 208.9375) > 0.2 ||
    Math.abs(projectPickerStructure.scroll.height - 142.8125) > 0.2 ||
    Math.abs(projectPickerStructure.divider.height - 9) > 0.2 ||
    Math.abs(projectPickerStructure.pinned.height - 57.125) > 0.2 ||
    projectPickerStructure.listboxChildCount !== 1 ||
    projectPickerStructure.optionCount !== 16 ||
    projectPickerStructure.actionButtonCount !== 0 ||
    (await projectDialog.getByRole("option", { name: "New project" }).count()) !==
      1 ||
    (await projectDialog
      .getByRole("option", { name: "Don't work in a project" })
      .count()) !== 1 ||
    JSON.stringify(
      await projectDialog
        .locator(
          ".codex-ui-conversation-project-options__pinned [data-current-build-icon]",
        )
        .evaluateAll((icons) =>
          icons.map((icon) => icon.getAttribute("data-current-build-icon")),
        ),
    ) !==
      JSON.stringify([
        "composer-new-project",
        "composer-clear-project",
      ])
  ) {
    throw new Error(
      "Electron current project picker did not expose the two exact current actions.",
    );
  }
  const projectSearch = projectDialog.getByRole("searchbox", {
    name: "Search projects",
  });
  await projectSearch.fill("__codex_ui_kit_no_project__");
  if (
    (await projectDialog.getByRole("option").count()) !== 2 ||
    !(await projectDialog
      .getByText("No projects found", { exact: true })
      .isVisible()) ||
    (await projectDialog
      .getByRole("button", { name: "New project" })
      .count()) !== 0
  ) {
    throw new Error("Electron current project picker empty state was incomplete.");
  }
  await projectCreationPage.keyboard.press("Escape");
  const initialProjectTrigger = projectCreationPage.getByRole("button", {
    name: "Change project: codex-ui-kit",
  });
  await initialProjectTrigger.waitFor({ state: "visible" });
  await projectCreationPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Change project: codex-ui-kit",
  );
  await initialProjectTrigger.click();
  await projectDialog
    .getByRole("option", { name: "Don't work in a project" })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-frame="workspace-no-project"]',
  );
  const chooseProject = projectCreationPage.getByRole("button", {
    name: "Choose project",
  });
  await chooseProject.click();
  await projectDialog
    .getByRole("option", { name: "Select project codex-ui-kit" })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-frame="workspace-ready"]',
  );
  const restoredProjectTrigger = projectCreationPage.getByRole("button", {
    name: "Change project: codex-ui-kit",
  });
  await restoredProjectTrigger.click();
  await projectDialog.waitFor({ state: "visible" });
  await projectDialog.getByRole("option", { name: "New project" }).click();
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
  await projectDialog.getByRole("option", { name: "New project" }).click();
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
  const projectIndexRoute = projectCreationPage.locator(
    ".demo-projects-route",
  );
  if (
    (await projectIndexRoute
      .locator(".codex-ui-project-index__label")
      .filter({ hasText: /^scripts$/ })
      .count()) !== 1 ||
    (await projectIndexRoute
      .locator(".codex-ui-project-index__label")
      .filter({ hasText: /^src$/ })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron created projects did not remain visible in the project index.",
    );
  }
  if ((await projectIndexRoute.locator("[data-project-row]").count()) !== 16) {
    throw new Error(
      "Electron Projects Index did not preserve the 14-row current baseline plus two created projects.",
    );
  }
  const leadingProjectLabels = await projectIndexRoute
    .locator("[data-project-row] .codex-ui-project-index__label")
    .allTextContents();
  if (
    JSON.stringify(leadingProjectLabels.slice(0, 2).sort()) !==
    JSON.stringify(["scripts", "src"])
  ) {
    throw new Error(
      "Electron Projects Index did not keep newly created projects ahead of older baseline rows.",
    );
  }

  const codexUiKitProjectRow = projectIndexRoute
    .locator("[data-project-row-wrapper]")
    .filter({
      has: projectCreationPage
        .locator(".codex-ui-project-index__label")
        .filter({ hasText: /^codex-ui-kit$/ }),
    });
  await codexUiKitProjectRow
    .getByRole("button", { name: "Expand project codex-ui-kit" })
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
  const appServerProjectRow = projectCreationPage
    .locator(".demo-projects-route [data-project-row-wrapper]")
    .filter({
      has: projectCreationPage
        .locator(".codex-ui-project-index__label")
        .filter({ hasText: /^codex-app-server-client$/ }),
    });
  await appServerProjectRow
    .getByRole("button", {
      name: "Expand project codex-app-server-client",
    })
    .click();
  await projectCreationPage
    .getByRole("button", {
      name: "Open chat Verify sidebar project behavior",
    })
    .click();
  await projectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="projects-index-chat"] .demo-project-index-chat-route[data-project-id="app-server-client"][data-chat-id="sidebar-contract"]',
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
        '.demo-root[data-view="workspace"][data-frame="projects-index-chat"] .demo-project-index-chat-route[data-project-id="app-server-client"][data-chat-id="sidebar-contract"]',
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
    .getByRole("option", { name: "New project" })
    .click();
  await createdProjectBranchPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"]',
  );
  await createdProjectBranchPage
    .getByRole("button", { name: "Switch branch" })
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
      name: "Switch branch",
    })
    .click();
  await createdProjectBranchPage
    .getByRole("menu", { name: "Branches" })
    .getByRole("menuitemradio", { name: "main" })
    .click();
  await waitForBranchLabel(createdProjectBranchPage, "main");
  await createdProjectBranchPage
    .getByRole("button", { name: "Switch branch" })
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
    { name: "Switch branch" },
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
        'button[aria-label="Switch branch"]',
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    },
  );
  await createdProjectBranchPage
    .getByRole("button", { name: "Switch branch" })
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
    .getByRole("button", { name: "Switch branch" })
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
    { name: "Switch branch" },
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
    .getByRole("option", { name: "New project" })
    .click();
  await waitForBranchLabel(createdProjectBranchPage, "feat/selected-project");
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

const detachedBranchGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-detached-branch-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: detachedBranchGitDirectory,
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
    "test: initialize detached branch fixture",
  ],
  { cwd: detachedBranchGitDirectory },
);
await execFileAsync("git", ["switch", "--detach"], {
  cwd: detachedBranchGitDirectory,
});
await execFileAsync("git", ["branch", "unattached-head"], {
  cwd: detachedBranchGitDirectory,
});
const detachedBranchScene = {
  frame: "workspace-ready",
  id: "electron-detached-branch-creation",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: detachedBranchApp,
  page: detachedBranchPage,
} = await launchScene(detachedBranchScene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_WORKSPACE: detachedBranchGitDirectory,
  },
});
try {
  const detachedBranchControl = detachedBranchPage.getByRole("button", {
    name: "Switch branch",
  });
  await detachedBranchControl.waitFor({ state: "visible" });
  if (await detachedBranchControl.isDisabled()) {
    throw new Error(
      "Electron disabled branch creation while the repository HEAD was detached.",
    );
  }
  await detachedBranchControl.click();
  const detachedBranchMenu = detachedBranchPage.getByRole("menu", {
    name: "Branches",
  });
  if (
    (await detachedBranchMenu
      .getByRole("menuitemradio", { name: "main" })
      .getAttribute("aria-checked")) === "true" ||
    (await detachedBranchMenu
      .getByRole("menuitemradio", { name: "unattached-head" })
      .count()) !== 1
  ) {
    throw new Error(
      "Electron presented a detached repository as attached or hid a colliding real branch.",
    );
  }
  await detachedBranchMenu
    .getByRole("menuitem", { name: "Create and checkout new branch…" })
    .click();
  const detachedBranchDialog = detachedBranchPage.getByRole("dialog", {
    name: "Create and checkout branch",
  });
  await detachedBranchDialog
    .getByRole("textbox", { name: "Branch name" })
    .fill("feat/from-detached");
  await detachedBranchDialog
    .getByRole("button", { name: "Create and checkout" })
    .click();
  await waitForBranchLabel(detachedBranchPage, "feat/from-detached");
  const detachedCreatedBranch = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: detachedBranchGitDirectory, encoding: "utf8" },
  );
  if (detachedCreatedBranch.stdout.trim() !== "feat/from-detached") {
    throw new Error(
      `Electron did not create a branch from detached HEAD: ${detachedCreatedBranch.stdout.trim()}.`,
    );
  }
} finally {
  await detachedBranchApp.close();
  await rm(detachedBranchGitDirectory, { force: true, recursive: true });
}

const unbornBranchGitDirectory = await mkdtemp(
  join(tmpdir(), "codex-ui-kit-electron-unborn-branch-"),
);
await execFileAsync("git", ["init", "-b", "main"], {
  cwd: unbornBranchGitDirectory,
});
const unbornBranchScene = {
  frame: "workspace-ready",
  id: "electron-unborn-branch-creation",
  scenario: "workspace-workflow",
  view: "workspace",
};
const { app: unbornBranchApp, page: unbornBranchPage } = await launchScene(
  unbornBranchScene,
  {
    capture: false,
    environment: {
      CODEX_UI_KIT_WORKSPACE: unbornBranchGitDirectory,
    },
  },
);
try {
  const unbornBranchControl = unbornBranchPage.getByRole("button", {
    name: "Switch branch",
  });
  await unbornBranchControl.waitFor({ state: "visible" });
  await unbornBranchControl.click();
  const unbornBranchMenu = unbornBranchPage.getByRole("menu", {
    name: "Branches",
  });
  if ((await unbornBranchMenu.getByRole("menuitemradio").count()) !== 0) {
    throw new Error(
      "Electron exposed an unborn symbolic branch as a selectable local ref.",
    );
  }
  await unbornBranchMenu
    .getByRole("menuitem", { name: "Create and checkout new branch…" })
    .click();
  const unbornBranchDialog = unbornBranchPage.getByRole("dialog", {
    name: "Create and checkout branch",
  });
  await unbornBranchDialog
    .getByRole("textbox", { name: "Branch name" })
    .fill("feat/from-unborn");
  await unbornBranchDialog
    .getByRole("button", { name: "Create and checkout" })
    .click();
  await waitForBranchLabel(unbornBranchPage, "feat/from-unborn (unborn)");
  const unbornCreatedBranch = await execFileAsync(
    "git",
    ["branch", "--show-current"],
    { cwd: unbornBranchGitDirectory, encoding: "utf8" },
  );
  if (unbornCreatedBranch.stdout.trim() !== "feat/from-unborn") {
    throw new Error(
      `Electron did not create an unborn branch: ${unbornCreatedBranch.stdout.trim()}.`,
    );
  }
} finally {
  await unbornBranchApp.close();
  await rm(unbornBranchGitDirectory, { force: true, recursive: true });
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
    .getByRole("option", { name: "New project" })
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
      .locator(".codex-ui-project-index__label")
      .filter({ hasText: /^codex-ui-kit$/ })
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
    .getByRole("button", { name: "Create" })
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
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])',
  );
  await narrowProjectCreationPage
    .getByRole("button", { name: "New project" })
    .click();
  await narrowProjectCreationPage.waitForSelector(
    '.demo-root[data-view="workspace"][data-frame="workspace-project-created"] .codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-open] .codex-ui-app-shell__main:not([inert])',
  );
} finally {
  await narrowProjectCreationApp.close();
}

const hooksConfiguredScene = {
  frame: "workspace-hooks-settings-configured",
  id: "electron-hooks-settings-configured",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: hooksConfiguredApp,
  page: hooksConfiguredPage,
} = await launchScene(hooksConfiguredScene, { capture: false });
try {
  const hooksMain = hooksConfiguredPage.getByRole("main");
  await hooksMain
    .getByRole("heading", { level: 1, name: "Hooks", exact: true })
    .waitFor();
  if (
    (await hooksMain.locator(".codex-ui-hooks-settings__entry").count()) !== 3 ||
    JSON.stringify(
      await hooksMain
        .locator(".codex-ui-hooks-settings__source > h2")
        .allTextContents(),
    ) !== JSON.stringify(["From Config", "From Plugins", "From Projects"]) ||
    (await hooksMain
      .locator(".codex-ui-hooks-settings")
      .getAttribute("data-evidence")) !== "runtime-observed"
  ) {
    throw new Error("Electron configured Hooks source groups are incomplete.");
  }
  const preTool = hooksMain.getByRole("switch", {
    name: "PreToolUse enabled",
  });
  if (!(await preTool.isDisabled())) {
    throw new Error("Electron changed Hooks entry was enabled before trust.");
  }
  await hooksMain.getByText("PreToolUse", { exact: true }).click();
  await hooksMain.getByRole("button", { name: "Trust", exact: true }).click();
  if (await preTool.isDisabled()) {
    throw new Error("Electron trusted Hooks entry remained disabled.");
  }
  await preTool.click();
  if ((await preTool.getAttribute("aria-checked")) !== "true") {
    throw new Error("Electron trusted Hooks entry did not update controlled state.");
  }
} finally {
  await hooksConfiguredApp.close();
}

const codeReviewSettingsScene = {
  frame: "workspace-code-review-settings",
  id: "electron-code-review-settings",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: codeReviewSettingsApp,
  page: codeReviewSettingsPage,
} = await launchScene(codeReviewSettingsScene, { capture: false });
try {
  const codeReviewMain = codeReviewSettingsPage.getByRole("main");
  await codeReviewMain
    .getByRole("heading", { level: 1, name: "Code review", exact: true })
    .waitFor();
  if (
    (await codeReviewSettingsPage
      .getByRole("navigation", { name: "Settings" })
      .getByRole("button", { name: "Code review", exact: true })
      .count()) !== 0 ||
    (await codeReviewMain
      .locator(".codex-ui-code-review-settings")
      .getAttribute("data-evidence")) !== "package-observed" ||
    (await codeReviewMain.locator(".codex-ui-code-review-settings__row").count()) !==
      4 ||
    (await codeReviewMain.getByRole("switch").count()) !== 3
  ) {
    throw new Error(
      "Electron package-observed Code review state or hidden-entry boundary is incomplete.",
    );
  }
  await codeReviewMain
    .getByRole("switch", { name: "Enable automatic code review" })
    .click();
  await codeReviewMain.getByRole("button", { name: "Review trigger" }).click();
  const selectedTrigger = codeReviewSettingsPage.getByRole("menuitemradio", {
    name: "On PR open",
  });
  const smartTrigger = codeReviewSettingsPage.getByRole("menuitemradio", {
    name: "Smart trigger",
  });
  if (
    (await selectedTrigger.getAttribute("aria-checked")) !== "true" ||
    (await smartTrigger.getAttribute("aria-checked")) !== "false"
  ) {
    throw new Error("Electron review trigger radio semantics are incomplete.");
  }
  await smartTrigger.click();
  if (
    (await codeReviewMain
      .getByRole("switch", { name: "Enable automatic code review" })
      .getAttribute("aria-checked")) !== "false" ||
    !(await codeReviewMain
      .getByRole("button", { name: "Review trigger" })
      .textContent())?.includes("Smart trigger")
  ) {
    throw new Error("Electron Code review preferences did not remain controlled.");
  }
} finally {
  await codeReviewSettingsApp.close();
}

const transportRetryingScene = {
  frame: "retrying",
  id: "electron-transport-retrying",
  scenario: "streaming-recovery",
};
const {
  app: transportRetryingApp,
  page: transportRetryingPage,
} = await launchScene(transportRetryingScene, { capture: false });
try {
  const transportContract = await transportRetryingPage.evaluate(() => {
    const notice = document.querySelector(".codex-ui-stream-notice");
    const icon = notice?.querySelector(".codex-ui-stream-notice__icon");
    const iconRect = icon?.getBoundingClientRect();
    const style = notice ? getComputedStyle(notice) : null;
    return {
      alertCount: document.querySelectorAll('[role="alert"]').length,
      details:
        notice?.querySelector(".codex-ui-stream-notice__details")
          ?.textContent?.trim() ?? null,
      icon: iconRect
        ? { height: iconRect.height, width: iconRect.width }
        : null,
      role: notice?.getAttribute("role"),
      sendCount: document.querySelectorAll(
        '.codex-ui-composer__primary[aria-label="Send"]',
      ).length,
      status: document
        .querySelector(".demo-root")
        ?.getAttribute("data-status"),
      stopCount: document.querySelectorAll(
        '.codex-ui-composer__primary[aria-label="Stop"]',
      ).length,
      style: style
        ? { fontSize: style.fontSize, lineHeight: style.lineHeight }
        : null,
      text: notice?.textContent?.replace(/\s+/g, " ").trim(),
    };
  });
  if (
    transportContract.status !== "retrying" ||
    transportContract.stopCount !== 1 ||
    transportContract.sendCount !== 0 ||
    transportContract.role !== "status" ||
    transportContract.alertCount !== 0 ||
    transportContract.text !==
      "Server is busy, reconnecting 1/5The response stream disconnected before completion." ||
    transportContract.details !==
      "The response stream disconnected before completion." ||
    transportContract.icon?.width !== 16 ||
    transportContract.icon?.height !== 20 ||
    transportContract.style?.fontSize !== "14px" ||
    transportContract.style?.lineHeight !== "21px"
  ) {
    throw new Error(
      `Electron transport retry contract failed: ${JSON.stringify(transportContract)}`,
    );
  }
} finally {
  await transportRetryingApp.close();
}

const transportRecoveredScene = {
  frame: "recovered",
  id: "electron-transport-recovered",
  scenario: "streaming-recovery",
};
const {
  app: transportRecoveredApp,
  page: transportRecoveredPage,
} = await launchScene(transportRecoveredScene, { capture: false });
try {
  const recoveredContract = await transportRecoveredPage.evaluate(() => ({
    assistant:
      document
        .querySelector('[data-item-id="assistant-recovery"]')
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    composerDisabled:
      document
        .querySelector('.codex-ui-composer textarea, textarea[aria-label]')
        ?.hasAttribute("disabled") ?? null,
    noticeCount: document.querySelectorAll(".codex-ui-stream-notice").length,
    sendCount: document.querySelectorAll(
      '.codex-ui-composer__primary[aria-label="Send"]',
    ).length,
    status: document.querySelector(".demo-root")?.getAttribute("data-status"),
    stopCount: document.querySelectorAll(
      '.codex-ui-composer__primary[aria-label="Stop"]',
    ).length,
  }));
  if (
    recoveredContract.status !== "completed" ||
    recoveredContract.noticeCount !== 1 ||
    recoveredContract.stopCount !== 0 ||
    recoveredContract.sendCount !== 1 ||
    recoveredContract.composerDisabled !== false ||
    !recoveredContract.assistant?.includes("across retries")
  ) {
    throw new Error(
      `Electron transport recovery contract failed: ${JSON.stringify(recoveredContract)}`,
    );
  }
} finally {
  await transportRecoveredApp.close();
}

for (const expected of [
  {
    assistantAfterFailure: null,
    frame: "retrying-progress",
    id: "electron-transport-retrying-progress",
    noticeText:
      "Server is busy, reconnecting 2/5The server is still busy; retrying the same response stream.",
    sendCount: 0,
    status: "retrying",
    stopCount: 1,
    systemErrorCount: 0,
  },
  {
    assistantAfterFailure: null,
    frame: "transport-failed",
    id: "electron-transport-failed",
    noticeText:
      "Server is busy, reconnecting 2/5The server is still busy; retrying the same response stream.",
    sendCount: 1,
    status: "failed",
    stopCount: 0,
    systemErrorCount: 1,
  },
  {
    assistantAfterFailure:
      "The follow-up completed without losing the prior recovery history.",
    frame: "transport-retried",
    id: "electron-transport-retried",
    noticeText:
      "Server is busy, reconnecting 2/5The server is still busy; retrying the same response stream.",
    sendCount: 1,
    status: "completed",
    stopCount: 0,
    systemErrorCount: 1,
  },
]) {
  const { app, page } = await launchScene(
    {
      frame: expected.frame,
      id: expected.id,
      scenario: "streaming-recovery",
    },
    { capture: false },
  );
  try {
    const contract = await page.evaluate(() => {
      const text = (element) =>
        element?.textContent?.replace(/\s+/g, " ").trim() ?? null;
      return {
        assistantAfterFailure: text(
          document.querySelector('[data-item-id="assistant-after-failure"]'),
        ),
        noticeText: text(document.querySelector(".codex-ui-stream-notice")),
        sendCount: document.querySelectorAll(
          '.codex-ui-composer__primary[aria-label="Send"]',
        ).length,
        status: document
          .querySelector(".demo-root")
          ?.getAttribute("data-status"),
        stopCount: document.querySelectorAll(
          '.codex-ui-composer__primary[aria-label="Stop"]',
        ).length,
        systemErrorCount: document.querySelectorAll(
          '.codex-ui-system-error-notice[role="alert"]',
        ).length,
        systemErrorText: text(
          document.querySelector(".codex-ui-system-error-notice"),
        ),
      };
    });
    if (
      contract.status !== expected.status ||
      contract.noticeText !== expected.noticeText ||
      contract.stopCount !== expected.stopCount ||
      contract.sendCount !== expected.sendCount ||
      contract.systemErrorCount !== expected.systemErrorCount ||
      contract.assistantAfterFailure !== expected.assistantAfterFailure ||
      (expected.systemErrorCount === 1 &&
        contract.systemErrorText !==
          "Response stream disconnected before completion.")
    ) {
      throw new Error(
        `${expected.id} contract failed: ${JSON.stringify(contract)}`,
      );
    }
  } finally {
    await app.close();
  }
}

const currentBasicThreadScene = {
  currentSidebar: true,
  frame: "current-basic-completed",
  id: "electron-current-basic-thread",
  scenario: "current-basic-message",
  theme: "dark",
};
const {
  app: currentBasicThreadApp,
  page: currentBasicThreadPage,
} = await launchScene(currentBasicThreadScene, { capture: false });
try {
  const nativeBounds = await currentBasicThreadApp.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  const basicThread = await currentBasicThreadPage.evaluate(() => {
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left,
        top: value.top,
        width: value.width,
      };
    };
    const user = document.querySelector(
      '[data-item-id="user-current-basic"]',
    );
    const assistant = document.querySelector(
      '[data-item-id="assistant-current-basic"]',
    );
    const composer = document.querySelector(".codex-ui-composer");
    return {
      actions: Array.from(
        assistant?.querySelectorAll(
          ".codex-ui-agent-message__actions button",
        ) ?? [],
        (button) => ({
          icon: button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
          label: button.getAttribute("aria-label"),
          rect: rect(button),
        }),
      ),
      assistant: assistant
        ?.querySelector(".codex-ui-agent-message__content")
        ?.textContent?.trim(),
      composer: rect(composer),
      composerText: composer?.textContent
        ?.replace(/\u200b/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      frame: document
        .querySelector(".demo-root")
        ?.getAttribute("data-frame"),
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      user: user
        ?.querySelector(".codex-ui-agent-message__content")
        ?.textContent?.trim(),
    };
  });
  if (
    nativeBounds?.width !== 1180 ||
    nativeBounds?.height !== 820 ||
    basicThread.frame !== "current-basic-completed" ||
    basicThread.user !== "Reply with exactly CURRENT BASIC MESSAGE." ||
    basicThread.assistant !== "CURRENT BASIC MESSAGE." ||
    basicThread.horizontalOverflow > 1 ||
    basicThread.composer?.left !== 359 ||
    basicThread.composer?.top !== 706 ||
    basicThread.composer?.width !== 736 ||
    basicThread.composer?.height !== 98 ||
    basicThread.composerText !== "Full access5.6 Sol Extra High" ||
    JSON.stringify(basicThread.actions.map(({ label }) => label)) !==
      JSON.stringify([
        "Copy",
        "Good response",
        "Bad response",
        "Fork chat from here",
      ]) ||
    JSON.stringify(basicThread.actions.map(({ icon }) => icon)) !==
      JSON.stringify([
        "thread-assistant-copy",
        "thread-assistant-good",
        "thread-assistant-bad",
        "thread-assistant-fork",
      ]) ||
    basicThread.actions.some(
      ({ rect }, index) =>
        rect?.left !== 355 + index * 28 ||
        rect?.top !== 188 ||
        rect?.width !== 26 ||
        rect?.height !== 26,
    )
  ) {
    throw new Error(
      `Electron current basic thread contract failed: ${JSON.stringify({ basicThread, nativeBounds })}`,
    );
  }
  await currentBasicThreadPage
    .getByRole("button", { name: "Fork chat from here" })
    .focus();
  if (
    (await currentBasicThreadPage.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    )) !== "Fork chat from here"
  ) {
    throw new Error("Electron current basic thread actions lost focus.");
  }
  await currentBasicThreadApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(820, 680);
  });
  await currentBasicThreadPage.waitForFunction(
    () => window.innerWidth === 820 && window.innerHeight === 680,
  );
  const compact = await currentBasicThreadPage.evaluate(() => {
    const composer = document.querySelector(".codex-ui-composer");
    const composerRect = composer?.getBoundingClientRect();
    return {
      actionCount: document.querySelectorAll(
        '[data-item-id="assistant-current-basic"] .codex-ui-agent-message__actions button',
      ).length,
      composer: composerRect
        ? {
            bottom: composerRect.bottom,
            left: composerRect.left,
            right: composerRect.right,
          }
        : null,
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      messageCount: document.querySelectorAll(
        '[data-item-id="user-current-basic"], [data-item-id="assistant-current-basic"]',
      ).length,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
  if (
    compact.viewport.width !== 820 ||
    compact.viewport.height !== 680 ||
    compact.horizontalOverflow > 1 ||
    compact.messageCount !== 2 ||
    compact.actionCount !== 4 ||
    !compact.composer ||
    compact.composer.left < 0 ||
    compact.composer.right > 820 ||
    compact.composer.bottom > 680
  ) {
    throw new Error(
      `Electron compact current basic thread failed: ${JSON.stringify(compact)}`,
    );
  }
} finally {
  await currentBasicThreadApp.close();
}

const appServerCrashScene = {
  frame: "app-server-crashed",
  id: "electron-app-server-crashed",
  scenario: "streaming-recovery",
  view: "shell",
};
const { app: appServerCrashApp, page: appServerCrashPage } = await launchScene(
  appServerCrashScene,
  { capture: false },
);
try {
  const crashBounds = await appServerCrashApp.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getContentBounds(),
  );
  const crashContract = await appServerCrashPage.evaluate(() => ({
    buttons: Array.from(
      document.querySelectorAll(
        ".codex-ui-app-server-crash-recovery button",
      ),
      (button) => button.textContent?.trim(),
    ),
    heading: document
      .querySelector(".codex-ui-app-server-crash-recovery h1")
      ?.textContent?.trim(),
    mainCount: document.querySelectorAll(".codex-ui-app-shell__main").length,
    state: document
      .querySelector(".demo-root")
      ?.getAttribute("data-app-server-state"),
  }));
  if (
    crashBounds?.width !== 1180 ||
    crashBounds?.height !== 820 ||
    crashContract.state !== "crashed" ||
    crashContract.mainCount !== 0 ||
    crashContract.heading !== "ChatGPT stopped unexpectedly" ||
    JSON.stringify(crashContract.buttons) !==
      JSON.stringify([
        "documentation",
        "Update ChatGPT",
        "Open Config.toml",
        "Restart",
      ])
  ) {
    throw new Error(
      `Electron app-server crash contract failed: ${JSON.stringify({ crashBounds, crashContract })}`,
    );
  }
  await appServerCrashApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await appServerCrashPage.waitForFunction(() => window.innerWidth === 720);
  const compactCrash = await appServerCrashPage.evaluate(() => ({
    height: window.innerHeight,
    overflow:
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    width: window.innerWidth,
  }));
  if (
    compactCrash.width !== 720 ||
    compactCrash.height !== 680 ||
    compactCrash.overflow > 1
  ) {
    throw new Error(
      `Electron compact app-server crash failed: ${JSON.stringify(compactCrash)}`,
    );
  }
  await appServerCrashPage
    .getByRole("button", { name: "Restart", exact: true })
    .click();
  await appServerCrashPage.waitForSelector(
    '.demo-root[data-app-server-state="running"][data-frame="app-server-restarted"] .codex-ui-app-shell',
  );
} finally {
  await appServerCrashApp.close();
}

const routeContinuityScene = {
  currentSidebar: true,
  frame: "route-continuity-projects",
  id: "electron-route-continuity",
  scenario: "workspace-workflow",
  theme: "dark",
  view: "projects",
};
const {
  app: routeContinuityApp,
  page: routeContinuityPage,
} = await launchScene(routeContinuityScene, { capture: false });
try {
  const readRouteState = () =>
    routeContinuityPage.evaluate(() => {
      const control = (label) => {
        const element = document.querySelector(
          `button[aria-label="${label}"]`,
        );
        if (
          !(element instanceof HTMLButtonElement) ||
          !element.checkVisibility({
            checkOpacity: true,
            checkVisibilityCSS: true,
          })
        ) {
          return null;
        }
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          cursor: style.cursor,
          disabled: element.disabled,
          left: bounds.left,
          opacity: style.opacity,
        };
      };
      const root = document.querySelector(".demo-root");
      return {
        back: control("Back"),
        forward: control("Forward"),
        historyIndex: root?.getAttribute("data-route-history-index"),
        historyLength: root?.getAttribute("data-route-history-length"),
        navigationVisible:
          document
            .querySelector(".codex-ui-app-shell__sidebar")
            ?.checkVisibility({
              checkOpacity: true,
              checkVisibilityCSS: true,
            }) ?? false,
        projectsVisible: Boolean(
          document.querySelector(".demo-projects-route"),
        ),
        selectedProjectChat: (() => {
          const selected = document.querySelector(
            ".demo-project-index-chat-route",
          );
          return selected
            ? {
                chatId: selected.getAttribute("data-chat-id"),
                projectId: selected.getAttribute("data-project-id"),
              }
            : null;
        })(),
        view: root?.getAttribute("data-view"),
        viewport: { height: innerHeight, width: innerWidth },
      };
    });
  const projects = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { exact: true, name: "Back" })
    .click();
  await routeContinuityPage.waitForSelector(
    '.demo-root[data-view="workspace"]',
  );
  const back = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { exact: true, name: "Forward" })
    .click();
  await routeContinuityPage.waitForSelector(
    '.demo-root[data-view="projects"]',
  );
  const forward = await readRouteState();
  await routeContinuityApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await routeContinuityPage.waitForFunction(
    () => innerWidth === 720 && innerHeight === 680,
  );
  await routeContinuityPage.waitForSelector(
    '.codex-ui-app-shell[data-layout-mode="narrow"][data-sidebar-pinned]',
  );
  const compactVisible = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { name: "Hide sidebar" })
    .click();
  await routeContinuityPage.waitForFunction(
    () =>
      !document
        .querySelector(".codex-ui-app-shell__sidebar")
        ?.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }),
  );
  const compactCollapsed = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { name: "Show sidebar" })
    .click();
  await routeContinuityApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(1_180, 820);
  });
  await routeContinuityPage.waitForFunction(
    () => innerWidth === 1_180 && innerHeight === 820,
  );
  const restored = await readRouteState();
  const projectRow = routeContinuityPage
    .locator("[data-project-row-wrapper]")
    .filter({
      has: routeContinuityPage
        .locator(".codex-ui-project-index__label")
        .filter({ hasText: /^codex-ui-kit$/ }),
    });
  await projectRow
    .getByRole("button", { name: "Expand project codex-ui-kit" })
    .click();
  await routeContinuityPage
    .getByRole("button", {
      name: "Open chat Match the current projects index",
    })
    .click();
  await routeContinuityPage.waitForSelector(
    '.demo-root[data-view="workspace"] .demo-project-index-chat-route[data-project-id="codex-ui-kit"][data-chat-id="project-index-parity"]',
  );
  const selectedChat = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { exact: true, name: "Back" })
    .click();
  await routeContinuityPage.waitForSelector(
    '.demo-root[data-view="projects"]',
  );
  const selectionBack = await readRouteState();
  await routeContinuityPage
    .getByRole("button", { exact: true, name: "Forward" })
    .click();
  await routeContinuityPage.waitForSelector(
    '.demo-root[data-view="workspace"] .demo-project-index-chat-route[data-project-id="codex-ui-kit"][data-chat-id="project-index-parity"]',
  );
  const selectionForward = await readRouteState();
  const routeContinuity = {
    back,
    compactCollapsed,
    compactVisible,
    forward,
    projects,
    restored,
    selectedChat,
    selectionBack,
    selectionForward,
  };
  if (
    projects.view !== "projects" ||
    projects.historyIndex !== "1" ||
    projects.historyLength !== "2" ||
    projects.back?.disabled !== false ||
    projects.forward?.disabled !== true ||
    projects.forward?.opacity !== "0.4" ||
    projects.forward?.cursor !== "default" ||
    Math.abs((projects.back?.left ?? Infinity) - 120) > 1 ||
    Math.abs((projects.forward?.left ?? Infinity) - 152) > 1 ||
    back.view !== "workspace" ||
    back.historyIndex !== "0" ||
    back.back?.disabled !== true ||
    back.forward?.disabled !== false ||
    forward.view !== "projects" ||
    forward.historyIndex !== "1" ||
    !forward.projectsVisible ||
    compactVisible.viewport.width !== 720 ||
    !compactVisible.navigationVisible ||
    compactCollapsed.navigationVisible ||
    compactCollapsed.back !== null ||
    compactCollapsed.forward !== null ||
    compactCollapsed.view !== "projects" ||
    restored.viewport.width !== 1_180 ||
    restored.view !== "projects" ||
    !restored.navigationVisible ||
    restored.back?.disabled !== false ||
    restored.forward?.disabled !== true ||
    selectedChat.view !== "workspace" ||
    selectedChat.historyIndex !== "2" ||
    selectedChat.historyLength !== "3" ||
    selectedChat.selectedProjectChat?.projectId !== "codex-ui-kit" ||
    selectedChat.selectedProjectChat?.chatId !== "project-index-parity" ||
    selectionBack.view !== "projects" ||
    selectionBack.historyIndex !== "1" ||
    selectionBack.forward?.disabled !== false ||
    selectionForward.view !== "workspace" ||
    selectionForward.historyIndex !== "2" ||
    selectionForward.selectedProjectChat?.projectId !== "codex-ui-kit" ||
    selectionForward.selectedProjectChat?.chatId !== "project-index-parity"
  ) {
    throw new Error(
      `Electron route continuity contract failed: ${JSON.stringify(routeContinuity)}`,
    );
  }
} finally {
  await routeContinuityApp.close();
}

const notificationQueueScene = {
  frame: "shell-notification-queue",
  id: "electron-shell-notification-queue",
  scenario: "streaming-recovery",
  shellState: "ready",
  view: "shell",
};
const {
  app: notificationQueueApp,
  page: notificationQueuePage,
} = await launchScene(notificationQueueScene, { capture: false });
try {
  const queue = notificationQueuePage.locator(
    ".codex-ui-app-notification-region",
  );
  const frontNotification = notificationQueuePage.locator(
    '.codex-ui-app-notification[data-index="0"]',
  );
  const frontAlert = frontNotification.locator(
    ".codex-ui-app-notification__alert",
  );
  if (
    (await queue.getAttribute("data-total-count")) !== "4" ||
    (await queue.getAttribute("data-visible-count")) !== "3" ||
    (await queue.getAttribute("data-hidden-count")) !== "1" ||
    (await queue.getAttribute("data-position")) !== "top-center" ||
    (await queue.getAttribute("aria-label")) !== "Notifications alt+T" ||
    (await queue.getAttribute("aria-live")) !== "polite" ||
    (await queue
      .locator("[data-sonner-toaster]")
      .getAttribute("data-sonner-theme")) !== "light" ||
    (await notificationQueuePage
      .locator(".codex-ui-app-notification")
      .count()) !== 4 ||
    JSON.stringify(
      await notificationQueuePage
        .locator(".codex-ui-app-notification")
        .evaluateAll((notifications) =>
          notifications.map((notification) =>
            notification.getAttribute("data-visible"),
          ),
        ),
    ) !== JSON.stringify(["true", "true", "true", "false"]) ||
    (await frontNotification.textContent())?.trim() !== "Chat unpinned" ||
    (await frontNotification.getAttribute("data-promise")) !== "false" ||
    (await frontNotification.getAttribute("data-removed")) !== "false" ||
    (await frontNotification.getAttribute("role")) !== null ||
    (await frontNotification.getAttribute("data-swipe-out")) !== "false" ||
    (await frontNotification.getAttribute("data-swiped")) !== "false" ||
    (await frontNotification.getAttribute("data-swiping")) !== "false" ||
    (await frontNotification.getAttribute("tabindex")) !== "0"
  ) {
    throw new Error("Electron notification queue did not enforce its bound.");
  }
  const frontAlertContract = await frontAlert.evaluate((alert) => {
    const rect = alert.getBoundingClientRect();
    const style = getComputedStyle(alert);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      color: style.color,
      height: rect.height,
      iconPaths: Array.from(
        alert.querySelectorAll(
          ".codex-ui-app-notification__leading path",
        ),
        (path) => path.getAttribute("d"),
      ),
      top: rect.top,
      width: rect.width,
    };
  });
  if (
    frontAlertContract.backgroundColor !== "rgb(1, 28, 11)" ||
    frontAlertContract.borderRadius !== "15px" ||
    frontAlertContract.boxShadow !==
      "rgba(0, 0, 0, 0.1) 0px 4px 12px 0px" ||
    frontAlertContract.color !== "rgb(64, 201, 119)" ||
    Math.abs(frontAlertContract.height - 42) > 1 ||
    Math.abs(frontAlertContract.top - 48) > 1 ||
    Math.abs(frontAlertContract.width - 170.4375) > 1 ||
    frontAlertContract.iconPaths.length !== 2
  ) {
    throw new Error(
      `Electron current notification geometry failed: ${JSON.stringify(frontAlertContract)}`,
    );
  }
  await frontNotification.hover();
  const expandedQueueTops = await notificationQueuePage
    .locator('.codex-ui-app-notification[data-visible="true"]')
    .evaluateAll((notifications) =>
      notifications.map((notification) => ({
        expanded: notification.getAttribute("data-expanded"),
        top: notification.getBoundingClientRect().top,
      })),
    );
  if (
    expandedQueueTops.length !== 3 ||
    expandedQueueTops.some(({ expanded }) => expanded !== "true") ||
    !expandedQueueTops.every(
      ({ top }, index, notifications) =>
        index === 0 || top > notifications[index - 1].top,
    )
  ) {
    throw new Error(
      `Electron notification queue did not expand for interaction: ${JSON.stringify(expandedQueueTops)}`,
    );
  }
  await notificationQueuePage
    .getByRole("button", { name: "Review", exact: true })
    .click();
  await notificationQueuePage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const region = document.querySelector(
      ".codex-ui-app-notification-region",
    );
    return (
      root?.getAttribute("data-notification-action") ===
        "permission-reviewed" &&
      region?.getAttribute("data-total-count") === "3" &&
      region?.getAttribute("data-hidden-count") === "0"
    );
  });
  await notificationQueuePage.waitForTimeout(20);
  if (
    (await notificationQueuePage.evaluate(
      () => document.activeElement?.textContent?.trim(),
    )) !== "Open"
  ) {
    throw new Error("Electron notification queue did not preserve focus.");
  }
} finally {
  await notificationQueueApp.close();
}

const notificationSuccessStackScene = {
  frame: "shell-notification-success-stack",
  id: "electron-shell-notification-success-stack",
  scenario: "streaming-recovery",
  shellState: "ready",
  view: "shell",
};
const {
  app: notificationSuccessStackApp,
  page: notificationSuccessStackPage,
} = await launchScene(notificationSuccessStackScene, { capture: false });
try {
  const successNotifications = notificationSuccessStackPage.locator(
    ".codex-ui-app-notification",
  );
  const collapsedSuccessStack = await successNotifications.evaluateAll(
    (notifications) =>
      notifications.map((notification) => {
        const alert = notification.querySelector(
          ".codex-ui-app-notification__alert",
        );
        const rect = alert?.getBoundingClientRect();
        return {
          index: notification.getAttribute("data-index"),
          text: notification.textContent?.trim(),
          tone: notification.getAttribute("data-tone"),
          top: rect?.top,
          visible: notification.getAttribute("data-visible"),
          width: rect?.width,
        };
      }),
  );
  const expectedWidths = [170.4375, 161.9156, 153.3938, 144.8718];
  const expectedTops = [48, 57.05, 66.1, 75.15];
  if (
    collapsedSuccessStack.length !== 4 ||
    collapsedSuccessStack.some(
      (notification, index) =>
        notification.index !== String(index) ||
        notification.text !== "Chat unpinned" ||
        notification.tone !== "success" ||
        notification.visible !== (index < 3 ? "true" : "false") ||
        Math.abs((notification.width ?? Infinity) - expectedWidths[index]) > 1 ||
        Math.abs((notification.top ?? Infinity) - expectedTops[index]) > 1,
    )
  ) {
    throw new Error(
      `Electron current success stack failed: ${JSON.stringify(collapsedSuccessStack)}`,
    );
  }
  await successNotifications.first().hover();
  await notificationSuccessStackPage.waitForTimeout(250);
  const expandedSuccessStack = await successNotifications.evaluateAll(
    (notifications) =>
      notifications.map((notification) => ({
        expanded: notification.getAttribute("data-expanded"),
        opacity: getComputedStyle(notification).opacity,
        pointerEvents: getComputedStyle(notification).pointerEvents,
        top: notification.getBoundingClientRect().top,
        visible: notification.getAttribute("data-visible"),
      })),
  );
  if (
    expandedSuccessStack.length !== 4 ||
    expandedSuccessStack.some(({ expanded }) => expanded !== "true") ||
    expandedSuccessStack.slice(0, 3).some(
      ({ pointerEvents, visible }, index, notifications) =>
        visible !== "true" ||
        pointerEvents !== "auto" ||
        (index > 0 &&
          notifications[index].top - notifications[index - 1].top < 40),
    ) ||
    expandedSuccessStack[3].visible !== "false" ||
    expandedSuccessStack[3].opacity !== "0" ||
    expandedSuccessStack[3].pointerEvents !== "none"
  ) {
    throw new Error(
      `Electron current success stack expansion failed: ${JSON.stringify(expandedSuccessStack)}`,
    );
  }
} finally {
  await notificationSuccessStackApp.close();
}

console.log(
  "Electron host, native-window, current basic message thread, current project-directory creation, coding-workspace routing and persisted/missing-worktree recovery replay, conversation/Composer and current image-attachment lifecycle plus current mixed post-picker and immersive preview interactions and menus, current long, failed, and interrupted command output plus manual context compaction, transport retry/recovery, fatal App Server restart, bounded global notification queue and current success stack, thread summary, replay/live single, concurrent, nested, and mixed-recovery subagent delegation with 4/10 pagination, current mixed Search/Browser/MCP/approval/file/subagent flow, runtime-observed Hooks and package-observed Code review Settings, default 720px narrow reachability, resizable navigation/Review/Terminal/PR detail, PR tabs and expansion, current 26.818 plus 26.820 MCP success/failure/recovery/Sources interaction, MCP disclosure/result/unavailable-fallback, multi-file and mixed-content Review, selection/Undo, large diff scrolling, and compact geometry contracts passed.",
);
