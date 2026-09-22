import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// The installed Codex runtime did not reliably emit a permissions request in
// the signed-in probe. This keeps the bridge honest by driving the same public
// JSON-RPC server-request path through a disposable app-server executable. The
// host remains the real Electron bridge and renderer; production defaults keep
// strict validation and the bundled Codex binary.
const fakeServerSource = `#!/usr/bin/env node
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";

const threadId = "thread-permissions-live";
const turnId = "turn-permissions-live";
const permissionRequestId = 7001;
const evidencePath = process.env.CODEX_UI_KIT_FAKE_PERMISSION_EVIDENCE;
const mode = process.env.CODEX_UI_KIT_FAKE_PERMISSION_MODE || "session";
const cwd = process.env.CODEX_UI_KIT_WORKSPACE || process.cwd();
let requestSent = false;
let settled = false;

function send(message) {
  process.stdout.write(JSON.stringify(message) + String.fromCharCode(10));
}

function response(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function turn(status, error = null) {
  return {
    id: turnId,
    items: [],
    itemsView: "all",
    status,
    error,
    startedAt: Math.floor(Date.now() / 1000),
    completedAt: Math.floor(Date.now() / 1000),
    durationMs: 20,
  };
}

function settle(result) {
  if (settled) return;
  settled = true;
  const grant = result.response?.decision ?? result.response;
  if (evidencePath) {
    writeFileSync(evidencePath, JSON.stringify(result));
  }
  send({
    jsonrpc: "2.0",
    method: "serverRequest/resolved",
    params: { requestId: permissionRequestId },
  });
  if (grant?.scope === "session" || grant?.scope === "turn") {
    const item = {
      id: "assistant-permissions-live",
      type: "agentMessage",
      text: "PERMISSIONS_FLOW_OK",
      phase: "final_answer",
    };
    send({
      jsonrpc: "2.0",
      method: "item/completed",
      params: { threadId, turnId, item },
    });
    send({ jsonrpc: "2.0", method: "turn/completed", params: { threadId, turn: turn("completed") } });
  } else {
    send({
      jsonrpc: "2.0",
      method: "turn/completed",
      params: { threadId, turn: turn("failed", { message: "Permissions denied" }) },
    });
  }
}

function emitPermissionRequest() {
  if (requestSent) return;
  requestSent = true;
  send({
    jsonrpc: "2.0",
    method: "turn/started",
    params: { threadId, turn: turn("inProgress") },
  });
  send({
    jsonrpc: "2.0",
    id: permissionRequestId,
    method: "item/permissions/requestApproval",
    params: {
      threadId,
      turnId,
      itemId: "permissions-live",
      environmentId: null,
      startedAtMs: Date.now(),
      cwd,
      reason: "Allow the task to write the generated artifact.",
      permissions: {
        fileSystem: {
          entries: [{ access: "write", path: { type: "path", path: cwd } }],
          globScanMaxDepth: null,
          read: null,
          write: null,
        },
        network: null,
      },
    },
  });
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  if (!line.trim()) return;
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    response(message.id, {
      userAgent: "codex-ui-kit-permission-fixture",
      codexHome: cwd,
      platformFamily: "unix",
      platformOs: "macos",
    });
    return;
  }
  if (message.method === "thread/start") {
    response(message.id, { thread: { id: threadId }, model: "fixture-model", reasoningEffort: null });
    return;
  }
  if (message.method === "turn/start") {
    response(message.id, { turn: { id: turnId } });
    setTimeout(emitPermissionRequest, 80);
    return;
  }
  if (message.id === permissionRequestId && Object.prototype.hasOwnProperty.call(message, "result")) {
    settle({ mode, response: message.result });
    return;
  }
  if (message.id !== undefined) response(message.id, {});
});
lines.on("close", () => process.exit(0));
`;

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene, "pull-request-detail scene is required");

async function runPermissionCase(mode, choose) {
  const directory = await mkdtemp(join(tmpdir(), `ui-kit-live-permissions-${mode}-`));
  const fakeServerPath = join(directory, "fake-codex-app-server.mjs");
  const evidencePath = join(directory, "permission-response.json");
  await writeFile(fakeServerPath, fakeServerSource, { mode: 0o755 });
  await chmod(fakeServerPath, 0o755);
  const { app, page } = await launchScene(scene, {
    capture: false,
    environment: {
      CODEX_UI_KIT_LIVE_CODEX_PATH: fakeServerPath,
      CODEX_UI_KIT_LIVE_PROTOCOL_VALIDATION: "off",
      CODEX_UI_KIT_FAKE_PERMISSION_EVIDENCE: evidencePath,
      CODEX_UI_KIT_FAKE_PERMISSION_MODE: mode,
      CODEX_UI_KIT_WORKSPACE: directory,
    },
  });
  try {
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await page.evaluate(() => {
      window.__permissionEvidence = [];
      window.codexDemo.onServerRequest((request) => window.__permissionEvidence.push(request));
    });
    const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
    await composer.fill("Request the disposable permission fixture and then report the result.");
    await composer.press("Enter");
    await page.waitForFunction(
      () => window.__permissionEvidence.some((event) => event.method === "item/permissions/requestApproval"),
      undefined,
      { timeout: 30_000 },
    );
    const evidence = await page.evaluate(() => window.__permissionEvidence);
    const request = evidence.find((event) => event.method === "item/permissions/requestApproval");
    assert.ok(request, "permission request must reach the renderer");
    assert.equal(request.params.itemId, "permissions-live");
    assert.equal(request.params.permissions.fileSystem.entries[0].access, "write");
    assert.equal(request.params.permissions.fileSystem.entries[0].path.path, directory);
    const approval = page.getByTestId("approval-request");
    await approval.waitFor();
    assert.equal(await page.getByText("Allow the requested permissions?", { exact: true }).count(), 1);
    await page.screenshot({ path: join(directory, `${mode}-wide-pending.png`) });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(720, 820));
    await page.waitForFunction(() => innerWidth === 720);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `${mode}-compact-pending.png`) });
    await choose(approval, page);
    const responseDeadline = Date.now() + 10_000;
    while (Date.now() < responseDeadline) {
      try {
        const response = JSON.parse(await readFile(evidencePath, "utf8"));
        const grant = response.response.decision ?? response.response;
        if (mode === "session") {
          assert.equal(grant.scope, "session");
          assert.equal(grant.permissions.fileSystem.entries[0].access, "write");
        } else {
          assert.deepEqual(grant.permissions, {});
        }
        if (mode === "session") await page.getByText("PERMISSIONS_FLOW_OK", { exact: true }).waitFor();
        return { mode, directory, response, compactOverflow: false };
      } catch (error) {
        if (Date.now() + 100 < responseDeadline) await new Promise((resolve) => setTimeout(resolve, 100));
        else throw error;
      }
    }
    throw new Error(`Timed out waiting for ${mode} permission response.`);
  } finally {
    await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
    await app.close();
  }
}

const session = await runPermissionCase("session", async (approval) => {
  await approval.getByRole("button", { name: "Approval options" }).click();
  await approval.page().locator('.codex-ui-approval-request__options-menu [role="menuitem"]').filter({ hasText: "Allow this conversation" }).click();
});
const denied = await runPermissionCase("denied", async (approval) => {
  await approval.getByRole("button", { name: "Deny", exact: true }).click();
});

console.log(JSON.stringify({
  passed: true,
  cases: [session, denied],
  protocol: "public JSON-RPC item/permissions/requestApproval through Electron Live bridge",
  pixels: "wide and 720 compact pending cards; zero compact overflow",
}));
