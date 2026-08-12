/// <reference types="vite/client" />

import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";

interface CodexDemoBridge {
  useRendererAttachmentFixture: boolean;
  startupWorkspaceProjectToken: string;
  workspaceProjectId: string;
  createAndCheckoutBranch(input: {
    branchName: string;
    projectToken: string;
  }): Promise<
    | { branch: string; ok: true }
    | { code: string; message: string; ok: false }
  >;
  checkoutBranch(input: {
    branchName: string;
    projectToken: string;
  }): Promise<
    | { branch: string; ok: true }
    | { code: string; message: string; ok: false }
  >;
  selectAttachments(): Promise<
    {
      id: string;
      kind: "file" | "folder";
      label: string;
      meta: string;
    }[]
  >;
  selectProjectDirectory(): Promise<
    | {
        label: string;
        path: string;
        projectToken?: string;
      }
    | null
  >;
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
