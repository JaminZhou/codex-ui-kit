/// <reference types="vite/client" />

import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import type { ProtocolEventRecord } from "./protocol-state";
import type { LiveTerminalEvent } from "../electron/live-terminal";

interface CodexDemoBridge {
  previewCommit(input: { projectToken: string }): Promise<import("../electron/git-commit-preview").GitCommitPreview>;
  commitPreview(input: { projectToken: string; fingerprint: string; message: string }): Promise<{ head: string }>;
  previewPush(input: { projectToken: string; remote: string; target?: string }): Promise<import("../electron/git-push-preview").GitPushPreview>;
  pushPreview(input: { projectToken: string; remote: string; target: string; fingerprint: string }): Promise<{ head: string; target: string }>;
  previewPullRequest(input: { projectToken: string; remote: string }): Promise<import("../electron/git-pr-preview").GitPullRequestPreview>;
  createPullRequest(input: { projectToken: string } & import("../electron/git-pr-preview").CreatePullRequestInput): Promise<{ number: number; url: string }>;
  readPullRequest(input: { projectToken: string; remote: string; number: number }): Promise<import("../electron/git-pr-detail").GitPullRequestDetail>;
  readPullRequestDiff(input: { projectToken: string; remote: string; number: number; head: string }): Promise<import("../electron/git-pr-detail").GitPullRequestDiff>;
  editPullRequest(input: { projectToken: string } & import("../electron/git-pr-detail").EditPullRequestInput): Promise<import("../electron/git-pr-detail").GitPullRequestDetail>;
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
  listLiveProjects(): Promise<Array<{ label: string; path: string; projectToken?: string }>>;
  renameLiveThread(input: { projectToken: string; threadId: string; name: string }): Promise<{ threadId: string; title: string }>;
  setLiveThreadArchived(input: { projectToken: string; threadId: string; archived: boolean }): Promise<{ threadId: string; archived: boolean; changedThreadIds: string[] }>;
  selectProjectDirectory(): Promise<
    | {
        label: string;
        path: string;
        projectToken?: string;
      }
    | null
  >;
  closeLive(): Promise<void>;
  onLiveSession(handler: (event: import("./live-project-state").LiveSessionEvent) => void): () => void;
  startTerminal(input: { sessionId: string; projectToken: string; command: string }): Promise<{ processId: string }>;
  openTerminalShell(input: { sessionId: string; projectToken: string; size: { cols: number; rows: number } }): Promise<{ processId: string }>;
  resizeTerminal(input: { sessionId: string; size: { cols: number; rows: number } }): Promise<void>;
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
  respondToUserInput(input: {
    requestId: number | string;
    threadId: string;
    answers: Record<string, string[]>;
  }): Promise<void>;
  listLiveThreads(input: { projectToken: string; cursor?: string; archived?: boolean }): Promise<{ threads: Array<{ id: string; title: string; updatedAt: number }>; nextCursor: string | null; archivedThreadIds: string[] }>;
  readLiveThread(input: { projectToken: string; threadId: string }): Promise<{ threadId: string; turns: import("./live-history-state").StoredLiveTurn[] }>;
  startLive(input: { prompt: string; projectToken: string; collaborationMode?: "default" | "plan"; threadId?: string | null }): Promise<{
    threadId: string;
    turnId: string;
  }>;
  stopLive(input: { threadId: string }): Promise<void>;
}

declare global {
  interface Window {
    codexDemo?: CodexDemoBridge;
  }
}
