import { describe, expect, it } from "vitest";
import {
  compositeShellPaintRasterOnObservedBackground,
  currentShellPaintCompositeBackground,
} from "../scripts/current-shell-paint-contract.mjs";

describe("current shell paint comparison", () => {
  it("composites both transparent renderer captures over the observed main surface", () => {
    expect(currentShellPaintCompositeBackground).toEqual([24, 24, 24]);
    const raster = {
      width: 3,
      height: 1,
      data: Buffer.from([
        40, 40, 40, 178,
        61, 61, 61, 208,
        24, 24, 24, 255,
      ]),
    };

    expect(compositeShellPaintRasterOnObservedBackground(raster)).toEqual({
      width: 3,
      height: 1,
      data: Buffer.from([
        35, 35, 35, 255,
        54, 54, 54, 255,
        24, 24, 24, 255,
      ]),
    });
  });

  it("rejects malformed image buffers", () => {
    expect(() => compositeShellPaintRasterOnObservedBackground({
      width: 1,
      height: 1,
      data: Buffer.alloc(3),
    })).toThrow();
  });
});
