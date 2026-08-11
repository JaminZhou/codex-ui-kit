// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState, type CSSProperties } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppShell,
  AppSidebar,
  AppSidebarFooter,
  AppSidebarItem,
  AppSidebarProjectGroup,
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
  document.documentElement.style.fontSize = "";
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

  it("lets host-specific split CSS keep matching non-modal behavior", () => {
    const { container } = render(
      <AppShell
        layoutMode="wide"
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    const shell = container.querySelector(".codex-ui-app-shell")!;
    const main = container.querySelector(".codex-ui-app-shell__main")!;
    const sidePanel = container.querySelector(
      ".codex-ui-app-shell__side-panel",
    )!;

    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    expect(main.hasAttribute("inert")).toBe(false);
    expect(sidePanel.hasAttribute("inert")).toBe(false);
    expect(sidePanel.getAttribute("aria-hidden")).toBe("false");
    expect(
      screen.getByRole("button", { name: "Conversation action" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Review files" }),
    ).toBeTruthy();
  });

  it("keeps the current 820px split and enters modal navigation at 720px", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onSidebarOpenChange = vi.fn();
    const { container } = render(
      <AppShell
        onSidebarOpenChange={onSidebarOpenChange}
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
        sidebarResizable
      >
        <button type="button">Conversation</button>
      </AppShell>,
    );
    const shell = container.querySelector(".codex-ui-app-shell")!;

    act(() => resize?.(820));
    expect(shell.getAttribute("data-layout-mode")).toBe("medium");
    expect(
      screen.getByRole("separator", {
        name: "Resize navigation sidebar",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Close navigation sidebar",
      }),
    ).toBeNull();

    act(() => resize?.(720));
    expect(shell.getAttribute("data-layout-mode")).toBe("narrow");
    expect(
      screen.queryByRole("separator", {
        name: "Resize navigation sidebar",
      }),
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Close navigation sidebar",
      }),
    ).toBeTruthy();
  });

  it("uses the current-build 960px and 720px shell thresholds", () => {
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
                contentRect: { height: 900, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onLayoutModeChange = vi.fn();
    const { container } = render(
      <AppShell onLayoutModeChange={onLayoutModeChange}>
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(".codex-ui-app-shell")!;

    act(() => resize?.(1_180));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    act(() => resize?.(961));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    act(() => resize?.(960));
    expect(shell.getAttribute("data-layout-mode")).toBe("medium");
    act(() => resize?.(721));
    expect(shell.getAttribute("data-layout-mode")).toBe("medium");
    act(() => resize?.(720));
    expect(shell.getAttribute("data-layout-mode")).toBe("narrow");

    expect(onLayoutModeChange.mock.calls).toEqual([
      ["medium", "wide"],
      ["narrow", "medium"],
    ]);
  });

  it("restores only panels auto-collapsed by responsive continuity", () => {
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
                contentRect: { height: 900, width },
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
      const [continuityKey, setContinuityKey] = useState("thread-a");
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      const [sidebarOpen, setSidebarOpen] = useState(true);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          onSidebarOpenChange={setSidebarOpen}
          responsivePanelContinuity
          responsivePanelContinuityKey={continuityKey}
          sidePanel={<button type="button">Review files</button>}
          sidePanelOpen={sidePanelOpen}
          sidebar={<button type="button">Projects</button>}
          sidebarOpen={sidebarOpen}
        >
          <button
            onClick={() => setContinuityKey("thread-b")}
            type="button"
          >
            Change route
          </button>
        </AppShell>
      );
    }

    render(<ResponsiveFixture />);
    const sidebar = screen.getByRole("complementary", {
      name: "App navigation",
    });
    const sidePanel = screen.getByRole("complementary", {
      name: "Workspace panel",
    });

    act(() => resize?.(1_180));
    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(sidePanel.getAttribute("aria-hidden")).toBe("false");

    act(() => resize?.(960));
    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");

    act(() => resize?.(720));
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");

    act(() => resize?.(721));
    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");

    act(() => resize?.(961));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("false");

    act(() => resize?.(960));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Change route" }));
    act(() => resize?.(961));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");
  });

  it("clears responsive restoration intent while continuity is disabled", () => {
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
                contentRect: { height: 900, width },
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
      const [continuity, setContinuity] = useState(true);
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          responsivePanelContinuity={continuity}
          sidePanel={<button type="button">Review files</button>}
          sidePanelOpen={sidePanelOpen}
        >
          <button
            onClick={() => setContinuity((current) => !current)}
            type="button"
          >
            {continuity ? "Disable continuity" : "Enable continuity"}
          </button>
        </AppShell>
      );
    }

    render(<ResponsiveFixture />);
    const sidePanel = screen.getByRole("complementary", {
      name: "Workspace panel",
    });

    act(() => resize?.(1_180));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("false");
    act(() => resize?.(960));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(
      screen.getByRole("button", { name: "Disable continuity" }),
    );
    act(() => resize?.(961));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");

    fireEvent.click(
      screen.getByRole("button", { name: "Enable continuity" }),
    );
    act(() => resize?.(960));
    act(() => resize?.(961));
    expect(sidePanel.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not restore auto-collapse requests ignored by a controlled host", async () => {
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
                contentRect: { height: 900, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onSidebarOpenChange = vi.fn();
    const onSidePanelOpenChange = vi.fn();

    function IgnoredRequestFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      const [sidebarOpen, setSidebarOpen] = useState(true);
      return (
        <>
          <button
            onClick={() => {
              setSidebarOpen(false);
              setSidePanelOpen(false);
            }}
            type="button"
          >
            Host closes panels
          </button>
          <AppShell
            onSidePanelOpenChange={onSidePanelOpenChange}
            onSidebarOpenChange={onSidebarOpenChange}
            responsivePanelContinuity
            sidePanel={<button type="button">Review files</button>}
            sidePanelOpen={sidePanelOpen}
            sidebar={<button type="button">Projects</button>}
            sidebarOpen={sidebarOpen}
          >
            Conversation
          </AppShell>
        </>
      );
    }

    render(<IgnoredRequestFixture />);
    act(() => resize?.(1_180));
    act(() => resize?.(720));
    expect(onSidebarOpenChange.mock.calls).toEqual([[false]]);
    expect(onSidePanelOpenChange.mock.calls).toEqual([[false]]);

    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Host closes panels" }),
    );
    act(() => resize?.(961));

    expect(onSidebarOpenChange.mock.calls).toEqual([[false]]);
    expect(onSidePanelOpenChange.mock.calls).toEqual([[false]]);
  });

  it("clamps a non-resizable side panel before it consumes the main track", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    act(() => resize?.(961));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("335px");
  });

  it("coordinates wider sidebar and side-panel minima at the wide boundary", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
        sidebarResizable
        sidebarWidth={520}
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    act(() => resize?.(961));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    expect(
      screen
        .getByRole("separator", { name: "Resize navigation sidebar" })
        .getAttribute("aria-valuemax"),
    ).toBe("289");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-sidebar-width"),
    ).toBe("289px");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("320px");
  });

  it("applies the larger main minimum to both persistent tracks", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarMinMainWidth={500}
        sidebarOpen
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    act(() => resize?.(1_100));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-sidebar-width"),
    ).toBe("");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("326px");
  });

  it("overlays the side panel when all persistent minima cannot fit", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarMinMainWidth={500}
        sidebarOpen
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    act(() => resize?.(961));
    expect(shell.getAttribute("data-layout-mode")).toBe("wide");
    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(true);
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Close workspace panel" }).tabIndex,
    ).toBe(0);

    act(() => resize?.(1_065));
    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(true);

    act(() => resize?.(1_100));
    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(false);
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(false);
  });

  it("supports an explicit wide overlay without consuming the main track", () => {
    const { container } = render(
      <AppShell
        layoutMode="wide"
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Pull request summary</button>}
        sidePanelOpen
        sidePanelOverlay
        sidePanelResizable
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        Pull request index
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(true);
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
    expect(
      screen.getByRole("complementary", {
        name: "Workspace panel",
      }).getAttribute("aria-hidden"),
    ).toBe("false");
  });

  it("keeps a non-modal overlay resizable and the main track active", () => {
    const { container } = render(
      <AppShell
        layoutMode="wide"
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Pull request summary</button>}
        sidePanelOpen
        sidePanelOverlay
        sidePanelOverlayModal={false}
        sidePanelResizable
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        Pull request index
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(true);
    expect(
      shell.hasAttribute("data-side-panel-overlay-modal"),
    ).toBe(false);
    expect(
      screen.getByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(false);
    expect(
      screen.getByRole("button", {
        name: "Close workspace panel",
      }).tabIndex,
    ).toBe(-1);
  });

  it("hides the side-panel resizer behind an active sidebar modal", () => {
    const { container } = render(
      <AppShell
        layoutMode="narrow"
        narrowSidebarBehavior="modal"
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Pull request summary</button>}
        sidePanelOpen
        sidePanelOverlay
        sidePanelOverlayModal={false}
        sidePanelResizable
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
      >
        Pull request index
      </AppShell>,
    );

    expect(
      container
        .querySelector(".codex-ui-app-shell__side-panel")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
  });

  it("treats expanded side panels as modal overlays below wide mode", () => {
    const { container } = render(
      <AppShell
        layoutMode="medium"
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Review files</button>}
        sidePanelExpanded
        sidePanelOpen
        windowChrome={<button type="button">Chrome navigation</button>}
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(".codex-ui-app-shell")!;
    const chrome = container.querySelector(
      ".codex-ui-app-shell__window-chrome",
    )!;

    expect(shell.hasAttribute("data-side-panel-expanded")).toBe(false);
    expect(shell.hasAttribute("data-side-panel-overlay")).toBe(true);
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
    expect(chrome.hasAttribute("inert")).toBe(true);
    expect(
      screen.getByRole("button", { name: "Close workspace panel" }).tabIndex,
    ).toBe(0);
  });

  it("matches current-build narrow collapse and explicit pinning", () => {
    function CurrentBuildNarrowFixture() {
      const [sidebarOpen, setSidebarOpen] = useState(false);
      return (
        <AppShell
          layoutMode="narrow"
          narrowSidebarBehavior="current-build"
          onSidebarOpenChange={setSidebarOpen}
          sidebar={<button type="button">Projects</button>}
          sidebarOpen={sidebarOpen}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            Show sidebar
          </button>
        </AppShell>
      );
    }

    const { container } = render(<CurrentBuildNarrowFixture />);
    const shell = container.querySelector(".codex-ui-app-shell")!;
    const sidebar = container.querySelector(
      '.codex-ui-app-shell__sidebar[aria-label="App navigation"]',
    )!;
    const main = screen.getByRole("main", { name: "Conversation" });
    const backdrop = container.querySelector(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    )!;

    expect(
      shell.getAttribute("data-narrow-sidebar-behavior"),
    ).toBe("current-build");
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(main.hasAttribute("inert")).toBe(false);

    const showSidebar = screen.getByRole("button", {
      name: "Show sidebar",
    });
    showSidebar.focus();
    fireEvent.pointerMove(shell, { clientX: 1 });
    expect(shell.hasAttribute("data-sidebar-preview-open")).toBe(false);
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(main.hasAttribute("inert")).toBe(false);
    expect((backdrop as HTMLButtonElement).hidden).toBe(true);

    fireEvent.click(showSidebar);
    expect(shell.hasAttribute("data-sidebar-open")).toBe(true);
    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(main.hasAttribute("inert")).toBe(false);
    expect((backdrop as HTMLButtonElement).hidden).toBe(true);
  });

  it("falls back to a modal when a pinned narrow sidebar cannot fit", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        layoutMode="narrow"
        narrowSidebarBehavior="current-build"
        onSidebarOpenChange={() => undefined}
        sidebar="Navigation"
        sidebarOpen
        sidebarWidth={520}
      >
        Conversation
      </AppShell>,
    );
    const shell = container.querySelector(".codex-ui-app-shell")!;
    const main = screen.getByRole("main", { name: "Conversation" });
    const backdrop = container.querySelector(
      '.codex-ui-app-shell__backdrop[data-backdrop="sidebar"]',
    ) as HTMLButtonElement;

    act(() => resize?.(400));
    expect(shell.hasAttribute("data-sidebar-pinned")).toBe(false);
    expect(main.hasAttribute("inert")).toBe(true);
    expect(backdrop.tabIndex).toBe(0);

    act(() => resize?.(900));
    expect(shell.hasAttribute("data-sidebar-pinned")).toBe(true);
    expect(main.hasAttribute("inert")).toBe(false);
    expect(backdrop.tabIndex).toBe(-1);
  });

  it("caps a resized split sidebar before it can consume the main track", () => {
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
                contentRect: { height: 680, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onSidebarWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        defaultSidebarWidth={520}
        onSidebarWidthChange={onSidebarWidthChange}
        sidebar="Navigation"
        sidebarOpen
        sidebarResizable
      >
        Thread
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;

    act(() => resize?.(820));
    const separator = screen.getByRole("separator", {
      name: "Resize navigation sidebar",
    });
    expect(shell.getAttribute("data-layout-mode")).toBe("medium");
    expect(separator.getAttribute("aria-valuemax")).toBe("468");
    expect(separator.getAttribute("aria-valuenow")).toBe("468");
    expect(shell.style.getPropertyValue("--codex-ui-app-sidebar-width")).toBe(
      "468px",
    );
    fireEvent.keyDown(separator, { key: "End" });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(onSidebarWidthChange).not.toHaveBeenCalled();

    act(() => resize?.(721));
    expect(separator.getAttribute("aria-valuemax")).toBe("369");
    expect(separator.getAttribute("aria-valuenow")).toBe("369");
    expect(shell.style.getPropertyValue("--codex-ui-app-sidebar-width")).toBe(
      "369px",
    );

    act(() => resize?.(720));
    expect(shell.getAttribute("data-layout-mode")).toBe("narrow");
    expect(
      screen.queryByRole("separator", {
        name: "Resize navigation sidebar",
      }),
    ).toBeNull();
    expect(shell.style.getPropertyValue("--codex-ui-app-sidebar-width")).toBe(
      "520px",
    );
  });

  it("exposes a measured, pointer-resizable navigation track", () => {
    const onSidebarWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        defaultSidebarWidth={274}
        layoutMode="wide"
        onSidebarWidthChange={onSidebarWidthChange}
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
        sidebarResizable
      >
        Thread
      </AppShell>,
    );

    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    const separator = screen.getByRole("separator", {
      name: "Resize navigation sidebar",
    });

    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.getAttribute("aria-valuemin")).toBe("240");
    expect(separator.getAttribute("aria-valuemax")).toBe("520");
    expect(separator.getAttribute("aria-valuenow")).toBe("274");

    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 274,
      pointerId: 7,
    });
    expect(shell.hasAttribute("data-sidebar-resizing")).toBe(true);
    fireEvent.pointerMove(separator, { clientX: 370, pointerId: 7 });
    expect(separator.getAttribute("aria-valuenow")).toBe("370");
    expect(shell.style.getPropertyValue("--codex-ui-app-sidebar-width")).toBe(
      "370px",
    );

    fireEvent.pointerMove(separator, { clientX: 1_000, pointerId: 7 });
    expect(separator.getAttribute("aria-valuenow")).toBe("520");
    fireEvent.pointerMove(separator, { clientX: -1_000, pointerId: 7 });
    expect(separator.getAttribute("aria-valuenow")).toBe("240");
    fireEvent.pointerUp(separator, { clientX: -1_000, pointerId: 7 });

    expect(shell.hasAttribute("data-sidebar-resizing")).toBe(false);
    expect(onSidebarWidthChange).toHaveBeenLastCalledWith(240);
  });

  it("supports keyboard resizing and omits the handle in narrow overlays", () => {
    const { container, rerender } = render(
      <AppShell
        layoutMode="wide"
        sidebar="Navigation"
        sidebarOpen
        sidebarResizable
      >
        Thread
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize navigation sidebar",
    });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator.getAttribute("aria-valuenow")).toBe("282");
    fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
    expect(separator.getAttribute("aria-valuenow")).toBe("250");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("520");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator.getAttribute("aria-valuenow")).toBe("240");
    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 240,
      pointerId: 8,
    });
    expect(
      container
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-resizing"),
    ).toBe(true);

    rerender(
      <AppShell
        layoutMode="narrow"
        sidebar="Navigation"
        sidebarOpen
        sidebarResizable
      >
        Thread
      </AppShell>,
    );

    expect(
      screen.queryByRole("separator", {
        name: "Resize navigation sidebar",
      }),
    ).toBeNull();
    expect(
      container
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-sidebar-resizing"),
    ).toBe(false);
  });

  it("restores focus before a controlled host removes the resize separator", () => {
    const { rerender } = render(
      <AppShell
        layoutMode="wide"
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
        sidebarResizable
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize navigation sidebar",
    });
    separator.focus();
    expect(document.activeElement).toBe(separator);

    rerender(
      <AppShell
        layoutMode="wide"
        sidebar={<button type="button">Projects</button>}
        sidebarOpen={false}
        sidebarResizable
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Conversation action" }),
    );
  });

  it("exposes a pointer-resizable bottom panel track", () => {
    const onBottomPanelHeightChange = vi.fn();
    const { container } = render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelMaxHeight={402}
        bottomPanelOpen
        bottomPanelResizable
        defaultBottomPanelHeight={272}
        layoutMode="wide"
        onBottomPanelHeightChange={onBottomPanelHeightChange}
      >
        Thread
      </AppShell>,
    );

    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    const separator = screen.getByRole("separator", {
      name: "Resize bottom panel",
    });
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    expect(separator.getAttribute("aria-valuemin")).toBe("152");
    expect(separator.getAttribute("aria-valuemax")).toBe("402");
    expect(separator.getAttribute("aria-valuenow")).toBe("272");

    fireEvent.pointerDown(separator, {
      button: 0,
      clientY: 548,
      pointerId: 27,
    });
    expect(shell.hasAttribute("data-bottom-panel-resizing")).toBe(true);
    fireEvent.pointerMove(separator, { clientY: 448, pointerId: 27 });
    expect(separator.getAttribute("aria-valuenow")).toBe("372");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-bottom-panel-height"),
    ).toBe("372px");
    fireEvent.pointerMove(separator, { clientY: 0, pointerId: 27 });
    fireEvent.pointerMove(separator, { clientY: -100, pointerId: 27 });
    expect(separator.getAttribute("aria-valuenow")).toBe("402");
    fireEvent.pointerMove(separator, { clientY: 1_000, pointerId: 27 });
    fireEvent.pointerMove(separator, { clientY: 1_200, pointerId: 27 });
    fireEvent.pointerUp(separator, { clientY: 1_200, pointerId: 27 });

    expect(separator.getAttribute("aria-valuenow")).toBe("152");
    expect(shell.hasAttribute("data-bottom-panel-resizing")).toBe(false);
    expect(onBottomPanelHeightChange).toHaveBeenCalledTimes(3);
    expect(onBottomPanelHeightChange).toHaveBeenLastCalledWith(152);
  });

  it("supports bottom panel keyboard resizing and restores focus", () => {
    const { rerender } = render(
      <AppShell
        bottomPanel={<button type="button">Terminal input</button>}
        bottomPanelMaxHeight={402}
        bottomPanelOpen
        bottomPanelResizable
        layoutMode="wide"
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize bottom panel",
    });
    fireEvent.keyDown(separator, { key: "ArrowUp" });
    expect(separator.getAttribute("aria-valuenow")).toBe("280");
    fireEvent.keyDown(separator, { key: "ArrowDown", shiftKey: true });
    expect(separator.getAttribute("aria-valuenow")).toBe("248");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("402");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator.getAttribute("aria-valuenow")).toBe("152");
    separator.focus();

    rerender(
      <AppShell
        bottomPanel={<button type="button">Terminal input</button>}
        bottomPanelOpen={false}
        bottomPanelResizable
        layoutMode="wide"
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    expect(
      screen.queryByRole("separator", { name: "Resize bottom panel" }),
    ).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Conversation action" }),
    );
  });

  it("uses the measured shell height for the bottom panel maximum", () => {
    let resizeShell: ((width: number, height: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resizeShell = (width: number, height: number) =>
          this.callback(
            [
              {
                contentRect: { height, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelOpen
        bottomPanelResizable
        layoutMode="wide"
        style={{
          borderBottom: "4px solid transparent",
          borderTop: "4px solid transparent",
          paddingBottom: "20px",
          paddingTop: "20px",
        }}
      >
        Thread
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1_180, 868),
    );
    act(() => resizeShell?.(1_180, 820));
    const separator = screen.getByRole("separator", {
      name: "Resize bottom panel",
    });
    expect(separator.getAttribute("aria-valuemax")).toBe("402");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("402");
  });

  it("keeps the bottom panel minimum within the responsive height cap", () => {
    document.documentElement.style.fontSize = "20px";
    let resizeShell: ((width: number, height: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resizeShell = (width: number, height: number) =>
          this.callback(
            [
              {
                contentRect: { height, width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const { container } = render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelMinHeight={500}
        bottomPanelOpen
        bottomPanelResizable
        layoutMode="wide"
      >
        Thread
      </AppShell>,
    );
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1_180, 820),
    );
    act(() => resizeShell?.(1_180, 820));
    const separator = screen.getByRole("separator", {
      name: "Resize bottom panel",
    });

    expect(separator.getAttribute("aria-valuemin")).toBe("400");
    expect(separator.getAttribute("aria-valuemax")).toBe("400");
    expect(separator.getAttribute("aria-valuenow")).toBe("400");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-bottom-panel-height"),
    ).toBe("400px");
  });

  it("exposes a measured, pointer-resizable workspace track", () => {
    const onSidePanelWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        defaultSidePanelWidth={370}
        layoutMode="wide"
        onSidePanelWidthChange={onSidePanelWidthChange}
        sidePanel={<button type="button">Review files</button>}
        sidePanelMaxWidth={554}
        sidePanelOpen
        sidePanelResizable
      >
        Thread
      </AppShell>,
    );

    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });

    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    expect(separator.getAttribute("aria-valuemin")).toBe("320");
    expect(separator.getAttribute("aria-valuemax")).toBe("554");
    expect(separator.getAttribute("aria-valuenow")).toBe("370");

    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 810,
      pointerId: 17,
    });
    expect(shell.hasAttribute("data-side-panel-resizing")).toBe(true);
    fireEvent.pointerMove(separator, { clientX: 710, pointerId: 17 });
    expect(separator.getAttribute("aria-valuenow")).toBe("470");
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("470px");

    fireEvent.pointerMove(separator, { clientX: -1_000, pointerId: 17 });
    expect(separator.getAttribute("aria-valuenow")).toBe("554");
    fireEvent.pointerMove(separator, { clientX: -1_200, pointerId: 17 });
    fireEvent.pointerMove(separator, { clientX: 2_000, pointerId: 17 });
    expect(separator.getAttribute("aria-valuenow")).toBe("320");
    fireEvent.pointerMove(separator, { clientX: 2_200, pointerId: 17 });
    fireEvent.pointerUp(separator, { clientX: 2_000, pointerId: 17 });

    expect(shell.hasAttribute("data-side-panel-resizing")).toBe(false);
    expect(onSidePanelWidthChange).toHaveBeenCalledTimes(3);
    expect(onSidePanelWidthChange).toHaveBeenLastCalledWith(320);
  });

  it("supports workspace keyboard resizing and omits its handle in overlays", () => {
    const { container, rerender } = render(
      <AppShell
        layoutMode="wide"
        sidePanel="Review"
        sidePanelMaxWidth={554}
        sidePanelOpen
        sidePanelResizable
      >
        Thread
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator.getAttribute("aria-valuenow")).toBe("378");
    fireEvent.keyDown(separator, { key: "ArrowRight", shiftKey: true });
    expect(separator.getAttribute("aria-valuenow")).toBe("346");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("554");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator.getAttribute("aria-valuenow")).toBe("320");
    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 860,
      pointerId: 18,
    });
    expect(
      container
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-side-panel-resizing"),
    ).toBe(true);

    rerender(
      <AppShell
        layoutMode="medium"
        sidePanel="Review"
        sidePanelMaxWidth={554}
        sidePanelOpen
        sidePanelResizable
      >
        Thread
      </AppShell>,
    );

    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
    expect(
      container
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-side-panel-resizing"),
    ).toBe(false);
  });

  it("keeps an unmeasured unbounded workspace width finite", () => {
    const onSidePanelWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        layoutMode="wide"
        onSidePanelWidthChange={onSidePanelWidthChange}
        sidePanel="Review"
        sidePanelOpen
        sidePanelResizable
      >
        Thread
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    expect(separator.getAttribute("aria-valuemax")).toBe("370");
    expect(separator.getAttribute("aria-valuenow")).toBe("370");
    fireEvent.keyDown(separator, { key: "End" });
    expect(onSidePanelWidthChange).not.toHaveBeenCalled();
    expect(
      (
        container.querySelector(
          ".codex-ui-app-shell",
        ) as HTMLDivElement
      ).style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("370px");
  });

  it("keeps a measured main track while resolving the workspace maximum", () => {
    let resizeShell: ((width: number) => void) | undefined;
    let resizeSidebar: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        const resize = (width: number) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        if (target.classList.contains("codex-ui-app-shell")) {
          resizeShell = resize;
        } else if (
          target.classList.contains("codex-ui-app-shell__sidebar")
        ) {
          resizeSidebar = resize;
        }
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    const { container } = render(
      <AppShell
        layoutMode="wide"
        sidePanel="Review"
        sidePanelOpen
        sidePanelResizable
        sidebar="Navigation"
        sidebarOpen
        style={
          {
            "--codex-ui-app-sidebar-width": "400px",
          } as CSSProperties
        }
      >
        Thread
      </AppShell>,
    );

    act(() => resizeShell?.(1_180));
    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    expect(separator.getAttribute("aria-valuemax")).toBe("554");
    expect(separator.getAttribute("aria-valuenow")).toBe("370");

    const sidebarElement = screen.getByRole("complementary", {
      name: "App navigation",
    });
    const sidebarRect = vi
      .spyOn(sidebarElement, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(0, 0, 400, 820));
    act(() => resizeSidebar?.(399));
    expect(separator.getAttribute("aria-valuemax")).toBe("428");
    sidebarRect.mockRestore();

    act(() => resizeSidebar?.(274));
    act(() => resizeShell?.(1_480));
    expect(separator.getAttribute("aria-valuemax")).toBe("854");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("854");

    act(() => resizeShell?.(800));
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();
    expect(
      container
        .querySelector(".codex-ui-app-shell")
        ?.hasAttribute("data-side-panel-overlay"),
    ).toBe(true);
  });

  it("uses the shell content box for live workspace clamping", () => {
    let resizeShell: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        if (!target.classList.contains("codex-ui-app-shell")) return;
        resizeShell = (width: number) =>
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
    const onSidePanelWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        layoutMode="wide"
        onSidePanelWidthChange={onSidePanelWidthChange}
        sidePanel="Review"
        sidePanelOpen
        sidePanelResizable
        style={{
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          paddingLeft: "20px",
          paddingRight: "20px",
        }}
      >
        Thread
      </AppShell>,
    );

    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1_228, 820),
    );
    act(() => resizeShell?.(1_180));
    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    expect(separator.getAttribute("aria-valuemax")).toBe("828");

    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 810,
      pointerId: 23,
    });
    fireEvent.pointerMove(separator, { clientX: -1_000, pointerId: 23 });
    fireEvent.pointerMove(separator, { clientX: -1_200, pointerId: 23 });

    expect(separator.getAttribute("aria-valuenow")).toBe("828");
    expect(onSidePanelWidthChange).toHaveBeenCalledTimes(1);
    expect(onSidePanelWidthChange).toHaveBeenLastCalledWith(828);
  });

  it("uses the coordinated main minimum for live workspace resizing", () => {
    let resizeShell: ((width: number) => void) | undefined;
    let resizeSidebar: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        const resize = (width: number) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        if (target.classList.contains("codex-ui-app-shell")) {
          resizeShell = resize;
        } else if (
          target.classList.contains("codex-ui-app-shell__sidebar")
        ) {
          resizeSidebar = resize;
        }
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    const onSidePanelWidthChange = vi.fn();
    const { container } = render(
      <AppShell
        layoutMode="wide"
        onSidePanelWidthChange={onSidePanelWidthChange}
        sidePanel="Review"
        sidePanelOpen
        sidePanelResizable
        sidebar="Navigation"
        sidebarMinMainWidth={600}
        sidebarOpen
      >
        Thread
      </AppShell>,
    );

    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    const sidebar = screen.getByRole("complementary", {
      name: "App navigation",
    });
    vi.spyOn(shell, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 1_400, 820),
    );
    vi.spyOn(sidebar, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 274, 820),
    );
    act(() => resizeSidebar?.(274));
    act(() => resizeShell?.(1_400));

    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    expect(separator.getAttribute("aria-valuemax")).toBe("526");
    fireEvent.pointerDown(separator, {
      button: 0,
      clientX: 1_000,
      pointerId: 29,
    });
    fireEvent.pointerMove(separator, {
      clientX: 0,
      pointerId: 29,
    });

    expect(separator.getAttribute("aria-valuenow")).toBe("526");
    expect(onSidePanelWidthChange).toHaveBeenLastCalledWith(526);
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("526px");
  });

  it("lets an expanded workspace panel consume the available main track", () => {
    let resizeShell: ((width: number) => void) | undefined;
    let resizeSidebar: ((width: number) => void) | undefined;
    class ResizeObserverMock {
      constructor(
        private readonly callback: ResizeObserverCallback,
      ) {}

      disconnect() {}

      observe(target: Element) {
        const resize = (width: number) =>
          this.callback(
            [
              {
                contentRect: { width },
                target,
              } as ResizeObserverEntry,
            ],
            this as unknown as ResizeObserver,
          );
        if (target.classList.contains("codex-ui-app-shell")) {
          resizeShell = resize;
        } else if (
          target.classList.contains("codex-ui-app-shell__sidebar")
        ) {
          resizeSidebar = resize;
        }
      }

      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);

    const { container, rerender } = render(
      <AppShell
        layoutMode="wide"
        sidePanel="Review"
        sidePanelExpanded
        sidePanelOpen
        sidebar="Navigation"
        sidebarOpen
        style={
          {
            "--codex-ui-app-sidebar-width": "400px",
          } as CSSProperties
        }
      >
        Thread
      </AppShell>,
    );

    act(() => resizeShell?.(1_180));
    const shell = container.querySelector(
      ".codex-ui-app-shell",
    ) as HTMLDivElement;
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("906px");
    expect(shell.hasAttribute("data-side-panel-expanded")).toBe(true);
    expect(
      screen.queryByRole("separator", {
        name: "Resize workspace panel",
      }),
    ).toBeNull();

    act(() => resizeSidebar?.(400));
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("780px");

    rerender(
      <AppShell
        layoutMode="wide"
        sidePanel="Review"
        sidePanelOpen
        sidePanelResizable
        sidebar="Navigation"
        sidebarOpen
        style={
          {
            "--codex-ui-app-sidebar-width": "400px",
          } as CSSProperties
        }
      >
        Thread
      </AppShell>,
    );
    expect(
      shell.style.getPropertyValue("--codex-ui-app-side-panel-width"),
    ).toBe("370px");
    expect(shell.hasAttribute("data-side-panel-expanded")).toBe(false);

    rerender(
      <AppShell
        layoutMode="wide"
        sidePanel="Review"
        sidePanelExpanded
        sidePanelOpen={false}
        sidePanelResizable
        sidebar="Navigation"
        sidebarOpen
        style={
          {
            "--codex-ui-app-sidebar-width": "400px",
          } as CSSProperties
        }
      >
        Thread
      </AppShell>,
    );
    expect(shell.hasAttribute("data-side-panel-expanded")).toBe(false);
  });

  it("restores focus before a controlled host removes the workspace separator", () => {
    const { rerender } = render(
      <AppShell
        layoutMode="wide"
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen
        sidePanelResizable
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    const separator = screen.getByRole("separator", {
      name: "Resize workspace panel",
    });
    separator.focus();
    expect(document.activeElement).toBe(separator);

    rerender(
      <AppShell
        layoutMode="wide"
        sidePanel={<button type="button">Review files</button>}
        sidePanelOpen={false}
        sidePanelResizable
      >
        <button type="button">Conversation action</button>
      </AppShell>,
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Conversation action" }),
    );
  });

  it("exposes controlled overlay dismissal", () => {
    const onSidebarOpenChange = vi.fn();
    const onSidePanelOpenChange = vi.fn();
    const { rerender } = render(
      <AppShell
        bottomPanel="Terminal"
        bottomPanelOpen
        layoutMode="narrow"
        onSidePanelOpenChange={onSidePanelOpenChange}
        onSidebarOpenChange={onSidebarOpenChange}
        sidebar="Navigation"
        sidebarOpen
      >
        Thread
      </AppShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close navigation sidebar" }),
    );
    rerender(
      <AppShell
        layoutMode="medium"
        onSidePanelOpenChange={onSidePanelOpenChange}
        onSidebarOpenChange={onSidebarOpenChange}
        sidePanel="Sources"
        sidePanelOpen
        sidebar="Navigation"
        sidebarOpen={false}
      >
        Thread
      </AppShell>,
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
    act(() => resize?.(960));
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

  it("uses the fallback when a panel opens without a focusable opener", () => {
    let openPanel: () => void = () => undefined;
    function ProgrammaticPanelFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(false);
      openPanel = () => setSidePanelOpen(true);
      return (
        <AppShell
          sidePanel={
            <button
              onClick={() => setSidePanelOpen(false)}
              type="button"
            >
              Close sources
            </button>
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<ProgrammaticPanelFixture />);
    expect(document.activeElement).toBe(document.body);
    act(() => openPanel());
    const closer = screen.getByRole("button", {
      name: "Close sources",
    });
    closer.focus();
    fireEvent.click(closer);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Composer" }),
    );
  });

  it("remembers the opener before panel content autofocuses", async () => {
    function AutofocusPanelFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(false);
      return (
        <AppShell
          sidePanel={
            sidePanelOpen ? (
              <button
                autoFocus
                onClick={() => setSidePanelOpen(false)}
                type="button"
              >
                Close autofocused sources
              </button>
            ) : null
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button
            onClick={() => setSidePanelOpen(true)}
            type="button"
          >
            Open autofocused sources
          </button>
        </AppShell>
      );
    }

    render(<AutofocusPanelFixture />);
    const opener = screen.getByRole("button", {
      name: "Open autofocused sources",
    });
    opener.focus();
    fireEvent.click(opener);
    const closer = screen.getByRole("button", {
      name: "Close autofocused sources",
    });
    await waitFor(() => expect(document.activeElement).toBe(closer));
    fireEvent.click(closer);

    expect(document.activeElement).toBe(opener);
  });

  it("closes a topmost responsive workspace panel on Escape", () => {
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

    function EscapeFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <>
          <input aria-label="Host filter" />
          <AppShell
            onSidePanelOpenChange={setSidePanelOpen}
            sidePanel={<button type="button">Sources</button>}
            sidePanelOpen={sidePanelOpen}
          >
            <button type="button">Composer</button>
          </AppShell>
        </>
      );
    }

    render(<EscapeFixture />);
    const hostFilter = screen.getByRole("textbox", { name: "Host filter" });
    hostFilter.focus();
    act(() => resize?.(960));
    expect(document.activeElement).toBe(hostFilter);
    fireEvent.keyDown(hostFilter, { key: "Escape" });
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");

    const sources = screen.getByRole("button", { name: "Sources" });
    sources.focus();
    fireEvent.keyDown(sources, { key: "Escape" });

    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Composer" }),
    );
  });

  it("lets an approval menu consume Escape before its responsive panel", () => {
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

    function ApprovalMenuEscapeFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          sidePanel={
            <ApprovalRequest
              autoFocus={false}
              disableHotkeys
              kind="network"
              onApprove={() => undefined}
              onReject={() => undefined}
              scopedApproveAction={{ onClick: () => undefined }}
              title="Connect?"
            />
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<ApprovalMenuEscapeFixture />);
    act(() => resize?.(960));

    const toggle = screen.getByRole("button", {
      name: "Approval options",
    });
    fireEvent.click(toggle);
    const scopedItem = screen.getByRole("menuitem", {
      name: "Allow this conversation",
    });
    scopedItem.focus();
    fireEvent.keyDown(scopedItem, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(toggle);
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");

    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("lets a focused popover trigger consume Escape before its responsive panel", () => {
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

    function PopoverEscapeFixture() {
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          sidePanel={
            <Popover
              label="Workspace actions"
              trigger={<button type="button">Open workspace actions</button>}
            >
              <button type="button">Workspace action</button>
            </Popover>
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<PopoverEscapeFixture />);
    act(() => resize?.(960));

    const trigger = screen.getByRole("button", {
      name: "Open workspace actions",
    });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Workspace actions" }),
    ).toBeTruthy();
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Workspace actions" }),
    ).toBeNull();
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
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
    act(() => resize?.(960));
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

    act(() => resize?.(960));
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

    act(() => resize?.(960));
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
      const [sidebarOpen, setSidebarOpen] = useState(true);
      return (
        <AppShell
          onSidebarOpenChange={setSidebarOpen}
          sidebar={<button type="button">Projects</button>}
          sidebarOpen={sidebarOpen}
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
    fireEvent.keyDown(dialogAction, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Confirm action" }),
      ).toBeNull(),
    );
    expect(
      document
        .querySelector('[aria-label="App navigation"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("false");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Projects" }),
      ),
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Projects" }),
      { key: "Escape" },
    );
    expect(
      document
        .querySelector('[aria-label="App navigation"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
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

    act(() => resize?.(960));
    expect(document.body.style.overflow).toBe("auto");
  });

  it("restores focus outside an embedded shell after a dialog closes", async () => {
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

    function ExternalDialogFixture() {
      const [dialogOpen, setDialogOpen] = useState(false);
      return (
        <>
          <button
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            Open external dialog
          </button>
          <AppShell
            sidePanel={<button type="button">Sources</button>}
            sidePanelOpen
            sidebar={<button type="button">Projects</button>}
            sidebarOpen
          >
            Thread
          </AppShell>
          <Dialog
            onOpenChange={setDialogOpen}
            open={dialogOpen}
            showClose={false}
            title="External dialog"
          >
            <button
              onClick={() => setDialogOpen(false)}
              type="button"
            >
              Finish external dialog
            </button>
          </Dialog>
        </>
      );
    }

    render(<ExternalDialogFixture />);
    act(() => resize?.(960));
    const trigger = screen.getByRole("button", {
      name: "Open external dialog",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialogAction = await screen.findByRole("button", {
      name: "Finish external dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(dialogAction),
    );

    fireEvent.click(dialogAction);
    await waitFor(() =>
      expect(document.activeElement).toBe(trigger),
    );

    act(() => resize?.(700));
    expect(document.activeElement).toBe(trigger);
  });

  it("rejects hidden panel controls as dialog return targets", async () => {
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

    function HiddenDialogTriggerFixture() {
      const [dialogOpen, setDialogOpen] = useState(false);
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          sidePanel={
            <>
              <button
                onClick={() => setDialogOpen(true)}
                type="button"
              >
                Open panel dialog
              </button>
              <Dialog
                onOpenChange={setDialogOpen}
                open={dialogOpen}
                showClose={false}
                title="Panel dialog"
              >
                <button
                  onClick={() => setSidePanelOpen(false)}
                  type="button"
                >
                  Close panel behind dialog
                </button>
                <button
                  onClick={() => setDialogOpen(false)}
                  type="button"
                >
                  Finish panel dialog
                </button>
              </Dialog>
            </>
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button type="button">Main fallback</button>
        </AppShell>
      );
    }

    render(<HiddenDialogTriggerFixture />);
    const mainFallback = screen.getByRole("button", {
      name: "Main fallback",
    });
    mainFallback.focus();
    act(() => resize?.(960));
    const dialogTrigger = screen.getByRole("button", {
      name: "Open panel dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(dialogTrigger),
    );
    fireEvent.click(dialogTrigger);
    const closePanel = await screen.findByRole("button", {
      name: "Close panel behind dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(closePanel),
    );
    fireEvent.click(closePanel);
    expect(
      document
        .querySelector('[aria-label="Workspace panel"]')
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "Finish panel dialog" }),
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(mainFallback),
    );
  });

  it("retargets dialog return focus from a panel-owned portal", async () => {
    function PortalDialogTriggerFixture() {
      const [dialogOpen, setDialogOpen] = useState(false);
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          sidePanel={
            <>
              <Popover
                initialFocus="first"
                label="Panel actions"
                role="menu"
                trigger={<button type="button">Open panel actions</button>}
              >
                <button
                  onClick={() => setDialogOpen(true)}
                  role="menuitem"
                  tabIndex={-1}
                  type="button"
                >
                  Open portalled dialog
                </button>
              </Popover>
              <Dialog
                onOpenChange={setDialogOpen}
                open={dialogOpen}
                showClose={false}
                title="Portalled panel dialog"
              >
                <button
                  onClick={() => setSidePanelOpen(false)}
                  type="button"
                >
                  Hide panel behind dialog
                </button>
                <button
                  onClick={() => setDialogOpen(false)}
                  type="button"
                >
                  Finish portalled dialog
                </button>
              </Dialog>
            </>
          }
          sidePanelOpen={sidePanelOpen}
        >
          <button type="button">Main portal fallback</button>
        </AppShell>
      );
    }

    render(<PortalDialogTriggerFixture />);
    const mainFallback = screen.getByRole("button", {
      name: "Main portal fallback",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Open panel actions" }),
    );
    const portalItem = await screen.findByRole("menuitem", {
      name: "Open portalled dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(portalItem),
    );
    fireEvent.click(portalItem);

    const hidePanel = await screen.findByRole("button", {
      name: "Hide panel behind dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(hidePanel),
    );
    fireEvent.click(hidePanel);
    await waitFor(() =>
      expect(
        screen.queryByRole("menuitem", {
          name: "Open portalled dialog",
        }),
      ).toBeNull(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Finish portalled dialog" }),
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(mainFallback),
    );
  });

  it("retargets main portal dialog focus across responsive blocking", async () => {
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

    function ResponsivePortalDialogFixture() {
      const [dialogOpen, setDialogOpen] = useState(false);
      const [sidePanelOpen, setSidePanelOpen] = useState(true);
      return (
        <AppShell
          onSidePanelOpenChange={setSidePanelOpen}
          sidePanel={<button type="button">Sources</button>}
          sidePanelOpen={sidePanelOpen}
        >
          <Popover
            initialFocus="first"
            label="Main actions"
            role="menu"
            trigger={<button type="button">Open main actions</button>}
          >
            <button
              onClick={() => setDialogOpen(true)}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              Open main dialog
            </button>
          </Popover>
          <Dialog
            onOpenChange={setDialogOpen}
            open={dialogOpen}
            showClose={false}
            title="Main portal dialog"
          >
            <button
              onClick={() => setSidePanelOpen(false)}
              type="button"
            >
              Close workspace behind dialog
            </button>
            <button
              onClick={() => setDialogOpen(false)}
              type="button"
            >
              Finish main dialog
            </button>
          </Dialog>
        </AppShell>
      );
    }

    render(<ResponsivePortalDialogFixture />);
    const mainTrigger = screen.getByRole("button", {
      name: "Open main actions",
    });
    fireEvent.click(mainTrigger);
    const portalItem = await screen.findByRole("menuitem", {
      name: "Open main dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(portalItem),
    );
    fireEvent.click(portalItem);

    const closeWorkspace = await screen.findByRole("button", {
      name: "Close workspace behind dialog",
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(closeWorkspace),
    );
    act(() => resize?.(960));
    await waitFor(() =>
      expect(
        screen.queryByRole("menuitem", { name: "Open main dialog" }),
      ).toBeNull(),
    );
    fireEvent.click(closeWorkspace);
    fireEvent.click(
      screen.getByRole("button", { name: "Finish main dialog" }),
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(mainTrigger),
    );
  });

  it("focuses the selected roving tab in a responsive side panel", () => {
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
        sidePanel={
          <WorkspacePanel
            activeTabId="review"
            label="Workspace"
            onActiveTabChange={() => undefined}
            tabs={[
              {
                content: "Source content",
                id: "sources",
                label: "Sources",
              },
              {
                content: "Review content",
                id: "review",
                label: "Review",
              },
            ]}
          />
        }
        sidePanelOpen
      >
        <button type="button">Composer</button>
      </AppShell>,
    );

    const composer = screen.getByRole("button", { name: "Composer" });
    composer.focus();
    act(() => resize?.(960));

    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Review", selected: true }),
    );
    expect(
      screen.getByRole("tab", { name: "Sources", selected: false })
        .getAttribute("tabindex"),
    ).toBe("-1");
  });

  it("focuses a responsive side panel when no control is active", () => {
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
        sidePanel={
          <>
            <button hidden type="button">
              Hidden source
            </button>
            <div aria-hidden="true">
              <button type="button">Aria-hidden source</button>
            </div>
            <button type="button">Sources</button>
          </>
        }
        sidePanelOpen
      >
        <button type="button">Composer</button>
      </AppShell>,
    );

    expect(document.activeElement).toBe(document.body);
    act(() => resize?.(960));

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );
  });

  it("restores bottom-panel focus to an open responsive side panel", () => {
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

    function BottomPanelFixture() {
      const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
      return (
        <AppShell
          bottomPanel={
            <button
              onClick={() => setBottomPanelOpen(false)}
              type="button"
            >
              Close terminal
            </button>
          }
          bottomPanelOpen={bottomPanelOpen}
          sidePanel={<button type="button">Sources</button>}
          sidePanelOpen
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<BottomPanelFixture />);
    act(() => resize?.(960));
    const sidePanelControl = screen.getByRole("button", {
      name: "Sources",
    });
    expect(document.activeElement).toBe(sidePanelControl);

    const closeBottomPanel = screen.getByRole("button", {
      name: "Close terminal",
    });
    closeBottomPanel.focus();
    fireEvent.click(closeBottomPanel);

    expect(document.activeElement).toBe(sidePanelControl);
    expect(
      screen
        .getByRole("main", { name: "Conversation" })
        .hasAttribute("inert"),
    ).toBe(true);
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
          windowChrome={<button type="button">Chrome navigation</button>}
        >
          <button type="button">Composer</button>
        </AppShell>
      );
    }

    render(<ResponsiveFixture />);

    const windowChrome = document.querySelector(
      ".codex-ui-app-shell__window-chrome",
    )!;
    const composer = screen.getByRole("button", { name: "Composer" });
    composer.focus();
    act(() => resize?.(960));
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
    expect(windowChrome.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );

    const terminal = screen.getByRole("button", { name: "Terminal" });
    act(() => resize?.(1_600));
    expect(windowChrome.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );
    terminal.focus();
    act(() => resize?.(960));
    expect(document.activeElement).toBe(terminal);

    const sidePanelBackdrop = screen.getByRole("button", {
      name: "Close workspace panel",
    });
    sidePanelBackdrop.focus();
    act(() => resize?.(1_600));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Sources" }),
    );

    act(() => resize?.(960));
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
    expect(windowChrome.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Projects" }),
    );

    const sidebarBackdrop = screen.getByRole("button", {
      name: "Close navigation sidebar",
    });
    sidebarBackdrop.focus();
    act(() => resize?.(960));
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

  it("closes window chrome portals when a responsive modal takes over", async () => {
    const renderShell = (layoutMode: "wide" | "medium") => (
      <AppShell
        layoutMode={layoutMode}
        onSidePanelOpenChange={() => undefined}
        sidePanel={<button type="button">Sources</button>}
        sidePanelOpen
        sidebar={<button type="button">Projects</button>}
        sidebarOpen
        windowChrome={
          <Popover
            defaultOpen
            label="Chrome history"
            trigger={<button type="button">History</button>}
          >
            <button type="button">Previous route</button>
          </Popover>
        }
      >
        <button type="button">Composer</button>
      </AppShell>
    );
    const { rerender } = render(renderShell("wide"));

    expect(
      screen.getByRole("dialog", { name: "Chrome history" }),
    ).toBeTruthy();
    rerender(renderShell("medium"));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Chrome history" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("button", { name: "History" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("false");
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

  it("models fixed primary navigation, collapsible collections, and footer account actions", () => {
    const onExpandedChange = vi.fn();
    render(
      <AppSidebar
        footer={
          <AppSidebarFooter
            account="Demo account"
            accountAvatar="D"
            accountButtonProps={{
              "aria-expanded": false,
              "aria-haspopup": "menu",
            }}
            actions={<button type="button">Settings</button>}
            status="Connected"
          />
        }
        header="Codex"
        primaryNavigation={
          <AppSidebarItem leading="＋">New task</AppSidebarItem>
        }
        titlebarInset
      >
        <AppSidebarSection
          collapsible
          kind="projects"
          onExpandedChange={onExpandedChange}
          title={<span>Projects</span>}
          toggleLabel="Toggle projects"
        >
          <AppSidebarItem depth={1}>codex-ui-kit</AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );

    expect(screen.getByRole("button", { name: "New task" })).toBeTruthy();
    expect(
      document
        .querySelector(".codex-ui-app-sidebar")
        ?.hasAttribute("data-titlebar-inset"),
    ).toBe(true);
    const toggle = screen.getByRole("button", {
      name: "Toggle projects",
    });
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Projects",
    });
    expect(heading.contains(toggle)).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "codex-ui-kit" })).toBeNull();
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole("button", { name: "Demo account Connected" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Settings" }),
    ).toBeTruthy();
  });

  it("lets a menu wrap the footer account trigger without duplicating its markup", async () => {
    render(
      <AppSidebarFooter
        account="Demo account"
        accountAvatar="D"
        renderAccountTrigger={(trigger) => (
          <Popover label="Account menu" role="menu" trigger={trigger}>
            <button role="menuitem" type="button">
              Usage remaining
            </button>
          </Popover>
        )}
      />,
    );

    const account = screen.getByRole("button", { name: "Demo account" });
    expect(account.classList.contains("codex-ui-app-sidebar-footer__account")).toBe(
      true,
    );
    fireEvent.click(account);
    expect(screen.getByRole("menu", { name: "Account menu" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(account));
  });

  it("keeps titleless collapsible content reachable", () => {
    const { container } = render(
      <AppSidebar>
        <AppSidebarSection collapsible defaultExpanded={false}>
          <AppSidebarItem>Reachable task</AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );

    expect(
      screen.getByRole("button", { name: "Reachable task" }),
    ).toBeTruthy();
    expect(
      container
        .querySelector(".codex-ui-app-sidebar__section")
        ?.hasAttribute("data-collapsible"),
    ).toBe(false);
    expect(
      container
        .querySelector(".codex-ui-app-sidebar__items")
        ?.hasAttribute("hidden"),
    ).toBe(false);
  });

  it("keeps row actions separate from navigation activation and exposes lifecycle status", () => {
    const onOpen = vi.fn();
    const onRename = vi.fn();
    render(
      <AppSidebar>
        <AppSidebarSection kind="threads" title="Recents">
          <AppSidebarItem
            actions={
              <button onClick={onRename} type="button">
                Rename
              </button>
            }
            actionsLabel="Parity task actions"
            depth={1}
            onClick={onOpen}
            selected
            status="running"
            statusLabel="Task is running"
          >
            Parity task
          </AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );

    const task = screen.getByRole("button", { name: "Parity task" });
    expect(task.getAttribute("aria-current")).toBe("page");
    expect(task.getAttribute("data-depth")).toBe("1");
    expect(task.getAttribute("data-status")).toBe("running");
    expect(screen.getByRole("status", { name: "Task is running" })).toBeTruthy();
    expect(
      screen.getByRole("toolbar", { name: "Parity task actions" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(task);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("groups project tasks behind a focus-stable project row", () => {
    const onExpandedChange = vi.fn();
    render(
      <AppSidebar>
        <AppSidebarSection kind="pinned" title="Pinned">
          <AppSidebarProjectGroup
            actions={<button type="button">More</button>}
            actionsLabel="Demo project actions"
            defaultExpanded={false}
            label="Demo project"
            leading="Folder"
            onExpandedChange={onExpandedChange}
          >
            <AppSidebarItem depth={1}>Nested task</AppSidebarItem>
          </AppSidebarProjectGroup>
        </AppSidebarSection>
      </AppSidebar>,
    );

    const project = screen.getByRole("button", { name: "Demo project" });
    expect(project.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Nested task" })).toBeNull();
    expect(
      screen.getByRole("toolbar", { name: "Demo project actions" }),
    ).toBeTruthy();

    project.focus();
    fireEvent.click(project);
    expect(project.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Nested task" })).toBeTruthy();
    expect(document.activeElement).toBe(project);
    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("preserves the focused navigation button across lifecycle status changes", () => {
    const { rerender } = render(
      <AppSidebar>
        <AppSidebarSection kind="threads" title="Recents">
          <AppSidebarItem status="idle">Parity task</AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );
    const task = screen.getByRole("button", { name: "Parity task" });
    task.focus();

    rerender(
      <AppSidebar>
        <AppSidebarSection kind="threads" title="Recents">
          <AppSidebarItem
            status="running"
            statusLabel="Task is running"
          >
            Parity task
          </AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );
    expect(screen.getByRole("button", { name: "Parity task" })).toBe(task);
    expect(document.activeElement).toBe(task);

    rerender(
      <AppSidebar>
        <AppSidebarSection kind="threads" title="Recents">
          <AppSidebarItem status="idle">Parity task</AppSidebarItem>
        </AppSidebarSection>
      </AppSidebar>,
    );
    expect(screen.getByRole("button", { name: "Parity task" })).toBe(task);
    expect(document.activeElement).toBe(task);
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
        actions={<button type="button">Open in browser</button>}
        activeTabId="sources"
        label="Workspace"
        onActiveTabChange={onActiveTabChange}
        onClose={onClose}
        onCloseTab={onCloseTab}
        onExpandedChange={onExpandedChange}
        onOpenTab={onOpenTab}
        tabsLabel="Workspace view"
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
    expect(
      screen.getByRole("tablist", { name: "Workspace view" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open in browser" }),
    ).toBeTruthy();

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

  it("exposes a close control for every closable tab", async () => {
    function PerTabCloseFixture() {
      const [activeTabId, setActiveTabId] = useState("terminal-2");
      const [tabs, setTabs] = useState([
        {
          content: "First terminal",
          id: "terminal-1",
          label: "Workspace 1",
        },
        {
          content: "Second terminal",
          id: "terminal-2",
          label: "Workspace 2",
        },
        {
          closable: false,
          content: "Pinned terminal",
          id: "terminal-pinned",
          label: "Pinned",
        },
      ]);
      return (
        <WorkspacePanel
          activeTabId={activeTabId}
          label="Terminal"
          onActiveTabChange={setActiveTabId}
          onCloseTab={(id) => {
            setTabs((currentTabs) => {
              const closingIndex = currentTabs.findIndex(
                (tab) => tab.id === id,
              );
              const remainingTabs = currentTabs.filter(
                (tab) => tab.id !== id,
              );
              if (id === activeTabId) {
                setActiveTabId(
                  remainingTabs[
                    Math.min(
                      Math.max(closingIndex, 0),
                      remainingTabs.length - 1,
                    )
                  ]?.id ?? "",
                );
              }
              return remainingTabs;
            });
          }}
          tabCloseButtons
          tabs={tabs}
        />
      );
    }

    render(<PerTabCloseFixture />);
    expect(
      screen.getByRole("button", { name: "Close Workspace 1 tab" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Close Workspace 2 tab" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Close Pinned tab" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Close active tab" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Close Workspace 2 tab" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("tab", {
          name: "Pinned",
          selected: true,
        }),
      ).toBeTruthy(),
    );
  });

  it("keeps an enabled tab reachable when the active tab is disabled", () => {
    const onActiveTabChange = vi.fn();
    render(
      <WorkspacePanel
        activeTabId="sources"
        label="Workspace"
        onActiveTabChange={onActiveTabChange}
        tabs={[
          {
            content: "Source content",
            disabled: true,
            id: "sources",
            label: "Sources",
          },
          { content: "Review content", id: "review", label: "Review" },
        ]}
      />,
    );

    const sourcesTab = screen.getByRole("tab", { name: "Sources" });
    const reviewTab = screen.getByRole("tab", { name: "Review" });
    expect(sourcesTab.getAttribute("aria-selected")).toBe("true");
    expect(sourcesTab.getAttribute("tabindex")).toBe("-1");
    expect(reviewTab.getAttribute("aria-selected")).toBe("false");
    expect(reviewTab.getAttribute("tabindex")).toBe("0");

    reviewTab.focus();
    fireEvent.keyDown(reviewTab, { key: "Home" });
    expect(document.activeElement).toBe(reviewTab);
    expect(onActiveTabChange).toHaveBeenCalledWith("review");
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
