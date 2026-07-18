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
      <Tooltip content="Create a chat" shortcut="⌘N">
        <button type="button">New</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "New" });
    fireEvent.focusIn(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Create a chat");
    expect(tooltip.textContent).toContain("⌘N");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("clears a tooltip's stale open state when disabled", () => {
    const { rerender } = render(
      <Tooltip defaultOpen content="Help text">
        <button type="button">Help</button>
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip")).toBeTruthy();
    rerender(
      <Tooltip defaultOpen disabled content="Help text">
        <button type="button">Help</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Help" }).getAttribute("aria-describedby"),
    ).toBeNull();

    rerender(
      <Tooltip defaultOpen content="Help text">
        <button type="button">Help</button>
      </Tooltip>,
    );
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

  it("closes stale open state and ARIA references when disabled", () => {
    const { rerender } = render(
      <Popover
        defaultOpen
        label="Disable test"
        trigger={<button type="button">Toggle surface</button>}
      >
        Content
      </Popover>,
    );

    expect(screen.getByRole("dialog", { name: "Disable test" })).toBeTruthy();
    rerender(
      <Popover
        defaultOpen
        disabled
        label="Disable test"
        trigger={<button type="button">Toggle surface</button>}
      >
        Content
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Toggle surface" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBeNull();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(screen.queryByRole("dialog", { name: "Disable test" })).toBeNull();

    rerender(
      <Popover
        defaultOpen
        label="Disable test"
        trigger={<button type="button">Toggle surface</button>}
      >
        Content
      </Popover>,
    );
    expect(screen.queryByRole("dialog", { name: "Disable test" })).toBeNull();
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

  it("clears submenu state and ARIA references when disabled", async () => {
    const renderMenu = (disabled: boolean) => (
      <Menu defaultOpen trigger={<button type="button">View</button>}>
        <MenuSubmenu disabled={disabled} label="Theme">
          <MenuItem keepOpen>System</MenuItem>
        </MenuSubmenu>
      </Menu>
    );
    const { rerender } = render(renderMenu(false));

    const submenuTrigger = screen.getByRole("menuitem", { name: "Theme" });
    fireEvent.click(submenuTrigger);
    await waitFor(() => expect(screen.getAllByRole("menu")).toHaveLength(2));

    rerender(renderMenu(true));
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(submenuTrigger.getAttribute("aria-controls")).toBeNull();
    expect(screen.getAllByRole("menu")).toHaveLength(1);

    rerender(renderMenu(false));
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("keeps nested popover portals inside the ancestor ownership chain", () => {
    const onValueChange = vi.fn();
    render(
      <Popover
        defaultOpen
        label="Parent popover"
        trigger={<button type="button">Parent</button>}
      >
        <Select
          label="Nested mode"
          onValueChange={onValueChange}
          options={[
            { label: "Local", value: "local" },
            { label: "Cloud", value: "cloud" },
          ]}
          value="local"
        />
        <button type="button">Parent action</button>
      </Popover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nested mode" }));
    const cloud = screen.getByRole("option", { name: "Cloud" });
    fireEvent.pointerDown(cloud);
    expect(screen.getByRole("dialog", { name: "Parent popover" })).toBeTruthy();
    fireEvent.click(cloud);
    expect(onValueChange).toHaveBeenCalledWith("cloud");
    expect(screen.getByRole("dialog", { name: "Parent popover" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nested mode" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Parent action" }));
    expect(screen.queryByRole("listbox", { name: "Nested mode" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Parent popover" })).toBeTruthy();
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

  it("focuses the first enabled option when the selected option is disabled", async () => {
    render(
      <Select
        label="Execution mode"
        onValueChange={vi.fn()}
        options={[
          { label: "Local", value: "local" },
          { disabled: true, label: "Cloud", value: "cloud" },
        ]}
        value="cloud"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Execution mode" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Local" }),
      ),
    );
  });
});
