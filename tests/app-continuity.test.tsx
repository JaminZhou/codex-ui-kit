// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import {
  AppNotificationRegion,
  AppRouteOutlet,
  AppServerCrashRecovery,
  AppShell,
  AppWindowChrome,
  Dialog,
} from "../src";

afterEach(cleanup);

describe("AppWindowChrome", () => {
  it("exposes host-owned sidebar and history controls", () => {
    const onSidebar = vi.fn();
    const onBack = vi.fn();
    render(
      <AppShell
        sidebar="Navigation"
        sidebarOpen
        windowChrome={
          <AppWindowChrome
            backAction={{ label: "Back", onClick: onBack }}
            forwardAction={{ disabled: true, label: "Forward" }}
            sidebarAction={{
              "aria-expanded": true,
              label: "Hide sidebar",
              onClick: onSidebar,
            }}
            title="Pull requests"
          />
        }
      >
        Route
      </AppShell>,
    );

    const shell = document.querySelector(".codex-ui-app-shell");
    expect(shell?.getAttribute("data-window-chrome")).toBe("true");
    expect(screen.getByText("Pull requests")).toBeTruthy();
    const sidebar = screen.getByRole("button", { name: "Hide sidebar" });
    expect(sidebar.getAttribute("aria-expanded")).toBe("true");
    expect(
      (screen.getByRole("button", { name: "Forward" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(sidebar);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onSidebar).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe("AppServerCrashRecovery", () => {
  it("exposes the observed fatal recovery copy and host actions", () => {
    const onDocumentation = vi.fn();
    const onUpdate = vi.fn();
    const onConfiguration = vi.fn();
    const onRestart = vi.fn();
    render(
      <AppServerCrashRecovery
        configurationAction={{
          label: "Open Config.toml",
          onClick: onConfiguration,
        }}
        documentationAction={{
          label: "documentation",
          onClick: onDocumentation,
        }}
        restartAction={{ label: "Restart", onClick: onRestart }}
        updateAction={{ label: "Update ChatGPT", onClick: onUpdate }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("ChatGPT stopped unexpectedly");
    expect(alert.textContent).toContain("Restart ChatGPT to continue");
    fireEvent.click(screen.getByRole("button", { name: "documentation" }));
    fireEvent.click(screen.getByRole("button", { name: "Update ChatGPT" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Config.toml" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));
    expect(onDocumentation).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onConfiguration).toHaveBeenCalledOnce();
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("allows hosts to replace copy without exposing private transport details", () => {
    render(
      <AppServerCrashRecovery
        description="Restart the host service."
        heading="Service unavailable"
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Service unavailable",
    );
    expect(screen.getByText("Restart the host service.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("AppRouteOutlet", () => {
  it("keeps stale content visible behind a polite update notice", () => {
    render(
      <AppRouteOutlet status="stale">
        <button type="button">Open cached pull request</button>
      </AppRouteOutlet>,
    );

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Updates are delayed")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open cached pull request" }),
    ).toBeTruthy();
  });

  it("announces offline and invokes retry without preserving route content", () => {
    const onRetry = vi.fn();
    render(
      <AppRouteOutlet
        actions={[{ label: "Try again", onClick: onRetry, primary: true }]}
        status="offline"
      >
        <button type="button">Private cached content</button>
      </AppRouteOutlet>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Private cached content" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps live route status outside reconnecting busy content", () => {
    const { rerender } = render(<AppRouteOutlet status="loading" />);
    const loading = screen.getByRole("status");
    expect(loading.textContent).toContain("Loading");
    expect(loading.closest("[aria-busy]")).toBeNull();

    rerender(
      <AppRouteOutlet status="reconnecting">Cached route</AppRouteOutlet>,
    );
    const reconnecting = screen.getByRole("status");
    const cachedRoute = screen.getByText("Cached route");
    expect(reconnecting.closest("[aria-busy]")).toBeNull();
    expect(cachedRoute.getAttribute("aria-busy")).toBe("true");
  });

  it("keeps the ready route subtree mounted through continuity states", () => {
    const { rerender } = render(
      <AppRouteOutlet status="ready">
        <input aria-label="Draft" defaultValue="Preserve me" />
      </AppRouteOutlet>,
    );
    const draft = screen.getByRole("textbox", { name: "Draft" });
    draft.focus();

    rerender(
      <AppRouteOutlet status="stale">
        <input aria-label="Draft" defaultValue="Preserve me" />
      </AppRouteOutlet>,
    );
    expect(screen.getByRole("textbox", { name: "Draft" })).toBe(draft);
    expect(document.activeElement).toBe(draft);

    rerender(
      <AppRouteOutlet status="reconnecting">
        <input aria-label="Draft" defaultValue="Preserve me" />
      </AppRouteOutlet>,
    );
    expect(screen.getByRole("textbox", { name: "Draft" })).toBe(draft);
    expect(document.activeElement).toBe(draft);
  });
});

describe("AppNotificationRegion", () => {
  it("portals global feedback with current live-region and dismissal semantics", async () => {
    const onDismiss = vi.fn();
    render(
      <AppNotificationRegion
        notifications={[
          {
            description: "The route could not refresh.",
            heading: "Connection lost",
            id: "connection",
            onDismiss,
            tone: "error",
          },
        ]}
      />,
    );

    const region = await screen.findByRole("region", {
      name: "Notifications alt+T",
    });
    expect(region.parentElement).toBe(document.body);
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(screen.queryByRole("alert")).toBeNull();
    const toaster = region.querySelector("[data-sonner-toaster]");
    const toast = region.querySelector("[data-sonner-toast]");
    expect(toaster?.getAttribute("data-sonner-theme")).toBe("light");
    expect(toast?.getAttribute("tabindex")).toBe("0");
    expect(toast?.getAttribute("data-promise")).toBe("false");
    expect(toast?.getAttribute("data-removed")).toBe("false");
    expect(toast?.getAttribute("data-swipe-out")).toBe("false");
    expect(toast?.getAttribute("data-swiped")).toBe("false");
    expect(toast?.getAttribute("data-swiping")).toBe("false");
    expect(
      toast
        ?.querySelector(".codex-ui-app-notification__leading svg")
        ?.getAttribute("viewBox"),
    ).toBe("0 0 20 20");
    expect(
      toast
        ?.querySelector(".codex-ui-app-notification__leading path")
        ?.getAttribute("d"),
    ).toBe(
      "M7.231 7.231a.665.665 0 0 1 .94 0L10 9.06l1.828-1.829.104-.085a.666.666 0 0 1 .921.922l-.084.104L10.94 10l1.829 1.828a.665.665 0 0 1-.94.94L10 10.94l-1.828 1.83a.665.665 0 0 1-.94-.94L9.06 10 7.23 8.172a.665.665 0 0 1 0-.94Z",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("keeps overflowed notifications mounted while collapsing visibility", async () => {
    render(
      <AppNotificationRegion
        maxVisible={2}
        notifications={[
          { heading: "First", id: "first" },
          { heading: "Second", id: "second" },
          { heading: "Third", id: "third" },
          { heading: "Fourth", id: "fourth" },
        ]}
      />,
    );

    const region = await screen.findByRole("region", {
      name: "Notifications alt+T",
    });
    expect(region.getAttribute("data-total-count")).toBe("4");
    expect(region.getAttribute("data-visible-count")).toBe("2");
    expect(region.getAttribute("data-hidden-count")).toBe("2");
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("Third")).toBeTruthy();
    expect(screen.getByText("Fourth")).toBeTruthy();
    expect(
      Array.from(region.querySelectorAll("[data-sonner-toast]"), (toast) =>
        toast.getAttribute("data-visible"),
      ),
    ).toEqual(["true", "true", "false", "false"]);
    expect(screen.queryByText("2 more notifications")).toBeNull();
  });

  it("moves focus to the next queued control when the active item is removed", async () => {
    function Queue() {
      const [ids, setIds] = useState(["first", "second"]);
      return (
        <>
          <button type="button">Queue trigger</button>
          <AppNotificationRegion
            notifications={ids.map((id) => ({
              heading: id,
              id,
              onDismiss: () =>
                setIds((current) => current.filter((item) => item !== id)),
            }))}
          />
        </>
      );
    }

    render(<Queue />);
    const [firstDismiss] = await screen.findAllByRole("button", {
      name: "Close",
    });
    firstDismiss.focus();
    fireEvent.click(firstDismiss);

    await waitFor(() => {
      const remainingDismiss = screen.getByRole("button", {
        name: "Close",
      });
      expect(document.activeElement).toBe(remainingDismiss);
    });
  });

  it("keeps focus at the removed notification position", async () => {
    function Queue() {
      const [ids, setIds] = useState(["first", "second", "third"]);
      return (
        <AppNotificationRegion
          notifications={ids.map((id) => ({
            heading: id,
            id,
            onDismiss: () =>
              setIds((current) => current.filter((item) => item !== id)),
          }))}
        />
      );
    }

    render(<Queue />);
    const dismissButtons = await screen.findAllByRole("button", {
      name: "Close",
    });
    dismissButtons[1].focus();
    fireEvent.click(dismissButtons[1]);

    await waitFor(() => {
      const thirdNotification = screen
        .getByText("third")
        .closest(".codex-ui-app-notification");
      expect(document.activeElement).toBe(
        thirdNotification?.querySelector(
          ".codex-ui-app-notification__dismiss",
        ),
      );
    });
  });

  it("carries the triggering application theme into the body portal", async () => {
    const { rerender } = render(
      <div>
        <div data-theme="dark">
          <button type="button">Show update</button>
        </div>
        <div data-theme="light">
          <button type="button">Show warning</button>
        </div>
        <AppNotificationRegion notifications={[]} />
      </div>,
    );
    screen.getByRole("button", { name: "Show update" }).focus();

    rerender(
      <div>
        <div data-theme="dark">
          <button type="button">Show update</button>
        </div>
        <div data-theme="light">
          <button type="button">Show warning</button>
        </div>
        <AppNotificationRegion
          notifications={[
            {
              heading: "Connection restored",
              id: "restored",
            },
          ]}
        />
      </div>,
    );

    expect(
      (await screen.findByRole("region", {
        name: "Notifications alt+T",
      })).getAttribute("data-theme"),
    ).toBe("dark");

    screen.getByRole("button", { name: "Show warning" }).focus();
    rerender(
      <div>
        <div data-theme="dark">
          <button type="button">Show update</button>
        </div>
        <div data-theme="light">
          <button type="button">Show warning</button>
        </div>
        <AppNotificationRegion
          notifications={[
            {
              description: "No visual replacement occurred.",
              heading: "Connection restored",
              id: "restored",
            },
          ]}
        />
      </div>,
    );
    expect(
      screen
        .getByRole("region", { name: "Notifications alt+T" })
        .getAttribute("data-theme"),
    ).toBe("dark");

    rerender(
      <div>
        <div data-theme="dark">
          <button type="button">Show update</button>
        </div>
        <div data-theme="light">
          <button type="button">Show warning</button>
        </div>
        <AppNotificationRegion
          notifications={[
            {
              heading: "Connection interrupted",
              id: "warning",
            },
          ]}
        />
      </div>,
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("region", { name: "Notifications alt+T" })
          .getAttribute("data-theme"),
      ).toBe("light"),
    );
  });

  it("keeps dialog-owned notification actions inside the focus trap", async () => {
    render(
      <Dialog
        onOpenChange={() => undefined}
        open
        title="Connection settings"
      >
        <button type="button">Save settings</button>
        <AppNotificationRegion
          notifications={[
            {
              heading: "Connection restored",
              id: "restored",
              onDismiss: () => undefined,
            },
          ]}
        />
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Connection settings",
    });
    const dialogId = dialog
      .closest<HTMLElement>("[data-codex-ui-dialog-id]")
      ?.dataset.codexUiDialogId;
    const region = await screen.findByRole("region", {
      name: "Notifications alt+T",
    });
    expect(region.dataset.codexUiDialogOwner).toBe(dialogId);

    const dismiss = screen.getByRole("button", {
      name: "Close",
    });
    dismiss.focus();
    fireEvent.keyDown(dismiss, { key: "Tab" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close dialog" }),
    );
  });
});
