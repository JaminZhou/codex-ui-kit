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
  floatingControl?: ReactNode;
  header: ReactNode;
  label?: string;
  messageNavigation?: ReactNode;
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
  floatingControl,
  header,
  label = "Conversation",
  messageNavigation,
  threadLabel = "Conversation timeline",
  threadProps,
  threadWidth = "wide",
  viewportProps,
  ...props
}: ConversationThreadShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const {
    className: threadClassName,
    ...restThreadProps
  } = threadProps ?? {};
  const {
    className: viewportClassName,
    ...restViewportProps
  } = viewportProps ?? {};
  const shouldAutoFollow = restViewportProps.autoFollow ?? true;

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const composerDock = composerDockRef.current;
    if (!body || !composerDock) return;

    const updateComposerReserve = () => {
      const height = composerDock.getBoundingClientRect().height;
      if (height > 0) {
        const viewport = viewportRef.current;
        const shouldPinViewport =
          shouldAutoFollow &&
          viewport?.hasAttribute("data-following") === true;
        body.style.setProperty(
          "--codex-ui-conversation-thread-composer-dock-height",
          `${height}px`,
        );
        if (
          shouldPinViewport &&
          viewport &&
          typeof viewport.scrollTo === "function"
        ) {
          viewport.scrollTo({
            behavior: "auto",
            top: viewport.scrollHeight,
          });
        }
      }
    };

    updateComposerReserve();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateComposerReserve);
    observer.observe(composerDock);
    return () => observer.disconnect();
  }, [shouldAutoFollow]);

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
        {messageNavigation ? (
          <div className="codex-ui-conversation-thread-shell__message-navigation">
            {messageNavigation}
          </div>
        ) : null}
        <AgentThreadViewport
          {...restViewportProps}
          className={[
            "codex-ui-conversation-thread-shell__viewport",
            viewportClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          ref={viewportRef}
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
        {floatingControl ? (
          <div className="codex-ui-conversation-thread-shell__floating-control">
            {floatingControl}
          </div>
        ) : null}
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
