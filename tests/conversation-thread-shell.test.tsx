// @vitest-environment happy-dom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AgentComposer,
  AgentMessage,
  ConversationThreadShell,
  ThreadHeader,
} from "../src";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ConversationThreadShell", () => {
  it("composes header, scrollable timeline, and overlay composer regions", () => {
    const { container } = render(
      <ConversationThreadShell
        composer={
          <AgentComposer
            layout="multiline"
            onSubmit={() => undefined}
            onValueChange={() => undefined}
            value=""
          />
        }
        floatingControl={<button type="button">Latest</button>}
        header={<ThreadHeader position="static" title="Measured thread" />}
        messageNavigation={<nav aria-label="Message jumps">Markers</nav>}
      >
        <AgentMessage role="user">Run the probe.</AgentMessage>
        <AgentMessage role="assistant">Probe complete.</AgentMessage>
      </ConversationThreadShell>,
    );

    expect(
      container.querySelector(".codex-ui-conversation-thread-shell"),
    ).toBeTruthy();
    expect(
      container
        .querySelector(".codex-ui-conversation-thread-shell__header")
        ?.contains(container.querySelector(".codex-ui-thread-header")),
    ).toBe(true);
    expect(
      container
        .querySelector(
          ".codex-ui-conversation-thread-shell__message-navigation",
        )
        ?.contains(container.querySelector("nav[aria-label='Message jumps']")),
    ).toBe(true);
    expect(
      container
        .querySelector(
          ".codex-ui-conversation-thread-shell__floating-control",
        )
        ?.textContent,
    ).toBe("Latest");
    expect(
      container
        .querySelector(".codex-ui-conversation-thread-shell__viewport")
        ?.contains(container.querySelector(".codex-ui-thread")),
    ).toBe(true);
    expect(
      container
        .querySelector(".codex-ui-conversation-thread-shell__composer")
        ?.contains(container.querySelector(".codex-ui-composer")),
    ).toBe(true);
  });

  it("forwards timeline following behavior through viewport props", () => {
    const onFollowingChange = vi.fn();
    const { container } = render(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        viewportProps={{
          autoFollow: false,
          onFollowingChange,
        }}
      >
        Timeline
      </ConversationThreadShell>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-conversation-thread-shell__viewport",
    )!;
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });

    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    expect(onFollowingChange).toHaveBeenCalledWith(false);
  });

  it("exposes the owned viewport without replacing its internal measurement ref", () => {
    const viewportRef = { current: null as HTMLDivElement | null };
    const callbackRef = vi.fn();
    const { container, rerender, unmount } = render(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        viewportRef={viewportRef}
      >
        Timeline
      </ConversationThreadShell>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-conversation-thread-shell__viewport",
    );

    expect(viewportRef.current).toBe(viewport);

    rerender(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        viewportRef={callbackRef}
      >
        Timeline
      </ConversationThreadShell>,
    );
    expect(callbackRef).toHaveBeenCalledWith(viewport);

    unmount();
    expect(callbackRef).toHaveBeenLastCalledWith(null);
  });

  it("preserves React 19 callback-ref cleanup for the exposed viewport", () => {
    const cleanupRef = vi.fn();
    const callbackRef = vi.fn(() => cleanupRef);
    const { container, unmount } = render(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        viewportRef={callbackRef}
      >
        Timeline
      </ConversationThreadShell>,
    );
    const viewport = container.querySelector<HTMLDivElement>(
      ".codex-ui-conversation-thread-shell__viewport",
    );

    expect(callbackRef).toHaveBeenCalledWith(viewport);
    unmount();
    expect(cleanupRef).toHaveBeenCalledTimes(1);
  });

  it("keeps public labels and custom classes on their owning regions", () => {
    const { container, getByRole } = render(
      <ConversationThreadShell
        className="product-thread"
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        label="Current task"
        threadLabel="Task events"
        threadProps={{ className: "task-events" }}
        viewportProps={{ className: "task-scroll" }}
      >
        Timeline
      </ConversationThreadShell>,
    );

    expect(
      getByRole("region", { name: "Current task" }).classList.contains(
        "product-thread",
      ),
    ).toBe(true);
    expect(
      getByRole("region", { name: "Task events" }).classList.contains(
        "task-events",
      ),
    ).toBe(true);
    expect(
      container
        .querySelector(".codex-ui-conversation-thread-shell__viewport")
        ?.classList.contains("task-scroll"),
    ).toBe(true);
  });

  it("inherits the shell top inset by default and honors a viewport override", () => {
    const { container, rerender } = render(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
      >
        Timeline
      </ConversationThreadShell>,
    );
    const getViewport = () =>
      container.querySelector<HTMLElement>(
        ".codex-ui-conversation-thread-shell__viewport",
      )!;

    expect(
      getViewport().style.getPropertyValue(
        "--codex-ui-thread-viewport-top-inset",
      ),
    ).toBe("");

    rerender(
      <ConversationThreadShell
        composer={<span>Composer</span>}
        header={<span>Header</span>}
        viewportProps={{ topInset: "5rem" }}
      >
        Timeline
      </ConversationThreadShell>,
    );

    expect(
      getViewport().style.getPropertyValue(
        "--codex-ui-thread-viewport-top-inset",
      ),
    ).toBe("5rem");
  });

  it("updates the timeline reserve when the composer dock changes height", () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalGetBoundingClientRect =
      HTMLElement.prototype.getBoundingClientRect;
    const disconnect = vi.fn();
    const observe = vi.fn();

    HTMLElement.prototype.getBoundingClientRect = function () {
      if (
        this.classList.contains(
          "codex-ui-conversation-thread-shell__composer-dock",
        )
      ) {
        return {
          bottom: 138,
          height: 138,
          left: 0,
          right: 736,
          top: 0,
          width: 736,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
      if (
        this.classList.contains(
          "codex-ui-conversation-thread-shell__body",
        )
      ) {
        return {
          bottom: 500,
          height: 500,
          left: 0,
          right: 736,
          top: 0,
          width: 736,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      }
      return originalGetBoundingClientRect.call(this);
    };

    globalThis.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      private readonly callback: ResizeObserverCallback;

      disconnect = disconnect;
      observe = (target: Element) => {
        observe(target);
        this.callback([], this);
      };
      unobserve = vi.fn();
    };

    try {
      const { container, unmount } = render(
        <ConversationThreadShell
          composer={<span>Composer</span>}
          header={<span>Header</span>}
        >
          Timeline
        </ConversationThreadShell>,
      );
      const body = container.querySelector<HTMLElement>(
        ".codex-ui-conversation-thread-shell__body",
      )!;

      expect(observe).toHaveBeenCalledTimes(2);
      expect(
        body.style.getPropertyValue(
          "--codex-ui-conversation-thread-composer-dock-height",
        ),
      ).toBe("138px");
      expect(
        body.style.getPropertyValue(
          "--codex-ui-message-navigation-available-height",
        ),
      ).toBe("362px");

      unmount();
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
      HTMLElement.prototype.getBoundingClientRect =
        originalGetBoundingClientRect;
    }
  });

  it("pins a followed viewport when the composer reserve grows without pulling a scrolled-away viewport", () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    let resizeCallback: ResizeObserverCallback | undefined;
    let observerInstance: ResizeObserver | undefined;

    globalThis.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
        observerInstance = this;
      }

      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    };

    try {
      const { container } = render(
        <ConversationThreadShell
          composer={<span>Composer</span>}
          header={<span>Header</span>}
        >
          Timeline
        </ConversationThreadShell>,
      );
      const composerDock = container.querySelector<HTMLElement>(
        ".codex-ui-conversation-thread-shell__composer-dock",
      )!;
      const viewport = container.querySelector<HTMLDivElement>(
        ".codex-ui-conversation-thread-shell__viewport",
      )!;
      Object.defineProperties(viewport, {
        clientHeight: { configurable: true, value: 300 },
        scrollHeight: { configurable: true, value: 900 },
        scrollTop: { configurable: true, value: 600, writable: true },
      });
      vi.spyOn(composerDock, "getBoundingClientRect").mockReturnValue({
        bottom: 180,
        height: 180,
        left: 0,
        right: 736,
        top: 0,
        width: 736,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      const scrollTo = vi.fn((options: ScrollToOptions) => {
        viewport.scrollTop = Number(options.top ?? 0);
      });
      Object.defineProperty(viewport, "scrollTo", {
        configurable: true,
        value: scrollTo,
      });

      act(() => {
        resizeCallback?.([], observerInstance!);
      });
      expect(scrollTo).toHaveBeenCalledWith({
        behavior: "auto",
        top: 900,
      });

      scrollTo.mockClear();
      viewport.scrollTop = 300;
      act(() => {
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
      expect(viewport.hasAttribute("data-following")).toBe(false);

      act(() => {
        resizeCallback?.([], observerInstance!);
      });
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
