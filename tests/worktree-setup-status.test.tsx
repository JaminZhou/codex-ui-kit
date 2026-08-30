// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorktreeSetupStatus } from "../src";

afterEach(cleanup);

describe("WorktreeSetupStatus", () => {
  it("renders the current failure steps, details disclosure, and actions", () => {
    const onExpandedChange = vi.fn();
    const onRetry = vi.fn();
    const onEditEnvironment = vi.fn();

    render(
      <WorktreeSetupStatus
        defaultExpanded
        details={"[info] Starting worktree creation\nfatal: setup failed"}
        editEnvironmentAction={{
          label: "Edit environment",
          onClick: onEditEnvironment,
        }}
        onExpandedChange={onExpandedChange}
        phase="failed"
        retryAction={{ label: "Retry", onClick: onRetry }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-phase")).toBe("failed");
    expect(alert.getAttribute("data-expanded")).toBe("true");
    expect(
      screen.getByRole("heading", { name: "Worktree setup failed" }),
    ).toBeTruthy();
    const progress = screen.getByRole("list", {
      name: "Worktree setup progress",
    });
    const steps = within(progress).getAllByRole("listitem");
    expect(steps[0]?.textContent).toBe("Completed: Preparing workspace");
    expect(steps[1]?.textContent).toBe("Failed: Checking out files");
    expect(screen.getByText(/fatal: setup failed/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Less details" }));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "More details" })).toBeTruthy();
    expect(screen.getByText(/fatal: setup failed/).closest("div")?.hidden).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit environment" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onEditEnvironment).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("announces creating progress and exposes local/cancel recovery actions", () => {
    const onWorkLocally = vi.fn();
    const onCancel = vi.fn();

    render(
      <WorktreeSetupStatus
        cancelAction={{ label: "Cancel", onClick: onCancel }}
        details="Preparing the isolated checkout"
        phase="creating"
        steps={[
          {
            id: "prepare",
            label: "Preparing workspace",
            status: "completed",
          },
          {
            id: "checkout",
            label: "Checking out files",
            status: "in-progress",
          },
        ]}
        workLocallyAction={{
          label: "Work locally",
          onClick: onWorkLocally,
        }}
      />,
    );

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getAllByRole("listitem")[1]?.textContent).toBe(
      "In progress: Checking out files",
    );
    expect(status.querySelectorAll("svg")).toHaveLength(6);

    fireEvent.click(screen.getByRole("button", { name: "Work locally" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onWorkLocally).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders the created handoff without a setup card", () => {
    render(
      <WorktreeSetupStatus
        createdDescription="Starting a task"
        phase="created"
      />,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Worktree created");
    expect(status.textContent).toContain("Starting a task");
    expect(status.querySelector(".codex-ui-worktree-setup__card")).toBeNull();
  });

  it("keeps controlled expansion owned by the caller", () => {
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <WorktreeSetupStatus
        details="Failure details"
        expanded={false}
        onExpandedChange={onExpandedChange}
        phase="failed"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "More details" }));
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "More details" })).toBeTruthy();

    rerender(
      <WorktreeSetupStatus
        details="Failure details"
        expanded
        onExpandedChange={onExpandedChange}
        phase="failed"
      />,
    );
    expect(screen.getByRole("button", { name: "Less details" })).toBeTruthy();
  });
});
