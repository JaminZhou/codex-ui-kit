// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogChoice } from "../src";

afterEach(cleanup);

function DialogHarness({ showClose = false }: { showClose?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Continue from message
      </button>
      <Dialog
        description="Choose where the independent continuation should run."
        onOpenChange={setOpen}
        open={open}
        showClose={showClose}
        size="compact"
        title="Continue in a new chat"
      >
        <DialogChoice
          description="Continue from this message in the current workspace"
          label="Use this workspace"
        />
        <DialogChoice
          description="Continue from this message in a new worktree"
          label="Use a new worktree"
        />
      </Dialog>
    </>
  );
}

describe("modal dialog", () => {
  it("labels a compact modal and focuses the first enabled choice", async () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Continue from message" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Continue in a new chat" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.parentElement?.getAttribute("data-size")).toBe("compact");
    expect(dialog.textContent).toContain(
      "Choose where the independent continuation should run.",
    );
    expect(document.body.style.overflow).toBe("hidden");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: /Use this workspace/ }),
      ),
    );
  });

  it("traps Tab, closes with Escape, and restores trigger focus", async () => {
    render(<DialogHarness showClose />);
    const trigger = screen.getByRole("button", { name: "Continue from message" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Continue in a new chat" });
    const close = screen.getByRole("button", { name: "Close dialog" });
    const lastChoice = screen.getByRole("button", { name: /Use a new worktree/ });

    await waitFor(() => expect(document.activeElement).toBe(close));
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastChoice);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("supports disabled choices, selection, and backdrop dismissal", async () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    const { rerender } = render(
      <Dialog onOpenChange={onOpenChange} open size="wide" title="Choose target">
        <DialogChoice disabled label="Unavailable" />
        <DialogChoice label="Available" onSelect={onSelect} trailing="↗" />
      </Dialog>,
    );

    expect(
      (screen.getByRole("button", { name: "Unavailable" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Close dialog" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Available ↗" }));
    expect(onSelect).toHaveBeenCalledOnce();

    const backdrop = screen
      .getByRole("dialog", { name: "Choose target" })
      .parentElement!;
    fireEvent.pointerDown(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <Dialog
        closeOnBackdrop={false}
        onOpenChange={onOpenChange}
        open
        title="Choose target"
      >
        Content
      </Dialog>,
    );
    fireEvent.pointerDown(
      screen.getByRole("dialog", { name: "Choose target" }).parentElement!,
    );
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});
