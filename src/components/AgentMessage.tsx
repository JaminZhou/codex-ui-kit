import type { HTMLAttributes, ReactNode } from "react";
import type { AgentMessageRole, AgentItemStatus } from "../types";

export interface AgentMessageProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  role: AgentMessageRole;
  status?: AgentItemStatus;
}

export function AgentMessage({
  children,
  className,
  role,
  status = "completed",
  ...props
}: AgentMessageProps) {
  const classes = ["codex-ui-agent-message", className].filter(Boolean).join(" ");

  return (
    <article
      className={classes}
      data-role={role}
      data-status={status}
      {...props}
    >
      <div className="codex-ui-agent-message__content">{children}</div>
    </article>
  );
}

