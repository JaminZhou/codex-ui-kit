// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppNotificationRegion,
  AppRouteOutlet,
  AppShell,
  AppWindowChrome,
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
});

describe("AppNotificationRegion", () => {
  it("portals global feedback with alert and dismissal semantics", async () => {
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
      name: "Notifications",
    });
    expect(region.parentElement).toBe(document.body);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
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
        name: "Notifications",
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
          .getByRole("region", { name: "Notifications" })
          .getAttribute("data-theme"),
      ).toBe("light"),
    );
  });
});
