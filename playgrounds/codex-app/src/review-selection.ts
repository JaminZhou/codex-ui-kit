import type {
  DemoFileChange,
} from "./protocol-state";

export interface ReviewSelection {
  fileChangeId: string;
  path?: string;
}

export interface ResolvedReviewSelection {
  fileChange: DemoFileChange;
  fileChangeId: string;
  selectedPath?: string;
}

export function resolveReviewSelection(
  fileChanges: readonly DemoFileChange[],
  selection: ReviewSelection | null,
): ResolvedReviewSelection | null {
  const fileChange = selection
    ? fileChanges.find(({ id }) => id === selection.fileChangeId)
    : fileChanges.at(-1);
  if (!fileChange || fileChange.changes.length === 0) return null;
  const selectedPath =
    selection?.path &&
    fileChange.changes.some(({ path }) => path === selection.path)
      ? selection.path
      : undefined;
  return {
    fileChange,
    fileChangeId: fileChange.id,
    ...(selectedPath ? { selectedPath } : {}),
  };
}
