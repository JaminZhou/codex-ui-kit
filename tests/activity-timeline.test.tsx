// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActivityTimeline,
  AgentActivity,
  TurnDuration,
  formatTurnDuration,
} from "../src";

afterEach(cleanup);

describe("formatTurnDuration", () => {
  it.each([
    [0, "0s"],
    [999, "0s"],
    [1_000, "1s"],
    [59_999, "59s"],
    [60_000, "1m"],
    [61_000, "1m 1s"],
    [3_600_000, "1h"],
    [3_661_000, "1h 1m 1s"],
    [86_401_000, "1d 1s"],
  ])("formats %i milliseconds as %s", (durationMs, expected) => {
    expect(formatTurnDuration(durationMs)).toBe(expected);
  });
});

describe("TurnDuration", () => {
  it("renders the observed working, worked, and stopped language", () => {
    const { rerender } = render(
      <TurnDuration durationMs={999} status="working" />,
    );

    expect(screen.getByText("Working")).toBeTruthy();

    rerender(<TurnDuration durationMs={5_000} status="working" />);
    expect(screen.getByText("Working for 5s")).toBeTruthy();

    rerender(<TurnDuration durationMs={72_000} status="worked" />);
    expect(screen.getByText("Worked for 1m 12s")).toBeTruthy();

    rerender(<TurnDuration durationMs={8_000} status="stopped" />);
    expect(screen.getByText("You stopped after 8s")).toBeTruthy();
  });

  it("accepts timestamp inputs and custom labels", () => {
    render(
      <TurnDuration
        completedAtMs={64_000}
        startedAtMs={4_000}
        status="worked"
        workedLabel={(time) => `Completed in ${time}`}
      />,
    );

    expect(screen.getByText("Completed in 1m")).toBeTruthy();
  });
});

describe("ActivityTimeline", () => {
  it("uses the observed collapsed-count fallback and expands its activity group", () => {
    render(
      <ActivityTimeline collapsedCount={2}>
        <span>Grouped activity</span>
      </ActivityTimeline>,
    );
    const toggle = screen.getByRole("button", { name: "Expand activity" });

    expect(screen.getByText("2 previous messages")).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Grouped activity")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Grouped activity")).toBeTruthy();
  });

  it("keeps persistent content visible while the collapsible content closes", () => {
    render(
      <ActivityTimeline
        defaultOpen
        persistentContent={<span>Current running activity</span>}
        preToggleContent={<span>Earlier assistant message</span>}
        summary="Worked for 12s"
      >
        <span>Completed activity</span>
      </ActivityTimeline>,
    );

    expect(screen.getByText("Earlier assistant message")).toBeTruthy();
    expect(screen.getByText("Current running activity")).toBeTruthy();
    expect(screen.getByText("Completed activity")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collapse activity" }));

    expect(screen.getByText("Current running activity")).toBeTruthy();
    expect(screen.queryByText("Completed activity")).toBeNull();
  });

  it("reports a controlled state change without drifting the rendered state", () => {
    const onOpenChange = vi.fn();
    render(
      <ActivityTimeline onOpenChange={onOpenChange} open={false} summary="Working">
        <span>Hidden work</span>
      </ActivityTimeline>,
    );
    const toggle = screen.getByRole("button", { name: "Expand activity" });

    fireEvent.click(toggle);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Hidden work")).toBeNull();
  });

  it("renders its content directly when the host hides the turn toggle", () => {
    render(
      <ActivityTimeline showToggle={false}>
        <span>Always visible activity</span>
      </ActivityTimeline>,
    );

    expect(screen.getByText("Always visible activity")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("AgentActivity disclosure", () => {
  it("supports controlled detail and a host-provided indicator", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <AgentActivity
        indicator={<span aria-label="Custom activity state">●</span>}
        onOpenChange={onOpenChange}
        open={false}
        status="running"
        summary="Running command"
      >
        <span>Command output</span>
      </AgentActivity>,
    );

    const summary = container.querySelector("summary")!;
    fireEvent.click(summary);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(container.querySelector("details")?.open).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByLabelText("Custom activity state")).toBeTruthy();
    expect(container.querySelector(".codex-ui-status-indicator")).toBeNull();
  });
});
