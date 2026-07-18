import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { acquireDocumentScrollLock } from "../internal/documentScrollLock";

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
  title: ReactNode;
}

function getDialogFocusableItems(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((item) => item.getAttribute("aria-hidden") !== "true");
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
  title,
  ...props
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const releaseDocumentScrollLock = acquireDocumentScrollLock();
    const timer = window.setTimeout(() => {
      const surface = surfaceRef.current;
      if (!surface) return;
      const requested = initialFocusSelector
        ? surface.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      (requested ?? getDialogFocusableItems(surface)[0] ?? surface).focus();
    });
    return () => {
      window.clearTimeout(timer);
      releaseDocumentScrollLock();
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
    };
  }, [initialFocusSelector, open]);

  if (!open || typeof document === "undefined") return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && closeOnEscape) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key !== "Tab") return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const focusable = getDialogFocusableItems(surface);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      surface.focus();
      return;
    }
    const focusInside = surface.contains(document.activeElement);
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
    <div
      className={["codex-ui-dialog", className].filter(Boolean).join(" ")}
      data-size={size}
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
        {footer ? <footer className="codex-ui-dialog__footer">{footer}</footer> : null}
      </div>
    </div>,
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
