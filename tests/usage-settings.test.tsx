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
  it("exposes Usage lifecycle copy and locks billing actions while saving", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <UsageSettingsPage
        credits={{ balance: "$0", giftLabel: "Gift credits" }}
        limitGroups={[]}
        onBuyCredits={() => undefined}
        onGiftCredits={() => undefined}
        onRetry={onRetry}
        onViewPlans={() => undefined}
        plan={{ label: "Pro", price: "$100/mo" }}
        retryLabel="Try billing again"
        savingLabel="Saving billing settings…"
        status="saving"
      />,
    );

    const page = screen
      .getByRole("heading", { level: 1, name: "Usage & billing" })
      .closest("article");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Saving billing settings…")).toBeTruthy();
    for (const label of ["View plans", "Buy credits", "Gift credits"]) {
      expect(
        (screen.getByRole("button", { name: label }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    }

    rerender(
      <UsageSettingsPage
        credits={{ balance: "$0" }}
        errorMessage="Billing preferences unavailable"
        limitGroups={[]}
        onRetry={onRetry}
        plan={{ label: "Pro", price: "$100/mo" }}
        retryLabel="Try billing again"
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Billing preferences unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try billing again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

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
  it("exposes lifecycle feedback and locks plan controls while saving", () => {
    const onRetry = vi.fn();
    const onBack = vi.fn();
    const onAudienceChange = vi.fn();
    const onCardAction = vi.fn();
    const onSelectorChange = vi.fn();
    const props = {
      audience: "personal" as const,
      businessCards: [planCard("business", "Business")],
      onAudienceChange,
      onBack,
      onCardAction,
      onSelectorChange,
      personalCards: [planCard("go", "Go"), planCard("pro", "Pro", "20x")],
    };
    const { rerender } = render(
      <PlanSelectionPage
        {...props}
        savingLabel="Saving plan changes…"
        status="saving"
      />,
    );

    const page = screen
      .getByRole("heading", { name: "Choose your plan" })
      .closest("article");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Saving plan changes…")).toBeTruthy();
    for (const label of [
      "Back to ChatGPT",
      "Personal",
      "Business",
      "Choose Go",
      "Choose Pro",
      "20x",
    ]) {
      const control = screen.getByRole(
        label === "Personal" || label === "Business" || label === "20x"
          ? "radio"
          : "button",
        { name: label },
      ) as HTMLButtonElement;
      expect(control.disabled).toBe(true);
    }

    rerender(
      <PlanSelectionPage
        {...props}
        errorMessage="Plans are temporarily unavailable"
        onRetry={onRetry}
        retryLabel="Try plans again"
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Plans are temporarily unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try plans again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

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
