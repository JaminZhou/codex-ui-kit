// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SitesIndexPage,
  type SiteIndexItem,
} from "../src";

afterEach(cleanup);

const sites: readonly SiteIndexItem[] = [
  {
    description: "A shared product brief",
    id: "product-brief",
    lastUpdated: "Updated today",
    name: "Product brief",
    sharing: "Shared",
    url: "brief.example",
  },
  {
    description: "Private launch notes",
    id: "launch-notes",
    name: "Launch notes",
    url: "notes.example",
  },
];

describe("SitesIndexPage", () => {
  it("filters controlled items and delegates host-owned actions", () => {
    const onCreate = vi.fn();
    const onOpen = vi.fn();
    const onOverflowAction = vi.fn();
    const onQueryChange = vi.fn();
    const onRefresh = vi.fn();
    const onShare = vi.fn();
    render(
      <SitesIndexPage
        items={sites}
        onCreate={onCreate}
        onOpen={onOpen}
        onOverflowAction={onOverflowAction}
        onQueryChange={onQueryChange}
        onRefresh={onRefresh}
        onShare={onShare}
        query="brief"
      />,
    );

    expect(screen.getByRole("heading", { name: "Sites" })).toBeTruthy();
    expect(screen.getByText("Product brief")).toBeTruthy();
    expect(screen.queryByText("Launch notes")).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search sites" }), {
      target: { value: "notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Product brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Share Product brief" }));
    fireEvent.click(screen.getByRole("button", { name: "More actions for Product brief" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));
    expect(onQueryChange).toHaveBeenCalledWith("notes");
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(sites[0]);
    expect(onShare).toHaveBeenCalledWith(sites[0]);
    expect(onOverflowAction).toHaveBeenCalledWith(sites[0], "copy-link");
  });

  it("keeps loading, unavailable, and empty states explicit", () => {
    const onRetry = vi.fn();
    const { rerender } = render(<SitesIndexPage status="loading" />);
    expect(screen.getByRole("status").textContent).toContain("Loading sites…");
    rerender(
      <SitesIndexPage
        onRetry={onRetry}
        status="unavailable"
        statusDescription="Sites are unavailable for this account."
      />,
    );
    expect(screen.getByRole("heading", { name: "Sites unavailable" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<SitesIndexPage items={sites} query="missing" />);
    expect(screen.getByText("No sites found")).toBeTruthy();
    expect(sites).toHaveLength(2);
  });

  it("exposes page lifecycle status and locks site actions while loading", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <SitesIndexPage
        items={sites}
        loadingLabel="Loading hosted sites…"
        onCreate={vi.fn()}
        onRefresh={vi.fn()}
        onRetry={onRetry}
        query="brief"
        status="loading"
      />,
    );
    const page = screen.getByRole("main", { name: "Sites" });
    expect(page.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading hosted sites…")).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search sites" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(
      <SitesIndexPage
        onRetry={onRetry}
        retryLabel="Try sites again"
        status="error"
        statusDescription="The sites service is temporarily unavailable."
        statusHeading="Sites service unavailable"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The sites service is temporarily unavailable.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try sites again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
