/// <reference types="vite/client" />

import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";
import type { LiveTerminalEvent } from "../electron/live-terminal";

interface CodexDemoBridge {
  liveWorkspaceWritable: boolean;
  useRendererAttachmentFixture: boolean;
  useWorkspaceBranchFixture: boolean;
  startupWorkspaceProjectToken: string;
  workspaceProjectId: string;
  workspaceProjectPath: string;
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
  listBranches(input: { projectToken: string }): Promise<
    | {
        branches: string[];
        branchesCheckedOutElsewhere: string[];
        branchesUnavailableForCheckout: string[];
        currentBranch: string | null;
        ok: true;
        unbornBranch: string | null;
      }
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
  startTerminal(input: { sessionId: string; projectToken: string; command: string }): Promise<{ processId: string }>;
  writeTerminal(input: { sessionId: string; text: string }): Promise<void>;
  stopTerminal(input: { sessionId: string }): Promise<void>;
  closeTerminals(): Promise<void>;
  onTerminalEvent(handler: (event: LiveTerminalEvent) => void): () => void;
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
  startLive(input: { prompt: string; projectToken: string }): Promise<{
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
