// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  McpToolCallGroup,
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
  it("supports the current content-width labelled disclosure button", () => {
    const { container } = render(
      <ToolCallCard
        disclosureIndicator={false}
        disclosureMode="overlay-button"
        name="Fetch OpenAI doc"
        result="Fetched"
        status="completed"
      />,
    );
    const toggle = screen.getByRole("button", {
      name: "Fetch OpenAI doc",
    });
    const label = container.querySelector(".codex-ui-tool-call__label");
    const chevron = container.querySelector(
      ".codex-ui-activity__button-chevron",
    );

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-labelledby")).toBe(
      label?.parentElement?.id,
    );
    expect(chevron?.hasAttribute("data-visible")).toBe(false);
    expect(chevron?.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 20 20",
    );
    expect(chevron?.querySelector("path")?.getAttribute("d")).toBe(
      "M7.52925 3.7793C7.75652 3.55203 8.10803 3.52383 8.36616 3.69434L8.47065 3.7793L14.2207 9.5293C14.4804 9.789 14.4804 10.211 14.2207 10.4707L8.47065 16.2207C8.21095 16.4804 7.78895 16.4804 7.52925 16.2207C7.26955 15.961 7.26955 15.539 7.52925 15.2793L12.8085 10L7.52925 4.7207L7.44429 4.61621C7.27378 4.35808 7.30198 4.00657 7.52925 3.7793Z",
    );
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(chevron?.hasAttribute("data-visible")).toBe(true);
    expect(screen.getByText("Fetched").textContent).toBe("Fetched");
  });

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
    expect(html).toContain(">GitHub search failed<");
    expect(html).not.toContain('aria-label="search_issues failed"');
    expect(html).not.toContain("This result should not render");
  });

  it("can render a failed tool as neutral raw output", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        defaultOpen
        error="Invalid URL"
        errorLanguage="plaintext"
        errorPresentation="output"
        failedAriaLabel="Fetch OpenAI doc failed"
        failedLabel="Fetch OpenAI doc"
        name="Fetch OpenAI doc"
        status="failed"
      />,
    );

    expect(html).toContain('data-presentation="output"');
    expect(html).toContain("plaintext");
    expect(html).toContain("<code>Invalid URL</code>");
    expect(html).toContain(">Fetch OpenAI doc<");
    expect(html).toContain(
      'aria-label="Fetch OpenAI doc failed"',
    );
    expect(html).not.toContain(">Fetch OpenAI doc failed<");
  });

  it("supports a localized failed-call accessible name", () => {
    const html = renderToStaticMarkup(
      <ToolCallCard
        error="Invalid URL"
        failedAriaLabel="获取 OpenAI 文档失败"
        failedLabel="获取 OpenAI 文档"
        name="Fetch OpenAI doc"
        status="failed"
      />,
    );

    expect(html).toContain(
      'aria-label="获取 OpenAI 文档失败"',
    );
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

describe("McpToolCallGroup", () => {
  it("supports the current content button disclosure", () => {
    render(
      <McpToolCallGroup
        disclosureMode="button"
        name="OpenAI Developer Docs"
        status="completed"
      >
        <ToolCallCard name="Fetch OpenAI doc" status="completed" />
      </McpToolCallGroup>,
    );
    const toggle = screen.getByRole("button", {
      name: "Used OpenAI Developer Docs integration",
    });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("groups public MCP calls under the integration lifecycle", () => {
    const html = renderToStaticMarkup(
      <McpToolCallGroup
        defaultOpen
        name="OpenAI Developer Docs"
        source="openaiDeveloperDocs"
        status="completed"
      >
        <ToolCallCard
          name="Search OpenAI docs"
          status="completed"
          structuredContent={{ query: "Codex MCP support" }}
        />
        <ToolCallCard name="Fetch OpenAI doc" status="completed" />
      </McpToolCallGroup>,
    );

    expect(html).toContain("Used OpenAI Developer Docs integration");
    expect(html).toContain('data-source="openaiDeveloperDocs"');
    expect(html).toContain('aria-label="OpenAI Developer Docs tool calls"');
    expect(html).toContain("Search OpenAI docs");
    expect(html).toContain("Fetch OpenAI doc");
    expect(html).toContain('viewBox="0 0 20 20"');
    expect(html).toContain(
      "M7.45996 14.375C7.45996 13.3616 6.63844 12.54 5.625 12.54",
    );
  });

  it("announces active and failed integration states", () => {
    const active = renderToStaticMarkup(
      <McpToolCallGroup name="Docs" status="running" />,
    );
    const failed = renderToStaticMarkup(
      <McpToolCallGroup name="Docs" status="failed" />,
    );

    expect(active).toContain("Using Docs integration");
    expect(active).toContain('data-active="true"');
    expect(failed).toContain("Docs integration failed");
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
    expect(
      container
        .querySelector(".codex-ui-search-activity__entries")
        ?.getAttribute("tabindex"),
    ).toBe("0");
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
