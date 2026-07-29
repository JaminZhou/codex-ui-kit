import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../scripts/check-visual-contract.mjs", import.meta.url),
  "utf8",
);

describe("lifecycle visual policy", () => {
  it("keeps the main gate strict while scoping raster tolerance to the sidebar", () => {
    expect(contract).toContain(
      "const defaultLifecycleMainPixelRatio = 0.0025",
    );
    expect(contract).toContain(
      "const defaultLifecycleSidebarPixelRatio = 0.008",
    );
    expect(contract).toContain("const internalSidebarWidth = 274");
    expect(contract).toContain(
      "mainComparison.ratio > defaultLifecycleMainPixelRatio",
    );
    expect(contract).toContain(
      "sidebarComparison.ratio > defaultLifecycleSidebarPixelRatio",
    );
    expect(contract).not.toContain("defaultLifecyclePixelRatio");
  });
});
