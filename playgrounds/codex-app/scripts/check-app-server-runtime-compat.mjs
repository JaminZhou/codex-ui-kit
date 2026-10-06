import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { CodexAppServerClient, resolveCodexBinary } from "@jaminzhou/codex-app-server-client";

const configuredBinary = process.env.CODEX_UI_KIT_APP_SERVER_BINARY;
const codexPath = configuredBinary ?? resolveCodexBinary().executablePath;
assert.ok(isAbsolute(codexPath), "Codex App Server binary path must be absolute.");
const bundledRuntimeVersion = configuredBinary
  ? undefined
  : resolveBundledRuntimeVersion(codexPath);
const expectedVersion =
  process.env.CODEX_UI_KIT_APP_SERVER_EXPECTED_VERSION ?? bundledRuntimeVersion;

function resolveBundledRuntimeVersion(executablePath) {
  let directory = dirname(executablePath);
  while (true) {
    const packageJsonPath = join(directory, "package.json");
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      if (packageJson.name === "@openai/codex") {
        const versionMatch =
          /^(\d+\.\d+\.\d+)(?:-[a-z0-9]+-[a-z0-9]+)?$/i.exec(
            packageJson.version ?? "",
          );
        assert.ok(
          versionMatch,
          `The bundled Codex runtime package must use an exact version; received ${packageJson.version}.`,
        );
        return versionMatch[1];
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(
    "Could not find the bundled @openai/codex package manifest above the resolved CLI binary.",
  );
}

const codexHome = await mkdtemp(join(tmpdir(), "codex-ui-kit-app-server-compat-"));
const pathDirectories = process.env.PATH?.split(delimiter) ?? [];
const serverEnvironment = {
  PATH: pathDirectories.join(delimiter),
  CODEX_HOME: codexHome,
  ...(process.env.LANG ? { LANG: process.env.LANG } : {}),
  ...(process.env.TMPDIR ? { TMPDIR: process.env.TMPDIR } : {}),
};
let client;

try {
  const versionResult = spawnSync(codexPath, ["--version"], {
    encoding: "utf8",
    env: serverEnvironment,
    timeout: 10_000,
  });
  assert.equal(
    versionResult.error,
    undefined,
    `Could not run Codex CLI: ${versionResult.error?.message ?? "unknown spawn error"}`,
  );
  assert.equal(
    versionResult.status,
    0,
    `Codex CLI --version failed: ${versionResult.stderr || versionResult.stdout}`,
  );
  const versionOutput = `${versionResult.stdout}\n${versionResult.stderr}`;
  const version = /codex-cli\s+(\d+\.\d+\.\d+)/i.exec(versionOutput)?.[1];
  assert.ok(version, `Could not parse Codex CLI version from: ${versionOutput.trim()}`);

  if (expectedVersion) {
    assert.equal(
      version,
      expectedVersion,
      "Codex CLI version did not match CODEX_UI_KIT_APP_SERVER_EXPECTED_VERSION.",
    );
  }

  client = new CodexAppServerClient({
    codexPath,
    cwd: codexHome,
    env: serverEnvironment,
    protocolValidation: "strict",
    requestTimeoutMs: 15_000,
  });
  const initialization = await client.connect();
  assert.equal(client.state, "connected");
  assert.ok(initialization.userAgent, "App Server initialize must return its user agent.");
  const mcpStatus = await client.call("mcpServerStatus/list", { detail: "full" });
  assert.ok(
    Array.isArray(mcpStatus.data),
    "App Server mcpServerStatus/list must return a data array.",
  );
  const threadList = await client.call("thread/list", {
    limit: 10,
    useStateDbOnly: true,
  });
  assert.ok(
    Array.isArray(threadList.data),
    "App Server thread/list must return a data array.",
  );
  assert.ok(
    threadList.nextCursor === null || typeof threadList.nextCursor === "string",
    "App Server thread/list must return a nullable pagination cursor.",
  );
  const modelList = await client.call("model/list", {
    limit: 100,
    includeHidden: false,
  });
  assert.ok(
    Array.isArray(modelList.data),
    "App Server model/list must return a data array.",
  );
  assert.ok(
    modelList.nextCursor === null || typeof modelList.nextCursor === "string",
    "App Server model/list must return a nullable pagination cursor.",
  );
  const userVerificationStatus = await client.call("userVerification/status", {});
  assert.ok(
    userVerificationStatus !== null &&
      typeof userVerificationStatus === "object" &&
      !Array.isArray(userVerificationStatus),
    "App Server userVerification/status must return an object.",
  );
  assert.ok(
    userVerificationStatus.credentialId === undefined ||
      userVerificationStatus.credentialId === null ||
      typeof userVerificationStatus.credentialId === "string",
    "App Server userVerification/status must return a nullable credentialId when present.",
  );
  const unavailableReasons = [
    "credentialMissing",
    "biometricsUnavailable",
    "providerUnavailable",
  ];
  assert.ok(
    userVerificationStatus.unavailableReason === undefined ||
      userVerificationStatus.unavailableReason === null ||
      unavailableReasons.includes(userVerificationStatus.unavailableReason),
    "App Server userVerification/status returned an unknown unavailableReason.",
  );
  assert.ok(
    userVerificationStatus.unavailableMessage === undefined ||
      userVerificationStatus.unavailableMessage === null ||
      typeof userVerificationStatus.unavailableMessage === "string",
    "App Server userVerification/status must return a nullable unavailableMessage when present.",
  );
  const userVerificationReadiness =
    userVerificationStatus.unavailableReason ??
    (typeof userVerificationStatus.credentialId === "string" &&
    userVerificationStatus.credentialId.length > 0
      ? "credential-present"
      : "not-reported");
  const gatewayOAuthReadiness = await client.call("account/gatewayOAuth/read");
  assert.ok(
    gatewayOAuthReadiness !== null &&
      typeof gatewayOAuthReadiness === "object" &&
      !Array.isArray(gatewayOAuthReadiness),
    "App Server account/gatewayOAuth/read must return an object.",
  );
  assert.equal(typeof gatewayOAuthReadiness.providerId, "string");
  assert.equal(typeof gatewayOAuthReadiness.providerName, "string");
  assert.equal(typeof gatewayOAuthReadiness.required, "boolean");
  const gatewayOAuthStatuses = ["notReady", "started", "succeeded", "failed"];
  assert.ok(
    gatewayOAuthReadiness.status === undefined ||
      gatewayOAuthReadiness.status === null ||
      gatewayOAuthStatuses.includes(gatewayOAuthReadiness.status),
    "App Server account/gatewayOAuth/read returned an unknown status.",
  );
  assert.ok(
    gatewayOAuthReadiness.error === undefined ||
      gatewayOAuthReadiness.error === null ||
      typeof gatewayOAuthReadiness.error === "string",
    "App Server account/gatewayOAuth/read must return a nullable error when present.",
  );
  process.stdout.write(`${JSON.stringify({
    codexCliVersion: version,
    binarySource: configuredBinary ? "explicit-override" : "pinned-client-dependency",
    expectedCodexCliVersion: expectedVersion ?? null,
    versionExpectation:
      process.env.CODEX_UI_KIT_APP_SERVER_EXPECTED_VERSION
        ? "explicit-override"
        : bundledRuntimeVersion
          ? "bundled-client-runtime-package"
          : "not-asserted",
    appServerState: client.state,
    protocolValidation: "strict",
    initializationUserAgent: initialization.userAgent,
    configuredMcpServerCount: mcpStatus.data.length,
    listedThreadCount: threadList.data.length,
    listedModelCount: modelList.data.length,
    userVerificationReadiness,
    gatewayOAuthRequired: gatewayOAuthReadiness.required,
    gatewayOAuthStatus: gatewayOAuthReadiness.status ?? "not-applicable",
    gatewayOAuthErrorPresent:
      typeof gatewayOAuthReadiness.error === "string" &&
      gatewayOAuthReadiness.error.length > 0,
    credentialHome: "isolated temporary CODEX_HOME",
    modelTurnStarted: false,
    mutatingProtocolMethodsCalled: false,
  })}\n`);
} finally {
  await client?.close().catch(() => {});
  await rm(codexHome, { recursive: true, force: true });
}
