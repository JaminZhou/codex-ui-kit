import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const write = process.argv.includes("--write");
const manifestPath = fileURLToPath(
  new URL("../research/visual-assets.json", import.meta.url),
);
const outputPath = fileURLToPath(
  new URL("../demo/current-thread-visual-assets.json", import.meta.url),
);
const selectedIds = [
  "composer-add-files",
  "composer-dictate",
  "composer-model-chevron",
  "composer-permission",
  "composer-send",
  "sidebar-folder",
  "sidebar-new-chat",
  "thread-assistant-bad",
  "thread-assistant-fork",
  "thread-assistant-copy",
  "thread-assistant-good",
  "thread-header-actions",
  "thread-header-bottom-panel",
  "thread-header-open-in-chevron",
  "thread-header-summary",
  "thread-header-project",
  "thread-header-side-panel",
  "thread-command-terminal",
  "window-chrome-back",
  "window-chrome-forward",
  "window-chrome-sidebar",
];
const replayStyleProperties = new Set([
  "clip-path",
  "color",
  "display",
  "fill",
  "fill-opacity",
  "filter",
  "height",
  "mask",
  "opacity",
  "overflow",
  "paint-order",
  "shape-rendering",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "transform-origin",
  "vector-effect",
  "visibility",
  "width",
]);

const replayStyle = (style) =>
  Object.fromEntries(
    Object.entries(style).filter(([name]) => replayStyleProperties.has(name)),
  );
const replayPrimitive = (primitive) => ({
  attributes: primitive.attributes,
  ...(primitive.children
    ? { children: primitive.children.map(replayPrimitive) }
    : {}),
  computedStyle: replayStyle(primitive.computedStyle),
  tag: primitive.tag,
});
const replayIcon = (icon) => ({
  id: icon.id,
  primitives: icon.primitives.map(replayPrimitive),
  renderSize: icon.renderSize,
  rootAttributes: icon.rootAttributes,
  rootComputedStyle: replayStyle(icon.rootComputedStyle),
  sourceSha256: icon.sha256,
  viewBox: icon.viewBox,
});

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const iconsById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
const missing = selectedIds.filter((id) => !iconsById.has(id));
if (missing.length > 0) {
  throw new Error(`Current-thread visual assets are missing: ${missing.join(", ")}`);
}
const subset = {
  schemaVersion: 1,
  sourceBaseline: manifest.baseline,
  sourceManifest: "research/visual-assets.json",
  icons: selectedIds.map((id) => replayIcon(iconsById.get(id))),
};
const output = `${JSON.stringify(subset, null, 2)}\n`;

if (write) {
  writeFileSync(outputPath, output);
  console.log(`Updated ${outputPath}`);
} else if (readFileSync(outputPath, "utf8") !== output) {
  throw new Error(
    "demo/current-thread-visual-assets.json is stale; run pnpm update:current-thread-visual-assets.",
  );
} else {
  console.log(`Current-thread visual asset subset is current (${selectedIds.length} icons).`);
}
