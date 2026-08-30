// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PlanSelectionPage,
  UsageSettingsPage,
  type PlanSelectionCard,
} from "../src";

afterEach(cleanup);

const planCard = (
  id: string,
  title: string,
  selectorValue?: string,
): PlanSelectionCard => ({
  actionLabel: `Choose ${title}`,
  features: [`${title} feature`],
  id,
  priceLines: [{ cadence: "/ month", current: "$20" }],
  selector: selectorValue
    ? {
        label: `${title} option`,
        options: [
          { label: "5x", value: "5x" },
          { label: "20x", value: "20x" },
        ],
        value: selectorValue,
      }
    : undefined,
  tagline: `${title} tagline`,
  title,
});

function PlanFixture({ onAction = () => undefined }) {
  const [audience, setAudience] = useState<"business" | "personal">(
    "personal",
  );
  const [multiplier, setMultiplier] = useState("20x");
  return (
    <PlanSelectionPage
      audience={audience}
      businessCards={[planCard("business", "Business")]}
      onAudienceChange={setAudience}
      onCardAction={onAction}
      onSelectorChange={(_, value) => setMultiplier(value)}
      personalCards={[
        planCard("go", "Go"),
        planCard("pro", "Pro", multiplier),
      ]}
    />
  );
}

describe("UsageSettingsPage", () => {
  it("renders plan, credits, limits, reset, and cancellation semantics", () => {
    render(
      <UsageSettingsPage
        cancelPlanContent={<span>Managed by the host</span>}
        credits={{
          balance: "$0",
          giftLabel: "Buy credits for someone else",
          promotionLabel: "Up to 30% off",
        }}
        limitGroups={[
          {
            id: "general",
            label: "General usage limits",
            limits: [
              {
                id: "weekly",
                label: "Weekly usage limit",
                remainingPercent: 28,
                resetLabel: "Resets Sunday",
              },
            ],
          },
        ]}
        plan={{ label: "Pro plan", price: "$100/mo" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Usage & billing" }),
    ).toBeTruthy();
    expect(screen.getByText("Pro plan")).toBeTruthy();
    expect(screen.getByText("Up to 30% off")).toBeTruthy();
    const meter = screen.getByRole("progressbar", {
      name: "Weekly usage limit usage remaining",
    });
    expect(meter.getAttribute("aria-valuenow")).toBe("28");
    expect(screen.getByText("No resets available")).toBeTruthy();
    expect(screen.getByText("Managed by the host")).toBeTruthy();
  });

  it("keeps checkout and plan transitions host-owned", () => {
    const onBuyCredits = vi.fn();
    const onGiftCredits = vi.fn();
    const onViewPlans = vi.fn();
    render(
      <UsageSettingsPage
        credits={{ balance: "$0", giftLabel: "Gift credits" }}
        limitGroups={[]}
        onBuyCredits={onBuyCredits}
        onGiftCredits={onGiftCredits}
        onViewPlans={onViewPlans}
        plan={{ label: "Pro", price: "$100/mo" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View plans" }));
    fireEvent.click(screen.getByRole("button", { name: "Buy credits" }));
    fireEvent.click(screen.getByRole("button", { name: "Gift credits" }));
    expect(onViewPlans).toHaveBeenCalledOnce();
    expect(onBuyCredits).toHaveBeenCalledOnce();
    expect(onGiftCredits).toHaveBeenCalledOnce();
  });
});

describe("PlanSelectionPage", () => {
  it("controls audience, card selectors, and host-owned actions", () => {
    const onAction = vi.fn();
    render(<PlanFixture onAction={onAction} />);

    expect(screen.getAllByRole("button", { name: /^Choose / })).toHaveLength(2);
    fireEvent.click(screen.getByRole("radio", { name: "5x" }));
    expect(screen.getByRole("radio", { name: "5x" }).getAttribute("aria-checked"))
      .toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Business" }));
    expect(screen.getByText("Business feature")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose Business" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
