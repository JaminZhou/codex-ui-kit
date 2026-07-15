import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ActivityGroup,
  AgentActivity,
  AgentMessage,
  AgentThread,
  ToolCallCard,
} from "../src";

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

  it("marks user messages as navigable bubbles", () => {
    const html = renderToStaticMarkup(
      <AgentMessage role="user">Please run the tests.</AgentMessage>,
    );

    expect(html).toContain("data-user-message-bubble");
    expect(html).toContain('data-role="user"');
  });

  it("renders a responsive thread with grouped activities", () => {
    const html = renderToStaticMarkup(
      <AgentThread width="narrow" aria-label="Example thread">
        <ActivityGroup>
          <AgentActivity status="completed" summary="Read files" />
          <AgentActivity status="running" summary="Running checks" />
        </ActivityGroup>
      </AgentThread>,
    );

    expect(html).toContain('data-width="narrow"');
    expect(html).toContain("codex-ui-activity-group");
    expect(html).toContain('data-status="running"');
  });

  it("uses native disclosure semantics for activity details", () => {
    const html = renderToStaticMarkup(
      <AgentActivity
        defaultOpen
        detail="2 files"
        kind="file-change"
        status="completed"
        summary="Changed files"
      >
        <span>src/index.ts</span>
      </AgentActivity>,
    );

    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain('data-kind="file-change"');
    expect(html).toContain("src/index.ts");
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
    expect(html).toContain("codex-ui-activity__description");
    expect(html).not.toContain("<details");
  });
});
