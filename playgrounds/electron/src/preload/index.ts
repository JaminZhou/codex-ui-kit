import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopPlaygroundApi,
  ThemeSource,
  ThemeState,
  WindowPreset,
} from "../shared/contract";

const api: DesktopPlaygroundApi = {
  getEnvironment: () => ipcRenderer.invoke("playground:get-environment"),
  onThemeChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, theme: ThemeState) => {
      listener(theme);
    };
    ipcRenderer.on("playground:theme-changed", handler);
    return () => ipcRenderer.removeListener("playground:theme-changed", handler);
  },
  setThemeSource: (source: ThemeSource) =>
    ipcRenderer.invoke("playground:set-theme-source", source),
  setWindowPreset: (preset: WindowPreset) =>
    ipcRenderer.invoke("playground:set-window-preset", preset),
};

contextBridge.exposeInMainWorld("desktopPlayground", api);
