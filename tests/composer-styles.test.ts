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
      ".codex-ui-composer-attachment button:hover:not(:disabled)",
    );
  });
});
