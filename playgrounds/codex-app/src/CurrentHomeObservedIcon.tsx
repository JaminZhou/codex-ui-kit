import { createElement, useId, type CSSProperties, type ReactElement } from "react";
import assets from "../../../research/current-home-assets-26.930.61225.json";

export type CurrentHomeObservedIconName = "home-mark" | "add-resource" | "dictation" | "voice-chat";
export type Vector = { tag: string; attributes: Record<string, string>; styles: Record<string, string>; children: Vector[] };
const attributeNames: Record<string, string> = {
  "fill-rule": "fillRule", "clip-rule": "clipRule", "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin",
};
const paintProperties = ["color", "fill", "stroke", "strokeWidth", "strokeLinecap",
  "strokeLinejoin", "opacity", "fillOpacity", "strokeOpacity", "transform", "transformOrigin"];

/** Instance-local mask references: duplicate Home scenes must not share IDs. */
export function namespaceHomeVector(vector: Vector, prefix: string): Vector {
  if (!/^[\w-]+$/.test(prefix)) throw new Error("Invalid Home SVG namespace");
  const ids = new Set<string>();
  const collect = (node: Vector) => {
    if (node.attributes.id) {
      if (!/^[\w-]+$/.test(node.attributes.id) || ids.has(node.attributes.id)) throw new Error("Invalid Home SVG ID");
      ids.add(node.attributes.id);
    }
    node.children.forEach(collect);
  };
  collect(vector);
  const rewrite = (node: Vector): Vector => ({
    ...node,
    attributes: Object.fromEntries(Object.entries(node.attributes).map(([key, value]) => {
      if (key === "id") return [key, `${prefix}-${value}`];
      if (key === "mask") {
        const match = /^url\(#([\w-]+)\)$/.exec(value);
        if (!match || !ids.has(match[1])) throw new Error("Invalid Home SVG mask reference");
        return [key, `url(#${prefix}-${match[1]})`];
      }
      return [key, value];
    })),
    children: node.children.map(rewrite),
  });
  return rewrite(vector);
}

function renderVector(vector: Vector, key: string, rootStyle?: CSSProperties): ReactElement {
  return createElement(vector.tag, {
    ...Object.fromEntries(Object.entries(vector.attributes).map(([name, value]) => [attributeNames[name] ?? name, value])),
    key,
    ...(rootStyle ? { "aria-hidden": true, "data-current-home-observed-icon": key } : {}),
    style: { ...Object.fromEntries(paintProperties.map(name => [name, vector.styles[name]])), ...rootStyle },
  }, vector.children.map((child, index) => renderVector(child, `${key}-${index}`)));
}

/** Public visual primitives only; no bundled implementation or protocol code. */
export function CurrentHomeObservedIcon({ name, theme }: { name: CurrentHomeObservedIconName; theme: "dark" | "light" }) {
  const instance = useId().replace(/[^\w-]/g, "_");
  const entry = assets.themes[theme].find(icon => icon.id === name);
  if (!entry) throw new Error(`Missing observed Home icon: ${name}`);
  const vector = namespaceHomeVector(entry.vector as Vector, `home-${instance}`);
  return renderVector(vector, name, { display: "block", width: entry.renderSize.width, height: entry.renderSize.height });
}
