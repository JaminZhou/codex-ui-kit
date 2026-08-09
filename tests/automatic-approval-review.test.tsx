// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutomaticApprovalReview } from "../src";

afterEach(cleanup);

describe("AutomaticApprovalReview", () => {
  it("announces an in-progress review without inventing a terminal result", () => {
    render(
      <AutomaticApprovalReview
        action="Network access to https://example.com"
        status="inProgress"
      />,
    );

    const review = screen.getByRole("status");
    expect(review.getAttribute("aria-busy")).toBe("true");
    expect(review.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Auto-reviewing")).toBeTruthy();
  });

  it("renders the current timeout language as a terminal alert", () => {
    render(
      <AutomaticApprovalReview
        action="Network access to https://example.com"
        status="timedOut"
      />,
    );

    const review = screen.getByRole("alert");
    expect(review.getAttribute("data-status")).toBe("timedOut");
    expect(screen.getByText("Auto-review timed out")).toBeTruthy();
    expect(
      screen.getByText(
        "A carefully prompted reviewer agent timed out before ChatGPT ran this request",
      ),
    ).toBeTruthy();
  });

  it("keeps high-risk denial distinct from an ordinary denial", () => {
    render(
      <AutomaticApprovalReview
        rationale="The request could expose private credentials."
        riskLevel="high"
        status="denied"
      />,
    );

    expect(screen.getByText("Auto-review denied high risk")).toBeTruthy();
    expect(screen.getByRole("alert").getAttribute("data-risk-level")).toBe(
      "high",
    );
  });
});
