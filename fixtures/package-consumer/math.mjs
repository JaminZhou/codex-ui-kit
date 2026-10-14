import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("codex-ui-kit"));
const kitRequire = createRequire(join(dist, "index.js"));
assert.equal(kitRequire("katex/package.json").version, "0.18.7");
const files = readdirSync(dist);
const rehypeFile = files.find((name) => /^rehype-katex-.*\.js$/.test(name));
const remarkFile = files.find((name) => /^remark-math-.*\.js$/.test(name));
assert(rehypeFile && remarkFile, "missing bundled lazy math adapters");
const { default: renderMath } = await import(pathToFileURL(join(dist, rehypeFile)));
const { default: remarkMath } = await import(pathToFileURL(join(dist, remarkFile)));
const data = {};
remarkMath.call({ data: () => data }, { singleDollarTextMath: false });
assert(data.micromarkExtensions.length && data.fromMarkdownExtensions.length);
const notices = readFileSync(join(dist, "THIRD_PARTY_LICENSES.md"), "utf8");
assert(notices.includes("rehype-katex") && notices.includes("remark-math"));
function render(value) {
  const tree = { type: "root", children: [{ type: "element", tagName: "code",
    properties: { className: ["math-display"] }, children: [{ type: "text", value }] }] };
  renderMath({ strict: "ignore" })(tree, { message(error) { throw error; } });
  return tree;
}
function elements(node) {
  return [node, ...(node.children ?? []).flatMap(elements)].filter((node) => node.type === "element");
}
const normal = elements(render("\\frac{1}{3}"));
assert(normal.some((node) => node.tagName === "math"), "normal formula must render MathML");
Object.defineProperty(Object.prototype, "trust", { value: true, writable: true, configurable: true });
try {
  const output = elements(render("\\href{javascript:alert(1)}{unsafe}\\includegraphics{https://example.invalid/tracker.png}"));
  assert(output.some((node) => node.properties?.className?.includes("katex")), "must render, not silently fail");
  assert(!output.some((node) => node.tagName === "a" || node.tagName === "img"), "inherited trust enabled unsafe math");
} finally {
  delete Object.prototype.trust;
}
console.log("packed math: fixed KaTeX, lazy adapters, MathML and inherited-trust protection passed");
