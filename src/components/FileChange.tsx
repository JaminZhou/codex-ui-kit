import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

export type FileChangeKind = "added" | "modified" | "deleted" | "renamed";

const changeLabels: Record<FileChangeKind, string> = {
  added: "Added",
  deleted: "Deleted",
  modified: "Modified",
  renamed: "Renamed",
};

export interface FileChangeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  additions?: number;
  change: FileChangeKind;
  children?: ReactNode;
  defaultOpen?: boolean;
  deletions?: number;
  detail?: ReactNode;
  path: ReactNode;
  previousPath?: ReactNode;
  status?: AgentItemStatus;
}

export function FileChange({
  additions,
  change,
  children,
  className,
  defaultOpen = false,
  deletions,
  detail,
  path,
  previousPath,
  status = "completed",
  ...props
}: FileChangeProps) {
  const classes = ["codex-ui-file-change", className]
    .filter(Boolean)
    .join(" ");
  const resolvedDetail = detail ?? (
    <span className="codex-ui-file-change__stats">
      <span>{changeLabels[change]}</span>
      {additions !== undefined ? (
        <span data-stat="additions">+{additions}</span>
      ) : null}
      {deletions !== undefined ? (
        <span data-stat="deletions">−{deletions}</span>
      ) : null}
    </span>
  );
  const summary = (
    <span className="codex-ui-file-change__path">
      {previousPath ? (
        <>
          <code>{previousPath}</code>
          <span aria-hidden="true">→</span>
        </>
      ) : null}
      <code>{path}</code>
    </span>
  );

  return (
    <AgentActivity
      className={classes}
      data-change={change}
      defaultOpen={defaultOpen}
      detail={resolvedDetail}
      kind="file-change"
      status={status}
      summary={summary}
      {...props}
    >
      {children}
    </AgentActivity>
  );
}

export type FileDiffLineKind = "context" | "addition" | "deletion" | "hunk";

export interface FileDiffLine {
  content: string;
  kind: FileDiffLineKind;
  newLineNumber?: number;
  oldLineNumber?: number;
}

const diffLineLabels: Record<FileDiffLineKind, string> = {
  addition: "Added line",
  context: "Context line",
  deletion: "Deleted line",
  hunk: "Diff hunk",
};

const diffLinePrefixes: Record<FileDiffLineKind, string> = {
  addition: "+",
  context: " ",
  deletion: "-",
  hunk: "",
};

export interface FileDiffProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  emptyLabel?: string;
  lines: readonly FileDiffLine[];
}

export function FileDiff({
  className,
  emptyLabel = "No diff lines",
  lines,
  "aria-label": ariaLabel = "File diff",
  ...props
}: FileDiffProps) {
  const classes = ["codex-ui-file-diff", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-label={ariaLabel}
      className={classes}
      role="list"
      {...props}
    >
      {lines.length === 0 ? (
        <span className="codex-ui-file-diff__empty" role="listitem">
          {emptyLabel}
        </span>
      ) : (
        lines.map((line, index) => (
          <div
            aria-label={`${diffLineLabels[line.kind]}: ${line.content}`}
            className="codex-ui-file-diff__line"
            data-line-kind={line.kind}
            key={`${index}:${line.kind}:${line.oldLineNumber ?? ""}:${line.newLineNumber ?? ""}`}
            role="listitem"
          >
            <span aria-hidden="true" className="codex-ui-file-diff__line-number">
              {line.oldLineNumber ?? ""}
            </span>
            <span aria-hidden="true" className="codex-ui-file-diff__line-number">
              {line.newLineNumber ?? ""}
            </span>
            <span aria-hidden="true" className="codex-ui-file-diff__prefix">
              {diffLinePrefixes[line.kind]}
            </span>
            <code>{line.content || " "}</code>
          </div>
        ))
      )}
    </div>
  );
}
