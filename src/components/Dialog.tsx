import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { acquireDocumentScrollLock } from "../internal/documentScrollLock";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment";

export type DialogSize = "compact" | "standard" | "wide";

export interface DialogProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  children: ReactNode;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  description?: ReactNode;
  footer?: ReactNode;
  initialFocusSelector?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  showClose?: boolean;
  size?: DialogSize;
  theme?: string;
  title: ReactNode;
}

function getDialogFocusableItems(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((item) => item.getAttribute("aria-hidden") !== "true");
}

function getDialogOwnedPortalFocusableItems(dialogId: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-codex-ui-dialog-owner]"),
  )
    .filter((portal) => portal.dataset.codexUiDialogOwner === dialogId)
    .flatMap(getDialogFocusableItems);
}

function dialogOwnsFocusTarget(
  dialogId: string,
  surface: HTMLElement | null,
  target: HTMLElement,
) {
  if (surface?.contains(target)) return true;
  const ownedPortal = target.closest<HTMLElement>(
    "[data-codex-ui-dialog-owner]",
  );
  return ownedPortal?.dataset.codexUiDialogOwner === dialogId;
}

export function Dialog({
  children,
  className,
  closeLabel = "Close dialog",
  closeOnBackdrop = true,
  closeOnEscape = true,
  description,
  footer,
  initialFocusSelector,
  onOpenChange,
  open,
  showClose = true,
  size = "standard",
  theme,
  title,
  ...props
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [inferredTheme, setInferredTheme] = useState<string>();
  const portalTheme = theme ?? inferredTheme;

  useLayoutEffect(() => {
    if (!open || theme !== undefined || typeof document === "undefined") return;
    const activeElement = document.activeElement;
    setInferredTheme(
      activeElement instanceof Element
        ? activeElement.closest<HTMLElement>("[data-theme]")?.dataset.theme
        : undefined,
    );
  }, [open, theme]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const getInitialFocus = () => {
      const surface = surfaceRef.current;
      if (!surface) return null;
      const requested = initialFocusSelector
        ? surface.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      return requested ?? getDialogFocusableItems(surface)[0] ?? surface;
    };
    const modalLock = acquireDocumentScrollLock({
      containsFocus: (target) =>
        dialogOwnsFocusTarget(dialogId, surfaceRef.current, target),
      getInitialFocus,
      priority: 1100,
      returnFocus: returnFocusRef.current,
    });
    const timer = window.setTimeout(() => {
      if (!modalLock.isTop()) return;
      getInitialFocus()?.focus();
    });
    return () => {
      window.clearTimeout(timer);
      modalLock.release()?.focus();
    };
  }, [dialogId, initialFocusSelector, open]);

  if (!open || typeof document === "undefined") return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && closeOnEscape) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key !== "Tab") return;
    const ownedPortal =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-codex-ui-dialog-owner]")
        : null;
    const eventComesFromOwnedPortal =
      ownedPortal?.dataset.codexUiDialogOwner === dialogId;
    if (
      eventComesFromOwnedPortal &&
      ownedPortal?.getAttribute("role") !== "dialog"
    ) {
      return;
    }
    const surface = surfaceRef.current;
    if (!surface) return;
    const focusable = [
      ...getDialogFocusableItems(surface),
      ...getDialogOwnedPortalFocusableItems(dialogId),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      surface.focus();
      return;
    }
    const activeElement = document.activeElement;
    const focusInside =
      activeElement instanceof HTMLElement &&
      dialogOwnsFocusTarget(dialogId, surface, activeElement);
    if (event.shiftKey && (!focusInside || document.activeElement === first)) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (!focusInside || document.activeElement === last)
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <OverlayEnvironmentContext.Provider
      value={{ layer: "dialog", ownerId: dialogId, theme: portalTheme }}
    >
      <div
        className={["codex-ui-dialog", className].filter(Boolean).join(" ")}
        data-size={size}
        data-codex-ui-dialog-id={dialogId}
        data-theme={portalTheme}
        onKeyDown={handleKeyDown}
        onPointerDown={(event) => {
          if (closeOnBackdrop && event.target === event.currentTarget) {
            onOpenChange(false);
          }
        }}
      >
        <div
          {...props}
          aria-describedby={description ? descriptionId : undefined}
          aria-labelledby={titleId}
          aria-modal="true"
          className="codex-ui-dialog__surface"
          ref={surfaceRef}
          role="dialog"
          tabIndex={-1}
        >
          <header className="codex-ui-dialog__header">
            <div className="codex-ui-dialog__heading">
              <h2 className="codex-ui-dialog__title" id={titleId}>
                {title}
              </h2>
              {description ? (
                <div className="codex-ui-dialog__description" id={descriptionId}>
                  {description}
                </div>
              ) : null}
            </div>
            {showClose ? (
              <button
                aria-label={closeLabel}
                className="codex-ui-dialog__close"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </header>
          <div className="codex-ui-dialog__body">{children}</div>
          {footer ? (
            <footer className="codex-ui-dialog__footer">{footer}</footer>
          ) : null}
        </div>
      </div>
    </OverlayEnvironmentContext.Provider>,
    document.body,
  );
}

export interface DialogChoiceProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick" | "type"
  > {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  onSelect?: () => void;
  trailing?: ReactNode;
}

export function DialogChoice({
  className,
  description,
  disabled = false,
  icon,
  label,
  onSelect,
  trailing,
  ...props
}: DialogChoiceProps) {
  return (
    <button
      {...props}
      className={["codex-ui-dialog-choice", className].filter(Boolean).join(" ")}
      disabled={disabled}
      onClick={onSelect}
      type="button"
    >
      {icon ? (
        <span aria-hidden="true" className="codex-ui-dialog-choice__icon">
          {icon}
        </span>
      ) : null}
      <span className="codex-ui-dialog-choice__copy">
        <span className="codex-ui-dialog-choice__label">{label}</span>
        {description ? (
          <span className="codex-ui-dialog-choice__description">
            {description}
          </span>
        ) : null}
      </span>
      {trailing ? (
        <span className="codex-ui-dialog-choice__trailing">{trailing}</span>
      ) : null}
    </button>
  );
}
