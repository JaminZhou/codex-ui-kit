import { describe, expect, it } from "vitest";
import {
  assertComposerPermissionRefreshCoverage,
  collectComposerPermissionVisualAsset,
  mergeSupplementalComposerPermissionCapture,
} from "../scripts/visual-asset-permission-contract.mjs";

const baseline = {
  appAsarSha256: "new-fingerprint",
  appVersion: "26.900.1",
  buildNumber: "7000",
  interactionState: "resting-and-open-sidebar-menus",
  theme: "dark",
  viewport: { height: 820, width: 1180 },
};

function icon(semanticId, region = "composer") {
  return {
    owner: { semanticId },
    region,
    sha256: `${semanticId}-sha`,
  };
}

function fullCapture(permissionId, overrides = {}) {
  return {
    baselineContext: baseline,
    captureMode: "full",
    icons: [icon("composer-add-files"), icon(permissionId)],
    ...overrides,
  };
}

describe("Composer permission visual asset contract", () => {
  it("collects exactly one visible permission variant per full capture", () => {
    expect(
      collectComposerPermissionVisualAsset(
        fullCapture("composer-permission-ask"),
      ).owner.semanticId,
    ).toBe("composer-permission-ask");

    expect(() =>
      collectComposerPermissionVisualAsset(
        fullCapture("composer-permission-ask", {
          icons: [
            icon("composer-permission"),
            icon("composer-permission-ask"),
          ],
        }),
      ),
    ).toThrow("expected one visible Composer permission variant, received 2");
  });

  it("merges the alternate same-build permission state", () => {
    const primary = fullCapture("composer-permission-ask");
    const merged = mergeSupplementalComposerPermissionCapture(
      primary,
      fullCapture("composer-permission"),
    );

    expect(
      merged.icons
        .filter(({ owner }) => owner.semanticId.startsWith("composer-permission"))
        .map(({ owner }) => owner.semanticId)
        .sort(),
    ).toEqual(["composer-permission", "composer-permission-ask"]);
    expect(primary.icons).toHaveLength(2);
  });

  it("requires both variants only when the app fingerprint changes", () => {
    expect(() =>
      assertComposerPermissionRefreshCoverage(["composer-permission-ask"], {
        fingerprintChanged: false,
      }),
    ).not.toThrow();
    expect(() =>
      assertComposerPermissionRefreshCoverage(
        ["composer-permission", "composer-permission-ask"],
        { fingerprintChanged: true },
      ),
    ).not.toThrow();
    expect(() =>
      assertComposerPermissionRefreshCoverage(["composer-permission-ask"], {
        fingerprintChanged: true,
      }),
    ).toThrow("fingerprint-changing full refresh requires");
    expect(() =>
      assertComposerPermissionRefreshCoverage(
        ["composer-permission-ask", "composer-permission-ask"],
        { fingerprintChanged: false },
      ),
    ).toThrow("unique known variants");
  });

  it("rejects duplicate variants and evidence from another build", () => {
    expect(() =>
      mergeSupplementalComposerPermissionCapture(
        fullCapture("composer-permission-ask"),
        fullCapture("composer-permission-ask"),
      ),
    ).toThrow("overlaps the primary capture");

    expect(() =>
      mergeSupplementalComposerPermissionCapture(
        fullCapture("composer-permission-ask"),
        fullCapture("composer-permission", {
          baselineContext: { ...baseline, buildNumber: "6999" },
        }),
      ),
    ).toThrow("must match the full capture build");
  });
});
