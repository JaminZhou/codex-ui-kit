import { describe, expect, it } from "vitest";
import { assertAcceptanceMetric } from "./acceptance";

describe("desktop acceptance assertions", () => {
  it("accepts complete in-bounds metrics", () => {
    expect(() =>
      assertAcceptanceMetric(
        "interactive",
        {
          bodyScrollWidth: 820,
          clientWidth: 820,
          dialog: { width: 400 },
          overlays: [{ inViewport: true }, { inViewport: true }],
          positionDelta: 1,
          resolvedTheme: "light",
        },
        {
          allItemsEqual: {
            overlays: { field: "inViewport", value: true },
          },
          expectedTheme: "light",
          maximumValues: { positionDelta: 1 },
          minimumItems: { overlays: 2 },
          requiredFields: ["dialog"],
        },
      ),
    ).not.toThrow();
  });

  it("reports overflow, missing surfaces, state, and nested item failures", () => {
    expect(() =>
      assertAcceptanceMetric(
        "interactive",
        {
          bodyScrollWidth: 830,
          clientWidth: 820,
          dialog: null,
          dialogFirstChoiceFocused: false,
          overlays: [{ inViewport: false }],
          positionDelta: Number.NaN,
          resolvedTheme: "dark",
        },
        {
          allItemsEqual: {
            overlays: { field: "inViewport", value: true },
          },
          equals: { dialogFirstChoiceFocused: true },
          expectedTheme: "light",
          maximumValues: { positionDelta: 1 },
          minimumItems: { overlays: 2 },
          requiredFields: ["dialog"],
        },
      ),
    ).toThrowError(
      /horizontal overflow was 10px[\s\S]*expected light theme[\s\S]*dialog was missing[\s\S]*dialogFirstChoiceFocused[\s\S]*overlays expected at least 2 items[\s\S]*positionDelta expected at most 1[\s\S]*overlays did not keep inViewport=true/,
    );
  });
});
