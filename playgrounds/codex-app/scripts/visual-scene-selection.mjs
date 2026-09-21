export function selectVisualScenes(scenes, args = process.argv.slice(2)) {
  const sceneArguments = args.filter((argument) => argument.startsWith("--scenes="));
  const shardArguments = args.filter((argument) => argument.startsWith("--shard="));
  if (sceneArguments.length > 1 || shardArguments.length > 1) {
    throw new Error("Specify --scenes and --shard at most once each.");
  }
  let selected = scenes;
  if (sceneArguments.length) {
    const ids = new Set(sceneArguments[0].slice("--scenes=".length).split(",").map((id) => id.trim()).filter(Boolean));
    const known = new Set(scenes.map(({ id }) => id));
    const unknown = [...ids].filter((id) => !known.has(id));
    if (!ids.size || unknown.length) {
      throw new Error(`Invalid visual scene selection: ${unknown.join(", ") || "empty selection"}`);
    }
    selected = scenes.filter(({ id }) => ids.has(id));
  }
  if (shardArguments.length) {
    const match = /^--shard=([1-9]\d*)\/([1-9]\d*)$/.exec(shardArguments[0]);
    const index = Number(match?.[1]);
    const count = Number(match?.[2]);
    if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || index > count || count > selected.length) {
      throw new Error("Visual shard must be INDEX/COUNT with 1 <= INDEX <= COUNT <= scene count.");
    }
    selected = selected.filter((_, position) => position % count === index - 1);
  }
  return selected;
}
