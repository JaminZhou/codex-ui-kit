import assert from "node:assert/strict";

// Independent markup, not extracted product UI. Alpha composition is sensitive
// to the output profile; post-hoc ICC conversion cannot undo that composition.
export const paintCalibrationHtml = '<style>html,body{margin:0;background:#242424}.one{width:100px;height:100px;background:rgba(255,255,255,.498)}.two{width:100px;height:100px;background:rgb(145,145,145)}</style><div class="one"></div><div class="two"></div>';
export const paintCalibrationCrop = Object.freeze({ x: 0, y: 0, width: 300, height: 200 });
export const paintCalibrationPoints = Object.freeze([
  { name: "alpha-white-over-dark", x: 50, y: 50, rgba: [145, 145, 145, 255] },
  { name: "opaque-mid-gray", x: 50, y: 150, rgba: [145, 145, 145, 255] },
  { name: "opaque-background", x: 150, y: 50, rgba: [36, 36, 36, 255] },
]);
export function paintCalibrationPixels(png) {
  assert.equal(png.width, paintCalibrationCrop.width);
  assert.equal(png.height, paintCalibrationCrop.height);
  return paintCalibrationPoints.map(({ name, x, y }) => ({ name, rgba: [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)] }));
}
export function assertSrgbPaintCalibration(png) {
  assert.deepEqual(paintCalibrationPixels(png), paintCalibrationPoints.map(({ name, rgba }) => ({ name, rgba })), "The raster pipeline is not the standardized sRGB alpha-composition environment");
}
