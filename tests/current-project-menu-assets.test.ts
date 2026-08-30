import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import currentProjectMenuAssets from "../research/current-project-menu-assets.json";

const expectedItems = [
  ["sidebar-project-menu-unpin", "unpin-project"],
  ["sidebar-project-menu-edit", "edit-project"],
  ["sidebar-project-menu-section", "move-to-custom-section"],
  ["sidebar-project-menu-reveal", "reveal-project-folder"],
  ["sidebar-project-menu-worktree", "create-permanent-worktree"],
  ["sidebar-project-menu-archive", "archive-project-threads"],
  ["sidebar-project-menu-remove", "remove-project"],
] as const;

describe("current native project-menu assets", () => {
  it("binds the narrow manifest to the installed 26.825.51511 package", () => {
    expect(currentProjectMenuAssets.baseline).toEqual({
      appAsarSha256:
        "f56ac8d5254a10fc4a04e7417fa787d135c3bbca49bad7d668d4ae65833d40c7",
      appVersion: "26.825.51511",
      buildNumber: "7377",
      capturedAt: "2026-08-30",
      source: "electronBridge.showContextMenu getNativeItems",
    });
  });

  it("retains the seven current provider icons in exact menu order", () => {
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
    const section = currentProjectMenuAssets.icons.find(
      ({ id }) => id === "sidebar-project-menu-section",
    );
    expect(edit?.viewBox).toBe("0 0 20 21");
    expect(edit?.primitives).toHaveLength(1);
    expect(reveal?.viewBox).toBe("0 0 20 20");
    expect(reveal?.primitives).toHaveLength(1);
    expect(section?.viewBox).toBe("0 0 16 16");
    expect(section?.primitives).toHaveLength(6);
    expect(section?.providerDataUrlSha256).toBe(
      "a3eb21ed39b3b2483c2803b81743cd34ff4d1b53ccd134d664177490ab983a17",
    );
  });
});
