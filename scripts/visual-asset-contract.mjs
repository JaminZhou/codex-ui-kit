import { createHash } from "node:crypto";

export const allowedSvgTags = new Set([
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

export const allowedSvgAttributes = new Set([
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

export const computedStylePropertyCount = 475;
export const computedStylePropertyNamesSha256 =
  "fdad1a151475c0604e6bae4e1391a2bfa0135bd36edac664a78c0f70ec06e75c";

const localFragmentPattern = /^#[A-Za-z_][A-Za-z0-9_.:-]*$/;
const localFragmentSource = "#[A-Za-z_][A-Za-z0-9_.:-]*";
const localUrlFunctionPattern = new RegExp(
  `\\burl\\([\\t\\n\\f\\r ]*(?:"${localFragmentSource}"|'${localFragmentSource}'|${localFragmentSource})[\\t\\n\\f\\r ]*\\)`,
  "gi",
);
const numberPattern = "-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?";
const viewBoxPattern = new RegExp(
  `^\\s*${numberPattern}(?:[ ,]+${numberPattern}){3}\\s*$`,
  "i",
);

function decodeCssEscapes(value) {
  let decoded = value;
  for (let pass = 0; pass < 8; pass += 1) {
    const next = decoded.replace(
      /\\(?:([0-9a-f]{1,6})(?:\r\n|[\t\n\f\r ])?|([^\n\r\f0-9a-f]))/gi,
      (_match, hexadecimal, escapedCharacter) => {
        if (hexadecimal) {
          const codePoint = Number.parseInt(hexadecimal, 16);
          return codePoint === 0 || codePoint > 0x10ffff
            ? "\uFFFD"
            : String.fromCodePoint(codePoint);
        }
        return escapedCharacter;
      },
    );
    if (next === decoded) return next;
    decoded = next;
  }
  throw new Error("Visual value uses excessively nested CSS escapes.");
}

function assertSafeVisualScalar(value, context) {
  if (
    typeof value !== "string" ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${context} must be a safe string.`);
  }
  if (/\/\*|\*\//.test(value)) {
    throw new Error(`${context} must not contain CSS comments.`);
  }
  const normalized = decodeCssEscapes(value);
  if (normalized.includes("\\")) {
    throw new Error(`${context} contains an unsupported CSS escape.`);
  }
  const withoutLocalUrls = normalized.replace(localUrlFunctionPattern, "");
  if (
    /\burl\s*\(/i.test(withoutLocalUrls) ||
    /(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(withoutLocalUrls) ||
    /(?:expression\s*\(|@import\b)/i.test(withoutLocalUrls)
  ) {
    throw new Error(`${context} contains an unsupported URL or executable CSS value.`);
  }
  return value;
}

function assertSafeClassName(value, context) {
  if (value === null) return value;
  if (
    typeof value !== "string" ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /\/\*|\*\/|\burl\s*\(|(?:https?|app|blob|data|javascript|file|chrome-extension):\/\//i.test(
      value,
    )
  ) {
    throw new Error(`${context} must be a safe CSS class list.`);
  }
  return value;
}

export function sanitizeVisualScalarRecord(record, context) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${context} must be a visual scalar record.`);
  }
  for (const [name, value] of Object.entries(record)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
      throw new Error(
        `${context} contains an unsupported visual field: ${name}.`,
      );
    }
    assertSafeVisualScalar(value, `${context}.${name}`);
  }
  return record;
}

export function sanitizeComputedStyle(style, context) {
  if (!style || typeof style !== "object" || Array.isArray(style)) {
    throw new Error(`${context} must be a computed-style object.`);
  }
  const names = Object.keys(style).sort();
  const namesSha256 = createHash("sha256")
    .update(JSON.stringify(names))
    .digest("hex");
  if (
    names.length !== computedStylePropertyCount ||
    namesSha256 !== computedStylePropertyNamesSha256
  ) {
    throw new Error(
      `${context} must use the exact ${computedStylePropertyCount}-property computed-style protocol.`,
    );
  }
  for (const [name, value] of Object.entries(style)) {
    if (!/^-?[a-z][a-z0-9-]*$/.test(name) || name.startsWith("--")) {
      throw new Error(`${context} contains an unsupported property name: ${name}.`);
    }
    assertSafeVisualScalar(value, `${context}.${name}`);
  }
  return style;
}

export function sanitizeSvgAttributes(attributes, context) {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new Error(`${context} must be an SVG attribute object.`);
  }
  for (const [name, value] of Object.entries(attributes)) {
    const normalizedName = name.toLowerCase();
    if (!allowedSvgAttributes.has(normalizedName)) {
      throw new Error(`${context} contains an unsupported SVG attribute: ${name}.`);
    }
    assertSafeVisualScalar(value, `${context}.${name}`);
    if (
      (normalizedName === "href" || normalizedName === "xlink:href") &&
      !localFragmentPattern.test(value)
    ) {
      throw new Error(`${context}.${name} must be a local fragment reference.`);
    }
    if (normalizedName === "id" && !localFragmentPattern.test(`#${value}`)) {
      throw new Error(`${context}.${name} must be a safe local identifier.`);
    }
  }
  return attributes;
}

export function sanitizeSvgPrimitive(primitive, context) {
  if (
    !primitive ||
    typeof primitive !== "object" ||
    Array.isArray(primitive) ||
    !allowedSvgTags.has(primitive.tag)
  ) {
    throw new Error(`${context} must use an allowlisted SVG primitive.`);
  }
  if (
    !Object.keys(primitive).every((key) =>
      ["attributes", "children", "computedStyle", "tag"].includes(key),
    )
  ) {
    throw new Error(`${context} contains unsupported primitive fields.`);
  }
  sanitizeSvgAttributes(primitive.attributes, `${context}.attributes`);
  sanitizeComputedStyle(primitive.computedStyle, `${context}.computedStyle`);
  if (primitive.children !== undefined) {
    if (!Array.isArray(primitive.children) || primitive.children.length === 0) {
      throw new Error(`${context}.children must be a non-empty array when present.`);
    }
    primitive.children.forEach((child, index) =>
      sanitizeSvgPrimitive(child, `${context}.children[${index}]`),
    );
  }
  return primitive;
}

export function sanitizeVisualAssetIcon(icon, context) {
  assertSafeClassName(icon.sourceClassName, `${context}.sourceClassName`);
  if (typeof icon.viewBox !== "string" || !viewBoxPattern.test(icon.viewBox)) {
    throw new Error(`${context}.viewBox must contain exactly four numbers.`);
  }
  if (
    !Number.isFinite(icon.renderSize?.width) ||
    !Number.isFinite(icon.renderSize?.height) ||
    icon.renderSize.width <= 0 ||
    icon.renderSize.height <= 0
  ) {
    throw new Error(`${context}.renderSize must be finite and positive.`);
  }
  sanitizeSvgAttributes(icon.rootAttributes, `${context}.rootAttributes`);
  sanitizeComputedStyle(icon.rootComputedStyle, `${context}.rootComputedStyle`);
  if (!Array.isArray(icon.primitives) || icon.primitives.length === 0) {
    throw new Error(`${context}.primitives must be a non-empty array.`);
  }
  icon.primitives.forEach((primitive, index) =>
    sanitizeSvgPrimitive(primitive, `${context}.primitives[${index}]`),
  );
  return icon;
}
