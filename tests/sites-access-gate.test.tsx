// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SitesAccessGate } from "../src";

afterEach(cleanup);

describe("SitesAccessGate", () => {
  it("renders the current terms boundary and delegates Continue/Close", () => {
    const onClose = vi.fn();
    const onContinue = vi.fn();
    render(<SitesAccessGate onClose={onClose} onContinue={onContinue} />);

    expect(screen.getByRole("main", { name: "Sites" }).getAttribute("data-mode")).toBe("terms");
    expect(screen.getByRole("heading", { name: "Before you use Sites" })).toBeTruthy();
    expect(screen.getByText("A few additional terms apply when you create and publish a site")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders the host-owned pricing boundary and Back action", () => {
    const onBack = vi.fn();
    render(<SitesAccessGate mode="pricing" onBack={onBack} />);

    expect(screen.getByRole("main", { name: "Sites pricing" }).getAttribute("data-mode")).toBe("pricing");
    expect(screen.getByRole("region", { name: "Sites pricing checkout" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to ChatGPT" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.queryByRole("heading", { name: "Before you use Sites" })).toBeNull();
  });
});
