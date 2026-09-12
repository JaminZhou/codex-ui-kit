import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const requiredStates = [
  "wide-ready", "page-two", "page-one", "zoom-menu", "zoom-150", "fit",
  "annotate", "unannotate", "expanded", "collapsed", "compact-open",
  "compact-page-two", "compact-reopened", "wide-restored",
];
const near = (actual, expected, label) =>
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= 1, label);

/** Validates observed product evidence, not the independently rendered replay. */
export function assertPdfPreviewCapture(record) {
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.baseline.appVersion, "26.903.71938");
  assert.equal(record.baseline.buildNumber, "8576");
  assert.equal(record.baseline.appAsarSha256,
    "58fef82480b9064e209b5b2fd934992e8d71515aea8084482369cfeaff1b8ee0");
  assert.equal(record.captureKind, "renderer_emulation", "Do not promote Renderer metrics to native-window evidence");
  assert.equal(record.ownership, "workspace");
  assert.equal(record.sample.pageCount, 2);
  assert.equal(record.sample.source, "independently_generated_local_fixture");
  assert.match(record.sample.sha256, /^[a-f0-9]{64}$/);
  assert.match(record.nativeWindowStatus, /^not_verified:/);
  for (const id of requiredStates) {
    const state = record.states[id];
    assert(state, `Missing PDF state: ${id}`);
    assert.equal(state.horizontalOverflow, 0, `${id}: document overflow`);
    assert.equal(state.canvases.length, 2, `${id}: two rendered document pages`);
    assert.equal(state.scrollOwners.length, 1, `${id}: one owned document scroller`);
    near(state.header.height, 40, `${id}: toolbar height`);
    near(state.panel.y, 46, `${id}: workspace tab strip offset`);
    near(state.panel.x + state.panel.width, state.viewport.width, `${id}: right-side ownership`);
    assert(state.panel.width > 300, `${id}: reachable panel width`);
    const previous = state.controls.find(control => control.label === "Previous page");
    const next = state.controls.find(control => control.label === "Next page");
    assert(previous && next, `${id}: pagination controls`);
    assert.equal(previous.disabled, state.page === 1, `${id}: previous-page boundary`);
    assert.equal(next.disabled, state.page === 2, `${id}: next-page boundary`);
    assert(state.controls.some(control => control.label === "Download"), `${id}: download affordance`);
    assert(state.controls.some(control => control.label === "Open in Preview"), `${id}: host open affordance`);
  }
  const states = record.states;
  near(states["wide-ready"].panel.width, 590.828125, "Observed wide panel width");
  near(states["compact-open"].panel.width, 344.671875, "Observed compact panel width");
  assert.equal(states["page-two"].page, 2);
  assert.equal(states["page-one"].page, 1);
  assert.equal(states["compact-page-two"].page, 2);
  assert.equal(states["compact-reopened"].page, 1, "Reopening resets pagination");
  assert.equal(states["compact-reopened"].scrollOwners[0].scrollTop, 0);
  assert.equal(states["zoom-150"].zoomPercent, 150);
  assert.equal(states.fit.zoomPercent, 91);
  assert.equal(states.expanded.zoomPercent, 190);
  assert.equal(states["compact-open"].zoomPercent, 50);
  near(states.expanded.panel.width, 1180, "Expanded workspace width");
  assert.equal(states.annotate.annotating, true);
  assert.equal(states.unannotate.annotating, false);
  assert.deepEqual(states["zoom-menu"].menus[0].items.map(item => item.text),
    ["25%", "50%", "100%", "150%", "200%", "Zoom to fit"]);
  for (const id of ["resizeToCompact", "close", "cleanup"]) {
    const lifecycle = record.lifecycle[id];
    assert.equal(lifecycle.editorLength, 0, `${id}: the draft stayed empty`);
    assert.equal(lifecycle.previewCount, 0, `${id}: preview unmounted`);
    assert.equal(lifecycle.attachmentCount, id === "cleanup" ? 0 : 1,
      `${id}: attachment ownership`);
  }
  const serialized = JSON.stringify(record);
  assert(!/\/Users\/|\/private\/|data:image|webSocketDebuggerUrl|<svg/.test(serialized),
    "Research record must not contain private paths, debugging targets, or raw assets");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const record = JSON.parse(readFileSync(
    new URL("../research/current-pdf-preview.json", import.meta.url), "utf8"));
  assertPdfPreviewCapture(record);
  const fixture = readFileSync(new URL(
    "../playgrounds/codex-app/fixtures/documents/design-spec.pdf", import.meta.url));
  assert.equal(fixture.byteLength, record.sample.byteLength, "PDF fixture byte count");
  assert.equal(createHash("sha256").update(fixture).digest("hex"),
    record.sample.sha256, "The replay must use the observed synthetic PDF");
  const assets = JSON.parse(readFileSync(new URL("../research/current-pdf-assets.json", import.meta.url), "utf8"));
  for (const key of ["appVersion", "buildNumber", "appAsarSha256"]) assert.equal(assets.baseline[key], record.baseline[key]);
  assert.deepEqual(assets.icons.map(icon => icon.id), ["previous", "next", "annotate", "chevron", "download", "annotating"]);
  for (const { sha256, ...icon } of assets.icons) {
    assert.equal(createHash("sha256").update(JSON.stringify(icon)).digest("hex"), sha256, `PDF glyph integrity: ${icon.id}`);
    assert(icon.primitives.length > 0);
    assert(icon.primitives.every(primitive => primitive.tag === "path"));
  }
  assert.match(assets.ownership, /not part of the MIT npm package/);
  assert.equal(assets.remainingApproximation.length, 1, "Keep the uncaptured native Preview icon explicit");
  console.log("Current PDF product capture passed: 14 Renderer states; replay/pixel/native-window gates remain separate.");
}
