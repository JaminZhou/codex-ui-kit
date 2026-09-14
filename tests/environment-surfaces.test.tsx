// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvironmentEditorPage, EnvironmentSettingsPage } from "../src";

afterEach(cleanup);

describe("environment settings surfaces", () => {
  it("renders the current local-unavailable route with linked status copy", () => {
    render(<EnvironmentSettingsPage status="unavailable" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Environments" }),
    ).toBeTruthy();
    const status = screen.getByRole("status", {
      name: "Local environments unavailable",
    });
    expect(status.textContent).toBe(
      "We could not load local environment settings for this project",
    );
    expect(status.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("separates ready content and error announcements", () => {
    const { rerender } = render(
      <EnvironmentSettingsPage>
        <button type="button">Create environment</button>
      </EnvironmentSettingsPage>,
    );
    expect(
      screen.getByRole("button", { name: "Create environment" }),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <EnvironmentSettingsPage
        message="Environment service failed"
        status="error"
        statusHeading="Remote environment failed"
      />,
    );
    expect(
      screen.getByRole("alert", { name: "Remote environment failed" }),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Environment service failed",
    );
  });

  it("supports controlled setup and action editing", () => {
    const onTabChange = vi.fn();
    const onActionAdd = vi.fn();
    const onSave = vi.fn();
    const { rerender } = render(
      <EnvironmentEditorPage
        actions={[
          { command: "pnpm test", id: "verify", name: "Verify", platforms: "macOS" },
        ]}
        onActionAdd={onActionAdd}
        onSave={onSave}
        onTabChange={onTabChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Environment" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Actions" }));
    expect(onTabChange).toHaveBeenCalledWith("actions");
    rerender(
      <EnvironmentEditorPage
        actions={[
          { command: "pnpm test", id: "verify", name: "Verify", platforms: "macOS" },
        ]}
        activeTab="actions"
        onActionAdd={onActionAdd}
        onSave={onSave}
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add action" }));
    expect(onActionAdd).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("announces conflict and exposes retry", () => {
    const onRetry = vi.fn();
    render(
      <EnvironmentEditorPage
        onRetry={onRetry}
        status="conflict"
        statusMessage="The environment is out of date"
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "The environment is out of date",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
