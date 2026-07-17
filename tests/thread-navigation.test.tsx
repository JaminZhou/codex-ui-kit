// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FloatingThreadPanel,
  ThreadFloatingButton,
  ThreadHeader,
  ThreadNavigationControls,
} from "../src";

afterEach(cleanup);

describe("thread navigation surfaces", () => {
  it("exposes sidebar and history navigation with observed labels and states", () => {
    const onToggleSidebar = vi.fn();
    const onGoBack = vi.fn();
    const onGoForward = vi.fn();
    const { rerender } = render(
      <ThreadNavigationControls
        backShortcut="⌘["
        canGoBack
        canGoForward={false}
        forwardShortcut="⌘]"
        onGoBack={onGoBack}
        onGoForward={onGoForward}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={false}
        sidebarShortcut="⌘B"
      />,
    );

    const sidebar = screen.getByRole("button", { name: "Show sidebar" });
    expect(sidebar.getAttribute("data-app-shell-sidebar-trigger")).toBe("true");
    fireEvent.click(sidebar);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(onToggleSidebar).toHaveBeenCalledOnce();
    expect(onGoBack).toHaveBeenCalledOnce();
    expect(onGoForward).not.toHaveBeenCalled();

    rerender(
      <ThreadNavigationControls
        historyControls={false}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen
      />,
    );
    expect(screen.getByRole("button", { name: "Hide sidebar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("renders draggable header identity and all action alignments", () => {
    render(
      <ThreadHeader
        centerActions={<button type="button">Center</button>}
        endActions={<button type="button">End</button>}
        navigation={<span>Navigation</span>}
        position="fixed"
        startActions={<button type="button">Start</button>}
        subtitle="Workspace"
        title="Thread title"
      />,
    );

    const header = screen.getByRole("banner");
    expect(header.getAttribute("data-position")).toBe("fixed");
    expect(header.textContent).toContain("Thread title");
    expect(header.textContent).toContain("Workspace");
    expect(screen.getByRole("button", { name: "Center" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "End" })).toBeTruthy();
  });

  it("removes the hidden floating button from interaction and swaps working dots", () => {
    const onClick = vi.fn();
    const { container, rerender } = render(
      <ThreadFloatingButton onClick={onClick} show={false} />,
    );
    const button = container.querySelector<HTMLButtonElement>(
      ".codex-ui-thread-floating-button",
    )!;
    expect(button.getAttribute("aria-label")).toBe("Scroll to bottom");
    expect(button.getAttribute("aria-hidden")).toBe("true");
    expect(button.getAttribute("tabindex")).toBe("-1");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    rerender(<ThreadFloatingButton onClick={onClick} show working />);
    expect(button.getAttribute("aria-hidden")).toBe("false");
    expect(button.getAttribute("data-working")).toBe("true");
    expect(button.querySelectorAll(".codex-ui-thread-floating-button__dots > span")).toHaveLength(3);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps a closed floating panel mounted but inert", () => {
    const { rerender } = render(
      <FloatingThreadPanel label="Project navigation" open={false}>
        <button type="button">New thread</button>
      </FloatingThreadPanel>,
    );
    const panel = screen.getByLabelText("Project navigation", { selector: "aside" });
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.hasAttribute("inert")).toBe(true);

    rerender(
      <FloatingThreadPanel label="Project navigation" open>
        <button type="button">New thread</button>
      </FloatingThreadPanel>,
    );
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(false);
  });
});
