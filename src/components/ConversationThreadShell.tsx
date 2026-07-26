import type {
  HTMLAttributes,
  ReactNode,
} from "react";
import {
  AgentThread,
  AgentThreadViewport,
  type AgentThreadProps,
  type AgentThreadViewportProps,
  type AgentThreadWidth,
} from "./AgentThread.js";

export interface ConversationThreadShellProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  composer: ReactNode;
  header: ReactNode;
  label?: string;
  threadLabel?: string;
  threadProps?: Omit<AgentThreadProps, "children" | "width">;
  threadWidth?: AgentThreadWidth;
  viewportProps?: Omit<
    AgentThreadViewportProps,
    "children" | "footer"
  >;
}

export function ConversationThreadShell({
  children,
  className,
  composer,
  header,
  label = "Conversation",
  threadLabel = "Conversation timeline",
  threadProps,
  threadWidth = "wide",
  viewportProps,
  ...props
}: ConversationThreadShellProps) {
  const {
    className: threadClassName,
    ...restThreadProps
  } = threadProps ?? {};
  const {
    className: viewportClassName,
    ...restViewportProps
  } = viewportProps ?? {};

  return (
    <section
      {...props}
      aria-label={label}
      className={[
        "codex-ui-conversation-thread-shell",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="codex-ui-conversation-thread-shell__header">
        {header}
      </div>
      <div className="codex-ui-conversation-thread-shell__body">
        <AgentThreadViewport
          {...restViewportProps}
          className={[
            "codex-ui-conversation-thread-shell__viewport",
            viewportClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <AgentThread
            {...restThreadProps}
            aria-label={threadProps?.["aria-label"] ?? threadLabel}
            className={[
              "codex-ui-conversation-thread-shell__thread",
              threadClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            width={threadWidth}
          >
            {children}
          </AgentThread>
        </AgentThreadViewport>
        <div className="codex-ui-conversation-thread-shell__composer-dock">
          <div className="codex-ui-conversation-thread-shell__composer">
            {composer}
          </div>
        </div>
      </div>
    </section>
  );
}
