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

  it("locks the current missing-directory notice geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-working-directory-notice \{[\s\S]*?border-radius: 20px;[\s\S]*?font-size: 13px;[\s\S]*?gap: 8px;[\s\S]*?line-height: 21\.125px;[\s\S]*?min-height: 37\.125px;[\s\S]*?padding: 8px 8px 8px 12px/,
    );
    expect(styles).toMatch(
      /\.codex-ui-working-directory-notice__heading \{[\s\S]*?font-weight: var\(--codex-ui-font-weight-semibold\)/,
    );
  });

  it("locks the divider and reconnect disclosure geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-inline-notice__rule \{[\s\S]*?border-top: 1px solid var\(--codex-ui-border\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-stream-notice__details \{[\s\S]*?margin: 0\.25rem 0 0 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-stream-notice \{[\s\S]*?font-size: 14px;[\s\S]*?line-height: 21px/,
    );
  });

  it("locks the current fatal App Server recovery composition", () => {
    expect(styles).toMatch(
      /\.codex-ui-app-server-crash-recovery__content \{[\s\S]*?gap: 1rem;[\s\S]*?max-width: 56rem;[\s\S]*?padding: 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-server-crash-recovery__icon \{[\s\S]*?color: #ff6764;[\s\S]*?height: 1\.75rem;[\s\S]*?width: 1\.75rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-server-crash-recovery__copy \{[\s\S]*?gap: 0\.5rem;[\s\S]*?max-width: 28rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-app-server-crash-recovery__action \{[\s\S]*?background: #fff;[\s\S]*?font-size: 0\.8125rem;[\s\S]*?height: 1\.5rem;[\s\S]*?padding: 0\.125rem 0\.5rem/,
    );
  });

  it("disables notice motion for reduced-motion users", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-stream-notice__details,[\s\S]*?animation: none/,
    );
  });
});
