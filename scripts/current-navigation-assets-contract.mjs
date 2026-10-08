import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  sanitizeComputedStyle,
  sanitizeSvgAttributes,
  sanitizeVisualAssetIcon,
  sanitizeVisualScalarRecord,
} from "./visual-asset-contract.mjs";
import { currentObservationCandidateFingerprints } from "./current-baseline-contract.mjs";

export const navigationLabels = Object.freeze([
  "Home", "Space", "Scheduled", "Plugins", "Explore", "Code Review",
]);
export const navigationWidths = Object.freeze([1180, 820, 721, 720]);
export const navigationFingerprint = currentObservationCandidateFingerprints["26.928.31416"];
export const navigationFingerprints = Object.freeze({
  "26.928.31416": navigationFingerprint,
  "26.930.31730": currentObservationCandidateFingerprints["26.930.31730"],
  "26.930.61225": currentObservationCandidateFingerprints["26.930.61225"],
});
export const standardizedSrgbNavigationBuilds = Object.freeze(["26.930.31730", "26.930.61225"]);
export const navigationCrop = Object.freeze({ x: 0, y: 44, width: 52, height: 280 });
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const navigationHash = (value) => createHash("sha256")
  .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value)))
  .digest("hex");
const newStyleProperties = ["frame-sizing", "scroll-axis-lock", "window-drag"];
const legacyStyleProjection = style => Object.fromEntries(Object.entries(style).filter(([name]) => !newStyleProperties.includes(name)));
function assertCurrentStyle(style) {
  assert.equal(Object.keys(style).length, 478);
  assert.equal(navigationHash(JSON.stringify(Object.keys(style).sort())), "3b21ab7ac298b8ffa08817c701ac1f0b97fbc139aaa2279908b894e4c2d93e28");
  sanitizeComputedStyle(legacyStyleProjection(style), "navigation legacy style projection");
  assert.equal(style["frame-sizing"], "auto");
  assert.ok(["none", "initial", "auto"].includes(style["scroll-axis-lock"]));
  assert.ok(["none", "drag"].includes(style["window-drag"]));
}

export function navigationMaskDataUri(svg) {
  assert.deepEqual(Object.keys(svg).sort(), ["attributes", "children", "tag"]);
  assert.equal(svg.tag, "svg");
  assert.deepEqual(svg.attributes, { width: "256", height: "256", viewBox: "32 32 192 192", fill: "none" });
  const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  let count = 0;
  const serialize = (node, root = false) => {
    assert.ok(root || ["g", "path"].includes(node.tag), "Only inert mask paths/groups are supported");
    assert.ok(++count <= 8, "Unexpected mask complexity");
    assert.ok(Object.keys(node).every(key => ["tag", "attributes", "children"].includes(key)));
    if (!root) {
      assert.ok(Object.keys(node.attributes).every(key => ["d", "fill", "transform"].includes(key)));
      sanitizeSvgAttributes(node.attributes, "navigation mask");
      if (node.tag === "g") assert.deepEqual(node.attributes, { transform: "scale(0.5)" });
      if (node.tag === "path") {
        assert.deepEqual(Object.keys(node.attributes).sort(), ["d", "fill"]);
        assert.ok(["white", "black"].includes(node.attributes.fill));
        assert.match(node.attributes.d, /^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\-\s]+$/);
        assert.ok(node.attributes.d.length <= 20_000);
        assert.ok(!node.children);
      }
    }
    assert.ok(!node.children || (Array.isArray(node.children) && node.children.length > 0));
    return `<${node.tag}${root ? ' xmlns="http://www.w3.org/2000/svg"' : ""}${Object.entries(node.attributes)
      .map(([key, value]) => ` ${key}="${escape(value)}"`).join("")}>${(node.children ?? []).map(child => serialize(child)).join("")}</${node.tag}>`;
  };
  const xml = serialize(svg, true);
  assert.equal(count, 5, "Expected root, group, and three original paths");
  return `data:image/svg+xml,${encodeURIComponent(xml)}`;
}

export function expandNavigationIcon(icon, styles) {
  const expand = node => ({
    attributes: node.attributes,
    computedStyle: legacyStyleProjection(styles[node.styleId]),
    tag: node.tag,
    ...(node.children ? { children: node.children.map(expand) } : {}),
  });
  return {
    sourceClassName: icon.sourceClassName,
    rootAttributes: icon.rootAttributes,
    rootComputedStyle: legacyStyleProjection(styles[icon.styleId]),
    renderSize: icon.renderSize,
    viewBox: icon.viewBox,
    primitives: icon.primitives.map(expand),
  };
}

export function assertNavigationAssets(record) {
  assert.equal(record.schemaVersion, 1);
  const fingerprint = navigationFingerprints[record.baseline?.appVersion];
  assert.ok(fingerprint, "Unknown navigation reference build");
  assert.deepEqual(record.baseline, fingerprint);
  assert.deepEqual(record.crop, navigationCrop);
  assert.equal(record.source.ownership, "OpenAI; exploratory reference, not MIT relicensed");
  assert.equal(record.source.originalThemePreference, "System");
  assert.equal(record.source.restoredThemePreference, "System");
  for (const key of ["ownerPid", "processStartedAtMs", "profile", "port"]) assert.equal(Object.hasOwn(record.source, key), false, `Do not persist runtime identity: ${key}`);
  for (const side of ["before", "after"]) assert.deepEqual(Object.keys(record.source[side]).sort(), ["bytes", "sha256"]);
  if (standardizedSrgbNavigationBuilds.includes(fingerprint.appVersion)) {
    assert.equal(record.source.colorProfileMode, "srgb");
    assert.equal(record.source.pngColorProfile, null);
    assert.deepEqual(record.source.calibration, {
      kind: "independent-css-alpha-composition",
      pixels: [
        { name: "alpha-white-over-dark", rgba: [145, 145, 145, 255] },
        { name: "opaque-mid-gray", rgba: [145, 145, 145, 255] },
        { name: "opaque-background", rgba: [36, 36, 36, 255] },
      ],
    });
    assert.equal(record.source.viewportMode, "renderer-emulation-not-native-product-resize");
    assert.equal(record.source.rasterMode, "renderer-rgba-with-observed-root-background");
  } else {
    assert.match(record.source.pngColorProfile.sha256, /^[0-9a-f]{64}$/);
    assert.ok(record.source.pngColorProfile.bytes >= 128 && record.source.pngColorProfile.bytes <= 4096);
  }
  assert.equal(record.source.before.sha256, fingerprint.appAsarSha256);
  assert.equal(record.source.before.bytes, fingerprint.appAsarBytes);
  assert.deepEqual(record.source.before, record.source.after);
  for (const [id, style] of Object.entries(record.styles)) {
    assertCurrentStyle(style);
    assert.equal(id, navigationHash(style));
  }
  assert.equal(record.samples.length, 104);
  const keys = new Set();
  for (const sample of record.samples) {
    assert.ok(["dark", "light"].includes(sample.theme));
    assert.ok(navigationWidths.includes(sample.width));
    assert.equal(sample.height, sample.width === 1180 ? 820 : 680);
    assert.ok(["rest", ...navigationLabels.map(label => `hover:${label}`), ...navigationLabels.map(label => `focus:${label}`)].includes(sample.state));
    const key = `${sample.theme}:${sample.width}:${sample.state}`;
    assert.ok(!keys.has(key));
    keys.add(key);
    assert.match(sample.png, /^(dark|light)-(1180|820|721|720)-(rest|(?:hover|focus)-[0-5])\.png$/);
    assert.equal(sample.png, `${sample.theme}-${sample.width}-${sample.state === "rest" ? "rest" : `${sample.state.split(":")[0]}-${navigationLabels.indexOf(sample.state.split(":")[1])}`}.png`);
    assert.match(sample.pngSha256, /^[0-9a-f]{64}$/);
    assert.ok(record.styles[sample.railStyleId]);
    assert.ok(record.styles[sample.separatorStyleId]);
    if (standardizedSrgbNavigationBuilds.includes(fingerprint.appVersion)) {
      assert.ok(Array.isArray(sample.paintStack) && sample.paintStack.length >= 3 && sample.paintStack.length <= 24);
      for (const layer of sample.paintStack) {
        assert.ok(["nav", "div", "aside", "body", "html"].includes(layer.tag));
        assert.ok(record.styles[layer.styleId]);
        assert.deepEqual(Object.keys(layer.rect).sort(), ["height", "left", "top", "width"]);
        assert.ok(Object.values(layer.rect).every(Number.isFinite));
      }
      for (const tag of ["body", "html"]) assert.ok(sample.paintStack.some(layer => layer.tag === tag));
      assert.equal(typeof sample.rendererFocused, "boolean");
      assert.ok(sample.sharedCard && Object.values(sample.sharedCard.rect).every(Number.isFinite));
      assert.ok(record.styles[sample.sharedCard.styleId]);
      if (fingerprint.appVersion === "26.930.31730") {
        for (const tag of ["body", "html"]) {
          const layer = sample.paintStack.find(layer => layer.tag === tag);
          assert.ok(["rgba(0, 0, 0, 0)", sample.theme === "dark" ? "rgb(20, 20, 20)" : "rgb(246, 246, 246)"].includes(record.styles[layer.styleId]["background-color"]));
        }
        assert.deepEqual(sample.sharedCard.rect, { left: 52, top: 44, width: sample.width - 56, height: sample.height - 48 });
        assert.equal(record.styles[sample.sharedCard.styleId]["background-color"], "rgba(0, 0, 0, 0)");
      }
    }
    assert.ok(Array.isArray(sample.backdropColors) && sample.backdropColors.length >= 1 && sample.backdropColors.length <= 6);
    for (const color of sample.backdropColors) {
      assert.match(color, /^(?:rgba?|color)\(/);
      sanitizeVisualScalarRecord({ color }, "navigation backdrop");
    }
    if (sample.tooltip) {
      assert.ok(navigationLabels.includes(sample.tooltip.label));
      assert.ok(record.styles[sample.tooltip.styleId]);
      assert.ok(sample.tooltip.rect.left >= 44 && sample.tooltip.rect.width <= 200 && sample.tooltip.rect.height <= 40);
    }
    assert.deepEqual(sample.items.map(item => item.label), navigationLabels);
    sample.items.forEach((item, index) => {
      assert.deepEqual(item.rect, { left: 8, top: [52, 96, 140, 184, 228, 281][index], width: 36, height: 36 });
      assert.ok(record.styles[item.styleId]);
      if (standardizedSrgbNavigationBuilds.includes(fingerprint.appVersion)) {
        assert.ok(Array.isArray(item.decorations));
        if (fingerprint.appVersion === "26.930.31730") assert.ok(item.decorations.length <= (index === 0 ? 1 : 0), "Only a sampled contextual Home status dot is supported");
        for (const node of item.decorations) {
          assert.ok(["span", "div"].includes(node.tag));
          assert.ok(Object.values(node.rect).every(Number.isFinite));
          assert.ok(record.styles[node.styleId]);
          if (fingerprint.appVersion === "26.930.31730") {
            assert.deepEqual(node.rect, { left: 30, top: 58, width: 8, height: 8 });
            assert.equal(record.styles[node.styleId]["background-color"], "rgb(58, 131, 247)");
          }
        }
      }
      for (const id of [item.beforeStyleId, item.afterStyleId]) {
        assert.ok(record.styles[id]);
        assert.equal(record.styles[id].position, "absolute");
        for (const side of ["top", "right", "bottom", "left"]) assert.equal(record.styles[id][side], "0px");
        assert.equal(record.styles[id].content, '\"\"');
      }
      const icon = item.icon;
      sanitizeSvgAttributes(icon.rootAttributes, "navigation root");
      assert.ok(record.styles[icon.styleId]);
      assert.deepEqual(icon.renderSize, { width: 20, height: 20 });
      if (item.label === "Code Review") {
        assert.equal(icon.kind, "alpha-mask");
        assert.equal(icon.dataUri, navigationMaskDataUri(icon.maskSvg));
        assert.equal(icon.geometrySha256, navigationHash(icon.maskSvg));
        assert.equal(icon.maskType, "alpha");
      } else {
        assert.equal(icon.kind, "vector");
        const expanded = expandNavigationIcon(icon, record.styles);
        sanitizeVisualAssetIcon(expanded, `navigation ${item.label}`);
        assert.equal(icon.geometrySha256, navigationHash({ rootAttributes: icon.rootAttributes, primitives: icon.primitives.map(function geometry(node) {
          return { tag: node.tag, attributes: node.attributes, ...(node.children ? { children: node.children.map(geometry) } : {}) };
        }), viewBox: icon.viewBox }));
      }
    });
  }
  return record;
}

/** The contextual notification can arrive or disappear during a matrix.
 * Tie its presence to the original raster instead of assuming an account state. */
export function assertNavigationDecorationPixels(sample, png) {
  assert.equal(png.width, navigationCrop.width); assert.equal(png.height, navigationCrop.height);
  assert.equal(png.data.length, png.width * png.height * 4);
  const offset = ((62 - navigationCrop.y) * png.width + 34) * 4;
  const [red, green, blue] = png.data.subarray(offset, offset + 3);
  const hasBlueDot = blue > red + 50 && blue > green + 50;
  assert.equal(sample.items[0].decorations.length === 1, hasBlueDot, "Contextual Home dot presence must match the reference pixels");
}

export function assertNavigationRasterBackground(record, sample, png) {
  assert.equal(png.width, navigationCrop.width); assert.equal(png.height, navigationCrop.height);
  assert.equal(png.data.length, png.width * png.height * 4);
  const transparent = !sample.paintStack.some(layer => ["body", "html"].includes(layer.tag)
    && record.styles[layer.styleId]["background-color"] !== "rgba(0, 0, 0, 0)");
  const expected = sample.theme === "dark" ? transparent ? [40, 40, 40, 204] : [36, 36, 36, 255]
    : transparent ? [246, 246, 246, 217] : [246, 246, 246, 255];
  assert.deepEqual([...png.data.subarray(0, 4)], expected, "Renderer alpha/background must agree with the observed root paint, not an assumed opaque canvas");
}
