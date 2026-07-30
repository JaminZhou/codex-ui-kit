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

function SidebarChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="m6 4 4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
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
export type AppShellNarrowSidebarBehavior = "current-build" | "modal";

// CSS container-query conditions cannot consume custom properties. Keep these
// internal constants locked to the matching queries in styles.css.
const appShellMediumBreakpointRem = 60;
const appShellNarrowBreakpointRem = 45;

function appShellContentBoxWidth(shell: HTMLElement) {
  const borderBoxWidth = shell.getBoundingClientRect().width;
  if (borderBoxWidth <= 0) return 0;
  const style = getComputedStyle(shell);
  const inlineInsets = [
    style.borderLeftWidth,
    style.borderRightWidth,
    style.paddingLeft,
    style.paddingRight,
  ].reduce(
    (total, value) => total + (Number.parseFloat(value) || 0),
    0,
  );
  return Math.max(0, borderBoxWidth - inlineInsets);
}

function appShellContentBoxHeight(shell: HTMLElement) {
  const borderBoxHeight = shell.getBoundingClientRect().height;
  if (borderBoxHeight <= 0) return 0;
  const style = getComputedStyle(shell);
  const blockInsets = [
    style.borderTopWidth,
    style.borderBottomWidth,
    style.paddingTop,
    style.paddingBottom,
  ].reduce(
    (total, value) => total + (Number.parseFloat(value) || 0),
    0,
  );
  return Math.max(0, borderBoxHeight - blockInsets);
}

function appShellRemToPixels(shell: HTMLElement, rem: number) {
  const rootFontSize =
    Number.parseFloat(
      getComputedStyle(shell.ownerDocument.documentElement).fontSize,
    ) || 16;
  return rem * rootFontSize;
}

interface AppShellLayoutMetrics {
  height: number | null;
  mode: AppShellLayoutMode;
  width: number | null;
}

function useAppShellLayoutMetrics(
  shellRef: RefObject<HTMLDivElement | null>,
): AppShellLayoutMetrics {
  const [layout, setLayout] = useState<AppShellLayoutMetrics>({
    height: null,
    mode: "wide",
    width: null,
  });

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const update = (width: number, height: number) => {
      setLayout((current) => {
        const nextWidth =
          Number.isFinite(width) && width > 0 ? width : current.width;
        const nextHeight =
          Number.isFinite(height) && height > 0
            ? height
            : current.height;
        const mediumBreakpoint = appShellRemToPixels(
          shell,
          appShellMediumBreakpointRem,
        );
        const narrowBreakpoint = appShellRemToPixels(
          shell,
          appShellNarrowBreakpointRem,
        );
        const nextMode =
          nextWidth === null
            ? current.mode
            : nextWidth <= narrowBreakpoint
              ? "narrow"
              : nextWidth <= mediumBreakpoint
                ? "medium"
                : "wide";
        return current.mode === nextMode &&
          current.width === nextWidth &&
          current.height === nextHeight
          ? current
          : { height: nextHeight, mode: nextMode, width: nextWidth };
      });
    };

    update(
      appShellContentBoxWidth(shell),
      appShellContentBoxHeight(shell),
    );
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.find(({ target }) => target === shell);
      if (entry) {
        update(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, [shellRef]);

  return layout;
}

function useObservedElementWidth(
  elementRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!enabled || !element) {
      setWidth((current) => (current === null ? current : null));
      return;
    }

    const update = (nextWidth: number) => {
      if (nextWidth <= 0) return;
      setWidth((current) =>
        current === nextWidth ? current : nextWidth,
      );
    };

    update(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries.find(({ target }) => target === element);
      if (!entry) return;
      const renderedWidth = element.getBoundingClientRect().width;
      const borderBoxWidth =
        entry.borderBoxSize?.[0]?.inlineSize ?? 0;
      update(
        renderedWidth > 0
          ? renderedWidth
          : borderBoxWidth > 0
            ? borderBoxWidth
            : entry.contentRect.width,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, enabled]);

  return width;
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
  bottomPanelHeight?: number;
  bottomPanelLabel?: string;
  bottomPanelMaxHeight?: number;
  bottomPanelMinHeight?: number;
  bottomPanelOpen?: boolean;
  bottomPanelResizable?: boolean;
  bottomPanelResizeLabel?: string;
  children: ReactNode;
  defaultBottomPanelHeight?: number;
  defaultSidePanelWidth?: number;
  defaultSidebarWidth?: number;
  mainLabel?: string;
  mainRole?: "main" | "region";
  layoutMode?: AppShellLayoutMode;
  narrowSidebarBehavior?: AppShellNarrowSidebarBehavior;
  onBottomPanelHeightChange?: (height: number) => void;
  onLayoutModeChange?: (
    mode: AppShellLayoutMode,
    previousMode: AppShellLayoutMode,
  ) => void;
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
  responsivePanelContinuity?: boolean;
  responsivePanelContinuityKey?: string | number;
  sidebar?: ReactNode;
  sidebarLabel?: string;
  sidebarMaxWidth?: number;
  sidebarMinMainWidth?: number;
  sidebarMinWidth?: number;
  sidebarOpen?: boolean;
  sidebarResizable?: boolean;
  sidebarResizeLabel?: string;
  sidebarWidth?: number;
  windowChrome?: ReactNode;
}

function clampShellTrack(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function stageResponsiveOpenExpectation(
  expectedRef: { current: boolean | null },
  requestTokenRef: { current: symbol | null },
  autoCollapsedRef: { current: boolean },
  expectedOpen: boolean,
) {
  const requestToken = Symbol("responsive-open-expectation");
  expectedRef.current = expectedOpen;
  requestTokenRef.current = requestToken;
  void Promise.resolve().then(() => {
    if (requestTokenRef.current !== requestToken) return;
    requestTokenRef.current = null;
    if (expectedRef.current === expectedOpen) {
      expectedRef.current = null;
    }
    autoCollapsedRef.current = false;
  });
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

interface BottomPanelResizeSession {
  lastHeight: number;
  originClientY: number;
  originHeight: number;
  pointerId: number;
}

export function AppShell({
  bottomPanel,
  bottomPanelHeight,
  bottomPanelLabel = "Bottom panel",
  bottomPanelMaxHeight = Number.POSITIVE_INFINITY,
  bottomPanelMinHeight = 152,
  bottomPanelOpen = Boolean(bottomPanel),
  bottomPanelResizable = false,
  bottomPanelResizeLabel = "Resize bottom panel",
  children,
  className,
  defaultBottomPanelHeight = 272,
  defaultSidePanelWidth = 370,
  defaultSidebarWidth = 274,
  layoutMode: layoutModeOverride,
  mainLabel = "Conversation",
  mainRole = "main",
  narrowSidebarBehavior = "modal",
  onBottomPanelHeightChange,
  onLayoutModeChange,
  onPointerLeave,
  onPointerMoveCapture,
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
  responsivePanelContinuity = false,
  responsivePanelContinuityKey,
  sidebar,
  sidebarLabel = "App navigation",
  sidebarMaxWidth = 520,
  sidebarMinMainWidth = 352,
  sidebarMinWidth = 240,
  sidebarOpen = false,
  sidebarResizable = false,
  sidebarResizeLabel = "Resize navigation sidebar",
  sidebarWidth,
  style,
  windowChrome,
  ...props
}: AppShellProps) {
  const bottomPanelOpenRef = useRef(bottomPanelOpen);
  bottomPanelOpenRef.current = bottomPanelOpen;
  const bottomPanelRef = useRef<HTMLElement>(null);
  const bottomPanelResizerFocusedRef = useRef(false);
  const bottomPanelResizerRef = useRef<HTMLDivElement>(null);
  const bottomPanelResizeSessionRef =
    useRef<BottomPanelResizeSession | null>(null);
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
  const [internalBottomPanelHeight, setInternalBottomPanelHeight] =
    useState(
      Number.isFinite(defaultBottomPanelHeight)
        ? defaultBottomPanelHeight
        : 272,
    );
  const [internalSidePanelWidth, setInternalSidePanelWidth] = useState(
    Number.isFinite(defaultSidePanelWidth) ? defaultSidePanelWidth : 370,
  );
  const [internalSidebarWidth, setInternalSidebarWidth] = useState(
    Number.isFinite(defaultSidebarWidth) ? defaultSidebarWidth : 274,
  );
  const [bottomPanelResizing, setBottomPanelResizing] = useState(false);
  const [sidePanelResizing, setSidePanelResizing] = useState(false);
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [sidebarPreviewOpen, setSidebarPreviewOpen] = useState(false);
  const sidebarIsVisible =
    sidebarOpen && sidebar !== undefined && sidebar !== null;
  const observedSidebarWidth = useObservedElementWidth(
    sidebarRef,
    sidebarIsVisible,
  );
  const automaticLayout = useAppShellLayoutMetrics(shellRef);
  const layoutMode = layoutModeOverride ?? automaticLayout.mode;
  const currentBuildNarrowSidebar =
    narrowSidebarBehavior === "current-build" && layoutMode === "narrow";
  const sidebarPreviewVisible =
    currentBuildNarrowSidebar &&
    !sidebarOpen &&
    sidebarPreviewOpen &&
    sidebar !== undefined &&
    sidebar !== null;
  const sidebarSurfaceVisible = sidebarOpen || sidebarPreviewVisible;
  const previousLayoutModeRef = useRef(layoutMode);
  const responsivePanelContinuityKeyRef = useRef(
    responsivePanelContinuityKey,
  );
  const sidebarAutoCollapsedRef = useRef(false);
  const sidePanelAutoCollapsedRef = useRef(false);
  const expectedResponsiveSidebarOpenRef = useRef<boolean | null>(null);
  const expectedResponsiveSidePanelOpenRef = useRef<boolean | null>(null);
  const responsiveSidebarRequestTokenRef = useRef<symbol | null>(null);
  const responsiveSidePanelRequestTokenRef = useRef<symbol | null>(null);
  const shellWidth = automaticLayout.width;
  const normalizedBottomPanelMinHeight = Math.max(
    0,
    Number.isFinite(bottomPanelMinHeight) ? bottomPanelMinHeight : 152,
  );
  const normalizedBottomPanelMaxHeight = Math.max(
    normalizedBottomPanelMinHeight,
    Number.isFinite(bottomPanelMaxHeight)
      ? bottomPanelMaxHeight
      : Number.POSITIVE_INFINITY,
  );
  const bottomPanelHeightIsControlled =
    bottomPanelHeight !== undefined && Number.isFinite(bottomPanelHeight);
  const requestedBottomPanelHeight = bottomPanelHeightIsControlled
    ? bottomPanelHeight
    : internalBottomPanelHeight;
  const unmeasuredBottomPanelMaxHeight = Number.isFinite(
    normalizedBottomPanelMaxHeight,
  )
    ? normalizedBottomPanelMaxHeight
    : Math.max(normalizedBottomPanelMinHeight, requestedBottomPanelHeight);
  const shellHeight = automaticLayout.height;
  const bottomPanelSeparatorHeight =
    shellRef.current === null
      ? 16
      : appShellRemToPixels(shellRef.current, 1);
  const responsiveBottomPanelHeightCap =
    shellHeight === null
      ? unmeasuredBottomPanelMaxHeight
      : Math.max(
          0,
          (shellHeight - bottomPanelSeparatorHeight) / 2,
        );
  const resolvedBottomPanelMinHeight = Math.min(
    normalizedBottomPanelMinHeight,
    responsiveBottomPanelHeightCap,
  );
  const resolvedBottomPanelMaxHeight = Math.max(
    resolvedBottomPanelMinHeight,
    Math.min(
      normalizedBottomPanelMaxHeight,
      responsiveBottomPanelHeightCap,
    ),
  );
  const resolvedBottomPanelHeight = clampShellTrack(
    requestedBottomPanelHeight,
    resolvedBottomPanelMinHeight,
    resolvedBottomPanelMaxHeight,
  );
  const normalizedSidebarMinWidth = Math.max(
    0,
    Number.isFinite(sidebarMinWidth) ? sidebarMinWidth : 240,
  );
  const normalizedSidebarMaxWidth = Math.max(
    normalizedSidebarMinWidth,
    Number.isFinite(sidebarMaxWidth) ? sidebarMaxWidth : 520,
  );
  const normalizedSidebarMinMainWidth = Math.max(
    0,
    Number.isFinite(sidebarMinMainWidth)
      ? sidebarMinMainWidth
      : 352,
  );
  const sidePanelHasOpenContent =
    sidePanelOpen &&
    sidePanel !== undefined &&
    sidePanel !== null;
  const normalizedSidePanelMinWidth = Math.max(
    0,
    Number.isFinite(sidePanelMinWidth) ? sidePanelMinWidth : 320,
  );
  const normalizedSidePanelMinMainWidth = Math.max(
    0,
    Number.isFinite(sidePanelMinMainWidth) ? sidePanelMinMainWidth : 352,
  );
  const coordinatedPersistentMainMinWidth = Math.max(
    normalizedSidebarMinMainWidth,
    normalizedSidePanelMinMainWidth,
  );
  const wideSidePanelMinimaFit =
    shellWidth === null ||
    shellWidth >=
      (sidebarIsVisible ? normalizedSidebarMinWidth : 0) +
        normalizedSidePanelMinWidth +
        coordinatedPersistentMainMinWidth;
  const sidePanelOverlay =
    sidePanelHasOpenContent &&
    !sidePanelExpanded &&
    (layoutMode !== "wide" || !wideSidePanelMinimaFit);
  const persistentSidePanelMinWidth =
    layoutMode === "wide" &&
    sidePanelHasOpenContent &&
    !sidePanelExpanded &&
    !sidePanelOverlay
      ? normalizedSidePanelMinWidth
      : 0;
  const responsiveSidebarMinMainWidth =
    persistentSidePanelMinWidth > 0
      ? coordinatedPersistentMainMinWidth
      : normalizedSidebarMinMainWidth;
  const responsiveSidePanelMinMainWidth =
    layoutMode === "wide" && sidebarIsVisible && !sidePanelOverlay
      ? coordinatedPersistentMainMinWidth
      : normalizedSidePanelMinMainWidth;
  const sidebarWidthIsControlled =
    sidebarWidth !== undefined && Number.isFinite(sidebarWidth);
  const requestedSidebarWidth = sidebarWidthIsControlled
    ? sidebarWidth
    : internalSidebarWidth;
  const responsiveSidebarMaxWidth =
    layoutMode === "narrow" || shellWidth === null
      ? normalizedSidebarMaxWidth
      : Math.max(
          normalizedSidebarMinWidth,
          shellWidth -
            responsiveSidebarMinMainWidth -
            persistentSidePanelMinWidth,
        );
  const resolvedSidebarMaxWidth = Math.min(
    normalizedSidebarMaxWidth,
    responsiveSidebarMaxWidth,
  );
  const resolvedSidebarWidth = clampShellTrack(
    requestedSidebarWidth,
    normalizedSidebarMinWidth,
    resolvedSidebarMaxWidth,
  );
  const normalizedSidePanelMaxWidth = Math.max(
    normalizedSidePanelMinWidth,
    Number.isFinite(sidePanelMaxWidth)
      ? sidePanelMaxWidth
      : Number.POSITIVE_INFINITY,
  );
  const sidePanelWidthIsControlled =
    sidePanelWidth !== undefined && Number.isFinite(sidePanelWidth);
  const requestedSidePanelWidth = sidePanelWidthIsControlled
    ? sidePanelWidth
    : internalSidePanelWidth;
  const unmeasuredSidePanelMaxWidth = Number.isFinite(
    normalizedSidePanelMaxWidth,
  )
    ? normalizedSidePanelMaxWidth
    : Math.max(
        normalizedSidePanelMinWidth,
        requestedSidePanelWidth,
      );
  const occupiedSidebarWidth = sidebarIsVisible
    ? (observedSidebarWidth ?? resolvedSidebarWidth)
    : 0;
  const responsiveSidePanelMaxWidth =
    shellWidth === null
      ? unmeasuredSidePanelMaxWidth
      : Math.max(
          normalizedSidePanelMinWidth,
          shellWidth -
            occupiedSidebarWidth -
            responsiveSidePanelMinMainWidth,
        );
  const resolvedSidePanelMaxWidth = Math.min(
    normalizedSidePanelMaxWidth,
    responsiveSidePanelMaxWidth,
  );
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
    bottomPanelResizable ||
    bottomPanelHeightIsControlled ||
    sidebarResizable ||
    sidebarWidthIsControlled ||
    sidePanelHasOpenContent ||
    sidePanelResizable ||
    resolvedSidePanelExpanded
      ? ({
          ...style,
          ...(bottomPanelResizable || bottomPanelHeightIsControlled
            ? {
                "--codex-ui-app-bottom-panel-height": `${resolvedBottomPanelHeight}px`,
              }
            : {}),
          ...(sidebarResizable || sidebarWidthIsControlled
            ? {
                "--codex-ui-app-sidebar-width": `${resolvedSidebarWidth}px`,
              }
            : {}),
          ...(sidePanelHasOpenContent
            ? {
                "--codex-ui-app-side-panel-width": `${resolvedSidePanelWidth}px`,
              }
            : {}),
        } as CSSProperties)
      : style;
  const sidebarModalOpen =
    sidebarOpen &&
    layoutMode === "narrow" &&
    narrowSidebarBehavior === "modal";
  const sidePanelModalOpen =
    sidePanelOpen &&
    sidePanelOverlay &&
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
    layoutMode === "wide" &&
    !sidePanelOverlay;
  const bottomPanelResizerVisible =
    bottomPanelResizable &&
    bottomPanelOpen &&
    bottomPanel !== undefined &&
    bottomPanel !== null &&
    !sidebarModalOpen;
  useLayoutEffect(() => {
    if (
      responsivePanelContinuityKeyRef.current !==
      responsivePanelContinuityKey
    ) {
      responsivePanelContinuityKeyRef.current =
        responsivePanelContinuityKey;
      sidebarAutoCollapsedRef.current = false;
      sidePanelAutoCollapsedRef.current = false;
      expectedResponsiveSidebarOpenRef.current = null;
      expectedResponsiveSidePanelOpenRef.current = null;
      responsiveSidebarRequestTokenRef.current = null;
      responsiveSidePanelRequestTokenRef.current = null;
    }
    if (!responsivePanelContinuity) {
      sidebarAutoCollapsedRef.current = false;
      sidePanelAutoCollapsedRef.current = false;
      expectedResponsiveSidebarOpenRef.current = null;
      expectedResponsiveSidePanelOpenRef.current = null;
      responsiveSidebarRequestTokenRef.current = null;
      responsiveSidePanelRequestTokenRef.current = null;
    }

    const previousMode = previousLayoutModeRef.current;
    if (previousMode === layoutMode) return;
    previousLayoutModeRef.current = layoutMode;
    onLayoutModeChange?.(layoutMode, previousMode);
    if (!responsivePanelContinuity) return;

    const enteredNarrow =
      previousMode !== "narrow" && layoutMode === "narrow";
    const leftNarrow =
      previousMode === "narrow" && layoutMode !== "narrow";
    if (enteredNarrow && sidebarOpen && onSidebarOpenChange) {
      stageResponsiveOpenExpectation(
        expectedResponsiveSidebarOpenRef,
        responsiveSidebarRequestTokenRef,
        sidebarAutoCollapsedRef,
        false,
      );
      onSidebarOpenChange(false);
    } else if (
      leftNarrow &&
      sidebarAutoCollapsedRef.current &&
      !sidebarOpen &&
      onSidebarOpenChange
    ) {
      stageResponsiveOpenExpectation(
        expectedResponsiveSidebarOpenRef,
        responsiveSidebarRequestTokenRef,
        sidebarAutoCollapsedRef,
        true,
      );
      onSidebarOpenChange(true);
    } else if (leftNarrow) {
      sidebarAutoCollapsedRef.current = false;
      expectedResponsiveSidebarOpenRef.current = null;
      responsiveSidebarRequestTokenRef.current = null;
    }

    const enteredConstrained =
      previousMode === "wide" && layoutMode !== "wide";
    const leftConstrained =
      previousMode !== "wide" && layoutMode === "wide";
    if (enteredConstrained && sidePanelOpen && onSidePanelOpenChange) {
      stageResponsiveOpenExpectation(
        expectedResponsiveSidePanelOpenRef,
        responsiveSidePanelRequestTokenRef,
        sidePanelAutoCollapsedRef,
        false,
      );
      onSidePanelOpenChange(false);
    } else if (
      leftConstrained &&
      sidePanelAutoCollapsedRef.current &&
      !sidePanelOpen &&
      onSidePanelOpenChange
    ) {
      stageResponsiveOpenExpectation(
        expectedResponsiveSidePanelOpenRef,
        responsiveSidePanelRequestTokenRef,
        sidePanelAutoCollapsedRef,
        true,
      );
      onSidePanelOpenChange(true);
    } else if (leftConstrained) {
      sidePanelAutoCollapsedRef.current = false;
      expectedResponsiveSidePanelOpenRef.current = null;
      responsiveSidePanelRequestTokenRef.current = null;
    }
  }, [
    layoutMode,
    onLayoutModeChange,
    onSidePanelOpenChange,
    onSidebarOpenChange,
    responsivePanelContinuity,
    responsivePanelContinuityKey,
    sidePanelOpen,
    sidebarOpen,
  ]);
  useLayoutEffect(() => {
    const expectedSidebarOpen = expectedResponsiveSidebarOpenRef.current;
    if (
      expectedSidebarOpen !== null &&
      sidebarOpen === expectedSidebarOpen
    ) {
      responsiveSidebarRequestTokenRef.current = null;
      expectedResponsiveSidebarOpenRef.current = null;
      sidebarAutoCollapsedRef.current = !expectedSidebarOpen;
    } else if (
      expectedSidebarOpen === null &&
      sidebarAutoCollapsedRef.current &&
      layoutMode === "narrow" &&
      sidebarOpen
    ) {
      sidebarAutoCollapsedRef.current = false;
    }

    const expectedSidePanelOpen =
      expectedResponsiveSidePanelOpenRef.current;
    if (
      expectedSidePanelOpen !== null &&
      sidePanelOpen === expectedSidePanelOpen
    ) {
      responsiveSidePanelRequestTokenRef.current = null;
      expectedResponsiveSidePanelOpenRef.current = null;
      sidePanelAutoCollapsedRef.current = !expectedSidePanelOpen;
    } else if (
      expectedSidePanelOpen === null &&
      sidePanelAutoCollapsedRef.current &&
      layoutMode !== "wide" &&
      sidePanelOpen
    ) {
      sidePanelAutoCollapsedRef.current = false;
    }
  }, [layoutMode, sidePanelOpen, sidebarOpen]);
  useLayoutEffect(() => {
    if (!currentBuildNarrowSidebar || sidebarOpen) {
      setSidebarPreviewOpen(false);
    }
  }, [currentBuildNarrowSidebar, sidebarOpen]);
  const resolveBottomPanelHeight = (nextHeight: number) => {
    const measuredLiveShellHeight =
      shellRef.current === null
        ? 0
        : appShellContentBoxHeight(shellRef.current);
    const liveShellHeight =
      measuredLiveShellHeight > 0
        ? measuredLiveShellHeight
        : shellHeight !== null && shellHeight > 0
          ? shellHeight
          : null;
    const liveBottomPanelSeparatorHeight =
      shellRef.current === null
        ? bottomPanelSeparatorHeight
        : appShellRemToPixels(shellRef.current, 1);
    const liveResponsiveHeightCap =
      liveShellHeight === null
        ? unmeasuredBottomPanelMaxHeight
        : Math.max(
            0,
            (liveShellHeight - liveBottomPanelSeparatorHeight) / 2,
          );
    const minimum = Math.min(
      normalizedBottomPanelMinHeight,
      liveResponsiveHeightCap,
    );
    const maximum = Math.max(
      minimum,
      Math.min(
        normalizedBottomPanelMaxHeight,
        liveResponsiveHeightCap,
      ),
    );
    return clampShellTrack(nextHeight, minimum, maximum);
  };
  const commitResolvedBottomPanelHeight = (normalizedHeight: number) => {
    if (!bottomPanelHeightIsControlled) {
      setInternalBottomPanelHeight(normalizedHeight);
    }
    onBottomPanelHeightChange?.(normalizedHeight);
    return normalizedHeight;
  };
  const handleBottomPanelResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    bottomPanelResizeSessionRef.current = {
      lastHeight: resolvedBottomPanelHeight,
      originClientY: event.clientY,
      originHeight: resolvedBottomPanelHeight,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setBottomPanelResizing(true);
    event.preventDefault();
  };
  const handleBottomPanelResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = bottomPanelResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const nextHeight = resolveBottomPanelHeight(
      session.originHeight + session.originClientY - event.clientY,
    );
    if (nextHeight === session.lastHeight) return;
    session.lastHeight = commitResolvedBottomPanelHeight(nextHeight);
  };
  const finishBottomPanelResize = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const session = bottomPanelResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    bottomPanelResizeSessionRef.current = null;
    setBottomPanelResizing(false);
  };
  const handleBottomPanelResizeKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    const step = event.shiftKey ? 32 : 8;
    let nextHeight: number | undefined;
    if (event.key === "Home") nextHeight = resolvedBottomPanelMinHeight;
    if (event.key === "End") nextHeight = resolvedBottomPanelMaxHeight;
    if (event.key === "ArrowUp") {
      nextHeight = resolvedBottomPanelHeight + step;
    }
    if (event.key === "ArrowDown") {
      nextHeight = resolvedBottomPanelHeight - step;
    }
    if (nextHeight === undefined) return;
    event.preventDefault();
    const resolvedNextHeight = resolveBottomPanelHeight(nextHeight);
    if (resolvedNextHeight === resolvedBottomPanelHeight) return;
    commitResolvedBottomPanelHeight(resolvedNextHeight);
  };
  useEffect(() => {
    if (bottomPanelResizerVisible) return;
    bottomPanelResizeSessionRef.current = null;
    setBottomPanelResizing(false);
  }, [bottomPanelResizerVisible]);
  const resolveSidePanelWidth = (nextWidth: number) => {
    const measuredLiveShellWidth =
      shellRef.current === null
        ? 0
        : appShellContentBoxWidth(shellRef.current);
    const liveShellWidth =
      measuredLiveShellWidth > 0
        ? measuredLiveShellWidth
        : shellWidth !== null && shellWidth > 0
          ? shellWidth
          : null;
    const liveSidebarWidth =
      sidebarOpen && sidebar !== undefined && sidebar !== null
        ? sidebarRef.current?.getBoundingClientRect().width ||
          observedSidebarWidth ||
          resolvedSidebarWidth
        : 0;
    const liveResponsiveMaximum =
      liveShellWidth === null
        ? unmeasuredSidePanelMaxWidth
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
    return clampShellTrack(
      nextWidth,
      normalizedSidePanelMinWidth,
      maximum,
    );
  };
  const commitResolvedSidePanelWidth = (normalizedWidth: number) => {
    if (!sidePanelWidthIsControlled) {
      setInternalSidePanelWidth(normalizedWidth);
    }
    onSidePanelWidthChange?.(normalizedWidth);
    return normalizedWidth;
  };
  const commitSidePanelWidth = (nextWidth: number) =>
    commitResolvedSidePanelWidth(resolveSidePanelWidth(nextWidth));
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
    const nextWidth = resolveSidePanelWidth(
      session.originWidth +
        (event.clientX - session.originClientX) * session.direction,
    );
    if (nextWidth === session.lastWidth) return;
    session.lastWidth = commitResolvedSidePanelWidth(nextWidth);
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
    const resolvedNextWidth = resolveSidePanelWidth(nextWidth);
    if (resolvedNextWidth === resolvedSidePanelWidth) return;
    commitResolvedSidePanelWidth(resolvedNextWidth);
  };
  useEffect(() => {
    if (sidePanelResizerVisible) return;
    sidePanelResizeSessionRef.current = null;
    setSidePanelResizing(false);
  }, [sidePanelResizerVisible]);
  const resolveSidebarWidth = (nextWidth: number) => {
    const measuredLiveShellWidth =
      shellRef.current === null
        ? 0
        : appShellContentBoxWidth(shellRef.current);
    const liveShellWidth =
      measuredLiveShellWidth > 0
        ? measuredLiveShellWidth
        : shellWidth !== null && shellWidth > 0
          ? shellWidth
          : null;
    const liveResponsiveMaximum =
      layoutMode === "narrow" || liveShellWidth === null
        ? normalizedSidebarMaxWidth
        : Math.max(
            normalizedSidebarMinWidth,
            liveShellWidth -
              responsiveSidebarMinMainWidth -
              persistentSidePanelMinWidth,
          );
    return clampShellTrack(
      nextWidth,
      normalizedSidebarMinWidth,
      Math.min(normalizedSidebarMaxWidth, liveResponsiveMaximum),
    );
  };
  const commitResolvedSidebarWidth = (normalizedWidth: number) => {
    if (!sidebarWidthIsControlled) {
      setInternalSidebarWidth(normalizedWidth);
    }
    onSidebarWidthChange?.(normalizedWidth);
    return normalizedWidth;
  };
  const commitSidebarWidth = (nextWidth: number) => {
    const normalizedWidth = resolveSidebarWidth(nextWidth);
    if (normalizedWidth === resolvedSidebarWidth) return normalizedWidth;
    return commitResolvedSidebarWidth(normalizedWidth);
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
    const nextWidth = resolveSidebarWidth(
      session.originWidth +
        (event.clientX - session.originClientX) * session.direction,
    );
    if (nextWidth === session.lastWidth) return;
    session.lastWidth = commitResolvedSidebarWidth(nextWidth);
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
    if (event.key === "End") nextWidth = resolvedSidebarMaxWidth;
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
  useLayoutEffect(() => {
    if (!bottomPanelResizerVisible) return;
    const resizer = bottomPanelResizerRef.current;
    return () => {
      const activeElement = document.activeElement;
      const focusNeedsRestoration =
        activeElement === resizer ||
        (bottomPanelResizerFocusedRef.current &&
          activeElement === document.body);
      if (!resizer || !focusNeedsRestoration) return;
      bottomPanelResizerFocusedRef.current = false;
      const fallbackSurface = bottomPanelOpenRef.current
        ? bottomPanelRef.current
        : mainRef.current;
      focusFirstInSurface(fallbackSurface);
    };
  }, [bottomPanelResizerVisible]);
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
    sidebarSurfaceVisible,
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
  const handleShellPointerMoveCapture = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    onPointerMoveCapture?.(event);
    if (
      event.defaultPrevented ||
      !currentBuildNarrowSidebar ||
      sidebarOpen
    ) {
      return;
    }
    const shell = shellRef.current;
    if (!shell) return;
    const bounds = shell.getBoundingClientRect();
    const direction = getComputedStyle(shell).direction;
    const inlineStartDistance =
      direction === "rtl"
        ? bounds.right - event.clientX
        : event.clientX - bounds.left;
    if (inlineStartDistance <= 12) {
      setSidebarPreviewOpen(true);
    } else if (
      sidebarPreviewOpen &&
      inlineStartDistance > resolvedSidebarWidth
    ) {
      setSidebarPreviewOpen(false);
    }
  };
  const handleShellPointerLeave = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    onPointerLeave?.(event);
    if (!event.defaultPrevented) setSidebarPreviewOpen(false);
  };

  return (
    <div
      className={["codex-ui-app-shell", className].filter(Boolean).join(" ")}
      data-bottom-panel-open={bottomPanelOpen || undefined}
      data-bottom-panel-resizable={bottomPanelResizable || undefined}
      data-bottom-panel-resizing={bottomPanelResizing || undefined}
      data-side-panel-expanded={resolvedSidePanelExpanded || undefined}
      data-side-panel-open={sidePanelOpen || undefined}
      data-side-panel-overlay={sidePanelOverlay || undefined}
      data-side-panel-resizable={sidePanelResizable || undefined}
      data-side-panel-resizing={sidePanelResizing || undefined}
      data-narrow-sidebar-behavior={narrowSidebarBehavior}
      data-sidebar-preview-open={sidebarPreviewVisible || undefined}
      data-sidebar-resizable={sidebarResizable || undefined}
      data-sidebar-resizing={sidebarResizing || undefined}
      data-sidebar-open={sidebarOpen || undefined}
      data-layout-mode={layoutMode}
      data-window-chrome={windowChrome ? true : undefined}
      onPointerLeave={handleShellPointerLeave}
      onPointerMoveCapture={handleShellPointerMoveCapture}
      ref={shellRef}
      style={shellStyle}
      {...props}
    >
      {windowChrome ? (
        <div
          className="codex-ui-app-shell__window-chrome"
          inert={inertWhen(responsiveModalOpen)}
        >
          {windowChrome}
        </div>
      ) : null}
      <div className="codex-ui-app-shell__layout">
        <aside
          aria-hidden={!sidebarSurfaceVisible}
          aria-label={sidebarLabel}
          className="codex-ui-app-shell__sidebar"
          inert={inertWhen(!sidebarSurfaceVisible)}
          ref={sidebarRef}
          tabIndex={-1}
        >
          <SurfaceBlockedContext.Provider value={!sidebarSurfaceVisible}>
            {sidebar}
          </SurfaceBlockedContext.Provider>
        </aside>
        {sidebarResizerVisible ? (
          <div
            aria-label={sidebarResizeLabel}
            aria-orientation="vertical"
            aria-valuemax={Math.round(resolvedSidebarMaxWidth)}
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
            aria-hidden={!sidebarModalOpen}
            aria-label="Close navigation sidebar"
            className="codex-ui-app-shell__backdrop"
            data-backdrop="sidebar"
            hidden={!sidebarModalOpen}
            onClick={() => onSidebarOpenChange(false)}
            ref={sidebarBackdropRef}
            tabIndex={sidebarModalOpen ? 0 : -1}
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
            tabIndex={sidePanelModalOpen ? 0 : -1}
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
        {bottomPanelResizerVisible ? (
          <div
            aria-label={bottomPanelResizeLabel}
            aria-orientation="horizontal"
            aria-valuemax={Math.round(resolvedBottomPanelMaxHeight)}
            aria-valuemin={Math.round(resolvedBottomPanelMinHeight)}
            aria-valuenow={Math.round(resolvedBottomPanelHeight)}
            aria-valuetext={`${Math.round(resolvedBottomPanelHeight)} pixels`}
            className="codex-ui-app-shell__bottom-panel-resizer"
            onBlur={(event) => {
              if (event.relatedTarget instanceof HTMLElement) {
                bottomPanelResizerFocusedRef.current = false;
              }
            }}
            onFocus={() => {
              bottomPanelResizerFocusedRef.current = true;
            }}
            onKeyDown={handleBottomPanelResizeKeyDown}
            onLostPointerCapture={finishBottomPanelResize}
            onPointerCancel={finishBottomPanelResize}
            onPointerDown={handleBottomPanelResizePointerDown}
            onPointerMove={handleBottomPanelResizePointerMove}
            onPointerUp={finishBottomPanelResize}
            ref={bottomPanelResizerRef}
            role="separator"
            tabIndex={0}
          />
        ) : null}
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
  primaryNavigation?: ReactNode;
  titlebarInset?: boolean;
}

export function AppSidebar({
  children,
  className,
  footer,
  header,
  navigationLabel = "Primary",
  primaryNavigation,
  titlebarInset = false,
  ...props
}: AppSidebarProps) {
  return (
    <div
      className={["codex-ui-app-sidebar", className].filter(Boolean).join(" ")}
      data-titlebar-inset={titlebarInset || undefined}
      {...props}
    >
      {header ? (
        <div className="codex-ui-app-sidebar__header">{header}</div>
      ) : null}
      <nav
        aria-label={navigationLabel}
        className="codex-ui-app-sidebar__navigation"
      >
        {primaryNavigation ? (
          <div className="codex-ui-app-sidebar__primary">
            {primaryNavigation}
          </div>
        ) : null}
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
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  kind?: "custom" | "pinned" | "projects" | "threads";
  onExpandedChange?: (expanded: boolean) => void;
  title?: ReactNode;
  toggleLabel?: string;
}

export function AppSidebarSection({
  actions,
  children,
  className,
  collapsible = false,
  defaultExpanded = true,
  expanded,
  kind = "custom",
  onExpandedChange,
  title,
  toggleLabel,
  ...props
}: AppSidebarSectionProps) {
  const headingId = useId();
  const titleId = useId();
  const contentId = useId();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const canCollapse = collapsible && Boolean(title);
  const isExpanded = expanded ?? internalExpanded;
  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={["codex-ui-app-sidebar__section", className]
        .filter(Boolean)
        .join(" ")}
      data-collapsible={canCollapse || undefined}
      data-expanded={canCollapse ? isExpanded : undefined}
      data-kind={kind}
      {...props}
    >
      {title || actions ? (
        <div className="codex-ui-app-sidebar__section-header">
          {title ? (
            canCollapse ? (
              <h2
                aria-labelledby={titleId}
                id={headingId}
              >
                <button
                  aria-controls={contentId}
                  aria-expanded={isExpanded}
                  aria-label={toggleLabel}
                  className="codex-ui-app-sidebar__section-toggle"
                  onClick={() => setExpanded(!isExpanded)}
                  type="button"
                >
                  <span
                    className="codex-ui-app-sidebar__section-title"
                    id={titleId}
                  >
                    {title}
                  </span>
                  <span className="codex-ui-app-sidebar__section-chevron">
                    <SidebarChevronIcon />
                  </span>
                </button>
              </h2>
            ) : (
              <h2 id={headingId}>{title}</h2>
            )
          ) : (
            <span />
          )}
          {actions}
        </div>
      ) : null}
      <div
        className="codex-ui-app-sidebar__items"
        hidden={canCollapse && !isExpanded}
        id={contentId}
      >
        {children}
      </div>
    </section>
  );
}

export type AppSidebarItemStatus =
  | "error"
  | "idle"
  | "queued"
  | "running"
  | "unread";

export interface AppSidebarItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  actions?: ReactNode;
  actionsLabel?: string;
  badge?: ReactNode;
  children: ReactNode;
  depth?: 0 | 1 | 2;
  description?: ReactNode;
  leading?: ReactNode;
  pinned?: boolean;
  selected?: boolean;
  status?: AppSidebarItemStatus;
  statusLabel?: string;
  trailing?: ReactNode;
  unread?: boolean;
}

export function AppSidebarItem({
  actions,
  actionsLabel = "Item actions",
  badge,
  children,
  className,
  depth = 0,
  description,
  leading,
  pinned = false,
  selected = false,
  status = "idle",
  statusLabel,
  trailing,
  type = "button",
  unread = false,
  ...props
}: AppSidebarItemProps) {
  const statusId = useId();
  const resolvedStatus = unread && status === "idle" ? "unread" : status;
  const item = (
    <button
      aria-current={selected ? "page" : undefined}
      aria-describedby={
        resolvedStatus !== "idle" ? statusId : undefined
      }
      className={["codex-ui-app-sidebar__item", className]
        .filter(Boolean)
        .join(" ")}
      data-depth={depth}
      data-pinned={pinned || undefined}
      data-selected={selected || undefined}
      data-status={resolvedStatus}
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

  return (
    <div
      className="codex-ui-app-sidebar__item-row"
      data-depth={depth}
      data-has-actions={Boolean(actions) || undefined}
      data-selected={selected || undefined}
      data-status={resolvedStatus}
    >
      {item}
      {resolvedStatus !== "idle" ? (
        <span
          aria-label={statusLabel ?? resolvedStatus}
          className="codex-ui-app-sidebar__item-status"
          data-status={resolvedStatus}
          id={statusId}
          role="status"
        />
      ) : null}
      {actions ? (
        <span
          aria-label={actionsLabel}
          className="codex-ui-app-sidebar__item-actions"
          role="toolbar"
        >
          {actions}
        </span>
      ) : null}
    </div>
  );
}

export interface AppSidebarFooterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  account: ReactNode;
  accountAvatar?: ReactNode;
  accountButtonProps?: Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
  >;
  actions?: ReactNode;
  status?: ReactNode;
}

export function AppSidebarFooter({
  account,
  accountAvatar,
  accountButtonProps,
  actions,
  className,
  status,
  ...props
}: AppSidebarFooterProps) {
  const {
    className: accountClassName,
    type: accountType = "button",
    ...resolvedAccountButtonProps
  } = accountButtonProps ?? {};
  return (
    <div
      className={["codex-ui-app-sidebar-footer", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <button
        className={[
          "codex-ui-app-sidebar-footer__account",
          accountClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        type={accountType}
        {...resolvedAccountButtonProps}
      >
        {accountAvatar ? (
          <span
            aria-hidden="true"
            className="codex-ui-app-sidebar-footer__avatar"
          >
            {accountAvatar}
          </span>
        ) : null}
        <span className="codex-ui-app-sidebar-footer__identity">
          <span className="codex-ui-app-sidebar-footer__account-label">
            {account}
          </span>
          {status ? (
            <span className="codex-ui-app-sidebar-footer__status">
              {status}
            </span>
          ) : null}
        </span>
      </button>
      {actions ? (
        <span
          aria-label="Sidebar footer actions"
          className="codex-ui-app-sidebar-footer__actions"
          role="toolbar"
        >
          {actions}
        </span>
      ) : null}
    </div>
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
