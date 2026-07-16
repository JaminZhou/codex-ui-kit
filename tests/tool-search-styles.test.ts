import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("tool and search visual contract", () => {
  it("keeps 16px activity icons and measured result caps", () => {
    expect(styles).toMatch(
      /\.codex-ui-tool-call__icon,[\s\S]*?height: 1rem;[\s\S]*?width: 1rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-tool-call__result \{[\s\S]*?max-height: 12rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-search-activity__entries \{[\s\S]*?max-height: 20rem/,
    );
  });

  it("keeps grouped result alignment and 14px favicons", () => {
    expect(styles).toMatch(
      /\.codex-ui-tool-call \.codex-ui-activity__body,[\s\S]*?margin: 0\.25rem 0 0 1\.5rem/,
    );
    expect(styles).toMatch(
      /\.codex-ui-search-activity__entries img,[\s\S]*?height: 0\.875rem;[\s\S]*?width: 0\.875rem/,
    );
  });

  it("protects active and disclosure motion under reduced motion", () => {
    expect(styles).toContain("@keyframes codex-ui-tool-activity-pulse");
    expect(styles).toContain("@keyframes codex-ui-tool-activity-enter");
    expect(styles).toContain(".codex-ui-tool-call__label[data-active]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
