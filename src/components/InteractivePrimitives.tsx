import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { OverlayEnvironmentContext } from "../internal/overlayEnvironment";

export type ControlTone =
  | "danger"
  | "ghost"
  | "outline"
  | "primary"
  | "secondary";
export type ControlSize = "large" | "medium" | "small" | "toolbar";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  pressed?: boolean;
  size?: ControlSize;
  startIcon?: ReactNode;
  tone?: ControlTone;
  uniform?: boolean;
}

export function Button({
  "aria-label": ariaLabel,
  children,
  className,
  disabled = false,
  endIcon,
  loading = false,
  loadingLabel = "Loading",
  pressed,
  size = "medium",
  startIcon,
  tone = "secondary",
  type = "button",
  uniform = false,
  ...props
}: ButtonProps) {
  const classes = ["codex-ui-button", className].filter(Boolean).join(" ");
  return (
    <button
      aria-busy={loading || undefined}
      aria-label={loading && !ariaLabel ? loadingLabel : ariaLabel}
      aria-pressed={pressed}
      className={classes}
      data-loading={loading || undefined}
      data-pressed={pressed || undefined}
      data-size={size}
      data-tone={tone}
      data-uniform={uniform || undefined}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="codex-ui-button__spinner" />
      ) : startIcon ? (
        <span aria-hidden="true" className="codex-ui-button__icon">
          {startIcon}
        </span>
      ) : null}
      <span className="codex-ui-button__label">{children}</span>
      {endIcon ? (
        <span aria-hidden="true" className="codex-ui-button__icon">
          {endIcon}
        </span>
      ) : null}
    </button>
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  icon: ReactNode;
  label: string;
  loading?: boolean;
  pressed?: boolean;
  size?: ControlSize;
  tone?: ControlTone;
}

export function IconButton({
  className,
  disabled = false,
  icon,
  label,
  loading = false,
  pressed,
  size = "toolbar",
  tone = "ghost",
  type = "button",
  ...props
}: IconButtonProps) {
  const classes = ["codex-ui-icon-button", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      aria-busy={loading || undefined}
      aria-label={label}
      aria-pressed={pressed}
      className={classes}
      data-loading={loading || undefined}
      data-pressed={pressed || undefined}
      data-size={size}
      data-tone={tone}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="codex-ui-button__spinner" />
      ) : (
        <span aria-hidden="true" className="codex-ui-icon-button__icon">
          {icon}
        </span>
      )}
    </button>
  );
}

export type OverlaySide = "bottom" | "left" | "right" | "top";
export type OverlayAlign = "center" | "end" | "start";
export type OverlayWidth = "auto" | "menu" | "menu-wide" | "trigger";

const OverlayOwnerContext = createContext<readonly string[]>([]);

interface TriggerProps {
  "aria-controls"?: string;
  "aria-describedby"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "dialog" | "listbox" | "menu" | true;
  "data-state"?: "closed" | "open";
  disabled?: boolean;
  onBlur?: FocusEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
  onPointerEnter?: PointerEventHandler<HTMLElement>;
  onPointerLeave?: PointerEventHandler<HTMLElement>;
}

function useControllableOpen({
  defaultOpen,
  onOpenChange,
  open,
}: {
  defaultOpen: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const resolvedOpen = open ?? internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!controlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlled, onOpenChange],
  );
  return [resolvedOpen, setOpen] as const;
}

function getFocusableItems(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(
    '[role="menuitem"]:not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([aria-disabled="true"]), [role="option"]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled)',
  )].filter((item) => !item.hasAttribute("hidden"));
}

function focusByKey(event: KeyboardEvent<HTMLElement>) {
  const items = getFocusableItems(event.currentTarget);
  if (items.length === 0) return;
  const currentIndex = items.findIndex((item) => item === document.activeElement);
  if (
    event.key.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    const query = event.key.toLocaleLowerCase();
    const orderedItems = [
      ...items.slice(currentIndex + 1),
      ...items.slice(0, currentIndex + 1),
    ];
    const match = orderedItems.find((item) =>
      item.textContent?.trim().toLocaleLowerCase().startsWith(query),
    );
    if (match) {
      event.preventDefault();
      match.focus();
    }
    return;
  }
  if (!["ArrowDown", "ArrowUp", "End", "Home"].includes(event.key)) return;
  let nextIndex = currentIndex;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = items.length - 1;
  if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
  if (event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + items.length) % items.length;
  }
  event.preventDefault();
  items[nextIndex]?.focus();
}

interface FloatingSurfaceProps {
  align: OverlayAlign;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className: string;
  contentRef?: RefObject<HTMLDivElement | null>;
  id: string;
  label?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  open: boolean;
  ownerIds?: readonly string[];
  role: "dialog" | "listbox" | "menu" | "tooltip";
  side: OverlaySide;
  sideOffset: number;
  style?: CSSProperties;
  width: OverlayWidth;
}

function FloatingSurface({
  align,
  anchorRef,
  children,
  className,
  contentRef,
  id,
  label,
  onKeyDown,
  open,
  ownerIds,
  role,
  side,
  sideOffset,
  style,
  width,
}: FloatingSurfaceProps) {
  const overlayEnvironment = useContext(OverlayEnvironmentContext);
  const internalRef = useRef<HTMLDivElement | null>(null);
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    maxHeight: number;
    resolvedSide: OverlaySide;
    theme?: string;
    top: number;
    triggerWidth: number;
  } | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (contentRef) contentRef.current = node;
      setSurfaceNode(node);
    },
    [contentRef],
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const surface = internalRef.current;
    if (!anchor || !surface || typeof window === "undefined") return;
    const anchorRect = anchor.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const edge = 8;
    const available = {
      bottom: window.innerHeight - anchorRect.bottom,
      left: anchorRect.left,
      right: window.innerWidth - anchorRect.right,
      top: anchorRect.top,
    };
    let resolvedSide = side;
    const required =
      side === "bottom" || side === "top"
        ? surfaceRect.height + sideOffset
        : surfaceRect.width + sideOffset;
    if (side === "bottom" && required > available.bottom && available.top > available.bottom) {
      resolvedSide = "top";
    } else if (side === "top" && required > available.top && available.bottom > available.top) {
      resolvedSide = "bottom";
    } else if (side === "right" && required > available.right && available.left > available.right) {
      resolvedSide = "left";
    } else if (side === "left" && required > available.left && available.right > available.left) {
      resolvedSide = "right";
    }

    let left = anchorRect.left;
    let top = anchorRect.bottom + sideOffset;
    if (resolvedSide === "top") top = anchorRect.top - surfaceRect.height - sideOffset;
    if (resolvedSide === "right") {
      left = anchorRect.right + sideOffset;
      top = anchorRect.top;
    }
    if (resolvedSide === "left") {
      left = anchorRect.left - surfaceRect.width - sideOffset;
      top = anchorRect.top;
    }

    if (resolvedSide === "bottom" || resolvedSide === "top") {
      if (align === "center") left = anchorRect.left + (anchorRect.width - surfaceRect.width) / 2;
      if (align === "end") left = anchorRect.right - surfaceRect.width;
    } else {
      if (align === "center") top = anchorRect.top + (anchorRect.height - surfaceRect.height) / 2;
      if (align === "end") top = anchorRect.bottom - surfaceRect.height;
    }

    left = Math.min(
      Math.max(edge, left),
      Math.max(edge, window.innerWidth - surfaceRect.width - edge),
    );
    top = Math.min(
      Math.max(edge, top),
      Math.max(edge, window.innerHeight - surfaceRect.height - edge),
    );
    const theme =
      overlayEnvironment.theme ??
      anchor.closest<HTMLElement>("[data-theme]")?.dataset.theme;
    setPosition({
      left,
      maxHeight: window.innerHeight - edge * 2,
      resolvedSide,
      theme,
      top,
      triggerWidth: anchorRect.width,
    });
  }, [align, anchorRef, overlayEnvironment.theme, side, sideOffset]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [children, open, position?.triggerWidth, surfaceNode, updatePosition, width]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (
      !open ||
      !anchor ||
      !surfaceNode ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }
    const observer = new ResizeObserver(updatePosition);
    observer.observe(anchor);
    observer.observe(surfaceNode);
    return () => observer.disconnect();
  }, [anchorRef, open, surfaceNode, updatePosition]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      aria-label={label}
      className={className}
      data-align={align}
      data-codex-ui-overlay-owner={ownerIds?.join(" ")}
      data-codex-ui-overlay-layer={overlayEnvironment.layer}
      data-side={position?.resolvedSide ?? side}
      data-state="open"
      data-theme={position?.theme}
      data-width={width}
      id={id}
      onKeyDown={onKeyDown}
      ref={setRefs}
      role={role}
      style={{
        ...style,
        "--codex-ui-overlay-trigger-width": position
          ? `${position.triggerWidth}px`
          : undefined,
        left: position?.left ?? 0,
        maxHeight: position?.maxHeight,
        position: "fixed",
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      } as CSSProperties}
      tabIndex={role === "dialog" ? -1 : undefined}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface TooltipProps {
  align?: OverlayAlign;
  children: ReactElement<TriggerProps>;
  content: ReactNode;
  defaultOpen?: boolean;
  delayMs?: number;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  shortcut?: ReactNode;
  side?: OverlaySide;
  sideOffset?: number;
}

export function Tooltip({
  align = "center",
  children,
  content,
  defaultOpen = false,
  delayMs = 700,
  disabled = false,
  onOpenChange,
  open,
  shortcut,
  side = "top",
  sideOffset = 2,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [resolvedOpen, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open,
  });
  const effectiveOpen = resolvedOpen && !disabled;

  useEffect(() => {
    if (disabled && resolvedOpen) {
      clearTimer();
      setOpen(false);
    }
  }, [disabled, resolvedOpen, setOpen]);

  const clearTimer = () => {
    if (timerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const show = (delay: number) => {
    clearTimer();
    if (disabled) return;
    if (delay === 0 || typeof window === "undefined") {
      setOpen(true);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setOpen(true);
    }, delay);
  };
  const hide = () => {
    clearTimer();
    setOpen(false);
  };

  useEffect(() => () => clearTimer(), []);

  const trigger = cloneElement(children, {
    "aria-describedby": effectiveOpen ? id : children.props["aria-describedby"],
  });
  return (
    <span
      className="codex-ui-tooltip-anchor"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      onFocusCapture={() => show(0)}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") show(delayMs);
      }}
      onPointerLeave={hide}
      ref={anchorRef}
    >
      {trigger}
      <FloatingSurface
        align={align}
        anchorRef={anchorRef}
        className="codex-ui-tooltip"
        id={id}
        open={effectiveOpen}
        role="tooltip"
        side={side}
        sideOffset={sideOffset}
        width="auto"
      >
        <span className="codex-ui-tooltip__content">{content}</span>
        {shortcut ? (
          <span className="codex-ui-tooltip__shortcut">{shortcut}</span>
        ) : null}
      </FloatingSurface>
    </span>
  );
}

export interface PopoverProps {
  align?: OverlayAlign;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  initialFocus?: "content" | "first" | "none";
  initialFocusSelector?: string;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  role?: "dialog" | "listbox" | "menu";
  side?: OverlaySide;
  sideOffset?: number;
  style?: CSSProperties;
  trigger: ReactElement<TriggerProps>;
  width?: OverlayWidth;
}

export function Popover({
  align = "start",
  children,
  className,
  defaultOpen = false,
  disabled = false,
  initialFocus = "none",
  initialFocusSelector,
  label,
  onOpenChange,
  open,
  role = "dialog",
  side = "bottom",
  sideOffset = 4,
  style,
  trigger,
  width = "auto",
}: PopoverProps) {
  const id = useId();
  const inheritedOwnerIds = useContext(OverlayOwnerContext);
  const ownerIds = useMemo(
    () => [...inheritedOwnerIds, id],
    [id, inheritedOwnerIds],
  );
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const keyboardOpenTargetRef = useRef<"first" | "last" | null>(null);
  const [resolvedOpen, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open,
  });
  const triggerNode = Children.only(trigger);
  const nativeDisabled = disabled || Boolean(triggerNode.props.disabled);
  const effectiveOpen = resolvedOpen && !nativeDisabled;

  useEffect(() => {
    if (nativeDisabled && resolvedOpen) setOpen(false);
  }, [nativeDisabled, resolvedOpen, setOpen]);

  const close = useCallback(
    (restoreFocus = false) => {
      keyboardOpenTargetRef.current = null;
      setOpen(false);
      if (restoreFocus && typeof window !== "undefined") {
        window.setTimeout(() => {
          anchorRef.current?.querySelector<HTMLElement>(
            "button, [href], input, select, textarea, [tabindex]",
          )?.focus();
        });
      }
    },
    [setOpen],
  );

  useEffect(() => {
    if (!effectiveOpen || typeof document === "undefined") return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const ownedOverlay =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-codex-ui-overlay-owner]")
          : null;
      if (
        !anchorRef.current?.contains(target) &&
        !contentRef.current?.contains(target) &&
        !ownedOverlay?.dataset.codexUiOverlayOwner?.split(/\s+/).includes(id)
      ) {
        close();
      }
    };
    const handleBlur = () => close();
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("blur", handleBlur);
    };
  }, [close, effectiveOpen, id]);

  useEffect(() => {
    if (!effectiveOpen || initialFocus === "none" || typeof window === "undefined") {
      return;
    }
    const timer = window.setTimeout(() => {
      const content = contentRef.current;
      if (!content) return;
      const selected = initialFocusSelector
        ? content.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const target =
        selected ??
        (initialFocus === "first"
          ? keyboardOpenTargetRef.current === "last"
            ? getFocusableItems(content).at(-1)
            : getFocusableItems(content)[0]
          : content);
      keyboardOpenTargetRef.current = null;
      target?.focus();
    });
    return () => window.clearTimeout(timer);
  }, [effectiveOpen, initialFocus, initialFocusSelector]);

  const mergedTrigger = cloneElement(triggerNode, {
    "aria-controls": effectiveOpen ? id : undefined,
    "aria-expanded": effectiveOpen,
    "aria-haspopup": role,
    "data-state": effectiveOpen ? "open" : "closed",
    disabled: nativeDisabled,
    onClick: (event) => {
      triggerNode.props.onClick?.(event);
      if (!event.defaultPrevented && !nativeDisabled) setOpen(!resolvedOpen);
    },
    onKeyDown: (event) => {
      triggerNode.props.onKeyDown?.(event);
      if (event.defaultPrevented || nativeDisabled) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        keyboardOpenTargetRef.current =
          event.key === "ArrowUp" ? "last" : "first";
        setOpen(true);
      }
      if (event.key === "Escape") close();
    },
  });

  const surfaceClasses = ["codex-ui-popover", className]
    .filter(Boolean)
    .join(" ");
  return (
    <OverlayOwnerContext.Provider value={ownerIds}>
      <span className="codex-ui-popover-anchor" ref={anchorRef}>
        {mergedTrigger}
        <FloatingSurface
          align={align}
          anchorRef={anchorRef}
          className={surfaceClasses}
          contentRef={contentRef}
          id={id}
          label={label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close(true);
              return;
            }
            if (event.key === "Tab" && role !== "dialog") close();
            if (role === "menu" || role === "listbox") focusByKey(event);
          }}
          open={effectiveOpen}
          ownerIds={ownerIds}
          role={role}
          side={side}
          sideOffset={sideOffset}
          style={style}
          width={width}
        >
          {children}
        </FloatingSurface>
      </span>
    </OverlayOwnerContext.Provider>
  );
}

interface MenuContextValue {
  close: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export interface MenuProps
  extends Omit<PopoverProps, "initialFocus" | "role"> {}

export function Menu({
  defaultOpen = false,
  onOpenChange,
  open,
  width = "menu",
  ...props
}: MenuProps) {
  const [resolvedOpen, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open,
  });
  return (
    <MenuContext.Provider value={{ close: () => setOpen(false) }}>
      <Popover
        {...props}
        className={["codex-ui-menu", props.className]
          .filter(Boolean)
          .join(" ")}
        initialFocus="first"
        onOpenChange={setOpen}
        open={resolvedOpen}
        role="menu"
        width={width}
      />
    </MenuContext.Provider>
  );
}

export interface MenuItemProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children" | "onSelect"> {
  children: ReactNode;
  endIcon?: ReactNode;
  keepOpen?: boolean;
  onSelect?: () => void;
  shortcut?: ReactNode;
  startIcon?: ReactNode;
  subText?: ReactNode;
  tone?: "danger" | "default";
}

export function MenuItem({
  children,
  className,
  disabled = false,
  endIcon,
  keepOpen = false,
  onClick,
  onSelect,
  role = "menuitem",
  shortcut,
  startIcon,
  subText,
  tone = "default",
  type = "button",
  ...props
}: MenuItemProps) {
  const menu = useContext(MenuContext);
  const classes = ["codex-ui-menu-item", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      {...props}
      aria-disabled={disabled || undefined}
      className={classes}
      data-tone={tone}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) return;
        onSelect?.();
        if (!keepOpen) menu?.close();
      }}
      role={role}
      tabIndex={-1}
      type={type}
    >
      {startIcon ? (
        <span aria-hidden="true" className="codex-ui-menu-item__icon">
          {startIcon}
        </span>
      ) : null}
      <span className="codex-ui-menu-item__copy">
        <span className="codex-ui-menu-item__label">{children}</span>
        {subText ? (
          <span className="codex-ui-menu-item__subtext">{subText}</span>
        ) : null}
      </span>
      {shortcut ? (
        <span className="codex-ui-menu-item__shortcut">{shortcut}</span>
      ) : null}
      {endIcon ? (
        <span aria-hidden="true" className="codex-ui-menu-item__icon">
          {endIcon}
        </span>
      ) : null}
    </button>
  );
}

export interface MenuCheckboxItemProps
  extends Omit<MenuItemProps, "endIcon" | "onSelect"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function MenuCheckboxItem({
  checked,
  children,
  onCheckedChange,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <MenuItem
      {...props}
      endIcon={<span>{checked ? "✓" : ""}</span>}
      keepOpen
      onSelect={() => onCheckedChange(!checked)}
      role="menuitemcheckbox"
      aria-checked={checked}
    >
      {children}
    </MenuItem>
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={["codex-ui-menu-separator", className]
        .filter(Boolean)
        .join(" ")}
      role="separator"
      {...props}
    />
  );
}

export function MenuSectionLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={["codex-ui-menu-section-label", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export interface MenuSubmenuProps {
  children: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  startIcon?: ReactNode;
}

export function MenuSubmenu({
  children,
  disabled = false,
  label,
  startIcon,
}: MenuSubmenuProps) {
  const id = useId();
  const ownerIds = useContext(OverlayOwnerContext);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const focusOnOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const effectiveOpen = open && !disabled;
  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    clearCloseTimer();
    if (typeof window === "undefined") return;
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 100);
  };
  useEffect(() => () => clearCloseTimer(), []);
  useEffect(() => {
    if (disabled && open) {
      clearCloseTimer();
      focusOnOpenRef.current = false;
      setOpen(false);
    }
  }, [disabled, open]);
  useEffect(() => {
    if (!effectiveOpen || !focusOnOpenRef.current || typeof window === "undefined") {
      return;
    }
    const timer = window.setTimeout(() => {
      const content = contentRef.current;
      if (content) getFocusableItems(content)[0]?.focus();
      focusOnOpenRef.current = false;
    });
    return () => window.clearTimeout(timer);
  }, [effectiveOpen]);
  return (
    <>
      <button
        aria-controls={effectiveOpen ? id : undefined}
        aria-disabled={disabled || undefined}
        aria-expanded={effectiveOpen}
        aria-haspopup="menu"
        className="codex-ui-menu-item codex-ui-menu-submenu-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            focusOnOpenRef.current = true;
            setOpen(true);
          }
        }}
        onPointerEnter={() => {
          clearCloseTimer();
          if (!disabled) {
            focusOnOpenRef.current = false;
            setOpen(true);
          }
        }}
        onPointerLeave={scheduleClose}
        ref={anchorRef}
        role="menuitem"
        tabIndex={-1}
        type="button"
      >
        {startIcon ? (
          <span aria-hidden="true" className="codex-ui-menu-item__icon">
            {startIcon}
          </span>
        ) : null}
        <span className="codex-ui-menu-item__copy">{label}</span>
        <span aria-hidden="true" className="codex-ui-menu-submenu-trigger__chevron">
          ›
        </span>
      </button>
      <FloatingSurface
        align="start"
        anchorRef={anchorRef}
        className="codex-ui-popover codex-ui-menu codex-ui-menu__submenu"
        contentRef={contentRef}
        id={id}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            anchorRef.current?.focus();
            return;
          }
          focusByKey(event);
        }}
        open={effectiveOpen}
        ownerIds={ownerIds}
        role="menu"
        side="right"
        sideOffset={4}
        width="menu"
      >
        <div
          onPointerEnter={clearCloseTimer}
          onPointerLeave={scheduleClose}
        >
          {children}
        </div>
      </FloatingSurface>
    </>
  );
}

export interface SelectOption {
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  textValue?: string;
  value: string;
}

export interface SelectProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children" | "onChange" | "value"> {
  emptyMessage?: ReactNode;
  label: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: ReactNode;
  side?: OverlaySide;
  value?: string;
  width?: OverlayWidth;
}

export function Select({
  className,
  disabled = false,
  emptyMessage = "No options",
  label,
  onValueChange,
  options,
  placeholder = "Select an option",
  side = "bottom",
  value,
  width = "trigger",
  ...props
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <Popover
      align="start"
      disabled={disabled}
      initialFocus="first"
      initialFocusSelector='[role="option"][aria-selected="true"]:not(:disabled)'
      label={label}
      onOpenChange={setOpen}
      open={open}
      role="listbox"
      side={side}
      trigger={
        <button
          {...props}
          aria-label={label}
          className={["codex-ui-select-trigger", className]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled}
          type="button"
        >
          {selected?.icon ? (
            <span aria-hidden="true" className="codex-ui-select-trigger__icon">
              {selected.icon}
            </span>
          ) : null}
          <span className="codex-ui-select-trigger__label">
            {selected?.label ?? placeholder}
          </span>
          <span aria-hidden="true" className="codex-ui-select-trigger__chevron">
            ⌄
          </span>
        </button>
      }
      width={width}
    >
      <div className="codex-ui-select-options">
        {options.length > 0 ? (
          options.map((option) => {
            const selectedOption = option.value === value;
            return (
              <button
                aria-disabled={option.disabled || undefined}
                aria-label={option.textValue}
                aria-selected={selectedOption}
                className="codex-ui-select-option"
                data-selected={selectedOption || undefined}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  if (option.disabled) return;
                  onValueChange(option.value);
                  setOpen(false);
                }}
                role="option"
                tabIndex={-1}
                type="button"
              >
                {option.icon ? (
                  <span aria-hidden="true" className="codex-ui-select-option__icon">
                    {option.icon}
                  </span>
                ) : null}
                <span className="codex-ui-select-option__copy">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="codex-ui-select-option__description">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" className="codex-ui-select-option__check">
                  {selectedOption ? "✓" : ""}
                </span>
              </button>
            );
          })
        ) : (
          <div className="codex-ui-select-options__empty">{emptyMessage}</div>
        )}
      </div>
    </Popover>
  );
}
