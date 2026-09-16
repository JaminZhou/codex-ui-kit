// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ComposerEditor, ComposerResourceMention } from "../src";

afterEach(cleanup);

describe("ComposerEditor", () => {
  it("provides a contenteditable textbox for host-owned inline content", () => {
    const { container } = render(
      <ComposerEditor label="Do anything" data-editor-kind="resource-mention">
        <ComposerResourceMention label="GitHub" />
      </ComposerEditor>,
    );

    const editor = screen.getByRole("textbox", { name: "Do anything" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.getAttribute("data-editor-kind")).toBe("resource-mention");
    expect(
      container.querySelector(
        ".codex-ui-composer-resource-mention[data-inline-mention-interactive]",
      ),
    ).not.toBeNull();
  });
});
