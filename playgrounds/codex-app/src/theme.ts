export const demoThemePreferences = ["system", "light", "dark"] as const;
export const demoThemeViews = ["shell", "workspace"] as const;

export type DemoThemePreference = (typeof demoThemePreferences)[number];
export type DemoThemeView = (typeof demoThemeViews)[number];

export function parseDemoThemePreference(
  value: string | null | undefined,
): DemoThemePreference {
  return demoThemePreferences.includes(value as DemoThemePreference)
    ? (value as DemoThemePreference)
    : "dark";
}

export function isDemoThemeView(
  value: string | null | undefined,
): value is DemoThemeView {
  return demoThemeViews.includes(value as DemoThemeView);
}

export function resolveDemoThemePreference(
  value: string | null | undefined,
  view: string | null | undefined,
): DemoThemePreference {
  return isDemoThemeView(view) ? parseDemoThemePreference(value) : "dark";
}

export function applyDemoThemePreference(
  root: HTMLElement,
  preference: DemoThemePreference,
) {
  if (preference === "system") {
    delete root.dataset.theme;
    return;
  }
  root.dataset.theme = preference;
}
