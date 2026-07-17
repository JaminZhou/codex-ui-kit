import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("composer visual contract", () => {
  it("keeps the disabled shell visibly unavailable", () => {
    expect(styles).toMatch(
      /\.codex-ui-composer\[data-disabled\] \{[\s\S]*?cursor: default;[\s\S]*?opacity: 0\.58;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer\[data-disabled\] button:disabled,[\s\S]*?textarea:disabled \{[\s\S]*?cursor: default;/,
    );
  });

  it("does not apply hover affordances to disabled slotted controls", () => {
    expect(styles).toContain(
      ".codex-ui-composer__actions > button:hover:not(:disabled)",
    );
    expect(styles).toContain(
      ".codex-ui-composer__actions > select:hover:not(:disabled)",
    );
    expect(styles).toContain(
      ".codex-ui-composer-attachment__remove:hover:not(:disabled)",
    );
  });

  it("locks auxiliary composer tray and queue geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-composer__suggestions \{[\s\S]*?bottom: calc\(100% - 0\.875rem\);[\s\S]*?position: absolute;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-mention-menu \{[\s\S]*?max-height: var\(--codex-ui-composer-mention-max-height\);/,
    );
    expect(styles).toMatch(
      /\.codex-ui-composer-queue \{[\s\S]*?max-height: var\(--codex-ui-composer-queue-max-height\);/,
    );
    expect(styles).toContain(
      '.codex-ui-composer-attachment[data-layout="card"]',
    );
  });

  it("keeps queue actions discoverable from hover and keyboard focus", () => {
    expect(styles).toContain(
      ".codex-ui-composer-queue__row:focus-within .codex-ui-composer-queue__send-now",
    );
    expect(styles).toContain(
      ".codex-ui-composer-queue__handle:focus-visible",
    );
  });
});
