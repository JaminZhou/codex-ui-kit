export type DemoView =
  | "automations"
  | "conversation"
  | "projects"
  | "plugins"
  | "pull-request"
  | "shell"
  | "workspace";

export interface DemoRouteHistory {
  entries: readonly DemoView[];
  index: number;
}

export function createDemoRouteHistory(
  current: DemoView,
  previous: readonly DemoView[] = [],
): DemoRouteHistory {
  return {
    entries: [...previous, current],
    index: previous.length,
  };
}

export function currentDemoRoute(history: DemoRouteHistory): DemoView {
  return history.entries[history.index] ?? "conversation";
}

export function pushDemoRoute(
  history: DemoRouteHistory,
  next: DemoView,
): DemoRouteHistory {
  if (currentDemoRoute(history) === next) return history;
  return {
    entries: [...history.entries.slice(0, history.index + 1), next],
    index: history.index + 1,
  };
}

export function canMoveDemoRoute(
  history: DemoRouteHistory,
  delta: -1 | 1,
): boolean {
  const nextIndex = history.index + delta;
  return nextIndex >= 0 && nextIndex < history.entries.length;
}

export function moveDemoRoute(
  history: DemoRouteHistory,
  delta: -1 | 1,
): DemoRouteHistory {
  if (!canMoveDemoRoute(history, delta)) return history;
  return { ...history, index: history.index + delta };
}
