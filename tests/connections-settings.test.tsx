// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionsSettingsPage } from "../src";

afterEach(cleanup);

describe("current Connections settings surface", () => {
  it("renders the three observed button states and switches their panels", () => {
    render(<ConnectionsSettingsPage />);

    expect(screen.getByRole("heading", { name: "Connections" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Control this Mac" }).getAttribute(
      "aria-pressed",
    )).toBe("true");
    expect(
      screen.getByRole("heading", {
        name: "Devices that can control this Mac",
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Control other devices" }));
    expect(screen.getByRole("button", { name: "Control other devices" }).getAttribute(
      "aria-pressed",
    )).toBe("true");
    expect(
      screen.getByRole("heading", {
        name: "Devices you can control from this Mac",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Set up" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "SSH" }));
    expect(screen.getByRole("button", { name: "SSH" }).getAttribute(
      "aria-pressed",
    )).toBe("true");
    expect(
      screen.getByRole("heading", { name: "SSH connections from this Mac" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });

  it("forwards setting and tab actions without owning host state", () => {
    const onActiveTabChange = vi.fn();
    const onAdd = vi.fn();
    const onRefresh = vi.fn();
    const onSetUp = vi.fn();
    const onToggle = vi.fn();
    render(
      <ConnectionsSettingsPage
        allowConnections
        onActiveTabChange={onActiveTabChange}
        onAdd={onAdd}
        onRefresh={onRefresh}
        onSetUp={onSetUp}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh devices" }));
    fireEvent.click(screen.getByRole("switch", { name: "Allow connections" }));
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith("allow-connections", false);

    fireEvent.click(screen.getByRole("button", { name: "Control other devices" }));
    fireEvent.click(screen.getByRole("button", { name: "Set up" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("control-other-devices");
    expect(onSetUp).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "SSH" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("ssh");
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("supports a controlled selected tab and disabled controls", () => {
    const onActiveTabChange = vi.fn();
    const { rerender } = render(
      <ConnectionsSettingsPage
        activeTab="ssh"
        disabled
        onActiveTabChange={onActiveTabChange}
      />,
    );

    expect(screen.getByRole("button", { name: "SSH" }).getAttribute("aria-pressed"))
      .toBe("true");
    expect(screen.getByRole("button", { name: "Add" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Control this Mac" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("control-this-mac");

    rerender(<ConnectionsSettingsPage disabled />);
    expect(screen.getByRole("switch", { name: "Allow connections" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("matches the installed button-toggle accessibility model", () => {
    render(<ConnectionsSettingsPage />);

    const controls = [
      "Control this Mac",
      "Control other devices",
      "SSH",
    ].map((name) => screen.getByRole("button", { name }));

    expect(controls.map((control) => control.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });
});
