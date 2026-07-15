import type { HTMLAttributes } from "react";
import type { AgentItemStatus } from "../types";

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  status: AgentItemStatus;
}

export function StatusIndicator({
  className,
  status,
  ...props
}: StatusIndicatorProps) {
  const classes = ["codex-ui-status-indicator", className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      aria-hidden="true"
      className={classes}
      data-status={status}
      {...props}
    />
  );
}
