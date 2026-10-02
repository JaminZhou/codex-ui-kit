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
  assert.deepEqual(record.baseline, navigationFingerprint);
  assert.deepEqual(record.crop, navigationCrop);
  assert.equal(record.source.ownership, "OpenAI; exploratory reference, not MIT relicensed");
  assert.equal(record.source.originalThemePreference, "System");
  assert.equal(record.source.restoredThemePreference, "System");
  assert.match(record.source.pngColorProfile.sha256, /^[0-9a-f]{64}$/);
  assert.ok(record.source.pngColorProfile.bytes >= 128 && record.source.pngColorProfile.bytes <= 4096);
  assert.equal(record.source.before.sha256, navigationFingerprint.appAsarSha256);
  assert.equal(record.source.before.bytes, navigationFingerprint.appAsarBytes);
  assert.deepEqual(record.source.before, record.source.after);
  assert.ok(record.source.processStartedAtMs > record.source.before.changedAtMs);
  for (const [id, style] of Object.entries(record.styles)) {
    assertCurrentStyle(style);
    assert.equal(id, navigationHash(style));
  }
  assert.equal(record.samples.length, 104);
  const keys = new Set();
  for (const sample of record.samples) {
    assert.ok(["dark", "light"].includes(sample.theme));
    assert.ok(navigationWidths.includes(sample.width));
    assert.ok(["rest", ...navigationLabels.map(label => `hover:${label}`), ...navigationLabels.map(label => `focus:${label}`)].includes(sample.state));
    const key = `${sample.theme}:${sample.width}:${sample.state}`;
    assert.ok(!keys.has(key));
    keys.add(key);
    assert.match(sample.png, /^(dark|light)-(1180|820|721|720)-(rest|(?:hover|focus)-[0-5])\.png$/);
    assert.equal(sample.png, `${sample.theme}-${sample.width}-${sample.state === "rest" ? "rest" : `${sample.state.split(":")[0]}-${navigationLabels.indexOf(sample.state.split(":")[1])}`}.png`);
    assert.match(sample.pngSha256, /^[0-9a-f]{64}$/);
    assert.ok(record.styles[sample.railStyleId]);
    assert.ok(record.styles[sample.separatorStyleId]);
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
