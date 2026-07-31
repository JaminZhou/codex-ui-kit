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
      "const defaultLifecycleSidebarPixelRatio = 0.05",
    );
    expect(contract).toContain("const internalSidebarWidth = 274");
    expect(contract).toContain(
      "scene.maxPixelRatio ?? defaultLifecycleMainPixelRatio",
    );
    expect(contract).toContain(
      "mainComparison.ratio > maximumMainPixelRatio",
    );
    expect(contract).toContain(
      "sidebarComparison.ratio > defaultLifecycleSidebarPixelRatio",
    );
    expect(contract).not.toContain("const topMasks");
    expect(contract).not.toContain("defaultLifecyclePixelRatio");
  });

  it("keeps the current-build window chrome comparison ownership-scoped", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_WINDOW_CHROME_REFERENCE",
    );
    expect(contract).toContain(
      "const actualChrome = cropPng(actual, 80, 0, 120, 46)",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_WINDOW_CHROME_MAX_DIFF_RATIO",
    );
  });

  it("gates current multiline, permission, and resource Composer regions", () => {
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE",
    );
    expect(contract).toContain(
      "CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE",
    );
    expect(contract).toContain(
      'scene.id === "composer-resources-menu" ? 0.008 : 0.005',
    );
    expect(contract).toContain(
      "current-build Composer lifecycle pixel ratio",
    );
  });
});
