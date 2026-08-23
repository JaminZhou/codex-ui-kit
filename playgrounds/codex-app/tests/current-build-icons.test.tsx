// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import currentHomeAssets from "../../../research/current-home-assets.json";
import currentProjectMenuAssets from "../../../research/current-project-menu-assets.json";
import visualAssets from "../../../research/visual-assets.json";
import { CurrentBuildIcon } from "../src/currentBuildIcons";

afterEach(cleanup);

const resolvedIcons = [
  ...new Map(
    [
      ...visualAssets.icons,
      ...currentProjectMenuAssets.icons,
      ...currentHomeAssets.icons,
    ].map((icon) => [icon.id, icon]),
  ).values(),
];

describe("current-build visual assets", () => {
  it.each(resolvedIcons)(
    "renders $id from the resolved provenance manifests",
    (icon) => {
      const { container } = render(
        <CurrentBuildIcon
          name={icon.id as Parameters<typeof CurrentBuildIcon>[0]["name"]}
        />,
      );
      const svg = container.querySelector("svg");

      expect(svg?.getAttribute("aria-hidden")).toBe("true");
      expect(svg?.getAttribute("data-current-build-icon")).toBe(icon.id);
      expect(svg?.getAttribute("viewBox")).toBe(icon.viewBox);
      expect(svg?.style.width).toBe(`${icon.renderSize.width}px`);
      expect(svg?.style.height).toBe(`${icon.renderSize.height}px`);
      expect(svg?.style.marginLeft).toBe("");
      expect(svg?.style.position).toBe("");
      expect(svg?.children).toHaveLength(icon.primitives.length);
      for (const [name, value] of Object.entries(icon.rootAttributes)) {
        expect(svg?.getAttribute(name)).toBe(value);
      }

      icon.primitives.forEach((primitive, index) => {
        const child = svg?.children.item(index);
        expect(child?.tagName.toLowerCase()).toBe(primitive.tag);
        for (const [name, value] of Object.entries(primitive.attributes)) {
          expect(child?.getAttribute(name)).toBe(value);
        }
      });
    },
  );
});
