// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SubagentActivity,
  SubagentActivityGroup,
  SubagentPanel,
  SubagentSummary,
  SubagentTranscriptHeader,
  type SubagentActivityItem,
  type SubagentItem,
} from "../src";

const activeAgent: SubagentItem = {
  id: "thread-researcher",
  lastMessage: "Mapped the renderer states and interaction labels.",
  name: "Researcher",
  status: "active",
  timestamp: "now",
};

const doneAgent: SubagentItem = {
  additions: 18,
  deletions: 3,
  id: "thread-builder",
  name: "Builder",
  status: "done",
  statusSummary: "Implemented the component boundary.",
};

afterEach(cleanup);

describe("SubagentActivity", () => {
  it.each([
    ["active", "Researcher started working"],
    ["updated", "Researcher updated"],
    ["interrupted", "Researcher interrupted"],
    ["done", "Researcher finished"],
  ] as const)("renders %s language", (activityStatus, label) => {
    const item: SubagentActivityItem = {
      activityStatus,
      id: "thread-researcher",
      name: "Researcher",
    };
    const html = renderToStaticMarkup(<SubagentActivity item={item} />);

    expect(html).toContain(label);
    expect(html).toContain(`data-status="${activityStatus}"`);
  });

  it("delegates opening from an accessible activity row", () => {
    const onOpen = vi.fn();
    const item: SubagentActivityItem = {
      activityStatus: "updated",
      id: "thread-builder",
      name: "Builder",
    };
    render(<SubagentActivity item={item} onOpen={onOpen} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open Builder subagent" }),
    );
    expect(onOpen).toHaveBeenCalledWith(item);
  });
});

describe("SubagentActivityGroup", () => {
  const items: SubagentActivityItem[] = [
    { activityStatus: "active", id: "one", name: "Researcher" },
    { activityStatus: "updated", id: "two", name: "Builder" },
    { activityStatus: "active", id: "three", name: "Reviewer" },
    { activityStatus: "active", id: "four", name: "Tester" },
  ];

  it("caps visible chips at three and reports hidden agents", () => {
    const html = renderToStaticMarkup(
      <SubagentActivityGroup items={items} />,
    );

    expect(html.match(/codex-ui-subagent-activity-group__chip/g)).toHaveLength(3);
    expect(html).toContain("and 1 other subagent updated");
    expect(html).not.toContain("Tester</span>");
  });

  it("uses interruption priority for a mixed group", () => {
    const html = renderToStaticMarkup(
      <SubagentActivityGroup
        items={[
          items[0],
          { activityStatus: "interrupted", id: "two", name: "Builder" },
        ]}
      />,
    );

    expect(html).toContain("interrupted");
  });
});

describe("SubagentSummary", () => {
  it("groups inline agents and keeps regular agents as rows", () => {
    const html = renderToStaticMarkup(
      <SubagentSummary
        items={[
          { ...activeAgent, presentation: "grouped" },
          { ...doneAgent, presentation: "grouped" },
          { ...doneAgent, id: "thread-reviewer", name: "Reviewer" },
        ]}
      />,
    );

    expect(html).toContain("1 working");
    expect(html).toContain("1 done");
    expect(html).toContain("Reviewer");
    expect(html).toContain("+18");
    expect(html).toContain("−3");
  });

  it("auto-collapses a completed row-only section", () => {
    const html = renderToStaticMarkup(<SubagentSummary items={[doneAgent]} />);

    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Builder");
  });

  it("keeps controlled disclosure state stable", () => {
    const onOpenChange = vi.fn();
    render(
      <SubagentSummary
        items={[activeAgent]}
        onOpenChange={onOpenChange}
        open={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Subagents/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByText("Researcher")).toBeNull();
  });

  it("opens grouped agents individually when no overview action exists", () => {
    const onOpenSubagent = vi.fn();
    const groupedAgent = { ...activeAgent, presentation: "grouped" as const };
    render(
      <SubagentSummary
        items={[groupedAgent]}
        onOpenSubagent={onOpenSubagent}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Researcher" }));
    expect(onOpenSubagent).toHaveBeenCalledWith(groupedAgent);
  });
});

describe("SubagentPanel", () => {
  it("separates active and done agents with observed fallback copy", () => {
    render(
      <SubagentPanel
        items={[
          activeAgent,
          { id: "waiting", name: "Planner", status: "waiting" },
          doneAgent,
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Active" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Done · 1" })).toBeTruthy();
    expect(screen.getByText("Thinking")).toBeTruthy();
    expect(
      screen.getByText("Mapped the renderer states and interaction labels."),
    ).toBeTruthy();
  });

  it("paginates active agents in four-item increments", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      id: `agent-${index}`,
      name: `Agent ${index + 1}`,
      status: "active" as const,
    }));
    render(<SubagentPanel items={items} />);

    expect(screen.getAllByRole("button", { name: /Agent/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(screen.getAllByRole("button", { name: /Agent/ })).toHaveLength(6);
  });

  it("delegates item selection", () => {
    const onSelect = vi.fn();
    render(<SubagentPanel items={[activeAgent]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Researcher/ }));
    expect(onSelect).toHaveBeenCalledWith(activeAgent);
  });
});

describe("SubagentTranscriptHeader", () => {
  it("renders the selected name and delegates back navigation", () => {
    const onBack = vi.fn();
    render(
      <SubagentTranscriptHeader item={activeAgent} onBack={onBack} />,
    );

    expect(screen.getByText("Researcher")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to subagents" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
