import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { _electron as electron } from "playwright-core";

const require = createRequire(import.meta.url);
const playwrightElectronLoader = join(dirname(require.resolve("playwright-core")), "lib/server/electron/loader.js");

// Every process owns its Chromium profile as well as its replay history. Sharing
// a profile makes parallel scenes contend for cookies, caches and database locks.
export async function launchIsolatedElectron(options, prepare) {
  const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-electron-"));
  let app;
  try {
    app = await electron.launch({
      ...options,
      // Resolve Electron here because Playwright cannot see workspace
      // dependencies from its own package path under pnpm's isolated linker.
      executablePath: options.executablePath ?? require("electron"),
      // Supplying executablePath disables Playwright's automatic loader flag.
      // Keep its coordinated Electron startup behavior when resolving the binary
      // explicitly from this playground.
      args: ["-r", playwrightElectronLoader, ...(options.args ?? [])],
      env: {
        ...options.env,
        CODEX_UI_KIT_TEST_USER_DATA_DIR: directory,
      },
    });
    const close = app.close.bind(app);
    let closing;
    app.close = () => closing ??= (async () => {
      await close();
      await rm(directory, { recursive: true, force: true });
    })();
    return await prepare(app);
  } catch (error) {
    // Preparation is part of launch: callers have no handle yet and cannot run
    // their own finally block if the first window or scene never becomes ready.
    if (app) {
      try {
        await app.close();
      } catch (closeError) {
        throw new AggregateError([error, closeError], "Electron scene preparation and cleanup failed");
      }
    } else {
      await rm(directory, { recursive: true, force: true });
    }
    throw error;
  }
}
