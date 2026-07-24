interface ModalLockEntry {
  containsFocus: (target: HTMLElement) => boolean;
  getInitialFocus: () => HTMLElement | null;
  lockDocumentScroll: boolean;
  priority: number;
  returnFocus: HTMLElement | null;
  token: symbol;
}

export interface ModalLockOptions {
  containsFocus?: (target: HTMLElement) => boolean;
  getInitialFocus?: () => HTMLElement | null;
  lockDocumentScroll?: boolean;
  priority?: number;
  returnFocus?: HTMLElement | null;
}

export interface ModalLockHandle {
  isTop: () => boolean;
  release: () => HTMLElement | null;
}

const activeModalLocks: ModalLockEntry[] = [];
const deferredFocusTargets: HTMLElement[] = [];
let activeDocumentScrollLocks = 0;
let overflowBeforeDocumentScrollLock = "";

function getTopModalLock() {
  return activeModalLocks.reduce<ModalLockEntry | undefined>((top, entry) => {
    if (!top || entry.priority >= top.priority) return entry;
    return top;
  }, undefined);
}

function focusTargetIsAvailable(
  target: HTMLElement | null | undefined,
): target is HTMLElement {
  return Boolean(
    target &&
    target !== document.body &&
    target.isConnected &&
    !target.closest('[inert], [aria-hidden="true"]'),
  );
}

/**
 * Acquires the package-wide modal focus-stack position and, unless opted out,
 * the document scroll lock. The handle identifies the visual top surface and
 * returns the focus target that is safe to restore: top surfaces return to
 * their connected trigger, while a lower surface closed beneath another modal
 * defers its trigger as a fallback.
 */
export function acquireDocumentScrollLock({
  containsFocus = () => false,
  getInitialFocus = () => null,
  lockDocumentScroll = true,
  priority = 0,
  returnFocus = null,
}: ModalLockOptions = {}): ModalLockHandle {
  if (typeof document === "undefined") {
    return { isTop: () => false, release: () => null };
  }

  if (lockDocumentScroll && activeDocumentScrollLocks === 0) {
    overflowBeforeDocumentScrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  if (lockDocumentScroll) activeDocumentScrollLocks += 1;
  const entry: ModalLockEntry = {
    containsFocus,
    getInitialFocus,
    lockDocumentScroll,
    priority,
    returnFocus,
    token: Symbol("modal-lock"),
  };
  activeModalLocks.push(entry);

  let released = false;
  const release = () => {
    if (released) return null;
    released = true;
    const entryIndex = activeModalLocks.findIndex(
      (candidate) => candidate.token === entry.token,
    );
    if (entryIndex === -1) return null;
    const wasTop = getTopModalLock()?.token === entry.token;
    activeModalLocks.splice(entryIndex, 1);
    if (entry.lockDocumentScroll) {
      activeDocumentScrollLocks = Math.max(
        0,
        activeDocumentScrollLocks - 1,
      );
      if (activeDocumentScrollLocks === 0) {
        document.body.style.overflow = overflowBeforeDocumentScrollLock;
      }
    }

    if (!wasTop && focusTargetIsAvailable(entry.returnFocus)) {
      deferredFocusTargets.push(entry.returnFocus);
    }

    let restoreFocus: HTMLElement | null = null;
    if (wasTop) {
      const nextTop = getTopModalLock();
      if (nextTop) {
        if (
          focusTargetIsAvailable(entry.returnFocus) &&
          nextTop.containsFocus(entry.returnFocus)
        ) {
          restoreFocus = entry.returnFocus;
        } else {
          if (focusTargetIsAvailable(entry.returnFocus)) {
            deferredFocusTargets.push(entry.returnFocus);
          }
          const nextInitialFocus = nextTop.getInitialFocus();
          restoreFocus = focusTargetIsAvailable(nextInitialFocus)
            ? nextInitialFocus
            : null;
        }
      } else {
        restoreFocus = focusTargetIsAvailable(entry.returnFocus)
          ? entry.returnFocus
          : null;
        while (!restoreFocus && deferredFocusTargets.length > 0) {
          const candidate = deferredFocusTargets.pop();
          if (focusTargetIsAvailable(candidate)) restoreFocus = candidate;
        }
      }
    }

    if (activeModalLocks.length === 0) {
      deferredFocusTargets.length = 0;
    }
    return restoreFocus;
  };
  return {
    isTop: () => !released && getTopModalLock()?.token === entry.token,
    release,
  };
}
