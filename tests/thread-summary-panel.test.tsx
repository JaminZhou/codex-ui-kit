// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThreadSummaryDelta,
  ThreadSummaryDock,
  ThreadSummaryIconButton,
  ThreadSummaryItem,
  ThreadSummaryPanel,
  ThreadSummaryPopover,
  ThreadSummarySection,
} from "../src";
import { useRef, useState } from "react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function SummaryFixture({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <ThreadSummaryPopover defaultOpen={defaultOpen}>
      <ThreadSummaryPanel>
        <ThreadSummarySection
          actions={
            <ThreadSummaryIconButton icon="+" label="Set up local environment" />
          }
          collapsible
          title="Environment"
          toggleLabel="Toggle environment summary"
        >
          <ThreadSummaryItem
            label="Changes"
            leading="◫"
            meta={<ThreadSummaryDelta added={2} removed={1} />}
          />
          <ThreadSummaryItem label="Local" leading="▱" trailing="⌄" />
          <ThreadSummaryItem disabled label="Commit or push" leading="○" />
        </ThreadSummarySection>
      </ThreadSummaryPanel>
    </ThreadSummaryPopover>
  );
}

function DockFixture() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  const [pinned, setPinned] = useState(true);
  return (
    <div>
      <button
        aria-label="Toggle pinned summary"
        aria-pressed={pinned}
        onClick={() => {
          if (open && pinned) {
            setPinned(false);
            return;
          }
          setOpen(true);
          setPinned(true);
        }}
        ref={anchorRef}
        type="button"
      >
        Summary
      </button>
      <ThreadSummaryDock
        anchorRef={anchorRef}
        onOpenChange={setOpen}
        open={open}
        pinned={pinned}
      >
        <ThreadSummaryPanel label="Docked summary">
          <ThreadSummarySection title="Sources">
            <ThreadSummaryItem label="openai-docs-mcp" />
          </ThreadSummarySection>
        </ThreadSummaryPanel>
      </ThreadSummaryDock>
      <button type="button">Outside</button>
    </div>
  );
}

describe("thread summary panel", () => {
  it("composes current sections, rows, delta semantics, and disabled actions", () => {
    render(<SummaryFixture />);

    expect(screen.getByRole("dialog", { name: "Thread summary" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Toggle summary" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(screen.getByLabelText("2 additions, 1 deletions").textContent).toBe(
      "+2-1",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Commit or push" })
        .disabled,
    ).toBe(true);
    expect(
      document.querySelector('[data-slot="thread-summary-panel-item-leading"]'),
    ).toBeTruthy();
  });

  it("collapses a section without closing the containing summary", () => {
    render(<SummaryFixture />);
    const sectionToggle = screen.getByRole("button", {
      name: "Toggle environment summary",
    });
    fireEvent.click(sectionToggle);

    expect(sectionToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Changes" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Thread summary" })).toBeTruthy();
  });

  it("toggles from the header and restores trigger focus after Escape", () => {
    vi.useFakeTimers();
    render(<SummaryFixture defaultOpen={false} />);
    const trigger = screen.getByRole("button", { name: "Toggle summary" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Thread summary" })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Thread summary" }), {
      key: "Escape",
    });
    vi.runAllTimers();

    expect(screen.queryByRole("dialog", { name: "Thread summary" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps a pinned dock open, then dismisses its floating state outside", () => {
    render(<DockFixture />);
    const dock = document.querySelector('[data-slot="thread-summary-dock"]');
    const trigger = screen.getByRole("button", {
      name: "Toggle pinned summary",
    });
    const outside = screen.getByRole("button", { name: "Outside" });

    expect(dock?.getAttribute("data-open")).toBe("true");
    expect(dock?.getAttribute("data-pinned")).toBe("true");
    fireEvent.pointerDown(outside);
    expect(dock?.getAttribute("data-open")).toBe("true");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-pressed")).toBe("false");
    expect(dock?.getAttribute("data-pinned")).toBe("false");
    fireEvent.pointerDown(outside);
    expect(dock?.getAttribute("data-open")).toBe("false");
    expect(dock?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(trigger);
    expect(dock?.getAttribute("data-open")).toBe("true");
    expect(dock?.getAttribute("data-pinned")).toBe("true");
  });
});
