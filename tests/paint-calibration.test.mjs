import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  it("verifies portable evidence without claiming a native ColorSync result", () => {
    const script = new URL("../scripts/check-paint-calibration.mjs", import.meta.url);
    const output = execFileSync(process.execPath, [script.pathname, "--portable"], { encoding: "utf8" });
    expect(output).toContain("Portable calibration evidence verified");
    expect(output).toContain("native ColorSync reproduction is separate");
    expect(output).not.toContain("Native ColorSync calibration reproduced");
  });
  it("keeps native reproduction required on the macOS acceptance runner", () => {
    const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts["check:research"]).toContain("check-paint-calibration.mjs --portable");
    expect(pkg.scripts["check:paint-calibration:native"]).toBe("node scripts/check-paint-calibration.mjs");
    expect(workflow).toContain("run: pnpm check:paint-calibration:native");
  });
  it("rejects unsupported modes rather than silently downgrading to portable", () => {
    const script = new URL("../scripts/check-paint-calibration.mjs", import.meta.url);
    expect(() => execFileSync(process.execPath, [script.pathname, "--native-ish"], { stdio: "pipe" })).toThrow();
  });
});
