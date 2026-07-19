import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
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
  onFollowingChange?: (following: boolean) => void;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  topInset?: CSSProperties["paddingTop"];
}

export function AgentThreadViewport({
  autoFollow = true,
  children,
  className,
  defaultFollowing = true,
  followKey,
  followThreshold = 24,
  footer,
  onFollowingChange,
  onScroll,
  style,
  tabIndex = 0,
  topInset = "calc(var(--codex-ui-spacing) * 8)",
  ...props
}: AgentThreadViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(defaultFollowing);
  const followingRef = useRef(defaultFollowing);
  const programmaticFollowTargetRef = useRef<number | null>(null);

  const updateFollowing = useCallback(
    (nextFollowing: boolean) => {
      if (followingRef.current === nextFollowing) return;
      followingRef.current = nextFollowing;
      setFollowing(nextFollowing);
      onFollowingChange?.(nextFollowing);
    },
    [onFollowingChange],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const cancelProgrammaticFollow = () => {
      const wasProgrammaticallyFollowing =
        programmaticFollowTargetRef.current !== null;
      programmaticFollowTargetRef.current = null;
      if (!wasProgrammaticallyFollowing) return;
      viewport.scrollTo({ behavior: "auto", top: viewport.scrollTop });
      const distanceFromLatest =
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
      updateFollowing(distanceFromLatest <= followThreshold);
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
  }, [followThreshold, updateFollowing]);

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
    programmaticFollowTargetRef.current = viewport.scrollHeight;
    viewport.scrollTo({
      behavior: reducedMotion ? "auto" : "smooth",
      top: viewport.scrollHeight,
    });
  }, [autoFollow, children, followKey]);

  return (
    <div
      {...props}
      className={["codex-ui-thread-viewport", className]
        .filter(Boolean)
        .join(" ")}
      data-following={following || undefined}
      onScroll={(event) => {
        const viewport = event.currentTarget;
        const distanceFromLatest =
          viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
        const programmaticTarget = programmaticFollowTargetRef.current;
        if (programmaticTarget !== null) {
          const reachedTarget =
            viewport.scrollTop + viewport.clientHeight >=
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
      ref={viewportRef}
      style={
        {
          ...style,
          "--codex-ui-thread-viewport-top-inset": topInset,
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
}

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
  ...props
}: ActivityGroupProps) {
  const classes = ["codex-ui-activity-group", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
