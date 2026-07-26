import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("project conversation routing visual contract", () => {
  it("keeps the page bounded with independently scrolling columns", () => {
    expect(styles).toContain(
      "container-name: codex-ui-project-conversation-page",
    );
    expect(styles).toMatch(
      /\.codex-ui-project-conversation-page__body \{[\s\S]*?flex: 1 1 auto;[\s\S]*?grid-template-columns: minmax\(15rem, 20rem\) minmax\(0, 1fr\);[\s\S]*?grid-template-rows: minmax\(0, 1fr\);[\s\S]*?overflow: hidden/,
    );
    expect(styles).toMatch(
      /\.codex-ui-project-conversation-page__projects,[\s\S]*?\.codex-ui-project-conversation-page__setup \{[\s\S]*?overflow: auto/,
    );
  });

  it("stacks routing and project selection at compact widths", () => {
    expect(styles).toMatch(
      /@container codex-ui-project-conversation-page \(max-width: 48rem\)[\s\S]*?\.codex-ui-project-conversation-page__body \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/,
    );
    expect(styles).toMatch(
      /@container codex-ui-project-conversation-page \(max-width: 34rem\)[\s\S]*?\.codex-ui-conversation-route-selector__options \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    );
  });

  it("exposes selected, focus, unavailable, and repair states", () => {
    expect(styles).toContain(
      ".codex-ui-conversation-route-selector__option[data-selected]",
    );
    expect(styles).toContain(
      ".codex-ui-worktree-list__item:focus-visible",
    );
    expect(styles).toContain(
      '.codex-ui-worktree-list__status[data-status="repairing"]',
    );
    expect(styles).toContain(
      '.codex-ui-project-index__status[data-status="unavailable"]',
    );
  });
});
