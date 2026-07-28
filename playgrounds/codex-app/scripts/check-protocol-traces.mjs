import Ajv from "ajv";
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
const serverRequestSchema = JSON.parse(
  await readFile(
    fileURLToPath(
      import.meta.resolve(
        "@jaminzhou/codex-app-server-client/schemas/ServerRequest.json",
      ),
    ),
    "utf8",
  ),
);
const commandApprovalResponseSchema = JSON.parse(
  await readFile(
    fileURLToPath(
      import.meta.resolve(
        "@jaminzhou/codex-app-server-client/schemas/CommandExecutionRequestApprovalResponse.json",
      ),
    ),
    "utf8",
  ),
);
const fileApprovalResponseSchema = JSON.parse(
  await readFile(
    fileURLToPath(
      import.meta.resolve(
        "@jaminzhou/codex-app-server-client/schemas/FileChangeRequestApprovalResponse.json",
      ),
    ),
    "utf8",
  ),
);
const notificationVariants =
  protocolSchema.definitions?.ServerNotification?.oneOf;
if (!Array.isArray(notificationVariants)) {
  throw new Error("Pinned client schema has no ServerNotification union.");
}
const notificationVariantsByMethod = new Map(
  notificationVariants.flatMap((variant) =>
    Array.isArray(variant?.properties?.method?.enum)
      ? variant.properties.method.enum.map((method) => [method, variant])
      : [],
  ),
);
const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
  validateFormats: true,
});
const integerFormats = {
  int32: [-(2 ** 31), 2 ** 31 - 1],
  int64: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  uint: [0, Number.MAX_SAFE_INTEGER],
  uint16: [0, 2 ** 16 - 1],
  uint32: [0, 2 ** 32 - 1],
  uint64: [0, Number.MAX_SAFE_INTEGER],
};
for (const [format, [minimum, maximum]] of Object.entries(integerFormats)) {
  ajv.addFormat(format, {
    type: "number",
    validate: (value) =>
      Number.isSafeInteger(value) && value >= minimum && value <= maximum,
  });
}
ajv.addFormat("double", {
  type: "number",
  validate: Number.isFinite,
});
const notificationValidators = new Map();
function notificationValidator(method) {
  const existing = notificationValidators.get(method);
  if (existing) return existing;
  const variant = notificationVariantsByMethod.get(method);
  if (!variant) return null;
  const validate = ajv.compile({
    $schema: protocolSchema.$schema,
    definitions: protocolSchema.definitions,
    ...variant,
  });
  notificationValidators.set(method, validate);
  return validate;
}
const serverRequestValidator = ajv.compile(serverRequestSchema);
const serverRequestResponseValidators = new Map([
  [
    "item/commandExecution/requestApproval",
    ajv.compile(commandApprovalResponseSchema),
  ],
  [
    "item/fileChange/requestApproval",
    ajv.compile(fileApprovalResponseSchema),
  ],
]);
const itemStartedValidator = notificationValidator("item/started");
if (
  !itemStartedValidator ||
  itemStartedValidator({
    method: "item/started",
    params: {},
  })
) {
  throw new Error("Pinned schema validator accepted an incomplete notification.");
}
if (
  serverRequestValidator({
    id: "incomplete-request",
    method: "item/commandExecution/requestApproval",
    params: {},
  })
) {
  throw new Error("Pinned schema validator accepted an incomplete server request.");
}
const files = (await readdir(traceDirectory))
  .filter((file) => file.endsWith(".jsonl"))
  .sort();

if (files.length === 0) throw new Error("No protocol trace fixtures found.");

let eventCount = 0;
let notificationCount = 0;
let requestCount = 0;
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
    if (event.kind === "request") {
      if (
        !serverRequestValidator({
          id: event.id,
          method: event.method,
          params: event.params,
        })
      ) {
        throw new Error(
          `${file}:${index + 1} fails the pinned server-request schema: ${ajv.errorsText(
            serverRequestValidator.errors,
            { separator: "; " },
          )}`,
        );
      }
      const validateResponse = serverRequestResponseValidators.get(event.method);
      if (!validateResponse || !validateResponse(event.response)) {
        throw new Error(
          `${file}:${index + 1} fails the pinned server-response schema: ${ajv.errorsText(
            validateResponse?.errors,
            { separator: "; " },
          )}`,
        );
      }
      requestCount += 1;
    } else {
      const validateNotification = notificationValidator(event.method);
      if (!validateNotification) {
        throw new Error(
          `${file}:${index + 1} uses a method absent from the pinned client: ${event.method}`,
        );
      }
      if (
        !validateNotification({
          method: event.method,
          params: event.params,
        })
      ) {
        throw new Error(
          `${file}:${index + 1} fails the pinned notification schema: ${ajv.errorsText(
            validateNotification.errors,
            { separator: "; " },
          )}`,
        );
      }
      notificationCount += 1;
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
  `Protocol traces valid: ${files.length} fixtures, ${eventCount} events (${notificationCount} notifications, ${requestCount} server requests with responses).`,
);
