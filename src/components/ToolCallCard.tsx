import type { HTMLAttributes } from "react";
import type { AgentItemStatus } from "../types";
import { AgentActivity } from "./AgentActivity";

export interface ToolCallCardProps extends HTMLAttributes<HTMLElement> {
  name: string;
  status: AgentItemStatus;
  summary?: string;
}

export function ToolCallCard({
  className,
  name,
  status,
  summary,
  ...props
}: ToolCallCardProps) {
  const classes = ["codex-ui-tool-call", className].filter(Boolean).join(" ");

  return (
    <AgentActivity
      className={classes}
      detail={status}
      kind="tool"
      status={status}
      summary={name}
      {...props}
    >
      {summary ? <p className="codex-ui-tool-call__summary">{summary}</p> : null}
    </AgentActivity>
  );
}
