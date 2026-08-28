import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isExpectedPopupControlIncomplete,
  isExpectedTargetSizeViolation,
  isExpectedWcagIncomplete,
  partitionSemanticIncomplete,
  partitionWcagIncomplete,
  partitionWcagViolations,
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

const denseNavigationTargetSize = {
  id: "target-size",
  impact: "serious",
  nodeCount: 2,
  nodes: [
    {
      failureSummary: "Target has insufficient size",
      target: ['button[aria-label="Jump to user message 1"]'],
      targetSizeException: "dense-message-navigation",
    },
    {
      failureSummary: "Target has insufficient size",
      target: ['button[aria-label="Jump to user message 2"]'],
      targetSizeException: "dense-message-navigation",
    },
  ],
};

describe("dense navigation target-size policy", () => {
  it("accepts only target-size failures owned by the compact navigation rail", () => {
    expect(isExpectedTargetSizeViolation(denseNavigationTargetSize)).toBe(true);
    expect(
      isExpectedTargetSizeViolation({
        ...denseNavigationTargetSize,
        id: "color-contrast",
      }),
    ).toBe(false);
    expect(
      isExpectedTargetSizeViolation({
        ...denseNavigationTargetSize,
        nodes: [
          ...denseNavigationTargetSize.nodes,
          {
            failureSummary: "Target has insufficient size",
            target: ["button.unrelated"],
          },
        ],
      }),
    ).toBe(false);
  });

  it("keeps mixed and unrelated violations on the failure path", () => {
    const unrelated = {
      ...denseNavigationTargetSize,
      nodes: [{ ...denseNavigationTargetSize.nodes[0], targetSizeException: undefined }],
    };
    const result = partitionWcagViolations([
      denseNavigationTargetSize,
      unrelated,
    ]);
    expect(result.acceptedExceptions).toEqual([denseNavigationTargetSize]);
    expect(result.unexpected).toEqual([unrelated]);
  });
});

const popupControlReview = {
  id: "aria-valid-attr-value",
  impact: "critical",
  nodeCount: 1,
  nodes: [
    {
      failureSummary:
        "Unable to determine if aria-controls referenced ID exists on the page while using aria-haspopup",
      reviews: [
        {
          messageKey: "controlsWithinPopup",
          needsReview: 'aria-controls="menu-id"',
        },
      ],
      target: ['button[aria-haspopup="menu"]'],
    },
  ],
};

describe("portal control relationship policy", () => {
  it("allows Axe's popup uncertainty only after the controlled ID is verified", () => {
    expect(
      isExpectedPopupControlIncomplete(
        popupControlReview,
        new Set(["menu-id"]),
      ),
    ).toBe(true);
    expect(
      isExpectedPopupControlIncomplete(popupControlReview, new Set()),
    ).toBe(false);
  });

  it("keeps unrelated ARIA uncertainty on the failure path", () => {
    const unrelated = {
      ...popupControlReview,
      nodes: [
        {
          ...popupControlReview.nodes[0],
          reviews: [
            {
              messageKey: "noAriaLabel",
              needsReview: "aria-label",
            },
          ],
        },
      ],
    };
    const result = partitionSemanticIncomplete(
      [popupControlReview, unrelated],
      new Set(["menu-id"]),
    );
    expect(result.manualReview).toEqual([popupControlReview]);
    expect(result.unexpected).toEqual([unrelated]);
  });

  it("checks every grouped Axe node instead of trusting the first 20", () => {
    const unverifiedNode = {
      ...popupControlReview.nodes[0],
      reviews: [
        {
          messageKey: "controlsWithinPopup",
          needsReview: 'aria-controls="unverified-menu-id"',
        },
      ],
    };
    const groupedReview = {
      ...popupControlReview,
      nodeCount: 21,
      nodes: [
        ...Array.from({ length: 20 }, () => popupControlReview.nodes[0]),
        unverifiedNode,
      ],
    };

    expect(
      isExpectedPopupControlIncomplete(
        groupedReview,
        new Set(["menu-id"]),
      ),
    ).toBe(false);
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
