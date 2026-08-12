// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EnvironmentSettingsPage } from "../src";

afterEach(cleanup);

describe("environment settings surfaces", () => {
  it("renders the current local-unavailable route with linked status copy", () => {
    render(<EnvironmentSettingsPage status="unavailable" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Environments" }),
    ).toBeTruthy();
    const status = screen.getByRole("status", {
      name: "Local environments unavailable",
    });
    expect(status.textContent).toBe(
      "We could not load local environment settings for this project",
    );
    expect(status.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("separates ready content and error announcements", () => {
    const { rerender } = render(
      <EnvironmentSettingsPage>
        <button type="button">Create environment</button>
      </EnvironmentSettingsPage>,
    );
    expect(
      screen.getByRole("button", { name: "Create environment" }),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <EnvironmentSettingsPage
        message="Environment service failed"
        status="error"
        statusHeading="Remote environment failed"
      />,
    );
    expect(
      screen.getByRole("alert", { name: "Remote environment failed" }),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Environment service failed",
    );
  });
});
