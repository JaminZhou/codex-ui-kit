import type { DesktopPlaygroundApi } from "../../shared/contract";

declare global {
  interface Window {
    desktopPlayground: DesktopPlaygroundApi;
  }
}

export {};
