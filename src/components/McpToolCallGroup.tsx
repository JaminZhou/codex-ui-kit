import type { HTMLAttributes, ReactNode } from "react";
import type { AgentItemStatus } from "../types.js";
import { AgentActivity } from "./AgentActivity.js";

export function McpToolIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-mcp-tool-call-group__icon"
      viewBox="0 0 16 16"
    >
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
      <path d="M6.5 4h3M5 5.5v5M11 5.5v5M6.5 12h3" />
    </svg>
  );
}

export interface McpToolCallGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  activeLabel?: ReactNode;
  children?: ReactNode;
  completedLabel?: ReactNode;
  defaultOpen?: boolean;
  failedLabel?: ReactNode;
  icon?: ReactNode;
  name: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  source?: string;
  status: AgentItemStatus;
}

export function McpToolCallGroup({
  activeLabel,
  children,
  className,
  completedLabel,
  defaultOpen = false,
  failedLabel,
  icon,
  name,
  onOpenChange,
  open,
  source,
  status,
  ...props
}: McpToolCallGroupProps) {
  const classes = ["codex-ui-mcp-tool-call-group", className]
    .filter(Boolean)
    .join(" ");
  const label =
    status === "running" || status === "pending"
      ? (activeLabel ?? `Using ${name} integration`)
      : status === "failed"
        ? (failedLabel ?? `${name} integration failed`)
        : (completedLabel ?? `Used ${name} integration`);

  return (
    <AgentActivity
      className={classes}
      data-source={source}
      defaultOpen={defaultOpen}
      indicator={icon ?? <McpToolIcon />}
      kind="tool"
      onOpenChange={onOpenChange}
      open={open}
      status={status}
      summary={
        <span
          className="codex-ui-mcp-tool-call-group__label"
          data-active={status === "running" || undefined}
        >
          {label}
        </span>
      }
      {...props}
    >
      <div
        aria-label={`${name} tool calls`}
        className="codex-ui-mcp-tool-call-group__calls"
        role="list"
      >
        {children}
      </div>
    </AgentActivity>
  );
}
