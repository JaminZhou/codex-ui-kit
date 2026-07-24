// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppShell,
  AppSidebar,
  AppSidebarItem,
  AppSidebarSection,
  ApprovalRequest,
  Dialog,
  Popover,
  Select,
  WorkspacePanel,
} from "../src";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});

describe("application shell", () => {
  it("composes navigation, conversation, side, and bottom landmarks", () => {
    const { rerender } = render(
      <AppShell
        bottomPanel={<div>Terminal content</div>}
        bottomPanelOpen
        sidePanel={<div>Source content</div>}
        sidePanelOpen
        sidebar={<div>Navigation content</div>}
        sidebarOpen
      >
        Thread content
      </AppShell>,
    );

    expect(
      screen.getByRole("complementary", { name: "App navigation" }),
    ).toBeTruthy();
    expect(screen.getByRole("main", { name: "Conversation" })).toBeTruthy();
    expect(
      screen.getByRole("complementary", { name: "Workspace panel" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Bottom panel" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Close navigation sidebar" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Close workspace panel" }),
    ).toBeNull();

    rerender(
      <AppShell
        bottomPanel={<div>Terminal content</div>}
        bottomPanelOpen={false}
        sidePanel={<div>Source content</div>}
        sidePanelOpen={false}
        sidebar={<div>Navigation content</div>}
        sidebarOpen={false}
      >
        Thread content
      </AppShell>,
    );

    for (const label of ["App navigation", "Workspace panel", "Bottom panel"]) {
      const surface = document.querySelector(`[aria-label="${label}"]`)!;
      expect(surface.getAttribute("aria-hidden")).toBe("true");
      expect(surface.hasAttribute("inert")).toBe(true);
    }
  });

  it("exposes controlled overlay dismissal", () => {
    const onSidebarOpenChange = vi.fn();
    const onSidePanelOpenChange = vi.fn();
    render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelOpen
        onSidePanelOpenChange={onSidePanelOpenChange}
        onSidebarOpenChange={onSidebarOpenChange}
        sidePanel="Sources"
        sidePanelOpen
        sidebar="Navigation"
        sidebarOpen
      >
        Thread
      </AppShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close navigation sidebar" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close workspace panel" }),
    );

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
    expect(onSidePanelOpenChange).toHaveBeenCalledWith(false);
  });

  it("defaults handler-free responsive panels closed", () => {
    render(
      <AppShell
        sidePanel={<button type="button">Sources</button>}
        sidebar={<button type="button">Projects</button>}
      >
        Thread
      </AppShell>,
    );

    for (const label of ["App navigation", "Workspace panel"]) {
      const surface = document.querySelector(`[aria-label="${label}"]`)!;
      expect(surface.getAttribute("aria-hidden")).toBe("true");
      expect(surface.hasAttribute("inert")).toBe(true);
    }
    const shell = document.querySelector(".codex-ui-app-shell")!;
    expect(shell.hasAttribute("data-sidebar-open")).toBe(false);
    expect(shell.hasAttribute("data-side-panel-open")).toBe(false);
  });

  it("closes default-open portals in initially hidden panels", async () => {
    render(
      <AppShell
        sidePanel={
          <Popover
            defaultOpen
            label="Hidden actions"
            trigger={<button type="button">Actions</button>}
          >
            <button type="button">Hidden action</button>
          </Popover>
        }
        sidePanelOpen={false}
      >
        Thread
      </AppShell>,
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Hidden action" }),
      ).toBeNull(),
    );
  });

  it("suppresses portals mounted after their surface is blocked", async () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onOpenChange = vi.fn();

    function LatePortalFixture() {
      const [showPopover, setShowPopover] = useState(false);
      return (
        <>
          <button
            onClick={() => setShowPopover(true)}
            type="button"
          >
            Mount main popover
          </button>
          <AppShell
            sidePanel={<button type="button">Sources</button>}
            sidePanelOpen
          >
            {showPopover ? (
              <Popover
                defaultOpen
                label="Late actions"
                onOpenChange={onOpenChange}
                trigger={<button type="button">Late actions</button>}
              >
                <button type="button">Leaked action</button>
              </Popover>
            ) : null}
          </AppShell>
        </>
      );
    }

    render(<LatePortalFixture />);
    act(() => resize?.(1_000));
    fireEvent.click(
      screen.getByRole("button", { name: "Mount main popover" }),
    );

    await waitFor(() =>
      expect(onOpenChange).toHaveBeenCalledWith(false),
    );
    expect(
      screen.queryByRole("button", { name: "Leaked action" }),
    ).toBeNull();
  });

  it("disables approval hotkeys in blocked surfaces", () => {
    const onHiddenApprove = vi.fn();
    const onHiddenReject = vi.fn();
    const onVisibleApprove = vi.fn();
    const onVisibleReject = vi.fn();
    render(
      <AppShell
        sidePanel={
          <ApprovalRequest
            autoFocus={false}
            kind="permission"
            onApprove={onHiddenApprove}
            onReject={onHiddenReject}
            title="Hidden approval"
          />
        }
        sidePanelOpen={false}
      >
        <ApprovalRequest
          autoFocus={false}
          kind="permission"
          onApprove={onVisibleApprove}
          onReject={onVisibleReject}
          title="Visible approval"
        />
      </AppShell>,
    );

    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onVisibleApprove).toHaveBeenCalledOnce();
    expect(onVisibleReject).toHaveBeenCalledOnce();
    expect(onHiddenApprove).not.toHaveBeenCalled();
    expect(onHiddenReject).not.toHaveBeenCalled();
  });

  it("does not infer open state from panel callbacks", () => {
    render(
      <AppShell
        onSidePanelOpenChange={() => undefined}
        onSidebarOpenChange={() => undefined}
        sidePanel={<button type="button">Sources</button>}
        sidebar={<button type="button">Projects</button>}
      >
        Thread
      </AppShell>,
    );

    for (const label of ["App navigation", "Workspace panel"]) {
      const surface = document.querySelector(`[aria-label="${label}"]`)!;
      expect(surface.getAttribute("aria-hidden")).toBe("true");
      expect(surface.hasAttribute("inert")).toBe(true);
    }
    const shell = document.querySelector(".codex-ui-app-shell")!;
    expect(shell.hasAttribute("data-sidebar-open")).toBe(false);
    expect(shell.hasAttribute("data-side-panel-open")).toBe(false);
  });

  it("restores focus when a shell surface hides the active control", () => {
    function FocusRestorationFixture() {
      const [openerDisabled, setOpenerDisabled] = useState(false);
      const [sidePanelOpen, setSidePanelOpen] = useState(false);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          sidePanel={
            <>
              <button
                onClick={() => setSidePanelOpen(false)}
                type="button"
              >
                Close sources
              </button>
              <button
                onClick={() => {
                  setOpenerDisabled(true);
                  setSidePanelOpen(false);
                }}
                type="button"
              >
                Disable opener and close
              </button>
            </>
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button
            disabled={openerDisabled}
            onClick={() => setSidePanelOpen(true)}
            type="button"
          >
            Open sources
          </button>
        </AppShell>
      );
    }

    render(<FocusRestorationFixture />);
    const opener = screen.getByRole("button", { name: "Open sources" });
    opener.focus();
    fireEvent.click(opener);

    const closer = screen.getByRole("button", { name: "Close sources" });
    closer.focus();
    fireEvent.click(closer);
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    const backdrop = screen.getByRole("button", {
      name: "Close workspace panel",
    });
    backdrop.focus();
    fireEvent.click(backdrop);
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    const disabledCloser = screen.getByRole("button", {
      name: "Disable opener and close",
    });
    disabledCloser.focus();
    fireEvent.click(disabledCloser);
    expect(document.activeElement).toBe(
      screen.getByRole("main", { name: "Conversation" }),
    );
  });

  it("blocks content covered by an explicit handler-free overlay", () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <AppShell
        sidePanel={<button type="button">Sources</button>}
        sidePanelOpen
      >
        <button type="button">Composer</button>
      </AppShell>,
    );

    const composer = screen.getByRole("button", { name: "Composer" });
    composer.focus();
    act(() => resize?.(1_000));
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );
    expect(
      screen.queryByRole("button", { name: "Close workspace panel" }),
    ).toBeNull();
  });

  it("moves focus out of a main-owned portalled overlay", async () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <AppShell
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Sources</button>}
        sidePanelOpen
      >
        <Select
          label="Model"
          onValueChange={() => undefined}
          options={[{ label: "Codex", value: "codex" }]}
        />
      </AppShell>,
    );

    const trigger = screen.getByRole("button", { name: "Model" });
    fireEvent.click(trigger);
    const option = screen.getByRole("option", { name: "Codex" });
    await waitFor(() => expect(document.activeElement).toBe(option));
    const overlay = option.closest<HTMLElement>(
      "[data-codex-ui-overlay-owner]",
    );
    expect(overlay).not.toBeNull();
    expect(overlay?.dataset.codexUiOverlayOwner?.split(/\s+/)).toContain(
      trigger.getAttribute("aria-controls"),
    );

    act(() => resize?.(1_000));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Sources" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Codex" }),
      ).toBeNull(),
    );
  });

  it("moves focus out of an aria-controlled approval menu portal", () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <AppShell
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Sources</button>}
        sidePanelOpen
      >
        <ApprovalRequest
          autoFocus={false}
          disableHotkeys
          kind="network"
          onApprove={() => undefined}
          onReject={() => undefined}
          scopedApproveAction={{ onClick: () => undefined }}
          title="Connect?"
        />
      </AppShell>,
    );

    const toggle = screen.getByRole("button", {
      name: "Approval options",
    });
    fireEvent.click(toggle);
    const menu = screen.getByRole("menu");
    const scopedItem = screen.getByRole("menuitem", {
      name: "Allow this conversation",
    });
    expect(menu.hasAttribute("data-codex-ui-overlay-owner")).toBe(false);
    expect(toggle.getAttribute("aria-controls")).toBe(menu.id);
    scopedItem.focus();

    act(() => resize?.(1_000));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("preserves focus in a sidebar-owned portalled overlay", async () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <AppShell
        sidebar={
          <Select
            label="Workspace"
            onValueChange={() => undefined}
            options={[{ label: "Project", value: "project" }]}
          />
        }
        sidebarOpen
      >
        Thread
      </AppShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Workspace" }),
    );
    const option = screen.getByRole("option", { name: "Project" });
    await waitFor(() => expect(document.activeElement).toBe(option));

    act(() => resize?.(700));
    expect(document.activeElement).toBe(option);
    expect(
      screen.getByRole("option", { name: "Project" }),
    ).toBeTruthy();
  });

  it("closes portals owned by surfaces hidden behind the sidebar", async () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    render(
      <AppShell
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        <Select
          label="Model"
          onValueChange={() => undefined}
          options={[{ label: "Codex", value: "codex" }]}
        />
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Model" }));
    const option = screen.getByRole("option", { name: "Codex" });
    await waitFor(() => expect(document.activeElement).toBe(option));

    act(() => resize?.(700));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Projects" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Codex" }),
      ).toBeNull(),
    );
  });

  it("restores focus when closing a panel-owned portal", async () => {
    function PanelPortalFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          sidePanel={
            <Select
              label="Source sort"
              onValueChange={() => undefined}
              options={[{ label: "Recent", value: "recent" }]}
            />
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button
            onClick={() => setSidePanelOpen(false)}
            type="button"
          >
            Close sources
          </button>
        </AppShell>
      );
    }

    render(<PanelPortalFixture />);
    fireEvent.click(
      screen.getByRole("button", { name: "Source sort" }),
    );
    const option = screen.getByRole("option", { name: "Recent" });
    await waitFor(() => expect(document.activeElement).toBe(option));

    const fallback = screen.getByRole("button", {
      name: "Close sources",
    });
    fireEvent.click(fallback);
    expect(document.activeElement).toBe(fallback);
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Recent" }),
      ).toBeNull(),
    );
  });

  it("preserves focus in a higher-priority dialog", async () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    function DialogFixture() {
      const [dialogOpen, setDialogOpen] = useState(true);
      return (
        <AppShell
          sidebar={<button type="button">Projects</button>}
          sidebarOpen
        >
          <Dialog
            onOpenChange={setDialogOpen}
            open={dialogOpen}
            showClose={false}
            title="Confirm action"
          >
            <button onClick={() => setDialogOpen(false)} type="button">
              Finish dialog
            </button>
            <Select
              label="Dialog model"
              onValueChange={() => undefined}
              options={[{ label: "Codex", value: "codex" }]}
            />
          </Dialog>
        </AppShell>
      );
    }

    render(<DialogFixture />);
    const dialogAction = screen.getByRole("button", {
      name: "Finish dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(dialogAction),
    );
    expect(document.body.style.overflow).toBe("hidden");

    act(() => resize?.(700));
    expect(document.activeElement).toBe(dialogAction);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(
      screen.getByRole("button", { name: "Dialog model" }),
    );
    const dialogOption = await screen.findByRole("option", {
      name: "Codex",
    });
    fireEvent.click(dialogOption);
    dialogAction.focus();
    fireEvent.click(dialogAction);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Projects" }),
      ),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("does not lock document scroll for shell-local overlays", () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    document.body.style.overflow = "auto";

    render(
      <AppShell
        sidePanel={<button type="button">Sources</button>}
        sidePanelOpen
      >
        Thread
      </AppShell>,
    );

    act(() => resize?.(1_000));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("makes backdrop-covered content inert at responsive breakpoints", () => {
    let resize: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        resize = (width) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    function ResponsiveFixture() {
      const [sidebarOpen, setSidebarOpen] = useState(true);
      return (
        <AppShell
          bottomPanel={<button type="button">Terminal</button>}
          bottomPanelOpen
          onSidePanelOpenChange={() => undefined}
          onSidebarOpenChange={setSidebarOpen}
          sidePanel={<button type="button">Sources</button>}
          sidePanelOpen
          sidebar={<button type="button">Projects</button>}
          sidebarOpen={sidebarOpen}
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<ResponsiveFixture />);

    const composer = screen.getByRole("button", { name: "Composer" });
    composer.focus();
    act(() => resize?.(1_000));
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
    expect(
      screen
        .getByRole("complementary", { name: "App navigation" })
        .hasAttribute("inert"),
    ).toBe(false);
    expect(
      screen
        .getByRole("region", { name: "Bottom panel" })
        .hasAttribute("inert"),
    ).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );

    const terminal = screen.getByRole("button", { name: "Terminal" });
    act(() => resize?.(1_600));
    terminal.focus();
    act(() => resize?.(1_000));
    expect(document.activeElement).toBe(terminal);

    const sidePanelBackdrop = screen.getByRole("button", {
      name: "Close workspace panel",
    });
    sidePanelBackdrop.focus();
    act(() => resize?.(1_600));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );

    act(() => resize?.(1_000));
    sidePanelBackdrop.focus();
    act(() => resize?.(700));
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.hasAttribute("inert"),
    ).toBe(true);
    expect(
      document
        .querySelector('[aria-label="Bottom panel"]')
        ?.hasAttribute("inert"),
    ).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Projects" }),
    );

    const sidebarBackdrop = screen.getByRole("button", {
      name: "Close navigation sidebar",
    });
    sidebarBackdrop.focus();
    act(() => resize?.(1_000));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Projects" }),
    );

    act(() => resize?.(700));
    sidebarBackdrop.focus();
    fireEvent.click(sidebarBackdrop);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );
  });
});

describe("application sidebar", () => {
  it("labels sections and marks the selected route", () => {
    render(
      <AppSidebar header="Codex">
        <AppSidebarSection title="Workspace">
          <AppSidebarItem selected>New chat</AppSidebarItem>
          <AppSidebarItem badge="3" description="Open reviews">
            Pull requests
          </AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "New chat" }).getAttribute(
        "aria-current",
      ),
    ).toBe("page");
    expect(screen.getByText("Open reviews")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});

describe("workspace panel", () => {
  it("coordinates tabs and host-owned panel actions", () => {
    const onActiveTabChange = vi.fn();
    const onCloseTab = vi.fn();
    const onExpandedChange = vi.fn();
    const onClose = vi.fn();
    const onOpenTab = vi.fn();
    render(
      <WorkspacePanel
        activeTabId="sources"
        label="Workspace"
        onActiveTabChange={onActiveTabChange}
        onClose={onClose}
        onCloseTab={onCloseTab}
        onExpandedChange={onExpandedChange}
        onOpenTab={onOpenTab}
        tabs={[
          { content: "Source content", id: "sources", label: "Sources" },
          { content: "Review content", id: "review", label: "Review" },
        ]}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Sources" }).getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Source content");

    const sourceTab = screen.getByRole("tab", { name: "Sources" });
    const reviewTab = screen.getByRole("tab", { name: "Review" });
    expect(sourceTab.getAttribute("aria-controls")).toBe(
      screen.getByRole("tabpanel").id,
    );
    expect(reviewTab.hasAttribute("aria-controls")).toBe(false);
    sourceTab.focus();
    fireEvent.keyDown(sourceTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(reviewTab);
    fireEvent.click(reviewTab);
    fireEvent.click(screen.getByRole("button", { name: "Close Sources tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand panel" }));
    fireEvent.click(screen.getByRole("button", { name: "Open panel tab" }));
    fireEvent.click(screen.getByRole("button", { name: "Close workspace" }));

    expect(onActiveTabChange).toHaveBeenCalledWith("review");
    expect(onCloseTab).toHaveBeenCalledWith("sources");
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(onOpenTab).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("uses a stable close label for a rich tab label", () => {
    render(
      <WorkspacePanel
        activeTabId="review"
        label="Workspace"
        onActiveTabChange={() => undefined}
        onCloseTab={() => undefined}
        tabs={[
          {
            content: "Review content",
            id: "review",
            label: <span>Review changes</span>,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close active tab" }),
    ).toBeTruthy();
  });

  it("restores focus after closing the active tab", async () => {
    function ClosableTabsFixture() {
      const [activeTabId, setActiveTabId] = useState("sources");
      const [tabs, setTabs] = useState([
        { content: "Source content", id: "sources", label: "Sources" },
        { content: "Review content", id: "review", label: "Review" },
      ]);
      const closeTab = (id: string) => {
        setTabs((currentTabs) => {
          const closingIndex = currentTabs.findIndex(
            (tab) => tab.id === id,
          );
          const remainingTabs = currentTabs.filter(
            (tab) => tab.id !== id,
          );
          const nextTab =
            remainingTabs[
              Math.min(
                Math.max(closingIndex, 0),
                remainingTabs.length - 1,
              )
            ];
          setActiveTabId(nextTab?.id ?? "");
          return remainingTabs;
        });
      };
      return (
        <WorkspacePanel
          activeTabId={activeTabId}
          label="Closable workspace"
          onActiveTabChange={setActiveTabId}
          onCloseTab={closeTab}
          tabs={tabs}
        />
      );
    }

    render(<ClosableTabsFixture />);
    const closeSources = screen.getByRole("button", {
      name: "Close Sources tab",
    });
    closeSources.focus();
    fireEvent.click(closeSources);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("tab", { name: "Review" }),
      ),
    );

    const closeReview = screen.getByRole("button", {
      name: "Close Review tab",
    });
    closeReview.focus();
    fireEvent.click(closeReview);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("region", { name: "Closable workspace" }),
      ),
    );
  });
});
