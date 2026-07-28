import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const artifactDirectory = join(process.cwd(), "artifacts", "cdp");
await mkdir(artifactDirectory, { recursive: true });

for (const scene of visualScenes) {
  const { app, page } = await launchScene(scene);
  try {
    if (scene.view === "pull-request") {
      const initial = await page.evaluate(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            right: value.right,
            top: value.top,
            width: value.width,
          };
        };
        const root = document.querySelector(".demo-root");
        const shell = document.querySelector(".codex-ui-app-shell");
        const main = document.querySelector(".codex-ui-app-shell__main");
        const panel = document.querySelector(
          ".codex-ui-app-shell__side-panel",
        );
        const resizer = document.querySelector(
          ".codex-ui-app-shell__side-panel-resizer",
        );
        const tablist = document.querySelector(
          '[role="tablist"][aria-label="Pull request view"]',
        );
        if (!root || !shell || !main || !panel || !resizer || !tablist) {
          throw new Error("Pull request integration surfaces are missing.");
        }
        return {
          actions: Array.from(
            panel.querySelectorAll("button"),
            (button) =>
              button.getAttribute("aria-label") ??
              button.textContent?.trim(),
          ),
          checkCount: panel.querySelectorAll(
            ".codex-ui-pull-request-checks li",
          ).length,
          heading:
            panel.querySelector("h1")?.textContent?.trim() ?? null,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          listItems: document.querySelectorAll(
            ".demo-pr-index .codex-ui-pull-request-list__item",
          ).length,
          main: rect(main),
          panel: rect(panel),
          resizer: {
            ariaMax: resizer.getAttribute("aria-valuemax"),
            ariaMin: resizer.getAttribute("aria-valuemin"),
            ariaNow: resizer.getAttribute("aria-valuenow"),
            cursor: getComputedStyle(resizer).cursor,
            rect: rect(resizer),
          },
          rootView: root.getAttribute("data-view"),
          selectedTab:
            tablist.querySelector('[role="tab"][aria-selected="true"]')
              ?.textContent?.trim() ?? null,
          shell: rect(shell),
          tabCount: tablist.querySelectorAll('[role="tab"]').length,
        };
      });
      if (
        initial.rootView !== "pull-request" ||
        initial.horizontalOverflow > 1 ||
        initial.listItems !== 1 ||
        initial.tabCount !== 3 ||
        initial.selectedTab !== "Summary" ||
        initial.heading !== "feat: add resizable review workspace" ||
        initial.checkCount !== 4 ||
        Math.abs(initial.main.width - 352) > 1 ||
        Math.abs(initial.panel.width - 554) > 1 ||
        initial.resizer.cursor !== "col-resize" ||
        Math.abs(initial.resizer.rect.width - 16) > 0.5 ||
        initial.resizer.ariaMin !== "320" ||
        initial.resizer.ariaMax !== "554" ||
        initial.resizer.ariaNow !== "554" ||
        !initial.actions.includes("Open in browser") ||
        !initial.actions.includes("More pull request actions") ||
        !initial.actions.includes("Expand panel")
      ) {
        throw new Error(
          `${scene.id}: pull request summary contract failed: ${JSON.stringify(initial)}`,
        );
      }

      await page.getByRole("tab", { name: "Timeline" }).click();
      if (
        (await page.getByRole("tab", { name: "Timeline" }).getAttribute(
          "aria-selected",
        )) !== "true" ||
        (await page.getByRole("textbox", { name: "Timeline comment" }).count()) !==
          1
      ) {
        throw new Error(`${scene.id}: Timeline tab did not activate.`);
      }

      await page.getByRole("tab", { name: "Code" }).click();
      if (
        (await page.getByRole("tab", { name: "Code" }).getAttribute(
          "aria-selected",
        )) !== "true" ||
        (await page
          .getByRole("list", { name: "Pull request code review" })
          .getAttribute("data-file-count")) !== "3" ||
        (await page.getByRole("button", { name: "Show file tree" }).count()) !==
          1
      ) {
        throw new Error(`${scene.id}: Code tab did not activate.`);
      }

      await page.getByRole("button", { name: "Expand panel" }).click();
      const expanded = await page.evaluate(() => {
        const shell = document.querySelector(".codex-ui-app-shell");
        const panel = document.querySelector(
          ".codex-ui-app-shell__side-panel",
        );
        const main = document.querySelector(".codex-ui-app-shell__main");
        return {
          expanded: shell?.hasAttribute("data-side-panel-expanded"),
          mainWidth: main?.getBoundingClientRect().width,
          panelWidth: panel?.getBoundingClientRect().width,
          resizer: Boolean(
            document.querySelector(
              ".codex-ui-app-shell__side-panel-resizer",
            ),
          ),
        };
      });
      if (
        !expanded.expanded ||
        expanded.resizer ||
        Math.abs((expanded.panelWidth ?? 0) - 906) > 1 ||
        Math.abs(expanded.mainWidth ?? 0) > 1
      ) {
        throw new Error(
          `${scene.id}: expanded pull request panel failed: ${JSON.stringify(expanded)}`,
        );
      }
      await page
        .getByRole("button", { name: "Restore panel width" })
        .click();
      await page.getByRole("tab", { name: "Summary" }).click();
      const restored = await page.evaluate(() => ({
        expanded: document
          .querySelector(".codex-ui-app-shell")
          ?.hasAttribute("data-side-panel-expanded"),
        panelWidth: document
          .querySelector(".codex-ui-app-shell__side-panel")
          ?.getBoundingClientRect().width,
        resizer: Boolean(
          document.querySelector(
            ".codex-ui-app-shell__side-panel-resizer",
          ),
        ),
      }));
      if (
        restored.expanded ||
        !restored.resizer ||
        Math.abs((restored.panelWidth ?? 0) - 554) > 1
      ) {
        throw new Error(
          `${scene.id}: restored pull request panel failed: ${JSON.stringify(restored)}`,
        );
      }
      await page.getByRole("button", { name: "Live local" }).click();
      await page.waitForSelector(
        '.demo-root[data-view="conversation"][data-mode="live"]',
      );
      const liveNavigation = await page.evaluate(() => {
        const button = (name) =>
          Array.from(
            document.querySelectorAll(".codex-ui-app-sidebar__item"),
          ).find((item) => item.textContent?.includes(name));
        return {
          liveSelected:
            button("Live local")?.getAttribute("aria-current") ===
            "page",
          pullRequestSelected:
            button("Pull requests")?.getAttribute("aria-current") ===
            "page",
          view: document
            .querySelector(".demo-root")
            ?.getAttribute("data-view"),
        };
      });
      if (
        liveNavigation.view !== "conversation" ||
        !liveNavigation.liveSelected ||
        liveNavigation.pullRequestSelected
      ) {
        throw new Error(
          `${scene.id}: Live local navigation did not leave the pull request view: ${JSON.stringify(liveNavigation)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(
          { expanded, initial, liveNavigation, restored },
          null,
          2,
        )}\n`,
      );
      continue;
    }

    const contract = await page.evaluate(() => {
      const root = document.querySelector(".demo-root");
      const shell = document.querySelector(".codex-ui-app-shell");
      const viewport = document.querySelector(".codex-ui-thread-viewport");
      const composer = document.querySelector(
        ".codex-ui-conversation-thread-shell__composer-dock",
      );
      const header = document.querySelector(".codex-ui-thread-header");
      const sidebarResizer = document.querySelector(
        '.codex-ui-app-shell__sidebar-resizer[role="separator"]',
      );
      const sidePanelResizer = document.querySelector(
        '.codex-ui-app-shell__side-panel-resizer[role="separator"]',
      );
      if (
        !root ||
        !shell ||
        !viewport ||
        !composer ||
        !header ||
        !sidebarResizer
      ) {
        throw new Error("Required integration surfaces are missing.");
      }
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return {
          bottom: value.bottom,
          height: value.height,
          left: value.left,
          right: value.right,
          top: value.top,
          width: value.width,
        };
      };
      const viewportRect = rect(viewport);
      const composerRect = rect(composer);
      const shellRect = rect(shell);
      const headerRect = rect(header);
      const namedSurfaceSelectors = {
        approval: ".codex-ui-approval-request",
        command: ".codex-ui-command-execution",
        fileChange: ".codex-ui-file-change-group",
        reviewPanel:
          '.codex-ui-workspace-panel[data-placement="side"]',
      };
      const namedSurfaces = Object.fromEntries(
        Object.entries(namedSurfaceSelectors).map(([name, selector]) => {
          const element = document.querySelector(selector);
          if (!element) return [name, null];
          const style = getComputedStyle(element);
          return [
            name,
            {
              rect: rect(element),
              styles: {
                display: style.display,
                fontFamily: style.fontFamily,
                overflow: style.overflow,
                position: style.position,
              },
            },
          ];
        }),
      );
      return {
        composer: composerRect,
        frame: root.getAttribute("data-frame"),
        header: headerRect,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        mode: root.getAttribute("data-mode"),
        namedSurfaces,
        review: {
          diffLabels: Array.from(
            document.querySelectorAll(
              '.codex-ui-file-review .codex-ui-file-diff[aria-label]',
            ),
            (element) => element.getAttribute("aria-label"),
          ),
          fileCount: document.querySelectorAll(
            ".codex-ui-file-review__file",
          ).length,
          firstDiffLabel: document
            .querySelector(
              '.codex-ui-file-review .codex-ui-file-diff[aria-label]',
            )
            ?.getAttribute("aria-label"),
          scroll: (() => {
            const element = document.querySelector(".codex-ui-file-review");
            return element
              ? {
                  clientHeight: element.clientHeight,
                  scrollHeight: element.scrollHeight,
                  scrollTop: element.scrollTop,
                }
              : null;
          })(),
        },
        rootStatus: root.getAttribute("data-status"),
        scenario: root.getAttribute("data-scenario"),
        shell: shellRect,
        styles: {
          composerPosition: getComputedStyle(composer).position,
          resizerCursor: getComputedStyle(sidebarResizer).cursor,
          shellDisplay: getComputedStyle(shell).display,
          viewportOverflowY: getComputedStyle(viewport).overflowY,
        },
        sidebarResizer: {
          ariaMax: sidebarResizer.getAttribute("aria-valuemax"),
          ariaMin: sidebarResizer.getAttribute("aria-valuemin"),
          ariaNow: sidebarResizer.getAttribute("aria-valuenow"),
          rect: rect(sidebarResizer),
        },
        sidePanelResizer: sidePanelResizer
          ? {
              ariaMax: sidePanelResizer.getAttribute("aria-valuemax"),
              ariaMin: sidePanelResizer.getAttribute("aria-valuemin"),
              ariaNow: sidePanelResizer.getAttribute("aria-valuenow"),
              cursor: getComputedStyle(sidePanelResizer).cursor,
              rect: rect(sidePanelResizer),
            }
          : null,
        viewport: viewportRect,
        workflow: {
          fileGroupCount: document.querySelectorAll(
            ".codex-ui-file-change-group",
          ).length,
          fileRowCount: document.querySelectorAll(
            ".codex-ui-file-change-group__file",
          ).length,
        },
      };
    });

    if (
      contract.scenario !== scene.scenario ||
      contract.frame !== scene.frame ||
      contract.mode !== "replay"
    ) {
      throw new Error(`${scene.id}: query-selected state did not render.`);
    }
    if (contract.horizontalOverflow > 1) {
      throw new Error(`${scene.id}: horizontal overflow ${contract.horizontalOverflow}px.`);
    }
    if (
      contract.header.bottom > contract.viewport.bottom ||
      contract.composer.top < contract.header.bottom ||
      contract.composer.bottom > contract.shell.bottom + 1 ||
      contract.viewport.width < 500
    ) {
      throw new Error(`${scene.id}: named surface geometry is invalid.`);
    }
    if (contract.styles.viewportOverflowY !== "auto") {
      throw new Error(`${scene.id}: conversation viewport is not scrollable.`);
    }
    if (
      contract.styles.resizerCursor !== "col-resize" ||
      Math.abs(contract.sidebarResizer.rect.width - 16) > 0.5 ||
      contract.sidebarResizer.ariaMin !== "240" ||
      contract.sidebarResizer.ariaMax !== "520" ||
      contract.sidebarResizer.ariaNow !== "274"
    ) {
      throw new Error(
        `${scene.id}: navigation resizer contract failed: ${JSON.stringify({
          resizer: contract.sidebarResizer,
          styles: contract.styles,
        })}`,
      );
    }
    for (const surfaceName of scene.surfaces ?? []) {
      const surface = contract.namedSurfaces[surfaceName];
      if (
        !surface ||
        surface.rect.width < 160 ||
        surface.rect.height < 20 ||
        surface.styles.display === "none"
      ) {
        throw new Error(
          `${scene.id}: named ${surfaceName} surface is missing or collapsed.`,
        );
      }
    }
    if (
      scene.surfaces?.includes("reviewPanel") &&
      (contract.namedSurfaces.reviewPanel.rect.right >
        contract.shell.right + 1 ||
        contract.namedSurfaces.reviewPanel.rect.left <=
          contract.header.left)
    ) {
      throw new Error(`${scene.id}: Review panel split geometry is invalid.`);
    }
    if (
      scene.surfaces?.includes("reviewPanel") &&
      (!contract.sidePanelResizer ||
        contract.sidePanelResizer.cursor !== "col-resize" ||
        Math.abs(contract.sidePanelResizer.rect.width - 16) > 0.5 ||
        contract.sidePanelResizer.ariaMin !== "320" ||
        contract.sidePanelResizer.ariaMax !== "554" ||
        contract.sidePanelResizer.ariaNow !== "370" ||
        Math.abs(
          contract.sidePanelResizer.rect.left +
            contract.sidePanelResizer.rect.width / 2 -
            contract.namedSurfaces.reviewPanel.rect.left,
        ) > 1)
    ) {
      throw new Error(
        `${scene.id}: Review resizer contract failed: ${JSON.stringify({
          panel: contract.namedSurfaces.reviewPanel,
          resizer: contract.sidePanelResizer,
        })}`,
      );
    }
    if (
      !scene.surfaces?.includes("reviewPanel") &&
      contract.sidePanelResizer
    ) {
      throw new Error(
        `${scene.id}: hidden Review panel retained its resize separator.`,
      );
    }
    if (
      scene.surfaces?.includes("reviewPanel") &&
      (contract.workflow.fileGroupCount !== 1 ||
        contract.workflow.fileRowCount !== (scene.fileCount ?? 2) ||
        contract.review.fileCount !== (scene.fileCount ?? 2) ||
        contract.review.diffLabels.length !== (scene.fileCount ?? 2))
    ) {
      throw new Error(
        `${scene.id}: multi-file aggregation contract failed: ${JSON.stringify({
          review: contract.review,
          workflow: contract.workflow,
        })}`,
      );
    }

    const expectedFocus = scene.surfaces?.includes("reviewPanel")
      ? contract.review.firstDiffLabel
      : "Message composer";
    if (!expectedFocus) {
      throw new Error(`${scene.id}: expected focus target is missing.`);
    }
    const focusTarget = scene.surfaces?.includes("reviewPanel")
      ? page.getByRole("list", { name: expectedFocus })
      : page.getByRole("textbox", { name: expectedFocus });
    await focusTarget.click();
    const focusContract = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label"),
    );
    if (focusContract !== expectedFocus) {
      throw new Error(`${scene.id}: named focus contract failed.`);
    }

    if (scene.selectPath) {
      if (
        !contract.review.scroll ||
        contract.review.scroll.scrollHeight <=
          contract.review.scroll.clientHeight
      ) {
        throw new Error(
          `${scene.id}: large Review fixture does not overflow its panel.`,
        );
      }
      await page
        .getByRole("button", { name: `Open ${scene.selectPath}` })
        .click();
      const selectedScroll = await page.evaluate((selectedPath) => {
        const review = document.querySelector(".codex-ui-file-review");
        const selected = document.querySelector(
          '.codex-ui-file-review__file[data-selected]',
        );
        if (!review || !selected) return null;
        const reviewRect = review.getBoundingClientRect();
        const selectedRect = selected.getBoundingClientRect();
        return {
          current:
            selected.getAttribute("aria-label") ===
            `Review file ${selectedPath}`,
          reviewBottom: reviewRect.bottom,
          reviewTop: reviewRect.top,
          scrollTop: review.scrollTop,
          selectedBottom: selectedRect.bottom,
          selectedTop: selectedRect.top,
        };
      }, scene.selectPath);
      if (
        !selectedScroll?.current ||
        selectedScroll.scrollTop <= 0 ||
        selectedScroll.selectedBottom > selectedScroll.reviewBottom + 1 ||
        selectedScroll.selectedTop < selectedScroll.reviewTop - 1
      ) {
        throw new Error(
          `${scene.id}: selected long diff was not revealed: ${JSON.stringify(
            selectedScroll,
          )}`,
        );
      }
    }

    await writeFile(
      join(artifactDirectory, `${scene.id}.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
  } finally {
    await app.close();
  }
}

console.log(`CDP contracts passed for ${visualScenes.length} lifecycle frames.`);
