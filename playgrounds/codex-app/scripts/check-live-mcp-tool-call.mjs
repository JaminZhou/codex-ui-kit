import assert from "node:assert/strict";
import { access, lstat, mkdtemp, readFile, symlink, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const mode = process.env.CODEX_UI_KIT_LIVE_MCP_TOOL_CALL_MODE ?? "single";
assert.ok(
  ["single", "multi", "retry", "timeout", "approval-denied", "cancel", "remote", "oauth", "skill"].includes(mode),
  "CODEX_UI_KIT_LIVE_MCP_TOOL_CALL_MODE must be single, multi, retry, timeout, approval-denied, cancel, remote, oauth, or skill.",
);
const mcpServerName = mode === "skill" ? "openaiDeveloperDocs" : "ui_kit_echo";
const toolDefinitions = mode === "skill"
  ? [
      {
        description:
          "Search official OpenAI documentation. Use for official documentation lookup and return the best matching page title and URL.",
        inputSchema: {
          properties: {
            query: { description: "The documentation topic to search", type: "string" },
          },
          required: ["query"],
          type: "object",
        },
        name: "search_openai_docs",
      },
      {
        description:
          "Fetch the official OpenAI documentation page at the supplied URL and return its title and content.",
        inputSchema: {
          properties: {
            url: { description: "The official documentation page URL", type: "string" },
          },
          required: ["url"],
          type: "object",
        },
        name: "fetch_openai_doc",
      },
    ]
  : [
      {
        description:
          "Use this tool when the user explicitly asks for the MCP echo. Returns a deterministic validation token.",
        inputSchema: {
          properties: {
            message: { description: "The message to echo", type: "string" },
          },
          required: ["message"],
          type: "object",
        },
        name: "ui_kit_echo",
      },
      ...(mode === "multi"
        ? [
            {
              description:
                "Use this tool when the user explicitly asks for the MCP uppercase transform. Returns a deterministic validation token.",
              inputSchema: {
                properties: {
                  message: { description: "The message to transform", type: "string" },
                },
                required: ["message"],
                type: "object",
              },
              name: "ui_kit_upper",
            },
          ]
        : []),
    ];
const toolListSource = JSON.stringify(toolDefinitions);
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-mcp-tool-call-"));
const serverPath = join(directory, "server.mjs");
const serverLogPath = join(directory, "server.log");
const historyPath = join(directory, "history.json");
const remoteMethods = [];
let remoteServer = null;
let remoteUrl = null;
let remoteBaseUrl = null;
const oauthToken = "ui-kit-oauth-access-token";
const oauthCode = "ui-kit-oauth-code";
const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
const sourceAuthPath = join(sourceCodexHome, "auth.json");
const fallbackAuthPath = join(homedir(), ".codex", "auth.json");
const ephemeralAuthPath = join(directory, "auth.json");
let authPath = null;
for (const candidate of [sourceAuthPath, fallbackAuthPath]) {
  try {
    await access(candidate, constants.R_OK);
    authPath = candidate;
    break;
  } catch {
    // The live gate below emits a precise signed-in-runtime error if no token is available.
  }
}
assert.ok(
  authPath,
  "A signed-in Codex App Server runtime is required for the live MCP tool-call gate (auth.json was not found).",
);
await symlink(authPath, ephemeralAuthPath);

if (mode === "remote" || mode === "oauth") {
  remoteServer = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const readBody = async () => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      return Buffer.concat(chunks).toString("utf8");
    };
    const sendJson = (status, payload, headers = {}) => {
      response.writeHead(status, { "Content-Type": "application/json", ...headers });
      response.end(JSON.stringify(payload));
    };
    if (mode === "oauth" && request.method === "GET" && requestUrl.pathname === "/.well-known/oauth-protected-resource") {
      sendJson(200, { authorization_servers: [remoteBaseUrl], resource: remoteUrl });
      return;
    }
    if (mode === "oauth" && request.method === "GET" && requestUrl.pathname === "/.well-known/oauth-authorization-server") {
      sendJson(200, {
        authorization_endpoint: `${remoteBaseUrl}/authorize`,
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code"],
        issuer: remoteBaseUrl,
        registration_endpoint: `${remoteBaseUrl}/register`,
        response_types_supported: ["code"],
        scopes_supported: ["mcp:tools"],
        token_endpoint: `${remoteBaseUrl}/token`,
      });
      return;
    }
    if (mode === "oauth" && request.method === "POST" && requestUrl.pathname === "/register") {
      const registration = JSON.parse(await readBody());
      await writeFile(serverLogPath, `DCR ${JSON.stringify(registration)}\n`, { flag: "a" });
      sendJson(201, {
        client_id: "ui-kit-oauth-client",
        client_name: "Codex UI Kit",
        redirect_uris: registration.redirect_uris ?? [],
        token_endpoint_auth_method: "none",
      });
      return;
    }
    if (mode === "oauth" && request.method === "GET" && requestUrl.pathname === "/authorize") {
      const redirect = requestUrl.searchParams.get("redirect_uri");
      const state = requestUrl.searchParams.get("state");
      assert.ok(redirect, "OAuth authorization request must include redirect_uri.");
      const callback = new URL(redirect);
      callback.searchParams.set("code", oauthCode);
      if (state) callback.searchParams.set("state", state);
      response.writeHead(302, { Location: callback.toString() });
      response.end();
      return;
    }
    if (mode === "oauth" && request.method === "POST" && requestUrl.pathname === "/token") {
      const body = new URLSearchParams(await readBody());
      assert.equal(body.get("code"), oauthCode, "OAuth token exchange must use the issued code.");
      sendJson(200, { access_token: oauthToken, expires_in: 3600, scope: "mcp:tools", token_type: "Bearer" });
      return;
    }
    if (request.method !== "POST" || requestUrl.pathname !== "/mcp") {
      response.writeHead(405, { Allow: "POST" });
      response.end();
      return;
    }
    if (mode === "oauth" && request.headers.authorization !== `Bearer ${oauthToken}`) {
      response.writeHead(401, {
        "WWW-Authenticate": `Bearer resource_metadata="${remoteBaseUrl}/.well-known/oauth-protected-resource"`,
      });
      response.end();
      return;
    }
    const raw = await readBody();
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      sendJson(400, { jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON" }, id: null });
      return;
    }
    remoteMethods.push(message.method);
    await writeFile(serverLogPath, `IN ${JSON.stringify(message)}\n`, { flag: "a" });
    if (message.method === "notifications/initialized") {
      response.writeHead(202, { "Mcp-Session-Id": "ui-kit-remote-session" });
      response.end();
      return;
    }
    if (message.method === "ping") {
      sendJson(200, { jsonrpc: "2.0", id: message.id, result: {} }, { "Mcp-Session-Id": "ui-kit-remote-session" });
      return;
    }
    let result;
    if (message.method === "initialize") {
      result = {
        capabilities: { tools: {} },
        protocolVersion: "2024-11-05",
        serverInfo: { name: "ui-kit-remote", version: "1.0.0" },
      };
    } else if (message.method === "tools/list") {
      result = { tools: toolDefinitions };
    } else if (message.method === "tools/call") {
      const tool = String(message.params?.name ?? "");
      const argument = String(message.params?.arguments?.message ?? "");
      const text = tool === "ui_kit_upper" ? "MCP_TOOL_CALL_UPPER:" + argument.toUpperCase() : "MCP_TOOL_CALL_OK:" + argument;
      result = { content: [{ text, type: "text" }], isError: false };
    } else if (message.method === "resources/list") {
      result = { resources: [] };
    } else if (message.method === "resources/templates/list") {
      result = { resourceTemplates: [] };
    } else {
      sendJson(200, { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Unsupported MCP method: ${message.method}` } }, { "Mcp-Session-Id": "ui-kit-remote-session" });
      return;
    }
    const payload = { jsonrpc: "2.0", id: message.id, result };
    await writeFile(serverLogPath, `OUT ${JSON.stringify(payload)}\n`, { flag: "a" });
    sendJson(200, payload, { "Mcp-Session-Id": "ui-kit-remote-session" });
  });
  await new Promise((resolve, reject) => {
    remoteServer.once("error", reject);
    remoteServer.listen(0, "127.0.0.1", resolve);
  });
  const address = remoteServer.address();
  assert.ok(address && typeof address === "object", "The loopback MCP HTTP server must listen.");
  remoteUrl = `http://127.0.0.1:${address.port}/mcp`;
  remoteBaseUrl = `http://127.0.0.1:${address.port}`;
}

const serverSource = `
import fs from "node:fs";
import readline from "node:readline";

const logPath = ${JSON.stringify(serverLogPath)};
const log = (value) => fs.appendFileSync(logPath, value + "\\n");
const reply = (id, result) => {
  const message = { jsonrpc: "2.0", id, result };
  log("OUT " + JSON.stringify(message));
  process.stdout.write(JSON.stringify(message) + "\\n");
};

log("boot");
let callCount = 0;
const input = readline.createInterface({ input: process.stdin });
for await (const line of input) {
  log("IN " + line);
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    continue;
  }
  if (message.method === "initialize") {
    reply(message.id, {
      capabilities: { tools: {} },
      protocolVersion: "2024-11-05",
      serverInfo: { name: ${JSON.stringify(mcpServerName)}, version: "1.0.0" },
    });
  } else if (message.method === "tools/list") {
    reply(message.id, { tools: ${toolListSource} });
  } else if (message.method === "tools/call") {
    callCount += 1;
    const tool = String(message.params?.name ?? "");
    const argumentsValue = message.params?.arguments ?? {};
    if (${JSON.stringify(mode === "skill")}) {
      const result = tool === "search_openai_docs"
        ? {
            content: [{ text: "Model Context Protocol — https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features", type: "text" }],
            isError: false,
            structuredContent: {
              results: [{ title: "Model Context Protocol", url: "https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features" }],
            },
          }
        : tool === "fetch_openai_doc"
          ? {
              content: [{ text: "MCP_SKILL_TOOL_CALL_OK:Model Context Protocol — https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features", type: "text" }],
              isError: false,
              structuredContent: {
                title: "Model Context Protocol",
                url: "https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features",
              },
            }
          : {
              content: [{ text: "Unsupported OpenAI Docs tool: " + tool, type: "text" }],
              isError: true,
            };
      log("TOOL_ARGUMENTS " + JSON.stringify({ tool, arguments: argumentsValue }));
      reply(message.id, result);
      continue;
    }
    const argument = String(argumentsValue?.message ?? "");
    if (${JSON.stringify(mode === "timeout")}) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
    }
    if (${JSON.stringify(mode === "cancel")}) {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
    }
    const shouldFail = ${JSON.stringify(mode === "retry")} && callCount === 1;
    if (shouldFail) {
      reply(message.id, {
        content: [{ text: "MCP_TOOL_CALL_RETRYABLE_ERROR", type: "text" }],
        isError: true,
      });
      continue;
    }
    const text =
      tool === "ui_kit_upper"
        ? "MCP_TOOL_CALL_UPPER:" + argument.toUpperCase()
        : "MCP_TOOL_CALL_OK:" + argument;
    reply(message.id, {
      content: [{
        text,
        type: "text",
      }],
      isError: false,
    });
  } else if (message.method === "resources/list") {
    reply(message.id, { resources: [] });
  } else if (message.method === "resources/templates/list") {
    reply(message.id, { resourceTemplates: [] });
  }
}
`;
await writeFile(serverPath, serverSource);
await writeFile(
  join(directory, "config.toml"),
  mode === "remote" || mode === "oauth"
    ? `[mcp_servers.ui_kit_echo]\nurl = "${remoteUrl}"\nstartup_timeout_sec = 10\ntool_timeout_sec = 30\n`
    : `[mcp_servers.${mcpServerName}]\ncommand = "node"\nargs = ["${serverPath}"]\nstartup_timeout_sec = 10\ntool_timeout_sec = ${mode === "timeout" ? 1 : 30}\n`,
);
process.env.CODEX_HOME = directory;

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
const selectedScene = mode === "skill"
  ? {
      frame: "integration-skill-detail-current-26-915-installed",
      id: "live-openai-docs-skill-try-now",
      scenario: "workspace-workflow",
      theme: "dark",
      view: "plugins",
      windowSize: { height: 820, width: 1180 },
    }
  : scene;
assert.ok(selectedScene, "A required scene is missing for Live MCP mode.");
  const { app, page } = await launchScene(selectedScene, {
    capture: false,
    environment: {
      CODEX_UI_KIT_LIVE_EPHEMERAL: "1",
      CODEX_UI_KIT_LIVE_HISTORY_PATH: historyPath,
      ...(mode === "skill"
        ? {
            CODEX_UI_KIT_LIVE_MODEL:
              process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-luna",
            CODEX_UI_KIT_LIVE_REASONING_EFFORT:
              process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "max",
          }
        : {}),
      CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
      CODEX_UI_KIT_WORKSPACE: directory,
  },
});

const evidence = [];
const result = {
  directory,
  liveAppServer: true,
  mode,
  model: mode === "skill" ? process.env.CODEX_UI_KIT_LIVE_MODEL ?? "gpt-5.6-luna" : null,
  mcpServerStatus: null,
  mcpServer: mcpServerName,
  modelTurns: mode === "multi" ? 2 : 1,
  passed: false,
  tool: mode === "skill" ? "search_openai_docs + fetch_openai_doc" : "ui_kit_echo",
  reasoningEffort: mode === "skill" ? process.env.CODEX_UI_KIT_LIVE_REASONING_EFFORT ?? "max" : null,
  tools: toolDefinitions.map(({ name }) => name),
};
let threadId = null;

try {
  const statusClient = new CodexAppServerClient({
    capabilities: { experimentalApi: true },
    protocolValidation: "strict",
  });
  try {
    await statusClient.connect();
    const readServerStatus = async ({ requireTools = false } = {}) => {
      const deadline = Date.now() + 15_000;
      let response;
      let configuredServer;
      do {
        response = await statusClient.call("mcpServerStatus/list", {
          detail: "full",
        });
        configuredServer = response.data?.find(
          (candidate) => candidate?.name === mcpServerName,
        );
        if (configuredServer && (!requireTools || configuredServer.tools)) {
          return { response, server: configuredServer };
        }
        if (Date.now() >= deadline) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      } while (true);

      const availableNames = (response?.data ?? [])
        .map((candidate) => candidate?.name)
        .filter((name) => typeof name === "string");
      assert.ok(
        configuredServer,
        `The live MCP status list must include ${mcpServerName}; returned: ${availableNames.join(", ") || "(empty)"}.`,
      );
      assert.ok(
        configuredServer.tools,
        `The live MCP status list must expose tools for ${mcpServerName}; runtime status: ${configuredServer.runtimeStatus ?? "unknown"}.`,
      );
      return { response, server: configuredServer };
    };

    let { response: statusResponse, server } = await readServerStatus({
      requireTools: mode !== "oauth",
    });
    if (mode === "oauth") {
      let complete;
      const completion = new Promise((resolve) => {
        complete = resolve;
      });
      const unsubscribeOauth = statusClient.onNotification((event) => {
        if (event.method === "mcpServer/oauthLogin/completed" && event.params?.name === mcpServerName) {
          complete(event.params);
        }
      });
      const oauthLogin = await statusClient.call("mcpServer/oauth/login", {
        clientRegistration: "dcr",
        name: mcpServerName,
        scopes: ["mcp:tools"],
        timeoutSecs: 30,
      });
      assert.match(oauthLogin.authorizationUrl, /^https?:\/\//);
      const browserResponse = await fetch(oauthLogin.authorizationUrl, { redirect: "follow" });
      assert.ok(browserResponse.status < 400, `OAuth callback returned HTTP ${browserResponse.status}.`);
      const completed = await Promise.race([
        completion,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out waiting for OAuth completion.")), 30_000)),
      ]);
      unsubscribeOauth();
      assert.equal(completed.success, true, `MCP OAuth login failed: ${completed.error ?? "unknown error"}`);
      result.oauth = {
        authorizationUrl: oauthLogin.authorizationUrl,
        completed: true,
        initialAuthStatus: server.authStatus ?? null,
        success: completed.success,
      };
      ({ response: statusResponse, server } = await readServerStatus({
        requireTools: true,
      }));
    }
    assert.ok(server.tools, "The live MCP status list must expose configured tools.");
    for (const { name } of toolDefinitions) {
      assert.equal(
        typeof server.tools[name],
        "object",
        `The live MCP status list must expose ${name}.`,
      );
    }
    result.mcpServerStatus = {
      authStatus: server.authStatus,
      name: server.name,
      runtimeStatus: server.runtimeStatus ?? null,
      toolNames: Object.keys(server.tools),
    };
  } finally {
    await statusClient.close();
  }

  if (mode === "skill") {
    await page.getByRole("button", { name: "Try now", exact: true }).click();
    await page.getByTestId("current-skill-try-now").waitFor({ state: "visible" });
  }
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  if (mode === "skill") {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="current-skill-try-now"]')?.getAttribute("data-submitted") === "false",
    );
    const draft = page.getByRole("textbox", { name: "Do anything", exact: true });
    await draft.evaluate((element) => {
      element.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand(
        "insertText",
        false,
        " Find the official Model Context Protocol documentation: search first, then fetch the matching official page and summarize its title and URL. Use the OpenAI Docs MCP tools only; do not use shell, files, browser, network, or any other tool.",
      );
    });
    assert.match(await draft.innerText(), /OpenAI Docs/);
    assert.match(await draft.innerText(), /Model Context Protocol documentation/);
  }
  await page.evaluate((approvalAction) => {
    window.__liveMcpEvidence = [];
    window.codexDemo.onNotification((event) => {
      window.__liveMcpEvidence.push(event);
    });
    window.codexDemo.onServerRequest((event) => {
      window.__liveMcpEvidence.push(event);
      if (
        event.method === "mcpServer/elicitation/request" &&
        event.params?._meta?.codex_approval_kind === "mcp_tool_call"
      ) {
        void window.codexDemo.respondToMcpElicitation({
          action: approvalAction,
          content: {},
          requestId: event.id,
          threadId: event.params.threadId,
        });
      }
    });
  }, mode === "approval-denied" ? "decline" : "accept");

  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  const expectedCallCount = mode === "multi" || mode === "retry" || mode === "skill" ? 2 : 1;
  const multiEchoPrompt = 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_TOOL_CALL_OK:pixel-check.';
  const multiUpperPrompt = 'Call the tool named ui_kit_upper on the MCP server ui_kit_echo with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_TOOL_CALL_UPPER:PIXEL-CHECK.';
  const livePrompt =
    mode === "multi"
      ? multiEchoPrompt
      : mode === "retry"
        ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". If the tool returns MCP_TOOL_CALL_RETRYABLE_ERROR, retry the same tool exactly once with the same argument. Do not use shell, files, network, browser, search, or any other tool. After the retry succeeds, reply exactly MCP_TOOL_CALL_OK:pixel-check.'
      : mode === "timeout"
          ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". The MCP server intentionally exceeds its one-second tool timeout. Do not retry. After the timeout failure, reply exactly MCP_TOOL_CALL_TIMEOUT. Do not use shell, files, network, browser, search, or any other tool.'
      : mode === "approval-denied"
          ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". If the MCP approval request is denied, do not retry. After the denial failure, reply exactly MCP_TOOL_CALL_APPROVAL_DENIED. Do not use shell, files, network, browser, search, or any other tool.'
        : mode === "cancel"
          ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". The tool call will be cancelled by the user while it is running. Do not retry or use shell, files, network, browser, search, or any other tool.'
        : 'Use exactly one MCP tool now. Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_TOOL_CALL_OK.';
  if (mode === "skill") {
    await page
      .getByTestId("current-skill-try-now")
      .getByRole("button", { name: "Send", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector(".demo-root")?.getAttribute("data-skill-try-now-submitted") === "true",
    );
    await page.getByTestId("current-skill-try-now").waitFor({ state: "detached" });
  } else {
    await composer.fill(livePrompt);
    await composer.press("Enter");
  }
  if (mode === "cancel") {
    await page.waitForFunction(
      () =>
        (window.__liveMcpEvidence ?? []).some(
          (event) =>
            event.method === "item/started" &&
            event.params?.item?.type === "mcpToolCall",
        ),
      undefined,
      { timeout: 180_000 },
    );
    const stop = page.getByRole("button", { name: "Stop", exact: true });
    await stop.waitFor({ state: "visible", timeout: 30_000 });
    await stop.click();
    await page.waitForFunction(
      () => (window.__liveMcpEvidence ?? []).some((event) => event.method === "turn/completed"),
      undefined,
      { timeout: 60_000 },
    );
  } else if (mode === "multi") {
    await page.waitForFunction(
      () =>
        (window.__liveMcpEvidence ?? []).filter(
          (event) =>
            event.method === "item/completed" &&
            event.params?.item?.type === "mcpToolCall",
        ).length >= 1,
      undefined,
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () =>
        (window.__liveMcpEvidence ?? []).some(
          (event) =>
            event.method === "turn/completed" &&
            event.params?.turn?.status === "completed",
        ),
      undefined,
      { timeout: 60_000 },
    );
    await composer.fill(multiUpperPrompt);
    await composer.press("Enter");
    await page.waitForFunction(
      (expectedCount) =>
        (window.__liveMcpEvidence ?? []).filter(
          (event) =>
            event.method === "item/completed" &&
            event.params?.item?.type === "mcpToolCall",
        ).length >= expectedCount,
      expectedCallCount,
      { timeout: 180_000 },
    );
  } else if (mode === "skill") {
    await page.waitForFunction(
      (expectedCount) =>
        (window.__liveMcpEvidence ?? []).filter(
          (event) =>
            event.method === "item/completed" &&
            event.params?.item?.type === "mcpToolCall",
        ).length >= expectedCount,
      expectedCallCount,
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      () =>
        (window.__liveMcpEvidence ?? []).some(
          (event) =>
            event.method === "turn/completed" &&
            event.params?.turn?.status === "completed",
        ),
      undefined,
      { timeout: 60_000 },
    );
  } else {
    await page.waitForFunction(
      (expectedCount) =>
        (window.__liveMcpEvidence ?? []).filter(
          (event) =>
            event.method === "item/completed" &&
            event.params?.item?.type === "mcpToolCall",
        ).length >= expectedCount,
      expectedCallCount,
      { timeout: 180_000 },
    );
  }

  const events = await page.evaluate(() => window.__liveMcpEvidence);
  evidence.push(...events);
  const completedItems = events
    .filter(
      (event) =>
        event.method === "item/completed" &&
        event.params?.item?.type === "mcpToolCall",
    )
    .map((event) => ({ item: event.params.item, threadId: event.params.threadId }));
  const startedItems = events
    .filter(
      (event) =>
        event.method === "item/started" &&
        event.params?.item?.type === "mcpToolCall",
    )
    .map((event) => ({ item: event.params.item, threadId: event.params.threadId }));
  if (mode === "cancel") {
    assert.equal(completedItems.length, 0, "An interrupted MCP call must not fabricate a completion item.");
    assert.equal(startedItems.length, 1, "The cancelled MCP call must have one started item.");
  } else {
    assert.equal(
      completedItems.length,
      expectedCallCount,
      `Expected exactly ${expectedCallCount} completed MCP tool-call items.`,
    );
  }
  const expectedResults = {
    ui_kit_echo: "MCP_TOOL_CALL_OK:pixel-check",
    ui_kit_upper: "MCP_TOOL_CALL_UPPER:PIXEL-CHECK",
  };
  if (mode === "retry") {
    const [failedCall, recoveredCall] = completedItems;
    assert.equal(failedCall.item.tool, "ui_kit_echo");
    assert.equal(failedCall.item.status, "failed");
    assert.equal(
      failedCall.item.result?.content?.[0]?.text,
      "MCP_TOOL_CALL_RETRYABLE_ERROR",
    );
    assert.equal(recoveredCall.item.tool, "ui_kit_echo");
    assert.equal(recoveredCall.item.status, "completed");
    assert.equal(
      recoveredCall.item.result?.content?.[0]?.text,
      expectedResults.ui_kit_echo,
    );
  } else if (mode === "timeout") {
    const [timedOutCall] = completedItems;
    assert.equal(timedOutCall.item.tool, "ui_kit_echo");
    assert.equal(timedOutCall.item.status, "failed");
    assert.equal(timedOutCall.item.server, "ui_kit_echo");
    result.timeout = {
      error: timedOutCall.item.error ?? null,
      status: timedOutCall.item.status,
      toolTimeoutSeconds: 1,
    };
  } else if (mode === "approval-denied") {
    const approvals = events.filter(
      (event) =>
        event.method === "mcpServer/elicitation/request" &&
        event.params?._meta?.codex_approval_kind === "mcp_tool_call",
    );
    assert.ok(approvals.length >= 1, "The MCP tool call must request approval before denial.");
    const [deniedCall] = completedItems;
    assert.equal(deniedCall.item.tool, "ui_kit_echo");
    assert.equal(deniedCall.item.status, "failed");
    assert.equal(deniedCall.item.server, "ui_kit_echo");
    const serverLog = await readFile(serverLogPath, "utf8");
    const serverToolCalls = serverLog
      .split("\\n")
      .filter((line) => line.includes('"method":"tools/call"'));
    assert.equal(
      serverToolCalls.length,
      0,
      "A denied MCP approval must not reach the MCP server tools/call handler.",
    );
    result.approval = {
      action: "decline",
      requestCount: approvals.length,
      serverToolCalls: serverToolCalls.length,
      status: deniedCall.item.status,
    };
  } else if (mode === "cancel") {
    const [cancelledCall] = startedItems;
    assert.equal(cancelledCall.item.tool, "ui_kit_echo");
    assert.equal(cancelledCall.item.status, "inProgress");
    assert.equal(cancelledCall.item.server, "ui_kit_echo");
    const serverLog = await readFile(serverLogPath, "utf8");
    assert.ok(serverLog.includes('"method":"tools/call"'));
    assert.ok(!serverLog.includes("MCP_TOOL_CALL_OK"));
    const completedTurn = events.find((event) => event.method === "turn/completed");
    assert.equal(completedTurn?.params?.turn?.status, "interrupted");
    result.cancellation = {
      itemCompleted: false,
      itemStatus: cancelledCall.item.status,
      serverReceivedCall: true,
      serverResponded: false,
      turnStatus: completedTurn.params.turn.status,
    };
  } else if (mode === "skill") {
    const [searchCall, fetchCall] = completedItems;
    assert.equal(searchCall.item.tool, "search_openai_docs");
    assert.equal(searchCall.item.status, "completed");
    assert.equal(searchCall.item.server, mcpServerName);
    assert.equal(fetchCall.item.tool, "fetch_openai_doc");
    assert.equal(fetchCall.item.status, "completed");
    assert.equal(fetchCall.item.server, mcpServerName);
    assert.equal(
      searchCall.item.result?.structuredContent?.results?.[0]?.title,
      "Model Context Protocol",
    );
    assert.equal(
      fetchCall.item.result?.structuredContent?.url,
      "https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features",
    );
    assert.match(
      fetchCall.item.result?.content?.[0]?.text ?? "",
      /^MCP_SKILL_TOOL_CALL_OK:Model Context Protocol/,
    );
    const serverLog = await readFile(serverLogPath, "utf8");
    const serverToolCalls = serverLog
      .split("\n")
      .filter((line) => line.startsWith("TOOL_ARGUMENTS "))
      .map((line) => JSON.parse(line.slice("TOOL_ARGUMENTS ".length)));
    assert.deepEqual(
      serverToolCalls.map(({ tool }) => tool),
      ["search_openai_docs", "fetch_openai_doc"],
      "Try now must execute the OpenAI Docs search then fetch sequence through the local MCP server.",
    );
    assert.match(serverToolCalls[0].arguments.query, /Model Context Protocol/i);
    assert.equal(
      serverToolCalls[1].arguments.url,
      "https://learn.chatgpt.com/docs/extend/mcp#supported-mcp-features",
    );
    result.skillExecution = {
      evidenceBoundary:
        "real local App Server and stdio MCP round-trip; deterministic fixture content, not installed-product skill execution",
      orderedCalls: serverToolCalls,
      resultTitle: "Model Context Protocol",
      resultUrl: serverToolCalls[1].arguments.url,
      toolStatuses: completedItems.map(({ item }) => item.status),
    };
  } else if (mode === "remote" || mode === "oauth") {
    assert.ok(remoteMethods.includes("initialize"), "Remote MCP must receive initialize.");
    assert.ok(remoteMethods.includes("tools/list"), "Remote MCP must receive tools/list.");
    assert.equal(
      remoteMethods.filter((method) => method === "tools/call").length,
      1,
      "Remote MCP must receive exactly one tools/call request.",
    );
    result.transport = {
      kind: mode === "oauth" ? "streamable-http-oauth" : "streamable-http",
      methods: [...remoteMethods],
      url: remoteUrl,
    };
  } else {
    for (const expectedTool of toolDefinitions.map(({ name }) => name)) {
      const completed = completedItems.find(({ item }) => item.tool === expectedTool);
      assert.ok(completed, `A completed ${expectedTool} item must be observed.`);
      assert.equal(completed.item.status, "completed");
      assert.equal(completed.item.server, "ui_kit_echo");
      assert.equal(
        completed.item.result?.content?.[0]?.text,
        expectedResults[expectedTool],
      );
    }
  }
  const displayedItems = mode === "cancel" ? [] : completedItems;
  const lastEvidence = (completedItems.at(-1) ?? startedItems.at(-1));
  threadId = lastEvidence.threadId;
  result.completedItems = completedItems.map(({ item }) => ({
    id: item.id,
    result: item.result,
    status: item.status,
    tool: item.tool,
  }));
  if (mode === "cancel") {
    result.startedItems = startedItems.map(({ item }) => ({
      id: item.id,
      status: item.status,
      tool: item.tool,
    }));
  }
  const item = lastEvidence.item;

  if (mode === "cancel") {
    await page.waitForSelector('.demo-root[data-status="interrupted"]', { state: "attached", timeout: 30_000 });
  } else {
    await page.getByText(/Worked for/).first().waitFor({ state: "visible", timeout: 60_000 });
    if (mode === "multi") {
      await page.getByText(/Worked for/).nth(1).waitFor({ state: "visible", timeout: 60_000 });
    }
    const turnSummaries = page.getByText(/Worked for/);
    for (let index = 0; index < await turnSummaries.count(); index += 1) {
      await turnSummaries.nth(index).click();
    }
    const mcpDisclosures = page.locator(
      ".codex-ui-mcp-tool-call-group details.codex-ui-activity__disclosure",
    );
    for (let index = 0; index < await mcpDisclosures.count(); index += 1) {
      const disclosure = mcpDisclosures.nth(index);
      if ((await disclosure.getAttribute("open")) === null) {
        await disclosure.locator("summary").first().click();
      }
    }
  }
  const cards = [];
  for (const { item: completedItem } of displayedItems) {
    const card = page.locator(`[data-item-id="${completedItem.id}"]`);
    await page.waitForTimeout(250);
    await card.waitFor({ state: "attached", timeout: 15_000 });
    const cardSummary = card.locator("summary");
    if (await cardSummary.count()) {
      await cardSummary.click();
    }
    const cardButtons = card.getByRole("button");
    if (await cardButtons.count()) {
      await cardButtons.first().click();
    } else {
      await card.click({ force: true });
    }
    await card.waitFor({ state: "visible", timeout: 15_000 });
    const cardContract = await card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        height: rect.height,
        lineHeight: style.lineHeight,
        padding: style.padding,
        text: element.textContent?.replace(/\s+/g, " ").trim(),
        width: rect.width,
      };
    });
    assert.ok(cardContract.width > 0 && cardContract.height > 0);
    cards.push({ card: cardContract, tool: completedItem.tool });
    const dialogs = page.getByRole("dialog");
    if (await dialogs.count()) {
      const dialog = dialogs.last();
      const closeDialog = dialog.getByRole("button", { name: "Close dialog" });
      if (await closeDialog.count()) {
        await closeDialog.click();
        await dialog.waitFor({ state: "hidden" });
      }
    }
  }
  result.cards = cards;
  let compactGroup = null;
  if (mode === "skill") {
    const groups = page.locator(".codex-ui-mcp-tool-call-group");
    assert.equal(
      await groups.count(),
      1,
      "The transcript must render one server activity group containing both search and fetch.",
    );
    result.mcpGroups = await groups.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          height: rect.height,
          lineHeight: style.lineHeight,
          width: rect.width,
        };
      }),
    );
    assert.ok(result.mcpGroups.every(({ height, width }) => width > 0 && height > 0));
    await page.waitForTimeout(250);
    const group = groups.first();
    const firstPixels = await group.screenshot();
    const repeatedPixels = await group.screenshot();
    const firstPng = PNG.sync.read(firstPixels);
    const secondPng = PNG.sync.read(repeatedPixels);
    assert.equal(firstPng.width, secondPng.width);
    assert.equal(firstPng.height, secondPng.height);
    const pixelDiff = pixelmatch(
      firstPng.data,
      secondPng.data,
      null,
      firstPng.width,
      firstPng.height,
      { threshold: 0 },
    );
    assert.equal(pixelDiff, 0, "The MCP activity group must be pixel-stable across repeated captures.");
    result.pixelGate = {
      comparison: "same rendered MCP group captured twice within one App Server run",
      diffPixels: pixelDiff,
      note: "determinism only; not a pixel comparison against the installed Codex product",
    };
    result.mcpGroupWideScreenshot = join(directory, "mcp-skill-try-now-group-wide.png");
    await writeFile(result.mcpGroupWideScreenshot, firstPixels);
  }
  result.wideScreenshot = join(directory, "mcp-tool-call-wide.png");
  await page.screenshot({ path: result.wideScreenshot });

  if (mode === "skill") {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(720, 680);
    });
  } else {
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setContentSize(720, 820);
    });
  }
  await page.waitForFunction(
    (expectedHeight) => innerWidth === 720 && (!expectedHeight || innerHeight === expectedHeight),
    mode === "skill" ? 680 : null,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
    false,
    "Live MCP tool-call UI must not overflow at 720px.",
  );
  result.compactScreenshot = join(directory, "mcp-tool-call-compact.png");
  const compactCard = page.locator(`[data-item-id="${item.id}"]`);
  result.compactCard =
    mode === "cancel"
      ? null
      : await compactCard.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { height: rect.height, width: rect.width };
        });
  if (mode === "skill") {
    const compactGroups = page.locator(".codex-ui-mcp-tool-call-group");
    compactGroup = await compactGroups.first().evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        height: rect.height,
        lineHeight: style.lineHeight,
        width: rect.width,
      };
    });
    assert.ok(compactGroup.width > 0 && compactGroup.height > 0);
    await page.waitForTimeout(250);
    const compactPixels = await compactGroups.first().screenshot();
    const repeatedCompactPixels = await compactGroups.first().screenshot();
    const compactPng = PNG.sync.read(compactPixels);
    const repeatedCompactPng = PNG.sync.read(repeatedCompactPixels);
    const compactDiff = pixelmatch(
      compactPng.data,
      repeatedCompactPng.data,
      null,
      compactPng.width,
      compactPng.height,
      { threshold: 0 },
    );
    assert.equal(compactDiff, 0, "The compact MCP activity group must be pixel-stable.");
    result.compactMcpGroup = compactGroup;
    result.pixelGate.compactDiffPixels = compactDiff;
    result.mcpGroupCompactScreenshot = join(directory, "mcp-skill-try-now-group-compact.png");
    await writeFile(result.mcpGroupCompactScreenshot, compactPixels);
  }
  await page.screenshot({ path: result.compactScreenshot });
  result.passed = true;
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  await writeFile(join(directory, "events.json"), JSON.stringify(evidence, null, 2));
  await page.evaluate(() => window.codexDemo?.closeLive()).catch(() => undefined);
  await app.close();
  if (remoteServer) {
    remoteServer.closeAllConnections?.();
    await new Promise((resolve) => remoteServer.close(resolve));
  }
  if (threadId) {
    const client = new CodexAppServerClient({
      capabilities: { experimentalApi: true },
      protocolValidation: "strict",
    });
    try {
      await client.connect();
      await client.threadArchive({ threadId });
      result.archived = true;
    } catch (error) {
      if (String(error).includes("no rollout found for thread id")) {
        result.archiveSkipped = "ephemeral rollout already closed";
      } else {
        result.cleanupError = String(error);
        process.exitCode = 1;
      }
    } finally {
      await client.close();
    }
  }
  try {
    const authMetadata = await lstat(ephemeralAuthPath);
    if (authMetadata.isSymbolicLink()) await unlink(ephemeralAuthPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      result.cleanupError = String(error);
      process.exitCode = 1;
    }
  }
  result.serverLogPath = serverLogPath;
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
