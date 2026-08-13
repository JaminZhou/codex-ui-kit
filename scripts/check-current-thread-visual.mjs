import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function selectCurrentThreadVisualScenes(environment = process.env) {
  const scenes = ["current-thread-completed"];
  if (environment.CODEX_UI_KIT_THREAD_COMPACT_REFERENCE) {
    scenes.push("current-thread-completed-compact");
  }
  return scenes;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.argv.push(
    `--scenes=${selectCurrentThreadVisualScenes().join(",")}`,
  );
  await import("./check-visual-scenarios.mjs");
}
