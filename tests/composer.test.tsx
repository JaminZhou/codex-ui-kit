// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentComposer, ComposerAttachment } from "../src";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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
  it("starts in the compact single-line layout", () => {
    const { container } = render(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short follow-up"
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");
    expect(
      (screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement)
        .style.height,
    ).toBe("");
  });

  it("uses multiline layout for explicit line breaks and attachments", () => {
    const { container, rerender } = render(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value={"First line\nSecond line"}
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");

    rerender(
      <AgentComposer
        attachments={<span>README.md</span>}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");

    rerender(
      <AgentComposer
        attachments={false}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");
  });

  it("treats empty attachment collections as absent", () => {
    const files: string[] = [];
    const { container, rerender } = render(
      <AgentComposer
        attachments={files.map((file) => (
          <span key={file}>{file}</span>
        ))}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );

    expect(container.querySelector(".codex-ui-composer__attachments")).toBeNull();
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");

    rerender(
      <AgentComposer
        attachments={
          <>{files.map((file) => <span key={file}>{file}</span>)}</>
        }
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(
      container.querySelector(".codex-ui-composer__attachments"),
    ).toBeNull();
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");

    rerender(
      <AgentComposer
        attachments={[null, false, ""]}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(container.querySelector(".codex-ui-composer__attachments")).toBeNull();
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");

    rerender(
      <AgentComposer
        attachments={
          <>
            <>
              <span>README.md</span>
            </>
          </>
        }
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");
  });

  it("supports forced layouts for deterministic host rendering", () => {
    const { container, rerender } = render(
      <AgentComposer
        layout="multiline"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");

    rerender(
      <AgentComposer
        layout="single-line"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");
  });

  it("keeps structural multiline content safe from forced compact layout", () => {
    const { container, rerender } = render(
      <AgentComposer
        attachments={<span>README.md</span>}
        layout="single-line"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");

    rerender(
      <AgentComposer
        layout="single-line"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value={"First line\nSecond line"}
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");
  });

  it("promotes overflowing auto content to multiline", () => {
    const { container, rerender } = render(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    const measure = container.querySelector(".codex-ui-composer__measure");
    Object.defineProperty(textarea, "clientWidth", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(measure, "offsetWidth", {
      configurable: true,
      value: 100,
    });

    rerender(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="This value no longer fits the compact input"
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");

    Object.defineProperty(measure, "offsetWidth", {
      configurable: true,
      value: 40,
    });
    rerender(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Fits again"
      />,
    );
    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("single-line");
  });

  it("promotes auto layout when compact controls leave no input width", () => {
    const { container, rerender } = render(
      <AgentComposer
        actions={<button type="button">Attach</button>}
        controls={<select aria-label="Mode" />}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="A"
      />,
    );
    const fieldset = container.querySelector("fieldset");
    const actions = container.querySelector(".codex-ui-composer__actions");
    const controls = container.querySelector(".codex-ui-composer__controls");
    const textarea = screen.getByRole("textbox", { name: "Message" });
    Object.defineProperty(fieldset, "clientWidth", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(actions, "offsetWidth", {
      configurable: true,
      value: 48,
    });
    Object.defineProperty(controls, "offsetWidth", {
      configurable: true,
      value: 48,
    });
    Object.defineProperty(textarea, "clientWidth", {
      configurable: true,
      value: 0,
    });

    rerender(
      <AgentComposer
        actions={<button type="button">Attach</button>}
        controls={<select aria-label="Mode" />}
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="AB"
      />,
    );

    expect(
      container.querySelector("form")?.getAttribute("data-layout"),
    ).toBe("multiline");
  });

  it("remeasures wrapped height after auto layout becomes multiline", () => {
    const { container, rerender } = render(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Short"
      />,
    );
    const form = container.querySelector("form");
    const textarea = screen.getByRole("textbox", { name: "Message" });
    const measure = container.querySelector(".codex-ui-composer__measure");
    Object.defineProperty(textarea, "clientWidth", {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () =>
        form?.getAttribute("data-layout") === "multiline" ? 112 : 36,
    });
    Object.defineProperty(measure, "offsetWidth", {
      configurable: true,
      value: 240,
    });

    rerender(
      <AgentComposer
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="This value wraps after automatic layout promotion"
      />,
    );

    expect(form?.getAttribute("data-layout")).toBe("multiline");
    expect(textarea.style.height).toBe("112px");
  });

  it("resizes multiline input content and observes the composer width", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserverMock {
        observe = observe;
        disconnect = disconnect;
      },
    );
    const { rerender, unmount } = render(
      <AgentComposer
        layout="multiline"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="First"
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    Object.defineProperty(textarea, "scrollHeight", { value: 96 });

    rerender(
      <AgentComposer
        layout="multiline"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value={"First\nSecond\nThird"}
      />,
    );

    expect(textarea.style.height).toBe("96px");
    expect(observe).toHaveBeenCalledWith(
      textarea.closest("form") as HTMLFormElement,
    );
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("derives the multiline minimum height from computed styles", () => {
    const style = document.createElement("style");
    style.textContent =
      '.codex-ui-composer[data-layout="multiline"] .codex-ui-composer__input { min-height: 55px; }';
    document.head.append(style);
    const { rerender, unmount } = render(
      <AgentComposer
        layout="multiline"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="First"
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 20,
    });

    rerender(
      <AgentComposer
        layout="multiline"
        onSubmit={() => undefined}
        onValueChange={() => undefined}
        value="Second"
      />,
    );

    expect(textarea.style.height).toBe("55px");
    unmount();
    style.remove();
  });

  it("focuses the input from surface clicks without stealing control clicks", () => {
    const { container } = render(
      <main role="main" tabIndex={-1}>
        <AgentComposer
          actions={<button type="button">Attach</button>}
          onSubmit={() => undefined}
          onValueChange={() => undefined}
          value=""
        />
      </main>,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    const attach = screen.getByRole("button", { name: "Attach" });

    fireEvent.click(container.querySelector("form") as HTMLFormElement);
    expect(document.activeElement).toBe(textarea);

    attach.focus();
    fireEvent.click(attach);
    expect(document.activeElement).toBe(attach);
  });

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
