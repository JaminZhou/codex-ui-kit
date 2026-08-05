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
      const failedMcpCall = document.querySelector(
        '[data-item-id="mcp-fetch-invalid"]',
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
                ?.hasAttribute("open") ?? false,
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
    if (scene.scenario === "approval-denied") {
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
                    text: button.textContent?.replace(/\s+/g, " ").trim(),
                  }),
                ),
                decision: approval.getAttribute("data-decision"),
                presentation: approval.getAttribute("data-presentation"),
                rect: rect(approval),
              }
            : null,
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
        };
      });
      if (scene.id === "approval-current-denied") {
        await page
          .getByRole("button", { exact: true, name: "Worked for 23s" })
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
      if (
        scene.id === "approval-current-pending" &&
        (!approvalContract.approval ||
          approvalContract.approval.decision !== "pending" ||
          approvalContract.approval.presentation !== "composer" ||
          Math.abs(approvalContract.approval.rect.left - 359) > 1 ||
          Math.abs(approvalContract.approval.rect.top - 642) > 1 ||
          Math.abs(approvalContract.approval.rect.width - 736) > 1 ||
          Math.abs(approvalContract.approval.rect.height - 162) > 1 ||
          approvalContract.activitySummary !== "Working for 14s" ||
          approvalContract.commandSummary !==
            "Running open -a Calculator" ||
          approvalContract.composer !== null ||
          !approvalContract.approval.actionLabels.some(
            ({ text }) => text === "Deny",
          ) ||
          !approvalContract.approval.actionLabels.some(
            ({ text }) => text === "Allow once",
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
        scene.id === "approval-current-denied" &&
        (approvalContract.approval !== null ||
          approvalContract.activitySummary !== "Worked for 23s" ||
          approvalContract.commandSummary !==
            "Did not run open -a Calculator" ||
          approvalContract.assistantText !==
            "Approval was not granted, so the command was not run." ||
          !approvalContract.composer ||
          Math.abs(approvalContract.composer.left - 359) > 1 ||
          Math.abs(approvalContract.composer.top - 706) > 1 ||
          Math.abs(approvalContract.composer.width - 736) > 1 ||
          Math.abs(approvalContract.composer.height - 98) > 1 ||
          approvalContract.permissionLabel !== "Ask for approval")
      ) {
        throw new Error(
          `${scene.id}: current denied approval contract failed: ${JSON.stringify(approvalContract)}`,
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
        ((scene.id === "mcp-tool-calls" ||
          scene.id === "mcp-recovery-completed") &&
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
      const stopping = scene.id === "command-interruption-stopping";
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
      const expectedCommandStatus = running
        ? "running"
        : stopping
          ? "interrupted"
          : "background-finished";
      const expectedSummaryPrefix = running
        ? "Running seq 1 120"
        : stopping
          ? "Background terminal stopped with seq 1 120"
          : "Ran seq 1 120";
      if (
        !commandOutput ||
        contract.rootStatus !== expectedRootStatus ||
        commandOutput.status !== expectedCommandStatus ||
        !commandOutput.summary?.startsWith(expectedSummaryPrefix) ||
        commandOutput.executionExpanded !== running ||
        commandOutput.timelineExpanded !== running ||
        commandOutput.timelineLabel !== (running ? "Working for 1m 35s" : null) ||
        Math.abs((commandOutput.header?.rect.width ?? 0) - 736) > 1 ||
        Math.abs((commandOutput.header?.rect.height ?? 0) - 21) > 1 ||
        commandOutput.header?.style.fontSize !== "14px" ||
        commandOutput.header?.style.fontWeight !== "445" ||
        commandOutput.header?.style.lineHeight !== "21px" ||
        interruptionState.composerPhase !== (running ? "running" : "idle") ||
        interruptionState.stopCount !== (running ? 1 : 0) ||
        interruptionState.sendCount !== (running ? 0 : 1) ||
        (running
          ? !commandOutput.compactDetail ||
            commandOutput.compactDetail.text !==
              "Running command for 1m 28s" ||
            commandOutput.compactDetail.style.fontSize !== "14px" ||
            commandOutput.compactDetail.style.fontWeight !== "445" ||
            commandOutput.compactDetail.style.lineHeight !== "21px" ||
            contract.interruption !== null
          : commandOutput.compactDetail !== null ||
            !contract.interruption ||
            contract.interruption.status !== "stopped" ||
            contract.interruption.label?.text !== "You stopped after 1m 35s" ||
            contract.interruption.label?.style.fontSize !== "14px" ||
            contract.interruption.label?.style.fontWeight !== "445" ||
            contract.interruption.label?.style.lineHeight !== "21px" ||
            Math.abs((contract.interruption.rect.width ?? 0) - 736) > 1 ||
            Math.abs((contract.interruption.label?.rect.height ?? 0) - 21) > 1 ||
            contract.interruption.rule?.style.height !== "1px" ||
            contract.interruption.rule?.style.marginTop !== "8px") ||
        (recovered
          ? interruptionState.assistantText !==
            "INTERRUPTION RECOVERY ACCEPTED"
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

    if (
      scene.id !== "composer-disabled" &&
      scene.id !== "approval-current-pending"
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
  }));
  if (
    !stopping.commandSummary?.startsWith(
      "Background terminal stopped with seq 1 120",
    ) ||
    stopping.interruption !== "You stopped after 1m 35s" ||
    stopping.stopCount !== 0
  ) {
    throw new Error(
      `Current command Stop transition failed: ${JSON.stringify(stopping)}`,
    );
  }

  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-settled"][data-status="interrupted"] [data-item-id="command-interruption"][data-execution-status="background-finished"]',
  );
  const composer = commandInterruptionPage.getByRole("textbox", {
    name: "Message composer",
  });
  const recoveryPrompt =
    "Do not use tools. Reply with exactly: INTERRUPTION RECOVERY ACCEPTED";
  await composer.fill(recoveryPrompt);
  await composer.press("Enter");
  await commandInterruptionPage.waitForSelector(
    '.demo-root[data-frame="command-interruption-recovered"][data-status="completed"][data-composer-phase="idle"]',
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
    recovered.assistantText !== "INTERRUPTION RECOVERY ACCEPTED" ||
    recovered.commandStatus !== "background-finished" ||
    recovered.interruption !== "You stopped after 1m 35s" ||
    recovered.stopCount !== 0
  ) {
    throw new Error(
      `Current command same-thread recovery failed: ${JSON.stringify(recovered)}`,
    );
  }
  await writeFile(
    join(artifactDirectory, "command-interruption-interaction.json"),
    `${JSON.stringify({ recovered, stopping }, null, 2)}\n`,
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
  await writeFile(
    join(artifactDirectory, "context-compaction-interaction.json"),
    `${JSON.stringify({ recovered, running }, null, 2)}\n`,
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
      JSON.stringify(["codex-ui-kit"]) ||
    !compact.settingsAction
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
    '.demo-root[data-scenario="streaming-recovery"][data-frame="streaming"]',
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
