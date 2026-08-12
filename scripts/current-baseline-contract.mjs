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
  appAsarBytes: 223_451_508,
  appAsarSha256:
    "928129601e8b36eccba603114d6912352f2b13182f3a7d60b32166d0e81aafb5",
  appVersion: "26.803.61601",
  buildNumber: "6396",
  chromiumVersion: "151.0.7922.76",
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

const currentSidebarWidthBounds = Object.freeze({ max: 520, min: 240 });
const currentSidebarMinimumMainWidth = 352;

const currentSidebarWidthForViewport = (persistedWidth, viewportWidth) =>
  Math.min(
    persistedWidth,
    Math.min(
      currentSidebarWidthBounds.max,
      viewportWidth - currentSidebarMinimumMainWidth,
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
    responsive?.compactCollapsed,
    responsive?.compactPinned,
    responsive?.wideRestored,
    responsive?.keyboardRestored,
  ];
  const persistedNavigationWidth = baseline?.navigationWidth;
  if (
    baseline?.projectGroupCount !== 6 ||
    baseline?.expandedProjectGroupCount !== 6 ||
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
  const projectMenuVariant = projectMenu?.opened?.hasMarkAllAsRead
    ? { height: 207.94, menuItemCount: 7 }
    : { height: 179.38, menuItemCount: 6 };
  if (
    projectMenu?.opened?.visibleMenuCount !== 1 ||
    projectMenu.opened.menuItemCount !== projectMenuVariant.menuItemCount ||
    !projectMenu.opened.focusInside ||
    projectMenu.opened.focusRole !== "menu" ||
    !withinTolerance(projectMenu.opened.rect?.width, 214.05) ||
    !withinTolerance(
      projectMenu.opened.rect?.height,
      projectMenuVariant.height,
    ) ||
    projectMenu.closed?.visibleMenuCount !== 0 ||
    projectMenu.closed.focusReturned !== false ||
    projectMenu.closed.activeTag !== "body"
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
    !withinTolerance(helpMenu.opened.rect?.width, 200) ||
    !withinTolerance(helpMenu.opened.rect?.height, 272.06) ||
    helpMenu.closed?.visibleMenuCount !== 0 ||
    helpMenu.closed.focusReturned !== true
  ) {
    throw new Error(
      `Current sidebar lifecycle does not prove the Help menu boundary: ${JSON.stringify(helpMenu)}`,
    );
  }
  if (
    responsive.compactCollapsed.navigationVisible !== false ||
    responsive.compactCollapsed.showSidebarCount !== 1 ||
    responsive.compactCollapsed.projectExpanded !== false ||
    Math.abs(responsive.compactCollapsed.horizontalOverflow ?? Infinity) > 1 ||
    responsive.compactPinned.navigationVisible !== true ||
    !withinTolerance(
      responsive.compactPinned.navigationWidth,
      persistedNavigationWidth,
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
  const beforeBundle = runtimeIdentity?.beforeCapture;
  const afterBundle = runtimeIdentity?.afterCapture;
  const processStartedAtMs = runtimeIdentity?.processStartedAtMs;
  const bundleChangedBeforeProcess =
    validAppAsarSnapshot(beforeBundle) &&
    Number.isSafeInteger(processStartedAtMs) &&
    Math.ceil(beforeBundle.changedAtMs / 1_000) * 1_000 <=
      processStartedAtMs;
  if (
    !Number.isSafeInteger(runtimeIdentity?.ownerPid) ||
    runtimeIdentity.ownerPid <= 1 ||
    !bundleChangedBeforeProcess ||
    !validAppAsarSnapshot(afterBundle) ||
    !sameAppAsarSnapshot(beforeBundle, afterBundle) ||
    beforeBundle.checkedAtMs < processStartedAtMs ||
    afterBundle.checkedAtMs < beforeBundle.checkedAtMs
  ) {
    throw new Error(
      "Current baseline record does not prove the running Renderer bundle identity.",
    );
  }

  assertCurrentSidebarLifecycle(record.sidebarLifecycle);
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
    "compactCollapsed",
    "compactPinned",
    "compactRestored",
  ];
  const invalidControlStates = expectedStates.filter((state) => {
    const navigationVisible = state !== "compactCollapsed";
    const newChatVisible = newChatStates.includes(state);
    return (
      controlCount(state, "Back") !== 1 ||
      controlCount(state, "Forward") !== 1 ||
      controlCount(state, "Hide sidebar") !== (navigationVisible ? 1 : 0) ||
      controlCount(state, "Show sidebar") !== (navigationVisible ? 0 : 1) ||
      controlCount(state, "Add files and more") !== (newChatVisible ? 1 : 0) ||
      controlCount(state, "Dictate") !== (newChatVisible ? 1 : 0) ||
      controlCount(state, "Start new voice chat") !==
        (newChatVisible ? 1 : 0)
    );
  });
  if (invalidControlStates.length > 0) {
    throw new Error(
      `Current baseline record does not prove the fixed shell control matrix: ${JSON.stringify(invalidControlStates)}`,
    );
  }
  const persistedNavigationWidth = record.sidebarLifecycle.baseline.navigationWidth;
  const expectedNavigationByState = {
    compactPinned: persistedNavigationWidth,
    compactPullRequests: persistedNavigationWidth,
    compactRestored: persistedNavigationWidth,
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
    mediumNewChat: { clientHeight: 565 },
    wideNewChat: { clientHeight: 705 },
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
