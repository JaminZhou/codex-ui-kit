// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WorktreeSettingsPage,
  type ManagedWorktreeEntry,
  type WorktreeSettingsValue,
} from "../src";

afterEach(cleanup);

const entry: ManagedWorktreeEntry = {
  id: "managed-a1b2",
  projectPath: "/Users/demo/Developer/codex-ui-kit",
  projectTextValue: "/Users/demo/Developer/codex-ui-kit",
  worktreePath: "/Users/demo/.codex/worktrees/a1b2/codex-ui-kit",
};

const initialValue: WorktreeSettingsValue = {
  autoDelete: true,
  autoDeleteLimit: 15,
  fetchUpstream: false,
  root: "",
};

function Fixture({
  entries = [entry],
  onDelete = () => undefined,
  onNewChat = () => undefined,
  onRefresh = () => undefined,
}: {
  entries?: readonly ManagedWorktreeEntry[];
  onDelete?: (candidate: ManagedWorktreeEntry) => void;
  onNewChat?: (candidate: ManagedWorktreeEntry) => void;
  onRefresh?: (projectTextValue: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <WorktreeSettingsPage
      entries={entries}
      onChange={setValue}
      onDelete={onDelete}
      onNewChat={onNewChat}
      onRefresh={onRefresh}
      rootPlaceholder="/Users/demo/.codex/worktrees"
      value={value}
    />
  );
}

describe("WorktreeSettingsPage", () => {
  it("controls the four observed preferences", () => {
    render(<Fixture />);

    fireEvent.change(screen.getByRole("textbox", { name: "Worktree root" }), {
      target: { value: "/tmp/worktrees" },
    });
    expect(
      (screen.getByRole("textbox", { name: "Worktree root" }) as HTMLInputElement)
        .value,
    ).toBe("/tmp/worktrees");

    const fetchSwitch = screen.getByRole("switch", {
      name: "Always fetch upstream before creating worktrees",
    });
    expect(fetchSwitch.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(fetchSwitch);
    expect(fetchSwitch.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(
      screen.getByRole("switch", { name: "Automatically delete old worktrees" }),
    );
    expect(
      screen
        .getByRole("switch", { name: "Automatically delete old worktrees" })
        .getAttribute("aria-checked"),
    ).toBe("false");

    fireEvent.change(screen.getByRole("spinbutton", { name: "Auto-delete limit" }), {
      target: { value: "21" },
    });
    expect(
      (screen.getByRole("spinbutton", { name: "Auto-delete limit" }) as HTMLInputElement)
        .value,
    ).toBe("21");
  });

  it("routes refresh, new-chat, and immediate delete actions", () => {
    const onDelete = vi.fn();
    const onNewChat = vi.fn();
    const onRefresh = vi.fn();
    render(
      <Fixture
        onDelete={onDelete}
        onNewChat={onNewChat}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledWith(entry.projectTextValue);

    fireEvent.click(
      screen.getByRole("button", { name: "New chat in this worktree" }),
    );
    expect(onNewChat).toHaveBeenCalledWith(entry);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(entry);
  });

  it("groups cards by project and exposes conversations or the empty state", () => {
    const second: ManagedWorktreeEntry = {
      ...entry,
      conversations: [{ id: "chat-1", label: "Continue UI parity" }],
      id: "managed-c3d4",
      worktreePath: "/Users/demo/.codex/worktrees/c3d4/codex-ui-kit",
    };
    const { rerender } = render(<Fixture entries={[entry, second]} />);

    expect(
      screen.getAllByRole("region", {
        name: "Managed worktrees for /Users/demo/Developer/codex-ui-kit",
      }),
    ).toHaveLength(1);
    expect(screen.getByText("Continue UI parity")).toBeTruthy();
    expect(screen.getByText("No conversations linked to this worktree.")).toBeTruthy();

    rerender(<Fixture entries={[]} />);
    expect(screen.getByRole("status").textContent).toBe("No managed worktrees.");
  });
});
