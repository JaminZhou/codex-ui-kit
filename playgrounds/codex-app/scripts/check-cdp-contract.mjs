import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const artifactDirectory = join(process.cwd(), "artifacts", "cdp");
await mkdir(artifactDirectory, { recursive: true });

for (const scene of visualScenes) {
  const { app, page } = await launchScene(scene);
  try {
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
          ".demo-workspace-start .codex-ui-new-conversation-start__prompt > button",
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
            disabled: button.disabled,
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
          }),
        );
        return {
          activeElement:
            document.activeElement?.getAttribute("aria-label") ?? null,
          composer: rect(composer),
          context: rect(context),
          contextButtons,
          environment: environmentMenu
            ? {
                buttons: environmentButtons,
                rect: rect(environmentMenu),
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
                listbox: rect(projectListbox),
              }
            : null,
          prompt: rect(prompt),
          start: rect(start),
          view: root?.getAttribute("data-view"),
          worktree: worktreeMenu
            ? {
                buttons: worktreeButtons,
                rect: rect(worktreeMenu),
              }
            : null,
        };
      });
      const projectExpected = scene.frame === "workspace-project-menu";
      const environmentExpected =
        scene.frame === "workspace-environment-menu";
      const localEnvironmentExpected =
        scene.frame === "workspace-environment";
      const worktreeExpected = scene.frame === "workspace-worktree-menu";
      const repairingExpected = scene.frame === "workspace-repairing";
      const worktreeTrigger = contract.contextButtons.find(
        ({ kind }) => kind === "worktree",
      );
      if (
        contract.view !== "workspace" ||
        contract.frame !== scene.frame ||
        contract.horizontalOverflow > 1 ||
        !contract.start ||
        !contract.composer ||
        !contract.context ||
        !contract.heading ||
        !contract.prompt ||
        contract.contextButtons.length !== 3 ||
        Math.abs(contract.composer.width - 736) > 1 ||
        Math.abs(contract.composer.height - 98) > 1 ||
        Math.abs(contract.composer.left - 358) > 1 ||
        Math.abs(contract.composer.bottom - 804) > 1 ||
        Math.abs(contract.heading.top - 363) > 1 ||
        Math.abs(contract.heading.height - 33.6) > 1 ||
        Math.abs(contract.prompt.width - 654) > 1 ||
        Math.abs(contract.prompt.height - 40) > 1 ||
        contract.contextButtons.some(
          ({ rect: value }) => !value || Math.abs(value.height - 28) > 1,
        ) ||
        Boolean(contract.project) !== projectExpected ||
        Boolean(contract.environment) !== environmentExpected ||
        Boolean(contract.localEnvironment) !==
          localEnvironmentExpected ||
        Boolean(contract.worktree) !== worktreeExpected ||
        Boolean(worktreeTrigger?.disabled) !== repairingExpected
      ) {
        throw new Error(
          `${scene.id}: workspace entry contract failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        projectExpected &&
        (!contract.project ||
          Math.abs(contract.project.rect.width - 260) > 1 ||
          Math.abs(contract.project.rect.height - 250) > 1 ||
          Math.abs(contract.project.listbox.width - 252) > 1 ||
          contract.project.optionCount !== 5 ||
          contract.project.selectedCount !== 1 ||
          contract.activeElement !== "Search projects" ||
          contract.contextButtons[0]?.expanded !== "true" ||
          contract.contextButtons[0]?.haspopup !== "dialog")
      ) {
        throw new Error(
          `${scene.id}: workspace project dialog failed: ${JSON.stringify(contract)}`,
        );
      }
      if (
        environmentExpected &&
        (!contract.environment ||
          Math.abs(contract.environment.rect.width - 216) > 1 ||
          Math.abs(contract.environment.rect.height - 189) > 1 ||
          contract.environment.buttons.length !== 5 ||
          contract.environment.buttons.filter(({ disabled }) => disabled)
            .length !== 1)
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
        worktreeExpected &&
        (!contract.worktree ||
          Math.abs(contract.worktree.rect.width - 296) > 1 ||
          Math.abs(contract.worktree.rect.height - 280) > 1 ||
          contract.worktree.buttons.length !== 3 ||
          contract.worktree.buttons.filter(
            ({ role }) => role === "menuitemradio",
          ).length !== 2 ||
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
          (button) => ({
            disabled: button.disabled,
            label: button.getAttribute("aria-label"),
            rect: rect(button),
          }),
        );
        if (!root || !shell || !chrome || !main || !outlet) {
          throw new Error("App shell continuity surfaces are missing.");
        }
        const liveState = outlet.querySelector(
          ':scope > [role="status"], :scope > [role="alert"]',
        );
        const notification = document.querySelector(
          ".codex-ui-app-notification",
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
          notification: notification
            ? {
                role: notification.getAttribute("role"),
                text: notification.textContent?.replace(/\s+/g, " ").trim(),
              }
            : null,
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
        contract.controls[1].label !== "Back" ||
        contract.controls[2].label !== "Forward" ||
        Math.abs(contract.controls[0].rect.left - 88) > 1 ||
        Math.abs(contract.controls[1].rect.left - 120) > 1 ||
        Math.abs(contract.controls[2].rect.left - 152) > 1 ||
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
        ((scene.id === "shell-restored") !== Boolean(contract.notification))
      ) {
        throw new Error(
          `${scene.id}: route lifecycle state failed: ${JSON.stringify(contract)}`,
        );
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
        terminalProcesses: ".codex-ui-terminal-process-list",
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
                element
                  .querySelector(".codex-ui-activity__disclosure")
                  ?.hasAttribute("open"),
              )
              .map((element) => element.getAttribute("data-item-id")),
            failedCallAccessibleLabel: mcpGroup
              .querySelector(
                '[data-item-id="mcp-fetch-invalid"] .codex-ui-tool-call__label',
              )
              ?.getAttribute("aria-label"),
            groupExpanded:
              mcpGroup.querySelector(".codex-ui-activity__disclosure")
                ?.open ?? false,
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
          contentLabels: Array.from(
            document.querySelectorAll(
              ".codex-ui-file-review .codex-ui-file-review__content[aria-label]",
            ),
            (element) => element.getAttribute("aria-label"),
          ),
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
          firstContentLabel: document
            .querySelector(
              ".codex-ui-file-review .codex-ui-file-review__content[aria-label]",
            )
            ?.getAttribute("aria-label"),
          noticeKinds: Array.from(
            document.querySelectorAll(
              ".codex-ui-file-review .codex-ui-file-review-notice",
            ),
            (element) => element.getAttribute("data-kind"),
          ),
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
              error: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="error"]',
              ).length,
              queued: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="queued"]',
              ).length,
              running: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="running"]',
              ).length,
              unread: sidebar.querySelectorAll(
                '.codex-ui-app-sidebar__item-status[data-status="unread"]',
              ).length,
            },
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
        const floating = document.querySelector(
          ".codex-ui-thread-floating-button",
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
            buttonCount: navigation.querySelectorAll("button").length,
            label: navigation.getAttribute("aria-label"),
          },
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
          stopCount: composer.querySelectorAll(
            'button[aria-label="Stop"]',
          ).length,
          surface: rect(surface),
          textarea: {
            disabled: textarea.disabled,
            lineCount: textarea.value.split("\n").length,
            rect: rect(textarea),
            value: textarea.value,
          },
          threadFollowing: root.getAttribute("data-thread-following"),
        };
      });
      contract.conversation = conversation;
      const expectsContext = ![
        "composer-running",
        "composer-queued",
        "composer-queue-paused",
      ].includes(scene.id);
      if (
        (expectsContext
          ? conversation.dock.hasContext !== "true" ||
            conversation.context?.role !== "toolbar" ||
            conversation.context.controls.length !== 3 ||
            JSON.stringify(
              conversation.context.controls.map(({ label }) => label),
            ) !== JSON.stringify(["□codex-ui-kit", "◉Local", "⑂main"]) ||
            conversation.context.controls.some(
              ({ height }) => Math.abs(height - 28) > 1,
            )
          : conversation.dock.hasContext !== null ||
            conversation.context !== null) ||
        conversation.navigation.label !== "User messages" ||
        conversation.navigation.buttonCount < 10 ||
        !conversation.dock.rect ||
        conversation.dock.rect.width < 700 ||
        conversation.dock.rect.width > 740
      ) {
        throw new Error(
          `${scene.id}: conversation shell contract failed: ${JSON.stringify(conversation)}`,
        );
      }
      if (
        scene.id === "composer-multiline" &&
        (conversation.phase !== "multiline" ||
          conversation.composer.layout !== "multiline" ||
          conversation.textarea.lineCount !== 3 ||
          conversation.textarea.rect.height < 60)
      ) {
        throw new Error(
          `${scene.id}: multiline Composer contract failed: ${JSON.stringify(conversation)}`,
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
          !conversation.queue.labels.includes("Delete queued prompt") ||
          !conversation.queue.labels.includes("Queued prompt actions") ||
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
          conversation.composer.layout !== "multiline")
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
        (conversation.placeholder.count !== 1 ||
          Number(conversation.placeholder.hiddenEntryCount) <= 0 ||
          conversation.messageCount >=
            conversation.navigation.buttonCount * 2)
      ) {
        throw new Error(
          `${scene.id}: virtualized window contract failed: ${JSON.stringify(conversation)}`,
        );
      }
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
    const expectedViewportHeight = scene.windowSize?.height ?? 820;
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
      contract.sidebar.statusCounts.error !== 1 ||
      contract.sidebar.statusCounts.queued < 1 ||
      contract.sidebar.statusCounts.unread < 2 ||
      contract.sidebar.selectedCount < 1
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar contract failed: ${JSON.stringify(contract.sidebar)}`,
      );
    }
    const expectedSidebarMax =
      scene.id === "terminal-compact"
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
      const compactTerminal = scene.id === "terminal-compact";
      const closedTerminal = scene.id === "terminal-closed";
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
      }[scene.id];
      const expectedTerminalStatuses = {
        "background-terminal": ["running"],
        "terminal-closed": [],
        "terminal-compact": ["running", "failed", "exited"],
        "terminal-failed": ["running", "failed"],
        "terminal-multi-tab": ["running", "failed", "exited"],
        "terminal-picker": ["exited", "failed", "exited"],
        "terminal-running": ["running"],
      }[scene.id];
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
        terminal.sessionCount !== (closedTerminal ? 0 : 1) ||
        terminal.tabCount !== expectedTerminalTabs ||
        terminal.tabCloseCount !== expectedTerminalTabs ||
        JSON.stringify(terminal.tabStatuses) !==
          JSON.stringify(expectedTerminalStatuses) ||
        (closedTerminal
          ? !terminal.emptyText?.includes("Restore last terminal")
          : !terminal.panelContent ||
            Math.abs(terminal.panelContent.height - 239) > 1 ||
            !terminal.selectedTab?.includes("codex-ui-kit") ||
            terminal.inputLabel !== "Terminal input" ||
            terminal.transcriptLive !== "polite" ||
            !terminal.tabPanelLabelledBy ||
            !terminal.entryKinds.includes("command") ||
            !terminal.entryKinds.includes("stdout"))
      ) {
        throw new Error(
          `${scene.id}: Terminal panel contract failed: ${JSON.stringify({
            resizer,
            terminal,
          })}`,
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
      if (scene.id === "terminal-closed") {
        await page
          .getByRole("button", { name: "Restore last terminal" })
          .click();
        await page.waitForSelector('[role="tab"][aria-selected="true"]');
        const restoredTerminal = await page.evaluate(() => ({
          inputLabel: document
            .querySelector(".codex-ui-terminal-prompt__input")
            ?.getAttribute("aria-label"),
          selectedTab: document
            .querySelector('[role="tab"][aria-selected="true"]')
            ?.textContent?.trim(),
          tabCount: document.querySelectorAll('[role="tab"]').length,
        }));
        if (
          restoredTerminal.tabCount !== 1 ||
          !restoredTerminal.selectedTab?.includes("codex-ui-kit") ||
          restoredTerminal.inputLabel !== "Terminal input"
        ) {
          throw new Error(
            `${scene.id}: Terminal restore action failed: ${JSON.stringify(restoredTerminal)}`,
          );
        }
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
        scene.errorOutput !== undefined &&
        (!contract.mcp.errorOutput ||
          contract.mcp.errorOutput.role !== "alert" ||
          !contract.mcp.errorOutput.text?.includes(scene.errorOutput) ||
          contract.mcp.errorOutput.rect.width < 600 ||
          contract.mcp.errorOutput.rect.height < 64 ||
          contract.mcp.callStatuses[0] !== "failed" ||
          contract.mcp.failedCallAccessibleLabel !==
            "Fetch OpenAI doc failed" ||
          !contract.mcp.expandedCallIds.includes("mcp-fetch-invalid"))
      ) {
        throw new Error(
          `${scene.id}: recovered MCP error output contract failed: ${JSON.stringify(contract.mcp)}`,
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

    if (scene.id !== "composer-disabled") {
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
      composerLeft: 56,
      composerWidth: 648,
      height: 680,
      layoutMode: "narrow",
      mainLeft: 0,
      mainWidth: 720,
      rootLeft: 40,
      rootWidth: 680,
      sidebarOpen: false,
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
          ".demo-workspace-start .codex-ui-new-conversation-start__prompt > button",
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
      !near(state.heading.top, expected.height / 2 - 47) ||
      !near(state.heading.height, 33.6) ||
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

const sidebarScene = {
  frame: "streaming",
  id: "sidebar-current",
  scenario: "streaming-recovery",
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
  const taskActions = sidebarPage.getByRole("toolbar", {
    name: /Sidebar task actions for/,
  });
  const firstAction = taskActions.first().getByRole("button");
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
      settingsAction: Boolean(
        document.querySelector(
          '.codex-ui-app-sidebar-footer__actions button[aria-label="Open settings"]',
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
      JSON.stringify(["Streaming and retry"]) ||
    !compact.settingsAction
  ) {
    throw new Error(
      `sidebar-current: compact interaction contract failed: ${JSON.stringify(compact)}`,
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
    `${JSON.stringify(compact, null, 2)}\n`,
  );
} finally {
  await sidebarApp.close();
}

const sidebarNarrowScene = {
  frame: "streaming",
  id: "sidebar-current-narrow",
  scenario: "streaming-recovery",
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
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
      view: document
        .querySelector(".demo-root")
        ?.getAttribute("data-view"),
    };
  });
  if (
    navigated.sidebarOpen ||
    navigated.mainInert ||
    navigated.view !== "pull-request"
  ) {
    throw new Error(
      `sidebar-current-narrow: navigation did not dismiss the overlay: ${JSON.stringify(navigated)}`,
    );
  }

  await sidebarNarrowPage.reload();
  await sidebarNarrowPage.waitForSelector(
    '.demo-root[data-scenario="streaming-recovery"][data-frame="streaming"]',
  );
  await sidebarNarrowPage.mouse.move(1, 200);
  await sidebarNarrowPage.waitForSelector(
    '.codex-ui-app-shell[data-sidebar-preview-open]:not([data-sidebar-open])',
  );
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
      sidebarLeft: sidebar?.getBoundingClientRect().left,
      sidebarOpen: shell?.hasAttribute("data-sidebar-open"),
    };
  });
  if (
    !preview.previewOpen ||
    preview.sidebarOpen ||
    preview.mainInert ||
    Math.abs((preview.mainWidth ?? 0) - 720) > 1 ||
    Math.abs(preview.sidebarLeft ?? -274) > 1 ||
    preview.position !== "absolute" ||
    preview.backdropHidden !== true
  ) {
    throw new Error(
      `sidebar-current-narrow: edge preview failed: ${JSON.stringify(preview)}`,
    );
  }
  await sidebarNarrowPage.mouse.move(500, 200);
  await sidebarNarrowPage.waitForSelector(
    '.codex-ui-app-shell:not([data-sidebar-preview-open])',
  );
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
        sidebarOpen: false,
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
    narrow720.sidebarOpen ||
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
    '.demo-root[data-composer-phase="queue-paused"]',
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
    stoppedState.currentTaskStatus !== "idle" ||
    stoppedState.rootStatus !== "interrupted"
  ) {
    throw new Error(
      `Conversation stop state diverged: ${JSON.stringify(stoppedState)}`,
    );
  }
  await conversationLifecyclePage.getByRole("button", { name: "Resume" }).click();
  await conversationLifecyclePage.waitForSelector(
    '.demo-root[data-composer-phase="queued"][data-status="running"]',
  );
  const queuedPromptActions = conversationLifecyclePage.locator(
    'button[aria-label="Queued prompt actions"]',
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
    .getByRole("button", { name: "Delete queued prompt" })
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
    '.demo-root[data-windowed-timeline="trimmed"]',
  );
  if (
    (await windowedNavigationPage.locator('[data-item-id="user-01"]').count()) !==
    0
  ) {
    throw new Error("Windowed navigation mounted the hidden target too early.");
  }
  await windowedNavigationPage
    .getByRole("button", {
      exact: true,
      name: "Jump to user message 1",
    })
    .click();
  await windowedNavigationPage.waitForSelector(
    '.demo-root[data-windowed-timeline="expanded"][data-thread-following="false"] [data-item-id="user-01"]',
  );
  const materializedNavigation = await windowedNavigationPage.evaluate(() => ({
    hiddenPlaceholderCount: document.querySelectorAll(
      ".codex-ui-thread-virtualized-placeholder",
    ).length,
    targetCount: document.querySelectorAll('[data-item-id="user-01"]').length,
    threadFollowing: document
      .querySelector(".demo-root")
      ?.getAttribute("data-thread-following"),
    windowedTimeline: document
      .querySelector(".demo-root")
      ?.getAttribute("data-windowed-timeline"),
  }));
  if (
    materializedNavigation.hiddenPlaceholderCount !== 0 ||
    materializedNavigation.targetCount !== 1 ||
    materializedNavigation.threadFollowing !== "false" ||
    materializedNavigation.windowedTimeline !== "expanded"
  ) {
    throw new Error(
      `Windowed message navigation failed: ${JSON.stringify(materializedNavigation)}`,
    );
  }
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
    .getByRole("button", { name: "Delete queued prompt" })
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
    .getByRole("button", { name: "Queued prompt actions" })
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
    '.demo-root[data-composer-phase="queue-paused"][data-status="interrupted"]',
  );

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

const attachmentSubmitScene = {
  frame: "composer-attachment",
  id: "attachment-submit-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: attachmentSubmitApp,
  page: attachmentSubmitPage,
} = await launchScene(attachmentSubmitScene, { capture: false });
try {
  const attachmentSubmitComposer = attachmentSubmitPage.getByRole(
    "textbox",
    { name: "Message composer" },
  );
  await attachmentSubmitPage.waitForSelector(
    '.demo-root[data-composer-phase="attachment"] .codex-ui-composer-attachment',
  );
  await attachmentSubmitComposer.fill("Use the attached evidence.");
  await attachmentSubmitComposer.press("Enter");
  await attachmentSubmitPage.waitForSelector(
    '.demo-root[data-composer-phase="running"]',
  );
  if (
    (await attachmentSubmitPage
      .locator(".codex-ui-composer-attachment")
      .count()) !== 0
  ) {
    throw new Error("Successful submission retained the attachment fixture.");
  }
} finally {
  await attachmentSubmitApp.close();
}

const attachmentNavigationScene = {
  frame: "composer-attachment",
  id: "attachment-scenario-navigation-interaction",
  scenario: "conversation-lifecycle",
};
const {
  app: attachmentNavigationApp,
  page: attachmentNavigationPage,
} = await launchScene(attachmentNavigationScene, { capture: false });
try {
  await attachmentNavigationPage.waitForSelector(
    '.demo-root[data-composer-phase="attachment"] .codex-ui-composer-attachment',
  );
  await attachmentNavigationPage
    .locator(".codex-ui-app-sidebar__item", {
      hasText: "Streaming and retry",
    })
    .click();
  await attachmentNavigationPage.waitForSelector(
    '.demo-root[data-scenario="streaming-recovery"]',
  );
  await attachmentNavigationPage
    .locator(".codex-ui-app-sidebar__item", {
      hasText: "Conversation and Composer lifecycle",
    })
    .click();
  await attachmentNavigationPage.waitForSelector(
    '.demo-root[data-scenario="conversation-lifecycle"][data-composer-phase="idle"]',
  );
  if (
    (await attachmentNavigationPage
      .locator(".codex-ui-composer-attachment")
      .count()) !== 0
  ) {
    throw new Error("Scenario navigation retained the attachment fixture.");
  }
} finally {
  await attachmentNavigationApp.close();
}

console.log(`CDP contracts passed for ${visualScenes.length} lifecycle frames.`);
