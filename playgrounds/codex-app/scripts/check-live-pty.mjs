import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAppServerClient } from "@jaminzhou/codex-app-server-client";
import { LiveTerminalManager } from "../dist-electron/live-terminal.js";

// Explicit opt-in runtime probe. No model turn and no workspace write permission.
const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-pty-"));
const client = new CodexAppServerClient({
  clientInfo: { name: "ui_kit_live_pty_check", title: "UI Kit PTY Check", version: "0.0.0" },
  protocolValidation: "strict",
});
const events = [];
let output = "";
const manager = new LiveTerminalManager({
  execute: input => client.call("command/exec", input),
  write: (processId, deltaBase64) => client.call("command/exec/write", { processId, deltaBase64 }),
  resize: (processId, size) => client.call("command/exec/resize", { processId, size }),
  terminate: processId => client.call("command/exec/terminate", { processId }),
}, new Map([["probe", directory]]), event => {
  events.push(event);
  if (event.kind === "output") output += event.text;
});
client.onNotification("command/exec/outputDelta", params => manager.output(params));
const sessionId = "persistent-probe";
async function until(predicate) {
  const deadline = Date.now() + 15000;
  while (!predicate()) {
    const failure = events.find(event => event.kind === "failed");
    if (failure) throw new Error(failure.message);
    if (Date.now() >= deadline) throw new Error(`PTY assertion timed out: ${output}`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
try {
  await client.connect();
  manager.openShell({ sessionId, projectToken: "probe", size: { cols: 80, rows: 24 } });
  await until(() => output.length > 0);
  await manager.write(sessionId, "unsetopt zle; stty -echo; export UI_KIT_PERSIST=retained; cd /tmp; printf '\\nREADY_%s\\n' shell\r");
  await until(() => output.includes("READY_shell"));
  output = "";
  await manager.write(sessionId, "printf 'STATE:%s:%s\\n' \"$UI_KIT_PERSIST\" \"$PWD\"\r");
  await until(() => output.includes("STATE:retained:/tmp"));
  await manager.resize(sessionId, { cols: 100, rows: 30 });
  output = "";
  await manager.write(sessionId, "stty size\r");
  await until(() => /30\s+100/.test(output));
  await manager.write(sessionId, "printf 'BUSY_%s\\n' ready; sleep 30\r");
  await until(() => output.includes("BUSY_ready"));
  await manager.write(sessionId, "\u0003");
  await manager.write(sessionId, "printf 'AFTER_%s\\n' interrupt\r");
  await until(() => output.includes("AFTER_interrupt"));
  await manager.write(sessionId, "exit 0\r");
  await until(() => events.some(event => event.kind === "completed"));
  assert.equal(events.at(-1).exitCode, 0);
  const result = { passed: true, retainedDirectoryAndEnvironment: true, resized: true, interruptedAndResumed: true, modelTurns: 0, events };
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, events: undefined, directory }));
} finally {
  manager.dispose();
  await client.close();
}
