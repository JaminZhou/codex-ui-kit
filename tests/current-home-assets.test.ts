import { describe, expect, it } from "vitest";
import currentHomeAssets from "../research/current-home-assets.json";

const expectedIcons = [
  ["home-mark", "New chat mark"],
  ["home-suggestion-explore", "Explore and understand code"],
  ["home-suggestion-build", "Build a new feature, app, or tool"],
  ["home-suggestion-review", "Review code and suggest changes"],
  ["home-suggestion-fix", "Fix issues and failures"],
] as const;

describe("current New chat home assets", () => {
  it("binds the narrow manifest to the installed 26.818 package", () => {
    expect(currentHomeAssets.baseline).toEqual({
      appAsarSha256:
        "8eb91bd9efbf9a4dd04b9b0afdbfcb4e0bab5da18c1919ad74ca327c00c7e791",
      appVersion: "26.818.41509",
      buildNumber: "6962",
      capturedAt: "2026-08-24",
      source: "live main Renderer exact SVG roots from isolated loopback-only CDP",
    });
  });

  it("retains the mark and four suggestion icons in product order", () => {
    expect(currentHomeAssets.icons.map(({ id, label }) => [id, label])).toEqual(
      expectedIcons,
    );
    expect(currentHomeAssets.icons[0]?.renderSize).toEqual({
      height: 56,
      width: 56,
    });
    expect(
      currentHomeAssets.icons.slice(1).every(({ renderSize }) =>
        Object.values(renderSize).every((size) => size === 16),
      ),
    ).toBe(true);
  });

  it("locks exact source hashes while leaving theme paint semantic", () => {
    expect(currentHomeAssets.icons.map(({ sourceSha256 }) => sourceSha256)).toEqual(
      [
        "5e08b224609ae834c6ccc2e0b5ce19861ad49e9b28b358a480146a9a3aea01cf",
        "c9af18e52c776d16ae9c3d082b36622bac502cdf0ee193b17e9735e5f29a0a40",
        "db952c7c3b10561b935d58341ccb5401a53b87cf097b9466001e6a1825bc8f15",
        "f9b84a4313eb61eb6a460f520ccaa0241cfb731b97b6b3ba02f54f075ebfc457",
        "95b5d2714298faa4983dc0d4fa2a99e24a6597b8161d13a3563368194609fa30",
      ],
    );
    for (const icon of currentHomeAssets.icons) {
      expect(icon.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(icon.rootComputedStyle).toEqual({});
    }
  });
});
