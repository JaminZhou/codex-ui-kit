// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SearchActivity,
  ToolCallCard,
  type SearchActivityEntry,
} from "../src";

const webEntries: SearchActivityEntry[] = [
  {
    completed: true,
    detail: "Codex app-server protocol",
    faviconUrl: "https://example.com/favicon.ico",
    id: "protocol",
  },
  {
    detail: "Codex TypeScript SDK",
    id: "sdk",
  },
];

afterEach(cleanup);

describe("ToolCallCard", () => {
  it("renders an active non-expandable tool row", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        activeLabel="Searching issues"
        name="search_issues"
        source="GitHub"
        status="running"
        summary="Finding actionable reports"
      />,
    );

    expect(html).toContain('data-source="GitHub"');
    expect(html).toContain('data-active="true"');
    expect(html).toContain("Searching issues");
    expect(html).toContain("Finding actionable reports");
    expect(html).not.toContain("<details");
  });

  it("renders a completed empty-result disclosure", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        completedLabel="Searched issues"
        name="search_issues"
        result={null}
        status="completed"
      />,
    );

    expect(html).toContain("Searched issues");
    expect(html).toContain("Tool returned no content");
    expect(html).toContain("<details");
    expect(html).not.toContain(" open=");
  });

  it("renders structured content and delegates raw-output inspection", () => {
    const onViewRawOutput = vi.fn();
    render(
      <ToolCallCard
        defaultOpen
        name="get_issue"
        onViewRawOutput={onViewRawOutput}
        rawOutput={{ callId: "call-1" }}
        status="completed"
        structuredContent={{ count: 2n, state: "open" }}
      />,
    );

    expect(screen.getByText(/"count": "2"/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Show raw tool call output" }),
    );
    expect(onViewRawOutput).toHaveBeenCalledWith({ callId: "call-1" });
  });

  it("prioritizes a danger result for failed calls", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        defaultOpen
        error="Connector authorization expired"
        failedLabel="GitHub search failed"
        name="search_issues"
        result="This result should not render"
        status="failed"
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Connector authorization expired");
    expect(html).not.toContain("This result should not render");
  });

  it("keeps controlled disclosure state stable", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <ToolCallCard
        name="list_projects"
        onOpenChange={onOpenChange}
        open={false}
        result="Two projects"
        status="completed"
      />,
    );

    fireEvent.click(container.querySelector("summary")!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")?.open).toBe(false);
  });
});

describe("SearchActivity", () => {
  it("renders a running web accordion with the active query", () => {
    const onEntryOpen = vi.fn();
    const { container } = render(
      <SearchActivity
        defaultOpen
        entries={webEntries}
        kind="web"
        onEntryOpen={onEntryOpen}
        status="running"
      />,
    );

    expect(
      container.querySelector(".codex-ui-activity__summary")?.textContent,
    ).toBe("Searching the web for Codex TypeScript SDK");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Codex app-server protocol" }),
    );
    expect(onEntryOpen).toHaveBeenCalledWith(webEntries[0]);
  });

  it("uses the compact completed header for grouped web searches", () => {
    const html = renderToStaticMarkup(
      <SearchActivity
        entries={webEntries.map((entry) => ({ ...entry, completed: true }))}
        kind="web"
        status="completed"
      />,
    );

    expect(html).toContain("Searched the web");
    expect(html).not.toContain("Searched the web for");
    expect(html).toContain('data-search-kind="web"');
  });

  it("prefers a new query over stale completed entries while running", () => {
    const { container } = render(
      <SearchActivity
        entries={webEntries.map((entry) => ({ ...entry, completed: true }))}
        kind="web"
        query="new in-flight query"
        status="running"
      />,
    );

    expect(
      container.querySelector(".codex-ui-activity__summary")?.textContent,
    ).toBe("Searching the web for new in-flight query");
  });

  it("retains the query on a standalone completed web row", () => {
    const html = renderToStaticMarkup(
      <SearchActivity kind="web" query="Codex SDK" status="completed" />,
    );

    expect(html).toContain("Searched the web");
    expect(html).toContain("for Codex SDK");
    expect(html).not.toContain("<details");
  });

  it.each([
    ["running", "Searching for app-server in codex-rs"],
    ["completed", "Searched for app-server in codex-rs"],
    ["failed", "Search failed for app-server in codex-rs"],
  ] as const)("renders %s code-search language", (status, label) => {
    const html = renderToStaticMarkup(
      <SearchActivity
        kind="code"
        path="codex-rs"
        query="app-server"
        status={status}
      />,
    );

    expect(html).toContain(label);
    expect(html).toContain('data-search-kind="code"');
  });

  it("uses the no-query file-search fallback", () => {
    const running = renderToStaticMarkup(
      <SearchActivity kind="code" status="running" />,
    );
    const completed = renderToStaticMarkup(
      <SearchActivity kind="code" status="completed" />,
    );

    expect(running).toContain("Searching for files");
    expect(completed).toContain("Searched for files");
  });
});
