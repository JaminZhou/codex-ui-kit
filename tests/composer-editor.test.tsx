// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ComposerEditor, ComposerResourceMention } from "../src";

afterEach(cleanup);

describe("ComposerEditor", () => {
  it("provides a contenteditable textbox for host-owned inline content", () => {
    const { container } = render(
      <ComposerEditor
        label="Do anything"
        placeholder="Ask anything"
        data-editor-kind="resource-mention"
      >
        <ComposerResourceMention label="GitHub" />
      </ComposerEditor>,
    );

    const editor = screen.getByRole("textbox", { name: "Do anything" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.getAttribute("aria-multiline")).toBe("true");
    expect(editor.getAttribute("aria-placeholder")).toBe("Ask anything");
    expect(editor.getAttribute("data-placeholder")).toBe("Ask anything");
    expect(editor.getAttribute("data-editor-kind")).toBe("resource-mention");
    expect(
      container.querySelector(
        ".codex-ui-composer-resource-mention[data-inline-mention-interactive]",
      ),
    ).not.toBeNull();
  });

  it("forwards a focusable editor ref without taking ownership of editing", () => {
    const editorRef = createRef<HTMLDivElement>();
    render(<ComposerEditor ref={editorRef} />);

    expect(editorRef.current?.contentEditable).toBe("true");
    editorRef.current?.focus();
    expect(document.activeElement).toBe(editorRef.current);
  });
});
