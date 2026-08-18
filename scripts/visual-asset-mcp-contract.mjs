export const currentMcpVisualAssetTargets = Object.freeze([
  Object.freeze({
    id: "thread-mcp-tool",
    minimumCandidates: 3,
    region: "conversation",
  }),
  Object.freeze({
    id: "thread-activity-chevron",
    minimumCandidates: 1,
    region: "conversation",
  }),
  Object.freeze({
    id: "thread-reconnecting",
    minimumCandidates: 1,
    region: "conversation",
  }),
]);

export const currentMcpVisualAssetIds = Object.freeze(
  currentMcpVisualAssetTargets.map(({ id }) => id),
);

export function currentVisualAssetBaselineIdentity(context) {
  return {
    appAsarSha256: context?.appAsarSha256,
    appVersion: context?.appVersion,
    buildNumber: context?.buildNumber,
    theme: context?.theme,
    viewport: context?.viewport,
  };
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function collectCurrentMcpVisualAssets(
  capture,
  context = "Current MCP capture",
) {
  const observation = capture?.mcpObservation;
  if (
    capture?.captureMode !== "completed-mcp-thread" ||
    capture?.baselineContext?.interactionState !==
      "completed-current-mcp-thread" ||
    observation?.groupCount < 1 ||
    observation?.callCount < 2 ||
    observation?.groupToolIconCount !== observation.groupCount ||
    observation?.callToolIconCount !== observation.callCount ||
    observation?.activityChevronCount !== 1 ||
    observation?.reconnectingIconCount !== 1 ||
    Math.abs((observation?.groupHeight ?? 0) - 21) > 0.1 ||
    Math.abs((observation?.callHeight ?? 0) - 21) > 0.1 ||
    observation?.openGroupChevronRotate !== "90deg"
  ) {
    throw new Error(`${context} does not prove the completed MCP contract.`);
  }

  const observedById = new Map();
  for (const target of currentMcpVisualAssetTargets) {
    const observed = capture.icons.filter(
      (candidate) =>
        candidate.region === target.region &&
        candidate.owner?.semanticId === target.id,
    );
    const expectedCandidates =
      target.id === "thread-mcp-tool"
        ? observation.groupToolIconCount + observation.callToolIconCount
        : target.minimumCandidates;
    if (observed.length !== expectedCandidates) {
      throw new Error(
        `${context} expected ${expectedCandidates} ${target.id} captures, received ${observed.length}.`,
      );
    }
    if (new Set(observed.map(({ sha256 }) => sha256)).size !== 1) {
      throw new Error(
        `${context} ${target.id} captures do not share one fingerprint.`,
      );
    }
    observedById.set(target.id, observed);
  }
  return observedById;
}

export function mergeSupplementalCurrentMcpCapture(
  primaryCapture,
  supplementalCapture,
) {
  if (primaryCapture?.captureMode !== "full") {
    throw new Error(
      "Supplemental current MCP evidence can merge only into a full visual asset capture.",
    );
  }
  if (
    !sameValue(
      currentVisualAssetBaselineIdentity(primaryCapture?.baselineContext),
      currentVisualAssetBaselineIdentity(supplementalCapture?.baselineContext),
    )
  ) {
    throw new Error(
      "Supplemental current MCP capture must match the full capture fingerprint, theme, and viewport.",
    );
  }
  const observedById = collectCurrentMcpVisualAssets(
    supplementalCapture,
    "Supplemental current MCP capture",
  );
  for (const { id, region } of currentMcpVisualAssetTargets) {
    if (
      primaryCapture.icons.some(
        (candidate) =>
          candidate.region === region && candidate.owner?.semanticId === id,
      )
    ) {
      throw new Error(
        `Supplemental current MCP capture overlaps the full capture for ${id}.`,
      );
    }
  }
  return {
    ...primaryCapture,
    icons: [
      ...primaryCapture.icons,
      ...currentMcpVisualAssetIds.flatMap((id) => observedById.get(id)),
    ],
  };
}
