import {
  useContext,
  useEffect,
  useLayoutEffect,
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
  notifications: readonly AppNotification[];
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
  notifications,
  portalRoot,
  position = "top-end",
  theme,
  ...props
}: AppNotificationRegionProps) {
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const [mounted, setMounted] = useState(false);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const portalTheme =
    theme ?? overlayEnvironment.theme ?? inferredTheme;
  useEffect(() => setMounted(true), []);
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
  }, [notifications, overlayEnvironment.theme, theme]);
  if (!mounted || notifications.length === 0) return null;
  const resolvedPortalRoot = portalRoot ?? document.body;

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
      data-theme={portalTheme}
      role="region"
      {...props}
    >
      {notifications.map((notification) => {
        const tone = notification.tone ?? "neutral";
        return (
          <article
            aria-atomic="true"
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
                onClick={notification.onAction}
                type="button"
              >
                {notification.actionLabel ?? "View"}
              </button>
            ) : null}
            {notification.onDismiss ? (
              <button
                aria-label={notification.dismissLabel ?? "Dismiss notification"}
                className="codex-ui-app-notification__dismiss"
                onClick={notification.onDismiss}
                type="button"
              >
                <DismissIcon />
              </button>
            ) : null}
          </article>
        );
      })}
    </div>,
    resolvedPortalRoot,
  );
}
