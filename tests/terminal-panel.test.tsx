// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TerminalPrompt,
  TerminalSession,
  TerminalTranscript,
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
});
