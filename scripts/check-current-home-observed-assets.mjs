import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const manifest = JSON.parse(await readFile(new URL("../research/current-home-assets-26.930.61225.json", import.meta.url), "utf8"));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(manifest.baseline, { version: "26.930.61225", build: "13232", asarSha256: "88b8cce6f627771bf341f5a6bb464ad220749b0d442d44f618d7741c2de7318b" });
assert.match(manifest.ownership, /OpenAI-owned.*not MIT/);
assert.match(manifest.distribution, /excluded from npm/);
const tags = new Set(["svg", "mask", "path", "g", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const attributes = new Set(["id", "mask", "d", "viewBox", "stroke", "fill", "stroke-width", "stroke-linecap", "stroke-linejoin", "cx", "cy", "r", "x", "y", "height", "width", "rx", "ry", "opacity", "points", "transform", "fill-rule", "clip-rule", "maskUnits", "maskContentUnits"]);
const styles = ["color", "fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "opacity", "fillOpacity", "strokeOpacity", "transform", "transformOrigin", "filter", "maskImage", "backgroundColor", "backgroundImage", "borderRadius", "boxShadow", "width", "height", "display", "visibility"].sort();
const ids = ["home-mark", "add-resource", "dictation", "voice-chat"];
for (const theme of ["dark", "light"]) {
  assert.deepEqual(manifest.themes[theme].map(icon => icon.id), ids);
  for (const icon of manifest.themes[theme]) {
    assert.equal(createHash("sha256").update(JSON.stringify(icon.vector)).digest("hex"), icon.vectorSha256);
    const seen = new Set(), references = [];
    const walk = node => {
      assert.ok(tags.has(node.tag));
      assert.deepEqual(Object.keys(node.styles).sort(), styles);
      for (const [key, value] of Object.entries(node.attributes)) {
        assert.ok(attributes.has(key)); assert.equal(typeof value, "string");
        assert.ok(!value.includes("\\"));
        if (key === "id") { assert.match(value, /^[\w-]+$/); assert.ok(!seen.has(value)); seen.add(value); }
        if (key === "mask") { assert.match(value, /^url\(#[\w-]+\)$/); references.push(value.slice(5, -1)); }
        else assert.ok(!/url\(|https?:|data:|blob:/i.test(value));
      }
      for (const [key, value] of Object.entries(node.styles)) {
        assert.equal(typeof value, "string"); assert.ok(!value.includes("\\"));
        if (/url\(/i.test(value)) { assert.equal(key, "maskImage"); assert.match(value, /^url\("#[\w-]+"\)$/); }
        assert.ok(!/https?:|data:|blob:/i.test(value));
      }
      node.children.forEach(walk);
    };
    walk(icon.vector);
    for (const reference of references) assert.ok(seen.has(reference));
    assert.deepEqual(icon.renderSize, icon.id === "home-mark" ? { width: 56, height: 56 } : { width: 16, height: 16 });
  }
}
assert.deepEqual(manifest.samples.map(s => [s.theme, s.viewport.width]), ["dark", "light"].flatMap(theme => [1180, 820, 721, 720].map(width => [theme, width])));
for (const sample of manifest.samples) {
  assert.equal(sample.viewport.dpr, 1);
  assert.deepEqual(sample.controls.map(c => c.id), ids);
  for (const control of sample.controls) {
    assert.equal(control.screenshot, `${sample.theme}-${sample.viewport.width}-${control.id}-rest.png`);
    assert.match(control.screenshotSha256, /^[a-f0-9]{64}$/);
    for (const rect of [control.rect, control.svgRect]) for (const value of Object.values(rect)) assert.ok(Number.isFinite(value));
  }
}
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
assert.deepEqual(packageJson.files, ["dist", "THIRD_PARTY_NOTICES.md"]);
console.log("Current 26.930.61225 Home public vectors: source hashes, local masks, theme/width coverage and npm exclusion passed; pixels checked separately.");
