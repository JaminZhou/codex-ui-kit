import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type ConversationEventKind =
  | "approval"
  | "command"
  | "context"
  | "file-change"
  | "handoff"
  | "message"
  | "plan"
  | "reasoning"
  | "search"
  | "status"
  | "subagent"
  | "tool";

export type ConversationEventOwnership = "thread" | "turn";

export type ConversationEventStatus =
  | "completed"
  | "failed"
  | "interrupted"
  | "pending"
  | "running"
  | "warning";

const conversationEventGlyphs: Record<ConversationEventKind, string> = {
  approval: "!",
  command: "›_",
  context: "◇",
  "file-change": "±",
  handoff: "↗",
  message: "•",
  plan: "☷",
  reasoning: "◌",
  search: "⌕",
  status: "●",
  subagent: "◎",
  tool: "◇",
};

export interface ConversationEventListProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  children?: ReactNode;
  label?: string;
}

export function ConversationEventList({
  children,
  className,
  label = "Conversation events",
  ...props
}: ConversationEventListProps) {
  return (
    <div
      {...props}
      aria-label={label}
      className={["codex-ui-conversation-event-list", className]
        .filter(Boolean)
        .join(" ")}
      role="list"
    >
      {children}
    </div>
  );
}

export interface ConversationEventProps
  extends Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "role" | "title"
  > {
  actions?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  kind: ConversationEventKind;
  meta?: ReactNode;
  ownership?: ConversationEventOwnership;
  status?: ConversationEventStatus;
  title: ReactNode;
}

export function ConversationEvent({
  actions,
  children,
  className,
  description,
  icon,
  kind,
  meta,
  ownership = "turn",
  status = "completed",
  title,
  ...props
}: ConversationEventProps) {
  const liveRole =
    status === "failed"
      ? "alert"
      : status === "running"
        ? "status"
        : undefined;

  return (
    <article
      {...props}
      className={["codex-ui-conversation-event", className]
        .filter(Boolean)
        .join(" ")}
      data-kind={kind}
      data-ownership={ownership}
      data-status={status}
      role="listitem"
    >
      <span
        aria-hidden="true"
        className="codex-ui-conversation-event__icon"
      >
        {icon ?? conversationEventGlyphs[kind]}
      </span>
      <div className="codex-ui-conversation-event__main">
        <div
          aria-busy={status === "running" || undefined}
          aria-live={status === "running" ? "polite" : undefined}
          className="codex-ui-conversation-event__copy"
          role={liveRole}
        >
          <div className="codex-ui-conversation-event__heading">
            <span className="codex-ui-conversation-event__title">
              {title}
            </span>
            {meta ? (
              <span className="codex-ui-conversation-event__meta">
                {meta}
              </span>
            ) : null}
          </div>
          {description ? (
            <div className="codex-ui-conversation-event__description">
              {description}
            </div>
          ) : null}
          {children ? (
            <div className="codex-ui-conversation-event__content">
              {children}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="codex-ui-conversation-event__actions">
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  );
}
