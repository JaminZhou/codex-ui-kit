export const manualReviewWcagRules = new Set(["color-contrast"]);

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
