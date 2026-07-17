// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ComposerAttachment,
  ComposerMentionMenu,
  ComposerModeIndicator,
  QueuedPromptList,
} from "../src";

afterEach(cleanup);

describe("composer auxiliary surfaces", () => {
  it("models attachment layouts, upload states, opening, and removal", () => {
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    const { container } = render(
      <ComposerAttachment
        kind="pasted-text"
        label="Large paste"
        layout="card"
        onOpen={onOpen}
        onRemove={onRemove}
        status="uploading"
      />,
    );

    const attachment = container.querySelector(
      ".codex-ui-composer-attachment",
    ) as HTMLElement;
    expect(attachment.dataset.layout).toBe("card");
    expect(attachment.dataset.kind).toBe("pasted-text");
    expect(screen.getByRole("status").textContent).toContain("Uploading…");

    fireEvent.click(screen.getByRole("button", { name: "Open Large paste" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Large paste" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("navigates grouped mention results while skipping unavailable options", () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ComposerMentionMenu
        groups={[
          {
            id: "files",
            label: "Files",
            options: [
              { id: "one", label: "src/App.tsx", kind: "file" },
              { id: "two", label: "src/private.ts", disabled: true },
            ],
          },
          {
            id: "skills",
            label: "Skills",
            options: [{ id: "three", label: "browser", kind: "skill" }],
          },
        ]}
        onDismiss={onDismiss}
        onSelect={onSelect}
        query="@src"
      />,
    );

    const listbox = screen.getByRole("listbox");
    const firstOption = screen.getByRole("option", { name: "src/App.tsx" });
    expect(firstOption.getAttribute("aria-selected")).toBe("true");
    expect(firstOption.tabIndex).toBe(-1);
    expect(listbox.getAttribute("aria-activedescendant")).toBe(firstOption.id);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    const activeOption = screen.getByRole("option", { name: "browser" });
    expect(activeOption.getAttribute("aria-selected")).toBe("true");
    expect(listbox.getAttribute("aria-activedescendant")).toBe(activeOption.id);
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "three" }),
    );
    fireEvent.keyDown(listbox, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("exposes loading and empty mention states", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ComposerMentionMenu
        groups={[
          {
            id: "stale",
            label: "Previous results",
            options: [{ id: "old", label: "Old result" }],
          },
        ]}
        loading
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Searching…");
    const listbox = screen.getByRole("listbox");
    expect(listbox.hasAttribute("aria-activedescendant")).toBe(false);
    expect(screen.queryByRole("option")).toBeNull();
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onSelect).not.toHaveBeenCalled();

    rerender(
      <ComposerMentionMenu
        emptyMessage="Nothing matches"
        groups={[]}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText("Nothing matches")).not.toBeNull();
  });

  it("clears an active composer mode without exposing product state", () => {
    const onClear = vi.fn();
    render(
      <ComposerModeIndicator
        clearLabel="Clear plan mode"
        kind="plan"
        label="Plan"
        onClear={onClear}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear plan mode" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("covers interrupted, paused, queued, and editing prompt actions", () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onQueueingChange = vi.fn();
    const onReorder = vi.fn();
    const onResume = vi.fn();
    const onSendNow = vi.fn();
    const { container } = render(
      <QueuedPromptList
        interrupted
        items={[
          { id: "a", text: "Run tests", status: "queued" },
          {
            attachmentSummary: "1 attachment",
            id: "b",
            text: "Fix failure",
            status: "paused",
          },
          { id: "c", text: "Update docs", status: "editing" },
        ]}
        onDelete={onDelete}
        onEdit={onEdit}
        onQueueingChange={onQueueingChange}
        onReorder={onReorder}
        onResume={onResume}
        onSendNow={onSendNow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("img", {
        name: "This queued prompt could not be sent",
      }),
    ).not.toBeNull();
    expect(screen.getByText("1 attachment")).not.toBeNull();

    const steer = screen.getAllByRole("button", { name: "Steer" })[0]!;
    fireEvent.click(steer);
    expect(onSendNow).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]!);
    expect(onSendNow).toHaveBeenCalledWith("b");

    fireEvent.click(
      screen.getAllByRole("button", { name: "Delete queued prompt" })[0]!,
    );
    expect(onDelete).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getAllByRole("menuitem", { name: "Edit prompt" })[0]!);
    expect(onEdit).toHaveBeenCalledWith("a");
    fireEvent.click(
      screen.getAllByRole("menuitem", { name: "Turn off queueing" })[0]!,
    );
    expect(onQueueingChange).toHaveBeenCalledWith(false);

    const rows = container.querySelectorAll(".codex-ui-composer-queue__row");
    fireEvent.dragStart(rows[0]!);
    fireEvent.drop(rows[1]!);
    expect(onReorder).toHaveBeenCalledWith("a", "b");
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Reorder Fix failure" }),
      { altKey: true, key: "ArrowDown" },
    );
    expect(onReorder).toHaveBeenCalledWith("b", "c");
  });

  it("renders nothing for an empty queue", () => {
    const { container } = render(<QueuedPromptList items={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
