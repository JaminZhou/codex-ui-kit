const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("codexDemo", {
  closeLive: () => ipcRenderer.invoke("demo:live:close"),
  onNotification: (handler) => {
    if (typeof handler !== "function") {
      throw new TypeError("Notification handler must be a function.");
    }
    const listener = (_event, notification) => handler(notification);
    ipcRenderer.on("demo:notification", listener);
    return () => ipcRenderer.removeListener("demo:notification", listener);
  },
  startLive: (input) => ipcRenderer.invoke("demo:live:start", input),
  stopLive: () => ipcRenderer.invoke("demo:live:stop"),
});
