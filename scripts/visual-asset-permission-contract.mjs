export const composerPermissionVisualAssetIds = Object.freeze([
  "composer-permission",
  "composer-permission-ask",
]);

const composerPermissionVisualAssetIdSet = new Set(
  composerPermissionVisualAssetIds,
);

function canonicalize(value) {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || Array.isArray(nested) || typeof nested !== "object") {
      return nested;
    }
    return Object.fromEntries(
      Object.entries(nested).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });
}

function baselineIdentity(context) {
  return {
    appAsarSha256: context?.appAsarSha256,
    appVersion: context?.appVersion,
    buildNumber: context?.buildNumber,
    interactionState: context?.interactionState,
    theme: context?.theme,
    viewport: context?.viewport,
  };
}

export function collectComposerPermissionVisualAsset(
  capture,
  context = "Current Composer permission capture",
) {
  if (
    capture?.captureMode !== "full" ||
    capture?.baselineContext?.interactionState !==
      "resting-and-open-sidebar-menus"
  ) {
    throw new Error(`${context} must be a full resting-shell capture.`);
  }
  const observed = capture.icons.filter(
    (candidate) =>
      candidate.region === "composer" &&
      composerPermissionVisualAssetIdSet.has(candidate.owner?.semanticId),
  );
  if (observed.length !== 1) {
    throw new Error(
      `${context} expected one visible Composer permission variant, received ${observed.length}.`,
    );
  }
  return observed[0];
}

export function assertComposerPermissionRefreshCoverage(
  observedIds,
  { fingerprintChanged },
) {
  const uniqueIds = new Set(observedIds);
  if (
    observedIds.some((id) => !composerPermissionVisualAssetIdSet.has(id)) ||
    uniqueIds.size !== observedIds.length
  ) {
    throw new Error(
      "Composer permission refresh evidence must contain unique known variants.",
    );
  }
  const expectedCount = fingerprintChanged
    ? composerPermissionVisualAssetIds.length
    : null;
  if (
    (expectedCount !== null && observedIds.length !== expectedCount) ||
    (expectedCount === null &&
      ![1, composerPermissionVisualAssetIds.length].includes(
        observedIds.length,
      ))
  ) {
    throw new Error(
      fingerprintChanged
        ? "A fingerprint-changing full refresh requires CODEX_VISUAL_ASSET_PERMISSION_CAPTURE with the alternate same-build Composer permission state."
        : "An unchanged full refresh must capture at least one Composer permission state.",
    );
  }
}

export function mergeSupplementalComposerPermissionCapture(
  primaryCapture,
  supplementalCapture,
) {
  const primaryPermission = collectComposerPermissionVisualAsset(
    primaryCapture,
    "Primary current Composer permission capture",
  );
  const supplementalPermission = collectComposerPermissionVisualAsset(
    supplementalCapture,
    "Supplemental current Composer permission capture",
  );
  if (
    canonicalize(baselineIdentity(primaryCapture?.baselineContext)) !==
    canonicalize(baselineIdentity(supplementalCapture?.baselineContext))
  ) {
    throw new Error(
      "Supplemental Composer permission capture must match the full capture build, interaction state, theme, and viewport.",
    );
  }
  if (
    primaryPermission.owner.semanticId ===
    supplementalPermission.owner.semanticId
  ) {
    throw new Error(
      `Supplemental Composer permission capture overlaps the primary capture for ${primaryPermission.owner.semanticId}.`,
    );
  }
  return {
    ...primaryCapture,
    icons: [...primaryCapture.icons, supplementalPermission],
  };
}
