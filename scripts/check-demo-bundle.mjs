import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const assetsDirectory = resolve("demo/dist/assets");
const maximumChunkBytes = 500_000;
const javascriptChunks = readdirSync(assetsDirectory)
  .filter((fileName) => fileName.endsWith(".js"))
  .map((fileName) => ({
    bytes: statSync(resolve(assetsDirectory, fileName)).size,
    fileName,
  }))
  .sort((left, right) => right.bytes - left.bytes);

if (javascriptChunks.length === 0) {
  throw new Error("Demo build did not emit any JavaScript chunks.");
}

const oversizedChunks = javascriptChunks.filter(
  ({ bytes }) => bytes > maximumChunkBytes,
);
if (oversizedChunks.length > 0) {
  const details = oversizedChunks
    .map(({ bytes, fileName }) => `${fileName}: ${bytes} bytes`)
    .join("\n");
  throw new Error(
    `Demo JavaScript chunks must not exceed ${maximumChunkBytes} bytes:\n${details}`,
  );
}

const largestChunk = javascriptChunks[0];
console.log(
  `demo bundle contract ok: ${javascriptChunks.length} JavaScript chunks, largest ${largestChunk.fileName} (${largestChunk.bytes} bytes)`,
);
