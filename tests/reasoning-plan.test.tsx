// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentPlan, AgentReasoning, ProposedPlan } from "../src";

afterEach(cleanup);

const steps = [
  { status: "completed" as const, step: "Inspect the component model" },
  { status: "in_progress" as const, step: "Implement plan states" },
  { status: "pending" as const, step: "Run desktop acceptance" },
];

describe("AgentReasoning", () => {
  it("opens running reasoning and collapses completed reasoning by default", () => {
    const running = renderToStaticMarkup(
      <AgentReasoning status="running">Inspecting files.</AgentReasoning>,
    );
    const completed = renderToStaticMarkup(
      <AgentReasoning status="completed">Inspected files.</AgentReasoning>,
    );

    expect(running).toContain("<details");
    expect(running).toContain(" open=\"\"");
    expect(running).toContain("Thinking");
    expect(completed).not.toContain(" open=\"\"");
    expect(completed).toContain("Thought");
  });

  it("supports a controlled disclosure state", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <AgentReasoning
        onOpenChange={onOpenChange}
        open={false}
        status="completed"
      >
        Finished reasoning.
      </AgentReasoning>,
    );
    const details = container.querySelector("details")!;
    const summary = container.querySelector("summary")!;

    fireEvent.click(summary);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(details.open).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("AgentPlan", () => {
  it("renders progress, status semantics, and the current step", () => {
    const { container } = render(
      <AgentPlan aria-label="Implementation plan" steps={steps} />,
    );

    expect(screen.getByText("1 out of 3 tasks completed")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "1 out of 3 tasks completed" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(
      screen
        .getByText("Implement plan states")
        .closest("li")
        ?.getAttribute("aria-current"),
    ).toBe("step");
    expect(
      screen
        .getByText("Inspect the component model")
        .closest("li")
        ?.getAttribute("data-status"),
    ).toBe("completed");
    expect(container.querySelectorAll(".codex-ui-plan__step")).toHaveLength(3);
    expect(
      container.querySelector(".codex-ui-plan__steps")?.getAttribute("tabindex"),
    ).toBe("0");
  });

  it("collapses and expands with a semantic button", () => {
    render(<AgentPlan steps={steps} />);
    const button = screen.getByRole("button", {
      name: "1 out of 3 tasks completed",
    });

    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(
      screen
        .getByText("Run desktop acceptance")
        .closest("[hidden]")
        ?.hasAttribute("hidden"),
    ).toBe(true);

    fireEvent.click(button);
    expect(screen.getByText("Run desktop acceptance")).toBeTruthy();
  });
});

describe("ProposedPlan", () => {
  it("defaults writing plans to a collapsed state", () => {
    render(
      <ProposedPlan status="writing">
        <p>Streaming plan content</p>
      </ProposedPlan>,
    );

    expect(screen.getByText("Writing plan")).toBeTruthy();
    expect(
      screen
        .getByText("Streaming plan content")
        .closest("[hidden]")
        ?.hasAttribute("hidden"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Expand plan summary" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("does not override the uncontrolled disclosure when writing completes", () => {
    const { rerender } = render(
      <ProposedPlan status="writing">
        <p>Plan content</p>
      </ProposedPlan>,
    );

    rerender(
      <ProposedPlan status="completed">
        <p>Plan content</p>
      </ProposedPlan>,
    );

    expect(
      screen
        .getByRole("button", { name: "Expand plan summary" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      screen.getByText("Plan content").closest("[hidden]")?.hasAttribute("hidden"),
    ).toBe(true);
  });

  it("shows completed actions and copy feedback", async () => {
    const onCopy = vi.fn(async () => undefined);
    const onDownload = vi.fn();
    render(
      <ProposedPlan
        onCopy={onCopy}
        onDownload={onDownload}
        status="completed"
      >
        <p>Completed plan content</p>
      </ProposedPlan>,
    );

    expect(screen.getByText("Completed plan content")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy plan" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Download plan" }));
    expect(onDownload).toHaveBeenCalledOnce();
  });
});
