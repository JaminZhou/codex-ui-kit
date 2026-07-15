// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentComposer, ComposerAttachment } from "../src";

afterEach(cleanup);

interface ComposerHarnessProps {
  isRunning?: boolean;
  onStop?: () => void;
  onSubmit: (value: string) => void;
}

function ComposerHarness({
  isRunning = false,
  onStop,
  onSubmit,
}: ComposerHarnessProps) {
  const [value, setValue] = useState("");

  return (
    <AgentComposer
      isRunning={isRunning}
      onStop={onStop}
      onSubmit={onSubmit}
      onValueChange={setValue}
      value={value}
    />
  );
}

describe("AgentComposer", () => {
  it("forwards the textarea ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        ref={ref}
        value=""
      />,
    );

    expect(ref.current).toBe(screen.getByRole("textbox", { name: "Message" }));
  });

  it("uses a disabled fieldset to disable slotted form controls", () => {
    const { container } = render(
      <AgentComposer
        actions={<button type="button">Attach</button>}
        controls={<select aria-label="Mode" />}
        disabled
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Queued work"
      />,
    );

    expect(
      (container.querySelector("fieldset") as HTMLFieldSetElement).disabled,
    ).toBe(true);
  });

  it("submits a non-empty controlled value with Enter", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.change(textarea, { target: { value: "Run the checks" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("Run the checks");
  });

  it("keeps whitespace-only values non-submittable", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.change(textarea, { target: { value: "   " } });
    expect(
      (screen.getByRole("button", {
        name: "Send message",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps Shift+Enter as a newline gesture", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.change(textarea, { target: { value: "First line" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit while an IME composition is active", () => {
    const onSubmit = vi.fn();
    render(<ComposerHarness onSubmit={onSubmit} />);
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.change(textarea, { target: { value: "继续" } });
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(textarea);
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("继续");
  });

  it("switches the primary action to Stop while running", () => {
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ComposerHarness isRunning onStop={onStop} onSubmit={onSubmit} />,
    );

    expect(
      screen.queryByRole("button", { name: "Send message" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stop generation" }));

    expect(onStop).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders removable attachment metadata", () => {
    const onRemove = vi.fn();
    render(
      <ComposerAttachment
        label="src/App.tsx"
        meta="12 KB"
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("src/App.tsx")).toBeTruthy();
    expect(screen.getByText("12 KB")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove src/App.tsx" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
