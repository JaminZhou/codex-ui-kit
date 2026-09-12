import {
  type HTMLAttributes,
  type ReactNode,
  useMemo,
} from "react";
import { Menu, MenuItem } from "./InteractivePrimitives.js";

export type SitesIndexStatus = "ready" | "loading" | "error" | "unavailable";
export type SiteOverflowAction = "copy-link" | "open" | "remove";

export interface SiteIndexItem {
  description?: ReactNode;
  id: string;
  lastUpdated?: ReactNode;
  leading?: ReactNode;
  name: ReactNode;
  sharing?: ReactNode;
  url?: ReactNode;
}

function searchableText(...values: ReactNode[]) {
  return values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLocaleLowerCase();
}

function SearchGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M7.25 1.75a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 1.1a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm4.1 8.88 3.04 3.04-.78.78-3.04-3.04.78-.78Z" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M13.48 4.76V1.84h-1.1v1.08A6.05 6.05 0 0 0 1.6 6.7h1.1a4.95 4.95 0 0 1 8.9-2.93H9.88v1.1h3.6Zm-10.96 6.48v2.92h1.1v-1.08A6.05 6.05 0 0 0 14.4 9.3h-1.1a4.95 4.95 0 0 1-8.9 2.93h1.72v-1.1h-3.6Z" />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M7.45 2.1h1.1v5.35h5.35v1.1H8.55v5.35h-1.1V8.55H2.1v-1.1h5.35V2.1Z" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3.25 7.25a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm4.75 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm4.75 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M10.87 2.2a2.23 2.23 0 1 1 0 4.46 2.23 2.23 0 0 1 0-4.46Zm0 1.1a1.13 1.13 0 1 0 0 2.26 1.13 1.13 0 0 0 0-2.26ZM4.13 6.77a2.23 2.23 0 1 1 0 4.46 2.23 2.23 0 0 1 0-4.46Zm0 1.1a1.13 1.13 0 1 0 0 2.26 1.13 1.13 0 0 0 0-2.26Zm6.74 1.47a2.23 2.23 0 1 1 0 4.46 2.23 2.23 0 0 1 0-4.46Zm0 1.1a1.13 1.13 0 1 0 0 2.26 1.13 1.13 0 0 0 0-2.26ZM5.9 8.17l3.22-1.86.55.95-3.22 1.86-.55-.95Zm0 1.66.55-.95 3.22 1.86-.55.95-3.22-1.86Z" />
    </svg>
  );
}

function siteLabel(site: SiteIndexItem) {
  return typeof site.name === "string" ? site.name : site.id;
}

export interface SitesIndexPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  createLabel?: ReactNode;
  emptyLabel?: ReactNode;
  items?: readonly SiteIndexItem[];
  loadingLabel?: ReactNode;
  onCreate?: () => void;
  onOpen?: (site: SiteIndexItem) => void;
  onOverflowAction?: (site: SiteIndexItem, action: SiteOverflowAction) => void;
  onQueryChange?: (query: string) => void;
  onRefresh?: () => void;
  onRetry?: () => void;
  onShare?: (site: SiteIndexItem) => void;
  query?: string;
  refreshLabel?: ReactNode;
  retryLabel?: ReactNode;
  status?: SitesIndexStatus;
  statusDescription?: ReactNode;
  statusHeading?: ReactNode;
  title?: ReactNode;
}

/** A controlled sites index. Creation, sharing, and deletion remain host-owned callbacks. */
export function SitesIndexPage({
  className,
  createLabel = "Create",
  emptyLabel = "No sites found",
  items = [],
  loadingLabel = "Loading sites…",
  onCreate,
  onOpen,
  onOverflowAction,
  onQueryChange,
  onRefresh,
  onRetry,
  onShare,
  query = "",
  refreshLabel = "Refresh",
  retryLabel = "Retry",
  status = "ready",
  statusDescription,
  statusHeading,
  title = "Sites",
  ...props
}: SitesIndexPageProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = useMemo(
    () => items.filter((site) =>
      !normalizedQuery || searchableText(
        site.name,
        site.description,
        site.lastUpdated,
        site.sharing,
        site.url,
      ).includes(normalizedQuery),
    ),
    [items, normalizedQuery],
  );
  const fallbackHeading = status === "error" ? "Couldn’t load sites" : "Sites unavailable";

  return (
    <main
      aria-label="Sites"
      className={["codex-ui-sites-index", className].filter(Boolean).join(" ")}
      data-status={status}
      {...props}
    >
      <div className="codex-ui-sites-index__frame">
        <header className="codex-ui-sites-index__header">
          <h1>{title}</h1>
          <div className="codex-ui-sites-index__actions">
            <button aria-label={typeof refreshLabel === "string" ? refreshLabel : "Refresh sites"} onClick={onRefresh} type="button">
              <RefreshGlyph />
              <span>{refreshLabel}</span>
            </button>
            <button className="codex-ui-sites-index__create" onClick={onCreate} type="button">
              <AddGlyph />
              <span>{createLabel}</span>
            </button>
          </div>
        </header>
        <label className="codex-ui-sites-index__search">
          <SearchGlyph />
          <span className="codex-ui-sites-index__sr-only">Search sites</span>
          <input
            aria-label="Search sites"
            onChange={(event) => onQueryChange?.(event.currentTarget.value)}
            placeholder="Search sites"
            type="search"
            value={query}
          />
        </label>
        {status === "loading" ? (
          <p aria-live="polite" className="codex-ui-sites-index__status" role="status">{loadingLabel}</p>
        ) : status !== "ready" ? (
          <section className="codex-ui-sites-index__status">
            <h2>{statusHeading ?? fallbackHeading}</h2>
            {statusDescription ? <p>{statusDescription}</p> : null}
            {onRetry ? <button onClick={onRetry} type="button">{retryLabel}</button> : null}
          </section>
        ) : visibleItems.length === 0 ? (
          <p className="codex-ui-sites-index__empty">{emptyLabel}</p>
        ) : (
          <div className="codex-ui-sites-index__list">
            {visibleItems.map((site) => {
              const label = siteLabel(site);
              return (
                <article className="codex-ui-sites-index__site" key={site.id}>
                  <button aria-label={`Open ${label}`} className="codex-ui-sites-index__site-open" onClick={() => onOpen?.(site)} type="button" />
                  <span aria-hidden="true" className="codex-ui-sites-index__site-leading">{site.leading ?? "⌘"}</span>
                  <span className="codex-ui-sites-index__site-copy">
                    <span className="codex-ui-sites-index__site-name">{site.name}</span>
                    {site.description ? <span className="codex-ui-sites-index__site-description">{site.description}</span> : null}
                    {site.url || site.lastUpdated || site.sharing ? (
                      <span className="codex-ui-sites-index__site-meta">
                        {site.url ? <span>{site.url}</span> : null}
                        {site.lastUpdated ? <span>{site.lastUpdated}</span> : null}
                        {site.sharing ? <span>{site.sharing}</span> : null}
                      </span>
                    ) : null}
                  </span>
                  <div className="codex-ui-sites-index__site-actions">
                    <button aria-label={`Share ${label}`} onClick={() => onShare?.(site)} type="button">
                      <ShareGlyph />
                      <span>Share</span>
                    </button>
                    <Menu
                      align="end"
                      label={`Site actions for ${label}`}
                      trigger={<button aria-label={`More actions for ${label}`} type="button"><MoreGlyph /></button>}
                    >
                      <MenuItem onSelect={() => onOverflowAction?.(site, "open")}>Open</MenuItem>
                      <MenuItem onSelect={() => onOverflowAction?.(site, "copy-link")}>Copy link</MenuItem>
                      <MenuItem onSelect={() => onOverflowAction?.(site, "remove")} tone="danger">Remove</MenuItem>
                    </Menu>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
