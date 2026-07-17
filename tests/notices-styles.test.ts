import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("notice visual contract", () => {
  it("locks the compact 16px banner shell and semantic tone roles", () => {
    expect(styles).toMatch(
      /\.codex-ui-status-banner \{[\s\S]*?border-radius: var\(--codex-ui-radius-2xl, 1rem\);[\s\S]*?padding: 0\.5rem 0\.5rem 0\.5rem 0\.75rem/,
    );
    expect(styles).toContain(
      '.codex-ui-status-banner[data-tone="warning"]',
    );
    expect(styles).toContain('.codex-ui-status-banner[data-tone="error"]');
  });

  it("keeps narrow action reflow scoped to the banner container", () => {
    expect(styles).toContain("container-type: inline-size");
    expect(styles).toContain("@container (max-width: 25rem)");
    expect(styles).toMatch(
      /@container \(max-width: 25rem\)[\s\S]*?\.codex-ui-status-banner__actions[\s\S]*?flex-wrap: wrap/,
    );
  });

  it("spans the content grid when the icon is suppressed", () => {
    expect(styles).toMatch(
      /\.codex-ui-status-banner--iconless \.codex-ui-status-banner__main \{[\s\S]*?grid-column: 1 \/ -1/,
    );
  });

  it("locks the divider and reconnect disclosure geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-inline-notice__rule \{[\s\S]*?border-top: 1px solid var\(--codex-ui-border\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-stream-notice__details \{[\s\S]*?margin: 0\.25rem 0 0 1\.5rem/,
    );
  });
});
