export const currentBaselineViewports = Object.freeze({
  compact: Object.freeze({ height: 680, width: 720 }),
  medium: Object.freeze({ height: 680, width: 820 }),
  threshold: Object.freeze({ height: 680, width: 721 }),
  wide: Object.freeze({ height: 820, width: 1180 }),
});

const isMainRendererUrl = (url) =>
  url === "app://-/index.html" || url.startsWith("app://-/index.html?");

export function selectCurrentMainCandidate(candidates) {
  const eligible = candidates
    .filter(
      (candidate) =>
        isMainRendererUrl(candidate.url) &&
        candidate.area >= 300_000 &&
        candidate.landmarks.main >= 1 &&
        (candidate.landmarks.nav === 1 ||
          candidate.landmarks.sidebarTrigger >= 1) &&
        candidate.landmarks.textbox >= 1 &&
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
  if (
    !record.baseline?.appVersion ||
    !record.baseline?.buildNumber ||
    !/^[a-f0-9]{64}$/.test(record.baseline?.appAsarSha256 ?? "") ||
    !record.baseline?.chromiumVersion
  ) {
    throw new Error("Current baseline record is missing its build fingerprint.");
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
  const responsiveContract = {
    collapsedNavigation: collapsed.navigation,
    collapsedShowCount: collapsed.controls?.["Show sidebar"]?.length ?? 0,
    overflowStates: Object.fromEntries(
      Object.entries(record.states).map(([state, value]) => [
        state,
        value.horizontalOverflow ?? null,
      ]),
    ),
    pinnedNavigationWidth: pinned.navigation?.width ?? null,
    pullRequestsCurrent:
      pullRequests.routes?.["Pull requests"]?.[0]?.ariaCurrent ?? null,
    restoredEditor: Boolean(restored.editor),
    restoredNavigation: Boolean(restored.navigation),
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
    Math.abs((responsiveContract.thresholdNavigationWidth ?? 0) - 274.11) >
      1 ||
    responsiveContract.collapsedNavigation !== null ||
    responsiveContract.collapsedShowCount !== 1 ||
    Math.abs((responsiveContract.pinnedNavigationWidth ?? 0) - 274.11) > 1 ||
    responsiveContract.pullRequestsCurrent !== "page" ||
    !responsiveContract.restoredNavigation ||
    !responsiveContract.restoredEditor ||
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
