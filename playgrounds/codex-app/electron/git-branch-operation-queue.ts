import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireRegistryLock } from "./registry-lock.js";

const branchLockRoot = join(tmpdir(), "codex-ui-kit-branch-operation-locks");

function branchLockPath(projectDirectory: string) {
  const key = createHash("sha256").update(projectDirectory).digest("hex");
  return join(branchLockRoot, key);
}

export class GitBranchOperationQueue {
  private tail: Promise<void> = Promise.resolve();

  run<Result>(operation: () => Promise<Result>): Promise<Result> {
    const previous = this.tail;
    let release: () => void = () => {};
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    return (async () => {
      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    })();
  }

  runForProject<Result>(
    projectDirectory: string,
    operation: () => Promise<Result>,
    timeoutMs = 5000,
  ): Promise<Result> {
    return this.run(async () => {
      const release = await acquireRegistryLock(branchLockPath(projectDirectory), {
        timeoutMs,
        busyMessage: "Another Git branch operation is running.",
      });
      try {
        return await operation();
      } finally {
        await release();
      }
    });
  }
}
