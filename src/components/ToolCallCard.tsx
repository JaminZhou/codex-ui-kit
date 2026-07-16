import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

function ToolIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-tool-call__icon"
      viewBox="0 0 16 16"
    >
      <path d="M9.7 2.2a3.2 3.2 0 0 0-3.8 4.7l-3.5 3.5a1.6 1.6 0 0 0 2.2 2.2l3.5-3.5a3.2 3.2 0 0 0 4.7-3.8l-2 2-2.1-.5-.5-2.1 2-2Z" />
    </svg>
  );
}

function RawOutputIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m6 4-4 4 4 4M10 4l4 4-4 4" />
    </svg>
  );
}

function stringifyStructuredContent(value: unknown) {
  try {
    return JSON.stringify(
      value,
      (_key, item) => (typeof item === "bigint" ? item.toString() : item),
      2,
    );
  } catch {
    return null;
  }
}

export interface ToolCallCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  accessory?: ReactNode;
  activeLabel?: ReactNode;
  children?: ReactNode;
  completedLabel?: ReactNode;
  defaultOpen?: boolean;
  emptyLabel?: ReactNode;
  error?: ReactNode;
  failedLabel?: ReactNode;
  icon?: ReactNode;
  name: string;
  onOpenChange?: (open: boolean) => void;
  onViewRawOutput?: (rawOutput: unknown) => void;
  open?: boolean;
  rawOutput?: unknown;
  result?: ReactNode;
  source?: string;
  status: AgentItemStatus;
  structuredContent?: unknown;
  summary?: ReactNode;
  viewRawOutputLabel?: string;
}

export function ToolCallCard({
  accessory,
  activeLabel,
  children,
  className,
  completedLabel,
  defaultOpen = false,
  emptyLabel = "Tool returned no content",
  error,
  failedLabel,
  icon,
  name,
  onOpenChange,
  onViewRawOutput,
  open,
  rawOutput,
  result,
  source,
  status,
  structuredContent,
  summary,
  viewRawOutputLabel = "Show raw tool call output",
  ...props
}: ToolCallCardProps) {
  const classes = ["codex-ui-tool-call", className].filter(Boolean).join(" ");
  const structuredText =
    structuredContent === undefined
      ? null
      : stringifyStructuredContent(structuredContent);
  const resolvedContent = children ?? result;
  const hasContent =
    typeof resolvedContent === "string"
      ? resolvedContent.trim().length > 0
      : resolvedContent !== undefined &&
        resolvedContent !== null &&
        resolvedContent !== false;
  const hasError =
    error !== undefined && error !== null && error !== false;
  const canExpand =
    status === "completed" ||
    status === "failed" ||
    hasContent ||
    hasError ||
    structuredContent !== undefined;
  const label =
    status === "running" || status === "pending"
      ? (activeLabel ?? name)
      : status === "failed"
        ? (failedLabel ?? `${name} failed`)
        : (completedLabel ?? name);
  const body = canExpand ? (
    <div className="codex-ui-tool-call__result">
      {hasError ? (
        <div className="codex-ui-tool-call__error" role="alert">
          {error}
        </div>
      ) : hasContent ? (
        <div className="codex-ui-tool-call__content">{resolvedContent}</div>
      ) : structuredText !== null ? (
        <pre className="codex-ui-tool-call__structured">
          <code>{structuredText}</code>
        </pre>
      ) : (
        <p className="codex-ui-tool-call__empty">{emptyLabel}</p>
      )}
      {rawOutput !== undefined && onViewRawOutput ? (
        <button
          aria-label={viewRawOutputLabel}
          className="codex-ui-tool-call__raw-output"
          onClick={() => onViewRawOutput(rawOutput)}
          title={viewRawOutputLabel}
          type="button"
        >
          <RawOutputIcon />
        </button>
      ) : null}
    </div>
  ) : undefined;

  return (
    <AgentActivity
      className={classes}
      data-source={source}
      defaultOpen={defaultOpen}
      description={
        summary ? <p className="codex-ui-tool-call__summary">{summary}</p> : null
      }
      detail={accessory}
      indicator={icon ?? <ToolIcon />}
      kind="tool"
      onOpenChange={onOpenChange}
      open={open}
      status={status}
      summary={
        <span
          className="codex-ui-tool-call__label"
          data-active={status === "running" || undefined}
        >
          {label}
        </span>
      }
      {...props}
    >
      {body}
    </AgentActivity>
  );
}
