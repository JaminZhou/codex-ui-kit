import assert from "node:assert/strict";
import { chmod, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Drive the App Server's public server-request union through the real Electron
// main/preload/renderer bridge. The fake executable returns fixture proof data;
// this verifies lifecycle wiring only, never native biometrics or production
// account reachability.
const fakeServerSource = `#!/usr/bin/env node
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";

const threadId = "thread-user-verification-fixture";
const turnId = "turn-user-verification-fixture";
const elicitationRequestId = 7801;
const evidencePath = process.env.CODEX_UI_KIT_FAKE_USER_VERIFICATION_EVIDENCE;
const processEvidencePath = evidencePath ? evidencePath + "." + process.pid + ".json" : null;
const mode = process.env.CODEX_UI_KIT_FAKE_USER_VERIFICATION_MODE || "verify";
const cwd = process.env.CODEX_UI_KIT_WORKSPACE || process.cwd();
const verificationRequests = [];
const verificationCancelRequests = [];
const receivedMethods = [];
const sentMessages = [];
let elicitationResponse = null;

function writeEvidence() {
  if (!processEvidencePath) return;
  writeFileSync(processEvidencePath, JSON.stringify({ pid: process.pid, parentPid: process.ppid, elicitationResponse, verificationRequests, verificationCancelRequests, receivedMethods, sentMessages }));
}

function send(message) {
  sentMessages.push({ method: message.method ?? null, id: message.id ?? null, hasResult: Object.prototype.hasOwnProperty.call(message, "result"), hasError: Object.prototype.hasOwnProperty.call(message, "error") });
  writeEvidence();
  process.stdout.write(JSON.stringify(message) + String.fromCharCode(10));
}

function response(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function thread() {
  const now = Math.floor(Date.now() / 1000);
  return {
    cliVersion: "0.159.0",
    createdAt: now,
    cwd,
    ephemeral: true,
    id: threadId,
    modelProvider: "openai",
    preview: "Start the disposable App Server user-verification fixture.",
    projectId: null,
    sessionId: "session-user-verification-fixture",
    source: "appServer",
    status: { type: "idle" },
    turns: [],
    updatedAt: now,
  };
}

function turn(status) {
  return {
    id: turnId,
    items: [],
    itemsView: "full",
    status,
    error: null,
    startedAt: Math.floor(Date.now() / 1000),
    completedAt: Math.floor(Date.now() / 1000),
    durationMs: 20,
  };
}

function emitUserVerificationRequest() {
  send({ jsonrpc: "2.0", method: "turn/started", params: { threadId, turn: turn("inProgress") } });
  send({
    jsonrpc: "2.0",
    id: elicitationRequestId,
    method: "mcpServer/elicitation/request",
    params: {
      challenge: "fixture-challenge-do-not-use-for-authentication",
      description: "Confirm the fixture action in the local playground.",
      mode: "openai/userVerification",
      serverName: "fixture_user_verification",
      threadId,
      title: "Approve fixture action",
      turnId,
    },
  });
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  if (!line.trim()) return;
  const message = JSON.parse(line);
  receivedMethods.push({
    method: message.method ?? null,
    id: message.id ?? null,
    hasResult: Object.prototype.hasOwnProperty.call(message, "result"),
    hasError: Object.prototype.hasOwnProperty.call(message, "error"),
  });
  writeEvidence();
  if (message.method === "initialize") {
    response(message.id, {
      userAgent: "codex-ui-kit-user-verification-fixture",
      codexHome: cwd,
      platformFamily: "unix",
      platformOs: "macos",
    });
    return;
  }
  if (message.method === "thread/start") {
    response(message.id, {
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      cwd,
      model: "fixture-model",
      modelProvider: "openai",
      sandbox: { type: "dangerFullAccess" },
      thread: thread(),
    });
    return;
  }
  if (message.method === "turn/start") {
    response(message.id, { turn: turn("inProgress") });
    setTimeout(emitUserVerificationRequest, 500);
    return;
  }
  if (message.method === "thread/backgroundTerminals/list") {
    response(message.id, { data: [], nextCursor: null });
    return;
  }
  if (message.method === "userVerification/verify") {
    verificationRequests.push({ id: message.id, params: message.params });
    writeEvidence();
    if (mode === "verify") {
      response(message.id, {
        proof: {
          credentialId: "fixture-credential-id-not-a-real-credential",
          signature: "fixture-signature-not-a-real-proof",
        },
      });
    }
    return;
  }
  if (message.method === "userVerification/cancel") {
    verificationCancelRequests.push({ id: message.id, params: message.params });
    response(message.id, {});
    if (mode === "cancel" && verificationRequests.length > 0) {
      send({
        jsonrpc: "2.0",
        id: verificationRequests[0].id,
        error: { code: -32800, message: "Fixture verification canceled." },
      });
    }
    writeEvidence();
    return;
  }
  if (message.id === elicitationRequestId && Object.prototype.hasOwnProperty.call(message, "result")) {
    elicitationResponse = message.result;
    writeEvidence();
    send({ jsonrpc: "2.0", method: "turn/completed", params: { threadId, turn: turn("completed") } });
    return;
  }
  if (message.id !== undefined) response(message.id, {});
});
lines.on("close", () => process.exit(0));
`;

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene, "pull-request-detail scene is required");

async function readFixtureState(evidencePath) {
  try {
    const directory = dirname(evidencePath);
    const prefix = `${basename(evidencePath)}.`;
    const sessions = await Promise.all((await readdir(directory))
      .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
      .map(async (name) => JSON.parse(await readFile(join(directory, name), "utf8"))));
    if (sessions.length === 0) return JSON.parse(await readFile(evidencePath, "utf8"));
    return {
      elicitationResponse: sessions.find((session) => session.elicitationResponse)?.elicitationResponse ?? null,
      receivedMethods: sessions.flatMap((session) => session.receivedMethods),
      sentMessages: sessions.flatMap((session) => session.sentMessages),
      sessions,
      verificationCancelRequests: sessions.flatMap((session) => session.verificationCancelRequests),
      verificationRequests: sessions.flatMap((session) => session.verificationRequests),
    };
  } catch {
    return { elicitationResponse: null, verificationRequests: [], verificationCancelRequests: [], receivedMethods: [], sentMessages: [] };
  }
}

async function waitForFixtureState(evidencePath, predicate, label) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await readFixtureState(evidencePath);
    if (predicate(state)) return state;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for fixture evidence: ${label}; last state=${JSON.stringify(await readFixtureState(evidencePath))}`);
}

async function runCase(mode) {
  const directory = await mkdtemp(join(tmpdir(), `ui-kit-user-verification-${mode}-`));
  const fakeServerPath = join(directory, "fake-codex-app-server.mjs");
  const evidencePath = join(directory, "user-verification-evidence.json");
  await writeFile(fakeServerPath, fakeServerSource, { mode: 0o755 });
  await chmod(fakeServerPath, 0o755);
  const { app, page } = await launchScene(scene, {
    capture: false,
    environment: {
      CODEX_UI_KIT_LIVE_CODEX_PATH: fakeServerPath,
      CODEX_UI_KIT_LIVE_PROTOCOL_VALIDATION: "strict",
      CODEX_UI_KIT_FAKE_USER_VERIFICATION_EVIDENCE: evidencePath,
      CODEX_UI_KIT_FAKE_USER_VERIFICATION_MODE: mode,
      CODEX_UI_KIT_WORKSPACE: directory,
    },
  });

  try {
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await page.evaluate(() => {
      window.__userVerificationEvidence = [];
      window.codexDemo.onServerRequest((request) => window.__userVerificationEvidence.push(request));
    });
    await page.getByRole("textbox", { name: "Message composer", exact: true }).fill(
      "Start the disposable App Server user-verification fixture.",
    );
    await page.getByRole("textbox", { name: "Message composer", exact: true }).press("Enter");

    try {
      await page.waitForFunction(
        () => window.__userVerificationEvidence?.some(
          (event) => event.method === "mcpServer/elicitation/request" &&
            event.params?.mode === "openai/userVerification",
        ),
        undefined,
        { timeout: 10_000 },
      );
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}; fake-server=${JSON.stringify(await readFixtureState(evidencePath))}`);
    }
    const request = await page.evaluate(() => window.__userVerificationEvidence.find(
      (event) => event.method === "mcpServer/elicitation/request" &&
        event.params?.mode === "openai/userVerification",
    ));
    assert.equal(request.kind, "request");
    assert.equal(request.params.serverName, "fixture_user_verification");
    assert.equal(request.params.challenge, "fixture-challenge-do-not-use-for-authentication");
    assert.equal(request.params.threadId, "thread-user-verification-fixture");

    const form = page.getByRole("form", { name: "MCP server request", exact: true });
    try {
      await form.waitFor({ state: "visible", timeout: 5_000 });
    } catch (error) {
      const debug = await page.evaluate(() => ({
        events: window.__userVerificationEvidence,
        forms: [...document.querySelectorAll("form")].map((element) => ({
          label: element.getAttribute("aria-label"),
          className: element.className,
          display: getComputedStyle(element).display,
          visibility: getComputedStyle(element).visibility,
          text: element.textContent?.slice(0, 300),
        })),
        elicitationNodes: [...document.querySelectorAll(".live-mcp-elicitation")].map((element) => ({
          display: getComputedStyle(element).display,
          text: element.textContent?.slice(0, 300),
        })),
        body: document.body.innerText.slice(-1200),
      }));
      throw new Error(`${error instanceof Error ? error.message : String(error)}; fixture=${JSON.stringify(await readFixtureState(evidencePath))}; request=${JSON.stringify(request)}; renderer=${JSON.stringify(debug)}; directory=${directory}`);
    }
    assert.equal(await form.getByText("Device verification", { exact: true }).count(), 1);
    assert.equal(await form.getByText("Approve fixture action", { exact: true }).count(), 1);
    assert.equal(await form.getByText("Confirm the fixture action in the local playground.", { exact: true }).count(), 1);
    assert.equal(await form.getByRole("button", { name: "Verify and approve", exact: true }).isEnabled(), true);
    const wideGeometry = await form.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const title = element.querySelector(".live-mcp-elicitation__verification-title");
      return {
        fontFamily: getComputedStyle(title).fontFamily,
        height: rect.height,
        width: rect.width,
      };
    });
    assert.ok(wideGeometry.width > 0 && wideGeometry.height > 0);
    const wideScreenshot = join(directory, "verification-wide-pending.png");
    await page.screenshot({ path: wideScreenshot });

    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(720, 820));
    await page.waitForFunction(() => innerWidth === 720);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const compactGeometry = await form.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    });
    assert.ok(compactGeometry.width > 0 && compactGeometry.height > 0);
    const compactScreenshot = join(directory, "verification-compact-pending.png");
    await page.screenshot({ path: compactScreenshot });

    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal((await readFixtureState(evidencePath)).verificationRequests.length, 0,
      "rendering the request must not invoke device verification");

    await form.getByRole("button", { name: "Verify and approve", exact: true }).click();
    const verificationState = await waitForFixtureState(
      evidencePath,
      (state) => state.verificationRequests.length === 1,
      `${mode} verify request`,
    );
    const verification = verificationState.verificationRequests[0];
    assert.equal(verification.params.challenge, "fixture-challenge-do-not-use-for-authentication");
    assert.equal(verification.params.title, "Approve fixture action");
    assert.equal(verification.params.description, "Confirm the fixture action in the local playground.");

    if (mode === "cancel") {
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      const canceledState = await waitForFixtureState(
        evidencePath,
        (state) => state.verificationCancelRequests.length === 1 &&
          state.elicitationResponse?.action === "cancel",
        "cancel in-flight verification",
      );
      assert.deepEqual(canceledState.verificationCancelRequests[0].params, { requestId: verification.id });
      await form.waitFor({ state: "detached" });
      return { mode, directory, wideGeometry, compactGeometry, wideScreenshot, compactScreenshot, canceled: true };
    }

    const acceptedState = await waitForFixtureState(
      evidencePath,
      (state) => state.elicitationResponse?.action === "accept",
      "accepted verification proof",
    );
    assert.deepEqual(acceptedState.elicitationResponse.content, {
      credentialId: "fixture-credential-id-not-a-real-credential",
      signature: "fixture-signature-not-a-real-proof",
    });
    await form.waitFor({ state: "detached" });
    return { mode, directory, wideGeometry, compactGeometry, wideScreenshot, compactScreenshot, accepted: true };
  } finally {
    await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
    await app.close();
  }
}

const results = [await runCase("verify"), await runCase("cancel")];
console.log(JSON.stringify({
  passed: true,
  cases: results,
  protocol: "App Server mcpServer/elicitation/request and userVerification/{verify,cancel} via Electron Live bridge",
  limitation: "synthetic fixture proof only; no native biometric and no production reachability claim",
}));
