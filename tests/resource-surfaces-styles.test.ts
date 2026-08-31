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
    expect(styles).toContain(".codex-ui-citation-mention:focus-visible");
    expect(styles).toContain(
      ".codex-ui-source-search-activity__trigger:focus-visible",
    );
    expect(styles).toContain(".codex-ui-generated-image-gallery__image:focus-visible");
    expect(styles).toContain("@keyframes codex-ui-generated-image-pulse");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.codex-ui-generated-image-gallery__placeholder/,
    );
  });

  it("locks current citation and source-activity geometry", () => {
    expect(styles).toContain("height: 1.421875rem");
    expect(styles).toContain("border-radius: 0.15625rem");
    expect(styles).toContain("padding-inline: 1rem");
    expect(styles).toContain("line-height: 1.160625rem");
    expect(styles).toContain("grid-template-columns: 1rem minmax(0, 1fr)");
    expect(styles).toContain(
      ".codex-ui-source-search-activity__chevron[data-expanded]",
    );
  });
});
