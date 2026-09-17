// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserWorkspacePanel } from "../src";

afterEach(cleanup);

describe("BrowserWorkspacePanel", () => {
  it("renders the current one-tab browser chrome and content slot", () => {
    render(
      <BrowserWorkspacePanel
        tabs={[
          {
            active: true,
            id: "codex",
            title: "Codex in ChatGPT | AI Coding Agents",
          },
        ]}
      >
        <div>Local deterministic page</div>
      </BrowserWorkspacePanel>,
    );

    expect(screen.getByRole("complementary", { name: "Browser" })).toBeTruthy();
    expect(
      screen
        .getByRole("tab", { name: /Codex in ChatGPT/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Site information" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Site tools" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open in external browser" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Annotate" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Browser options" })).toBeTruthy();
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Local deterministic page",
    );
  });

  it("delegates tab and toolbar actions", () => {
    const onAction = vi.fn();
    const onCloseTab = vi.fn();
    const onSelectTab = vi.fn();
    const tab = { active: true, id: "codex", title: "Codex" };
    render(
      <BrowserWorkspacePanel
        onAction={onAction}
        onCloseTab={onCloseTab}
        onSelectTab={onSelectTab}
        tabs={[tab]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Codex" }));
    fireEvent.click(screen.getByRole("button", { name: "Close Codex tab" }));
    fireEvent.click(screen.getByRole("button", { name: "New tab" }));
    expect(onSelectTab).toHaveBeenCalledWith(tab);
    expect(onCloseTab).toHaveBeenCalledWith(tab);
    expect(onAction).toHaveBeenCalledWith("new-tab");
  });

  it("locks browser tabs and toolbar actions while disabled", () => {
    const onAction = vi.fn();
    const onCloseTab = vi.fn();
    const onSelectTab = vi.fn();
    render(
      <BrowserWorkspacePanel
        disabled
        onAction={onAction}
        onCloseTab={onCloseTab}
        onSelectTab={onSelectTab}
        tabs={[{ active: true, id: "codex", title: "Codex" }]}
      />,
    );

    const panel = screen.getByRole("complementary", { name: "Browser" });
    expect(panel.getAttribute("aria-disabled")).toBe("true");
    expect(panel.getAttribute("data-disabled")).toBe("true");
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveProperty("disabled", true);
      fireEvent.click(button);
    }
    expect(onAction).not.toHaveBeenCalled();
    expect(onCloseTab).not.toHaveBeenCalled();
    expect(onSelectTab).not.toHaveBeenCalled();
  });
});
