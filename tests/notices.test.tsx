// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineNotice, StatusBanner, StreamNotice } from "../src";

afterEach(cleanup);

describe("StatusBanner", () => {
  it("uses a non-landmark wrapper by default", () => {
    const { container } = render(
      <StatusBanner>Connection restored.</StatusBanner>,
    );

    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("renders the measured tone, layout, content, and status semantics", () => {
    render(
      <StatusBanner
        aria-live="polite"
        heading="Workspace access changed"
        layout="icon"
        role="status"
        stackOnNarrow
        tone="warning"
      >
        Future commands may require approval.
      </StatusBanner>,
    );

    const banner = screen.getByRole("status");
    expect(banner.getAttribute("data-tone")).toBe("warning");
    expect(banner.getAttribute("data-layout")).toBe("icon");
    expect(banner.getAttribute("data-stack-on-narrow")).toBe("true");
    expect(banner.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Workspace access changed")).toBeTruthy();
    expect(
      screen.getByText("Future commands may require approval."),
    ).toBeTruthy();
  });

  it("invokes retry and dismiss actions without submitting a host form", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    const onHostSubmit = vi.fn((event: React.FormEvent) =>
      event.preventDefault(),
    );
    render(
      <form aria-label="Host form" onSubmit={onHostSubmit}>
        <StatusBanner
          actions={[
            {
              label: "Try again",
              onClick: onRetry,
              variant: "primary",
            },
          ]}
          heading="Couldn’t check the sandbox"
          onDismiss={onDismiss}
          role="alert"
          tone="error"
        >
          Try again to continue setup.
        </StatusBanner>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onHostSubmit).not.toHaveBeenCalled();
  });

  it("lets a custom action surface take over", () => {
    const html = renderToStaticMarkup(
      <StatusBanner
        actions={[{ label: "Unused", loading: true }]}
        customActions={<a href="#details">Learn more</a>}
      >
        Review the details.
      </StatusBanner>,
    );

    expect(html).toContain("Learn more");
    expect(html).not.toContain("Unused");
  });

  it("marks a loading action busy and disabled", () => {
    render(
      <StatusBanner actions={[{ label: "Checking", loading: true }]} />,
    );

    const action = screen.getByRole("button", { name: "Checking" });
    expect((action as HTMLButtonElement).disabled).toBe(true);
    expect(action.getAttribute("aria-busy")).toBe("true");
  });

  it("falls back to declared actions when an optional custom slot is empty", () => {
    render(
      <StatusBanner
        actions={[{ label: "Continue" }]}
        customActions={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("marks an explicitly iconless banner for full-width grid layout", () => {
    const { container } = render(
      <StatusBanner icon={null}>Full-width notice</StatusBanner>,
    );

    expect(container.firstElementChild?.classList).toContain(
      "codex-ui-status-banner--iconless",
    );
    expect(
      container.querySelector(".codex-ui-status-banner__icon"),
    ).toBeNull();
  });
});

describe("InlineNotice", () => {
  it("renders an interruption divider with two rules and trailing guidance", () => {
    const { container } = render(
      <InlineNotice
        icon={<span data-testid="stop-icon">!</span>}
        role="status"
        tone="warning"
        trailingContent={<button type="button">Why?</button>}
        wrap
      >
        Turn ended by Auto-review
      </InlineNotice>,
    );

    const notice = screen.getByRole("status");
    expect(notice.getAttribute("data-tone")).toBe("warning");
    expect(
      container.querySelectorAll(".codex-ui-inline-notice__rule"),
    ).toHaveLength(2);
    expect(screen.getByText("Turn ended by Auto-review")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Why?" })).toBeTruthy();
  });
});

describe("StreamNotice", () => {
  it("announces busy reconnect progress and expands additional details", () => {
    const onExpandedChange = vi.fn();
    render(
      <StreamNotice
        additionalDetails="upstream closed before a complete response"
        onExpandedChange={onExpandedChange}
        reconnectAttempt={2}
        reconnectMaxAttempts={5}
        serverBusy
      />,
    );

    const notice = screen.getByRole("status");
    expect(notice.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Server is busy, reconnecting 2/5")).toBeTruthy();
    const toggle = screen.getByRole("button", {
      name: "Show connection details",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("upstream closed before a complete response").hasAttribute(
        "hidden",
      ),
    ).toBe(false);
  });

  it("keeps controlled expansion stable", () => {
    const onExpandedChange = vi.fn();
    render(
      <StreamNotice
        additionalDetails="connection details"
        expanded={false}
        onExpandedChange={onExpandedChange}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: "Show connection details",
    });
    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("connection details").hasAttribute("hidden")).toBe(
      true,
    );
  });

  it("renders a final alert with an explicit retry action", () => {
    const onRetry = vi.fn();
    render(
      <StreamNotice onRetry={onRetry} status="failed">
        Response stream disconnected.
      </StreamNotice>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("does not expose an empty details disclosure", () => {
    render(<StreamNotice additionalDetails="   " />);

    expect(
      screen.queryByRole("button", { name: "Show connection details" }),
    ).toBeNull();
  });
});
