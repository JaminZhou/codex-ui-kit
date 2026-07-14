import type { HTMLAttributes } from "react";
import type { AgentItemStatus } from "../types";

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
    <section className={classes} data-status={status} {...props}>
      <header className="codex-ui-tool-call__header">
        <span className="codex-ui-tool-call__indicator" aria-hidden="true" />
        <strong>{name}</strong>
        <span className="codex-ui-tool-call__status">{status}</span>
      </header>
      {summary ? <p className="codex-ui-tool-call__summary">{summary}</p> : null}
    </section>
  );
}

