import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/tokens.css", import.meta.url), "utf8");

describe("resource surface visual contracts", () => {
  it("locks measured resource, source, gallery, and preview geometry", () => {
    expect(tokens).toContain("--codex-ui-resource-card-height: 3.75rem");
    expect(tokens).toContain("--codex-ui-resource-icon-size: 2.5rem");
    expect(tokens).toContain("--codex-ui-generated-image-radius: var(--codex-ui-radius-2xl)");
    expect(tokens).toContain("--codex-ui-summary-panel-width: 18.75rem");
    expect(styles).toContain("grid-area: 1 / 1");
    expect(styles).toContain("flex: 0 0 1.125rem");
    expect(styles).toContain("transform: translateX(calc(-1 * var(--codex-ui-gallery-offset)))");
    expect(styles).toContain("background: rgb(0 0 0 / 0.45)");
  });

  it("keeps focus and motion behavior explicit", () => {
    expect(styles).toContain(".codex-ui-resource-card__open:focus-visible");
    expect(styles).toContain(".codex-ui-generated-image-gallery__image:focus-visible");
    expect(styles).toContain("@keyframes codex-ui-generated-image-pulse");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.codex-ui-generated-image-gallery__placeholder/,
    );
  });
});
