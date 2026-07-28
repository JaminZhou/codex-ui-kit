import type { FileDiffLine } from "codex-ui-kit";
import type { DemoFileUpdateChange } from "./protocol-state";

export function diffLines(change: DemoFileUpdateChange): FileDiffLine[] {
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;
  const sourceLines = change.diff.split(/\r?\n/);

  return sourceLines.flatMap<FileDiffLine>((line, index) => {
    if (!line) return [];
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      oldLine = Number(match?.[1] ?? 0);
      newLine = Number(match?.[2] ?? 0);
      inHunk = true;
      return [{ content: line, kind: "hunk" as const }];
    }

    const previousLine = sourceLines[index - 1];
    const nextLine = sourceLines[index + 1];
    const isOldFileHeader =
      !inHunk &&
      line.startsWith("--- ") &&
      nextLine?.startsWith("+++ ");
    const isNewFileHeader =
      !inHunk &&
      line.startsWith("+++ ") &&
      previousLine?.startsWith("--- ");
    if (isOldFileHeader || isNewFileHeader || line.startsWith("\\ ")) {
      return [{ content: line, kind: "meta" as const }];
    }
    if (line.startsWith("+")) {
      const next = {
        content: line.slice(1),
        kind: "addition" as const,
        newLineNumber: newLine,
      };
      newLine += 1;
      return [next];
    }
    if (line.startsWith("-")) {
      const next = {
        content: line.slice(1),
        kind: "deletion" as const,
        oldLineNumber: oldLine,
      };
      oldLine += 1;
      return [next];
    }
    const next = {
      content: line.startsWith(" ") ? line.slice(1) : line,
      kind: "context" as const,
      newLineNumber: newLine,
      oldLineNumber: oldLine,
    };
    newLine += 1;
    oldLine += 1;
    return [next];
  });
}

export function changeStats(change: DemoFileUpdateChange) {
  const lines = diffLines(change);
  return {
    additions: lines.filter(({ kind }) => kind === "addition").length,
    deletions: lines.filter(({ kind }) => kind === "deletion").length,
    lines,
  };
}
