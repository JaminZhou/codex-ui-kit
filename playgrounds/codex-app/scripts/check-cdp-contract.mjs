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
      const thread = document.querySelector(
        ".codex-ui-conversation-thread-shell__thread",
      );
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
      const bottomPanelResizer = document.querySelector(
        '.codex-ui-app-shell__bottom-panel-resizer[role="separator"]',
      );
      if (
        !root ||
        !shell ||
        !viewport ||
        !thread ||
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
        bottomPanel:
          '.codex-ui-workspace-panel[data-placement="bottom"]',
        mcpGroup: ".codex-ui-mcp-tool-call-group",
        terminal: ".codex-ui-terminal-session",
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
      const markdownRoot = document.querySelector(
        '[data-item-id="assistant-markdown"] .codex-ui-markdown',
      );
      const markdownStyle = (element) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          marginBlockEnd: style.marginBlockEnd,
          marginBlockStart: style.marginBlockStart,
          padding: style.padding,
          rect: rect(element),
        };
      };
      const markdown = markdownRoot
        ? {
            actionCount: document.querySelectorAll(
              '[aria-label="Markdown response actions"] button',
            ).length,
            blockquote: markdownStyle(
              markdownRoot.querySelector("blockquote"),
            ),
            code: markdownStyle(
              markdownRoot.querySelector(
                ".codex-ui-code-block__body code",
              ),
            ),
            codeBlock: markdownStyle(
              markdownRoot.querySelector(".codex-ui-code-block"),
            ),
            copyLabel: markdownRoot
              .querySelector(".codex-ui-code-block__copy")
              ?.getAttribute("aria-label"),
            heading: markdownStyle(markdownRoot.querySelector("h1")),
            inlineCode: markdownStyle(
              markdownRoot.querySelector(".codex-ui-inline-code"),
            ),
            linkTarget: markdownRoot
              .querySelector('a[href^="https://example.com"]')
              ?.getAttribute("target"),
            paragraph: markdownStyle(markdownRoot.querySelector("p")),
            root: markdownStyle(markdownRoot),
            semantics: {
              blockquotes: markdownRoot.querySelectorAll("blockquote").length,
              codeBlocks: markdownRoot.querySelectorAll(
                ".codex-ui-code-block",
              ).length,
              headings: markdownRoot.querySelectorAll("h1").length,
              lists: markdownRoot.querySelectorAll("ul").length,
              paragraphs: markdownRoot.querySelectorAll("p").length,
              tables: markdownRoot.querySelectorAll("table").length,
            },
            table: markdownStyle(markdownRoot.querySelector("table")),
            tableScroll: markdownStyle(
              markdownRoot.querySelector(
                ".codex-ui-markdown__table-scroll",
              ),
            ),
            unorderedList: markdownStyle(markdownRoot.querySelector("ul")),
          }
        : null;
      const mcpGroup = document.querySelector(
        ".codex-ui-mcp-tool-call-group",
      );
      const mcp = mcpGroup
        ? {
            callLabels: Array.from(
              mcpGroup.querySelectorAll(".codex-ui-tool-call__label"),
              (element) => element.textContent?.trim(),
            ),
            groupExpanded:
              mcpGroup.querySelector(".codex-ui-activity__disclosure")
                ?.open ?? false,
            groupLabel: mcpGroup
              .querySelector(".codex-ui-mcp-tool-call-group__label")
              ?.textContent?.trim(),
            groupSource: mcpGroup.getAttribute("data-source"),
            groupStyle: markdownStyle(
              mcpGroup.querySelector(
                ":scope > .codex-ui-activity__disclosure > .codex-ui-activity__header",
              ),
            ),
            timelineExpanded:
              mcpGroup
                .closest(".codex-ui-activity-timeline")
                ?.hasAttribute("data-expanded") ?? false,
            timelineLabel: mcpGroup
              .closest(".codex-ui-activity-timeline")
              ?.querySelector(".codex-ui-activity-timeline__toggle")
              ?.textContent?.trim(),
            toolCount: mcpGroup.querySelectorAll(
              ".codex-ui-tool-call",
            ).length,
          }
        : null;
      return {
        composer: composerRect,
        frame: root.getAttribute("data-frame"),
        header: headerRect,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        mode: root.getAttribute("data-mode"),
        markdown,
        mcp,
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
          threadPaddingBottom: getComputedStyle(thread).paddingBottom,
          viewportOverflowY: getComputedStyle(viewport).overflowY,
        },
        viewportScroll: {
          clientHeight: viewport.clientHeight,
          scrollHeight: viewport.scrollHeight,
          scrollTop: viewport.scrollTop,
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
        bottomPanelResizer: bottomPanelResizer
          ? {
              ariaMax: bottomPanelResizer.getAttribute("aria-valuemax"),
              ariaMin: bottomPanelResizer.getAttribute("aria-valuemin"),
              ariaNow: bottomPanelResizer.getAttribute("aria-valuenow"),
              cursor: getComputedStyle(bottomPanelResizer).cursor,
              rect: rect(bottomPanelResizer),
            }
          : null,
        terminal: (() => {
          const panel = document.querySelector(
            '.codex-ui-workspace-panel[data-placement="bottom"]',
          );
          const panelContent = panel?.querySelector(
            ".codex-ui-workspace-panel__content",
          );
          const panelHeader = panel?.querySelector(
            ".codex-ui-workspace-panel__header",
          );
          const selectedTab = panel?.querySelector(
            '[role="tab"][aria-selected="true"]',
          );
          const tabPanel = panel?.querySelector('[role="tabpanel"]');
          const terminalInput = panel?.querySelector(
            'input[aria-label="Terminal input"]',
          );
          const transcript = panel?.querySelector(
            '[role="log"][aria-label="Terminal output"]',
          );
          return panel &&
            panelContent &&
            panelHeader &&
            selectedTab &&
            tabPanel &&
            terminalInput &&
            transcript
            ? {
                entryKinds: Array.from(
                  transcript.querySelectorAll("[data-kind]"),
                  (entry) => entry.getAttribute("data-kind"),
                ),
                inputLabel: terminalInput.getAttribute("aria-label"),
                panel: rect(panel),
                panelContent: rect(panelContent),
                panelHeader: rect(panelHeader),
                selectedTab: selectedTab.textContent?.trim(),
                tabPanelLabelledBy: tabPanel.getAttribute("aria-labelledby"),
                transcriptLive: transcript.getAttribute("aria-live"),
              }
            : null;
        })(),
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
    if (scene.surfaces?.includes("bottomPanel")) {
      const terminal = contract.terminal;
      const resizer = contract.bottomPanelResizer;
      if (
        !terminal ||
        !resizer ||
        resizer.cursor !== "row-resize" ||
        Math.abs(resizer.rect.height - 16) > 0.5 ||
        resizer.ariaMin !== "152" ||
        resizer.ariaMax !== "402" ||
        resizer.ariaNow !== "272" ||
        Math.abs(terminal.panel.width - 906) > 1 ||
        Math.abs(terminal.panel.height - 272) > 1 ||
        Math.abs(terminal.panelHeader.height - 33) > 1 ||
        Math.abs(terminal.panelContent.height - 239) > 1 ||
        Math.abs(resizer.rect.bottom - terminal.panel.top) > 1 ||
        !terminal.selectedTab?.includes("codex-ui-kit") ||
        terminal.inputLabel !== "Terminal input" ||
        terminal.transcriptLive !== "polite" ||
        !terminal.tabPanelLabelledBy ||
        !terminal.entryKinds.includes("command") ||
        !terminal.entryKinds.includes("stdout")
      ) {
        throw new Error(
          `${scene.id}: Terminal panel contract failed: ${JSON.stringify({
            resizer,
            terminal,
          })}`,
        );
      }
    } else if (contract.bottomPanelResizer) {
      throw new Error(
        `${scene.id}: hidden Terminal panel retained its resize separator.`,
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
    if (scene.toolCount !== undefined) {
      const expectedGroupLabel =
        scene.frame === "mcp-running"
          ? "Using OpenAI Developer Docs integration"
          : "Used OpenAI Developer Docs integration";
      const expectedTimelineLabel =
        scene.frame === "mcp-running" ? "Working" : "Worked for 54s";
      if (
        !contract.mcp ||
        contract.mcp.toolCount !== scene.toolCount ||
        !contract.mcp.groupExpanded ||
        !contract.mcp.timelineExpanded ||
        contract.mcp.groupSource !== "openaiDeveloperDocs" ||
        contract.mcp.groupLabel !== expectedGroupLabel ||
        contract.mcp.timelineLabel !== expectedTimelineLabel ||
        contract.mcp.groupStyle.fontSize !== "14px" ||
        contract.mcp.groupStyle.lineHeight !== "21px" ||
        contract.mcp.callLabels[0] !== "Search OpenAI docs"
      ) {
        throw new Error(
          `${scene.id}: MCP integration contract failed: ${JSON.stringify(contract.mcp)}`,
        );
      }
      if (
        scene.scrollTop !== undefined &&
        Math.abs(contract.viewportScroll.scrollTop - scene.scrollTop) > 1
      ) {
        throw new Error(
          `${scene.id}: MCP capture scroll state drifted: ${JSON.stringify(contract.viewportScroll)}`,
        );
      }
      if (
        scene.frame === "mcp-tool-calls" &&
        (!contract.mcp.callLabels.includes("Fetch OpenAI doc") ||
          contract.mcp.callLabels.filter(
            (label) => label === "Search OpenAI docs",
          ).length !== 3)
      ) {
        throw new Error(
          `${scene.id}: completed MCP call sequence is incomplete: ${JSON.stringify(contract.mcp.callLabels)}`,
        );
      }
    }

    if (scene.id === "markdown-complete") {
      const markdown = contract.markdown;
      if (
        !markdown ||
        markdown.semantics.headings !== 1 ||
        markdown.semantics.paragraphs !== 2 ||
        markdown.semantics.blockquotes !== 1 ||
        markdown.semantics.lists !== 1 ||
        markdown.semantics.tables !== 1 ||
        markdown.semantics.codeBlocks !== 1 ||
        markdown.actionCount !== 4 ||
        markdown.copyLabel !== "Copy code" ||
        markdown.linkTarget !== "_blank" ||
        Math.abs(markdown.root.rect.width - 736) > 1 ||
        Math.abs(markdown.root.rect.top - 235) > 1 ||
        Math.abs(markdown.root.rect.bottom - 592) > 1 ||
        markdown.heading.fontSize !== "24px" ||
        markdown.heading.lineHeight !== "30px" ||
        markdown.heading.marginBlockEnd !== "10px" ||
        markdown.heading.marginBlockStart !== "0px" ||
        markdown.paragraph.fontSize !== "14px" ||
        markdown.paragraph.lineHeight !== "22px" ||
        markdown.paragraph.marginBlockEnd !== "11px" ||
        markdown.blockquote.lineHeight !== "24px" ||
        markdown.blockquote.marginBlockEnd !== "8px" ||
        markdown.blockquote.padding !== "8px 0px 8px 24px" ||
        markdown.unorderedList.marginBlockEnd !== "10px" ||
        markdown.unorderedList.padding !== "0px 0px 0px 21px" ||
        Math.abs(markdown.unorderedList.rect.height - 52) > 1 ||
        Math.abs(markdown.table.rect.width - 640) > 1 ||
        Math.abs(markdown.table.rect.height - 89) > 1 ||
        Math.abs(markdown.table.rect.left - markdown.root.rect.left) > 1 ||
        Math.abs(
          markdown.tableScroll.rect.left -
            (markdown.root.rect.left - 24),
        ) > 1 ||
        markdown.inlineCode.fontSize !== "12.88px" ||
        markdown.inlineCode.lineHeight !== "22px" ||
        markdown.inlineCode.padding !== "1px 6px" ||
        markdown.inlineCode.borderRadius !== "6px" ||
        markdown.code.fontSize !== "14px" ||
        markdown.code.lineHeight !== "22px" ||
        Math.abs(markdown.codeBlock.rect.width - 736) > 1 ||
        Math.abs(markdown.codeBlock.rect.height - 72) > 1 ||
        Math.abs(markdown.codeBlock.rect.top - 520) > 1 ||
        Math.abs(markdown.codeBlock.rect.bottom - 592) > 1 ||
        markdown.codeBlock.borderRadius !== "12.5px" ||
        markdown.codeBlock.marginBlockEnd !== "0px" ||
        markdown.codeBlock.marginBlockStart !== "14px" ||
        contract.styles.threadPaddingBottom !== "198px" ||
        Math.abs(contract.viewportScroll.scrollTop - 38) > 1
      ) {
        throw new Error(
          `${scene.id}: current-build Markdown contract failed: ${JSON.stringify(markdown)}`,
        );
      }
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

const markdownStartedScene = {
  frame: "markdown-started",
  id: "markdown-started",
  scenario: "markdown",
};
const { app: markdownStartedApp, page: markdownStartedPage } =
  await launchScene(markdownStartedScene, { capture: false });
try {
  const markdownStarted = await markdownStartedPage.evaluate(() => ({
    actionCount: document.querySelectorAll(
      '[aria-label="Markdown response actions"] button',
    ).length,
    frame: document
      .querySelector(".demo-root")
      ?.getAttribute("data-frame"),
    messageStatus: document
      .querySelector('[data-item-id="assistant-markdown"]')
      ?.getAttribute("data-status"),
    rootStatus: document
      .querySelector(".demo-root")
      ?.getAttribute("data-status"),
    toolbarCount: document.querySelectorAll(
      '[aria-label="Markdown response actions"]',
    ).length,
  }));
  if (
    markdownStarted.actionCount !== 0 ||
    markdownStarted.frame !== "markdown-started" ||
    markdownStarted.messageStatus !== "running" ||
    markdownStarted.rootStatus !== "running" ||
    markdownStarted.toolbarCount !== 0
  ) {
    throw new Error(
      `markdown-started: running response actions were exposed: ${JSON.stringify(markdownStarted)}`,
    );
  }
} finally {
  await markdownStartedApp.close();
}

console.log(`CDP contracts passed for ${visualScenes.length} lifecycle frames.`);
