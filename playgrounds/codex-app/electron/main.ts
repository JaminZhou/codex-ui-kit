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
const liveTurnStartGate = new LiveTurnStartGate();

interface StartLiveInput {
  prompt: string;
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

function broadcastNotification(notification: JsonRpcNotification) {
  const window = mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send("demo:notification", notification);
  }
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
        approvalPolicy: "never",
        cwd: workspaceDirectory,
        ephemeral: true,
        historyMode: "paginated",
        sandbox: "read-only",
      }));
    liveThread = thread;
    const turn = await thread.startTurn(rawInput.prompt, {
      approvalPolicy: "never",
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
  await activeTurn.interrupt();
}

async function handleStopLive(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  await stopLive();
}

async function closeLive() {
  activeTurn = null;
  liveThread = null;
  unsubscribeNotifications?.();
  unsubscribeNotifications = null;
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
  const query = new URLSearchParams({ capture, frame, scenario }).toString();

  const window = new BrowserWindow({
    backgroundColor: "#101010",
    height: 820,
    minHeight: 640,
    minWidth: 760,
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
    width: 1180,
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
