export type AttachmentDialogKind = "files" | "folders" | "mixed";

export type AttachmentDialogProperty =
  | "multiSelections"
  | "openDirectory"
  | "openFile";

export function attachmentDialogModeForPlatform(
  platform: string,
): "choose" | "mixed" {
  return platform === "darwin" ? "mixed" : "choose";
}

export function attachmentDialogProperties(
  kind: AttachmentDialogKind,
): AttachmentDialogProperty[] {
  if (kind === "mixed") {
    return ["openFile", "openDirectory", "multiSelections"];
  }
  return [
    kind === "files" ? "openFile" : "openDirectory",
    "multiSelections",
  ];
}
