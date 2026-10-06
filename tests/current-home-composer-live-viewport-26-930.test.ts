import { describe, expect, it } from "vitest";
import observation from "../research/current-home-composer-live-viewport-26.930.31730.json";

describe("Codex 26.930 Home/Composer live viewport evidence", () => {
  it("pins the observation to the inspected package and natural wide viewport", () => {
    expect(observation.baseline).toMatchObject({
      appVersion: "26.930.31730",
      buildNumber: "12947",
      chromiumVersion: "154.0.8037.98",
      appAsarBytes: 546863116,
      appAsarSha256:
        "87a934de9a00a04d2e534693db87756321ca4f3413f6caa55d3a0d32a5543836",
    });
    expect(observation.capture.viewport).toEqual({
      width: 2560,
      height: 1318,
      devicePixelRatio: 1,
      emulated: false,
    });
    expect(observation.capture.theme).toBe("dark");
  });

  it("records measured Home and empty Composer structure without copy", () => {
    expect(observation.layout.home.mark).toMatchObject({
      rect: { width: 56, height: 56 },
      viewBox: "149 149 418 418",
      pathCount: 4,
    });
    expect(observation.layout.home.title).toMatchObject({
      fontSize: "28px",
      fontWeight: "400",
      lineHeight: "33.6px",
      textCaptured: false,
      widthIsCopyDependent: true,
    });
    expect(observation.layout.composer.card).toMatchObject({
      rect: { width: 736, height: 98 },
      backgroundColor: "rgb(54, 54, 54)",
      borderRadius: "22px",
    });
    expect(observation.layout.composer.editor).toMatchObject({
      rect: { width: 712, height: 44 },
      fontSize: "14px",
      fontWeight: "430",
      lineHeight: "20px",
    });
  });

  it("distinguishes an exact historical mark match from current pixel parity", () => {
    expect(observation.resourceAudit.directHistoricalMarkMatch).toMatchObject({
      researchArtifact: "current-home-assets.json",
      iconId: "home-mark",
      exactPathDataMatches: 4,
      runtimePathCount: 4,
      sameViewBox: true,
    });
    expect(
      observation.resourceAudit.localCandidateSilhouetteComparison
        .notAProductPixelGate,
    ).toBe(true);
    expect(observation.evidenceBoundary.productPixelParity).toBe("unverified");
  });

  it("keeps account copy, screenshots, and raw SVG path data out of this artifact", () => {
    expect(observation.capture).toMatchObject({
      textContentRetained: false,
      fullScreenshotRetained: false,
      runtimeSvgBytesRetained: false,
      vectorPathDataRetained: false,
    });
    expect(observation.evidenceBoundary).toMatchObject({
      htmlTextRetained: false,
      imageReferenceRetained: false,
      productPixelParity: "unverified",
      lightTheme: "not sampled",
      compactWidths: "not sampled in this native viewport observation",
      populatedComposerLifecycle: "not sampled",
      appServerLifecycle: "not sampled",
    });

    const forbiddenKeys = new Set([
      "attributes",
      "children",
      "d",
      "imageData",
      "markup",
      "pathData",
      "pathHashes",
      "rawSource",
      "screenshotBase64",
      "sourceBytes",
      "sourceText",
      "svgSource",
      "textContent",
    ]);
    const assertMetadataOnly = (value: unknown, location = "observation") => {
      if (Array.isArray(value)) {
        value.forEach((entry, index) =>
          assertMetadataOnly(entry, `${location}[${index}]`),
        );
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [key, nested] of Object.entries(value)) {
        expect(forbiddenKeys.has(key), `${location}.${key}`).toBe(false);
        assertMetadataOnly(nested, `${location}.${key}`);
      }
    };
    assertMetadataOnly(observation);
  });
});
