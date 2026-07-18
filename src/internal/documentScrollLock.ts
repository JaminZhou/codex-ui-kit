let activeDocumentScrollLocks = 0;
let overflowBeforeDocumentScrollLock = "";

/**
 * Acquires the package-wide modal scroll lock and returns an idempotent release
 * callback. Modal surfaces must share this helper so closing one surface cannot
 * unlock the document while another surface remains open.
 */
export function acquireDocumentScrollLock() {
  if (typeof document === "undefined") return () => undefined;

  if (activeDocumentScrollLocks === 0) {
    overflowBeforeDocumentScrollLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  activeDocumentScrollLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeDocumentScrollLocks = Math.max(0, activeDocumentScrollLocks - 1);
    if (activeDocumentScrollLocks === 0) {
      document.body.style.overflow = overflowBeforeDocumentScrollLock;
    }
  };
}
