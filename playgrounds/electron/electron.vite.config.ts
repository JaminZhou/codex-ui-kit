import { createRequire } from "node:module";
import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// electron-vite resolves Electron from its own pnpm virtual-store directory.
// Seed its supported override from this workspace's installed package so the
// build does not depend on an incidental hoisted node_modules link.
const require = createRequire(import.meta.url);
process.env.ELECTRON_MAJOR_VER ??= require("electron/package.json").version.split(".")[0];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve("src/renderer"),
    build: {
      rollupOptions: {
        input: resolve("src/renderer/index.html"),
      },
    },
  },
});
