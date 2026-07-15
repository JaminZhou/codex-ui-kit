// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalRequest } from "../src";

afterEach(cleanup);

describe("ApprovalRequest", () => {
  it("renders a pending request with protocol-neutral detail", () => {
    render(
      <ApprovalRequest
        description="This command writes a release to the public registry."
        onApprove={() => undefined}
        onReject={() => undefined}
        title="Publish package?"
      >
        pnpm publish --access public
      </ApprovalRequest>,
    );

    const request = screen.getByRole("region", { name: "Approval request" });
    expect(request.getAttribute("data-decision")).toBe("pending");
    expect(screen.getByText("Awaiting approval")).toBeTruthy();
    expect(screen.getByText("pnpm publish --access public")).toBeTruthy();
  });

  it("invokes the approve and reject actions", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalRequest
        onApprove={onApprove}
        onReject={onReject}
        title="Run command?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("renders a resolved decision without active actions", () => {
    render(
      <ApprovalRequest decision="approved" title="Publish package?" />,
    );

    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  });

  it("disables the full pending action group", () => {
    render(
      <ApprovalRequest
        disabled
        onApprove={() => undefined}
        onReject={() => undefined}
        title="Run command?"
      />,
    );

    expect(
      (screen.getByRole("group", { name: "Approval actions" }) as HTMLFieldSetElement)
        .disabled,
    ).toBe(true);
  });
});
