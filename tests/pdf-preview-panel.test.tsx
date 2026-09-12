// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PdfPreviewPanel } from "../src";

afterEach(cleanup);
const defaults = { title: "design-spec", pageCount: 2, currentPage: 1, zoomPercent: 91, onPageChange: vi.fn(), onZoomChange: vi.fn() };
describe("PDF preview chrome", () => {
  it("owns paging boundaries while leaving the renderer in one viewport", () => {
    const change = vi.fn();
    const { rerender } = render(<PdfPreviewPanel {...defaults} onPageChange={change}><canvas aria-label="Page content" /></PdfPreviewPanel>);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Previous page" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(change).toHaveBeenCalledWith(2);
    expect(document.querySelectorAll(".codex-ui-pdf-preview__viewport")).toHaveLength(1);
    rerender(<PdfPreviewPanel {...defaults} currentPage={2} onPageChange={change} />);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next page" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(change).toHaveBeenLastCalledWith(1);
  });
  it("offers the observed six zoom choices through an accessible menu", async () => {
    const change = vi.fn();
    render(<PdfPreviewPanel {...defaults} onZoomChange={change} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom" }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toEqual(["25%", "50%", "100%", "150%", "200%", "Zoom to fit"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Zoom to fit" }));
    expect(change).toHaveBeenCalledWith("fit");
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("keeps annotation and external actions explicitly host controlled", () => {
    const annotate = vi.fn(); const open = vi.fn(); const download = vi.fn(); const options = vi.fn();
    const { rerender } = render(<PdfPreviewPanel {...defaults} onAnnotatingChange={annotate} onOpen={open} onDownload={download} onOpenOptions={options} />);
    fireEvent.click(screen.getByRole("button", { name: "Annotate" }));
    expect(annotate).toHaveBeenCalledWith(true);
    expect(screen.queryByText("Annotating")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open document" }));
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));
    [open, download, options].forEach((action) => expect(action).toHaveBeenCalledOnce());
    rerender(<PdfPreviewPanel {...defaults} annotating onAnnotatingChange={annotate} />);
    expect(screen.getByRole("button", { name: "Annotating" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("does not render stale pages on failure and supports retry", () => {
    const retry = vi.fn();
    render(<PdfPreviewPanel {...defaults} onRetry={retry} status="error"><canvas /></PdfPreviewPanel>);
    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
    expect(document.querySelector("canvas")).toBeNull();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Next page" }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry preview" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("represents loading without fabricating document pages", () => {
    render(<PdfPreviewPanel {...defaults} pageCount={0} status="loading" />);
    expect(screen.getByRole("region").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Loading PDF");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Zoom" }).disabled).toBe(true);
  });
});
