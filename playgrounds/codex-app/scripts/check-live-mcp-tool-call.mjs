import assert from "node:assert/strict";
import { access, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createServer } from "node:http";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const mode = process.env.CODEX_UI_KIT_LIVE_MCP_TOOL_CALL_MODE ?? "single";
assert.ok(
  ["single", "multi", "retry", "timeout", "approval-denied", "remote"].includes(mode),
  "CODEX_UI_KIT_LIVE_MCP_TOOL_CALL_MODE must be single, multi, retry, timeout, approval-denied, or remote.",
);
const toolDefinitions = [
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
const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
const sourceAuthPath = join(sourceCodexHome, "auth.json");
const fallbackAuthPath = join(homedir(), ".codex", "auth.json");
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
await symlink(authPath, join(directory, "auth.json"));

if (mode === "remote") {
  remoteServer = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/mcp") {
      response.writeHead(405, { Allow: "POST" });
      response.end();
      return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON" }, id: null }));
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
      response.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "ui-kit-remote-session" });
      response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} }));
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
      const text =
        tool === "ui_kit_upper"
          ? "MCP_TOOL_CALL_UPPER:" + argument.toUpperCase()
          : "MCP_TOOL_CALL_OK:" + argument;
      result = { content: [{ text, type: "text" }], isError: false };
    } else if (message.method === "resources/list") {
      result = { resources: [] };
    } else if (message.method === "resources/templates/list") {
      result = { resourceTemplates: [] };
    } else {
      response.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "ui-kit-remote-session" });
      response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Unsupported MCP method: ${message.method}` } }));
      return;
    }
    const payload = { jsonrpc: "2.0", id: message.id, result };
    await writeFile(serverLogPath, `OUT ${JSON.stringify(payload)}\n`, { flag: "a" });
    response.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "ui-kit-remote-session" });
    response.end(JSON.stringify(payload));
  });
  await new Promise((resolve, reject) => {
    remoteServer.once("error", reject);
    remoteServer.listen(0, "127.0.0.1", resolve);
  });
  const address = remoteServer.address();
  assert.ok(address && typeof address === "object", "The loopback MCP HTTP server must listen.");
  remoteUrl = `http://127.0.0.1:${address.port}/mcp`;
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
      serverInfo: { name: "ui-kit-echo", version: "1.0.0" },
    });
  } else if (message.method === "tools/list") {
    reply(message.id, { tools: ${toolListSource} });
  } else if (message.method === "tools/call") {
    callCount += 1;
    const tool = String(message.params?.name ?? "");
    const argument = String(message.params?.arguments?.message ?? "");
    if (${JSON.stringify(mode === "timeout")}) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
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
  mode === "remote"
    ? `[mcp_servers.ui_kit_echo]\nurl = "${remoteUrl}"\nstartup_timeout_sec = 10\ntool_timeout_sec = 30\n`
    : `[mcp_servers.ui_kit_echo]\ncommand = "node"\nargs = ["${serverPath}"]\nstartup_timeout_sec = 10\ntool_timeout_sec = ${mode === "timeout" ? 1 : 30}\n`,
);
process.env.CODEX_HOME = directory;

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for Live MCP mode.");
const { app, page } = await launchScene(scene, {
  capture: false,
  environment: {
    CODEX_UI_KIT_LIVE_EPHEMERAL: "1",
    CODEX_UI_KIT_LIVE_HISTORY_PATH: historyPath,
    CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0",
    CODEX_UI_KIT_WORKSPACE: directory,
  },
});

const evidence = [];
const result = {
  directory,
  liveAppServer: true,
  mode,
  mcpServerStatus: null,
  mcpServer: "ui_kit_echo",
  modelTurns: 1,
  passed: false,
  tool: "ui_kit_echo",
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
    const statusResponse = await statusClient.call("mcpServerStatus/list", {
      detail: "full",
    });
    const server = statusResponse.data?.find(
      (candidate) => candidate?.name === "ui_kit_echo",
    );
    assert.ok(server, "The live MCP status list must include ui_kit_echo.");
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

  await page.getByRole("button", { name: "Live local", exact: true }).click();
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
  const expectedCallCount = mode === "multi" || mode === "retry" ? 2 : 1;
  await composer.fill(
    mode === "multi"
      ? 'Use exactly two MCP tools now, one after the other. First call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". Then call the tool named ui_kit_upper on the same MCP server with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving both tool results, reply exactly MCP_TOOL_CALL_OK and MCP_TOOL_CALL_UPPER:PIXEL-CHECK.'
      : mode === "retry"
        ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". If the tool returns MCP_TOOL_CALL_RETRYABLE_ERROR, retry the same tool exactly once with the same argument. Do not use shell, files, network, browser, search, or any other tool. After the retry succeeds, reply exactly MCP_TOOL_CALL_OK:pixel-check.'
      : mode === "timeout"
          ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". The MCP server intentionally exceeds its one-second tool timeout. Do not retry. After the timeout failure, reply exactly MCP_TOOL_CALL_TIMEOUT. Do not use shell, files, network, browser, search, or any other tool.'
        : mode === "approval-denied"
          ? 'Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". If the MCP approval request is denied, do not retry. After the denial failure, reply exactly MCP_TOOL_CALL_APPROVAL_DENIED. Do not use shell, files, network, browser, search, or any other tool.'
        : 'Use exactly one MCP tool now. Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_TOOL_CALL_OK.',
  );
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

  const events = await page.evaluate(() => window.__liveMcpEvidence);
  evidence.push(...events);
  const completedItems = events
    .filter(
      (event) =>
        event.method === "item/completed" &&
        event.params?.item?.type === "mcpToolCall",
    )
    .map((event) => ({ item: event.params.item, threadId: event.params.threadId }));
  assert.equal(
    completedItems.length,
    expectedCallCount,
    `Expected exactly ${expectedCallCount} completed MCP tool-call items.`,
  );
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
  } else if (mode === "remote") {
    assert.ok(remoteMethods.includes("initialize"), "Remote MCP must receive initialize.");
    assert.ok(remoteMethods.includes("tools/list"), "Remote MCP must receive tools/list.");
    assert.equal(
      remoteMethods.filter((method) => method === "tools/call").length,
      1,
      "Remote MCP must receive exactly one tools/call request.",
    );
    result.transport = {
      kind: "streamable-http",
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
  const lastCompleted = completedItems.at(-1);
  threadId = lastCompleted.threadId;
  result.completedItems = completedItems.map(({ item }) => ({
    id: item.id,
    result: item.result,
    status: item.status,
    tool: item.tool,
  }));
  const item = lastCompleted.item;

  await page.getByText(/Worked for/).first().waitFor({ state: "visible", timeout: 60_000 });
  await page.getByText(/Worked for/).first().click();
  await page
    .getByText(
      mode === "timeout" || mode === "approval-denied"
        ? "ui_kit_echo integration failed"
        : "Used ui_kit_echo integration",
      { exact: true },
    )
    .click();
  const cards = [];
  for (const { item: completedItem } of completedItems) {
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
        fontFamily: style.fontFamily,
        height: rect.height,
        text: element.textContent?.replace(/\\s+/g, " ").trim(),
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
  result.wideScreenshot = join(directory, "mcp-tool-call-wide.png");
  await page.screenshot({ path: result.wideScreenshot });

  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].setContentSize(720, 820);
  });
  await page.waitForFunction(() => innerWidth === 720);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
    false,
    "Live MCP tool-call UI must not overflow at 720px.",
  );
  result.compactScreenshot = join(directory, "mcp-tool-call-compact.png");
  const compactCard = page.locator(`[data-item-id="${item.id}"]`);
  result.compactCard = await compactCard.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
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
  result.serverLogPath = serverLogPath;
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
