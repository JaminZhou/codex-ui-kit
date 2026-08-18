import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  currentThreadVisualAssetIds,
  serializeCurrentThreadVisualAssetSubset,
} from "./current-thread-visual-assets.mjs";

const write = process.argv.includes("--write");
const manifestPath = fileURLToPath(
  new URL("../research/visual-assets.json", import.meta.url),
);
const outputPath = fileURLToPath(
  new URL("../demo/current-thread-visual-assets.json", import.meta.url),
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const output = serializeCurrentThreadVisualAssetSubset(manifest);

if (write) {
  writeFileSync(outputPath, output);
  console.log(`Updated ${outputPath}`);
} else if (readFileSync(outputPath, "utf8") !== output) {
  throw new Error(
    "demo/current-thread-visual-assets.json is stale; run pnpm update:current-thread-visual-assets.",
  );
} else {
  console.log(
    `Current-thread visual asset subset is current (${currentThreadVisualAssetIds.length} icons).`,
  );
}
