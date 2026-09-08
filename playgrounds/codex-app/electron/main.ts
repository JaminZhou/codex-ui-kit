import {
  CodexAppServerClient,
  CodexThread,
  type CodexTurn,
  type JsonRpcNotification,
} from "@jaminzhou/codex-app-server-client";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
  type IpcMainInvokeEvent,
} from "electron";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachmentDialogModeForPlatform,
  attachmentPathLabel,
  attachmentDialogProperties,
  type AttachmentDialogKind,
} from "./attachment-dialog.js";
import { LiveApprovalGate } from "./live-approval-gate.js";
import { LiveUserInputGate, type LiveInputRequest } from "./live-user-input.js";
import { liveCollaborationMode, resolveLiveMode } from "./live-collaboration.js";
import { LiveThreadRegistry } from "./live-thread-registry.js";
import { commitGitPreview, readGitCommitPreview } from "./git-commit-preview.js";
import { LiveTurnStartGate } from "./live-turn-start-gate.js";
import { LiveProjectSession, resolveLiveProject } from "./live-project-session.js";
import { liveWorkspacePolicy } from "./live-workspace-policy.js";
import { LiveTerminalManager } from "./live-terminal.js";
import {
  checkoutGitBranch,
  createAndCheckoutGitBranch,
  GitBranchCreationError,
  listGitBranches,
} from "./git-branch.js";
import { GitBranchOperationQueue } from "./git-branch-operation-queue.js";
import {
  isAllowedExternalUrl,
  isTrustedRendererUrl,
} from "./navigation-policy.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rendererDirectory = join(currentDirectory, "..", "dist");
const rendererEntryPath = join(rendererDirectory, "index.html");
const preloadPath = join(currentDirectory, "preload.cjs");
const workspaceDirectory = resolve(
  process.env.CODEX_UI_KIT_WORKSPACE ?? resolve(currentDirectory, "../../.."),
);
const liveWriteOptIn = process.env.CODEX_UI_KIT_LIVE_WORKSPACE_WRITE;
process.env.CODEX_DEMO_WORKSPACE_PROJECT_PATH = workspaceDirectory;
const startupWorkspaceProjectToken = "startup-workspace";
const trustedProjectDirectories = new Map<string, string>([
  [startupWorkspaceProjectToken, workspaceDirectory],
]);
const trustedProjectTokensByDirectory = new Map<string, string>([
  [resolve(workspaceDirectory), startupWorkspaceProjectToken],
]);
const cdpPort = process.env.CODEX_DEMO_CDP_PORT;
const requestedNativeThemeSource = process.env.CODEX_DEMO_NATIVE_THEME_SOURCE;
const requestedGitBranchDelayMs = Number(
  process.env.CODEX_DEMO_GIT_BRANCH_DELAY_MS ?? "0",
);
const requestedGitBranchListDelayMs = Number(
  process.env.CODEX_DEMO_GIT_BRANCH_LIST_DELAY_MS ?? "0",
);
const requestedGitBranchListResponseDelayMs = Number(
  process.env.CODEX_DEMO_GIT_BRANCH_LIST_RESPONSE_DELAY_MS ?? "0",
);

if (["system", "light", "dark"].includes(requestedNativeThemeSource ?? "")) {
  nativeTheme.themeSource = requestedNativeThemeSource as
    | "system"
    | "light"
    | "dark";
}

if (cdpPort) app.commandLine.appendSwitch("remote-debugging-port", cdpPort);
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

let mainWindow: BrowserWindow | null = null;
let client: CodexAppServerClient | null = null;
let terminalHost: { client: CodexAppServerClient; manager: LiveTerminalManager; ready: Promise<unknown> } | null = null;
const liveSession = new LiveProjectSession<{
  thread: CodexThread;
  settings: Pick<Awaited<ReturnType<CodexAppServerClient["threadStart"]>>, "model" | "reasoningEffort">;
}>();
let activeTurn: CodexTurn | null = null;
let activeTurnThreadId: string | null = null;
let unsubscribeNotifications: (() => void) | null = null;
let unsubscribeServerRequests: (() => void)[] = [];
let attachmentFixtureFailureInjected = false;
let projectFixtureSelectionIndex = 0;
let gitBranchOperationActive = false;
const gitBranchOperationQueue = new GitBranchOperationQueue();
const liveTurnStartGate = new LiveTurnStartGate();
const liveApprovalGate = new LiveApprovalGate();
const liveInputGate = new LiveUserInputGate();
let liveThreadRegistry: LiveThreadRegistry | null = null;
function historyRegistry() {
  return liveThreadRegistry ??= new LiveThreadRegistry(
    process.env.CODEX_UI_KIT_LIVE_HISTORY_PATH ?? join(app.getPath("userData"), "codex-ui-kit", "live-threads.json"),
  );
}

function resolveHistoryProject(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new TypeError("A selected project is required.");
  const input = raw as { projectToken?: unknown; threadId?: unknown; cursor?: unknown; archived?: unknown };
  const directory = typeof input.projectToken === "string" ? trustedProjectDirectories.get(input.projectToken) : undefined;
  if (!directory) throw new Error("Select a host-owned local project.");
  return { input, directory };
}

interface ApprovalResponseInput {
  decision: "accept" | "acceptForSession" | "decline";
  requestId: number | string;
}

interface AttachmentSelection {
  id: string;
  kind: "file" | "folder";
  label: string;
  meta: string;
}

interface BranchCreationInput {
  branchName: string;
  projectToken: string;
}

interface ProjectTokenInput {
  projectToken: string;
}

type BranchCreationResponse =
  | { branch: string; ok: true }
  | { code: string; message: string; ok: false };

type BranchListResponse =
  | {
      branches: string[];
      branchesCheckedOutElsewhere: string[];
      branchesUnavailableForCheckout: string[];
      currentBranch: string | null;
      ok: true;
      unbornBranch: string | null;
    }
  | { code: string; message: string; ok: false };

function assertApprovalResponseInput(
  value: unknown,
): asserts value is ApprovalResponseInput {
  if (
    typeof value !== "object" ||
    value === null ||
    (typeof (value as ApprovalResponseInput).requestId !== "string" &&
      typeof (value as ApprovalResponseInput).requestId !== "number") ||
    !["accept", "acceptForSession", "decline"].includes(
      (value as ApprovalResponseInput).decision,
    )
  ) {
    throw new TypeError("A valid approval response is required.");
  }
}

function assertBranchCreationInput(
  value: unknown,
): asserts value is BranchCreationInput {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as BranchCreationInput).branchName !== "string" ||
    typeof (value as BranchCreationInput).projectToken !== "string"
  ) {
    throw new TypeError("A branch name is required.");
  }
}

function assertProjectTokenInput(
  value: unknown,
): asserts value is ProjectTokenInput {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as ProjectTokenInput).projectToken !== "string"
  ) {
    throw new TypeError("A project token is required.");
  }
}

function registerTrustedProjectDirectory(path: string) {
  const normalizedPath = resolve(path);
  const existing = trustedProjectTokensByDirectory.get(normalizedPath);
  if (existing) return existing;
  const token = `project:${randomUUID()}`;
  trustedProjectDirectories.set(token, path);
  trustedProjectTokensByDirectory.set(normalizedPath, token);
  return token;
}

async function describeProjectSelection(selection: {
  label: string;
  path: string;
}) {
  const directory = await stat(selection.path).catch(() => null);
  return {
    ...selection,
    projectToken: directory?.isDirectory()
      ? registerTrustedProjectDirectory(selection.path)
      : undefined,
  };
}

function trustedProjectDirectory(projectToken: string) {
  const directory = trustedProjectDirectories.get(projectToken);
  if (!directory) {
    throw new GitBranchCreationError(
      "unavailable",
      "The selected project is unavailable to the host.",
    );
  }
  return directory;
}

async function delayGitBranchOperationForFixture(
  requestedDelayMs = requestedGitBranchDelayMs,
) {
  if (
    !Number.isFinite(requestedDelayMs) ||
    requestedDelayMs <= 0
  ) {
    return;
  }
  await new Promise((resolveDelay) => {
    setTimeout(resolveDelay, Math.min(requestedDelayMs, 5_000));
  });
}

function broadcastNotification(notification: JsonRpcNotification) {
  if (notification.method === "thread/archived" || notification.method === "thread/unarchived") {
    const params = notification.params as { threadId?: unknown } | undefined;
    if (typeof params?.threadId === "string") {
      const threadId = params.threadId;
      void historyRegistry().observeArchived(threadId, notification.method === "thread/archived").then(owned => {
        if (owned) liveSession.removeWhere(session => session.thread.id === threadId);
      }).catch(() => { console.error("Could not persist an owned thread archive notification."); });
    }
  }
  if (notification.method === "turn/completed") {
    const params = notification.params as { threadId?: unknown; turn?: { id?: unknown } } | undefined;
    if (typeof params?.threadId === "string" && typeof params.turn?.id === "string") {
      liveInputGate.clearTurn(params.threadId, params.turn.id);
    }
  }
  if (notification.method === "serverRequest/resolved") {
    const params = notification.params as { requestId?: unknown; threadId?: unknown } | undefined;
    if (params && (typeof params.requestId === "string" || typeof params.requestId === "number") && typeof params.threadId === "string") {
      liveInputGate.cancel(params.requestId, params.threadId);
    }
  }
  const window = mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send("demo:notification", notification);
  }
}

function requestRendererInput(params: LiveInputRequest, requestId: number | string) {
  const window = mainWindow;
  if (!window || window.isDestroyed()) return Promise.resolve({ answers: {} });
  const response = liveInputGate.request(requestId, params);
  window.webContents.send("demo:server-request", {
    id: requestId, kind: "request", method: "item/tool/requestUserInput", params,
  });
  return response;
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
  liveInputGate.clear();
  liveSession.clear();
  mainWindow?.webContents.send("demo:live:session", { kind: "live-reset" });
  if (client) {
    unsubscribeNotifications?.();
    unsubscribeNotifications = null;
    unsubscribeServerRequests.forEach((unsubscribe) => unsubscribe());
    unsubscribeServerRequests = [];
    await client.close().catch(() => undefined);
  }

  client = new CodexAppServerClient({
    capabilities: { experimentalApi: true },
    clientInfo: {
      name: "codex_ui_kit_app_playground",
      title: "Codex App Playground",
      version: "0.0.0",
    },
    protocolValidation: "strict",
  });
  unsubscribeNotifications = client.onNotification(broadcastNotification);
  unsubscribeServerRequests = [
    client.onServerRequest("item/tool/requestUserInput", (params, request) =>
      requestRendererInput({ ...params, isBlocking: params.isBlocking ?? true }, request.id)),
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
  const { directory, prompt } = resolveLiveProject(rawInput, trustedProjectDirectories);
  const collaborationMode = resolveLiveMode((rawInput as { collaborationMode?: unknown }).collaborationMode);
  const requestedThreadId = (rawInput as { threadId?: unknown }).threadId;
  if (requestedThreadId !== undefined && requestedThreadId !== null && typeof requestedThreadId !== "string") {
    throw new TypeError("Invalid live thread selection.");
  }
  const policy = liveWorkspacePolicy(directory, liveWriteOptIn);
  return liveTurnStartGate.run(() => activeTurn !== null, async () => {
    const connectedClient = await ensureClient();
    const registry = historyRegistry();
    const session = await liveSession.replace(directory, async () => {
      // Validate persisted ownership before opening or resuming any server thread.
      const owned = typeof requestedThreadId === "string" ? await registry.require(directory, requestedThreadId) : undefined;
      const create = async () => {
        const response = await connectedClient.threadStart({
          approvalPolicy: policy.approvalPolicy,
          cwd: directory,
          ephemeral: process.env.CODEX_UI_KIT_LIVE_EPHEMERAL === "1",
          historyMode: "paginated",
          sandbox: policy.sandbox,
        });
        try {
          await registry.remember({ id: response.thread.id, directory, title: prompt.replace(/\s+/g, " ").slice(0, 100), updatedAt: Date.now() });
        } catch (error) {
          await connectedClient.threadArchive({ threadId: response.thread.id }).catch(() => undefined);
          throw error;
        }
        return {
          thread: new CodexThread(connectedClient, response.thread),
          settings: { model: response.model, reasoningEffort: response.reasoningEffort },
        };
      };
      let selected = liveSession.get(directory);
      if (requestedThreadId === null) selected = await create();
      else if (owned && selected?.thread.id !== owned.id) {
        const response = await connectedClient.threadResume({
          threadId: owned.id, cwd: directory, sandbox: policy.sandbox, approvalPolicy: policy.approvalPolicy,
        });
        selected = { thread: new CodexThread(connectedClient, response.thread), settings: { model: response.model, reasoningEffort: response.reasoningEffort } };
      }
      return selected ?? await create();
    });
    const { thread } = session;
    await registry.touch(directory, thread.id, Date.now());
    if (client !== connectedClient || connectedClient.state !== "connected") throw new Error("The live session was closed before the thread started.");
    mainWindow?.webContents.send("demo:live:session", {
      kind: "live-bind",
      projectToken: (rawInput as { projectToken: string }).projectToken,
      threadId: thread.id,
    });
    const turn = await thread.startTurn(prompt, {
      collaborationMode: liveCollaborationMode(collaborationMode, session.settings),
      approvalPolicy: policy.approvalPolicy,
      cwd: directory,
      sandboxPolicy: policy.sandboxPolicy,
    });
    activeTurn = turn;
    activeTurnThreadId = thread.id;
    void turn
      .result()
      .catch(() => undefined)
      .finally(() => {
        if (activeTurn === turn) {
          activeTurn = null;
          activeTurnThreadId = null;
        }
      });
    return { threadId: thread.id, turnId: turn.id };
  });
}

async function stopLive() {
  if (!activeTurn) return;
  liveApprovalGate.declineAll();
  const stoppingThreadId = activeTurnThreadId;
  const stoppingTurnId = activeTurn.id;
  await activeTurn.interrupt();
  if (stoppingThreadId) liveInputGate.clearTurn(stoppingThreadId, stoppingTurnId);
}

async function handleStopLive(event: IpcMainInvokeEvent, rawInput: unknown) {
  assertTrustedIpc(event);
  if (typeof rawInput !== "object" || rawInput === null ||
      typeof (rawInput as { threadId?: unknown }).threadId !== "string") {
    throw new TypeError("A live thread is required to stop a turn.");
  }
  if (activeTurn && (rawInput as { threadId: string }).threadId !== activeTurnThreadId) {
    throw new Error("The active turn belongs to another project.");
  }
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

async function closeTerminals() {
  const closingTerminalHost = terminalHost;
  terminalHost = null;
  closingTerminalHost?.manager.dispose();
  await closingTerminalHost?.client.close();
}

async function closeLive() {
  liveInputGate.clear();
  activeTurn = null;
  activeTurnThreadId = null;
  liveSession.clear();
  mainWindow?.webContents.send("demo:live:session", { kind: "live-reset" });
  unsubscribeNotifications?.();
  unsubscribeNotifications = null;
  unsubscribeServerRequests.forEach((unsubscribe) => unsubscribe());
  unsubscribeServerRequests = [];
  liveApprovalGate.declineAll();
  const closingClient = client;
  client = null;
  await Promise.all([closingClient?.close(), closeTerminals()]);
}

async function ensureTerminalHost() {
  if (!terminalHost) {
    const terminalClient = new CodexAppServerClient({
      clientInfo: { name: "codex_ui_kit_terminal", title: "Codex UI Kit Terminal", version: "0.0.0" },
      protocolValidation: "strict",
    });
    const manager = new LiveTerminalManager({
      execute: input => terminalClient.call("command/exec", input),
      write: (processId, deltaBase64) => terminalClient.call("command/exec/write", { processId, deltaBase64 }),
      terminate: processId => terminalClient.call("command/exec/terminate", { processId }),
      resize: (processId, size) => terminalClient.call("command/exec/resize", { processId, size }),
    }, trustedProjectDirectories, terminalEvent => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("demo:terminal:event", terminalEvent);
    }, liveWriteOptIn);
    terminalClient.onNotification("command/exec/outputDelta", params => manager.output(params));
    terminalHost = { client: terminalClient, manager, ready: terminalClient.connect() };
  }
  const host = terminalHost;
  try {
    await host.ready;
    if (terminalHost !== host) throw new Error("The terminal connection was closed.");
    return host.manager;
  } catch (error) {
    if (terminalHost === host) terminalHost = null;
    host.manager.dispose();
    await host.client.close().catch(() => undefined);
    throw error;
  }
}

async function handleCloseLive(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  await closeLive();
}

function attachmentFixturePaths(): string[] | null {
  const raw = process.env.CODEX_DEMO_ATTACHMENT_FIXTURE_PATHS;
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    parsed.some((path) => typeof path !== "string" || !isAbsolute(path))
  ) {
    throw new TypeError(
      "CODEX_DEMO_ATTACHMENT_FIXTURE_PATHS must be an array of absolute paths.",
    );
  }
  return parsed;
}

async function describeAttachmentPaths(
  paths: readonly string[],
): Promise<AttachmentSelection[]> {
  return Promise.all(
    paths.map(async (path, index) => {
      const stats = await stat(path);
      const kind = stats.isDirectory() ? "folder" : "file";
      const extension = extname(path).slice(1).toUpperCase();
      return {
        id: `native-attachment-${index + 1}`,
        kind,
        label: attachmentPathLabel(path, process.platform),
        meta: kind === "folder" ? "Folder" : extension || "File",
      } satisfies AttachmentSelection;
    }),
  );
}

async function chooseAttachmentDialogKind(): Promise<
  AttachmentDialogKind | null
> {
  if (attachmentDialogModeForPlatform(process.platform) === "mixed") {
    return "mixed";
  }
  const options = {
    buttons: ["Files", "Folders", "Cancel"],
    cancelId: 2,
    defaultId: 0,
    message: "What would you like to attach?",
    noLink: true,
    title: "Files and folders",
    type: "question" as const,
  };
  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options);
  return result.response === 0
    ? "files"
    : result.response === 1
      ? "folders"
      : null;
}

async function handleSelectAttachments(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  const fixturePaths = attachmentFixturePaths();
  if (fixturePaths) {
    if (
      process.env.CODEX_DEMO_ATTACHMENT_FIXTURE_FAIL_ONCE === "1" &&
      !attachmentFixtureFailureInjected
    ) {
      attachmentFixtureFailureInjected = true;
      throw new Error("Simulated attachment fixture failure");
    }
    return describeAttachmentPaths(fixturePaths);
  }
  const kind = await chooseAttachmentDialogKind();
  if (!kind) return [];
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, {
        properties: attachmentDialogProperties(kind),
        title: "Files and folders",
      })
    : await dialog.showOpenDialog({
        properties: attachmentDialogProperties(kind),
        title: "Files and folders",
      });
  if (result.canceled) return [];
  return describeAttachmentPaths(result.filePaths);
}

async function handleSelectProjectDirectory(event: IpcMainInvokeEvent) {
  assertTrustedIpc(event);
  const rememberSelection = async (selection: { label: string; path: string }) => {
    const described = await describeProjectSelection(selection);
    if (described.projectToken) {
      await historyRegistry().rememberProject({ ...selection, updatedAt: Date.now() });
    }
    return described;
  };
  const fixtureSelectionsRaw =
    process.env.CODEX_DEMO_PROJECT_FIXTURE_SELECTIONS;
  if (fixtureSelectionsRaw) {
    const fixtureSelections: unknown = JSON.parse(fixtureSelectionsRaw);
    if (
      !Array.isArray(fixtureSelections) ||
      fixtureSelections.length === 0 ||
      fixtureSelections.some(
        (selection) =>
          typeof selection !== "object" ||
          selection === null ||
          !("label" in selection) ||
          typeof selection.label !== "string" ||
          !("path" in selection) ||
          typeof selection.path !== "string" ||
          !isAbsolute(selection.path),
      )
    ) {
      throw new TypeError(
        "CODEX_DEMO_PROJECT_FIXTURE_SELECTIONS must be a non-empty array of labeled absolute directory paths.",
      );
    }
    const selection = fixtureSelections[
      Math.min(projectFixtureSelectionIndex, fixtureSelections.length - 1)
    ] as { label: string; path: string };
    projectFixtureSelectionIndex += 1;
    return rememberSelection(selection);
  }
  const fixturePathsRaw = process.env.CODEX_DEMO_PROJECT_FIXTURE_PATHS;
  let fixturePath = process.env.CODEX_DEMO_PROJECT_FIXTURE_PATH;
  if (fixturePathsRaw) {
    const fixturePaths: unknown = JSON.parse(fixturePathsRaw);
    if (
      !Array.isArray(fixturePaths) ||
      fixturePaths.length === 0 ||
      fixturePaths.some((path) => typeof path !== "string" || !isAbsolute(path))
    ) {
      throw new TypeError(
        "CODEX_DEMO_PROJECT_FIXTURE_PATHS must be a non-empty array of absolute directory paths.",
      );
    }
    fixturePath =
      fixturePaths[
        Math.min(projectFixtureSelectionIndex, fixturePaths.length - 1)
      ];
    projectFixtureSelectionIndex += 1;
  }
  if (fixturePath) {
    if (!isAbsolute(fixturePath) || !(await stat(fixturePath)).isDirectory()) {
      throw new TypeError(
        "CODEX_DEMO_PROJECT_FIXTURE_PATH must be an absolute directory path.",
      );
    }
    return rememberSelection({
      label: attachmentPathLabel(fixturePath, process.platform),
      path: fixturePath,
    });
  }
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory", "createDirectory"],
        title: "New project",
      })
    : await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
        title: "New project",
      });
  const path = result.filePaths[0];
  if (result.canceled || !path) return null;
  return rememberSelection({
    label: attachmentPathLabel(path, process.platform),
    path,
  });
}

async function handleCreateBranch(
  event: IpcMainInvokeEvent,
  rawInput: unknown,
): Promise<BranchCreationResponse> {
  assertTrustedIpc(event);
  assertBranchCreationInput(rawInput);
  if (gitBranchOperationActive) {
    return {
      code: "busy",
      message: "Another branch is being created.",
      ok: false,
    };
  }
  gitBranchOperationActive = true;
  try {
    return await gitBranchOperationQueue.run(async () => {
      await delayGitBranchOperationForFixture();
      const projectDirectory = trustedProjectDirectory(rawInput.projectToken);
      const result = await createAndCheckoutGitBranch(
        projectDirectory,
        rawInput.branchName,
      );
      return { branch: result.branch, ok: true };
    });
  } catch (error) {
    if (error instanceof GitBranchCreationError) {
      return { code: error.code, message: error.message, ok: false };
    }
    return {
      code: "unavailable",
      message: "Git could not create and checkout the branch.",
      ok: false,
    };
  } finally {
    gitBranchOperationActive = false;
  }
}

async function handleListBranches(
  event: IpcMainInvokeEvent,
  rawInput: unknown,
): Promise<BranchListResponse> {
  assertTrustedIpc(event);
  assertProjectTokenInput(rawInput);
  try {
    return await gitBranchOperationQueue.run(async () => {
      await delayGitBranchOperationForFixture(requestedGitBranchListDelayMs);
      const result = await listGitBranches(
        trustedProjectDirectory(rawInput.projectToken),
      );
      await delayGitBranchOperationForFixture(
        requestedGitBranchListResponseDelayMs,
      );
      return { ...result, ok: true };
    });
  } catch (error) {
    if (error instanceof GitBranchCreationError) {
      return { code: error.code, message: error.message, ok: false };
    }
    return {
      code: "unavailable",
      message: "Git could not list the repository branches.",
      ok: false,
    };
  }
}

async function handleCheckoutBranch(
  event: IpcMainInvokeEvent,
  rawInput: unknown,
): Promise<BranchCreationResponse> {
  assertTrustedIpc(event);
  assertBranchCreationInput(rawInput);
  if (gitBranchOperationActive) {
    return {
      code: "busy",
      message: "Another Git branch operation is running.",
      ok: false,
    };
  }
  gitBranchOperationActive = true;
  try {
    return await gitBranchOperationQueue.run(async () => {
      await delayGitBranchOperationForFixture();
      const projectDirectory = trustedProjectDirectory(rawInput.projectToken);
      const result = await checkoutGitBranch(
        projectDirectory,
        rawInput.branchName,
      );
      return { branch: result.branch, ok: true };
    });
  } catch (error) {
    if (error instanceof GitBranchCreationError) {
      return { code: error.code, message: error.message, ok: false };
    }
    return {
      code: "unavailable",
      message: "Git could not checkout the branch.",
      ok: false,
    };
  } finally {
    gitBranchOperationActive = false;
  }
}

function createWindow() {
  const scenario = process.env.CODEX_DEMO_SCENARIO ?? "streaming-recovery";
  const frame = process.env.CODEX_DEMO_FRAME ?? "recovered";
  const capture = process.env.CODEX_DEMO_CAPTURE ?? "0";
  const currentSidebar = process.env.CODEX_DEMO_CURRENT_SIDEBAR ?? "0";
  const sidebarState = process.env.CODEX_DEMO_SIDEBAR_STATE ?? "";
  const summaryState = process.env.CODEX_DEMO_SUMMARY_STATE ?? "";
  const layout = process.env.CODEX_DEMO_LAYOUT ?? "";
  const view = process.env.CODEX_DEMO_VIEW ?? "conversation";
  const requestedTheme = process.env.CODEX_DEMO_THEME;
  const theme =
    ["projects", "shell", "workspace"].includes(view) &&
    ["system", "light", "dark"].includes(requestedTheme ?? "")
      ? requestedTheme!
      : "dark";
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
    sidebarState,
    summaryState,
    theme,
    view,
  }).toString();
  const useLightWindowBackground =
    theme === "light" ||
    (theme === "system" && !nativeTheme.shouldUseDarkColors);
  const useTransparentWindowBackground = frame === "app-server-crashed";

  const window = new BrowserWindow({
    backgroundColor: useTransparentWindowBackground
      ? "#00000000"
      : useLightWindowBackground
        ? "#ffffff"
        : "#101010",
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
ipcMain.handle("demo:git:commit-preview", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { directory } = resolveHistoryProject(raw);
  return gitBranchOperationQueue.run(() => readGitCommitPreview(directory));
});
ipcMain.handle("demo:git:commit", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { directory } = resolveHistoryProject(raw);
  const input = raw as { fingerprint?: unknown; message?: unknown };
  if (typeof input.fingerprint !== "string" || typeof input.message !== "string") throw new TypeError("A reviewed preview and commit message are required.");
  const { fingerprint, message } = input;
  return gitBranchOperationQueue.run(() => commitGitPreview(directory, fingerprint, message));
});
ipcMain.handle("demo:live:projects", async (event) => {
  assertTrustedIpc(event);
  const projects = await historyRegistry().projects();
  return Promise.all(projects.map(({ path, label }) => describeProjectSelection({ path, label })));
});
ipcMain.handle("demo:live:threads", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { input, directory } = resolveHistoryProject(raw);
  if (input.cursor !== undefined && (typeof input.cursor !== "string" || !/^\d+$/.test(input.cursor))) throw new TypeError("Invalid thread-list cursor.");
  const offset = input.cursor === undefined ? 0 : Number(input.cursor);
  if (!Number.isSafeInteger(offset)) throw new TypeError("Invalid thread-list cursor.");
  if (input.archived !== undefined && typeof input.archived !== "boolean") throw new TypeError("Invalid archived filter.");
  const snapshot = await historyRegistry().list(directory, "all");
  const archivedThreadIds = snapshot.filter(thread => thread.archived).map(thread => thread.id);
  const cached = liveSession.get(directory);
  if (cached && archivedThreadIds.includes(cached.thread.id)) liveSession.removeWhere(session => session.thread.id === cached.thread.id);
  const threads = snapshot.filter(thread => Boolean(thread.archived) === (input.archived === true));
  return { threads: threads.slice(offset, offset + 20).map(({ id, title, updatedAt }) => ({ id, title, updatedAt })), nextCursor: offset + 20 < threads.length ? String(offset + 20) : null, archivedThreadIds };
});
ipcMain.handle("demo:live:thread:read", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { input, directory } = resolveHistoryProject(raw);
  if (typeof input.threadId !== "string") throw new TypeError("A thread is required.");
  await historyRegistry().require(directory, input.threadId);
  const connectedClient = await ensureClient();
  const { thread } = await connectedClient.threadRead({ threadId: input.threadId, includeTurns: true });
  if (client !== connectedClient || connectedClient.state !== "connected") throw new Error("The live session was closed while reading history.");
  if (resolve(thread.cwd) !== resolve(directory)) throw new Error("Thread working directory no longer matches the selected project.");
  return { threadId: thread.id, turns: thread.turns };
});
ipcMain.handle("demo:live:thread:rename", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { input, directory } = resolveHistoryProject(raw);
  if (typeof input.threadId !== "string") throw new TypeError("A thread is required.");
  const threadId = input.threadId;
  const name = (raw as { name?: unknown }).name;
  if (typeof name !== "string") throw new TypeError("A chat name is required.");
  const title = await historyRegistry().rename(directory, threadId, name, async name => {
    const connectedClient = await ensureClient();
    const { thread } = await connectedClient.threadRead({ threadId, includeTurns: false });
    if (client !== connectedClient || connectedClient.state !== "connected") throw new Error("The live session was closed.");
    if (resolve(thread.cwd) !== resolve(directory)) throw new Error("Thread working directory no longer matches the selected project.");
    await connectedClient.threadSetName({ threadId, name });
  });
  return { threadId, title };
});
ipcMain.handle("demo:live:thread:archive", async (event, raw: unknown) => {
  assertTrustedIpc(event);
  const { input, directory } = resolveHistoryProject(raw);
  if (typeof input.threadId !== "string" || typeof input.archived !== "boolean") throw new TypeError("A thread and archive state are required.");
  const { threadId, archived } = input;
  // Use the same lock as turn/start: do not race an archive with a new turn.
  return liveTurnStartGate.run(() => activeTurn !== null, async () => {
    const changed = await historyRegistry().setArchived(directory, threadId, archived, async () => {
      const connectedClient = await ensureClient();
      const { thread } = await connectedClient.threadRead({ threadId, includeTurns: false });
      if (client !== connectedClient || connectedClient.state !== "connected") throw new Error("The live session was closed.");
      if (resolve(thread.cwd) !== resolve(directory)) throw new Error("Thread working directory no longer matches the selected project.");
      if (thread.status.type === "active") throw new Error("Wait for this chat to finish before archiving or restoring it.");
      const observed: string[] = [];
      const stop = connectedClient.onNotification("thread/archived", params => { observed.push(params.threadId); });
      try {
        if (archived) await connectedClient.threadArchive({ threadId });
        else await connectedClient.threadUnarchive({ threadId });
      } finally { stop(); }
      return observed;
    });
    liveSession.removeWhere(session => changed.includes(session.thread.id));
    return { threadId, archived, changedThreadIds: changed };
  });
});
ipcMain.handle("demo:live:stop", handleStopLive);
ipcMain.handle("demo:input:respond", (event, rawInput: unknown) => {
  assertTrustedIpc(event);
  if (!rawInput || typeof rawInput !== "object") throw new TypeError("Invalid answer response.");
  const input = rawInput as { requestId?: unknown; threadId?: unknown; answers?: unknown };
  if ((typeof input.requestId !== "string" && typeof input.requestId !== "number") || typeof input.threadId !== "string") {
    throw new TypeError("A request and owning thread are required.");
  }
  if (!liveInputGate.respond(input.requestId, input.threadId, input.answers)) {
    throw new Error("The question is no longer pending.");
  }
});
ipcMain.handle("demo:live:close", handleCloseLive);
ipcMain.handle("demo:terminal:start", async (event, input) => {
  assertTrustedIpc(event);
  // Validate the project before connecting a new host process.
  if (!input || typeof input.projectToken !== "string" || !trustedProjectDirectories.has(input.projectToken)) {
    throw new Error("Select a host-owned local project.");
  }
  const manager = await ensureTerminalHost();
  assertTrustedIpc(event);
  return manager.start(input);
});
ipcMain.handle("demo:terminal:write", async (event, input) => {
  assertTrustedIpc(event);
  if (!terminalHost || typeof input?.sessionId !== "string" || typeof input?.text !== "string") throw new Error("Invalid terminal input.");
  await terminalHost.manager.write(input.sessionId, input.text);
});
ipcMain.handle("demo:terminal:open-shell", async (event, input) => {
  assertTrustedIpc(event);
  if (!input || typeof input.projectToken !== "string" || !trustedProjectDirectories.has(input.projectToken)) {
    throw new Error("Select a host-owned local project.");
  }
  const manager = await ensureTerminalHost();
  assertTrustedIpc(event);
  return manager.openShell(input);
});
ipcMain.handle("demo:terminal:resize", async (event, input) => {
  assertTrustedIpc(event);
  if (!terminalHost || typeof input?.sessionId !== "string") throw new Error("Invalid terminal session.");
  await terminalHost.manager.resize(input.sessionId, input.size);
});
ipcMain.handle("demo:terminal:stop", async (event, input) => {
  assertTrustedIpc(event);
  if (!terminalHost || typeof input?.sessionId !== "string") throw new Error("Invalid terminal session.");
  await terminalHost.manager.stop(input.sessionId);
});
ipcMain.handle("demo:terminal:close", async event => {
  assertTrustedIpc(event);
  await closeTerminals();
});
ipcMain.handle("demo:approval:respond", handleApprovalResponse);
ipcMain.handle("demo:attachments:select", handleSelectAttachments);
ipcMain.handle("demo:project:select", handleSelectProjectDirectory);
ipcMain.handle("demo:git:create-branch", handleCreateBranch);
ipcMain.handle("demo:git:checkout-branch", handleCheckoutBranch);
ipcMain.handle("demo:git:list-branches", handleListBranches);

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
