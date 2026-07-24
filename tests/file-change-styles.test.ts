import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

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
});
