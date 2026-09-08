import { describe, expect, it } from "vitest";
import { liveCollaborationMode, resolveLiveMode } from "../electron/live-collaboration";

describe("live collaboration settings", () => {
  it("defaults only omitted values and rejects unsupported renderer modes", () => {
    expect(resolveLiveMode(undefined)).toBe("default");
    expect(resolveLiveMode("default")).toBe("default");
    expect(resolveLiveMode("plan")).toBe("plan");
    for (const mode of [null, true, {}, "goal", "unknown"]) expect(() => resolveLiveMode(mode)).toThrow(TypeError);
  });
  it("preserves host-selected model and effort and uses built-in mode instructions", () => {
    expect(liveCollaborationMode("plan", { model: "host-selected", reasoningEffort: "high" })).toEqual({
      mode: "plan", settings: { model: "host-selected", reasoning_effort: "high", developer_instructions: null },
    });
    expect(liveCollaborationMode("default", { model: "configured-model", reasoningEffort: null })).toEqual({
      mode: "default", settings: { model: "configured-model", reasoning_effort: null, developer_instructions: null },
    });
  });
});
