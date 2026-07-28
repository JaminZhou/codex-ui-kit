import type {
  DemoFileChange,
  DemoFileUpdateChange,
} from "./protocol-state";

export interface ReviewSelection {
  fileChangeId: string;
  path: string;
}

export interface ResolvedReviewSelection {
  change: DemoFileUpdateChange;
  fileChangeId: string;
}

export function resolveReviewSelection(
  fileChanges: readonly DemoFileChange[],
  selection: ReviewSelection | null,
): ResolvedReviewSelection | null {
  const fileChange = selection
    ? fileChanges.find(({ id }) => id === selection.fileChangeId)
    : fileChanges.at(-1);
  const change = selection
    ? fileChange?.changes.find(({ path }) => path === selection.path)
    : fileChange?.changes.at(0);
  return fileChange && change
    ? { change, fileChangeId: fileChange.id }
    : null;
}
