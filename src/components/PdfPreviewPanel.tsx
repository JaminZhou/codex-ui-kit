import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

export type PdfPreviewZoom = number | "fit";
export interface PdfPreviewPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  pageCount: number;
  currentPage: number;
  zoomPercent: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: PdfPreviewZoom) => void;
  annotating?: boolean;
  onAnnotatingChange?: (annotating: boolean) => void;
  onDownload?: () => void;
  onOpen?: () => void;
  onOpenOptions?: () => void;
  openLabel?: string;
  icons?: Partial<Record<"previous" | "next" | "annotate" | "chevron" | "download" | "open", ReactNode>>;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  status?: "ready" | "loading" | "error";
  errorDescription?: ReactNode;
  onRetry?: () => void;
}

function PdfGlyph({ name }: { name: "previous" | "next" | "annotate" | "chevron" | "download" }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d={name === "previous" ? "m6 12 4-4 4 4" : name === "next" || name === "chevron" ? "m6 8 4 4 4-4" : name === "download" ? "M10 3v10m-4-4 4 4 4-4M4 13v4h12v-4" : "m4 13 9-9 3 3-9 9-4 1 1-4Z"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

/** PDF-specific chrome. The host owns decoding, page rendering and scroll position. */
export function PdfPreviewPanel({
  title, pageCount, currentPage, zoomPercent, onPageChange, onZoomChange,
  annotating = false, onAnnotatingChange, onDownload, onOpen, onOpenOptions,
  openLabel = "Open document", icons = {}, viewportRef, viewportProps,
  status = "ready", errorDescription = "This PDF could not be loaded.",
  onRetry, children, className, ...props
}: PdfPreviewPanelProps) {
  const count = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  const page = count ? Math.max(1, Math.min(count, Math.floor(currentPage) || 1)) : 0;
  const ready = status === "ready" && count > 0;
  const glyph = (name: "previous" | "next" | "annotate" | "chevron" | "download") => icons[name] ?? <PdfGlyph name={name} />;
  return (
    <section {...props} aria-label={title} aria-busy={status === "loading" || undefined}
      className={["codex-ui-pdf-preview", className].filter(Boolean).join(" ")}
      data-status={status} data-page={page} data-page-count={count} role="region">
      <header className="codex-ui-pdf-preview__header">
        <span className="codex-ui-pdf-preview__title" title={title}>{title}</span>
        <div className="codex-ui-pdf-preview__paging">
          <button aria-label="Previous page" disabled={!ready || page <= 1} onClick={() => onPageChange(page - 1)} type="button">{glyph("previous")}</button>
          <span aria-label={`Page ${page} of ${count}`} aria-live="polite">{page}/{count}</span>
          <button aria-label="Next page" disabled={!ready || page >= count} onClick={() => onPageChange(page + 1)} type="button">{glyph("next")}</button>
        </div>
        <div className="codex-ui-pdf-preview__actions">
          {onAnnotatingChange ? <button aria-label={annotating ? "Annotating" : "Annotate"} aria-pressed={annotating}
            className="codex-ui-pdf-preview__annotate" disabled={!ready} onClick={() => onAnnotatingChange(!annotating)} type="button">
            {glyph("annotate")}{annotating ? <span>Annotating</span> : null}
          </button> : null}
          <Menu align="end" className="codex-ui-pdf-preview__zoom-menu" label="PDF zoom" style={{ width: 160 }}
            trigger={<button aria-label="Zoom" className="codex-ui-pdf-preview__zoom" disabled={!ready} type="button">{Math.round(zoomPercent)}%{glyph("chevron")}</button>}>
            {[25, 50, 100, 150, 200].map((zoom) => <MenuItem key={zoom} onSelect={() => onZoomChange(zoom)}>{zoom}%</MenuItem>)}
            <MenuItem onSelect={() => onZoomChange("fit")}>Zoom to fit</MenuItem>
          </Menu>
          {onDownload ? <button aria-label="Download" disabled={!ready} onClick={onDownload} type="button">{glyph("download")}</button> : null}
          {onOpen ? <div className="codex-ui-pdf-preview__open-group">
            <button aria-label={openLabel} className="codex-ui-pdf-preview__open" onClick={onOpen} type="button">{icons.open}<span>Open</span></button>
            {onOpenOptions ? <button aria-label="Open options" className="codex-ui-pdf-preview__open-options" onClick={onOpenOptions} type="button">{glyph("chevron")}</button> : null}
          </div> : null}
        </div>
      </header>
      <div {...viewportProps} className={["codex-ui-pdf-preview__viewport", viewportProps?.className].filter(Boolean).join(" ")} ref={viewportRef}>
        {status === "loading" ? <div className="codex-ui-pdf-preview__state" role="status">Loading PDF</div>
          : status === "error" ? <div className="codex-ui-pdf-preview__state" role="alert">{errorDescription}{onRetry ? <button onClick={onRetry} type="button">Retry preview</button> : null}</div>
          : children}
      </div>
    </section>
  );
}
