// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src";

afterEach(cleanup);

describe("LoginPage", () => {
  it("delegates provider, API-key, device-code, and sign-up actions", () => {
    const onApiKeyChange = vi.fn();
    const onApiKeySubmit = vi.fn();
    const onDeviceCode = vi.fn();
    const onOpenBrowser = vi.fn();
    const onProviderSignIn = vi.fn();
    const onShowApiKey = vi.fn();
    const onSignUp = vi.fn();
    const { rerender } = render(
      <LoginPage
        onDeviceCode={onDeviceCode}
        onProviderSignIn={onProviderSignIn}
        onShowApiKey={onShowApiKey}
        onSignUp={onSignUp}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue to sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    fireEvent.click(screen.getByRole("button", { name: "Use device code" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in with an API key" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(onProviderSignIn).toHaveBeenCalledWith("google");
    expect(onDeviceCode).toHaveBeenCalledOnce();
    expect(onShowApiKey).toHaveBeenCalledOnce();
    expect(onSignUp).toHaveBeenCalledOnce();

    rerender(
      <LoginPage
        apiKeyValue="sk-test"
        mode="api-key"
        onApiKeyChange={onApiKeyChange}
        onApiKeySubmit={onApiKeySubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Enter your OpenAI API key"), {
      target: { value: "sk-updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onApiKeyChange).toHaveBeenCalledWith("sk-updated");
    expect(onApiKeySubmit).toHaveBeenCalledOnce();

    rerender(
      <LoginPage
        deviceCode="ABCD-EFGH"
        mode="device-code"
        onOpenBrowser={onOpenBrowser}
      />,
    );
    expect(screen.getByText("ABCD-EFGH")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open browser" }));
    expect(onOpenBrowser).toHaveBeenCalledOnce();
  });

  it("keeps loading, browser-pending, and error states explicit", () => {
    const onCancel = vi.fn();
    const onCopySignInLink = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = render(<LoginPage status="loading" />);
    expect(screen.getByRole("status").textContent).toContain("Loading…");
    rerender(
      <LoginPage
        canCopySignInLink
        mode="browser-pending"
        onCancel={onCancel}
        onCopySignInLink={onCopySignInLink}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel sign-in" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy sign-in link" }));
    rerender(<LoginPage errorMessage="Network unavailable" onRetry={onRetry} status="error" />);
    expect(screen.getByRole("alert").textContent).toContain("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCopySignInLink).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("locks authentication controls while disabled across modes", () => {
    const onCancel = vi.fn();
    const onDeviceCode = vi.fn();
    const onProviderSignIn = vi.fn();
    const onShowApiKey = vi.fn();
    const onSignUp = vi.fn();
    const { container, rerender } = render(
      <LoginPage
        disabled
        onCancel={onCancel}
        onDeviceCode={onDeviceCode}
        onProviderSignIn={onProviderSignIn}
        onShowApiKey={onShowApiKey}
        onSignUp={onSignUp}
      />,
    );

    expect(container.firstElementChild?.getAttribute("aria-disabled")).toBe("true");
    expect(container.firstElementChild?.getAttribute("data-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Continue to sign in" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in another way" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("button", { name: "Continue to sign in" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(<LoginPage apiKeyValue="sk-test" disabled mode="api-key" />);
    expect(screen.getByLabelText("Enter your OpenAI API key")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: "Continue" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(<LoginPage disabled mode="device-code" />);
    expect(screen.getByRole("button", { name: "Open browser" })).toHaveProperty(
      "disabled",
      true,
    );

    rerender(<LoginPage disabled status="error" />);
    expect(screen.getByRole("button", { name: "Try again" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(onCancel).not.toHaveBeenCalled();
    expect(onDeviceCode).not.toHaveBeenCalled();
    expect(onProviderSignIn).not.toHaveBeenCalled();
    expect(onShowApiKey).not.toHaveBeenCalled();
    expect(onSignUp).not.toHaveBeenCalled();
  });
});
