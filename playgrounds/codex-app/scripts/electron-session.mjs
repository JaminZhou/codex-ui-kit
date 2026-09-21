import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron } from "playwright-core";

// Every process owns its Chromium profile as well as its replay history. Sharing
// a profile makes parallel scenes contend for cookies, caches and database locks.
export async function launchIsolatedElectron(options, prepare) {
  const directory = await mkdtemp(join(tmpdir(), "codex-ui-kit-electron-"));
  let app;
  try {
    app = await electron.launch({
      ...options,
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
