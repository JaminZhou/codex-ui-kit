import { useState, type HTMLAttributes, type ReactNode } from "react";
import type { AgentActivityKind } from "../types";
import {
  StatusIndicator,
  type StatusIndicatorStatus,
} from "./StatusIndicator";

export type AgentActivityStatus = StatusIndicatorStatus;

export interface AgentActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  defaultOpen?: boolean;
  description?: ReactNode;
  detail?: ReactNode;
  indicator?: ReactNode;
  kind?: AgentActivityKind;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  status: AgentActivityStatus;
  summary: ReactNode;
}

export function AgentActivity({
  children,
  className,
  defaultOpen = false,
  description,
  detail,
  indicator,
  kind = "generic",
  onOpenChange,
  open,
  status,
  summary,
  ...props
}: AgentActivityProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? internalOpen;
  const classes = ["codex-ui-activity", className].filter(Boolean).join(" ");
  const hasBody = children !== undefined && children !== null;
  const header = (
    <>
      {indicator === undefined ? <StatusIndicator status={status} /> : indicator}
      <span className="codex-ui-activity__summary">{summary}</span>
      {detail ? (
        <span className="codex-ui-activity__detail">{detail}</span>
      ) : null}
    </>
  );

  return (
    <div
      className={classes}
      data-kind={kind}
      data-status={status}
      data-expandable={hasBody || undefined}
      {...props}
    >
      {hasBody ? (
        <details
          className="codex-ui-activity__disclosure"
          onToggle={(event) => {
            const nextOpen = event.currentTarget.open;
            if (open !== undefined) {
              if (nextOpen !== open) {
                onOpenChange?.(nextOpen);
                event.currentTarget.open = open;
              }
              return;
            }

            setInternalOpen(nextOpen);
            onOpenChange?.(nextOpen);
          }}
          open={resolvedOpen}
        >
          <summary
            aria-expanded={resolvedOpen}
            className="codex-ui-activity__header"
            onClick={(event) => {
              if (open === undefined) return;
              event.preventDefault();
              onOpenChange?.(!open);
            }}
          >
            {header}
          </summary>
          <div className="codex-ui-activity__body">{children}</div>
        </details>
      ) : (
        <div className="codex-ui-activity__header">{header}</div>
      )}
      {description ? (
        <div className="codex-ui-activity__description">{description}</div>
      ) : null}
    </div>
  );
}
