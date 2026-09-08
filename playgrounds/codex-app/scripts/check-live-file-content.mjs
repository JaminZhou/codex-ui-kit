import assert from "node:assert/strict";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Synthetic IPC exercises the live reducer; it does not start a model turn.
// The raw-add shape was observed in the 2026-09-08 live runtime probe.
const lines = ["@@ -0,0 +1 @@", "+literal", "-literal", "  indented", ""];
const events = [
  { method: "thread/started", params: { thread: { id: "raw-add-thread" } } },
  { method: "turn/started", params: { threadId: "raw-add-thread", turn: { id: "raw-add-turn" } } },
  {
    method: "item/completed",
    params: {
      threadId: "raw-add-thread", turnId: "raw-add-turn",
      item: { type: "fileChange", id: "raw-add", status: "completed", changes: [
        { path: "raw-example.txt", kind: { type: "add" }, diff: `${lines.join("\n")}\n` },
      ] },
    },
  },
  { method: "turn/completed", params: { threadId: "raw-add-thread", turn: { id: "raw-add-turn", status: "completed", error: null } } },
];
const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
for (const width of [1180, 720]) {
  const { app, page } = await launchScene(scene, { capture: false });
  try {
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await app.evaluate(({ BrowserWindow }, nextWidth) => {
      BrowserWindow.getAllWindows()[0].setContentSize(nextWidth, 820);
    }, width);
    await page.waitForFunction(expected => innerWidth === expected, width);
    await app.evaluate(({ BrowserWindow }, notifications) => {
      const window = BrowserWindow.getAllWindows()[0];
      for (const event of notifications) window.webContents.send("demo:notification", event);
    }, events);
    const group = page.getByTestId("file-change-group");
    // A thread notification alone cannot claim the selected project. Mirror
    // the trusted host binding sent by startLive before a real turn begins.
    assert.equal(await group.count(), 0);
    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send("demo:live:session", {
        kind: "live-bind", projectToken: "startup-workspace", threadId: "raw-add-thread",
      });
    });
    await group.waitFor();
    assert.match(await group.innerText(), /\+5/);
    await group.getByRole("button", { name: "Review", exact: true }).click();
    const panel = page.getByTestId("review-panel");
    await panel.waitFor();
    assert.equal(await panel.locator('.demo-review-panel__stats [data-stat="additions"]').innerText(), "+5");
    const rows = panel.locator('.codex-ui-file-diff__line[data-line-kind="addition"]');
    assert.equal(await rows.count(), 5);
    // FileDiff deliberately renders one space for an empty line's height.
    // Keep every nonempty line byte-for-byte, including its indentation.
    assert.deepEqual(await rows.locator("code").allTextContents(), lines.map(line => line === "" ? " " : line));
    assert.deepEqual(await rows.evaluateAll(elements => elements.map(element => element.querySelectorAll(".codex-ui-file-diff__line-number")[1].textContent)), ["1", "2", "3", "4", "5"]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width === 1180) {
      const resize = async nextWidth => {
        await app.evaluate(({ BrowserWindow }, value) => {
          BrowserWindow.getAllWindows()[0].setContentSize(value, 820);
        }, nextWidth);
        await page.waitForFunction(expected => innerWidth === expected, nextWidth);
      };
      // Preserve AppShell's intentional collapse/restore contract; hidden DOM
      // content alone must never count as a successful compact Review.
      await resize(720);
      await panel.waitFor({ state: "hidden" });
      await resize(1180);
      await panel.waitFor({ state: "visible" });
      assert.equal(await panel.locator('.demo-review-panel__stats [data-stat="additions"]').innerText(), "+5");
      await resize(720);
      await panel.waitFor({ state: "hidden" });
      await group.getByRole("button", { name: "Review", exact: true }).click();
      await panel.waitFor({ state: "visible" });
      assert.deepEqual(await rows.locator("code").allTextContents(), lines.map(line => line === "" ? " " : line));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  } finally {
    await app.close();
  }
}
console.log("Live raw-add Review IPC contracts passed at 1180 and 720px; no model turn was started.");
