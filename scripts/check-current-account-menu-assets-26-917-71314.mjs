import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { currentAccountMenuCandidateFingerprints } from "./current-baseline-contract.mjs";

const assetUrl = new URL(
  "../research/current-account-menu-26.917.71314-icons.json",
  import.meta.url,
);
const assets = JSON.parse(await readFile(assetUrl, "utf8"));
const expected = [
  {
    geometrySha256:
      "8d1383dcf2b7620ba5a184355db564a11d662b39ba88d1aeab45e0942fdaef36",
    id: "sidebar-account-menu-usage-26-917-71314",
    label: "Usage",
  },
  {
    geometrySha256:
      "3a9aa7c85b5da0d67faae27b4dd3a402c4a0647d0edbb4251f385a1f7868306f",
    id: "sidebar-account-menu-pet-26-917-71314",
    label: "Show pet",
  },
  {
    geometrySha256:
      "4926a51ab5b3089bc5f2c81bb8a71f351075b5af10e29abcd7872cd7eb9e5e74",
    id: "sidebar-account-menu-invite-26-917-71314",
    label: "Invite a friend",
  },
  {
    geometrySha256:
      "d99a35f037e22df3415231782c9de283ed95d9075034db6c0000e6308b1a4f6e",
    id: "sidebar-account-menu-settings-26-917-71314",
    label: "Settings",
  },
  {
    geometrySha256:
      "e856f1fbfba58c13204d79b6f0d034111dbcd66f4475d60a3fa090ed0cc807e0",
    id: "sidebar-account-menu-logout-26-917-71314",
    label: "Log out",
  },
];
const allowedTags = new Set([
  "circle",
  "clippath",
  "defs",
  "ellipse",
  "g",
  "line",
  "lineargradient",
  "mask",
  "path",
  "polygon",
  "polyline",
  "radialgradient",
  "rect",
  "stop",
  "use",
]);
const allowedAttributes = new Set([
  "clip-path",
  "clip-rule",
  "color",
  "cx",
  "cy",
  "d",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "gradienttransform",
  "gradientunits",
  "height",
  "href",
  "id",
  "mask",
  "offset",
  "opacity",
  "points",
  "preserveaspectratio",
  "r",
  "rx",
  "ry",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "vector-effect",
  "width",
  "x",
  "x1",
  "x2",
  "xlink:href",
  "y",
  "y1",
  "y2",
]);
const allowedStyleProperties = new Set([
  "clip-path",
  "display",
  "fill-opacity",
  "filter",
  "height",
  "mask",
  "opacity",
  "overflow",
  "paint-order",
  "shape-rendering",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "vector-effect",
  "visibility",
  "width",
]);

function collectShapes(primitives) {
  return primitives.flatMap((primitive) => [
    ...(["path", "circle", "rect", "line"].includes(primitive.tag)
      ? [{ d: primitive.attributes.d ?? null, tag: primitive.tag }]
      : []),
    ...collectShapes(primitive.children ?? []),
  ]);
}

function assertSafePrimitive(primitive, context) {
  assert(allowedTags.has(primitive.tag), `${context}: unsupported SVG tag`);
  assert.deepEqual(
    Object.keys(primitive).sort(),
    ["attributes", "computedStyle", "tag", ...(primitive.children ? ["children"] : [])].sort(),
    `${context}: unexpected SVG primitive fields`,
  );
  for (const [name, value] of Object.entries(primitive.attributes)) {
    assert(allowedAttributes.has(name), `${context}: unsupported attribute ${name}`);
    assert.equal(typeof value, "string", `${context}.${name}: attribute must be a string`);
    assert(!/https?:|data:|javascript:|blob:|file:/i.test(value), `${context}.${name}: external value`);
  }
  for (const [name, value] of Object.entries(primitive.computedStyle)) {
    assert(allowedStyleProperties.has(name), `${context}: unsupported style ${name}`);
    assert.equal(typeof value, "string", `${context}.${name}: style must be a string`);
    assert(!/https?:|data:|javascript:|blob:|file:/i.test(value), `${context}.${name}: external value`);
  }
  for (const [index, child] of (primitive.children ?? []).entries()) {
    assertSafePrimitive(child, `${context}.children[${index}]`);
  }
}

assert.equal(assets.schemaVersion, 1);
assert.deepEqual(assets.baseline, {
  appAsarBytes: 370175042,
  appAsarSha256:
    "03108a728bdb1616958ab89587c5495cab0cf4cd1bbe109bdfb186df0a113804",
  appVersion: "26.917.71314",
  buildNumber: "10954",
  capturedAt: "2026-09-25",
  chromiumVersion: "153.0.8010.53",
  source:
    "five visible sidebar account-menu SVGs observed through isolated loopback-only CDP",
  sourceBoundary:
    "exact vector paths only; no bundled application code, stylesheets, fonts, account identity, or dynamic usage data",
});
assert.deepEqual(assets.baseline, {
  ...assets.baseline,
  ...currentAccountMenuCandidateFingerprints["26.917.71314"],
});
assert.equal(assets.icons.length, expected.length);

for (const [index, icon] of assets.icons.entries()) {
  const reference = expected[index];
  assert.equal(icon.id, reference.id);
  assert.equal(icon.label, reference.label);
  assert.equal(icon.geometrySha256, reference.geometrySha256);
  assert.equal(icon.viewBox, "0 0 16 16");
  assert.deepEqual(icon.renderSize, { height: 16, width: 16 });
  assert.deepEqual(icon.sourceSize, { height: 16, width: 16 });
  assert.deepEqual(icon.rootAttributes, { height: "16", width: "16" });
  assert.deepEqual(icon.rootComputedStyle, {
    "clip-path": "none",
    display: "block",
    "fill-opacity": "1",
    filter: "none",
    height: "16px",
    opacity: "0.75",
    "paint-order": "normal",
    "shape-rendering": "auto",
    "stroke-dasharray": "none",
    "stroke-dashoffset": "0px",
    "stroke-linecap": "butt",
    "stroke-linejoin": "miter",
    "stroke-miterlimit": "4",
    "stroke-opacity": "1",
    "stroke-width": "1px",
    "vector-effect": "none",
    visibility: "visible",
    width: "16px",
  });
  assert(!("color" in icon.rootComputedStyle));
  assert(!("fill" in icon.rootComputedStyle));
  assert(!("stroke" in icon.rootComputedStyle));
  for (const [primitiveIndex, primitive] of icon.primitives.entries()) {
    assertSafePrimitive(primitive, `${icon.id}.primitives[${primitiveIndex}]`);
  }
  const geometrySha256 = createHash("sha256")
    .update(JSON.stringify(collectShapes(icon.primitives)))
    .digest("hex");
  assert.equal(geometrySha256, reference.geometrySha256);
}

console.log(
  JSON.stringify({
    build: `${assets.baseline.appVersion} (${assets.baseline.buildNumber})`,
    icons: assets.icons.map(({ geometrySha256, id }) => ({ geometrySha256, id })),
    result: "passed: exact five-icon source and geometry contract",
  }),
);
