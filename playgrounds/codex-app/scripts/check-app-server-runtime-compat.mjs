import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { CodexAppServerClient, resolveCodexBinary } from "@jaminzhou/codex-app-server-client";

const configuredBinary = process.env.CODEX_UI_KIT_APP_SERVER_BINARY;
const codexPath = configuredBinary ?? resolveCodexBinary().executablePath;
assert.ok(isAbsolute(codexPath), "Codex App Server binary path must be absolute.");

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

  const expectedVersion = process.env.CODEX_UI_KIT_APP_SERVER_EXPECTED_VERSION;
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

  process.stdout.write(`${JSON.stringify({
    codexCliVersion: version,
    binarySource: configuredBinary ? "explicit-override" : "pinned-client-dependency",
    appServerState: client.state,
    protocolValidation: "strict",
    initializationUserAgent: initialization.userAgent,
    credentialHome: "isolated temporary CODEX_HOME",
    modelTurnStarted: false,
  })}\n`);
} finally {
  await client?.close().catch(() => {});
  await rm(codexHome, { recursive: true, force: true });
}
