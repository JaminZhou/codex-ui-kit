// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Button,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuSubmenu,
  Popover,
  Select,
  Tooltip,
} from "../src";

afterEach(cleanup);

describe("interactive controls", () => {
  it("exposes pressed and loading button states without submitting host forms", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button loading pressed>
          Run
        </Button>
        <IconButton icon={<span>+</span>} label="Add" pressed />
      </form>,
    );

    const button = screen.getByRole("button", { name: "Loading" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Add" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens a tooltip immediately from keyboard focus and closes it with Escape", () => {
    render(
      <Tooltip content="Create a task" shortcut="⌘N">
        <button type="button">New</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "New" });
    fireEvent.focusIn(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Create a task");
    expect(tooltip.textContent).toContain("⌘N");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("dismisses a popover from outside interaction and Escape", async () => {
    render(
      <Popover
        label="Details"
        trigger={<button type="button">Open details</button>}
      >
        <button type="button">Focusable content</button>
      </Popover>,
    );

    const trigger = screen.getByRole("button", { name: "Open details" });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Details" }).getAttribute("tabindex"),
    ).toBe("-1");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Details" })).toBeNull();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Details" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog", { name: "Details" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("menus and selects", () => {
  it("moves focus with menu keys, keeps checkboxes open, and closes on selection", async () => {
    const onCheckedChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <Menu defaultOpen trigger={<button type="button">Actions</button>}>
        <MenuCheckboxItem checked onCheckedChange={onCheckedChange}>
          Show details
        </MenuCheckboxItem>
        <MenuItem onSelect={onSelect}>Rename</MenuItem>
        <MenuItem disabled>Unavailable</MenuItem>
      </Menu>,
    );

    const menu = screen.getByRole("menu");
    const checkbox = screen.getByRole("menuitemcheckbox", {
      name: "Show details",
    });
    await waitFor(() => expect(document.activeElement).toBe(checkbox));
    fireEvent.click(checkbox);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("menu")).toBeTruthy();

    const rename = screen.getByRole("menuitem", { name: "Rename" });
    fireEvent.keyDown(menu, { key: "r" });
    expect(document.activeElement).toBe(rename);
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(checkbox);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rename);
    fireEvent.click(rename);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens an action menu to its last enabled item with ArrowUp", async () => {
    render(
      <Menu trigger={<button type="button">Open action menu</button>}>
        <MenuItem>First</MenuItem>
        <MenuItem>Last</MenuItem>
        <MenuItem disabled>Disabled</MenuItem>
      </Menu>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Open action menu" }), {
      key: "ArrowUp",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Last" }),
      ),
    );
  });

  it("keeps a parent menu open while interacting with its portalled submenu", async () => {
    render(
      <Menu defaultOpen trigger={<button type="button">View</button>}>
        <MenuSubmenu label="Theme">
          <MenuItem keepOpen>System</MenuItem>
          <MenuItem keepOpen>Dark</MenuItem>
        </MenuSubmenu>
      </Menu>,
    );

    const submenuTrigger = screen.getByRole("menuitem", { name: "Theme" });
    fireEvent.click(submenuTrigger);
    await waitFor(() => expect(screen.getAllByRole("menu")).toHaveLength(2));
    const dark = screen.getByRole("menuitem", { name: "Dark" });
    fireEvent.pointerDown(dark);
    expect(screen.getAllByRole("menu")).toHaveLength(2);
  });

  it("selects enabled listbox options and ignores disabled options", () => {
    const onValueChange = vi.fn();
    render(
      <Select
        label="Execution mode"
        onValueChange={onValueChange}
        options={[
          { label: "Local", value: "local" },
          { disabled: true, label: "Cloud", value: "cloud" },
        ]}
        value="local"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Execution mode" }));
    expect(screen.getByRole("listbox", { name: "Execution mode" })).toBeTruthy();
    const local = screen.getByRole("option", { name: "Local" });
    const cloud = screen.getByRole("option", { name: "Cloud" });
    expect(local.getAttribute("aria-selected")).toBe("true");
    expect((cloud as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(cloud);
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.click(local);
    expect(onValueChange).toHaveBeenCalledWith("local");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
