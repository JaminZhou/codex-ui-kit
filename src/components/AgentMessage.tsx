import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from "react";
import type { AgentMessageRole, AgentItemStatus } from "../types.js";

export interface AgentMessageProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode;
  attachments?: ReactNode;
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
  attachments,
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
      {userMessage && attachments ? (
        <div
          aria-label="Message attachments"
          className="codex-ui-agent-message__attachments"
          role="group"
        >
          {attachments}
        </div>
      ) : null}
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

export interface MessageAttachmentProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick"
  > {
  alt?: string;
  label?: string;
  onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]>;
  previewSrc: string;
}

export function MessageAttachment({
  alt = "",
  className,
  label = alt || "User attachment",
  previewSrc,
  type = "button",
  ...props
}: MessageAttachmentProps) {
  const classes = ["codex-ui-message-attachment", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      aria-label={label}
      className={classes}
      type={type}
      {...props}
    >
      <img alt={alt} src={previewSrc} />
    </button>
  );
}
