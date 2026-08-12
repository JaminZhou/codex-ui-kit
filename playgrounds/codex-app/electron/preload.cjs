const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexDemo", {
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
  createAndCheckoutBranch: (input) =>
    ipcRenderer.invoke("demo:git:create-branch", input),
  checkoutBranch: (input) =>
    ipcRenderer.invoke("demo:git:checkout-branch", input),
  listBranches: (input) => ipcRenderer.invoke("demo:git:list-branches", input),
  closeLive: () => ipcRenderer.invoke("demo:live:close"),
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
  startLive: (input) => ipcRenderer.invoke("demo:live:start", input),
  stopLive: () => ipcRenderer.invoke("demo:live:stop"),
});
