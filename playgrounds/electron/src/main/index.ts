import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  screen,
  type WebContents,
} from "electron";
import {
  isThemeSource,
  isWindowPreset,
  windowPresets,
  type AppliedWindowSize,
  type DesktopEnvironment,
  type ThemeState,
  type WindowPreset,
} from "../shared/contract";
import { assertAcceptanceMetric } from "../shared/acceptance";

const appName = "Codex UI Kit Playground";
const defaultPreset: WindowPreset = "standard";
const minimumSize = { height: 620, width: 720 };

let mainWindow: BrowserWindow | null = null;

async function captureInteractivePrimitives(webContents: WebContents) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    const existingDialogChoice = document.querySelector('.codex-ui-dialog-choice');
    if (existingDialogChoice instanceof HTMLElement) existingDialogChoice.click();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await wait(80);
    const card = document.querySelector('[data-acceptance-surface="interactive-primitives"]');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop +=
        cardBounds.top -
        regionBounds.top -
        Math.max(0, (scrollRegion.clientHeight - cardBounds.height) / 2);
    }
    await wait(180);
    const moreActions = card?.querySelector('[aria-label="More actions"]');
    if (moreActions?.getAttribute('aria-expanded') === 'true') {
      moreActions?.click();
      await wait(80);
    }
    moreActions?.click();
    await wait(140);
    const rootMenu = [...document.querySelectorAll('.codex-ui-popover[role="menu"]')]
      .find((element) => element.querySelector('.codex-ui-menu-submenu-trigger'));
    const submenuTrigger = rootMenu?.querySelector('.codex-ui-menu-submenu-trigger');
    if (submenuTrigger?.getAttribute('aria-expanded') === 'true') {
      submenuTrigger?.click();
      await wait(80);
    }
    submenuTrigger?.click();
    await wait(160);
    const overlays = [...document.querySelectorAll('.codex-ui-popover')].map((element) => {
      const bounds = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        borderRadius: styles.borderRadius,
        bounds: rect(element),
        inViewport:
          bounds.left >= 0 &&
          bounds.top >= 0 &&
          bounds.right <= window.innerWidth &&
          bounds.bottom <= window.innerHeight,
        owner: element.getAttribute('data-codex-ui-overlay-owner'),
        padding: styles.padding,
        role: element.getAttribute('role'),
        visible: styles.visibility,
      };
    });
    const toolbarButton = card?.querySelector('.codex-ui-icon-button');
    const mediumButton = card?.querySelector('.codex-ui-button[data-size="medium"]');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    card?.querySelector('[data-choice-dialog-trigger]')?.click();
    await wait(160);
    const dialog = document.querySelector('.codex-ui-dialog');
    const dialogSurface = dialog?.querySelector('.codex-ui-dialog__surface');
    const dialogChoices = [...(dialog?.querySelectorAll('.codex-ui-dialog-choice') ?? [])];
    const metrics = {
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      card: rect(card),
      dialog: rect(dialog),
      dialogChoiceRows: dialogChoices.map(rect),
      dialogFirstChoiceFocused: document.activeElement === dialogChoices[0],
      dialogSurface: rect(dialogSurface),
      dialogSurfaceRadius: dialogSurface ? getComputedStyle(dialogSurface).borderRadius : null,
      mediumButton: rect(mediumButton),
      overlayOwnerCount: new Set(overlays.map((overlay) => overlay.owner)).size,
      overlays,
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      toolbarButton: rect(toolbarButton),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
    return metrics;
  })()`);
}

async function closeChoiceDialog(webContents: WebContents) {
  await webContents.executeJavaScript(`(async () => {
    const choice = document.querySelector('.codex-ui-dialog-choice');
    if (choice instanceof HTMLElement) choice.click();
    await new Promise((resolve) => setTimeout(resolve, 80));
  })()`);
}

async function captureWorkflowSurfaces(webContents: WebContents) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const inViewport = (element) => {
      if (!element) return false;
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left >= 0 &&
        bounds.top >= 0 &&
        bounds.right <= window.innerWidth &&
        bounds.bottom <= window.innerHeight
      );
    };
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    const card = document.querySelector('[data-acceptance-surface="workflow-surfaces"]');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 12;
    }
    await wait(180);

    const routingPrompt = card?.querySelector(
      '.codex-ui-new-conversation-start__prompt > button',
    );
    const routingPromptInitiallyVisible =
      routingPrompt instanceof HTMLButtonElement;
    routingPrompt?.click();
    await wait(100);
    const routingPromptTransitioned =
      !card?.querySelector(
        '.codex-ui-new-conversation-start__prompt',
      ) &&
      card?.querySelectorAll(
        '.codex-ui-conversation-context-bar__item',
      ).length === 3;
    const routingProject = card?.querySelector(
      '.codex-ui-project-index__item[aria-label="Open project Desktop"]',
    );
    routingProject?.click();
    await wait(80);
    const routingWorktreeContext = card?.querySelector(
      '[data-desktop-local-environment-context="true"] [data-kind="worktree"]',
    );
    routingWorktreeContext?.click();
    await wait(140);
    const worktreeEnvironmentDialog = document.querySelector(
      '#desktop-local-environment-dialog',
    );
    const expandedRoutingWorktree = card?.querySelector(
      '[data-desktop-local-environment-context="true"] [data-kind="worktree"]',
    );
    const worktreeEnvironmentMetrics = {
      role: worktreeEnvironmentDialog?.getAttribute('role') ?? null,
      triggerControls:
        expandedRoutingWorktree?.getAttribute('aria-controls') ?? null,
      triggerExpanded:
        expandedRoutingWorktree?.getAttribute('aria-expanded') ?? null,
    };
    worktreeEnvironmentDialog
      ?.querySelector('.codex-ui-dialog__close')
      ?.click();
    await wait(100);
    const routingEnvironment = card?.querySelector(
      '[data-desktop-local-environment-context="true"] [data-kind="environment"]',
    );
    routingEnvironment?.click();
    await wait(140);
    const localEnvironmentDialog = document.querySelector(
      '#desktop-local-environment-dialog',
    );
    const expandedRoutingEnvironment = card?.querySelector(
      '[data-desktop-local-environment-context="true"] [data-kind="environment"]',
    );
    const localEnvironmentSearch = localEnvironmentDialog?.querySelector(
      '.codex-ui-local-environment-dialog__search',
    );
    const localEnvironmentMetrics = {
      bounds: rect(localEnvironmentDialog),
      filteredGroupCount: null,
      filteredItemCount: null,
      groupCount:
        localEnvironmentDialog?.querySelectorAll(
          '.codex-ui-local-environment-dialog__group',
        ).length ?? 0,
      inViewport: inViewport(localEnvironmentDialog),
      itemCount:
        localEnvironmentDialog?.querySelectorAll(
          '.codex-ui-local-environment-dialog__item',
        ).length ?? 0,
      repairingDisabledCount:
        localEnvironmentDialog?.querySelectorAll(
          '.codex-ui-local-environment-dialog__item[data-status="repairing"]:disabled',
        ).length ?? 0,
      role: localEnvironmentDialog?.getAttribute('role') ?? null,
      searchFocused: document.activeElement === localEnvironmentSearch,
      triggerControls:
        expandedRoutingEnvironment?.getAttribute('aria-controls') ?? null,
      triggerExpanded:
        expandedRoutingEnvironment?.getAttribute('aria-expanded') ?? null,
    };
    if (localEnvironmentSearch instanceof HTMLInputElement) {
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      setInputValue?.call(localEnvironmentSearch, 'desktop');
      localEnvironmentSearch.dispatchEvent(
        new Event('input', { bubbles: true }),
      );
      await wait(100);
      const filteredDialog = document.querySelector(
        '#desktop-local-environment-dialog',
      );
      localEnvironmentMetrics.filteredGroupCount =
        filteredDialog?.querySelectorAll(
          '.codex-ui-local-environment-dialog__group',
        ).length ?? 0;
      localEnvironmentMetrics.filteredItemCount =
        filteredDialog?.querySelectorAll(
          '.codex-ui-local-environment-dialog__item',
        ).length ?? 0;
      const filteredSearch = filteredDialog?.querySelector(
        '.codex-ui-local-environment-dialog__search',
      );
      if (filteredSearch instanceof HTMLInputElement) {
        setInputValue?.call(filteredSearch, '');
        filteredSearch.dispatchEvent(
          new Event('input', { bubbles: true }),
        );
        await wait(100);
      }
    }
    const restoredLocalEnvironmentDialog = document.querySelector(
      '#desktop-local-environment-dialog',
    );
    const desktopMainEnvironment =
      restoredLocalEnvironmentDialog?.querySelector(
        '[aria-label="Use local environment Desktop main"]',
      );
    desktopMainEnvironment?.click();
    await wait(100);
    const routingComposerInput = card?.querySelector(
      '.codex-ui-new-conversation-start .codex-ui-composer__input',
    );
    if (routingComposerInput instanceof HTMLTextAreaElement) {
      const setTextareaValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      setTextareaValue?.call(
        routingComposerInput,
        'Acceptance new chat prompt',
      );
      routingComposerInput.dispatchEvent(
        new Event('input', { bubbles: true }),
      );
    }
    await wait(100);
    const routingComposerSubmit = card?.querySelector(
      '.codex-ui-new-conversation-start button[aria-label="Send message"]',
    );
    const routingComposerSubmitEnabled =
      routingComposerSubmit instanceof HTMLButtonElement &&
      !routingComposerSubmit.disabled;
    const submittedRoutingInput = card?.querySelector(
      '.codex-ui-new-conversation-start .codex-ui-composer__input',
    );
    const routingComposerPrompt =
      submittedRoutingInput instanceof HTMLTextAreaElement
        ? submittedRoutingInput.value
        : null;
    routingComposerSubmit?.click();
    await wait(120);

    const selectorOverlays = [];
    for (const selector of [
      { label: 'Project', role: 'listbox' },
      { label: 'Run location', role: 'menu' },
      { label: 'Worktree', role: 'listbox' },
    ]) {
      const trigger = [...(card?.querySelectorAll('button') ?? [])]
        .find((button) => button.getAttribute('aria-label') === selector.label);
      trigger?.click();
      await wait(140);
      const overlay = [...document.querySelectorAll('.codex-ui-popover')]
        .find((element) => element.getAttribute('role') === selector.role);
      selectorOverlays.push({
        bounds: rect(overlay),
        disabledCount: overlay?.querySelectorAll('button:disabled').length ?? 0,
        inViewport: inViewport(overlay),
        label: selector.label,
        optionCount:
          overlay?.querySelectorAll('[role="option"], [role="menuitemradio"]').length ?? 0,
        owner: overlay?.getAttribute('data-codex-ui-overlay-owner') ?? null,
      });
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await wait(80);
    }

    const pullRequest50 = [...(card?.querySelectorAll('.codex-ui-pull-request-list__item') ?? [])]
      .find((button) => button.getAttribute('aria-label')?.startsWith('Open pull request 50:'));
    pullRequest50?.click();
    await wait(120);

    const workspace = card?.querySelector('.codex-ui-workspace-selection');
    const routingPage = card?.querySelector('.codex-ui-project-conversation-page');
    const routingBody = routingPage?.querySelector(
      '.codex-ui-project-conversation-page__body',
    );
    const routingProjects = routingPage?.querySelector(
      '.codex-ui-project-conversation-page__projects',
    );
    const routingSetup = routingPage?.querySelector(
      '.codex-ui-project-conversation-page__setup',
    );
    const routingPageBounds = routingPage?.getBoundingClientRect();
    const routingBodyBounds = routingBody?.getBoundingClientRect();
    const routingProjectsBounds = routingProjects?.getBoundingClientRect();
    const routingSetupBounds = routingSetup?.getBoundingClientRect();
    const eventList = card?.querySelector('.codex-ui-conversation-event-list');
    const eventRows = [...(eventList?.querySelectorAll('.codex-ui-conversation-event') ?? [])];
    const runningEvent = eventList?.querySelector('[data-status="running"] [role="status"]');
    const pullRequestPage = card?.querySelector('.codex-ui-pull-request-page');
    const pullRequestBody = pullRequestPage?.querySelector('.codex-ui-pull-request-page__body');
    const pullRequestList = pullRequestPage?.querySelector('.codex-ui-pull-request-page__list');
    const pullRequestDetail = pullRequestPage?.querySelector('.codex-ui-pull-request-page__detail');
    const pullRequestPageBounds = pullRequestPage?.getBoundingClientRect();
    const pullRequestBodyBounds = pullRequestBody?.getBoundingClientRect();
    const pullRequestListBounds = pullRequestList?.getBoundingClientRect();
    const pullRequestDetailBounds = pullRequestDetail?.getBoundingClientRect();
    const selectedPullRequest = pullRequestPage?.querySelector('[aria-current="page"]');
    const reviewThread = pullRequestPage?.querySelector('.codex-ui-pull-request-review-thread');
    const metrics = {
      bodyScrollWidth: document.body.scrollWidth,
      card: rect(card),
      checkRows: [...(pullRequestPage?.querySelectorAll('.codex-ui-pull-request-checks li') ?? [])].map(rect),
      clientWidth: document.documentElement.clientWidth,
      eventList: rect(eventList),
      eventRows: eventRows.map((row) => ({
        bounds: rect(row),
        kind: row.getAttribute('data-kind'),
        ownership: row.getAttribute('data-ownership'),
        status: row.getAttribute('data-status'),
      })),
      pullRequestBody: rect(pullRequestBody),
      pullRequestBodyWithinPage:
        Boolean(pullRequestPageBounds && pullRequestBodyBounds) &&
        pullRequestBodyBounds.bottom <= pullRequestPageBounds.bottom + 1,
      pullRequestChildrenWithinBody:
        Boolean(
          pullRequestBodyBounds &&
          pullRequestListBounds &&
          pullRequestDetailBounds,
        ) &&
        pullRequestListBounds.bottom <= pullRequestBodyBounds.bottom + 1 &&
        pullRequestDetailBounds.bottom <= pullRequestBodyBounds.bottom + 1,
      pullRequestDetail: rect(pullRequestDetail),
      pullRequestDetailOverflowY: pullRequestDetail
        ? getComputedStyle(pullRequestDetail).overflowY
        : null,
      pullRequestLayout:
        pullRequestListBounds && pullRequestDetailBounds &&
        Math.abs(pullRequestListBounds.top - pullRequestDetailBounds.top) <= 2
          ? 'split'
          : 'stacked',
      pullRequestList: rect(pullRequestList),
      pullRequestPage: rect(pullRequestPage),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      reviewRows: [...(pullRequestPage?.querySelectorAll('.codex-ui-pull-request-reviews li') ?? [])].map(rect),
      reviewThread: rect(reviewThread),
      routingBody: rect(routingBody),
      routingComposerPrompt,
      routingComposerSubmitEnabled,
      routingBodyWithinPage:
        Boolean(routingPageBounds && routingBodyBounds) &&
        routingBodyBounds.bottom <= routingPageBounds.bottom + 1,
      routingChildrenWithinBody:
        Boolean(routingBodyBounds && routingProjectsBounds && routingSetupBounds) &&
        routingProjectsBounds.bottom <= routingBodyBounds.bottom + 1 &&
        routingSetupBounds.bottom <= routingBodyBounds.bottom + 1,
      routingLayout:
        routingProjectsBounds && routingSetupBounds &&
        Math.abs(routingProjectsBounds.top - routingSetupBounds.top) <= 2
          ? 'split'
          : 'stacked',
      routingPage: rect(routingPage),
      routingProjectItems: [
        ...(routingPage?.querySelectorAll('.codex-ui-project-index__item') ?? []),
      ].map(rect),
      routingProjects: rect(routingProjects),
      routingProjectsOverflowY: routingProjects
        ? getComputedStyle(routingProjects).overflowY
        : null,
      routingContextItems: [
        ...(routingPage?.querySelectorAll(
          '.codex-ui-conversation-context-bar__item',
        ) ?? []),
      ].map((item) => ({
        bounds: rect(item),
        controls: item.getAttribute('aria-controls'),
        disabled: item.hasAttribute('disabled'),
        kind: item.getAttribute('data-kind'),
        label: item.getAttribute('aria-label'),
      })),
      routingDestination:
        routingPage?.querySelector(
          '.codex-ui-new-conversation-start__header h3',
        )?.textContent ?? null,
      routingEnvironment:
        routingPage
          ?.querySelector(
            '.codex-ui-conversation-context-bar__item[data-kind="environment"]',
          )
          ?.getAttribute('aria-label') ?? null,
      routingNewConversation: rect(
        routingPage?.querySelector('.codex-ui-new-conversation-start'),
      ),
      routingPromptInitiallyVisible,
      routingPromptTransitioned,
      routingSetup: rect(routingSetup),
      routingSetupOverflowY: routingSetup
        ? getComputedStyle(routingSetup).overflowY
        : null,
      routingState:
        card?.querySelector('[data-workflow-state="routing"]')?.textContent ?? null,
      selectedRoutingProject:
        routingPage
          ?.querySelector('.codex-ui-project-index__item[aria-current="page"]')
          ?.getAttribute('aria-label') ?? null,
      selectedRoutingWorktree:
        routingPage
          ?.querySelector(
            '.codex-ui-conversation-context-bar__item[data-kind="worktree"]',
          )
          ?.getAttribute('aria-label') ?? null,
      localEnvironmentDialog: localEnvironmentMetrics.bounds,
      localEnvironmentFilteredGroupCount:
        localEnvironmentMetrics.filteredGroupCount,
      localEnvironmentFilteredItemCount:
        localEnvironmentMetrics.filteredItemCount,
      localEnvironmentGroupCount: localEnvironmentMetrics.groupCount,
      localEnvironmentInViewport: localEnvironmentMetrics.inViewport,
      localEnvironmentItemCount: localEnvironmentMetrics.itemCount,
      localEnvironmentRepairingDisabledCount:
        localEnvironmentMetrics.repairingDisabledCount,
      localEnvironmentRole: localEnvironmentMetrics.role,
      localEnvironmentSearchFocused: localEnvironmentMetrics.searchFocused,
      localEnvironmentTriggerControls:
        localEnvironmentMetrics.triggerControls,
      localEnvironmentTriggerExpanded:
        localEnvironmentMetrics.triggerExpanded,
      worktreeEnvironmentRole:
        worktreeEnvironmentMetrics.role,
      worktreeEnvironmentTriggerControls:
        worktreeEnvironmentMetrics.triggerControls,
      worktreeEnvironmentTriggerExpanded:
        worktreeEnvironmentMetrics.triggerExpanded,
      runningEventBusy: runningEvent?.getAttribute('aria-busy') ?? null,
      selectedPullRequest: selectedPullRequest?.getAttribute('aria-label') ?? null,
      selectionText: card?.querySelector('[data-workflow-state="selection"]')?.textContent ?? null,
      selectorOverlays,
      threadEventCount: eventRows.filter((row) => row.getAttribute('data-ownership') === 'thread').length,
      viewport: { height: window.innerHeight, width: window.innerWidth },
      workspace: rect(workspace),
      workspaceFields: [...(workspace?.querySelectorAll('.codex-ui-workspace-selection__fields > *') ?? [])].map(rect),
    };

    if (pullRequestPage && scrollRegion instanceof HTMLElement) {
      const regionBounds = scrollRegion.getBoundingClientRect();
      const pageBounds = pullRequestPage.getBoundingClientRect();
      scrollRegion.scrollTop += pageBounds.top - regionBounds.top - 12;
      await wait(140);
    }
    return metrics;
  })()`);
}

async function focusProjectRoutingSurface(webContents: WebContents) {
  await webContents.executeJavaScript(`(() => {
    const card = document.querySelector(
      '[data-acceptance-surface="workflow-surfaces"]',
    );
    const page = card?.querySelector(
      '.codex-ui-project-conversation-page',
    );
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (!page || !(scrollRegion instanceof HTMLElement)) return false;
    scrollRegion.style.scrollBehavior = 'auto';
    const regionBounds = scrollRegion.getBoundingClientRect();
    const pageBounds = page.getBoundingClientRect();
    scrollRegion.scrollTop += pageBounds.top - regionBounds.top - 12;
    return true;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function openLocalEnvironmentSurface(webContents: WebContents) {
  await webContents.executeJavaScript(`(() => {
    const card = document.querySelector(
      '[data-acceptance-surface="workflow-surfaces"]',
    );
    card
      ?.querySelector(
        '[data-desktop-local-environment-context="true"] [data-kind="environment"]',
      )
      ?.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function closeLocalEnvironmentSurface(webContents: WebContents) {
  await webContents.executeJavaScript(`(() => {
    const surface = document.querySelector(
      '#desktop-local-environment-dialog',
    );
    const backdrop = surface?.closest('.codex-ui-dialog');
    backdrop?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function captureResourceSurfaces(
  webContents: WebContents,
  openPreview = false,
) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const openDialog = document.querySelector('.codex-ui-dialog');
    if (openDialog instanceof HTMLElement) {
      openDialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    }
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    await wait(80);
    const card = document.querySelector('[data-acceptance-surface="resource-surfaces"]');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 16;
    }
    await wait(180);
    if (${openPreview ? "true" : "false"}) {
      card
        ?.querySelector('.resource-state-matrix__wide .codex-ui-generated-image-gallery__image')
        ?.click();
      await wait(180);
    }
    const gallery = card?.querySelector('.resource-state-matrix__wide .codex-ui-generated-image-gallery');
    const galleryImage = gallery?.querySelector('.codex-ui-generated-image-gallery__image');
    const sourceList = card?.querySelector('.codex-ui-source-list');
    const preview = document.querySelector('.codex-ui-image-preview');
    const previewDialog = preview?.querySelector('.codex-ui-image-preview__dialog');
    const previewImage = preview?.querySelector('.codex-ui-image-preview__stage > img');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      focusedLabel: document.activeElement?.getAttribute('aria-label'),
      gallery: rect(gallery),
      galleryImage: rect(galleryImage),
      galleryImageRadius: galleryImage ? getComputedStyle(galleryImage).borderRadius : null,
      pendingCount: card?.querySelectorAll('.codex-ui-generated-image-gallery__placeholder').length ?? 0,
      preview: rect(preview),
      previewDialog: rect(previewDialog),
      previewImage: rect(previewImage),
      resourceRows: [...(card?.querySelectorAll('.codex-ui-resource-card') ?? [])].map(rect),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      sourceList: rect(sourceList),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
}

async function captureNavigationSurfaces(webContents: WebContents) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    const card = document.querySelector('.acceptance-card--navigation');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 12;
    }
    await wait(180);
    const messageRailButton = card?.querySelector('.codex-ui-message-navigation-rail__button');
    if (messageRailButton instanceof HTMLElement) {
      messageRailButton.focus();
      messageRailButton.dispatchEvent(new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
      }));
    }
    await wait(120);
    const header = card?.querySelector('.codex-ui-thread-header');
    const context = card?.querySelector('.codex-ui-thread-header__context');
    const panel = card?.querySelector('.desktop-navigation-surface__panel');
    const navigation = card?.querySelector('.codex-ui-thread-navigation');
    const floatingButtons = [...(card?.querySelectorAll('.desktop-navigation-surface__floating-button') ?? [])];
    const navigationButtons = [...(navigation?.querySelectorAll('button') ?? [])];
    const messageRail = card?.querySelector('.codex-ui-message-navigation-rail');
    const messageRailRows = [...(messageRail?.querySelectorAll('.codex-ui-message-navigation-rail__row') ?? [])];
    const messageRailMarkers = [...(messageRail?.querySelectorAll('.codex-ui-message-navigation-rail__marker') ?? [])];
    const messageRailTooltip = messageRail?.querySelector('.codex-ui-message-navigation-rail__tooltip');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      contextGap: context ? getComputedStyle(context).gap : null,
      floatingButtons: floatingButtons.map((button) => ({
        bounds: rect(button),
        opacity: getComputedStyle(button).opacity,
        pointerEvents: getComputedStyle(button).pointerEvents,
        tabIndex: button.tabIndex,
        working: button.hasAttribute('data-working'),
      })),
      header: rect(header),
      headerPosition: header ? getComputedStyle(header).position : null,
      focusedLabel: document.activeElement?.getAttribute('aria-label'),
      messageRail: rect(messageRail),
      messageRailCurrent: messageRail?.querySelector('[aria-current="true"]')?.getAttribute('aria-label'),
      messageRailMarkers: messageRailMarkers.map((marker) => ({
        bounds: rect(marker),
        opacity: getComputedStyle(marker).opacity,
      })),
      messageRailRows: messageRailRows.map(rect),
      messageRailTooltip: rect(messageRailTooltip),
      messageRailTooltipText: messageRailTooltip?.textContent ?? null,
      navigationButtons: navigationButtons.map((button) => ({
        bounds: rect(button),
        disabled: button.disabled,
        label: button.getAttribute('aria-label'),
      })),
      navigationGap: navigation ? getComputedStyle(navigation).gap : null,
      panel: rect(panel),
      panelOpen: panel?.hasAttribute('data-open') ?? false,
      panelZIndex: panel ? getComputedStyle(panel).zIndex : null,
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      titleOverflow: (() => {
        const title = card?.querySelector('.codex-ui-thread-header__title');
        return title ? title.scrollWidth > title.clientWidth : null;
      })(),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
}

async function captureThreadSurfaces(
  webContents: WebContents,
  position: "bottom" | "top" = "bottom",
) {
  return webContents.executeJavaScript(`(async () => {
    const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const dock = document.querySelector('.desktop-composer-dock');
    if (dock instanceof HTMLElement) dock.style.display = 'none';
    const card = document.querySelector('.acceptance-card--thread');
    const scrollRegion = document.querySelector('.desktop-scroll-region');
    if (card && scrollRegion instanceof HTMLElement) {
      scrollRegion.style.scrollBehavior = 'auto';
      const regionBounds = scrollRegion.getBoundingClientRect();
      const cardBounds = card.getBoundingClientRect();
      scrollRegion.scrollTop += cardBounds.top - regionBounds.top - 12;
    }
    await wait(120);
    const viewport = card?.querySelector('.codex-ui-thread-viewport');
    if (viewport instanceof HTMLElement) {
      viewport.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      viewport.style.scrollBehavior = 'auto';
      viewport.scrollTo({
        behavior: 'instant',
        top: ${position === "top" ? "0" : "viewport.scrollHeight"},
      });
    }
    await wait(120);
    const thread = card?.querySelector('.codex-ui-thread');
    const bubble = card?.querySelector('[data-user-message-bubble]');
    const groupedTurn = card?.querySelector('.codex-ui-agent-turn[data-spacing="grouped"]');
    const runningMessage = card?.querySelector('.codex-ui-agent-message[data-status="running"]');
    const loadingStates = [...(card?.querySelectorAll('.codex-ui-thread-loading') ?? [])];
    const contextOptimizationStates = [...(card?.querySelectorAll('.codex-ui-thread-context-optimization') ?? [])];
    const spinner = card?.querySelector('.codex-ui-thread-loading__spinner');
    const shimmer = card?.querySelector('.codex-ui-loading-shimmer');
    const skeleton = card?.querySelector('.codex-ui-thread-skeleton');
    const renderError = card?.querySelector('.codex-ui-thread-render-error');
    const placeholder = card?.querySelector('.codex-ui-thread-virtualized-placeholder');
    const footer = card?.querySelector('.codex-ui-thread-viewport__footer');
    const viewportScrollMaximum = viewport instanceof HTMLElement
      ? Math.max(0, viewport.scrollHeight - viewport.clientHeight)
      : null;
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bubble: rect(bubble),
      bubbleMaxWidth: bubble ? getComputedStyle(bubble).maxWidth : null,
      bubblePadding: bubble ? getComputedStyle(bubble).padding : null,
      bubbleRadius: bubble ? getComputedStyle(bubble).borderRadius : null,
      bubbleTabIndex: bubble?.tabIndex ?? null,
      card: rect(card),
      clientWidth: document.documentElement.clientWidth,
      contextOptimizationStates: contextOptimizationStates.map((state) => ({
        bounds: rect(state),
        fontSize: getComputedStyle(state).fontSize,
        gap: getComputedStyle(state).gap,
        mode: state.getAttribute('data-mode'),
        status: state.getAttribute('data-status'),
        text: state.textContent,
      })),
      footer: rect(footer),
      footerPosition: footer ? getComputedStyle(footer).position : null,
      groupedTurnGap: groupedTurn ? getComputedStyle(groupedTurn).gap : null,
      loadingStates: loadingStates.map((state) => ({
        bounds: rect(state),
        fontSize: getComputedStyle(state).fontSize,
        gap: getComputedStyle(state).gap,
        text: state.textContent,
      })),
      placeholder: rect(placeholder),
      renderError: rect(renderError),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      runningMessageBusy: runningMessage?.getAttribute('aria-busy'),
      shimmerAnimationDuration: shimmer ? getComputedStyle(shimmer).animationDuration : null,
      skeleton: rect(skeleton),
      spinner: rect(spinner),
      spinnerComputedSize: spinner ? {
        height: getComputedStyle(spinner).height,
        width: getComputedStyle(spinner).width,
      } : null,
      thread: rect(thread),
      threadGap: thread ? getComputedStyle(thread).gap : null,
      threadPadding: thread ? getComputedStyle(thread).padding : null,
      threadWidthMode: thread?.getAttribute('data-width'),
      viewport: rect(viewport),
      viewportOverflowY: viewport ? getComputedStyle(viewport).overflowY : null,
      viewportPositionDelta: viewport instanceof HTMLElement
        ? ${position === "top" ? "viewport.scrollTop" : "Math.abs(viewportScrollMaximum - viewport.scrollTop)"}
        : null,
      viewportScrollMaximum,
      viewportScrollTop: viewport instanceof HTMLElement ? viewport.scrollTop : null,
      viewportTabIndex: viewport?.tabIndex ?? null,
      window: { height: window.innerHeight, width: window.innerWidth },
      position: ${JSON.stringify(position)},
    };
  })()`);
}

async function captureAcceptance(browserWindow: BrowserWindow) {
  const outputDirectory = process.env.CODEX_UI_KIT_ACCEPTANCE_DIR;
  if (!outputDirectory) return;

  nativeTheme.themeSource = "dark";
  sendThemeState(browserWindow.webContents);
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("acceptance step: composer auxiliary");
  const metrics = await browserWindow.webContents.executeJavaScript(`(() => {
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      };
    };
    const overlaps = (first, second) => {
      if (!first || !second) return null;
      const a = first.getBoundingClientRect();
      const b = second.getBoundingClientRect();
      return !(
        a.right <= b.left ||
        a.left >= b.right ||
        a.bottom <= b.top ||
        a.top >= b.bottom
      );
    };
    const mention = document.querySelector('.codex-ui-composer-mention-menu');
    const mentionForm = mention?.closest('.codex-ui-composer');
    const mentionFieldset = mentionForm?.querySelector('.codex-ui-composer__fieldset');
    const mentionSample = mentionForm?.closest('.desktop-composer-dock__sample--mentions');
    const mentionLabel = mentionSample?.querySelector(':scope > span');
    const attachments = document.querySelector('.desktop-composer-dock .codex-ui-composer__attachments');
    const queue = document.querySelector('.desktop-composer-dock .codex-ui-composer-queue');
    const fontProbe = document.querySelector('[data-font-probe="sans"]');
    return {
      attachments: rect(attachments),
      attachmentsOverflowX: attachments ? getComputedStyle(attachments).overflowX : null,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      fontFamily: fontProbe ? getComputedStyle(fontProbe).fontFamily : null,
      mention: rect(mention),
      mentionFieldset: rect(mentionFieldset),
      mentionForm: rect(mentionForm),
      mentionLabel: rect(mentionLabel),
      mentionLabelOverlapsTray: overlaps(mentionLabel, mention),
      mentionMaxHeight: mention ? getComputedStyle(mention).maxHeight : null,
      queue: rect(queue),
      queueMaxHeight: queue ? getComputedStyle(queue).maxHeight : null,
      queueRows: [...document.querySelectorAll('.desktop-composer-dock .codex-ui-composer-queue__row')].map(rect),
      resolvedTheme: document.querySelector('.desktop-playground')?.getAttribute('data-theme'),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  })()`);
  const screenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: thread top");
  const threadTopMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
    "top",
  );
  const threadTopScreenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: thread bottom");
  const threadMetrics = await captureThreadSurfaces(browserWindow.webContents);
  const threadScreenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: navigation");
  const navigationMetrics = await captureNavigationSurfaces(
    browserWindow.webContents,
  );
  const navigationScreenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: interactive primitives");
  const interactiveMetrics = await captureInteractivePrimitives(
    browserWindow.webContents,
  );
  const interactiveScreenshot = await browserWindow.webContents.capturePage();
  await closeChoiceDialog(browserWindow.webContents);
  await browserWindow.webContents.executeJavaScript(
    "document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))",
  );
  console.log("acceptance step: resources");
  const resourceMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
  );
  const resourceScreenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: resource preview");
  const resourcePreviewMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
    true,
  );
  const resourcePreviewScreenshot =
    await browserWindow.webContents.capturePage();
  await browserWindow.webContents.executeJavaScript(
    "document.querySelector('[aria-label=\"Close image preview\"]')?.click()",
  );
  console.log("acceptance step: workflow surfaces");
  const workflowMetrics = await captureWorkflowSurfaces(
    browserWindow.webContents,
  );
  const workflowScreenshot = await browserWindow.webContents.capturePage();
  await focusProjectRoutingSurface(browserWindow.webContents);
  const projectRoutingScreenshot =
    await browserWindow.webContents.capturePage();
  await openLocalEnvironmentSurface(browserWindow.webContents);
  const localEnvironmentScreenshot =
    await browserWindow.webContents.capturePage();
  await closeLocalEnvironmentSurface(browserWindow.webContents);
  nativeTheme.themeSource = "light";
  sendThemeState(browserWindow.webContents);
  await browserWindow.webContents.executeJavaScript(
    `[...document.querySelectorAll('.segmented-control button')]
      .find((button) => button.textContent?.trim() === 'Compact')
      ?.click()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 350));
  console.log("acceptance step: compact interactive primitives");
  const compactInteractiveMetrics = await captureInteractivePrimitives(
    browserWindow.webContents,
  );
  const compactInteractiveScreenshot =
    await browserWindow.webContents.capturePage();
  await closeChoiceDialog(browserWindow.webContents);
  console.log("acceptance step: compact resources");
  const compactResourceMetrics = await captureResourceSurfaces(
    browserWindow.webContents,
  );
  const compactResourceScreenshot = await browserWindow.webContents.capturePage();
  console.log("acceptance step: compact workflow surfaces");
  const compactWorkflowMetrics = await captureWorkflowSurfaces(
    browserWindow.webContents,
  );
  const compactWorkflowScreenshot =
    await browserWindow.webContents.capturePage();
  await focusProjectRoutingSurface(browserWindow.webContents);
  const compactProjectRoutingScreenshot =
    await browserWindow.webContents.capturePage();
  await openLocalEnvironmentSurface(browserWindow.webContents);
  const compactLocalEnvironmentScreenshot =
    await browserWindow.webContents.capturePage();
  await closeLocalEnvironmentSurface(browserWindow.webContents);
  console.log("acceptance step: compact navigation");
  const compactNavigationMetrics = await captureNavigationSurfaces(
    browserWindow.webContents,
  );
  const compactNavigationScreenshot =
    await browserWindow.webContents.capturePage();
  console.log("acceptance step: compact thread top");
  const compactThreadTopMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
    "top",
  );
  const compactThreadTopScreenshot =
    await browserWindow.webContents.capturePage();
  console.log("acceptance step: compact thread bottom");
  const compactThreadMetrics = await captureThreadSurfaces(
    browserWindow.webContents,
  );
  const compactThreadScreenshot =
    await browserWindow.webContents.capturePage();

  assertAcceptanceMetric("composer auxiliary", metrics, {
    equals: { mentionLabelOverlapsTray: false },
    expectedTheme: "dark",
    minimumItems: { queueRows: 2 },
    requiredFields: ["attachments", "mention", "mentionForm", "queue"],
  });
  for (const [name, snapshot, expectedTheme, position] of [
    ["thread top", threadTopMetrics, "dark", "top"],
    ["thread bottom", threadMetrics, "dark", "bottom"],
    ["compact thread top", compactThreadTopMetrics, "light", "top"],
    ["compact thread bottom", compactThreadMetrics, "light", "bottom"],
  ] as const) {
    assertAcceptanceMetric(name, snapshot, {
      equals: {
        bubbleTabIndex: 0,
        footerPosition: "sticky",
        position,
        runningMessageBusy: "true",
        viewportOverflowY: "auto",
        viewportTabIndex: 0,
      },
      expectedTheme,
      maximumValues: { viewportPositionDelta: 32 },
      minimumItems: { contextOptimizationStates: 2, loadingStates: 2 },
      requiredFields: [
        "bubble",
        "footer",
        "placeholder",
        "renderError",
        "skeleton",
        "thread",
        "viewport",
      ],
    });
  }
  for (const [name, snapshot, expectedTheme] of [
    ["navigation", navigationMetrics, "dark"],
    ["compact navigation", compactNavigationMetrics, "light"],
  ] as const) {
    assertAcceptanceMetric(name, snapshot, {
      equals: { panelOpen: true, panelZIndex: "42" },
      expectedTheme,
      minimumItems: {
        floatingButtons: 3,
        messageRailMarkers: 4,
        messageRailRows: 4,
        navigationButtons: 3,
      },
      requiredFields: [
        "header",
        "messageRail",
        "messageRailTooltip",
        "panel",
      ],
    });
  }
  for (const [name, snapshot, expectedTheme] of [
    ["interactive primitives", interactiveMetrics, "dark"],
    ["compact interactive primitives", compactInteractiveMetrics, "light"],
  ] as const) {
    assertAcceptanceMetric(name, snapshot, {
      allItemsEqual: { overlays: { field: "inViewport", value: true } },
      allItemsHaveNonEmptyString: { overlays: "owner" },
      equals: { dialogFirstChoiceFocused: true, overlayOwnerCount: 1 },
      expectedTheme,
      minimumItems: { dialogChoiceRows: 2, overlays: 2 },
      requiredFields: ["card", "dialog", "dialogSurface", "mediumButton"],
    });
  }
  for (const [name, snapshot, expectedTheme] of [
    ["resources", resourceMetrics, "dark"],
    ["compact resources", compactResourceMetrics, "light"],
  ] as const) {
    assertAcceptanceMetric(name, snapshot, {
      equals: { pendingCount: 2, preview: null },
      expectedTheme,
      minimumItems: { resourceRows: 3 },
      requiredFields: ["card", "gallery", "galleryImage", "sourceList"],
    });
  }
  for (const [
    name,
    snapshot,
    expectedTheme,
    pullRequestLayout,
    routingLayout,
    routingPromptInitiallyVisible,
  ] of [
    [
      "workflow surfaces",
      workflowMetrics,
      "dark",
      "split",
      "split",
      true,
    ],
    [
      "compact workflow surfaces",
      compactWorkflowMetrics,
      "light",
      "stacked",
      "stacked",
      false,
    ],
  ] as const) {
    assertAcceptanceMetric(name, snapshot, {
      allItemsEqual: {
        selectorOverlays: { field: "inViewport", value: true },
      },
      allItemsHaveNonEmptyString: {
        selectorOverlays: "owner",
      },
      equals: {
        pullRequestBodyWithinPage: true,
        pullRequestChildrenWithinBody: true,
        pullRequestDetailOverflowY: "auto",
        pullRequestLayout,
        routingBodyWithinPage: true,
        routingChildrenWithinBody: true,
        routingDestination: "ChatGPT",
        routingEnvironment: "Change environment: Local",
        routingLayout,
        routingProjectsOverflowY: "auto",
        routingPromptInitiallyVisible,
        routingPromptTransitioned: true,
        routingSetupOverflowY: "auto",
        routingComposerPrompt: "Acceptance new chat prompt",
        routingComposerSubmitEnabled: true,
        routingState: "Desktop conversation started",
        runningEventBusy: "true",
        selectedPullRequest:
          "Open pull request 50: Add current application shell",
        selectedRoutingProject: "Open project Desktop",
        selectedRoutingWorktree: "Change worktree: main",
        selectionText: "ui-kit/worktree/feature",
        threadEventCount: 2,
        localEnvironmentGroupCount: 2,
        localEnvironmentInViewport: true,
        localEnvironmentItemCount: 4,
        localEnvironmentFilteredGroupCount: 1,
        localEnvironmentFilteredItemCount: 1,
        localEnvironmentRepairingDisabledCount: 1,
        localEnvironmentRole: "dialog",
        localEnvironmentSearchFocused: true,
        localEnvironmentTriggerControls:
          "desktop-local-environment-dialog",
        localEnvironmentTriggerExpanded: "true",
        worktreeEnvironmentRole: "dialog",
        worktreeEnvironmentTriggerControls:
          "desktop-local-environment-dialog",
        worktreeEnvironmentTriggerExpanded: "true",
      },
      expectedTheme,
      minimumItems: {
        checkRows: 2,
        eventRows: 6,
        reviewRows: 1,
        routingContextItems: 3,
        routingProjectItems: 3,
        selectorOverlays: 3,
        workspaceFields: 3,
      },
      requiredFields: [
        "card",
        "eventList",
        "pullRequestBody",
        "pullRequestDetail",
        "pullRequestList",
        "pullRequestPage",
        "reviewThread",
        "routingBody",
        "localEnvironmentDialog",
        "routingNewConversation",
        "routingPage",
        "routingProjects",
        "routingSetup",
        "workspace",
      ],
    });
  }
  assertAcceptanceMetric("resource preview", resourcePreviewMetrics, {
    equals: { focusedLabel: "Close image preview", pendingCount: 2 },
    expectedTheme: "dark",
    minimumItems: { resourceRows: 3 },
    requiredFields: [
      "gallery",
      "preview",
      "previewDialog",
      "previewImage",
      "sourceList",
    ],
  });

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      join(outputDirectory, "composer-auxiliary-metrics.json"),
      `${JSON.stringify(metrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "composer-auxiliary.png"),
      screenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces-metrics.json"),
      `${JSON.stringify(navigationMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces.png"),
      navigationScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-metrics.json"),
      `${JSON.stringify(threadMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces.png"),
      threadScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-top-metrics.json"),
      `${JSON.stringify(threadTopMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-top.png"),
      threadTopScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactThreadMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light.png"),
      compactThreadScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-top-metrics.json"),
      `${JSON.stringify(compactThreadTopMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "thread-surfaces-compact-light-top.png"),
      compactThreadTopScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactNavigationMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "navigation-surfaces-compact-light.png"),
      compactNavigationScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-metrics.json"),
      `${JSON.stringify(interactiveMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives.png"),
      interactiveScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-compact-light-metrics.json"),
      `${JSON.stringify(compactInteractiveMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "interactive-primitives-compact-light.png"),
      compactInteractiveScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces-metrics.json"),
      `${JSON.stringify(resourceMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces.png"),
      resourceScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "resource-preview-metrics.json"),
      `${JSON.stringify(resourcePreviewMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-preview.png"),
      resourcePreviewScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactResourceMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "resource-surfaces-compact-light.png"),
      compactResourceScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "workflow-surfaces-metrics.json"),
      `${JSON.stringify(workflowMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "workflow-surfaces.png"),
      workflowScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "project-routing.png"),
      projectRoutingScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "local-environment-dialog.png"),
      localEnvironmentScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "workflow-surfaces-compact-light-metrics.json"),
      `${JSON.stringify(compactWorkflowMetrics, null, 2)}\n`,
    ),
    writeFile(
      join(outputDirectory, "workflow-surfaces-compact-light.png"),
      compactWorkflowScreenshot.toPNG(),
    ),
    writeFile(
      join(outputDirectory, "project-routing-compact-light.png"),
      compactProjectRoutingScreenshot.toPNG(),
    ),
    writeFile(
      join(
        outputDirectory,
        "local-environment-dialog-compact-light.png",
      ),
      compactLocalEnvironmentScreenshot.toPNG(),
    ),
  ]);
  console.log(`acceptance capture: ${outputDirectory}`);
  app.quit();
}

function getThemeState(): ThemeState {
  return {
    resolved: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    source: nativeTheme.themeSource,
  };
}

function getEnvironment(): DesktopEnvironment {
  return {
    arch: process.arch,
    chromium: process.versions.chrome,
    electron: process.versions.electron,
    platform: process.platform,
    theme: getThemeState(),
  };
}

function sendThemeState(webContents: WebContents) {
  webContents.send("playground:theme-changed", getThemeState());
}

function getAppliedSize(
  browserWindow: BrowserWindow,
  preset: WindowPreset,
): AppliedWindowSize {
  const requested = windowPresets[preset];
  const display = screen.getDisplayMatching(browserWindow.getBounds());
  const width = Math.max(
    minimumSize.width,
    Math.min(requested.width, display.workAreaSize.width),
  );
  const height = Math.max(
    minimumSize.height,
    Math.min(requested.height, display.workAreaSize.height),
  );

  return { height, preset, width };
}

function applyWindowPreset(
  browserWindow: BrowserWindow,
  preset: WindowPreset,
): AppliedWindowSize {
  const applied = getAppliedSize(browserWindow, preset);
  browserWindow.setContentSize(applied.width, applied.height, true);
  browserWindow.center();
  return applied;
}

function registerIpcHandlers() {
  ipcMain.handle("playground:get-environment", () => getEnvironment());

  ipcMain.handle("playground:set-theme-source", (_event, source: unknown) => {
    if (!isThemeSource(source)) {
      throw new TypeError("Invalid theme source");
    }

    nativeTheme.themeSource = source;
    return getThemeState();
  });

  ipcMain.handle("playground:set-window-preset", (event, preset: unknown) => {
    if (!isWindowPreset(preset)) {
      throw new TypeError("Invalid window preset");
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    if (!browserWindow) {
      throw new Error("No BrowserWindow is associated with this Renderer");
    }

    return applyWindowPreset(browserWindow, preset);
  });
}

async function createWindow() {
  const initial = windowPresets[defaultPreset];
  const browserWindow = new BrowserWindow({
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#181818" : "#f4f4f3",
    height: initial.height,
    minHeight: minimumSize.height,
    minWidth: minimumSize.width,
    show: false,
    title: appName,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 18, y: 20 } : undefined,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../preload/index.cjs"),
      sandbox: true,
    },
    width: initial.width,
  });

  mainWindow = browserWindow;
  browserWindow.setMenuBarVisibility(false);
  browserWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  browserWindow.webContents.on("will-navigate", (event, url) => {
    const allowedUrl = process.env.ELECTRON_RENDERER_URL;
    if (!allowedUrl || new URL(url).origin !== new URL(allowedUrl).origin) {
      event.preventDefault();
    }
  });
  browserWindow.webContents.once("did-finish-load", () => {
    void captureAcceptance(browserWindow).catch((error: unknown) => {
      console.error("acceptance capture failed", error);
      app.exit(1);
    });
  });
  browserWindow.once("ready-to-show", () => browserWindow.show());
  browserWindow.on("closed", () => {
    if (mainWindow === browserWindow) {
      mainWindow = null;
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await browserWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await browserWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.setName(appName);

app.whenReady().then(async () => {
  registerIpcHandlers();
  nativeTheme.on("updated", () => {
    const background = nativeTheme.shouldUseDarkColors ? "#181818" : "#f4f4f3";
    for (const browserWindow of BrowserWindow.getAllWindows()) {
      browserWindow.setBackgroundColor(background);
      sendThemeState(browserWindow.webContents);
    }
  });

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
