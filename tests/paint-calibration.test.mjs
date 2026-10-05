import { describe, expect, it } from "vitest";
import { paintCalibrationPoints, paintCalibrationPixels, assertSrgbPaintCalibration } from "../scripts/paint-calibration-contract.mjs";

const calibration = () => {
  const png = { width: 300, height: 200, data: Buffer.alloc(300 * 200 * 4) };
  for (const point of paintCalibrationPoints) png.data.set(point.rgba, (point.y * png.width + point.x) * 4);
  return png;
};
describe("independent output-profile calibration", () => {
  it("requires sRGB alpha composition and opaque controls together", () => {
    const png = calibration();
    expect(() => assertSrgbPaintCalibration(png)).not.toThrow();
    expect(paintCalibrationPixels(png)).toEqual(paintCalibrationPoints.map(({ name, rgba }) => ({ name, rgba })));
  });
  it.each([144, 155])("rejects raw or post-hoc normalized native-profile alpha %s", value => {
    const png = calibration();
    png.data.set([value, value, value, 255], (50 * png.width + 50) * 4);
    expect(() => assertSrgbPaintCalibration(png)).toThrow(/standardized sRGB/);
  });
  it.each([0, 1, 2])("does not accept a wrong control point %s", index => {
    const png = calibration(); const point = paintCalibrationPoints[index];
    png.data[(point.y * png.width + point.x) * 4 + 3] = 0;
    expect(() => assertSrgbPaintCalibration(png)).toThrow();
  });
  it("rejects wrong dimensions or truncated raster data", () => {
    expect(() => paintCalibrationPixels({ ...calibration(), width: 299 })).toThrow();
    expect(() => assertSrgbPaintCalibration({ ...calibration(), data: Buffer.alloc(0) })).toThrow();
  });
});
