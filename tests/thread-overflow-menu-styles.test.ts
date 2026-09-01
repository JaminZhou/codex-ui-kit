import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("ThreadOverflowMenu styles", () => {
  it("keeps the current 28px trigger geometry", () => {
    expect(styles).toMatch(
      /\.codex-ui-thread-overflow-menu__trigger \{[\s\S]*?border-radius: 0\.625rem;[\s\S]*?height: 1\.75rem;[\s\S]*?padding: 0\.25rem;[\s\S]*?width: 1\.75rem;/,
    );
  });

  it("keeps the native-menu-sized root surface and compact rows explicit", () => {
    expect(styles).toMatch(
      /\.codex-ui-thread-overflow-menu \{[\s\S]*?min-width: 15\.25rem;[\s\S]*?width: 15\.25rem;/,
    );
    expect(styles).toMatch(
      /\.codex-ui-thread-overflow-menu > \.codex-ui-menu-item,[\s\S]*?font-size: 0\.8125rem;[\s\S]*?min-height: 1\.4375rem;/,
    );
  });
});
