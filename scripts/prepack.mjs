import { spawnSync } from "node:child_process";

const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpmExecutable, ["build"], {
  cwd: new URL("../", import.meta.url),
  stdio: ["inherit", 2, 2],
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
