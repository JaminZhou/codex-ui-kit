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

  it("keeps the current Composer-dock presentation at least 162px tall", () => {
    const composerShell = styles.match(
      /\.codex-ui-approval-request\[data-presentation="composer"\] \{([\s\S]*?)\n\}/,
    )?.[1];

    expect(composerShell).toMatch(
      /border-radius: 1\.5625rem;[\s\S]*?min-height: 10\.125rem;/,
    );
    expect(composerShell).not.toMatch(/(?:^|\n)\s*height:/);
    expect(styles).toMatch(
      /\.codex-ui-approval-request\[data-presentation="composer"\][\s\S]*?\.codex-ui-approval-request__header \{[\s\S]*?padding: 1rem 0\.75rem 0\.375rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request\[data-presentation="composer"\][\s\S]*?\.codex-ui-approval-request__description \{[\s\S]*?border-radius: var\(--codex-ui-radius-md\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request\[data-presentation="composer"\][\s\S]*?\.codex-ui-approval-request__button \{[\s\S]*?border-radius: var\(--codex-ui-radius-full\);[\s\S]*?min-height: 1\.75rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request__shortcut \{[\s\S]*?height: 1\.125rem;[\s\S]*?min-width: 1\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request\[data-presentation="composer"\][\s\S]*?\.codex-ui-approval-request__button\[data-action="reject"\] \{[\s\S]*?min-width: 5\.349609375rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request\[data-presentation="composer"\][\s\S]*?\.codex-ui-approval-request__button\[data-action="approve"\] \{[\s\S]*?min-width: 6\.7265625rem;/,
    );
  });

  it("locks the current split trigger and approval options menu", () => {
    expect(styles).toMatch(
      /\.codex-ui-approval-request__options-toggle \{[\s\S]*?flex: 0 0 1\.5rem;[\s\S]*?width: 1\.5rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request__options-menu \{[\s\S]*?border-radius: 0\.9375rem;[\s\S]*?gap: 0\.125rem;[\s\S]*?padding: 0\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-approval-request__options-menu button \{[\s\S]*?min-height: 1\.78515625rem;[\s\S]*?padding: 0 0\.5rem;/,
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
