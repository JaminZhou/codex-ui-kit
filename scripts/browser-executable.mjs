import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export const chromeExecutableCommands = [
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
];

function findExecutable(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  if (result.status !== 0) return undefined;
  return result.stdout.trim() || undefined;
}

export function findChromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ...chromeExecutableCommands.map(findExecutable),
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate));
}
