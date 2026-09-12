import { describe, expect, it } from "vitest";
import capture from "../research/current-pdf-preview.json";
import { assertPdfPreviewCapture } from "../scripts/check-current-pdf-preview.mjs";

describe("current PDF product capture", () => {
  it("retains the observed product lifecycle and evidence boundary", () => {
    expect(() => assertPdfPreviewCapture(capture)).not.toThrow();
  });

  it.each([
    ["native-window promotion", (record: typeof capture) => { record.captureKind = "native-window"; }],
    ["stale build", (record: typeof capture) => { record.baseline.appVersion = "26.825.51511"; }],
    ["wrong page boundary", (record: typeof capture) => { record.states["page-two"].controls[1].disabled = false; }],
    ["missing rendered page", (record: typeof capture) => { record.states["wide-ready"].canvases.pop(); }],
    ["lost attachment", (record: typeof capture) => { record.lifecycle.close.attachmentCount = 0; }],
    ["uncleared draft", (record: typeof capture) => { record.lifecycle.cleanup.attachmentCount = 1; }],
    ["wrong reopen state", (record: typeof capture) => { record.states["compact-reopened"].page = 2; }],
    ["unobserved zoom choice", (record: typeof capture) => { record.states["zoom-menu"].menus[0].items[0].text = "75%"; }],
  ])("rejects %s", (_name, mutate) => {
    const record = structuredClone(capture);
    mutate(record);
    expect(() => assertPdfPreviewCapture(record)).toThrow();
  });
});
