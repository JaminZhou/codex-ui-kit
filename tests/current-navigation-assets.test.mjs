import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertNavigationAssets, navigationMaskDataUri, navigationHash } from "../scripts/current-navigation-assets-contract.mjs";
import { navigationPngColorProfile } from "../scripts/navigation-png-color.mjs";
const original = JSON.parse(readFileSync(new URL("../research/current-navigation-26.928.31416/assets.json", import.meta.url), "utf8"));
const mask = original.samples[0].items[5].icon.maskSvg;
describe("current public navigation provenance", () => {
  it("records the original PNG ICC profile instead of treating device RGB as sRGB", () => {
    const bytes = readFileSync(new URL("../research/current-navigation-26.928.31416/dark-1180-rest.png", import.meta.url));
    expect(navigationPngColorProfile(bytes)).toEqual(original.source.pngColorProfile);
    expect(original.source.pngColorProfile.bytes).toBe(512);
  });
  it("rejects invalid/truncated PNG color metadata", () => {
    expect(() => navigationPngColorProfile(Buffer.from("not a PNG"))).toThrow();
    const bytes = readFileSync(new URL("../research/current-navigation-26.928.31416/dark-1180-rest.png", import.meta.url));
    expect(() => navigationPngColorProfile(bytes.subarray(0, 100))).toThrow();
  });
  it("validates all source states without promoting global parity", () => expect(assertNavigationAssets(original)).toBe(original));
  it("keeps the original alpha mask rather than drawing an approximate review icon", () => {
    expect(navigationMaskDataUri(mask)).toBe(original.samples[0].items[5].icon.dataUri);
    expect(navigationHash(mask)).toBe(original.samples[0].items[5].icon.geometrySha256);
  });
  it.each(["script", "foreignObject", "image", "use"])("rejects executable/external mask node %s", tag => {
    const next = structuredClone(mask); next.children[0].children[0].tag = tag;
    expect(() => navigationMaskDataUri(next)).toThrow();
  });
  it.each([{ onload: "alert(1)" }, { href: "https://example.com/image" }, { fill: "url(https://example.com/image)" }, { fill: "url(#local)" }])("rejects unsupported mask attributes %j", attributes => {
    const next = structuredClone(mask); next.children[0].children[0].attributes = attributes;
    // Local paint servers also require defs; this narrow inert format allows solid paths only.
    expect(() => navigationMaskDataUri(next)).toThrow();
  });
  it("rejects wrong build, duplicate state, missing style, and wrong image location", () => {
    for (const mutate of [r => { r.baseline.buildNumber = "12404"; }, r => { r.samples[1] = r.samples[0]; }, r => { delete r.styles[r.samples[0].items[0].styleId]; }, r => { r.samples[0].png = "../account.png"; }]) {
      const next = structuredClone(original); mutate(next); expect(() => assertNavigationAssets(next)).toThrow();
    }
  });
});
