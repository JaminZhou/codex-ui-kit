import { describe, expect, it, vi } from "vitest";
import { LiveTerminalManager, type LiveTerminalEvent, type TerminalExecutionResult, type TerminalTransport } from "../electron/live-terminal";

function setup(writeOptIn?: string) {
  let finish!: (result: TerminalExecutionResult) => void;
  let fail!: (error: Error) => void;
  const completion = new Promise<TerminalExecutionResult>((resolve, reject) => { finish = resolve; fail = reject; });
  const transport: TerminalTransport = { execute: vi.fn(() => completion), write: vi.fn(async () => ({})), terminate: vi.fn(async () => ({})) };
  const events: LiveTerminalEvent[] = [];
  const manager = new LiveTerminalManager(transport, new Map([["selected", "/projects/selected"]]), event => events.push(event), writeOptIn);
  const input = { sessionId: "terminal-1", projectToken: "selected", command: "echo hello" };
  return { manager, transport, events, input, finish, fail };
}

describe("live terminal host ownership", () => {
  it("uses the trusted path, generated process id and host policy, ignoring injected options", () => {
    const { manager, transport, input } = setup();
    const { processId } = manager.start({ ...input, cwd: "/elsewhere", processId: "forged", sandboxPolicy: { type: "dangerFullAccess" } });
    expect(processId).not.toBe("forged");
    expect(transport.execute).toHaveBeenCalledWith(expect.objectContaining({
      cwd: "/projects/selected", processId, command: ["/bin/zsh", "-c", "echo hello"],
      sandboxPolicy: { type: "readOnly", networkAccess: false },
    }));
    manager.dispose();
  });

  it("allows workspace writes only through the captured host choice", () => {
    const { manager, transport, input } = setup("1");
    manager.start(input);
    expect(transport.execute).toHaveBeenCalledWith(expect.objectContaining({ sandboxPolicy: expect.objectContaining({ type: "workspaceWrite", writableRoots: ["/projects/selected"], networkAccess: false }) }));
    manager.dispose();
  });

  it("rejects untrusted projects, malformed commands and concurrent same-session starts", () => {
    const { manager, input, transport } = setup();
    for (const value of [null, {}, { ...input, projectToken: "unknown" }, { ...input, command: " " }, { ...input, command: "\0" }, { ...input, command: "x".repeat(65537) }]) {
      expect(() => manager.start(value)).toThrow();
    }
    expect(transport.execute).not.toHaveBeenCalled();
    manager.start(input);
    expect(() => manager.start(input)).toThrow("already running");
    manager.dispose();
  });

  it("decodes split UTF-8 per stream and retains truncation and nonzero exit", async () => {
    const { manager, events, input, finish } = setup();
    const { processId } = manager.start(input);
    const bytes = Buffer.from("你好");
    for (const chunk of [bytes.subarray(0, 2), bytes.subarray(2)]) {
      manager.output({ processId, stream: "stdout", deltaBase64: chunk.toString("base64"), capReached: false });
    }
    manager.output({ processId: "foreign", stream: "stdout", deltaBase64: Buffer.from("foreign").toString("base64"), capReached: false });
    manager.output({ processId, stream: "stderr", deltaBase64: "", capReached: true });
    finish({ exitCode: 7, stdout: "", stderr: "" });
    await Promise.resolve();
    expect(events.filter(event => event.kind === "output")).toEqual([
      { kind: "output", sessionId: input.sessionId, processId, stream: "stdout", text: "你好", truncated: false },
      { kind: "output", sessionId: input.sessionId, processId, stream: "stderr", text: "", truncated: true },
    ]);
    expect(events.at(-1)).toMatchObject({ kind: "completed", exitCode: 7 });
    await expect(manager.stop(input.sessionId)).rejects.toThrow("no running process");
  });

  it("routes stdin and stop by owned session rather than arbitrary process id", async () => {
    const { manager, input, transport } = setup();
    const { processId } = manager.start(input);
    await manager.write(input.sessionId, "hello\n");
    expect(transport.write).toHaveBeenCalledWith(processId, Buffer.from("hello\n").toString("base64"));
    await manager.stop(input.sessionId);
    expect(transport.terminate).toHaveBeenCalledWith(processId);
    await expect(manager.write("foreign", "x")).rejects.toThrow();
    await expect(manager.write(input.sessionId, "x".repeat(65537))).rejects.toThrow();
    manager.dispose();
  });

  it("reports transport failures and permits a subsequent command", async () => {
    const { manager, input, fail, events } = setup();
    manager.start(input);
    fail(new Error("Sandbox rejected command"));
    await Promise.resolve();
    expect(events.at(-1)).toMatchObject({ kind: "failed", message: "Sandbox rejected command" });
    expect(() => manager.start(input)).not.toThrow();
    manager.dispose();
  });

  it("suppresses late callbacks after the owning connection is disposed", async () => {
    const { manager, input, finish, events } = setup();
    const { processId } = manager.start(input);
    manager.dispose();
    manager.output({ processId, stream: "stdout", deltaBase64: "eA==", capReached: false });
    finish({ exitCode: 0, stdout: "late", stderr: "" });
    await Promise.resolve();
    expect(events).toHaveLength(1);
    expect(() => manager.start(input)).toThrow("closed");
  });
});
