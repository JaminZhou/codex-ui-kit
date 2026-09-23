import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-pr-route-"));
for (const [width, theme] of [[1180, "dark"], [720, "dark"], [600, "dark"], [720, "light"]]) {
  const frameKey = `${width}-${theme}`;
  console.log(JSON.stringify({ checkingLiveRouteWidth: width, theme }));
  const { app, page } = await launchScene({ ...visualScenes.find(scene => scene.id === "pull-request-detail"), view: "conversation" }, { capture: false, windowSize: { width, height: 820 } });
  try {
    await app.evaluate(({ BrowserWindow, ipcMain }, width) => {
      BrowserWindow.getAllWindows()[0].setContentSize(width, 820);
      globalThis.__routeFails = true; globalThis.__routeDetailFails = false; globalThis.__routeDiffFails = false;
      globalThis.__routeReads = 0; globalThis.__routeEmpty = false;
      globalThis.__routeConversationFails = false; globalThis.__routeConversationReads = 0;
      for (const name of ["pr-preview", "pr-detail", "pr-conversation", "pr-diff"]) ipcMain.removeHandler(`demo:git:${name}`);
      ipcMain.handle("demo:git:pr-preview", () => {
        globalThis.__routeReads++;
        if (globalThis.__routeFails) throw new Error("synthetic provider unavailable");
        return { repository: "owner/live-project", branch: "feat/live-route", head: "a".repeat(40), fingerprint: "fresh", pullRequests: globalThis.__routeEmpty ? [] : [{ number: 999, title: "Real-data route fixture", url: "https://github.com/owner/live-project/pull/999", baseRefName: "main", headRefOid: "a".repeat(40) }] };
      });
      ipcMain.handle("demo:git:pr-detail", () => {
        if (globalThis.__routeDetailFails) throw new Error("synthetic detail unavailable");
        return { number: 999, title: "Real-data route fixture", url: "https://github.com/owner/live-project/pull/999", body: "<script>literal summary</script>", state: "OPEN", baseRefName: "main", baseRefOid: "b".repeat(40), headRefOid: "a".repeat(40), changedFiles: 3, files: [{ path: "src/live.ts", additions: 4, deletions: 1 }] };
      });
      ipcMain.handle("demo:git:pr-conversation", (_event, input) => {
        globalThis.__routeConversationReads++;
        if (globalThis.__routeConversationFails) throw new Error("synthetic conversation unavailable");
        if (input.number !== 999 || input.head !== "a".repeat(40)) throw new Error("conversation snapshot was not bound to the current head");
        return {
          number: 999, headRefOid: "a".repeat(40), baseRefOid: "b".repeat(40),
          comments: [{ id: "issue-1", author: "reviewer", body: "<script>literal comment</script>", createdAt: "2026-09-23T10:00:00Z", url: "https://github.com/owner/live-project/pull/999#issuecomment-1" }],
          totalComments: 51, hasMoreComments: true,
          reviews: [{ id: "review-1", author: "Codex", body: "One suggested change.", submittedAt: "2026-09-23T10:01:00Z", url: "https://github.com/owner/live-project/pull/999#pullrequestreview-1", state: "CHANGES_REQUESTED" }],
          totalReviews: 1, hasMoreReviews: false,
          reviewThreads: [{ id: "thread-1", path: "src/live.ts", line: 42, resolved: false, outdated: true, totalComments: 1, hasMoreComments: false,
            comments: [{ id: "review-comment-1", author: "Codex", body: "Keep the host boundary explicit.", createdAt: "2026-09-23T10:02:00Z", url: "https://github.com/owner/live-project/pull/999#discussion_r1", diffHunk: "@@ -1 +1 @@\n-old\n+new", line: 42 }] }],
          totalReviewThreads: 26, hasMoreReviewThreads: true,
        };
      });
      ipcMain.handle("demo:git:pr-diff", () => {
        if (globalThis.__routeDiffFails) throw new Error("synthetic diff unavailable");
        return { number: 999, head: "a".repeat(40), patch: "diff --git a/src/live.ts b/src/live.ts\n+LIVE_ROUTE_PATCH\n".repeat(30) };
      });
    }, width);
    const liveNavigation = page.getByRole("button", { name: "Live local", exact: true });
    if (!(await liveNavigation.isVisible())) await page.getByRole("button", { name: "Show sidebar", exact: true }).first().click();
    await liveNavigation.click();
    await page.locator('select[aria-label="Theme"]:visible').first().selectOption(theme);
    const prNavigation = page.getByRole("button", { name: "Pull requests", exact: true });
    if (!(await prNavigation.isVisible())) await page.getByRole("button", { name: "Show sidebar", exact: true }).first().click();
    await prNavigation.click();
    const route = page.getByRole("region", { name: "Live pull requests", exact: true });
    await route.getByText("Live pull requests unavailable", { exact: true }).waitFor();
    assert.equal(await page.locator("[data-mode]").getAttribute("data-mode"), "live");
    assert.equal(await page.getByRole("button", { name: "Open pull request 80: feat: add terminal session lifecycle", exact: true }).count(), 0);
    await app.evaluate(() => { globalThis.__routeFails = false; });
    await route.getByRole("button", { name: "Retry live PRs", exact: true }).click();
    const row = route.getByRole("button", { name: "Open live PR #999", exact: true });
    await row.waitFor();
    await route.getByLabel("Search live branch PRs", { exact: true }).fill("not found");
    await route.getByText("No loaded PRs match this search.", { exact: true }).waitFor();
    await route.getByLabel("Search live branch PRs", { exact: true }).fill("999");
    await row.click();
    const panel = page.getByRole("region", { name: "Live pull request", exact: true });
    const summary = panel.getByRole("region", { name: "Live PR summary", exact: true });
    await summary.getByText("1 of 3 changed files shown", { exact: true }).waitFor();
    assert.ok((await summary.textContent()).includes("<script>literal summary</script>"));
    assert.equal(await summary.locator("script").count(), 0);
    assert.equal(await page.getByRole("dialog").count(), 0, "Live detail must be a non-modal workspace panel");
    const bounds = await panel.boundingBox();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(horizontalOverflow <= 1, `Conversation detail must not introduce horizontal overflow: ${horizontalOverflow}px`);
    await page.screenshot({ path: join(directory, `panel-${frameKey}.png`) });
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 820, JSON.stringify({ width, bounds }));
    const listBounds = width >= 680 ? await route.boundingBox() : null;
    await page.screenshot({ path: join(directory, `layout-${frameKey}.png`) });
    if (width >= 680) assert.ok(listBounds && listBounds.x + listBounds.width <= bounds.x + 1, `Live list must not sit behind the detail panel: ${JSON.stringify({ width, listBounds, bounds })}`);
    else {
      assert.equal(await route.isVisible(), false, "Compact detail replaces the list until closed");
      assert.ok(bounds.x <= 1 && bounds.width >= width - 2, `Compact detail must fill the window: ${JSON.stringify(bounds)}`);
    }
    await page.screenshot({ path: join(directory, `summary-${frameKey}.png`) });
    const conversationTab = panel.getByRole("tab", { name: "Comments and review threads", exact: true });
    await conversationTab.click();
    const conversation = panel.getByRole("region", { name: "Live PR conversation", exact: true });
    await conversation.getByText("One suggested change.", { exact: true }).waitFor();
    assert.ok((await conversation.textContent()).includes("<script>literal comment</script>"));
    assert.equal(await conversation.locator("script").count(), 0, "GitHub content must remain plain text");
    assert.equal(await conversation.getByText("Changes requested", { exact: true }).count(), 1);
    assert.equal(await conversation.locator(".codex-ui-pull-request-review-thread[data-outdated='true']").count(), 1);
    assert.ok((await conversation.textContent()).includes("first 50 comments, 50 reviews, 25 threads, and 5 replies per thread"));
    await page.screenshot({ path: join(directory, `conversation-${frameKey}.png`) });
    await app.evaluate(() => { globalThis.__routeConversationFails = true; });
    await conversation.getByRole("button", { name: "Refresh conversation", exact: true }).click();
    await panel.getByText("PR conversation unavailable", { exact: true }).waitFor();
    assert.equal(await panel.getByText("One suggested change.", { exact: true }).count(), 0, "A failed refresh must not leave stale review content visible");
    await app.evaluate(() => { globalThis.__routeConversationFails = false; });
    await panel.getByRole("button", { name: "Retry PR conversation", exact: true }).click();
    await conversation.getByText("One suggested change.", { exact: true }).waitFor();
    const conversationReads = await app.evaluate(() => globalThis.__routeConversationReads);
    assert.ok(conversationReads >= 3, "Conversation load, refresh, and retry should all cross the host bridge");
    await panel.getByRole("tab", { name: "Code", exact: true }).click();
    await panel.getByRole("button", { name: "Read live PR diff", exact: true }).click();
    const diff = panel.getByLabel("Live PR diff", { exact: true });
    await diff.waitFor();
    assert.ok((await diff.textContent()).includes("LIVE_ROUTE_PATCH"));
    await page.screenshot({ path: join(directory, `code-${frameKey}.png`) });
    await app.evaluate(() => { globalThis.__routeDiffFails = true; });
    await panel.getByRole("button", { name: "Read live PR diff", exact: true }).click();
    await panel.getByRole("alert").waitFor(); assert.equal(await diff.count(), 0);
    await app.evaluate(() => { globalThis.__routeDiffFails = false; });
    await panel.getByRole("button", { name: "Read live PR diff", exact: true }).click(); await diff.waitFor();
    await panel.getByRole("button", { name: "Close live PR detail", exact: true }).click();
    await app.evaluate(() => { globalThis.__routeDetailFails = true; });
    await row.click(); await panel.getByText("Live PR detail unavailable", { exact: true }).waitFor();
    assert.equal(await summary.count(), 0);
    await app.evaluate(() => { globalThis.__routeDetailFails = false; });
    await panel.getByRole("button", { name: "Retry live detail", exact: true }).click(); await summary.waitFor();
    await panel.getByRole("button", { name: "Close live PR detail", exact: true }).click();
    const reads = await app.evaluate(() => globalThis.__routeReads);
    await route.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    const newChat = page.getByRole("button", { name: "New chat", exact: true });
    if (!(await newChat.isVisible())) await route.getByRole("button", { name: "Toggle sidebar", exact: true }).click();
    await newChat.click();
    const navigation = page.getByRole("button", { name: "Pull requests", exact: true });
    if (!(await navigation.isVisible())) await page.getByRole("button", { name: "Show sidebar", exact: true }).first().click();
    await navigation.click(); await route.waitFor();
    assert.equal(await route.getByLabel("Search live branch PRs", { exact: true }).inputValue(), "999");
    assert.equal(await app.evaluate(() => globalThis.__routeReads), reads, "Route restoration retains loaded state");
    await app.evaluate(() => { globalThis.__routeEmpty = true; });
    await route.getByRole("button", { name: "Refresh live PRs", exact: true }).click();
    await route.getByLabel("Search live branch PRs", { exact: true }).fill("");
    await route.getByText("No open PR for the current branch.", { exact: true }).waitFor();
    assert.equal(await page.locator("[data-mode]").getAttribute("data-mode"), "live");
  } finally { await app.close(); }
}
console.log(JSON.stringify({ passed: true, directory, widths: [1180, 720, 600], themes: ["dark", "light"], syntheticIpc: true, realGitHubWrites: 0, modePreserved: "live" }));
