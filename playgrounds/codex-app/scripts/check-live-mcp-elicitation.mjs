import assert from "node:assert/strict";
import { access, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-mcp-elicitation-"));
const serverPath = join(directory, "server.mjs");
const serverLogPath = join(directory, "server.log");
const historyPath = join(directory, "history.json");
const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
const authCandidates = [
  join(sourceCodexHome, "auth.json"),
  join(homedir(), ".codex", "auth.json"),
];
let authPath = null;
for (const candidate of authCandidates) {
  try {
    await access(candidate, constants.R_OK);
    authPath = candidate;
    break;
  } catch {
    // The assertion below gives a precise signed-in-runtime failure.
  }
}
assert.ok(
  authPath,
  "A signed-in Codex App Server runtime is required for the live MCP elicitation gate (auth.json was not found).",
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
const pending = new Map();
const input = readline.createInterface({ input: process.stdin });

async function handle(message) {
  if (message.method === "initialize") {
    reply(message.id, {
      capabilities: { tools: {} },
      protocolVersion: "2024-11-05",
      serverInfo: { name: "ui-kit-elicitation", version: "1.0.0" },
    });
    return;
  }
  if (message.method === "tools/list") {
    reply(message.id, {
      tools: [{
        description: "Use this tool when the user explicitly asks for project details.",
        inputSchema: { properties: {}, type: "object" },
        name: "ui_kit_elicit",
      }],
    });
    return;
  }
  if (message.method === "resources/list") {
    reply(message.id, { resources: [] });
    return;
  }
  if (message.method === "resources/templates/list") {
    reply(message.id, { resourceTemplates: [] });
    return;
  }
  if (message.method !== "tools/call") return;

  const requestId = 901;
  const elicitation = new Promise((resolve) => {
    pending.set(String(requestId), resolve);
  });
  const request = {
    jsonrpc: "2.0",
    id: requestId,
    method: "elicitation/create",
    params: {
      message: "Choose the project details that the MCP server should use.",
      mode: "form",
      requestedSchema: {
        properties: {
          name: { title: "Name", type: "string" },
          project: { enum: ["codex-ui-kit", "codex-app"], title: "Project", type: "string" },
        },
        required: ["project", "name"],
        type: "object",
      },
    },
  };
  log("OUT " + JSON.stringify(request));
  process.stdout.write(JSON.stringify(request) + "\\n");
  const response = await elicitation;
  const accepted = response?.result?.action === "accept";
  const content = response?.result?.content;
  reply(message.id, {
    content: [{
      text: accepted
        ? "MCP_ELICITATION_OK:" + JSON.stringify(content)
        : "MCP_ELICITATION_DECLINED",
      type: "text",
    }],
    isError: !accepted,
  });
}

input.on("line", (line) => {
  log("IN " + line);
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.id !== undefined && pending.has(String(message.id))) {
    const resolvePending = pending.get(String(message.id));
    pending.delete(String(message.id));
    resolvePending(message);
    return;
  }
  void handle(message);
});
`;
await writeFile(serverPath, serverSource);
await writeFile(
  join(directory, "config.toml"),
  `[mcp_servers.ui_kit_elicit]\ncommand = "node"\nargs = ["${serverPath}"]\nstartup_timeout_sec = 10\ntool_timeout_sec = 30\n`,
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
  mcpServer: "ui_kit_elicit",
  modelTurns: 1,
  passed: false,
  tool: "ui_kit_elicit",
};
let threadId = null;

try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__liveMcpElicitationEvidence = [];
    window.codexDemo.onNotification((event) => {
      window.__liveMcpElicitationEvidence.push(event);
    });
    window.codexDemo.onServerRequest((event) => {
      window.__liveMcpElicitationEvidence.push(event);
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
    'Use exactly one MCP tool now. Call ui_kit_elicit on the ui_kit_elicit MCP server. Do not use shell, files, network, browser, search, or any other tool. After receiving the tool result, reply exactly MCP_ELICITATION_OK.',
  );
  await composer.press("Enter");

  const form = page.getByRole("form", { name: "MCP server request" });
  await form.waitFor({ state: "visible", timeout: 180_000 });
  assert.equal(
    await form.getByRole("button", { name: "Accept", exact: true }).isEnabled(),
    false,
  );
  assert.equal(
    await form.getByText("Choose the project details that the MCP server should use.", { exact: true }).count(),
    1,
  );
  const select = form.locator("select").first();
  await select.selectOption("codex-ui-kit");
  await form.locator("input[type=text]").first().fill("Jamin");
  assert.equal(
    await form.getByRole("button", { name: "Accept", exact: true }).isEnabled(),
    true,
  );
  const formStyles = await form.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { fontFamily: style.fontFamily, height: rect.height, width: rect.width };
  });
  result.form = formStyles;
  result.wideScreenshot = join(directory, "mcp-elicitation-wide.png");
  await page.screenshot({ path: result.wideScreenshot });
  await form.getByRole("button", { name: "Accept", exact: true }).click();
  await form.waitFor({ state: "detached", timeout: 30_000 });

  await page.waitForFunction(
    () =>
      window.__liveMcpElicitationEvidence?.some(
        (event) =>
          event.method === "item/completed" &&
          event.params?.item?.type === "mcpToolCall",
      ),
    undefined,
    { timeout: 180_000 },
  );
  const events = await page.evaluate(() => window.__liveMcpElicitationEvidence);
  evidence.push(...events);
  const completed = events.findLast(
    (event) =>
      event.method === "item/completed" &&
      event.params?.item?.type === "mcpToolCall",
  );
  const item = completed?.params?.item;
  assert.ok(item, "A completed MCP elicitation tool-call item must be observed.");
  assert.equal(item.status, "completed");
  assert.equal(item.server, "ui_kit_elicit");
  assert.equal(item.tool, "ui_kit_elicit");
  assert.match(item.result?.content?.[0]?.text ?? "", /^MCP_ELICITATION_OK:/);
  threadId = completed.params.threadId;
  result.completedItem = {
    id: item.id,
    result: item.result,
    status: item.status,
  };

  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].setContentSize(720, 820);
  });
  await page.waitForFunction(() => innerWidth === 720);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
    false,
    "Live MCP elicitation UI must not overflow at 720px.",
  );
  result.compactViewport = await page.evaluate(() => ({ height: innerHeight, width: innerWidth }));
  result.compactScreenshot = join(directory, "mcp-elicitation-compact.png");
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
