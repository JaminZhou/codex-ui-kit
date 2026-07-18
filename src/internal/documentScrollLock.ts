interface ModalLockEntry {
  containsFocus: (target: HTMLElement) => boolean;
  getInitialFocus: () => HTMLElement | null;
  priority: number;
  returnFocus: HTMLElement | null;
  token: symbol;
}

export interface ModalLockOptions {
  containsFocus?: (target: HTMLElement) => boolean;
  getInitialFocus?: () => HTMLElement | null;
  priority?: number;
  returnFocus?: HTMLElement | null;
}

export interface ModalLockHandle {
  isTop: () => boolean;
  release: () => HTMLElement | null;
}

const activeModalLocks: ModalLockEntry[] = [];
const deferredFocusTargets: HTMLElement[] = [];
let overflowBeforeDocumentScrollLock = "";

function getTopModalLock() {
  return activeModalLocks.reduce<ModalLockEntry | undefined>((top, entry) => {
    if (!top || entry.priority >= top.priority) return entry;
    return top;
  }, undefined);
}

/**
 * Acquires the package-wide modal scroll lock and focus-stack position. The
 * handle identifies the visual top surface and returns the focus target that is
 * safe to restore: top surfaces return to their connected trigger, while a
 * lower surface closed beneath another modal defers its trigger as a fallback.
 */
export function acquireDocumentScrollLock({
  containsFocus = () => false,
  getInitialFocus = () => null,
  priority = 0,
  returnFocus = null,
}: ModalLockOptions = {}): ModalLockHandle {
  if (typeof document === "undefined") {
    return { isTop: () => false, release: () => null };
  }

  if (activeModalLocks.length === 0) {
    overflowBeforeDocumentScrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  const entry: ModalLockEntry = {
    containsFocus,
    getInitialFocus,
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

    if (!wasTop && entry.returnFocus?.isConnected) {
      deferredFocusTargets.push(entry.returnFocus);
    }

    let restoreFocus: HTMLElement | null = null;
    if (wasTop) {
      const nextTop = getTopModalLock();
      if (nextTop) {
        if (
          entry.returnFocus?.isConnected &&
          nextTop.containsFocus(entry.returnFocus)
        ) {
          restoreFocus = entry.returnFocus;
        } else {
          if (entry.returnFocus?.isConnected) {
            deferredFocusTargets.push(entry.returnFocus);
          }
          restoreFocus = nextTop.getInitialFocus();
        }
      } else {
        restoreFocus = entry.returnFocus?.isConnected ? entry.returnFocus : null;
        while (!restoreFocus && deferredFocusTargets.length > 0) {
          const candidate = deferredFocusTargets.pop();
          if (candidate?.isConnected) restoreFocus = candidate;
        }
      }
    }

    if (activeModalLocks.length === 0) {
      document.body.style.overflow = overflowBeforeDocumentScrollLock;
      deferredFocusTargets.length = 0;
    }
    return restoreFocus;
  };
  return {
    isTop: () => !released && getTopModalLock()?.token === entry.token,
    release,
  };
}
