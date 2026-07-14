import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentMessage, ToolCallCard } from "../src";

describe("components", () => {
  it("renders an agent message with semantic state", () => {
    const html = renderToStaticMarkup(
      <AgentMessage role="assistant" status="completed">
        Finished the task.
      </AgentMessage>,
    );

    expect(html).toContain('data-role="assistant"');
    expect(html).toContain('data-status="completed"');
    expect(html).toContain("Finished the task.");
  });

  it("renders a tool call summary", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        name="shell"
        status="running"
        summary="Running the test suite"
      />,
    );

    expect(html).toContain("shell");
    expect(html).toContain("Running the test suite");
  });
});

