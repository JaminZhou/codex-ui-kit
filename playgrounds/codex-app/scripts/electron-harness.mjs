import electronPath from "electron";
import { _electron as electron } from "playwright-core";

export const visualScenes = [
  {
    frame: "conversation-thread-ready",
    id: "conversation-thread-ready",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-multiline",
    id: "composer-multiline",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-running",
    id: "composer-running",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-queued",
    id: "composer-queued",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-queue-paused",
    id: "composer-queue-paused",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-disabled",
    id: "composer-disabled",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "composer-attachment",
    id: "composer-attachment",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "thread-scroll-away",
    id: "thread-scroll-away",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
    scrollTop: 0,
  },
  {
    frame: "thread-windowed",
    id: "thread-windowed",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "conversation-completed",
    id: "conversation-completed",
    maxPixelRatio: 0.0225,
    scenario: "conversation-lifecycle",
  },
  {
    frame: "streaming",
    id: "streaming",
    scenario: "streaming-recovery",
  },
  {
    frame: "retrying",
    id: "retrying",
    scenario: "streaming-recovery",
  },
  {
    frame: "recovered",
    id: "recovered",
    scenario: "streaming-recovery",
  },
  {
    frame: "markdown-complete",
    id: "markdown-complete",
    maxPixelRatio: 0.01,
    scenario: "markdown",
  },
  {
    callLabels: ["Search OpenAI docs"],
    frame: "mcp-running",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-running",
    maxPixelRatio: 0.01,
    scenario: "mcp-tool-call",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: [
      "Search OpenAI docs",
      "Fetch OpenAI doc",
      "Search OpenAI docs",
      "Fetch OpenAI doc",
      "Search OpenAI docs",
    ],
    frame: "mcp-tool-calls",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-tool-calls",
    maxPixelRatio: 0.0225,
    scenario: "mcp-tool-call",
    scrollTop: 72,
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 54s",
    toolCount: 5,
  },
  {
    callLabels: ["Fetch OpenAI doc"],
    errorOutput: "Invalid URL",
    frame: "mcp-recovery-failed",
    groupLabel: "OpenAI Developer Docs integration failed",
    id: "mcp-recovery-failed",
    maxPixelRatio: 0.01,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 1,
  },
  {
    callLabels: ["Fetch OpenAI doc", "Search OpenAI docs"],
    frame: "mcp-recovery-retrying",
    groupLabel: "Using OpenAI Developer Docs integration",
    id: "mcp-recovery-retrying",
    maxPixelRatio: 0.01,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["mcpGroup"],
    timelineLabel: "Working",
    toolCount: 2,
  },
  {
    callLabels: [
      "Fetch OpenAI doc",
      "Search OpenAI docs",
      "Fetch OpenAI doc",
    ],
    errorOutput: "Invalid URL",
    frame: "mcp-recovery-completed",
    groupLabel: "Used OpenAI Developer Docs integration",
    id: "mcp-recovery-completed",
    maxPixelRatio: 0.0225,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["mcpGroup"],
    timelineLabel: "Worked for 28s",
    toolCount: 3,
  },
  {
    fileCount: 1,
    frame: "mixed-review-open",
    id: "mixed-thread-review",
    maxPixelRatio: 0.013,
    scenario: "mcp-recovery-mixed-thread",
    surfaces: ["approval", "command", "fileChange", "reviewPanel"],
  },
  {
    frame: "interrupted",
    id: "interrupted",
    scenario: "interruption",
  },
  {
    frame: "compacting",
    id: "compacting",
    scenario: "compaction",
  },
  {
    frame: "compacted",
    id: "compacted",
    scenario: "compaction",
  },
  {
    frame: "terminal-open",
    id: "background-terminal",
    scenario: "background-terminal",
    surfaces: ["bottomPanel", "command", "terminal"],
  },
  {
    frame: "command-running",
    id: "command-running",
    scenario: "workspace-workflow",
    surfaces: ["command"],
  },
  {
    frame: "approval-pending",
    id: "approval-pending",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command"],
  },
  {
    frame: "file-changing",
    id: "file-changing",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange"],
  },
  {
    frame: "file-applied",
    id: "file-applied",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange"],
  },
  {
    frame: "review-open",
    id: "review-open",
    scenario: "workspace-workflow",
    surfaces: ["approval", "command", "fileChange", "reviewPanel"],
  },
  {
    frame: "review-open",
    id: "multi-file-review",
    scenario: "multi-file-review",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    fileCount: 8,
    frame: "review-open",
    id: "large-file-review",
    maxPixelRatio: 0.0045,
    scenario: "large-file-review",
    selectPath: ".research/large-review/08.ts",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    frame: "review-open",
    id: "pull-request-detail",
    maxPixelRatio: 0.011,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
  {
    frame: "shell-loading",
    id: "shell-loading",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "loading",
    view: "shell",
  },
  {
    frame: "shell-offline",
    id: "shell-offline",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "offline",
    view: "shell",
  },
  {
    frame: "shell-stale",
    id: "shell-stale",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "stale",
    view: "shell",
  },
  {
    frame: "shell-restored",
    id: "shell-restored",
    maxPixelRatio: 0.005,
    scenario: "streaming-recovery",
    shellState: "ready",
    view: "shell",
  },
];

export async function launchScene(
  scene,
  { capture = true, layoutMode, windowSize } = {},
) {
  const app = await electron.launch({
    args: ["."],
    executablePath: electronPath,
    env: {
      ...process.env,
      CODEX_DEMO_CAPTURE: capture ? "1" : "0",
      CODEX_DEMO_FRAME: scene.frame,
      CODEX_DEMO_HEADLESS: "1",
      ...(layoutMode ? { CODEX_DEMO_LAYOUT: layoutMode } : {}),
      CODEX_DEMO_SCENARIO: scene.scenario,
      CODEX_DEMO_SHELL_STATE: scene.shellState ?? "ready",
      CODEX_DEMO_VIEW: scene.view ?? "conversation",
      ...(windowSize
        ? {
            CODEX_DEMO_WINDOW_HEIGHT: String(windowSize.height),
            CODEX_DEMO_WINDOW_WIDTH: String(windowSize.width),
          }
        : {}),
    },
  });
  const page = await app.firstWindow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector(
    `.demo-root[data-scenario="${scene.scenario}"][data-frame="${scene.frame}"]`,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (scene.scrollTop !== undefined) {
    await page
      .locator(".codex-ui-conversation-thread-shell__viewport")
      .evaluate((element, scrollTop) => {
        element.scrollTop = scrollTop;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      }, scene.scrollTop);
  }
  return { app, page };
}
