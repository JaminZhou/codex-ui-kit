import { describe, expect, it } from "vitest";
import { namespaceHomeVector, type Vector } from "../src/CurrentHomeObservedIcon";
import assets from "../../../research/current-home-assets-26.930.61225.json";

describe("current Home mask ownership", () => {
  const mark = assets.themes.dark[0].vector as Vector;
  it("namespaces masks per instance without changing the source", () => {
    const original = JSON.stringify(mark);
    const first = namespaceHomeVector(mark, "first");
    const second = namespaceHomeVector(mark, "second");
    expect(first.children[0].attributes.id).toBe("first-path-1-inside-1_24_869");
    expect(first.children[1].attributes.mask).toBe("url(#first-path-1-inside-1_24_869)");
    expect(second.children[0].attributes.id).not.toBe(first.children[0].attributes.id);
    expect(JSON.stringify(mark)).toBe(original);
  });
  it("rejects external, missing and ambiguous mask references", () => {
    for (const mask of ["url(https://example.test/a)", "url(#missing)", "url( #path-1-inside-1_24_869)"]) {
      const invalid = structuredClone(mark);
      invalid.children[1].attributes.mask = mask;
      expect(() => namespaceHomeVector(invalid, "safe")).toThrow();
    }
    const duplicate = structuredClone(mark);
    duplicate.children.push(structuredClone(duplicate.children[0]));
    expect(() => namespaceHomeVector(duplicate, "safe")).toThrow();
    expect(() => namespaceHomeVector(mark, "unsafe prefix")).toThrow();
  });
  it("retains both themes and the four public control families", () => {
    for (const theme of ["dark", "light"] as const) {
      expect(assets.themes[theme].map(icon => icon.id)).toEqual(["home-mark", "add-resource", "dictation", "voice-chat"]);
    }
    expect(assets.samples).toHaveLength(8);
    expect(assets.baseline.version).toBe("26.930.61225");
  });
});
