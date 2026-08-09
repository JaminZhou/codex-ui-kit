import { describe, expect, it } from "vitest";
import {
  applyDemoThemePreference,
  isDemoThemeView,
  parseDemoThemePreference,
  resolveDemoThemePreference,
} from "../src/theme";

describe("demo theme preference", () => {
  it("keeps the existing dark baseline for absent and invalid values", () => {
    expect(parseDemoThemePreference(null)).toBe("dark");
    expect(parseDemoThemePreference("contrast")).toBe("dark");
  });

  it.each(["system", "light", "dark"] as const)(
    "accepts the explicit %s preference",
    (preference) => {
      expect(parseDemoThemePreference(preference)).toBe(preference);
    },
  );

  it("limits theme selection to the completed shell and workspace routes", () => {
    expect(isDemoThemeView("shell")).toBe(true);
    expect(isDemoThemeView("workspace")).toBe(true);
    expect(isDemoThemeView("conversation")).toBe(false);
    expect(isDemoThemeView("pull-request")).toBe(false);

    expect(resolveDemoThemePreference("light", "workspace")).toBe("light");
    expect(resolveDemoThemePreference("system", "shell")).toBe("system");
    expect(resolveDemoThemePreference("light", "conversation")).toBe("dark");
    expect(resolveDemoThemePreference("system", "pull-request")).toBe("dark");
  });

  it("maps explicit themes to the root dataset and leaves system to media", () => {
    const dataset: Record<string, string> = {};
    const root = { dataset } as unknown as HTMLElement;

    applyDemoThemePreference(root, "light");
    expect(root.dataset.theme).toBe("light");

    applyDemoThemePreference(root, "dark");
    expect(root.dataset.theme).toBe("dark");

    applyDemoThemePreference(root, "system");
    expect("theme" in dataset).toBe(false);
  });
});
