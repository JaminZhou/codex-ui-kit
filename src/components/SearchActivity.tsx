import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

export type SearchActivityKind = "code" | "web";

export interface SearchActivityEntry {
  completed?: boolean;
  detail: string;
  favicon?: ReactNode;
  faviconUrl?: string;
  id: string;
}

export interface SearchActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  defaultOpen?: boolean;
  entries?: readonly SearchActivityEntry[];
  kind: SearchActivityKind;
  onEntryOpen?: (entry: SearchActivityEntry) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  path?: string;
  query?: string;
  status: AgentItemStatus;
}

function SearchIcon({ kind }: { kind: SearchActivityKind }) {
  return kind === "web" ? (
    <svg
      aria-hidden="true"
      className="codex-ui-search-activity__icon"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11M8 2.5c1.4 1.5 2.1 3.3 2.1 5.5S9.4 12 8 13.5C6.6 12 5.9 10.2 5.9 8S6.6 4 8 2.5Z" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="codex-ui-search-activity__icon"
      viewBox="0 0 16 16"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.2 10.2 3.3 3.3M4.5 5.6h5M4.5 8h3.2" />
    </svg>
  );
}

function codeSearchSummary(
  status: AgentItemStatus,
  query?: string,
  path?: string,
) {
  const verb =
    status === "running" || status === "pending"
      ? "Searching"
      : status === "failed"
        ? "Search failed"
        : "Searched";
  if (query && path) return `${verb} for ${query} in ${path}`;
  if (query) return `${verb} for ${query}`;
  return `${verb} for files`;
}

export function SearchActivity({
  className,
  defaultOpen = false,
  entries = [],
  kind,
  onEntryOpen,
  onOpenChange,
  open,
  path,
  query,
  status,
  ...props
}: SearchActivityProps) {
  const classes = ["codex-ui-search-activity", className]
    .filter(Boolean)
    .join(" ");
  const isActive = status === "running" || status === "pending";
  const unfinishedEntry = [...entries]
    .reverse()
    .find((entry) => entry.completed !== true);
  const detail = isActive
    ? (unfinishedEntry?.detail ?? query)
    : (entries.at(-1)?.detail ?? query);
  const webDetail = isActive || entries.length === 0 ? detail : undefined;
  const action =
    kind === "web"
      ? isActive
        ? "Searching the web"
        : status === "failed"
          ? "Web search failed"
          : "Searched the web"
      : codeSearchSummary(status, query, path);
  const summary =
    kind === "web" ? (
      <>
        <span
          className="codex-ui-search-activity__action"
          data-active={isActive || undefined}
        >
          {action}
          {webDetail ? " " : null}
        </span>
        {webDetail ? (
          <span className="codex-ui-search-activity__detail">
            {`for ${webDetail}`}
          </span>
        ) : null}
      </>
    ) : (
      <span
        className="codex-ui-search-activity__action"
        data-active={isActive || undefined}
      >
        {action}
      </span>
    );
  const body = entries.length > 0 ? (
    <ol className="codex-ui-search-activity__entries">
      {entries.map((entry) => {
        const content = (
          <>
            {entry.favicon ??
              (entry.faviconUrl ? (
                <img alt="" src={entry.faviconUrl} />
              ) : null)}
            <span>{entry.detail}</span>
          </>
        );
        return (
          <li data-completed={entry.completed || undefined} key={entry.id}>
            {onEntryOpen ? (
              <button onClick={() => onEntryOpen(entry)} type="button">
                {content}
              </button>
            ) : (
              <div>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  ) : undefined;

  return (
    <AgentActivity
      className={classes}
      data-search-kind={kind}
      defaultOpen={defaultOpen}
      indicator={<SearchIcon kind={kind} />}
      kind="search"
      onOpenChange={onOpenChange}
      open={open}
      status={status}
      summary={summary}
      {...props}
    >
      {body}
    </AgentActivity>
  );
}
