const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexDemo", {
  liveWorkspaceWritable: process.env.CODEX_UI_KIT_LIVE_WORKSPACE_WRITE === "1",
  useRendererAttachmentFixture:
    process.env.CODEX_DEMO_ATTACHMENT_RENDERER_FIXTURE === "1",
  useWorkspaceBranchFixture:
    process.env.CODEX_DEMO_CAPTURE === "1" ||
    process.env.CODEX_DEMO_WORKSPACE_BRANCH_FIXTURE === "1",
  startupWorkspaceProjectToken: "startup-workspace",
  workspaceProjectId:
    process.env.CODEX_DEMO_WORKSPACE_PROJECT_ID ?? "codex-ui-kit",
  workspaceProjectPath:
    process.env.CODEX_DEMO_WORKSPACE_PROJECT_PATH ?? "",
  selectAttachments: () => ipcRenderer.invoke("demo:attachments:select"),
  selectProjectDirectory: () => ipcRenderer.invoke("demo:project:select"),
  listLiveProjects: () => ipcRenderer.invoke("demo:live:projects"),
  renameLiveThread: (input) => ipcRenderer.invoke("demo:live:thread:rename", input),
  setLiveThreadArchived: (input) => ipcRenderer.invoke("demo:live:thread:archive", input),
  createAndCheckoutBranch: (input) =>
    ipcRenderer.invoke("demo:git:create-branch", input),
  checkoutBranch: (input) =>
    ipcRenderer.invoke("demo:git:checkout-branch", input),
  listBranches: (input) => ipcRenderer.invoke("demo:git:list-branches", input),
  closeLive: () => ipcRenderer.invoke("demo:live:close"),
  startTerminal: (input) => ipcRenderer.invoke("demo:terminal:start", input),
  openTerminalShell: (input) => ipcRenderer.invoke("demo:terminal:open-shell", input),
  resizeTerminal: (input) => ipcRenderer.invoke("demo:terminal:resize", input),
  writeTerminal: (input) => ipcRenderer.invoke("demo:terminal:write", input),
  stopTerminal: (input) => ipcRenderer.invoke("demo:terminal:stop", input),
  closeTerminals: () => ipcRenderer.invoke("demo:terminal:close"),
  onTerminalEvent: (handler) => {
    if (typeof handler !== "function") throw new TypeError("Terminal handler must be a function.");
    const listener = (_event, value) => handler(value);
    ipcRenderer.on("demo:terminal:event", listener);
    return () => ipcRenderer.removeListener("demo:terminal:event", listener);
  },
  onLiveSession: (handler) => {
    if (typeof handler !== "function") throw new TypeError("Live session handler must be a function.");
    const listener = (_event, value) => handler(value);
    ipcRenderer.on("demo:live:session", listener);
    return () => ipcRenderer.removeListener("demo:live:session", listener);
  },
  onNotification: (handler) => {
    if (typeof handler !== "function") {
      throw new TypeError("Notification handler must be a function.");
    }
    const listener = (_event, notification) => handler(notification);
    ipcRenderer.on("demo:notification", listener);
    return () => ipcRenderer.removeListener("demo:notification", listener);
  },
  onServerRequest: (handler) => {
    if (typeof handler !== "function") {
      throw new TypeError("Server-request handler must be a function.");
    }
    const listener = (_event, request) => handler(request);
    ipcRenderer.on("demo:server-request", listener);
    return () => ipcRenderer.removeListener("demo:server-request", listener);
  },
  respondToApproval: (input) =>
    ipcRenderer.invoke("demo:approval:respond", input),
  respondToUserInput: (input) => ipcRenderer.invoke("demo:input:respond", input),
  startLive: (input) => ipcRenderer.invoke("demo:live:start", input),
  listLiveThreads: (input) => ipcRenderer.invoke("demo:live:threads", input),
  readLiveThread: (input) => ipcRenderer.invoke("demo:live:thread:read", input),
  stopLive: (input) => ipcRenderer.invoke("demo:live:stop", input),
});
