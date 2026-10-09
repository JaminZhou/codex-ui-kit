import { describe, expect, it, vi } from "vitest";
import type { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { readLiveModelCatalog, resolveLiveModelSelection } from "../electron/live-model-catalog";

type ModelListResponse = Awaited<ReturnType<CodexAppServerClient["modelList"]>>;

function model(id: string, efforts = ["low", "medium"]): ModelListResponse["data"][number] {
  return { id, model: id, displayName: id, description: "Public model", hidden: false, isDefault: id === "a",
    defaultReasoningEffort: "low", supportedReasoningEfforts: efforts.map(reasoningEffort => ({ reasoningEffort, description: reasoningEffort })) } as ModelListResponse["data"][number];
}
describe("read-only public model catalog", () => {
  it("preserves complete pagination, public IDs and model-specific efforts without inventing Default", async () => {
    const modelList = vi.fn().mockResolvedValueOnce({ data: [model("a", ["low", "xhigh", "ultra"])], nextCursor: "next" })
      .mockResolvedValueOnce({ data: [model("b", ["medium", "max"])], nextCursor: null });
    const rows = await readLiveModelCatalog({ modelList });
    expect(rows.map(row => row.id)).toEqual(["a", "b"]);
    expect(rows[0].supportedReasoningEfforts.map(option => option.reasoningEffort)).toEqual(["low", "xhigh", "ultra"]);
    expect(rows[1].supportedReasoningEfforts.map(option => option.reasoningEffort)).toEqual(["medium", "max"]);
    expect(modelList.mock.calls).toEqual([[{ includeHidden: false }], [{ includeHidden: false, cursor: "next" }]]);
  });
  it("does not promote hidden entries or mutate protocol data", async () => {
    const visible = model("a");
    const hidden = { ...model("hidden"), hidden: true };
    const rows = await readLiveModelCatalog({ modelList: vi.fn().mockResolvedValue({ data: [visible, hidden], nextCursor: null }) });
    rows[0].supportedReasoningEfforts[0].description = "Own state";
    expect(visible.supportedReasoningEfforts[0].description).toBe("low");
    expect(rows).toHaveLength(1);
  });
  it("preserves empty catalog as empty, not a fixture fallback", async () => {
    expect(await readLiveModelCatalog({ modelList: vi.fn().mockResolvedValue({ data: [], nextCursor: null }) })).toEqual([]);
  });
  it("rejects duplicate models rather than presenting partial capabilities", async () => {
    const modelList = vi.fn().mockResolvedValueOnce({ data: [model("a")], nextCursor: "next" }).mockResolvedValueOnce({ data: [model("a")], nextCursor: null });
    await expect(readLiveModelCatalog({ modelList })).rejects.toThrow("repeated a model");
  });
  it("rejects a cursor cycle", async () => {
    const modelList = vi.fn().mockResolvedValue({ data: [], nextCursor: "cycle" });
    await expect(readLiveModelCatalog({ modelList })).rejects.toThrow("did not advance");
    expect(modelList).toHaveBeenCalledTimes(2);
  });
  it("propagates a later-page failure, never returning a partial catalog", async () => {
    const modelList = vi.fn().mockResolvedValueOnce({ data: [model("a")], nextCursor: "next" }).mockRejectedValueOnce(new Error("offline"));
    await expect(readLiveModelCatalog({ modelList })).rejects.toThrow("offline");
  });
});

describe("live model selection validation", () => {
  const catalog = [model("a", ["low", "ultra"]), { ...model("b", ["medium", "max"]), model: "canonical-b", defaultReasoningEffort: "medium" as const }];
  it("keeps existing settings when no override was requested", () => {
    expect(resolveLiveModelSelection(undefined, [])).toBeUndefined();
  });
  it("maps public ID to canonical model and preserves per-model effort", () => {
    expect(resolveLiveModelSelection({ modelId: "b", effort: "max", model: "forged", displayName: "fake" }, catalog)).toEqual({ model: "canonical-b", effort: "max" });
  });
  it("rejects malformed inputs and removed models", () => {
    for (const raw of [null, [], "a", {}, { modelId: "a", effort: 3 }]) expect(() => resolveLiveModelSelection(raw, catalog)).toThrow("Invalid live model");
    expect(() => resolveLiveModelSelection({ modelId: "removed", effort: "low" }, catalog)).toThrow("no longer");
  });
  it("rejects an effort supported only by another model", () => {
    expect(() => resolveLiveModelSelection({ modelId: "b", effort: "ultra" }, catalog)).toThrow("not supported");
  });
});
