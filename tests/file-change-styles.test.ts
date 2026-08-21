import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("file change visual contract", () => {
  it("keeps the measured shell geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-file-change__shell \{[\s\S]*?border-radius: var\(--codex-ui-radius-md\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-change \.codex-ui-activity__body \{[\s\S]*?margin: 0\.375rem 0 0/,
    );
    expect(styles).toContain("padding: 0.125rem 0.375rem 0.125rem 0.625rem");
  });

  it("locks the default, short, and fallback diff viewport caps", () => {
    expect(styles).toMatch(
      /\.codex-ui-file-diff \{[\s\S]*?max-height: 15rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-diff\[data-size="short"\] \{\s*max-height: 6\.25rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-diff\[data-size="fallback"\] \{\s*max-height: 10rem/,
    );
  });

  it("uses semantic editor surfaces and conditional edge fades", () => {
    expect(styles).toContain("background: var(--codex-ui-editor-added)");
    expect(styles).toContain("background: var(--codex-ui-editor-deleted)");
    expect(styles).toContain(
      ".codex-ui-file-diff[data-fade-top][data-fade-bottom]",
    );
    expect(styles).toContain(
      ".codex-ui-file-diff[data-fade-bottom]:not([data-fade-top])",
    );
    expect(styles).toContain(".codex-ui-file-diff__split-pane");
    expect(styles).toContain('data-line-kind="empty"');
    expect(styles).toContain(
      ".codex-ui-file-diff[data-wrap] .codex-ui-file-diff__split-pane code",
    );
    expect(styles).toContain(
      ".codex-ui-file-diff[data-wrap] .codex-ui-file-diff__split-spanning code",
    );
  });

  it("keeps the Review file tree themed and narrow hidden-tree paths visible", () => {
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace__files \{[\s\S]*?background: var\(--codex-ui-conversation-thread-background\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace__tree > button\[data-selected\] \{[\s\S]*?background: light-dark\([\s\S]*?var\(--codex-ui-background-button-secondary\),[\s\S]*?rgb\(34 34 34\)/,
    );
    expect(styles).toContain(
      ".codex-ui-file-review-workspace[data-files-visible]",
    );
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace\[data-files-visible\][\s\S]*?\.codex-ui-file-review-workspace__file-identity[\s\S]*?code \{\s*display: none;/,
    );
  });

  it("themes the complete Review diff area and contracts narrow actions", () => {
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace__diffs \{[\s\S]*?background: var\(--codex-ui-conversation-thread-background\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace__diff > header \{[\s\S]*?background: light-dark\([\s\S]*?var\(--codex-ui-background-surface-under\),[\s\S]*?rgb\(34 34 34\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-file-review-workspace__diff > \.codex-ui-file-diff \{[\s\S]*?background: light-dark\([\s\S]*?var\(--codex-ui-conversation-thread-background\),[\s\S]*?var\(--codex-ui-code-block-bg\)/,
    );
    expect(styles).toMatch(
      /@container \(max-width: 23rem\) \{[\s\S]*?\.codex-ui-file-review-workspace__toolbar-actions[\s\S]*?> \.codex-ui-file-review-workspace__optional-action,[\s\S]*?\.codex-ui-file-review-workspace__git-actions \{\s*display: none;/,
    );
  });

  it("shows streaming content directly and honors reduced motion", () => {
    expect(styles).toMatch(
      /\.codex-ui-file-change\[data-file-status="streaming"\][\s\S]*?animation: none/,
    );
    expect(styles).toContain(".codex-ui-file-change__action[data-streaming]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    const streamingPulse = styles.match(
      /@keyframes codex-ui-file-change-streaming \{([\s\S]*?)\n\}/,
    )?.[1];
    expect(streamingPulse).toContain(
      "color: var(--codex-ui-text-secondary)",
    );
    expect(streamingPulse).toContain("color: var(--codex-ui-text)");
    expect(streamingPulse).not.toContain("opacity");
  });

  it("resets box sizing on every public file-workflow root and descendant", () => {
    for (const selector of [
      ".codex-ui-file-change,",
      ".codex-ui-file-change *,",
      ".codex-ui-file-change-group,",
      ".codex-ui-file-change-group *,",
      ".codex-ui-file-diff,",
      ".codex-ui-file-diff *,",
      ".codex-ui-file-review,",
      ".codex-ui-file-review *,",
      ".codex-ui-file-review-workspace,",
      ".codex-ui-file-review-workspace *,",
    ]) {
      expect(styles).toContain(selector);
    }
  });
});
