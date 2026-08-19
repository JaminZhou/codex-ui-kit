import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

process.env.CODEX_DEMO_ATTACHMENT_RENDERER_FIXTURE = "1";

const artifactDirectory = join(process.cwd(), "artifacts", "cdp");
await mkdir(artifactDirectory, { recursive: true });
const requestedScenesArgument = process.argv.find((argument) =>
  argument.startsWith("--scenes="),
);
const requestedSceneIds = requestedScenesArgument
  ? new Set(
      requestedScenesArgument
        .slice("--scenes=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  : null;
const selectedScenes = requestedSceneIds
  ? visualScenes.filter(({ id }) => requestedSceneIds.has(id))
  : visualScenes;
if (requestedSceneIds && selectedScenes.length !== requestedSceneIds.size) {
  const knownIds = new Set(visualScenes.map(({ id }) => id));
  const unknownIds = [...requestedSceneIds].filter((id) => !knownIds.has(id));
  throw new Error(`Unknown CDP scenes: ${unknownIds.join(", ")}`);
}
const currentReplayComposerScenarios = new Set([
  "attachment-lifecycle",
  "approval-review-timeout",
  "command-failure-recovery",
  "compaction",
  "context-summary",
  "current-mixed-tool-thread",
  "current-review-files",
  "current-review-rename",
  "interruption",
  "long-command-output",
  "mcp-current-integration-recovery",
  "mcp-current-recovery",
  "mcp-current-success",
  "mcp-recovery-mixed-thread",
  "mcp-tool-call",
  "subagent-concurrency",
  "subagent-delegation",
  "subagent-nested",
  "subagent-recovery",
]);
const currentApprovalComposerScenes = new Set([
  "approval-current-allow-once-completed",
  "approval-current-denied",
  "approval-current-similar-repeated-completed",
  "approval-current-session-repeated-completed",
]);
const currentReplayComposerContracts = [];

for (const scene of selectedScenes) {
  const { app, page } = await launchScene(scene);
  try {
    if (scene.id === "thread-windowed") {
      await page.waitForFunction(() => {
        const viewport = document.querySelector(
          ".codex-ui-conversation-thread-shell__viewport",
        );
        return viewport instanceof HTMLElement && viewport.scrollTop < -10_000;
      });
    }
    if (scene.id === "current-light-shell") {
      const lightShell = await page.evaluate(() => {
        const metric = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) return null;
          const value = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            height: value.height,
            width: value.width,
          };
        };
        const iconPaint = (icon) => ({
          color: getComputedStyle(icon).color,
          name: icon.getAttribute("data-current-build-icon"),
          paints: Array.from(
            icon.querySelectorAll(
              "path, circle, ellipse, line, polyline, polygon, rect",
            ),
            (primitive) => ({
              fill: getComputedStyle(primitive).fill,
              stroke: getComputedStyle(primitive).stroke,
            }),
          ).filter(({ fill, stroke }) => fill !== "none" || stroke !== "none"),
        });
        return {
          allIcons: Array.from(
            document.querySelectorAll("[data-current-build-icon]"),
            iconPaint,
          ),
          colorScheme: getComputedStyle(document.documentElement).colorScheme,
          composer: metric(".codex-ui-composer"),
          composerIcons: Array.from(
            document.querySelectorAll(
              ".codex-ui-composer [data-current-build-icon]",
            ),
            iconPaint,
          ),
          contextIcons: Array.from(
            document.querySelectorAll(
              ".codex-ui-conversation-context-bar [data-current-build-icon]",
            ),
            iconPaint,
          ),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          htmlTheme: document.documentElement.dataset.theme,
          main: metric(".codex-ui-app-shell__main"),
          rootTheme: document
            .querySelector(".demo-root")
            ?.getAttribute("data-theme"),
          sidebar: metric(".codex-ui-app-shell__sidebar"),
          workspace: metric(".demo-workspace-route"),
        };
      });
      const expectedContextIcons = [
        "composer-project",
        "workspace-run-location-local",
        "composer-branch",
      ];
      const expectedComposerIcons = [
        "composer-add-files",
        "composer-permission",
        "composer-model-chevron",
        "composer-dictate",
        "composer-voice",
      ];
      const visiblePaints = lightShell.allIcons.flatMap(({ name, paints }) =>
        paints.map((paint) => ({ name, ...paint })),
      );
      if (
        lightShell.colorScheme !== "light" ||
        lightShell.htmlTheme !== "light" ||
        lightShell.rootTheme !== "light" ||
        lightShell.horizontalOverflow > 1 ||
        lightShell.main?.backgroundColor !== "rgb(255, 255, 255)" ||
        lightShell.workspace?.backgroundColor !== "rgb(255, 255, 255)" ||
        lightShell.main?.width !== 906 ||
        lightShell.workspace?.height !== 774 ||
        lightShell.sidebar?.width !== 274 ||
        lightShell.sidebar?.height !== 820 ||
        lightShell.composer?.width !== 736 ||
        lightShell.composer?.height !== 98 ||
        lightShell.composer?.color !== "rgb(26, 28, 31)" ||
        lightShell.allIcons.length < 18 ||
        JSON.stringify(lightShell.contextIcons.map(({ name }) => name)) !==
          JSON.stringify(expectedContextIcons) ||
        JSON.stringify(lightShell.composerIcons.map(({ name }) => name)) !==
          JSON.stringify(expectedComposerIcons) ||
        visiblePaints.some(
          ({ fill, name, stroke }) =>
            name !== "composer-voice" &&
            (fill === "rgb(255, 255, 255)" ||
              stroke === "rgb(255, 255, 255)" ||
              fill.startsWith("oklab(0.999") ||
              stroke.startsWith("oklab(0.999")),
        )
      ) {
        throw new Error(
          `Current light shell contract failed: ${JSON.stringify(lightShell)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, "current-light-shell.json"),
        `${JSON.stringify(lightShell, null, 2)}\n`,
      );
    }
    if (scene.id.startsWith("workspace-git-settings")) {
      const settings = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        return {
          branchPrefix: rect('.codex-ui-git-settings input[aria-label="Branch prefix"]'),
          card: rect(".codex-ui-git-settings__card"),
          heading: rect(".codex-ui-git-settings > h1"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          iconNames: Array.from(
            document.querySelectorAll(
              ".codex-ui-settings-shell__navigation [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          mainCount: document.querySelectorAll('main, [role="main"]').length,
          outerRegionCount: document.querySelectorAll(
            '[role="region"][aria-label="Settings route"]',
          ).length,
          navigation: rect(".codex-ui-settings-shell__navigation"),
          navigationCount: document.querySelectorAll(
            'nav[aria-label="Settings"]',
          ).length,
          searchbox: rect('[role="searchbox"]'),
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
          switchStates: Array.from(
            document.querySelectorAll('[role="switch"]'),
            (control) => ({
              label: control.getAttribute("aria-label"),
              value: control.getAttribute("aria-checked"),
            }),
          ),
          textareaCount: document.querySelectorAll(
            ".codex-ui-git-settings textarea",
          ).length,
          theme: document
            .querySelector(".demo-root")
            ?.getAttribute("data-theme"),
          visualStyles: Object.fromEntries(
            [
              ["shell", ".codex-ui-settings-shell"],
              ["navigation", ".codex-ui-settings-shell__navigation"],
              ["card", ".codex-ui-git-settings__card"],
              [
                "input",
                '.codex-ui-git-settings input[aria-label="Branch prefix"]',
              ],
              ["heading", ".codex-ui-git-settings > h1"],
            ].map(([name, selector]) => {
              const element = document.querySelector(selector);
              const style = element ? getComputedStyle(element) : null;
              return [
                name,
                style
                  ? {
                      backgroundColor: style.backgroundColor,
                      color: style.color,
                    }
                  : null,
              ];
            }),
          ),
          viewport: { height: window.innerHeight, width: window.innerWidth },
        };
      });
      const compact = scene.id === "workspace-git-settings-compact";
      if (
        settings.horizontalOverflow > 1 ||
        settings.navigationCount !== 1 ||
        settings.mainCount !== 1 ||
        settings.outerRegionCount !== 1 ||
        settings.selected !== "Git" ||
        settings.navigation?.width !== 322.90625 ||
        settings.navigation?.top !== 46 ||
        settings.navigation?.height !== settings.viewport.height - 46 ||
        settings.searchbox?.width !== 258.90625 ||
        settings.searchbox?.height !== 18 ||
        settings.heading?.top !== 66 ||
        Math.abs(settings.heading?.width - (compact ? 357.09375 : 768)) > 1 ||
        settings.branchPrefix?.width !== 224 ||
        settings.branchPrefix?.height !== 35 ||
        settings.card?.width !== (compact ? 357.09375 : 768) ||
        settings.switchStates.length !== 2 ||
        settings.switchStates[0]?.value !== "false" ||
        settings.switchStates[1]?.value !== "true" ||
        settings.textareaCount !== 2 ||
        settings.iconNames.length !== 24 ||
        !settings.iconNames.includes("settings-back") ||
        !settings.iconNames.includes("settings-search") ||
        !settings.iconNames.includes("settings-git")
      ) {
        throw new Error(
          `${scene.id}: current Git Settings contract failed: ${JSON.stringify(settings)}`,
        );
      }
      if (
        scene.id === "workspace-git-settings-light" &&
        (settings.theme !== "light" ||
          settings.visualStyles.shell?.color !== "rgb(26, 28, 31)" ||
          settings.visualStyles.navigation?.backgroundColor ===
            "rgb(36, 36, 36)" ||
          settings.visualStyles.card?.backgroundColor === "rgb(32, 32, 32)" ||
          settings.visualStyles.input?.backgroundColor === "rgb(43, 43, 43)" ||
          settings.visualStyles.heading?.color !== "rgb(26, 28, 31)")
      ) {
        throw new Error(
          `${scene.id}: light Git Settings paint failed: ${JSON.stringify(settings.visualStyles)}`,
        );
      }

      await page.getByRole("searchbox").fill("git");
      await page.waitForSelector(".codex-ui-settings-shell__result-label");
      const search = await page.evaluate(() => ({
        hasGit: Boolean(
          document.querySelector('.codex-ui-settings-shell__item[aria-label="Git"]'),
        ),
        hasHookResult: document.body.textContent?.includes(
          "Right before ChatGPT ends its turn",
        ),
        hasPlugins: Boolean(
          document.querySelector(
            '.codex-ui-settings-shell__item[aria-label="Plugins"]',
          ),
        ),
      }));
      if (!search.hasGit || !search.hasHookResult || search.hasPlugins) {
        throw new Error(
          `${scene.id}: current Git Settings search failed: ${JSON.stringify(search)}`,
        );
      }
      await page.getByRole("button", { name: "Hooks" }).click();
      const routing = await page.evaluate(() => ({
        heading: document.querySelector(".codex-ui-hooks-settings h1")
          ?.textContent,
        query: document.querySelector('[role="searchbox"]')?.value,
        selected: document
          .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
          ?.getAttribute("aria-label"),
      }));
      if (
        routing.heading !== "Hooks" ||
        routing.query !== "git" ||
        routing.selected !== "Hooks"
      ) {
        throw new Error(
          `${scene.id}: current Hooks Settings routing failed: ${JSON.stringify(routing)}`,
        );
      }
      const clearSearch = page.getByRole("button", {
        name: "Clear settings search",
      });
      await clearSearch.focus();
      await clearSearch.click();
      if (!(await page.getByRole("searchbox").evaluate((input) => input === document.activeElement))) {
        throw new Error(`${scene.id}: clearing Settings search did not restore input focus.`);
      }
      await page.getByRole("button", { name: "Git" }).click();
      await page.waitForSelector(".codex-ui-git-settings");
      await page.getByRole("switch", { name: "Always force push" }).click();
      const mergeRadio = page.getByRole("radio", { name: "Merge" });
      await mergeRadio.focus();
      await mergeRadio.press("ArrowRight");
      const interaction = await page.evaluate(() => ({
        forcePush: document
          .querySelector('[role="switch"][aria-label="Always force push"]')
          ?.getAttribute("aria-checked"),
        mergeTabIndex: document
          .querySelector(
            '[role="radiogroup"][aria-label="Pull request merge method"] [role="radio"]:nth-child(1)',
          )
          ?.getAttribute("tabindex"),
        squash: document
          .querySelector(
            '[role="radiogroup"][aria-label="Pull request merge method"] [role="radio"]:nth-child(2)',
          )
          ?.getAttribute("aria-checked"),
        squashTabIndex: document
          .querySelector(
            '[role="radiogroup"][aria-label="Pull request merge method"] [role="radio"]:nth-child(2)',
          )
          ?.getAttribute("tabindex"),
      }));
      if (
        interaction.forcePush !== "true" ||
        interaction.mergeTabIndex !== "-1" ||
        interaction.squash !== "true" ||
        interaction.squashTabIndex !== "0"
      ) {
        throw new Error(
          `${scene.id}: current Git Settings interaction failed: ${JSON.stringify(interaction)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ interaction, routing, search, settings }, null, 2)}\n`,
      );
      continue;
    }
    if (scene.id.startsWith("workspace-general-settings")) {
      if (scene.id.endsWith("-bottom") || scene.id.includes("-hotkey")) {
        await page.waitForFunction(() => {
          const owner = document.querySelector(".codex-ui-settings-shell__main");
          return owner instanceof HTMLElement && owner.scrollTop > 0;
        });
      }
      const general = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const rects = (selector) =>
          Array.from(document.querySelectorAll(selector), (element) => {
            const value = element.getBoundingClientRect();
            return {
              height: value.height,
              left: value.left,
              top: value.top,
              width: value.width,
            };
          });
        const style = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const value = getComputedStyle(element);
          return {
            backgroundColor: value.backgroundColor,
            borderRadius: value.borderRadius,
            color: value.color,
          };
        };
        const scrollOwner = document.querySelector(
          ".codex-ui-settings-shell__main",
        );
        return {
          cards: rects(".codex-ui-general-settings__card"),
          heading: rect(".codex-ui-general-settings > h1"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          hotkeyCapture: Boolean(
            document.querySelector(".codex-ui-general-settings__hotkey-capture"),
          ),
          hotkeyGeometry: (() => {
            const capture = document.querySelector(
              ".codex-ui-general-settings__hotkey-capture",
            );
            const row = capture?.closest(".codex-ui-general-settings__row");
            if (!capture || !row) return null;
            const toRect = (element) => {
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
            return {
              buttons: Array.from(capture.querySelectorAll("button"), toRect),
              capture: toRect(capture),
              row: toRect(row),
            };
          })(),
          iconNames: Array.from(
            document.querySelectorAll(
              ".codex-ui-settings-shell__navigation [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          mainCount: document.querySelectorAll('main, [role="main"]').length,
          menuLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-general-settings__menu-trigger",
            ),
            (control) => control.getAttribute("aria-label"),
          ),
          navigation: rect(".codex-ui-settings-shell__navigation"),
          navigationCount: document.querySelectorAll(
            'nav[aria-label="Settings"]',
          ).length,
          outerRegionCount: document.querySelectorAll(
            '[role="region"][aria-label="Settings route"]',
          ).length,
          rowCount: document.querySelectorAll(
            ".codex-ui-general-settings__row",
          ).length,
          scrollOwner: scrollOwner
            ? {
                clientHeight: scrollOwner.clientHeight,
                rect: (() => {
                  const value = scrollOwner.getBoundingClientRect();
                  return {
                    height: value.height,
                    left: value.left,
                    top: value.top,
                    width: value.width,
                  };
                })(),
                scrollHeight: scrollOwner.scrollHeight,
                scrollTop: scrollOwner.scrollTop,
              }
            : null,
          sectionHeadings: Array.from(
            document.querySelectorAll(".codex-ui-general-settings__section > h2"),
            (heading) => heading.textContent,
          ),
          segmentedLabels: Array.from(
            document.querySelectorAll(
              '.codex-ui-general-settings__segmented[role="group"]',
            ),
            (group) => group.getAttribute("aria-label"),
          ),
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
          switchStates: Array.from(
            document.querySelectorAll(
              '.codex-ui-general-settings [role="switch"]',
            ),
            (control) => ({
              disabled: control.hasAttribute("disabled"),
              label: control.getAttribute("aria-label"),
              value: control.getAttribute("aria-checked"),
            }),
          ),
          theme: document.querySelector(".demo-root")?.getAttribute("data-theme"),
          viewport: { height: innerHeight, width: innerWidth },
          visualStyles: {
            card: style(".codex-ui-general-settings__card"),
            heading: style(".codex-ui-general-settings > h1"),
            navigation: style(".codex-ui-settings-shell__navigation"),
            shell: style(".codex-ui-settings-shell"),
          },
        };
      });
      const compact = scene.windowSize?.width === 720;
      const bottom = scene.id === "workspace-general-settings-bottom";
      const hotkey = scene.id.includes("-hotkey");
      const scrolled = bottom || hotkey;
      const expectedWidth = compact ? 357.09375 : 768;
      const expectedSwitches = [
        ["Default permissions are always shown", "true", true],
        ["Show Auto-review in the composer", "true", false],
        ["Show Full access in the composer", "true", false],
        ["Show ChatGPT in the menu bar", "true", false],
        ["Bottom panel", "true", false],
        ["Prevent sleep while running", "false", false],
        ["Enable ambient suggestions", "true", false],
        ["Toggle plugins", "true", false],
        ["Show context window usage in the composer", "false", false],
        ["Default Popout Window to standalone chat", "false", false],
        ["Enable permission notifications", "true", false],
        ["Enable question notifications", "true", false],
      ];
      if (
        general.horizontalOverflow > 1 ||
        general.navigationCount !== 1 ||
        general.mainCount !== 1 ||
        general.outerRegionCount !== 1 ||
        general.selected !== "General" ||
        general.navigation?.width !== 322.90625 ||
        general.navigation?.top !== 46 ||
        general.navigation?.height !== general.viewport.height - 46 ||
        general.scrollOwner?.rect.top !== 46 ||
        general.scrollOwner?.rect.height !== general.viewport.height - 46 ||
        general.scrollOwner?.rect.left !== 322.90625 ||
        general.iconNames.length !== 24 ||
        !general.iconNames.includes("settings-general") ||
        (!scrolled && general.heading?.top !== 66) ||
        Math.abs(general.heading?.width - expectedWidth) > 1 ||
        general.cards.length !== 5 ||
        general.cards.some(({ width }) => Math.abs(width - expectedWidth) > 1) ||
        general.rowCount !== 21 ||
        JSON.stringify(general.sectionHeadings) !==
          JSON.stringify([
            "Permissions",
            "General",
            "Composer",
            "Popout Window",
            "Notifications",
          ]) ||
        JSON.stringify(general.menuLabels) !==
          JSON.stringify([
            "Default file open destination",
            "Language",
            "Speed",
            "Send shortcut",
            "Turn completion notifications",
          ]) ||
        JSON.stringify(general.segmentedLabels) !==
          JSON.stringify(["Default terminal location", "Follow-up behavior"]) ||
        JSON.stringify(
          general.switchStates.map(({ disabled, label, value }) => [
            label,
            value,
            disabled,
          ]),
        ) !== JSON.stringify(expectedSwitches) ||
        general.hotkeyCapture !== hotkey ||
        (hotkey &&
          (general.hotkeyGeometry?.buttons.length !== 2 ||
            general.hotkeyGeometry.buttons.some(
              ({ bottom, left, right, top }) =>
                left < general.hotkeyGeometry.row.left ||
                right > general.hotkeyGeometry.row.right ||
                top < general.hotkeyGeometry.row.top ||
                bottom > general.hotkeyGeometry.row.bottom,
            ))) ||
        (!scrolled && general.scrollOwner?.scrollTop !== 0) ||
        (scrolled && general.scrollOwner?.scrollTop <= 0)
      ) {
        throw new Error(
          `${scene.id}: current General Settings contract failed: ${JSON.stringify(general)}`,
        );
      }
      if (
        scene.id === "workspace-general-settings-light" &&
        (general.theme !== "light" ||
          general.visualStyles.shell?.color !== "rgb(26, 28, 31)" ||
          general.visualStyles.navigation?.backgroundColor === "rgb(36, 36, 36)" ||
          general.visualStyles.card?.backgroundColor === "rgb(35, 35, 35)" ||
          general.visualStyles.heading?.color !== "rgb(26, 28, 31)")
      ) {
        throw new Error(
          `${scene.id}: light General Settings paint failed: ${JSON.stringify(general.visualStyles)}`,
        );
      }

      let interaction = null;
      if (scene.id === "workspace-general-settings") {
        const readFocusedLabel = async (label) => {
          await page.waitForFunction(
            (expected) =>
              document.activeElement?.getAttribute("aria-label") === expected,
            label,
          );
          return page.evaluate(
            () => document.activeElement?.getAttribute("aria-label"),
          );
        };
        const readMenuState = () =>
          page.getByRole("menuitemradio").evaluateAll((items) =>
            items.map((item) => ({
              checked: item.getAttribute("aria-checked"),
              label: item.textContent?.trim(),
            })),
          );
        const readDescribedValue = (label) =>
          page.getByRole("button", { name: label }).evaluate((control) => {
            const descriptionId = control.getAttribute("aria-describedby");
            return descriptionId
              ? document.getElementById(descriptionId)?.textContent?.trim()
              : null;
          });
        const menuFocus = {};
        const menuStates = {};
        await page
          .getByRole("switch", { name: "Show Auto-review in the composer" })
          .click();
        await page
          .getByRole("button", { name: "Default file open destination" })
          .click();
        const fileDestinations = await page
          .getByRole("menuitemradio")
          .allTextContents();
        menuStates.fileDestination = await readMenuState();
        const xcodeDestination = page.getByRole("menuitemradio", {
          name: "Xcode",
          exact: true,
        });
        await xcodeDestination.focus();
        await xcodeDestination.press("Enter");
        menuFocus.fileDestination = await readFocusedLabel(
          "Default file open destination",
        );
        await page.getByRole("button", { name: "Language" }).click();
        const languageQuery = page.getByRole("searchbox", {
          name: "Search languages",
        });
        const languageStructure = await page.evaluate(() => {
          const dialog = document.querySelector(
            '.codex-ui-general-settings__language-popover[role="dialog"]',
          );
          const listbox = dialog?.querySelector('[role="listbox"]');
          const search = dialog?.querySelector('input[aria-label="Search languages"]');
          return {
            controlsListbox:
              search?.getAttribute("aria-controls") === listbox?.getAttribute("id"),
            dialogContainsListbox: Boolean(dialog && listbox && dialog.contains(listbox)),
            dialogContainsSearch: Boolean(dialog && search && dialog.contains(search)),
            listboxContainsSearch: Boolean(listbox && search && listbox.contains(search)),
          };
        });
        await languageQuery.fill("简体");
        await page.evaluate(() => {
          window.__codexGeneralLanguageKeyEvents = [];
          document.addEventListener("keydown", (event) => {
            if (event.key !== "Home" && event.key !== "End") return;
            window.__codexGeneralLanguageKeyEvents.push({
              defaultPrevented: event.defaultPrevented,
              key: event.key,
            });
          });
        });
        await languageQuery.press("Home");
        const languageHomeFocus = await page.evaluate(
          () => document.activeElement?.getAttribute("aria-label"),
        );
        await languageQuery.press("End");
        const languageEditing = await page.evaluate(
          (homeFocus) => ({
            endFocus: document.activeElement?.getAttribute("aria-label"),
            events: window.__codexGeneralLanguageKeyEvents,
            homeFocus,
          }),
          languageHomeFocus,
        );
        await languageQuery.press("ArrowDown");
        const languageArrowFocus = await page.evaluate(
          () => document.activeElement?.getAttribute("role"),
        );
        const simplifiedChinese = page.getByRole("option", {
          name: "简体中文",
          exact: true,
        });
        await simplifiedChinese.focus();
        await simplifiedChinese.press("Enter");
        menuFocus.language = await readFocusedLabel("Language");
        await page.getByRole("button", { name: "Language" }).click();
        const languageSearch = page.getByRole("searchbox", {
          name: "Search languages",
        });
        await languageSearch.focus();
        await languageSearch.press("Escape");
        menuFocus.languageEscape = await readFocusedLabel("Language");
        await page.getByRole("button", { name: "Language" }).click();
        await page
          .getByRole("searchbox", { name: "Search languages" })
          .waitFor();
        const bottomControl = page.getByRole("button", { name: "Bottom", exact: true });
        await bottomControl.click();
        menuFocus.languageOutside = await readFocusedLabel("Bottom");
        await bottomControl.focus();
        await bottomControl.press("ArrowRight");
        await page.getByRole("button", { name: "Speed" }).click();
        const speedOptions = await page
          .getByRole("menuitemradio")
          .allTextContents();
        menuStates.speed = await readMenuState();
        const fastSpeed = page
          .getByRole("menuitemradio")
          .filter({ hasText: /^Fast/ });
        await fastSpeed.focus();
        await fastSpeed.press("Enter");
        menuFocus.speed = await readFocusedLabel("Speed");
        await page
          .getByRole("switch", { name: "Show context window usage in the composer" })
          .click();
        await page.getByRole("button", { name: "Send shortcut" }).click();
        const commandEnter = page
          .getByRole("menuitemradio")
          .filter({ hasText: "⌘ + Enter always" });
        menuStates.sendShortcut = await readMenuState();
        await commandEnter.focus();
        await commandEnter.press("Enter");
        menuFocus.sendShortcut = await readFocusedLabel("Send shortcut");
        const queueControl = page.getByRole("button", { name: "Queue", exact: true });
        await queueControl.focus();
        await queueControl.press("ArrowRight");
        await page
          .getByRole("button", { name: "Set shortcut for Popout Window hotkey" })
          .click();
        await page.waitForFunction(
          () => document.activeElement?.textContent?.trim() === "Press shortcut",
        );
        const hotkeyRecord = page.getByRole("button", {
          name: "Press shortcut",
          exact: true,
        });
        await hotkeyRecord.press("Meta");
        await hotkeyRecord.press("Meta+Shift+K");
        const hotkeyEdit = page.getByRole("button", {
          name: "Set shortcut for Popout Window hotkey",
        });
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Set shortcut for Popout Window hotkey",
        );
        const hotkeyCaptured = await hotkeyEdit.locator("span").first().textContent();
        await hotkeyEdit.click();
        await page
          .getByRole("button", { name: "Press shortcut", exact: true })
          .press("Backspace");
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Set shortcut for Popout Window hotkey",
        );
        const hotkeyCleared = await hotkeyEdit.locator("span").first().textContent();
        await hotkeyEdit.click();
        await page
          .getByRole("button", { name: "Press shortcut", exact: true })
          .press("Meta+Shift+K");
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Set shortcut for Popout Window hotkey",
        );
        await hotkeyEdit.click();
        await page
          .getByRole("button", { name: "Press shortcut", exact: true })
          .press("Escape");
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Set shortcut for Popout Window hotkey",
        );
        const hotkeyEscapePreserved = await hotkeyEdit
          .locator("span")
          .first()
          .textContent();
        await hotkeyEdit.click();
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Set shortcut for Popout Window hotkey",
        );
        const hotkeyFocusRestored = await page.evaluate(
          () => document.activeElement?.getAttribute("aria-label"),
        );
        await page
          .getByRole("button", { name: "Turn completion notifications" })
          .click();
        const alwaysNotifications = page.getByRole("menuitemradio", {
          name: "Always",
          exact: true,
        });
        menuStates.completionNotifications = await readMenuState();
        await alwaysNotifications.focus();
        await alwaysNotifications.press("Enter");
        menuFocus.completionNotifications = await readFocusedLabel(
          "Turn completion notifications",
        );
        const describedValues = Object.fromEntries(
          await Promise.all(
            [
              "Default file open destination",
              "Language",
              "Speed",
              "Send shortcut",
              "Set shortcut for Popout Window hotkey",
              "Turn completion notifications",
            ].map(async (label) => [label, await readDescribedValue(label)]),
          ),
        );
        await page.getByRole("button", { name: "View", exact: true }).click();
        interaction = await page.evaluate(
          ({
            fileDestinations,
            hotkeyCaptured,
            hotkeyCleared,
            hotkeyEscapePreserved,
            hotkeyFocusRestored,
            languageEditing,
            languageArrowFocus,
            languageStructure,
            menuFocus,
            menuStates,
            describedValues,
            speedOptions,
          }) => ({
            autoReview: document
              .querySelector('[role="switch"][aria-label="Show Auto-review in the composer"]')
              ?.getAttribute("aria-checked"),
            completionNotifications: document
              .querySelector('button[aria-label="Turn completion notifications"]')
              ?.textContent?.trim(),
            contextUsage: document
              .querySelector('[role="switch"][aria-label="Show context window usage in the composer"]')
              ?.getAttribute("aria-checked"),
            fileDestination: document
              .querySelector('button[aria-label="Default file open destination"]')
              ?.textContent?.trim(),
            fileDestinations,
            followUp: document
              .querySelector('button[aria-label="Steer"]')
              ?.getAttribute("aria-pressed"),
            hotkeyCapture: Boolean(
              document.querySelector(".codex-ui-general-settings__hotkey-capture"),
            ),
            hotkeyCaptured,
            hotkeyCleared,
            hotkeyEscapePreserved,
            hotkeyFocus: hotkeyFocusRestored,
            language: document
              .querySelector('button[aria-label="Language"]')
              ?.textContent?.trim(),
            languageEditing,
            languageArrowFocus,
            languageStructure,
            licenses: document.querySelector(".demo-settings-action-status")
              ?.textContent?.trim(),
            menuFocus,
            menuStates,
            describedValues,
            sendShortcut: document
              .querySelector('button[aria-label="Send shortcut"]')
              ?.textContent?.trim(),
            speed: document.querySelector('button[aria-label="Speed"]')
              ?.textContent?.trim(),
            speedOptions,
            terminal: document
              .querySelector('button[aria-label="Right"]')
              ?.getAttribute("aria-pressed"),
          }),
          {
            fileDestinations,
            hotkeyCaptured,
            hotkeyCleared,
            hotkeyEscapePreserved,
            hotkeyFocusRestored,
            languageEditing,
            languageArrowFocus,
            languageStructure,
            menuFocus,
            menuStates,
            describedValues,
            speedOptions,
          },
        );
        await page
          .getByRole("button", { name: "Set shortcut for Popout Window hotkey" })
          .click();
        await page
          .getByRole("button", { name: "Press shortcut", exact: true })
          .waitFor();
        await page.getByRole("button", { name: "Git", exact: true }).click();
        await page.getByRole("heading", { name: "Git", exact: true }).waitFor();
        await page.getByRole("button", { name: "General", exact: true }).click();
        await page
          .getByRole("heading", { level: 1, name: "General", exact: true })
          .waitFor();
        await page.waitForFunction(
          () =>
            !document.querySelector(".codex-ui-general-settings__hotkey-capture") &&
            document.activeElement?.textContent?.trim() === "General",
        );
        interaction.routeLifecycle = await page.evaluate(() => {
          const hotkey = document.querySelector(
            'button[aria-label="Set shortcut for Popout Window hotkey"] span',
          );
          const owner = document.querySelector(".codex-ui-settings-shell__main");
          return {
            activeText: document.activeElement?.textContent?.trim(),
            hotkey: hotkey?.textContent?.trim(),
            hotkeyCapture: Boolean(
              document.querySelector(".codex-ui-general-settings__hotkey-capture"),
            ),
            scrollTop: owner instanceof HTMLElement ? owner.scrollTop : null,
          };
        });
        if (
          interaction.autoReview !== "false" ||
          interaction.completionNotifications !== "Always⌄" ||
          interaction.contextUsage !== "true" ||
          !interaction.fileDestination?.includes("Xcode") ||
          interaction.fileDestinations.length !== 7 ||
          interaction.followUp !== "true" ||
          interaction.hotkeyCapture ||
          interaction.hotkeyCaptured !== "⌘ ⇧ K" ||
          interaction.hotkeyCleared !== "Off" ||
          interaction.hotkeyEscapePreserved !== "⌘ ⇧ K" ||
          interaction.hotkeyFocus !== "Set shortcut for Popout Window hotkey" ||
          interaction.language !== "简体中文⌄" ||
          interaction.languageEditing.endFocus !== "Search languages" ||
          interaction.languageEditing.homeFocus !== "Search languages" ||
          interaction.languageEditing.events.length !== 2 ||
          interaction.languageEditing.events.some(
            ({ defaultPrevented }) => defaultPrevented,
          ) ||
          interaction.languageArrowFocus !== "option" ||
          !interaction.languageStructure.controlsListbox ||
          !interaction.languageStructure.dialogContainsListbox ||
          !interaction.languageStructure.dialogContainsSearch ||
          interaction.languageStructure.listboxContainsSearch ||
          Object.values(interaction.menuStates).some(
            (states) =>
              states.length === 0 ||
              states.filter(({ checked }) => checked === "true").length !== 1,
          ) ||
          JSON.stringify(interaction.describedValues) !==
            JSON.stringify({
              "Default file open destination": "Xcode",
              Language: "简体中文",
              Speed: "Fast",
              "Send shortcut": "⌘ + Enter always",
              "Set shortcut for Popout Window hotkey": "⌘ ⇧ K",
              "Turn completion notifications": "Always",
            }) ||
          interaction.licenses !== "Open source licenses requested" ||
          interaction.menuFocus.completionNotifications !==
            "Turn completion notifications" ||
          interaction.menuFocus.fileDestination !==
            "Default file open destination" ||
          interaction.menuFocus.language !== "Language" ||
          interaction.menuFocus.languageEscape !== "Language" ||
          interaction.menuFocus.languageOutside !== "Bottom" ||
          interaction.menuFocus.sendShortcut !== "Send shortcut" ||
          interaction.menuFocus.speed !== "Speed" ||
          interaction.routeLifecycle.activeText !== "General" ||
          interaction.routeLifecycle.hotkey !== "⌘ ⇧ K" ||
          interaction.routeLifecycle.hotkeyCapture ||
          interaction.routeLifecycle.scrollTop !== 0 ||
          interaction.sendShortcut !== "⌘ + Enter always⌄" ||
          !interaction.speed?.includes("Fast") ||
          interaction.speedOptions.length !== 2 ||
          interaction.terminal !== "true"
        ) {
          throw new Error(
            `${scene.id}: current General Settings interaction failed: ${JSON.stringify(interaction)}`,
          );
        }
      }
      if (hotkey) {
        const cancel = page.getByRole("button", { name: "Cancel", exact: true });
        await cancel.click();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
          "Set shortcut for Popout Window hotkey",
        );
      }
      let initialFrameRouteLifecycle = null;
      if (hotkey || bottom) {
        await page.getByRole("button", { name: "Git", exact: true }).click();
        await page.getByRole("heading", { name: "Git", exact: true }).waitFor();
        await page.getByRole("button", { name: "General", exact: true }).click();
        await page
          .getByRole("heading", { level: 1, name: "General", exact: true })
          .waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector(".demo-root")?.getAttribute("data-frame") ===
              "workspace-general-settings" &&
            !document.querySelector(".codex-ui-general-settings__hotkey-capture") &&
            document.activeElement?.textContent?.trim() === "General",
        );
        initialFrameRouteLifecycle = await page.evaluate(() => {
          const owner = document.querySelector(".codex-ui-settings-shell__main");
          return {
            activeText: document.activeElement?.textContent?.trim(),
            frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
            hotkeyCapture: Boolean(
              document.querySelector(".codex-ui-general-settings__hotkey-capture"),
            ),
            scrollTop: owner instanceof HTMLElement ? owner.scrollTop : null,
          };
        });
        if (
          initialFrameRouteLifecycle.activeText !== "General" ||
          initialFrameRouteLifecycle.frame !== "workspace-general-settings" ||
          initialFrameRouteLifecycle.hotkeyCapture ||
          initialFrameRouteLifecycle.scrollTop !== 0
        ) {
          throw new Error(
            `${scene.id}: initial General frame leaked across routing: ${JSON.stringify(initialFrameRouteLifecycle)}`,
          );
        }
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ general, initialFrameRouteLifecycle, interaction }, null, 2)}\n`,
      );
      continue;
    }
    if (scene.id.startsWith("workspace-hooks-settings")) {
      await page
        .getByRole("heading", { level: 1, name: "Hooks", exact: true })
        .waitFor();
      const hooks = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const pageRoot = document.querySelector(".codex-ui-hooks-settings");
        return {
          card: rect(
            ".codex-ui-hooks-settings__empty, .codex-ui-hooks-settings__error, .codex-ui-hooks-settings__source-card",
          ),
          entryCount: document.querySelectorAll(
            ".codex-ui-hooks-settings__entry",
          ).length,
          evidence: pageRoot?.getAttribute("data-evidence"),
          heading: rect(".codex-ui-hooks-settings h1"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          iconNames: Array.from(
            document.querySelectorAll(
              ".codex-ui-settings-shell__navigation [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          learnMoreHref: document
            .querySelector(".codex-ui-hooks-settings__header a")
            ?.getAttribute("href"),
          loadingText: document
            .querySelector(".codex-ui-hooks-settings__loading")
            ?.textContent?.trim(),
          navigation: rect(".codex-ui-settings-shell__navigation"),
          reload: rect('.codex-ui-hooks-settings__reload[aria-label="Reload hooks"]'),
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
          sourceHeadings: Array.from(
            document.querySelectorAll(".codex-ui-hooks-settings__source > h2"),
            (heading) => heading.textContent?.trim(),
          ),
          status: pageRoot?.getAttribute("data-status"),
          subtitle: document
            .querySelector(".codex-ui-hooks-settings__header p")
            ?.textContent?.replace(/\s+/g, " ")
            .trim(),
          switchStates: Array.from(
            document.querySelectorAll(
              '.codex-ui-hooks-settings__entry [role="switch"]',
            ),
            (control) => ({
              checked: control.getAttribute("aria-checked"),
              disabled:
                control instanceof HTMLButtonElement ? control.disabled : null,
              label: control.getAttribute("aria-label"),
            }),
          ),
          theme: document.documentElement.dataset.theme,
          viewport: { height: innerHeight, width: innerWidth },
        };
      });
      const compact = scene.id === "workspace-hooks-settings-compact";
      const configured = scene.id === "workspace-hooks-settings-configured";
      const loading = scene.id === "workspace-hooks-settings-loading";
      const error = scene.id === "workspace-hooks-settings-error";
      const expectedWidth = compact ? 357.09375 : 768;
      const expectedHeadingWidth = compact ? 315.09375 : 726;
      const expectedLeft = compact ? 342.90625 : 367.453125;
      if (
        hooks.evidence !== "runtime-observed" ||
        hooks.status !== (loading ? "loading" : error ? "error" : "ready") ||
        hooks.heading?.top !== 66 ||
        Math.abs((hooks.heading?.left ?? 0) - expectedLeft) > 0.1 ||
        Math.abs((hooks.heading?.width ?? 0) - expectedHeadingWidth) > 0.1 ||
        hooks.reload?.top !== 66 ||
        hooks.reload?.height !== 26 ||
        hooks.reload?.width !== 26 ||
        hooks.navigation?.width !== 322.90625 ||
        hooks.selected !== "Hooks" ||
        hooks.horizontalOverflow > 1 ||
        hooks.learnMoreHref !== "https://developers.openai.com/codex/hooks" ||
        hooks.subtitle !==
          "Manage lifecycle hooks from config and enabled plugins. Learn more" ||
        !hooks.iconNames.includes("settings-hooks") ||
        (scene.id === "workspace-hooks-settings-light" &&
          hooks.theme !== "light") ||
        (configured &&
          (hooks.entryCount !== 3 ||
            JSON.stringify(hooks.sourceHeadings) !==
              JSON.stringify(["From Config", "From Plugins", "From Projects"]) ||
            hooks.switchStates.length !== 3 ||
            hooks.switchStates[1]?.disabled !== true)) ||
        (loading && hooks.loadingText !== "Loading hooks…") ||
        (!configured && !loading && !error &&
          (hooks.card?.top !== (compact ? 174.796875 : 153.796875) ||
            Math.abs((hooks.card?.width ?? 0) - expectedWidth) > 0.1 ||
            Math.abs((hooks.card?.height ?? 0) - 62.5625) > 0.1))
      ) {
        throw new Error(
          `${scene.id}: current Hooks Settings contract failed: ${JSON.stringify(hooks)}`,
        );
      }

      let interaction = null;
      if (scene.id === "workspace-hooks-settings") {
        const reload = page.getByRole("button", {
          name: "Reload hooks",
          exact: true,
        });
        await reload.click();
        await page.waitForFunction(
          () =>
            document.querySelector(".demo-settings-action-status")?.textContent ===
            "Refreshed hooks",
        );
        const search = page.getByRole("searchbox", { name: "Search settings" });
        await search.fill("git");
        const result = await page
          .getByRole("button", { name: "Hooks", exact: true })
          .textContent();
        await search.fill("");
        await page.getByRole("button", { name: "Git", exact: true }).click();
        await page.getByRole("heading", { name: "Git", exact: true }).waitFor();
        await page.getByRole("button", { name: "Hooks", exact: true }).click();
        await page
          .getByRole("heading", { level: 1, name: "Hooks", exact: true })
          .waitFor();
        interaction = await page.evaluate((resultText) => ({
          action: document.querySelector(".demo-settings-action-status")?.textContent,
          activeText: document.activeElement?.textContent?.trim(),
          frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
          resultText,
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
        }), result);
        if (
          interaction.action !== "Refreshed hooks" ||
          !interaction.resultText?.includes("Right before ChatGPT ends its turn") ||
          interaction.frame !== "workspace-hooks-settings" ||
          interaction.selected !== "Hooks" ||
          interaction.activeText !== "Hooks"
        ) {
          throw new Error(
            `${scene.id}: Hooks refresh/search/route lifecycle failed: ${JSON.stringify(interaction)}`,
          );
        }
      } else if (configured) {
        const stop = page.getByRole("switch", { name: "Stop enabled" });
        await stop.click();
        await page.getByText("PreToolUse", { exact: true }).click();
        await page.getByRole("button", { name: "Trust", exact: true }).click();
        const preTool = page.getByRole("switch", {
          name: "PreToolUse enabled",
        });
        await preTool.click();
        interaction = await page.evaluate(() => {
          const preToolSwitch = document.querySelector(
            '[role="switch"][aria-label="PreToolUse enabled"]',
          );
          const preToolEntry = preToolSwitch?.closest(
            ".codex-ui-hooks-settings__entry",
          );
          return {
            preToolChecked: preToolSwitch?.getAttribute("aria-checked"),
            preToolDisabled: preToolSwitch?.disabled,
            stopChecked: document
              .querySelector('[role="switch"][aria-label="Stop enabled"]')
              ?.getAttribute("aria-checked"),
            trustVisible: [
              ...(preToolEntry?.querySelectorAll("button") ?? []),
            ].some((button) => button.textContent?.trim() === "Trust"),
          };
        });
        if (
          interaction.stopChecked !== "false" ||
          interaction.preToolDisabled !== false ||
          interaction.preToolChecked !== "true" ||
          interaction.trustVisible
        ) {
          throw new Error(
            `${scene.id}: configured Hooks controls failed: ${JSON.stringify(interaction)}`,
          );
        }
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ hooks, interaction }, null, 2)}\n`,
      );
      continue;
    }
    if (scene.id.startsWith("workspace-code-review-settings")) {
      await page
        .getByRole("heading", { level: 1, name: "Code review", exact: true })
        .waitFor();
      const codeReview = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const root = document.querySelector(".codex-ui-code-review-settings");
        return {
          card: rect(".codex-ui-code-review-settings__card"),
          evidence: root?.getAttribute("data-evidence"),
          heading: rect(".codex-ui-code-review-settings h1"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          navigationCodeReviewCount: document.querySelectorAll(
            '.codex-ui-settings-shell__navigation [aria-label="Code review"]',
          ).length,
          rowCount: document.querySelectorAll(
            ".codex-ui-code-review-settings__row",
          ).length,
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
          switchCount: document.querySelectorAll(
            '.codex-ui-code-review-settings [role="switch"]',
          ).length,
          triggerText: document
            .querySelector('.codex-ui-code-review-settings__trigger[aria-label="Review trigger"]')
            ?.textContent?.trim(),
          viewport: { height: innerHeight, width: innerWidth },
        };
      });
      const compact = scene.id.endsWith("-compact");
      const expectedWidth = compact ? 357.09375 : 768;
      const expectedLeft = compact ? 342.90625 : 367.453125;
      if (
        codeReview.evidence !== "package-observed" ||
        codeReview.navigationCodeReviewCount !== 0 ||
        codeReview.selected !== undefined ||
        codeReview.heading?.top !== 66 ||
        Math.abs((codeReview.heading?.left ?? 0) - expectedLeft) > 0.1 ||
        Math.abs((codeReview.heading?.width ?? 0) - expectedWidth) > 0.1 ||
        Math.abs((codeReview.card?.width ?? 0) - expectedWidth) > 0.1 ||
        codeReview.rowCount !== 4 ||
        codeReview.switchCount !== 3 ||
        !codeReview.triggerText?.includes("On PR open") ||
        codeReview.horizontalOverflow > 1
      ) {
        throw new Error(
          `${scene.id}: package-observed Code review contract failed: ${JSON.stringify(codeReview)}`,
        );
      }
      const automatic = page.getByRole("switch", {
        name: "Enable automatic code review",
      });
      await automatic.click();
      await page.getByRole("button", { name: "Review trigger" }).click();
      const selectedTrigger = page.getByRole("menuitemradio", {
        name: "On PR open",
      });
      const everyPushTrigger = page.getByRole("menuitemradio", {
        name: "On every push",
      });
      if (
        (await selectedTrigger.getAttribute("aria-checked")) !== "true" ||
        (await everyPushTrigger.getAttribute("aria-checked")) !== "false"
      ) {
        throw new Error(`${scene.id}: review trigger radio semantics failed.`);
      }
      await everyPushTrigger.click();
      await page
        .getByRole("switch", { name: "Enable exhaustive code review" })
        .click();
      await page
        .getByRole("switch", { name: "Allow credits for code reviews" })
        .click();
      const interaction = await page.evaluate(() => ({
        automatic: document
          .querySelector('[role="switch"][aria-label="Enable automatic code review"]')
          ?.getAttribute("aria-checked"),
        credits: document
          .querySelector('[role="switch"][aria-label="Allow credits for code reviews"]')
          ?.getAttribute("aria-checked"),
        exhaustive: document
          .querySelector('[role="switch"][aria-label="Enable exhaustive code review"]')
          ?.getAttribute("aria-checked"),
        trigger: document
          .querySelector('.codex-ui-code-review-settings__trigger[aria-label="Review trigger"]')
          ?.textContent?.trim(),
      }));
      if (
        interaction.automatic !== "false" ||
        interaction.credits !== "true" ||
        interaction.exhaustive !== "true" ||
        !interaction.trigger?.includes("On every push")
      ) {
        throw new Error(
          `${scene.id}: Code review controls failed: ${JSON.stringify(interaction)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ codeReview, interaction }, null, 2)}\n`,
      );
      continue;
    }
    if (scene.id.startsWith("workspace-appearance-settings")) {
      if (scene.id.endsWith("-preferences")) {
        await page.waitForFunction(() => {
          const owner = document.querySelector(".codex-ui-settings-shell__main");
          return owner && owner.scrollTop > 0;
        });
      }
      const appearance = await page.evaluate(() => {
        const rect = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const rects = (selector) =>
          Array.from(document.querySelectorAll(selector), (element) => {
            const value = element.getBoundingClientRect();
            return {
              height: value.height,
              left: value.left,
              top: value.top,
              width: value.width,
            };
          });
        const checked = (label) =>
          document.querySelector(`input[aria-label="${label}"]`)?.checked;
        const style = (selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const value = getComputedStyle(element);
          return {
            backgroundColor: value.backgroundColor,
            color: value.color,
          };
        };
        const scrollOwner = document.querySelector(
          ".codex-ui-settings-shell__main",
        );
        return {
          contrast: Array.from(
            document.querySelectorAll('.codex-ui-appearance-settings input[type="range"]'),
            (input) => ({
              label: input.getAttribute("aria-label"),
              max: input.max,
              min: input.min,
              step: input.step,
              value: Number(input.value),
            }),
          ),
          dock: {
            chatgpt: checked("Use ChatGPT Dock icon"),
            codex: checked("Use Codex Dock icon"),
          },
          editorCards: rects(".codex-ui-appearance-settings__editor"),
          heading: rect(".codex-ui-appearance-settings > h1"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          iconNames: Array.from(
            document.querySelectorAll(
              ".codex-ui-settings-shell__navigation [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          mainCount: document.querySelectorAll('main, [role="main"]').length,
          navigation: rect(".codex-ui-settings-shell__navigation"),
          navigationCount: document.querySelectorAll(
            'nav[aria-label="Settings"]',
          ).length,
          numberInputs: Array.from(
            document.querySelectorAll('.codex-ui-appearance-settings input[type="number"]'),
            (input) => ({
              label: input.getAttribute("aria-label"),
              max: input.max,
              min: input.min,
              step: input.step,
              value: Number(input.value),
            }),
          ),
          outerRegionCount: document.querySelectorAll(
            '[role="region"][aria-label="Settings route"]',
          ).length,
          preferences: rect(
            ".codex-ui-appearance-settings__preferences-card",
          ),
          preview: rect(".codex-ui-appearance-settings__diff-preview"),
          scrollOwner: scrollOwner
            ? {
                clientHeight: scrollOwner.clientHeight,
                rect: (() => {
                  const value = scrollOwner.getBoundingClientRect();
                  return {
                    height: value.height,
                    left: value.left,
                    top: value.top,
                    width: value.width,
                  };
                })(),
                scrollHeight: scrollOwner.scrollHeight,
                scrollTop: scrollOwner.scrollTop,
              }
            : null,
          selected: document
            .querySelector('.codex-ui-settings-shell__item[aria-current="page"]')
            ?.getAttribute("aria-label"),
          switchStates: Array.from(
            document.querySelectorAll(
              '.codex-ui-appearance-settings [role="switch"]',
            ),
            (control) => ({
              label: control.getAttribute("aria-label"),
              value: control.getAttribute("aria-checked"),
            }),
          ),
          theme: {
            dark: checked("Dark"),
            light: checked("Light"),
            system: checked("System"),
          },
          themePreviews: rects(
            ".codex-ui-appearance-settings__theme-preview",
          ),
          themeValue: document
            .querySelector(".demo-root")
            ?.getAttribute("data-theme"),
          viewport: { height: innerHeight, width: innerWidth },
          visualStyles: {
            editor: style(".codex-ui-appearance-settings__editor"),
            heading: style(".codex-ui-appearance-settings > h1"),
            navigation: style(".codex-ui-settings-shell__navigation"),
            shell: style(".codex-ui-settings-shell"),
          },
        };
      });
      const compact = scene.id === "workspace-appearance-settings-compact";
      const preferences = scene.id.endsWith("-preferences");
      const expectedWidth = compact ? 357.09375 : 768;
      const expectedPreviewWidth = compact ? 111.03125 : 248;
      if (
        appearance.horizontalOverflow > 1 ||
        appearance.navigationCount !== 1 ||
        appearance.mainCount !== 1 ||
        appearance.outerRegionCount !== 1 ||
        appearance.selected !== "Appearance" ||
        appearance.navigation?.width !== 322.90625 ||
        appearance.navigation?.top !== 46 ||
        appearance.navigation?.height !== appearance.viewport.height - 46 ||
        appearance.scrollOwner?.rect.top !== 46 ||
        appearance.scrollOwner?.rect.height !== appearance.viewport.height - 46 ||
        appearance.scrollOwner?.rect.left !== 322.90625 ||
        appearance.iconNames.length !== 24 ||
        !appearance.iconNames.includes("settings-appearance") ||
        appearance.themePreviews.length !== 3 ||
        appearance.themePreviews.some(
          ({ width }) => Math.abs(width - expectedPreviewWidth) > 1,
        ) ||
        appearance.editorCards.length !== 2 ||
        appearance.editorCards.some(
          ({ width }) => Math.abs(width - expectedWidth) > 1,
        ) ||
        appearance.preview?.width !== expectedWidth ||
        appearance.preview?.height !== 110 ||
        appearance.theme.system !== true ||
        appearance.theme.light !== false ||
        appearance.theme.dark !== false ||
        appearance.dock.chatgpt !== false ||
        appearance.dock.codex !== true ||
        JSON.stringify(appearance.switchStates.map(({ value }) => value)) !==
          JSON.stringify(["true", "true", "false", "true"]) ||
        JSON.stringify(appearance.contrast) !==
          JSON.stringify([
            { label: "Light contrast", max: "100", min: "0", step: "1", value: 45 },
            { label: "Dark contrast", max: "100", min: "0", step: "1", value: 60 },
          ]) ||
        JSON.stringify(appearance.numberInputs) !==
          JSON.stringify([
            { label: "Sans font size", max: "16", min: "11", step: "1", value: 14 },
            { label: "Code font size", max: "24", min: "8", step: "1", value: 12 },
          ]) ||
        (!preferences &&
          (appearance.heading?.top !== 66 ||
            Math.abs(appearance.heading?.width - expectedWidth) > 1 ||
            Math.abs(appearance.themePreviews[0].top - 173) > 1 ||
            Math.abs(appearance.editorCards[0].top - (compact ? 419 : 513)) > 2)) ||
        (preferences &&
          (Math.abs(appearance.preferences?.bottom - 799) > 1 ||
            appearance.scrollOwner?.scrollTop <= 0))
      ) {
        throw new Error(
          `${scene.id}: current Appearance Settings contract failed: ${JSON.stringify(appearance)}`,
        );
      }
      if (
        scene.id === "workspace-appearance-settings-light" &&
        (appearance.themeValue !== "light" ||
          appearance.visualStyles.shell?.color !== "rgb(26, 28, 31)" ||
          appearance.visualStyles.navigation?.backgroundColor ===
            "rgb(36, 36, 36)" ||
          appearance.visualStyles.editor?.backgroundColor ===
            "rgb(32, 32, 32)" ||
          appearance.visualStyles.heading?.color !== "rgb(26, 28, 31)")
      ) {
        throw new Error(
          `${scene.id}: light Appearance Settings paint failed: ${JSON.stringify(appearance.visualStyles)}`,
        );
      }

      let interaction = null;
      if (scene.id === "workspace-appearance-settings") {
        await page
          .locator('label:has(input[aria-label="Dark"])')
          .click();
        await page
          .getByRole("switch", { name: "Light translucent sidebar" })
          .click();
        const lightContrast = page.getByRole("slider", {
          name: "Light contrast",
        });
        await lightContrast.focus();
        for (let step = 0; step < 6; step += 1) {
          await lightContrast.press("ArrowRight");
        }
        await page.getByRole("button", { name: "Light code theme" }).click();
        const codeThemes = (await page.getByRole("menuitem").allTextContents()).map(
          (label) => label.replace(/^Aa/, ""),
        );
        await page.getByRole("menuitem", { name: "GitHub" }).click();
        await page
          .getByRole("heading", { name: "Preferences", exact: true })
          .scrollIntoViewIfNeeded();
        await page.getByRole("switch", { name: "Use pointer cursors" }).click();
        await page
          .locator('label:has(input[aria-label="Use ChatGPT Dock icon"])')
          .click();
        const systemMotion = page.getByRole("button", {
          name: "System",
          exact: true,
        });
        await systemMotion.focus();
        await systemMotion.press("ArrowRight");
        await page.getByRole("spinbutton", { name: "Sans font size" }).fill("15");
        await page.getByRole("spinbutton", { name: "Code font size" }).fill("13");
        const colorMarkers = page.getByRole("button", {
          name: "Color diff markers",
        });
        await colorMarkers.focus();
        await colorMarkers.press("ArrowRight");
        await page.getByRole("switch", { name: "Font smoothing" }).click();
        interaction = await page.evaluate((codeThemes) => ({
          codeTheme: document
            .querySelector('button[aria-label="Light code theme"]')
            ?.textContent?.trim(),
          codeThemes,
          darkTheme: document.querySelector('input[aria-label="Dark"]')?.checked,
          dockIcon: document
            .querySelector('input[aria-label="Use ChatGPT Dock icon"]')
            ?.checked,
          fontSmoothing: document
            .querySelector('[role="switch"][aria-label="Font smoothing"]')
            ?.getAttribute("aria-checked"),
          lightContrast: Number(
            document.querySelector('input[aria-label="Light contrast"]')?.value,
          ),
          lightSidebar: document
            .querySelector(
              '[role="switch"][aria-label="Light translucent sidebar"]',
            )
            ?.getAttribute("aria-checked"),
          markers: document
            .querySelector('button[aria-label="Plus / minus diff markers"]')
            ?.getAttribute("aria-pressed"),
          motion: document
            .querySelector('button[aria-label="On"]')
            ?.getAttribute("aria-pressed"),
          pointer: document
            .querySelector('[role="switch"][aria-label="Use pointer cursors"]')
            ?.getAttribute("aria-checked"),
          sizes: Array.from(
            document.querySelectorAll(
              '.codex-ui-appearance-settings input[type="number"]',
            ),
            (input) => Number(input.value),
          ),
        }), codeThemes);
        if (
          interaction.codeThemes.length !== 16 ||
          interaction.codeThemes[0] !== "Absolutely" ||
          interaction.codeThemes[15] !== "Xcode" ||
          !interaction.codeTheme?.includes("GitHub") ||
          interaction.darkTheme !== true ||
          interaction.dockIcon !== true ||
          interaction.fontSmoothing !== "false" ||
          interaction.lightContrast !== 51 ||
          interaction.lightSidebar !== "false" ||
          interaction.markers !== "true" ||
          interaction.motion !== "true" ||
          interaction.pointer !== "true" ||
          JSON.stringify(interaction.sizes) !== JSON.stringify([15, 13])
        ) {
          throw new Error(
            `${scene.id}: current Appearance Settings interaction failed: ${JSON.stringify(interaction)}`,
          );
        }
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify({ appearance, interaction }, null, 2)}\n`,
      );
      continue;
    }
    if (scene.id === "current-dark-shell") {
      const darkShell = await page.evaluate(() => {
        const metric = (selector) => {
          const element = document.querySelector(selector);
          if (!(element instanceof HTMLElement)) return null;
          const value = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            height: value.height,
            width: value.width,
          };
        };
        const control = (label) => {
          const element = document.querySelector(`[aria-label="${label}"]`);
          if (!(element instanceof HTMLButtonElement)) return null;
          const value = element.getBoundingClientRect();
          return {
            cursor: getComputedStyle(element).cursor,
            disabled: element.disabled,
            height: value.height,
            width: value.width,
          };
        };
        return {
          back: control("Back"),
          colorScheme: getComputedStyle(document.documentElement).colorScheme,
          composer: metric(".codex-ui-composer"),
          composerIcons: Array.from(
            document.querySelectorAll(
              ".codex-ui-composer [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          contextIcons: Array.from(
            document.querySelectorAll(
              ".codex-ui-conversation-context-bar [data-current-build-icon]",
            ),
            (icon) => icon.getAttribute("data-current-build-icon"),
          ),
          forward: control("Forward"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          htmlTheme: document.documentElement.dataset.theme,
          main: metric(".codex-ui-app-shell__main"),
          newChatCurrent: document
            .querySelector(".demo-sidebar-new-chat")
            ?.getAttribute("aria-current"),
          rootTheme: document
            .querySelector(".demo-root")
            ?.getAttribute("data-theme"),
          sidebar: metric(".codex-ui-app-shell__sidebar"),
          workspace: metric(".demo-workspace-route"),
        };
      });
      if (
        darkShell.colorScheme !== "dark" ||
        darkShell.htmlTheme !== "dark" ||
        darkShell.rootTheme !== "dark" ||
        darkShell.horizontalOverflow > 1 ||
        darkShell.main?.backgroundColor !== "rgb(24, 24, 24)" ||
        darkShell.workspace?.backgroundColor !== "rgb(24, 24, 24)" ||
        darkShell.main?.width !== 906 ||
        darkShell.workspace?.height !== 774 ||
        darkShell.sidebar?.width !== 274 ||
        darkShell.sidebar?.height !== 820 ||
        darkShell.composer?.width !== 736 ||
        darkShell.composer?.height !== 98 ||
        darkShell.newChatCurrent !== "page" ||
        !darkShell.back?.disabled ||
        darkShell.back.cursor !== "not-allowed" ||
        darkShell.back.width !== 28 ||
        darkShell.back.height !== 28 ||
        !darkShell.forward?.disabled ||
        darkShell.forward.cursor !== "not-allowed" ||
        darkShell.forward.width !== 28 ||
        darkShell.forward.height !== 28 ||
        JSON.stringify(darkShell.contextIcons) !==
          JSON.stringify([
            "composer-project",
            "workspace-run-location-local",
            "composer-branch",
          ]) ||
        JSON.stringify(darkShell.composerIcons) !==
          JSON.stringify([
            "composer-add-files",
            "composer-permission",
            "composer-model-chevron",
            "composer-dictate",
            "composer-voice",
          ])
      ) {
        throw new Error(
          `Current dark shell contract failed: ${JSON.stringify(darkShell)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, "current-dark-shell.json"),
        `${JSON.stringify(darkShell, null, 2)}\n`,
      );
    }
    if (scene.id.startsWith("projects-index-")) {
      const projectIndex = await page.evaluate(() => {
        const index = document.querySelector(".codex-ui-project-index");
        const bounds = (element) => {
          if (!(element instanceof HTMLElement)) return null;
          const rect = element.getBoundingClientRect();
          return {
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          };
        };
        const updated = document.querySelector(
          ".codex-ui-project-index__updated",
        );
        const updatedHeader = [
          ...document.querySelectorAll(
            ".codex-ui-project-index__columns button",
          ),
        ].find((element) => element.textContent?.trim() === "Updated");
        const actionLabels = Array.from(
          document.querySelectorAll(
            ".codex-ui-project-index__item-actions button:first-child",
          ),
          (button) => button.getAttribute("aria-label"),
        );
        return {
          actionLabels,
          actions: actionLabels.length,
          columns: getComputedStyle(
            document.querySelector(".codex-ui-project-index__columns"),
          ).gridTemplateColumns,
          create: bounds(document.querySelector(".demo-projects-create")),
          expandedGroups: document.querySelectorAll(
            '.codex-ui-project-index__recent[aria-label^="Recent chats in"]',
          ).length,
          firstWrapper: bounds(
            document.querySelector("[data-project-row-wrapper]"),
          ),
          header: bounds(document.querySelector("[data-projects-header]")),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          index: bounds(index),
          layout: index?.getAttribute("data-layout"),
          rows: Array.from(
            document.querySelectorAll("[data-project-row]"),
            bounds,
          ),
          search: bounds(document.querySelector(".demo-projects-search")),
          searchInput: bounds(
            document.querySelector('.codex-ui-project-index input[type="search"]'),
          ),
          searchPlaceholder: document
            .querySelector('.codex-ui-project-index input[type="search"]')
            ?.getAttribute("placeholder"),
          title: {
            bounds: bounds(
              document.querySelector(".codex-ui-project-index__header h3"),
            ),
            text: document
              .querySelector(".codex-ui-project-index__header h3")
              ?.textContent?.trim(),
          },
          toggles: document.querySelectorAll(
            '[aria-label^="Expand project "], [aria-label^="Collapse project "]',
          ).length,
          updatedDisplay: updated ? getComputedStyle(updated).display : null,
          updatedHeaderDisplay: updatedHeader
            ? getComputedStyle(updatedHeader).display
            : null,
          view: document.querySelector(".demo-root")?.getAttribute("data-view"),
          viewport: { height: innerHeight, width: innerWidth },
        };
      });
      const compact = scene.id === "projects-index-compact";
      const expanded = scene.id === "projects-index-expanded";
      if (
        projectIndex.view !== "projects" ||
        projectIndex.layout !== "table" ||
        projectIndex.title.text !== "Projects" ||
        projectIndex.searchPlaceholder !== "Search projects" ||
        projectIndex.horizontalOverflow > 1 ||
        projectIndex.rows.length !== 14 ||
        projectIndex.rows.some(({ height }) => height !== 70) ||
        projectIndex.actions !== 14 ||
        projectIndex.actionLabels.some(
          (label) => !label?.startsWith("Project actions for "),
        ) ||
        new Set(projectIndex.actionLabels).size !== 14 ||
        projectIndex.toggles !== 14 ||
        projectIndex.expandedGroups !== (expanded ? 1 : 0) ||
        projectIndex.firstWrapper?.height !== (expanded ? 119 : 71) ||
        projectIndex.create?.height !== 28 ||
        Math.abs((projectIndex.create?.top ?? Infinity) - 9) > 1 ||
        projectIndex.title.bounds?.height !== 33.59375 ||
        Math.abs((projectIndex.title.bounds?.top ?? Infinity) - 66) > 0.1 ||
        projectIndex.search?.height !== 32 ||
        Math.abs((projectIndex.search?.top ?? Infinity) - 120) > 0.1 ||
        projectIndex.searchInput?.height !== 18 ||
        Math.abs((projectIndex.searchInput?.top ?? Infinity) - 127) > 0.1 ||
        projectIndex.header?.height !== 40 ||
        Math.abs((projectIndex.header?.top ?? Infinity) - 179.578125) > 0.1 ||
        (compact
          ? projectIndex.viewport.width !== 600 ||
            projectIndex.viewport.height !== 600 ||
            projectIndex.index?.width !== 600 ||
            projectIndex.index?.height !== 554 ||
            projectIndex.title.bounds?.left !== 28 ||
            projectIndex.search?.left !== 20 ||
            projectIndex.search?.width !== 560 ||
            projectIndex.header?.left !== 20 ||
            projectIndex.header?.width !== 560 ||
            projectIndex.columns !== "416px 128px" ||
            projectIndex.rows[0]?.left !== 20 ||
            projectIndex.rows[0]?.width !== 560 ||
            projectIndex.updatedDisplay !== "none" ||
            projectIndex.updatedHeaderDisplay !== "none"
          : projectIndex.viewport.width !== 1180 ||
            projectIndex.viewport.height !== 820 ||
            projectIndex.index?.height !== 774 ||
            projectIndex.title.bounds?.left !== 367 ||
            projectIndex.search?.left !== 359 ||
            projectIndex.search?.width !== 736 ||
            projectIndex.header?.left !== 359 ||
            projectIndex.header?.width !== 736 ||
            projectIndex.columns !== "512px 64px 128px" ||
            projectIndex.rows[0]?.left !== 359 ||
            projectIndex.rows[0]?.width !== 736 ||
            projectIndex.updatedDisplay === "none" ||
            projectIndex.updatedHeaderDisplay === "none")
      ) {
        throw new Error(
          `Current projects index contract failed: ${JSON.stringify(projectIndex)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(projectIndex, null, 2)}\n`,
      );
      continue;
    }
    if (
      scene.scenario === "streaming-recovery" &&
      [
        "retrying",
        "retrying-progress",
        "recovered",
        "transport-failed",
        "transport-retried",
      ].includes(scene.id)
    ) {
      const transport = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const text = (element) =>
          element?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        const root = document.querySelector(".demo-root");
        const streamNotices = Array.from(
          document.querySelectorAll(".codex-ui-stream-notice"),
          (notice) => {
            const icon = notice.querySelector(
              ".codex-ui-stream-notice__icon",
            );
            const style = getComputedStyle(notice);
            return {
              details: text(
                notice.querySelector(".codex-ui-stream-notice__details"),
              ),
              icon: rect(icon),
              id: notice.getAttribute("data-item-id"),
              role: notice.getAttribute("role"),
              style: {
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
              },
              text: text(notice),
            };
          },
        );
        const systemErrors = Array.from(
          document.querySelectorAll(".codex-ui-system-error-notice"),
          (notice) => ({
            id: notice.getAttribute("data-item-id"),
            role: notice.getAttribute("role"),
            text: text(notice),
          }),
        );
        return {
          assistantAfterFailure: text(
            document.querySelector(
              '[data-item-id="assistant-after-failure"]',
            ),
          ),
          composerDisabled:
            document
              .querySelector('[aria-label="Message composer"]')
              ?.hasAttribute("disabled") ?? null,
          frame: root?.getAttribute("data-frame"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          status: root?.getAttribute("data-status"),
          sendCount: Array.from(document.querySelectorAll("button")).filter(
            (button) =>
              button.getAttribute("aria-label") === "Send" ||
              button.textContent?.trim() === "Send",
          ).length,
          stopCount: Array.from(document.querySelectorAll("button")).filter(
            (button) =>
              button.getAttribute("aria-label") === "Stop" ||
              button.textContent?.trim() === "Stop",
          ).length,
          streamNotices,
          systemErrors,
        };
      });
      const retrying = scene.id === "retrying";
      const retryingProgress = scene.id === "retrying-progress";
      const failed = scene.id === "transport-failed";
      const retried = scene.id === "transport-retried";
      const expectedStatus =
        retrying || retryingProgress
          ? "retrying"
          : failed
            ? "failed"
            : "completed";
      const expectedRetryText = retryingProgress
        ? "Server is busy, reconnecting 2/5The server is still busy; retrying the same response stream."
        : "Server is busy, reconnecting 1/5The response stream disconnected before completion.";
      if (
        transport.frame !== scene.frame ||
        transport.status !== expectedStatus ||
        transport.horizontalOverflow > 1 ||
        transport.streamNotices.length !== 1 ||
        transport.streamNotices[0].role !== "status" ||
        transport.streamNotices[0].style.fontSize !== "14px" ||
        transport.streamNotices[0].style.lineHeight !== "21px" ||
        Math.abs((transport.streamNotices[0].icon?.width ?? 0) - 16) > 1 ||
        Math.abs((transport.streamNotices[0].icon?.height ?? 0) - 20) > 1 ||
        ((retrying || retryingProgress) &&
          transport.streamNotices[0].text !== expectedRetryText) ||
        (failed || retried
          ? transport.systemErrors.length !== 1 ||
            transport.systemErrors[0].role !== "alert" ||
            transport.systemErrors[0].text !==
              "Response stream disconnected before completion."
          : transport.systemErrors.length !== 0) ||
        transport.composerDisabled !== false ||
        transport.stopCount !== (retrying || retryingProgress ? 1 : 0) ||
        transport.sendCount !== (retrying || retryingProgress ? 0 : 1) ||
        (retried
          ? transport.assistantAfterFailure !==
            "The follow-up completed without losing the prior recovery history."
          : transport.assistantAfterFailure !== null)
      ) {
        throw new Error(
          `${scene.id}: transport lifecycle contract failed: ${JSON.stringify(transport)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}-transport.json`),
        `${JSON.stringify(transport, null, 2)}\n`,
      );
    }
    if (
      currentReplayComposerScenarios.has(scene.scenario) ||
      currentApprovalComposerScenes.has(scene.id)
    ) {
      const currentComposerIcons = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            ".codex-ui-composer__actions [data-current-build-icon], .codex-ui-composer__controls [data-current-build-icon]",
          ),
          (icon) => {
            const value = icon.getBoundingClientRect();
            return {
              height: value.height,
              name: icon.getAttribute("data-current-build-icon"),
              width: value.width,
            };
          },
        ),
      );
      const expectedCurrentComposerIcons = [
        { height: 16, name: "composer-add-files", width: 16 },
        {
          height: 16,
          name: scene.scenario.startsWith("mcp-")
            ? "composer-permission"
            : "composer-permission-ask",
          width: 16,
        },
        { height: 14, name: "composer-model-chevron", width: 14 },
        { height: 16, name: "composer-dictate", width: 16 },
      ];
      if (
        JSON.stringify(currentComposerIcons) !==
        JSON.stringify(expectedCurrentComposerIcons)
      ) {
        throw new Error(
          `${scene.id}: current replay Composer assets failed: ${JSON.stringify(currentComposerIcons)}`,
        );
      }
      currentReplayComposerContracts.push({
        icons: currentComposerIcons,
        scene: scene.id,
      });
    }
    if (scene.id === "mcp-current-integration-unavailable") {
      const unavailable = await page.evaluate(() => {
        const rect = (element) => {
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const unavailableMessage = document.querySelector(
          '[data-item-id="assistant-current-integration-unavailable"]',
        );
        const unavailableStyle = unavailableMessage
          ? getComputedStyle(unavailableMessage)
          : null;
        const timeline = document.querySelector(
          ".codex-ui-activity-timeline",
        );
        return {
          commentary: document
            .querySelector(
              '[data-item-id="assistant-current-integration-unavailable-intro"]',
            )
            ?.textContent?.replace(/\s+/g, " ")
            .trim(),
          composer: rect(document.querySelector(".codex-ui-composer")),
          groupCount: document.querySelectorAll(
            ".codex-ui-mcp-tool-call-group",
          ).length,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          message: {
            rect: rect(unavailableMessage),
            style: unavailableStyle
              ? {
                  color: unavailableStyle.color,
                  fontFamily: unavailableStyle.fontFamily,
                  fontSize: unavailableStyle.fontSize,
                  fontWeight: unavailableStyle.fontWeight,
                  lineHeight: unavailableStyle.lineHeight,
                  webkitFontSmoothing:
                    unavailableStyle.webkitFontSmoothing,
                }
              : null,
            text: unavailableMessage?.textContent?.trim(),
          },
          timelineExpanded:
            timeline?.getAttribute("data-expanded") === "true",
          timelineLabel: timeline
            ?.querySelector(".codex-ui-activity-timeline__toggle")
            ?.textContent?.trim(),
          viewport: { height: innerHeight, width: innerWidth },
        };
      });
      if (
        unavailable.viewport.width !== 1180 ||
        unavailable.viewport.height !== 820 ||
        unavailable.horizontalOverflow > 1 ||
        unavailable.groupCount !== 0 ||
        !unavailable.timelineExpanded ||
        unavailable.timelineLabel !== scene.timelineLabel ||
        !unavailable.commentary?.includes("GitHub MCP") ||
        unavailable.message.text !==
          "GitHub MCP integration is unavailable." ||
        unavailable.message.rect?.width !== 736 ||
        unavailable.message.style?.fontFamily !==
          '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
        unavailable.message.style?.fontSize !== "14px" ||
        unavailable.message.style?.fontWeight !== "445" ||
        unavailable.message.style?.lineHeight !== "22px" ||
        unavailable.message.style?.webkitFontSmoothing !== "antialiased" ||
        unavailable.composer?.width !== 736 ||
        unavailable.composer?.height !== 98
      ) {
        throw new Error(
          `${scene.id}: unavailable integration contract failed: ${JSON.stringify(unavailable)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(unavailable, null, 2)}\n`,
      );
      continue;
    }
    if (
      scene.view === "workspace" &&
      (scene.frame === "workspace-persisted-thread" ||
        scene.frame === "workspace-directory-missing")
    ) {
      await page.waitForTimeout(50);
      const contract = await page.evaluate(() => {
        const rect = (element) => {
          if (!(element instanceof Element)) return null;
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
        const notice = document.querySelector(
          ".codex-ui-working-directory-notice",
        );
        const heading = notice?.querySelector(
          ".codex-ui-working-directory-notice__heading",
        );
        const message = notice?.querySelector(
          ".codex-ui-working-directory-notice__message",
        );
        const composer = document.querySelector(
          ".demo-workspace-persisted-composer > .codex-ui-composer",
        );
        const persistedTask = Array.from(
          document.querySelectorAll(".codex-ui-app-sidebar__item"),
        ).find(
          (element) =>
            element.textContent?.trim() === "Verify worktree persistence",
        );
        const persistedRow = persistedTask?.closest(
          ".codex-ui-app-sidebar__item-row",
        );
        const worktreeMarker = persistedRow?.querySelector(
          ".codex-ui-app-sidebar__item-worktree-indicator svg",
        );
        const summary = document.querySelector(
          ".demo-workspace-thread-summary",
        );
        const noticeStyle = notice ? getComputedStyle(notice) : null;
        const headingStyle = heading ? getComputedStyle(heading) : null;
        const messageStyle = message ? getComputedStyle(message) : null;
        const textarea = composer?.querySelector("textarea");
        return {
          composer: rect(composer),
          frame: root?.getAttribute("data-frame"),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          messages: Array.from(
            document.querySelectorAll(
              ".demo-workspace-persisted-thread .codex-ui-agent-message",
            ),
            (element) => ({
              role: element.getAttribute("data-role"),
              text: element.textContent?.trim(),
            }),
          ),
          notice: notice
            ? {
                heading: heading?.textContent?.trim(),
                message: message?.textContent?.trim(),
                rect: rect(notice),
                style: {
                  backgroundColor: noticeStyle?.backgroundColor,
                  borderRadius: noticeStyle?.borderRadius,
                  boxShadow: noticeStyle?.boxShadow,
                  fontSize: noticeStyle?.fontSize,
                  gap: noticeStyle?.gap,
                  lineHeight: noticeStyle?.lineHeight,
                  padding: noticeStyle?.padding,
                },
                headingStyle: {
                  fontWeight: headingStyle?.fontWeight,
                },
                messageStyle: {
                  color: messageStyle?.color,
                },
              }
            : null,
          selectedTask: persistedTask
            ? {
                current: persistedTask.getAttribute("aria-current"),
                describedBy: persistedTask.getAttribute("aria-describedby"),
                rect: rect(persistedRow),
                selected: persistedTask.getAttribute("data-selected"),
                worktreeStatus:
                  persistedTask.getAttribute("data-worktree-status"),
              }
            : null,
          summary: summary
            ? {
                items: Array.from(
                  summary.querySelectorAll(
                    ".codex-ui-thread-summary-item__label",
                  ),
                  (element) => element.textContent?.trim(),
                ),
                rect: rect(summary),
              }
            : null,
          textarea: textarea
            ? {
                ariaLabel: textarea.getAttribute("aria-label"),
                disabled: textarea.disabled,
              }
            : null,
          title: document
            .querySelector(".demo-workspace-persisted-title")
            ?.textContent?.trim(),
          view: root?.getAttribute("data-view"),
          worktreeMarker: rect(worktreeMarker),
        };
      });
      const missingExpected =
        scene.frame === "workspace-directory-missing";
      const expectedMessages = missingExpected ? 4 : 2;
      const expectedSummaryItems = [
        "Changes",
        "Worktree",
        "main",
        "Commit or push",
        missingExpected ? "Pull request status unavailable" : "No pull request",
        "Create a file or site",
      ];
      if (
        contract.view !== "workspace" ||
        contract.frame !== scene.frame ||
        contract.horizontalOverflow > 1 ||
        contract.title !== "Verify worktree persistence" ||
        contract.messages.length !== expectedMessages ||
        contract.messages.at(0)?.role !== "user" ||
        contract.messages.at(1)?.role !== "assistant" ||
        !contract.composer ||
        Math.abs(contract.composer.width - 736) > 1 ||
        Math.abs(contract.composer.height - 98) > 1 ||
        contract.textarea?.ariaLabel !== "Do anything" ||
        contract.textarea?.disabled ||
        contract.selectedTask?.current !== "page" ||
        contract.selectedTask?.selected !== "true" ||
        contract.selectedTask?.worktreeStatus !== "restored" ||
        Math.abs((contract.selectedTask?.rect?.height ?? 0) - 30) > 1 ||
        Math.abs((contract.worktreeMarker?.width ?? 0) - 14) > 1 ||
        Math.abs((contract.worktreeMarker?.height ?? 0) - 14) > 1 ||
        !contract.summary ||
        Math.abs(contract.summary.rect.width - 240) > 1 ||
        Math.abs(contract.summary.rect.height - 225) > 1 ||
        JSON.stringify(contract.summary.items) !==
          JSON.stringify(expectedSummaryItems) ||
        Boolean(contract.notice) !== missingExpected
      ) {
        throw new Error(
          `${scene.id}: persisted workspace contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        missingExpected &&
        (contract.notice?.heading !== "Current working directory missing" ||
          contract.notice?.message !==
            "This chat's working directory no longer exists" ||
          Math.abs((contract.notice?.rect?.width ?? 0) - 736) > 1 ||
          Math.abs((contract.notice?.rect?.height ?? 0) - 37.125) > 0.2 ||
          contract.notice?.style.borderRadius !== "20px" ||
          contract.notice?.style.backgroundColor !== "rgb(24, 24, 24)" ||
          contract.notice?.style.fontSize !== "13px" ||
          contract.notice?.style.gap !== "8px" ||
          contract.notice?.style.lineHeight !== "21.125px" ||
          contract.notice?.style.padding !== "8px 8px 8px 12px" ||
          contract.notice?.headingStyle.fontWeight !== "600")
      ) {
        throw new Error(
          `${scene.id}: working-directory notice contract failed: ${JSON.stringify(contract.notice)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      continue;
    }
    if (scene.view === "workspace") {
      await page.waitForTimeout(50);
      const contract = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
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
        const start = document.querySelector(
          ".codex-ui-new-conversation-start",
        );
        const composer = document.querySelector(
          ".demo-workspace-start .codex-ui-composer",
        );
        const heading = document.querySelector(
          ".demo-workspace-start .codex-ui-new-conversation-start__header h3",
        );
        const prompt = document.querySelector(
          ".demo-workspace-start .demo-workspace-prompts > button",
        );
        const prompts = Array.from(
          document.querySelectorAll(
            ".demo-workspace-start .demo-workspace-prompts > button",
          ),
          (button) => rect(button),
        );
        const context = document.querySelector(
          ".demo-workspace-start .codex-ui-conversation-context-bar",
        );
        const contextButtons = Array.from(
          context?.querySelectorAll("button") ?? [],
          (button) => ({
            disabled: button.disabled,
            expanded: button.getAttribute("aria-expanded"),
            haspopup: button.getAttribute("aria-haspopup"),
            kind: button.getAttribute("data-kind"),
            rect: rect(button),
          }),
        );
        const currentIcons = Array.from(
          start?.querySelectorAll("[data-current-build-icon]") ?? [],
          (icon) => ({
            name: icon.getAttribute("data-current-build-icon"),
            rect: rect(icon),
          }),
        );
        const projectDialog = document.querySelector(
          ".demo-workspace-project-dialog",
        );
        const projectListbox = projectDialog?.querySelector(
          '[role="listbox"]',
        );
        const environmentMenu = document.querySelector(
          ".demo-workspace-environment-menu[role=\"menu\"]",
        );
        const environmentButtons = Array.from(
          environmentMenu?.querySelectorAll(".codex-ui-menu-item") ?? [],
          (button) => ({
            disabled:
              button.getAttribute("aria-disabled") === "true" ||
              (button instanceof HTMLButtonElement && button.disabled),
            href: button.getAttribute("href"),
            label:
              button
                .querySelector(".codex-ui-menu-item__label")
                ?.textContent?.trim() ?? null,
            role: button.getAttribute("role"),
            tag: button.tagName,
          }),
        );
        const worktreeEnvironmentMenu = document.querySelector(
          ".demo-workspace-worktree-environment-menu[role=\"menu\"]",
        );
        const worktreeEnvironmentButtons = Array.from(
          worktreeEnvironmentMenu?.querySelectorAll(
            ".codex-ui-menu-item",
          ) ?? [],
          (button) => ({
            disabled: button.disabled,
            label:
              button
                .querySelector(".codex-ui-menu-item__label")
                ?.textContent?.trim() ?? null,
            role: button.getAttribute("role"),
          }),
        );
        const localEnvironmentDialog = document.querySelector(
          ".codex-ui-local-environment-dialog",
        );
        const localEnvironmentSurface =
          localEnvironmentDialog?.querySelector('[role="dialog"]');
        const localEnvironmentItems = Array.from(
          localEnvironmentDialog?.querySelectorAll(
            ".codex-ui-local-environment-dialog__item",
          ) ?? [],
          (button) => ({
            disabled: button.disabled,
            status: button.getAttribute("data-status"),
          }),
        );
        const worktreeMenu = document.querySelector(
          ".demo-workspace-worktree-menu[role=\"menu\"]",
        );
        const worktreeButtons = Array.from(
          worktreeMenu?.querySelectorAll(".codex-ui-menu-item") ?? [],
          (button) => ({
            checked: button.getAttribute("aria-checked"),
            role: button.getAttribute("role"),
            text: button.textContent?.trim(),
          }),
        );
        const branchCreationDialog = document.querySelector(
          ".codex-ui-branch-creation-dialog",
        );
        const branchCreationSurface =
          branchCreationDialog?.querySelector('[role="dialog"]');
        const branchCreationInput = branchCreationDialog?.querySelector(
          'input[aria-label="Branch name"]',
        );
        const branchCreationSubmit = Array.from(
          branchCreationDialog?.querySelectorAll("button") ?? [],
        ).find(
          (button) =>
            button.textContent?.trim() === "Create and checkout",
        );
        const environmentSettingsPage = document.querySelector(
          ".codex-ui-environment-settings-page",
        );
        const environmentSettingsHeading =
          environmentSettingsPage?.querySelector("h1");
        const environmentSettingsStatusHeading =
          environmentSettingsPage?.querySelector("h2");
        const environmentSettingsStatus =
          environmentSettingsPage?.querySelector('[role="status"]');
        const environmentSettingsMessage =
          environmentSettingsStatus?.querySelector("div");
        const style = (element) => {
          if (!element) return null;
          const computed = getComputedStyle(element);
          return {
            backgroundColor: computed.backgroundColor,
            borderColor: computed.borderColor,
            borderRadius: computed.borderRadius,
            color: computed.color,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            padding: computed.padding,
          };
        };
        return {
          activeElement:
            document.activeElement?.getAttribute("aria-label") ?? null,
          composer: rect(composer),
          branchCreation: branchCreationDialog
            ? {
                error:
                  branchCreationDialog.querySelector('[role="alert"]')
                    ?.textContent ?? null,
                input: rect(branchCreationInput),
                inputValue: branchCreationInput?.value ?? null,
                rect: rect(branchCreationSurface),
                submitDisabled: branchCreationSubmit?.disabled ?? null,
              }
            : null,
          context: rect(context),
          contextButtons,
          currentIcons,
          environmentSettings: environmentSettingsPage
            ? {
                heading: {
                  rect: rect(environmentSettingsHeading),
                  style: style(environmentSettingsHeading),
                  text: environmentSettingsHeading?.textContent?.trim(),
                },
                message: {
                  rect: rect(environmentSettingsMessage),
                  style: style(environmentSettingsMessage),
                  text: environmentSettingsMessage?.textContent?.trim(),
                },
                page: rect(environmentSettingsPage),
                status: {
                  rect: rect(environmentSettingsStatus),
                  style: style(environmentSettingsStatus),
                },
                statusHeading: {
                  rect: rect(environmentSettingsStatusHeading),
                  style: style(environmentSettingsStatusHeading),
                  text: environmentSettingsStatusHeading?.textContent?.trim(),
                },
              }
            : null,
          environment: environmentMenu
            ? {
                buttons: environmentButtons,
                dividerCount: environmentMenu.querySelectorAll(
                  ".demo-workspace-context-menu__divider",
                ).length,
                iconNames: Array.from(
                  environmentMenu.querySelectorAll(
                    "[data-current-build-icon]",
                  ),
                  (icon) => icon.getAttribute("data-current-build-icon"),
                ),
                rect: rect(environmentMenu),
                separatorCount:
                  environmentMenu.querySelectorAll('[role="separator"]')
                    .length,
              }
            : null,
          localEnvironment: localEnvironmentDialog
            ? {
                groupCount: localEnvironmentDialog.querySelectorAll(
                  ".codex-ui-local-environment-dialog__group",
                ).length,
                items: localEnvironmentItems,
                rect: rect(localEnvironmentSurface),
              }
            : null,
          frame: root?.getAttribute("data-frame"),
          heading: rect(heading),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          project: projectDialog
            ? {
                optionCount:
                  projectListbox?.querySelectorAll('[role="option"]')
                    .length ?? 0,
                rect: rect(projectDialog),
                selectedCount:
                  projectListbox?.querySelectorAll(
                    '[role="option"][aria-selected="true"]',
                  ).length ?? 0,
                actionLabels: Array.from(
                  projectDialog.querySelectorAll(
                    ".demo-workspace-project-dialog__actions button",
                  ),
                  (button) => button.textContent?.trim() ?? "",
                ),
                actionIconNames: Array.from(
                  projectDialog.querySelectorAll(
                    ".demo-workspace-project-dialog__actions [data-current-build-icon]",
                  ),
                  (icon) => icon.getAttribute("data-current-build-icon"),
                ),
                listbox: rect(projectListbox),
              }
            : null,
          prompt: rect(prompt),
          prompts,
          start: rect(start),
          view: root?.getAttribute("data-view"),
          worktree: worktreeMenu
            ? {
                buttons: worktreeButtons,
                rect: rect(worktreeMenu),
              }
            : null,
          worktreeEnvironment: worktreeEnvironmentMenu
            ? {
                buttons: worktreeEnvironmentButtons,
                emptyText:
                  worktreeEnvironmentMenu.querySelector(
                    ".demo-workspace-context-menu__empty",
                  )?.textContent ?? null,
                iconNames: Array.from(
                  worktreeEnvironmentMenu.querySelectorAll(
                    "[data-current-build-icon]",
                  ),
                  (icon) => icon.getAttribute("data-current-build-icon"),
                ),
                rect: rect(worktreeEnvironmentMenu),
              }
            : null,
        };
      });
      if (scene.frame === "workspace-environments-unavailable") {
        const settings = contract.environmentSettings;
        if (
          contract.view !== "workspace" ||
          contract.frame !== scene.frame ||
          contract.horizontalOverflow > 1 ||
          !settings ||
          contract.start ||
          contract.composer ||
          contract.context ||
          settings.heading.text !== "Environments" ||
          settings.statusHeading.text !== "Local environments unavailable" ||
          settings.message.text !==
            "We could not load local environment settings for this project" ||
          Math.abs(settings.page.width - 768) > 1 ||
          Math.abs(settings.heading.rect.left - 343) > 1 ||
          Math.abs(settings.heading.rect.top - 66) > 1 ||
          Math.abs(settings.heading.rect.height - 28.8) > 0.2 ||
          settings.heading.style.fontSize !== "24px" ||
          settings.heading.style.fontWeight !== "400" ||
          settings.heading.style.lineHeight !== "28.8px" ||
          Math.abs(settings.statusHeading.rect.top - 136.3) > 0.5 ||
          settings.statusHeading.style.fontSize !== "14px" ||
          settings.statusHeading.style.fontWeight !== "500" ||
          settings.statusHeading.style.lineHeight !== "21px" ||
          Math.abs(settings.status.rect.top - 172.8) > 0.5 ||
          Math.abs(settings.status.rect.width - 768) > 1 ||
          Math.abs(settings.status.rect.height - 44.56) > 0.2 ||
          settings.status.style.backgroundColor !== "rgb(35, 35, 35)" ||
          settings.status.style.borderRadius !== "20px" ||
          settings.message.style.fontSize !== "13px" ||
          settings.message.style.fontWeight !== "445" ||
          settings.message.style.padding !== "12px"
        ) {
          throw new Error(
            `${scene.id}: workspace environment settings contract failed: ${JSON.stringify(contract)}`,
          );
        }
        await writeFile(
          join(artifactDirectory, `${scene.id}.json`),
          `${JSON.stringify(contract, null, 2)}\n`,
        );
        continue;
      }
      const projectExpected = scene.frame === "workspace-project-menu";
      const environmentExpected =
        scene.frame === "workspace-environment-menu";
      const localEnvironmentExpected =
        scene.frame === "workspace-environment";
      const worktreeExpected = scene.frame === "workspace-worktree-menu";
      const branchCreationExpected = [
        "workspace-branch-create",
        "workspace-branch-create-error",
      ].includes(scene.frame);
      const worktreeEnvironmentExpected =
        scene.frame === "workspace-environment-picker";
      const noProjectExpected = scene.frame === "workspace-no-project";
      const newWorktreeExpected =
        scene.frame === "workspace-new-worktree" ||
        worktreeEnvironmentExpected;
      const compactExpected = scene.frame === "workspace-compact-ready";
      const expectedContextButtonCount = noProjectExpected
        ? 1
        : newWorktreeExpected
          ? 4
          : 3;
      const expectedComposerWidth = compactExpected ? 688 : 736;
      const expectedComposerLeft = compactExpected ? 16 : 358;
      const expectedComposerBottom = compactExpected ? 664 : 804;
      const expectedHeadingTop = compactExpected ? 299 : 363;
      const repairingExpected = scene.frame === "workspace-repairing";
      const worktreeTrigger = contract.contextButtons.find(
        ({ kind }) => kind === "worktree",
      );
      const expectedCurrentIconNames = [
        "composer-project",
        ...(noProjectExpected
          ? []
          : newWorktreeExpected
            ? [
                "workspace-run-location-worktree",
                "workspace-environment-settings",
                "composer-branch",
              ]
            : ["workspace-run-location-local", "composer-branch"]),
        ...(projectExpected
          ? ["composer-new-project", "composer-clear-project"]
          : []),
        "composer-add-files",
        "composer-permission",
        "composer-model-chevron",
        "composer-dictate",
        "composer-voice",
      ];
      if (
        contract.view !== "workspace" ||
        contract.frame !== scene.frame ||
        contract.horizontalOverflow > 1 ||
        !contract.start ||
        !contract.composer ||
        !contract.context ||
        !contract.heading ||
        contract.contextButtons.length !== expectedContextButtonCount ||
        Math.abs(contract.composer.width - expectedComposerWidth) > 1 ||
        Math.abs(contract.composer.height - 98) > 1 ||
        Math.abs(contract.composer.left - expectedComposerLeft) > 1 ||
        Math.abs(contract.composer.bottom - expectedComposerBottom) > 1 ||
        Math.abs(contract.heading.top - expectedHeadingTop) > 1 ||
        Math.abs(contract.heading.height - 33.6) > 1 ||
        contract.prompts.length !== (noProjectExpected ? 0 : 2) ||
        contract.prompts.some(
          (value) =>
            !value ||
            Math.abs(value.width - (compactExpected ? 606 : 654)) > 1 ||
            Math.abs(value.height - 40) > 1,
        ) ||
        contract.contextButtons.some(
          ({ rect: value }) => !value || Math.abs(value.height - 28) > 1,
        ) ||
        Boolean(contract.project) !== projectExpected ||
        Boolean(contract.environment) !== environmentExpected ||
        Boolean(contract.localEnvironment) !==
          localEnvironmentExpected ||
        Boolean(contract.worktree) !== worktreeExpected ||
        Boolean(contract.branchCreation) !== branchCreationExpected ||
        Boolean(contract.worktreeEnvironment) !==
          worktreeEnvironmentExpected ||
        Boolean(worktreeTrigger?.disabled) !== repairingExpected ||
        JSON.stringify(
          contract.currentIcons.map(({ name }) => name),
        ) !== JSON.stringify(expectedCurrentIconNames) ||
        contract.currentIcons.some(({ name, rect: value }) => {
          const expectedSize =
            name === "composer-model-chevron" ? 14 : 16;
          return (
            !value ||
            Math.abs(value.width - expectedSize) > 1 ||
            Math.abs(value.height - expectedSize) > 1
          );
        })
      ) {
        throw new Error(
          `${scene.id}: workspace entry contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        branchCreationExpected &&
        (!contract.branchCreation ||
          Math.abs(contract.branchCreation.rect.width - 400) > 1 ||
          Math.abs(contract.branchCreation.input.width - 360) > 1 ||
          Math.abs(contract.branchCreation.input.height - 40) > 1 ||
          contract.activeElement !== "Branch name" ||
          (scene.frame === "workspace-branch-create" &&
            (contract.branchCreation.inputValue !== "" ||
              contract.branchCreation.submitDisabled !== true ||
              contract.branchCreation.error !== null)) ||
          (scene.frame === "workspace-branch-create-error" &&
            (contract.branchCreation.inputValue !== "main" ||
              contract.branchCreation.submitDisabled !== false ||
              contract.branchCreation.error !==
                "A branch named main already exists.")))
      ) {
        throw new Error(
          `${scene.id}: workspace branch creation dialog failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        projectExpected &&
        (!contract.project ||
          Math.abs(contract.project.rect.width - 260) > 1 ||
          Math.abs(contract.project.rect.height - 249.5) > 0.2 ||
          Math.abs(contract.project.listbox.width - 252) > 1 ||
          Math.abs(contract.project.listbox.height - 142.81) > 0.2 ||
          contract.project.optionCount !== 14 ||
          contract.project.selectedCount !== 1 ||
          JSON.stringify(contract.project.actionLabels) !==
            JSON.stringify([
              "New project",
              "Don't work in a project",
            ]) ||
          JSON.stringify(contract.project.actionIconNames) !==
            JSON.stringify([
              "composer-new-project",
              "composer-clear-project",
            ]) ||
          contract.activeElement !== "Search projects" ||
          contract.contextButtons[0]?.expanded !== "true" ||
          contract.contextButtons[0]?.haspopup !== "dialog")
      ) {
        throw new Error(
          `${scene.id}: workspace project dialog failed: ${JSON.stringify(contract)}`,
        );
      }
      if (projectExpected) {
        const projectDialog = page.getByRole("dialog", {
          name: "Choose a project",
        });
        const search = projectDialog.getByRole("searchbox", {
          name: "Search projects",
        });
        await search.fill("__codex_ui_kit_no_project__");
        if (
          (await projectDialog.getByRole("option").count()) !== 0 ||
          !(await projectDialog
            .getByText("No projects found", { exact: true })
            .isVisible()) ||
          (await projectDialog
            .getByRole("button", { name: "New project" })
            .count()) !== 1 ||
          (await projectDialog
            .getByRole("button", { name: "Don't work in a project" })
            .count()) !== 1
        ) {
          throw new Error(
            `${scene.id}: workspace empty project search did not preserve both fixed actions.`,
          );
        }
        await page.keyboard.press("Escape");
        const originalTrigger = page.getByRole("button", {
          name: "Change project: codex-ui-kit",
        });
        await originalTrigger.waitFor({ state: "visible" });
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Change project: codex-ui-kit",
        );
        await originalTrigger.click();
        await projectDialog
          .getByRole("button", { name: "Don't work in a project" })
          .click();
        await page.waitForSelector(
          '.demo-root[data-frame="workspace-no-project"]',
        );
        const chooseProject = page.getByRole("button", {
          name: "Choose project",
        });
        await chooseProject.click();
        await projectDialog
          .getByRole("option", { name: "Select project codex-ui-kit" })
          .click();
        await page.waitForSelector(
          '.demo-root[data-frame="workspace-ready"]',
        );
        await page.getByRole("button", {
          name: "Change project: codex-ui-kit",
        }).waitFor({ state: "visible" });
      }
      if (
        environmentExpected &&
        (!contract.environment ||
          Math.abs(contract.environment.rect.width - 216) > 1 ||
          Math.abs(contract.environment.rect.height - 189.31) > 1 ||
          contract.environment.buttons.length !== 5 ||
          JSON.stringify(
            contract.environment.buttons.map(({ label }) => label),
          ) !==
            JSON.stringify([
              "Local",
              "New worktree",
              "Connect Codex web",
              "Send to cloud",
              "Usage remaining",
            ]) ||
          JSON.stringify(
            contract.environment.buttons.map(({ role }) => role),
          ) !== JSON.stringify(Array(5).fill("menuitem")) ||
          JSON.stringify(
            contract.environment.buttons.map(({ tag }) => tag),
          ) !==
            JSON.stringify(["BUTTON", "BUTTON", "A", "BUTTON", "BUTTON"]) ||
          contract.environment.buttons[2]?.href !==
            "https://chatgpt.com/codex/cloud" ||
          contract.environment.buttons.filter(({ disabled }) => disabled)
            .length !== 1 ||
          contract.environment.dividerCount !== 1 ||
          contract.environment.separatorCount !== 0 ||
          JSON.stringify(contract.environment.iconNames) !==
            JSON.stringify([
              "workspace-run-location-local",
              "workspace-selection-check",
              "workspace-run-location-worktree",
              "workspace-run-location-codex-web",
              "workspace-run-location-external",
              "workspace-run-location-send-cloud",
              "workspace-run-location-usage",
              "workspace-run-location-usage-chevron",
            ]))
      ) {
        throw new Error(
          `${scene.id}: workspace environment dialog failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        localEnvironmentExpected &&
        (!contract.localEnvironment ||
          Math.abs(contract.localEnvironment.rect.width - 600) > 1 ||
          Math.abs(contract.localEnvironment.rect.height - 600) > 1 ||
          contract.localEnvironment.groupCount !== 1 ||
          contract.localEnvironment.items.length !== 3 ||
          contract.localEnvironment.items.filter(({ disabled }) => disabled)
            .length !== 1 ||
          contract.localEnvironment.items.filter(
            ({ status }) => status === "repairing",
          ).length !== 1 ||
          contract.activeElement !== "Search local environments")
      ) {
        throw new Error(
          `${scene.id}: workspace local environment dialog failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        worktreeEnvironmentExpected &&
        (!contract.worktreeEnvironment ||
          Math.abs(contract.worktreeEnvironment.rect.width - 264) > 1 ||
          Math.abs(contract.worktreeEnvironment.rect.height - 126) > 1 ||
          contract.worktreeEnvironment.buttons.length !== 2 ||
          contract.worktreeEnvironment.emptyText?.trim() !==
            "No environments found" ||
          JSON.stringify(
            contract.worktreeEnvironment.buttons.map(({ label }) => label),
          ) !==
            JSON.stringify([
              "Work without environment",
              "Environment settings",
            ]) ||
          JSON.stringify(
            contract.worktreeEnvironment.buttons.map(({ role }) => role),
          ) !== JSON.stringify(["menuitem", "menuitem"]) ||
          JSON.stringify(contract.worktreeEnvironment.iconNames) !==
            JSON.stringify([
              "workspace-selection-check",
              "workspace-environment-settings",
            ]))
      ) {
        throw new Error(
          `${scene.id}: workspace environment picker failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        worktreeExpected &&
        (!contract.worktree ||
          Math.abs(contract.worktree.rect.width - 296) > 1 ||
          Math.abs(contract.worktree.rect.height - 280) > 1 ||
          contract.worktree.buttons.length !== 9 ||
          contract.worktree.buttons.filter(
            ({ role }) => role === "menuitemradio",
          ).length !== 7 ||
          !contract.worktree.buttons.some(({ text }) =>
            text?.includes("Select local environment…"),
          ) ||
          contract.worktree.buttons.filter(
            ({ checked }) => checked === "true",
          ).length !== 1 ||
          contract.activeElement !== "Search branches")
      ) {
        throw new Error(
          `${scene.id}: workspace worktree menu failed: ${JSON.stringify(contract)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      continue;
    }

    if (scene.id.startsWith("app-server-crashed")) {
      await page.waitForTimeout(50);
      const contract = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
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
        const text = (element) =>
          element?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        const root = document.querySelector(".demo-root");
        const recovery = document.querySelector(
          ".codex-ui-app-server-crash-recovery",
        );
        const content = recovery?.querySelector(
          ".codex-ui-app-server-crash-recovery__content",
        );
        const copy = recovery?.querySelector(
          ".codex-ui-app-server-crash-recovery__copy",
        );
        const icon = recovery?.querySelector(
          ".codex-ui-app-server-crash-recovery__icon",
        );
        const buttons = Array.from(
          recovery?.querySelectorAll("button") ?? [],
          (button) => ({
            kind: button.getAttribute("data-kind"),
            label: text(button),
            rect: rect(button),
            style: {
              backgroundColor: getComputedStyle(button).backgroundColor,
              border: getComputedStyle(button).border,
              color: getComputedStyle(button).color,
              fontSize: getComputedStyle(button).fontSize,
              fontWeight: getComputedStyle(button).fontWeight,
              lineHeight: getComputedStyle(button).lineHeight,
            },
          }),
        );
        return {
          appServerState: root?.getAttribute("data-app-server-state"),
          buttons,
          content: rect(content),
          copy: rect(copy),
          description: text(content?.querySelector("p")),
          descriptionStyle: content?.querySelector("p")
            ? {
                color: getComputedStyle(content.querySelector("p")).color,
                fontSize: getComputedStyle(content.querySelector("p")).fontSize,
                lineHeight: getComputedStyle(content.querySelector("p")).lineHeight,
              }
            : null,
          heading: text(content?.querySelector("h1")),
          headingStyle: content?.querySelector("h1")
            ? {
                fontSize: getComputedStyle(content.querySelector("h1")).fontSize,
                fontWeight: getComputedStyle(content.querySelector("h1")).fontWeight,
                lineHeight: getComputedStyle(content.querySelector("h1")).lineHeight,
              }
            : null,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          icon: rect(icon),
          mainCount: document.querySelectorAll(
            ".codex-ui-app-shell__main",
          ).length,
          recovery: rect(recovery),
          role: content?.getAttribute("role"),
          shellCount: document.querySelectorAll(".codex-ui-app-shell").length,
        };
      });
      if (
        contract.appServerState !== "crashed" ||
        contract.role !== "alert" ||
        contract.heading !== "ChatGPT stopped unexpectedly" ||
        contract.description !==
          "Restart ChatGPT to continue. If the problem persists, check your configuration or visit the documentation" ||
        JSON.stringify(contract.buttons.map(({ label }) => label)) !==
          JSON.stringify([
            "documentation",
            "Update ChatGPT",
            "Open Config.toml",
            "Restart",
          ]) ||
        contract.buttons[0].kind !== null ||
        JSON.stringify(contract.buttons.slice(1).map(({ kind }) => kind)) !==
          JSON.stringify(["update", "configuration", "restart"]) ||
        contract.shellCount !== 0 ||
        contract.mainCount !== 0 ||
        contract.horizontalOverflow > 1 ||
        !contract.recovery ||
        Math.abs(contract.recovery.width - (scene.windowSize?.width ?? 1180)) > 1 ||
        Math.abs(contract.recovery.height - (scene.windowSize?.height ?? 820)) > 1 ||
        !contract.icon ||
        Math.abs(contract.icon.width - 28) > 1 ||
        Math.abs(contract.icon.height - 28) > 1 ||
        !contract.content ||
        Math.abs(
          contract.content.width - Math.min(contract.recovery.width, 896)
        ) > 1 ||
        !contract.copy ||
        Math.abs(contract.copy.width - Math.min(contract.recovery.width - 48, 448)) > 1 ||
        contract.headingStyle?.fontSize !== "16px" ||
        contract.headingStyle?.fontWeight !== "500" ||
        contract.headingStyle?.lineHeight !== "24px" ||
        contract.descriptionStyle?.fontSize !== "13px" ||
        contract.descriptionStyle?.lineHeight !== "18.5714px" ||
        JSON.stringify(contract.buttons.slice(1).map(({ rect }) => rect?.height)) !==
          JSON.stringify([24, 24, 24]) ||
        JSON.stringify(contract.buttons.slice(1).map(({ rect }) => rect?.width)) !==
          JSON.stringify([141.21875, 125.453125, 62.25]) ||
        JSON.stringify(contract.buttons.slice(1).map(({ style }) => style)) !==
          JSON.stringify([
            {
              backgroundColor: "rgb(255, 255, 255)",
              border: "1px solid rgba(255, 255, 255, 0.082)",
              color: "rgb(45, 45, 45)",
              fontSize: "13px",
              fontWeight: "445",
              lineHeight: "18px",
            },
            {
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.082)",
              color: "rgb(255, 255, 255)",
              fontSize: "13px",
              fontWeight: "445",
              lineHeight: "18px",
            },
            {
              backgroundColor: "rgb(255, 255, 255)",
              border: "1px solid rgba(255, 255, 255, 0.082)",
              color: "rgb(45, 45, 45)",
              fontSize: "13px",
              fontWeight: "445",
              lineHeight: "18px",
            },
          ])
      ) {
        throw new Error(
          `${scene.id}: app-server crash contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (scene.id === "app-server-crashed") {
        await page.getByRole("button", { name: "Restart", exact: true }).click();
        await page.waitForFunction(() => {
          const root = document.querySelector(".demo-root");
          return (
            root?.getAttribute("data-app-server-state") === "running" &&
            root?.getAttribute("data-frame") === "app-server-restarted" &&
            document.querySelector(".codex-ui-app-shell") !== null
          );
        });
        contract.restart = await page.evaluate(() => ({
          appServerState: document
            .querySelector(".demo-root")
            ?.getAttribute("data-app-server-state"),
          frame: document
            .querySelector(".demo-root")
            ?.getAttribute("data-frame"),
          mainCount: document.querySelectorAll(
            ".codex-ui-app-shell__main",
          ).length,
          shellCount: document.querySelectorAll(".codex-ui-app-shell").length,
        }));
        if (
          contract.restart.appServerState !== "running" ||
          contract.restart.frame !== "app-server-restarted" ||
          contract.restart.mainCount !== 1 ||
          contract.restart.shellCount !== 1
        ) {
          throw new Error(
            `${scene.id}: app-server restart failed: ${JSON.stringify(contract)}`,
          );
        }
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      continue;
    }

    if (scene.view === "shell") {
      await page.waitForTimeout(50);
      const contract = await page.evaluate(() => {
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
        const chrome = document.querySelector(".codex-ui-app-window-chrome");
        const main = document.querySelector(".codex-ui-app-shell__main");
        const outlet = document.querySelector(".codex-ui-app-route-outlet");
        const controls = Array.from(
          chrome?.querySelectorAll("button") ?? [],
          (button) => {
            const icon = button.querySelector("[data-current-build-icon]");
            return {
              disabled: button.disabled,
              iconName: icon?.getAttribute("data-current-build-icon"),
              iconRect: icon ? rect(icon) : null,
              label: button.getAttribute("aria-label"),
              rect: rect(button),
            };
          },
        );
        if (!root || !shell || !chrome || !main || !outlet) {
          throw new Error("App shell continuity surfaces are missing.");
        }
        const liveState = outlet.querySelector(
          ':scope > [role="status"], :scope > [role="alert"]',
        );
        const notificationRegion = document.querySelector(
          ".codex-ui-app-notification-region",
        );
        const notifications = Array.from(
          document.querySelectorAll(".codex-ui-app-notification"),
          (notification) => ({
            position: notification.getAttribute("aria-posinset"),
            role: notification.getAttribute("role"),
            setSize: notification.getAttribute("aria-setsize"),
            text: notification.textContent?.replace(/\s+/g, " ").trim(),
          }),
        );
        return {
          chrome: {
            rect: rect(chrome),
            style: {
              appRegion: getComputedStyle(chrome).getPropertyValue(
                "-webkit-app-region",
              ),
              borderColor: getComputedStyle(chrome).borderBottomColor,
              display: getComputedStyle(chrome).display,
            },
          },
          controls,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          main: rect(main),
          notification: notifications[0]
            ? {
                role: notifications[0].role,
                text: notifications[0].text,
              }
            : null,
          notificationRegion: notificationRegion
            ? {
                hiddenCount: notificationRegion.getAttribute(
                  "data-hidden-count",
                ),
                position: notificationRegion.getAttribute("data-position"),
                rect: rect(notificationRegion),
                totalCount: notificationRegion.getAttribute(
                  "data-total-count",
                ),
                visibleCount: notificationRegion.getAttribute(
                  "data-visible-count",
                ),
              }
            : null,
          notifications,
          outlet: {
            busy: outlet.getAttribute("aria-busy"),
            contentBusy:
              outlet
                .querySelector(".codex-ui-app-route-outlet__content")
                ?.getAttribute("aria-busy") ?? null,
            preserved: outlet.hasAttribute("data-preserves-content"),
            rect: rect(outlet),
            role: liveState?.getAttribute("role") ?? null,
            status: outlet.getAttribute("data-status"),
          },
          selectedRoutes: Array.from(
            document.querySelectorAll(
              '.codex-ui-app-sidebar__item[aria-current="page"]',
            ),
            (element) => element.textContent?.trim(),
          ),
          shell: rect(shell),
          shellState: root.getAttribute("data-shell-state"),
          view: root.getAttribute("data-view"),
        };
      });
      const expectedRole =
        scene.shellState === "offline" ? "alert" :
        scene.shellState === "ready" ? null : "status";
      if (
        contract.view !== "shell" ||
        contract.shellState !== scene.shellState ||
        contract.outlet.status !== scene.shellState ||
        contract.outlet.role !== expectedRole ||
        contract.horizontalOverflow > 1 ||
        contract.selectedRoutes.length !== 1 ||
        contract.selectedRoutes[0] !== "Pull requests" ||
        Math.abs(contract.chrome.rect.height - 46) > 1 ||
        Math.abs(contract.outlet.rect.top - 46) > 1 ||
        Math.abs(contract.outlet.rect.bottom - contract.shell.bottom) > 1 ||
        contract.controls.length !== 3 ||
        contract.controls[0].label !== "Hide sidebar" ||
        contract.controls[0].iconName !== "window-chrome-sidebar" ||
        contract.controls[1].label !== "Back" ||
        contract.controls[1].iconName !== "window-chrome-back" ||
        contract.controls[2].label !== "Forward" ||
        contract.controls[2].iconName !== "window-chrome-forward" ||
        Math.abs(contract.controls[0].rect.left - 88) > 1 ||
        Math.abs(contract.controls[1].rect.left - 120) > 1 ||
        Math.abs(contract.controls[2].rect.left - 152) > 1 ||
        !contract.controls[1].disabled ||
        contract.controls.some(
          ({ iconRect }) =>
            !iconRect ||
            Math.abs(iconRect.width - 16) > 1 ||
            Math.abs(iconRect.height - 16) > 1,
        ) ||
        !contract.controls[2].disabled ||
        contract.chrome.style.display !== "grid"
      ) {
        throw new Error(
          `${scene.id}: app shell continuity contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        contract.outlet.busy !== null ||
        (scene.shellState === "reconnecting" &&
          contract.outlet.contentBusy !== "true") ||
        (scene.shellState !== "reconnecting" &&
          contract.outlet.contentBusy !== null) ||
        ((scene.shellState === "stale") !== contract.outlet.preserved) ||
        ((scene.id === "shell-restored" ||
          scene.id === "shell-notification-queue") !==
          Boolean(contract.notification))
      ) {
        throw new Error(
          `${scene.id}: route lifecycle state failed: ${JSON.stringify(contract)}`,
        );
      }
      if (scene.id === "shell-notification-queue") {
        if (
          contract.notificationRegion?.position !== "bottom-end" ||
          contract.notificationRegion.totalCount !== "4" ||
          contract.notificationRegion.visibleCount !== "3" ||
          contract.notificationRegion.hiddenCount !== "1" ||
          contract.notifications.length !== 3 ||
          JSON.stringify(contract.notifications.map(({ position }) => position)) !==
            JSON.stringify(["1", "2", "3"]) ||
          contract.notifications.some(({ setSize }) => setSize !== "4") ||
          contract.notifications[0].text !==
            "Permission requiredA local command is waiting for approval.Review"
        ) {
          throw new Error(
            `${scene.id}: notification queue contract failed: ${JSON.stringify(contract)}`,
          );
        }
        await page.getByRole("button", { name: "Review", exact: true }).click();
        await page.waitForFunction(() => {
          const root = document.querySelector(".demo-root");
          const region = document.querySelector(
            ".codex-ui-app-notification-region",
          );
          return (
            root?.getAttribute("data-notification-action") ===
              "permission-reviewed" &&
            region?.getAttribute("data-total-count") === "3" &&
            region?.getAttribute("data-hidden-count") === "0"
          );
        });
        await page.waitForTimeout(20);
        const focus = await page.evaluate(() => ({
          action: document
            .querySelector(".demo-root")
            ?.getAttribute("data-notification-action"),
          activeLabel: document.activeElement?.textContent
            ?.replace(/\s+/g, " ")
            .trim(),
          hiddenCount: document
            .querySelector(".codex-ui-app-notification-region")
            ?.getAttribute("data-hidden-count"),
          totalCount: document
            .querySelector(".codex-ui-app-notification-region")
            ?.getAttribute("data-total-count"),
        }));
        if (
          focus.action !== "permission-reviewed" ||
          focus.activeLabel !== "Open" ||
          focus.totalCount !== "3" ||
          focus.hiddenCount !== "0"
        ) {
          throw new Error(
            `${scene.id}: notification queue focus failed: ${JSON.stringify(focus)}`,
          );
        }
        contract.afterAction = focus;
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      continue;
    }

    if (scene.scenario.startsWith("subagent-")) {
      await page.waitForTimeout(50);
      const contract = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
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
        const style = (element) => {
          if (!element) return null;
          const value = getComputedStyle(element);
          return {
            borderRadius: value.borderRadius,
            fontSize: value.fontSize,
            gap: value.gap,
            lineHeight: value.lineHeight,
            padding: value.padding,
            position: value.position,
            visibility: value.visibility,
          };
        };
        const text = (element) =>
          element?.textContent?.replace(/\s+/g, " ").trim() ?? null;
        const root = document.querySelector(".demo-root");
        const shell = document.querySelector(".codex-ui-app-shell");
        const sidebar = document.querySelector(
          ".codex-ui-app-shell__sidebar",
        );
        const main = document.querySelector(".codex-ui-app-shell__main");
        const side = document.querySelector(
          ".codex-ui-app-shell__side-panel",
        );
        const summary = document.querySelector(
          ".demo-subagent-summary-panel",
        );
        const timelines = [
          ...document.querySelectorAll(
            ".demo-subagent-activity-timeline",
          ),
        ];
        const activities = [
          ...document.querySelectorAll(
            ".codex-ui-subagent-activity, .codex-ui-subagent-activity-group",
          ),
        ];
        const panel = document.querySelector(
          '[data-testid="subagent-panel"]',
        );
        const panelHeading = panel?.querySelector(
          ".codex-ui-subagent-panel__section h2",
        );
        const panelRow = panel?.querySelector(
          ".codex-ui-subagent-panel__item",
        );
        const transcript = document.querySelector(
          '[data-testid="subagent-transcript"]',
        );
        const panelTab = document.querySelector(
          '.demo-subagent-workspace-panel [role="tab"]',
        );
        return {
          activity: {
            rect: rect(activities[0]),
            texts: activities.map((item) => text(item)),
          },
          frame: root?.getAttribute("data-frame") ?? null,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          main: rect(main),
          panel: {
            heading: rect(panelHeading),
            headingStyle: style(panelHeading),
            rect: rect(panel),
            row: rect(panelRow),
            rowNames: panel
              ? [
                  ...panel.querySelectorAll(
                    ".codex-ui-subagent-panel__item-heading > span:first-child",
                  ),
                ].map((item) => text(item))
              : [],
            rowTimes: panel
              ? [...panel.querySelectorAll("time")].map((item) => ({
                  dateTime: item.getAttribute("datetime"),
                  text: text(item),
                }))
              : [],
            rowStyle: style(panelRow),
            sectionCount:
              panel?.querySelectorAll(
                ".codex-ui-subagent-panel__section",
              ).length ?? 0,
            text: text(panel),
          },
          panelTab: {
            rect: rect(panelTab),
            selected: panelTab?.getAttribute("aria-selected") ?? null,
            text: text(panelTab),
          },
          shell: rect(shell),
          side: {
            rect: rect(side),
            style: style(side),
          },
          sidebar: rect(sidebar),
          status: root?.getAttribute("data-status") ?? null,
          summary: {
            rect: rect(summary),
            text: text(summary),
          },
          timeline: {
            rect: rect(timelines[0]),
            text: text(timelines[0]),
            texts: timelines.map((item) => text(item)),
          },
          transcript: {
            actions: Boolean(
              transcript?.querySelector(
                '[aria-label="Subagent response actions"]',
              ),
            ),
            back: Boolean(
              transcript?.querySelector(
                ".codex-ui-subagent-transcript-header__back",
              ),
            ),
            rect: rect(transcript),
            text: text(transcript),
          },
          viewport: { height: window.innerHeight, width: window.innerWidth },
        };
      });
      const mixed = scene.frame.includes("mixed");
      const recovery = scene.scenario === "subagent-recovery";
      const recoveryStreaming = recovery && scene.frame.includes("streaming");
      const recoveryTerminal = recovery && !recoveryStreaming;
      const running = scene.frame.includes("running") || mixed || recovery;
      const summaryOpen = scene.frame.includes("summary");
      const panelOpen =
        scene.frame.includes("panel") ||
        scene.frame.includes("compact") ||
        scene.frame.includes("transcript");
      const transcriptOpen = scene.frame.includes("transcript");
      const compact820 = scene.frame.endsWith("compact-820");
      const compact720 = scene.frame.endsWith("compact-720");
      const expectedViewportWidth = compact820 ? 820 : compact720 ? 720 : 1180;
      const expectedSideWidth = compact820
        ? 319
        : compact720
          ? 329.3125
          : 369.28125;
      const expectedSideLeft = compact820
        ? 501
        : compact720
          ? 390.6875
          : 810.71875;
      const concurrent = scene.scenario === "subagent-concurrency";
      const nested = scene.scenario === "subagent-nested";
      const activeCount = recovery
        ? recoveryStreaming
          ? 12
          : 0
        : running
          ? mixed
            ? 1
            : concurrent || nested
              ? 2
              : 1
          : 0;
      const doneCount = recovery
        ? recoveryTerminal
          ? 12
          : 0
        : mixed
          ? 1
          : running
            ? 0
            : concurrent || nested
              ? 2
              : 1;
      const expectedActivities = recovery
        ? recoveryStreaming
          ? ["PlannerStreamerValidatorand 9 other subagents updated"]
          : ["PlannerStreamerValidatorand 9 other subagents interrupted"]
        : !running
        ? []
        : concurrent
          ? ["AlphaBetastarted working"]
          : nested
            ? mixed
              ? ["Child finished", "Parent started working"]
              : ["Child started working", "Parent started working"]
            : ["Long probe started working"];
      const recoveryRows = [
        "Planner",
        "Streamer",
        "Validator",
        "Reviewer",
        "Tester",
        "Reporter",
        "Indexer",
        "Auditor",
        "Mapper",
        "Reader",
      ];
      const expectedPanelRows = recovery
        ? recoveryStreaming
          ? recoveryRows.slice(0, 4)
          : recoveryRows
        : concurrent
        ? ["Beta", "Alpha"]
        : nested
          ? mixed || !running
            ? ["Parent", "Child"]
            : ["Child", "Parent"]
          : ["Long probe"];
      const expectedPanelTimes = recovery
        ? expectedPanelRows.map(() => (recoveryStreaming ? "0s" : "1m ago"))
        : !running
        ? expectedPanelRows.map(() => "1m ago")
        : mixed
          ? ["0s", "1m ago"]
          : expectedPanelRows.map(() => "0s");
      const expectedCompletedDuration = concurrent
        ? "Worked for 1m 19s"
        : nested
          ? "Worked for 1m 2s"
          : "Worked for 45s";
      if (
        contract.frame !== scene.frame ||
        contract.status !== (running ? "running" : "completed") ||
        contract.viewport.width !== expectedViewportWidth ||
        contract.viewport.height !== (compact820 || compact720 ? 680 : 820) ||
        contract.horizontalOverflow > 1 ||
        !contract.shell ||
        !contract.main ||
        !contract.sidebar ||
        !contract.side.rect ||
        !contract.timeline.rect ||
        Boolean(contract.summary.rect) !== summaryOpen ||
        Boolean(contract.transcript.rect) !== transcriptOpen ||
        (panelOpen && !transcriptOpen && !contract.panel.rect)
      ) {
        throw new Error(
          `${scene.id}: subagent surface contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        JSON.stringify(contract.activity.texts) !==
          JSON.stringify(expectedActivities) ||
        (running &&
          (contract.timeline.texts.length !== expectedActivities.length ||
            expectedActivities.some(
              (expected, index) =>
                !contract.timeline.texts[index]?.endsWith(expected),
            ))) ||
        (!running &&
          (contract.timeline.text !== expectedCompletedDuration ||
            contract.timeline.texts.length !== 1))
      ) {
        throw new Error(
          `${scene.id}: subagent lifecycle contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        summaryOpen &&
        (!contract.summary.rect ||
          Math.abs(contract.summary.rect.left - 804) > 1 ||
          Math.abs(contract.summary.rect.top - 45) > 1 ||
          Math.abs(contract.summary.rect.width - 300) > 1 ||
          Math.abs(contract.summary.rect.height - 241) > 1 ||
          !contract.summary.text?.includes("Outputs") ||
          !contract.summary.text?.includes("Subagents") ||
          !contract.summary.text?.includes(
            [
              activeCount > 0 ? `${activeCount} working` : null,
              doneCount > 0 ? `${doneCount} done` : null,
            ]
              .filter(Boolean)
              .join(" "),
          ) ||
          !contract.summary.text?.includes("Sources"))
      ) {
        throw new Error(
          `${scene.id}: subagent summary contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        panelOpen &&
        (!contract.side.rect ||
          Math.abs(contract.side.rect.left - expectedSideLeft) > 1 ||
          Math.abs(contract.side.rect.width - expectedSideWidth) > 1 ||
          contract.side.rect.right !== expectedViewportWidth ||
          contract.side.style?.visibility !== "visible" ||
          (compact820 || compact720
            ? contract.side.style?.position !== "absolute"
            : contract.side.style?.position !== "static") ||
          contract.panelTab.selected !== "true" ||
          contract.panelTab.text !== "Subagents")
      ) {
        throw new Error(
          `${scene.id}: subagent side-panel geometry failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        panelOpen &&
        !transcriptOpen &&
        (!contract.panel.rect ||
          JSON.stringify(contract.panel.rowNames) !==
            JSON.stringify(expectedPanelRows) ||
          JSON.stringify(contract.panel.rowTimes.map(({ text }) => text)) !==
            JSON.stringify(expectedPanelTimes) ||
          contract.panel.rowTimes.some(
            ({ dateTime }) => dateTime !== null,
          ) ||
          contract.panel.sectionCount !==
            (recovery ? (recoveryStreaming ? 1 : 2) : running && !mixed ? 1 : 2) ||
          !contract.panel.text?.includes(
            `Active · ${activeCount}`,
          ) ||
          !contract.panel.text?.includes(
            recovery
              ? recoveryStreaming
                ? "Parsed 4 of 12 lifecycle events."
                : "Validation failed: fixture mismatch."
              : concurrent
              ? mixed
                ? "clarifying command execution constraints"
                : running
                  ? "Working"
                  : "BETA SUBAGENT DONE"
              : nested
                ? mixed
                  ? "CHILD SUBAGENT DONE"
                  : running
                    ? "Working"
                    : "PARENT SUBAGENT DONE."
                : running
                  ? "Working"
                  : "SUBAGENT LONG PROBE DONE",
          ) ||
          (doneCount > 0 &&
            !contract.panel.text?.includes(`Done · ${doneCount}`)) ||
          contract.panel.headingStyle?.fontSize !== "13px" ||
          contract.panel.headingStyle?.lineHeight !== "18.5712px" ||
          contract.panel.headingStyle?.padding !== "0px 8px" ||
          contract.panel.rowStyle?.padding !== "8px" ||
          contract.panel.rowStyle?.gap !== "12px" ||
          contract.panel.rowStyle?.borderRadius !== "12.5px")
      ) {
        throw new Error(
          `${scene.id}: subagent list contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        transcriptOpen &&
        (!contract.transcript.back ||
          !contract.transcript.actions ||
          !contract.transcript.text?.includes(
            recovery
              ? "Validator"
              : concurrent
              ? scene.frame.endsWith("alpha")
                ? "Alpha"
                : "Beta"
              : nested
                ? scene.frame.endsWith("parent")
                  ? "Parent"
                  : "Child"
                : "Long probe",
          ) ||
          !contract.transcript.text?.includes(
            recovery
              ? "Validation failed: fixture mismatch."
              : concurrent
              ? scene.frame.endsWith("alpha")
                ? "ALPHA SUBAGENT DONE"
                : "BETA SUBAGENT DONE"
              : nested
                ? scene.frame.endsWith("parent")
                  ? "PARENT SUBAGENT DONE."
                  : "CHILD SUBAGENT DONE"
                : "SUBAGENT LONG PROBE DONE",
          ))
      ) {
        throw new Error(
          `${scene.id}: subagent transcript contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        compact820 &&
        (contract.sidebar.width !== 274 || contract.main.width !== 227)
      ) {
        throw new Error(
          `${scene.id}: 820px continuity contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        compact720 &&
        (contract.sidebar.width !== 0 || contract.main.width !== 720)
      ) {
        throw new Error(
          `${scene.id}: 720px continuity contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (recovery && panelOpen && !transcriptOpen) {
        const moreButton = page.getByRole("button", {
          name: recoveryStreaming ? "Show 4 more" : "Show 2 more",
        });
        await moreButton.click();
        const visibleAfterFirstPage = await page
          .locator(".codex-ui-subagent-panel__item")
          .count();
        if (visibleAfterFirstPage !== (recoveryStreaming ? 8 : 12)) {
          throw new Error(
            `${scene.id}: first subagent pagination step failed: ${visibleAfterFirstPage}`,
          );
        }
        if (recoveryStreaming) {
          await page.getByRole("button", { name: "Show 4 more" }).click();
          const visibleAfterSecondPage = await page
            .locator(".codex-ui-subagent-panel__item")
            .count();
          if (visibleAfterSecondPage !== 12) {
            throw new Error(
              `${scene.id}: second subagent pagination step failed: ${visibleAfterSecondPage}`,
            );
          }
        }
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(contract, null, 2)}\n`,
      );
      continue;
    }

    if (scene.view === "pull-request") {
      if (scene.id !== "pull-request-detail") {
        const lifecycle = await page.evaluate(() => {
          const rect = (element) => {
            if (!element) return null;
            const value = element.getBoundingClientRect();
            return {
              height: value.height,
              left: value.left,
              top: value.top,
              width: value.width,
            };
          };
          const root = document.querySelector(".demo-root");
          const shell = document.querySelector(".codex-ui-app-shell");
          const indexState = document.querySelector(
            ".demo-pr-index > .codex-ui-pull-request-query-state",
          );
          const detailState = document.querySelector(
            ".demo-pr-panel .codex-ui-pull-request-query-state",
          );
          const merge = document.querySelector(
            ".codex-ui-pull-request-merge-readiness",
          );
          const review = document.querySelector(
            ".codex-ui-pull-request-review-composer",
          );
          const comment = document.querySelector(
            ".codex-ui-pull-request-comment-composer",
          );
          const mergeButton = Array.from(
            document.querySelectorAll(
              ".demo-pr-panel .codex-ui-workspace-panel__actions > button",
            ),
          ).find((button) =>
            ["Merge", "Merged", "Merging…"].includes(
              button.textContent?.trim() ?? "",
            ),
          );
          return {
            comment: comment
              ? {
                  busy: comment.getAttribute("aria-busy"),
                  feedback:
                    comment.querySelector(
                      ".codex-ui-pull-request-submission-feedback",
                    )?.textContent ?? null,
                  status: comment.getAttribute("data-status"),
                }
              : null,
            detail: detailState
              ? {
                  busy: detailState.getAttribute("aria-busy"),
                  role: detailState.getAttribute("role"),
                  status: detailState.getAttribute("data-status"),
                }
              : null,
            frame: root?.getAttribute("data-frame"),
            horizontalOverflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            index: indexState
              ? {
                  busy: indexState.getAttribute("aria-busy"),
                  skeletons: indexState.querySelectorAll(
                    ".codex-ui-pull-request-query-state__skeleton",
                  ).length,
                  status: indexState.getAttribute("data-status"),
                }
              : null,
            layoutMode: shell?.getAttribute("data-layout-mode"),
            main: rect(
              document.querySelector(".codex-ui-app-shell__main"),
            ),
            mainInert: document
              .querySelector(".codex-ui-app-shell__main")
              ?.hasAttribute("inert"),
            merge: merge?.getAttribute("data-status") ?? null,
            mergeButton: mergeButton
              ? {
                  disabled: mergeButton.disabled,
                  label: mergeButton.textContent?.trim() ?? null,
                }
              : null,
            panel: rect(
              document.querySelector(
                ".codex-ui-app-shell__side-panel",
              ),
            ),
            panelOpen: shell?.hasAttribute("data-side-panel-open"),
            resizer: rect(
              document.querySelector(
                ".codex-ui-app-shell__side-panel-resizer",
              ),
            ),
            review: review
              ? {
                  busy: review.getAttribute("aria-busy"),
                  feedback:
                    review.querySelector(
                      ".codex-ui-pull-request-submission-feedback",
                    )?.textContent ?? null,
                  status: review.getAttribute("data-status"),
                }
              : null,
            runningChecks: document.querySelectorAll(
              '.codex-ui-pull-request-checks li[data-status="running"]',
            ).length,
            selectedTab:
              document
                .querySelector(
                  '[aria-label="Pull request view"] [aria-selected="true"]',
                )
                ?.textContent?.trim() ?? null,
            sidebar: rect(
              document.querySelector(".codex-ui-app-shell__sidebar"),
            ),
            sidebarHidden:
              document
                .querySelector(".codex-ui-app-shell__sidebar")
                ?.getAttribute("aria-hidden") === "true",
          };
        });
        const failed =
          lifecycle.frame !== scene.frame ||
          lifecycle.horizontalOverflow > 1 ||
          (scene.frame === "pr-index-loading" &&
            (lifecycle.index?.status !== "loading" ||
              lifecycle.index.busy !== "true" ||
              lifecycle.index.skeletons !== 5 ||
              lifecycle.panelOpen)) ||
          (scene.frame === "pr-index-failed" &&
            (lifecycle.index?.status !== "error" ||
              lifecycle.index.busy !== null ||
              lifecycle.index.skeletons !== 0 ||
              lifecycle.panelOpen)) ||
          (scene.frame === "pr-detail-loading" &&
            (lifecycle.detail?.status !== "loading" ||
              lifecycle.detail.busy !== "true")) ||
          (scene.frame === "pr-detail-failed" &&
            (lifecycle.detail?.status !== "error" ||
              lifecycle.detail.role !== "alert")) ||
          (scene.frame === "pr-checks-running" &&
            (lifecycle.merge !== "checking" ||
              lifecycle.runningChecks !== 2)) ||
          (scene.frame === "pr-review-submitting" &&
            (lifecycle.selectedTab !== "Code" ||
              lifecycle.review?.status !== "submitting" ||
              lifecycle.review.busy !== "true")) ||
          (scene.frame === "pr-comment-failed" &&
            (lifecycle.comment?.status !== "error" ||
              lifecycle.comment.feedback !==
                "The comment was not posted. Try again.")) ||
          (scene.frame === "pr-merge-ready" &&
            (lifecycle.merge !== "ready" ||
              lifecycle.mergeButton?.disabled !== false)) ||
          (scene.frame === "pr-compact-detail" &&
            (lifecycle.layoutMode !== "narrow" ||
              !lifecycle.sidebarHidden ||
              lifecycle.mainInert ||
              Math.abs((lifecycle.main?.width ?? 0) - 720) > 1 ||
              Math.abs((lifecycle.panel?.left ?? 0) - 390) > 1 ||
              Math.abs((lifecycle.panel?.width ?? 0) - 330) > 1 ||
              Math.abs((lifecycle.resizer?.left ?? 0) - 382) > 1 ||
              Math.abs((lifecycle.resizer?.width ?? 0) - 16) > 0.5));
        if (failed) {
          throw new Error(
            `${scene.id}: pull request lifecycle contract failed: ${JSON.stringify(lifecycle)}`,
          );
        }
        let retry = null;
        if (scene.frame === "pr-index-failed") {
          await page
            .getByRole("button", { exact: true, name: "Retry" })
            .click();
          const pending = await page
            .locator(
              '.demo-pr-index > .codex-ui-pull-request-query-state[data-status="loading"]',
            )
            .getAttribute("aria-busy");
          await page.waitForSelector(
            ".demo-pr-index .codex-ui-pull-request-list__item",
          );
          retry = {
            pending,
            readyItems: await page
              .locator(
                ".demo-pr-index .codex-ui-pull-request-list__item",
              )
              .count(),
          };
          if (retry.pending !== "true" || retry.readyItems !== 1) {
            throw new Error(
              `${scene.id}: index retry failed: ${JSON.stringify(retry)}`,
            );
          }
        }
        if (scene.frame === "pr-detail-failed") {
          await page
            .getByRole("button", { exact: true, name: "Retry" })
            .click();
          const pending = await page
            .locator(
              '.demo-pr-panel .codex-ui-pull-request-query-state[data-status="loading"]',
            )
            .getAttribute("aria-busy");
          await page.waitForSelector(
            ".demo-pr-panel .codex-ui-pull-request-panel-summary",
          );
          retry = {
            heading: await page
              .locator(".demo-pr-panel h1")
              .textContent(),
            pending,
          };
          if (
            retry.pending !== "true" ||
            retry.heading?.trim() !==
              "feat: add terminal session lifecycle"
          ) {
            throw new Error(
              `${scene.id}: detail retry failed: ${JSON.stringify(retry)}`,
            );
          }
        }
        await writeFile(
          join(artifactDirectory, `${scene.id}.json`),
          `${JSON.stringify({ ...lifecycle, retry }, null, 2)}\n`,
        );
        continue;
      }

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
        initial.tabCount !== 2 ||
        initial.selectedTab !== "Summary" ||
        initial.heading !== "feat: add terminal session lifecycle" ||
        initial.checkCount !== 0 ||
        Math.abs(initial.main.width - 906) > 1 ||
        Math.abs(initial.panel.width - 370) > 1 ||
        initial.resizer.cursor !== "col-resize" ||
        Math.abs(initial.resizer.rect.width - 16) > 0.5 ||
        initial.resizer.ariaMin !== "322" ||
        initial.resizer.ariaMax !== "516" ||
        initial.resizer.ariaNow !== "370" ||
        !initial.actions.includes("Open in browser") ||
        !initial.actions.includes("Auto-merge") ||
        !initial.actions.includes("Expand panel")
      ) {
        throw new Error(
          `${scene.id}: pull request summary contract failed: ${JSON.stringify(initial)}`,
        );
      }

      if (
        (await page.getByLabel("Pull request timeline").count()) !== 1 ||
        (await page
          .getByLabel("Pull request timeline")
          .locator("article")
          .count()) !== 2
      ) {
        throw new Error(`${scene.id}: integrated timeline is missing.`);
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
      await page.getByRole("button", { name: "Review options" }).click();
      await page
        .getByRole("menuitem", { name: "Open synthetic review" })
        .click();
      await page
        .getByRole("textbox", { name: "Review summary" })
        .fill("Current-head review is clean.");
      await page
        .getByRole("button", { name: "Submit review" })
        .click();
      await page.waitForSelector(
        '.codex-ui-pull-request-review-composer[data-status="submitted"]',
      );
      const mergeAction = page.getByRole("button", {
        exact: true,
        name: "Merge",
      });
      if (!(await mergeAction.isEnabled())) {
        throw new Error(
          `${scene.id}: submitted review did not unlock merge.`,
        );
      }
      await mergeAction.click();
      await page
        .getByRole("button", { exact: true, name: "Merged" })
        .waitFor();
      const reviewSubmission = await page.evaluate(() => ({
        mergeLabel:
          Array.from(
            document.querySelectorAll(
              ".demo-pr-panel .codex-ui-workspace-panel__actions > button",
            ),
          )
            .find((button) => button.textContent?.trim() === "Merged")
            ?.textContent?.trim() ?? null,
        reviewFeedback:
          document.querySelector(
            ".codex-ui-pull-request-review-composer .codex-ui-pull-request-submission-feedback",
          )?.textContent ?? null,
        reviewStatus:
          document
            .querySelector(".codex-ui-pull-request-review-composer")
            ?.getAttribute("data-status") ?? null,
      }));
      if (
        reviewSubmission.reviewStatus !== "submitted" ||
        reviewSubmission.reviewFeedback !== "Review submitted." ||
        reviewSubmission.mergeLabel !== "Merged"
      ) {
        throw new Error(
          `${scene.id}: review and merge lifecycle failed: ${JSON.stringify(reviewSubmission)}`,
        );
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
        Math.abs((expanded.mainWidth ?? 0) - 906) > 1
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
        Math.abs((restored.panelWidth ?? 0) - 370) > 1
      ) {
        throw new Error(
          `${scene.id}: restored pull request panel failed: ${JSON.stringify(restored)}`,
        );
      }
      await page
        .getByRole("textbox", { name: "Comment" })
        .fill("Current-head checks are green.");
      await page
        .getByRole("button", { name: "Post comment" })
        .click();
      await page.waitForSelector(
        '.codex-ui-pull-request-comment-composer[data-status="submitted"]',
      );
      const commentSubmission = await page.evaluate(() => ({
        feedback:
          document.querySelector(
            ".codex-ui-pull-request-comment-composer .codex-ui-pull-request-submission-feedback",
          )?.textContent ?? null,
        status:
          document
            .querySelector(".codex-ui-pull-request-comment-composer")
            ?.getAttribute("data-status") ?? null,
        value:
          document.querySelector(
            ".codex-ui-pull-request-comment-composer textarea",
          )?.value ?? null,
      }));
      if (
        commentSubmission.status !== "submitted" ||
        commentSubmission.feedback !== "Comment posted." ||
        commentSubmission.value !== ""
      ) {
        throw new Error(
          `${scene.id}: comment lifecycle failed: ${JSON.stringify(commentSubmission)}`,
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
      await page.getByRole("button", { name: "Pull requests" }).click();
      await page.waitForSelector(
        '.demo-root[data-view="pull-request"] [data-testid="pull-request-panel"]',
      );
      const routeRestored = await page.evaluate(() => ({
        panelOpen: document
          .querySelector(".codex-ui-app-shell")
          ?.hasAttribute("data-side-panel-open"),
        selectedItem:
          document
            .querySelector(
              ".demo-pr-index .codex-ui-pull-request-list__item[data-selected]",
            )
            ?.textContent?.trim() ?? null,
        selectedTab:
          document
            .querySelector(
              '[aria-label="Pull request view"] [aria-selected="true"]',
            )
            ?.textContent?.trim() ?? null,
        view: document
          .querySelector(".demo-root")
          ?.getAttribute("data-view"),
      }));
      if (
        routeRestored.view !== "pull-request" ||
        !routeRestored.panelOpen ||
        !routeRestored.selectedItem?.includes("#80") ||
        routeRestored.selectedTab !== "Summary"
      ) {
        throw new Error(
          `${scene.id}: pull request route restoration failed: ${JSON.stringify(routeRestored)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(
          {
            expanded,
            commentSubmission,
            initial,
            liveNavigation,
            restored,
            reviewSubmission,
            routeRestored,
          },
          null,
          2,
        )}\n`,
      );
      continue;
    }

    if (scene.id === "mcp-current-integration-recovered-compact") {
      const compactIntegration = await page.evaluate(() => {
        const group = document.querySelector(
          ".codex-ui-mcp-tool-call-group",
        );
        const groupRect = group?.getBoundingClientRect();
        const groupStyle = group ? getComputedStyle(group) : null;
        return {
          callLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
            ),
            (element) => element.textContent?.trim(),
          ),
          clientWidth: document.documentElement.clientWidth,
          groupExpanded:
            group
              ?.querySelector(
                ":scope > .codex-ui-activity__disclosure",
              )
              ?.getAttribute("data-open") === "true",
          groupWidth: groupRect?.width,
          groupWebkitFontSmoothing:
            groupStyle?.webkitFontSmoothing,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          recoveryHref: document
            .querySelector(
              '[data-item-id="assistant-current-integration-recovered"] a',
            )
            ?.getAttribute("href"),
          timelineLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-activity-timeline__toggle",
            ),
            (element) => ({
              expanded: element.getAttribute("aria-expanded"),
              label: element.textContent?.trim(),
            }),
          ),
          unavailableText: document
            .querySelector(
              '[data-item-id="assistant-current-integration-unavailable"]',
            )
            ?.textContent?.trim(),
          visibleNavigation: Array.from(
            document.querySelectorAll("nav"),
          ).some(
            (element) =>
              element instanceof HTMLElement &&
              element.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
          ),
        };
      });
      if (
        compactIntegration.clientWidth !== 720 ||
        compactIntegration.horizontalOverflow > 1 ||
        compactIntegration.visibleNavigation ||
        !compactIntegration.groupExpanded ||
        Math.abs((compactIntegration.groupWidth ?? 0) - 688) > 1 ||
        compactIntegration.groupWebkitFontSmoothing !== "antialiased" ||
        JSON.stringify(compactIntegration.callLabels) !==
          JSON.stringify(["Search OpenAI docs", "Fetch OpenAI doc"]) ||
        JSON.stringify(compactIntegration.timelineLabels) !==
          JSON.stringify([
            { expanded: "true", label: "Worked for 16s" },
            { expanded: "true", label: "Worked for 34s" },
          ]) ||
        compactIntegration.unavailableText !==
          "GitHub MCP integration is unavailable." ||
        compactIntegration.recoveryHref !==
          "https://learn.chatgpt.com/docs/extend/mcp"
      ) {
        throw new Error(
          `${scene.id}: compact integration recovery contract failed: ${JSON.stringify(compactIntegration)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(compactIntegration, null, 2)}\n`,
      );
      continue;
    }

    if (scene.id === "mcp-current-recovery-compact") {
      const compactMcp = await page.evaluate(() => {
        const group = document.querySelector(
          ".codex-ui-mcp-tool-call-group",
        );
        const error = document.querySelector(
          '[data-item-id="mcp-current-fetch-invalid"] .codex-ui-tool-call__error[data-presentation="output"]',
        );
        const cardRect = error?.getBoundingClientRect();
        return {
          callLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-mcp-tool-call-group .codex-ui-tool-call__label",
            ),
            (element) => element.textContent?.trim(),
          ),
          card: cardRect
            ? {
                height: cardRect.height,
                left: cardRect.left,
                width: cardRect.width,
              }
            : null,
          clientWidth: document.documentElement.clientWidth,
          failedExpanded:
            document
              .querySelector(
                '[data-item-id="mcp-current-fetch-invalid"] .codex-ui-activity__disclosure',
              )
              ?.hasAttribute("data-open") ?? false,
          groupExpanded:
            group
              ?.querySelector(
                ":scope > .codex-ui-activity__disclosure",
              )
              ?.hasAttribute("data-open") ?? false,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          visibleNavigation: Array.from(
            document.querySelectorAll("nav"),
          ).some(
            (element) =>
              element instanceof HTMLElement &&
              element.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
          ),
        };
      });
      if (
        compactMcp.clientWidth !== 720 ||
        compactMcp.horizontalOverflow > 1 ||
        compactMcp.visibleNavigation ||
        !compactMcp.groupExpanded ||
        !compactMcp.failedExpanded ||
        JSON.stringify(compactMcp.callLabels) !==
          JSON.stringify([
            "Fetch OpenAI doc",
            "Search OpenAI docs",
            "Fetch OpenAI doc",
          ]) ||
        !compactMcp.card ||
        Math.abs(compactMcp.card.left - 16) > 1 ||
        Math.abs(compactMcp.card.width - 688) > 1 ||
        Math.abs(compactMcp.card.height - 67.3125) > 1
      ) {
        throw new Error(
          `${scene.id}: compact MCP contract failed: ${JSON.stringify(compactMcp)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(compactMcp, null, 2)}\n`,
      );
      continue;
    }

    if (scene.scenario === "current-mixed-tool-thread") {
      const expectedTimelineSurface =
        scene.webSearchCount !== undefined
          ? "search"
          : scene.toolCount !== undefined
            ? "mcp"
            : scene.subagentStatus !== undefined
              ? "subagent"
              : null;
      const mixed = await page.evaluate((timelineSurface) => {
        const rect = (element) => {
          if (!(element instanceof Element)) return null;
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
        const search = document.querySelector(
          ".codex-ui-search-activity",
        );
        const browser = document.querySelector(
          ".codex-ui-browser-activity",
        );
        const mcp = document.querySelector(
          ".codex-ui-mcp-tool-call-group",
        );
        const approval = document.querySelector(
          ".codex-ui-approval-request",
        );
        const subagent = document.querySelector(
          ".codex-ui-subagent-activity",
        );
        const timeline =
          timelineSurface === "search"
            ? search?.closest(".codex-ui-activity-timeline")
            : timelineSurface === "mcp"
              ? mcp?.closest(".codex-ui-activity-timeline")
              : timelineSurface === "subagent"
                ? subagent?.closest(".codex-ui-activity-timeline")
                : null;
        const composer = document.querySelector(".codex-ui-composer");
        return {
          approval: approval
            ? {
                decision: approval.getAttribute("data-decision"),
                text: approval.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
          browser: browser
            ? {
                expanded:
                  browser
                    .querySelector(".codex-ui-activity__disclosure")
                    ?.matches("[open], [data-open]") ?? false,
                status: browser.getAttribute("data-status"),
                stepLabels: Array.from(
                  browser.querySelectorAll(
                    ".codex-ui-browser-activity__steps li",
                  ),
                  (element) => element.textContent?.replace(/\s+/g, " ").trim(),
                ),
              }
            : null,
          compact: {
            clientWidth: document.documentElement.clientWidth,
            composer: rect(composer),
            horizontalOverflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            visibleNavigation: Array.from(
              document.querySelectorAll("nav"),
            ).some(
              (element) =>
                element instanceof HTMLElement &&
                element.checkVisibility({
                  checkOpacity: true,
                  checkVisibilityCSS: true,
                }),
            ),
          },
          file: {
            groupCount: document.querySelectorAll(
              ".codex-ui-file-change-group",
            ).length,
            pathText: document
              .querySelector(".codex-ui-file-change-group")
              ?.textContent?.replace(/\s+/g, " ").trim(),
            reviewFileCount: document.querySelectorAll(
              ".codex-ui-file-review__file",
            ).length,
            reviewOpen:
              shell?.hasAttribute("data-side-panel-open") ?? false,
            reviewPanel: Boolean(
              document.querySelector('[data-testid="review-panel"]'),
            ),
          },
          finalText: document
            .querySelector('[data-item-id="assistant-current-mixed-completed"]')
            ?.textContent?.replace(/\s+/g, " ").trim(),
          frame: root?.getAttribute("data-frame"),
          mcp: mcp
            ? {
                callLabels: Array.from(
                  mcp.querySelectorAll(".codex-ui-tool-call__label"),
                  (element) => element.textContent?.trim(),
                ),
                callStatuses: Array.from(
                  mcp.querySelectorAll(".codex-ui-tool-call"),
                  (element) => element.getAttribute("data-status"),
                ),
                expanded:
                  mcp
                    .querySelector(
                      ":scope > .codex-ui-activity__disclosure",
                    )
                    ?.matches("[open], [data-open]") ?? false,
                label: mcp
                  .querySelector(".codex-ui-mcp-tool-call-group__label")
                  ?.textContent?.trim(),
                rowDisclosures: Array.from(
                  mcp.querySelectorAll(".codex-ui-tool-call"),
                  (element) => {
                    const button = element.querySelector(
                      "button[aria-labelledby]",
                    );
                    const labelledBy = button?.getAttribute("aria-labelledby");
                    return {
                      expanded: button?.getAttribute("aria-expanded") ?? null,
                      label: labelledBy
                        ? document.getElementById(labelledBy)?.textContent?.trim()
                        : null,
                    };
                  },
                ),
                source: mcp.getAttribute("data-source"),
                style: (() => {
                  const header = mcp.querySelector(
                    ":scope > .codex-ui-activity__disclosure > .codex-ui-activity__header",
                  );
                  if (!header) return null;
                  const value = getComputedStyle(header);
                  return {
                    color: value.color,
                    fontFamily: value.fontFamily,
                    fontSize: value.fontSize,
                    fontWeight: value.fontWeight,
                    lineHeight: value.lineHeight,
                  };
                })(),
                toolCount: mcp.querySelectorAll(".codex-ui-tool-call").length,
              }
            : null,
          rootStatus: root?.getAttribute("data-status"),
          search: search
            ? {
                entryLabels: Array.from(
                  search.querySelectorAll(
                    ".codex-ui-search-activity__entries li",
                  ),
                  (element) => element.textContent?.replace(/\s+/g, " ").trim(),
                ),
                expanded:
                  search
                    .querySelector(".codex-ui-activity__disclosure")
                    ?.matches("[open], [data-open]") ?? false,
                status: search.getAttribute("data-status"),
                text: search.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
          subagent: subagent
            ? {
                status: subagent.getAttribute("data-status"),
                text: subagent.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
          timeline: timeline
            ? {
                expanded: timeline.hasAttribute("data-expanded"),
                label: timeline
                  .querySelector(".codex-ui-activity-timeline__toggle")
                  ?.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
        };
      }, expectedTimelineSurface);

      if (
        mixed.frame !== scene.frame ||
        mixed.compact.horizontalOverflow > 1 ||
        (scene.webSearchCount !== undefined &&
          (!mixed.search ||
            mixed.search.status !== scene.webSearchStatus ||
            !mixed.timeline?.expanded ||
            mixed.timeline.label !== scene.timelineLabel ||
            (scene.webSearchStatus === "completed" &&
              (!mixed.search.expanded ||
                !mixed.search.entryLabels.includes("Model Context Protocol") ||
                mixed.search.entryLabels.length !== scene.webSearchCount)))) ||
        (scene.browserStepCount !== undefined &&
          (!mixed.browser ||
            !mixed.browser.expanded ||
            mixed.browser.status !== "completed" ||
            mixed.browser.stepLabels.length !== scene.browserStepCount ||
            JSON.stringify(mixed.browser.stepLabels) !==
              JSON.stringify([
                "Opened https://learn.chatgpt.com/docs/extend/mcp",
                "Found Model Context Protocol in https://learn.chatgpt.com/docs/extend/mcp",
              ]))) ||
        (scene.toolCount !== undefined &&
          (!mixed.mcp ||
            mixed.mcp.toolCount !== scene.toolCount ||
            mixed.mcp.label !== scene.groupLabel ||
            mixed.mcp.source !== "openaiDeveloperDocs" ||
            !mixed.mcp.expanded ||
            mixed.mcp.style?.fontFamily !==
              '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
            mixed.mcp.style.fontSize !== "14px" ||
            mixed.mcp.style.fontWeight !== "445" ||
            mixed.mcp.style.lineHeight !== "21px" ||
            !mixed.mcp.style.color.includes("0.6") ||
            !mixed.timeline?.expanded ||
            mixed.timeline.label !== scene.timelineLabel ||
            JSON.stringify(mixed.mcp.callLabels) !==
              JSON.stringify(scene.callLabels) ||
            mixed.mcp.rowDisclosures.some((disclosure, index) =>
              mixed.mcp.callStatuses[index] === "running"
                ? disclosure.expanded !== null || disclosure.label !== null
                : disclosure.expanded !== "false" ||
                  disclosure.label !== scene.callLabels[index],
            ))) ||
        (scene.approvalDecision !== undefined &&
          (!mixed.approval ||
            mixed.approval.decision !== scene.approvalDecision ||
            !mixed.approval.text?.includes("Run this command?") ||
            !mixed.approval.text.includes(
              "apply_patch research/MIXED_TOOL_THREAD.md",
            ))) ||
        (scene.fileCount !== undefined &&
          (!mixed.file.reviewOpen ||
            !mixed.file.reviewPanel ||
            mixed.file.groupCount !== 1 ||
            mixed.file.reviewFileCount !== scene.fileCount ||
            !mixed.file.pathText?.includes("research/MIXED_TOOL_THREAD.md"))) ||
        (scene.subagentStatus === "active" &&
          (!mixed.subagent ||
            mixed.subagent.status !== "active" ||
            !mixed.subagent.text?.includes("Mixed audit") ||
            !mixed.timeline?.expanded ||
            mixed.timeline.label !== scene.timelineLabel)) ||
        (scene.subagentStatus === "done" &&
          (mixed.rootStatus !== "completed" ||
            !mixed.finalText?.includes("Mixed workflow complete") ||
            !mixed.subagent?.text?.includes("Mixed audit"))) ||
        (scene.windowSize?.width === 720 &&
          (mixed.compact.clientWidth !== 720 ||
            mixed.compact.visibleNavigation ||
            !mixed.compact.composer ||
            Math.abs(mixed.compact.composer.width - 688) > 1))
      ) {
        throw new Error(
          `${scene.id}: current mixed-tool contract failed: ${JSON.stringify(mixed)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(mixed, null, 2)}\n`,
      );
      continue;
    }

    if (scene.id === "current-sidebar-compact-pinned") {
      const compactSidebar = await page.evaluate(() => {
        const shell = document.querySelector(".codex-ui-app-shell");
        const sidebar = document.querySelector(
          ".codex-ui-app-shell__sidebar",
        );
        const main = document.querySelector(".codex-ui-app-shell__main");
        return {
          frame: document
            .querySelector(".demo-root")
            ?.getAttribute("data-frame"),
          helpVisible: Boolean(
            document.querySelector(
              'button[aria-label="Open help menu"]',
            ),
          ),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          layoutMode: shell?.getAttribute("data-layout-mode"),
          main: main
            ? {
                left: main.getBoundingClientRect().left,
                width: main.getBoundingClientRect().width,
              }
            : null,
          projectGroupCount: document.querySelectorAll(
            ".codex-ui-app-sidebar__project-group",
          ).length,
          projectGroupExpanded: document
            .querySelector(
              '.codex-ui-app-sidebar__project-group [aria-expanded]',
            )
            ?.getAttribute("aria-expanded"),
          resizer: Boolean(
            document.querySelector(
              '.codex-ui-app-shell__sidebar-resizer[role="separator"]',
            ),
          ),
          sidebar: sidebar
            ? {
                left: sidebar.getBoundingClientRect().left,
                width: sidebar.getBoundingClientRect().width,
              }
            : null,
          sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
          sidebarState: document
            .querySelector(".demo-root")
            ?.getAttribute("data-sidebar-state"),
          viewport: { height: innerHeight, width: innerWidth },
        };
      });
      if (
        compactSidebar.frame !== "sidebar-current" ||
        compactSidebar.sidebarState !== "compact-pinned" ||
        compactSidebar.layoutMode !== "narrow" ||
        !compactSidebar.sidebarOpen ||
        compactSidebar.resizer ||
        !compactSidebar.sidebar ||
        Math.abs(compactSidebar.sidebar.left) > 1 ||
        Math.abs(compactSidebar.sidebar.width - 274) > 1 ||
        !compactSidebar.main ||
        Math.abs(compactSidebar.main.left - 274) > 1 ||
        Math.abs(compactSidebar.main.width - 446) > 1 ||
        compactSidebar.projectGroupCount !== 5 ||
        compactSidebar.projectGroupExpanded !== "true" ||
        !compactSidebar.helpVisible ||
        Math.abs(compactSidebar.horizontalOverflow) > 1 ||
        compactSidebar.viewport.width !== 720 ||
        compactSidebar.viewport.height !== 680
      ) {
        throw new Error(
          `current-sidebar-compact-pinned: narrow contract failed: ${JSON.stringify(compactSidebar)}`,
        );
      }
      await writeFile(
        join(artifactDirectory, `${scene.id}.json`),
        `${JSON.stringify(compactSidebar, null, 2)}\n`,
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
        automaticApprovalReview: ".codex-ui-auto-review",
        command: ".codex-ui-command-execution",
        fileChange: ".codex-ui-file-change-group",
        reviewPanel:
          '.codex-ui-workspace-panel[data-placement="side"]',
        bottomPanel:
          '.codex-ui-workspace-panel[data-placement="bottom"]',
        mcpGroup: ".codex-ui-mcp-tool-call-group",
        terminal: ".codex-ui-terminal-session",
        terminalProcesses: ".codex-ui-terminal-process-list",
        terminalReload: ".codex-ui-terminal-reload-notice",
        backgroundSummary: ".demo-background-terminal-summary",
        backgroundTerminal:
          '[data-testid="terminal-current-background-panel"]',
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
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
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
            callStatuses: Array.from(
              mcpGroup.querySelectorAll(".codex-ui-tool-call"),
              (element) => element.getAttribute("data-status"),
            ),
            errorOutput: (() => {
              const element = mcpGroup.querySelector(
                '.codex-ui-tool-call__error[data-presentation="output"]',
              );
              return element
                ? {
                    rect: rect(element),
                    role: element.getAttribute("role"),
                    text: element.textContent?.replace(/\s+/g, " ").trim(),
                  }
                : null;
            })(),
            expandedCallIds: Array.from(
              mcpGroup.querySelectorAll(".codex-ui-tool-call"),
            )
              .filter((element) =>
                Boolean(
                  element
                    .querySelector(".codex-ui-activity__disclosure")
                    ?.matches("[open], [data-open]"),
                ),
              )
              .map((element) => element.getAttribute("data-item-id")),
            failedCallAccessibleLabel: mcpGroup
              .querySelector(
                '[data-item-id="mcp-fetch-invalid"] .codex-ui-tool-call__label, [data-item-id="mcp-current-fetch-invalid"] .codex-ui-tool-call__label',
              )
              ?.getAttribute("aria-label"),
            groupExpanded:
              mcpGroup
                .querySelector(":scope > .codex-ui-activity__disclosure")
                ?.matches("[open], [data-open]") ?? false,
            groupLabel: mcpGroup
              .querySelector(".codex-ui-mcp-tool-call-group__label")
              ?.textContent?.trim(),
            groupSource: mcpGroup.getAttribute("data-source"),
            groupStatus: mcpGroup.getAttribute("data-status"),
            groupStyle: markdownStyle(
              mcpGroup.querySelector(
                ":scope > .codex-ui-activity__disclosure > .codex-ui-activity__header",
              ),
            ),
            rowDisclosures: Array.from(
              mcpGroup.querySelectorAll(".codex-ui-tool-call"),
              (element) => {
                const button = element.querySelector(
                  "button[aria-labelledby]",
                );
                const labelledBy = button?.getAttribute("aria-labelledby");
                const label = labelledBy
                  ? document.getElementById(labelledBy)
                  : null;
                return {
                  buttonRect: button ? rect(button) : null,
                  chevronVisible:
                    element
                      .querySelector(
                        ".codex-ui-activity__button-chevron",
                      )
                      ?.hasAttribute("data-visible") ?? null,
                  expanded:
                    button?.getAttribute("aria-expanded") ?? null,
                  label: label?.textContent?.trim() ?? null,
                  labelRect: label ? rect(label) : null,
                };
              },
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
      const failedMcpCall = document.querySelector(
        '[data-item-id="mcp-fetch-invalid"], [data-item-id="mcp-current-fetch-invalid"]',
      );
      const mcpFailure = failedMcpCall
        ? {
            accessibleLabel: failedMcpCall
              .querySelector(".codex-ui-tool-call__label")
              ?.getAttribute("aria-label"),
            errorOutput: (() => {
              const element = failedMcpCall.querySelector(
                '.codex-ui-tool-call__error[data-presentation="output"]',
              );
              return element
                ? {
                    rect: rect(element),
                    role: element.getAttribute("role"),
                    text: element.textContent?.replace(/\s+/g, " ").trim(),
                  }
                : null;
            })(),
            expanded:
              failedMcpCall
                .querySelector(".codex-ui-activity__disclosure")
                ?.matches("[open], [data-open]") ?? false,
            status: failedMcpCall.getAttribute("data-status"),
            timelineExpanded:
              failedMcpCall
                .closest(".codex-ui-activity-timeline")
                ?.hasAttribute("data-expanded") ?? false,
            timelineLabel: failedMcpCall
              .closest(".codex-ui-activity-timeline")
              ?.querySelector(".codex-ui-activity-timeline__toggle")
              ?.textContent?.trim(),
          }
        : null;
      const commandExecution =
        document.querySelector('[data-item-id="command-interruption"]') ??
        document.querySelector('[data-item-id="command-failure-output"]') ??
        document.querySelector('[data-item-id="command-long-output"]');
      const commandOutput = (() => {
        if (!commandExecution) return null;
        const shell = commandExecution.querySelector(
          ".codex-ui-command-execution__shell",
        );
        const shellLabel = commandExecution.querySelector(
          ".codex-ui-command-execution__shell-label",
        );
        const commandLine = commandExecution.querySelector(
          ".codex-ui-command-execution__command-line",
        );
        const output = commandExecution.querySelector(
          ".codex-ui-command-output pre",
        );
        const outputCode = output?.querySelector("code");
        const footer = commandExecution.querySelector(
          ".codex-ui-command-execution__footer",
        );
        const compactDetail = commandExecution.querySelector(
          ".codex-ui-command-execution__compact-detail",
        );
        const activityHeader = commandExecution.querySelector(
          ".codex-ui-activity__header",
        );
        const activitySummary = commandExecution.querySelector(
          ".codex-ui-activity__summary",
        );
        const timeline = commandExecution.closest(
          ".codex-ui-activity-timeline",
        );
        const shellStyle = shell ? getComputedStyle(shell) : null;
        const outputStyle = output ? getComputedStyle(output) : null;
        return {
          header: activityHeader
            ? {
                rect: rect(activityHeader),
                style: {
                  fontFamily: getComputedStyle(activityHeader).fontFamily,
                  fontSize: getComputedStyle(activityHeader).fontSize,
                  fontWeight: getComputedStyle(activityHeader).fontWeight,
                  lineHeight: getComputedStyle(activityHeader).lineHeight,
                },
              }
            : null,
          compactDetail: compactDetail
            ? {
                rect: rect(compactDetail),
                style: {
                  fontFamily: getComputedStyle(compactDetail).fontFamily,
                  fontSize: getComputedStyle(compactDetail).fontSize,
                  fontWeight: getComputedStyle(compactDetail).fontWeight,
                  lineHeight: getComputedStyle(compactDetail).lineHeight,
                },
                text: compactDetail.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
          commandExpanded:
            commandLine?.getAttribute("aria-expanded") ?? null,
          commandLabel: commandLine?.getAttribute("aria-label") ?? null,
          copyLabels: Array.from(
            commandExecution.querySelectorAll("button"),
            (button) => button.getAttribute("aria-label"),
          ).filter(Boolean),
          executionExpanded:
            commandExecution
              .querySelector(".codex-ui-activity__disclosure")
              ?.hasAttribute("open") ?? false,
          footer: footer
            ? {
                rect: rect(footer),
                text: footer.textContent?.trim(),
              }
            : null,
          lineCount: (outputCode?.textContent ?? "").split("\n").length,
          output: output
            ? {
                clientHeight: output.clientHeight,
                rect: rect(output),
                scrollHeight: output.scrollHeight,
                scrollTop: output.scrollTop,
                style: {
                  flexDirection: outputStyle?.flexDirection,
                  fontFamily: outputStyle?.fontFamily,
                  fontSize: outputStyle?.fontSize,
                  lineHeight: outputStyle?.lineHeight,
                  maxHeight: outputStyle?.maxHeight,
                  overflowY: outputStyle?.overflowY,
                  padding: outputStyle?.padding,
                },
                textEnd: (outputCode?.textContent ?? "").slice(-16),
                textStart: (outputCode?.textContent ?? "").slice(0, 12),
              }
            : null,
          shell: shell
            ? {
                rect: rect(shell),
                style: {
                  backgroundColor: shellStyle?.backgroundColor,
                  borderRadius: shellStyle?.borderRadius,
                  overflow: shellStyle?.overflow,
                },
              }
            : null,
          shellLabel: shellLabel?.textContent?.trim() ?? null,
          status: commandExecution.getAttribute("data-execution-status"),
          summary:
            activitySummary?.textContent?.replace(/\s+/g, " ").trim() ??
            null,
          timelineExpanded:
            timeline?.hasAttribute("data-expanded") ?? false,
          timelineLabel:
            timeline
              ?.querySelector(".codex-ui-activity-timeline__toggle")
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
        };
      })();
      const interruptionSummary = document.querySelector(
        ".codex-ui-thread-interruption-summary",
      );
      const interruptionLabel = interruptionSummary?.querySelector(
        ".codex-ui-thread-interruption-summary__label",
      );
      const interruptionRule = interruptionSummary?.querySelector(
        ".codex-ui-thread-interruption-summary__rule",
      );
      const contextEvent = document.querySelector(
        ".codex-ui-thread-context-event",
      );
      const contextOptimization = contextEvent?.querySelector(
        ".codex-ui-thread-context-optimization",
      );
      const contextWorking = contextEvent?.querySelector(
        ".codex-ui-thread-context-event__working",
      );
      const contextRule = contextEvent?.querySelector(
        ".codex-ui-thread-context-event__rule",
      );
      return {
        commandOutput,
        composer: composerRect,
        contextCompaction: contextEvent
          ? {
              eventRect: rect(contextEvent),
              eventStatus: contextEvent.getAttribute("data-status"),
              mode: contextOptimization?.getAttribute("data-mode") ?? null,
              optimizationRect: contextOptimization
                ? rect(contextOptimization)
                : null,
              optimizationStatus:
                contextOptimization?.getAttribute("data-status") ?? null,
              rule: contextRule
                ? {
                    rect: rect(contextRule),
                    style: {
                      height: getComputedStyle(contextRule).height,
                    },
                  }
                : null,
              text:
                contextOptimization?.textContent
                  ?.replace(/\s+/g, " ")
                  .trim() ?? null,
              textStyle: contextOptimization
                ? {
                    fontFamily: getComputedStyle(contextOptimization)
                      .fontFamily,
                    fontSize: getComputedStyle(contextOptimization).fontSize,
                    fontWeight:
                      getComputedStyle(contextOptimization).fontWeight,
                    lineHeight:
                      getComputedStyle(contextOptimization).lineHeight,
                  }
                : null,
              working:
                contextWorking?.textContent?.replace(/\s+/g, " ").trim() ??
                null,
            }
          : null,
        frame: root.getAttribute("data-frame"),
        header: headerRect,
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        mode: root.getAttribute("data-mode"),
        interruption: interruptionSummary
          ? {
              label: interruptionLabel
                ? {
                    rect: rect(interruptionLabel),
                    style: {
                      fontFamily: getComputedStyle(interruptionLabel).fontFamily,
                      fontSize: getComputedStyle(interruptionLabel).fontSize,
                      fontWeight: getComputedStyle(interruptionLabel).fontWeight,
                      lineHeight: getComputedStyle(interruptionLabel).lineHeight,
                    },
                    text: interruptionLabel.textContent?.trim(),
                  }
                : null,
              rect: rect(interruptionSummary),
              rule: interruptionRule
                ? {
                    rect: rect(interruptionRule),
                    style: {
                      backgroundColor:
                        getComputedStyle(interruptionRule).backgroundColor,
                    height: getComputedStyle(interruptionRule).height,
                    marginTop: getComputedStyle(interruptionRule).marginTop,
                  },
                }
                : null,
              status: interruptionSummary.getAttribute("data-status"),
            }
          : null,
        markdown,
        mcp,
        mcpFailure,
        namedSurfaces,
        review: {
          contentLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-file-review .codex-ui-file-review__content[aria-label], .codex-ui-file-review-workspace .codex-ui-file-diff[aria-label], .codex-ui-file-review-workspace .codex-ui-file-review-notice[aria-label]",
            ),
            (element) => element.getAttribute("aria-label"),
          ),
          diffLabels: Array.from(
            document.querySelectorAll(
              '.codex-ui-file-review .codex-ui-file-diff[aria-label], .codex-ui-file-review-workspace .codex-ui-file-diff[aria-label]',
            ),
            (element) => element.getAttribute("aria-label"),
          ),
          fileCount: document.querySelectorAll(
            ".codex-ui-file-review__file, .codex-ui-file-review-workspace__diff",
          ).length,
          firstDiffLabel: document
            .querySelector(
              '.codex-ui-file-review .codex-ui-file-diff[aria-label], .codex-ui-file-review-workspace .codex-ui-file-diff[aria-label]',
            )
            ?.getAttribute("aria-label"),
          firstContentLabel: document
            .querySelector(
              ".codex-ui-file-review .codex-ui-file-review__content[aria-label], .codex-ui-file-review-workspace .codex-ui-file-diff[aria-label], .codex-ui-file-review-workspace .codex-ui-file-review-notice[aria-label]",
            )
            ?.getAttribute("aria-label"),
          noticeKinds: Array.from(
            document.querySelectorAll(
              ".codex-ui-file-review .codex-ui-file-review-notice, .codex-ui-file-review-workspace .codex-ui-file-review-notice",
            ),
            (element) => element.getAttribute("data-kind"),
          ),
          scroll: (() => {
            const element = document.querySelector(
              ".codex-ui-file-review, .codex-ui-file-review-workspace__diffs",
            );
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
        sidebar: (() => {
          const sidebar = document.querySelector(
            ".codex-ui-app-sidebar",
          );
          const sidebarHeader = sidebar?.querySelector(
            ".codex-ui-app-sidebar__header",
          );
          const navigation = sidebar?.querySelector(
            ".codex-ui-app-sidebar__navigation",
          );
          const footer = sidebar?.querySelector(
            ".codex-ui-app-sidebar__footer",
          );
          const selected = sidebar?.querySelectorAll(
            '.codex-ui-app-sidebar__item[aria-current="page"]',
          );
          if (!sidebar || !sidebarHeader || !navigation || !footer) {
            return null;
          }
          return {
            actionToolbars: sidebar.querySelectorAll(
              ".codex-ui-app-sidebar__item-actions[role=\"toolbar\"]",
            ).length,
            footer: rect(footer),
            header: rect(sidebarHeader),
            navigation: {
              clientHeight: navigation.clientHeight,
              rect: rect(navigation),
              scrollHeight: navigation.scrollHeight,
            },
            projectToggleExpanded: sidebar
              .querySelector(
                '.codex-ui-app-sidebar__section[data-kind="projects"] .codex-ui-app-sidebar__section-toggle',
              )
              ?.getAttribute("aria-expanded"),
            rect: rect(sidebar),
            selectedCount: selected?.length ?? 0,
            statusCounts: {
              active: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="active"]',
              ).length,
              error: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="error"]',
              ).length,
              loading: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="loading"]',
              ).length,
              queued: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="queued"]',
              ).length,
              running: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="running"]',
              ).length,
              unread: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="unread"], .codex-ui-app-sidebar__item-secondary-status[data-status="unread"]',
              ).length,
              waiting: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="waiting"]',
              ).length,
            },
            statusFixtures: Array.from(
              sidebar.querySelectorAll(
                '[data-sidebar-status-fixture]:not([data-status="idle"])',
              ),
              (item) => {
                const row = item.closest(
                  ".codex-ui-app-sidebar__item-row",
                );
                const status = row?.querySelector(
                  ".codex-ui-app-sidebar__item-status",
                );
                const attention = status?.querySelector(
                  ".codex-ui-app-sidebar__item-status-attention",
                );
                const spinner = status?.querySelector(
                  ".codex-ui-app-sidebar__item-status-spinner",
                );
                const error = status?.querySelector(
                  ".codex-ui-app-sidebar__item-status-error",
                );
                const secondaryStatus = row?.querySelector(
                  ".codex-ui-app-sidebar__item-secondary-status",
                );
                const secondaryAttention = secondaryStatus?.querySelector(
                  ".codex-ui-app-sidebar__item-status-attention",
                );
                const rowBounds = row?.getBoundingClientRect();
                const statusBounds = status?.getBoundingClientRect();
                const secondaryStatusBounds =
                  secondaryStatus?.getBoundingClientRect();
                return {
                  animationDuration: spinner
                    ? getComputedStyle(spinner).animationDuration
                    : null,
                  animationName: spinner
                    ? getComputedStyle(spinner).animationName
                    : null,
                  attentionColor: attention
                    ? getComputedStyle(attention).backgroundColor
                    : null,
                  attentionRect: attention ? rect(attention) : null,
                  errorRect: error ? rect(error) : null,
                  fixture: item.getAttribute("data-sidebar-status-fixture"),
                  pathData: Array.from(
                    spinner?.querySelectorAll("path") ?? [],
                    (path) => path.getAttribute("d"),
                  ),
                  rowRect: row ? rect(row) : null,
                  rightInset:
                    rowBounds && statusBounds
                      ? rowBounds.right - statusBounds.right
                      : null,
                  secondaryAttentionColor: secondaryAttention
                    ? getComputedStyle(secondaryAttention).backgroundColor
                    : null,
                  secondaryAttentionRect: secondaryAttention
                    ? rect(secondaryAttention)
                    : null,
                  secondaryRightInset:
                    rowBounds && secondaryStatusBounds
                      ? rowBounds.right - secondaryStatusBounds.right
                      : null,
                  secondaryStatus:
                    secondaryStatus?.getAttribute("data-status") ?? null,
                  secondaryStatusRect: secondaryStatus
                    ? rect(secondaryStatus)
                    : null,
                  secondaryVisualStatus:
                    secondaryStatus?.getAttribute("data-visual-status") ?? null,
                  status: status?.getAttribute("data-status"),
                  statusRect: status ? rect(status) : null,
                  visualStatus: status?.getAttribute("data-visual-status"),
                };
              },
            ),
            worktreeFixtures: Array.from(
              sidebar.querySelectorAll(
                "[data-sidebar-worktree-status-fixture]",
              ),
              (item) => {
                const row = item.closest(
                  ".codex-ui-app-sidebar__item-row",
                );
                const status = row?.querySelector(
                  ".codex-ui-app-sidebar__item-status",
                );
                const branch = row?.querySelector(
                  ".codex-ui-app-sidebar__item-worktree-indicator",
                );
                const secondaryStatus = row?.querySelector(
                  ".codex-ui-app-sidebar__item-secondary-status",
                );
                const description = row?.querySelector(
                  ".codex-ui-app-sidebar__item-worktree-description",
                );
                const rowBounds = row?.getBoundingClientRect();
                const branchBounds = branch?.getBoundingClientRect();
                const describedBy = new Set(
                  item.getAttribute("aria-describedby")?.split(/\s+/) ?? [],
                );
                return {
                  branchRect: branch ? rect(branch) : null,
                  branchRightInset:
                    rowBounds && branchBounds
                      ? rowBounds.right - branchBounds.right
                      : null,
                  fixture: item.getAttribute(
                    "data-sidebar-worktree-status-fixture",
                  ),
                  hasActions: row?.hasAttribute("data-has-actions") ?? false,
                  itemPaddingInlineEnd: getComputedStyle(item).paddingInlineEnd,
                  status: item.getAttribute("data-status"),
                  statusLabel: status?.getAttribute("aria-label"),
                  secondaryStatus:
                    secondaryStatus?.getAttribute("data-status") ?? null,
                  secondaryVisualStatus:
                    secondaryStatus?.getAttribute("data-visual-status") ?? null,
                  visualStatus: status?.getAttribute("data-visual-status"),
                  worktreeDescription:
                    description?.textContent?.trim() || null,
                  worktreeDescriptionLinked:
                    description instanceof HTMLElement &&
                    describedBy.has(description.id),
                  worktreeStatus: item.getAttribute(
                    "data-worktree-status",
                  ),
                };
              },
            ),
            titlebarInset: sidebar.hasAttribute("data-titlebar-inset"),
          };
        })(),
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
          return panel && panelHeader
            ? {
                entryKinds: Array.from(
                  transcript?.querySelectorAll("[data-kind]") ?? [],
                  (entry) => entry.getAttribute("data-kind"),
                ),
                emptyText: panel.querySelector(
                  ".codex-ui-workspace-panel__empty",
                )?.textContent?.trim(),
                inputLabel: terminalInput?.getAttribute("aria-label"),
                mismatchActions: Array.from(
                  panel.querySelectorAll(
                    ".codex-ui-terminal-workspace-mismatch button",
                  ),
                  (button) => button.textContent?.trim(),
                ),
                mismatchText: panel
                  .querySelector(".codex-ui-terminal-workspace-mismatch")
                  ?.textContent?.trim(),
                reloadActions: Array.from(
                  panel.querySelectorAll(
                    ".codex-ui-terminal-reload-notice button",
                  ),
                  (button) => button.textContent?.trim(),
                ),
                reloadText: panel
                  .querySelector(".codex-ui-terminal-reload-notice")
                  ?.textContent?.trim(),
                panel: rect(panel),
                panelContent: panelContent ? rect(panelContent) : null,
                panelHeader: rect(panelHeader),
                selectedTab: selectedTab?.textContent?.trim(),
                sessionCount: panel.querySelectorAll(
                  ".codex-ui-terminal-session",
                ).length,
                tabCloseCount: panel.querySelectorAll(
                  ".codex-ui-workspace-panel__tab-close",
                ).length,
                tabCount: panel.querySelectorAll('[role="tab"]').length,
                tabPanelLabelledBy:
                  tabPanel?.getAttribute("aria-labelledby"),
                tabStatuses: Array.from(
                  panel.querySelectorAll(
                    ".codex-ui-terminal-panel__tab-label",
                  ),
                  (label) => label.getAttribute("data-status"),
                ),
                transcriptLive: transcript?.getAttribute("aria-live"),
              }
            : null;
        })(),
        terminalPicker: (() => {
          const menu = document.querySelector(
            '.demo-terminal-tab-menu[role="menu"]',
          );
          return menu
            ? {
                items: Array.from(
                  menu.querySelectorAll('[role="menuitem"]'),
                  (item) => ({
                    disabled:
                      item.getAttribute("aria-disabled") === "true" ||
                      item.hasAttribute("disabled"),
                    text: item.textContent?.trim(),
                  }),
                ),
                rect: rect(menu),
              }
            : null;
        })(),
        viewport: viewportRect,
        workflow: {
          changeKinds: Array.from(
            document.querySelectorAll(
              ".codex-ui-file-change-group__file",
            ),
            (element) => element.getAttribute("data-change"),
          ),
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
      scene.scenario === "approval-denied" ||
      scene.scenario === "approval-allow-once" ||
      scene.scenario === "approval-similar-commands"
    ) {
      if (scene.id === "approval-current-options") {
        await page
          .getByTestId("current-approval-request")
          .getByRole("button", { name: "Approval options" })
          .click();
        await page
          .locator(
            '.codex-ui-approval-request__options-menu [role="menuitem"]',
          )
          .filter({ hasText: "Allow similar commands" })
          .waitFor();
      }
      const approvalContract = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const approval = document.querySelector(
          ".codex-ui-approval-request",
        );
        const composer = document.querySelector(".codex-ui-composer");
        const permissionTrigger = document.querySelector(
          ".demo-composer-permission-trigger",
        );
        return {
          activitySummary:
            document
              .querySelector(".codex-ui-activity-timeline__toggle")
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
          approval: approval
            ? {
                actionLabels: [...approval.querySelectorAll("button")].map(
                  (button) => ({
                    ariaLabel: button.getAttribute("aria-label"),
                    dataAction: button.getAttribute("data-action"),
                    rect: rect(button),
                    shortcut:
                      button
                        .querySelector(
                          ".codex-ui-approval-request__shortcut",
                        )
                        ?.textContent?.trim() ?? null,
                    text: button.textContent?.replace(/\s+/g, " ").trim(),
                  }),
                ),
                decision: approval.getAttribute("data-decision"),
                presentation: approval.getAttribute("data-presentation"),
                rect: rect(approval),
              }
            : null,
          approvalOptions: (() => {
            const menu = document.querySelector(
              ".codex-ui-approval-request__options-menu",
            );
            return menu
              ? {
                  items: Array.from(
                    menu.querySelectorAll('[role="menuitem"]'),
                    (item) =>
                      item.firstElementChild?.textContent
                        ?.replace(/\s+/g, " ")
                        .trim() ??
                      item.textContent?.replace(/\s+/g, " ").trim(),
                  ),
                  rect: rect(menu),
                }
              : null;
          })(),
          assistantText:
            [...document.querySelectorAll(
              '.codex-ui-agent-message[data-role="assistant"]',
            )]
              .at(-1)
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
          commandSummary:
            document
              .querySelector(
                ".codex-ui-command-execution .codex-ui-activity__summary",
              )
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
          composer: composer ? rect(composer) : null,
          permissionLabel:
            permissionTrigger?.textContent?.replace(/^◉/, "").trim() ?? null,
          permissionIconName:
            permissionTrigger
              ?.querySelector("[data-current-build-icon]")
              ?.getAttribute("data-current-build-icon") ?? null,
        };
      });
      if (scene.id === "approval-current-denied") {
        await page
          .getByRole("button", { exact: true, name: "Worked for 1m 53s" })
          .click();
        approvalContract.commandSummary = await page
          .locator(
            ".codex-ui-command-execution .codex-ui-activity__summary",
          )
          .textContent();
        approvalContract.commandSummary =
          approvalContract.commandSummary?.replace(/\s+/g, " ").trim() ??
          null;
      }
      if (scene.id === "approval-current-allow-once-completed") {
        await page
          .getByRole("button", {
            exact: true,
            name: "Worked for 4m 50s",
          })
          .click();
        approvalContract.commandSummary = await page
          .locator(
            ".codex-ui-command-execution .codex-ui-activity__summary",
          )
          .textContent();
        approvalContract.commandSummary =
          approvalContract.commandSummary?.replace(/\s+/g, " ").trim() ??
          null;
      }
      const pendingApprovalScene =
        scene.id === "approval-current-pending" ||
        scene.id === "approval-current-options" ||
        scene.id === "approval-current-allow-once-pending" ||
        scene.id === "approval-current-similar-menu";
      const expectedPendingDuration =
        scene.id === "approval-current-allow-once-pending"
          ? "Working for 4m 33s"
          : scene.id === "approval-current-similar-menu"
            ? "Working for 1m 38s"
            : "Working for 1m 15s";
      const expectedPendingCommand =
        scene.scenario === "approval-denied"
          ? "Running touch /outside/project/approval-sentinel"
          : "Running open -a Calculator";
      if (
        pendingApprovalScene &&
        (!approvalContract.approval ||
          approvalContract.approval.decision !== "pending" ||
          approvalContract.approval.presentation !== "composer" ||
          Math.abs(approvalContract.approval.rect.left - 359) > 1 ||
          Math.abs(approvalContract.approval.rect.top - 642) > 1 ||
          Math.abs(approvalContract.approval.rect.width - 736) > 1 ||
          Math.abs(approvalContract.approval.rect.height - 162) > 1 ||
          approvalContract.activitySummary !== expectedPendingDuration ||
          approvalContract.commandSummary !== expectedPendingCommand ||
          approvalContract.composer !== null ||
          !approvalContract.approval.actionLabels.some(
            ({ dataAction, shortcut, text }) =>
              dataAction === "reject" &&
              shortcut === "Esc" &&
              text === "DenyEsc",
          ) ||
          !approvalContract.approval.actionLabels.some(
            ({ dataAction, shortcut, text }) =>
              dataAction === "approve" &&
              shortcut === "⏎" &&
              text === "Allow once⏎",
          ) ||
          !approvalContract.approval.actionLabels.some(
            ({ ariaLabel }) => ariaLabel === "Approval options",
          ))
      ) {
        throw new Error(
          `${scene.id}: current pending approval contract failed: ${JSON.stringify(approvalContract)}`,
        );
      }
      if (
        scene.id === "approval-current-options" &&
        (!approvalContract.approvalOptions ||
          JSON.stringify(approvalContract.approvalOptions.items) !==
            JSON.stringify(["Allow once", "Allow similar commands"]) ||
          Math.abs(approvalContract.approvalOptions.rect.width - 193) > 2 ||
          Math.abs(approvalContract.approvalOptions.rect.height - 68) > 2 ||
          Math.abs(
            approvalContract.approvalOptions.rect.top -
              approvalContract.approval.rect.top -
              49,
          ) > 2)
      ) {
        throw new Error(
          `${scene.id}: current approval options contract failed: ${JSON.stringify(approvalContract)}`,
        );
      }
      if (scene.id === "approval-current-options") {
        await page.keyboard.press("Escape");
        const dismissedOptions = await page.evaluate(() => ({
          activeLabel: document.activeElement?.getAttribute("aria-label"),
          menuCount: document.querySelectorAll(
            ".codex-ui-approval-request__options-menu",
          ).length,
        }));
        if (
          dismissedOptions.activeLabel !== "Approval options" ||
          dismissedOptions.menuCount !== 0
        ) {
          throw new Error(
            `${scene.id}: Escape did not dismiss options and restore trigger focus: ${JSON.stringify(dismissedOptions)}`,
          );
        }
      }
      if (
        scene.id === "approval-current-denied" &&
        (approvalContract.approval !== null ||
          approvalContract.activitySummary !== "Worked for 1m 53s" ||
          approvalContract.commandSummary !==
            "Did not run touch /outside/project/approval-sentinel" ||
          approvalContract.assistantText !==
            "未获批准，命令未执行。" ||
          !approvalContract.composer ||
          Math.abs(approvalContract.composer.left - 359) > 1 ||
          Math.abs(approvalContract.composer.top - 706) > 1 ||
          Math.abs(approvalContract.composer.width - 736) > 1 ||
          Math.abs(approvalContract.composer.height - 98) > 1 ||
          approvalContract.permissionLabel !== "Ask for approval" ||
          approvalContract.permissionIconName !==
            "composer-permission-ask")
      ) {
        throw new Error(
          `${scene.id}: current denied approval contract failed: ${JSON.stringify(approvalContract)}`,
        );
      }
      if (
        scene.id === "approval-current-allow-once-completed" &&
        (approvalContract.approval !== null ||
          approvalContract.activitySummary !== "Worked for 4m 50s" ||
          approvalContract.commandSummary !==
            "Completed open -a Calculator" ||
          approvalContract.assistantText !== "ALLOW ONCE COMPLETE." ||
          !approvalContract.composer ||
          Math.abs(approvalContract.composer.left - 359) > 1 ||
          Math.abs(approvalContract.composer.top - 706) > 1 ||
          Math.abs(approvalContract.composer.width - 736) > 1 ||
          Math.abs(approvalContract.composer.height - 98) > 1 ||
          approvalContract.permissionLabel !== "Ask for approval")
      ) {
        throw new Error(
          `${scene.id}: current allow-once completion contract failed: ${JSON.stringify(approvalContract)}`,
        );
      }
      if (scene.id === "approval-current-allow-once-pending") {
        await page
          .getByTestId("current-approval-request")
          .getByRole("button", { exact: true, name: "Allow once" })
          .click();
        await page.waitForSelector(
          '.demo-root[data-frame="approval-current-allow-once-completed"]',
        );
        await page
          .getByText("ALLOW ONCE COMPLETE.", { exact: true })
          .waitFor();
        const restoredComposer = await page.evaluate(() => {
          const composer = document.querySelector(
            '.codex-ui-composer textarea',
          );
          return {
            activeLabel:
              document.activeElement?.getAttribute("aria-label") ?? null,
            approvalCount: document.querySelectorAll(
              '[data-testid="current-approval-request"]',
            ).length,
            composerValue:
              composer instanceof HTMLTextAreaElement
                ? composer.value
                : null,
            permissionLabel:
              document
                .querySelector(".demo-composer-permission-trigger")
                ?.textContent?.replace(/^◉/, "")
                .trim() ?? null,
          };
        });
        if (
          restoredComposer.approvalCount !== 0 ||
          restoredComposer.composerValue !== "" ||
          restoredComposer.activeLabel !== "Message composer" ||
          restoredComposer.permissionLabel !== "Ask for approval"
        ) {
          throw new Error(
            `${scene.id}: Allow once did not restore the unchanged focused Composer: ${JSON.stringify(restoredComposer)}`,
          );
        }
        await page
          .getByRole("button", {
            exact: true,
            name: "Worked for 4m 50s",
          })
          .click();
        const approvedContract = await page.evaluate(() => {
          const command = document.querySelector(
            '[data-testid="command-execution"]',
          );
          return {
            commandStatus: command?.getAttribute("data-execution-status"),
            commandSummary:
              command
                ?.querySelector(".codex-ui-activity__summary")
                ?.textContent?.replace(/\s+/g, " ")
                .trim() ?? null,
          };
        });
        if (
          approvedContract.commandStatus !== "completed" ||
          approvedContract.commandSummary !==
            "Completed open -a Calculator"
        ) {
          throw new Error(
            `${scene.id}: Allow once did not complete exactly one command: ${JSON.stringify(approvedContract)}`,
          );
        }
      }
      if (scene.id === "approval-current-similar-menu") {
        const approval = page.getByTestId("current-approval-request");
        await approval
          .getByRole("button", { name: "Approval options" })
          .click();
        const similarAction = page
          .locator(
            '.codex-ui-approval-request__options-menu [role="menuitem"]',
          )
          .filter({ hasText: "Allow similar commands" });
        await similarAction.waitFor();
        const optionContract = await page.evaluate(() => ({
          infoCount: document.querySelectorAll(
            '[aria-label="Allow future commands that match this proposed rule"]',
          ).length,
          labels: Array.from(
            document.querySelectorAll(
              ".codex-ui-approval-request__options-menu [role=menuitem]",
            ),
            (element) =>
              element.firstElementChild?.textContent
                ?.replace(/\s+/g, " ")
                .trim() ??
              element.textContent?.replace(/\s+/g, " ").trim(),
          ),
        }));
        if (
          optionContract.infoCount !== 1 ||
          JSON.stringify(optionContract.labels) !==
            JSON.stringify(["Allow once", "Allow similar commands"])
        ) {
          throw new Error(
            `${scene.id}: matching approval menu contract failed: ${JSON.stringify(optionContract)}`,
          );
        }
        await similarAction.click();
        await page.waitForSelector(
          '.demo-root[data-frame="approval-current-similar-first-completed"]',
        );
        await page
          .getByText("SESSION APPROVAL FIRST COMPLETE.", { exact: true })
          .waitFor();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Message composer",
        );
        const firstCompleted = await page.evaluate(() => {
          const composer = document.querySelector(
            ".codex-ui-composer textarea",
          );
          return {
            activeLabel:
              document.activeElement?.getAttribute("aria-label") ?? null,
            approvalCount: document.querySelectorAll(
              '[data-testid="current-approval-request"]',
            ).length,
            composerValue:
              composer instanceof HTMLTextAreaElement
                ? composer.value
                : null,
            permissionLabel:
              document
                .querySelector(".demo-composer-permission-trigger")
                ?.textContent?.replace(/^◉/, "")
                .trim() ?? null,
          };
        });
        if (
          firstCompleted.activeLabel !== "Message composer" ||
          firstCompleted.approvalCount !== 0 ||
          firstCompleted.composerValue !== "" ||
          firstCompleted.permissionLabel !== "Ask for approval"
        ) {
          throw new Error(
            `${scene.id}: first matching-rule command did not settle correctly: ${JSON.stringify(firstCompleted)}`,
          );
        }
        await page
          .getByRole("button", {
            exact: true,
            name: "Worked for 1m 41s",
          })
          .click();
        if (
          (await page.locator(
            '[data-testid="command-execution"][data-execution-status="completed"]',
          ).count()) !== 1
        ) {
          throw new Error(
            `${scene.id}: first matching-rule command did not complete exactly once.`,
          );
        }
        const secondPrompt =
          "Run the exact same harmless command again; the matching approval rule should avoid another prompt.";
        await page.getByLabel("Message composer").fill(secondPrompt);
        await page.getByLabel("Message composer").press("Enter");
        await page.waitForSelector(
          '.demo-root[data-frame="approval-current-similar-repeated-completed"]',
        );
        await page
          .getByText("SESSION APPROVAL SECOND COMPLETE.", { exact: true })
          .waitFor();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Message composer",
        );
        const repeatedCompleted = await page.evaluate(() => ({
          activeLabel:
            document.activeElement?.getAttribute("aria-label") ?? null,
          approvalCount: document.querySelectorAll(
            '[data-testid="current-approval-request"]',
          ).length,
          composerValue:
            document.querySelector(".codex-ui-composer textarea") instanceof
            HTMLTextAreaElement
              ? document.querySelector(".codex-ui-composer textarea").value
              : null,
          permissionLabel:
            document
              .querySelector(".demo-composer-permission-trigger")
              ?.textContent?.replace(/^◉/, "")
              .trim() ?? null,
          workedLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-activity-timeline__toggle",
            ),
            (element) => element.textContent?.replace(/\s+/g, " ").trim(),
          ),
        }));
        if (
          repeatedCompleted.activeLabel !== "Message composer" ||
          repeatedCompleted.approvalCount !== 0 ||
          repeatedCompleted.composerValue !== "" ||
          repeatedCompleted.permissionLabel !== "Ask for approval" ||
          JSON.stringify(repeatedCompleted.workedLabels) !==
            JSON.stringify(["Worked for 1m 41s", "Worked for 7s"])
        ) {
          throw new Error(
            `${scene.id}: repeated matching command did not bypass a second prompt: ${JSON.stringify(repeatedCompleted)}`,
          );
        }
        await page
          .getByRole("button", { exact: true, name: "Worked for 7s" })
          .click();
        if (
          (await page.locator(
            '[data-testid="command-execution"][data-execution-status="completed"]',
          ).count()) !== 2
        ) {
          throw new Error(
            `${scene.id}: repeated matching command did not complete twice.`,
          );
        }
      }
      if (scene.id === "approval-current-similar-repeated-completed") {
        await page
          .getByRole("button", {
            exact: true,
            name: "Worked for 1m 41s",
          })
          .click();
        await page
          .getByRole("button", { exact: true, name: "Worked for 7s" })
          .click();
        const repeatedContract = await page.evaluate(() => ({
          approvalCount: document.querySelectorAll(
            '[data-testid="current-approval-request"]',
          ).length,
          commandStatuses: Array.from(
            document.querySelectorAll('[data-testid="command-execution"]'),
            (element) => element.getAttribute("data-execution-status"),
          ),
          finalText:
            Array.from(
              document.querySelectorAll(
                '.codex-ui-agent-message[data-role="assistant"]',
              ),
            )
              .at(-1)
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
          permissionLabel:
            document
              .querySelector(".demo-composer-permission-trigger")
              ?.textContent?.replace(/^◉/, "")
              .trim() ?? null,
        }));
        if (
          repeatedContract.approvalCount !== 0 ||
          JSON.stringify(repeatedContract.commandStatuses) !==
            JSON.stringify(["completed", "completed"]) ||
          repeatedContract.finalText !==
            "SESSION APPROVAL SECOND COMPLETE." ||
          repeatedContract.permissionLabel !== "Ask for approval"
        ) {
          throw new Error(
            `${scene.id}: repeated completion contract failed: ${JSON.stringify(repeatedContract)}`,
          );
        }
      }
    }
    if (scene.scenario === "approval-for-session") {
      const sessionApproval = await page.evaluate(() => ({
        approvalCount: document.querySelectorAll(
          '[data-testid="current-approval-request"]',
        ).length,
        assistantText:
          Array.from(
            document.querySelectorAll(
              '.codex-ui-agent-message[data-role="assistant"]',
            ),
          )
            .at(-1)
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        fileChangeCount: document.querySelectorAll(
          ".codex-ui-file-change-group",
        ).length,
        identity:
          document
            .querySelector(".codex-ui-approval-request__identity")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        permissionLabel:
          document
            .querySelector(".demo-composer-permission-trigger")
            ?.textContent?.trim() ?? null,
        title:
          document
            .querySelector(".codex-ui-approval-request__heading h3")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
      }));
      if (scene.id === "approval-current-session-menu") {
        if (
          sessionApproval.approvalCount !== 1 ||
          sessionApproval.identity !== "Edit files" ||
          sessionApproval.title !==
            "Allow ChatGPT to edit the following file?" ||
          sessionApproval.fileChangeCount !== 1
        ) {
          throw new Error(
            `${scene.id}: session file approval shell failed: ${JSON.stringify(sessionApproval)}`,
          );
        }
        const approval = page.getByTestId("current-approval-request");
        await approval
          .getByRole("button", { name: "Approval options" })
          .click();
        const allowAllEdits = page
          .locator(
            '.codex-ui-approval-request__options-menu [role="menuitem"]',
          )
          .filter({ hasText: "Allow all edits" });
        await allowAllEdits.waitFor();
        const options = await page.evaluate(() => ({
          infoCount: document.querySelectorAll(
            '[aria-label="Allow this and future file edits in this conversation without asking again"]',
          ).length,
          labels: Array.from(
            document.querySelectorAll(
              '.codex-ui-approval-request__options-menu [role="menuitem"]',
            ),
            (element) =>
              element.firstElementChild?.textContent
                ?.replace(/\s+/g, " ")
                .trim() ??
              element.textContent?.replace(/\s+/g, " ").trim() ??
              null,
          ),
        }));
        if (
          options.infoCount !== 1 ||
          JSON.stringify(options.labels) !==
            JSON.stringify(["Allow once", "Allow all edits"])
        ) {
          throw new Error(
            `${scene.id}: session approval options failed: ${JSON.stringify(options)}`,
          );
        }
        await allowAllEdits.click();
        await page.waitForSelector(
          '.demo-root[data-frame="approval-current-session-first-completed"]',
        );
        await page
          .getByText("SESSION FILE APPROVAL FIRST COMPLETE.", {
            exact: true,
          })
          .waitFor();
        const secondPrompt =
          "Apply the second edit under the same session approval.";
        await page.getByLabel("Message composer").fill(secondPrompt);
        await page.getByLabel("Message composer").press("Enter");
        await page.waitForSelector(
          '.demo-root[data-frame="approval-current-session-repeated-completed"]',
        );
        const repeated = await page.evaluate(() => ({
          approvalCount: document.querySelectorAll(
            '[data-testid="current-approval-request"]',
          ).length,
          fileChangeCount: document.querySelectorAll(
            ".codex-ui-file-change-group",
          ).length,
          finalText:
            Array.from(
              document.querySelectorAll(
                '.codex-ui-agent-message[data-role="assistant"]',
              ),
            )
              .at(-1)
              ?.textContent?.replace(/\s+/g, " ")
              .trim() ?? null,
          permissionLabel:
            document
              .querySelector(".demo-composer-permission-trigger")
              ?.textContent?.trim() ?? null,
        }));
        if (
          repeated.approvalCount !== 0 ||
          repeated.fileChangeCount !== 2 ||
          repeated.finalText !== "SESSION FILE APPROVAL SECOND COMPLETE." ||
          repeated.permissionLabel !== "Ask for approval"
        ) {
          throw new Error(
            `${scene.id}: session approval did not bypass the second prompt: ${JSON.stringify(repeated)}`,
          );
        }
      }
      if (
        scene.id === "approval-current-session-repeated-completed" &&
        (sessionApproval.approvalCount !== 0 ||
          sessionApproval.fileChangeCount !== 2 ||
          sessionApproval.assistantText !==
            "SESSION FILE APPROVAL SECOND COMPLETE." ||
          sessionApproval.permissionLabel !== "Ask for approval")
      ) {
        throw new Error(
          `${scene.id}: session approval completion failed: ${JSON.stringify(sessionApproval)}`,
        );
      }
    }
    if (scene.scenario === "approval-review-timeout") {
      const automaticReview = await page.evaluate(() => {
        const review = document.querySelector(
          '[data-testid="automatic-approval-review"]',
        );
        return review
          ? {
              action:
                review
                  .querySelector(".codex-ui-auto-review__action")
                  ?.textContent?.trim() ?? null,
              busy: review.getAttribute("aria-busy"),
              role: review.getAttribute("role"),
              status: review.getAttribute("data-status"),
              summary:
                review
                  .querySelector(".codex-ui-auto-review__summary")
                  ?.textContent?.trim() ?? null,
              title:
                review
                  .querySelector(".codex-ui-auto-review__title")
                  ?.textContent?.trim() ?? null,
            }
          : null;
      });
      const expectedRunning = scene.id === "approval-review-running";
      if (
        !automaticReview ||
        automaticReview.action !==
          "Network access to https://example.com/health" ||
        automaticReview.status !==
          (expectedRunning ? "inProgress" : "timedOut") ||
        automaticReview.role !== (expectedRunning ? "status" : "alert") ||
        automaticReview.busy !== (expectedRunning ? "true" : null) ||
        automaticReview.title !==
          (expectedRunning ? "Auto-reviewing" : "Auto-review timed out") ||
        automaticReview.summary !==
          (expectedRunning
            ? null
            : "A carefully prompted reviewer agent timed out before ChatGPT ran this request")
      ) {
        throw new Error(
          `${scene.id}: automatic approval review contract failed: ${JSON.stringify(automaticReview)}`,
        );
      }
    }
    if (scene.scenario === "conversation-lifecycle") {
      const conversation = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
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
        const dock = document.querySelector(".codex-ui-composer-dock");
        const context = document.querySelector(".codex-ui-composer-context");
        const surface = document.querySelector(
          ".codex-ui-composer-dock__surface",
        );
        const composer = surface?.querySelector(".codex-ui-composer");
        const textarea = composer?.querySelector("textarea");
        const queue = document.querySelector(
          ".codex-ui-composer-dock__queue",
        );
        const navigation = document.querySelector(
          ".codex-ui-message-navigation-rail",
        );
        const navigationList = navigation?.querySelector(
          ".codex-ui-message-navigation-rail__list",
        );
        const floating = document.querySelector(
          ".codex-ui-thread-floating-button",
        );
        const viewport = document.querySelector(
          ".codex-ui-conversation-thread-shell__viewport",
        );
        const currentWindowedHistory = document.querySelector(
          "[data-mounted-turn-count]",
        );
        const permissionMenu = document.querySelector(
          ".codex-ui-composer-permission-menu",
        );
        const resourcePicker = document.querySelector(
          ".codex-ui-composer-resource-picker",
        );
        const resourceScroller = resourcePicker?.querySelector(
          ".codex-ui-composer-resource-picker__scroller",
        );
        const modeIndicator = composer?.querySelector(
          ".codex-ui-composer-mode",
        );
        if (
          !root ||
          !dock ||
          !surface ||
          !composer ||
          !textarea ||
          !navigation ||
          !floating
        ) {
          throw new Error("Conversation lifecycle surfaces are missing.");
        }
        return {
          attachmentCount: composer.querySelectorAll(
            ".codex-ui-composer-attachment",
          ).length,
          composer: {
            backgroundColor: getComputedStyle(composer).backgroundColor,
            busy: composer.getAttribute("aria-busy"),
            disabled: composer.hasAttribute("data-disabled"),
            layout: composer.getAttribute("data-layout"),
            rect: rect(composer),
          },
          context: context
            ? {
                controls: Array.from(
                  context.querySelectorAll("button"),
                  (button) => ({
                    height: button.getBoundingClientRect().height,
                    label: button.textContent?.replace(/\s+/g, " ").trim(),
                  }),
                ),
                rect: rect(context),
                role: context.getAttribute("role"),
              }
            : null,
          currentIcons: Array.from(
            dock.querySelectorAll("[data-current-build-icon]"),
            (icon) => {
              const value = icon.getBoundingClientRect();
              return {
                height: value.height,
                name: icon.getAttribute("data-current-build-icon"),
                width: value.width,
              };
            },
          ),
          dock: {
            hasContext: dock.getAttribute("data-has-context"),
            hasQueue: dock.getAttribute("data-has-queue"),
            rect: rect(dock),
          },
          floating: {
            hidden: floating.getAttribute("aria-hidden"),
            show: floating.hasAttribute("data-show"),
          },
          messageCount: document.querySelectorAll(
            ".codex-ui-agent-message",
          ).length,
          navigation: {
            activeCount: navigation.querySelectorAll(
              'button[aria-current="true"]',
            ).length,
            buttonCount: navigation.querySelectorAll("button").length,
            density: navigation.getAttribute("data-density"),
            label: navigation.getAttribute("aria-label"),
            list: navigationList
              ? {
                  clientHeight: navigationList.clientHeight,
                  rect: rect(navigationList),
                  scrollHeight: navigationList.scrollHeight,
                }
              : null,
            selectedMarker: (() => {
              const selected = navigation.querySelector(
                'button[aria-current="true"]',
              );
              const marker = selected?.querySelector(
                ".codex-ui-message-navigation-rail__marker",
              );
              return selected && marker
                ? {
                    button: rect(selected),
                    marker: rect(marker),
                    opacity: getComputedStyle(marker).opacity,
                  }
                : null;
            })(),
          },
          overlay: root.getAttribute("data-composer-overlay"),
          mode: root.getAttribute("data-composer-mode"),
          modeIndicator: modeIndicator
            ? {
                clearLabel: modeIndicator.getAttribute("aria-label"),
                kind: modeIndicator.getAttribute("data-kind"),
                label:
                  modeIndicator
                    .querySelector(".codex-ui-composer-mode__label")
                    ?.textContent?.trim() ?? null,
                rect: rect(modeIndicator),
                svgCount: modeIndicator.querySelectorAll("svg").length,
              }
            : null,
          phase: root.getAttribute("data-composer-phase"),
          placeholder: {
            count: document.querySelectorAll(
              ".codex-ui-thread-virtualized-placeholder",
            ).length,
            hiddenEntryCount:
              document
                .querySelector(".codex-ui-thread-virtualized-placeholder")
                ?.getAttribute("data-hidden-entry-count") ?? null,
          },
          queue: queue
            ? {
                backgroundColor: getComputedStyle(queue).backgroundColor,
                interrupted: Boolean(
                  queue.querySelector(
                    ".codex-ui-composer-queue[data-interrupted]",
                  ),
                ),
                labels: Array.from(
                  queue.querySelectorAll("button, summary"),
                  (element) =>
                    element.getAttribute("aria-label") ??
                    element.textContent?.replace(/\s+/g, " ").trim(),
                ),
                rect: rect(queue),
                rowCount: queue.querySelectorAll(
                  ".codex-ui-composer-queue__row",
                ).length,
                statusText:
                  queue
                    .querySelector('[role="status"]')
                    ?.textContent?.replace(/\s+/g, " ").trim() ?? null,
              }
            : null,
          queueCount: root.getAttribute("data-queue-count"),
          permissionMenu: permissionMenu
            ? {
                checkedCount: permissionMenu.querySelectorAll(
                  '[role="menuitemradio"][aria-checked="true"]',
                ).length,
                labels: Array.from(
                  permissionMenu.querySelectorAll(
                    '[role="menuitemradio"]',
                  ),
                  (item) =>
                    item.textContent?.replace(/\s+/g, " ").trim(),
                ),
                optionRects: Array.from(
                  permissionMenu.querySelectorAll(
                    ".codex-ui-composer-permission-menu__option",
                  ),
                  (item) => rect(item),
                ),
                rect: rect(permissionMenu),
              }
            : null,
          resourcePicker: resourcePicker
            ? {
                activeId:
                  resourcePicker.getAttribute("aria-activedescendant"),
                groupCount: resourcePicker.querySelectorAll(
                  ".codex-ui-composer-resource-picker__group",
                ).length,
                optionCount: resourcePicker.querySelectorAll(
                  '[role="option"]',
                ).length,
                rect: rect(resourcePicker),
                scroller: resourceScroller
                  ? {
                      clientHeight: resourceScroller.clientHeight,
                      rect: rect(resourceScroller),
                      scrollHeight: resourceScroller.scrollHeight,
                    }
                  : null,
                selectedCount: resourcePicker.querySelectorAll(
                  '[role="option"][aria-selected="true"]',
                ).length,
              }
            : null,
          interruptionText:
            document
              .querySelector(".codex-ui-thread-interruption-summary")
              ?.textContent?.replace(/\s+/g, " ").trim() ?? null,
          stopCount: composer.querySelectorAll(
            'button[aria-label="Stop"]',
          ).length,
          submitDisabled: composer
            .querySelector('[data-action="submit"]')
            ?.hasAttribute("disabled"),
          surface: rect(surface),
          textarea: {
            label: textarea.getAttribute("aria-label"),
            disabled: textarea.disabled,
            lineCount: textarea.value.split("\n").length,
            rect: rect(textarea),
            value: textarea.value,
          },
          threadFollowing: root.getAttribute("data-thread-following"),
          viewport: viewport
            ? {
                clientHeight: viewport.clientHeight,
                flexDirection: getComputedStyle(viewport).flexDirection,
                latestOrigin: viewport.getAttribute("data-latest-origin"),
                rect: rect(viewport),
                scrollHeight: viewport.scrollHeight,
                scrollTop: viewport.scrollTop,
              }
            : null,
          windowed: currentWindowedHistory
            ? {
                mountedTurnCount: document.querySelectorAll(
                  "[data-windowed-turn]",
                ).length,
                mountedUserBubbleCount: currentWindowedHistory.querySelectorAll(
                  '.codex-ui-agent-message[data-role="user"]',
                ).length,
                placeholderCount: currentWindowedHistory.querySelectorAll(
                  ".codex-ui-thread-virtualized-placeholder",
                ).length,
                selectedMessageIndex: currentWindowedHistory.getAttribute(
                  "data-selected-message-index",
                ),
                totalMessageCount: currentWindowedHistory.getAttribute(
                  "data-total-message-count",
                ),
              }
            : null,
        };
      });
      contract.conversation = conversation;
      const expectsContext = ![
        "composer-running",
        "composer-queued",
        "composer-auto-continued",
        "composer-queue-paused",
      ].includes(scene.id);
      const expectedCurrentIconNames = [
        ...(expectsContext
          ? [
              "composer-project",
              "composer-worktree",
              "composer-branch",
            ]
          : []),
        "composer-add-files",
        "composer-permission",
        "composer-model-chevron",
        "composer-dictate",
      ];
      if (
        (expectsContext
          ? conversation.dock.hasContext !== "true" ||
            conversation.context?.role !== "toolbar" ||
            conversation.context.controls.length !== 3 ||
            JSON.stringify(
              conversation.context.controls.map(({ label }) => label),
            ) !== JSON.stringify(["codex-ui-kit", "Local", "main"]) ||
            conversation.context.controls.some(
              ({ height }) => Math.abs(height - 28) > 1,
            )
          : conversation.dock.hasContext !== null ||
            conversation.context !== null) ||
        conversation.navigation.label !== "User messages" ||
        conversation.navigation.buttonCount < 10 ||
        JSON.stringify(
          conversation.currentIcons.map(({ name }) => name),
        ) !== JSON.stringify(expectedCurrentIconNames) ||
        conversation.currentIcons.some(({ name, height, width }) => {
          const expectedSize =
            name === "composer-model-chevron" ? 14 : 16;
          return (
            Math.abs(width - expectedSize) > 1 ||
            Math.abs(height - expectedSize) > 1
          );
        }) ||
        !conversation.dock.rect ||
        conversation.dock.rect.width < 700 ||
        conversation.dock.rect.width > 740
      ) {
        throw new Error(
          `${scene.id}: conversation shell contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        [
          "composer-multiline",
          "composer-permissions-menu",
          "composer-resources-menu",
        ].includes(scene.id) &&
        (conversation.phase !== "multiline" ||
          conversation.composer.layout !== "multiline" ||
          conversation.textarea.lineCount !== 4 ||
          Math.abs(conversation.composer.rect.left - 359) > 1 ||
          Math.abs(conversation.composer.rect.top - 670) > 1 ||
          Math.abs(conversation.composer.rect.width - 736) > 1 ||
          Math.abs(conversation.composer.rect.height - 134) > 1 ||
          Math.abs(conversation.textarea.rect.left - 371) > 1 ||
          Math.abs(conversation.textarea.rect.top - 684) > 1 ||
          Math.abs(conversation.textarea.rect.width - 712) > 1 ||
          Math.abs(conversation.textarea.rect.height - 80) > 1)
      ) {
        throw new Error(
          `${scene.id}: multiline Composer contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        (scene.id === "composer-goal" || scene.id === "composer-plan") &&
        (conversation.phase !==
          (scene.id === "composer-goal" ? "goal" : "plan") ||
          conversation.mode !==
            (scene.id === "composer-goal" ? "goal" : "plan") ||
          conversation.composer.layout !== "multiline" ||
          !conversation.modeIndicator ||
          conversation.modeIndicator.kind !== conversation.mode ||
          conversation.modeIndicator.label !==
            (scene.id === "composer-goal" ? "Goal" : "Plan") ||
          conversation.modeIndicator.clearLabel !==
            (scene.id === "composer-goal" ? "Clear goal" : "Plan") ||
          conversation.modeIndicator.svgCount !== 1 ||
          Math.abs(conversation.composer.rect.left - 359) > 1 ||
          Math.abs(conversation.composer.rect.top - 706) > 1 ||
          Math.abs(conversation.composer.rect.width - 736) > 1 ||
          Math.abs(conversation.composer.rect.height - 98) > 1 ||
          Math.abs(conversation.textarea.rect.left - 371) > 1 ||
          Math.abs(conversation.textarea.rect.top - 720) > 1 ||
          Math.abs(conversation.textarea.rect.width - 712) > 1 ||
          Math.abs(conversation.textarea.rect.height - 44) > 1 ||
          conversation.textarea.label !==
            (scene.id === "composer-goal"
              ? "Describe your goal, define measurable outcomes for best results"
              : "Describe your task to generate a plan...") ||
          Math.abs(conversation.modeIndicator.rect.left - 512) > 1 ||
          Math.abs(conversation.modeIndicator.rect.top - 768) > 1 ||
          Math.abs(conversation.modeIndicator.rect.height - 28) > 1)
      ) {
        throw new Error(
          `${scene.id}: current Composer mode contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-permissions-menu" &&
        (conversation.overlay !== "permissions" ||
          !conversation.permissionMenu ||
          conversation.resourcePicker !== null ||
          conversation.permissionMenu.checkedCount !== 1 ||
          conversation.permissionMenu.labels.length !== 4 ||
          !conversation.permissionMenu.labels[0]?.includes(
            "Ask for approval",
          ) ||
          !conversation.permissionMenu.labels[3]?.includes(
            "Custom (config.toml)",
          ) ||
          Math.abs(conversation.permissionMenu.rect.left - 401) > 1 ||
          Math.abs(conversation.permissionMenu.rect.top - 544) > 1 ||
          Math.abs(conversation.permissionMenu.rect.width - 480.375) > 1 ||
          Math.abs(conversation.permissionMenu.rect.height - 222.5) > 1 ||
          conversation.permissionMenu.optionRects.some(
            (option) =>
              !option || Math.abs(option.height - 47.125) > 1,
          ))
      ) {
        throw new Error(
          `${scene.id}: current permission menu contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-resources-menu" &&
        (conversation.overlay !== "resources" ||
          conversation.permissionMenu !== null ||
          !conversation.resourcePicker ||
          !conversation.resourcePicker.scroller ||
          conversation.resourcePicker.groupCount !== 5 ||
          conversation.resourcePicker.optionCount !== 30 ||
          conversation.resourcePicker.selectedCount !== 1 ||
          !conversation.resourcePicker.activeId ||
          Math.abs(conversation.resourcePicker.rect.left - 359) > 1 ||
          Math.abs(conversation.resourcePicker.rect.top - 346) > 1 ||
          Math.abs(conversation.resourcePicker.rect.width - 736) > 1 ||
          Math.abs(conversation.resourcePicker.rect.height - 320) > 1 ||
          Math.abs(
            conversation.resourcePicker.scroller.rect.left - 364,
          ) > 1 ||
          Math.abs(
            conversation.resourcePicker.scroller.rect.top - 351,
          ) > 1 ||
          Math.abs(
            conversation.resourcePicker.scroller.rect.width - 726,
          ) > 1 ||
          conversation.resourcePicker.scroller.clientHeight !== 310 ||
          conversation.resourcePicker.scroller.scrollHeight < 990)
      ) {
        throw new Error(
          `${scene.id}: current resource picker contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        (scene.id === "composer-running" ||
          scene.id === "composer-queued") &&
        (conversation.stopCount !== 1 ||
          conversation.composer.disabled ||
          !["running", "queued"].includes(conversation.phase))
      ) {
        throw new Error(
          `${scene.id}: running Composer contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-queued" &&
        (!conversation.queue ||
          conversation.dock.hasQueue !== "true" ||
          conversation.queue.backgroundColor !==
            conversation.composer.backgroundColor ||
          conversation.queue.rowCount !== 1 ||
          conversation.queueCount !== "1" ||
          !conversation.queue.labels.includes("Steer") ||
          !conversation.queue.labels.includes("Delete queued message") ||
          !conversation.queue.labels.includes("Queued message actions") ||
          Math.abs(
            conversation.queue.rect.left -
              conversation.surface.left -
              13,
          ) > 1 ||
          Math.abs(
            conversation.surface.right -
              conversation.queue.rect.right -
              13,
          ) > 1)
      ) {
        throw new Error(
          `${scene.id}: queued Composer contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-auto-continued" &&
        (conversation.queue !== null ||
          conversation.queueCount !== "0" ||
          conversation.phase !== "running" ||
          conversation.stopCount !== 1 ||
          conversation.interruptionText !== "You stopped after 2s")
      ) {
        throw new Error(
          `${scene.id}: automatic queued continuation contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-queue-paused" &&
        (!conversation.queue?.interrupted ||
          conversation.queue.backgroundColor !==
            conversation.composer.backgroundColor ||
          conversation.phase !== "queue-paused" ||
          conversation.stopCount !== 0 ||
          !conversation.queue.labels.includes("Resume") ||
          !conversation.queue.labels.includes("Steer") ||
          !conversation.queue.statusText?.includes(
            "Queue paused because you interrupted",
          ))
      ) {
        throw new Error(
          `${scene.id}: paused queue contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-disabled" &&
        (!conversation.composer.disabled ||
          conversation.composer.busy !== "true" ||
          !conversation.textarea.disabled ||
          conversation.phase !== "submitting")
      ) {
        throw new Error(
          `${scene.id}: disabled Composer contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-attachment" &&
        (conversation.attachmentCount !== 1 ||
          conversation.phase !== "attachment" ||
          conversation.composer.layout !== "multiline" ||
          conversation.submitDisabled !== true)
      ) {
        throw new Error(
          `${scene.id}: attachment Composer contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "thread-scroll-away" &&
        (conversation.threadFollowing !== "false" ||
          !conversation.floating.show ||
          conversation.floating.hidden !== "false")
      ) {
        throw new Error(
          `${scene.id}: scroll-away recovery contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "thread-windowed" &&
        (conversation.placeholder.count !== 2 ||
          Number(conversation.placeholder.hiddenEntryCount) !== 36 ||
          conversation.navigation.buttonCount !== 82 ||
          conversation.navigation.activeCount !== 1 ||
          conversation.navigation.density !== "compact" ||
          !conversation.navigation.list ||
          conversation.navigation.list.clientHeight !== 574 ||
          conversation.navigation.list.scrollHeight !== 820 ||
          !conversation.navigation.selectedMarker ||
          conversation.navigation.selectedMarker.opacity !== "1" ||
          Math.abs(
            conversation.navigation.selectedMarker.button.width - 36,
          ) > 1 ||
          Math.abs(
            conversation.navigation.selectedMarker.button.height - 10,
          ) > 1 ||
          Math.abs(
            conversation.navigation.selectedMarker.marker.width - 26,
          ) > 1 ||
          Math.abs(
            conversation.navigation.selectedMarker.marker.height - 2,
          ) > 1 ||
          !conversation.viewport ||
          conversation.viewport.latestOrigin !== "start" ||
          conversation.viewport.flexDirection !== "column-reverse" ||
          conversation.viewport.scrollTop >= -10_000 ||
          conversation.viewport.scrollHeight < 40_000 ||
          !conversation.windowed ||
          conversation.windowed.mountedTurnCount !== 7 ||
          conversation.windowed.mountedUserBubbleCount !== 7 ||
          conversation.windowed.placeholderCount !== 2 ||
          conversation.windowed.selectedMessageIndex !== "40" ||
          conversation.windowed.totalMessageCount !== "82" ||
          conversation.threadFollowing !== "false" ||
          !conversation.floating.show ||
          conversation.floating.hidden !== "false")
      ) {
        throw new Error(
          `${scene.id}: virtualized window contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (scene.id === "composer-permissions-menu") {
        await page.getByRole("menu").press("Escape");
        await page.waitForSelector(
          '.demo-root:not([data-composer-overlay])',
        );
      }
      if (scene.id === "composer-resources-menu") {
        await page
          .getByRole("listbox", { name: "Composer resources" })
          .press("Escape");
        await page.waitForSelector(
          '.demo-root:not([data-composer-overlay])',
        );
      }
      if (scene.id === "composer-goal" || scene.id === "composer-plan") {
        await page
          .getByRole("button", {
            name: scene.id === "composer-goal" ? "Clear goal" : "Plan",
          })
          .click();
        await page.waitForSelector(".demo-root:not([data-composer-mode])");
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") ===
            "Message composer",
        );
      }
    }
    if (
      scene.id === "attachment-current-ready" ||
      scene.id === "attachment-current-completed"
    ) {
      const attachmentLifecycle = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const composer = document.querySelector(".codex-ui-composer");
        const composerAttachment = composer?.querySelector(
          ".codex-ui-composer-attachment",
        );
        const composerImage = composerAttachment?.querySelector("img");
        const remove = composerAttachment?.querySelector(
          'button[aria-label^="Remove "]',
        );
        const messageAttachment = document.querySelector(
          ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
        );
        return {
          composer: rect(composer),
          composerAttachment: rect(composerAttachment),
          composerAttachmentRadius: composerAttachment
            ? getComputedStyle(composerAttachment).borderRadius
            : null,
          composerImage: rect(composerImage),
          finalCount: Array.from(
            document.querySelectorAll(
              '.codex-ui-agent-message[data-role="assistant"]',
            ),
          ).filter(
            (element) =>
              element.textContent?.trim() ===
              "ATTACHMENT LIFECYCLE COMPLETE.",
          ).length,
          messageAttachment: rect(messageAttachment),
          messageAttachmentRadius: messageAttachment
            ? getComputedStyle(messageAttachment).borderRadius
            : null,
          messageImageRadius: messageAttachment
            ? getComputedStyle(messageAttachment.querySelector("img"))
                .borderRadius
            : null,
          phase: document
            .querySelector(".demo-root")
            ?.getAttribute("data-composer-phase"),
          remove: rect(remove),
        };
      });
      contract.attachmentLifecycle = attachmentLifecycle;
      const ready = scene.id === "attachment-current-ready";
      if (
        !attachmentLifecycle.composer ||
        Math.abs(attachmentLifecycle.composer.width - 736) > 1 ||
        Math.abs(attachmentLifecycle.composer.left - 359.05) > 1 ||
        (ready
          ? !attachmentLifecycle.composerAttachment ||
            !attachmentLifecycle.composerImage ||
            !attachmentLifecycle.remove ||
            attachmentLifecycle.messageAttachment !== null ||
            attachmentLifecycle.phase !== "attachment" ||
            Math.abs(attachmentLifecycle.composer.height - 180) > 1 ||
            Math.abs(attachmentLifecycle.composer.top - 624) > 1 ||
            Math.abs(attachmentLifecycle.composerAttachment.width - 80) > 1 ||
            Math.abs(attachmentLifecycle.composerAttachment.height - 80) > 1 ||
            Math.abs(attachmentLifecycle.composerAttachment.left - 368.05) >
              1 ||
            Math.abs(attachmentLifecycle.composerAttachment.top - 633) > 1 ||
            Math.abs(attachmentLifecycle.composerImage.width - 78) > 1 ||
            Math.abs(attachmentLifecycle.composerImage.height - 78) > 1 ||
            Math.abs(attachmentLifecycle.composerImage.left - 369.05) > 1 ||
            Math.abs(attachmentLifecycle.composerImage.top - 634) > 1 ||
            Math.abs(attachmentLifecycle.remove.width - 16) > 1 ||
            Math.abs(attachmentLifecycle.remove.height - 16) > 1 ||
            Math.abs(attachmentLifecycle.remove.left - 427.05) > 1 ||
            Math.abs(attachmentLifecycle.remove.top - 638) > 1 ||
            attachmentLifecycle.composerAttachmentRadius !== "17px"
          : attachmentLifecycle.composerAttachment !== null ||
            !attachmentLifecycle.messageAttachment ||
            attachmentLifecycle.finalCount !== 1 ||
            Math.abs(attachmentLifecycle.composer.height - 98) > 1 ||
            Math.abs(attachmentLifecycle.composer.top - 706) > 1 ||
            Math.abs(attachmentLifecycle.messageAttachment.width - 80) > 1 ||
            Math.abs(attachmentLifecycle.messageAttachment.height - 80) > 1 ||
            Math.abs(attachmentLifecycle.messageAttachment.left - 1015.05) >
              1 ||
            Math.abs(attachmentLifecycle.messageAttachment.top - 79) > 1 ||
            attachmentLifecycle.messageAttachmentRadius !== "12.5px" ||
            attachmentLifecycle.messageImageRadius !== "10px")
      ) {
        throw new Error(
          `${scene.id}: current attachment lifecycle contract failed: ${JSON.stringify(attachmentLifecycle)}`,
        );
      }
    }
    if (
      [
        "attachment-multi-ready",
        "attachment-uploading",
        "attachment-upload-error",
        "attachment-preview-error",
        "attachment-multi-compact",
      ].includes(scene.id)
    ) {
      const variant = await page.evaluate(() => {
        const tray = document.querySelector(
          ".codex-ui-composer__attachments",
        );
        const attachments = Array.from(
          document.querySelectorAll(
            ".codex-ui-composer .codex-ui-composer-attachment",
          ),
        );
        const uploadingAttachment = attachments.find(
          (attachment) => attachment.getAttribute("data-status") === "uploading",
        );
        const progress = uploadingAttachment?.querySelector(
          ".codex-ui-composer-attachment__progress",
        );
        const failedAttachment = attachments.find(
          (attachment) => attachment.getAttribute("data-status") === "error",
        );
        const constrainedCard = attachments.find(
          (attachment) => attachment.getAttribute("data-layout") === "card",
        );
        let constrainedCardWidth = null;
        if (constrainedCard) {
          const label = constrainedCard.querySelector(
            ".codex-ui-composer-attachment__label",
          );
          const meta = constrainedCard.querySelector(
            ".codex-ui-composer-attachment__meta",
          );
          const originalLabel = label?.textContent;
          const originalMeta = meta?.textContent;
          if (label) label.textContent = "current-build-attachment-name-that-must-truncate.txt";
          if (meta) meta.textContent = "A deliberately long metadata value";
          constrainedCardWidth = constrainedCard.getBoundingClientRect().width;
          if (label) label.textContent = originalLabel ?? "";
          if (meta) meta.textContent = originalMeta ?? "";
        }
        let imageProgressGeometry = null;
        let pillProgressGeometry = null;
        if (uploadingAttachment && progress) {
          const originalLayout = uploadingAttachment.getAttribute("data-layout");
          uploadingAttachment.setAttribute("data-layout", "image");
          const attachmentRect = uploadingAttachment.getBoundingClientRect();
          const progressRect = progress.getBoundingClientRect();
          imageProgressGeometry = {
            leftInset: progressRect.left - attachmentRect.left,
            rightInset: attachmentRect.right - progressRect.right,
            width: progressRect.width,
          };
          uploadingAttachment.setAttribute("data-layout", "pill");
          const pillAttachmentRect = uploadingAttachment.getBoundingClientRect();
          const pillProgressRect = progress.getBoundingClientRect();
          pillProgressGeometry = {
            leftInset: pillProgressRect.left - pillAttachmentRect.left,
            rightInset: pillAttachmentRect.right - pillProgressRect.right,
            width: pillProgressRect.width,
          };
          if (originalLayout) {
            uploadingAttachment.setAttribute("data-layout", originalLayout);
          } else {
            uploadingAttachment.removeAttribute("data-layout");
          }
        }
        let pillRetryGeometry = null;
        if (failedAttachment) {
          const retry = failedAttachment.querySelector(
            ".codex-ui-composer-attachment__retry",
          );
          const open = failedAttachment.querySelector(
            ".codex-ui-composer-attachment__open",
          );
          if (retry && open) {
            const originalLayout = failedAttachment.getAttribute("data-layout");
            failedAttachment.setAttribute("data-layout", "pill");
            const openRect = open.getBoundingClientRect();
            const retryRect = retry.getBoundingClientRect();
            pillRetryGeometry = {
              gap: retryRect.left - openRect.right,
              position: getComputedStyle(retry).position,
            };
            if (originalLayout) {
              failedAttachment.setAttribute("data-layout", originalLayout);
            } else {
              failedAttachment.removeAttribute("data-layout");
            }
          }
        }
        return {
          attachmentCount: attachments.length,
          cardHeights: attachments
            .filter((attachment) => attachment.getAttribute("data-layout") === "card")
            .map((attachment) => attachment.getBoundingClientRect().height),
          cardContentGaps: attachments
            .filter((attachment) => attachment.getAttribute("data-layout") === "card")
            .map((attachment) => {
              const icon = attachment.querySelector(
                ".codex-ui-composer-attachment__icon",
              );
              const copy = attachment.querySelector(
                ".codex-ui-composer-attachment__copy",
              );
              if (!icon || !copy) return null;
              return (
                copy.getBoundingClientRect().left -
                icon.getBoundingClientRect().right
              );
            })
            .filter((gap) => gap !== null),
          constrainedCardWidth,
          iconSizes: attachments
            .map((attachment) =>
              attachment.querySelector(
                ".codex-ui-composer-attachment__icon",
              ),
            )
            .filter(Boolean)
            .map((icon) => {
              const rect = icon.getBoundingClientRect();
              return { height: rect.height, width: rect.width };
            }),
          imageProgressGeometry,
          overflow: tray ? tray.scrollWidth - tray.clientWidth : null,
          phase: document
            .querySelector(".demo-root")
            ?.getAttribute("data-composer-phase"),
          pillProgressGeometry,
          pillRetryGeometry,
          previewError: document
            .querySelector(
              '.codex-ui-composer-attachment[data-status="preview-error"] [role="status"]',
            )
            ?.textContent?.trim(),
          progress: document
            .querySelector('[role="progressbar"]')
            ?.getAttribute("aria-valuenow"),
          retryCount: document.querySelectorAll(
            ".codex-ui-composer-attachment__retry",
          ).length,
          statuses: attachments.map((attachment) =>
            attachment.getAttribute("data-status"),
          ),
          statusText: Array.from(
            document.querySelectorAll(
              ".codex-ui-composer-attachment__accessible-status[role=status]",
            ),
            (element) => element.textContent?.trim(),
          ),
          statusWithinOpenButton: document.querySelectorAll(
            ".codex-ui-composer-attachment__open [role=status]",
          ).length,
          submitDisabled: document
            .querySelector('.codex-ui-composer [data-action="submit"]')
            ?.hasAttribute("disabled"),
        };
      });
      variant.accessibleProgressCount =
        scene.id === "attachment-uploading"
          ? await page
              .getByRole("progressbar", {
                name: "Uploading current-build.zip",
              })
              .count()
          : 0;
      contract.attachmentVariants = variant;
      const expectedCount = scene.id === "attachment-preview-error" ? 1 : 5;
      const expectsOverflow = scene.id !== "attachment-preview-error";
      const expectsSubmitDisabled = [
        "attachment-preview-error",
        "attachment-upload-error",
        "attachment-uploading",
      ].includes(scene.id);
      const expectedStatus =
        scene.id === "attachment-uploading"
          ? "uploading"
          : scene.id === "attachment-upload-error"
            ? "error"
            : scene.id === "attachment-preview-error"
              ? "preview-error"
              : "ready";
      if (
        variant.attachmentCount !== expectedCount ||
        variant.phase !== "attachment" ||
        !variant.statuses.includes(expectedStatus) ||
        variant.submitDisabled !== expectsSubmitDisabled ||
        (expectsOverflow && !(variant.overflow > 0)) ||
        variant.cardHeights.some((height) => Math.abs(height - 64) > 1) ||
        variant.cardContentGaps.some((gap) => Math.abs(gap - 10) > 1) ||
        (variant.constrainedCardWidth !== null &&
          variant.constrainedCardWidth > 257) ||
        variant.statusWithinOpenButton !== 0 ||
        variant.iconSizes.some(
          ({ height, width }) =>
            Math.abs(height - 40) > 1 || Math.abs(width - 40) > 1,
        ) ||
        (scene.id === "attachment-uploading" &&
          (variant.progress !== "62" ||
            variant.accessibleProgressCount !== 1 ||
            !variant.imageProgressGeometry ||
            Math.abs(variant.imageProgressGeometry.leftInset - 8) > 1 ||
            Math.abs(variant.imageProgressGeometry.rightInset - 8) > 1 ||
            variant.imageProgressGeometry.width < 48 ||
            !variant.pillProgressGeometry ||
            Math.abs(variant.pillProgressGeometry.leftInset - 8) > 1 ||
            Math.abs(variant.pillProgressGeometry.rightInset - 8) > 1 ||
            variant.pillProgressGeometry.width < 24 ||
            !variant.statusText.includes("Uploading…"))) ||
        (scene.id === "attachment-upload-error" &&
          (variant.retryCount !== 1 ||
            !variant.pillRetryGeometry ||
            variant.pillRetryGeometry.position !== "static" ||
            variant.pillRetryGeometry.gap < 0 ||
            !variant.statusText.includes("Upload failed"))) ||
        (scene.id === "attachment-preview-error" &&
          (variant.retryCount !== 1 ||
            variant.previewError !== "Preview unavailable"))
      ) {
        throw new Error(
          `${scene.id}: attachment variant contract failed: ${JSON.stringify(variant)}`,
        );
      }
    }
    const expectedWindowWidth = scene.windowSize?.width ?? 1_180;
    const minimumConversationViewportWidth =
      expectedWindowWidth <= 720 ? 400 : 500;
    if (
      contract.header.bottom > contract.viewport.bottom ||
      contract.composer.top < contract.header.bottom ||
      contract.composer.bottom > contract.shell.bottom + 1 ||
      contract.viewport.width < minimumConversationViewportWidth
    ) {
      throw new Error(
        `${scene.id}: named surface geometry is invalid: ${JSON.stringify({ contract, minimumConversationViewportWidth })}`,
      );
    }
    if (contract.styles.viewportOverflowY !== "auto") {
      throw new Error(`${scene.id}: conversation viewport is not scrollable.`);
    }
    const expectedViewportHeight = scene.windowSize?.height ?? 820;
    const currentBuildSidebarScene =
      scene.currentSidebar === true ||
      scene.id === "current-sidebar" ||
      scene.id === "current-sidebar-recents";
    const currentSidebarStatusScene =
      scene.id === "current-sidebar-status-lifecycle";
    if (
      !contract.sidebar ||
      !contract.sidebar.titlebarInset ||
      Math.abs(contract.sidebar.rect.width - 274) > 1 ||
      Math.abs(
        contract.sidebar.rect.height - expectedViewportHeight,
      ) > 1 ||
      Math.abs(contract.sidebar.header.top - 46) > 1 ||
      Math.abs(contract.sidebar.header.height - 70) > 1 ||
      Math.abs(contract.sidebar.navigation.top - 116) > 1 ||
      Math.abs(
        contract.sidebar.navigation.bottom -
          contract.sidebar.footer.top,
      ) > 1 ||
      Math.abs(contract.sidebar.footer.height - 46) > 1 ||
      Math.abs(
        contract.sidebar.footer.bottom - expectedViewportHeight,
      ) > 1 ||
      contract.sidebar.navigation.scrollHeight <
        contract.sidebar.navigation.clientHeight ||
      contract.sidebar.projectToggleExpanded !== "false" ||
      contract.sidebar.actionToolbars < 8 ||
      contract.sidebar.statusCounts.error !==
        (currentSidebarStatusScene ? 1 : currentBuildSidebarScene ? 0 : 1) ||
      (!currentBuildSidebarScene &&
        contract.sidebar.statusCounts.queued < 1) ||
      contract.sidebar.statusCounts.unread <
        (currentBuildSidebarScene ? 1 : 2) ||
      contract.sidebar.selectedCount < 1
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar contract failed: ${JSON.stringify(contract.sidebar)}`,
      );
    }
    if (currentSidebarStatusScene) {
      const expectedStatuses = [
        ["session-browser:0", "active", "loading"],
        ["desktop-cleanup:0", "waiting", "attention"],
        ["codex-ui-kit:0", "unread", "attention"],
        ["codex-ui-kit:1", "queued", "loading"],
        ["design-assets:0", "loading", "loading"],
        ["design-assets:1", "loading", "loading"],
        ["design-assets:2", "error", "error"],
      ];
      const expectedWorktreeStatuses = [
        ["codex-ui-kit:1", "queued", "queued", "loading", null, null],
        ["design-assets:0", "creating", "loading", "loading", null, null],
        ["design-assets:1", "setting-up", "loading", "loading", null, null],
        ["design-assets:2", "failed", "error", "error", "unread", null],
        [
          "protocol-client:0",
          "restored",
          "idle",
          null,
          null,
          "Worktree is restored",
        ],
      ];
      const actualStatuses = contract.sidebar.statusFixtures.map(
        ({ fixture, status, visualStatus }) => [
          fixture,
          status,
          visualStatus,
        ],
      );
      const actualWorktreeStatuses = contract.sidebar.worktreeFixtures.map(
        ({
          fixture,
          secondaryStatus,
          status,
          visualStatus,
          worktreeDescription,
          worktreeStatus,
        }) => [
          fixture,
          worktreeStatus,
          status,
          visualStatus ?? null,
          secondaryStatus,
          worktreeDescription,
        ],
      );
      const geometryInvalid = contract.sidebar.statusFixtures.some(
        (fixture) =>
          fixture.rowRect?.height !== 30 ||
          fixture.statusRect?.width !== 20 ||
          fixture.statusRect?.height !== 20 ||
          fixture.rightInset !==
            (fixture.fixture === "design-assets:2" ? 36 : 8) ||
          (fixture.visualStatus === "attention" &&
            (fixture.attentionRect?.width !== 8 ||
              fixture.attentionRect?.height !== 8 ||
              fixture.attentionColor !== "rgb(131, 195, 255)")) ||
          (fixture.visualStatus === "error" &&
            (fixture.errorRect?.width !== 16 ||
              fixture.errorRect?.height !== 16)) ||
          (fixture.visualStatus === "loading" &&
            (fixture.animationDuration !== "1e-06s" ||
              fixture.animationName !== "none" ||
              fixture.pathData.length !== 2)) ||
          (fixture.fixture === "design-assets:2" &&
            (fixture.secondaryStatus !== "unread" ||
              fixture.secondaryVisualStatus !== "attention" ||
              fixture.secondaryStatusRect?.width !== 20 ||
              fixture.secondaryStatusRect?.height !== 20 ||
              fixture.secondaryRightInset !== 8 ||
              fixture.secondaryAttentionRect?.width !== 8 ||
              fixture.secondaryAttentionRect?.height !== 8 ||
              fixture.secondaryAttentionColor !== "rgb(131, 195, 255)")),
      );
      const worktreeGeometryInvalid =
        contract.sidebar.worktreeFixtures.some(
          (fixture) =>
            fixture.branchRect?.width !== 14 ||
            fixture.branchRect?.height !== 14 ||
            fixture.branchRightInset !==
              (fixture.worktreeStatus === "restored"
                ? 11
                : fixture.secondaryStatus
                  ? 67
                  : 39) ||
            (fixture.worktreeStatus === "restored" &&
              (fixture.hasActions ||
                fixture.itemPaddingInlineEnd !== "32px" ||
                !fixture.worktreeDescriptionLinked)),
        );
      if (
        JSON.stringify(actualStatuses) !== JSON.stringify(expectedStatuses) ||
        JSON.stringify(actualWorktreeStatuses) !==
          JSON.stringify(expectedWorktreeStatuses) ||
        contract.sidebar.statusCounts.active !== 1 ||
        contract.sidebar.statusCounts.loading !== 2 ||
        contract.sidebar.statusCounts.queued < 1 ||
        contract.sidebar.statusCounts.waiting !== 1 ||
        geometryInvalid ||
        worktreeGeometryInvalid
      ) {
        throw new Error(
          `${scene.id}: current sidebar status lifecycle failed: ${JSON.stringify(contract.sidebar)}`,
        );
      }
      const rtlWorktreeGeometry = await page.evaluate(async () => {
        const item = document.querySelector(
          '[data-sidebar-worktree-status-fixture="design-assets:2"]',
        );
        const row = item?.closest(".codex-ui-app-sidebar__item-row");
        if (!(row instanceof HTMLElement)) return null;
        row.dir = "rtl";
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const rowBounds = row.getBoundingClientRect();
        const inlineStart = (selector) => {
          const element = row.querySelector(selector);
          if (!(element instanceof Element)) return null;
          return element.getBoundingClientRect().left - rowBounds.left;
        };
        const geometry = {
          branch: inlineStart(
            ".codex-ui-app-sidebar__item-worktree-indicator",
          ),
          secondaryStatus: inlineStart(
            ".codex-ui-app-sidebar__item-secondary-status",
          ),
          status: inlineStart(".codex-ui-app-sidebar__item-status"),
        };
        row.removeAttribute("dir");
        return geometry;
      });
      if (
        !rtlWorktreeGeometry ||
        Math.abs(rtlWorktreeGeometry.secondaryStatus - 8) > 0.1 ||
        Math.abs(rtlWorktreeGeometry.status - 36) > 0.1 ||
        Math.abs(rtlWorktreeGeometry.branch - 67) > 0.1
      ) {
        throw new Error(
          `${scene.id}: RTL worktree status geometry failed: ${JSON.stringify(rtlWorktreeGeometry)}`,
        );
      }
    }
    const expectedSidebarMax =
      scene.id === "markdown-table-actions-narrow"
        ? "368"
        : scene.id === "terminal-current-background-list" ||
            scene.id === "terminal-current-background-open"
          ? "490"
        : scene.id === "terminal-compact" ||
            scene.id === "terminal-current-compact" ||
            scene.id === "attachment-multi-compact"
          ? "468"
          : scene.surfaces?.includes("reviewPanel")
            ? "508"
            : "520";
    if (
      contract.styles.resizerCursor !== "col-resize" ||
      Math.abs(contract.sidebarResizer.rect.width - 16) > 0.5 ||
      contract.sidebarResizer.ariaMin !== "240" ||
      contract.sidebarResizer.ariaMax !== expectedSidebarMax ||
      contract.sidebarResizer.ariaNow !== "274"
    ) {
      throw new Error(
        `${scene.id}: navigation resizer contract failed: ${JSON.stringify({
          expectedSidebarMax,
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
    const expectedReviewWidth =
      scene.id === "current-review-files" ? "382" : "370";
    if (
      scene.surfaces?.includes("reviewPanel") &&
      (!contract.sidePanelResizer ||
        contract.sidePanelResizer.cursor !== "col-resize" ||
        Math.abs(contract.sidePanelResizer.rect.width - 16) > 0.5 ||
        contract.sidePanelResizer.ariaMin !== "320" ||
        contract.sidePanelResizer.ariaMax !== "554" ||
        contract.sidePanelResizer.ariaNow !== expectedReviewWidth ||
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
    if (scene.id === "current-review-undo-failed") {
      const undoFailure = await page.evaluate(() => {
        const dialog = document.querySelector(
          '.codex-ui-file-revert-error-dialog [role="dialog"]',
        );
        const surface = dialog;
        const bounds = surface?.getBoundingClientRect();
        return {
          activeText: document.activeElement?.textContent?.trim() ?? null,
          description:
            dialog
              ?.querySelector(".codex-ui-dialog__description")
              ?.textContent?.trim() ?? null,
          fileGroupCount: document.querySelectorAll(
            '[data-testid="file-change-group"]',
          ).length,
          panelOpen:
            document
              .querySelector(".codex-ui-app-shell")
              ?.hasAttribute("data-side-panel-open") ?? false,
          rect: bounds
            ? { height: bounds.height, width: bounds.width }
            : null,
          title:
            dialog
              ?.querySelector(".codex-ui-dialog__title")
              ?.textContent?.trim() ?? null,
        };
      });
      if (
        undoFailure.activeText !== "Close" ||
        undoFailure.description !==
          "Git apply error: error: patch with only garbage at line 4" ||
        undoFailure.fileGroupCount !== 1 ||
        undoFailure.panelOpen ||
        undoFailure.title !== "Failed to revert changes" ||
        Math.abs((undoFailure.rect?.width ?? 0) - 420) > 1 ||
        Math.abs((undoFailure.rect?.height ?? 0) - 190.56) > 1
      ) {
        throw new Error(
          `${scene.id}: Undo failure dialog contract failed: ${JSON.stringify(undoFailure)}`,
        );
      }
    }
    const backgroundSidePanelScene =
      scene.id === "terminal-current-background-list" ||
      scene.id === "terminal-current-background-open";
    if (
      !scene.surfaces?.includes("reviewPanel") &&
      !backgroundSidePanelScene &&
      contract.sidePanelResizer
    ) {
      throw new Error(
        `${scene.id}: hidden Review panel retained its resize separator.`,
      );
    }
    if (scene.surfaces?.includes("bottomPanel")) {
      const terminal = contract.terminal;
      const resizer = contract.bottomPanelResizer;
      const compactTerminal =
        scene.id === "terminal-compact" ||
        scene.id === "terminal-current-compact";
      const expectedTerminalWidth = compactTerminal ? 546 : 906;
      const expectedTerminalMaximum = compactTerminal ? "332" : "402";
      const expectedTerminalTabs = {
        "background-terminal": 1,
        "terminal-closed": 0,
        "terminal-compact": 3,
        "terminal-failed": 2,
        "terminal-multi-tab": 3,
        "terminal-picker": 3,
        "terminal-running": 1,
        "terminal-current-compact": 3,
        "terminal-current-completed": 1,
        "terminal-current-command-exit-7": 1,
        "terminal-current-mismatch": 2,
        "terminal-current-multi": 3,
        "terminal-current-running": 1,
        "terminal-current-single": 1,
        "terminal-current-reload": 1,
      }[scene.id];
      const expectedTerminalStatuses = {
        "background-terminal": ["running"],
        "terminal-closed": [],
        "terminal-compact": ["running", "failed", "exited"],
        "terminal-failed": ["running", "failed"],
        "terminal-multi-tab": ["running", "failed", "exited"],
        "terminal-picker": ["exited", "failed", "exited"],
        "terminal-running": ["running"],
        "terminal-current-compact": ["idle", "idle", "idle"],
        "terminal-current-completed": ["idle"],
        "terminal-current-command-exit-7": ["idle"],
        "terminal-current-mismatch": ["idle", "idle"],
        "terminal-current-multi": ["idle", "idle", "idle"],
        "terminal-current-running": ["idle"],
        "terminal-current-single": ["idle"],
        "terminal-current-reload": ["failed"],
      }[scene.id];
      const currentRunning = scene.id === "terminal-current-running";
      const currentReload = scene.id === "terminal-current-reload";
      if (
        !terminal ||
        !resizer ||
        resizer.cursor !== "row-resize" ||
        Math.abs(resizer.rect.height - 16) > 0.5 ||
        resizer.ariaMin !== "152" ||
        resizer.ariaMax !== expectedTerminalMaximum ||
        resizer.ariaNow !== "272" ||
        Math.abs(terminal.panel.width - expectedTerminalWidth) > 1 ||
        Math.abs(terminal.panel.height - 272) > 1 ||
        Math.abs(terminal.panelHeader.height - 33) > 1 ||
        Math.abs(resizer.rect.bottom - terminal.panel.top) > 1 ||
        terminal.sessionCount !== 1 ||
        terminal.tabCount !== expectedTerminalTabs ||
        terminal.tabCloseCount !== expectedTerminalTabs ||
        JSON.stringify(terminal.tabStatuses) !==
          JSON.stringify(expectedTerminalStatuses) ||
        (!terminal.panelContent ||
            Math.abs(terminal.panelContent.height - 239) > 1 ||
            !terminal.selectedTab?.includes("codex-ui-kit") ||
            (!currentReload && terminal.inputLabel !== "Terminal input") ||
            (!currentReload && terminal.transcriptLive !== "polite") ||
            !terminal.tabPanelLabelledBy ||
            (!currentReload && !terminal.entryKinds.includes("command")) ||
            (!currentReload &&
              !currentRunning &&
              !terminal.entryKinds.includes("stdout")))
      ) {
        throw new Error(
          `${scene.id}: Terminal panel contract failed: ${JSON.stringify({
            resizer,
            terminal,
          })}`,
        );
      }
      if (
        currentReload &&
        (!terminal.reloadText?.includes("terminal encountered an error") ||
          !terminal.reloadText?.includes(
            "Try reloading the terminal to continue",
          ) ||
          JSON.stringify(terminal.reloadActions) !==
            JSON.stringify(["Reload"]) ||
          terminal.inputLabel ||
          terminal.transcriptLive)
      ) {
        throw new Error(
          `${scene.id}: Terminal reload contract failed: ${JSON.stringify(terminal)}`,
        );
      }
      if (
        scene.id === "terminal-picker" &&
        (!contract.terminalPicker ||
          contract.terminalPicker.items.length !== 4 ||
          !contract.terminalPicker.items[0]?.text?.includes("Review") ||
          !contract.terminalPicker.items[1]?.text?.includes("Terminal") ||
          !contract.terminalPicker.items[2]?.text?.includes("Browser") ||
          !contract.terminalPicker.items[3]?.text?.includes("Files") ||
          contract.terminalPicker.rect.width < 280)
      ) {
        throw new Error(
          `${scene.id}: Terminal picker contract failed: ${JSON.stringify(contract.terminalPicker)}`,
        );
      }
      if (
        scene.id === "terminal-current-mismatch" &&
        (!terminal.mismatchText?.includes(
          "does not match this chat's current worktree",
        ) ||
          JSON.stringify(terminal.mismatchActions) !==
            JSON.stringify(["Dismiss", "Open new terminal"]))
      ) {
        throw new Error(
          `${scene.id}: Terminal workspace mismatch contract failed: ${JSON.stringify(terminal)}`,
        );
      }
    } else if (contract.bottomPanelResizer) {
      throw new Error(
        `${scene.id}: hidden Terminal panel retained its resize separator.`,
      );
    }
    if (
      backgroundSidePanelScene &&
      (!contract.sidePanelResizer ||
        contract.sidePanelResizer.cursor !== "col-resize" ||
        contract.sidePanelResizer.ariaMin !== "300" ||
        contract.sidePanelResizer.ariaNow !== "381" ||
        Math.abs(
          contract.namedSurfaces[
            scene.id === "terminal-current-background-open"
              ? "backgroundTerminal"
              : "backgroundSummary"
          ].rect.width - 381.4375,
        ) > 1)
    ) {
      throw new Error(
        `${scene.id}: background side-panel resizer contract failed: ${JSON.stringify(contract.sidePanelResizer)}`,
      );
    }
    if (scene.id === "terminal-current-command-exit-7") {
      const exitContract = await page.evaluate(() => {
        const terminal = document.querySelector(
          ".codex-ui-terminal-session",
        );
        return {
          hasReload: Boolean(
            terminal?.querySelector(".codex-ui-terminal-reload-notice"),
          ),
          output: terminal
            ?.querySelector('[role="log"]')
            ?.textContent?.replace(/\s+/g, " ")
            .trim(),
          textbox: Boolean(
            terminal?.querySelector('input[aria-label="Terminal input"]'),
          ),
        };
      });
      if (
        exitContract.hasReload ||
        !exitContract.textbox ||
        !exitContract.output?.includes("terminal-direct-out") ||
        !exitContract.output?.startsWith("/workspace/codex-ui-kit %")
      ) {
        throw new Error(
          `${scene.id}: command exit status was confused with a shell failure: ${JSON.stringify(exitContract)}`,
        );
      }
    }
    if (scene.id === "terminal-current-background-list") {
      const backgroundList = await page.evaluate(() => {
        const summary = document.querySelector(
          '[data-testid="terminal-current-background-summary"]',
        );
        const process = summary?.querySelector(
          ".codex-ui-terminal-process-list__open",
        );
        const stopAll = summary?.querySelector(
          'button[aria-label="Stop all background terminals"]',
        );
        return {
          processText: process?.textContent?.trim(),
          sidePanelOpen: document
            .querySelector(".codex-ui-app-shell")
            ?.hasAttribute("data-side-panel-open"),
          stopAllLabel: stopAll?.getAttribute("aria-label"),
        };
      });
      if (
        !backgroundList.sidePanelOpen ||
        !backgroundList.processText?.includes("terminal-background-handle") ||
        backgroundList.stopAllLabel !== "Stop all background terminals"
      ) {
        throw new Error(
          `${scene.id}: background process summary contract failed: ${JSON.stringify(backgroundList)}`,
        );
      }
    }
    if (scene.id === "terminal-current-background-open") {
      const backgroundPanel = await page.evaluate(() => {
        const panel = document.querySelector(
          '[data-testid="terminal-current-background-panel"]',
        );
        const selectedTab = panel?.querySelector(
          '[role="tab"][aria-selected="true"]',
        );
        return {
          closeLabel: panel
            ?.querySelector(".codex-ui-workspace-panel__tab-close")
            ?.getAttribute("aria-label"),
          output: panel
            ?.querySelector('[role="log"]')
            ?.textContent?.replace(/\s+/g, " ")
            .trim(),
          selectedTab: selectedTab?.textContent?.trim(),
          sidePanelOpen: document
            .querySelector(".codex-ui-app-shell")
            ?.hasAttribute("data-side-panel-open"),
        };
      });
      if (
        !backgroundPanel.sidePanelOpen ||
        !backgroundPanel.selectedTab?.includes(
          "terminal-background-handle",
        ) ||
        !backgroundPanel.closeLabel?.startsWith("Close for i in") ||
        !backgroundPanel.output?.includes("terminal-background-handle-066") ||
        !backgroundPanel.output?.includes("terminal-background-handle-110")
      ) {
        throw new Error(
          `${scene.id}: background terminal panel contract failed: ${JSON.stringify(backgroundPanel)}`,
        );
      }
    }
    if (
      scene.id === "terminal-closed" ||
      scene.id === "terminal-current-closed"
    ) {
      if (
        (await page.getByRole("button", { name: "Restore last terminal" }).count()) !==
          0 ||
        (await page
          .getByRole("button", { name: "Toggle bottom panel" })
          .getAttribute("aria-pressed")) !== "false"
      ) {
        throw new Error(`${scene.id}: closed Terminal exposed stale restore UI.`);
      }
      await page.getByRole("button", { name: "Toggle bottom panel" }).click();
      await page.waitForSelector(
        '.codex-ui-app-shell[data-bottom-panel-open] [role="tab"]',
      );
      const freshTerminal = await page.evaluate(() => ({
        selectedTab: document
          .querySelector('[role="tab"][aria-selected="true"]')
          ?.textContent?.trim(),
        tabCount: document.querySelectorAll(
          '.codex-ui-app-shell__bottom-panel [role="tab"]',
        ).length,
        transcriptText: document
          .querySelector(".codex-ui-terminal-transcript")
          ?.textContent?.trim(),
      }));
      if (
        freshTerminal.tabCount !== 1 ||
        !freshTerminal.selectedTab?.endsWith("codex-ui-kit") ||
        freshTerminal.transcriptText !== ""
      ) {
        throw new Error(
          `${scene.id}: reopening did not create a fresh Terminal: ${JSON.stringify(freshTerminal)}`,
        );
      }
    }
    if (
      scene.surfaces?.includes("reviewPanel") &&
      (contract.workflow.fileGroupCount !== 1 ||
        contract.workflow.fileRowCount !== (scene.fileCount ?? 2) ||
        contract.review.fileCount !== (scene.fileCount ?? 2) ||
        contract.review.contentLabels.length !== (scene.fileCount ?? 2) ||
        contract.review.diffLabels.length !==
          (scene.diffCount ?? scene.fileCount ?? 2) ||
        (scene.noticeKinds !== undefined &&
          JSON.stringify(contract.review.noticeKinds) !==
            JSON.stringify(scene.noticeKinds)) ||
        (scene.changeKinds !== undefined &&
          JSON.stringify(contract.workflow.changeKinds) !==
            JSON.stringify(scene.changeKinds)))
    ) {
      throw new Error(
        `${scene.id}: multi-file aggregation contract failed: ${JSON.stringify({
          review: contract.review,
          workflow: contract.workflow,
        })}`,
      );
    }
    if (scene.toolCount !== undefined) {
      if (
        !contract.mcp ||
        contract.mcp.toolCount !== scene.toolCount ||
        !contract.mcp.groupExpanded ||
        !contract.mcp.timelineExpanded ||
        contract.mcp.groupSource !== "openaiDeveloperDocs" ||
        contract.mcp.groupLabel !== scene.groupLabel ||
        contract.mcp.timelineLabel !== scene.timelineLabel ||
        contract.mcp.groupStyle.fontSize !== "14px" ||
        contract.mcp.groupStyle.lineHeight !== "21px" ||
        ((scene.id === "mcp-tool-calls" ||
          scene.id === "mcp-recovery-completed" ||
          scene.id === "mcp-current-success" ||
          scene.id === "mcp-current-integration-recovered" ||
          scene.id === "mcp-current-recovery-completed") &&
          (contract.mcp.groupStyle.fontFamily !==
            '-apple-system, "system-ui", "Segoe UI", sans-serif' ||
            contract.mcp.groupStyle.fontWeight !== "445" ||
            !contract.mcp.groupStyle.color.includes("0.6"))) ||
        JSON.stringify(contract.mcp.callLabels) !==
          JSON.stringify(scene.callLabels)
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
        scene.id.startsWith("mcp-current-") &&
        (contract.mcp.rowDisclosures.length !== scene.toolCount ||
          contract.mcp.rowDisclosures.some(
            (
              {
                buttonRect,
                chevronVisible,
                expanded,
                label,
                labelRect,
              },
              index,
            ) => {
              const status = contract.mcp.callStatuses[index];
              if (status === "running") {
                return (
                  buttonRect !== null ||
                  chevronVisible !== null ||
                  expanded !== null ||
                  label !== null ||
                  labelRect !== null
                );
              }
              return (
                expanded === null ||
                label !== scene.callLabels[index] ||
                !buttonRect ||
                !labelRect ||
                Math.abs(buttonRect.height - 21) > 0.1 ||
                Math.abs(buttonRect.left - (labelRect.left - 22)) > 0.1 ||
                Math.abs(buttonRect.width - (labelRect.width + 40)) > 0.1 ||
                chevronVisible !== (expanded === "true")
              );
            },
          ))
      ) {
        throw new Error(
          `${scene.id}: current MCP row disclosure semantics drifted: ${JSON.stringify(contract.mcp.rowDisclosures)}`,
        );
      }
    }
    if (
      scene.errorOutput !== undefined &&
      (!contract.mcpFailure ||
        contract.mcpFailure.errorOutput?.role !== "alert" ||
        !contract.mcpFailure.errorOutput.text?.includes(
          scene.errorOutput,
        ) ||
        contract.mcpFailure.errorOutput.rect.width < 600 ||
        contract.mcpFailure.errorOutput.rect.height < 64 ||
        contract.mcpFailure.status !== "failed" ||
        contract.mcpFailure.accessibleLabel !==
          "Fetch OpenAI doc failed" ||
        !contract.mcpFailure.expanded ||
        !contract.mcpFailure.timelineExpanded ||
        contract.mcpFailure.timelineLabel !== scene.timelineLabel)
    ) {
      throw new Error(
        `${scene.id}: recovered MCP error output contract failed: ${JSON.stringify(contract.mcpFailure)}`,
      );
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
        Math.abs(markdown.root.rect.height - 357) > 1 ||
        Math.abs(markdown.heading.rect.top - markdown.root.rect.top) > 1 ||
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
        Math.abs(
          markdown.codeBlock.rect.top -
            markdown.root.rect.top -
            285,
        ) > 1 ||
        Math.abs(
          markdown.codeBlock.rect.bottom - markdown.root.rect.bottom,
        ) > 1 ||
        markdown.codeBlock.borderRadius !== "12.5px" ||
        markdown.codeBlock.marginBlockEnd !== "0px" ||
        markdown.codeBlock.marginBlockStart !== "14px" ||
        contract.styles.threadPaddingBottom !== "198px" ||
        Math.abs(
          contract.viewportScroll.scrollHeight -
            contract.viewportScroll.clientHeight -
            contract.viewportScroll.scrollTop,
        ) > 1
      ) {
        throw new Error(
          `${scene.id}: current-build Markdown contract failed: ${JSON.stringify(markdown)}`,
        );
      }
    }

    if (scene.id === "command-output-expanded") {
      const commandOutput = contract.commandOutput;
      if (
        !commandOutput ||
        !commandOutput.timelineExpanded ||
        commandOutput.timelineLabel !== "Worked for 10s" ||
        !commandOutput.executionExpanded ||
        commandOutput.summary !== "Ran seq 1 400" ||
        commandOutput.shellLabel !== "Shell" ||
        commandOutput.commandLabel !== "$ seq 1 400" ||
        commandOutput.commandExpanded !== "false" ||
        commandOutput.lineCount !== 401 ||
        !commandOutput.shell ||
        Math.abs(commandOutput.shell.rect.width - 736) > 1 ||
        Math.abs(commandOutput.shell.rect.height - 227) > 1 ||
        commandOutput.shell.style.borderRadius !== "12.5px" ||
        commandOutput.shell.style.overflow !== "hidden" ||
        !commandOutput.output ||
        Math.abs(commandOutput.output.rect.width - 734) > 1 ||
        Math.abs(commandOutput.output.rect.height - 144) > 1 ||
        commandOutput.output.clientHeight !== 144 ||
        commandOutput.output.scrollHeight !== 7816 ||
        Math.abs(commandOutput.output.scrollTop) > 1 ||
        commandOutput.output.style.flexDirection !== "column-reverse" ||
        commandOutput.output.style.fontSize !== "13px" ||
        commandOutput.output.style.lineHeight !== "19.5px" ||
        commandOutput.output.style.maxHeight !== "144px" ||
        commandOutput.output.style.overflowY !== "auto" ||
        commandOutput.output.style.padding !== "8px" ||
        commandOutput.output.textStart !== "1\n2\n3\n4\n5\n6\n" ||
        !commandOutput.output.textEnd.endsWith("397\n398\n399\n400\n") ||
        commandOutput.footer?.text !== "Success" ||
        Math.abs((commandOutput.footer?.rect.height ?? 0) - 27) > 1 ||
        commandOutput.copyLabels.filter((label) => label === "Copy")
          .length !== 2
      ) {
        throw new Error(
          `${scene.id}: current long command output contract failed: ${JSON.stringify(commandOutput)}`,
        );
      }

      const commandLine = page.getByRole("button", {
        name: "$ seq 1 400",
      });
      await commandLine.press("Enter");
      const keyboardExpanded = await commandLine.getAttribute(
        "aria-expanded",
      );
      const executionSummary = page
        .locator(
          '[data-item-id="command-long-output"] > .codex-ui-activity__disclosure > summary',
        );
      await executionSummary.click();
      const collapsed = await page.evaluate(() => ({
        expanded:
          document
            .querySelector(
              '[data-item-id="command-long-output"] .codex-ui-activity__disclosure',
            )
            ?.hasAttribute("open") ?? false,
      }));
      const collapsedOutputVisible = await page
        .locator(
          '[data-item-id="command-long-output"] .codex-ui-command-output',
        )
        .isVisible();
      await executionSummary.click();
      const restoredBottom = await page.evaluate(() => {
        const output = document.querySelector(
          '[data-item-id="command-long-output"] .codex-ui-command-output pre',
        );
        return output ? output.scrollTop : null;
      });
      if (
        keyboardExpanded !== "true" ||
        collapsed.expanded ||
        collapsedOutputVisible ||
        restoredBottom === null ||
        Math.abs(restoredBottom) > 1
      ) {
        throw new Error(
          `${scene.id}: command keyboard/collapse restoration failed: ${JSON.stringify({
            collapsed,
            collapsedOutputVisible,
            keyboardExpanded,
            restoredBottom,
          })}`,
        );
      }
    }

    if (
      scene.id === "command-failure-running" ||
      scene.id === "command-failure-collapsed" ||
      scene.id === "command-failure-expanded"
    ) {
      const commandOutput = contract.commandOutput;
      const running = scene.id === "command-failure-running";
      const expanded = scene.id !== "command-failure-collapsed";
      if (
        !commandOutput ||
        !commandOutput.timelineExpanded ||
        commandOutput.timelineLabel !==
          (running ? "Working" : "Worked for 12s") ||
        commandOutput.executionExpanded !== expanded ||
        commandOutput.status !== (running ? "running" : "failed") ||
        !commandOutput.summary?.startsWith(
          running ? "Running command" : "Ran sh -c 'i=1;",
        ) ||
        !commandOutput.commandLabel?.startsWith("$ sh -c 'i=1;") ||
        commandOutput.commandExpanded !== "false" ||
        commandOutput.lineCount !== 161 ||
        commandOutput.shellLabel !== "Shell" ||
        commandOutput.copyLabels.filter((label) => label === "Copy").length !==
          2
      ) {
        throw new Error(
          `${scene.id}: command failure lifecycle contract failed: ${JSON.stringify(commandOutput)}`,
        );
      }

      if (
        expanded &&
        (!commandOutput.shell ||
          Math.abs(commandOutput.shell.rect.width - 736) > 1 ||
          commandOutput.shell.style.borderRadius !== "12.5px" ||
          commandOutput.shell.style.overflow !== "hidden" ||
          !commandOutput.output ||
          Math.abs(commandOutput.output.rect.width - 734) > 1 ||
          Math.abs(commandOutput.output.rect.height - 144) > 1 ||
          commandOutput.output.clientHeight !== 144 ||
          commandOutput.output.scrollHeight !== 3136 ||
          Math.abs(commandOutput.output.scrollTop) > 1 ||
          commandOutput.output.style.flexDirection !== "column-reverse" ||
          commandOutput.output.style.fontSize !== "13px" ||
          commandOutput.output.style.lineHeight !== "19.5px" ||
          commandOutput.output.style.maxHeight !== "144px" ||
          commandOutput.output.style.overflowY !== "auto" ||
          commandOutput.output.style.padding !== "8px" ||
          commandOutput.output.textStart !== "stderr-001\ns" ||
          !commandOutput.output.textEnd.endsWith("080\nstderr-080\n") ||
          (!running && commandOutput.footer?.text !== "Exit code 7"))
      ) {
        throw new Error(
          `${scene.id}: expanded command failure output contract failed: ${JSON.stringify(commandOutput)}`,
        );
      }

      if (scene.id === "command-failure-expanded") {
        const commandLine = page.locator(
          '[data-item-id="command-failure-output"] .codex-ui-command-execution__command-line',
        );
        await commandLine.press("Enter");
        const keyboardExpanded = await commandLine.getAttribute(
          "aria-expanded",
        );
        const executionSummary = page
          .locator(
            '[data-item-id="command-failure-output"] > .codex-ui-activity__disclosure > summary',
          );
        await executionSummary.click();
        const collapsedOutputVisible = await page
          .locator(
            '[data-item-id="command-failure-output"] .codex-ui-command-output',
          )
          .isVisible();
        await executionSummary.click();
        const restoredBottom = await page.evaluate(() => {
          const output = document.querySelector(
            '[data-item-id="command-failure-output"] .codex-ui-command-output pre',
          );
          return output ? output.scrollTop : null;
        });
        if (
          keyboardExpanded !== "true" ||
          collapsedOutputVisible ||
          restoredBottom === null ||
          Math.abs(restoredBottom) > 1
        ) {
          throw new Error(
            `${scene.id}: failure output keyboard/collapse restoration failed: ${JSON.stringify({
              collapsedOutputVisible,
              keyboardExpanded,
              restoredBottom,
            })}`,
          );
        }
      }
    }

    if (scene.id.startsWith("command-interruption-")) {
      const commandOutput = contract.commandOutput;
      const running = scene.id === "command-interruption-running";
      const recovered = scene.id === "command-interruption-recovered";
      const interruptionState = await page.evaluate(() => ({
        assistantText:
          document
            .querySelector(
              '[data-item-id="assistant-command-interruption-recovery"] .codex-ui-markdown',
            )
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        composerPhase: document
          .querySelector(".demo-root")
          ?.getAttribute("data-composer-phase"),
        sendCount: [...document.querySelectorAll("button")].filter(
          (button) =>
            button.getAttribute("aria-label") === "Send" ||
            button.textContent?.trim() === "Send",
        ).length,
        stopCount: [...document.querySelectorAll("button")].filter(
          (button) =>
            button.getAttribute("aria-label") === "Stop" ||
            button.textContent?.trim() === "Stop",
        ).length,
      }));
      const expectedRootStatus = running
        ? "running"
        : recovered
          ? "completed"
          : "interrupted";
      const expectedCommandStatus = running ? "running" : "interrupted";
      const expectedSummaryPrefix = running
        ? "Running for i in $(seq 1 120)"
        : "Background terminal stopped with for i in $(seq 1 120)";
      if (
        !commandOutput ||
        contract.rootStatus !== expectedRootStatus ||
        commandOutput.status !== expectedCommandStatus ||
        !commandOutput.summary?.startsWith(expectedSummaryPrefix) ||
        commandOutput.executionExpanded !== false ||
        commandOutput.timelineExpanded !== running ||
        commandOutput.timelineLabel !== (running ? "Working for 7s" : null) ||
        Math.abs((commandOutput.header?.rect.width ?? 0) - 736) > 1 ||
        Math.abs((commandOutput.header?.rect.height ?? 0) - 21) > 1 ||
        commandOutput.header?.style.fontSize !== "14px" ||
        commandOutput.header?.style.fontWeight !== "445" ||
        commandOutput.header?.style.lineHeight !== "21px" ||
        interruptionState.composerPhase !== (running ? "running" : "idle") ||
        interruptionState.stopCount !== (running ? 1 : 0) ||
        interruptionState.sendCount !== (running ? 0 : 1) ||
        (running
          ? commandOutput.compactDetail !== null ||
            contract.interruption !== null
          : commandOutput.compactDetail !== null ||
            !contract.interruption ||
            contract.interruption.status !== "stopped" ||
            contract.interruption.label?.text !== "You stopped after 8s" ||
            contract.interruption.label?.style.fontSize !== "14px" ||
            contract.interruption.label?.style.fontWeight !== "445" ||
            contract.interruption.label?.style.lineHeight !== "21px" ||
            Math.abs((contract.interruption.rect.width ?? 0) - 736) > 1 ||
            Math.abs((contract.interruption.label?.rect.height ?? 0) - 21) > 1 ||
            contract.interruption.rule?.style.height !== "1px" ||
            contract.interruption.rule?.style.marginTop !== "8px") ||
        (recovered
          ? interruptionState.assistantText !==
            "CURRENT INTERRUPTION RECOVERY ACCEPTED"
          : interruptionState.assistantText !== null)
      ) {
        throw new Error(
          `${scene.id}: current command interruption contract failed: ${JSON.stringify({
            commandOutput,
            interruption: contract.interruption,
            interruptionState,
            rootStatus: contract.rootStatus,
          })}`,
        );
      }
    }

    if (scene.id.startsWith("context-compaction-")) {
      const commandMenu = scene.id === "context-compaction-command-menu";
      const running = scene.id === "context-compaction-running";
      const recovered = scene.id === "context-compaction-recovered";
      const compactionState = await page.evaluate(() => ({
        assistantText:
          document
            .querySelector(
              '[data-item-id="assistant-context-compaction-recovery"] .codex-ui-markdown',
            )
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        commandDescription:
          document
            .querySelector(".demo-compaction-command__description")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? null,
        commandLabel:
          document
            .querySelector(".demo-compaction-command__label")
            ?.textContent?.trim() ?? null,
        composerPhase: document
          .querySelector(".demo-root")
          ?.getAttribute("data-composer-phase"),
        composerValue: (() => {
          const composer = document.querySelector(
            '[aria-label="Message composer"]',
          );
          return composer
            ? ("value" in composer
                ? composer.value
                : composer.textContent ?? ""
              ).trim()
            : null;
        })(),
        sendCount: [...document.querySelectorAll("button")].filter(
          (button) =>
            button.getAttribute("aria-label") === "Send" ||
            button.textContent?.trim() === "Send",
        ).length,
        stopCount: [...document.querySelectorAll("button")].filter(
          (button) =>
            button.getAttribute("aria-label") === "Stop" ||
            button.textContent?.trim() === "Stop",
        ).length,
      }));
      const context = contract.contextCompaction;
      if (
        contract.rootStatus !== (running ? "running" : "completed") ||
        compactionState.composerPhase !== (running ? "running" : "idle") ||
        compactionState.stopCount !== (running ? 1 : 0) ||
        compactionState.sendCount !== (running ? 0 : 1) ||
        (commandMenu
          ? context !== null ||
            compactionState.commandLabel !== "Compact" ||
            compactionState.commandDescription !==
              "Compact this chat's context (9% full)" ||
            compactionState.composerValue !== "/compact"
          : !context ||
            context.eventStatus !== (running ? "running" : "completed") ||
            context.mode !== "manual" ||
            context.optimizationStatus !==
              (running ? "running" : "completed") ||
            context.text !==
              (running ? "Compacting context" : "Context compacted") ||
            context.textStyle?.fontSize !== "14px" ||
            context.textStyle?.fontWeight !== "445" ||
            context.textStyle?.lineHeight !== "21px" ||
            Math.abs((context.eventRect.width ?? 0) - 736) > 1 ||
            (running
              ? context.working !== "Working" ||
                context.rule?.style.height !== "1px"
              : context.working !== null || context.rule !== null)) ||
        (recovered
          ? compactionState.assistantText !== "COMPACTION RECOVERY ACCEPTED"
          : compactionState.assistantText !== null)
      ) {
        throw new Error(
          `${scene.id}: current context compaction contract failed: ${JSON.stringify({
            compactionState,
            context,
            rootStatus: contract.rootStatus,
          })}`,
        );
      }
    }

    if (scene.id === "context-summary-open") {
      const summary = await page.evaluate(() => {
        const rect = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            height: value.height,
            left: value.left,
            top: value.top,
            width: value.width,
          };
        };
        const style = (element) => {
          if (!element) return null;
          const value = getComputedStyle(element);
          return {
            backgroundColor: value.backgroundColor,
            borderRadius: value.borderRadius,
            fontFamily: value.fontFamily,
            fontSize: value.fontSize,
            fontWeight: value.fontWeight,
            lineHeight: value.lineHeight,
            padding: value.padding,
          };
        };
        const trigger = document.querySelector(
          'button[aria-label="Toggle summary"]',
        );
        const popover = document.querySelector(
          ".codex-ui-thread-summary-popover",
        );
        const panel = document.querySelector(
          ".codex-ui-thread-summary-panel",
        );
        const section = document.querySelector(
          ".codex-ui-thread-summary-section",
        );
        const rows = [...document.querySelectorAll(
          ".codex-ui-thread-summary-item",
        )];
        return {
          delta:
            document
              .querySelector(".codex-ui-thread-summary-delta")
              ?.textContent?.trim() ?? null,
          panel: { rect: rect(panel), style: style(panel) },
          popover: { rect: rect(popover), style: style(popover) },
          rows: rows.map((row) => ({
            disabled: row.hasAttribute("disabled"),
            rect: rect(row),
            text: row.textContent?.replace(/\s+/g, " ").trim() ?? "",
          })),
          sectionExpanded: section?.getAttribute("data-expanded") ?? null,
          trigger: {
            expanded: trigger?.getAttribute("aria-expanded") ?? null,
            pressed: trigger?.getAttribute("aria-pressed") ?? null,
            rect: rect(trigger),
          },
        };
      });
      if (
        summary.trigger.pressed !== "true" ||
        summary.trigger.expanded !== "true" ||
        Math.abs((summary.trigger.rect?.height ?? 0) - 28) > 1 ||
        Math.abs((summary.trigger.rect?.width ?? 0) - 28) > 1 ||
        Math.abs((summary.trigger.rect?.top ?? 0) - 9) > 1 ||
        Math.abs((summary.popover.rect?.left ?? 0) - 804) > 1 ||
        Math.abs((summary.popover.rect?.top ?? 0) - 45) > 1 ||
        Math.abs((summary.popover.rect?.width ?? 0) - 300) > 1 ||
        Math.abs((summary.popover.rect?.height ?? 0) - 199) > 1 ||
        summary.panel.style?.backgroundColor !== "rgb(45, 45, 45)" ||
        summary.panel.style?.borderRadius !== "25px" ||
        summary.panel.style?.fontSize !== "14px" ||
        summary.panel.style?.fontWeight !== "445" ||
        summary.panel.style?.lineHeight !== "21px" ||
        summary.sectionExpanded !== "true" ||
        summary.rows.length !== 5 ||
        summary.rows.some(
          ({ rect: value }) =>
            !value ||
            Math.abs(value.height - 29) > 1 ||
            Math.abs(value.width - 272) > 1,
        ) ||
        summary.rows.filter(({ disabled }) => disabled).length !== 1 ||
        summary.delta !== "+0-0"
      ) {
        throw new Error(
          `${scene.id}: current thread summary contract failed: ${JSON.stringify(summary)}`,
        );
      }
    }

    if (
      scene.id !== "composer-disabled" &&
      scene.id !== "approval-current-pending" &&
      scene.id !== "approval-current-options" &&
      scene.id !== "current-review-undo-failed"
    ) {
      const expectedFocus = scene.surfaces?.includes("reviewPanel")
        ? contract.review.firstContentLabel
        : "Message composer";
      if (!expectedFocus) {
        throw new Error(`${scene.id}: expected focus target is missing.`);
      }
      const focusTarget = scene.surfaces?.includes("reviewPanel")
        ? page.getByLabel(expectedFocus)
        : page.getByRole("textbox", { name: expectedFocus });
      await focusTarget.click();
      const focusContract = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label"),
      );
      if (focusContract !== expectedFocus) {
        throw new Error(`${scene.id}: named focus contract failed.`);
      }
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

const currentReviewInteractionScene = {
  frame: "review-open",
  id: "current-review-rename-interaction",
  scenario: "current-review-rename",
};
const {
  app: currentReviewInteractionApp,
  page: currentReviewInteractionPage,
} = await launchScene(currentReviewInteractionScene, { capture: false });
try {
  const sourcePath = ".research/current-review-probe/rename-only.txt";
  const destinationPath =
    ".research/current-review-probe/renamed-only.txt";
  const destinationSelection = currentReviewInteractionPage.getByRole(
    "button",
    { name: `Select review for ${destinationPath}` },
  );
  await destinationSelection.focus();
  await destinationSelection.press("Enter");
  const selected = await currentReviewInteractionPage.evaluate(
    ({ destinationPath, sourcePath }) => ({
      destinationSelected:
        document
          .querySelector(
            `.codex-ui-file-review__file[aria-label="Review file ${destinationPath}"]`,
          )
          ?.getAttribute("data-selected") === "true",
      markerLineCount: [...document.querySelectorAll(".codex-ui-file-diff__line")]
        .filter((element) =>
          element.textContent?.includes("__CODEX_TEMP_RENAME_MARKER__"),
        ).length,
      sourceDiffCount: document.querySelectorAll(
        `.codex-ui-file-diff[aria-label="Review diff for ${sourcePath}"]`,
      ).length,
    }),
    { destinationPath, sourcePath },
  );
  if (
    !selected.destinationSelected ||
    selected.markerLineCount !== 2 ||
    selected.sourceDiffCount !== 1
  ) {
    throw new Error(
      `Current Review keyboard selection failed: ${JSON.stringify(selected)}`,
    );
  }

  await currentReviewInteractionPage
    .getByRole("button", { exact: true, name: "Close review" })
    .click();
  await currentReviewInteractionPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  const reopen = currentReviewInteractionPage.getByRole("button", {
    name: `Open ${destinationPath}`,
  });
  await reopen.focus();
  await reopen.press("Enter");
  await currentReviewInteractionPage.waitForSelector(
    `.codex-ui-file-review__file[data-selected][aria-label="Review file ${destinationPath}"]`,
  );
  await currentReviewInteractionPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  await currentReviewInteractionPage.waitForSelector(
    '[data-testid="file-change-group"]',
    { state: "detached" },
  );
  await currentReviewInteractionPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  const settled = await currentReviewInteractionPage.evaluate(() => ({
    fileGroupCount: document.querySelectorAll(
      '[data-testid="file-change-group"]',
    ).length,
    panelOpen: document
      .querySelector(".codex-ui-app-shell")
      ?.hasAttribute("data-side-panel-open"),
  }));
  if (settled.fileGroupCount !== 0 || settled.panelOpen !== false) {
    throw new Error(
      `Current Review Undo settlement failed: ${JSON.stringify(settled)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "current-review-rename-interaction.json"),
    `${JSON.stringify({ selected, settled }, null, 2)}\n`,
  );
} finally {
  await currentReviewInteractionApp.close();
}

const currentReviewFilesScene = {
  frame: "review-open",
  id: "current-review-files-interaction",
  scenario: "current-review-files",
};
const { app: currentReviewFilesApp, page: currentReviewFilesPage } =
  await launchScene(currentReviewFilesScene, { capture: false });
try {
  const readReviewWorkspace = () =>
    currentReviewFilesPage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof Element)) return null;
        const value = element.getBoundingClientRect();
        return {
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const workspace = document.querySelector(
        ".codex-ui-file-review-workspace",
      );
      return {
        diffCount: document.querySelectorAll(
          ".codex-ui-file-review-workspace__diff",
        ).length,
        fileTreeCount: document.querySelectorAll(
          '.codex-ui-file-review-workspace__tree [role="treeitem"]',
        ).length,
        filter: rect(".codex-ui-file-review-workspace__filter input"),
        header: rect(".codex-ui-workspace-panel__header"),
        layout: workspace?.getAttribute("data-layout"),
        panel: rect(".codex-ui-app-shell__side-panel"),
        toolbar: rect(".codex-ui-file-review-workspace__toolbar"),
        visibleHeaderPathCount: [...document.querySelectorAll(
          ".codex-ui-file-review-workspace__file-identity code",
        )].filter((element) => getComputedStyle(element).display !== "none")
          .length,
        visible: workspace?.getAttribute("data-files-visible") === "true",
      };
    });
  const initial = await readReviewWorkspace();
  if (
    initial.diffCount !== 3 ||
    initial.fileTreeCount !== 3 ||
    initial.layout !== "unified" ||
    !initial.visible ||
    Math.abs((initial.panel?.width ?? 0) - 382.4375) > 1 ||
    Math.abs((initial.header?.height ?? 0) - 46) > 1 ||
    Math.abs((initial.toolbar?.height ?? 0) - 40) > 1 ||
    Math.abs((initial.filter?.height ?? 0) - 18) > 1 ||
    Math.abs((initial.filter?.width ?? 0) - 182) > 1 ||
    initial.visibleHeaderPathCount !== 0
  ) {
    throw new Error(
      `Current Review workspace geometry failed: ${JSON.stringify(initial)}`,
    );
  }

  const requestedReviewPath =
    "research/current-review-26-810-probe/alpha.txt";
  await currentReviewFilesPage
    .getByRole("button", { exact: true, name: "Close tab" })
    .click();
  await currentReviewFilesPage.waitForSelector(
    ".codex-ui-app-shell:not([data-side-panel-open])",
  );
  await currentReviewFilesPage
    .getByRole("button", { exact: true, name: `Open ${requestedReviewPath}` })
    .click();
  await currentReviewFilesPage.waitForSelector(
    '.codex-ui-app-shell[data-side-panel-open] [data-testid="current-review-workspace"]',
  );
  if (
    (await currentReviewFilesPage
      .getByRole("treeitem", { name: `Select ${requestedReviewPath}` })
      .getAttribute("data-selected")) !== "true"
  ) {
    throw new Error(
      "Current Review file-card reopen did not reveal the requested path.",
    );
  }

  const scopeButton = currentReviewFilesPage.getByRole("button", {
    exact: true,
    name: "Last Turn",
  });
  await scopeButton.click();
  const scopeItems = currentReviewFilesPage.getByRole("menuitemradio");
  if ((await scopeItems.count()) !== 6) {
    throw new Error("Current Review scope menu must expose six choices.");
  }
  await scopeItems.filter({ hasText: "Branch" }).focus();
  await scopeItems.filter({ hasText: "Branch" }).press("Escape");
  await currentReviewFilesPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-haspopup") === "menu" &&
      !document.querySelector('[role="menu"][aria-label="Review scope"]'),
  );

  const filter = currentReviewFilesPage.getByRole("searchbox", {
    name: "Filter files",
  });
  await filter.fill("alpha");
  if (
    (await currentReviewFilesPage.getByRole("treeitem").count()) !== 1 ||
    !(await currentReviewFilesPage.getByRole("treeitem").first().innerText()).includes(
      "alpha.txt",
    )
  ) {
    throw new Error("Current Review filter did not isolate alpha.txt.");
  }
  await filter.fill("");

  await currentReviewFilesPage
    .getByRole("button", { name: "Collapse all diffs" })
    .click();
  if (
    (await currentReviewFilesPage
      .locator(".codex-ui-file-review-workspace__diff[data-collapsed]")
      .count()) !== 3
  ) {
    throw new Error("Current Review collapse-all did not collapse every diff.");
  }
  await currentReviewFilesPage
    .getByRole("button", { name: "Expand all diffs" })
    .click();
  await currentReviewFilesPage
    .getByRole("button", { name: "Switch to split diff" })
    .click();
  const splitDiff = await currentReviewFilesPage.evaluate(() => {
    const pairedRow = [...document.querySelectorAll(
      ".codex-ui-file-diff__split-row",
    )].find((element) =>
      element.getAttribute("aria-label")?.includes("alpha baseline"),
    );
    return {
      after: pairedRow
        ?.querySelector('[data-side="new"] code')
        ?.textContent?.trim(),
      before: pairedRow
        ?.querySelector('[data-side="old"] code')
        ?.textContent?.trim(),
      paneCount: document.querySelectorAll(
        ".codex-ui-file-diff__split-pane",
      ).length,
      splitDiffCount: document.querySelectorAll(
        '.codex-ui-file-diff[data-layout="split"]',
      ).length,
    };
  });
  if (
    splitDiff.splitDiffCount !== 3 ||
    splitDiff.paneCount !== 12 ||
    splitDiff.before !== "alpha baseline" ||
    splitDiff.after !== "alpha updated"
  ) {
    throw new Error(
      `Current Review split diff did not create paired panes: ${JSON.stringify(splitDiff)}`,
    );
  }
  await currentReviewFilesPage
    .getByRole("button", { name: "Hide files" })
    .click();
  const compact = await readReviewWorkspace();
  if (
    compact.layout !== "split" ||
    compact.visible ||
    compact.visibleHeaderPathCount !== 3
  ) {
    throw new Error(
      `Current Review layout controls failed: ${JSON.stringify(compact)}`,
    );
  }
  await currentReviewFilesPage
    .getByRole("button", { name: "Show files" })
    .click();

  const reviewResizer = currentReviewFilesPage.getByRole("separator", {
    name: "Resize workspace panel",
  });
  await reviewResizer.press("Home");
  const narrowToolbar = await currentReviewFilesPage.evaluate(() => {
    const panel = document.querySelector(".codex-ui-app-shell__side-panel");
    const toolbar = document.querySelector(
      ".codex-ui-file-review-workspace__toolbar",
    );
    const optionalActions = [...document.querySelectorAll(
      ".codex-ui-file-review-workspace__optional-action",
    )];
    const gitActions = document.querySelector(
      ".codex-ui-file-review-workspace__git-actions",
    );
    return {
      clientWidth: toolbar?.clientWidth ?? null,
      gitDisplay: gitActions ? getComputedStyle(gitActions).display : null,
      optionalVisibleCount: optionalActions.filter(
        (element) => getComputedStyle(element).display !== "none",
      ).length,
      panelWidth: panel?.getBoundingClientRect().width ?? null,
      scrollWidth: toolbar?.scrollWidth ?? null,
    };
  });
  if (
    Math.abs((narrowToolbar.panelWidth ?? 0) - 320) > 1 ||
    narrowToolbar.gitDisplay !== "none" ||
    narrowToolbar.optionalVisibleCount !== 0 ||
    narrowToolbar.clientWidth === null ||
    narrowToolbar.scrollWidth === null ||
    narrowToolbar.scrollWidth > narrowToolbar.clientWidth + 1
  ) {
    throw new Error(
      `Current Review narrow toolbar overflowed: ${JSON.stringify(narrowToolbar)}`,
    );
  }

  const jumpButton = currentReviewFilesPage.getByRole("button", {
    name: "Jump to file",
  });
  await jumpButton.click();
  const jumpOptions = currentReviewFilesPage.getByRole("option");
  if ((await jumpOptions.count()) !== 3) {
    throw new Error("Current Review jump menu must expose three files.");
  }
  await jumpOptions.filter({ hasText: "obsolete.txt" }).click();
  if (
    (await currentReviewFilesPage
      .locator(
        '.codex-ui-file-review-workspace__tree [role="treeitem"][data-selected]',
      )
      .innerText())
      .trim()
      .includes("obsolete.txt") === false
  ) {
    throw new Error("Current Review jump selection did not reach obsolete.txt.");
  }

  await currentReviewFilesPage
    .getByRole("button", { exact: true, name: "Undo" })
    .click();
  const dialog = currentReviewFilesPage.getByRole("dialog", {
    name: "Failed to revert changes",
  });
  await dialog.waitFor();
  const failure = {
    description: await dialog
      .getByText("Git apply error: error: patch with only garbage at line 4")
      .innerText(),
    fileGroupCount: await currentReviewFilesPage
      .locator('[data-testid="file-change-group"]')
      .count(),
    panelOpen: await currentReviewFilesPage
      .locator(".codex-ui-app-shell")
      .evaluate((element) => element.hasAttribute("data-side-panel-open")),
  };
  if (failure.fileGroupCount !== 1 || !failure.panelOpen) {
    throw new Error(
      `Current Review Undo failure lost state: ${JSON.stringify(failure)}`,
    );
  }
  await dialog.getByRole("button", { exact: true, name: "Close" }).click();

  await writeFile(
    join(artifactDirectory, "current-review-files-interaction.json"),
    `${JSON.stringify({ compact, failure, initial }, null, 2)}\n`,
  );
} finally {
  await currentReviewFilesApp.close();
}

const {
  app: currentReviewFilesLightApp,
  page: currentReviewFilesLightPage,
} = await launchScene(currentReviewFilesScene, {
  capture: false,
});
try {
  await currentReviewFilesLightPage
    .locator(".demo-root")
    .evaluate((element) => element.setAttribute("data-theme", "light"));
  const lightContrast = await currentReviewFilesLightPage.evaluate(() => {
    const parseRgb = (value) =>
      value
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number) ?? [];
    const luminance = (channels) => {
      const linear = channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const ratio = (foreground, background) => {
      const foregroundLuminance = luminance(parseRgb(foreground));
      const backgroundLuminance = luminance(parseRgb(background));
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      );
    };
    const files = document.querySelector(
      ".codex-ui-file-review-workspace__files",
    );
    const treeItem = document.querySelector(
      '.codex-ui-file-review-workspace__tree [role="treeitem"]',
    );
    const filterInput = document.querySelector(
      ".codex-ui-file-review-workspace__filter input",
    );
    const diffHeader = document.querySelector(
      ".codex-ui-file-review-workspace__diff > header",
    );
    const diffHeaderPath = diffHeader?.querySelector("code");
    const diffSurface = document.querySelector(
      ".codex-ui-file-review-workspace__diff > .codex-ui-file-diff",
    );
    if (!(files instanceof HTMLElement)) return null;
    const background = getComputedStyle(files).backgroundColor;
    const treeColor = treeItem ? getComputedStyle(treeItem).color : "";
    const filterColor = filterInput ? getComputedStyle(filterInput).color : "";
    const diffBackground = diffSurface
      ? getComputedStyle(diffSurface).backgroundColor
      : "";
    const diffColor = diffSurface ? getComputedStyle(diffSurface).color : "";
    const headerBackground = diffHeader
      ? getComputedStyle(diffHeader).backgroundColor
      : "";
    const headerColor = diffHeaderPath
      ? getComputedStyle(diffHeaderPath).color
      : "";
    return {
      background,
      diffBackground,
      diffColor,
      diffContrast: ratio(diffColor, diffBackground),
      filterContrast: ratio(filterColor, background),
      filterColor,
      headerBackground,
      headerColor,
      headerContrast: ratio(headerColor, headerBackground),
      treeColor,
      treeContrast: ratio(treeColor, background),
    };
  });
  if (
    !lightContrast ||
    ![
      lightContrast.background,
      lightContrast.diffBackground,
      lightContrast.diffColor,
      lightContrast.filterColor,
      lightContrast.headerBackground,
      lightContrast.headerColor,
      lightContrast.treeColor,
    ].every((value) => value.startsWith("rgb(")) ||
    !Number.isFinite(lightContrast.treeContrast) ||
    !Number.isFinite(lightContrast.filterContrast) ||
    !Number.isFinite(lightContrast.headerContrast) ||
    !Number.isFinite(lightContrast.diffContrast) ||
    lightContrast.treeContrast < 4.5 ||
    lightContrast.filterContrast < 4.5 ||
    lightContrast.headerContrast < 4.5 ||
    lightContrast.diffContrast < 4.5
  ) {
    throw new Error(
      `Current Review light file-tree contrast failed: ${JSON.stringify(lightContrast)}`,
    );
  }
} finally {
  await currentReviewFilesLightApp.close();
}

const commandInterruptionNoFrameScene = {
  frame: "command-interruption-recovered",
  id: "command-interruption-no-frame",
  scenario: "interruption",
};
const {
  app: commandInterruptionNoFrameApp,
  page: commandInterruptionNoFramePage,
} = await launchScene(commandInterruptionNoFrameScene, { capture: false });
try {
  const noFrameUrl = new URL(commandInterruptionNoFramePage.url());
  noFrameUrl.searchParams.delete("frame");
  await commandInterruptionNoFramePage.goto(noFrameUrl.href);
  await commandInterruptionNoFramePage.emulateMedia({
    reducedMotion: "reduce",
  });
  await commandInterruptionNoFramePage.waitForSelector(
    '.demo-root[data-frame="command-interruption-recovered"][data-status="completed"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const noFrameReplayPosition = commandInterruptionNoFramePage.getByRole(
    "slider",
    { name: "Protocol event position" },
  );
  await noFrameReplayPosition.fill("3");
  await commandInterruptionNoFramePage.waitForSelector(
    '.demo-root[data-frame="command-interruption-running"][data-status="running"] [data-item-id="command-interruption"][data-execution-status="running"]',
  );
  if (
    (await commandInterruptionNoFramePage
      .getByText("Working for 7s", { exact: true })
      .count()) !== 1
  ) {
    throw new Error(
      "Current command replay position dropped the running timeline.",
    );
  }
  await noFrameReplayPosition.fill("4");
  await commandInterruptionNoFramePage.waitForSelector(
    '.demo-root[data-frame="command-interruption-stopping"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="interrupted"] .demo-command-stop-indicator',
  );
  await noFrameReplayPosition.press("End");
  await commandInterruptionNoFramePage.waitForSelector(
    '.demo-root[data-frame="command-interruption-recovered"][data-status="completed"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const noFrameState = await commandInterruptionNoFramePage.evaluate(() => ({
    assistantText:
      document
        .querySelector(
          '[data-item-id="assistant-command-interruption-recovery"] .codex-ui-markdown',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    commandSummary:
      document
        .querySelector(
          '[data-item-id="command-interruption"] .codex-ui-activity__summary',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
  }));
  if (
    noFrameState.assistantText !==
      "CURRENT INTERRUPTION RECOVERY ACCEPTED" ||
    !noFrameState.commandSummary?.startsWith(
      "Background terminal stopped with for i in $(seq 1 120)",
    )
  ) {
    throw new Error(
      `Current command no-frame settlement failed: ${JSON.stringify(noFrameState)}`,
    );
  }
  const unknownFrameUrl = new URL(commandInterruptionNoFramePage.url());
  unknownFrameUrl.searchParams.set("frame", "command-interruption-stale");
  await commandInterruptionNoFramePage.goto(unknownFrameUrl.href);
  await commandInterruptionNoFramePage.waitForSelector(
    '.demo-root[data-frame="command-interruption-stale"][data-status="completed"] [data-item-id="command-interruption"][data-execution-status="interrupted"] .demo-command-stop-indicator',
  );
  const unknownFrameSummary =
    await commandInterruptionNoFramePage
      .locator(
        '[data-item-id="command-interruption"] .codex-ui-activity__summary',
      )
      .textContent();
  if (
    !unknownFrameSummary
      ?.replace(/\s+/g, " ")
      .trim()
      .startsWith("Background terminal stopped with for i in $(seq 1 120)")
  ) {
    throw new Error(
      `Current command unknown-frame settlement failed: ${unknownFrameSummary}`,
    );
  }
} finally {
  await commandInterruptionNoFrameApp.close();
}

const commandInterruptionScene = {
  frame: "command-interruption-running",
  id: "command-interruption-interaction",
  scenario: "interruption",
};
const {
  app: commandInterruptionApp,
  page: commandInterruptionPage,
} = await launchScene(commandInterruptionScene, { capture: false });
try {
  const stop = commandInterruptionPage.getByRole("button", {
    exact: true,
    name: "Stop",
  });
  if ((await stop.count()) !== 1) {
    throw new Error("Current command interruption did not expose one Stop action.");
  }
  await stop.click();
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-stopping"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const stopping = await commandInterruptionPage.evaluate(() => ({
    commandSummary:
      document
        .querySelector(
          '[data-item-id="command-interruption"] .codex-ui-activity__summary',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    interruption:
      document
        .querySelector(".codex-ui-thread-interruption-summary__label")
        ?.textContent?.trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) =>
        button.getAttribute("aria-label") === "Stop" ||
        button.textContent?.trim() === "Stop",
    ).length,
    stopAllCount: document.querySelectorAll(
      '[aria-label="Stop all background terminals"]',
    ).length,
    stopProcessCount: document.querySelectorAll(
      '[aria-label="Stop Background terminal"]',
    ).length,
  }));
  if (
    !stopping.commandSummary?.startsWith(
      "Background terminal stopped with for i in $(seq 1 120)",
    ) ||
    stopping.interruption !== "You stopped after 8s" ||
    stopping.stopCount !== 0 ||
    stopping.stopAllCount !== 1 ||
    stopping.stopProcessCount !== 1
  ) {
    throw new Error(
      `Current command Stop transition failed: ${JSON.stringify(stopping)}`,
    );
  }

  const prematureRecoveryPrompt =
    "Do not use tools. Reply exactly: CURRENT INTERRUPTION RECOVERY ACCEPTED";
  const prematureComposer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  await prematureComposer.fill(prematureRecoveryPrompt);
  await prematureComposer.press("Enter");
  await commandInterruptionPage.waitForTimeout(1_100);
  await commandInterruptionPage
    .getByRole("button", { name: "Stop all background terminals" })
    .waitFor({ state: "visible" });
  if (
    (await commandInterruptionPage
      .locator('.demo-root[data-frame="command-interruption-stopping"]')
      .count()) !== 1
  ) {
    throw new Error("Current command interruption accepted premature recovery.");
  }
  await commandInterruptionPage
    .getByRole("button", { name: "Stop all background terminals" })
    .click();
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-settled"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="interrupted"]',
  );
  const composer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  const recoveryPrompt = prematureRecoveryPrompt;
  await composer.fill(recoveryPrompt);
  await composer.press("Enter");
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-recovered"][data-status="completed"][data-composer-phase="idle"]',
  );
  await commandInterruptionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const recovered = await commandInterruptionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    assistantText:
      document
        .querySelector(
          '[data-item-id="assistant-command-interruption-recovery"] .codex-ui-markdown',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    commandStatus: document
      .querySelector('[data-item-id="command-interruption"]')
      ?.getAttribute("data-execution-status"),
    interruption:
      document
        .querySelector(".codex-ui-thread-interruption-summary__label")
        ?.textContent?.trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) =>
        button.getAttribute("aria-label") === "Stop" ||
        button.textContent?.trim() === "Stop",
    ).length,
  }));
  if (
    recovered.activeElement !== "Message composer" ||
    recovered.assistantText !== "CURRENT INTERRUPTION RECOVERY ACCEPTED" ||
    recovered.commandStatus !== "interrupted" ||
    recovered.interruption !== "You stopped after 8s" ||
    recovered.stopCount !== 0
  ) {
    throw new Error(
      `Current command same-thread recovery failed: ${JSON.stringify(recovered)}`,
    );
  }
  await composer.fill(
    "Navigation must retain focus while submission is pending",
  );
  const navigationLabel = "Protocol event position";
  await commandInterruptionPage.evaluate(async () => {
    const composer = document.querySelector('[aria-label="Message composer"]');
    if (!(composer instanceof HTMLTextAreaElement)) {
      throw new Error(
        "Message composer is unavailable for navigation focus probe.",
      );
    }
    composer.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Enter",
        key: "Enter",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve));
    const input = document.querySelector(
      '[aria-label="Protocol event position"]',
    );
    if (!(input instanceof HTMLInputElement)) {
      throw new Error(
        "Replay position is unavailable for navigation focus probe.",
      );
    }
    input.focus();
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setValue?.call(
      input,
      String(Math.max(Number(input.min), Number(input.value) - 1)),
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await commandInterruptionPage.waitForTimeout(250);
  const navigationFocus = await commandInterruptionPage.evaluate(
    (label) => ({
      activeElementAriaLabel:
        document.activeElement?.getAttribute("aria-label") ?? null,
      activeElementTagName: document.activeElement?.tagName ?? null,
      composerFocused:
        document.activeElement?.getAttribute("aria-label") ===
        "Message composer",
      label,
    }),
    navigationLabel,
  );
  if (navigationFocus.composerFocused) {
    throw new Error(
      `Replay navigation focus was stolen after canceling a pending submission: ${JSON.stringify(navigationFocus)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "command-interruption-interaction.json"),
    `${JSON.stringify({ navigationFocus, recovered, stopping }, null, 2)}\n`,
  );
} finally {
  await commandInterruptionApp.close();
}

const contextCompactionScene = {
  frame: "context-compaction-ready",
  id: "context-compaction-interaction",
  scenario: "compaction",
};
const {
  app: contextCompactionApp,
  page: contextCompactionPage,
} = await launchScene(contextCompactionScene, { capture: false });
try {
  const composer = contextCompactionPage.getByRole("textbox", {
    name: "Message composer",
  });
  const prematurePrompt = "Do not skip the compaction prerequisite";
  await composer.fill(prematurePrompt);
  await composer.press("Enter");
  const premature = await contextCompactionPage.evaluate(() => ({
    composerValue: (() => {
      const composer = document.querySelector(
        '[aria-label="Message composer"]',
      );
      return composer && "value" in composer ? composer.value : null;
    })(),
    frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
    recoveryCount: document.querySelectorAll(
      '[data-item-id="assistant-context-compaction-recovery"]',
    ).length,
  }));
  if (
    premature.composerValue !== prematurePrompt ||
    premature.frame !== "context-compaction-ready" ||
    premature.recoveryCount !== 0
  ) {
    throw new Error(
      `Current context compaction prerequisite gate failed: ${JSON.stringify(premature)}`,
    );
  }
  await composer.fill("/compact");
  const compactCommand = contextCompactionPage.getByRole("option", {
    name: "Compact this chat's context (9% full)",
  });
  await compactCommand.waitFor({ state: "visible" });
  await compactCommand.click();
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-running"][data-status="running"][data-composer-phase="running"] .codex-ui-thread-context-event[data-status="running"]',
  );
  const running = await contextCompactionPage.evaluate(() => ({
    label:
      document
        .querySelector(".codex-ui-thread-context-optimization")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
    working:
      document
        .querySelector(".codex-ui-thread-context-event__working")
        ?.textContent?.trim() ?? null,
  }));
  if (
    running.label !== "Compacting context" ||
    running.stopCount !== 1 ||
    running.working !== "Working"
  ) {
    throw new Error(
      `Current context compaction running transition failed: ${JSON.stringify(running)}`,
    );
  }
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-completed"][data-status="completed"][data-composer-phase="idle"] .codex-ui-thread-context-event[data-status="completed"]',
  );
  const recoveryPrompt =
    "Do not use tools. Reply with exactly: COMPACTION RECOVERY ACCEPTED";
  await composer.fill(recoveryPrompt);
  await composer.press("Enter");
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-recovered"][data-status="completed"][data-composer-phase="idle"] [data-item-id="assistant-context-compaction-recovery"]',
  );
  await contextCompactionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const recovered = await contextCompactionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    assistantText:
      document
        .querySelector(
          '[data-item-id="assistant-context-compaction-recovery"] .codex-ui-markdown',
        )
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    contextLabel:
      document
        .querySelector(".codex-ui-thread-context-optimization")
        ?.textContent?.replace(/\s+/g, " ")
        .trim() ?? null,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
  }));
  if (
    recovered.activeElement !== "Message composer" ||
    recovered.assistantText !== "COMPACTION RECOVERY ACCEPTED" ||
    recovered.contextLabel !== "Context compacted" ||
    recovered.stopCount !== 0
  ) {
    throw new Error(
      `Current context compaction same-thread recovery failed: ${JSON.stringify(recovered)}`,
    );
  }
  await composer.fill("/compact");
  await composer.press("Enter");
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-running"][data-status="running"] button[aria-label="Stop"]',
  );
  await contextCompactionPage.getByRole("button", { name: "Stop" }).click();
  await contextCompactionPage.waitForSelector(
    '.demo-root[data-frame="context-compaction-ready"][data-status="completed"][data-composer-phase="idle"]',
  );
  await contextCompactionPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const stopped = await contextCompactionPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    composerValue: (() => {
      const composer = document.querySelector(
        '[aria-label="Message composer"]',
      );
      return composer && "value" in composer ? composer.value : null;
    })(),
    contextCount: document.querySelectorAll(
      ".codex-ui-thread-context-event",
    ).length,
    stopCount: [...document.querySelectorAll("button")].filter(
      (button) => button.getAttribute("aria-label") === "Stop",
    ).length,
  }));
  if (
    stopped.activeElement !== "Message composer" ||
    stopped.composerValue !== "" ||
    stopped.contextCount !== 0 ||
    stopped.stopCount !== 0
  ) {
    throw new Error(
      `Current context compaction Stop reset failed: ${JSON.stringify(stopped)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "context-compaction-interaction.json"),
    `${JSON.stringify({ premature, recovered, running, stopped }, null, 2)}\n`,
  );
} finally {
  await contextCompactionApp.close();
}

const interactivePullRequestScene = {
  frame: "pr-checks-failed",
  id: "pr-lifecycle-interactive",
  scenario: "workspace-workflow",
  view: "pull-request",
};
const {
  app: interactivePullRequestApp,
  page: interactivePullRequestPage,
} = await launchScene(interactivePullRequestScene, { capture: false });
try {
  const initial = await interactivePullRequestPage.evaluate(() => ({
    failedChecks: document.querySelectorAll(
      '.codex-ui-pull-request-checks li[data-status="failed"]',
    ).length,
    mergeStatus:
      document
        .querySelector(".codex-ui-pull-request-merge-readiness")
        ?.getAttribute("data-status") ?? null,
    retryVisible: [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Re-run checks",
    ),
  }));
  if (
    initial.failedChecks !== 2 ||
    initial.mergeStatus !== "blocked" ||
    !initial.retryVisible
  ) {
    throw new Error(
      `pr-lifecycle-interactive: non-capture details missing: ${JSON.stringify(initial)}`,
    );
  }

  await interactivePullRequestPage
    .getByRole("button", { exact: true, name: "Re-run checks" })
    .click();
  await interactivePullRequestPage.waitForSelector(
    '.codex-ui-pull-request-merge-readiness[data-status="checking"]',
  );
  await interactivePullRequestPage.waitForFunction(() => {
    const merge = document.querySelector(
      ".codex-ui-pull-request-merge-readiness",
    );
    const openReview = [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Open review",
    );
    return merge?.getAttribute("data-status") === "blocked" && openReview;
  });
  const settled = await interactivePullRequestPage.evaluate(() => ({
    failedChecks: document.querySelectorAll(
      '.codex-ui-pull-request-checks li[data-status="failed"]',
    ).length,
    openReviewVisible: [...document.querySelectorAll("button")].some(
      (button) => button.textContent?.trim() === "Open review",
    ),
    passedChecks: document.querySelectorAll(
      '.codex-ui-pull-request-checks li[data-status="passed"]',
    ).length,
  }));
  if (
    settled.failedChecks !== 0 ||
    settled.passedChecks !== 4 ||
    !settled.openReviewVisible
  ) {
    throw new Error(
      `pr-lifecycle-interactive: retry transition failed: ${JSON.stringify(settled)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "pr-lifecycle-interactive.json"),
    `${JSON.stringify({ initial, settled }, null, 2)}\n`,
  );
} finally {
  await interactivePullRequestApp.close();
}

const workspaceResponsiveScene = {
  frame: "workspace-ready",
  id: "workspace-responsive",
  scenario: "workspace-workflow",
  view: "workspace",
};
const {
  app: workspaceResponsiveApp,
  page: workspaceResponsivePage,
} = await launchScene(workspaceResponsiveScene, {
  capture: false,
  environment: {
    CODEX_DEMO_WORKSPACE_BRANCH_FIXTURE: "1",
  },
  windowSize: { height: 820, width: 1180 },
});
try {
  const workspaceResponsiveMatrix = [];
  for (const expected of [
    {
      composerLeft: 359,
      composerWidth: 736,
      height: 820,
      layoutMode: "wide",
      mainLeft: 274,
      mainWidth: 906,
      rootLeft: 343,
      rootWidth: 768,
      sidebarOpen: true,
      width: 1180,
    },
    {
      composerLeft: 290,
      composerWidth: 654,
      height: 680,
      layoutMode: "medium",
      mainLeft: 274,
      mainWidth: 686,
      rootLeft: 274,
      rootWidth: 686,
      sidebarOpen: true,
      width: 960,
    },
    {
      composerLeft: 290,
      composerWidth: 514,
      height: 680,
      layoutMode: "medium",
      mainLeft: 274,
      mainWidth: 546,
      rootLeft: 274,
      rootWidth: 546,
      sidebarOpen: true,
      width: 820,
    },
    {
      composerLeft: 290,
      composerWidth: 414,
      height: 680,
      layoutMode: "narrow",
      mainLeft: 274,
      mainWidth: 446,
      rootLeft: 274,
      rootWidth: 446,
      sidebarOpen: true,
      width: 720,
    },
    {
      composerLeft: 729,
      composerWidth: 736,
      height: 1080,
      layoutMode: "wide",
      mainLeft: 274,
      mainWidth: 1646,
      rootLeft: 713,
      rootWidth: 768,
      sidebarOpen: true,
      width: 1920,
    },
    {
      composerLeft: 1049,
      composerWidth: 736,
      height: 1326,
      layoutMode: "wide",
      mainLeft: 274,
      mainWidth: 2286,
      rootLeft: 1033,
      rootWidth: 768,
      sidebarOpen: true,
      width: 2560,
    },
  ]) {
    await workspaceResponsiveApp.evaluate(
      ({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(
          size.width,
          size.height,
        );
      },
      expected,
    );
    await workspaceResponsivePage.waitForFunction(
      (target) => {
        const shell = document.querySelector(".codex-ui-app-shell");
        return (
          window.innerWidth === target.width &&
          window.innerHeight === target.height &&
          shell?.getAttribute("data-layout-mode") ===
            target.layoutMode &&
          shell.hasAttribute("data-sidebar-open") ===
            target.sidebarOpen
        );
      },
      expected,
      { timeout: 5_000 },
    );
    const state = await workspaceResponsivePage.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return {
          bottom: value.bottom,
          height: value.height,
          left: value.left,
          top: value.top,
          width: value.width,
        };
      };
      const shell = document.querySelector(".codex-ui-app-shell");
      return {
        composer: rect(
          ".demo-workspace-start .codex-ui-composer",
        ),
        context: rect(
          ".demo-workspace-start .codex-ui-conversation-context-bar",
        ),
        heading: rect(
          ".demo-workspace-start .codex-ui-new-conversation-start__header h3",
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        layoutMode: shell?.getAttribute("data-layout-mode"),
        main: rect(".codex-ui-app-shell__main"),
        prompt: rect(
          ".demo-workspace-start .demo-workspace-prompts > button",
        ),
        root: rect(".demo-workspace-start"),
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    });
    const near = (actual, target) =>
      typeof actual === "number" && Math.abs(actual - target) <= 1;
    if (
      state.layoutMode !== expected.layoutMode ||
      state.sidebarOpen !== expected.sidebarOpen ||
      state.horizontalOverflow > 1 ||
      !state.main ||
      !state.root ||
      !state.composer ||
      !state.context ||
      !state.heading ||
      !state.prompt ||
      !near(state.main.left, expected.mainLeft) ||
      !near(state.main.width, expected.mainWidth) ||
      !near(state.root.left, expected.rootLeft) ||
      !near(state.root.top, 46) ||
      !near(state.root.width, expected.rootWidth) ||
      !near(state.root.height, expected.height - 46) ||
      !near(state.composer.left, expected.composerLeft) ||
      !near(state.composer.width, expected.composerWidth) ||
      !near(state.composer.height, 98) ||
      !near(state.composer.bottom, expected.height - 16) ||
      !near(state.context.left, expected.composerLeft) ||
      !near(state.context.width, expected.composerWidth) ||
      !near(state.context.height, 28) ||
      !near(
        state.heading.top,
        expected.width === 720
          ? expected.height / 2 - 41
          : expected.height / 2 - 47,
      ) ||
      !near(state.heading.height, expected.width === 720 ? 67.19 : 33.6) ||
      !near(state.prompt.width, expected.rootWidth - 114) ||
      !near(state.prompt.height, 40)
    ) {
      throw new Error(
        `workspace-responsive ${expected.width}x${expected.height} failed: ${JSON.stringify(state)}`,
      );
    }
    workspaceResponsiveMatrix.push(state);
  }
  await writeFile(
    join(artifactDirectory, "workspace-responsive.json"),
    `${JSON.stringify(workspaceResponsiveMatrix, null, 2)}\n`,
  );
} finally {
  await workspaceResponsiveApp.close();
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

const markdownStreamingScenes = [
  { frame: "markdown-stream-link" },
  { frame: "markdown-stream-fence" },
  { frame: "markdown-stream-table" },
  { frame: "markdown-stream-large" },
  { frame: "markdown-stream-complete" },
];
const markdownStreamingContracts = [];
for (const { frame } of markdownStreamingScenes) {
  const markdownStreamingScene = {
    frame,
    id: `cdp-${frame}`,
    scenario: "markdown-streaming-large",
  };
  const {
    app: markdownStreamingApp,
    page: markdownStreamingPage,
  } = await launchScene(markdownStreamingScene, { capture: false });
  try {
    const contract = await markdownStreamingPage.evaluate(() => {
      const message = document.querySelector(
        '[data-item-id="assistant-markdown-streaming-large"]',
      );
      const root = message?.querySelector(".codex-ui-markdown");
      const tableScroll = root?.querySelector(
        ".codex-ui-markdown__table-scroll",
      );
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
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
      return {
        actionCount: document.querySelectorAll(
          '[aria-label="Markdown response actions"] button',
        ).length,
        code: root
          ?.querySelector(".codex-ui-code-block__body code")
          ?.textContent?.trim(),
        codeBlockCount:
          root?.querySelectorAll(".codex-ui-code-block").length ?? 0,
        frame: document
          .querySelector(".demo-root")
          ?.getAttribute("data-frame"),
        headingCount: root?.querySelectorAll("h1, h2").length ?? 0,
        href: root?.querySelector("a")?.getAttribute("href"),
        linkTarget: root?.querySelector("a")?.getAttribute("target"),
        messageStatus: message?.getAttribute("data-status"),
        root: rect(root),
        streaming: root?.getAttribute("data-streaming"),
        table: rect(root?.querySelector("table")),
        tableScroll: tableScroll
          ? {
              clientWidth: tableScroll.clientWidth,
              overflowX: getComputedStyle(tableScroll).overflowX,
              scrollWidth: tableScroll.scrollWidth,
              ...rect(tableScroll),
            }
          : null,
        taskCount:
          root?.querySelectorAll('.task-list-item input[type="checkbox"]')
            .length ?? 0,
        text: root?.textContent?.replace(/\s+/g, " ").trim(),
        viewport: viewport
          ? {
              clientHeight: viewport.clientHeight,
              scrollHeight: viewport.scrollHeight,
              scrollTop: viewport.scrollTop,
            }
          : null,
      };
    });
    markdownStreamingContracts.push(contract);

    const isComplete = frame === "markdown-stream-complete";
    const isAtBottom =
      contract.viewport &&
      Math.abs(
        contract.viewport.scrollHeight -
          contract.viewport.clientHeight -
          contract.viewport.scrollTop,
      ) <= 1;
    if (
      !contract.root ||
      contract.frame !== frame ||
      contract.messageStatus !== (isComplete ? "completed" : "running") ||
      contract.streaming !== (isComplete ? null : "true") ||
      contract.actionCount !== (isComplete ? 4 : 0) ||
      contract.root.width < 700 ||
      !isAtBottom ||
      (frame === "markdown-stream-link" &&
        (!contract.href?.startsWith("https://exa") ||
          contract.linkTarget !== "_blank")) ||
      (frame === "markdown-stream-fence" &&
        (contract.codeBlockCount !== 1 ||
          !contract.code?.includes('const chunks = ["link", "list", "code"];') ||
          contract.taskCount !== 2)) ||
      (frame === "markdown-stream-table" &&
        (!contract.table ||
          !contract.tableScroll ||
          contract.tableScroll.overflowX !== "auto" ||
          contract.tableScroll.clientWidth < contract.root.width)) ||
      ((frame === "markdown-stream-large" || isComplete) &&
        (contract.headingCount !== 13 ||
          !contract.text?.endsWith("End of streamed response.") ||
          contract.root.height <= (contract.viewport?.clientHeight ?? 0)))
    ) {
      throw new Error(
        `${frame}: streaming Markdown contract failed: ${JSON.stringify(contract)}`,
      );
    }
  } finally {
    await markdownStreamingApp.close();
  }
}
await writeFile(
  join(artifactDirectory, "markdown-streaming-large.json"),
  `${JSON.stringify(markdownStreamingContracts, null, 2)}\n`,
);

const markdownTableActionsScene = {
  frame: "markdown-table-complete",
  id: "markdown-table-actions",
  scenario: "markdown-table-actions",
};
const {
  app: markdownTableActionsApp,
  page: markdownTableActionsPage,
} = await launchScene(markdownTableActionsScene, { capture: false });
try {
  await markdownTableActionsPage.evaluate(() => {
    class TestClipboardItem {
      constructor(items) {
        this.items = items;
      }
    }
    window.ClipboardItem = TestClipboardItem;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async ([item]) => {
          const entries = await Promise.all(
            Object.entries(item.items).map(async ([type, blob]) => [
              type,
              await blob.text(),
            ]),
          );
          window.__codexMarkdownTableClipboard = Object.fromEntries(entries);
        },
        writeText: async (value) => {
          window.__codexMarkdownTableClipboard = { "text/plain": value };
        },
      },
    });
  });
  const tableContainer = markdownTableActionsPage.locator(
    '[data-item-id="assistant-markdown-table-actions"] [data-markdown-table]',
  );
  await tableContainer.waitFor({ state: "visible" });
  const inspectTable = () =>
    markdownTableActionsPage.evaluate(() => {
      const container = document.querySelector(
        '[data-item-id="assistant-markdown-table-actions"] [data-markdown-table]',
      );
      const conversation = document.querySelector(
        ".codex-ui-conversation-thread-shell",
      );
      const table = container?.querySelector("table");
      const scroller = container?.querySelector(
        ".codex-ui-markdown__table-scroll",
      );
      const actions = container?.querySelector(
        ".codex-ui-markdown__table-actions",
      );
      const firstHeader = table?.querySelector("th");
      const firstCell = table?.querySelector("td");
      const rect = (element) => {
        if (!(element instanceof Element)) return null;
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
      const actionsRect =
        actions instanceof Element ? actions.getBoundingClientRect() : null;
      const lowerRailHit = actionsRect
        ? document.elementFromPoint(
            actionsRect.left + actionsRect.width / 2,
            actionsRect.bottom - 8,
          )
        : null;
      return {
        actions: actions
          ? {
              interceptsLowerEdge: Boolean(
                lowerRailHit?.closest(".codex-ui-markdown__table-actions"),
              ),
              opacity: getComputedStyle(actions).opacity,
              pointerEvents: getComputedStyle(actions).pointerEvents,
              rect: rect(actions),
            }
          : null,
        buttons: Array.from(container?.querySelectorAll("button") ?? [], (button) => ({
          expanded: button.getAttribute("aria-expanded"),
          haspopup: button.getAttribute("aria-haspopup"),
          label: button.getAttribute("aria-label"),
          pointerEvents: getComputedStyle(button).pointerEvents,
          rect: rect(button),
          viewBox: button.querySelector("svg")?.getAttribute("viewBox"),
        })),
        columns:
          table instanceof HTMLTableElement ? table.rows[0]?.cells.length ?? 0 : 0,
        container: rect(container),
        conversation: rect(conversation),
        firstCell: firstCell
          ? {
              fontWeight: getComputedStyle(firstCell).fontWeight,
              lineHeight: getComputedStyle(firstCell).lineHeight,
              overflowWrap: getComputedStyle(firstCell).overflowWrap,
              padding: getComputedStyle(firstCell).padding,
              rect: rect(firstCell),
            }
          : null,
        firstHeader: firstHeader
          ? {
              fontWeight: getComputedStyle(firstHeader).fontWeight,
              lineHeight: getComputedStyle(firstHeader).lineHeight,
              overflowWrap: getComputedStyle(firstHeader).overflowWrap,
              padding: getComputedStyle(firstHeader).padding,
              rect: rect(firstHeader),
            }
          : null,
        rows: table instanceof HTMLTableElement ? table.rows.length : 0,
        scroller:
          scroller instanceof HTMLElement
            ? {
                clientWidth: scroller.clientWidth,
                overflowX: getComputedStyle(scroller).overflowX,
                rect: rect(scroller),
                scrollWidth: scroller.scrollWidth,
              }
            : null,
        table: rect(table),
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    });
  const resting = await inspectTable();
  await tableContainer.hover();
  await markdownTableActionsPage.waitForTimeout(150);
  const hovered = await inspectTable();
  const expandButton = tableContainer.getByRole("button", {
    name: "Expand table",
  });
  const copyButton = tableContainer.getByRole("button", {
    name: "Copy table",
  });
  await copyButton.click();
  await tableContainer.getByRole("button", { name: "Copied" }).waitFor();
  const clipboard = await markdownTableActionsPage.evaluate(
    () => window.__codexMarkdownTableClipboard,
  );
  await expandButton.click();
  const previewDialog = markdownTableActionsPage.getByRole("dialog", {
    name: "Table preview",
  });
  await previewDialog.waitFor({ state: "visible" });
  await markdownTableActionsPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Close table preview",
  );
  const preview = await previewDialog.evaluate((dialog) => {
    const previewSurface = dialog.querySelector(
      ".codex-ui-markdown-table-preview__surface",
    );
    const table = previewSurface?.querySelector("table");
    const close = dialog.querySelector(
      'button[aria-label="Close table preview"]',
    );
    const closeIcon = close?.querySelector("svg");
    const rect = (element) => {
      if (!(element instanceof Element)) return null;
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
    const surfaceStyle = previewSurface
      ? getComputedStyle(previewSurface)
      : null;
    return {
      activeElement: document.activeElement?.getAttribute("aria-label"),
      close: close
        ? {
            icon: rect(closeIcon),
            rect: rect(close),
            viewBox: closeIcon?.getAttribute("viewBox"),
          }
        : null,
      columns:
        table instanceof HTMLTableElement ? table.rows[0]?.cells.length ?? 0 : 0,
      dialog: rect(dialog),
      rows: table instanceof HTMLTableElement ? table.rows.length : 0,
      surface: previewSurface
        ? {
            borderRadius: surfaceStyle.borderRadius,
            maxHeight: surfaceStyle.maxHeight,
            maxWidth: surfaceStyle.maxWidth,
            overflowX: surfaceStyle.overflowX,
            padding: surfaceStyle.padding,
            rect: rect(previewSurface),
            tabIndex: previewSurface.tabIndex,
          }
        : null,
      table: rect(table),
    };
  });
  const previewSurface = previewDialog.locator(
    ".codex-ui-markdown-table-preview__surface",
  );
  const tallPreview = await previewSurface.evaluate((surface) => {
    const body = surface.parentElement;
    const tbody = surface.querySelector("tbody");
    const row = tbody?.lastElementChild;
    if (tbody && row) {
      for (let index = 0; index < 16; index += 1) {
        tbody.append(row.cloneNode(true));
      }
    }
    const bodyStyle = body ? getComputedStyle(body) : null;
    const surfaceStyle = getComputedStyle(surface);
    return {
      bodyClientHeight: body?.clientHeight ?? 0,
      bodyOverflowY: bodyStyle?.overflowY,
      bodyPointerEvents: bodyStyle?.pointerEvents,
      bodyScrollHeight: body?.scrollHeight ?? 0,
      surfaceClientHeight: surface.clientHeight,
      surfaceMaxHeight: surfaceStyle.maxHeight,
      surfaceOverflowY: surfaceStyle.overflowY,
      surfacePointerEvents: surfaceStyle.pointerEvents,
      surfaceScrollHeight: surface.scrollHeight,
    };
  });
  await previewSurface.hover();
  await markdownTableActionsPage.mouse.wheel(0, 480);
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-markdown-table-preview__surface",
      )?.scrollTop ?? 0) > 0,
  );
  const tallPreviewScrollTop = await previewSurface.evaluate(
    (surface) => surface.scrollTop,
  );
  await previewDialog
    .getByRole("button", { name: "Close table preview" })
    .press("Tab");
  await markdownTableActionsPage.waitForFunction(
    () =>
      document.activeElement?.classList.contains(
        "codex-ui-markdown-table-preview__surface",
      ) === true,
  );
  await markdownTableActionsPage.keyboard.press("ArrowRight");
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-markdown-table-preview__surface",
      )?.scrollLeft ?? 0) > 0,
  );
  const previewKeyboard = await previewSurface.evaluate((surface) => ({
    active: document.activeElement === surface,
    scrollLeft: surface.scrollLeft,
  }));
  await previewSurface.press("Escape");
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  const returnedFocus = await markdownTableActionsPage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  const appLayout = markdownTableActionsPage.locator(
    ".codex-ui-app-shell__layout",
  );
  await appLayout.evaluate((layout) => {
    layout.style.setProperty("--codex-ui-app-shell-side-panel-track", "20rem");
  });
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-conversation-thread-shell",
      )?.getBoundingClientRect().width ?? Number.POSITIVE_INFINITY) < 53 * 16,
  );
  await tableContainer.hover();
  await markdownTableActionsPage.waitForTimeout(150);
  const splitPane = await inspectTable();
  await expandButton.click();
  await previewDialog.waitFor({ state: "visible" });
  await previewDialog
    .getByRole("button", { name: "Close table preview" })
    .click();
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  await appLayout.evaluate((layout) => {
    layout.style.removeProperty("--codex-ui-app-shell-side-panel-track");
  });
  await markdownTableActionsPage.waitForFunction(
    () =>
      (document.querySelector(
        ".codex-ui-conversation-thread-shell",
      )?.getBoundingClientRect().width ?? 0) >= 53 * 16,
  );
  await markdownTableActionsApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setContentSize(720, 680);
  });
  await markdownTableActionsPage.waitForFunction(
    () => window.innerWidth === 720 && window.innerHeight === 680,
  );
  await tableContainer.scrollIntoViewIfNeeded();
  await tableContainer.hover();
  await markdownTableActionsPage.waitForTimeout(150);
  const narrow = await inspectTable();
  await expandButton.click();
  await previewDialog.waitFor({ state: "visible" });
  await previewDialog
    .getByRole("button", { name: "Close table preview" })
    .click();
  await previewDialog.waitFor({ state: "hidden" });
  await markdownTableActionsPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Expand table",
  );
  const narrowReturnedFocus = await markdownTableActionsPage.evaluate(
    () => document.activeElement?.getAttribute("aria-label"),
  );
  const labels = hovered.buttons.map(({ label }) => label);
  const viewBoxes = hovered.buttons.map(({ viewBox }) => viewBox);
  if (
    resting.columns !== 18 ||
    resting.rows !== 4 ||
    resting.actions?.opacity !== "0" ||
    resting.scroller?.overflowX !== "auto" ||
    resting.scroller.scrollWidth - resting.scroller.clientWidth < 700 ||
    Math.abs((hovered.table?.width ?? 0) - 1_665.86) > 1 ||
    Math.abs((hovered.table?.height ?? 0) - 323) > 0.5 ||
    hovered.firstHeader?.padding !== "8px 24px 8px 0px" ||
    hovered.firstHeader?.fontWeight !== "600" ||
    hovered.firstHeader?.lineHeight !== "16px" ||
    hovered.firstHeader?.overflowWrap !== "break-word" ||
    Math.abs((hovered.firstHeader?.rect?.width ?? 0) - 92.484) > 1 ||
    Math.abs((hovered.firstHeader?.rect?.height ?? 0) - 49) > 0.5 ||
    hovered.firstCell?.padding !== "10px 24px 10px 0px" ||
    hovered.firstCell?.fontWeight !== "445" ||
    hovered.firstCell?.lineHeight !== "22px" ||
    hovered.firstCell?.overflowWrap !== "break-word" ||
    Math.abs((hovered.firstCell?.rect?.width ?? 0) - 92.484) > 1 ||
    Math.abs((hovered.firstCell?.rect?.height ?? 0) - 87) > 0.5 ||
    hovered.actions?.opacity !== "1" ||
    hovered.actions?.pointerEvents !== "none" ||
    hovered.actions?.interceptsLowerEdge !== false ||
    hovered.actions.rect?.width !== 32 ||
    !hovered.conversation ||
    hovered.conversation.width < 53 * 16 ||
    hovered.actions.rect?.left < (hovered.container?.right ?? 0) ||
    JSON.stringify(labels) !==
      JSON.stringify(["Expand table", "Copy table"]) ||
    JSON.stringify(viewBoxes) !== JSON.stringify(["0 0 20 20", "0 0 21 21"]) ||
    hovered.buttons.some(
      ({ pointerEvents, rect }) =>
        pointerEvents !== "auto" ||
        !rect ||
        Math.abs(rect.width - 24) > 0.5 ||
        Math.abs(rect.height - 24) > 0.5,
    ) ||
    clipboard?.["text/plain"]?.length !== 1_863 ||
    !clipboard?.["text/plain"]?.startsWith("| PROBE-COL-01 |") ||
    !clipboard?.["text/plain"]?.endsWith("row-3-value-18-abcdefghij |") ||
    !clipboard?.["text/html"]?.startsWith("<table>") ||
    preview.activeElement !== "Close table preview" ||
    preview.columns !== 18 ||
    preview.rows !== 4 ||
    preview.dialog?.width !== 1_180 ||
    preview.dialog?.height !== 820 ||
    !preview.surface ||
    preview.surface.borderRadius !== "20px" ||
    preview.surface.maxHeight !== "100%" ||
    preview.surface.maxWidth !== "80%" ||
    preview.surface.overflowX !== "auto" ||
    preview.surface.padding !== "32px" ||
    preview.surface.tabIndex !== 0 ||
    !previewKeyboard.active ||
    previewKeyboard.scrollLeft <= 0 ||
    tallPreview.bodyPointerEvents !== "none" ||
    tallPreview.bodyOverflowY !== "auto" ||
    tallPreview.bodyScrollHeight - tallPreview.bodyClientHeight > 1 ||
    tallPreview.surfaceMaxHeight !== "100%" ||
    tallPreview.surfaceOverflowY !== "auto" ||
    tallPreview.surfacePointerEvents !== "auto" ||
    tallPreview.surfaceScrollHeight <= tallPreview.surfaceClientHeight ||
    tallPreviewScrollTop <= 0 ||
    !splitPane.conversation ||
    splitPane.conversation.width >= 53 * 16 ||
    splitPane.actions?.opacity !== "1" ||
    !splitPane.actions?.rect ||
    splitPane.actions.rect.right > (splitPane.container?.right ?? 0) ||
    splitPane.actions.rect.left < splitPane.conversation.left ||
    splitPane.actions.rect.right > splitPane.conversation.right ||
    splitPane.buttons.some(
      ({ rect }) =>
        !rect ||
        rect.left < splitPane.conversation.left ||
        rect.right > splitPane.conversation.right,
    ) ||
    !preview.close ||
    Math.abs(preview.close.rect.height - 40) > 0.5 ||
    Math.abs(preview.close.rect.width - 42) > 0.5 ||
    preview.close.viewBox !== "0 0 21 21" ||
    Math.abs((preview.close.icon?.height ?? 0) - 18) > 0.5 ||
    Math.abs((preview.close.icon?.width ?? 0) - 18) > 0.5 ||
    Math.abs(preview.surface.rect.width - 892.8) > 1 ||
    Math.abs((preview.table?.width ?? 0) - (hovered.table?.width ?? 0)) > 1 ||
    returnedFocus !== "Expand table" ||
    narrow.viewport.width !== 720 ||
    narrow.viewport.height !== 680 ||
    narrow.actions?.opacity !== "1" ||
    narrow.actions?.pointerEvents !== "none" ||
    narrow.actions?.interceptsLowerEdge !== false ||
    !narrow.actions?.rect ||
    narrow.actions.rect.left < 0 ||
    narrow.actions.rect.right > narrow.viewport.width ||
    narrow.buttons.some(
      ({ rect }) =>
        !rect || rect.left < 0 || rect.right > narrow.viewport.width,
    ) ||
    narrow.scroller?.overflowX !== "auto" ||
    narrow.scroller.scrollWidth - narrow.scroller.clientWidth < 700 ||
    narrowReturnedFocus !== "Expand table"
  ) {
    throw new Error(
      `markdown-table-actions: current-build contract failed: ${JSON.stringify({ clipboard, hovered, narrow, narrowReturnedFocus, preview, previewKeyboard, resting, returnedFocus, splitPane, tallPreview, tallPreviewScrollTop })}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "markdown-table-actions.json"),
    `${JSON.stringify({ clipboard, hovered, narrow, narrowReturnedFocus, preview, previewKeyboard, resting, returnedFocus, splitPane, tallPreview, tallPreviewScrollTop }, null, 2)}\n`,
  );
} finally {
  await markdownTableActionsApp.close();
}

const sidebarScene = {
  frame: "markdown-complete",
  id: "sidebar-current",
  scenario: "markdown",
};
const { app: sidebarApp, page: sidebarPage } = await launchScene(
  sidebarScene,
  {
    capture: false,
    windowSize: { height: 680, width: 820 },
  },
);
try {
  const projectsToggle = sidebarPage.getByRole("button", {
    name: "Toggle projects",
  });
  if ((await projectsToggle.getAttribute("aria-expanded")) !== "false") {
    throw new Error("sidebar-current: Projects did not start collapsed.");
  }
  await projectsToggle.click();
  const longProject = sidebarPage.getByRole("button", {
    name: "protocol-client-with-an-intentionally-long-worktree-name",
  });
  await longProject.waitFor({ state: "visible" });
  const projectActions = sidebarPage.getByRole("toolbar", {
    name: "session-browser project actions",
  });
  await projectActions.locator("..").hover();
  const currentProjectActions = await projectActions.evaluate((toolbar) => {
    const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
    const rowRect = row?.getBoundingClientRect();
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    const rects = buttons.map((button) => {
      const value = button.getBoundingClientRect();
      return {
        height: value.height,
        rightInset: rowRect ? rowRect.right - value.right : null,
        width: value.width,
      };
    });
    return {
      gap: buttons[1]
        ? buttons[1].getBoundingClientRect().left -
          buttons[0].getBoundingClientRect().right
        : null,
      icons: buttons.map((button) =>
        button
          .querySelector("[data-current-build-icon]")
          ?.getAttribute("data-current-build-icon"),
      ),
      opacity: getComputedStyle(toolbar).opacity,
      rects,
    };
  });
  const pinnedTaskActions = sidebarPage.getByRole("toolbar", {
    name: "session-browser task actions",
  });
  await pinnedTaskActions.locator("..").hover();
  const currentTaskActions = await pinnedTaskActions.evaluate((toolbar) => {
    const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
    const rowRect = row?.getBoundingClientRect();
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    const rects = buttons.map((button) => {
      const value = button.getBoundingClientRect();
      return {
        height: value.height,
        rightInset: rowRect ? rowRect.right - value.right : null,
        width: value.width,
      };
    });
    return {
      gap: buttons[1]
        ? buttons[1].getBoundingClientRect().left -
          buttons[0].getBoundingClientRect().right
        : null,
      icons: buttons.map((button) =>
        button
          .querySelector("[data-current-build-icon]")
          ?.getAttribute("data-current-build-icon"),
      ),
      opacity: getComputedStyle(toolbar).opacity,
      rects,
    };
  });
  const recentTaskActions = sidebarPage.getByRole("toolbar", {
    name: /Sidebar task actions for/,
  });
  await recentTaskActions.first().locator("..").hover();
  const currentRecentActions = await recentTaskActions
    .first()
    .evaluate((toolbar) => {
      const row = toolbar.closest(".codex-ui-app-sidebar__item-row");
      const rowRect = row?.getBoundingClientRect();
      const buttons = Array.from(toolbar.querySelectorAll("button"));
      const rects = buttons.map((button) => {
        const value = button.getBoundingClientRect();
        return {
          height: value.height,
          rightInset: rowRect ? rowRect.right - value.right : null,
          width: value.width,
        };
      });
      return {
        gap: buttons[1]
          ? buttons[1].getBoundingClientRect().left -
            buttons[0].getBoundingClientRect().right
          : null,
        icons: buttons.map((button) =>
          button
            .querySelector("[data-current-build-icon]")
            ?.getAttribute("data-current-build-icon"),
        ),
        opacity: getComputedStyle(toolbar).opacity,
        rects,
      };
    });
  const currentSidebarAssets = await sidebarPage.evaluate(() => {
    const help = document.querySelector(
      '.codex-ui-app-sidebar-footer__actions button[aria-label="Open help menu"]',
    );
    const voice = document.querySelector(
      '.codex-ui-app-sidebar-footer__actions button[aria-label="Start new voice chat"]',
    );
    const helpIcon = help?.querySelector("[data-current-build-icon]");
    const voiceIcon = voice?.querySelector("[data-current-build-icon]");
    const helpRect = help?.getBoundingClientRect();
    const helpIconRect = helpIcon?.getBoundingClientRect();
    const voiceRect = voice?.getBoundingClientRect();
    const voiceIconRect = voiceIcon?.getBoundingClientRect();
    const voiceStyle = voice ? getComputedStyle(voice) : null;
    return {
      help: helpRect
        ? {
            height: helpRect.height,
            iconHeight: helpIconRect?.height,
            iconName: helpIcon?.getAttribute("data-current-build-icon"),
            iconWidth: helpIconRect?.width,
            width: helpRect.width,
          }
        : null,
      voice: voiceRect
        ? {
            borderRadius: voiceStyle?.borderRadius,
            color: voiceStyle?.color,
            gap: voiceStyle?.gap,
            height: voiceRect.height,
            iconHeight: voiceIconRect?.height,
            iconName: voiceIcon?.getAttribute("data-current-build-icon"),
            iconWidth: voiceIconRect?.width,
            label: voice?.textContent?.trim(),
            paddingInline: voiceStyle?.paddingInline,
            width: voiceRect.width,
          }
        : null,
      recentItemCount: document.querySelectorAll(
        '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-row',
      ).length,
      recentActionIcons: Array.from(
        document.querySelectorAll(
          '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-actions button [data-current-build-icon]',
        ),
        (icon) => icon.getAttribute("data-current-build-icon"),
      ),
      recentLeadingCount: document.querySelectorAll(
        '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-leading',
      ).length,
      settingsAction: Boolean(
        document.querySelector(
          '.codex-ui-app-sidebar-footer__actions button[aria-label="Open settings"]',
        ),
      ),
    };
  });
  if (
    currentProjectActions.opacity !== "1" ||
    currentProjectActions.gap !== 6 ||
    JSON.stringify(currentProjectActions.icons) !==
      JSON.stringify(["sidebar-more", "sidebar-new-chat"]) ||
    JSON.stringify(currentProjectActions.rects) !==
      JSON.stringify([
        { height: 24, rightInset: 32, width: 24 },
        { height: 24, rightInset: 2, width: 24 },
      ]) ||
    currentTaskActions.opacity !== "1" ||
    currentTaskActions.gap !== 8 ||
    JSON.stringify(currentTaskActions.icons) !==
      JSON.stringify(["sidebar-pin", "sidebar-archive"]) ||
    JSON.stringify(currentTaskActions.rects) !==
      JSON.stringify([
        { height: 20, rightInset: 32, width: 20 },
        { height: 20, rightInset: 4, width: 20 },
      ]) ||
    currentRecentActions.opacity !== "1" ||
    currentRecentActions.gap !== 4 ||
    JSON.stringify(currentRecentActions.icons) !==
      JSON.stringify(["sidebar-pin", "sidebar-archive"]) ||
    JSON.stringify(currentRecentActions.rects) !==
      JSON.stringify([
        { height: 24, rightInset: 32, width: 24 },
        { height: 24, rightInset: 4, width: 24 },
      ]) ||
    currentSidebarAssets.settingsAction ||
    currentSidebarAssets.recentItemCount !== 6 ||
    currentSidebarAssets.recentLeadingCount !== 0 ||
    JSON.stringify(currentSidebarAssets.recentActionIcons) !==
      JSON.stringify(
        Array.from({ length: 6 }, () => [
          "sidebar-pin",
          "sidebar-archive",
        ]).flat(),
      ) ||
    currentSidebarAssets.help?.width !== 32 ||
    currentSidebarAssets.help?.height !== 32 ||
    currentSidebarAssets.help?.iconWidth !== 18 ||
    currentSidebarAssets.help?.iconHeight !== 18 ||
    currentSidebarAssets.help?.iconName !== "sidebar-help" ||
    Math.abs((currentSidebarAssets.voice?.width ?? 0) - 75.67) > 1 ||
    currentSidebarAssets.voice?.height !== 28 ||
    currentSidebarAssets.voice?.iconWidth !== 16 ||
    currentSidebarAssets.voice?.iconHeight !== 16 ||
    currentSidebarAssets.voice?.iconName !== "sidebar-voice" ||
    currentSidebarAssets.voice?.label !== "Voice" ||
    currentSidebarAssets.voice?.gap !== "4px" ||
    currentSidebarAssets.voice?.paddingInline !== "10px" ||
    currentSidebarAssets.voice?.borderRadius !== "12.5px"
  ) {
    throw new Error(
      `sidebar-current: current-build action assets failed: ${JSON.stringify({
        currentProjectActions,
        currentRecentActions,
        currentSidebarAssets,
        currentTaskActions,
      })}`,
    );
  }
  const projectGroup = sidebarPage.getByRole("button", {
    exact: true,
    name: "session-browser",
  });
  const projectTask = sidebarPage.getByRole("button", {
    exact: true,
    name: "Inspect timeline structure",
  });
  const readProjectState = async () => ({
    expanded: await projectGroup.getAttribute("aria-expanded"),
    focusOnGroup: await projectGroup.evaluate(
      (element) => document.activeElement === element,
    ),
    taskVisible: await projectTask.isVisible(),
  });
  await projectGroup.click();
  const projectPointerCollapsed = await readProjectState();
  await projectGroup.press("Enter");
  const projectEnterExpanded = await readProjectState();
  await projectGroup.press("Space");
  const projectSpaceCollapsed = await readProjectState();
  await projectGroup.press("Space");
  const projectSpaceExpanded = await readProjectState();
  if (
    projectPointerCollapsed.expanded !== "false" ||
    !projectPointerCollapsed.focusOnGroup ||
    projectPointerCollapsed.taskVisible ||
    projectEnterExpanded.expanded !== "true" ||
    !projectEnterExpanded.focusOnGroup ||
    !projectEnterExpanded.taskVisible ||
    projectSpaceCollapsed.expanded !== "false" ||
    !projectSpaceCollapsed.focusOnGroup ||
    projectSpaceCollapsed.taskVisible ||
    projectSpaceExpanded.expanded !== "true" ||
    !projectSpaceExpanded.focusOnGroup ||
    !projectSpaceExpanded.taskVisible
  ) {
    throw new Error(
      `sidebar-current: project expansion lifecycle failed: ${JSON.stringify({
        projectEnterExpanded,
        projectPointerCollapsed,
        projectSpaceCollapsed,
        projectSpaceExpanded,
      })}`,
    );
  }

  const projectMenuTrigger = projectActions.getByRole("button", {
    name: "Project actions for session-browser",
  });
  await projectActions.locator("..").hover();
  await projectMenuTrigger.click();
  const projectMenu = sidebarPage.getByRole("menu", {
    name: "session-browser project menu",
  });
  await projectMenu.waitFor({ state: "visible" });
  const projectMenuContract = await projectMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return {
      focusRole: document.activeElement?.getAttribute("role"),
      icons: Array.from(
        menu.querySelectorAll("[data-current-build-icon]"),
        (icon) => icon.getAttribute("data-current-build-icon"),
      ),
      itemCount: menu.querySelectorAll('[role="menuitem"]').length,
      rect: { height: bounds.height, width: bounds.width },
    };
  });
  await sidebarPage.keyboard.press("Escape");
  await projectMenu.waitFor({ state: "hidden" });
  await sidebarPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Project actions for session-browser",
  );
  projectMenuContract.focusReturned = await projectMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    projectMenuContract.itemCount !== 7 ||
    projectMenuContract.focusRole !== "menuitem" ||
    !projectMenuContract.focusReturned ||
    Math.abs(projectMenuContract.rect.width - 214.05) > 1 ||
    Math.abs(projectMenuContract.rect.height - 207.94) > 1 ||
    JSON.stringify(projectMenuContract.icons) !==
      JSON.stringify([
        "sidebar-project-menu-unpin",
        "sidebar-project-menu-reveal",
        "sidebar-project-menu-worktree",
        "sidebar-project-menu-edit",
        "sidebar-project-menu-mark-read",
        "sidebar-project-menu-archive",
        "sidebar-project-menu-remove",
      ])
  ) {
    throw new Error(
      `sidebar-current: project menu contract failed: ${JSON.stringify(projectMenuContract)}`,
    );
  }

  const helpMenuTrigger = sidebarPage.getByRole("button", {
    name: "Open help menu",
  });
  await helpMenuTrigger.click();
  const helpMenu = sidebarPage.getByRole("menu", { name: "Help menu" });
  await helpMenu.waitFor({ state: "visible" });
  const helpMenuContract = await helpMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return {
      focusRole: document.activeElement?.getAttribute("role"),
      heading:
        menu.querySelector(
          ".demo-current-sidebar-help-menu__heading",
        )?.textContent,
      icons: Array.from(
        menu.querySelectorAll("[data-current-build-icon]"),
        (icon) => icon.getAttribute("data-current-build-icon"),
      ),
      itemCount: menu.querySelectorAll('[role="menuitem"]').length,
      rect: { height: bounds.height, width: bounds.width },
      separatorCount: menu.querySelectorAll('[role="separator"]').length,
    };
  });
  await sidebarPage.keyboard.press("Escape");
  await helpMenu.waitFor({ state: "hidden" });
  await sidebarPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Open help menu",
  );
  helpMenuContract.focusReturned = await helpMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    helpMenuContract.itemCount !== 8 ||
    helpMenuContract.heading !== "What's new" ||
    helpMenuContract.separatorCount !== 1 ||
    helpMenuContract.focusRole !== "menuitem" ||
    !helpMenuContract.focusReturned ||
    Math.abs(helpMenuContract.rect.width - 320) > 1 ||
    Math.abs(helpMenuContract.rect.height - 272.06) > 1 ||
    JSON.stringify(helpMenuContract.icons) !==
      JSON.stringify([
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-release-note",
        "sidebar-help-menu-changelog",
        "sidebar-help-menu-changelog-external",
        "sidebar-help-menu-chrome",
        "sidebar-help-menu-remote",
        "sidebar-help-menu-keyboard",
        "sidebar-help-menu-support",
      ])
  ) {
    throw new Error(
      `sidebar-current: Help menu contract failed: ${JSON.stringify(helpMenuContract)}`,
    );
  }

  const accountMenuTrigger = sidebarPage.getByRole("button", {
    exact: true,
    name: "Demo account",
  });
  await accountMenuTrigger.click();
  const accountMenu = sidebarPage.getByRole("menu", {
    name: "Account menu",
  });
  await accountMenu.waitFor({ state: "visible" });
  const accountMenuContract = await accountMenu.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    const divider = menu.querySelector(
      ".demo-current-sidebar-account-menu__divider",
    );
    const dividerBounds = divider?.getBoundingClientRect();
    return {
      dividerHeight: dividerBounds?.height,
      focusRole: document.activeElement?.getAttribute("role"),
      icons: Array.from(
        menu.querySelectorAll("[data-current-build-icon]"),
        (icon) => icon.getAttribute("data-current-build-icon"),
      ),
      imageCount: menu.querySelectorAll("img").length,
      itemCount: menu.querySelectorAll('[role="menuitem"]').length,
      rect: { height: bounds.height, width: bounds.width },
      separatorCount: menu.querySelectorAll('[role="separator"]').length,
    };
  });
  const accountTriggerBounds = await accountMenuTrigger.evaluate((trigger) => {
    const bounds = trigger.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  await sidebarPage.keyboard.press("Escape");
  await accountMenu.waitFor({ state: "hidden" });
  await sidebarPage.waitForFunction(() => {
    const active = document.activeElement;
    return (
      active instanceof HTMLButtonElement &&
      active.getAttribute("role") !== "menuitem" &&
      (active.textContent?.includes("Demo account") ?? false)
    );
  });
  accountMenuContract.focusReturned = await accountMenuTrigger.evaluate(
    (element) => document.activeElement === element,
  );
  if (
    accountMenuContract.itemCount !== 6 ||
    accountMenuContract.imageCount !== 1 ||
    accountMenuContract.separatorCount !== 0 ||
    accountMenuContract.dividerHeight !== 9 ||
    accountMenuContract.focusRole !== "menuitem" ||
    !accountMenuContract.focusReturned ||
    Math.abs(accountTriggerBounds.width - 138.33) > 1 ||
    accountTriggerBounds.height !== 29 ||
    Math.abs(accountMenuContract.rect.width - 258) > 1 ||
    Math.abs(accountMenuContract.rect.height - 188.38) > 1 ||
    JSON.stringify(accountMenuContract.icons) !==
      JSON.stringify([
        "sidebar-account-menu-usage",
        "sidebar-account-menu-pet",
        "sidebar-account-menu-invite",
        "sidebar-account-menu-settings",
        "sidebar-account-menu-logout",
      ])
  ) {
    throw new Error(
      `sidebar-current: account menu contract failed: ${JSON.stringify({ accountMenuContract, accountTriggerBounds })}`,
    );
  }

  await projectGroup.press("Space");
  const resizeSidebar = async (width, height) => {
    const layoutMode = width <= 720 ? "narrow" : width >= 1_024 ? "wide" : "medium";
    await sidebarApp.evaluate(
      ({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(
          size.width,
          size.height,
        );
      },
      { height, width },
    );
    await sidebarPage.waitForFunction(
      (size) =>
        innerWidth === size.width &&
        innerHeight === size.height &&
        document
          .querySelector(".codex-ui-app-shell")
          ?.getAttribute("data-layout-mode") === size.layoutMode,
      { height, layoutMode, width },
    );
  };
  await resizeSidebar(720, 680);
  await sidebarPage.waitForFunction(
    () =>
      document
        .querySelector(".codex-ui-app-shell")
        ?.getAttribute("data-layout-mode") === "narrow" &&
      document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
  );
  const responsiveProject = {
    compactVisibleBeforeCollapse: await sidebarPage.evaluate(() => ({
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      projectExpanded: document
        .querySelector(
          '.codex-ui-app-sidebar__project-group [aria-expanded]',
        )
        ?.getAttribute("aria-expanded"),
      sidebarOpen: document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
      sidebarWidth: document
        .querySelector(".codex-ui-app-shell__sidebar")
        ?.getBoundingClientRect().width,
    })),
  };
  await sidebarPage.getByRole("button", { name: "Hide sidebar" }).click();
  await sidebarPage.waitForFunction(
    () =>
      !document
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-open"),
  );
  responsiveProject.compactCollapsed = await sidebarPage.evaluate(() => ({
    horizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    projectExpanded: document
      .querySelector(
        '.codex-ui-app-sidebar__project-group [aria-expanded]',
      )
      ?.getAttribute("aria-expanded"),
    sidebarOpen: document
      .querySelector(".codex-ui-app-shell")
      ?.hasAttribute("data-sidebar-open"),
  }));
  await sidebarPage.getByRole("button", { name: "Show sidebar" }).click();
  await sidebarPage.waitForFunction(() =>
    document
      .querySelector(".codex-ui-app-shell")
      ?.hasAttribute("data-sidebar-open"),
  );
  responsiveProject.compactPinned = await sidebarPage.evaluate(() => ({
    horizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    projectExpanded: document
      .querySelector(
        '.codex-ui-app-sidebar__project-group [aria-expanded]',
      )
      ?.getAttribute("aria-expanded"),
    sidebarWidth: document
      .querySelector(".codex-ui-app-shell__sidebar")
      ?.getBoundingClientRect().width,
  }));
  await resizeSidebar(1180, 820);
  responsiveProject.wideRestored = await sidebarPage.evaluate(() => ({
    horizontalOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    projectExpanded: document
      .querySelector(
        '.codex-ui-app-sidebar__project-group [aria-expanded]',
      )
      ?.getAttribute("aria-expanded"),
    sidebarWidth: document
      .querySelector(".codex-ui-app-shell__sidebar")
      ?.getBoundingClientRect().width,
  }));
  await projectGroup.press("Enter");
  responsiveProject.keyboardRestored = await readProjectState();
  if (
    !responsiveProject.compactVisibleBeforeCollapse.sidebarOpen ||
    responsiveProject.compactVisibleBeforeCollapse.projectExpanded !==
      "false" ||
    Math.abs(
      (responsiveProject.compactVisibleBeforeCollapse.sidebarWidth ?? 0) -
        274,
    ) > 1 ||
    Math.abs(
      responsiveProject.compactVisibleBeforeCollapse.horizontalOverflow,
    ) > 1 ||
    responsiveProject.compactCollapsed.sidebarOpen ||
    responsiveProject.compactCollapsed.projectExpanded !== "false" ||
    Math.abs(responsiveProject.compactCollapsed.horizontalOverflow) > 1 ||
    responsiveProject.compactPinned.projectExpanded !== "false" ||
    Math.abs((responsiveProject.compactPinned.sidebarWidth ?? 0) - 274) > 1 ||
    Math.abs(responsiveProject.compactPinned.horizontalOverflow) > 1 ||
    responsiveProject.wideRestored.projectExpanded !== "false" ||
    Math.abs((responsiveProject.wideRestored.sidebarWidth ?? 0) - 274) > 1 ||
    Math.abs(responsiveProject.wideRestored.horizontalOverflow) > 1 ||
    responsiveProject.keyboardRestored.expanded !== "true" ||
    !responsiveProject.keyboardRestored.focusOnGroup ||
    !responsiveProject.keyboardRestored.taskVisible
  ) {
    throw new Error(
      `sidebar-current: responsive project continuity failed: ${JSON.stringify(responsiveProject)}`,
    );
  }
  await resizeSidebar(820, 680);
  const firstAction = recentTaskActions.first().getByRole("button").first();
  await firstAction.focus();
  const compact = await sidebarPage.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        top: value.top,
        width: value.width,
      };
    };
    const sidebar = document.querySelector(".codex-ui-app-sidebar");
    const navigation = sidebar?.querySelector(
      ".codex-ui-app-sidebar__navigation",
    );
    const footer = sidebar?.querySelector(
      ".codex-ui-app-sidebar__footer",
    );
    if (footer instanceof HTMLElement) {
      footer.style.minHeight = "100px";
    }
    const main = document.querySelector(".codex-ui-app-shell__main");
    const shell = document.querySelector(".codex-ui-app-shell");
    const project = Array.from(
      document.querySelectorAll(".codex-ui-app-sidebar__item"),
    ).find((item) =>
      item.textContent?.includes(
        "protocol-client-with-an-intentionally-long-worktree-name",
      ),
    );
    const projectLabel = project?.querySelector(
      ".codex-ui-app-sidebar__item-label",
    );
    const active = document.activeElement;
    const activeToolbar =
      active instanceof HTMLElement
        ? active.closest(
            ".codex-ui-app-sidebar__item-actions[role=\"toolbar\"]",
          )
        : null;
    for (
      let index = activeToolbar?.querySelectorAll("button").length ?? 0;
      index < 3;
      index += 1
    ) {
      const action = document.createElement("button");
      action.setAttribute("aria-label", `Injected action ${index + 1}`);
      action.type = "button";
      activeToolbar?.append(action);
    }
    const actionItem = activeToolbar
      ?.closest(".codex-ui-app-sidebar__item-row")
      ?.querySelector(".codex-ui-app-sidebar__item");
    const actionItemRect = actionItem?.getBoundingClientRect();
    const actionToolbarRect = activeToolbar?.getBoundingClientRect();
    return {
      activeAction:
        active instanceof HTMLButtonElement &&
        active.closest(
          ".codex-ui-app-sidebar__item-actions[role=\"toolbar\"]",
        ) !== null,
      accountPopup: document
        .querySelector(".codex-ui-app-sidebar-footer__account")
        ?.getAttribute("aria-haspopup"),
      actionCount: activeToolbar?.querySelectorAll("button").length,
      actionsReserved:
        actionItemRect !== undefined &&
        actionToolbarRect !== undefined &&
        actionItemRect.right <= actionToolbarRect.left + 0.5,
      currentPages: Array.from(
        document.querySelectorAll(
          ".codex-ui-app-sidebar [aria-current=\"page\"]",
        ),
        (item) =>
          item
            .querySelector(".codex-ui-app-sidebar__item-label")
            ?.textContent?.trim() ?? item.textContent?.trim(),
      ),
      layoutMode: shell?.getAttribute("data-layout-mode"),
      footer: footer ? rect(footer) : null,
      footerInFlow:
        navigation !== null &&
        navigation !== undefined &&
        footer !== null &&
        footer !== undefined &&
        sidebar !== null &&
        navigation.getBoundingClientRect().bottom <=
          footer.getBoundingClientRect().top + 0.5 &&
        footer.getBoundingClientRect().bottom <=
          sidebar.getBoundingClientRect().bottom + 0.5,
      main: main ? rect(main) : null,
      projectEllipsis:
        projectLabel &&
        projectLabel.scrollWidth > projectLabel.clientWidth,
      reducedMotion: {
        actions: getComputedStyle(activeToolbar).transitionDuration,
        chevron: getComputedStyle(
          document.querySelector(
            ".codex-ui-app-sidebar__section-chevron",
          ),
        ).transitionDuration,
      },
      resizer: Boolean(
        document.querySelector(
          '.codex-ui-app-shell__sidebar-resizer[role="separator"]',
        ),
      ),
      helpAction: Boolean(
        document.querySelector(
          '.codex-ui-app-sidebar-footer__actions button[aria-label="Open help menu"]',
        ),
      ),
      sidebar: sidebar ? rect(sidebar) : null,
    };
  });
  if (
    compact.layoutMode !== "medium" ||
    !compact.sidebar ||
    !compact.main ||
    Math.abs(compact.sidebar.width - 274) > 1 ||
    Math.abs(compact.main.left - 274) > 1 ||
    Math.abs(compact.main.width - 546) > 1 ||
    !compact.resizer ||
    !compact.projectEllipsis ||
    !compact.activeAction ||
    Number.parseFloat(compact.reducedMotion.actions) > 0.001 ||
    Number.parseFloat(compact.reducedMotion.chevron) > 0.001 ||
    !compact.footer ||
    compact.footer.height < 100 ||
    !compact.footerInFlow ||
    compact.actionCount !== 3 ||
    !compact.actionsReserved ||
    compact.accountPopup !== "menu" ||
    JSON.stringify(compact.currentPages) !==
      JSON.stringify(["codex-ui-kit"]) ||
    !compact.helpAction
  ) {
    throw new Error(
      `sidebar-current: compact interaction contract failed: ${JSON.stringify(compact)}`,
    );
  }
  await sidebarPage
    .getByRole("button", { exact: true, name: "Live local" })
    .click();
  const liveCurrentPages = await sidebarPage.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        '.codex-ui-app-sidebar [aria-current="page"]',
      ),
      (item) =>
        item
          .querySelector(".codex-ui-app-sidebar__item-label")
          ?.textContent?.trim() ?? item.textContent?.trim(),
    ),
  );
  if (JSON.stringify(liveCurrentPages) !== JSON.stringify(["Live local"])) {
    throw new Error(
      `sidebar-current: Live local did not own the only current page: ${JSON.stringify(liveCurrentPages)}`,
    );
  }
  await projectsToggle.click();
  const collapsed = {
    expanded: await projectsToggle.getAttribute("aria-expanded"),
    focusRetained: await projectsToggle.evaluate(
      (element) => document.activeElement === element,
    ),
    projectVisible: await longProject.isVisible(),
  };
  if (
    collapsed.expanded !== "false" ||
    collapsed.projectVisible ||
    !collapsed.focusRetained
  ) {
    throw new Error(
      `sidebar-current: collapsing Projects did not hide content and retain focus: ${JSON.stringify(collapsed)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "sidebar-current.json"),
    `${JSON.stringify(
      {
        ...compact,
        currentProjectActions,
        currentRecentActions,
        currentSidebarAssets,
        currentTaskActions,
        helpMenuContract,
        projectEnterExpanded,
        projectMenuContract,
        projectPointerCollapsed,
        projectSpaceCollapsed,
        projectSpaceExpanded,
        responsiveProject,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await sidebarApp.close();
}

const sidebarNarrowScene = {
  frame: "markdown-complete",
  id: "sidebar-current-narrow",
  scenario: "markdown",
};
const { app: sidebarNarrowApp, page: sidebarNarrowPage } =
  await launchScene(sidebarNarrowScene, {
    capture: false,
    windowSize: { height: 680, width: 720 },
  });
try {
  const showSidebar = sidebarNarrowPage.getByRole("button", {
    name: "Show sidebar",
  });
  const initial = await sidebarNarrowPage.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        height: value.height,
        left: value.left,
        width: value.width,
      };
    };
    const shell = document.querySelector(".codex-ui-app-shell");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const main = document.querySelector(".codex-ui-app-shell__main");
    const backdrop = document.querySelector(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    );
    return {
      backdropHidden: backdrop?.hasAttribute("hidden"),
      layoutMode: shell?.getAttribute("data-layout-mode"),
      main: main ? rect(main) : null,
      resizer: Boolean(
        document.querySelector(
          '.codex-ui-app-shell__sidebar-resizer[role="separator"]',
        ),
      ),
      sidebar: sidebar ? rect(sidebar) : null,
      sidebarAriaHidden: sidebar?.getAttribute("aria-hidden"),
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
    };
  });
  if (
    initial.layoutMode !== "narrow" ||
    initial.sidebarOpen ||
    initial.sidebarAriaHidden !== "true" ||
    !initial.sidebar ||
    initial.sidebar.left > -273 ||
    !initial.main ||
    Math.abs(initial.main.left) > 1 ||
    Math.abs(initial.main.width - 720) > 1 ||
    initial.resizer ||
    initial.backdropHidden !== true
  ) {
    throw new Error(
      `sidebar-current-narrow: initial collapsed contract failed: ${JSON.stringify(initial)}`,
    );
  }

  await showSidebar.click();
  const opened = await sidebarNarrowPage.evaluate(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const main = document.querySelector(".codex-ui-app-shell__main");
    const backdrop = document.querySelector(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    );
    return {
      backdropHidden: backdrop?.hasAttribute("hidden"),
      main: main
        ? {
            inert: main.hasAttribute("inert"),
            left: main.getBoundingClientRect().left,
            width: main.getBoundingClientRect().width,
          }
        : null,
      sidebarAriaHidden: sidebar?.getAttribute("aria-hidden"),
      sidebarLeft: sidebar?.getBoundingClientRect().left,
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
    };
  });
  if (
    !opened.sidebarOpen ||
    opened.sidebarAriaHidden !== "false" ||
    Math.abs(opened.sidebarLeft ?? -274) > 1 ||
    !opened.main ||
    opened.main.inert ||
    Math.abs(opened.main.left - 274) > 1 ||
    Math.abs(opened.main.width - 446) > 1 ||
    opened.backdropHidden !== true
  ) {
    throw new Error(
      `sidebar-current-narrow: explicit pin contract failed: ${JSON.stringify(opened)}`,
    );
  }

  await sidebarNarrowPage
    .getByRole("button", { exact: true, name: "Pull requests" })
    .click();
  const navigated = await sidebarNarrowPage.evaluate(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    const main = document.querySelector(".codex-ui-app-shell__main");
    return {
      mainInert: main?.hasAttribute("inert"),
      mainLeft: main?.getBoundingClientRect().left,
      mainWidth: main?.getBoundingClientRect().width,
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      view: document
        .querySelector(".demo-root")
        ?.getAttribute("data-view"),
    };
  });
  if (
    !navigated.sidebarOpen ||
    navigated.mainInert ||
    Math.abs((navigated.mainLeft ?? 0) - 274) > 1 ||
    Math.abs((navigated.mainWidth ?? 0) - 446) > 1 ||
    navigated.view !== "pull-request"
  ) {
    throw new Error(
      `sidebar-current-narrow: pinned navigation was not retained: ${JSON.stringify(navigated)}`,
    );
  }

  await sidebarNarrowPage.reload();
  await sidebarNarrowPage.waitForSelector(
    '.demo-root[data-scenario="markdown"][data-frame="markdown-complete"]',
  );
  await sidebarNarrowPage.mouse.move(1, 200);
  await sidebarNarrowPage.waitForTimeout(500);
  const preview = await sidebarNarrowPage.evaluate(() => {
    const shell = document.querySelector(".codex-ui-app-shell");
    const sidebar = document.querySelector(".codex-ui-app-shell__sidebar");
    const main = document.querySelector(".codex-ui-app-shell__main");
    const backdrop = document.querySelector(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    );
    return {
      backdropHidden: backdrop?.hasAttribute("hidden"),
      mainInert: main?.hasAttribute("inert"),
      mainWidth: main?.getBoundingClientRect().width,
      position: sidebar ? getComputedStyle(sidebar).position : null,
      previewOpen: shell?.hasAttribute("data-sidebar-preview-open"),
      sidebarAriaHidden: sidebar?.getAttribute("aria-hidden"),
      sidebarLeft: sidebar?.getBoundingClientRect().left,
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
    };
  });
  if (
    preview.previewOpen ||
    preview.sidebarOpen ||
    preview.mainInert ||
    Math.abs((preview.mainWidth ?? 0) - 720) > 1 ||
    (preview.sidebarLeft ?? 0) > -273 ||
    preview.sidebarAriaHidden !== "true" ||
    preview.position !== "absolute" ||
    preview.backdropHidden !== true
  ) {
    throw new Error(
      `sidebar-current-narrow: collapsed edge unexpectedly previewed: ${JSON.stringify(preview)}`,
    );
  }
  await sidebarNarrowPage.mouse.move(500, 200);
} finally {
  await sidebarNarrowApp.close();
}

const responsiveContinuityScene = {
  frame: "pull-request",
  id: "app-shell-responsive-continuity",
  scenario: "workspace-workflow",
  view: "pull-request",
};
const {
  app: responsiveContinuityApp,
  page: responsiveContinuityPage,
} = await launchScene(responsiveContinuityScene, {
  capture: false,
  windowSize: { height: 820, width: 1180 },
});

try {
  const resizeAndRead = async (width, height, expected) => {
    await responsiveContinuityApp.evaluate(
      ({ BrowserWindow }, size) => {
        BrowserWindow.getAllWindows()[0]?.setContentSize(
          size.width,
          size.height,
        );
      },
      { height, width },
    );
    await responsiveContinuityPage.waitForFunction(
      (target) => {
        const shell = document.querySelector(".codex-ui-app-shell");
        return (
          window.innerWidth === target.width &&
          window.innerHeight === target.height &&
          shell?.getAttribute("data-layout-mode") === target.layoutMode &&
          shell.hasAttribute("data-sidebar-open") === target.sidebarOpen &&
          shell.hasAttribute("data-side-panel-open") === target.sidePanelOpen
        );
      },
      { height, width, ...expected },
      { timeout: 5_000 },
    );
    return responsiveContinuityPage.evaluate(() => {
      const shell = document.querySelector(".codex-ui-app-shell");
      const main = document.querySelector(".codex-ui-app-shell__main");
      const sidePanel = document.querySelector(
        ".codex-ui-app-shell__side-panel",
      );
      const sidebar = document.querySelector(
        ".codex-ui-app-shell__sidebar",
      );
      return {
        horizontalOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        layoutMode: shell?.getAttribute("data-layout-mode"),
        mainWidth: main?.getBoundingClientRect().width,
        selectedRoutes: Array.from(
          document.querySelectorAll(
            '.codex-ui-app-sidebar__item[aria-current="page"]',
          ),
          (element) => element.textContent?.trim(),
        ),
        sidePanelOpen: shell?.hasAttribute("data-side-panel-open"),
        sidePanelWidth: sidePanel?.getBoundingClientRect().width,
        sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
        sidebarWidth: sidebar?.getBoundingClientRect().width,
        viewport: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    });
  };

  const responsiveMatrix = [];
  for (const { expected, ...viewport } of [
    {
      expected: {
        layoutMode: "wide",
        sidePanelOpen: true,
        sidebarOpen: true,
      },
      height: 820,
      width: 1180,
    },
    {
      expected: {
        layoutMode: "wide",
        sidePanelOpen: true,
        sidebarOpen: true,
      },
      height: 680,
      width: 961,
    },
    {
      expected: {
        layoutMode: "medium",
        sidePanelOpen: false,
        sidebarOpen: true,
      },
      height: 680,
      width: 960,
    },
    {
      expected: {
        layoutMode: "medium",
        sidePanelOpen: false,
        sidebarOpen: true,
      },
      height: 680,
      width: 721,
    },
    {
      expected: {
        layoutMode: "narrow",
        sidePanelOpen: false,
        sidebarOpen: true,
      },
      height: 680,
      width: 720,
    },
    {
      expected: {
        layoutMode: "medium",
        sidePanelOpen: false,
        sidebarOpen: true,
      },
      height: 680,
      width: 721,
    },
    {
      expected: {
        layoutMode: "wide",
        sidePanelOpen: true,
        sidebarOpen: true,
      },
      height: 680,
      width: 961,
    },
    {
      expected: {
        layoutMode: "wide",
        sidePanelOpen: true,
        sidebarOpen: true,
      },
      height: 1080,
      width: 1920,
    },
    {
      expected: {
        layoutMode: "wide",
        sidePanelOpen: true,
        sidebarOpen: true,
      },
      height: 1440,
      width: 2560,
    },
  ]) {
    responsiveMatrix.push({
      ...viewport,
      state: await resizeAndRead(
        viewport.width,
        viewport.height,
        expected,
      ),
    });
  }

  const [
    wide1180,
    wide961,
    medium960,
    medium721,
    narrow720,
    restored721,
    restored961,
    fullHd,
    twoK,
  ] = responsiveMatrix.map(({ state }) => state);
  const everyViewportIsStable = responsiveMatrix.every(
    ({ state, width }) =>
      state.viewport.width === width &&
      state.horizontalOverflow <= 1 &&
      JSON.stringify(state.selectedRoutes) ===
        JSON.stringify(["Pull requests"]),
  );
  if (
    !everyViewportIsStable ||
    wide1180.layoutMode !== "wide" ||
    !wide1180.sidebarOpen ||
    !wide1180.sidePanelOpen ||
    wide961.layoutMode !== "wide" ||
    !wide961.sidePanelOpen ||
    medium960.layoutMode !== "medium" ||
    !medium960.sidebarOpen ||
    medium960.sidePanelOpen ||
    medium721.layoutMode !== "medium" ||
    !medium721.sidebarOpen ||
    narrow720.layoutMode !== "narrow" ||
    !narrow720.sidebarOpen ||
    narrow720.sidePanelOpen ||
    restored721.layoutMode !== "medium" ||
    !restored721.sidebarOpen ||
    restored721.sidePanelOpen ||
    restored961.layoutMode !== "wide" ||
    !restored961.sidebarOpen ||
    !restored961.sidePanelOpen ||
    fullHd.layoutMode !== "wide" ||
    twoK.layoutMode !== "wide" ||
    Math.abs((fullHd.sidebarWidth ?? 0) - 274) > 1 ||
    Math.abs((twoK.sidebarWidth ?? 0) - 274) > 1
  ) {
    throw new Error(
      `App shell responsive continuity failed: ${JSON.stringify(responsiveMatrix)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "app-shell-responsive-continuity.json"),
    `${JSON.stringify(responsiveMatrix, null, 2)}\n`,
  );
} finally {
  await responsiveContinuityApp.close();
}

const conversationLifecycleScene = {
  frame: "conversation-thread-ready",
  id: "conversation-lifecycle-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: conversationLifecycleApp,
  page: conversationLifecyclePage,
} = await launchScene(conversationLifecycleScene, { capture: false });
try {
  const composer = conversationLifecyclePage.getByRole("textbox", {
    name: "Message composer",
  });
  await composer.fill("Start the deterministic lifecycle.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"]',
  );

  await composer.fill("Queue this follow-up while the turn is running.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-queue-count="1"]',
  );
  await conversationLifecyclePage
    .getByRole("button", { exact: true, name: "Stop" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-queue-count="0"]',
  );
  const stoppedState = await conversationLifecyclePage.evaluate(() => {
    const currentTask = [
      ...document.querySelectorAll(".codex-ui-app-sidebar__item-row"),
    ].find(
      (row) =>
        row.querySelector(".codex-ui-app-sidebar__item-label")?.textContent ===
        "codex-ui-kit",
    );
    return {
      assistantStatus: document
        .querySelector('[data-item-id="assistant-11"]')
        ?.getAttribute("data-status"),
      currentTaskStatus: currentTask?.getAttribute("data-status"),
      rootStatus: document
        .querySelector(".demo-root")
        ?.getAttribute("data-status"),
    };
  });
  if (
    stoppedState.assistantStatus !== "completed" ||
    stoppedState.currentTaskStatus !== "running" ||
    stoppedState.rootStatus !== "running"
  ) {
    throw new Error(
      `Conversation stop state diverged: ${JSON.stringify(stoppedState)}`,
    );
  }
  if (
    (await conversationLifecyclePage
      .getByText("You stopped after 2s", { exact: true })
      .count()) !== 1 ||
    (await conversationLifecyclePage
      .getByText("Queue this follow-up while the turn is running.", {
        exact: true,
      })
      .count()) !== 1
  ) {
    throw new Error("Stop did not promote the queued follow-up automatically.");
  }
  await composer.fill("Queue action controls while continuation runs.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-queue-count="1"]',
  );
  const queuedPromptActions = conversationLifecyclePage.locator(
    'button[aria-label="Queued message actions"]',
  );
  await queuedPromptActions.click();
  await conversationLifecyclePage
    .getByRole("menuitem", { name: "Turn off queueing" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-queueing-enabled="false"]',
  );
  await queuedPromptActions.click();
  await conversationLifecyclePage
    .getByRole("button", { name: "Delete queued message" })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-queue-count="0"]',
  );
  await composer.fill("Steer this prompt while queueing is disabled.");
  await composer.press("Enter");
  await conversationLifecyclePage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const textarea = document.querySelector(
      'textarea[aria-label="Message composer"]',
    );
    return (
      root?.getAttribute("data-composer-phase") === "running" &&
      root?.getAttribute("data-queue-count") === "0" &&
      root?.getAttribute("data-queueing-enabled") === "false" &&
      textarea instanceof HTMLTextAreaElement &&
      textarea.value === ""
    );
  });

  const firstMessageNavigation = conversationLifecyclePage.getByRole(
    "button",
    {
      exact: true,
      name: "Jump to user message 1",
    },
  );
  await firstMessageNavigation.focus();
  await conversationLifecyclePage.waitForSelector(
    ".codex-ui-message-navigation-rail__tooltip",
  );
  if (
    (await conversationLifecyclePage
      .locator(".codex-ui-message-navigation-rail__tooltip-preview")
      .count()) !== 0
  ) {
    throw new Error("Message navigation duplicated its label as a preview.");
  }
  await firstMessageNavigation.click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-thread-following="false"] .codex-ui-thread-floating-button[data-show]',
  );
  await conversationLifecyclePage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await conversationLifecyclePage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    return (
      root?.getAttribute("data-thread-following") === "true" &&
      viewport instanceof HTMLElement &&
      viewport.scrollHeight -
        viewport.clientHeight -
        viewport.scrollTop <=
        1
    );
  });
  await conversationLifecyclePage
    .getByRole("button", {
      exact: true,
      name: "Jump to user message 1",
    })
    .click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-thread-following="false"]',
  );
  await conversationLifecyclePage
    .locator(".codex-ui-conversation-thread-shell__viewport")
    .evaluate((viewport) => {
      viewport.scrollTo = () => undefined;
    });
  await conversationLifecyclePage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await conversationLifecyclePage.waitForTimeout(100);

  const interaction = await conversationLifecyclePage.evaluate(() => {
    const dock = document.querySelector(".codex-ui-composer-dock");
    const root = document.querySelector(".demo-root");
    const queue = document.querySelector(".codex-ui-composer-queue");
    return {
      composerPhase: root?.getAttribute("data-composer-phase"),
      dockHasQueue: dock?.hasAttribute("data-has-queue"),
      navigationCount: document.querySelectorAll(
        ".codex-ui-message-navigation-rail button",
      ).length,
      queueCount: root?.getAttribute("data-queue-count"),
      queueingEnabled: root?.getAttribute("data-queueing-enabled"),
      queueRendered: Boolean(queue),
      stopCount: document.querySelectorAll(
        '.codex-ui-composer button[aria-label="Stop"]',
      ).length,
      threadFollowing: root?.getAttribute("data-thread-following"),
    };
  });
  if (
    interaction.composerPhase !== "running" ||
    interaction.dockHasQueue !== false ||
    interaction.navigationCount !== 11 ||
    interaction.queueCount !== "0" ||
    interaction.queueingEnabled !== "false" ||
    interaction.queueRendered ||
    interaction.stopCount !== 1 ||
    interaction.threadFollowing !== "false"
  ) {
    throw new Error(
      `Conversation lifecycle interaction failed: ${JSON.stringify(interaction)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "conversation-lifecycle-interaction.json"),
    `${JSON.stringify(interaction, null, 2)}\n`,
  );
  await conversationLifecyclePage.evaluate(() => {
    const scenarioLabel = [
      ...document.querySelectorAll(
        ".codex-ui-app-sidebar__item-label",
      ),
    ].find(
      (label) =>
        label.textContent?.trim() ===
        "Conversation and Composer lifecycle",
    );
    const scenarioButton = scenarioLabel?.closest(
      ".codex-ui-app-sidebar__item",
    );
    if (!(scenarioButton instanceof HTMLButtonElement)) {
      throw new Error("Conversation lifecycle scenario button is missing.");
    }
    scenarioButton.click();
  });
  await conversationLifecyclePage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    const viewport = document.querySelector(
      ".codex-ui-conversation-thread-shell__viewport",
    );
    if (!(viewport instanceof HTMLElement)) return false;
    const distance =
      viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
    return root?.getAttribute("data-thread-following") === "true" &&
      distance <= 1;
  });
  const scenarioResetDistance =
    await conversationLifecyclePage
      .locator(".codex-ui-conversation-thread-shell__viewport")
      .evaluate(
        (viewport) =>
          viewport.scrollHeight -
          viewport.clientHeight -
          viewport.scrollTop,
      );
  if (scenarioResetDistance > 1) {
    throw new Error(
      `Scenario selection claimed following before resetting the viewport: ${scenarioResetDistance}`,
    );
  }
} finally {
  await conversationLifecycleApp.close();
}

const windowedNavigationScene = {
  frame: "thread-windowed",
  id: "windowed-message-navigation-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: windowedNavigationApp,
  page: windowedNavigationPage,
} = await launchScene(windowedNavigationScene, { capture: false });
try {
  await windowedNavigationPage.waitForSelector(
    '.demo-root[data-windowed-timeline="current"][data-thread-following="false"] [data-selected-message-index="40"]',
  );
  if (
    (await windowedNavigationPage
      .locator('[data-item-id="current-windowed-user-20"]')
      .count()) !==
    0
  ) {
    throw new Error("Windowed navigation mounted the hidden target too early.");
  }
  await windowedNavigationPage
    .getByRole("button", {
      exact: true,
      name: "Jump to user message 20",
    })
    .click();
  await windowedNavigationPage.waitForSelector(
    '.demo-root[data-windowed-timeline="current"][data-thread-following="false"] [data-selected-message-index="20"] [data-item-id="current-windowed-user-20"]',
  );
  const materializedNavigation = await windowedNavigationPage.evaluate(() => ({
    hiddenPlaceholderCount: document.querySelectorAll(
      ".codex-ui-thread-virtualized-placeholder",
    ).length,
    mountedTurnCount: document.querySelectorAll("[data-windowed-turn]")
      .length,
    navigationCount: document.querySelectorAll(
      ".codex-ui-message-navigation-rail__button",
    ).length,
    targetCount: document.querySelectorAll(
      '[data-item-id="current-windowed-user-20"]',
    ).length,
    threadFollowing: document
      .querySelector(".demo-root")
      ?.getAttribute("data-thread-following"),
    windowedTimeline: document
      .querySelector(".demo-root")
      ?.getAttribute("data-windowed-timeline"),
  }));
  if (
    materializedNavigation.hiddenPlaceholderCount !== 2 ||
    materializedNavigation.mountedTurnCount !== 7 ||
    materializedNavigation.navigationCount !== 82 ||
    materializedNavigation.targetCount !== 1 ||
    materializedNavigation.threadFollowing !== "false" ||
    materializedNavigation.windowedTimeline !== "current"
  ) {
    throw new Error(
      `Windowed message navigation failed: ${JSON.stringify(materializedNavigation)}`,
    );
  }
  await windowedNavigationPage
    .getByRole("button", { name: "Scroll to bottom" })
    .click();
  await windowedNavigationPage.waitForFunction(
    () => {
      const root = document.querySelector(".demo-root");
      const viewport = document.querySelector(
        ".codex-ui-conversation-thread-shell__viewport",
      );
      return (
        root?.getAttribute("data-thread-following") === "true" &&
        document
          .querySelector("[data-selected-message-index]")
          ?.getAttribute("data-selected-message-index") === "82" &&
        viewport?.scrollTop === 0
      );
    },
  );
} finally {
  await windowedNavigationApp.close();
}

const pausedSteerScene = {
  frame: "composer-queue-paused",
  id: "paused-queue-steer-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: pausedSteerApp,
  page: pausedSteerPage,
} = await launchScene(pausedSteerScene, { capture: false });
try {
  await pausedSteerPage.getByRole("button", { name: "Steer" }).click();
  await pausedSteerPage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-status="running"][data-queue-count="0"] [data-item-id="assistant-11"][data-status="running"]',
  );
  const pausedSteerState = await pausedSteerPage.evaluate(() => ({
    queueRendered: Boolean(
      document.querySelector(".codex-ui-composer-dock__queue"),
    ),
    replayMethod: document
      .querySelector(".demo-root")
      ?.getAttribute("data-last-method"),
  }));
  if (
    pausedSteerState.queueRendered ||
    pausedSteerState.replayMethod !== "item/agentMessage/delta"
  ) {
    throw new Error(
      `Paused queue Steer did not restore the running replay: ${JSON.stringify(pausedSteerState)}`,
    );
  }
} finally {
  await pausedSteerApp.close();
}

const pausedDeleteScene = {
  frame: "composer-queue-paused",
  id: "paused-queue-delete-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: pausedDeleteApp,
  page: pausedDeletePage,
} = await launchScene(pausedDeleteScene, { capture: false });
try {
  await pausedDeletePage
    .getByRole("button", { name: "Delete queued message" })
    .click();
  await pausedDeletePage.waitForFunction(() => {
    const root = document.querySelector(".demo-root");
    return (
      root?.getAttribute("data-composer-phase") === "idle" &&
      root.getAttribute("data-queue-count") === "0" &&
      !document.querySelector(".codex-ui-composer-dock__queue") &&
      document.querySelectorAll(".codex-ui-composer-context button").length ===
        3
    );
  });
} finally {
  await pausedDeleteApp.close();
}

const longQueueScene = {
  frame: "composer-running",
  id: "long-queue-menu-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: longQueueApp,
  page: longQueuePage,
} = await launchScene(longQueueScene, { capture: false });
try {
  const longQueueComposer = longQueuePage.getByRole("textbox", {
    name: "Message composer",
  });
  for (let index = 1; index <= 12; index += 1) {
    await longQueueComposer.fill(`Queued prompt ${index}`);
    await longQueueComposer.press("Enter");
  }
  await longQueuePage.waitForSelector(
    '.demo-root[data-queue-count="12"] .codex-ui-composer-queue',
  );
  const longQueue = longQueuePage.locator(".codex-ui-composer-queue");
  const lastQueueActions = longQueuePage
    .getByRole("button", { name: "Queued message actions" })
    .last();
  await lastQueueActions.click();
  const longQueueMenu = longQueuePage.getByRole("menu");
  await longQueueMenu.waitFor({ state: "visible" });
  const longQueueContract = await longQueuePage.evaluate(() => {
    const queue = document.querySelector(".codex-ui-composer-queue");
    const menu = document.querySelector(".codex-ui-composer-queue__menu");
    if (!(queue instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      throw new Error("Long queue or its action menu is missing.");
    }
    return {
      menuPortaled: menu.parentElement === document.body,
      menuPosition: getComputedStyle(menu).position,
      overflowY: getComputedStyle(queue).overflowY,
      queueClientHeight: queue.clientHeight,
      queueScrollHeight: queue.scrollHeight,
      queueScrollTop: queue.scrollTop,
    };
  });
  if (
    !longQueueContract.menuPortaled ||
    longQueueContract.menuPosition !== "fixed" ||
    longQueueContract.overflowY !== "auto" ||
    longQueueContract.queueClientHeight >=
      longQueueContract.queueScrollHeight ||
    longQueueContract.queueScrollTop <= 0
  ) {
    throw new Error(
      `Long queue lost its bounded scroll contract: ${JSON.stringify(longQueueContract)}`,
    );
  }
} finally {
  await longQueueApp.close();
}

const replayPositionScene = {
  frame: "conversation-completed",
  id: "conversation-replay-position-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: replayPositionApp,
  page: replayPositionPage,
} = await launchScene(replayPositionScene, { capture: false });
try {
  const previousReplayEvent = replayPositionPage.getByRole("button", {
    name: "Previous",
  });
  const stopReplay = replayPositionPage.getByRole("button", {
    exact: true,
    name: "Stop",
  });
  const replayRoot = replayPositionPage.locator(".demo-root");
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if ((await replayRoot.getAttribute("data-status")) === "running") {
      break;
    }
    if (await previousReplayEvent.isDisabled()) break;
    await previousReplayEvent.click();
  }
  await replayPositionPage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-status="running"]',
  );
  if ((await stopReplay.count()) !== 1) {
    throw new Error(
      "Composer did not follow the replay into a running protocol position.",
    );
  }
  const replayComposer = replayPositionPage.getByRole("textbox", {
    name: "Message composer",
  });
  await replayComposer.fill("Keep this queued prompt while replaying.");
  await replayComposer.press("Enter");
  await replayPositionPage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-queue-count="1"]',
  );
  await stopReplay.click();
  await replayPositionPage.waitForSelector(
    '.demo-root[data-composer-phase="running"][data-status="running"][data-queue-count="0"]',
  );
  if (
    (await replayPositionPage
      .getByText("You stopped after 2s", { exact: true })
      .count()) !== 1
  ) {
    throw new Error(
      "Replay stop did not preserve the interruption summary while continuing the queue.",
    );
  }

  const replayPosition = replayPositionPage.getByRole("slider", {
    name: "Protocol event position",
  });
  await replayPosition.focus();
  await replayPosition.press("End");
  await replayPositionPage.waitForSelector(
    '.demo-root[data-composer-phase="idle"][data-status="completed"][data-queue-count="0"]',
  );
  if (
    (await stopReplay.count()) !== 0 ||
    (await replayPositionPage.locator(".codex-ui-composer-queue").count()) !==
      0
  ) {
    throw new Error(
      "Composer retained running or queued work after replay completion.",
    );
  }
} finally {
  await replayPositionApp.close();
}

const disabledReplayScene = {
  frame: "composer-disabled",
  id: "disabled-replay-position-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: disabledReplayApp,
  page: disabledReplayPage,
} = await launchScene(disabledReplayScene, { capture: false });
try {
  await disabledReplayPage.waitForSelector(
    '.demo-root[data-composer-phase="submitting"] textarea:disabled',
  );
  const disabledReplayPosition = disabledReplayPage.getByRole("slider", {
    name: "Protocol event position",
  });
  await disabledReplayPosition.focus();
  await disabledReplayPosition.press("End");
  await disabledReplayPage.waitForSelector(
    '.demo-root[data-composer-phase="idle"][data-status="completed"] textarea:not(:disabled)',
  );
} finally {
  await disabledReplayApp.close();
}

const disabledModeScene = {
  frame: "composer-disabled",
  id: "disabled-mode-switch-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: disabledModeApp,
  page: disabledModePage,
} = await launchScene(disabledModeScene, { capture: false });
try {
  await disabledModePage.getByRole("button", { exact: true, name: "Live" }).click();
  await disabledModePage.waitForSelector('.demo-root[data-mode="live"]');
  await disabledModePage
    .getByRole("button", { exact: true, name: "Replay" })
    .click();
  await disabledModePage.waitForSelector(
    '.demo-root[data-mode="replay"][data-composer-phase="idle"] textarea:not(:disabled)',
  );
  const disabledModeState = await disabledModePage.evaluate(() => {
    const root = document.querySelector(".demo-root");
    const textarea = document.querySelector(
      'textarea[aria-label="Message composer"]',
    );
    return {
      frame: root?.getAttribute("data-frame"),
      value:
        textarea instanceof HTMLTextAreaElement ? textarea.value : null,
    };
  });
  if (
    disabledModeState.frame === "composer-disabled" ||
    disabledModeState.value !== ""
  ) {
    throw new Error(
      `Mode switching retained the disabled fixture: ${JSON.stringify(disabledModeState)}`,
    );
  }
} finally {
  await disabledModeApp.close();
}

const attachmentModeScene = {
  frame: "attachment-ready",
  id: "attachment-mode-switch-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentModeApp,
  page: attachmentModePage,
} = await launchScene(attachmentModeScene, { capture: false });
try {
  await attachmentModePage.waitForSelector(
    '.demo-root[data-mode="replay"] .codex-ui-composer-attachment',
  );
  await attachmentModePage
    .getByRole("button", { exact: true, name: "Live local" })
    .click();
  await attachmentModePage.waitForSelector('.demo-root[data-mode="live"]');
  if (
    (await attachmentModePage
      .locator(".codex-ui-composer .codex-ui-composer-attachment")
      .count()) !== 0
  ) {
    throw new Error("Attachment mode switching retained cards in Live mode.");
  }
  await attachmentModePage
    .getByRole("button", { exact: true, name: "Replay" })
    .click();
  await attachmentModePage.waitForSelector(
    '.demo-root[data-mode="replay"][data-composer-phase="idle"]',
  );
  const attachmentModeState = await attachmentModePage.evaluate(() => ({
    attachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    submitDisabled: document
      .querySelector('.codex-ui-composer [data-action="submit"]')
      ?.hasAttribute("disabled"),
    value:
      document.querySelector(
        'textarea[aria-label="Message composer"]',
      )?.value ?? null,
  }));
  if (
    attachmentModeState.attachmentCount !== 0 ||
    !attachmentModeState.submitDisabled ||
    attachmentModeState.value !== ""
  ) {
    throw new Error(
      `Attachment mode switching retained stale state: ${JSON.stringify(attachmentModeState)}`,
    );
  }
} finally {
  await attachmentModeApp.close();
}

for (const attachmentComposerMode of [
  {
    frame: "composer-goal",
    id: "attachment-to-goal-mode-interaction",
    label: "Goal",
    mode: "goal",
    textareaLabel:
      "Describe your goal, define measurable outcomes for best results",
  },
  {
    frame: "composer-plan",
    id: "attachment-to-plan-mode-interaction",
    label: "Plan mode",
    mode: "plan",
    textareaLabel: "Describe your task to generate a plan...",
  },
]) {
  const { app, page } = await launchScene(
    {
      frame: "attachment-ready",
      id: attachmentComposerMode.id,
      scenario: "attachment-lifecycle",
    },
    { capture: false },
  );
  try {
    await page.getByRole("button", { name: "Add files and more" }).click();
    await page
      .getByRole("option", { name: attachmentComposerMode.label })
      .click();
    await page.waitForSelector(
      `.demo-root[data-scenario="conversation-lifecycle"][data-frame="${attachmentComposerMode.frame}"][data-composer-mode="${attachmentComposerMode.mode}"]`,
    );
    const transitionedMode = await page.evaluate(() => ({
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      submitDisabled: document
        .querySelector('.codex-ui-composer [data-action="submit"]')
        ?.hasAttribute("disabled"),
      textareaLabel: document
        .querySelector(".codex-ui-composer textarea")
        ?.getAttribute("aria-label"),
    }));
    if (
      transitionedMode.attachmentCount !== 0 ||
      transitionedMode.submitDisabled !== true ||
      transitionedMode.textareaLabel !== attachmentComposerMode.textareaLabel
    ) {
      throw new Error(
        `${attachmentComposerMode.id} retained attachment submission state: ${JSON.stringify(transitionedMode)}`,
      );
    }
  } finally {
    await app.close();
  }
}

const visualAttachmentSubmitScene = {
  frame: "composer-attachment",
  id: "visual-attachment-text-submit-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: visualAttachmentSubmitApp,
  page: visualAttachmentSubmitPage,
} = await launchScene(visualAttachmentSubmitScene, { capture: false });
try {
  const visualAttachmentComposer = visualAttachmentSubmitPage.getByRole(
    "textbox",
    { name: "Message composer" },
  );
  await visualAttachmentComposer.fill("Continue the conversation without attachments.");
  const visualAttachmentSubmit = visualAttachmentSubmitPage.getByRole(
    "button",
    { name: "Send message" },
  );
  if (!(await visualAttachmentSubmit.isEnabled())) {
    throw new Error(
      "The visual-only attachment frame did not enable text submission.",
    );
  }
  await visualAttachmentComposer.press("Enter");
  await visualAttachmentSubmitPage.waitForFunction(
    () =>
      document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length === 0,
  );
  await visualAttachmentSubmitPage.waitForFunction(
    () =>
      document
        .querySelector('.codex-ui-composer textarea[aria-label="Message composer"]')
        ?.value === "",
  );
  if (
    (await visualAttachmentSubmitPage
      .locator('.demo-root[data-scenario="conversation-lifecycle"]')
      .count()) !== 1
  ) {
    throw new Error(
      "Submitting text from the visual-only attachment frame changed scenarios.",
    );
  }
} finally {
  await visualAttachmentSubmitApp.close();
}

const protocolAttachmentFrameScene = {
  frame: "attachment-submitted",
  id: "protocol-attachment-submitted-frame",
  scenario: "attachment-lifecycle",
};
const {
  app: protocolAttachmentFrameApp,
  page: protocolAttachmentFramePage,
} = await launchScene(protocolAttachmentFrameScene, { capture: false });
try {
  const protocolAttachmentFrame = await protocolAttachmentFramePage.evaluate(
    () => ({
      composerAttachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      messageAttachmentCount: document.querySelectorAll(
        ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
      ).length,
      userMessageCount: document.querySelectorAll(
        '.codex-ui-agent-message[data-role="user"]',
      ).length,
    }),
  );
  if (
    protocolAttachmentFrame.composerAttachmentCount !== 0 ||
    protocolAttachmentFrame.messageAttachmentCount !== 1 ||
    protocolAttachmentFrame.userMessageCount !== 1
  ) {
    throw new Error(
      `The protocol-backed attachment-submitted frame was not replayed: ${JSON.stringify(protocolAttachmentFrame)}`,
    );
  }
} finally {
  await protocolAttachmentFrameApp.close();
}

const attachmentReplayNavigationScene = {
  frame: "attachment-ready",
  id: "attachment-replay-navigation",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentReplayNavigationApp,
  page: attachmentReplayNavigationPage,
} = await launchScene(attachmentReplayNavigationScene, { capture: false });
try {
  await attachmentReplayNavigationPage
    .getByRole("button", { name: "Next" })
    .click();
  await attachmentReplayNavigationPage.waitForSelector(
    '[data-item-id="user-attachment-lifecycle"]',
  );
  const navigatedAttachmentReplay =
    await attachmentReplayNavigationPage.evaluate(() => ({
      composerAttachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      messageAttachmentCount: document.querySelectorAll(
        ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
      ).length,
      messageText:
        document.querySelector(
          '[data-item-id="user-attachment-lifecycle"] .codex-ui-agent-message__content',
        )?.textContent ?? null,
    }));
  if (
    navigatedAttachmentReplay.composerAttachmentCount !== 0 ||
    navigatedAttachmentReplay.messageAttachmentCount !== 1 ||
    !navigatedAttachmentReplay.messageText?.startsWith("Reply using three")
  ) {
    throw new Error(
      `Replay navigation retained host-only attachment state: ${JSON.stringify(navigatedAttachmentReplay)}`,
    );
  }
} finally {
  await attachmentReplayNavigationApp.close();
}

const attachmentLifecycleScene = {
  frame: "attachment-ready",
  id: "attachment-lifecycle-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentLifecycleApp,
  page: attachmentLifecyclePage,
} = await launchScene(attachmentLifecycleScene, { capture: false });
try {
  const composer = attachmentLifecyclePage.getByRole("textbox", {
    name: "Message composer",
  });
  const remove = attachmentLifecyclePage.getByRole("button", {
    name: "Remove codex-ui-kit-current.png",
  });
  await remove.click();
  await attachmentLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="idle"] .codex-ui-composer:not([data-disabled])',
  );
  await attachmentLifecyclePage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Message composer",
  );
  if (
    (await attachmentLifecyclePage
      .locator(".codex-ui-composer .codex-ui-composer-attachment")
      .count()) !== 0
  ) {
    throw new Error("Removing the current attachment retained its Composer card.");
  }
  if (
    await attachmentLifecyclePage
      .getByRole("button", { name: "Send message" })
      .isEnabled()
  ) {
    throw new Error(
      "Removing the final attachment left Send enabled for an unsendable draft.",
    );
  }

  await attachmentLifecyclePage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await attachmentLifecyclePage
    .getByRole("option", { name: "Files and folders" })
    .click();
  await attachmentLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="attachment"] .codex-ui-composer-attachment',
  );
  const attachmentStateBeforeDismiss = await attachmentLifecyclePage.evaluate(
    () => ({
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
    }),
  );
  await attachmentLifecyclePage
    .getByRole("button", { name: "Add files and more" })
    .click();
  const attachmentResources = attachmentLifecyclePage.getByRole("listbox", {
    name: "Composer resources",
  });
  await attachmentResources.waitFor();
  await attachmentResources.press("Escape");
  await attachmentResources.waitFor({ state: "detached" });
  const dismissedAttachmentResources = await attachmentLifecyclePage.evaluate(
    () => ({
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      frame: document.querySelector(".demo-root")?.getAttribute("data-frame"),
      submitDisabled: document
        .querySelector('.codex-ui-composer [data-action="submit"]')
        ?.hasAttribute("disabled"),
    }),
  );
  if (
    dismissedAttachmentResources.attachmentCount !==
      attachmentStateBeforeDismiss.attachmentCount ||
    dismissedAttachmentResources.frame !== attachmentStateBeforeDismiss.frame ||
    dismissedAttachmentResources.submitDisabled !== false
  ) {
    throw new Error(
      `Dismissing attachment resources lost the ready frame: ${JSON.stringify(dismissedAttachmentResources)}`,
    );
  }
  await composer.fill("Preserve this draft while attaching another file.");
  await attachmentLifecyclePage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await attachmentLifecyclePage
    .getByRole("option", { name: "Files and folders" })
    .click();
  await attachmentLifecyclePage.waitForFunction(
    () =>
      document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length === 2,
  );
  const appendedAttachmentState = await attachmentLifecyclePage.evaluate(
    () => ({
      attachmentCount: document.querySelectorAll(
        ".codex-ui-composer .codex-ui-composer-attachment",
      ).length,
      composerValue:
        document.querySelector(
          '.codex-ui-composer textarea[aria-label="Message composer"]',
        )?.value ?? null,
    }),
  );
  if (
    appendedAttachmentState.attachmentCount !== 2 ||
    appendedAttachmentState.composerValue !==
      "Preserve this draft while attaching another file."
  ) {
    throw new Error(
      `Appending a selected attachment replaced the tray or draft: ${JSON.stringify(appendedAttachmentState)}`,
    );
  }
  await composer.fill("");
  await composer.press("Enter");
  await attachmentLifecyclePage.waitForSelector(
    '.demo-root[data-frame="attachment-completed"][data-composer-phase="idle"]',
  );
  await attachmentLifecyclePage
    .getByText("ATTACHMENT LIFECYCLE COMPLETE.", { exact: true })
    .waitFor();
  await attachmentLifecyclePage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Message composer",
  );
  const completed = await attachmentLifecyclePage.evaluate(() => ({
    composerAttachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    composerValue:
      document.querySelector('.codex-ui-composer textarea[aria-label="Message composer"]')
        ?.value ?? null,
    messageAttachmentCount: document.querySelectorAll(
      ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
    ).length,
    messageAttachmentLabels: Array.from(
      document.querySelectorAll(
        ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
      ),
      (element) => element.getAttribute("aria-label"),
    ),
    messageText:
      document.querySelector(
        '[data-item-id="user-attachment-lifecycle"] .codex-ui-agent-message__content',
      )?.textContent ?? null,
    permissionLabel:
      document
        .querySelector(".demo-composer-permission-trigger")
        ?.textContent?.replace(/^◉/, "")
        .trim() ?? null,
  }));
  if (
    completed.composerAttachmentCount !== 0 ||
    completed.composerValue !== "" ||
    completed.messageAttachmentCount !== 2 ||
    completed.messageAttachmentLabels.some(
      (label) => label !== "codex-ui-kit-current.png",
    ) ||
    completed.messageText !== null ||
    completed.permissionLabel !== "Ask for approval"
  ) {
    throw new Error(
      `Attachment lifecycle completion failed: ${JSON.stringify(completed)}`,
    );
  }
  await attachmentLifecyclePage
    .getByRole("button", { name: "Previous" })
    .click();
  await attachmentLifecyclePage.waitForFunction(
    () =>
      document
        .querySelector(
          '[data-item-id="user-attachment-lifecycle"] .codex-ui-agent-message__content',
        )
        ?.textContent?.startsWith("Reply using three") === true,
  );
  const scrubbed = await attachmentLifecyclePage.evaluate(() => ({
    composerAttachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    messageAttachmentCount: document.querySelectorAll(
      ".codex-ui-agent-message__attachments .codex-ui-message-attachment",
    ).length,
  }));
  if (
    scrubbed.composerAttachmentCount !== 0 ||
    scrubbed.messageAttachmentCount !== 1
  ) {
    throw new Error(
      `Replay scrubbing retained submitted attachment state: ${JSON.stringify(scrubbed)}`,
    );
  }
} finally {
  await attachmentLifecycleApp.close();
}

const attachmentCompactScene = {
  frame: "attachment-multi-compact",
  id: "attachment-compact-submit-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentCompactApp,
  page: attachmentCompactPage,
} = await launchScene(attachmentCompactScene, { capture: false });
try {
  const compactSubmit = attachmentCompactPage.getByRole("button", {
    name: "Send message",
  });
  if (!(await compactSubmit.isEnabled())) {
    throw new Error("Ready compact attachments did not enable submission.");
  }
  await compactSubmit.click();
  await attachmentCompactPage.waitForSelector(
    '.demo-root[data-frame="attachment-completed"][data-composer-phase="idle"]',
  );
} finally {
  await attachmentCompactApp.close();
}

const attachmentRemoveErrorScene = {
  frame: "attachment-upload-error",
  id: "attachment-remove-error-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentRemoveErrorApp,
  page: attachmentRemoveErrorPage,
} = await launchScene(attachmentRemoveErrorScene, { capture: false });
try {
  await attachmentRemoveErrorPage
    .getByRole("button", { name: "Remove current-build.zip" })
    .click();
  const recoveredSubmit = attachmentRemoveErrorPage.getByRole("button", {
    name: "Send message",
  });
  await recoveredSubmit.waitFor();
  if (!(await recoveredSubmit.isEnabled())) {
    throw new Error(
      "Removing the final failed attachment did not enable ready attachments.",
    );
  }
  await recoveredSubmit.click();
  await attachmentRemoveErrorPage.waitForSelector(
    '.demo-root[data-frame="attachment-completed"][data-composer-phase="idle"]',
  );
} finally {
  await attachmentRemoveErrorApp.close();
}

const attachmentRecoveryScene = {
  frame: "attachment-upload-error",
  id: "attachment-recovery-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentRecoveryApp,
  page: attachmentRecoveryPage,
} = await launchScene(attachmentRecoveryScene, { capture: false });
try {
  await attachmentRecoveryPage
    .getByRole("button", { name: "Retry current-build.zip" })
    .click();
  await attachmentRecoveryPage.waitForSelector(
    '.demo-root[data-frame="attachment-uploading"] [role="progressbar"][aria-valuenow="18"]',
  );
  await attachmentRecoveryPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  await attachmentRecoveryPage.waitForSelector(
    '.demo-root[data-frame="attachment-multi-ready"] .codex-ui-composer-attachment[data-status="ready"]',
  );
  const recoveryState = await attachmentRecoveryPage.evaluate(() => ({
    attachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    errorCount: document.querySelectorAll(
      '.codex-ui-composer-attachment[data-status="error"]',
    ).length,
    progressCount: document.querySelectorAll('[role="progressbar"]').length,
  }));
  if (
    recoveryState.attachmentCount !== 5 ||
    recoveryState.errorCount !== 0 ||
    recoveryState.progressCount !== 0
  ) {
    throw new Error(
      `Attachment upload retry did not settle cleanly: ${JSON.stringify(recoveryState)}`,
    );
  }
} finally {
  await attachmentRecoveryApp.close();
}

const attachmentPreviewScene = {
  frame: "attachment-preview-error",
  id: "attachment-preview-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: attachmentPreviewApp,
  page: attachmentPreviewPage,
} = await launchScene(attachmentPreviewScene, { capture: false });
try {
  await attachmentPreviewPage
    .getByRole("button", { name: "Retry reference-unavailable.png" })
    .click();
  await attachmentPreviewPage.waitForSelector(
    '.demo-root[data-frame="attachment-ready"] .codex-ui-composer-attachment[data-status="ready"] img',
  );
  await attachmentPreviewPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  if (
    (await attachmentPreviewPage.getByText("Preview unavailable").count()) !== 0
  ) {
    throw new Error("Attachment preview retry retained the failure status.");
  }
} finally {
  await attachmentPreviewApp.close();
}

const nativeAttachmentRetryScene = {
  frame: "attachment-empty",
  id: "native-attachment-retry-interaction",
  scenario: "attachment-lifecycle",
};
const {
  app: nativeAttachmentRetryApp,
  page: nativeAttachmentRetryPage,
} = await launchScene(nativeAttachmentRetryScene, {
  capture: false,
  environment: {
    CODEX_DEMO_ATTACHMENT_FIXTURE_FAIL_ONCE: "1",
    CODEX_DEMO_ATTACHMENT_FIXTURE_PATHS: JSON.stringify([
      join(process.cwd(), "../../README.md"),
    ]),
    CODEX_DEMO_ATTACHMENT_RENDERER_FIXTURE: "0",
  },
});
try {
  await nativeAttachmentRetryPage
    .getByRole("button", { name: "Add files and more" })
    .click();
  await nativeAttachmentRetryPage
    .getByRole("option", { name: "Files and folders" })
    .click();
  await nativeAttachmentRetryPage.waitForSelector(
    '.demo-root[data-frame="attachment-upload-error"] .codex-ui-composer-attachment[data-status="error"]',
  );
  await nativeAttachmentRetryPage
    .getByRole("button", { name: "Retry Files and folders" })
    .click();
  await nativeAttachmentRetryPage.waitForSelector(
    '.demo-root[data-frame="attachment-native-ready"] .codex-ui-composer-attachment[data-status="ready"]',
  );
  await nativeAttachmentRetryPage.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Message composer",
  );
  const nativeRetryState = await nativeAttachmentRetryPage.evaluate(() => ({
    attachmentCount: document.querySelectorAll(
      ".codex-ui-composer .codex-ui-composer-attachment",
    ).length,
    errorCount: document.querySelectorAll(
      '.codex-ui-composer-attachment[data-status="error"]',
    ).length,
    label: document
      .querySelector(".codex-ui-composer-attachment__label")
      ?.textContent?.trim(),
  }));
  if (
    nativeRetryState.attachmentCount !== 1 ||
    nativeRetryState.errorCount !== 0 ||
    nativeRetryState.label !== "README.md"
  ) {
    throw new Error(
      `Native attachment retry did not reopen and replace the failed selection: ${JSON.stringify(nativeRetryState)}`,
    );
  }
} finally {
  await nativeAttachmentRetryApp.close();
}

const contextSummaryScene = {
  frame: "context-summary-open",
  id: "context-summary-interaction",
  scenario: "context-summary",
};
const { app: contextSummaryApp, page: contextSummaryPage } = await launchScene(
  contextSummaryScene,
  { capture: false },
);
try {
  const trigger = contextSummaryPage.getByRole("button", {
    exact: true,
    name: "Toggle summary",
  });
  const dialog = contextSummaryPage.getByRole("dialog", {
    exact: true,
    name: "Thread summary",
  });
  await dialog.waitFor({ state: "visible" });
  await dialog.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await contextSummaryPage.waitForFunction(
    () => document.activeElement?.getAttribute("aria-label") === "Toggle summary",
  );

  await trigger.click();
  await dialog.waitFor({ state: "visible" });
  const sectionToggle = contextSummaryPage.getByRole("button", {
    name: "Toggle environment summary",
  });
  await sectionToggle.click();
  const collapsed = await contextSummaryPage.evaluate(() => ({
    expanded: document
      .querySelector(".codex-ui-thread-summary-section")
      ?.getAttribute("data-expanded"),
    rowCount: document.querySelectorAll(".codex-ui-thread-summary-item").length,
  }));
  if (collapsed.expanded !== null || collapsed.rowCount !== 0) {
    throw new Error(
      `Thread summary collapse failed: ${JSON.stringify(collapsed)}`,
    );
  }
  await sectionToggle.click();
  await contextSummaryPage.getByRole("textbox", { name: "Message composer" }).click();
  await dialog.waitFor({ state: "hidden" });
  const settled = await contextSummaryPage.evaluate(() => ({
    activeElement: document.activeElement?.getAttribute("aria-label"),
    expanded: document
      .querySelector(".codex-ui-thread-summary-section")
      ?.getAttribute("data-expanded") ?? null,
    pressed: document
      .querySelector('button[aria-label="Toggle summary"]')
      ?.getAttribute("aria-pressed"),
  }));
  if (
    settled.activeElement !== "Message composer" ||
    settled.expanded !== null ||
    settled.pressed !== "false"
  ) {
    throw new Error(
      `Thread summary outside-close failed: ${JSON.stringify(settled)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "context-summary-interaction.json"),
    `${JSON.stringify({ collapsed, settled }, null, 2)}\n`,
  );
} finally {
  await contextSummaryApp.close();
}

const {
  app: contextSummaryCompactApp,
  page: contextSummaryCompactPage,
} = await launchScene(contextSummaryScene, {
  capture: false,
  windowSize: { height: 680, width: 720 },
});
try {
  const compact = await contextSummaryCompactPage.evaluate(() => {
    const popover = document.querySelector(
      ".codex-ui-thread-summary-popover",
    );
    const value = popover?.getBoundingClientRect();
    return {
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      popover: value
        ? {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            right: value.right,
            top: value.top,
            width: value.width,
          }
        : null,
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });
  if (
    compact.viewport.width !== 720 ||
    compact.viewport.height !== 680 ||
    !compact.popover ||
    Math.abs(compact.popover.width - 300) > 1 ||
    Math.abs(compact.popover.height - 199) > 1 ||
    compact.popover.left < 8 ||
    compact.popover.right > compact.viewport.width - 8 ||
    compact.popover.top < 8 ||
    compact.popover.bottom > compact.viewport.height - 8 ||
    compact.horizontalOverflow > 1
  ) {
    throw new Error(
      `Thread summary compact containment failed: ${JSON.stringify(compact)}`,
    );
  }
} finally {
  await contextSummaryCompactApp.close();
}

await writeFile(
  join(artifactDirectory, "current-replay-composer-icons.json"),
  `${JSON.stringify(currentReplayComposerContracts, null, 2)}\n`,
);

console.log(`CDP contracts passed for ${selectedScenes.length} lifecycle frames.`);
