// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ScheduledTaskCreateMenu,
  ScheduledTaskEditor,
  ScheduledTasksPage,
  type ScheduledTaskItem,
  type ScheduledTaskSuggestion,
} from "../src";

afterEach(cleanup);

const tasks: readonly ScheduledTaskItem[] = [
  {
    id: "daily-brief",
    nextRun: "Tomorrow",
    schedule: "Weekdays at 8:00 AM",
    status: "active",
    title: "Daily brief",
  },
  {
    id: "paused-review",
    schedule: "Fridays at 4:00 PM",
    status: "paused",
    title: "Weekly review",
  },
];

const suggestions: readonly ScheduledTaskSuggestion[] = [
  {
    description: "Summarize your calendar and priorities",
    id: "suggestion-brief",
    schedule: "Weekdays at 8:00 AM",
    title: "Daily brief",
  },
];

describe("ScheduledTasks", () => {
  it("renders the current task route and delegates host-owned actions", () => {
    const onFilterChange = vi.fn();
    const onQueryChange = vi.fn();
    const onSuggestionAdd = vi.fn();
    const onTaskOpen = vi.fn();
    const onTaskToggle = vi.fn();
    render(
      <ScheduledTasksPage
        onFilterChange={onFilterChange}
        onQueryChange={onQueryChange}
        onSuggestionAdd={onSuggestionAdd}
        onTaskOpen={onTaskOpen}
        onTaskToggle={onTaskToggle}
        suggestions={suggestions}
        tasks={tasks}
      />,
    );

    expect(screen.getByRole("heading", { name: "Scheduled tasks" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search scheduled tasks"), {
      target: { value: "brief" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Active" }));
    fireEvent.click(screen.getByRole("button", { name: "Daily brief" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add Daily brief scheduled task" }),
    );
    expect(onQueryChange).toHaveBeenCalledWith("brief");
    expect(onFilterChange).toHaveBeenCalledWith("active");
    expect(onTaskOpen).toHaveBeenCalledWith(tasks[0]);
    expect(onTaskToggle).toHaveBeenCalledWith(tasks[0]);
    expect(onSuggestionAdd).toHaveBeenCalledWith(suggestions[0]);
  });

  it("filters without mutating source data and exposes the exact empty state", () => {
    render(
      <ScheduledTasksPage
        activeFilter="completed"
        query="missing"
        suggestions={suggestions}
        tasks={tasks}
      />,
    );
    expect(screen.getByText("No scheduled tasks found")).toBeTruthy();
    expect(tasks).toHaveLength(2);
    expect(suggestions).toHaveLength(1);
  });

  it("keeps unavailable and retry behavior controlled", () => {
    const onRetry = vi.fn();
    render(
      <ScheduledTasksPage
        onRetry={onRetry}
        status="unavailable"
        statusDescription="Scheduled tasks are disabled by your organization."
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Scheduled tasks unavailable" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("opens the create split menu and delegates both choices", () => {
    const onCreateWithCodex = vi.fn();
    const onManualSetup = vi.fn();
    render(
      <ScheduledTaskCreateMenu
        onCreateWithCodex={onCreateWithCodex}
        onManualSetup={onManualSetup}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create scheduled task options" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Set up manually" }));
    expect(onCreateWithCodex).toHaveBeenCalledOnce();
    expect(onManualSetup).toHaveBeenCalledOnce();
  });

  it("keeps the editor controlled and reports field selection", () => {
    const onCancel = vi.fn();
    const onFieldChange = vi.fn();
    const onNameChange = vi.fn();
    const onPromptChange = vi.fn();
    const onSubmit = vi.fn();
    const detailsField = {
      id: "run-location",
      label: "Runs on",
      options: [
        { label: "This device", value: "device" },
        { label: "Cloud", value: "cloud" },
      ],
      value: "This device",
      valueText: "device",
    };
    render(
      <ScheduledTaskEditor
        detailsFields={[detailsField]}
        name="Daily brief"
        onCancel={onCancel}
        onFieldChange={onFieldChange}
        onNameChange={onNameChange}
        onPromptChange={onPromptChange}
        onSubmit={onSubmit}
        prompt="Summarize priorities"
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "New name" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), {
      target: { value: "New prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Runs on: device" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Cloud" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onNameChange).toHaveBeenCalledWith("New name");
    expect(onPromptChange).toHaveBeenCalledWith("New prompt");
    expect(onFieldChange).toHaveBeenCalledWith(detailsField, "cloud");
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
