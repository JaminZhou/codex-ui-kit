// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrowserComputerUseSettingsPage,
  type BrowserComputerUseSettingsSection,
} from "../src";

afterEach(cleanup);

const sections: readonly BrowserComputerUseSettingsSection[] = [
  {
    id: "permissions",
    label: "Permissions",
    settings: [
      {
        checked: true,
        description: "Allow the assistant to interact with the browser.",
        id: "allow-browser",
        label: "Allow browser use",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    settings: [
      {
        checked: false,
        id: "confirm-actions",
        label: "Ask before actions",
      },
    ],
  },
];

describe("BrowserComputerUseSettingsPage", () => {
  it("renders sections and reports controlled switch changes", () => {
    const onToggle = vi.fn();
    render(
      <BrowserComputerUseSettingsPage
        kind="browser"
        onToggle={onToggle}
        sections={sections}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Browser" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Permissions" })).toBeTruthy();
    const toggle = screen.getByRole("switch", { name: "Allow browser use" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(sections[0]!.settings![0], false);
  });

  it("exposes loading and error retry semantics and locks controls", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <BrowserComputerUseSettingsPage
        kind="computer-use"
        loadingLabel="Loading computer use…"
        sections={sections}
        status="loading"
      />,
    );

    const page = screen
      .getByRole("heading", { level: 1, name: "Computer use" })
      .closest("article");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Loading computer use…");
    expect(
      (screen.getByRole("switch", { name: "Allow browser use" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    rerender(
      <BrowserComputerUseSettingsPage
        errorMessage="Computer use preferences unavailable"
        kind="computer-use"
        onRetry={onRetry}
        retryLabel="Try again"
        sections={sections}
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Computer use preferences unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("marks a disabled page and preserves per-setting disabled state", () => {
    render(
      <BrowserComputerUseSettingsPage
        disabled
        kind="browser"
        sections={[
          {
            id: "disabled",
            label: "Disabled",
            settings: [
              { checked: true, disabled: false, id: "one", label: "One" },
              { checked: false, disabled: true, id: "two", label: "Two" },
            ],
          },
        ]}
      />,
    );

    const page = screen.getByRole("heading", { name: "Browser" }).closest("article");
    expect(page?.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("switch", { name: "One" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("switch", { name: "Two" })).toHaveProperty("disabled", true);
  });
});
