import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefCallback,
  type UIEvent,
} from "react";

export type AgentThreadWidth = "narrow" | "wide" | "full";

export interface AgentThreadProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  width?: AgentThreadWidth;
}

export function AgentThread({
  children,
  className,
  width = "wide",
  ...props
}: AgentThreadProps) {
  const classes = ["codex-ui-thread", className].filter(Boolean).join(" ");

  return (
    <section className={classes} data-width={width} {...props}>
      {children}
    </section>
  );
}

export type AgentTurnSpacing = "grouped" | "standard";

export interface AgentTurnProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  spacing?: AgentTurnSpacing;
}

export function AgentTurn({
  children,
  className,
  spacing = "standard",
  ...props
}: AgentTurnProps) {
  return (
    <div
      className={["codex-ui-agent-turn", className].filter(Boolean).join(" ")}
      data-spacing={spacing}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AgentThreadViewportProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onScroll"> {
  autoFollow?: boolean;
  children: ReactNode;
  defaultFollowing?: boolean;
  followKey?: string | number;
  followThreshold?: number;
  footer?: ReactNode;
  /**
   * Scroll origin used by the host. Reverse-origin threads keep the latest
   * content at scrollTop zero and move into history with negative values.
   * @default "end"
   */
  latestOrigin?: "end" | "start";
  onFollowingChange?: (following: boolean) => void;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  topInset?: CSSProperties["paddingTop"];
}

export const AgentThreadViewport = forwardRef<
  HTMLDivElement,
  AgentThreadViewportProps
>(function AgentThreadViewport(
  {
    autoFollow = true,
    children,
    className,
    defaultFollowing = true,
    followKey,
    followThreshold = 24,
    footer,
    latestOrigin = "end",
    onFollowingChange,
    onScroll,
    style,
    tabIndex = 0,
    topInset,
    ...props
  },
  forwardedRef,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(defaultFollowing);
  const [renderedLatestOrigin, setRenderedLatestOrigin] =
    useState(latestOrigin);
  const followingRef = useRef(defaultFollowing);
  const pendingOriginDistanceRef = useRef<number | null>(null);
  const programmaticFollowTargetRef = useRef<number | null>(null);
  const setViewportRef = useCallback(
    (viewport: HTMLDivElement | null) => {
      viewportRef.current = viewport;
      if (typeof forwardedRef === "function") {
        const cleanup = (
          forwardedRef as RefCallback<HTMLDivElement>
        )(viewport);
        if (typeof cleanup === "function") {
          return () => {
            try {
              cleanup();
            } finally {
              if (viewportRef.current === viewport) {
                viewportRef.current = null;
              }
            }
          };
        }
      } else if (forwardedRef) {
        forwardedRef.current = viewport;
      }
    },
    [forwardedRef],
  );

  const updateFollowing = useCallback(
    (nextFollowing: boolean) => {
      if (followingRef.current === nextFollowing) return;
      followingRef.current = nextFollowing;
      setFollowing(nextFollowing);
      onFollowingChange?.(nextFollowing);
    },
    [onFollowingChange],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || renderedLatestOrigin === latestOrigin) return;
    if (!followingRef.current) {
      pendingOriginDistanceRef.current =
        renderedLatestOrigin === "start"
          ? Math.abs(viewport.scrollTop)
          : Math.max(
              0,
              viewport.scrollHeight -
                viewport.clientHeight -
                viewport.scrollTop,
            );
    }
    setRenderedLatestOrigin(latestOrigin);
  }, [latestOrigin, renderedLatestOrigin]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const distanceFromLatest = pendingOriginDistanceRef.current;
    if (
      !viewport ||
      distanceFromLatest === null ||
      renderedLatestOrigin !== latestOrigin
    ) {
      return;
    }
    pendingOriginDistanceRef.current = null;
    programmaticFollowTargetRef.current = null;
    const maximum = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    );
    const target =
      renderedLatestOrigin === "start"
        ? -Math.min(distanceFromLatest, maximum)
        : Math.max(0, maximum - distanceFromLatest);
    const previousScrollBehavior = viewport.style.scrollBehavior;
    viewport.style.scrollBehavior = "auto";
    viewport.scrollTop = target;
    viewport.style.scrollBehavior = previousScrollBehavior;
  }, [latestOrigin, renderedLatestOrigin]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distanceFromLatest = () =>
      renderedLatestOrigin === "start"
        ? Math.abs(viewport.scrollTop)
        : viewport.scrollHeight -
          viewport.clientHeight -
          viewport.scrollTop;
    const cancelProgrammaticFollow = () => {
      const wasProgrammaticallyFollowing =
        programmaticFollowTargetRef.current !== null;
      programmaticFollowTargetRef.current = null;
      if (!wasProgrammaticallyFollowing) return;
      viewport.scrollTo({ behavior: "auto", top: viewport.scrollTop });
      updateFollowing(distanceFromLatest() <= followThreshold);
    };
    const inputEvents = ["keydown", "pointerdown", "touchstart", "wheel"];
    for (const eventName of inputEvents) {
      viewport.addEventListener(eventName, cancelProgrammaticFollow);
    }
    return () => {
      for (const eventName of inputEvents) {
        viewport.removeEventListener(eventName, cancelProgrammaticFollow);
      }
    };
  }, [followThreshold, renderedLatestOrigin, updateFollowing]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoFollow) {
      programmaticFollowTargetRef.current = null;
      return;
    }
    if (
      !followingRef.current ||
      typeof viewport.scrollTo !== "function"
    ) {
      return;
    }
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const latestScrollTop =
      renderedLatestOrigin === "start" ? 0 : viewport.scrollHeight;
    programmaticFollowTargetRef.current = latestScrollTop;
    viewport.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: latestScrollTop,
    });
  }, [autoFollow, children, followKey, renderedLatestOrigin]);

  return (
    <div
      {...props}
      className={["codex-ui-thread-viewport", className]
        .filter(Boolean)
        .join(" ")}
      data-following={following || undefined}
      data-latest-origin={renderedLatestOrigin}
      onScroll={(event) => {
        const viewport = event.currentTarget;
        const distanceFromLatest =
          renderedLatestOrigin === "start"
            ? Math.abs(viewport.scrollTop)
            : viewport.scrollHeight -
              viewport.clientHeight -
              viewport.scrollTop;
        const programmaticTarget = programmaticFollowTargetRef.current;
        if (programmaticTarget !== null) {
          const reachedTarget =
            renderedLatestOrigin === "start"
              ? Math.abs(viewport.scrollTop - programmaticTarget) <=
                followThreshold
              : viewport.scrollTop + viewport.clientHeight >=
                programmaticTarget - followThreshold;
          if (!reachedTarget) {
            onScroll?.(event);
            return;
          }
          programmaticFollowTargetRef.current = null;
        }
        updateFollowing(distanceFromLatest <= followThreshold);
        onScroll?.(event);
      }}
      ref={setViewportRef}
      style={
        {
          ...style,
          ...(topInset === undefined
            ? {}
            : {
                "--codex-ui-thread-viewport-top-inset": topInset,
              }),
        } as CSSProperties
      }
      tabIndex={tabIndex}
    >
      <div className="codex-ui-thread-viewport__content">{children}</div>
      {footer ? (
        <div className="codex-ui-thread-viewport__footer">{footer}</div>
      ) : null}
    </div>
  );
});

export interface ThreadVirtualizedPlaceholderProps
  extends HTMLAttributes<HTMLDivElement> {
  estimatedHeight?: CSSProperties["height"];
}

export function ThreadVirtualizedPlaceholder({
  className,
  estimatedHeight = "var(--codex-ui-thread-placeholder-height)",
  style,
  ...props
}: ThreadVirtualizedPlaceholderProps) {
  return (
    <div
      aria-hidden="true"
      className={["codex-ui-thread-virtualized-placeholder", className]
        .filter(Boolean)
        .join(" ")}
      data-virtualized-turn-content="true"
      style={{ ...style, height: estimatedHeight }}
      {...props}
    />
  );
}

export interface ActivityGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ActivityGroup({
  children,
  className,
  role = "group",
  ...props
}: ActivityGroupProps) {
  const classes = ["codex-ui-activity-group", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role={role} {...props}>
      {children}
    </div>
  );
}
