// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IntegrationCatalogPage,
  IntegrationCatalogTabs,
  type IntegrationCatalogItem,
} from "../src";

afterEach(cleanup);

const installed: readonly IntegrationCatalogItem[] = [
  { id: "github", title: "GitHub" },
  { id: "documents", title: "Documents" },
];

describe("IntegrationCatalog", () => {
  it("renders the plugin catalog and delegates host-owned actions", () => {
    const onAction = vi.fn();
    const onManage = vi.fn();
    const onOpen = vi.fn();
    render(
      <IntegrationCatalogPage
        description="Work with Codex across your favorite tools"
        installedItems={installed}
        kind="plugins"
        onItemAction={onAction}
        onItemOpen={onOpen}
        onManage={onManage}
        scopes={[
          { id: "public", label: "Public" },
          { id: "personal", label: "Personal" },
        ]}
        activeScope="public"
        sections={[
          {
            id: "popular",
            items: [
              {
                actionLabel: "Install",
                description: "Read and manage Gmail",
                id: "gmail",
                title: "Gmail",
              },
            ],
            title: "Popular",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Plugins" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "GitHub" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Manage installed integrations" }));
    fireEvent.click(screen.getByRole("button", { name: "GitHub" }));
    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    expect(onManage).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(installed[0]);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "gmail" }),
    );
  });

  it("filters skills and exposes an empty result without mutating source data", () => {
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <IntegrationCatalogPage
        installedItems={[
          {
            description: "OpenAI and Codex docs for models",
            id: "openai-docs",
            title: "OpenAI Docs",
          },
        ]}
        kind="skills"
        onQueryChange={onQueryChange}
        query=""
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search skills"), {
      target: { value: "docs" },
    });
    expect(onQueryChange).toHaveBeenCalledWith("docs");

    rerender(
      <IntegrationCatalogPage
        emptyLabel="No matching skills"
        installedItems={installed}
        kind="skills"
        query="missing"
      />,
    );
    expect(screen.getByText("No matching skills")).toBeTruthy();
    expect(installed).toHaveLength(2);
  });

  it("keeps unavailable and retry behavior controlled", () => {
    const onRetry = vi.fn();
    render(
      <IntegrationCatalogPage
        kind="plugins"
        onRetry={onRetry}
        status="unavailable"
        statusDescription="Plugin access is disabled by your organization."
      />,
    );
    expect(screen.getByRole("heading", { name: "Integrations unavailable" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("switches the shared Plugins and Skills titlebar tabs", () => {
    const onChange = vi.fn();
    render(<IntegrationCatalogTabs active="plugins" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Plugins" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Skills" }));
    expect(onChange).toHaveBeenCalledWith("skills");
  });
});
