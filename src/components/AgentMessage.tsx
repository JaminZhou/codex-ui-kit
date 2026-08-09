import { useId } from "react";
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
  icon?: ReactNode;
  kind?: "file" | "image";
  label?: string;
  meta?: string;
  onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]>;
  previewSrc?: string;
  status?: "preview-error" | "ready";
  statusLabel?: string;
}

export function MessageAttachment({
  "aria-describedby": ariaDescribedBy,
  alt = "",
  className,
  icon,
  kind = "image",
  label = alt || "User attachment",
  meta,
  previewSrc,
  status = "ready",
  statusLabel = status === "preview-error" ? "Preview unavailable" : undefined,
  type = "button",
  ...props
}: MessageAttachmentProps) {
  const classes = ["codex-ui-message-attachment", className]
    .filter(Boolean)
    .join(" ");
  const statusId = useId();
  const hasPreviewError = status === "preview-error" && Boolean(statusLabel);
  const describedBy = [
    ariaDescribedBy,
    hasPreviewError ? statusId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <>
      <button
        aria-describedby={describedBy}
        aria-label={label}
        className={classes}
        data-kind={kind}
        data-status={status}
        type={type}
        {...props}
      >
        {kind === "image" && previewSrc && status === "ready" ? (
          <img alt={alt} src={previewSrc} />
        ) : (
          <>
            <span
              aria-hidden="true"
              className="codex-ui-message-attachment__icon"
            >
              {icon ?? "□"}
            </span>
            <span className="codex-ui-message-attachment__copy">
              <span className="codex-ui-message-attachment__label">{label}</span>
              {meta || statusLabel ? (
                <span className="codex-ui-message-attachment__meta">
                  {statusLabel ?? meta}
                </span>
              ) : null}
            </span>
          </>
        )}
      </button>
      {hasPreviewError ? (
        <span
          className="codex-ui-message-attachment__accessible-status"
          id={statusId}
          role="status"
        >
          {statusLabel}
        </span>
      ) : null}
    </>
  );
}
