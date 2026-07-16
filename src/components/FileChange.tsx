import {
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

export type FileChangeKind = "added" | "modified" | "deleted" | "renamed";

export type FileChangeStatus =
  | AgentItemStatus
  | "streaming"
  | "applied"
  | "stopped"
  | "rejected";

const activeLabels: Record<FileChangeKind, string> = {
  added: "Creating",
  deleted: "Deleting",
  modified: "Editing",
  renamed: "Renaming",
};

const appliedLabels: Record<FileChangeKind, string> = {
  added: "Created",
  deleted: "Deleted",
  modified: "Edited",
  renamed: "Renamed",
};

const stoppedLabels: Record<FileChangeKind, string> = {
  added: "Stopped creating",
  deleted: "Stopped deleting",
  modified: "Stopped editing",
  renamed: "Stopped renaming",
};

function normalizeStatus(status: FileChangeStatus) {
  if (status === "completed") return "applied";
  if (status === "running") return "streaming";
  if (status === "failed") return "rejected";
  return status;
}

function toAgentStatus(status: FileChangeStatus): AgentItemStatus {
  const normalized = normalizeStatus(status);
  if (normalized === "applied") return "completed";
  if (normalized === "streaming") return "running";
  if (normalized === "stopped" || normalized === "rejected") return "failed";
  return "pending";
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect height="8" rx="1" width="8" x="5" y="5" />
      <path d="M4 11H3.5A1.5 1.5 0 0 1 2 9.5v-6A1.5 1.5 0 0 1 3.5 2h6A1.5 1.5 0 0 1 11 3.5V4" />
    </svg>
  );
}

function copyWithClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  void navigator.clipboard.writeText(text).catch(() => undefined);
}

export interface FileChangeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  additions?: number;
  change: FileChangeKind;
  children?: ReactNode;
  copyDiffLabel?: string;
  defaultOpen?: boolean;
  deletions?: number;
  detail?: ReactNode;
  diffText?: string;
  emptyLabel?: ReactNode;
  onCopyDiff?: (diff: string) => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onOpenFile?: (path: string) => void;
  open?: boolean;
  path: string;
  previousPath?: string;
  showDiffDetails?: boolean;
  status?: FileChangeStatus;
}

export function FileChange({
  additions,
  change,
  children,
  className,
  copyDiffLabel = "Copy diff",
  defaultOpen = false,
  deletions,
  detail,
  diffText,
  emptyLabel,
  onCopyDiff,
  onOpenChange,
  onOpenFile,
  open,
  path,
  previousPath,
  showDiffDetails = true,
  status = "applied",
  ...props
}: FileChangeProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const normalizedStatus = normalizeStatus(status);
  const isApplied = normalizedStatus === "applied";
  const classes = ["codex-ui-file-change", className]
    .filter(Boolean)
    .join(" ");
  const statusLabel =
    normalizedStatus === "stopped"
      ? stoppedLabels[change]
      : normalizedStatus === "rejected"
        ? "Rejected"
        : normalizedStatus === "streaming" || normalizedStatus === "pending"
          ? activeLabels[change]
          : appliedLabels[change];
  const expandedLabel = `${appliedLabels[change]} file`;
  const showExpandedLabel = showDiffDetails && resolvedOpen && isApplied;
  const pathContent = previousPath ? `${previousPath} → ${path}` : path;
  const summary = showExpandedLabel ? (
    <span className="codex-ui-file-change__action">{expandedLabel}</span>
  ) : (
    <>
      <span
        className="codex-ui-file-change__action"
        data-streaming={normalizedStatus === "streaming" || undefined}
      >
        {statusLabel}
      </span>{" "}
      <span className="codex-ui-file-change__path">{pathContent}</span>
    </>
  );
  const stats = (
    <span className="codex-ui-file-change__stats">
      {additions !== undefined ? (
        <span data-stat="additions">+{additions}</span>
      ) : null}
      {deletions !== undefined ? (
        <span data-stat="deletions">−{deletions}</span>
      ) : null}
      {change === "added" ? <span aria-hidden="true" data-dot="added" /> : null}
      {change === "deleted" ? (
        <span aria-hidden="true" data-dot="deleted" />
      ) : null}
    </span>
  );
  const resolvedDetail =
    detail ??
    (!showExpandedLabel &&
    (additions !== undefined ||
      deletions !== undefined ||
      change === "added" ||
      change === "deleted")
      ? stats
      : undefined);
  const fallback =
    emptyLabel ??
    (change === "deleted"
      ? "Contents deleted"
      : change === "renamed"
        ? "File renamed without changes"
        : "No changes");

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const handleCopy = () => {
    if (diffText === undefined) return;
    if (onCopyDiff) {
      void onCopyDiff(diffText);
      return;
    }
    copyWithClipboard(diffText);
  };
  const body = showDiffDetails ? (
    <div className="codex-ui-file-change__shell">
      <div className="codex-ui-file-change__shell-header">
        <div className="codex-ui-file-change__shell-identity">
          {onOpenFile ? (
            <button onClick={() => onOpenFile(path)} type="button">
              {path}
            </button>
          ) : (
            <code>{path}</code>
          )}
          {additions !== undefined || deletions !== undefined ? stats : null}
        </div>
        {diffText !== undefined ? (
          <button
            aria-label={copyDiffLabel}
            className="codex-ui-file-change__copy"
            onClick={handleCopy}
            title={copyDiffLabel}
            type="button"
          >
            <CopyIcon />
          </button>
        ) : null}
      </div>
      <div className="codex-ui-file-change__shell-body">
        {children ?? (
          <div className="codex-ui-file-change__empty">{fallback}</div>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <AgentActivity
      className={classes}
      data-change={change}
      data-file-status={normalizedStatus}
      detail={resolvedDetail}
      indicator={null}
      kind="file-change"
      onOpenChange={setOpen}
      open={resolvedOpen}
      status={toAgentStatus(status)}
      summary={summary}
      {...props}
    >
      {body}
    </AgentActivity>
  );
}

export type FileDiffLineKind =
  | "context"
  | "addition"
  | "deletion"
  | "hunk"
  | "meta";

export interface FileDiffLine {
  content: string;
  kind: FileDiffLineKind;
  newLineNumber?: number;
  oldLineNumber?: number;
  tokens?: ReactNode;
}

const diffLineLabels: Record<FileDiffLineKind, string> = {
  addition: "Added line",
  context: "Context line",
  deletion: "Deleted line",
  hunk: "Diff hunk",
  meta: "Diff metadata",
};

const diffLinePrefixes: Record<FileDiffLineKind, string> = {
  addition: "+",
  context: " ",
  deletion: "-",
  hunk: "",
  meta: "\\ ",
};

export type FileDiffSize = "short" | "default" | "fallback";

export function fileDiffToText(lines: readonly FileDiffLine[]) {
  return lines
    .map((line) => `${diffLinePrefixes[line.kind]}${line.content}`)
    .join("\n");
}

export interface FileDiffProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  emptyLabel?: string;
  lines: readonly FileDiffLine[];
  renderContent?: (line: FileDiffLine, index: number) => ReactNode;
  size?: FileDiffSize;
  wrapLines?: boolean;
}

export function FileDiff({
  className,
  emptyLabel = "No diff lines",
  lines,
  renderContent,
  size = "default",
  wrapLines = false,
  "aria-label": ariaLabel = "File diff",
  ...props
}: FileDiffProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ bottom: false, top: false });
  const classes = ["codex-ui-file-diff", className]
    .filter(Boolean)
    .join(" ");

  const updateFade = () => {
    const element = rootRef.current;
    if (!element) return;
    const maximum = element.scrollHeight - element.clientHeight;
    const next = {
      bottom: maximum > 1 && element.scrollTop < maximum - 1,
      top: maximum > 1 && element.scrollTop > 1,
    };
    setFade((current) =>
      current.bottom === next.bottom && current.top === next.top
        ? current
        : next,
    );
  };

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    element.scrollTop = 0;
    updateFade();

    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(updateFade);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [lines]);

  return (
    <div
      aria-label={ariaLabel}
      className={classes}
      data-fade-bottom={fade.bottom || undefined}
      data-fade-top={fade.top || undefined}
      data-size={size}
      data-wrap={wrapLines || undefined}
      onScroll={updateFade}
      ref={rootRef}
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
            <code>
              {renderContent?.(line, index) ??
                line.tokens ??
                (line.content || " ")}
            </code>
          </div>
        ))
      )}
    </div>
  );
}
