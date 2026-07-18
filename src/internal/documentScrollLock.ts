interface ModalLockEntry {
  returnFocus: HTMLElement | null;
  token: symbol;
}

const activeModalLocks: ModalLockEntry[] = [];
const deferredFocusTargets: HTMLElement[] = [];
let overflowBeforeDocumentScrollLock = "";

/**
 * Acquires the package-wide modal scroll lock and focus-stack position. The
 * idempotent release callback returns the focus target that is safe to restore:
 * top surfaces return to their connected trigger, while a lower surface closed
 * beneath another modal defers its trigger as a fallback for the final surface.
 */
export function acquireDocumentScrollLock(
  returnFocus: HTMLElement | null = null,
) {
  if (typeof document === "undefined") return () => null;

  if (activeModalLocks.length === 0) {
    overflowBeforeDocumentScrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  const entry: ModalLockEntry = { returnFocus, token: Symbol("modal-lock") };
  activeModalLocks.push(entry);

  let released = false;
  return () => {
    if (released) return null;
    released = true;
    const entryIndex = activeModalLocks.findIndex(
      (candidate) => candidate.token === entry.token,
    );
    if (entryIndex === -1) return null;
    const wasTop = entryIndex === activeModalLocks.length - 1;
    activeModalLocks.splice(entryIndex, 1);

    if (!wasTop && entry.returnFocus?.isConnected) {
      deferredFocusTargets.push(entry.returnFocus);
    }

    let restoreFocus: HTMLElement | null = null;
    if (wasTop) {
      restoreFocus = entry.returnFocus?.isConnected ? entry.returnFocus : null;
      while (!restoreFocus && deferredFocusTargets.length > 0) {
        const candidate = deferredFocusTargets.pop();
        if (candidate?.isConnected) restoreFocus = candidate;
      }
    }

    if (activeModalLocks.length === 0) {
      document.body.style.overflow = overflowBeforeDocumentScrollLock;
      deferredFocusTargets.length = 0;
    }
    return restoreFocus;
  };
}
