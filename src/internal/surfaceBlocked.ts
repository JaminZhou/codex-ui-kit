import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export const SurfaceBlockedContext = createContext(false);

export function useSurfaceBlockState() {
  const blocked = useContext(SurfaceBlockedContext);
  const [portalsBlocked, setPortalsBlocked] = useState(blocked);

  useEffect(() => {
    setPortalsBlocked(blocked);
  }, [blocked]);

  return { blocked, portalsBlocked };
}

export const surfaceBlockedEventName = "codex-ui:surface-blocked";

export function getBlockedSurface(event: Event) {
  const detail = (event as CustomEvent<unknown>).detail;
  return detail instanceof HTMLElement ? detail : null;
}

export function notifySurfaceBlocked(surface: HTMLElement | null) {
  if (!surface || typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<HTMLElement>(surfaceBlockedEventName, {
      detail: surface,
    }),
  );
}
