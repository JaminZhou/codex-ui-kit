import assert from "node:assert/strict";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const scene = visualScenes.find(({ id }) => id === "pull-request-detail");
assert.ok(scene, "The pull-request detail scene is required for the live Composer gate.");

const measurements = [];
for (const width of [1180, 720]) {
  const { app, page } = await launchScene(
    scene,
    {
      capture: false,
      environment: { CODEX_UI_KIT_LIVE_EPHEMERAL: "1" },
    },
  );
  try {
    await page.getByRole("button", { name: "Live local", exact: true }).click();
    await app.evaluate(({ BrowserWindow }, nextWidth) => {
      BrowserWindow.getAllWindows()[0].setContentSize(nextWidth, 820);
    }, width);
    await page.waitForFunction((nextWidth) => innerWidth === nextWidth, width);
    const root = page.locator(".demo-root");
    const composer = page.locator(".codex-ui-composer__input");
    const trigger = page.getByRole("button", {
      name: "Add files and more",
      exact: true,
    });
    await trigger.waitFor();
    assert.equal(await root.getAttribute("data-mode"), "live");
    assert.equal(await page.getByLabel("Live workspace permissions", { exact: true }).count(), 1);

    await trigger.click();
    const picker = page.getByRole("listbox", { name: "Composer resources" });
    await picker.waitFor();
    assert.equal(await root.getAttribute("data-composer-overlay"), "resources");
    assert.equal(await picker.getByText("Add to this chat", { exact: true }).count(), 1);
    assert.equal(await picker.getByRole("option", { name: /Files and folders/ }).count(), 1);
    assert.equal(await picker.getByRole("option", { name: /Plan mode/ }).count(), 1);
    assert.equal(await picker.getByRole("option", { name: /Documents/ }).count(), 1);

    const layout = await page.evaluate(() => {
      const bounds = (element) => {
        if (!(element instanceof Element)) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          bottom: rect.bottom,
          display: style.display,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      return {
        composer: bounds(document.querySelector(".codex-ui-composer")),
        picker: bounds(document.querySelector(".codex-ui-composer-resource-picker")),
        trigger: bounds(document.querySelector('[aria-label="Add files and more"]')),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.equal(layout.overflow, 0, `${width}px live resource picker must not overflow the viewport`);
    assert.ok(layout.composer && layout.picker && layout.trigger);
    assert.ok(layout.trigger.width > 0 && layout.trigger.height > 0);
    assert.ok(layout.picker.width > 0 && layout.picker.height > 0);
    measurements.push({ layout, width });

    await picker.getByRole("option", { name: /Plan mode/ }).click();
    assert.equal(await root.getAttribute("data-live-composer-resource"), "plan");
    assert.equal(await root.getAttribute("data-composer-mode"), "plan");
    assert.equal(await root.getAttribute("data-composer-overlay"), null);
    assert.equal(await composer.getAttribute("placeholder"), "Describe your task to generate a plan...");

    await trigger.click();
    await page.getByRole("listbox", { name: "Composer resources" }).getByRole("option", { name: /Documents/ }).click();
    assert.equal(await root.getAttribute("data-live-composer-resource"), "documents");
    assert.equal(await root.getAttribute("data-composer-plugin-action"), "select:documents");
    assert.equal(await root.getAttribute("data-composer-overlay"), null);
    await composer.focus();
    assert.equal(
      await page.evaluate(() =>
        document.activeElement?.classList.contains("codex-ui-composer__input"),
      ),
      true,
    );

    await trigger.click();
    await page.getByRole("listbox", { name: "Composer resources" }).getByRole("option", { name: /Work in a project/ }).click();
    const projectDialog = page.getByRole("dialog", { name: "Choose a project" });
    await projectDialog.waitFor();
    assert.equal(await root.getAttribute("data-live-composer-project-picker"), "true");
    assert.equal(await projectDialog.getByRole("listbox", { name: "Suggestions" }).count(), 1);
    await projectDialog.getByRole("option", { name: "Select project codex-ui-kit", exact: true }).click();
    assert.equal(await root.getAttribute("data-live-composer-project-picker"), null);
    assert.equal(await root.getAttribute("data-live-composer-resource"), "project");
    assert.equal(await root.getAttribute("data-composer-plugin-action"), "select:project");
    await page.locator(".codex-ui-conversation-thread-shell .codex-ui-composer__input").waitFor();
  } finally {
    await app.close();
  }
}

console.log(
  JSON.stringify({
    measurements,
    passed: true,
    widths: [1180, 720],
  }),
);
