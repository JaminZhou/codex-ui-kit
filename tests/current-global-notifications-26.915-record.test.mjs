import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertCurrentGlobalNotificationsRecord } from "../scripts/current-baseline-contract.mjs";

const record = JSON.parse(
  readFileSync(
    new URL("../research/current-global-notifications-26.915.json", import.meta.url),
    "utf8",
  ),
);

describe("current 26.915 global notifications record", () => {
  it("proves the candidate fingerprint and reversible four-task stack", () => {
    expect(() => assertCurrentGlobalNotificationsRecord(record, {
      appAsarBytes: 358_872_526,
      appAsarSha256:
        "1f7939c1c781887c167043c4d1d307af3400d324685cfc315dfe2f80e634f483",
      appVersion: "26.915.31945",
      buildNumber: "9922",
      chromiumVersion: "153.0.8010.48",
    })).not.toThrow();
    expect(record.privacyBoundary).toBe(
      "four-disposable-task-title-hashes-and-notification-geometry-only",
    );
    expect(record.taskTitleSha256s).toHaveLength(4);
    expect(record.collapsed.map(({ visible }) => visible)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(record.collapsed[0].alert.style.fontWeight).toBe("430");
    expect(record.collapsed[0].iconSha256s).toEqual([
      "135db8ed90b65550342412e86491c886b36f0f6a8207188c6dcbb001dcd5f75e",
      "a400a90642de08b4c1d5ffa68d916fdf5706a832594e694f29bc60f3b2230546",
    ]);
  });
});
