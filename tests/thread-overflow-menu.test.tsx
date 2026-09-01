// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThreadOverflowMenu,
  ThreadOverflowMenuOption,
} from "../src";

afterEach(cleanup);

function renderMenu(
  props: Partial<ComponentProps<typeof ThreadOverflowMenu>> = {},
) {
  return render(
    <ThreadOverflowMenu
      copySubmenu={
        <ThreadOverflowMenuOption>Copy task link</ThreadOverflowMenuOption>
      }
      forkSubmenu={
        <ThreadOverflowMenuOption>Fork in place</ThreadOverflowMenuOption>
      }
      openInSubmenu={
        <ThreadOverflowMenuOption>Finder</ThreadOverflowMenuOption>
      }
      {...props}
    />,
  );
}

describe("ThreadOverflowMenu", () => {
  it("renders the current root action groups and observed shortcuts", () => {
    renderMenu({ defaultOpen: true });
    const menu = screen.getByRole("menu", { name: "Chat actions" });
    expect(menu.textContent).toContain("Pin⌥⌘P");
    expect(menu.textContent).toContain("Rename⌥⌘R");
    expect(menu.textContent).toContain("Archive⇧⌘A");
    expect(menu.textContent).toContain("Share");
    expect(menu.textContent).toContain("Copy");
    expect(menu.textContent).toContain("New side chat⌥⌘S");
    expect(menu.textContent).toContain("Fork");
    expect(menu.textContent).toContain("Add scheduled task…");
    expect(menu.textContent).toContain("Open in");
    expect(menu.textContent).toContain("Open in new window");
    expect(menu.querySelectorAll('[role="separator"]')).toHaveLength(3);
  });

  it("keeps thread mutations host controlled", () => {
    const onPinChange = vi.fn();
    const onRename = vi.fn();
    const onArchive = vi.fn();
    const onShare = vi.fn();
    const onNewSideChat = vi.fn();
    const onAddScheduledTask = vi.fn();
    const onOpenInNewWindow = vi.fn();

    const callbacks = {
      onAddScheduledTask,
      onArchive,
      onNewSideChat,
      onOpenInNewWindow,
      onPinChange,
      onRename,
      onShare,
    };
    renderMenu({ open: true, ...callbacks });
    fireEvent.click(screen.getByRole("menuitem", { name: /^Pin\s+⌥⌘P$/ }));
    expect(onPinChange).toHaveBeenCalledWith(true);

    for (const [name, callback] of [
      [/^Rename\s+⌥⌘R$/, onRename],
      [/^Archive\s+⇧⌘A$/, onArchive],
      ["Share", onShare],
      [/^New side chat\s+⌥⌘S$/, onNewSideChat],
      ["Add scheduled task…", onAddScheduledTask],
      ["Open in new window", onOpenInNewWindow],
    ] as const) {
      fireEvent.click(screen.getByRole("menuitem", { name }));
      expect(callback).toHaveBeenCalledOnce();
    }
  });

  it("opens host supplied submenus and restores trigger focus on Escape", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Chat actions" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /^Pin\s+⌥⌘P$/ })).toBe(
        document.activeElement,
      ),
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(screen.getByRole("menu", { name: "Copy options" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Copy task link" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("menu", { name: "Copy options" }), {
      key: "Escape",
    });
    fireEvent.keyDown(screen.getByRole("menu", { name: "Chat actions" }), {
      key: "Escape",
    });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("switches the observed Pin action to Unpin when controlled", () => {
    renderMenu({ defaultOpen: true, pinned: true });
    expect(
      screen.getByRole("menuitem", { name: /^Unpin\s+⌥⌘P$/ }),
    ).toBeTruthy();
  });
});
