// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TerminalPanel,
  TerminalPrompt,
  TerminalProcessList,
  TerminalSession,
  TerminalTranscript,
  TerminalWorkspaceMismatchNotice,
} from "../src";

afterEach(cleanup);

describe("terminal panel", () => {
  it("renders typed transcript entries as an accessible log", () => {
    render(
      <TerminalTranscript
        entries={[
          { id: "command", kind: "command", text: "pnpm check" },
          { id: "stdout", text: "440 tests passed" },
          { id: "stderr", kind: "stderr", text: "warning" },
          { id: "system", kind: "system", text: "process exited" },
        ]}
        label="Build terminal output"
      />,
    );

    const log = screen.getByRole("log", {
      name: "Build terminal output",
    });
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(log.querySelectorAll("[data-kind]")).toHaveLength(4);
    expect(
      log.querySelector('[data-kind="stderr"]')?.textContent,
    ).toBe("warning");
    expect(
      log.querySelector('[data-kind="system"]')?.textContent,
    ).toBe("process exited");
  });

  it("keeps command entry controlled and host-owned", () => {
    const onCommandSubmit = vi.fn();
    function Fixture() {
      const [value, setValue] = useState("");
      return (
        <TerminalPrompt
          inputLabel="Terminal input"
          onCommandSubmit={onCommandSubmit}
          onValueChange={setValue}
          prompt="%"
          value={value}
        />
      );
    }
    render(<Fixture />);

    const input = screen.getByRole("textbox", {
      name: "Terminal input",
    });
    fireEvent.change(input, { target: { value: "pnpm check" } });
    expect(input.getAttribute("value")).toBe("pnpm check");
    fireEvent.submit(input.closest("form")!);
    expect(onCommandSubmit).toHaveBeenCalledWith("pnpm check");
  });

  it("composes transcript, prompt, and session status", () => {
    render(
      <TerminalSession
        entries={[{ id: "ready", text: "Ready" }]}
        inputDisabled
        label="Workspace terminal"
        status="running"
        value=""
      />,
    );

    const session = screen.getByRole("region", {
      name: "Workspace terminal",
    });
    expect(session.getAttribute("data-status")).toBe("running");
    expect(
      screen.getByRole("log", { name: "Terminal output" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Terminal input" }).hasAttribute(
        "disabled",
      ),
    ).toBe(true);
  });

  it("coordinates multiple controlled sessions, close, create, and restore", () => {
    const onActiveSessionChange = vi.fn();
    const onCloseSession = vi.fn();
    const onCommandSubmit = vi.fn();
    const onCreateSession = vi.fn();
    const onRestoreSession = vi.fn();
    const onSessionValueChange = vi.fn();
    const { rerender } = render(
      <TerminalPanel
        activeSessionId="dev"
        onActiveSessionChange={onActiveSessionChange}
        onCloseSession={onCloseSession}
        onCommandSubmit={onCommandSubmit}
        onCreateSession={onCreateSession}
        onRestoreSession={onRestoreSession}
        onSessionValueChange={onSessionValueChange}
        sessions={[
          {
            entries: [{ id: "dev-ready", text: "Ready" }],
            id: "dev",
            label: "codex-ui-kit 1",
            status: "running",
            value: "q",
          },
          {
            entries: [{ id: "test-failed", kind: "stderr", text: "Failed" }],
            id: "test",
            label: "codex-ui-kit 2",
            status: "failed",
            value: "",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("tab", {
        name: "codex-ui-kit 1, Running",
        selected: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("tab", {
        name: "codex-ui-kit 2, Failed",
        selected: false,
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("tab", { name: "codex-ui-kit 1, Running" })
        .textContent?.startsWith("●"),
    ).toBe(true);
    expect(
      screen
        .getByRole("tab", { name: "codex-ui-kit 2, Failed" })
        .textContent?.startsWith("!"),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("tab", {
        name: "codex-ui-kit 2, Failed",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Close codex-ui-kit 2 tab",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open bottom panel tab" }),
    );
    const input = screen.getByRole("textbox", { name: "Terminal input" });
    fireEvent.change(input, { target: { value: "quit" } });
    fireEvent.submit(input.closest("form")!);

    expect(onActiveSessionChange).toHaveBeenCalledWith("test");
    expect(onCloseSession).toHaveBeenCalledWith("test");
    expect(onCreateSession).toHaveBeenCalledOnce();
    expect(onSessionValueChange).toHaveBeenCalledWith("dev", "quit");
    expect(onCommandSubmit).toHaveBeenCalledWith("dev", "q");

    rerender(
      <TerminalPanel
        activeSessionId=""
        onActiveSessionChange={onActiveSessionChange}
        onRestoreSession={onRestoreSession}
        sessions={[]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Restore last terminal" }),
    );
    expect(onRestoreSession).toHaveBeenCalledOnce();
  });

  it("supports current plain tab labels and workspace mismatch recovery", () => {
    const onDismiss = vi.fn();
    const onOpenNewTerminal = vi.fn();
    render(
      <TerminalPanel
        activeSessionId="current"
        onActiveSessionChange={() => undefined}
        sessions={[
          {
            entries: [],
            id: "current",
            label: "codex-ui-kit",
            notice: (
              <TerminalWorkspaceMismatchNotice
                onDismiss={onDismiss}
                onOpenNewTerminal={onOpenNewTerminal}
              />
            ),
            showStatus: false,
            status: "idle",
            value: "",
          },
        ]}
      />,
    );

    const tab = screen.getByRole("tab", {
      name: "codex-ui-kit",
      selected: true,
    });
    expect(tab.textContent?.endsWith("codex-ui-kit")).toBe(true);
    expect(
      screen.getByRole("status").textContent,
    ).toContain(
      "This terminal's workspace does not match this chat's current worktree",
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Open new terminal" }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onOpenNewTerminal).toHaveBeenCalledOnce();
  });

  it("omits workspace mismatch actions without handlers", () => {
    const onOpenNewTerminal = vi.fn();
    const { rerender } = render(
      <TerminalWorkspaceMismatchNotice
        onOpenNewTerminal={onOpenNewTerminal}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Open new terminal" }),
    );
    expect(onOpenNewTerminal).toHaveBeenCalledOnce();

    rerender(<TerminalWorkspaceMismatchNotice />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("lists background process lifecycle without owning process actions", () => {
    const onOpenProcess = vi.fn();
    const onStopAll = vi.fn();
    const onStopProcess = vi.fn();
    const { rerender } = render(
      <TerminalProcessList
        onOpenProcess={onOpenProcess}
        onStopAll={onStopAll}
        onStopProcess={onStopProcess}
        processes={[
          {
            detail: "pnpm dev",
            id: "dev",
            label: "Development server",
            status: "running",
          },
          {
            detail: "pnpm test",
            id: "test",
            label: "Test run",
            status: "failed",
          },
          {
            id: "docs",
            label: "Docs",
            status: "exited",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Background processes" }),
    ).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
    expect(screen.getByText("Exited")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Development server pnpm dev Running",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Stop Development server" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Stop all background terminals",
      }),
    );
    expect(onOpenProcess).toHaveBeenCalledWith("dev");
    expect(onStopProcess).toHaveBeenCalledWith("dev");
    expect(onStopAll).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Stop Test run" }),
    ).toBeNull();

    rerender(<TerminalProcessList processes={[]} />);
    expect(screen.getByText("No background processes")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Stop all background terminals",
      }),
    ).toBeNull();
  });
});
