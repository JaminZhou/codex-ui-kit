export const themeSources = ["system", "light", "dark"] as const;

export type ThemeSource = (typeof themeSources)[number];
export type ResolvedTheme = Exclude<ThemeSource, "system">;

export interface ThemeState {
  resolved: ResolvedTheme;
  source: ThemeSource;
}

export const windowPresets = {
  compact: { height: 680, label: "Compact", width: 820 },
  standard: { height: 820, label: "Standard", width: 1180 },
  wide: { height: 960, label: "Wide", width: 1440 },
} as const;

export type WindowPreset = keyof typeof windowPresets;

export interface AppliedWindowSize {
  height: number;
  preset: WindowPreset;
  width: number;
}

export interface DesktopEnvironment {
  arch: string;
  chromium: string;
  electron: string;
  platform: string;
  theme: ThemeState;
}

export interface DesktopPlaygroundApi {
  getEnvironment(): Promise<DesktopEnvironment>;
  onThemeChanged(listener: (theme: ThemeState) => void): () => void;
  setThemeSource(source: ThemeSource): Promise<ThemeState>;
  setWindowPreset(preset: WindowPreset): Promise<AppliedWindowSize>;
}

export function isThemeSource(value: unknown): value is ThemeSource {
  return themeSources.includes(value as ThemeSource);
}

export function isWindowPreset(value: unknown): value is WindowPreset {
  return Object.hasOwn(windowPresets, value as PropertyKey);
}
