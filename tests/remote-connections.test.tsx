// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteConnectionsPage } from "../src";

afterEach(cleanup);

describe("remote connections surface", () => {
  it("renders connected rows and forwards lifecycle actions", () => {
    const onTest = vi.fn();
    const onEdit = vi.fn();
    const onForget = vi.fn();
    const connection = {
      detail: "build-host.example.com",
      id: "build-host",
      kind: "ssh" as const,
      label: "Build host",
      status: "connected" as const,
    };
    render(
      <RemoteConnectionsPage
        connections={[connection]}
        onEdit={onEdit}
        onForget={onForget}
        onTest={onTest}
      />,
    );

    expect(screen.getByRole("heading", { name: "Connections" })).toBeTruthy();
    expect(screen.getByText("Connected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));
    expect(onTest).toHaveBeenCalledWith(connection);
    expect(onEdit).toHaveBeenCalledWith(connection);
    expect(onForget).toHaveBeenCalledWith(connection);
  });

  it("supports a controlled add form and retryable error", () => {
    const onAdd = vi.fn();
    const onSave = vi.fn();
    const onRetry = vi.fn();
    render(
      <RemoteConnectionsPage
        formOpen
        onAdd={onAdd}
        onRetry={onRetry}
        onSave={onSave}
        status="error"
        statusMessage="Connection service unavailable"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Add connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onAdd).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.getByRole("form", { name: "Connection editor" })).toBeTruthy();
  });

  it("locks the form while saving and exposes retryable save errors", () => {
    const onFormRetry = vi.fn();
    const { rerender } = render(
      <RemoteConnectionsPage
        formOpen
        formStatus="saving"
        formSavingLabel="Saving remote host…"
        onFormRetry={onFormRetry}
      />,
    );
    const form = screen.getByRole("form", { name: "Connection editor" });
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "Saving remote host…",
    );
    expect(
      screen.getByRole("textbox", { name: "Connection name" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("combobox", { name: "Connection type" }),
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Saving remote host…" }),
    ).toHaveProperty("disabled", true);

    rerender(
      <RemoteConnectionsPage
        formOpen
        formRetryLabel="Try again"
        formStatus="error"
        formStatusMessage="The remote host rejected the connection."
        onFormRetry={onFormRetry}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The remote host rejected the connection.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onFormRetry).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Save connection" }),
    ).toHaveProperty("disabled", false);
  });

  it("locks page actions while loading and supports a host-wide disabled lock", () => {
    const onRetry = vi.fn();
    const connection = {
      detail: "build-host.example.com",
      id: "build-host",
      kind: "ssh" as const,
      label: "Build host",
      status: "connected" as const,
    };
    const { rerender } = render(
      <RemoteConnectionsPage
        connections={[connection]}
        disabled
        formOpen
        onAdd={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onTest={vi.fn()}
        status="loading"
      />,
    );
    const page = screen
      .getByRole("heading", { name: "Connections" })
      .closest("section");
    expect(page?.getAttribute("aria-busy")).toBe("true");
    expect(page?.getAttribute("data-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Add connection" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("textbox", { name: "Connection name" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(
      <RemoteConnectionsPage
        onRetry={onRetry}
        status="error"
        statusMessage="Connection service unavailable"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Connection service unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
