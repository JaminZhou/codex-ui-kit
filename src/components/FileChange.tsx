import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { AgentItemStatus } from "../types.js";
import { AgentActivity } from "./AgentActivity.js";
import { Dialog } from "./Dialog.js";
import { StatusIndicator } from "./StatusIndicator.js";

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

function FileChangeStats({
  additions,
  change,
  deletions,
}: {
  additions?: number;
  change: FileChangeKind;
  deletions?: number;
}) {
  return (
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
}

export interface FileChangeGroupItem {
  additions?: number;
  change: FileChangeKind;
  deletions?: number;
  path: string;
  previousPath?: string;
}

export interface FileChangeGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  changes: readonly FileChangeGroupItem[];
  description?: ReactNode;
  detail?: ReactNode;
  indicator?: ReactNode;
  onOpenFile?: (change: FileChangeGroupItem, index: number) => void;
  status?: FileChangeStatus;
  summary?: ReactNode;
}

export function FileChangeGroup({
  changes,
  className,
  description,
  detail,
  indicator,
  onOpenFile,
  status = "applied",
  summary,
  "aria-label": ariaLabel,
  ...props
}: FileChangeGroupProps) {
  const normalizedStatus = normalizeStatus(status);
  const count = changes.length;
  const fileLabel = count === 1 ? "file" : "files";
  const statusLabel =
    normalizedStatus === "applied"
      ? "Edited"
      : normalizedStatus === "stopped"
        ? "Stopped editing"
        : normalizedStatus === "rejected"
          ? "Rejected"
          : "Editing";
  const classes = ["codex-ui-file-change-group", className]
    .filter(Boolean)
    .join(" ");
  const resolvedSummary = summary ?? `${statusLabel} ${count} ${fileLabel}`;
  const resolvedDescription =
    description === undefined && normalizedStatus === "applied"
      ? "Review changes ↗"
      : description;
  const resolvedAriaLabel =
    ariaLabel ??
    (typeof resolvedSummary === "string" ||
    typeof resolvedSummary === "number"
      ? String(resolvedSummary)
      : undefined);

  return (
    <div
      aria-label={resolvedAriaLabel}
      className={classes}
      data-file-count={count}
      data-file-status={normalizedStatus}
      data-kind="file-change-group"
      role="group"
      {...props}
    >
      <div className="codex-ui-file-change-group__header">
        <span className="codex-ui-file-change-group__indicator">
          {indicator ?? <StatusIndicator status={toAgentStatus(status)} />}
        </span>
        <span className="codex-ui-file-change-group__identity">
          <span className="codex-ui-file-change-group__summary">
            {resolvedSummary}
          </span>
          {resolvedDescription ? (
            <span className="codex-ui-file-change-group__description">
              {resolvedDescription}
            </span>
          ) : null}
        </span>
        {detail ? (
          <span className="codex-ui-file-change-group__detail">{detail}</span>
        ) : null}
      </div>
      <div
        aria-label={`${count} changed ${fileLabel}`}
        className="codex-ui-file-change-group__files"
        role="list"
      >
        {changes.map((change, index) => {
          const pathContent = change.previousPath
            ? `${change.previousPath} → ${change.path}`
            : change.path;
          const content = (
            <>
              <span className="codex-ui-file-change-group__path">
                {pathContent}
              </span>
              <FileChangeStats
                additions={change.additions}
                change={change.change}
                deletions={change.deletions}
              />
            </>
          );

          return (
            <div
              className="codex-ui-file-change-group__file"
              data-change={change.change}
              key={`${change.previousPath ?? ""}:${change.path}`}
              role="listitem"
            >
              {onOpenFile ? (
                <button
                  aria-label={`Open ${change.path}`}
                  onClick={() => onOpenFile(change, index)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  indicator?: ReactNode;
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
  indicator,
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
    <FileChangeStats
      additions={additions}
      change={change}
      deletions={deletions}
    />
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
      indicator={indicator ?? null}
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
  layout?: "split" | "unified";
  lines: readonly FileDiffLine[];
  renderContent?: (line: FileDiffLine, index: number) => ReactNode;
  size?: FileDiffSize;
  wrapLines?: boolean;
}

export function FileDiff({
  className,
  emptyLabel = "No diff lines",
  layout = "unified",
  lines,
  onScroll,
  renderContent,
  size = "default",
  tabIndex = 0,
  wrapLines = false,
  "aria-label": ariaLabel = "File diff",
  ...props
}: FileDiffProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ bottom: false, top: false });
  const classes = ["codex-ui-file-diff", className]
    .filter(Boolean)
    .join(" ");
  const indexedLines = lines.map((line, index) => ({ index, line }));
  const splitRows: Array<{
    after?: (typeof indexedLines)[number];
    before?: (typeof indexedLines)[number];
    spanning?: (typeof indexedLines)[number];
  }> = [];

  if (layout === "split") {
    for (let index = 0; index < indexedLines.length; ) {
      const current = indexedLines[index];
      if (
        current.line.kind === "deletion" ||
        current.line.kind === "addition"
      ) {
        const before: Array<(typeof indexedLines)[number]> = [];
        const after: Array<(typeof indexedLines)[number]> = [];
        const beforeMetadata = new Map<
          number,
          Array<(typeof indexedLines)[number]>
        >();
        const afterMetadata = new Map<
          number,
          Array<(typeof indexedLines)[number]>
        >();
        let lastSide: "after" | "before" | undefined;
        let lastPosition = -1;

        while (
          indexedLines[index] &&
          ["addition", "deletion", "meta"].includes(
            indexedLines[index].line.kind,
          )
        ) {
          const entry = indexedLines[index];
          if (entry.line.kind === "deletion") {
            before.push(entry);
            lastSide = "before";
            lastPosition = before.length - 1;
          } else if (entry.line.kind === "addition") {
            after.push(entry);
            lastSide = "after";
            lastPosition = after.length - 1;
          } else if (lastSide && lastPosition >= 0) {
            const metadata =
              lastSide === "before" ? beforeMetadata : afterMetadata;
            metadata.set(lastPosition, [
              ...(metadata.get(lastPosition) ?? []),
              entry,
            ]);
          }
          index += 1;
        }
        for (
          let pairIndex = 0;
          pairIndex < Math.max(before.length, after.length);
          pairIndex += 1
        ) {
          splitRows.push({
            after: after[pairIndex],
            before: before[pairIndex],
          });
          const beforeMarkers = beforeMetadata.get(pairIndex) ?? [];
          const afterMarkers = afterMetadata.get(pairIndex) ?? [];
          for (
            let markerIndex = 0;
            markerIndex < Math.max(beforeMarkers.length, afterMarkers.length);
            markerIndex += 1
          ) {
            splitRows.push({
              after: afterMarkers[markerIndex],
              before: beforeMarkers[markerIndex],
            });
          }
        }
        continue;
      }
      if (current.line.kind === "context") {
        splitRows.push({ after: current, before: current });
      } else {
        splitRows.push({ spanning: current });
      }
      index += 1;
    }
  }

  const contentFor = ({ index, line }: (typeof indexedLines)[number]) =>
    renderContent?.(line, index) ?? line.tokens ?? (line.content || " ");

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
      data-layout={layout}
      data-size={size}
      data-wrap={wrapLines || undefined}
      onScroll={(event) => {
        updateFade();
        onScroll?.(event);
      }}
      ref={rootRef}
      role="list"
      tabIndex={tabIndex}
      {...props}
    >
      {lines.length === 0 ? (
        <span className="codex-ui-file-diff__empty" role="listitem">
          {emptyLabel}
        </span>
      ) : layout === "split" ? (
        splitRows.map((row, index) => {
          if (row.spanning) {
            const { line } = row.spanning;
            return (
              <div
                aria-label={`${diffLineLabels[line.kind]}: ${line.content}`}
                className="codex-ui-file-diff__split-row"
                data-line-kind={line.kind}
                key={`span:${row.spanning.index}:${line.kind}`}
                role="listitem"
              >
                <span className="codex-ui-file-diff__split-spanning">
                  <span
                    aria-hidden="true"
                    className="codex-ui-file-diff__line-number"
                  />
                  <code>{contentFor(row.spanning)}</code>
                </span>
              </div>
            );
          }

          const labelEntries =
            row.before?.index === row.after?.index
              ? [row.before]
              : [row.before, row.after];
          const labels = labelEntries.flatMap((entry) =>
            entry
              ? [`${diffLineLabels[entry.line.kind]}: ${entry.line.content}`]
              : [],
          );
          return (
            <div
              aria-label={labels.join("; ")}
              className="codex-ui-file-diff__split-row"
              data-line-kind={
                row.before?.line.kind === "context"
                  ? "context"
                  : row.before?.line.kind === "meta" ||
                      row.after?.line.kind === "meta"
                    ? "meta"
                    : "change"
              }
              key={`pair:${index}:${row.before?.index ?? ""}:${row.after?.index ?? ""}`}
              role="listitem"
            >
              {(["before", "after"] as const).map((side) => {
                const entry = row[side];
                return (
                  <span
                    className="codex-ui-file-diff__split-pane"
                    data-line-kind={entry?.line.kind ?? "empty"}
                    data-side={side === "before" ? "old" : "new"}
                    key={side}
                  >
                    <span
                      aria-hidden="true"
                      className="codex-ui-file-diff__line-number"
                    >
                      {side === "before"
                        ? entry?.line.oldLineNumber ?? ""
                        : entry?.line.newLineNumber ?? ""}
                    </span>
                    <code>{entry ? contentFor(entry) : " "}</code>
                  </span>
                );
              })}
            </div>
          );
        })
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
              {contentFor({ index, line })}
            </code>
          </div>
        ))
      )}
    </div>
  );
}

export type FileReviewNoticeKind = "binary" | "conflict";

export type FileReviewContent =
  | {
      kind: "diff";
      lines: readonly FileDiffLine[];
    }
  | {
      description?: string;
      kind: FileReviewNoticeKind;
      title?: string;
    };

export type FileReviewItem = FileChangeGroupItem &
  (
    | {
        content: FileReviewContent;
        lines?: never;
      }
    | {
        content?: never;
        /** Backwards-compatible shorthand for diff content. */
        lines: readonly FileDiffLine[];
      }
  );

export interface FileReviewNoticeProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  description?: string;
  kind: FileReviewNoticeKind;
  title?: string;
}

const fileReviewNoticeDefaults: Record<
  FileReviewNoticeKind,
  { description: string; title: string }
> = {
  binary: {
    description: "This binary change cannot be displayed as text.",
    title: "Binary file changed",
  },
  conflict: {
    description: "Resolve the conflict markers before merging.",
    title: "Merge conflict detected",
  },
};

export function FileReviewNotice({
  className,
  description,
  kind,
  title,
  "aria-label": ariaLabel,
  ...props
}: FileReviewNoticeProps) {
  const fallback = fileReviewNoticeDefaults[kind];
  const resolvedTitle = title ?? fallback.title;
  const resolvedDescription = description ?? fallback.description;
  const classes = ["codex-ui-file-review-notice", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-label={ariaLabel ?? resolvedTitle}
      className={classes}
      data-kind={kind}
      role="group"
      tabIndex={0}
      {...props}
    >
      <span
        aria-hidden="true"
        className="codex-ui-file-review-notice__indicator"
      >
        {kind === "binary" ? "◫" : "!"}
      </span>
      <span className="codex-ui-file-review-notice__identity">
        <strong>{resolvedTitle}</strong>
        <span>{resolvedDescription}</span>
      </span>
    </div>
  );
}

export interface FileReviewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  files: readonly FileReviewItem[];
  /** Change this key to reveal the selected path again after repeated activation. */
  selectionKey?: number | string;
  onSelectFile?: (file: FileReviewItem, index: number) => void;
  selectedPath?: string;
  wrapLines?: boolean;
}

export function FileReview({
  className,
  files,
  selectionKey,
  onSelectFile,
  selectedPath,
  wrapLines = true,
  "aria-label": ariaLabel = "File review",
  ...props
}: FileReviewProps) {
  const classes = ["codex-ui-file-review", className]
    .filter(Boolean)
    .join(" ");
  const selectedFileRef = useRef<HTMLElement | null>(null);
  const selectedFileLayoutKey = useMemo(() => {
    const selectedFileIndex = selectedPath
      ? files.findIndex(({ path }) => path === selectedPath)
      : -1;
    return selectedFileIndex < 0
      ? "missing"
      : JSON.stringify(
          files
            .slice(0, selectedFileIndex + 1)
            .map((file) => {
              const content =
                file.content ??
                ({ kind: "diff", lines: file.lines } as const);
              return {
                change: file.change,
                content:
                  content.kind === "diff"
                    ? {
                        kind: content.kind,
                        lines: content.lines.map(
                          ({
                            content: lineContent,
                            kind,
                            newLineNumber,
                            oldLineNumber,
                          }) => ({
                            content: lineContent,
                            kind,
                            newLineNumber,
                            oldLineNumber,
                          }),
                        ),
                      }
                    : content,
                path: file.path,
                previousPath: file.previousPath,
              };
            }),
        );
  }, [files, selectedPath]);

  useLayoutEffect(() => {
    const selectedFile = selectedFileRef.current;
    if (
      !selectedPath ||
      !selectedFile ||
      typeof selectedFile.scrollIntoView !== "function"
    ) {
      return;
    }
    selectedFile.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedFileLayoutKey, selectedPath, selectionKey, wrapLines]);

  return (
    <div
      aria-label={ariaLabel}
      className={classes}
      data-file-count={files.length}
      role="list"
      {...props}
    >
      {files.map((file, index) => {
        const pathContent = file.previousPath
          ? `${file.previousPath} → ${file.path}`
          : file.path;
        const selected = selectedPath === file.path;
        const content =
          file.content ?? ({ kind: "diff", lines: file.lines } as const);
        return (
          <section
            aria-current={selected || undefined}
            aria-label={`Review file ${file.path}`}
            className="codex-ui-file-review__file"
            data-change={file.change}
            data-selected={selected || undefined}
            key={`${file.previousPath ?? ""}:${file.path}`}
            ref={selected ? selectedFileRef : undefined}
            role="listitem"
          >
            <div className="codex-ui-file-review__header">
              {onSelectFile ? (
                <button
                  aria-label={`Select review for ${file.path}`}
                  onClick={() => onSelectFile(file, index)}
                  type="button"
                >
                  <code>{pathContent}</code>
                </button>
              ) : (
                <code>{pathContent}</code>
              )}
              <FileChangeStats
                additions={file.additions}
                change={file.change}
                deletions={file.deletions}
              />
            </div>
            {content.kind === "diff" ? (
              <FileDiff
                aria-label={`Review diff for ${file.path}`}
                className="codex-ui-file-review__content"
                emptyLabel="No content"
                lines={content.lines}
                tabIndex={0}
                wrapLines={wrapLines}
              />
            ) : (
              <FileReviewNotice
                aria-label={`Review ${content.kind} change for ${file.path}`}
                className="codex-ui-file-review__content"
                description={content.description}
                kind={content.kind}
                title={content.title}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

export type FileReviewWorkspaceScope =
  | "Last Turn"
  | "Uncommitted"
  | "Unstaged"
  | "Staged"
  | "Committed"
  | "Branch";

export type FileReviewWorkspaceIconName =
  | "scopeChevron"
  | "options"
  | "collapseAll"
  | "jumpToFile"
  | "splitDiff"
  | "filesToggle"
  | "commit"
  | "moreGit"
  | "copyPath"
  | "fileToggle"
  | "openIn"
  | "search"
  | "file";

export type FileReviewWorkspaceIcons = Partial<
  Record<FileReviewWorkspaceIconName, ReactNode>
>;

export interface FileReviewWorkspaceProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  defaultFilesVisible?: boolean;
  defaultScope?: FileReviewWorkspaceScope;
  defaultSplit?: boolean;
  files: readonly FileReviewItem[];
  icons?: FileReviewWorkspaceIcons;
  onCommit?: () => void;
  onCopyPath?: (file: FileReviewItem, index: number) => void | Promise<void>;
  onMoreGitActions?: () => void;
  onOpenFile?: (file: FileReviewItem, index: number) => void;
  onReviewOptions?: () => void;
  onScopeChange?: (scope: FileReviewWorkspaceScope) => void;
  rootLabel?: string;
  scope?: FileReviewWorkspaceScope;
  /** Change this key to reveal the selected path again after repeated activation. */
  selectionKey?: number | string;
  selectedPath?: string;
}

const fileReviewWorkspaceScopes: readonly FileReviewWorkspaceScope[] = [
  "Last Turn",
  "Uncommitted",
  "Unstaged",
  "Staged",
  "Committed",
  "Branch",
];

const fileReviewWorkspaceFallbackIcons: Record<
  FileReviewWorkspaceIconName,
  ReactNode
> = {
  collapseAll: "⇈",
  commit: "●",
  copyPath: "▣",
  file: "▤",
  fileToggle: "⌃",
  filesToggle: "▥",
  jumpToFile: "↧",
  moreGit: "⌄",
  openIn: "↗",
  options: "•••",
  scopeChevron: "⌄",
  search: "⌕",
  splitDiff: "▥",
};

function reviewWorkspaceContent(file: FileReviewItem): FileReviewContent {
  return file.content ?? { kind: "diff", lines: file.lines };
}

function reviewWorkspaceStatus(change: FileChangeKind) {
  if (change === "added") return "+";
  if (change === "deleted") return "";
  if (change === "renamed") return "R";
  return "•";
}

function moveReviewPopupFocus(
  event: KeyboardEvent<HTMLElement>,
  selector: string,
) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return false;
  }
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(
    selector,
  )];
  if (items.length === 0) return false;
  const currentIndex = items.indexOf(
    document.activeElement as HTMLButtonElement,
  );
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? currentIndex < 0
            ? 0
            : (currentIndex + 1) % items.length
          : currentIndex < 0
            ? items.length - 1
            : (currentIndex - 1 + items.length) % items.length;
  event.preventDefault();
  items[nextIndex]?.focus();
  return true;
}

export function FileReviewWorkspace({
  className,
  defaultFilesVisible = true,
  defaultScope = "Last Turn",
  defaultSplit = false,
  files,
  icons = {},
  onCommit,
  onCopyPath,
  onMoreGitActions,
  onOpenFile,
  onReviewOptions,
  onScopeChange,
  rootLabel = "Changes",
  scope,
  selectionKey,
  selectedPath,
  "aria-label": ariaLabel = "Review workspace",
  ...props
}: FileReviewWorkspaceProps) {
  const [internalScope, setInternalScope] = useState(defaultScope);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [filesVisible, setFilesVisible] = useState(defaultFilesVisible);
  const [split, setSplit] = useState(defaultSplit);
  const [internalSelectedPath, setInternalSelectedPath] = useState(
    files[0]?.path ?? null,
  );
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(
    () => new Set(),
  );
  const scopeButtonRef = useRef<HTMLButtonElement>(null);
  const scopeMenuRef = useRef<HTMLSpanElement>(null);
  const scopeWrapRef = useRef<HTMLSpanElement>(null);
  const jumpButtonRef = useRef<HTMLButtonElement>(null);
  const jumpMenuRef = useRef<HTMLSpanElement>(null);
  const jumpWrapRef = useRef<HTMLSpanElement>(null);
  const fileElementsRef = useRef(new Map<string, HTMLElement>());
  const resolvedScope = scope ?? internalScope;
  const resolvedSelectedPath = selectedPath ?? internalSelectedPath;
  const additions = files.reduce(
    (total, file) => total + (file.additions ?? 0),
    0,
  );
  const deletions = files.reduce(
    (total, file) => total + (file.deletions ?? 0),
    0,
  );
  const basenameCounts = files.reduce((counts, file) => {
    const basename = file.path.split("/").at(-1) ?? file.path;
    counts.set(basename, (counts.get(basename) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const treeLabel = (file: FileReviewItem) => {
    const basename = file.path.split("/").at(-1) ?? file.path;
    return basenameCounts.get(basename) === 1 ? basename : file.path;
  };
  const visibleFiles = files.filter((file) =>
    file.path.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()),
  );
  const allDiffsCollapsed =
    files.length > 0 &&
    files.every(({ path }) => collapsedPaths.has(path));
  const icon = (name: FileReviewWorkspaceIconName) => (
    <span aria-hidden="true" className="codex-ui-file-review-workspace__icon">
      {icons[name] ?? fileReviewWorkspaceFallbackIcons[name]}
    </span>
  );
  const closePopup = (
    setter: (open: boolean) => void,
    returnFocus: { current: HTMLButtonElement | null },
  ) => {
    setter(false);
    window.setTimeout(() => returnFocus.current?.focus());
  };
  const selectFile = (file: FileReviewItem, index: number) => {
    setInternalSelectedPath(file.path);
    onOpenFile?.(file, index);
    fileElementsRef.current
      .get(file.path)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const classes = ["codex-ui-file-review-workspace", className]
    .filter(Boolean)
    .join(" ");

  useLayoutEffect(() => {
    if (
      resolvedSelectedPath &&
      files.some(({ path }) => path === resolvedSelectedPath)
    ) {
      return;
    }
    setInternalSelectedPath(files[0]?.path ?? null);
  }, [files, resolvedSelectedPath]);

  useLayoutEffect(() => {
    if (!selectedPath) return;
    fileElementsRef.current
      .get(selectedPath)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [files, selectedPath, selectionKey]);

  useLayoutEffect(() => {
    const currentPaths = new Set(files.map(({ path }) => path));
    setCollapsedPaths((current) => {
      const next = new Set(
        [...current].filter((path) => currentPaths.has(path)),
      );
      return next.size === current.size ? current : next;
    });
  }, [files]);

  useLayoutEffect(() => {
    if (!scopeOpen) return;
    const selected = scopeMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"][aria-checked="true"]',
    );
    const first = scopeMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitemradio"]',
    );
    (selected ?? first)?.focus();
  }, [scopeOpen]);

  useLayoutEffect(() => {
    if (!jumpOpen) return;
    const selected = jumpMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="option"][aria-selected="true"]',
    );
    const first = jumpMenuRef.current?.querySelector<HTMLButtonElement>(
      '[role="option"]',
    );
    (selected ?? first)?.focus();
  }, [jumpOpen]);

  useEffect(() => {
    if (!scopeOpen && !jumpOpen) return;
    const dismissForTarget = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;
      if (scopeOpen && !scopeWrapRef.current?.contains(target)) {
        setScopeOpen(false);
      }
      if (jumpOpen && !jumpWrapRef.current?.contains(target)) {
        setJumpOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) =>
      dismissForTarget(event.target);
    const handleFocusIn = (event: FocusEvent) =>
      dismissForTarget(event.target);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [jumpOpen, scopeOpen]);

  return (
    <div
      aria-label={ariaLabel}
      className={classes}
      data-files-visible={filesVisible || undefined}
      data-layout={split ? "split" : "unified"}
      role="region"
      {...props}
    >
      <div
        aria-label="Review controls"
        className="codex-ui-file-review-workspace__toolbar"
        onClickCapture={(event) => {
          const target = event.target;
          if (!(target instanceof Node)) return;
          if (!scopeWrapRef.current?.contains(target)) setScopeOpen(false);
          if (!jumpWrapRef.current?.contains(target)) setJumpOpen(false);
        }}
        role="toolbar"
      >
        <span
          className="codex-ui-file-review-workspace__scope-wrap"
          ref={scopeWrapRef}
        >
          <button
            aria-expanded={scopeOpen}
            aria-haspopup="menu"
            className="codex-ui-file-review-workspace__scope"
            onClick={() => {
              setJumpOpen(false);
              setScopeOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !scopeOpen) return;
              event.preventDefault();
              closePopup(setScopeOpen, scopeButtonRef);
            }}
            ref={scopeButtonRef}
            type="button"
          >
            {resolvedScope}
            {icon("scopeChevron")}
          </button>
          {scopeOpen ? (
            <span
              aria-label="Review scope"
              className="codex-ui-file-review-workspace__menu"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closePopup(setScopeOpen, scopeButtonRef);
                  return;
                }
                moveReviewPopupFocus(event, '[role="menuitemradio"]');
              }}
              ref={scopeMenuRef}
              role="menu"
            >
              {fileReviewWorkspaceScopes.map((item) => (
                <button
                  aria-checked={item === resolvedScope}
                  key={item}
                  onClick={() => {
                    if (scope === undefined) setInternalScope(item);
                    onScopeChange?.(item);
                    closePopup(setScopeOpen, scopeButtonRef);
                  }}
                  role="menuitemradio"
                  tabIndex={item === resolvedScope ? 0 : -1}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </span>
          ) : null}
        </span>
        <span className="codex-ui-file-review-workspace__stats">
          <span data-stat="additions">+{additions}</span>
          <span data-stat="deletions">−{deletions}</span>
        </span>
        <span className="codex-ui-file-review-workspace__toolbar-actions">
          <button
            aria-label="Review options"
            className="codex-ui-file-review-workspace__optional-action"
            onClick={onReviewOptions}
            type="button"
          >
            {icon("options")}
          </button>
          <button
            aria-label={
              allDiffsCollapsed ? "Expand all diffs" : "Collapse all diffs"
            }
            className="codex-ui-file-review-workspace__optional-action"
            onClick={() =>
              setCollapsedPaths(() =>
                allDiffsCollapsed
                  ? new Set()
                  : new Set(files.map(({ path }) => path)),
              )
            }
            type="button"
          >
            {icon("collapseAll")}
          </button>
          <span
            className="codex-ui-file-review-workspace__jump-wrap"
            ref={jumpWrapRef}
          >
            <button
              aria-expanded={jumpOpen}
              aria-haspopup="listbox"
              aria-label="Jump to file"
              onClick={() => {
                setScopeOpen(false);
                setJumpOpen((open) => !open);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Escape" || !jumpOpen) return;
                event.preventDefault();
                closePopup(setJumpOpen, jumpButtonRef);
              }}
              ref={jumpButtonRef}
              type="button"
            >
              {icon("jumpToFile")}
            </button>
            {jumpOpen ? (
              <span
                aria-label="Changed files"
                className="codex-ui-file-review-workspace__menu codex-ui-file-review-workspace__jump-menu"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closePopup(setJumpOpen, jumpButtonRef);
                    return;
                  }
                  moveReviewPopupFocus(event, '[role="option"]');
                }}
                ref={jumpMenuRef}
                role="listbox"
              >
                {files.map((file, index) => (
                  <button
                    aria-selected={file.path === resolvedSelectedPath}
                    key={file.path}
                    onClick={() => {
                      selectFile(file, index);
                      closePopup(setJumpOpen, jumpButtonRef);
                    }}
                    role="option"
                    tabIndex={file.path === resolvedSelectedPath ? 0 : -1}
                    type="button"
                  >
                    {file.path}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
          <button
            aria-label={split ? "Switch to unified diff" : "Switch to split diff"}
            className="codex-ui-file-review-workspace__optional-action"
            onClick={() => setSplit((value) => !value)}
            type="button"
          >
            {icon("splitDiff")}
          </button>
          <button
            aria-label={filesVisible ? "Hide files" : "Show files"}
            onClick={() => setFilesVisible((visible) => !visible)}
            type="button"
          >
            {icon("filesToggle")}
          </button>
          <span className="codex-ui-file-review-workspace__git-actions">
            <button aria-label="Commit or push" onClick={onCommit} type="button">
              {icon("commit")}
              <span>Commit or push</span>
            </button>
            <button
              aria-label="More Git actions"
              onClick={onMoreGitActions}
              type="button"
            >
              {icon("moreGit")}
            </button>
          </span>
        </span>
      </div>
      <div className="codex-ui-file-review-workspace__body">
        <div
          aria-label="Review diffs"
          className="codex-ui-file-review-workspace__diffs"
          role="list"
        >
          {files.map((file, index) => {
            const content = reviewWorkspaceContent(file);
            const collapsed = collapsedPaths.has(file.path);
            return (
              <section
                aria-label={`Review file ${file.path}`}
                className="codex-ui-file-review-workspace__diff"
                data-change={file.change}
                data-collapsed={collapsed || undefined}
                data-review-workspace-path={file.path}
                key={file.path}
                ref={(element) => {
                  if (element) fileElementsRef.current.set(file.path, element);
                  else fileElementsRef.current.delete(file.path);
                }}
                role="listitem"
              >
                <header>
                  <span className="codex-ui-file-review-workspace__file-identity">
                    {icon("file")}
                    <code>{file.path}</code>
                  </span>
                  <FileChangeStats
                    additions={file.additions}
                    change={file.change}
                    deletions={file.deletions}
                  />
                  <span className="codex-ui-file-review-workspace__file-actions">
                    <button
                      aria-label="Copy path"
                      onClick={() => {
                        if (onCopyPath) void onCopyPath(file, index);
                        else copyWithClipboard(file.path);
                      }}
                      type="button"
                    >
                      {icon("copyPath")}
                    </button>
                    <button
                      aria-expanded={!collapsed}
                      aria-label="Toggle file diff"
                      onClick={() =>
                        setCollapsedPaths((current) => {
                          const next = new Set(current);
                          if (next.has(file.path)) next.delete(file.path);
                          else next.add(file.path);
                          return next;
                        })
                      }
                      type="button"
                    >
                      {icon("fileToggle")}
                    </button>
                    <button
                      aria-label="Open in"
                      onClick={() => onOpenFile?.(file, index)}
                      type="button"
                    >
                      {icon("openIn")}
                    </button>
                  </span>
                </header>
                {!collapsed ? (
                  content.kind === "diff" ? (
                    <FileDiff
                      aria-label={`Review diff for ${file.path}`}
                      layout={split ? "split" : "unified"}
                      lines={content.lines}
                      tabIndex={0}
                      wrapLines={false}
                    />
                  ) : (
                    <FileReviewNotice
                      description={content.description}
                      kind={content.kind}
                      title={content.title}
                    />
                  )
                ) : null}
              </section>
            );
          })}
        </div>
        {filesVisible ? (
          <aside
            aria-label="Changed files"
            className="codex-ui-file-review-workspace__files"
          >
            <label className="codex-ui-file-review-workspace__filter">
              {icon("search")}
              <input
                aria-label="Filter files"
                onChange={(event) => setFilter(event.currentTarget.value)}
                placeholder="Filter files…"
                type="search"
                value={filter}
              />
            </label>
            <div className="codex-ui-file-review-workspace__tree" role="tree">
              <div className="codex-ui-file-review-workspace__root">
                {icon("scopeChevron")}
                {rootLabel}
              </div>
              {visibleFiles.map((file) => {
                const index = files.indexOf(file);
                return (
                  <button
                    aria-label={`Select ${file.path}`}
                    data-change={file.change}
                    data-selected={
                      resolvedSelectedPath === file.path || undefined
                    }
                    key={file.path}
                    onClick={() => selectFile(file, index)}
                    role="treeitem"
                    type="button"
                  >
                    {icon("file")}
                    <span>{treeLabel(file)}</span>
                    <span
                      aria-label={file.change}
                      className="codex-ui-file-review-workspace__status"
                    >
                      {reviewWorkspaceStatus(file.change)}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export interface FileRevertErrorDialogProps {
  closeIcon?: ReactNode;
  description?: ReactNode;
  onSelectFile?: (path: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  skippedFiles?: readonly string[];
  statusIcon?: ReactNode;
  title?: ReactNode;
}

function FileRevertErrorIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7.231 7.231a.665.665 0 0 1 .94 0L10 9.06l1.828-1.829.104-.085a.666.666 0 0 1 .921.922l-.084.104L10.94 10l1.829 1.828a.665.665 0 0 1-.94.94L10 10.94l-1.828 1.83a.665.665 0 0 1-.94-.94L9.06 10 7.23 8.172a.665.665 0 0 1 0-.94Z" />
      <path
        clipRule="evenodd"
        d="M10 2.085a7.915 7.915 0 1 1 0 15.83 7.915 7.915 0 0 1 0-15.83Zm0 1.33a6.585 6.585 0 1 0 0 13.17 6.585 6.585 0 0 0 0-13.17Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function FileRevertErrorDialog({
  closeIcon,
  description = "There were issues reverting some files",
  onSelectFile,
  onOpenChange,
  open,
  skippedFiles = [],
  statusIcon = <FileRevertErrorIcon />,
  title = "No changes reverted",
}: FileRevertErrorDialogProps) {
  return (
    <Dialog
      className="codex-ui-file-revert-error-dialog"
      closeIcon={closeIcon}
      description={description}
      footer={
        <button
          className="codex-ui-file-revert-error-dialog__close-action"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          Close
        </button>
      }
      initialFocusSelector=".codex-ui-file-revert-error-dialog__close-action"
      onOpenChange={onOpenChange}
      open={open}
      size="compact"
      title={
        <>
          <span className="codex-ui-file-revert-error-dialog__status-icon">
            {statusIcon}
          </span>
          <span>{title}</span>
        </>
      }
    >
      {skippedFiles.length > 0 ? (
        <section
          aria-label={`Skipped files (${skippedFiles.length})`}
          className="codex-ui-file-revert-error-dialog__skipped"
        >
          <div className="codex-ui-file-revert-error-dialog__skipped-label">
            Skipped ({skippedFiles.length})
          </div>
          <div role="list">
            {skippedFiles.map((path) =>
              onSelectFile ? (
                <button
                  className="codex-ui-file-revert-error-dialog__file"
                  key={path}
                  onClick={() => onSelectFile(path)}
                  role="listitem"
                  type="button"
                >
                  {path}
                </button>
              ) : (
                <div
                  className="codex-ui-file-revert-error-dialog__file"
                  key={path}
                  role="listitem"
                >
                  {path}
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}
    </Dialog>
  );
}
