import type {
  HTMLAttributes,
  ReactNode,
} from "react";
import {
  useLayoutEffect,
  useRef,
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLDivElement>(null);
  const {
    className: threadClassName,
    ...restThreadProps
  } = threadProps ?? {};
  const {
    className: viewportClassName,
    ...restViewportProps
  } = viewportProps ?? {};

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const composerDock = composerDockRef.current;
    if (!body || !composerDock) return;

    const updateComposerReserve = () => {
      const height = composerDock.getBoundingClientRect().height;
      if (height > 0) {
        body.style.setProperty(
          "--codex-ui-conversation-thread-composer-dock-height",
          `${height}px`,
        );
      }
    };

    updateComposerReserve();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateComposerReserve);
    observer.observe(composerDock);
    return () => observer.disconnect();
  }, []);

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
      <div
        className="codex-ui-conversation-thread-shell__body"
        ref={bodyRef}
      >
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
        <div
          className="codex-ui-conversation-thread-shell__composer-dock"
          ref={composerDockRef}
        >
          <div className="codex-ui-conversation-thread-shell__composer">
            {composer}
          </div>
        </div>
      </div>
    </section>
  );
}
