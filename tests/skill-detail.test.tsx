// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillDetailDialog, SkillPromptMention } from "../src";

afterEach(cleanup);

function SkillDetailHarness({ initiallyMenuOpen = false }) {
  const [open, setOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(initiallyMenuOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button onClick={() => setOpen(true)} ref={triggerRef} type="button">
        Open skill
      </button>
      <SkillDetailDialog
        actionsMenuOpen={actionsMenuOpen}
        description="OpenAI and Codex docs for models, skills, tasks, and setup"
        onActionsMenuOpenChange={setActionsMenuOpen}
        onOpenChange={setOpen}
        open={open}
        returnFocusRef={triggerRef}
        title="OpenAI Docs"
      >
        <p>Use official documentation sources.</p>
      </SkillDetailDialog>
    </>
  );
}

describe("SkillDetail", () => {
  it("labels the modal and keeps skill instructions host supplied", async () => {
    render(<SkillDetailHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Open skill" }));

    const dialog = screen.getByRole("dialog", { name: "OpenAI Docs" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("OpenAI DocsSkill");
    expect(dialog.textContent).toContain("Use official documentation sources.");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        dialog.querySelector("[data-skill-detail-initial-focus]"),
      ),
    );
  });

  it("delegates enable, uninstall, and try-now effects to the host", () => {
    const onEnabledChange = vi.fn();
    const onTryNow = vi.fn();
    const onUninstall = vi.fn();
    render(
      <SkillDetailDialog
        onEnabledChange={onEnabledChange}
        onOpenChange={vi.fn()}
        onTryNow={onTryNow}
        onUninstall={onUninstall}
        open
        title="OpenAI Docs"
      >
        Instructions
      </SkillDetailDialog>,
    );

    const toggle = screen.getByRole("switch", { name: "Disable skill" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));
    fireEvent.click(screen.getByRole("button", { name: "Try now" }));
    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(onUninstall).toHaveBeenCalledOnce();
    expect(onTryNow).toHaveBeenCalledOnce();
  });

  it("exposes the read-only actions menu through controlled callbacks", () => {
    const onActionsMenuOpenChange = vi.fn();
    const onCopyMarkdown = vi.fn();
    const onOpen = vi.fn();
    const onReveal = vi.fn();
    const { rerender } = render(
      <SkillDetailDialog
        onActionsMenuOpenChange={onActionsMenuOpenChange}
        onCopyMarkdown={onCopyMarkdown}
        onOpen={onOpen}
        onOpenChange={vi.fn()}
        onReveal={onReveal}
        open
        title="OpenAI Docs"
      >
        Instructions
      </SkillDetailDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(onActionsMenuOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <SkillDetailDialog
        actionsMenuOpen
        onActionsMenuOpenChange={onActionsMenuOpenChange}
        onCopyMarkdown={onCopyMarkdown}
        onOpen={onOpen}
        onOpenChange={vi.fn()}
        onReveal={onReveal}
        open
        title="OpenAI Docs"
      >
        Instructions
      </SkillDetailDialog>,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Markdown" }));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(onReveal).toHaveBeenCalledOnce();
    expect(onCopyMarkdown).toHaveBeenCalledOnce();
    expect(onActionsMenuOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("dismisses the menu before the modal on successive Escape presses", async () => {
    render(<SkillDetailHarness initiallyMenuOpen />);
    const trigger = screen.getByRole("button", { name: "Open skill" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "OpenAI Docs" });

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "OpenAI Docs" })).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "OpenAI Docs" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("renders an inert inline skill mention for an unsent host draft", () => {
    render(
      <div aria-label="Do anything" contentEditable role="textbox">
        Look up the current docs. <SkillPromptMention label="OpenAI Docs" />
      </div>,
    );
    const mention = screen.getByText("OpenAI Docs").parentElement!;
    expect(mention.getAttribute("contenteditable")).toBe("false");
    expect(mention.hasAttribute("data-inline-mention-interactive")).toBe(true);
    expect(screen.getByRole("textbox", { name: "Do anything" }).textContent).toContain(
      "Look up the current docs.",
    );
  });
});
