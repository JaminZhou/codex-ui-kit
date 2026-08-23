import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import currentProjectMenuAssets from "../research/current-project-menu-assets.json";

const expectedItems = [
  ["sidebar-project-menu-unpin", "unpin-project"],
  ["sidebar-project-menu-edit", "edit-project"],
  ["sidebar-project-menu-reveal", "reveal-project-folder"],
  ["sidebar-project-menu-worktree", "create-permanent-worktree"],
  ["sidebar-project-menu-archive", "archive-project-threads"],
  ["sidebar-project-menu-remove", "remove-project"],
] as const;

describe("current native project-menu assets", () => {
  it("binds the narrow manifest to the installed 26.818 package", () => {
    expect(currentProjectMenuAssets.baseline).toEqual({
      appAsarSha256:
        "8eb91bd9efbf9a4dd04b9b0afdbfcb4e0bab5da18c1919ad74ca327c00c7e791",
      appVersion: "26.818.41509",
      buildNumber: "6962",
      capturedAt: "2026-08-23",
      source: "electronBridge.showContextMenu getNativeItems",
    });
  });

  it("retains the six current native item icons in exact menu order", () => {
    expect(
      currentProjectMenuAssets.icons.map(({ id, menuItemId }) => [
        id,
        menuItemId,
      ]),
    ).toEqual(expectedItems);
    expect(
      currentProjectMenuAssets.icons.some(
        ({ id }) => id === "sidebar-project-menu-mark-read",
      ),
    ).toBe(false);
  });

  it("locks every sanitized native SVG source hash", () => {
    for (const icon of currentProjectMenuAssets.icons) {
      const sourceSha256 = createHash("sha256")
        .update(
          JSON.stringify({
            viewBox: icon.viewBox,
            rootAttributes: icon.rootAttributes,
            primitives: icon.primitives,
          }),
        )
        .digest("hex");
      expect(sourceSha256, icon.id).toBe(icon.sourceSha256);
      expect(icon.renderSize).toEqual({ height: 16, width: 16 });
      expect(icon.primitives.every(({ tag }) => tag === "path")).toBe(true);
    }
  });

  it("uses the current pencil and 20px folder shapes", () => {
    const edit = currentProjectMenuAssets.icons.find(
      ({ id }) => id === "sidebar-project-menu-edit",
    );
    const reveal = currentProjectMenuAssets.icons.find(
      ({ id }) => id === "sidebar-project-menu-reveal",
    );
    expect(edit?.viewBox).toBe("0 0 20 21");
    expect(edit?.primitives).toHaveLength(1);
    expect(reveal?.viewBox).toBe("0 0 20 20");
    expect(reveal?.primitives).toHaveLength(1);
  });
});
