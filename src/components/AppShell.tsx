import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  acquireDocumentScrollLock,
  retargetModalReturnFocusWithin,
  type ModalLockHandle,
} from "../internal/documentScrollLock.js";
import { inertWhen } from "../internal/inert.js";
import {
  notifySurfaceBlocked,
  SurfaceBlockedContext,
} from "../internal/surfaceBlocked.js";
import { IconButton } from "./InteractivePrimitives.js";

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="m5.5 5.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ExpandIcon({ expanded = false }: { expanded?: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      {expanded ? (
        <path
          d="M7.5 3.75v3.5h-3.5m8.5 9v-3.5H16m0-5.5h-3.5v-3.5m-8.5 9h3.5v3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      ) : (
        <path
          d="M4 7.25v-3.5h3.5m8.5 3.5v-3.5h-3.5M4 12.75v3.5h3.5m8.5-3.5v3.5h-3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 4.5v11M4.5 10h11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function useSurfaceFocusRestoration(
  open: boolean,
  surfaceRef: RefObject<HTMLElement | null>,
  fallbackRef: RefObject<HTMLElement | null>,
  dismissRef?: RefObject<HTMLElement | null>,
) {
  const previouslyOpenRef = useRef(open);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const focusWasInSurfaceRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const rememberOutsideFocus = (target: EventTarget | null) => {
      if (
        !(target instanceof HTMLElement) ||
        target === document.body ||
        surfaceOwnsActiveElement(surfaceRef.current, target) ||
        !shellFocusTargetIsVisible(target)
      ) {
        return;
      }
      returnFocusRef.current = target;
    };
    const trackFocus = (target: EventTarget | null) => {
      if (open) {
        focusWasInSurfaceRef.current =
          target instanceof HTMLElement &&
          (surfaceOwnsActiveElement(surfaceRef.current, target) ||
            dismissRef?.current === target);
        return;
      }
      rememberOutsideFocus(target);
    };
    if (open) trackFocus(document.activeElement);
    const handleFocus = (event: FocusEvent) => trackFocus(event.target);
    document.addEventListener("focusin", handleFocus, true);
    return () =>
      document.removeEventListener("focusin", handleFocus, true);
  }, [dismissRef, open, surfaceRef]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const wasOpen = previouslyOpenRef.current;
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!wasOpen && open) {
      if (
        activeElement &&
        activeElement !== document.body &&
        !surfaceOwnsActiveElement(surfaceRef.current, activeElement) &&
        shellFocusTargetIsVisible(activeElement)
      ) {
        returnFocusRef.current = activeElement;
      }
    }

    const focusIsBeingHidden =
      activeElement &&
      (surfaceOwnsActiveElement(surfaceRef.current, activeElement) ||
        dismissRef?.current === activeElement);
    if (!open) {
      const surface = surfaceRef.current;
      retargetModalFocusFromSurface(surface, fallbackRef.current);
      notifySurfaceBlocked(surface);
    }
    if (
      wasOpen &&
      !open &&
      (focusIsBeingHidden || focusWasInSurfaceRef.current)
    ) {
      const returnFocus = returnFocusRef.current;
      const canTryReturnFocus =
        returnFocus?.isConnected &&
        returnFocus !== document.body &&
        !returnFocus.closest('[inert], [aria-hidden="true"]')
          ? returnFocus
          : null;
      canTryReturnFocus?.focus();
      if (
        !canTryReturnFocus ||
        document.activeElement !== canTryReturnFocus
      ) {
        const target = fallbackRef.current;
        focusFirstInSurface(target);
      }
      focusWasInSurfaceRef.current = false;
    }

    previouslyOpenRef.current = open;
  }, [dismissRef, fallbackRef, open, surfaceRef]);
}

export type AppShellLayoutMode = "narrow" | "medium" | "wide";

// CSS container-query conditions cannot consume custom properties. Keep these
// internal constants locked to the matching queries in styles.css.
const appShellMediumBreakpointRem = 92;
const appShellNarrowBreakpointRem = 52;

function appShellRemToPixels(shell: HTMLElement, rem: number) {
  const rootFontSize =
    Number.parseFloat(
      getComputedStyle(shell.ownerDocument.documentElement).fontSize,
    ) || 16;
  return rem * rootFontSize;
}

interface AppShellLayoutMetrics {
  mode: AppShellLayoutMode;
  width: number | null;
}

function useAppShellLayoutMetrics(
  shellRef: RefObject<HTMLDivElement | null>,
): AppShellLayoutMetrics {
  const [layout, setLayout] = useState<AppShellLayoutMetrics>({
    mode: "wide",
    width: null,
  });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const update = (width: number) => {
      if (width <= 0) return;
      const mediumBreakpoint = appShellRemToPixels(
        shell,
        appShellMediumBreakpointRem,
      );
      const narrowBreakpoint = appShellRemToPixels(
        shell,
        appShellNarrowBreakpointRem,
      );
      const nextMode =
        width <= narrowBreakpoint
          ? "narrow"
          : width <= mediumBreakpoint
            ? "medium"
            : "wide";
      setLayout((current) =>
        current.mode === nextMode && current.width === width
          ? current
          : { mode: nextMode, width },
      );
    };

    update(shell.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.find(({ target }) => target === shell);
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, [shellRef]);

  return layout;
}

const shellFocusableSelector =
  'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

function shellFocusTargetIsVisible(target: HTMLElement) {
  if (target.closest('[hidden], [inert], [aria-hidden="true"]')) {
    return false;
  }
  let candidate: HTMLElement | null = target;
  while (candidate) {
    const style = getComputedStyle(candidate);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }
    candidate = candidate.parentElement;
  }
  return true;
}

function focusTargetsInSurface(surface: HTMLElement | null) {
  if (!surface) return [];
  const targets = [
    ...surface.querySelectorAll<HTMLElement>(shellFocusableSelector),
  ].filter(shellFocusTargetIsVisible);
  if (shellFocusTargetIsVisible(surface)) targets.push(surface);
  return targets;
}

function focusFirstInSurface(surface: HTMLElement | null) {
  for (const target of focusTargetsInSurface(surface)) {
    target.focus();
    if (document.activeElement === target) return;
  }
}

function focusTargetInSurface(surface: HTMLElement | null) {
  return focusTargetsInSurface(surface)[0] ?? null;
}

function surfaceOwnsActiveElement(
  surface: HTMLElement | null,
  activeElement: HTMLElement,
) {
  if (!surface) return false;
  if (surface.contains(activeElement)) return true;

  const controlledIds = new Set(
    [...surface.querySelectorAll<HTMLElement>("[aria-controls]")].flatMap(
      (trigger) =>
        trigger.getAttribute("aria-controls")?.split(/\s+/) ?? [],
    ),
  );
  if (controlledIds.size === 0) return false;

  let candidate: HTMLElement | null = activeElement;
  while (candidate) {
    if (candidate.id && controlledIds.has(candidate.id)) return true;
    const overlayOwnerIds =
      candidate.dataset.codexUiOverlayOwner?.split(/\s+/) ?? [];
    if (overlayOwnerIds.some((id) => controlledIds.has(id))) return true;
    candidate = candidate.parentElement;
  }
  return false;
}

function retargetModalFocusFromSurface(
  surface: HTMLElement | null,
  fallbackSurface: HTMLElement | null,
) {
  retargetModalReturnFocusWithin(
    surface,
    focusTargetInSurface(fallbackSurface),
    (target) => surfaceOwnsActiveElement(surface, target),
  );
}

export interface AppShellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  bottomPanel?: ReactNode;
  bottomPanelLabel?: string;
  bottomPanelOpen?: boolean;
  children: ReactNode;
  defaultSidePanelWidth?: number;
  defaultSidebarWidth?: number;
  mainLabel?: string;
  mainRole?: "main" | "region";
  layoutMode?: AppShellLayoutMode;
  onSidePanelOpenChange?: (open: boolean) => void;
  onSidePanelWidthChange?: (width: number) => void;
  onSidebarOpenChange?: (open: boolean) => void;
  onSidebarWidthChange?: (width: number) => void;
  sidePanel?: ReactNode;
  sidePanelExpanded?: boolean;
  sidePanelLabel?: string;
  sidePanelMaxWidth?: number;
  sidePanelMinMainWidth?: number;
  sidePanelMinWidth?: number;
  sidePanelOpen?: boolean;
  sidePanelResizable?: boolean;
  sidePanelResizeLabel?: string;
  sidePanelWidth?: number;
  sidebar?: ReactNode;
  sidebarLabel?: string;
  sidebarMaxWidth?: number;
  sidebarMinWidth?: number;
  sidebarOpen?: boolean;
  sidebarResizable?: boolean;
  sidebarResizeLabel?: string;
  sidebarWidth?: number;
}

function clampShellTrack(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

interface SidebarResizeSession {
  direction: 1 | -1;
  lastWidth: number;
  originClientX: number;
  originWidth: number;
  pointerId: number;
}

interface SidePanelResizeSession {
  direction: 1 | -1;
  lastWidth: number;
  originClientX: number;
  originWidth: number;
  pointerId: number;
}

export function AppShell({
  bottomPanel,
  bottomPanelLabel = "Bottom panel",
  bottomPanelOpen = Boolean(bottomPanel),
  children,
  className,
  defaultSidePanelWidth = 370,
  defaultSidebarWidth = 274,
  layoutMode: layoutModeOverride,
  mainLabel = "Conversation",
  mainRole = "main",
  onSidePanelOpenChange,
  onSidePanelWidthChange,
  onSidebarOpenChange,
  onSidebarWidthChange,
  sidePanel,
  sidePanelExpanded = false,
  sidePanelLabel = "Workspace panel",
  sidePanelMaxWidth = Number.POSITIVE_INFINITY,
  sidePanelMinMainWidth = 352,
  sidePanelMinWidth = 320,
  sidePanelOpen = false,
  sidePanelResizable = false,
  sidePanelResizeLabel = "Resize workspace panel",
  sidePanelWidth,
  sidebar,
  sidebarLabel = "App navigation",
  sidebarMaxWidth = 520,
  sidebarMinWidth = 240,
  sidebarOpen = false,
  sidebarResizable = false,
  sidebarResizeLabel = "Resize navigation sidebar",
  sidebarWidth,
  style,
  ...props
}: AppShellProps) {
  const bottomPanelRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidePanelBackdropRef = useRef<HTMLButtonElement>(null);
  const sidePanelOpenRef = useRef(sidePanelOpen);
  sidePanelOpenRef.current = sidePanelOpen;
  const sidePanelRef = useRef<HTMLElement>(null);
  const sidePanelResizerFocusedRef = useRef(false);
  const sidePanelResizerRef = useRef<HTMLDivElement>(null);
  const sidePanelResizeSessionRef =
    useRef<SidePanelResizeSession | null>(null);
  const sidebarBackdropRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarResizerFocusedRef = useRef(false);
  const sidebarResizerRef = useRef<HTMLDivElement>(null);
  const sidebarResizeSessionRef = useRef<SidebarResizeSession | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [internalSidePanelWidth, setInternalSidePanelWidth] = useState(
    Number.isFinite(defaultSidePanelWidth) ? defaultSidePanelWidth : 370,
  );
  const [internalSidebarWidth, setInternalSidebarWidth] = useState(
    Number.isFinite(defaultSidebarWidth) ? defaultSidebarWidth : 274,
  );
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const automaticLayout = useAppShellLayoutMetrics(shellRef);
  const layoutMode = layoutModeOverride ?? automaticLayout.mode;
  const normalizedSidebarMinWidth = Math.max(
    0,
    Number.isFinite(sidebarMinWidth) ? sidebarMinWidth : 240,
  );
  const normalizedSidebarMaxWidth = Math.max(
    normalizedSidebarMinWidth,
    Number.isFinite(sidebarMaxWidth) ? sidebarMaxWidth : 520,
  );
  const sidebarWidthIsControlled =
    sidebarWidth !== undefined && Number.isFinite(sidebarWidth);
  const requestedSidebarWidth = sidebarWidthIsControlled
    ? sidebarWidth
    : internalSidebarWidth;
  const resolvedSidebarWidth = clampShellTrack(
    requestedSidebarWidth,
    normalizedSidebarMinWidth,
    normalizedSidebarMaxWidth,
  );
  const normalizedSidePanelMinWidth = Math.max(
    0,
    Number.isFinite(sidePanelMinWidth) ? sidePanelMinWidth : 320,
  );
  const normalizedSidePanelMinMainWidth = Math.max(
    0,
    Number.isFinite(sidePanelMinMainWidth) ? sidePanelMinMainWidth : 352,
  );
  const normalizedSidePanelMaxWidth = Math.max(
    normalizedSidePanelMinWidth,
    Number.isFinite(sidePanelMaxWidth)
      ? sidePanelMaxWidth
      : Number.POSITIVE_INFINITY,
  );
  const shellWidth = automaticLayout.width;
  const occupiedSidebarWidth =
    sidebarOpen && sidebar !== undefined && sidebar !== null
      ? resolvedSidebarWidth
      : 0;
  const responsiveSidePanelMaxWidth =
    shellWidth === null
      ? normalizedSidePanelMaxWidth
      : Math.max(
          normalizedSidePanelMinWidth,
          shellWidth -
            occupiedSidebarWidth -
            normalizedSidePanelMinMainWidth,
        );
  const resolvedSidePanelMaxWidth = Math.min(
    normalizedSidePanelMaxWidth,
    responsiveSidePanelMaxWidth,
  );
  const sidePanelWidthIsControlled =
    sidePanelWidth !== undefined && Number.isFinite(sidePanelWidth);
  const requestedSidePanelWidth = sidePanelWidthIsControlled
    ? sidePanelWidth
    : internalSidePanelWidth;
  const resolvedSidePanelExpanded =
    sidePanelExpanded &&
    sidePanelOpen &&
    sidePanel !== undefined &&
    sidePanel !== null &&
    layoutMode === "wide";
  const expandedSidePanelWidth =
    shellWidth === null
      ? requestedSidePanelWidth
      : Math.max(0, shellWidth - occupiedSidebarWidth);
  const resolvedSidePanelWidth = resolvedSidePanelExpanded
    ? expandedSidePanelWidth
    : clampShellTrack(
        requestedSidePanelWidth,
        normalizedSidePanelMinWidth,
        resolvedSidePanelMaxWidth,
      );
  const shellStyle =
    sidebarResizable || sidePanelResizable || resolvedSidePanelExpanded
      ? ({
          ...style,
          ...(sidebarResizable
            ? {
                "--codex-ui-app-sidebar-width": `${resolvedSidebarWidth}px`,
              }
            : {}),
          ...(sidePanelResizable || resolvedSidePanelExpanded
            ? {
                "--codex-ui-app-side-panel-width": `${resolvedSidePanelWidth}px`,
              }
            : {}),
        } as CSSProperties)
      : style;
  const sidebarModalOpen =
    sidebarOpen && layoutMode === "narrow";
  const sidePanelModalOpen =
    sidePanelOpen &&
    layoutMode !== "wide" &&
    !sidebarModalOpen;
  const responsiveModalOpen =
    sidebarModalOpen || sidePanelModalOpen;
  const sidebarResizerVisible =
    sidebarResizable &&
    sidebarOpen &&
    sidebar !== undefined &&
    sidebar !== null &&
    layoutMode !== "narrow";
  const sidePanelResizerVisible =
    sidePanelResizable &&
    sidePanelOpen &&
    sidePanel !== undefined &&
    sidePanel !== null &&
    !resolvedSidePanelExpanded &&
    layoutMode === "wide";
  const commitSidePanelWidth = (nextWidth: number) => {
    const measuredLiveShellWidth =
      shellRef.current?.getBoundingClientRect().width ?? shellWidth;
    const liveShellWidth =
      measuredLiveShellWidth !== null && measuredLiveShellWidth > 0
        ? measuredLiveShellWidth
        : null;
    const liveSidebarWidth =
      sidebarOpen && sidebar !== undefined && sidebar !== null
        ? sidebarRef.current?.getBoundingClientRect().width ||
          resolvedSidebarWidth
        : 0;
    const liveResponsiveMaximum =
      liveShellWidth === null
        ? normalizedSidePanelMaxWidth
        : Math.max(
            normalizedSidePanelMinWidth,
            liveShellWidth -
              liveSidebarWidth -
              normalizedSidePanelMinMainWidth,
          );
    const maximum = Math.min(
      normalizedSidePanelMaxWidth,
      liveResponsiveMaximum,
    );
    const normalizedWidth = clampShellTrack(
      nextWidth,
      normalizedSidePanelMinWidth,
      maximum,
    );
    if (!sidePanelWidthIsControlled) {
      setInternalSidePanelWidth(normalizedWidth);
    }
    onSidePanelWidthChange?.(normalizedWidth);
    return normalizedWidth;
  };
  const handleSidePanelResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    const direction =
      getComputedStyle(shellRef.current ?? event.currentTarget).direction ===
      "rtl"
        ? 1
        : -1;
    sidePanelResizeSessionRef.current = {
      direction,
      lastWidth: resolvedSidePanelWidth,
      originClientX: event.clientX,
      originWidth: resolvedSidePanelWidth,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSidePanelResizing(true);
    event.preventDefault();
  };
  const handleSidePanelResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = sidePanelResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const nextWidth =
      session.originWidth +
      (event.clientX - session.originClientX) * session.direction;
    if (nextWidth === session.lastWidth) return;
    session.lastWidth = commitSidePanelWidth(nextWidth);
  };
  const finishSidePanelResize = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = sidePanelResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sidePanelResizeSessionRef.current = null;
    setSidePanelResizing(false);
  };
  const handleSidePanelResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    const direction =
      getComputedStyle(shellRef.current ?? event.currentTarget).direction ===
      "rtl"
        ? 1
        : -1;
    const step = event.shiftKey ? 32 : 8;
    let nextWidth: number | undefined;
    if (event.key === "Home") nextWidth = normalizedSidePanelMinWidth;
    if (event.key === "End") nextWidth = resolvedSidePanelMaxWidth;
    if (event.key === "ArrowLeft") {
      nextWidth = resolvedSidePanelWidth - step * direction;
    }
    if (event.key === "ArrowRight") {
      nextWidth = resolvedSidePanelWidth + step * direction;
    }
    if (nextWidth === undefined) return;
    event.preventDefault();
    commitSidePanelWidth(nextWidth);
  };
  useEffect(() => {
    if (sidePanelResizerVisible) return;
    sidePanelResizeSessionRef.current = null;
    setSidePanelResizing(false);
  }, [sidePanelResizerVisible]);
  const commitSidebarWidth = (nextWidth: number) => {
    const normalizedWidth = clampShellTrack(
      nextWidth,
      normalizedSidebarMinWidth,
      normalizedSidebarMaxWidth,
    );
    if (!sidebarWidthIsControlled) {
      setInternalSidebarWidth(normalizedWidth);
    }
    onSidebarWidthChange?.(normalizedWidth);
    return normalizedWidth;
  };
  const handleSidebarResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    const direction =
      getComputedStyle(shellRef.current ?? event.currentTarget).direction ===
      "rtl"
        ? -1
        : 1;
    sidebarResizeSessionRef.current = {
      direction,
      lastWidth: resolvedSidebarWidth,
      originClientX: event.clientX,
      originWidth: resolvedSidebarWidth,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSidebarResizing(true);
    event.preventDefault();
  };
  const handleSidebarResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = sidebarResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const nextWidth = clampShellTrack(
      session.originWidth +
        (event.clientX - session.originClientX) * session.direction,
      normalizedSidebarMinWidth,
      normalizedSidebarMaxWidth,
    );
    if (nextWidth === session.lastWidth) return;
    session.lastWidth = commitSidebarWidth(nextWidth);
  };
  const finishSidebarResize = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = sidebarResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sidebarResizeSessionRef.current = null;
    setSidebarResizing(false);
  };
  const handleSidebarResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    const direction =
      getComputedStyle(shellRef.current ?? event.currentTarget).direction ===
      "rtl"
        ? -1
        : 1;
    const step = event.shiftKey ? 32 : 8;
    let nextWidth: number | undefined;
    if (event.key === "Home") nextWidth = normalizedSidebarMinWidth;
    if (event.key === "End") nextWidth = normalizedSidebarMaxWidth;
    if (event.key === "ArrowLeft") {
      nextWidth = resolvedSidebarWidth - step * direction;
    }
    if (event.key === "ArrowRight") {
      nextWidth = resolvedSidebarWidth + step * direction;
    }
    if (nextWidth === undefined) return;
    event.preventDefault();
    commitSidebarWidth(nextWidth);
  };
  useEffect(() => {
    if (sidebarResizerVisible) return;
    sidebarResizeSessionRef.current = null;
    setSidebarResizing(false);
  }, [sidebarResizerVisible]);
  const responsiveModalStateRef = useRef({
    sidePanelModalOpen,
    sidebarModalOpen,
  });
  responsiveModalStateRef.current = {
    sidePanelModalOpen,
    sidebarModalOpen,
  };
  useLayoutEffect(() => {
    if (!sidebarResizerVisible) return;
    const resizer = sidebarResizerRef.current;
    return () => {
      const activeElement = document.activeElement;
      const focusNeedsRestoration =
        activeElement === resizer ||
        (sidebarResizerFocusedRef.current &&
          activeElement === document.body);
      if (!resizer || !focusNeedsRestoration) return;
      sidebarResizerFocusedRef.current = false;
      const modalState = responsiveModalStateRef.current;
      const fallbackSurface = modalState.sidebarModalOpen
        ? sidebarRef.current
        : modalState.sidePanelModalOpen
          ? sidePanelRef.current
          : mainRef.current;
      focusFirstInSurface(fallbackSurface);
    };
  }, [sidebarResizerVisible]);
  useLayoutEffect(() => {
    if (!sidePanelResizerVisible) return;
    const resizer = sidePanelResizerRef.current;
    return () => {
      const activeElement = document.activeElement;
      const focusNeedsRestoration =
        activeElement === resizer ||
        (sidePanelResizerFocusedRef.current &&
          activeElement === document.body);
      if (!resizer || !focusNeedsRestoration) return;
      sidePanelResizerFocusedRef.current = false;
      const fallbackSurface = sidePanelOpenRef.current
        ? sidePanelRef.current
        : mainRef.current;
      focusFirstInSurface(fallbackSurface);
    };
  }, [sidePanelResizerVisible]);
  const responsiveModalLockRef = useRef<ModalLockHandle | null>(
    null,
  );
  const previouslySidePanelModalOpenRef = useRef(sidePanelModalOpen);
  const previouslySidebarModalOpenRef = useRef(sidebarModalOpen);
  const mainBlocked = sidebarModalOpen || sidePanelModalOpen;
  const sidebarFocusFallbackRef = sidePanelModalOpen
    ? sidePanelRef
    : mainRef;
  const bottomPanelFocusFallbackRef = sidebarModalOpen
    ? sidebarRef
    : sidePanelModalOpen
      ? sidePanelRef
      : mainRef;

  useSurfaceFocusRestoration(
    sidebarOpen,
    sidebarRef,
    sidebarFocusFallbackRef,
    sidebarBackdropRef,
  );
  useSurfaceFocusRestoration(
    sidePanelOpen,
    sidePanelRef,
    mainRef,
    sidePanelBackdropRef,
  );
  useSurfaceFocusRestoration(
    bottomPanelOpen,
    bottomPanelRef,
    bottomPanelFocusFallbackRef,
  );
  useEffect(() => {
    if (!responsiveModalOpen || typeof document === "undefined") return;

    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const modalLock = acquireDocumentScrollLock({
      containsFocus: (target) => {
        const {
          sidePanelModalOpen: sidePanelIsModal,
          sidebarModalOpen: sidebarIsModal,
        } = responsiveModalStateRef.current;
        const targetBelongsToShell =
          shellRef.current?.contains(target) ||
          surfaceOwnsActiveElement(sidebarRef.current, target) ||
          surfaceOwnsActiveElement(mainRef.current, target) ||
          surfaceOwnsActiveElement(sidePanelRef.current, target) ||
          surfaceOwnsActiveElement(bottomPanelRef.current, target);
        if (!targetBelongsToShell) {
          return (
            target !== document.body &&
            !target.closest('[inert], [aria-hidden="true"]')
          );
        }
        if (sidebarIsModal) {
          return (
            surfaceOwnsActiveElement(sidebarRef.current, target) ||
            sidebarBackdropRef.current === target
          );
        }
        if (sidePanelIsModal) {
          return (
            surfaceOwnsActiveElement(sidePanelRef.current, target) ||
            surfaceOwnsActiveElement(sidebarRef.current, target) ||
            surfaceOwnsActiveElement(bottomPanelRef.current, target) ||
            sidePanelBackdropRef.current === target
          );
        }
        return false;
      },
      getInitialFocus: () => {
        const {
          sidePanelModalOpen: sidePanelIsModal,
          sidebarModalOpen: sidebarIsModal,
        } = responsiveModalStateRef.current;
        const surface = sidebarIsModal
          ? sidebarRef.current
          : sidePanelIsModal
            ? sidePanelRef.current
            : null;
        return focusTargetInSurface(surface);
      },
      lockDocumentScroll: false,
      priority: 80,
      returnFocus,
    });
    responsiveModalLockRef.current = modalLock;
    return () => {
      if (responsiveModalLockRef.current === modalLock) {
        responsiveModalLockRef.current = null;
      }
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const focusIsOnShellBackdrop =
        activeElement === sidebarBackdropRef.current ||
        activeElement === sidePanelBackdropRef.current;
      const focusRemainsAvailable =
        activeElement !== null &&
        activeElement !== document.body &&
        activeElement.isConnected &&
        !focusIsOnShellBackdrop &&
        !activeElement.closest('[inert], [aria-hidden="true"]');
      const target = modalLock.release();
      if (
        !focusRemainsAvailable &&
        !focusIsOnShellBackdrop &&
        target?.isConnected &&
        !target.closest('[inert], [aria-hidden="true"]')
      ) {
        target.focus();
      }
    };
  }, [responsiveModalOpen]);
  useEffect(() => {
    if (!responsiveModalOpen || typeof document === "undefined") return;
    const dismissResponsiveModal = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        !responsiveModalLockRef.current?.isTop()
      ) {
        return;
      }
      const eventTarget =
        event.target instanceof HTMLElement
          ? event.target
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      const eventBelongsToShell =
        eventTarget === document.body ||
        (eventTarget !== null &&
          (shellRef.current?.contains(eventTarget) ||
            surfaceOwnsActiveElement(sidebarRef.current, eventTarget) ||
            surfaceOwnsActiveElement(mainRef.current, eventTarget) ||
            surfaceOwnsActiveElement(sidePanelRef.current, eventTarget) ||
            surfaceOwnsActiveElement(bottomPanelRef.current, eventTarget)));
      if (!eventBelongsToShell) return;
      const dismiss = sidebarModalOpen
        ? onSidebarOpenChange
        : sidePanelModalOpen
          ? onSidePanelOpenChange
          : undefined;
      if (!dismiss) return;
      event.preventDefault();
      dismiss(false);
    };
    document.addEventListener("keydown", dismissResponsiveModal);
    return () =>
      document.removeEventListener("keydown", dismissResponsiveModal);
  }, [
    onSidePanelOpenChange,
    onSidebarOpenChange,
    responsiveModalOpen,
    sidePanelModalOpen,
    sidebarModalOpen,
  ]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!activeElement) return;
    const wasSidePanelModalOpen =
      previouslySidePanelModalOpenRef.current;
    const wasSidebarModalOpen = previouslySidebarModalOpenRef.current;
    previouslySidePanelModalOpenRef.current = sidePanelModalOpen;
    previouslySidebarModalOpenRef.current = sidebarModalOpen;
    const responsiveModalIsTop =
      responsiveModalLockRef.current?.isTop() ?? false;
    const noActiveControl = activeElement === document.body;
    const focusBelongsToShell =
      shellRef.current?.contains(activeElement) ||
      surfaceOwnsActiveElement(sidebarRef.current, activeElement) ||
      surfaceOwnsActiveElement(mainRef.current, activeElement) ||
      surfaceOwnsActiveElement(sidePanelRef.current, activeElement) ||
      surfaceOwnsActiveElement(bottomPanelRef.current, activeElement);
    const blockSurface = (
      surface: HTMLElement | null,
      fallbackSurface: HTMLElement | null,
    ) => {
      retargetModalFocusFromSurface(surface, fallbackSurface);
      notifySurfaceBlocked(surface);
    };
    if (sidebarModalOpen && !wasSidebarModalOpen) {
      blockSurface(mainRef.current, sidebarRef.current);
      blockSurface(sidePanelRef.current, sidebarRef.current);
      blockSurface(bottomPanelRef.current, sidebarRef.current);
    } else if (sidePanelModalOpen && !wasSidePanelModalOpen) {
      blockSurface(mainRef.current, sidePanelRef.current);
    }

    if (
      responsiveModalIsTop &&
      sidebarModalOpen &&
      (noActiveControl ||
        (focusBelongsToShell &&
          !surfaceOwnsActiveElement(sidebarRef.current, activeElement)))
    ) {
      focusFirstInSurface(sidebarRef.current);
      return;
    }
    if (
      responsiveModalIsTop &&
      sidePanelModalOpen &&
      (noActiveControl ||
        surfaceOwnsActiveElement(mainRef.current, activeElement) ||
        sidePanelBackdropRef.current === activeElement)
    ) {
      focusFirstInSurface(sidePanelRef.current);
      return;
    }
    if (
      wasSidebarModalOpen &&
      !sidebarModalOpen &&
      sidebarOpen &&
      sidebarBackdropRef.current === activeElement
    ) {
      focusFirstInSurface(sidebarRef.current);
      return;
    }
    if (
      wasSidePanelModalOpen &&
      !sidePanelModalOpen &&
      sidePanelOpen &&
      sidePanelBackdropRef.current === activeElement
    ) {
      focusFirstInSurface(sidePanelRef.current);
    }
  }, [
    sidePanelModalOpen,
    sidePanelOpen,
    sidebarModalOpen,
    sidebarOpen,
  ]);

  return (
    <div
      className={["codex-ui-app-shell", className].filter(Boolean).join(" ")}
      data-bottom-panel-open={bottomPanelOpen || undefined}
      data-side-panel-expanded={resolvedSidePanelExpanded || undefined}
      data-side-panel-open={sidePanelOpen || undefined}
      data-side-panel-resizable={sidePanelResizable || undefined}
      data-side-panel-resizing={sidePanelResizing || undefined}
      data-sidebar-resizable={sidebarResizable || undefined}
      data-sidebar-resizing={sidebarResizing || undefined}
      data-sidebar-open={sidebarOpen || undefined}
      data-layout-mode={layoutMode}
      ref={shellRef}
      style={shellStyle}
      {...props}
    >
      <div className="codex-ui-app-shell__layout">
        <aside
          aria-hidden={!sidebarOpen}
          aria-label={sidebarLabel}
          className="codex-ui-app-shell__sidebar"
          inert={inertWhen(!sidebarOpen)}
          ref={sidebarRef}
          tabIndex={-1}
        >
          <SurfaceBlockedContext.Provider value={!sidebarOpen}>
            {sidebar}
          </SurfaceBlockedContext.Provider>
        </aside>
        {sidebarResizerVisible ? (
          <div
            aria-label={sidebarResizeLabel}
            aria-orientation="vertical"
            aria-valuemax={Math.round(normalizedSidebarMaxWidth)}
            aria-valuemin={Math.round(normalizedSidebarMinWidth)}
            aria-valuenow={Math.round(resolvedSidebarWidth)}
            aria-valuetext={`${Math.round(resolvedSidebarWidth)} pixels`}
            className="codex-ui-app-shell__sidebar-resizer"
            onBlur={(event) => {
              if (event.relatedTarget instanceof HTMLElement) {
                sidebarResizerFocusedRef.current = false;
              }
            }}
            onFocus={() => {
              sidebarResizerFocusedRef.current = true;
            }}
            onKeyDown={handleSidebarResizeKeyDown}
            onLostPointerCapture={finishSidebarResize}
            onPointerCancel={finishSidebarResize}
            onPointerDown={handleSidebarResizePointerDown}
            onPointerMove={handleSidebarResizePointerMove}
            onPointerUp={finishSidebarResize}
            ref={sidebarResizerRef}
            role="separator"
            tabIndex={0}
          />
        ) : null}
        {onSidebarOpenChange ? (
          <button
            aria-label="Close navigation sidebar"
            className="codex-ui-app-shell__backdrop"
            data-backdrop="sidebar"
            onClick={() => onSidebarOpenChange(false)}
            ref={sidebarBackdropRef}
            tabIndex={sidebarOpen ? 0 : -1}
            type="button"
          />
        ) : null}
        <div
          aria-label={mainLabel}
          className="codex-ui-app-shell__main"
          inert={inertWhen(mainBlocked)}
          ref={mainRef}
          role={mainRole}
          tabIndex={-1}
        >
          <SurfaceBlockedContext.Provider value={mainBlocked}>
            {children}
          </SurfaceBlockedContext.Provider>
        </div>
        {sidePanelResizerVisible ? (
          <div
            aria-label={sidePanelResizeLabel}
            aria-orientation="vertical"
            aria-valuemax={Math.round(
              Number.isFinite(resolvedSidePanelMaxWidth)
                ? resolvedSidePanelMaxWidth
                : resolvedSidePanelWidth,
            )}
            aria-valuemin={Math.round(normalizedSidePanelMinWidth)}
            aria-valuenow={Math.round(resolvedSidePanelWidth)}
            aria-valuetext={`${Math.round(resolvedSidePanelWidth)} pixels`}
            className="codex-ui-app-shell__side-panel-resizer"
            onBlur={(event) => {
              if (event.relatedTarget instanceof HTMLElement) {
                sidePanelResizerFocusedRef.current = false;
              }
            }}
            onFocus={() => {
              sidePanelResizerFocusedRef.current = true;
            }}
            onKeyDown={handleSidePanelResizeKeyDown}
            onLostPointerCapture={finishSidePanelResize}
            onPointerCancel={finishSidePanelResize}
            onPointerDown={handleSidePanelResizePointerDown}
            onPointerMove={handleSidePanelResizePointerMove}
            onPointerUp={finishSidePanelResize}
            ref={sidePanelResizerRef}
            role="separator"
            tabIndex={0}
          />
        ) : null}
        {onSidePanelOpenChange ? (
          <button
            aria-label="Close workspace panel"
            className="codex-ui-app-shell__backdrop"
            data-backdrop="side-panel"
            onClick={() => onSidePanelOpenChange(false)}
            ref={sidePanelBackdropRef}
            tabIndex={sidePanelOpen && !sidebarModalOpen ? 0 : -1}
            type="button"
          />
        ) : null}
        <aside
          aria-hidden={!sidePanelOpen || sidebarModalOpen}
          aria-label={sidePanelLabel}
          className="codex-ui-app-shell__side-panel"
          inert={inertWhen(!sidePanelOpen || sidebarModalOpen)}
          ref={sidePanelRef}
          tabIndex={-1}
        >
          <SurfaceBlockedContext.Provider
            value={!sidePanelOpen || sidebarModalOpen}
          >
            {sidePanel}
          </SurfaceBlockedContext.Provider>
        </aside>
        <section
          aria-hidden={!bottomPanelOpen || sidebarModalOpen}
          aria-label={bottomPanelLabel}
          className="codex-ui-app-shell__bottom-panel"
          inert={inertWhen(!bottomPanelOpen || sidebarModalOpen)}
          ref={bottomPanelRef}
        >
          <SurfaceBlockedContext.Provider
            value={!bottomPanelOpen || sidebarModalOpen}
          >
            {bottomPanel}
          </SurfaceBlockedContext.Provider>
        </section>
      </div>
    </div>
  );
}

export interface AppSidebarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  navigationLabel?: string;
}

export function AppSidebar({
  children,
  className,
  footer,
  header,
  navigationLabel = "Primary",
  ...props
}: AppSidebarProps) {
  return (
    <div
      className={["codex-ui-app-sidebar", className].filter(Boolean).join(" ")}
      {...props}
    >
      {header ? (
        <div className="codex-ui-app-sidebar__header">{header}</div>
      ) : null}
      <nav
        aria-label={navigationLabel}
        className="codex-ui-app-sidebar__navigation"
      >
        {children}
      </nav>
      {footer ? (
        <div className="codex-ui-app-sidebar__footer">{footer}</div>
      ) : null}
    </div>
  );
}

export interface AppSidebarSectionProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  actions?: ReactNode;
  children: ReactNode;
  title?: ReactNode;
}

export function AppSidebarSection({
  actions,
  children,
  className,
  title,
  ...props
}: AppSidebarSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={["codex-ui-app-sidebar__section", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {title || actions ? (
        <div className="codex-ui-app-sidebar__section-header">
          {title ? <h2 id={headingId}>{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="codex-ui-app-sidebar__items">{children}</div>
    </section>
  );
}

export interface AppSidebarItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  badge?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  selected?: boolean;
  trailing?: ReactNode;
}

export function AppSidebarItem({
  badge,
  children,
  className,
  description,
  leading,
  selected = false,
  trailing,
  type = "button",
  ...props
}: AppSidebarItemProps) {
  return (
    <button
      aria-current={selected ? "page" : undefined}
      className={["codex-ui-app-sidebar__item", className]
        .filter(Boolean)
        .join(" ")}
      data-selected={selected || undefined}
      type={type}
      {...props}
    >
      {leading ? (
        <span aria-hidden="true" className="codex-ui-app-sidebar__item-leading">
          {leading}
        </span>
      ) : null}
      <span className="codex-ui-app-sidebar__item-content">
        <span className="codex-ui-app-sidebar__item-label">{children}</span>
        {description ? (
          <span className="codex-ui-app-sidebar__item-description">
            {description}
          </span>
        ) : null}
      </span>
      {badge ? (
        <span className="codex-ui-app-sidebar__item-badge">{badge}</span>
      ) : null}
      {trailing ? (
        <span className="codex-ui-app-sidebar__item-trailing">{trailing}</span>
      ) : null}
    </button>
  );
}

export interface WorkspacePanelTab {
  closeLabel?: string;
  content: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
}

export type WorkspacePanelPlacement = "bottom" | "side";

export interface WorkspacePanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  activeTabId: string;
  actions?: ReactNode;
  emptyState?: ReactNode;
  expandPanelLabel?: string;
  expanded?: boolean;
  label: string;
  onActiveTabChange: (id: string) => void;
  onClose?: () => void;
  onCloseTab?: (id: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onOpenTab?: () => void;
  openTabLabel?: string;
  placement?: WorkspacePanelPlacement;
  restorePanelLabel?: string;
  tabs: readonly WorkspacePanelTab[];
  tabsLabel?: string;
}

export function WorkspacePanel({
  activeTabId,
  actions,
  className,
  emptyState = "No open tabs",
  expandPanelLabel = "Expand panel",
  expanded = false,
  label,
  onActiveTabChange,
  onClose,
  onCloseTab,
  onExpandedChange,
  onOpenTab,
  openTabLabel = "Open panel tab",
  placement = "side",
  restorePanelLabel = "Restore panel",
  style,
  tabs,
  tabsLabel,
  ...props
}: WorkspacePanelProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const activeIndex = activeTab
    ? tabs.findIndex((tab) => tab.id === activeTab.id)
    : -1;
  const activeTabDomId =
    activeIndex >= 0 ? `${panelId}-tab-${activeIndex}` : undefined;
  const activePanelDomId =
    activeIndex >= 0 ? `${panelId}-panel-${activeIndex}` : undefined;
  const firstEnabledIndex = tabs.findIndex((tab) => !tab.disabled);
  const tabbableTabIndex =
    activeIndex >= 0 && !activeTab?.disabled
      ? activeIndex
      : firstEnabledIndex;
  const moveTabFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const enabledIndexes = tabs
      .map((tab, index) => (tab.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (enabledIndexes.length === 0) return;

    const position = enabledIndexes.indexOf(currentIndex);
    let nextIndex: number | undefined;
    if (event.key === "Home") nextIndex = enabledIndexes[0];
    if (event.key === "End") nextIndex = enabledIndexes.at(-1);
    if (event.key === "ArrowRight") {
      nextIndex = enabledIndexes[(position + 1) % enabledIndexes.length];
    }
    if (event.key === "ArrowLeft") {
      nextIndex =
        enabledIndexes[
          (position - 1 + enabledIndexes.length) % enabledIndexes.length
        ];
    }
    if (nextIndex === undefined) return;

    event.preventDefault();
    onActiveTabChange(tabs[nextIndex]!.id);
    document.getElementById(`${panelId}-tab-${nextIndex}`)?.focus();
  };
  const closeActiveTab = () => {
    if (!activeTab || !onCloseTab) return;
    const closingIndex = activeIndex;
    onCloseTab(activeTab.id);
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const remainingTabs = [
        ...panel.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]:not(:disabled)',
        ),
      ];
      const selectedTab = remainingTabs.find(
        (tab) => tab.getAttribute("aria-selected") === "true",
      );
      const nearestTab =
        remainingTabs[
          Math.min(Math.max(closingIndex, 0), remainingTabs.length - 1)
        ];
      const target =
        selectedTab ??
        nearestTab ??
        panel.querySelector<HTMLElement>('[role="tabpanel"]') ??
        panel;
      target.focus();
    });
  };

  return (
    <section
      aria-label={label}
      className={["codex-ui-workspace-panel", className]
        .filter(Boolean)
        .join(" ")}
      data-expanded={expanded || undefined}
      data-placement={placement}
      ref={panelRef}
      style={
        {
          ...style,
          "--codex-ui-workspace-tab-count": Math.max(tabs.length, 1),
        } as CSSProperties
      }
      tabIndex={-1}
      {...props}
    >
      <header className="codex-ui-workspace-panel__header">
        <div
          aria-label={tabsLabel ?? `${label} tabs`}
          aria-orientation="horizontal"
          className="codex-ui-workspace-panel__tabs"
          role="tablist"
        >
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTabId;
            return (
              <button
                aria-controls={
                  selected ? `${panelId}-panel-${index}` : undefined
                }
                aria-selected={selected}
                className="codex-ui-workspace-panel__tab"
                data-selected={selected || undefined}
                disabled={tab.disabled}
                id={`${panelId}-tab-${index}`}
                key={tab.id}
                onClick={() => onActiveTabChange(tab.id)}
                onKeyDown={(event) => moveTabFocus(event, index)}
                role="tab"
                tabIndex={index === tabbableTabIndex ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="codex-ui-workspace-panel__actions">
          {actions}
          {onCloseTab && activeTab ? (
            <IconButton
              icon={<CloseIcon />}
              label={
                activeTab.closeLabel ??
                (typeof activeTab.label === "string" ||
                typeof activeTab.label === "number"
                  ? `Close ${activeTab.label} tab`
                  : "Close active tab")
              }
              onClick={closeActiveTab}
              size="toolbar"
            />
          ) : null}
          {onOpenTab ? (
            <IconButton
              icon={<PlusIcon />}
              label={openTabLabel}
              onClick={onOpenTab}
              size="toolbar"
            />
          ) : null}
          {onExpandedChange ? (
            <IconButton
              icon={<ExpandIcon expanded={expanded} />}
              label={
                expanded ? restorePanelLabel : expandPanelLabel
              }
              onClick={() => onExpandedChange(!expanded)}
              pressed={expanded}
              size="toolbar"
            />
          ) : null}
          {onClose ? (
            <IconButton
              icon={<CloseIcon />}
              label={`Close ${label.toLowerCase()}`}
              onClick={onClose}
              size="toolbar"
            />
          ) : null}
        </div>
      </header>
      {activeTab ? (
        <div
          aria-labelledby={activeTabDomId}
          className="codex-ui-workspace-panel__content"
          id={activePanelDomId}
          role="tabpanel"
          tabIndex={0}
        >
          {activeTab.content}
        </div>
      ) : (
        <div className="codex-ui-workspace-panel__empty">{emptyState}</div>
      )}
    </section>
  );
}
