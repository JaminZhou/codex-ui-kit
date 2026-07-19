import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isExpectedWcagIncomplete,
  partitionWcagIncomplete,
} from "../scripts/accessibility-policy.mjs";

const gradientContrast = {
  id: "color-contrast",
  impact: "serious",
  nodeCount: 1,
  nodes: [
    {
      failureSummary:
        "Fix any of the following:\n  Element's background color could not be determined due to a background gradient",
      target: [".gradient-label"],
    },
  ],
};

describe("accessibility incomplete-result policy", () => {
  it("allows only the explicitly listed WCAG rule for manual review", () => {
    expect(isExpectedWcagIncomplete(gradientContrast)).toBe(true);
    expect(
      isExpectedWcagIncomplete({
        ...gradientContrast,
        id: "target-size",
      }),
    ).toBe(false);
    expect(
      isExpectedWcagIncomplete({
        ...gradientContrast,
        nodes: [{ failureSummary: "Needs manual review", target: ["button"] }],
      }),
    ).toBe(true);
  });

  it("routes every unrecognized incomplete result to the failure path", () => {
    const targetSize = {
      ...gradientContrast,
      id: "target-size",
    };
    const result = partitionWcagIncomplete([gradientContrast, targetSize]);
    expect(result.manualReview).toEqual([gradientContrast]);
    expect(result.unexpected).toEqual([targetSize]);
  });
});

describe("theme-transition contrast policy", () => {
  it("distinguishes accessible endpoints from the observed failing midpoint", () => {
    expect(contrastRatio([186, 38, 35], [255, 217, 217])).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio([255, 103, 100], [77, 16, 14])).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio([249, 98, 95], [91, 32, 30])).toBeLessThan(4.5);
  });
});
