import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import type { AgentMessageRole, AgentItemStatus } from "../types";

export interface AgentMessageProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode;
  children: ReactNode;
  editable?: boolean;
  highlighted?: boolean;
  metadata?: ReactNode;
  onEdit?: () => void;
  role: AgentMessageRole;
  status?: AgentItemStatus;
}

export function AgentMessage({
  actions,
  children,
  className,
  editable = false,
  highlighted = false,
  metadata,
  onEdit,
  role,
  status = "completed",
  ...props
}: AgentMessageProps) {
  const classes = ["codex-ui-agent-message", className].filter(Boolean).join(" ");
  const userMessage = role === "user";
  const canEdit = userMessage && (editable || Boolean(onEdit));
  const activateEdit = (event?: KeyboardEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    if (event && event.key !== "Enter" && event.key !== " ") return;
    event?.preventDefault();
    onEdit?.();
  };

  return (
    <article
      aria-busy={status === "running" || undefined}
      aria-live={status === "running" ? "polite" : undefined}
      className={classes}
      data-highlighted={highlighted || undefined}
      data-role={role}
      data-status={status}
      {...props}
    >
      <div
        className="codex-ui-agent-message__content"
        data-editable={canEdit || undefined}
        data-user-message-bubble={userMessage ? "" : undefined}
        onDoubleClick={canEdit ? () => onEdit?.() : undefined}
        onKeyDown={canEdit ? activateEdit : undefined}
        role={canEdit ? "button" : undefined}
        tabIndex={userMessage ? 0 : undefined}
      >
        {children}
      </div>
      {metadata || actions ? (
        <div className="codex-ui-agent-message__accessories">
          {metadata ? (
            <div className="codex-ui-agent-message__metadata">{metadata}</div>
          ) : null}
          {actions ? (
            <div className="codex-ui-agent-message__actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
