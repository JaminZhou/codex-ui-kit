export const currentThreadVisualAssetIds = Object.freeze([
  "composer-add-files",
  "composer-dictate",
  "composer-model-chevron",
  "composer-permission",
  "composer-send",
  "review-close",
  "review-collapse-all",
  "review-commit-or-push",
  "review-copy-path",
  "review-expand",
  "review-file-text",
  "review-file-toggle",
  "review-files-toggle",
  "review-jump-file",
  "review-more-git",
  "review-open-in",
  "review-open-tab",
  "review-options",
  "review-scope-chevron",
  "review-search",
  "review-split-diff",
  "review-tab",
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
  "thread-mcp-tool",
  "thread-activity-chevron",
  "thread-reconnecting",
  "window-chrome-back",
  "window-chrome-forward",
  "window-chrome-sidebar",
]);

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

export function createCurrentThreadVisualAssetSubset(manifest) {
  const iconsById = new Map(manifest.icons.map((icon) => [icon.id, icon]));
  const missing = currentThreadVisualAssetIds.filter(
    (id) => !iconsById.has(id),
  );
  if (missing.length > 0) {
    throw new Error(
      `Current-thread visual assets are missing: ${missing.join(", ")}`,
    );
  }
  return {
    schemaVersion: 1,
    sourceBaseline: manifest.baseline,
    sourceManifest: "research/visual-assets.json",
    icons: currentThreadVisualAssetIds.map((id) =>
      replayIcon(iconsById.get(id)),
    ),
  };
}

export function serializeCurrentThreadVisualAssetSubset(manifest) {
  return `${JSON.stringify(createCurrentThreadVisualAssetSubset(manifest), null, 2)}\n`;
}
