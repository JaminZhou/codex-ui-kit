/// <reference types="vite/client" />

import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";

interface CodexDemoBridge {
  closeLive(): Promise<void>;
  onNotification(
    handler: (notification: JsonRpcNotification) => void,
  ): () => void;
  startLive(input: { prompt: string }): Promise<{
    threadId: string;
    turnId: string;
  }>;
  stopLive(): Promise<void>;
}

declare global {
  interface Window {
    codexDemo?: CodexDemoBridge;
  }
}
