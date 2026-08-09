/// <reference types="vite/client" />

import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";

interface CodexDemoBridge {
  closeLive(): Promise<void>;
  onNotification(
    handler: (notification: JsonRpcNotification) => void,
  ): () => void;
  onServerRequest(
    handler: (request: ProtocolEventRecord) => void,
  ): () => void;
  respondToApproval(input: {
    decision: "accept" | "acceptForSession" | "decline";
    requestId: number | string;
  }): Promise<void>;
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
