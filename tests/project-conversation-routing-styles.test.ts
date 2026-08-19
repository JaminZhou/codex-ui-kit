import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("project conversation routing visual contract", () => {
  it("resets box sizing when routing components are mounted independently", () => {
    expect(styles).toMatch(
      /\.codex-ui-project-index,\n\.codex-ui-project-index \*,\n\.codex-ui-conversation-route-selector,\n\.codex-ui-conversation-route-selector \*,\n\.codex-ui-worktree-list,\n\.codex-ui-worktree-list \*,[\s\S]*?\{\n  box-sizing: border-box;\n\}/,
    );
  });

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

  it("centers new-conversation context and bounds the environment dialog", () => {
    expect(styles).toMatch(
      /\.codex-ui-new-conversation-start \{[\s\S]*?container-name: codex-ui-new-conversation-start;[\s\S]*?max-width: 37\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-new-conversation-start__layout \{[\s\S]*?min-height: 24rem;[\s\S]*?padding: 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-conversation-context-bar \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;[\s\S]*?justify-content: center/,
    );
    expect(styles).toMatch(
      /\.codex-ui-local-environment-dialog \.codex-ui-dialog__surface \{[\s\S]*?height: min\(37\.5rem,[\s\S]*?overflow: hidden;[\s\S]*?width: min\(37\.5rem, 100%\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-local-environment-dialog__groups \{[\s\S]*?min-height: 0;[\s\S]*?overflow: auto/,
    );
    expect(styles).toMatch(
      /\.codex-ui-conversation-project-options \{[\s\S]*?max-height: min\(15\.625rem, calc\(100dvh - 2rem\)\);[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/,
    );
  });

  it("matches the current compact branch creation geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-branch-creation-dialog \.codex-ui-dialog__surface \{[\s\S]*?border-radius: 1\.5625rem;[\s\S]*?min-height: 11\.91rem;[\s\S]*?padding: 1\.25rem;[\s\S]*?width: min\(25rem, 100%\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-branch-creation-dialog__input \{[\s\S]*?border-radius: 0\.9375rem;[\s\S]*?height: 2\.5rem;[\s\S]*?padding: 0 0\.75rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-branch-creation-dialog \.codex-ui-button \{[\s\S]*?border-radius: 0\.78125rem;[\s\S]*?height: 2rem;[\s\S]*?padding-inline: 1rem/,
    );
  });

  it("stacks routing and project selection at compact widths", () => {
    expect(styles).toMatch(
      /@container codex-ui-project-conversation-page \(max-width: 48rem\)[\s\S]*?\.codex-ui-project-conversation-page__body \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\)/,
    );
    expect(styles).toMatch(
      /@container codex-ui-project-conversation-page \(max-width: 34rem\)[\s\S]*?\.codex-ui-conversation-route-selector__options \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/,
    );
    expect(styles).toMatch(
      /@container codex-ui-new-conversation-start \(max-width: 30rem\)[\s\S]*?\.codex-ui-new-conversation-start__layout \{[\s\S]*?min-height: 20rem;[\s\S]*?padding: 1rem;[\s\S]*?\.codex-ui-conversation-context-bar \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
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

  it("matches the current projects table and compact updated-column boundary", () => {
    expect(styles).toMatch(
      /\.codex-ui-project-index__columns \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 4rem 8rem;[\s\S]*?min-height: 2rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-project-index\[data-layout="table"\][\s\S]*?\.codex-ui-project-index__item \{[\s\S]*?grid-template-columns: 2rem minmax\(0, 1fr\) 12rem;[\s\S]*?min-height: 4\.375rem/,
    );
    expect(styles).toMatch(
      /@container codex-ui-project-index \(max-width: 42\.5rem\)[\s\S]*?\.codex-ui-project-index__updated \{[\s\S]*?display: none/,
    );
    expect(styles).toMatch(
      /\.codex-ui-project-index\[data-layout="list"\][\s\S]*?\.codex-ui-project-index__row\[data-has-actions\][\s\S]*?padding-inline-end: 2\.75rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-project-index\[data-layout="list"\][\s\S]*?\.codex-ui-project-index__row\[data-has-expand\][\s\S]*?padding-inline-end: 4\.75rem/,
    );
    expect(styles).toContain(".codex-ui-project-index__recent");
    expect(styles).toContain(".codex-ui-project-index__page-status");
    expect(styles).toContain(
      ".codex-ui-project-index__toolbar input:focus-visible {\n  outline: 2px solid var(--codex-ui-focus);",
    );
    expect(styles).not.toMatch(
      /\.codex-ui-project-index\[data-layout="table"\][\s\S]*?\.codex-ui-project-index__toolbar input:focus-visible \{[^}]*outline:\s*0/,
    );
    expect(styles).not.toMatch(
      /\.codex-ui-project-index\[data-layout="table"\][\s\S]*?\.codex-ui-project-index__header[\s\S]*?\.codex-ui-project-index__actions \{[^}]*display:\s*none/,
    );
    expect(styles).toMatch(
      /\.codex-ui-project-index\[data-layout="table"\][\s\S]*?\.codex-ui-project-index__item-actions \{[\s\S]*?grid-column: 3;/,
    );
    expect(styles).toMatch(
      /@container codex-ui-project-index \(max-width: 42\.5rem\)[\s\S]*?\.codex-ui-project-index__item-actions \{[\s\S]*?grid-column: 2;/,
    );
  });
});
