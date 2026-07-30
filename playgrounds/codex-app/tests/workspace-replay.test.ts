import { describe, expect, it } from "vitest";
import type { ProtocolEventRecord } from "../src/protocol-state";
import {
  contextualizeWorkspaceReplay,
  workspaceExecutionCwd,
} from "../src/workspace-replay";

describe("workspace replay routing", () => {
  it("derives an execution cwd from project, environment, and worktree", () => {
    expect(
      workspaceExecutionCwd({
        environmentId: "local",
        projectPath: "/workspace/codex-app-server-client",
        worktreeBranch: "main",
        worktreeId: "main",
      }),
    ).toBe("/workspace/codex-app-server-client");
    expect(
      workspaceExecutionCwd({
        environmentId: "local",
        projectPath: "/workspace/codex-ui-kit",
        worktreeBranch: "feat/coding-workspace-lifecycle",
        worktreeId: "feature",
      }),
    ).toBe(
      "/workspace/codex-ui-kit/.worktrees/feat-coding-workspace-lifecycle",
    );
    expect(
      workspaceExecutionCwd({
        environmentId: "cloud",
        projectPath: "/workspace/codex-ui-kit",
        worktreeId: "main",
      }),
    ).toBe("/cloud/codex-ui-kit");
    expect(
      workspaceExecutionCwd({
        environmentId: "cloud",
        projectPath: "/workspace/codex-ui-kit",
        worktreeBranch: "feat/cloud review",
        worktreeId: "feature",
      }),
    ).toBe("/cloud/codex-ui-kit/.worktrees/feat-cloud-review");
    expect(
      workspaceExecutionCwd({
        environmentId: "local",
        projectPath: "/workspace/codex-ui-kit",
        worktreeBranch: `${"-".repeat(10_000)}feature / review${"-".repeat(10_000)}`,
        worktreeId: "feature",
      }),
    ).toBe("/workspace/codex-ui-kit/.worktrees/feature-review");
  });

  it("rewrites every protocol cwd without mutating the fixture", () => {
    const events: ProtocolEventRecord[] = [
      {
        atMs: 1,
        method: "item/started",
        params: {
          cwd: "/workspace/codex-ui-kit",
          item: {
            cwd: "/workspace/codex-ui-kit",
            type: "commandExecution",
          },
        },
        response: {
          cwd: "/workspace/codex-ui-kit",
        },
      },
    ];

    const contextualized = contextualizeWorkspaceReplay(
      events,
      "/workspace/codex-app-server-client",
    );

    expect(contextualized[0]?.params).toEqual({
      cwd: "/workspace/codex-app-server-client",
      item: {
        cwd: "/workspace/codex-app-server-client",
        type: "commandExecution",
      },
    });
    expect(contextualized[0]?.response).toEqual({
      cwd: "/workspace/codex-app-server-client",
    });
    expect(events[0]?.params).toMatchObject({
      cwd: "/workspace/codex-ui-kit",
    });
  });

  it("preserves the submitted prompt in the contextualized user message", () => {
    const events: ProtocolEventRecord[] = [
      {
        atMs: 1,
        method: "item/started",
        params: {
          item: {
            content: [
              {
                text: "Static fixture prompt",
                text_elements: [],
                type: "text",
              },
            ],
            id: "user-workflow",
            type: "userMessage",
          },
        },
      },
    ];

    const contextualized = contextualizeWorkspaceReplay(
      events,
      "/workspace/codex-ui-kit",
      "Review my selected workspace.",
    );

    expect(contextualized[0]?.params).toMatchObject({
      item: {
        content: [
          {
            text: "Review my selected workspace.",
            type: "text",
          },
        ],
        type: "userMessage",
      },
    });
    expect(events[0]?.params).toMatchObject({
      item: {
        content: [
          {
            text: "Static fixture prompt",
          },
        ],
      },
    });
  });
});
