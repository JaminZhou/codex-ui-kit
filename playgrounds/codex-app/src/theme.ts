export const demoThemePreferences = ["system", "light", "dark"] as const;

export type DemoThemePreference = (typeof demoThemePreferences)[number];

export function parseDemoThemePreference(
  value: string | null | undefined,
): DemoThemePreference {
  return demoThemePreferences.includes(value as DemoThemePreference)
    ? (value as DemoThemePreference)
    : "dark";
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
