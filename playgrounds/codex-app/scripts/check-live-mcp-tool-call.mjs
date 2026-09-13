import assert from "node:assert/strict";
import { access, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-mcp-tool-call-"));
const serverPath = join(directory, "server.mjs");
const serverLogPath = join(directory, "server.log");
const historyPath = join(directory, "history.json");
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
    reply(message.id, {
      tools: [{
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
      }],
    });
  } else if (message.method === "tools/call") {
    reply(message.id, {
      content: [{
        text: "MCP_TOOL_CALL_OK:" + String(message.params?.arguments?.message ?? ""),
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
  `[mcp_servers.ui_kit_echo]\ncommand = "node"\nargs = ["${serverPath}"]\nstartup_timeout_sec = 10\ntool_timeout_sec = 30\n`,
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
  mcpServer: "ui_kit_echo",
  modelTurns: 1,
  passed: false,
  tool: "ui_kit_echo",
};
let threadId = null;

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
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
          action: "accept",
          content: {},
          requestId: event.id,
          threadId: event.params.threadId,
        });
      }
    });
  });

  const composer = page.getByRole("textbox", {
    name: "Message composer",
    exact: true,
  });
  await composer.fill(
    'Use exactly one MCP tool now. Call the tool named ui_kit_echo on the MCP server ui_kit_echo with the argument message set to "pixel-check". Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_TOOL_CALL_OK.',
  );
  await composer.press("Enter");
  await page.waitForFunction(
    () =>
      window.__liveMcpEvidence?.some(
        (event) =>
          event.method === "item/completed" &&
          event.params?.item?.type === "mcpToolCall",
      ),
    undefined,
    { timeout: 180_000 },
  );

  const events = await page.evaluate(() => window.__liveMcpEvidence);
  evidence.push(...events);
  const completed = events.findLast(
    (event) =>
      event.method === "item/completed" &&
      event.params?.item?.type === "mcpToolCall",
  );
  const item = completed?.params?.item;
  assert.ok(item, "A completed MCP tool-call item must be observed.");
  assert.equal(item.status, "completed");
  assert.equal(item.server, "ui_kit_echo");
  assert.equal(item.tool, "ui_kit_echo");
  assert.equal(item.result?.content?.[0]?.text, "MCP_TOOL_CALL_OK:pixel-check");
  threadId = completed.params.threadId;
  result.completedItem = {
    id: item.id,
    result: item.result,
    status: item.status,
  };

  await page.getByText(/Worked for/).first().waitFor({ state: "visible", timeout: 60_000 });
  await page.getByText(/Worked for/).first().click();
  await page.getByText("Used ui_kit_echo integration", { exact: true }).click();
  const card = page.locator(`[data-item-id="${item.id}"]`);
  await page.waitForTimeout(500);
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
  result.card = cardContract;
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
  result.compactCard = await card.evaluate((element) => {
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
