import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isThemeSource,
  isWindowPreset,
  themeSources,
  windowPresets,
} from "./contract";

describe("desktop playground contract", () => {
  it("accepts only supported native theme sources", () => {
    expect(themeSources.every(isThemeSource)).toBe(true);
    expect(isThemeSource("auto")).toBe(false);
    expect(isThemeSource(null)).toBe(false);
  });

  it("accepts only own window preset keys", () => {
    expect(Object.keys(windowPresets).every(isWindowPreset)).toBe(true);
    expect(isWindowPreset("fullscreen")).toBe(false);
    expect(isWindowPreset("toString")).toBe(false);
  });

  it("keeps every preset above the minimum supported viewport", () => {
    for (const preset of Object.values(windowPresets)) {
      expect(preset.width).toBeGreaterThanOrEqual(720);
      expect(preset.height).toBeGreaterThanOrEqual(620);
    }
  });

  it("propagates interactive acceptance failures to the process boundary", () => {
    const mainSource = readFileSync(
      new URL("../main/index.ts", import.meta.url),
      "utf8",
    );
    expect(mainSource).not.toContain("captureError");
    expect(mainSource).toContain(
      'console.error("acceptance capture failed", error)',
    );
    expect(mainSource).toContain("app.exit(1)");
  });
});
