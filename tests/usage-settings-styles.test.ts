import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("Usage and plan selection visual contracts", () => {
  it("locks current Usage width, card, meter, and compact flow", () => {
    expect(styles).toMatch(
      /\.codex-ui-usage-settings \{[\s\S]*?max-width: 48rem;[\s\S]*?width: calc\(100% - 2\.5rem\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-usage-settings__card \{[\s\S]*?border-radius: 0\.9375rem;[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-usage-settings__meter \{[\s\S]*?height: 0\.5rem;[\s\S]*?width: 6rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-usage-settings__credits-row \{[\s\S]*?flex-direction: column;[\s\S]*?min-height: 7\.3125rem;/,
    );
  });

  it("locks the full-height embedded-plan route and responsive cards", () => {
    expect(styles).toMatch(
      /\.codex-ui-plan-selection \{[\s\S]*?height: 100%;[\s\S]*?overflow: hidden;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__topbar \{[\s\S]*?flex: 0 0 2\.875rem;[\s\S]*?height: 2\.875rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__audience \{[\s\S]*?grid-template-columns: 1fr 1fr;[\s\S]*?width: 22rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__card--accent \{[\s\S]*?206\.72deg,[\s\S]*?#274b72 2\.34%,[\s\S]*?#212121 92\.37%/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__card\[data-plan-id="pro"\] \{\s*order: -1;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-plan-selection__card \{\s*max-width: 24\.125rem;\s*width: 100%;/,
    );
  });
});
