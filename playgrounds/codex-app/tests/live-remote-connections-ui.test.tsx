// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveRemoteConnections } from "../src/LiveRemoteConnections";
import type { LiveRemoteConnection } from "../electron/live-remote-connections";

afterEach(() => {
  cleanup();
  delete window.codexDemo;
});

function installBridge(
  bridge: Partial<NonNullable<Window["codexDemo"]>>,
) {
  Object.defineProperty(window, "codexDemo", {
    configurable: true,
    value: bridge as NonNullable<Window["codexDemo"]>,
  });
}

describe("live remote connections UI", () => {
  it("locks the editor during a host save and preserves retryable feedback", async () => {
    let resolveSave: (value: LiveRemoteConnection) => void = () => undefined;
    const saveRemoteConnection = vi.fn(
      (_input: Parameters<NonNullable<Window["codexDemo"]>["saveRemoteConnection"]>[0]) =>
        new Promise<LiveRemoteConnection>((resolve) => {
          resolveSave = resolve;
        }),
    );
    installBridge({
      listRemoteConnections: vi.fn().mockResolvedValue([]),
      saveRemoteConnection,
    });

    render(<LiveRemoteConnections />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add connection" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add connection" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Connection name" }), {
      target: { value: "Loopback runner" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Host or device" }), {
      target: { value: "ws://127.0.0.1:8787" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Connection type" }), {
      target: { value: "device" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save connection" }));

    expect(saveRemoteConnection).toHaveBeenCalledOnce();
    expect(screen.getByRole("form", { name: "Connection editor" }).getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Connection name" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Saving connection…" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Close connection editor" })).toHaveProperty(
      "disabled",
      true,
    );

    resolveSave({
      detail: "ws://127.0.0.1:8787",
      id: "loopback-runner",
      kind: "device",
      label: "Loopback runner",
      status: "disconnected",
      updatedAt: 1,
    });
    await waitFor(() =>
      expect(screen.queryByRole("form", { name: "Connection editor" })).toBeNull(),
    );
    expect(screen.getByText("Saved Loopback runner")).toBeTruthy();
  });
});
