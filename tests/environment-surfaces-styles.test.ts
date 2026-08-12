import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("environment settings visual contract", () => {
  it("matches the current 768px unavailable-state geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-environment-settings-page \{[\s\S]*?max-width: 48rem;[\s\S]*?padding-block-start: 1\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-environment-settings-page > h1 \{[\s\S]*?font-size: 1\.5rem;[\s\S]*?font-weight: 400;[\s\S]*?line-height: 1\.2;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-environment-settings-page__status-card \{[\s\S]*?border-radius: 1\.25rem;[\s\S]*?font-size: 0\.8125rem;[\s\S]*?min-height: 2\.785rem;/,
    );
  });
});
