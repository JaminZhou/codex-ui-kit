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
];

export async function launchScene(scene) {
  const app = await electron.launch({
    args: ["."],
    executablePath: electronPath,
    env: {
      ...process.env,
      CODEX_DEMO_CAPTURE: "1",
      CODEX_DEMO_FRAME: scene.frame,
      CODEX_DEMO_HEADLESS: "1",
      CODEX_DEMO_SCENARIO: scene.scenario,
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
  return { app, page };
}
