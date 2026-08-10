export interface CurrentMainCandidate {
  area: number;
  index: number;
  landmarks: {
    main: number;
    nav: number;
    sidebarTrigger: number;
    textbox: number;
  };
  url: string;
  visibleControls: number;
  [key: string]: unknown;
}

export const currentBaselineViewports: Readonly<{
  compact: Readonly<{ height: number; width: number }>;
  medium: Readonly<{ height: number; width: number }>;
  threshold: Readonly<{ height: number; width: number }>;
  wide: Readonly<{ height: number; width: number }>;
}>;

export const currentBaselineFingerprint: Readonly<{
  appAsarBytes: number;
  appAsarSha256: string;
  appVersion: string;
  buildNumber: string;
  chromiumVersion: string;
}>;

export function selectCurrentMainCandidate<T extends CurrentMainCandidate>(
  candidates: T[],
): T;

export function assertCurrentBaselineRecord(record: any): void;

export function resolveCurrentBaselineOutputPath(
  profilePath: string,
  outputPath: string,
): string;

export function writeCurrentBaselineOutput(
  profilePath: string,
  outputPath: string,
  contents: string,
): Promise<void>;

export function runBestEffortCurrentBaselineCleanup(
  steps: Array<{ name: string; run: () => Promise<void> }>,
): Promise<string[]>;
