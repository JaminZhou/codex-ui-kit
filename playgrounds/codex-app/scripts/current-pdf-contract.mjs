import assert from "node:assert/strict";

export async function readCurrentPdfContract(page) {
  return page.locator('[data-testid="current-pdf-preview"]').evaluate((panel) => {
    const rect = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const header = panel.querySelector("header");
    const viewport = panel.querySelector(".codex-ui-pdf-preview__viewport");
    return {
      panel: rect(panel), header: rect(header), viewport: rect(viewport),
      headerStyle: { display: getComputedStyle(header).display, fontSize: getComputedStyle(header).fontSize, fontWeight: getComputedStyle(header).fontWeight },
      zoom: Number(panel.dataset.zoom), page: Number(panel.dataset.page), pageCount: Number(panel.dataset.pageCount),
      canvases: [...panel.querySelectorAll("canvas")].map(rect),
      painted: panel.querySelectorAll('[data-painted="true"]').length,
      text: panel.querySelector(".demo-pdf-text-layer")?.textContent,
      previousDisabled: panel.querySelector('[aria-label="Previous page"]').disabled,
      nextDisabled: panel.querySelector('[aria-label="Next page"]').disabled,
      scrollTop: viewport.scrollTop, scrollHeight: viewport.scrollHeight,
      annotating: panel.querySelector('[aria-pressed="true"]')?.getAttribute("aria-label") === "Annotating",
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

export async function assertCurrentPdfContract(page, scene) {
  const state = await readCurrentPdfContract(page);
  const compact = scene.frame.endsWith("-compact");
  const expanded = scene.frame.endsWith("-expanded");
  const pageTwo = scene.frame.endsWith("-page-two");
  assert.equal(state.pageCount, 2);
  assert.equal(state.painted, 2);
  assert.equal(state.canvases.length, 2);
  assert.equal(state.page, pageTwo ? 2 : 1);
  assert.equal(state.previousDisabled, !pageTwo);
  assert.equal(state.nextDisabled, pageTwo);
  assert.equal(state.header.height, 40);
  assert.equal(state.panel.y, 46);
  assert.equal(state.viewport.y, 86);
  assert.equal(state.viewport.height, compact ? 594 : 734);
  assert.ok(Math.abs(state.panel.width - (expanded ? 1180 : compact ? 344.671875 : 590.828125)) < 1, JSON.stringify(state));
  assert.deepEqual(state.headerStyle, { display: "grid", fontSize: "13px", fontWeight: "430" });
  assert.equal(state.zoom, scene.frame.endsWith("-zoom-150") ? 150 : expanded ? 190 : compact ? 50 : 91);
  assert.equal(state.annotating, scene.frame.endsWith("-annotating"));
  assert.match(state.text, /Design specification/);
  assert.ok(state.scrollHeight > state.viewport.height);
  assert.ok(state.overflow <= 1);
  if (scene.frame.endsWith("-zoom-menu")) assert.deepEqual(await page.getByRole("menuitem").allTextContents(), ["25%", "50%", "100%", "150%", "200%", "Zoom to fit"]);
  return state;
}
