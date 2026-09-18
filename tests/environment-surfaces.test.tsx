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

  it("exposes environment loading busy state and host-owned retry copy", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <EnvironmentSettingsPage
        loadingLabel="Loading environment registry…"
        onRetry={onRetry}
        retryLabel="Load again"
        status="loading"
      />,
    );
    const page = screen
      .getByRole("heading", { name: "Environments" })
      .closest("section");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "Loading environment registry…",
    );

    rerender(
      <EnvironmentSettingsPage
        message="Environment registry unavailable"
        onRetry={onRetry}
        retryLabel="Load again"
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Environment registry unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Load again" }));
    expect(onRetry).toHaveBeenCalledOnce();
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
        retryLabel="Review again"
        status="conflict"
        statusMessage="The environment is out of date"
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "The environment is out of date",
    );
    fireEvent.click(screen.getByRole("button", { name: "Review again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("locks mutable controls while saving and exposes custom feedback labels", () => {
    const onActionAdd = vi.fn();
    const onActionDelete = vi.fn();
    render(
      <EnvironmentEditorPage
        actions={[
          { command: "pnpm test", id: "verify", name: "Verify", platforms: "macOS" },
        ]}
        activeTab="actions"
        onActionAdd={onActionAdd}
        onActionDelete={onActionDelete}
        retryLabel="Try again"
        savingLabel="Saving environment now…"
        status="saving"
      />,
    );

    const editor = screen.getByRole("heading", { name: "Environment" }).closest("section");
    expect(editor?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "Saving environment now…",
    );
    expect(screen.getByRole("textbox", { name: "Environment name" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("tab", { name: "Setup" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Add action" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("textbox", { name: "verify action name" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: "Saving environment now…" }),
    ).toHaveProperty("disabled", true);
  });

  it("supports host-wide disabled locks for settings and editor surfaces", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <EnvironmentSettingsPage
        disabled
        onRetry={onRetry}
        status="error"
        statusHeading="Environment access unavailable"
      />,
    );
    expect(
      screen
        .getByRole("heading", { name: "Environments" })
        .closest("section")
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen
        .getByRole("heading", { name: "Environments" })
        .closest("section")
        ?.getAttribute("data-disabled"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Retry" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).not.toHaveBeenCalled();

    rerender(
      <EnvironmentEditorPage
        actions={[
          { command: "pnpm test", id: "verify", name: "Verify", platforms: "macOS" },
        ]}
        activeTab="actions"
        disabled
        onActionAdd={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const editor = screen
      .getByRole("heading", { name: "Environment" })
      .closest("section");
    expect(editor?.getAttribute("aria-disabled")).toBe("true");
    expect(editor?.getAttribute("data-disabled")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Environment name" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Add action" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
