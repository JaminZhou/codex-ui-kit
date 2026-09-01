// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PluginDetailBreadcrumb,
  PluginDetailPage,
  type PluginDetailAppItem,
  type PluginDetailSuggestion,
} from "../src";

afterEach(cleanup);

const suggestions: readonly PluginDetailSuggestion[] = [
  {
    content: "Summarize the current pull request",
    id: "summary",
    title: "GitHub",
  },
];

const apps: readonly PluginDetailAppItem[] = [
  {
    description: "Access repositories, issues, and pull requests.",
    id: "github",
    status: "connected",
    title: "GitHub",
  },
  {
    description: "Workspace-specific GitHub connector.",
    id: "enterprise",
    status: "locked",
    statusLabel: "Workspace connection unavailable",
    title: "GitHub Enterprise",
  },
];

describe("PluginDetail", () => {
  it("renders the installed detail composition and delegates safe actions", () => {
    const onCopyLink = vi.fn();
    const onSuggestionOpen = vi.fn();
    const onTryNow = vi.fn();
    render(
      <PluginDetailPage
        apps={apps}
        description="Triage PRs, issues, CI, and publish flows"
        installed
        onCopyLink={onCopyLink}
        onSuggestionOpen={onSuggestionOpen}
        onTryNow={onTryNow}
        suggestions={suggestions}
        summary="Use GitHub to inspect repositories."
        title="GitHub"
      />,
    );

    expect(screen.getByRole("heading", { name: "GitHub" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Apps 2" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    fireEvent.click(screen.getByRole("button", { name: "Try now" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /GitHub Summarize the current pull request/,
      }),
    );
    expect(onCopyLink).toHaveBeenCalledOnce();
    expect(onTryNow).toHaveBeenCalledOnce();
    expect(onSuggestionOpen).toHaveBeenCalledWith(suggestions[0]);
  });

  it("keeps uninstall and connection effects controlled", () => {
    const onDisconnect = vi.fn();
    const onReconnect = vi.fn();
    const onUninstall = vi.fn();
    render(
      <PluginDetailPage
        actionsMenuOpen
        apps={apps}
        connectionMenuOpen
        installed
        onDisconnect={onDisconnect}
        onReconnect={onReconnect}
        onUninstall={onUninstall}
        title="GitHub"
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Uninstall" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Reconnect" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Disconnect" }));
    expect(onUninstall).toHaveBeenCalledOnce();
    expect(onReconnect).toHaveBeenCalledOnce();
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("renders discovery without implying installation", () => {
    const onInstall = vi.fn();
    render(
      <PluginDetailPage
        apps={apps.slice(0, 1)}
        onInstall={onInstall}
        suggestions={suggestions}
        title="Gmail"
      />,
    );
    expect(screen.queryByRole("button", { name: "Try now" })).toBeNull();
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Install plugin" }));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("exposes information links and privacy disclosure", () => {
    render(
      <PluginDetailPage
        disclosure={
          <p>
            Connected data remains subject to the app&apos;s privacy policy.
          </p>
        }
        information={[
          { id: "capabilities", label: "Capabilities", value: "Interactive, Write" },
          {
            href: "https://example.com/privacy",
            id: "privacy",
            label: "Privacy Policy",
            linkLabel: "Open privacy policy",
          },
        ]}
        title="GitHub"
      />,
    );
    expect(screen.getByRole("heading", { name: "Information" })).toBeTruthy();
    expect(screen.getByText("Interactive, Write")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open privacy policy" })).toBeTruthy();
    expect(screen.getByText(/Connected data remains subject/)).toBeTruthy();
  });

  it("delegates breadcrumb navigation and Escape dismissal", () => {
    const onBack = vi.fn();
    const onActionsMenuOpenChange = vi.fn();
    const onConnectionMenuOpenChange = vi.fn();
    render(
      <>
        <PluginDetailBreadcrumb onBack={onBack} title="GitHub" />
        <PluginDetailPage
          actionsMenuOpen
          apps={apps}
          connectionMenuOpen
          installed
          onActionsMenuOpenChange={onActionsMenuOpenChange}
          onConnectionMenuOpenChange={onConnectionMenuOpenChange}
          title="GitHub"
        />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Plugins" }));
    fireEvent.keyDown(screen.getByRole("main"), { key: "Escape" });
    expect(onBack).toHaveBeenCalledOnce();
    expect(onActionsMenuOpenChange).toHaveBeenCalledWith(false);
    expect(onConnectionMenuOpenChange).toHaveBeenCalledWith(false);
  });
});
