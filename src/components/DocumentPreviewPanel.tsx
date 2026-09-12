import type { HTMLAttributes, ReactNode } from "react";

export type DocumentPreviewKind =
  | "document"
  | "notebook"
  | "pdf"
  | "presentation"
  | "spreadsheet";

export type DocumentPreviewStatus = "empty" | "error" | "loading" | "ready";

export interface DocumentPreviewPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children?: ReactNode;
  errorDescription?: ReactNode;
  kind?: DocumentPreviewKind;
  onOpen?: () => void;
  onRetry?: () => void;
  openLabel?: string;
  retryLabel?: string;
  status?: DocumentPreviewStatus;
  subtitle?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
}

const kindLabels: Record<DocumentPreviewKind, string> = {
  document: "Document",
  notebook: "Notebook",
  pdf: "PDF",
  presentation: "Presentation",
  spreadsheet: "Spreadsheet",
};

/**
 * A protocol-neutral workspace preview shell. Hosts own the document renderer
 * and file loading; this component owns the header, status semantics, and
 * retry/open affordances.
 */
export function DocumentPreviewPanel({
  children,
  className,
  errorDescription = "This preview could not be loaded.",
  kind = "document",
  onOpen,
  onRetry,
  openLabel = "Open document",
  retryLabel = "Retry preview",
  status = "ready",
  subtitle,
  title,
  toolbar,
  ...props
}: DocumentPreviewPanelProps) {
  const statusLabel =
    status === "loading"
      ? "Loading preview"
      : status === "error"
        ? "Preview unavailable"
        : status === "empty"
          ? "No preview available"
          : undefined;

  return (
    <section
      {...props}
      aria-busy={status === "loading" ? true : undefined}
      aria-label={typeof title === "string" ? title : undefined}
      className={["codex-ui-document-preview", className]
        .filter(Boolean)
        .join(" ")}
      data-kind={kind}
      data-status={status}
      role="region"
    >
      <header className="codex-ui-document-preview__header">
        <div className="codex-ui-document-preview__identity">
          <span aria-hidden="true" className="codex-ui-document-preview__kind">
            {kindLabels[kind]}
          </span>
          <div className="codex-ui-document-preview__title-group">
            <h2 className="codex-ui-document-preview__title">{title}</h2>
            {subtitle ? (
              <p className="codex-ui-document-preview__subtitle">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="codex-ui-document-preview__toolbar">
          {toolbar}
          {onOpen ? (
            <button
              aria-label={openLabel}
              className="codex-ui-document-preview__open"
              onClick={onOpen}
              type="button"
            >
              Open
            </button>
          ) : null}
        </div>
      </header>

      <div className="codex-ui-document-preview__body">
        {status === "loading" ? (
          <div
            aria-label={statusLabel}
            className="codex-ui-document-preview__state"
            role="status"
          >
            <span className="codex-ui-document-preview__skeleton" />
            <span className="codex-ui-document-preview__skeleton" />
            <span className="codex-ui-document-preview__skeleton" />
          </div>
        ) : status === "error" ? (
          <div className="codex-ui-document-preview__state" role="alert">
            <strong>{statusLabel}</strong>
            <span>{errorDescription}</span>
            {onRetry ? (
              <button
                className="codex-ui-document-preview__retry"
                onClick={onRetry}
                type="button"
              >
                {retryLabel}
              </button>
            ) : null}
          </div>
        ) : status === "empty" ? (
          <div className="codex-ui-document-preview__state" role="status">
            <strong>{statusLabel}</strong>
            <span>Choose a supported file to preview its contents.</span>
          </div>
        ) : (
          <div className="codex-ui-document-preview__canvas">
            {children ?? (
              <div
                aria-label="Preview page"
                className="codex-ui-document-preview__page"
                role="img"
              >
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
