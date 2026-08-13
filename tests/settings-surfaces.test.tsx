// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GitSettingsPage,
  SettingsShell,
  type GitSettingsValue,
} from "../src";

afterEach(cleanup);

const sections = [
  {
    id: "coding",
    label: "Coding",
    items: [
      { id: "git", label: "Git", resultLabel: "Git" },
      {
        id: "hooks",
        keywords: ["git"],
        label: "Hooks",
        resultLabel: "Right before ChatGPT ends its turn",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    items: [{ id: "plugins", label: "Plugins" }],
  },
] as const;

function ShellFixture() {
  const [query, setQuery] = useState("");
  return (
    <SettingsShell
      onBack={() => undefined}
      onQueryChange={setQuery}
      onSelect={() => undefined}
      query={query}
      sections={sections}
      selectedId="git"
    >
      <h1>Git settings content</h1>
    </SettingsShell>
  );
}

const initialValue: GitSettingsValue = {
  alwaysForcePush: false,
  branchPrefix: "",
  commitInstructions: "",
  createDraftPullRequests: true,
  mergeMethod: "merge",
  pullRequestInstructions: "",
  reviewDelivery: "inline",
};

function GitFixture({ onSave = () => undefined }) {
  const [value, setValue] = useState(initialValue);
  return (
    <GitSettingsPage
      commitInstructionsDirty={Boolean(value.commitInstructions)}
      onChange={setValue}
      onSaveCommitInstructions={onSave}
      value={value}
    />
  );
}

describe("settings surfaces", () => {
  it("exposes separate Settings navigation and main landmarks", () => {
    render(<ShellFixture />);

    expect(screen.getByRole("navigation", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Git" }).getAttribute("aria-current"))
      .toBe("page");
    expect(screen.getByRole("button", { name: "Back to app" })).toBeTruthy();
  });

  it("returns grouped search results and restores the navigation", () => {
    render(<ShellFixture />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "git" },
    });
    expect(screen.getByText("Right before ChatGPT ends its turn")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plugins" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear settings search" }));
    expect(screen.getByRole("button", { name: "Plugins" })).toBeTruthy();
    expect(screen.getByRole("searchbox").getAttribute("value")).toBe("");
  });

  it("announces loading, error, and empty search states", () => {
    const { rerender } = render(
      <SettingsShell
        onBack={() => undefined}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        query=""
        sections={sections}
        selectedId="git"
        status="loading"
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Loading settings…");

    rerender(
      <SettingsShell
        onBack={() => undefined}
        onQueryChange={() => undefined}
        onSelect={() => undefined}
        query=""
        sections={sections}
        selectedId="git"
        status="error"
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("keeps Git preferences controlled with real switch and radio semantics", () => {
    render(<GitFixture />);

    const forcePush = screen.getByRole("switch", { name: "Always force push" });
    expect(forcePush.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(forcePush);
    expect(forcePush.getAttribute("aria-checked")).toBe("true");

    const merge = screen.getByRole("radio", { name: "Merge" });
    const squash = screen.getByRole("radio", { name: "Squash" });
    expect(merge.tabIndex).toBe(0);
    expect(squash.tabIndex).toBe(-1);
    merge.focus();
    fireEvent.keyDown(merge, { key: "ArrowRight" });
    expect(squash.getAttribute("aria-checked")).toBe("true");
    expect(merge.getAttribute("aria-checked")).toBe("false");
    expect(document.activeElement).toBe(squash);
    expect(merge.tabIndex).toBe(-1);
    expect(squash.tabIndex).toBe(0);

    fireEvent.keyDown(squash, { key: "ArrowRight" });
    expect(merge.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(merge);
  });

  it("enables instruction save only for a changed controlled value", () => {
    const onSave = vi.fn();
    render(<GitFixture onSave={onSave} />);

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    expect(saveButtons[0].hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Commit instructions" }), {
      target: { value: "Use conventional commits." },
    });
    expect(saveButtons[0].hasAttribute("disabled")).toBe(false);
    fireEvent.click(saveButtons[0]);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("keeps field ids instance-safe and disables saves without a host action", () => {
    render(
      <>
        <GitSettingsPage
          commitInstructionsDirty
          onChange={() => undefined}
          value={initialValue}
        />
        <GitSettingsPage onChange={() => undefined} value={initialValue} />
      </>,
    );

    const prefixes = screen.getAllByRole("textbox", { name: "Branch prefix" });
    expect(prefixes[0].id).not.toBe(prefixes[1].id);
    expect(
      screen
        .getAllByRole("button", { name: "Save" })[0]
        .hasAttribute("disabled"),
    ).toBe(true);
  });
});
