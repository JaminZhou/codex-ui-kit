import { createHash } from "node:crypto";
import { constants, realpathSync } from "node:fs";
import { open } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export const currentBaselineViewports = Object.freeze({
  compact: Object.freeze({ height: 680, width: 720 }),
  medium: Object.freeze({ height: 680, width: 820 }),
  threshold: Object.freeze({ height: 680, width: 721 }),
  wide: Object.freeze({ height: 820, width: 1180 }),
});

export const currentBaselineFingerprint = Object.freeze({
  appAsarBytes: 282_402_769,
  appAsarSha256:
    "c964aebbf9a6a0f70799d01215c611d8ef6ee63f816b3d57beccddd47a811fd9",
  appVersion: "26.820.60940",
  buildNumber: "7119",
  chromiumVersion: "151.0.7922.170",
});

const primaryRoutes = Object.freeze([
  "New chat",
  "Plugins",
  "Pull requests",
  "Scheduled",
  "Sites",
]);

const isMainRendererUrl = (url) =>
  url === "app://-/index.html" || url.startsWith("app://-/index.html?");

const withinTolerance = (value, expected, tolerance = 1) =>
  Number.isFinite(value) && Math.abs(value - expected) <= tolerance;

const sanitizedShapeSha256 = (shapes) => {
  if (
    !Array.isArray(shapes) ||
    shapes.some(
      (shape) =>
        !["circle", "line", "path", "rect"].includes(shape?.tag) ||
        (shape.d !== null && typeof shape.d !== "string"),
    )
  ) {
    return null;
  }
  return createHash("sha256").update(JSON.stringify(shapes)).digest("hex");
};

const currentSidebarWidthBounds = Object.freeze({ max: 520, min: 240 });
const currentSidebarMinimumMainWidth = 240;

const currentSidebarWidthForViewport = (persistedWidth, viewportWidth) =>
  Math.min(
    persistedWidth,
    Math.max(
      currentSidebarWidthBounds.min,
      Math.min(
        currentSidebarWidthBounds.max,
        viewportWidth - currentSidebarMinimumMainWidth,
      ),
    ),
  );

const expectedNewChatGeometry = (viewportWidth, navigationWidth = 0) => {
  const mainWidth = viewportWidth - navigationWidth;
  const editorWidth = Math.min(712, mainWidth - 56);
  return {
    editorLeft: navigationWidth + (mainWidth - editorWidth) / 2,
    editorWidth,
    mainWidth,
  };
};

const appAsarSnapshotFields = Object.freeze([
  "appAsarBytes",
  "appAsarSha256",
  "changedAtMs",
  "device",
  "inode",
]);

const validAppAsarSnapshot = (snapshot) =>
  Number.isSafeInteger(snapshot?.appAsarBytes) &&
  snapshot.appAsarBytes === currentBaselineFingerprint.appAsarBytes &&
  snapshot.appAsarSha256 === currentBaselineFingerprint.appAsarSha256 &&
  Number.isSafeInteger(snapshot.changedAtMs) &&
  snapshot.changedAtMs > 0 &&
  /^\d+$/.test(snapshot.device ?? "") &&
  /^\d+$/.test(snapshot.inode ?? "") &&
  Number.isSafeInteger(snapshot.checkedAtMs) &&
  snapshot.checkedAtMs > 0;

const sameAppAsarSnapshot = (before, after) =>
  appAsarSnapshotFields.every((field) => before[field] === after[field]);

const provesRuntimeBundleIdentity = (runtimeIdentity) => {
  const beforeBundle = runtimeIdentity?.beforeCapture;
  const afterBundle = runtimeIdentity?.afterCapture;
  const processStartedAtMs = runtimeIdentity?.processStartedAtMs;
  const bundleChangedBeforeProcess =
    validAppAsarSnapshot(beforeBundle) &&
    Number.isSafeInteger(processStartedAtMs) &&
    Math.ceil(beforeBundle.changedAtMs / 1_000) * 1_000 <= processStartedAtMs;
  return (
    Number.isSafeInteger(runtimeIdentity?.ownerPid) &&
    runtimeIdentity.ownerPid > 1 &&
    bundleChangedBeforeProcess &&
    validAppAsarSnapshot(afterBundle) &&
    sameAppAsarSnapshot(beforeBundle, afterBundle) &&
    beforeBundle.checkedAtMs >= processStartedAtMs &&
    afterBundle.checkedAtMs >= beforeBundle.checkedAtMs
  );
};

const projectIndexScrollOwnerMatches = (
  owners,
  { clientHeight, height, top },
) => {
  const owner = owners?.[0];
  return (
    owners?.length === 1 &&
    owner?.overflowY === "auto" &&
    withinTolerance(owner?.clientHeight, clientHeight) &&
    withinTolerance(owner?.rect?.height, height) &&
    withinTolerance(owner?.rect?.top, top) &&
    Number.isFinite(owner?.scrollHeight) &&
    owner.scrollHeight > owner.clientHeight
  );
};

export function assertCurrentProjectsIndexObservation(observation) {
  const wide = observation?.wide;
  const compact = observation?.compact;
  if (
    wide?.routePath !== "/projects" ||
    wide?.viewport?.width !== currentBaselineViewports.wide.width ||
    wide?.viewport?.height !== currentBaselineViewports.wide.height ||
    wide?.title?.count !== 1 ||
    !withinTolerance(wide?.title?.rect?.height, 33.59) ||
    wide?.title?.style?.fontSize !== "28px" ||
    wide?.title?.style?.fontWeight !== "400" ||
    wide?.title?.style?.lineHeight !== "33.6px" ||
    wide?.search?.count !== 1 ||
    wide?.search?.placeholder !== "Search projects" ||
    !withinTolerance(wide?.search?.rect?.width, 688) ||
    !withinTolerance(wide?.search?.rect?.height, 18) ||
    !withinTolerance(wide?.header?.rect?.width, 736) ||
    !withinTolerance(wide?.header?.rect?.height, 40) ||
    wide?.header?.gridTemplateColumns !== "512px 64px 128px" ||
    !Number.isInteger(wide?.rows?.count) ||
    wide.rows.count < 1 ||
    !withinTolerance(wide?.rows?.firstRect?.width, 736) ||
    !withinTolerance(wide?.rows?.firstRect?.height, 70) ||
    wide?.updatedDisplay === "none" ||
    wide?.navigationVisible !== true ||
    Math.abs(wide?.horizontalOverflow ?? Infinity) > 1 ||
    !projectIndexScrollOwnerMatches(wide?.scrollOwners, {
      clientHeight: 774,
      height: 774,
      top: 46,
    })
  ) {
    throw new Error(
      `Current Projects observation does not prove the wide route geometry: ${JSON.stringify(wide)}`,
    );
  }
  if (
    compact?.routePath !== "/projects" ||
    compact?.viewport?.width !== 600 ||
    compact?.viewport?.height !== 600 ||
    compact?.navigationVisible !== false ||
    compact?.navigationWidth !== null ||
    compact?.header?.rect?.width !== 559 ||
    !withinTolerance(compact?.header?.rect?.height, 40) ||
    compact?.header?.gridTemplateColumns !== "415px 128px" ||
    !Number.isInteger(compact?.rows?.count) ||
    compact.rows.count !== wide.rows.count ||
    compact?.rows?.firstRect?.width !== 559 ||
    !withinTolerance(compact?.rows?.firstRect?.height, 70) ||
    compact?.updatedDisplay !== "none" ||
    Math.abs(compact?.horizontalOverflow ?? Infinity) > 1 ||
    !projectIndexScrollOwnerMatches(compact?.scrollOwners, {
      clientHeight: 554,
      height: 554,
      top: 46,
    })
  ) {
    throw new Error(
      `Current Projects observation does not prove the compact route geometry: ${JSON.stringify(compact)}`,
    );
  }
  const sort = observation?.sort;
  if (
    sort?.initial?.name?.active !== false ||
    sort.initial.name.descending !== false ||
    sort.initial.updated?.active !== true ||
    sort.initial.updated.descending !== true ||
    sort?.nameAscending?.name?.active !== true ||
    sort.nameAscending.name.descending !== false ||
    sort.nameAscending.updated?.active !== false ||
    sort?.nameDescending?.name?.active !== true ||
    sort.nameDescending.name.descending !== true ||
    sort.nameDescending.updated?.active !== false ||
    sort?.restored?.name?.active !== false ||
    sort.restored.updated?.active !== true ||
    sort.restored.updated.descending !== true
  ) {
    throw new Error(
      `Current Projects observation does not prove the sort cycle: ${JSON.stringify(sort)}`,
    );
  }
  if (
    observation?.empty?.rowCount !== 0 ||
    observation.empty.emptyMessageCount !== 1 ||
    observation.empty.focusOnSearch !== true
  ) {
    throw new Error(
      `Current Projects observation does not prove the settled empty state: ${JSON.stringify(observation?.empty)}`,
    );
  }
  const expanded = observation?.expanded;
  const expandedContentDelta =
    expanded?.wrapperHeight - expanded?.collapsedWrapperHeight;
  if (
    expanded?.expandedCount !== 1 ||
    expanded.focusOnToggle !== true ||
    expanded.recentGroupCount !== 1 ||
    !Number.isFinite(expanded.collapsedWrapperHeight) ||
    expanded.collapsedWrapperHeight < 24 ||
    !Number.isFinite(expanded.recentGroupHeight) ||
    expanded.recentGroupHeight < 24 ||
    !Number.isFinite(expandedContentDelta) ||
    expandedContentDelta < expanded.recentGroupHeight ||
    expandedContentDelta > expanded.recentGroupHeight + 24 ||
    expanded.wrapperHeight <= expanded.collapsedWrapperHeight ||
    observation?.collapsed?.expandedCount !== 0 ||
    observation.collapsed.focusOnToggle !== true
  ) {
    throw new Error(
      `Current Projects observation does not prove expansion and focus continuity: ${JSON.stringify({ collapsed: observation?.collapsed, expanded: observation?.expanded })}`,
    );
  }
}

export function assertCurrentSidebarLifecycle(lifecycle) {
  const baseline = lifecycle?.baseline;
  const projectMenu = lifecycle?.projectMenu;
  const helpMenu = lifecycle?.helpMenu;
  const responsive = lifecycle?.responsive;
  const states = [
    lifecycle?.pointerCollapsed,
    lifecycle?.enterExpanded,
    lifecycle?.spaceCollapsed,
    lifecycle?.spaceExpanded,
    responsive?.compactVisibleBeforeCollapse,
    responsive?.compactCollapsed,
    responsive?.compactPinned,
    responsive?.wideRestored,
    responsive?.keyboardRestored,
  ];
  const persistedNavigationWidth = baseline?.navigationWidth;
  if (
    !Number.isInteger(baseline?.projectGroupCount) ||
    baseline.projectGroupCount < 1 ||
    !Number.isInteger(baseline?.expandedProjectGroupCount) ||
    baseline.expandedProjectGroupCount < 1 ||
    baseline.expandedProjectGroupCount > baseline.projectGroupCount ||
    baseline?.projectRow?.tag !== "div" ||
    baseline?.projectRow?.role !== "button" ||
    baseline?.projectRow?.tabIndex !== 0 ||
    !withinTolerance(baseline?.projectRow?.rect?.height, 30) ||
    !Number.isFinite(persistedNavigationWidth) ||
    persistedNavigationWidth < currentSidebarWidthBounds.min ||
    persistedNavigationWidth > currentSidebarWidthBounds.max ||
    !withinTolerance(
      baseline?.projectRow?.rect?.width,
      persistedNavigationWidth - 16,
    ) ||
    baseline?.settingsControlCount !== 0 ||
    baseline?.helpControlCount !== 1 ||
    Math.abs(baseline?.horizontalOverflow ?? Infinity) > 1
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove the project-group baseline: ${JSON.stringify(baseline)}`,
    );
  }
  if (
    states.some((state) => !state) ||
    lifecycle.pointerCollapsed.expanded !== false ||
    !lifecycle.pointerCollapsed.focusOnRow ||
    lifecycle.enterExpanded.expanded !== true ||
    !lifecycle.enterExpanded.focusOnRow ||
    lifecycle.spaceCollapsed.expanded !== false ||
    !lifecycle.spaceCollapsed.focusOnRow ||
    lifecycle.spaceExpanded.expanded !== true ||
    !lifecycle.spaceExpanded.focusOnRow
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove pointer and keyboard expansion: ${JSON.stringify({
        enterExpanded: lifecycle?.enterExpanded,
        pointerCollapsed: lifecycle?.pointerCollapsed,
        spaceCollapsed: lifecycle?.spaceCollapsed,
        spaceExpanded: lifecycle?.spaceExpanded,
      })}`,
    );
  }
  const markReadItem = projectMenu?.items?.find(
    (item) => item.id === "mark-project-threads-read",
  );
  const expectedProjectMenuItems = [
    ["unpin-project", "sidebarElectron.unpinProjectShort", "Unpin", "item"],
    ["edit-project", "sidebarElectron.editProjectShort", "Edit", "item"],
    ["project-actions-separator", null, null, "separator"],
    [
      "reveal-project-folder",
      "sidebarElectron.openWorkspaceRootInFinder",
      "Reveal in Finder",
      "item",
    ],
    [
      "create-permanent-worktree",
      "sidebarElectron.createStableWorktree",
      "Create permanent worktree",
      "item",
    ],
    ["project-chat-actions-separator", null, null, "separator"],
    ...(markReadItem
      ? [
          [
            "mark-project-threads-read",
            "sidebarElectron.markProjectThreadsRead",
            "Mark all as read",
            "item",
          ],
        ]
      : []),
    [
      "archive-project-threads",
      "sidebarElectron.archiveProjectThreads",
      "Archive chats",
      "item",
    ],
    ["project-remove-separator", null, null, "separator"],
    [
      "remove-project",
      "sidebarElectron.removeProject.menuItem.local",
      "Remove project",
      "item",
    ],
  ];
  const projectMenuItemsMatch =
    projectMenu?.items?.length === expectedProjectMenuItems.length &&
    projectMenu.items.every((item, index) => {
      const [id, messageId, defaultMessage, type] =
        expectedProjectMenuItems[index];
      const isSeparator = type === "separator";
      return (
        item.id === id &&
        item.messageId === messageId &&
        item.defaultMessage === defaultMessage &&
        item.type === type &&
        item.enabled === true &&
        item.hasIcon === !isSeparator &&
        item.hasOnSelect === !isSeparator
      );
    });
  if (
    projectMenu?.renderMode !== "electron-native-context-menu" ||
    projectMenu.bridge?.available !== true ||
    projectMenu.bridge?.frozen !== true ||
    projectMenu.trigger?.tag !== "button" ||
    projectMenu.trigger?.ariaHaspopup !== "menu" ||
    projectMenu.trigger?.ariaExpanded !== "false" ||
    !withinTolerance(projectMenu.trigger?.rect?.width, 24) ||
    !withinTolerance(projectMenu.trigger?.rect?.height, 24) ||
    !projectMenuItemsMatch
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove the project menu boundary: ${JSON.stringify(projectMenu)}`,
    );
  }
  if (
    helpMenu?.opened?.visibleMenuCount !== 1 ||
    helpMenu.opened.menuItemCount !== 8 ||
    !helpMenu.opened.focusInside ||
    helpMenu.opened.focusRole !== "menu" ||
    !withinTolerance(helpMenu.opened.rect?.width, 320) ||
    !withinTolerance(helpMenu.opened.rect?.height, 272.06) ||
    helpMenu.closed?.visibleMenuCount !== 0 ||
    helpMenu.closed.focusReturned !== true
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove the Help menu boundary: ${JSON.stringify(helpMenu)}`,
    );
  }
  const compactNavigationWidth = currentSidebarWidthForViewport(
    persistedNavigationWidth,
    currentBaselineViewports.compact.width,
  );
  if (
    responsive.compactVisibleBeforeCollapse.navigationVisible !== true ||
    !withinTolerance(
      responsive.compactVisibleBeforeCollapse.navigationWidth,
      compactNavigationWidth,
    ) ||
    responsive.compactVisibleBeforeCollapse.showSidebarCount !== 0 ||
    responsive.compactVisibleBeforeCollapse.projectExpanded !== false ||
    Math.abs(
      responsive.compactVisibleBeforeCollapse.horizontalOverflow ?? Infinity,
    ) > 1 ||
    responsive.compactCollapsed.navigationVisible !== false ||
    responsive.compactCollapsed.showSidebarCount !== 1 ||
    responsive.compactCollapsed.projectExpanded !== false ||
    Math.abs(responsive.compactCollapsed.horizontalOverflow ?? Infinity) > 1 ||
    responsive.compactPinned.navigationVisible !== true ||
    !withinTolerance(
      responsive.compactPinned.navigationWidth,
      compactNavigationWidth,
    ) ||
    responsive.compactPinned.projectExpanded !== false ||
    Math.abs(responsive.compactPinned.horizontalOverflow ?? Infinity) > 1 ||
    responsive.wideRestored.navigationVisible !== true ||
    !withinTolerance(
      responsive.wideRestored.navigationWidth,
      persistedNavigationWidth,
    ) ||
    responsive.wideRestored.projectExpanded !== false ||
    Math.abs(responsive.wideRestored.horizontalOverflow ?? Infinity) > 1 ||
    responsive.keyboardRestored.expanded !== true ||
    !responsive.keyboardRestored.focusOnRow
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove responsive state continuity: ${JSON.stringify(responsive)}`,
    );
  }
}

export function resolveCurrentBaselineOutputPath(profilePath, outputPath) {
  const normalizedProfile = realpathSync(profilePath);
  const normalizedOutput = resolve(outputPath);
  let normalizedParent;
  try {
    normalizedParent = realpathSync(dirname(normalizedOutput));
  } catch {
    throw new Error(
      "The optional capture output must be a direct child of the isolated profile.",
    );
  }
  if (normalizedParent !== normalizedProfile) {
    throw new Error(
      "The optional capture output must be a direct child of the isolated profile.",
    );
  }
  return resolve(normalizedParent, basename(normalizedOutput));
}

export async function writeCurrentBaselineOutput(
  profilePath,
  outputPath,
  contents,
) {
  const normalizedOutput = resolveCurrentBaselineOutputPath(
    profilePath,
    outputPath,
  );
  let handle;
  try {
    handle = await open(
      normalizedOutput,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW |
        constants.O_WRONLY,
      0o600,
    );
    await handle.writeFile(contents, "utf8");
  } catch (error) {
    throw new Error(
      "The optional capture output must be a new non-symlink file inside the isolated profile.",
      { cause: error },
    );
  } finally {
    await handle?.close();
  }
}

export async function runBestEffortCurrentBaselineCleanup(steps) {
  const failures = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch {
      failures.push(step.name);
    }
  }
  return failures;
}

export function assertCurrentAccountMenuRecord(record) {
  const expectedStateKeys = [
    "darkCompact",
    "darkWide",
    "lightCompact",
    "lightWide",
  ];
  const fingerprintMismatch = Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => record?.fingerprint?.[key] !== expected,
  );
  const runtimeIdentity = record?.runtimeBundleIdentity;
  if (
    fingerprintMismatch ||
    !Number.isSafeInteger(record?.profileOwnerPid) ||
    record.profileOwnerPid <= 1 ||
    runtimeIdentity?.ownerPid !== record.profileOwnerPid ||
    !provesRuntimeBundleIdentity(runtimeIdentity) ||
    record?.restoredPreference !== "System" ||
    JSON.stringify(Object.keys(record?.states ?? {}).sort()) !==
      JSON.stringify(expectedStateKeys)
  ) {
    throw new Error(
      "Current account-menu record does not prove the isolated current build and restored preference.",
    );
  }

  const expectedLabels = [
    "<account>",
    "Usage <dynamic>",
    "Show pet",
    "Invite a friend",
    "Settings⌘,",
    "Log out",
  ];
  const expectedSvgGeometry = [
    [],
    [
      {
        shapeSha256:
          "34bf60b8f723ce29108d666e0d986df83ac517d0ea1c1819f391ffd30658e299",
        viewBox: "0 0 20 20",
      },
    ],
    [
      {
        shapeSha256:
          "9841028b4294451d1bb03f57f1a3af1962c698dd5fb954c32f9ca7e6b774a0ae",
        viewBox: "0 0 24 24",
      },
    ],
    [
      {
        shapeSha256:
          "807c6c99243f28084e80764a180e3b467b5cf03eccde3c65e76c1dd36bc7fb4e",
        viewBox: "0 0 16 16",
      },
    ],
    [
      {
        shapeSha256:
          "65555b51ea39b9e7b21e1e8b1e77779c64c5e9729a12581be2cab78a938a20f4",
        viewBox: "0 0 20 20",
      },
    ],
    [
      {
        shapeSha256:
          "4c7f061498fb83c30e5f24ff410cd44a0419b1578492c739d97bdf825bfd4fa2",
        viewBox: "0 0 21 21",
      },
    ],
  ];
  for (const [key, state] of Object.entries(record.states)) {
    const compact = key.endsWith("Compact");
    const theme = key.startsWith("light") ? "light" : "dark";
    const viewport = compact
      ? currentBaselineViewports.compact
      : currentBaselineViewports.wide;
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
      theme === "light"
        ? "oklab(0.999994 0.0000455678 0.0000200868 / 0.9)"
        : "oklab(0.297161 0.0000135154 0.00000594556 / 0.9)";
    const expectedColor =
      theme === "light" ? "rgb(26, 28, 31)" : "rgb(223, 223, 223)";
    const svgGeometry = state?.svgGeometry?.map((icons) =>
      icons.map((icon) => ({
        shapeSha256: sanitizedShapeSha256(icon?.shapes),
        viewBox: icon?.viewBox,
      })),
    );
    if (
      state?.theme?.toLowerCase() !== theme ||
      state.colorScheme !== theme ||
      state.compact !== compact ||
      state.viewport?.width !== viewport.width ||
      state.viewport?.height !== viewport.height ||
      state.focusRole !== "menu" ||
      state.focusReturned !== true ||
      Math.abs(state.horizontalOverflow ?? Infinity) > 1 ||
      state.imageCount !== 1 ||
      state.itemCount !== 6 ||
      state.separatorCount !== 0 ||
      JSON.stringify(state.labels) !== JSON.stringify(expectedLabels) ||
      !withinTolerance(state.sidebarRect?.left, 0) ||
      !withinTolerance(state.sidebarRect?.top, 46) ||
      !withinTolerance(state.sidebarRect?.width, 322.90625) ||
      !withinTolerance(state.sidebarRect?.height, compact ? 634 : 774) ||
      !withinTolerance(state.menuRect?.left, 9) ||
      !withinTolerance(state.menuRect?.top, expectedTop) ||
      !withinTolerance(state.menuRect?.width, 306.90625) ||
      !withinTolerance(state.menuRect?.height, 188.375) ||
      !withinTolerance(state.triggerRect?.left, 8) ||
      !withinTolerance(state.triggerRect?.top, compact ? 642.5 : 782.5) ||
      !withinTolerance(state.triggerRect?.height, 29) ||
      !Number.isFinite(state.triggerRect?.width) ||
      state.triggerRect.width < 150 ||
      state.triggerRect.left + state.triggerRect.width >
        state.sidebarRect.left + state.sidebarRect.width ||
      !Number.isInteger(state.triggerTextLength) ||
      state.triggerTextLength < 1 ||
      state.menuStyle?.backgroundColor !== expectedBackground ||
      state.menuStyle?.borderRadius !== "15px" ||
      state.menuStyle?.color !== expectedColor ||
      !state.menuStyle?.boxShadow?.includes(
        theme === "light"
          ? "rgba(26, 28, 31, 0.08)"
          : "rgba(255, 255, 255, 0.082)",
      ) ||
      state.itemRects?.length !== 6 ||
      state.itemRects.some(
        (rect, index) =>
          !withinTolerance(rect?.left, 13) ||
          !withinTolerance(rect?.top, expectedItemTops[index]) ||
          !withinTolerance(rect?.width, 298.90625) ||
          !withinTolerance(rect?.height, 28.5625),
      ) ||
      state.itemStyles?.length !== 6 ||
      state.itemStyles.some(
        (style) =>
          style.backgroundColor !== "rgba(0, 0, 0, 0)" ||
          style.borderRadius !== "12.5px" ||
          style.fontFamily !==
            '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
          style.fontSize !== "13px" ||
          style.fontWeight !== "400" ||
          style.lineHeight !== "18.5714px" ||
          style.padding !== "5px 8px",
      ) ||
      JSON.stringify(svgGeometry) !== JSON.stringify(expectedSvgGeometry)
    ) {
      throw new Error(
        `Current account-menu ${key} observation does not match the current contract: ${JSON.stringify(state)}`,
      );
    }
  }
}

const currentSidebarActionIconHashes = Object.freeze({
  archive: "e66561a77c7b18a98bd47c2c8aefee8a95599d50a78b18772d528ecce63a70ea",
  pin: "5013a14576663d34d622cc3e478cf5051a9524cc4de77804658975a436c347ec",
});

const currentSidebarScreenshotNames = Object.freeze([
  "active-status.png",
  "project-actions.png",
  "recents-actions.png",
  "show-more.png",
  "unread-status.png",
  "waiting-status.png",
]);

const validCurrentSidebarScreenshot = (screenshot, name, width) =>
  screenshot?.name === name &&
  screenshot?.width === width &&
  screenshot?.height === 30 &&
  /^[a-f0-9]{64}$/.test(screenshot?.sha256 ?? "");

const validCurrentSidebarBoxScreenshot = (
  screenshot,
  name,
  width,
  height,
) =>
  screenshot?.name === name &&
  screenshot?.width === width &&
  screenshot?.height === height &&
  /^[a-f0-9]{64}$/.test(screenshot?.sha256 ?? "");

const currentSidebarActionObservationMatches = (
  observation,
  expectedSourceStatus,
) => {
  const buttons = observation?.buttons;
  return (
    (Array.isArray(expectedSourceStatus)
      ? expectedSourceStatus.includes(observation?.sourceStatus)
      : observation?.sourceStatus === expectedSourceStatus) &&
    observation?.rowRect?.width !== undefined &&
    withinTolerance(observation.rowRect.width, 306.90625) &&
    withinTolerance(observation.rowRect.height, 30) &&
    observation?.toolbarRect?.top === 0 &&
    withinTolerance(observation?.toolbarRect?.height, 30, 0.1) &&
    withinTolerance(observation?.toolbarRect?.width, 52, 0.1) &&
    withinTolerance(observation?.toolbarRect?.rightInset, 2, 0.1) &&
    Array.isArray(buttons) &&
    buttons.length === 2 &&
    buttons[0]?.category === "pin" &&
    buttons[1]?.category === "archive" &&
    buttons.every(
      (button, index) =>
        withinTolerance(button?.rect?.height, 20, 0.1) &&
        withinTolerance(button?.rect?.top, 5, 0.1) &&
        withinTolerance(button?.rect?.width, 19, 0.1) &&
        withinTolerance(
          button?.rect?.rightInset,
          index === 0 ? 35 : 8,
          0.1,
        ) &&
        button?.icon?.height === "16px" &&
        button?.icon?.width === "16px" &&
        button?.icon?.viewBox === "0 0 20 20" &&
        button?.icon?.shapeSha256 ===
          currentSidebarActionIconHashes[button.category],
    ) &&
    withinTolerance(buttons[1].rect.left - buttons[0].rect.right, 8, 0.1)
  );
};

export function assertCurrentSidebarRowsRecord(record) {
  const fingerprintMismatch = Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => record?.fingerprint?.[key] !== expected,
  );
  const runtimeIdentity = record?.runtimeBundleIdentity;
  const candidateUrls = record?.targetSelection?.candidates?.map(
    (candidate) => candidate?.url,
  );
  const allowedCandidateUrls = new Set([
    "app://-/index.html",
    "app://-/index.html?initialRoute=%2Favatar-overlay",
    "app://-/index.html?redacted",
    "non-app-page",
  ]);
  const serialized = JSON.stringify(record);
  if (
    record?.schemaVersion !== 1 ||
    record?.captureKind !== "renderer_cdp" ||
    fingerprintMismatch ||
    !Number.isSafeInteger(record?.profileOwnerPid) ||
    record.profileOwnerPid <= 1 ||
    runtimeIdentity?.ownerPid !== record.profileOwnerPid ||
    !provesRuntimeBundleIdentity(runtimeIdentity) ||
    !Array.isArray(candidateUrls) ||
    candidateUrls.length < 1 ||
    candidateUrls.some((url) => !allowedCandidateUrls.has(url)) ||
    record?.targetSelection?.selected?.url !== "app://-/index.html" ||
    record?.restoredRoute !== "New chat" ||
    record?.privacyBoundary !==
      "disposable-title-hash-counts-generic-actions-geometry-styles-only" ||
    /"(?:hostId|profilePath|projectName|threadId|title)"\s*:/.test(serialized)
  ) {
    throw new Error(
      "Current sidebar-row record does not prove the isolated current build and privacy boundary.",
    );
  }

  const summary = record.rowSummary;
  const kindCount = Object.values(summary?.kinds ?? {}).reduce(
    (total, value) => total + value,
    0,
  );
  if (
    summary?.viewport?.width !== currentBaselineViewports.wide.width ||
    summary?.viewport?.height !== currentBaselineViewports.wide.height ||
    !withinTolerance(summary?.sidebarRect?.left, 0) ||
    !withinTolerance(summary?.sidebarRect?.top, 46) ||
    !withinTolerance(summary?.sidebarRect?.width, 322.90625) ||
    !withinTolerance(summary?.sidebarRect?.height, 774) ||
    !Number.isInteger(summary?.totalRows) ||
    summary.totalRows < 4 ||
    !Number.isInteger(summary?.projectRows) ||
    summary.projectRows < 1 ||
    !Number.isInteger(summary?.recentRows) ||
    summary.recentRows < 1 ||
    !Number.isInteger(summary?.pinnedRows) ||
    summary.pinnedRows < 0 ||
    summary.projectRows + summary.recentRows !== summary.totalRows ||
    summary.pinnedRows > summary.totalRows ||
    kindCount !== summary.totalRows ||
    Object.values(summary?.kinds ?? {}).some(
      (count) => !Number.isInteger(count) || count < 1,
    ) ||
    Object.keys(summary?.kinds ?? {}).some(
      (kind) => !["cloud", "local", "worktree"].includes(kind),
    ) ||
    JSON.stringify(summary?.rowHeights) !== JSON.stringify([30]) ||
    summary?.rowWidths?.length !== 1 ||
    !withinTolerance(summary.rowWidths[0], 306.90625) ||
    !Number.isInteger(summary?.titleLengthRange?.min) ||
    summary.titleLengthRange.min < 1 ||
    !Number.isInteger(summary?.titleLengthRange?.max) ||
    summary.titleLengthRange.max < summary.titleLengthRange.min ||
    summary.titleLengthRange.max > 256 ||
    !Number.isInteger(summary?.selectedRows) ||
    summary.selectedRows < 0 ||
    summary.selectedRows > 1 ||
    !Number.isInteger(summary?.statusCounts?.active) ||
    summary.statusCounts.active < 1 ||
    !Number.isInteger(summary?.statusCounts?.unread) ||
    summary.statusCounts.unread < 1 ||
    summary?.statusCounts?.waitingApproval !== 1 ||
    Math.abs(summary?.horizontalOverflow ?? Infinity) > 1
  ) {
    throw new Error(
      `Current sidebar-row summary does not match the current contract: ${JSON.stringify(summary)}`,
    );
  }

  const active = record.statuses?.active;
  if (
    !["running", "waitingOnApproval"].includes(active?.sourceStatus) ||
    !withinTolerance(active?.rowRect?.width, 306.90625) ||
    !withinTolerance(active?.rowRect?.height, 30) ||
    !withinTolerance(active?.railRect?.width, 20) ||
    !withinTolerance(active?.railRect?.height, 20) ||
    !withinTolerance(active?.railRect?.top, 5) ||
    !withinTolerance(active?.railRect?.rightInset, 8) ||
    active?.spinner?.cssHeight !== "16px" ||
    active?.spinner?.cssWidth !== "16px" ||
    active?.spinner?.viewBox !== "0 0 24 24" ||
    active?.spinner?.pathCount !== 2 ||
    active?.spinner?.shapeSha256 !==
      "6806e63489028f080d9c4cc0468782d4ac40edb5ead946e8fd7f5fa156a8cb33" ||
    active?.spinner?.animationDuration !== "2s" ||
    active?.spinner?.animationIterationCount !== "infinite" ||
    active?.spinner?.color !==
      "oklab(0.903646 0.0000412762 0.0000180602 / 0.595)"
  ) {
    throw new Error(
      `Current sidebar active observation does not match the current contract: ${JSON.stringify(active)}`,
    );
  }

  const unread = record.statuses?.unread;
  if (
    !withinTolerance(unread?.rowRect?.width, 306.90625) ||
    !withinTolerance(unread?.rowRect?.height, 30) ||
    !withinTolerance(unread?.railRect?.width, 20) ||
    !withinTolerance(unread?.railRect?.height, 20) ||
    !withinTolerance(unread?.railRect?.top, 5) ||
    !withinTolerance(unread?.railRect?.rightInset, 8) ||
    !withinTolerance(unread?.dotRect?.width, 8) ||
    !withinTolerance(unread?.dotRect?.height, 8) ||
    !withinTolerance(unread?.dotRect?.top, 11) ||
    !withinTolerance(unread?.dotRect?.rightInset, 14) ||
    unread?.dotStyle?.backgroundColor !== "rgb(131, 195, 255)" ||
    unread?.dotStyle?.borderRadius !== "9999px"
  ) {
    throw new Error(
      `Current sidebar unread observation does not match the current contract: ${JSON.stringify(unread)}`,
    );
  }

  const waiting = record.statuses?.waiting;
  if (
    waiting?.sourceStatus !== "waitingOnApproval" ||
    !Number.isInteger(waiting?.titleLength) ||
    waiting.titleLength < 1 ||
    waiting.titleLength > 256 ||
    !/^[a-f0-9]{64}$/.test(waiting?.titleSha256 ?? "") ||
    !withinTolerance(waiting?.rowRect?.width, 306.90625) ||
    !withinTolerance(waiting?.rowRect?.height, 30) ||
    !withinTolerance(waiting?.railRect?.width, 20) ||
    !withinTolerance(waiting?.railRect?.height, 20) ||
    !withinTolerance(waiting?.railRect?.top, 5) ||
    !withinTolerance(waiting?.railRect?.rightInset, 8) ||
    waiting?.spinner?.cssHeight !== "16px" ||
    waiting?.spinner?.cssWidth !== "16px" ||
    waiting?.spinner?.viewBox !== "0 0 24 24" ||
    waiting?.spinner?.pathCount !== 2 ||
    waiting?.spinner?.shapeSha256 !== active?.spinner?.shapeSha256 ||
    waiting?.spinner?.animationDuration !== "2s" ||
    waiting?.spinner?.animationIterationCount !== "infinite" ||
    waiting?.spinner?.color !== active?.spinner?.color
  ) {
    throw new Error(
      `Current sidebar waiting observation does not match the current spinner contract: ${JSON.stringify(waiting)}`,
    );
  }

  const collection = record.collection;
  const beforeExpansion = collection?.beforeExpansion;
  const afterExpansion = collection?.afterExpansion;
  if (
    beforeExpansion?.rowCount !== 5 ||
    beforeExpansion?.showMoreCount !== 1 ||
    beforeExpansion?.showLessCount !== 0 ||
    beforeExpansion?.itemRole !== "listitem" ||
    beforeExpansion?.listRole !== "list" ||
    !withinTolerance(beforeExpansion?.itemRect?.width, 306.90625) ||
    !withinTolerance(beforeExpansion?.itemRect?.height, 32) ||
    !withinTolerance(beforeExpansion?.buttonRect?.left, 23) ||
    !withinTolerance(beforeExpansion?.buttonRect?.top, 4) ||
    !withinTolerance(beforeExpansion?.buttonRect?.width, 90.171875) ||
    !withinTolerance(beforeExpansion?.buttonRect?.height, 24) ||
    beforeExpansion?.toggleAttributes?.type !== "button" ||
    beforeExpansion?.toggleAttributes?.ariaControls !== null ||
    beforeExpansion?.toggleAttributes?.ariaExpanded !== null ||
    beforeExpansion?.toggleAttributes?.role !== null ||
    beforeExpansion?.buttonStyle?.backgroundColor !== "rgba(0, 0, 0, 0)" ||
    beforeExpansion?.buttonStyle?.borderRadius !== "9999px" ||
    beforeExpansion?.buttonStyle?.color !== "rgba(255, 255, 255, 0.498)" ||
    beforeExpansion?.buttonStyle?.fontFamily !==
      '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
    beforeExpansion?.buttonStyle?.fontSize !== "14px" ||
    beforeExpansion?.buttonStyle?.fontWeight !== "400" ||
    beforeExpansion?.buttonStyle?.lineHeight !== "18px" ||
    beforeExpansion?.buttonStyle?.padding !== "2px 8px" ||
    beforeExpansion?.buttonStyle?.textAlign !== "center" ||
    !Number.isInteger(afterExpansion?.rowCount) ||
    afterExpansion.rowCount <= beforeExpansion.rowCount ||
    afterExpansion?.showLessCount !== 0
  ) {
    throw new Error(
      `Current sidebar collection does not match the one-way Show more contract: ${JSON.stringify(collection)}`,
    );
  }

  for (const variant of ["project", "recents"]) {
    if (
      !currentSidebarActionObservationMatches(
        record.actions?.[variant],
        variant === "project"
          ? ["active", "waitingOnApproval"]
          : "idle",
      )
    ) {
      throw new Error(
        `Current sidebar ${variant} actions do not match the current contract: ${JSON.stringify(record.actions?.[variant])}`,
      );
    }
  }

  const screenshots = record.screenshots;
  if (
    !validCurrentSidebarScreenshot(
      screenshots?.activeStatus,
      currentSidebarScreenshotNames[0],
      28,
    ) ||
    !validCurrentSidebarScreenshot(
      screenshots?.projectActions,
      currentSidebarScreenshotNames[1],
      72,
    ) ||
    !validCurrentSidebarScreenshot(
      screenshots?.recentsActions,
      currentSidebarScreenshotNames[2],
      72,
    ) ||
    !validCurrentSidebarBoxScreenshot(
      screenshots?.showMore,
      currentSidebarScreenshotNames[3],
      140,
      32,
    ) ||
    !validCurrentSidebarScreenshot(
      screenshots?.unreadStatus,
      currentSidebarScreenshotNames[4],
      28,
    ) ||
    !validCurrentSidebarScreenshot(
      screenshots?.waitingStatus,
      currentSidebarScreenshotNames[5],
      28,
    )
  ) {
    throw new Error(
      "Current sidebar-row screenshots do not prove the six privacy-safe regions.",
    );
  }
}

export function selectCurrentMainCandidate(candidates) {
  const eligible = candidates
    .filter(
      (candidate) =>
        isMainRendererUrl(candidate.url) &&
        candidate.area >= 300_000 &&
        candidate.landmarks.main >= 1 &&
        (candidate.landmarks.nav === 1 ||
          candidate.landmarks.sidebarTrigger >= 1) &&
        candidate.visibleControls >= 10,
    )
    .sort((left, right) => right.area - left.area);

  if (eligible.length === 0) {
    throw new Error(
      "Main Codex Renderer target not found by URL, area, shell landmarks, and interactive density.",
    );
  }
  if (eligible[1] && eligible[0].area < eligible[1].area * 1.25) {
    throw new Error(
      "Main Codex Renderer target is ambiguous after structural ranking.",
    );
  }
  return eligible[0];
}

export function assertCurrentBaselineRecord(record) {
  if (record?.schemaVersion !== 1) {
    throw new Error("Current baseline record must use schema version 1.");
  }
  const fingerprintMismatch = Object.entries(currentBaselineFingerprint).some(
    ([key, expected]) => record.baseline?.[key] !== expected,
  );
  if (fingerprintMismatch) {
    throw new Error(
      "Current baseline record does not match the promoted build fingerprint.",
    );
  }
  const runtimeIdentity = record.runtimeBundleIdentity;
  if (!provesRuntimeBundleIdentity(runtimeIdentity)) {
    throw new Error(
      "Current baseline record does not prove the running Renderer bundle identity.",
    );
  }

  assertCurrentSidebarLifecycle(record.sidebarLifecycle);
  assertCurrentProjectsIndexObservation(record.projectsIndexObservation);
  if (
    record.captureKind !== "renderer_emulation" ||
    !isMainRendererUrl(record.targetSelection?.selected?.url ?? "")
  ) {
    throw new Error(
      "Current baseline record must identify the exact main Renderer and evidence kind.",
    );
  }
  const expectedStates = [
    "wideNewChat",
    "mediumNewChat",
    "thresholdNewChat",
    "compactVisibleBeforeCollapse",
    "compactCollapsed",
    "compactPinned",
    "compactPullRequests",
    "compactRestored",
  ];
  const expectedViewportByState = {
    compactCollapsed: currentBaselineViewports.compact,
    compactPinned: currentBaselineViewports.compact,
    compactPullRequests: currentBaselineViewports.compact,
    compactRestored: currentBaselineViewports.compact,
    compactVisibleBeforeCollapse: currentBaselineViewports.compact,
    mediumNewChat: currentBaselineViewports.medium,
    thresholdNewChat: currentBaselineViewports.threshold,
    wideNewChat: currentBaselineViewports.wide,
  };
  if (expectedStates.some((state) => !record.states?.[state])) {
    throw new Error("Current baseline record is missing a required state.");
  }
  if (
    Object.entries(expectedViewportByState).some(
      ([state, expected]) =>
        record.states[state].viewport?.height !== expected.height ||
        record.states[state].viewport?.width !== expected.width,
    )
  ) {
    throw new Error(
      "Current baseline record does not satisfy the required viewport matrix.",
    );
  }
  if (
    expectedStates.some(
      (state) => record.states[state].colorScheme !== "dark",
    )
  ) {
    throw new Error(
      "Current baseline record must use the expected dark color scheme in every state.",
    );
  }
  const wide = record.states.wideNewChat;
  const medium = record.states.mediumNewChat;
  const threshold = record.states.thresholdNewChat;
  const collapsed = record.states.compactCollapsed;
  const pinned = record.states.compactPinned;
  const pullRequests = record.states.compactPullRequests;
  const restored = record.states.compactRestored;
  const newChatMarkerStates = Object.fromEntries(
    [
      "wideNewChat",
      "mediumNewChat",
      "thresholdNewChat",
      "compactVisibleBeforeCollapse",
      "compactCollapsed",
      "compactPinned",
      "compactRestored",
    ].map((state) => [
      state,
      record.states[state].routeMarkers?.newChatHome ?? null,
    ]),
  );
  if (
    Object.values(newChatMarkerStates).some((value) => value !== 1) ||
    pullRequests.routeMarkers?.newChatHome !== 0
  ) {
    throw new Error(
      `Current baseline record does not prove the New chat route boundary: ${JSON.stringify({ newChatMarkerStates, pullRequestsNewChatHome: pullRequests.routeMarkers?.newChatHome ?? null })}`,
    );
  }
  const visibleNavigationStates = [
    "wideNewChat",
    "mediumNewChat",
    "thresholdNewChat",
    "compactVisibleBeforeCollapse",
    "compactPinned",
    "compactPullRequests",
    "compactRestored",
  ];
  const invalidRouteStacks = visibleNavigationStates.filter((state) =>
    primaryRoutes.some(
      (route) => record.states[state].routes?.[route]?.length !== 1,
    ),
  );
  if (invalidRouteStacks.length > 0) {
    throw new Error(
      `Current baseline record does not prove the primary navigation route stack: ${JSON.stringify(invalidRouteStacks)}`,
    );
  }
  const controlCount = (state, label) =>
    record.states[state].controls?.[label]?.length ?? 0;
  const newChatStates = [
    "wideNewChat",
    "mediumNewChat",
    "thresholdNewChat",
    "compactVisibleBeforeCollapse",
    "compactCollapsed",
    "compactPinned",
    "compactRestored",
  ];
  const invalidControlStates = expectedStates.filter((state) => {
    const navigationVisible = state !== "compactCollapsed";
    const newChatVisible = newChatStates.includes(state);
    return (
      controlCount(state, "Back") !== (navigationVisible ? 1 : 0) ||
      controlCount(state, "Forward") !== (navigationVisible ? 1 : 0) ||
      controlCount(state, "Hide sidebar") !== (navigationVisible ? 1 : 0) ||
      controlCount(state, "Show sidebar") !== (navigationVisible ? 0 : 1) ||
      controlCount(state, "Add files and more") !== (newChatVisible ? 1 : 0) ||
      controlCount(state, "Dictate") !== (newChatVisible ? 1 : 0) ||
      controlCount(state, "Start new voice chat") !==
        (navigationVisible ? 1 : 0) + (newChatVisible ? 1 : 0)
    );
  });
  if (invalidControlStates.length > 0) {
    const observedControls = Object.fromEntries(
      invalidControlStates.map((state) => [
        state,
        Object.fromEntries(
          [
            "Back",
            "Forward",
            "Hide sidebar",
            "Show sidebar",
            "Add files and more",
            "Dictate",
            "Start new voice chat",
          ].map((label) => [label, controlCount(state, label)]),
        ),
      ]),
    );
    throw new Error(
      `Current baseline record does not prove the fixed shell control matrix: ${JSON.stringify({ invalidControlStates, observedControls })}`,
    );
  }
  const persistedNavigationWidth = record.sidebarLifecycle.baseline.navigationWidth;
  const expectedNavigationByState = {
    compactPinned: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.compact.width,
    ),
    compactPullRequests: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.compact.width,
    ),
    compactRestored: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.compact.width,
    ),
    compactVisibleBeforeCollapse: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.compact.width,
    ),
    mediumNewChat: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.medium.width,
    ),
    thresholdNewChat: currentSidebarWidthForViewport(
      persistedNavigationWidth,
      currentBaselineViewports.threshold.width,
    ),
    wideNewChat: persistedNavigationWidth,
  };
  const expectedGeometryByState = {
    compactCollapsed: expectedNewChatGeometry(
      currentBaselineViewports.compact.width,
    ),
    compactPinned: expectedNewChatGeometry(
      currentBaselineViewports.compact.width,
      expectedNavigationByState.compactPinned,
    ),
    compactVisibleBeforeCollapse: expectedNewChatGeometry(
      currentBaselineViewports.compact.width,
      expectedNavigationByState.compactVisibleBeforeCollapse,
    ),
    compactRestored: expectedNewChatGeometry(
      currentBaselineViewports.compact.width,
      expectedNavigationByState.compactRestored,
    ),
    mediumNewChat: expectedNewChatGeometry(
      currentBaselineViewports.medium.width,
      expectedNavigationByState.mediumNewChat,
    ),
    thresholdNewChat: expectedNewChatGeometry(
      currentBaselineViewports.threshold.width,
      expectedNavigationByState.thresholdNewChat,
    ),
    wideNewChat: expectedNewChatGeometry(
      currentBaselineViewports.wide.width,
      expectedNavigationByState.wideNewChat,
    ),
  };
  const invalidGeometryStates = Object.entries(expectedGeometryByState)
    .filter(([state, expected]) => {
      const sample = record.states[state];
      return (
        sample.main?.length !== 1 ||
        !withinTolerance(sample.main[0]?.width, expected.mainWidth) ||
        !withinTolerance(sample.editor?.rect?.left, expected.editorLeft) ||
        !withinTolerance(sample.editor?.rect?.width, expected.editorWidth) ||
        !withinTolerance(sample.editor?.rect?.height, 44)
      );
    })
    .map(([state]) => state);
  if (invalidGeometryStates.length > 0) {
    throw new Error(
      `Current baseline record does not satisfy exact New chat shell geometry: ${JSON.stringify(invalidGeometryStates)}`,
    );
  }
  const expectedScrollOwners = {
    mediumNewChat: { clientHeight: 519 },
    wideNewChat: { clientHeight: 659 },
  };
  const invalidScrollOwnerStates = Object.entries(expectedScrollOwners)
    .filter(([state, expected]) => {
      const owners = record.states[state].navigationScrollOwners;
      const owner = owners?.[0];
      return (
        owners?.length !== 1 ||
        owner?.overflowY !== "auto" ||
        !withinTolerance(owner?.clientHeight, expected.clientHeight) ||
        !withinTolerance(owner?.rect?.height, expected.clientHeight) ||
        !Number.isFinite(owner?.scrollHeight) ||
        owner.scrollHeight <= owner.clientHeight
      );
    })
    .map(([state]) => state);
  if (invalidScrollOwnerStates.length > 0) {
    const observedScrollOwners = Object.fromEntries(
      Object.keys(expectedScrollOwners).map((state) => [
        state,
        record.states[state].navigationScrollOwners,
      ]),
    );
    throw new Error(
      `Current baseline record does not satisfy sidebar scroll ownership: ${JSON.stringify({ invalidScrollOwnerStates, observedScrollOwners })}`,
    );
  }
  const responsiveContract = {
    collapsedNavigation: collapsed.navigation,
    collapsedShowCount: collapsed.controls?.["Show sidebar"]?.length ?? 0,
    compactVisibleNavigationWidth:
      record.states.compactVisibleBeforeCollapse.navigation?.width ?? null,
    overflowStates: Object.fromEntries(
      Object.entries(record.states).map(([state, value]) => [
        state,
        value.horizontalOverflow ?? null,
      ]),
    ),
    mediumNavigationWidth: medium.navigation?.width ?? null,
    pinnedNavigationWidth: pinned.navigation?.width ?? null,
    pullRequestsCurrent:
      pullRequests.routes?.["Pull requests"]?.[0]?.ariaCurrent ?? null,
    pullRequestsEditor: pullRequests.editor,
    pullRequestsMainCount: pullRequests.main?.length ?? 0,
    pullRequestsMainWidth: pullRequests.main?.[0]?.width ?? null,
    pullRequestsNavigationWidth: pullRequests.navigation?.width ?? null,
    restoredEditor: Boolean(restored.editor),
    restoredNavigation: Boolean(restored.navigation),
    restoredNavigationWidth: restored.navigation?.width ?? null,
    thresholdNavigationWidth: threshold.navigation?.width ?? null,
    wideNavigationWidth: wide.navigation?.width ?? null,
  };
  if (
    Object.values(responsiveContract.overflowStates).some(
      (value) => !Number.isFinite(value),
    )
  ) {
    throw new Error(
      "Current baseline record requires a finite horizontal-overflow measurement for every state.",
    );
  }
  if (
    !withinTolerance(
      responsiveContract.wideNavigationWidth,
      expectedNavigationByState.wideNewChat,
    ) ||
    !withinTolerance(
      responsiveContract.mediumNavigationWidth,
      expectedNavigationByState.mediumNewChat,
    ) ||
    !withinTolerance(
      responsiveContract.thresholdNavigationWidth,
      expectedNavigationByState.thresholdNewChat,
    ) ||
    !withinTolerance(
      responsiveContract.compactVisibleNavigationWidth,
      expectedNavigationByState.compactVisibleBeforeCollapse,
    ) ||
    responsiveContract.collapsedNavigation !== null ||
    responsiveContract.collapsedShowCount !== 1 ||
    !withinTolerance(
      responsiveContract.pinnedNavigationWidth,
      expectedNavigationByState.compactPinned,
    ) ||
    responsiveContract.pullRequestsCurrent !== "page" ||
    responsiveContract.pullRequestsEditor !== null ||
    responsiveContract.pullRequestsMainCount !== 1 ||
    !withinTolerance(
      responsiveContract.pullRequestsMainWidth,
      currentBaselineViewports.compact.width -
        expectedNavigationByState.compactPullRequests,
    ) ||
    !withinTolerance(
      responsiveContract.pullRequestsNavigationWidth,
      expectedNavigationByState.compactPullRequests,
    ) ||
    !responsiveContract.restoredNavigation ||
    !responsiveContract.restoredEditor ||
    !withinTolerance(
      responsiveContract.restoredNavigationWidth,
      expectedNavigationByState.compactRestored,
    ) ||
    Object.values(responsiveContract.overflowStates).some(
      (value) => Math.abs(value) > 1,
    )
  ) {
    throw new Error(
      `Current baseline record does not satisfy the responsive shell and route-continuity contract: ${JSON.stringify(responsiveContract)}`,
    );
  }

  const serialized = JSON.stringify(record);
  for (const forbiddenKey of [
    '"account"',
    '"bodyText"',
    '"projectName"',
    '"taskTitle"',
    '"threadTitle"',
  ]) {
    if (serialized.includes(forbiddenKey)) {
      throw new Error(
        `Current baseline record contains forbidden user-content key ${forbiddenKey}.`,
      );
    }
  }
}
