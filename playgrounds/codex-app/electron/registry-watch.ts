import { watch as watchDirectory } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname } from "node:path";

async function fileSignature(path: string): Promise<string> {
  try {
    const info = await stat(path);
    return [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs].join(":");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "missing";
    throw error;
  }
}

/** Watch atomic same-directory replacements without relying on one native event. */
export async function watchAtomicRegistryFile(
  path: string,
  onChange: () => void,
): Promise<() => void> {
  if (typeof onChange !== "function") {
    throw new TypeError("A registry change callback is required.");
  }
  await mkdir(dirname(path), { recursive: true });
  const target = basename(path);
  let disposed = false;
  let polling = false;
  let timer: NodeJS.Timeout | null = null;
  let observedSignature = await fileSignature(path);
  let notifiedSignature = observedSignature;
  const scheduleChange = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void fileSignature(path).then((signature) => {
        if (disposed || signature === notifiedSignature) return;
        notifiedSignature = signature;
        try {
          onChange();
        } catch {
          // Observers must not tear down the registry watcher.
        }
      }).catch(() => undefined);
    }, 25);
  };
  const watcher = watchDirectory(
    dirname(path),
    { persistent: false },
    (_event, filename) => {
      const name = filename?.toString();
      if (name && name !== target) return;
      scheduleChange();
    },
  );
  watcher.on("error", () => undefined);

  // Native directory watchers can miss the first atomic rename while their
  // platform-specific watcher is being installed. This unref'd stat poll also
  // covers coalesced rename events; fs.watch remains the low-latency path.
  const poll = setInterval(() => {
    if (disposed || polling) return;
    polling = true;
    void fileSignature(path).then((signature) => {
      if (disposed || signature === observedSignature) return;
      observedSignature = signature;
      scheduleChange();
    }).catch(() => undefined).finally(() => {
      polling = false;
    });
  }, 250);
  poll.unref();

  return () => {
    disposed = true;
    clearInterval(poll);
    if (timer) clearTimeout(timer);
    timer = null;
    watcher.close();
  };
}
