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
  appAsarBytes: 223_450_200,
  appAsarSha256:
    "5f6e773aafd542d3cf09e10b5dca6cabd301d0a155f4b8ce870e3915fc3da25e",
  appVersion: "26.803.41515",
  buildNumber: "6321",
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
  const expectedGeometryByState = {
    compactCollapsed: { editorLeft: 28, editorWidth: 664, mainWidth: 720 },
    compactPinned: {
      editorLeft: 302.11,
      editorWidth: 389.89,
      mainWidth: 445.89,
    },
    compactRestored: {
      editorLeft: 302.11,
      editorWidth: 389.89,
      mainWidth: 445.89,
    },
    mediumNewChat: {
      editorLeft: 302.11,
      editorWidth: 489.89,
      mainWidth: 545.89,
    },
    thresholdNewChat: {
      editorLeft: 302.11,
      editorWidth: 390.89,
      mainWidth: 446.89,
    },
    wideNewChat: {
      editorLeft: 371.05,
      editorWidth: 712,
      mainWidth: 905.89,
    },
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
    mediumNewChat: { clientHeight: 565, scrollHeight: 949 },
    wideNewChat: { clientHeight: 705, scrollHeight: 949 },
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
        !withinTolerance(owner?.scrollHeight, expected.scrollHeight)
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
    Math.abs((responsiveContract.wideNavigationWidth ?? 0) - 274.11) > 1 ||
    Math.abs((responsiveContract.mediumNavigationWidth ?? 0) - 274.11) > 1 ||
    Math.abs((responsiveContract.thresholdNavigationWidth ?? 0) - 274.11) >
      1 ||
    responsiveContract.collapsedNavigation !== null ||
    responsiveContract.collapsedShowCount !== 1 ||
    Math.abs((responsiveContract.pinnedNavigationWidth ?? 0) - 274.11) > 1 ||
    responsiveContract.pullRequestsCurrent !== "page" ||
    responsiveContract.pullRequestsEditor !== null ||
    responsiveContract.pullRequestsMainCount !== 1 ||
    !withinTolerance(responsiveContract.pullRequestsMainWidth, 445.89) ||
    !withinTolerance(responsiveContract.pullRequestsNavigationWidth, 274.11) ||
    !responsiveContract.restoredNavigation ||
    !responsiveContract.restoredEditor ||
    !withinTolerance(responsiveContract.restoredNavigationWidth, 274.11) ||
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
