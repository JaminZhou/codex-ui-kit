// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarHelpMenu, type SidebarHelpMenuRelease } from "../src";

afterEach(cleanup);

const releases: readonly SidebarHelpMenuRelease[] = [
  { date: "13 Aug", id: "computer-history", label: "Computer History" },
  { date: "11 Aug", id: "linux-preview", label: "Linux desktop preview" },
];

describe("SidebarHelpMenu", () => {
  it("renders release grouping and delegates release and action intents", () => {
    const onAction = vi.fn();
    const onReleaseSelect = vi.fn();
    render(
      <SidebarHelpMenu
        defaultOpen
        onAction={onAction}
        onReleaseSelect={onReleaseSelect}
        releases={releases}
        icons={{ trigger: <span aria-hidden="true">?</span> }}
      />,
    );

    expect(screen.getByRole("menu", { name: "Help menu" })).toBeTruthy();
    expect(screen.getByText("What's new")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Computer History/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: /Computer History/ }));
    expect(onReleaseSelect).toHaveBeenCalledWith(releases[0]);

    render(
      <SidebarHelpMenu
        defaultOpen
        onAction={onAction}
        releases={releases}
        icons={{ trigger: <span aria-hidden="true">?</span> }}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Help" }));
    expect(onAction).toHaveBeenCalledWith("help");
  });

  it("keeps the menu trigger and entries locked when disabled", () => {
    render(
      <SidebarHelpMenu
        disabled
        releases={releases}
        icons={{ trigger: <span aria-hidden="true">?</span> }}
      />,
    );

    expect(screen.getByRole("button", { name: "Open help menu" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
