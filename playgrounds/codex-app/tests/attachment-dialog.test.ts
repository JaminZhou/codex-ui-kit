import { describe, expect, it } from "vitest";
import {
  attachmentDialogModeForPlatform,
  attachmentDialogProperties,
} from "../electron/attachment-dialog";

describe("Electron attachment dialog policy", () => {
  it("uses a mixed picker only on macOS", () => {
    expect(attachmentDialogModeForPlatform("darwin")).toBe("mixed");
    expect(attachmentDialogModeForPlatform("win32")).toBe("choose");
    expect(attachmentDialogModeForPlatform("linux")).toBe("choose");
  });

  it("keeps file and folder properties separate when a platform needs a choice", () => {
    expect(attachmentDialogProperties("files")).toEqual([
      "openFile",
      "multiSelections",
    ]);
    expect(attachmentDialogProperties("folders")).toEqual([
      "openDirectory",
      "multiSelections",
    ]);
    expect(attachmentDialogProperties("mixed")).toEqual([
      "openFile",
      "openDirectory",
      "multiSelections",
    ]);
  });
});
