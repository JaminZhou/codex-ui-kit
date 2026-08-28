import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment.js";
import type { NoticeTone } from "./Notices.js";

export type AppNotificationTone = NoticeTone | "success";

export interface AppNotification {
  actionLabel?: ReactNode;
  description?: ReactNode;
  dismissLabel?: string;
  heading: ReactNode;
  id: string;
  onAction?: MouseEventHandler<HTMLButtonElement>;
  onDismiss?: MouseEventHandler<HTMLButtonElement>;
  tone?: AppNotificationTone;
}

export interface AppNotificationRegionProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  maxVisible?: number;
  notifications: readonly AppNotification[];
  /** @deprecated Current Codex keeps overflowed toasts mounted but visually collapsed. */
  overflowLabel?: (hiddenCount: number) => ReactNode;
  position?: "top-center" | "top-end" | "bottom-end";
  portalRoot?: Element | DocumentFragment | null;
  theme?: string;
}

function SuccessIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 21">
      <path d="M12.1599 7.63617C12.3713 7.33596 12.7863 7.26372 13.0866 7.47504C13.3867 7.68642 13.4589 8.10153 13.2477 8.40179L9.28876 14.0268C9.17264 14.1917 8.98808 14.2954 8.7868 14.308C8.61044 14.319 8.43764 14.2592 8.30634 14.144L8.25262 14.0912L6.16962 11.7993L6.08954 11.6918C5.93136 11.4259 5.97666 11.0761 6.21454 10.8598C6.45225 10.6439 6.80379 10.6326 7.05341 10.8149L7.15399 10.9047L8.67841 12.5815L12.1599 7.63617Z" fill="currentColor" />
      <path d="M9.99506 2.81226C14.3664 2.81226 17.9101 6.35596 17.9101 10.7273C17.9101 15.0986 14.3664 18.6423 9.99506 18.6423C5.62372 18.6423 2.08002 15.0986 2.08002 10.7273C2.08002 6.35596 5.62372 2.81226 9.99506 2.81226ZM9.99506 4.14233C6.35826 4.14233 3.4101 7.0905 3.4101 10.7273C3.4101 14.3641 6.35826 17.3123 9.99506 17.3123C13.6319 17.3123 16.58 14.3641 16.58 10.7273C16.58 7.0905 13.6319 4.14233 9.99506 4.14233Z" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path d="M10.6 9.70459C11.0142 9.70461 11.35 10.0404 11.35 10.4546V13.7876C11.35 14.2018 11.0142 14.5376 10.6 14.5376C10.1858 14.5376 9.84998 14.2018 9.84998 13.7876V10.4546C9.84998 10.0404 10.1858 9.70459 10.6 9.70459Z" fill="currentColor" />
      <path d="M10.6 6.2876C11.1292 6.28762 11.558 6.71732 11.558 7.24658C11.5578 7.77569 11.1291 8.20457 10.6 8.20459C10.0708 8.20459 9.64215 7.7757 9.64197 7.24658C9.64197 6.71731 10.0707 6.2876 10.6 6.2876Z" fill="currentColor" />
      <path
        clipRule="evenodd"
        d="M10.6 2.53955C14.9713 2.53955 18.515 6.08326 18.515 10.4546C18.515 14.8259 14.9713 18.3696 10.6 18.3696C6.22864 18.3696 2.68494 14.8259 2.68494 10.4546C2.68494 6.08326 6.22864 2.53955 10.6 2.53955ZM10.6 3.86963C6.96318 3.86963 4.01501 6.81779 4.01501 10.4546C4.01501 14.0914 6.96318 17.0396 10.6 17.0396C14.2368 17.0396 17.1849 14.0914 17.1849 10.4546C17.1849 6.81779 14.2368 3.86963 10.6 3.86963Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 9.8a.767.767 0 1 1 0 1.533A.767.767 0 0 1 8 9.8Zm0-5.134c.368 0 .667.299.667.667V8a.667.667 0 0 1-1.334 0V5.333c0-.368.299-.667.667-.667Z" />
      <path
        clipRule="evenodd"
        d="M8 1.333a6.667 6.667 0 1 1 0 13.334A6.667 6.667 0 0 1 8 1.333Zm0 1.334a5.333 5.333 0 1 0 0 10.666A5.333 5.333 0 0 0 8 2.667Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7.231 7.231a.665.665 0 0 1 .94 0L10 9.06l1.828-1.829.104-.085a.666.666 0 0 1 .921.922l-.084.104L10.94 10l1.829 1.828a.665.665 0 0 1-.94.94L10 10.94l-1.828 1.83a.665.665 0 0 1-.94-.94L9.06 10 7.23 8.172a.665.665 0 0 1 0-.94Z" />
      <path
        clipRule="evenodd"
        d="M10 2.085a7.915 7.915 0 1 1 0 15.83 7.915 7.915 0 0 1 0-15.83Zm0 1.33a6.585 6.585 0 1 0 0 13.17 6.585 6.585 0 0 0 0-13.17Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function NotificationIcon({ tone }: { tone: AppNotificationTone }) {
  if (tone === "success") return <SuccessIcon />;
  if (tone === "warning") return <WarningIcon />;
  if (tone === "error") return <DangerIcon />;
  return <InfoIcon />;
}

function DismissIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 21 21">
      <path d="M14.6549 5.57307C14.9283 5.2997 15.3718 5.2997 15.6451 5.57307C15.9185 5.84643 15.9185 6.28993 15.6451 6.5633L11.3903 10.8182L15.6451 15.0731L15.735 15.1834C15.9141 15.4551 15.8842 15.8242 15.6451 16.0633C15.4061 16.3024 15.0369 16.3322 14.7653 16.1531L14.6549 16.0633L10.4 11.8084L6.14515 16.0633C5.87178 16.3367 5.42828 16.3367 5.15492 16.0633C4.88155 15.7899 4.88155 15.3464 5.15492 15.0731L9.4098 10.8182L5.15492 6.5633L5.06507 6.45295C4.88597 6.18128 4.91584 5.81214 5.15492 5.57307C5.39399 5.33399 5.76313 5.30413 6.0348 5.48322L6.14515 5.57307L10.4 9.82795L14.6549 5.57307Z" fill="currentColor" />
    </svg>
  );
}

export function AppNotificationRegion({
  "aria-label": ariaLabel = "Notifications",
  className,
  maxVisible = 3,
  notifications,
  overflowLabel,
  portalRoot,
  position = "top-center",
  style,
  theme,
  ...props
}: AppNotificationRegionProps) {
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const [mounted, setMounted] = useState(false);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const regionRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousNotificationCountRef = useRef(0);
  const notificationIdentity = JSON.stringify(
    notifications.map(({ id }) => id),
  );
  const visibleLimit = Number.isFinite(maxVisible)
    ? Math.max(1, Math.floor(maxVisible))
    : 3;
  const visibleCount = Math.min(notifications.length, visibleLimit);
  const hiddenCount = notifications.length - visibleCount;
  const portalTheme = theme ?? overlayEnvironment.theme ?? inferredTheme;

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

  function preserveQueueFocus(
    removedIndex: number,
    controlKind: "action" | "dismiss",
  ) {
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (activeElement?.isConnected && activeElement !== document.body) return;
      const notificationElements = Array.from(
        regionRef.current?.querySelectorAll<HTMLElement>(
          '.codex-ui-app-notification[data-visible="true"]',
        ) ?? [],
      );
      const startIndex = Math.min(
        removedIndex,
        Math.max(0, notificationElements.length - 1),
      );
      const candidateIndices: number[] = [];
      for (
        let distance = 0;
        candidateIndices.length < notificationElements.length;
        distance += 1
      ) {
        const forwardIndex = startIndex + distance;
        if (forwardIndex < notificationElements.length) candidateIndices.push(forwardIndex);
        const backwardIndex = startIndex - distance - 1;
        if (backwardIndex >= 0) candidateIndices.push(backwardIndex);
      }
      const preferredSelector =
        controlKind === "action"
          ? ".codex-ui-app-notification__action:not(:disabled)"
          : ".codex-ui-app-notification__dismiss:not(:disabled)";
      const nextControl =
        candidateIndices
          .map((index) =>
            notificationElements[index]?.querySelector<HTMLButtonElement>(preferredSelector),
          )
          .find(Boolean) ??
        candidateIndices
          .map((index) =>
            notificationElements[index]?.querySelector<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          )
          .find(Boolean);
      if (nextControl) nextControl.focus();
      else if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    });
  }

  return createPortal(
    <section
      {...props}
      aria-label={`${ariaLabel} alt+T`}
      aria-live="polite"
      className={["codex-ui-app-notification-region", className]
        .filter(Boolean)
        .join(" ")}
      data-codex-ui-dialog-owner={overlayEnvironment.ownerId}
      data-hidden-count={hiddenCount}
      data-position={position}
      data-theme={portalTheme}
      data-total-count={notifications.length}
      data-visible-count={visibleCount}
      ref={regionRef}
      style={style}
    >
      <ol
        className="codex-ui-app-notification-toaster"
        data-sonner-theme="light"
        data-sonner-toaster="true"
        data-x-position={position === "top-center" ? "center" : "right"}
        data-y-position={position === "bottom-end" ? "bottom" : "top"}
        tabIndex={-1}
      >
        {notifications.map((notification, index) => {
          const tone = notification.tone ?? "neutral";
          const visible = index < visibleLimit;
          const action = notification.onAction ? (
            <button
              className="codex-ui-app-notification__action"
              onClick={(event) => {
                notification.onAction?.(event);
                preserveQueueFocus(index, "action");
              }}
              type="button"
            >
              {notification.actionLabel ?? "View"}
            </button>
          ) : null;
          return (
            <li
              className="codex-ui-app-notification"
              data-dismissible={Boolean(notification.onDismiss)}
              data-expanded="false"
              data-front={index === 0}
              data-index={index}
              data-mounted="true"
              data-promise="false"
              data-removed="false"
              data-sonner-toast="true"
              data-styled="false"
              data-swipe-out="false"
              data-swiped="false"
              data-swiping="false"
              data-tone={tone}
              data-visible={visible}
              key={notification.id}
              style={{ "--codex-ui-app-notification-index": index } as CSSProperties}
              tabIndex={0}
            >
              <div className="codex-ui-app-notification__alert">
                <div className="codex-ui-app-notification__row">
                  <span className="codex-ui-app-notification__leading">
                    <NotificationIcon tone={tone} />
                  </span>
                  <div className="codex-ui-app-notification__content">
                    <div className="codex-ui-app-notification__primary">
                      <div className="codex-ui-app-notification__copy">
                        <div className="codex-ui-app-notification__heading">
                          {notification.heading}
                        </div>
                        {notification.description ? (
                          <div className="codex-ui-app-notification__description">
                            {notification.description}
                          </div>
                        ) : null}
                      </div>
                      {!notification.description ? action : null}
                    </div>
                  </div>
                  {notification.onDismiss ? (
                    <button
                      aria-label={notification.dismissLabel ?? "Close"}
                      className="codex-ui-app-notification__dismiss"
                      onClick={(event) => {
                        notification.onDismiss?.(event);
                        preserveQueueFocus(index, "dismiss");
                      }}
                      type="button"
                    >
                      <DismissIcon />
                    </button>
                  ) : null}
                </div>
                {notification.description && action ? (
                  <div className="codex-ui-app-notification__actions">{action}</div>
                ) : null}
              </div>
            </li>
          );
        })}
        {overflowLabel && hiddenCount > 0 ? (
          <li className="codex-ui-app-notification__overflow-label">
            {overflowLabel(hiddenCount)}
          </li>
        ) : null}
      </ol>
    </section>,
    resolvedPortalRoot,
  );
}
