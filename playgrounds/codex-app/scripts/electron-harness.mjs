import electronPath from "electron";
import { _electron as electron } from "playwright-core";

export const visualScenes = [
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
    frame: "mcp-running",
    id: "mcp-running",
    maxPixelRatio: 0.01,
    scenario: "mcp-tool-call",
    surfaces: ["mcpGroup"],
    toolCount: 1,
  },
  {
    frame: "mcp-tool-calls",
    id: "mcp-tool-calls",
    maxPixelRatio: 0.02,
    scenario: "mcp-tool-call",
    scrollTop: 72,
    surfaces: ["mcpGroup"],
    toolCount: 5,
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
    maxPixelRatio: 0.004,
    scenario: "large-file-review",
    selectPath: ".research/large-review/08.ts",
    surfaces: ["fileChange", "reviewPanel"],
  },
  {
    frame: "review-open",
    id: "pull-request-detail",
    maxPixelRatio: 0.01,
    scenario: "workspace-workflow",
    view: "pull-request",
  },
];

export async function launchScene(
  scene,
  { capture = true, windowSize } = {},
) {
  const app = await electron.launch({
    args: ["."],
    executablePath: electronPath,
    env: {
      ...process.env,
      CODEX_DEMO_CAPTURE: capture ? "1" : "0",
      CODEX_DEMO_FRAME: scene.frame,
      CODEX_DEMO_HEADLESS: "1",
      CODEX_DEMO_SCENARIO: scene.scenario,
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
      }, scene.scrollTop);
  }
  return { app, page };
}
