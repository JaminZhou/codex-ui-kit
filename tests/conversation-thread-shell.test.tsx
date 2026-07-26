// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
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
        header={<ThreadHeader position="static" title="Measured thread" />}
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
});
