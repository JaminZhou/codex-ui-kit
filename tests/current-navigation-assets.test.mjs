import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertNavigationAssets, assertNavigationDecorationPixels, assertNavigationRasterBackground, navigationMaskDataUri, navigationHash } from "../scripts/current-navigation-assets-contract.mjs";
import { navigationPngColorProfile } from "../scripts/navigation-png-color.mjs";
const original = JSON.parse(readFileSync(new URL("../research/current-navigation-26.928.31416/assets.json", import.meta.url), "utf8"));
const mask = original.samples[0].items[5].icon.maskSvg;
const latest = JSON.parse(readFileSync(new URL("../research/current-navigation-26.930.31730/assets.json", import.meta.url), "utf8"));
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
  it("keeps the new build and standardized output profile separate from historical ICC references", () => {
    expect(assertNavigationAssets(latest)).toBe(latest);
    expect(latest.baseline.appVersion).toBe("26.930.31730");
    expect(latest.samples).toHaveLength(104);
    expect(latest.source.pngColorProfile).toBeNull();
    expect(latest.samples[0].paintStack.map(layer => layer.tag)).toContain("body");
    const bytes = readFileSync(new URL("../research/current-navigation-26.930.31730/dark-1180-rest.png", import.meta.url));
    expect(navigationPngColorProfile(bytes)).toBeNull();
    expect(navigationHash(bytes)).toBe(latest.samples[0].pngSha256);
  });
  it("rejects unknown builds, missing calibration, native-profile composition, and unsupported ancestor evidence", () => {
    for (const mutate of [
      r => { r.baseline.appVersion = "26.930.unknown"; },
      r => { r.source.colorProfileMode = "native"; },
      r => { r.source.pngColorProfile = original.source.pngColorProfile; },
      r => { r.source.calibration.pixels[0].rgba = [155, 155, 155, 255]; },
      r => { delete r.source.calibration; },
      r => { r.source.viewportMode = "native-product-window-resize"; },
      r => { r.source.rasterMode = "transparent-renderer"; },
      r => { r.samples[0].paintStack[0].tag = "script"; },
      r => { r.samples[0].paintStack[0].styleId = "missing"; },
      r => { r.samples[0].paintStack[0].rect.width = Infinity; },
      r => { r.samples[0].paintStack = []; },
      r => { r.samples[0].items[0].decorations = [{ tag: "image", rect: { left: 30, top: 58, width: 8, height: 8 }, styleId: r.samples[0].items[0].styleId }]; },
    ]) {
      const next = structuredClone(latest); mutate(next);
      expect(() => assertNavigationAssets(next)).toThrow();
    }
  });
  it("requires contextual dot presence to agree with original pixels, including the absent state", () => {
    const png = { width: 52, height: 280, data: Buffer.alloc(52 * 280 * 4) };
    const sample = { items: [{ decorations: [] }] };
    expect(() => assertNavigationDecorationPixels(sample, png)).not.toThrow();
    png.data.set([58, 131, 247, 255], (18 * 52 + 34) * 4);
    expect(() => assertNavigationDecorationPixels(sample, png)).toThrow(/presence must match/);
    sample.items[0].decorations.push({});
    expect(() => assertNavigationDecorationPixels(sample, png)).not.toThrow();
    png.data.set([36, 36, 36, 255], (18 * 52 + 34) * 4);
    expect(() => assertNavigationDecorationPixels(sample, png)).toThrow(/presence must match/);
  });
  it.each([
    ["dark", "rgba(0, 0, 0, 0)", [40, 40, 40, 204]],
    ["dark", "rgb(20, 20, 20)", [36, 36, 36, 255]],
    ["light", "rgba(0, 0, 0, 0)", [246, 246, 246, 217]],
    ["light", "rgb(246, 246, 246)", [246, 246, 246, 255]],
  ])("keeps %s root %s RGBA separate", (theme, color, rgba) => {
    const png = { width: 52, height: 280, data: Buffer.alloc(52 * 280 * 4) };
    png.data.set(rgba);
    const record = { styles: { body: { "background-color": color } } };
    const sample = { theme, paintStack: [{ tag: "body", styleId: "body" }] };
    expect(() => assertNavigationRasterBackground(record, sample, png)).not.toThrow();
    png.data[3] = 0;
    expect(() => assertNavigationRasterBackground(record, sample, png)).toThrow(/alpha\/background/);
  });
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
