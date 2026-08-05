// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThreadSummaryDelta,
  ThreadSummaryIconButton,
  ThreadSummaryItem,
  ThreadSummaryPanel,
  ThreadSummaryPopover,
  ThreadSummarySection,
} from "../src";

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
});
