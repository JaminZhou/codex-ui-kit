import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertCurrentShellPaintReference,
  currentShellPaintManifestUrl,
  currentShellPaintReferenceUrl,
} from "./current-shell-paint-contract.mjs";

const manifest = JSON.parse(await readFile(currentShellPaintManifestUrl, "utf8"));
const referenceBytes = await readFile(currentShellPaintReferenceUrl);
const reference = assertCurrentShellPaintReference(manifest, referenceBytes);
assert.equal(reference.data.length, reference.width * reference.height * 4);
console.log("Current 26.930.61225 dark main-edge reference provenance and image digest: passed");
