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

export function selectCurrentMainCandidate<T extends CurrentMainCandidate>(
  candidates: T[],
): T;

export function assertCurrentBaselineRecord(record: any): void;
