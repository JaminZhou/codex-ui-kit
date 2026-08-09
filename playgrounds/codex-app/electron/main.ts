import {
  CodexAppServerClient,
  type CodexThread,
  type CodexTurn,
  type JsonRpcNotification,
} from "@jaminzhou/codex-app-server-client";
import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LiveApprovalGate } from "./live-approval-gate.js";
import { LiveTurnStartGate } from "./live-turn-start-gate.js";
import {
  isAllowedExternalUrl,
  isTrustedRendererUrl,
} from "./navigation-policy.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rendererDirectory = join(currentDirectory, "..", "dist");
const rendererEntryPath = join(rendererDirectory, "index.html");
const preloadPath = join(currentDirectory, "preload.cjs");
const workspaceDirectory =
  process.env.CODEX_UI_KIT_WORKSPACE ?? resolve(currentDirectory, "../../..");
const cdpPort = process.env.CODEX_DEMO_CDP_PORT;

if (cdpPort) app.commandLine.appendSwitch("remote-debugging-port", cdpPort);
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

let mainWindow: BrowserWindow | null = null;
let client: CodexAppServerClient | null = null;
let liveThread: CodexThread | null = null;
let activeTurn: CodexTurn | null = null;
let unsubscribeNotifications: (() => void) | null = null;
let unsubscribeServerRequests: (() => void)[] = [];
const liveTurnStartGate = new LiveTurnStartGate();
const liveApprovalGate = new LiveApprovalGate();

interface StartLiveInput {
  prompt: string;
}

interface ApprovalResponseInput {
  decision: "accept" | "decline";
  requestId: number | string;
}

function assertStartInput(value: unknown): asserts value is StartLiveInput {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as StartLiveInput).prompt !== "string" ||
    !(value as StartLiveInput).prompt.trim()
  ) {
    throw new TypeError("A non-empty prompt is required.");
  }
}

function assertApprovalResponseInput(
  value: unknown,
): asserts value is ApprovalResponseInput {
  if (
    typeof value !== "object" ||
    value === null ||
    (typeof (value as ApprovalResponseInput).requestId !== "string" &&
      typeof (value as ApprovalResponseInput).requestId !== "number") ||
    !["accept", "decline"].includes(
      (value as ApprovalResponseInput).decision,
    )
  ) {
    throw new TypeError("A valid approval response is required.");
  }
}

function broadcastNotification(notification: JsonRpcNotification) {
  const window = mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send("demo:notification", notification);
  }
}

function requestRendererApproval(
  method:
    | "item/commandExecution/requestApproval"
    | "item/fileChange/requestApproval",
  params: unknown,
  requestId: number | string,
) {
  const window = mainWindow;
  if (!window || window.isDestroyed()) {
    return Promise.resolve({ decision: "decline" as const });
  }
  window.webContents.send("demo:server-request", {
    id: requestId,
    kind: "request",
    method,
    params,
  });
  return liveApprovalGate.request(requestId);
}

function assertTrustedIpc(event: IpcMainInvokeEvent) {
  const window = mainWindow;
  const frame = event.senderFrame;
  if (
    !window ||
    window.isDestroyed() ||
    event.sender !== window.webContents ||
    !frame ||
    frame !== window.webContents.mainFrame ||
    !isTrustedRendererUrl(frame.url, rendererEntryPath)
  ) {
    throw new Error("Rejected IPC from an untrusted renderer.");
  }
}

function openAllowedExternalUrl(url: string) {
  if (isAllowedExternalUrl(url)) {
    void shell.openExternal(url).catch(() => undefined);
  }
}

async function ensureClient() {
  if (client?.state === "connected") return client;
  liveThread = null;
  if (client) {
    unsubscribeNotifications?.();
    unsubscribeNotifications = null;
    unsubscribeServerRequests.forEach((unsubscribe) => unsubscribe());
    unsubscribeServerRequests = [];
    await client.close().catch(() => undefined);
  }

  client = new CodexAppServerClient({
    clientInfo: {
      name: "codex_ui_kit_app_playground",
      title: "Codex App Playground",
      version: "0.0.0",
    },
    protocolValidation: "strict",
  });
  unsubscribeNotifications = client.onNotification(broadcastNotification);
  unsubscribeServerRequests = [
    client.onServerRequest(
      "item/commandExecution/requestApproval",
      (params, request) =>
        requestRendererApproval(request.method, params, request.id),
    ),
    client.onServerRequest(
      "item/fileChange/requestApproval",
      (params, request) =>
        requestRendererApproval(request.method, params, request.id),
    ),
  ];
  await client.connect();
  return client;
}

async function startLive(
  event: IpcMainInvokeEvent,
  rawInput: unknown,
): Promise<{ threadId: string; turnId: string }> {
  assertTrustedIpc(event);
  assertStartInput(rawInput);
  return liveTurnStartGate.run(() => activeTurn !== null, async () => {
    const connectedClient = await ensureClient();
    const thread =
      liveThread ??
      (await connectedClient.createThread({
        approvalPolicy: "on-request",
        cwd: workspaceDirectory,
        ephemeral: true,
        historyMode: "paginated",
        sandbox: "read-only",
      }));
    liveThread = thread;
    const turn = await thread.startTurn(rawInput.prompt, {
      approvalPolicy: "on-request",
      cwd: workspaceDirectory,
      sandboxPolicy: {
        networkAccess: false,
        type: "readOnly",
      },
    });
    activeTurn = turn;
    void turn
      .result()
      .catch(() => undefined)
      .finally(() => {
        if (activeTurn === turn) activeTurn = null;
      });
    return { threadId: thread.id, turnId: turn.id };
  });
}

async function stopLive() {
  if (!activeTurn) return;
  liveApprovalGate.declineAll();
  await activeTurn.interrupt();
}

async function handleStopLive(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  await stopLive();
}

async function handleApprovalResponse(
  event: IpcMainInvokeEvent,
  rawInput: unknown,
) {
  assertTrustedIpc(event);
  assertApprovalResponseInput(rawInput);
  if (
    !liveApprovalGate.resolve(rawInput.requestId, rawInput.decision)
  ) {
    throw new Error("The approval request is no longer pending.");
  }
}

async function closeLive() {
  activeTurn = null;
  liveThread = null;
  unsubscribeNotifications?.();
  unsubscribeNotifications = null;
  unsubscribeServerRequests.forEach((unsubscribe) => unsubscribe());
  unsubscribeServerRequests = [];
  liveApprovalGate.declineAll();
  const closingClient = client;
  client = null;
  await closingClient?.close();
}

async function handleCloseLive(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  await closeLive();
}

function createWindow() {
  const scenario = process.env.CODEX_DEMO_SCENARIO ?? "streaming-recovery";
  const frame = process.env.CODEX_DEMO_FRAME ?? "recovered";
  const capture = process.env.CODEX_DEMO_CAPTURE ?? "0";
  const currentSidebar = process.env.CODEX_DEMO_CURRENT_SIDEBAR ?? "0";
  const layout = process.env.CODEX_DEMO_LAYOUT ?? "";
  const requestedTheme = process.env.CODEX_DEMO_THEME;
  const theme = ["system", "light", "dark"].includes(requestedTheme ?? "")
    ? requestedTheme!
    : "dark";
  const view = process.env.CODEX_DEMO_VIEW ?? "conversation";
  const shellState = process.env.CODEX_DEMO_SHELL_STATE ?? "ready";
  const requestedWidth = Number(process.env.CODEX_DEMO_WINDOW_WIDTH);
  const requestedHeight = Number(process.env.CODEX_DEMO_WINDOW_HEIGHT);
  const width =
    Number.isInteger(requestedWidth) && requestedWidth > 0
      ? requestedWidth
      : 1180;
  const height =
    Number.isInteger(requestedHeight) && requestedHeight > 0
      ? requestedHeight
      : 820;
  const query = new URLSearchParams({
    capture,
    currentSidebar,
    frame,
    layout,
    scenario,
    shellState,
    theme,
    view,
  }).toString();

  const window = new BrowserWindow({
    backgroundColor: theme === "light" ? "#ffffff" : "#101010",
    height,
    minHeight: Math.min(640, height),
    minWidth: Math.min(720, width),
    show: process.env.CODEX_DEMO_HEADLESS !== "1",
    title: "Codex App Playground",
    titleBarStyle: "hiddenInset",
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
      sandbox: true,
    },
    width,
  });
  mainWindow = window;

  window.webContents.setWindowOpenHandler(({ url }) => {
    openAllowedExternalUrl(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (isTrustedRendererUrl(url, rendererEntryPath)) return;
    event.preventDefault();
    openAllowedExternalUrl(url);
  });
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
    void closeLive().catch(() => undefined);
  });
  void window.loadFile(rendererEntryPath, {
    query: Object.fromEntries(new URLSearchParams(query)),
  });
}

ipcMain.handle("demo:live:start", startLive);
ipcMain.handle("demo:live:stop", handleStopLive);
ipcMain.handle("demo:live:close", handleCloseLive);
ipcMain.handle("demo:approval:respond", handleApprovalResponse);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  void closeLive();
});
