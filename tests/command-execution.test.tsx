import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandExecution, CommandOutput } from "../src";

describe("CommandExecution", () => {
  it("renders command context, output, and an exit code", () => {
    const html = renderToStaticMarkup(
      <CommandExecution
        command="pnpm check"
        cwd="/workspace/ui"
        defaultOpen
        exitCode={0}
        status="completed"
      >
        <CommandOutput>Tests passed</CommandOutput>
      </CommandExecution>,
    );

    expect(html).toContain('data-kind="command"');
    expect(html).toContain("pnpm check");
    expect(html).toContain("/workspace/ui");
    expect(html).toContain("Exit 0");
    expect(html).toContain("<details");
    expect(html).toContain(" open=");
    expect(html).toContain('aria-label="Standard output"');
    expect(html).toContain("Tests passed");
  });

  it("labels stderr independently from the execution status", () => {
    const html = renderToStaticMarkup(
      <CommandExecution command="pnpm lint" exitCode={1} status="failed">
        <CommandOutput stream="stderr">Lint failed</CommandOutput>
      </CommandExecution>,
    );

    expect(html).toContain('data-status="failed"');
    expect(html).toContain('data-stream="stderr"');
    expect(html).toContain('aria-label="Standard error"');
    expect(html).toContain("Exit 1");
  });

  it("stays compact when no execution detail is supplied", () => {
    const html = renderToStaticMarkup(
      <CommandExecution command="pwd" status="running" />,
    );

    expect(html).not.toContain("<details");
    expect(html).toContain("Running");
  });
});
