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

export const currentInstalledCandidateBaselineFingerprint: Readonly<{
  appAsarBytes: number;
  appAsarSha256: string;
  appVersion: string;
  buildNumber: string;
  chromiumVersion: string;
}>;

export const currentLatestInstalledCandidateBaselineFingerprint: Readonly<{
  appAsarBytes: number;
  appAsarSha256: string;
  appVersion: string;
  buildNumber: string;
  chromiumVersion: string;
}>;

export const currentObservedBuildCandidateBaselineFingerprint: Readonly<{
  appAsarBytes: number;
  appAsarSha256: string;
  appVersion: string;
  buildNumber: string;
  chromiumVersion: string;
}>;

export const currentUpdatedBuildCandidateBaselineFingerprint:
  typeof currentObservedBuildCandidateBaselineFingerprint;

export const currentObservationCandidateFingerprints: Readonly<{
  "26.930.61225": typeof currentUpdatedBuildCandidateBaselineFingerprint;
  "26.930.31730": typeof currentUpdatedBuildCandidateBaselineFingerprint;
  "26.924.22138": typeof currentObservedBuildCandidateBaselineFingerprint;
  "26.928.21956": typeof currentUpdatedBuildCandidateBaselineFingerprint;
  "26.928.31416": typeof currentUpdatedBuildCandidateBaselineFingerprint;
}>;

export const currentAccountMenuCandidateFingerprints: Readonly<{
  promoted: typeof currentBaselineFingerprint;
  "26.917.71314": typeof currentLatestInstalledCandidateBaselineFingerprint;
}>;

export const currentPreviousInstalledCandidateBaselineFingerprint: Readonly<{
  appAsarBytes: number;
  appAsarSha256: string;
  appVersion: string;
  buildNumber: string;
  chromiumVersion: string;
}>;

export function selectCurrentMainCandidate<T extends CurrentMainCandidate>(
  candidates: T[],
): T;

export function assertCurrentBaselineRecord(
  record: any,
  expectedFingerprint?: Readonly<{
    appAsarBytes: number;
    appAsarSha256: string;
    appVersion: string;
    buildNumber: string;
    chromiumVersion: string;
  }>,
): void;

export function assertCurrentBaselineObservationRecord(
  record: any,
  expectedFingerprint?: Readonly<{
    appAsarBytes: number;
    appAsarSha256: string;
    appVersion: string;
    buildNumber: string;
    chromiumVersion: string;
  }>,
): void;

export function assertCurrentAccountMenuRecord(
  record: any,
  expectedFingerprint?: any,
  options?: { candidateObservationOnly?: boolean },
): void;

export function sanitizeCurrentAccountMenuRecord(record: any): any;

export function assertCurrentSidebarRowsRecord(record: any): void;

export function assertCurrentGlobalNotificationsRecord(
  record: any,
  expectedFingerprint?: any,
): void;

export function assertCurrentAppServerCrashRecoveryRecord(record: any): void;

export function assertCurrentProjectsIndexObservation(observation: any): void;

export function assertCurrentSidebarLifecycle(lifecycle: any): void;

export function resolveCurrentBaselineOutputPath(
  profilePath: string,
  outputPath: string,
): string;

export function resolveCurrentBaselineCandidateOutputPath(
  outputPath: string,
  expectedFingerprint?: typeof currentObservedBuildCandidateBaselineFingerprint,
): string;

export function writeCurrentBaselineOutput(
  profilePath: string,
  outputPath: string,
  contents: string,
): Promise<void>;

export function writeCurrentBaselineCandidateOutput(
  profilePath: string,
  outputPath: string,
  contents: string,
  expectedFingerprint?: typeof currentObservedBuildCandidateBaselineFingerprint,
): Promise<void>;

export function runBestEffortCurrentBaselineCleanup(
  steps: Array<{ name: string; run: () => Promise<void> }>,
): Promise<string[]>;
