// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalCommandPreview, ApprovalRequest } from "../src";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApprovalRequest", () => {
  it("renders the observed command hierarchy without protocol coupling", () => {
    render(
      <ApprovalRequest
        description="This command needs access outside the workspace."
        disableHotkeys
        kind="command"
        onApprove={() => undefined}
        onReject={() => undefined}
        reason="Publish the verified package"
        title="Allow ChatGPT to run this command?"
      >
        <ApprovalCommandPreview command="pnpm publish --access public" />
      </ApprovalRequest>,
    );

    const request = screen.getByRole("region", { name: "Approval request" });
    expect(request.getAttribute("data-decision")).toBe("pending");
    expect(request.getAttribute("data-kind")).toBe("command");
    expect(screen.getByText("Terminal")).toBeTruthy();
    expect(screen.getAllByText("Allow ChatGPT to run this command?")).toHaveLength(
      1,
    );
    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByText("Publish the verified package")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Command preview" })).toBeTruthy();
    expect(screen.queryByText("Awaiting approval")).toBeNull();
  });

  it("uses parity labels for typed requests and invokes both decisions", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalRequest
        disableHotkeys
        kind="command"
        onApprove={onApprove}
        onReject={onReject}
        title="Run command?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Allow once" }));
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("keeps the generic approve and reject labels compatible", () => {
    render(
      <ApprovalRequest
        disableHotkeys
        onApprove={() => undefined}
        onReject={() => undefined}
        title="Publish package?"
      />,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
  });

  it("renders a resolved decision without active actions", () => {
    render(
      <ApprovalRequest
        decision="approved"
        kind="file"
        title="Publish package?"
      />,
    );

    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.getByText("Edit files")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Approval actions" })).toBeNull();
  });

  it("disables every pending action while loading", () => {
    render(
      <ApprovalRequest
        kind="permission"
        leadingAction={{ onClick: () => undefined }}
        loading
        onApprove={() => undefined}
        onReject={() => undefined}
        scopedApproveAction={{ onClick: () => undefined }}
        title="Grant permissions?"
      />,
    );

    const request = screen.getByRole("region", { name: "Approval request" });
    expect(request.getAttribute("aria-busy")).toBe("true");
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("exposes the one-shot and scoped choices through the split menu", () => {
    const onApprove = vi.fn();
    const onScope = vi.fn();
    render(
      <ApprovalRequest
        disableHotkeys
        kind="network"
        onApprove={onApprove}
        onReject={() => undefined}
        scopedApproveAction={{
          info: "Keep api.example.com on this conversation allowlist",
          onClick: onScope,
        }}
        title="Allow ChatGPT to connect to https://api.example.com?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approval options" }));
    const menu = screen.getByRole("menu");
    expect(menu).toBeTruthy();
    expect(
      screen
        .getByRole("region", { name: "Approval request" })
        .contains(menu),
    ).toBe(false);
    expect(screen.getByRole("menuitem", { name: "Allow once" })).toBeTruthy();
    fireEvent.click(
      screen.getByRole("menuitem", { name: /Allow this conversation/ }),
    );

    expect(onScope).toHaveBeenCalledOnce();
    expect(onApprove).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes the scoped menu when the primary action is submitted", () => {
    const onApprove = vi.fn();
    render(
      <ApprovalRequest
        disableHotkeys
        kind="network"
        onApprove={onApprove}
        onReject={() => undefined}
        scopedApproveAction={{ onClick: () => undefined }}
        title="Connect?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approval options" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Allow once" }));

    expect(onApprove).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not nest or submit a consumer form", () => {
    const onApprove = vi.fn();
    const onHostSubmit = vi.fn((event: React.FormEvent) =>
      event.preventDefault(),
    );
    const { container } = render(
      <form aria-label="Host form" onSubmit={onHostSubmit}>
        <ApprovalRequest
          disableHotkeys
          kind="command"
          onApprove={onApprove}
          onReject={() => undefined}
          title="Run command?"
        />
      </form>,
    );

    expect(container.querySelectorAll("form")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Allow once" }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onHostSubmit).not.toHaveBeenCalled();
  });

  it("clears an open scoped menu when a controlled request resolves", () => {
    const request = (
      decision: "approved" | "pending",
    ) => (
      <ApprovalRequest
        decision={decision}
        disableHotkeys
        kind="network"
        onApprove={() => undefined}
        onReject={() => undefined}
        scopedApproveAction={{ onClick: () => undefined }}
        title="Connect?"
      />
    );
    const { rerender } = render(request("pending"));

    fireEvent.click(screen.getByRole("button", { name: "Approval options" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    rerender(request("approved"));
    expect(screen.queryByRole("menu")).toBeNull();
    rerender(request("pending"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("supports Enter approval and Escape denial hotkeys", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalRequest
        kind="permission"
        onApprove={onApprove}
        onReject={onReject}
        title="Grant permissions?"
      />,
    );

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("ignores approval hotkeys from editable or already handled events", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <>
        <textarea aria-label="Composer" />
        <ApprovalRequest
          autoFocus={false}
          kind="permission"
          onApprove={onApprove}
          onReject={onReject}
          title="Grant permissions?"
        />
      </>,
    );

    const composer = screen.getByRole("textbox", { name: "Composer" });
    fireEvent.keyDown(composer, { key: "Enter" });
    fireEvent.keyDown(composer, { key: "Escape" });
    const handled = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    });
    handled.preventDefault();
    document.dispatchEvent(handled);

    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("does not treat menu interaction as a global approval hotkey", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <ApprovalRequest
        kind="network"
        onApprove={onApprove}
        onReject={onReject}
        scopedApproveAction={{ onClick: () => undefined }}
        title="Connect?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approval options" }));
    const scopedItem = screen.getByRole("menuitem", {
      name: "Allow this conversation",
    });
    fireEvent.keyDown(scopedItem, { key: "Enter" });

    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it("focuses and roves through scoped approval choices", () => {
    render(
      <ApprovalRequest
        disableHotkeys
        kind="network"
        onApprove={() => undefined}
        onReject={() => undefined}
        scopedApproveAction={{ onClick: () => undefined }}
        title="Connect?"
      />,
    );

    const toggle = screen.getByRole("button", { name: "Approval options" });
    fireEvent.click(toggle);
    const menu = screen.getByRole("menu");
    const items = screen.getAllByRole("menuitem");

    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(toggle);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("ApprovalCommandPreview", () => {
  it("expands and collapses the measured three-line command preview", () => {
    render(
      <ApprovalCommandPreview
        command={"line one\nline two\nline three\nline four"}
        forceCollapsible
      />,
    );

    const preview = screen.getByRole("region", { name: "Command preview" });
    expect(preview.hasAttribute("data-expanded")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(preview.getAttribute("data-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(preview.hasAttribute("data-expanded")).toBe(false);
  });

  it("merges caller styles without losing the collapsed-line contract", () => {
    render(
      <ApprovalCommandPreview
        collapsedLines={5}
        command="pnpm check"
        style={{ width: "24rem" }}
      />,
    );

    const preview = screen.getByRole("region", { name: "Command preview" });
    expect(preview.style.width).toBe("24rem");
    expect(
      preview.style.getPropertyValue("--codex-ui-approval-command-lines"),
    ).toBe("5");
  });

  it("shows the full command when collapsing is explicitly disabled", () => {
    render(
      <ApprovalCommandPreview
        command={"line one\nline two\nline three\nline four"}
        forceCollapsible={false}
      />,
    );

    const preview = screen.getByRole("region", { name: "Command preview" });
    expect(preview.getAttribute("data-expanded")).toBe("true");
    expect(screen.queryByRole("button", { name: "Expand" })).toBeNull();
  });

  it("includes code padding when measuring an exact line count", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      lineHeight: "20px",
      paddingBottom: "8px",
      paddingTop: "8px",
    } as CSSStyleDeclaration);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(76);

    render(
      <ApprovalCommandPreview command={"line one\nline two\nline three"} />,
    );

    expect(screen.queryByRole("button", { name: "Expand" })).toBeNull();
  });
});
