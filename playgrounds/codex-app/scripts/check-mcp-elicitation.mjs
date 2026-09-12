import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchScene } from "./electron-harness.mjs";

// Deterministic Electron contract for the playground's MCP elicitation flow.
// This proves the replayed protocol form and renderer state transitions; it
// does not claim parity with an installed Codex build or a live MCP server.
const artifactDirectory = await mkdtemp(join(tmpdir(), "ui-kit-mcp-elicitation-"));
const scene = {
  currentSidebar: true,
  frame: "mcp-elicitation-pending",
  id: "mcp-elicitation-pending",
  scenario: "mcp-elicitation",
  sidebarState: "hidden",
  summaryState: "hidden",
  theme: "dark",
  view: "conversation",
  windowSize: { height: 820, width: 1180 },
};

const { app, page } = await launchScene(scene, { capture: false });
try {
  const form = page.getByRole("form", { name: "MCP server request" });
  await form.waitFor();
  assert.equal(await page.getByText("workspace-tools", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Choose the project details that the MCP server should use.", { exact: true }).count(), 1);
  assert.equal(await form.getByRole("button", { name: "Accept", exact: true }).isEnabled(), false);

  const select = form.locator("select").first();
  await select.selectOption("codex-ui-kit");
  await form.locator("input[type=text]").first().fill("Jamin");
  assert.equal(await form.getByRole("button", { name: "Accept", exact: true }).isEnabled(), true);

  for (const width of [1180, 720]) {
    await app.evaluate(({ BrowserWindow }, nextWidth) => {
      BrowserWindow.getAllWindows()[0].setContentSize(nextWidth, 820);
    }, width);
    await page.waitForFunction((nextWidth) => innerWidth === nextWidth, width);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      false,
      `MCP elicitation overflows at ${width}px`,
    );
    const bounds = await form.boundingBox();
    const dimensions = await form.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    assert.ok(
      bounds && bounds.width > 0 && bounds.height > 0 && dimensions.scrollHeight <= dimensions.clientHeight + 1,
      `MCP form is clipped at ${width}px`,
    );
    await page.screenshot({ path: join(artifactDirectory, `mcp-elicitation-${width}.png`) });
  }

  await form.getByRole("button", { name: "Accept", exact: true }).click();
  await form.waitFor({ state: "detached" });
  assert.equal(await page.getByText("Jamin", { exact: true }).count(), 0, "Answers must not echo into transcript history");
  console.log(JSON.stringify({ passed: true, evidence: "synthetic Electron MCP elicitation contract", artifactDirectory }));
} finally {
  await app.close();
}
