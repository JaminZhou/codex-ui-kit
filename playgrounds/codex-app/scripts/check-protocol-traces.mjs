import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = process.cwd();
const traceDirectory = join(root, "fixtures", "traces");
const protocolSchemaPath = fileURLToPath(
  import.meta.resolve(
    "@jaminzhou/codex-app-server-client/schemas/codex_app_server_protocol.v2.schemas.json",
  ),
);
const protocolSchema = JSON.parse(await readFile(protocolSchemaPath, "utf8"));
const notificationVariants =
  protocolSchema.definitions?.ServerNotification?.oneOf;
if (!Array.isArray(notificationVariants)) {
  throw new Error("Pinned client schema has no ServerNotification union.");
}
const notificationMethods = new Set(
  notificationVariants.flatMap((variant) =>
    Array.isArray(variant?.properties?.method?.enum)
      ? variant.properties.method.enum
      : [],
  ),
);
const files = (await readdir(traceDirectory))
  .filter((file) => file.endsWith(".jsonl"))
  .sort();

if (files.length === 0) throw new Error("No protocol trace fixtures found.");

let eventCount = 0;
for (const file of files) {
  const raw = await readFile(join(traceDirectory, file), "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) throw new Error(`${file} is empty.`);

  let previousAt = -1;
  for (const [index, line] of lines.entries()) {
    const event = JSON.parse(line);
    if (
      typeof event.method !== "string" ||
      typeof event.atMs !== "number" ||
      event.atMs < previousAt ||
      typeof event.params !== "object" ||
      event.params === null
    ) {
      throw new Error(`${file}:${index + 1} is not a valid ordered trace event.`);
    }
    if (!notificationMethods.has(event.method)) {
      throw new Error(
        `${file}:${index + 1} uses a method absent from the pinned client: ${event.method}`,
      );
    }
    previousAt = event.atMs;
    eventCount += 1;
  }
}

const trackedSources = [
  await readFile(join(root, "README.md"), "utf8"),
  await readFile(join(root, "src", "App.tsx"), "utf8"),
  await readFile(join(root, "src", "protocol-state.ts"), "utf8"),
].join("\n");
if (/app\.asar|Contents\/Resources|webpack:\/\//i.test(trackedSources)) {
  throw new Error("Implementation sources crossed the clean-room boundary.");
}

console.log(
  `Protocol traces valid: ${files.length} fixtures, ${eventCount} events, pinned app-server methods only.`,
);
