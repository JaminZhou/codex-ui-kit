export const manualReviewWcagRules = new Set(["color-contrast"]);

function controlledIdFromReview(review) {
  if (review?.messageKey !== "controlsWithinPopup") return undefined;
  return review.needsReview?.match(/aria-controls=["']([^"']+)["']/)?.[1];
}

function relativeLuminance([red, green, blue]) {
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isExpectedWcagIncomplete(entry) {
  return manualReviewWcagRules.has(entry.id);
}

export function partitionWcagIncomplete(entries) {
  const manualReview = [];
  const unexpected = [];

  for (const entry of entries) {
    (isExpectedWcagIncomplete(entry) ? manualReview : unexpected).push(entry);
  }

  return { manualReview, unexpected };
}

export function isExpectedPopupControlIncomplete(entry, verifiedControlIds) {
  if (entry.id !== "aria-valid-attr-value" || entry.nodes.length === 0) {
    return false;
  }

  return entry.nodes.every((node) =>
    node.reviews?.some((review) => {
      const controlledId = controlledIdFromReview(review);
      return controlledId && verifiedControlIds.has(controlledId);
    }),
  );
}

export function partitionSemanticIncomplete(entries, verifiedControlIds) {
  const manualReview = [];
  const unexpected = [];

  for (const entry of entries) {
    (isExpectedPopupControlIncomplete(entry, verifiedControlIds)
      ? manualReview
      : unexpected
    ).push(entry);
  }

  return { manualReview, unexpected };
}
