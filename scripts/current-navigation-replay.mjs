import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { assertNavigationAssets } from "./current-navigation-assets-contract.mjs";

// Full source styles stay in research. Only SVG paint and the observed control
// layers reach the private renderer; no paths or interaction states are inferred.
const replayProperties = new Set([
  "background-color", "box-shadow", "color", "opacity", "outline-color", "outline-style", "outline-width", "outline-offset",
  ...["top", "right", "bottom", "left"].flatMap(side => ["color", "style", "width"].map(property => `border-${side}-${property}`)),
  ...["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => `border-${corner}-radius`),
  ...["top-left", "top-right", "bottom-right", "bottom-left"].map(corner => `corner-${corner}-shape`),
  "clip-path", "display", "fill", "fill-opacity", "filter", "height", "mask", "overflow", "paint-order", "shape-rendering",
  "stroke", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity",
  "stroke-width", "transform", "transform-origin", "vector-effect", "visibility", "width",
  "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "text-align", "white-space",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
]);
export function navigationReplayData(record) {
  assertNavigationAssets(record);
  const samples = record.samples.filter(sample => sample.width === 1180).map(sample => ({
    theme: sample.theme, width: sample.width, state: sample.state, backdropColors: sample.backdropColors,
    separatorStyleId: sample.separatorStyleId,
    tooltip: sample.tooltip,
    items: sample.items.map(item => ({ label: item.label, styleId: item.styleId, beforeStyleId: item.beforeStyleId, afterStyleId: item.afterStyleId,
      icon: { kind: item.icon.kind, rootAttributes: item.icon.rootAttributes, styleId: item.icon.styleId, renderSize: item.icon.renderSize,
        ...(item.icon.kind === "vector" ? { viewBox: item.icon.viewBox, primitives: item.icon.primitives } : { dataUri: item.icon.dataUri }) } })),
  }));
  const needed = new Set();
  const visit = node => { needed.add(node.styleId); node.children?.forEach(visit); };
  for (const sample of samples) {
    needed.add(sample.separatorStyleId);
    if (sample.tooltip) needed.add(sample.tooltip.styleId);
    for (const item of sample.items) { needed.add(item.styleId); needed.add(item.beforeStyleId); needed.add(item.afterStyleId); needed.add(item.icon.styleId); item.icon.primitives?.forEach(visit); }
  }
  return { baseline: record.baseline, samples, styles: Object.fromEntries([...needed].sort().map(id => [id,
    Object.fromEntries(Object.entries(record.styles[id]).filter(([name]) => replayProperties.has(name))) ])) };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const source = JSON.parse(await readFile(new URL("../research/current-navigation-26.928.31416/assets.json", import.meta.url), "utf8"));
  const output = new URL("../playgrounds/codex-app/src/currentNavigationAssets2692831416.json", import.meta.url);
  const text = `${JSON.stringify(navigationReplayData(source), null, 2)}\n`;
  if (process.argv.includes("--write")) await writeFile(output, text);
  else assert.equal(await readFile(output, "utf8"), text, "Regenerate the exact current navigation renderer subset");
  console.log("Current navigation renderer subset matches full source evidence");
}
