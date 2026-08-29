import type {
  HTMLAttributes,
  ReactNode,
  Ref,
  RefCallback,
} from "react";
import {
  useCallback,
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
  aboveComposer?: ReactNode;
  children: ReactNode;
  composer: ReactNode;
  floatingControl?: ReactNode;
  header: ReactNode;
  isRunning?: boolean;
  label?: string;
  messageNavigation?: ReactNode;
  threadLabel?: string;
  threadProps?: Omit<AgentThreadProps, "children" | "width">;
  threadWidth?: AgentThreadWidth;
  viewportRef?: Ref<HTMLDivElement>;
  viewportProps?: Omit<
    AgentThreadViewportProps,
    "children" | "footer"
  >;
}

export function ConversationThreadShell({
  aboveComposer,
  children,
  className,
  composer,
  floatingControl,
  header,
  isRunning = false,
  label = "Conversation",
  messageNavigation,
  threadLabel = "Conversation timeline",
  threadProps,
  threadWidth = "wide",
  viewportRef: forwardedViewportRef,
  viewportProps,
  ...props
}: ConversationThreadShellProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const composerDockRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      if (typeof forwardedViewportRef === "function") {
        const cleanup = (
          forwardedViewportRef as RefCallback<HTMLDivElement>
        )(node);
        if (typeof cleanup === "function") {
          return () => {
            try {
              cleanup();
            } finally {
              if (viewportRef.current === node) {
                viewportRef.current = null;
              }
            }
          };
        }
      } else if (forwardedViewportRef) {
        forwardedViewportRef.current = node;
      }
    },
    [forwardedViewportRef],
  );
  const {
    className: threadClassName,
    ...restThreadProps
  } = threadProps ?? {};
  const {
    className: viewportClassName,
    latestOrigin: requestedLatestOrigin,
    ...restViewportProps
  } = viewportProps ?? {};
  const latestOrigin =
    requestedLatestOrigin ?? (isRunning ? "start" : "end");
  const shouldAutoFollow = restViewportProps.autoFollow ?? true;
  const runningFollowBaseHeightRef = useRef(0);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const composerDock = composerDockRef.current;
    if (!body || !composerDock) return;

    const updateComposerReserve = () => {
      const height = composerDock.getBoundingClientRect().height;
      if (height > 0) {
        const bodyHeight = body.getBoundingClientRect().height;
        const viewport = viewportRef.current;
        const shouldPinViewport =
          shouldAutoFollow &&
          viewport?.hasAttribute("data-following") === true;
        body.style.setProperty(
          "--codex-ui-conversation-thread-composer-dock-height",
          `${height}px`,
        );
        if (bodyHeight > 0) {
          body.style.setProperty(
            "--codex-ui-message-navigation-available-height",
            `${Math.max(0, bodyHeight - height)}px`,
          );
          if (isRunning && latestOrigin === "start") {
            runningFollowBaseHeightRef.current = Math.max(
              runningFollowBaseHeightRef.current,
              bodyHeight,
            );
            body.style.setProperty(
              "--codex-ui-conversation-thread-running-follow-base-height",
              `${runningFollowBaseHeightRef.current}px`,
            );
          } else {
            runningFollowBaseHeightRef.current = 0;
            body.style.removeProperty(
              "--codex-ui-conversation-thread-running-follow-base-height",
            );
          }
        }
        if (
          shouldPinViewport &&
          viewport &&
          typeof viewport.scrollTo === "function"
        ) {
          viewport.scrollTo({
            behavior: "auto",
            top: latestOrigin === "start" ? 0 : viewport.scrollHeight,
          });
        }
      }
    };

    updateComposerReserve();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateComposerReserve);
    observer.observe(composerDock);
    observer.observe(body);
    return () => observer.disconnect();
  }, [isRunning, latestOrigin, shouldAutoFollow]);

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
      data-latest-origin={latestOrigin}
      data-running={isRunning || undefined}
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
          latestOrigin={latestOrigin}
          ref={setViewportRef}
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
          {aboveComposer ? (
            <div className="codex-ui-conversation-thread-shell__above-composer">
              {aboveComposer}
            </div>
          ) : null}
          <div className="codex-ui-conversation-thread-shell__composer">
            {composer}
          </div>
        </div>
      </div>
    </section>
  );
}
