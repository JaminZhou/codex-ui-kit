import { randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { liveWorkspacePolicy } from "./live-workspace-policy.js";

export interface TerminalExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface TerminalExecutionRequest {
  command: string[];
  cwd: string;
  processId: string;
  streamStdin: true;
  streamStdoutStderr: true;
  timeoutMs: number;
  outputBytesCap: number;
  sandboxPolicy: ReturnType<typeof liveWorkspacePolicy>["sandboxPolicy"];
}

export interface TerminalTransport {
  execute(input: TerminalExecutionRequest): Promise<TerminalExecutionResult>;
  write(processId: string, deltaBase64: string): Promise<unknown>;
  terminate(processId: string): Promise<unknown>;
}

export type LiveTerminalEvent =
  | { kind: "started"; sessionId: string; processId: string; command: string }
  | { kind: "output"; sessionId: string; processId: string; stream: "stdout" | "stderr"; text: string; truncated: boolean }
  | { kind: "completed"; sessionId: string; processId: string; exitCode: number }
  | { kind: "failed"; sessionId: string; processId: string; message: string };

interface RunningTerminal {
  sessionId: string;
  processId: string;
  decoders: Record<"stdout" | "stderr", StringDecoder>;
}

/** One manager belongs to one host transport connection and trusted renderer.
 * Project paths, process ids, shell choice, and sandbox policy stay host-owned.
 */
export class LiveTerminalManager {
  private readonly running = new Map<string, RunningTerminal>();
  private closed = false;

  constructor(
    private readonly transport: TerminalTransport,
    private readonly projects: ReadonlyMap<string, string>,
    private readonly emit: (event: LiveTerminalEvent) => void,
    private readonly writeOptIn?: string,
  ) {}

  start(input: unknown): { processId: string } {
    if (this.closed) throw new Error("The terminal connection is closed.");
    if (!input || typeof input !== "object") throw new TypeError("Terminal input is required.");
    const { sessionId, projectToken, command } = input as Record<string, unknown>;
    if (typeof sessionId !== "string" || !sessionId || sessionId.length > 200) {
      throw new TypeError("A terminal session id is required.");
    }
    if (this.running.has(sessionId)) throw new Error("This terminal is already running.");
    const cwd = typeof projectToken === "string" ? this.projects.get(projectToken) : undefined;
    if (!cwd) throw new TypeError("Select a host-owned local project.");
    if (typeof command !== "string" || !command.trim() || command.length > 65536 || command.includes("\0")) {
      throw new TypeError("A non-empty terminal command of at most 65536 characters is required.");
    }
    const sandboxPolicy = liveWorkspacePolicy(cwd, this.writeOptIn).sandboxPolicy;
    const processId = randomUUID();
    const running: RunningTerminal = {
      sessionId, processId,
      decoders: { stdout: new StringDecoder("utf8"), stderr: new StringDecoder("utf8") },
    };
    this.running.set(sessionId, running);
    this.emit({ kind: "started", sessionId, processId, command });
    // Dispatch synchronously so any subsequent control request is sent after exec.
    let completion: Promise<TerminalExecutionResult>;
    try {
      completion = this.transport.execute({
        command: ["/bin/zsh", "-c", command], cwd, processId,
        streamStdin: true, streamStdoutStderr: true,
        timeoutMs: 120000, outputBytesCap: 1024 * 1024, sandboxPolicy,
      });
    } catch (error) {
      completion = Promise.reject(error);
    }
    void completion.then(result => {
      if (!this.isCurrent(running)) return;
      this.flush(running);
      // The streaming API normally returns empty captures. Preserve nonempty
      // buffered output rather than silently dropping a transport variant.
      for (const stream of ["stdout", "stderr"] as const) {
        if (result[stream]) this.emit({ kind: "output", sessionId, processId, stream, text: result[stream], truncated: false });
      }
      this.running.delete(sessionId);
      this.emit({ kind: "completed", sessionId, processId, exitCode: result.exitCode });
    }, error => {
      if (!this.isCurrent(running)) return;
      this.flush(running);
      this.running.delete(sessionId);
      this.emit({ kind: "failed", sessionId, processId, message: error instanceof Error ? error.message : String(error) });
    });
    return { processId };
  }

  output(input: { processId: string; stream: "stdout" | "stderr"; deltaBase64: string; capReached: boolean }) {
    const running = [...this.running.values()].find(item => item.processId === input.processId);
    if (!running || this.closed) return;
    const text = running.decoders[input.stream].write(Buffer.from(input.deltaBase64, "base64"));
    if (text || input.capReached) this.emit({ kind: "output", sessionId: running.sessionId, processId: running.processId, stream: input.stream, text, truncated: input.capReached });
  }

  async write(sessionId: string, text: string) {
    const running = this.requireRunning(sessionId);
    if (typeof text !== "string" || Buffer.byteLength(text) > 65536) throw new TypeError("Terminal input exceeds 64 KiB.");
    await this.transport.write(running.processId, Buffer.from(text).toString("base64"));
  }

  async stop(sessionId: string) {
    await this.transport.terminate(this.requireRunning(sessionId).processId);
  }

  /** Invalidate callbacks before closing the owning App Server connection.
   * The caller must close that connection to terminate its remaining processes.
   */
  dispose() {
    this.closed = true;
    this.running.clear();
  }

  private requireRunning(sessionId: string) {
    const running = this.closed ? undefined : this.running.get(sessionId);
    if (!running) throw new Error("This terminal has no running process.");
    return running;
  }

  private isCurrent(running: RunningTerminal) {
    return !this.closed && this.running.get(running.sessionId) === running;
  }

  private flush(running: RunningTerminal) {
    for (const stream of ["stdout", "stderr"] as const) {
      const text = running.decoders[stream].end();
      if (text) this.emit({ kind: "output", sessionId: running.sessionId, processId: running.processId, stream, text, truncated: false });
    }
  }
}
