// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentMessage,
  AgentThread,
  AgentThreadViewport,
  AgentTurn,
  LoadingShimmer,
  ThreadContextOptimization,
  ThreadLoadingState,
  ThreadRenderError,
  ThreadSkeleton,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
} from "../src";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("complete thread surfaces", () => {
  it("renders measured turn grouping and virtualized placeholders", () => {
    const { container } = render(
      <AgentThread>
        <AgentTurn spacing="grouped">
          <span>First</span>
          <span>Second</span>
        </AgentTurn>
        <ThreadVirtualizedPlaceholder />
      </AgentThread>,
    );
    expect(container.querySelector(".codex-ui-agent-turn")?.getAttribute("data-spacing")).toBe(
      "grouped",
    );
    const placeholder = container.querySelector(
      "[data-virtualized-turn-content]",
    );
    expect(placeholder?.getAttribute("aria-hidden")).toBe("true");
    expect(placeholder?.getAttribute("style")).toContain(
      "var(--codex-ui-thread-placeholder-height)",
    );
  });

  it("reports when the scroll viewport leaves and returns to the latest turn", () => {
    const onFollowingChange = vi.fn();
    const { container } = render(
      <AgentThreadViewport autoFollow={false} onFollowingChange={onFollowingChange}>
        <AgentThread>Thread</AgentThread>
      </AgentThreadViewport>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-thread-viewport",
    )!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });

    fireEvent.scroll(viewport);
    expect(onFollowingChange).toHaveBeenLastCalledWith(false);
    viewport.scrollTop = 380;
    fireEvent.scroll(viewport);
    expect(onFollowingChange).toHaveBeenLastCalledWith(true);
    expect(viewport.getAttribute("data-following")).toBe("true");
  });

  it("keeps following through intermediate smooth-scroll events until user input", () => {
    const scrollTo = vi
      .spyOn(HTMLElement.prototype, "scrollTo")
      .mockImplementation(function (this: HTMLElement) {
        this.scrollTop = 100;
        this.dispatchEvent(new Event("scroll"));
      });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("codex-ui-thread-viewport") ? 600 : 0;
      });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.classList.contains("codex-ui-thread-viewport") ? 200 : 0;
      });
    const onFollowingChange = vi.fn();
    const { container, rerender } = render(
      <AgentThreadViewport
        followKey={1}
        onFollowingChange={onFollowingChange}
      >
        First update
      </AgentThreadViewport>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-thread-viewport",
    )!;

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(viewport.getAttribute("data-following")).toBe("true");
    expect(onFollowingChange).not.toHaveBeenCalled();

    rerender(
      <AgentThreadViewport
        followKey={2}
        onFollowingChange={onFollowingChange}
      >
        Second update
      </AgentThreadViewport>,
    );
    expect(scrollTo).toHaveBeenCalledTimes(2);

    fireEvent.pointerDown(viewport);
    expect(onFollowingChange).toHaveBeenCalledWith(false);
    expect(viewport.hasAttribute("data-following")).toBe(false);

    rerender(
      <AgentThreadViewport
        followKey={3}
        onFollowingChange={onFollowingChange}
      >
        Third update
      </AgentThreadViewport>,
    );
    expect(scrollTo).toHaveBeenCalledTimes(3);
  });

  it("stops suppressing away-scroll events when auto-follow is disabled", () => {
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(function (
      this: HTMLElement,
    ) {
      this.scrollTop = 100;
      this.dispatchEvent(new Event("scroll"));
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(200);
    const onFollowingChange = vi.fn();
    const { container, rerender } = render(
      <AgentThreadViewport onFollowingChange={onFollowingChange}>
        Following
      </AgentThreadViewport>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-thread-viewport",
    )!;

    rerender(
      <AgentThreadViewport
        autoFollow={false}
        onFollowingChange={onFollowingChange}
      >
        Following disabled
      </AgentThreadViewport>,
    );
    viewport.scrollTop = 100;
    fireEvent.scroll(viewport);
    expect(onFollowingChange).toHaveBeenCalledWith(false);
    expect(viewport.hasAttribute("data-following")).toBe(false);
  });

  it("keeps user bubbles keyboard-focusable and activates editable messages", () => {
    const onEdit = vi.fn();
    render(
      <AgentMessage actions={<button type="button">Copy</button>} onEdit={onEdit} role="user">
        Update the tests.
      </AgentMessage>,
    );
    const bubble = screen.getByRole("button", { name: "Update the tests." });
    expect(bubble.getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(bubble, { key: "Enter" });
    fireEvent.keyDown(bubble, { key: " " });
    fireEvent.doubleClick(bubble);
    expect(onEdit).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("marks running messages busy without replacing their content", () => {
    const { container } = render(
      <AgentMessage role="assistant" status="running">
        Streaming answer
      </AgentMessage>,
    );
    const message = container.querySelector(".codex-ui-agent-message")!;
    expect(message.getAttribute("aria-busy")).toBe("true");
    expect(message.getAttribute("aria-live")).toBe("polite");
    expect(message.textContent).toBe("Streaming answer");
  });

  it("exposes exact loading, reconnecting, thinking, and skeleton states", () => {
    const { rerender } = render(<ThreadLoadingState />);
    expect(screen.getByRole("status").textContent).toContain("Loading chat…");
    rerender(<ThreadLoadingState kind="reconnecting" />);
    expect(screen.getByRole("status").textContent).toContain(
      "Reconnecting to ChatGPT…",
    );
    rerender(<ThreadThinkingPlaceholder />);
    expect(screen.getByRole("status").textContent).toBe("Thinking");
    rerender(<ThreadSkeleton lines={4} />);
    expect(screen.getByRole("status", { name: "Loading thread" })).toBeTruthy();
    expect(document.querySelectorAll(".codex-ui-thread-skeleton__line")).toHaveLength(4);
    rerender(<LoadingShimmer>Working</LoadingShimmer>);
    expect(screen.getByText("Working").className).toContain("codex-ui-loading-shimmer");
  });

  it("covers manual, automatic, and Work context optimization states", () => {
    const { container, rerender } = render(
      <ThreadContextOptimization mode="manual" status="running" />,
    );
    const state = container.querySelector(
      ".codex-ui-thread-context-optimization",
    )!;
    expect(screen.getByRole("status").textContent).toBe("Compacting context");
    expect(state.getAttribute("aria-busy")).toBe("true");
    expect(state.getAttribute("data-mode")).toBe("manual");

    rerender(<ThreadContextOptimization mode="automatic" status="completed" />);
    expect(state.textContent).toBe("Context automatically compacted");
    expect(state.getAttribute("aria-busy")).toBeNull();
    expect(state.getAttribute("role")).toBeNull();

    rerender(<ThreadContextOptimization mode="work" status="running" />);
    expect(screen.getByRole("status").textContent).toBe(
      "Optimizing the conversation",
    );

    rerender(
      <ThreadContextOptimization
        label="Custom context label"
        mode="work"
        status="completed"
      />,
    );
    expect(state.textContent).toBe("Custom context label");
  });

  it("renders a retryable turn error", () => {
    const onRetry = vi.fn();
    render(
      <ThreadRenderError onRetry={onRetry}>Renderer failed.</ThreadRenderError>,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "This turn could not be displayed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
