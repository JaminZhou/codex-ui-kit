import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment.js";
import type { NoticeTone } from "./Notices.js";

export interface AppNotification {
  actionLabel?: ReactNode;
  description?: ReactNode;
  dismissLabel?: string;
  heading: ReactNode;
  id: string;
  onAction?: MouseEventHandler<HTMLButtonElement>;
  onDismiss?: MouseEventHandler<HTMLButtonElement>;
  tone?: NoticeTone;
}

export interface AppNotificationRegionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  maxVisible?: number;
  notifications: readonly AppNotification[];
  overflowLabel?: (hiddenCount: number) => ReactNode;
  position?: "top-end" | "bottom-end";
  portalRoot?: Element | DocumentFragment | null;
  theme?: string;
}

function DismissIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppNotificationRegion({
  "aria-label": ariaLabel = "Notifications",
  className,
  maxVisible = 3,
  notifications,
  overflowLabel = (hiddenCount) => `${hiddenCount} more notifications`,
  portalRoot,
  position = "top-end",
  theme,
  ...props
}: AppNotificationRegionProps) {
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const [mounted, setMounted] = useState(false);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const regionRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousNotificationCountRef = useRef(0);
  const notificationIdentity = JSON.stringify(
    notifications.map(({ id }) => id),
  );
  const visibleLimit = Number.isFinite(maxVisible)
    ? Math.max(1, Math.floor(maxVisible))
    : 3;
  const visibleNotifications = notifications.slice(0, visibleLimit);
  const hiddenCount = notifications.length - visibleNotifications.length;
  const portalTheme =
    theme ?? overlayEnvironment.theme ?? inferredTheme;
  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    const previousCount = previousNotificationCountRef.current;
    if (
      previousCount === 0 &&
      notifications.length > 0 &&
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      returnFocusRef.current = document.activeElement;
    }
    if (previousCount > 0 && notifications.length === 0) {
      const returnFocus = returnFocusRef.current;
      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        if (
          returnFocus?.isConnected &&
          (activeElement === document.body || !activeElement?.isConnected)
        ) {
          returnFocus.focus();
        }
      });
      returnFocusRef.current = null;
    }
    previousNotificationCountRef.current = notifications.length;
  }, [notificationIdentity, notifications.length]);
  useLayoutEffect(() => {
    if (
      notifications.length === 0 ||
      theme !== undefined ||
      overlayEnvironment.theme !== undefined ||
      typeof document === "undefined"
    ) {
      return;
    }
    const activeElement = document.activeElement;
    setInferredTheme(
      activeElement instanceof Element
        ? activeElement.closest<HTMLElement>("[data-theme]")?.dataset.theme
        : undefined,
    );
  }, [notificationIdentity, overlayEnvironment.theme, theme]);
  if (!mounted || notifications.length === 0) return null;
  const resolvedPortalRoot = portalRoot ?? document.body;

  function preserveQueueFocus() {
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (activeElement?.isConnected && activeElement !== document.body) {
        return;
      }
      const nextControl = regionRef.current?.querySelector<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      if (nextControl) {
        nextControl.focus();
      } else if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus();
      }
    });
  }

  return createPortal(
    <div
      aria-label={ariaLabel}
      className={[
        "codex-ui-app-notification-region",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-position={position}
      data-hidden-count={hiddenCount}
      data-total-count={notifications.length}
      data-visible-count={visibleNotifications.length}
      data-codex-ui-dialog-owner={overlayEnvironment.ownerId}
      data-theme={portalTheme}
      ref={regionRef}
      role="region"
      {...props}
    >
      {visibleNotifications.map((notification, index) => {
        const tone = notification.tone ?? "neutral";
        return (
          <article
            aria-atomic="true"
            aria-posinset={index + 1}
            aria-setsize={notifications.length}
            className="codex-ui-app-notification"
            data-tone={tone}
            key={notification.id}
            role={tone === "error" ? "alert" : "status"}
          >
            <div className="codex-ui-app-notification__copy">
              <h2>{notification.heading}</h2>
              {notification.description ? (
                <p>{notification.description}</p>
              ) : null}
            </div>
            {notification.onAction ? (
              <button
                className="codex-ui-app-notification__action"
                onClick={(event) => {
                  notification.onAction?.(event);
                  preserveQueueFocus();
                }}
                type="button"
              >
                {notification.actionLabel ?? "View"}
              </button>
            ) : null}
            {notification.onDismiss ? (
              <button
                aria-label={notification.dismissLabel ?? "Dismiss notification"}
                className="codex-ui-app-notification__dismiss"
                onClick={(event) => {
                  notification.onDismiss?.(event);
                  preserveQueueFocus();
                }}
                type="button"
              >
                <DismissIcon />
              </button>
            ) : null}
          </article>
        );
      })}
      {hiddenCount > 0 ? (
        <p
          aria-live="polite"
          className="codex-ui-app-notification-region__overflow"
          role="status"
        >
          {overflowLabel(hiddenCount)}
        </p>
      ) : null}
    </div>,
    resolvedPortalRoot,
  );
}
