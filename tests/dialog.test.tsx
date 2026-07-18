// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogChoice,
  ImagePreviewDialog,
  Menu,
  MenuItem,
  Popover,
  type GeneratedImageItem,
} from "../src";

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

  it.each([
    ["choice dialog first", false, true],
    ["image preview first", true, false],
  ])(
    "keeps document scroll locked when closing %s",
    (_, choiceDialogOpenAfterClose, imagePreviewOpenAfterClose) => {
      const image: GeneratedImageItem = {
        alt: "Generated preview",
        id: "generated-preview",
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
      };
      const renderModals = (choiceDialogOpen: boolean, imagePreviewOpen: boolean) => (
        <>
          <Dialog
            onOpenChange={vi.fn()}
            open={choiceDialogOpen}
            title="Choice dialog"
          >
            <DialogChoice label="Choice" />
          </Dialog>
          <ImagePreviewDialog
            images={[image]}
            onOpenChange={vi.fn()}
            open={imagePreviewOpen}
          />
        </>
      );
      const { rerender } = render(renderModals(true, true));

      expect(document.body.style.overflow).toBe("hidden");
      rerender(
        renderModals(choiceDialogOpenAfterClose, imagePreviewOpenAfterClose),
      );
      expect(document.body.style.overflow).toBe("hidden");
      rerender(renderModals(false, false));
      expect(document.body.style.overflow).toBe("");
    },
  );

  it.each([
    ["top preview first", true, false],
    ["lower dialog first", false, true],
  ])(
    "restores focus through the modal stack when closing %s",
    async (_, dialogOpenAfterFirstClose, previewOpenAfterFirstClose) => {
      const image: GeneratedImageItem = {
        alt: "Stack preview",
        id: "stack-preview",
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
      };
      const renderStack = (dialogOpen: boolean, previewOpen: boolean) => (
        <>
          <button type="button">Outside trigger</button>
          <Dialog
            onOpenChange={vi.fn()}
            open={dialogOpen}
            showClose={false}
            title="Stack dialog"
          >
            <button type="button">Preview trigger</button>
          </Dialog>
          <ImagePreviewDialog
            images={[image]}
            onOpenChange={vi.fn()}
            open={previewOpen}
          />
        </>
      );
      const { rerender } = render(renderStack(false, false));
      const outsideTrigger = screen.getByRole("button", {
        name: "Outside trigger",
      });
      outsideTrigger.focus();
      rerender(renderStack(true, false));
      const previewTrigger = await screen.findByRole("button", {
        name: "Preview trigger",
      });
      await waitFor(() => expect(document.activeElement).toBe(previewTrigger));
      previewTrigger.focus();
      rerender(renderStack(true, true));
      const previewClose = await screen.findByRole("button", {
        name: "Close image preview",
      });
      await waitFor(() => expect(document.activeElement).toBe(previewClose));

      rerender(
        renderStack(dialogOpenAfterFirstClose, previewOpenAfterFirstClose),
      );
      if (previewOpenAfterFirstClose) {
        expect(document.activeElement).toBe(previewClose);
      } else {
        await waitFor(() => expect(document.activeElement).toBe(previewTrigger));
      }
      expect(document.body.style.overflow).toBe("hidden");

      rerender(renderStack(false, false));
      await waitFor(() => expect(document.activeElement).toBe(outsideTrigger));
      expect(document.body.style.overflow).toBe("");
    },
  );

  it("does not move focus behind a higher-priority preview", async () => {
    const image: GeneratedImageItem = {
      alt: "Priority preview",
      id: "priority-preview",
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
    };
    const renderPriorityStack = (dialogOpen: boolean, previewOpen = true) => (
      <>
        <Dialog
          onOpenChange={vi.fn()}
          open={dialogOpen}
          showClose={false}
          title="Lower-priority dialog"
        >
          <button type="button">Lower dialog action</button>
        </Dialog>
        <ImagePreviewDialog
          images={[image]}
          onOpenChange={vi.fn()}
          open={previewOpen}
        />
      </>
    );
    const { rerender } = render(renderPriorityStack(false));
    const previewClose = screen.getByRole("button", {
      name: "Close image preview",
    });
    expect(document.activeElement).toBe(previewClose);

    rerender(renderPriorityStack(true));
    await waitFor(() => expect(document.activeElement).toBe(previewClose));
    expect(
      screen.getByRole("dialog", { name: "Lower-priority dialog" }),
    ).toBeTruthy();

    rerender(renderPriorityStack(true, false));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Lower dialog action" }),
      ),
    );
  });

  it("preserves a scoped theme and elevates nested portalled overlays", async () => {
    function ThemedDialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div data-theme="dark">
          <button onClick={() => setOpen(true)} type="button">
            Open themed dialog
          </button>
          <Dialog onOpenChange={setOpen} open={open} title="Themed dialog">
            <Menu
              defaultOpen
              trigger={<button type="button">Open actions</button>}
            >
              <MenuItem>Rename</MenuItem>
            </Menu>
          </Dialog>
        </div>
      );
    }

    render(<ThemedDialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open themed dialog" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialogRoot = screen.getByRole("dialog", {
      name: "Themed dialog",
    }).parentElement!;
    expect(dialogRoot.getAttribute("data-theme")).toBe("dark");
    const menu = await screen.findByRole("menu");
    expect(menu.getAttribute("data-theme")).toBe("dark");
    expect(menu.getAttribute("data-codex-ui-overlay-layer")).toBe("dialog");
    const rename = screen.getByRole("menuitem", { name: "Rename" });
    rename.focus();
    expect(fireEvent.keyDown(rename, { key: "Tab" })).toBe(true);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Themed dialog" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open actions" }));
    const reopenedMenu = await screen.findByRole("menu");
    fireEvent.keyDown(reopenedMenu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Themed dialog" })).toBeTruthy();
  });

  it("keeps a dialog-owned popover inside the modal focus loop", () => {
    render(
      <Dialog onOpenChange={vi.fn()} open title="Parent dialog">
        <Popover
          defaultOpen
          label="Nested details"
          trigger={<button type="button">Details</button>}
        >
          <button type="button">First nested action</button>
          <button type="button">Last nested action</button>
        </Popover>
      </Dialog>,
    );

    const close = screen.getByRole("button", { name: "Close dialog" });
    const lastNested = screen.getByRole("button", {
      name: "Last nested action",
    });
    lastNested.focus();
    expect(fireEvent.keyDown(lastNested, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(close);

    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(lastNested);
  });
});
