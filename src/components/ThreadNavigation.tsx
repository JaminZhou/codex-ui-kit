import {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { IconButton, Tooltip } from "./InteractivePrimitives";

function SidebarOpenIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <rect height="14" rx="2.25" stroke="currentColor" strokeWidth="1.35" width="16" x="2" y="3" />
      <path d="M7 3.7v12.6" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function SidebarClosedIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <rect height="14" rx="2.25" stroke="currentColor" strokeWidth="1.35" width="16" x="2" y="3" />
      <path d="M5.2 7.1 7.9 10l-2.7 2.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
    </svg>
  );
}

function BackIcon({ forward = false }: { forward?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      style={forward ? { transform: "scaleX(-1)" } : undefined}
      viewBox="0 0 20 20"
    >
      <path d="m11.75 5.25-4.5 4.75 4.5 4.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="m5.25 8 4.75 4.5L14.75 8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export interface ThreadNavigationControlsProps {
  backShortcut?: ReactNode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  className?: string;
  forwardShortcut?: ReactNode;
  historyControls?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onSidebarPointerEnter?: PointerEventHandler<HTMLButtonElement>;
  onSidebarPointerLeave?: PointerEventHandler<HTMLButtonElement>;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  sidebarShortcut?: ReactNode;
}

export function ThreadNavigationControls({
  backShortcut,
  canGoBack = false,
  canGoForward = false,
  className,
  forwardShortcut,
  historyControls = true,
  onGoBack,
  onGoForward,
  onSidebarPointerEnter,
  onSidebarPointerLeave,
  onToggleSidebar,
  sidebarOpen,
  sidebarShortcut,
}: ThreadNavigationControlsProps) {
  const sidebarLabel = sidebarOpen ? "Hide sidebar" : "Show sidebar";
  return (
    <nav
      aria-label="Thread navigation"
      className={["codex-ui-thread-navigation", className].filter(Boolean).join(" ")}
    >
      <Tooltip content="Toggle sidebar" shortcut={sidebarShortcut}>
        <IconButton
          data-app-shell-sidebar-trigger="true"
          icon={sidebarOpen ? <SidebarOpenIcon /> : <SidebarClosedIcon />}
          label={sidebarLabel}
          onClick={onToggleSidebar}
          onPointerEnter={onSidebarPointerEnter}
          onPointerLeave={onSidebarPointerLeave}
        />
      </Tooltip>
      {historyControls ? (
        <>
          <Tooltip content="Back" shortcut={backShortcut}>
            <IconButton
              disabled={!canGoBack}
              icon={<BackIcon />}
              label="Back"
              onClick={onGoBack}
            />
          </Tooltip>
          <Tooltip content="Forward" shortcut={forwardShortcut}>
            <IconButton
              disabled={!canGoForward}
              icon={<BackIcon forward />}
              label="Forward"
              onClick={onGoForward}
            />
          </Tooltip>
        </>
      ) : null}
    </nav>
  );
}

export type ThreadHeaderPosition = "fixed" | "sticky" | "static";

export interface ThreadHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  centerActions?: ReactNode;
  endActions?: ReactNode;
  navigation?: ReactNode;
  position?: ThreadHeaderPosition;
  startActions?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}

export function ThreadHeader({
  centerActions,
  className,
  endActions,
  navigation,
  position = "sticky",
  startActions,
  subtitle,
  style,
  title,
  ...props
}: ThreadHeaderProps) {
  return (
    <header
      className={["codex-ui-thread-header", className].filter(Boolean).join(" ")}
      data-position={position}
      style={style}
      {...props}
    >
      {navigation ? (
        <div className="codex-ui-thread-header__navigation">{navigation}</div>
      ) : null}
      <div className="codex-ui-thread-header__context">
        <div className="codex-ui-thread-header__identity">
          <div className="codex-ui-thread-header__title">{title}</div>
          {subtitle ? (
            <div className="codex-ui-thread-header__subtitle">{subtitle}</div>
          ) : null}
        </div>
        {startActions ? (
          <div className="codex-ui-thread-header__actions" data-align="start">
            {startActions}
          </div>
        ) : null}
        {endActions ? (
          <div className="codex-ui-thread-header__actions" data-align="end">
            {endActions}
          </div>
        ) : null}
      </div>
      {centerActions ? (
        <div className="codex-ui-thread-header__center-actions">{centerActions}</div>
      ) : null}
    </header>
  );
}

export interface ThreadFloatingButtonProps {
  className?: string;
  label?: string;
  onClick?: () => void;
  show: boolean;
  working?: boolean;
}

export function ThreadFloatingButton({
  className,
  label = "Scroll to bottom",
  onClick,
  show,
  working = false,
}: ThreadFloatingButtonProps) {
  return (
    <button
      aria-hidden={!show}
      aria-label={label}
      className={["codex-ui-thread-floating-button", className]
        .filter(Boolean)
        .join(" ")}
      data-show={show || undefined}
      data-working={working || undefined}
      onClick={show ? onClick : undefined}
      tabIndex={show ? undefined : -1}
      type="button"
    >
      {working ? (
        <span aria-hidden="true" className="codex-ui-thread-floating-button__dots">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <span aria-hidden="true" className="codex-ui-thread-floating-button__icon">
          <DownIcon />
        </span>
      )}
    </button>
  );
}

export interface FloatingThreadPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  label: string;
  open: boolean;
  topInset?: CSSProperties["top"];
}

export function FloatingThreadPanel({
  children,
  className,
  label,
  open,
  style,
  topInset = 0,
  ...props
}: FloatingThreadPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    if (!open && panelRef.current?.contains(document.activeElement)) {
      previouslyFocusedRef.current?.focus();
    }
  }, [open]);

  return (
    <aside
      aria-hidden={!open}
      aria-label={label}
      className={["codex-ui-floating-thread-panel", className].filter(Boolean).join(" ")}
      data-open={open || undefined}
      inert={!open ? true : undefined}
      ref={panelRef}
      style={{ ...style, top: topInset }}
      {...props}
    >
      {children}
    </aside>
  );
}
