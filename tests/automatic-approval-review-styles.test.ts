import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("automatic approval review visual contract", () => {
  it("locks the compact timeline geometry and semantic terminal tones", () => {
    expect(styles).toMatch(
      /\.codex-ui-auto-review \{[\s\S]*?grid-template-columns: 1rem minmax\(0, 1fr\);[\s\S]*?padding: 0\.25rem 0;/,
    );
    expect(styles).toContain(
      '.codex-ui-auto-review[data-status="timedOut"] .codex-ui-auto-review__icon',
    );
    expect(styles).toContain(
      '.codex-ui-auto-review[data-status="approved"] .codex-ui-auto-review__icon',
    );
  });

  it("uses the existing approval motion and respects reduced-motion policy", () => {
    expect(styles).toMatch(
      /\.codex-ui-auto-review__spinner \{[\s\S]*?animation: codex-ui-approval-spin 800ms linear infinite/,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.codex-ui-approval-request__spinner,[\s\S]*?animation: none/,
    );
  });
});
