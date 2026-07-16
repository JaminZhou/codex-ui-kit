// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommandExecution,
  CommandOutput,
  formatCommandDuration,
} from "../src";

afterEach(cleanup);

describe("formatCommandDuration", () => {
  it.each([
    [0, null],
    [999, null],
    [1_000, "1s"],
    [59_999, "59s"],
    [60_000, "1m 0s"],
    [61_000, "1m 1s"],
    [3_600_000, "1h 0m 0s"],
    [86_401_000, "1d 0h 0m 1s"],
  ])("formats %i milliseconds as %s", (durationMs, expected) => {
    expect(formatCommandDuration(durationMs)).toBe(expected);
  });
});

describe("CommandExecution", () => {
  it("renders the collapsed completed summary and success footer", () => {
    const html = renderToStaticMarkup(
      <CommandExecution
        command="pnpm check"
        cwd="/workspace/ui"
        durationMs={61_000}
        exitCode={0}
        status="completed"
      >
        <CommandOutput>Tests passed</CommandOutput>
      </CommandExecution>,
    );

    expect(html).toContain("Ran ");
    expect(html).toContain("pnpm check");
    expect(html).toContain("for 1m 1s");
    expect(html).toContain('title="cwd\n/workspace/ui"');
    expect(html).toContain("Success");
    expect(html).toContain('aria-label="Standard output"');
    expect(html).not.toContain(" open=");
  });

  it("uses the generic status while expanded and exposes the embedded shell", () => {
    const { container } = render(
      <CommandExecution
        command="pnpm check"
        defaultOpen
        durationMs={2_000}
        exitCode={0}
        status="completed"
      >
        <CommandOutput>All checks passed</CommandOutput>
      </CommandExecution>,
    );

    expect(container.querySelector("details")?.open).toBe(true);
    expect(
      container.querySelector(".codex-ui-activity__summary")?.textContent,
    ).toBe(
      "Ran command for 2s",
    );
    expect(screen.getByRole("button", { name: "$ pnpm check" })).toBeTruthy();
    expect(screen.getByText("All checks passed")).toBeTruthy();
  });

  it("renders running, interrupted, and background-terminal language", () => {
    const running = renderToStaticMarkup(
      <CommandExecution
        command="pnpm test"
        durationMs={5_000}
        status="running"
      />,
    );
    const interrupted = renderToStaticMarkup(
      <CommandExecution
        command="pnpm test"
        durationMs={8_000}
        status="interrupted"
      />,
    );
    const background = renderToStaticMarkup(
      <CommandExecution
        command="vite --host"
        durationMs={90_000}
        status="background-running"
      />,
    );

    expect(running).toContain("Running command");
    expect(running).toContain("for 5s");
    expect(interrupted).toContain("Stopped ");
    expect(interrupted).toContain("for 8s");
    expect(interrupted).toContain("Stopped</div>");
    expect(background).toContain("Started background terminal with");
    expect(background).not.toContain("for 1m 30s");
  });

  it("renders failed and unknown exit-code footers", () => {
    const failed = renderToStaticMarkup(
      <CommandExecution command="pnpm lint" exitCode={1} status="failed">
        <CommandOutput stream="stderr">Lint failed</CommandOutput>
      </CommandExecution>,
    );
    const unknown = renderToStaticMarkup(
      <CommandExecution command="task" status="completed" />,
    );

    expect(failed).toContain('data-stream="stderr"');
    expect(failed).toContain('aria-label="Standard error"');
    expect(failed).toContain("Exit code 1");
    expect(failed).toContain(
      '<span class="codex-ui-activity__summary">Ran <span class="codex-ui-command-execution__summary-command">pnpm lint</span></span>',
    );
    expect(unknown).toContain("Exit code unknown");
  });

  it("keeps a controlled disclosure stable", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <CommandExecution
        command="pwd"
        onOpenChange={onOpenChange}
        open={false}
        status="running"
      />,
    );

    fireEvent.click(container.querySelector("summary")!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")?.open).toBe(false);
  });

  it("can hide the raw shell while retaining a host summary", () => {
    const html = renderToStaticMarkup(
      <CommandExecution
        command="private transport command"
        hideRawCommand
        status="completed"
        summary="Ran a build task"
      />,
    );

    expect(html).toContain("Ran a build task");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("private transport command");
  });

  it("expands long commands and delegates copy actions", () => {
    const onCopyCommand = vi.fn();
    const onCopyOutput = vi.fn();
    const { container } = render(
      <CommandExecution
        command="pnpm --filter @codex-ui-kit/electron-playground check"
        defaultOpen
        onCopyCommand={onCopyCommand}
        status="completed"
      >
        <CommandOutput onCopy={onCopyOutput}>Renderer built</CommandOutput>
      </CommandExecution>,
    );
    const commandLine = screen.getByRole("button", {
      name: "$ pnpm --filter @codex-ui-kit/electron-playground check",
    });

    fireEvent.keyDown(commandLine, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy output" }));

    expect(commandLine.getAttribute("aria-expanded")).toBe("true");
    expect(
      container
        .querySelector(".codex-ui-command-execution__shell")
        ?.hasAttribute("data-command-expanded"),
    ).toBe(true);
    expect(onCopyCommand).toHaveBeenCalledWith(
      "pnpm --filter @codex-ui-kit/electron-playground check",
    );
    expect(onCopyOutput).toHaveBeenCalledWith("Renderer built");
  });
});

describe("CommandOutput", () => {
  it("uses the no-output placeholder for empty and whitespace-only streams", () => {
    const empty = renderToStaticMarkup(<CommandOutput />);
    const whitespace = renderToStaticMarkup(<CommandOutput>{"  \n"}</CommandOutput>);

    expect(empty).toContain('data-empty="true"');
    expect(empty).toContain("No output");
    expect(whitespace).toContain('data-empty="true"');
    expect(whitespace).not.toContain("Copy output");
  });
});
