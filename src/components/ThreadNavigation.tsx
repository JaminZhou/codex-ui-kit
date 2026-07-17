import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
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

export interface ThreadMessageNavigationItem {
  id: string;
  label?: ReactNode;
  outputs?: readonly ReactNode[];
  preview?: ReactNode;
}

export type ThreadMessageNavigationBehavior = "instant" | "smooth";

export interface ThreadMessageNavigationRailProps {
  activeIds?: readonly string[];
  className?: string;
  insetInlineStart?: CSSProperties["insetInlineStart"];
  items: readonly ThreadMessageNavigationItem[];
  label?: string;
  minItems?: number;
  onNavigate?: (
    item: ThreadMessageNavigationItem,
    behavior: ThreadMessageNavigationBehavior,
  ) => void;
  style?: CSSProperties;
}

function hasPreviewContent(value: ReactNode) {
  return value !== null && value !== undefined && value !== "";
}

export function ThreadMessageNavigationRail({
  activeIds = [],
  className,
  insetInlineStart = "var(--codex-ui-message-navigation-inset)",
  items,
  label = "User messages",
  minItems = 4,
  onNavigate,
  style,
}: ThreadMessageNavigationRailProps) {
  const tooltipId = useId();
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [listOverflow, setListOverflow] = useState(false);
  const [tooltipTop, setTooltipTop] = useState(0);
  const activeIdSet = new Set(activeIds);
  const activePointerIdRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const lastScrubbedIdRef = useRef<string | null>(null);
  const didScrubRef = useRef(false);
  const suppressClickRef = useRef(false);

  const updateOverflow = () => {
    const list = listRef.current;
    if (list) setListOverflow(list.scrollHeight > list.clientHeight);
  };

  const updateTooltipPosition = () => {
    if (!revealedId) return;
    const nav = navRef.current;
    const row = rowRefs.current.get(revealedId);
    if (!nav || !row) return;
    const navBounds = nav.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    setTooltipTop(rowBounds.top - navBounds.top + rowBounds.height / 2);
  };

  useEffect(() => {
    updateOverflow();
    const list = listRef.current;
    const observer =
      list && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateOverflow)
        : null;
    if (list) observer?.observe(list);
    window.addEventListener("resize", updateOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [items.length, minItems]);

  useLayoutEffect(updateTooltipPosition, [revealedId]);

  if (items.length < minItems) return null;

  const revealedIndex = items.findIndex((item) => item.id === revealedId);
  const revealedItem = revealedIndex >= 0 ? items[revealedIndex] : undefined;

  const findItemAtPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const hit = document.elementFromPoint?.(event.clientX, event.clientY);
    const row = hit?.closest<HTMLElement>("[data-message-navigation-id]");
    const id = row?.dataset.messageNavigationId;
    return id ? items.find((item) => item.id === id) : undefined;
  };

  const finishScrub = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerIdRef.current = null;
    lastScrubbedIdRef.current = null;
    suppressClickRef.current = didScrubRef.current;
  };

  return (
    <nav
      aria-label={label}
      className={["codex-ui-message-navigation-rail", className]
        .filter(Boolean)
        .join(" ")}
      style={{ ...style, insetInlineStart }}
      ref={navRef}
    >
      <div
        className="codex-ui-message-navigation-rail__list"
        data-overflow={listOverflow || undefined}
        onScroll={() => {
          updateOverflow();
          updateTooltipPosition();
        }}
        ref={listRef}
      >
        {items.map((item, index) => {
          const isActive = activeIdSet.has(item.id);
          const isRevealed = revealedId === item.id;
          const itemTooltipId = `${tooltipId}-${index}`;
          return (
            <div
              className="codex-ui-message-navigation-rail__row"
              data-message-navigation-id={item.id}
              key={item.id}
              ref={(node) => {
                if (node) rowRefs.current.set(item.id, node);
                else rowRefs.current.delete(item.id);
              }}
            >
              <button
                aria-current={isActive ? "true" : undefined}
                aria-describedby={isRevealed ? itemTooltipId : undefined}
                aria-label={`Jump to user message ${index + 1}`}
                className="codex-ui-message-navigation-rail__button"
                data-active={isActive || undefined}
                onBlur={() => {
                  if (activePointerIdRef.current === null) setRevealedId(null);
                }}
                onClick={(event) => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    event.preventDefault();
                    return;
                  }
                  onNavigate?.(item, "smooth");
                }}
                onFocus={() => setRevealedId(item.id)}
                onPointerCancel={finishScrub}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  activePointerIdRef.current = event.pointerId;
                  lastScrubbedIdRef.current = item.id;
                  didScrubRef.current = false;
                  suppressClickRef.current = false;
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  setRevealedId(item.id);
                }}
                onPointerEnter={() => setRevealedId(item.id)}
                onPointerLeave={(event) => {
                  if (
                    activePointerIdRef.current === null &&
                    document.activeElement !== event.currentTarget
                  ) {
                    setRevealedId(null);
                  }
                }}
                onPointerMove={(event) => {
                  if (activePointerIdRef.current !== event.pointerId) return;
                  const scrubbedItem = findItemAtPointer(event);
                  if (
                    !scrubbedItem ||
                    scrubbedItem.id === lastScrubbedIdRef.current
                  ) {
                    return;
                  }
                  didScrubRef.current = true;
                  lastScrubbedIdRef.current = scrubbedItem.id;
                  setRevealedId(scrubbedItem.id);
                  onNavigate?.(scrubbedItem, "instant");
                }}
                onPointerUp={finishScrub}
                type="button"
              >
                <span className="codex-ui-message-navigation-rail__marker-track">
                  <span className="codex-ui-message-navigation-rail__marker" />
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {revealedItem ? (
        <div
          className="codex-ui-message-navigation-rail__tooltip"
          id={`${tooltipId}-${revealedIndex}`}
          role="tooltip"
          style={{ top: tooltipTop }}
        >
          <div className="codex-ui-message-navigation-rail__tooltip-label">
            {hasPreviewContent(revealedItem.label)
              ? revealedItem.label
              : "(No content)"}
          </div>
          {hasPreviewContent(revealedItem.preview) ? (
            <div className="codex-ui-message-navigation-rail__tooltip-preview">
              {revealedItem.preview}
            </div>
          ) : null}
          {revealedItem.outputs?.slice(0, 2).map((output, outputIndex) => (
            <div
              className="codex-ui-message-navigation-rail__tooltip-output"
              key={outputIndex}
            >
              {output}
            </div>
          ))}
          {(revealedItem.outputs?.length ?? 0) > 2 ? (
            <div className="codex-ui-message-navigation-rail__tooltip-more">
              +{(revealedItem.outputs?.length ?? 0) - 2} more
            </div>
          ) : null}
        </div>
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
