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
  type ReactNode,
  type RefObject,
} from "react";
import {
  acquireDocumentScrollLock,
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

  useEffect(() => {
    if (typeof document === "undefined") return;

    const wasOpen = previouslyOpenRef.current;
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!wasOpen && open) {
      returnFocusRef.current =
        activeElement && !surfaceRef.current?.contains(activeElement)
          ? activeElement
          : null;
    }

    const focusIsBeingHidden =
      activeElement &&
      (surfaceOwnsActiveElement(surfaceRef.current, activeElement) ||
        dismissRef?.current === activeElement);
    if (!open) {
      notifySurfaceBlocked(surfaceRef.current);
    }
    if (wasOpen && !open && focusIsBeingHidden) {
      const returnFocus = returnFocusRef.current;
      const canTryReturnFocus =
        returnFocus?.isConnected &&
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
    }

    previouslyOpenRef.current = open;
  }, [dismissRef, fallbackRef, open, surfaceRef]);
}

type AppShellLayoutMode = "narrow" | "medium" | "wide";

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

function useAppShellLayoutMode(
  shellRef: RefObject<HTMLDivElement | null>,
): AppShellLayoutMode {
  const [layoutMode, setLayoutMode] = useState<AppShellLayoutMode>("wide");

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
      setLayoutMode((current) => (current === nextMode ? current : nextMode));
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

  return layoutMode;
}

function focusFirstInSurface(surface: HTMLElement | null) {
  const target =
    surface?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? surface;
  target?.focus();
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

export interface AppShellProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  bottomPanel?: ReactNode;
  bottomPanelLabel?: string;
  bottomPanelOpen?: boolean;
  children: ReactNode;
  mainLabel?: string;
  mainRole?: "main" | "region";
  onSidePanelOpenChange?: (open: boolean) => void;
  onSidebarOpenChange?: (open: boolean) => void;
  sidePanel?: ReactNode;
  sidePanelLabel?: string;
  sidePanelOpen?: boolean;
  sidebar?: ReactNode;
  sidebarLabel?: string;
  sidebarOpen?: boolean;
}

export function AppShell({
  bottomPanel,
  bottomPanelLabel = "Bottom panel",
  bottomPanelOpen = Boolean(bottomPanel),
  children,
  className,
  mainLabel = "Conversation",
  mainRole = "main",
  onSidePanelOpenChange,
  onSidebarOpenChange,
  sidePanel,
  sidePanelLabel = "Workspace panel",
  sidePanelOpen = false,
  sidebar,
  sidebarLabel = "App navigation",
  sidebarOpen = false,
  ...props
}: AppShellProps) {
  const bottomPanelRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sidePanelBackdropRef = useRef<HTMLButtonElement>(null);
  const sidePanelRef = useRef<HTMLElement>(null);
  const sidebarBackdropRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const layoutMode = useAppShellLayoutMode(shellRef);
  const sidebarModalOpen =
    sidebarOpen && layoutMode === "narrow";
  const sidePanelModalOpen =
    sidePanelOpen &&
    layoutMode !== "wide" &&
    !sidebarModalOpen;
  const responsiveModalOpen =
    sidebarModalOpen || sidePanelModalOpen;
  const responsiveModalStateRef = useRef({
    sidePanelModalOpen,
    sidebarModalOpen,
  });
  responsiveModalStateRef.current = {
    sidePanelModalOpen,
    sidebarModalOpen,
  };
  const responsiveModalLockRef = useRef<ModalLockHandle | null>(
    null,
  );
  const previouslySidePanelModalOpenRef = useRef(sidePanelModalOpen);
  const previouslySidebarModalOpenRef = useRef(sidebarModalOpen);
  const mainBlocked = sidebarModalOpen || sidePanelModalOpen;
  const sidebarFocusFallbackRef = sidePanelModalOpen
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
  useSurfaceFocusRestoration(bottomPanelOpen, bottomPanelRef, mainRef);
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
        return (
          surface?.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ??
          surface
        );
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
      const target = modalLock.release();
      if (
        !focusIsOnShellBackdrop &&
        target?.isConnected &&
        !target.closest('[inert], [aria-hidden="true"]')
      ) {
        target.focus();
      }
    };
  }, [responsiveModalOpen]);
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
    if (sidebarModalOpen && !wasSidebarModalOpen) {
      notifySurfaceBlocked(mainRef.current);
      notifySurfaceBlocked(sidePanelRef.current);
      notifySurfaceBlocked(bottomPanelRef.current);
    } else if (sidePanelModalOpen && !wasSidePanelModalOpen) {
      notifySurfaceBlocked(mainRef.current);
    }

    if (
      responsiveModalIsTop &&
      sidebarModalOpen &&
      !surfaceOwnsActiveElement(sidebarRef.current, activeElement)
    ) {
      focusFirstInSurface(sidebarRef.current);
      return;
    }
    if (
      responsiveModalIsTop &&
      sidePanelModalOpen &&
      (surfaceOwnsActiveElement(mainRef.current, activeElement) ||
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
      data-side-panel-open={sidePanelOpen || undefined}
      data-sidebar-open={sidebarOpen || undefined}
      data-layout-mode={layoutMode}
      ref={shellRef}
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
  emptyState?: ReactNode;
  expanded?: boolean;
  label: string;
  onActiveTabChange: (id: string) => void;
  onClose?: () => void;
  onCloseTab?: (id: string) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onOpenTab?: () => void;
  openTabLabel?: string;
  placement?: WorkspacePanelPlacement;
  tabs: readonly WorkspacePanelTab[];
}

export function WorkspacePanel({
  activeTabId,
  className,
  emptyState = "No open tabs",
  expanded = false,
  label,
  onActiveTabChange,
  onClose,
  onCloseTab,
  onExpandedChange,
  onOpenTab,
  openTabLabel = "Open panel tab",
  placement = "side",
  style,
  tabs,
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
          aria-label={`${label} tabs`}
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
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="codex-ui-workspace-panel__actions">
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
              label={expanded ? "Restore panel" : "Expand panel"}
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
