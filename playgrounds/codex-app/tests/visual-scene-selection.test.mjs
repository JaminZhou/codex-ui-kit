import { describe, expect, it } from "vitest";
import { visualScenes } from "../scripts/electron-harness.mjs";
import { selectVisualScenes } from "../scripts/visual-scene-selection.mjs";

describe("visual acceptance shards", () => {
  it("partitions the actual scene inventory exactly once without changing scene contracts", () => {
    const shards = Array.from({ length: 4 }, (_, index) => selectVisualScenes(visualScenes, [`--shard=${index + 1}/4`]));
    const selected = shards.flat();
    expect(new Set(selected).size).toBe(visualScenes.length);
    expect(selected.length).toBe(visualScenes.length);
    expect(new Set(selected)).toEqual(new Set(visualScenes));
    expect(Math.max(...shards.map((shard) => shard.length)) - Math.min(...shards.map((shard) => shard.length))).toBeLessThanOrEqual(1);
  });

  it("applies explicit scene selection before sharding", () => {
    const scenes = visualScenes.slice(0, 5);
    expect(selectVisualScenes(visualScenes, [`--scenes=${scenes.map(({ id }) => id).join(",")}`, "--shard=2/2"])).toEqual([scenes[1], scenes[3]]);
    expect(selectVisualScenes(visualScenes, [])).toBe(visualScenes);
  });

  it.each(["--shard=0/4", "--shard=5/4", "--shard=1/0", "--shard=1/9999", "--shard=1.5/4", "--shard=x", "--scenes=", "--scenes=unknown"])("rejects %s instead of passing an empty or partial suite", (argument) => {
    expect(() => selectVisualScenes(visualScenes, [argument])).toThrow();
  });
});
