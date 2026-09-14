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
});
