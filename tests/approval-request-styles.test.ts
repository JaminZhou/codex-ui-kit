import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("approval visual contract", () => {
  it("locks the 24px elevated request-card shell", () => {
    expect(tokens).toContain(
      "--codex-ui-approval-card-radius: var(--codex-ui-radius-4xl)",
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request \{[\s\S]*?border-radius: var\(--codex-ui-approval-card-radius\);[\s\S]*?box-shadow: var\(--codex-ui-shadow-2xl\)/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request__header \{[\s\S]*?padding: 1rem 1rem 0\.75rem/,
    );
  });

  it("locks the 320px command viewport and three-line clamp contract", () => {
    expect(tokens).toContain("--codex-ui-approval-command-max-height: 20rem");
    expect(styles).toContain(
      "-webkit-line-clamp: var(--codex-ui-approval-command-lines)",
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-command code \{[\s\S]*?font-family: var\(--codex-ui-font-mono\);[\s\S]*?line-height: var\(--codex-ui-line-height-code\)/,
    );
  });

  it("uses request-card container queries for narrow action reflow", () => {
    expect(styles).toContain("@container approval-request (max-width: 28rem)");
    expect(styles).toMatch(
      /@container approval-request[\s\S]*?\.codex-ui-approval-request__action-cluster[\s\S]*?flex-direction: column/,
    );
  });
});
