// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveMcpElicitation } from "../src/LiveMcpElicitation";
import type { PendingMcpElicitation } from "../src/live-mcp-elicitation-state";

afterEach(cleanup);

const request: PendingMcpElicitation = {
  challenge: "opaque-challenge",
  description: "Confirm this account change.",
  mode: "openai/userVerification",
  requestId: "verification-1",
  serverName: "account-tools",
  threadId: "thread-1",
  title: "Approve account change",
};

describe("MCP device verification UI", () => {
  it("shows the exact approval context and never approves outside a live session", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <LiveMcpElicitation
        request={request}
        verificationAvailable={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Approve account change")).toBeTruthy();
    expect(screen.getByText("Confirm this account change.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verify and approve" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onSubmit).toHaveBeenCalledWith("decline", undefined);
    expect(onSubmit).not.toHaveBeenCalledWith("verify", undefined);
  });

  it("offers verification only in a live session and keeps cancel available while verifying", async () => {
    let rejectVerification: (error: Error) => void = () => undefined;
    const onSubmit = vi.fn((action: string) => action === "verify"
      ? new Promise<void>((_resolve, reject) => { rejectVerification = reject; })
      : Promise.resolve());
    render(
      <LiveMcpElicitation
        request={request}
        verificationAvailable
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify and approve" }));
    expect(await screen.findByRole("button", { name: "Verifying…" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("cancel", undefined));

    rejectVerification(new Error("cancelled"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Device verification failed"));
  });
});
