import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// Explicit signed-in live check: one model turn, exact temporary-file approval.
// Never grant a session-wide, command, network, or broader directory request.
const directory = await realpath(await mkdtemp(join(tmpdir(), "ui-kit-live-approval-")));
const secondProject = join(directory, "project-b");
await mkdir(secondProject);
const filename = "approval-proof.txt";
const content = "APPROVED_LOCAL_FILE\n";
const playgroundPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const clientPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.resolve("@jaminzhou/codex-app-server-client")), "utf8"));
const { app, page } = await launchScene(visualScenes.find(scene => scene.id === "pull-request-detail"), {
  capture: false,
  environment: { CODEX_UI_KIT_WORKSPACE: directory, CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "0", CODEX_DEMO_PROJECT_FIXTURE_PATH: secondProject },
});
let result = {
  passed: false, directory,
  clientDependency: playgroundPackage.dependencies["@jaminzhou/codex-app-server-client"],
  runtimeDependency: clientPackage.dependencies["@openai/codex"],
};
try {
  await page.getByRole("button", { name: "Live local", exact: true }).click();
  await page.evaluate(() => {
    window.__approvalEvidence = [];
    window.codexDemo.onNotification(event => window.__approvalEvidence.push(event));
    window.codexDemo.onServerRequest(request => window.__approvalEvidence.push(request));
  });
  const composer = page.getByRole("textbox", { name: "Message composer", exact: true });
  await composer.fill(`In this disposable workspace only, use apply_patch to create ${filename} containing exactly APPROVED_LOCAL_FILE followed by a newline. This is an approval UI test: request the necessary file-change approval, do not bypass the read-only sandbox or use shell commands to write. Do not access anything outside this workspace, use network, change settings, or delegate. After the file is created reply exactly APPROVAL_FLOW_OK.`);
  await composer.press("Enter");
  await page.waitForFunction(() => window.__approvalEvidence.some(event => event.kind === "request" || event.method === "turn/completed"), undefined, { timeout: 180000 });
  const before = await page.evaluate(() => window.__approvalEvidence);
  const request = before.find(event => event.kind === "request");
  assert.ok(request, "A real server approval request is required; completion alone is not a pass");
  assert.equal(request.method, "item/fileChange/requestApproval", "Only exact file-change approval is authorized");
  const item = before.filter(event => event.method === "item/started").map(event => event.params.item).find(item => item.id === request.params.itemId);
  assert.equal(item?.type, "fileChange");
  assert.equal(item.changes.length, 1);
  const change = item.changes[0];
  assert.equal(resolve(directory, change.path), join(directory, filename));
  assert.equal(change.kind.type, "add");
  assert.equal(change.diff, content, "Only the exact requested raw add content may be approved");
  if (request.params.grantRoot) assert.equal(await realpath(request.params.grantRoot), directory);
  await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  const approval = page.getByTestId("approval-request");
  await approval.waitFor({ state: "visible" });
  await page.screenshot({ path: join(directory, "approval-pending.png") });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await approval.waitFor({ state: "hidden" });
  const wrongStop = await page.evaluate(async () => {
    try {
      await window.codexDemo.stopLive({ threadId: "non-owning-project-thread" });
      return null;
    } catch (error) { return String(error); }
  });
  assert.match(wrongStop ?? "", /active turn belongs to another project/);
  assert.equal(await page.evaluate(() => window.__approvalEvidence.some(event => event.method === "turn/completed")), false);
  await assert.rejects(readFile(join(directory, filename)), { code: "ENOENT" });
  await page.screenshot({ path: join(directory, "project-b-no-approval.png") });
  const projectsToggle = page.getByRole("button", { name: "Toggle projects", exact: true });
  if (await projectsToggle.getAttribute("aria-expanded") === "false") await projectsToggle.click();
  const projects = page.locator(".codex-ui-app-sidebar__section").filter({ has: projectsToggle });
  await projects.getByRole("button", { name: "codex-ui-kit", exact: true }).click();
  await approval.waitFor({ state: "visible" });
  await page.screenshot({ path: join(directory, "project-a-approval-restored.png") });
  await approval.getByRole("button", { name: "Allow once", exact: true }).click();
  await page.waitForFunction(() => window.__approvalEvidence.some(event => event.method === "turn/completed"), undefined, { timeout: 180000 });
  const events = await page.evaluate(() => window.__approvalEvidence);
  assert.equal(events.filter(event => event.kind === "request").length, 1);
  assert.equal(events.find(event => event.method === "turn/completed").params.turn.status, "completed");
  assert.equal(await readFile(join(directory, filename), "utf8"), content);
  assert.ok(events.some(event => event.method === "item/completed" && event.params.item.id === item.id && event.params.item.status === "completed"));
  await page.getByText("APPROVAL_FLOW_OK", { exact: true }).waitFor();
  await page.screenshot({ path: join(directory, "approval-completed.png") });
  const group = page.getByTestId("file-change-group");
  await group.getByRole("button", { name: "Review", exact: true }).click();
  const review = page.getByTestId("review-panel");
  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value, 820), width);
    await page.waitForFunction(value => innerWidth === value, width);
    if (width === 720) {
      await review.waitFor({ state: "hidden" });
      await group.getByRole("button", { name: "Review", exact: true }).click();
    }
    const additions = review.locator('.demo-review-panel__stats [data-stat="additions"]');
    await additions.waitFor({ state: "visible" });
    assert.equal(await additions.innerText(), "+1");
    assert.deepEqual(await review.locator('.codex-ui-file-diff__line[data-line-kind="addition"] code').allTextContents(), ["APPROVED_LOCAL_FILE"]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: join(directory, `approved-review-${width}.png`) });
  }
  // Return to wide mode before opening the independently owned terminal.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1180, 820));
  await page.getByRole("button", { name: "Toggle bottom panel", exact: true }).click();
  const terminal = page.getByTestId("terminal-panel");
  const input = terminal.getByRole("textbox", { name: "Interactive terminal input", exact: true });
  await input.waitFor();
  await input.pressSequentially(`test "$(cat ${filename})" = APPROVED_LOCAL_FILE && printf 'TERMINAL_%s\\n' verified`);
  await input.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".xterm-accessibility-tree")].some(el => el.textContent.includes("TERMINAL_verified")));
  await page.screenshot({ path: join(directory, "approved-terminal-verified.png") });
  await input.pressSequentially("export PROJECT_SESSION_PROOF=retained");
  await input.press("Enter");
  await projects.getByRole("button", { name: "project-b", exact: true }).click();
  await input.waitFor();
  await input.pressSequentially(`test "$PWD" = '${directory}' && printf 'OWNER_%s\\n' "$PROJECT_SESSION_PROOF"`);
  await input.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".xterm-accessibility-tree")].some(el => el.textContent.includes("OWNER_retained")));
  await page.screenshot({ path: join(directory, "project-b-terminal-still-owned-by-a.png") });
  await projects.getByRole("button", { name: "codex-ui-kit", exact: true }).click();
  await page.getByText("APPROVAL_FLOW_OK", { exact: true }).waitFor();
  result = { ...result, passed: true, grantedOnce: true, crossProjectApprovalRestored: true, wrongThreadStopRejected: true, terminalProjectOwnershipRetained: true, reviewWidths: [1180, 720], terminalVerifiedFile: true, modelTurns: 1 };
} catch (error) {
  result.error = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: join(directory, "failed.png") }).catch(() => undefined);
} finally {
  const events = await page.evaluate(() => window.__approvalEvidence ?? []).catch(() => []);
  await writeFile(join(directory, "events.json"), JSON.stringify(events, null, 2));
  await page.evaluate(() => window.codexDemo.closeLive()).catch(() => undefined);
  await app.close();
  await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
