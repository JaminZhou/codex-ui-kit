import type { HTMLAttributes, ReactNode } from "react";
import type { AgentActivityKind, AgentItemStatus } from "../types";
import { StatusIndicator } from "./StatusIndicator";

export interface AgentActivityProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  defaultOpen?: boolean;
  description?: ReactNode;
  detail?: ReactNode;
  kind?: AgentActivityKind;
  status: AgentItemStatus;
  summary: ReactNode;
}

export function AgentActivity({
  children,
  className,
  defaultOpen = false,
  description,
  detail,
  kind = "generic",
  status,
  summary,
  ...props
}: AgentActivityProps) {
  const classes = ["codex-ui-activity", className].filter(Boolean).join(" ");
  const header = (
    <>
      <StatusIndicator status={status} />
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
      {...props}
    >
      {children ? (
        <details className="codex-ui-activity__disclosure" open={defaultOpen}>
          <summary className="codex-ui-activity__header">{header}</summary>
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
