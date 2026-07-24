// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppShell,
  AppSidebar,
  AppSidebarItem,
  AppSidebarSection,
  WorkspacePanel,
} from "../src";

afterEach(() => {
  cleanup();
});

describe("application shell", () => {
  it("composes navigation, conversation, side, and bottom landmarks", () => {
    const { rerender } = render(
      <AppShell
        bottomPanel={<div>Terminal content</div>}
        bottomPanelOpen
        sidePanel={<div>Source content</div>}
        sidePanelOpen
        sidebar={<div>Navigation content</div>}
        sidebarOpen
      >
        Thread content
      </AppShell>,
    );

    expect(
      screen.getByRole("complementary", { name: "App navigation" }),
    ).toBeTruthy();
    expect(screen.getByRole("main", { name: "Conversation" })).toBeTruthy();
    expect(
      screen.getByRole("complementary", { name: "Workspace panel" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Bottom panel" })).toBeTruthy();

    rerender(
      <AppShell
        bottomPanel={<div>Terminal content</div>}
        bottomPanelOpen={false}
        sidePanel={<div>Source content</div>}
        sidePanelOpen={false}
        sidebar={<div>Navigation content</div>}
        sidebarOpen={false}
      >
        Thread content
      </AppShell>,
    );

    for (const label of ["App navigation", "Workspace panel", "Bottom panel"]) {
      const surface = document.querySelector(`[aria-label="${label}"]`)!;
      expect(surface.getAttribute("aria-hidden")).toBe("true");
      expect(surface.hasAttribute("inert")).toBe(true);
    }
  });

  it("exposes controlled overlay dismissal", () => {
    const onSidebarOpenChange = vi.fn();
    const onSidePanelOpenChange = vi.fn();
    render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelOpen
        onSidePanelOpenChange={onSidePanelOpenChange}
        onSidebarOpenChange={onSidebarOpenChange}
        sidePanel="Sources"
        sidePanelOpen
        sidebar="Navigation"
        sidebarOpen
      >
        Thread
      </AppShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close navigation sidebar" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close workspace panel" }),
    );

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
    expect(onSidePanelOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("application sidebar", () => {
  it("labels sections and marks the selected route", () => {
    render(
      <AppSidebar header="Codex">
        <AppSidebarSection title="Workspace">
          <AppSidebarItem selected>New chat</AppSidebarItem>
          <AppSidebarItem badge="3" description="Open reviews">
            Pull requests
          </AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "New chat" }).getAttribute(
        "aria-current",
      ),
    ).toBe("page");
    expect(screen.getByText("Open reviews")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});

describe("workspace panel", () => {
  it("coordinates tabs and host-owned panel actions", () => {
    const onActiveTabChange = vi.fn();
    const onCloseTab = vi.fn();
    const onExpandedChange = vi.fn();
    const onClose = vi.fn();
    const onOpenTab = vi.fn();
    render(
      <WorkspacePanel
        activeTabId="sources"
        label="Workspace"
        onActiveTabChange={onActiveTabChange}
        onClose={onClose}
        onCloseTab={onCloseTab}
        onExpandedChange={onExpandedChange}
        onOpenTab={onOpenTab}
        tabs={[
          { content: "Source content", id: "sources", label: "Sources" },
          { content: "Review content", id: "review", label: "Review" },
        ]}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Sources" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Source content");

    const sourceTab = screen.getByRole("tab", { name: "Sources" });
    const reviewTab = screen.getByRole("tab", { name: "Review" });
    sourceTab.focus();
    fireEvent.keyDown(sourceTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(reviewTab);
    fireEvent.click(reviewTab);
    fireEvent.click(screen.getByRole("button", { name: "Close Sources tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Open panel tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));

    expect(onActiveTabChange).toHaveBeenCalledWith("review");
    expect(onCloseTab).toHaveBeenCalledWith("sources");
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(onOpenTab).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
