import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { launchScene, visualScenes } from "./electron-harness.mjs";

// This gate exercises the public Electron Git bridge against a disposable
// repository. It never writes to the workspace repository or to a remote.
const run = promisify(execFile);
const scene = visualScenes.find(({ id }) => id === "workspace-ready");
assert.ok(scene, "workspace-ready scene is present");

const widths = [1180, 720];
const results = [];

for (const width of widths) {
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-live-branch-mutation-"));
  let app;
  try {
    await run("git", ["init", "-q", "-b", "main", directory]);
    await run("git", [
      "-C",
      directory,
      "config",
      "user.email",
      "codex-ui-kit@example.invalid",
    ]);
    await run("git", [
      "-C",
      directory,
      "config",
      "user.name",
      "Codex UI Kit",
    ]);
    await writeFile(join(directory, "README.md"), "disposable branch probe\n");
    await run("git", ["-C", directory, "add", "README.md"]);
    await run("git", ["-C", directory, "commit", "-qm", "initialize probe"]);

    const launched = await launchScene(scene, {
      capture: false,
      currentSidebar: true,
      environment: {
        CODEX_UI_KIT_LIVE_WORKSPACE_WRITE: "1",
        CODEX_UI_KIT_WORKSPACE: directory,
      },
      windowSize: { height: 820, width },
    });
    app = launched.app;
    const { page } = launched;
    const branchButton = page.getByRole("button", {
      exact: true,
      name: "Switch branch",
    });
    await branchButton.waitFor();
    assert.equal(await branchButton.innerText(), "main");

    const branchName = `feat/live-branch-${width}`;
    await branchButton.click();
    await page
      .getByRole("menuitem", { name: /Create and checkout new branch/ })
      .click();
    const dialog = page.getByRole("dialog", {
      exact: true,
      name: "Create and checkout branch",
    });
    await dialog
      .getByRole("textbox", { exact: true, name: "Branch name" })
      .fill(branchName);
    await dialog
      .getByRole("button", { exact: true, name: "Create and checkout" })
      .click();
    await branchButton.getByText(branchName, { exact: true }).waitFor();

    const createdBranch = (
      await run("git", ["-C", directory, "branch", "--show-current"])
    ).stdout.trim();
    assert.equal(createdBranch, branchName);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false);

    await branchButton.click();
    await page
      .getByRole("menuitemradio")
      .filter({ hasText: "main" })
      .click();
    await branchButton.getByText("main", { exact: true }).waitFor();
    const restoredBranch = (
      await run("git", ["-C", directory, "branch", "--show-current"])
    ).stdout.trim();
    assert.equal(restoredBranch, "main");
    results.push({
      branchName,
      createdBranch,
      restoredBranch,
      width,
      zeroHorizontalOverflow: true,
    });
  } finally {
    await app?.close();
    await rm(directory, { force: true, recursive: true });
  }
}

console.log(
  JSON.stringify({
    liveElectronIpc: true,
    localOnly: true,
    passed: true,
    results,
  }),
);
