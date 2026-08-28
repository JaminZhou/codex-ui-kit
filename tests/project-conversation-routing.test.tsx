// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BranchCreationDialog,
  ConversationContextBar,
  ConversationProjectListbox,
  ConversationRouteSelector,
  LocalEnvironmentDialog,
  Menu,
  MenuItem,
  NewConversationPromptGrid,
  NewConversationStart,
  ProjectConversationPage,
  ProjectIndex,
  WorktreeList,
} from "../src";

afterEach(cleanup);

function accessibleDescriptionText(element: Element) {
  return (element.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

describe("project conversation routing", () => {
  it("selects semantic new-conversation prompts and marks compact overflow", () => {
    const onSelect = vi.fn();
    render(
      <NewConversationPromptGrid
        onSelect={onSelect}
        options={[
          { icon: <span>1</span>, id: "explore", label: "Explore code" },
          { id: "build", label: "Build a feature" },
          { id: "review", label: "Review changes" },
          { disabled: true, id: "fix", label: "Fix failures" },
        ]}
      />,
    );

    const prompts = screen.getByRole("group", { name: "Suggested prompts" });
    const explore = within(prompts).getByRole("button", {
      name: "1 Explore code",
    });
    fireEvent.click(explore);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "explore", label: "Explore code" }),
    );
    expect(
      within(prompts)
        .getByRole("button", { name: "Review changes" })
        .getAttribute("data-compact-hidden"),
    ).toBe("true");
    expect(
      within(prompts).getByRole("button", { name: "Fix failures" }),
    ).toHaveProperty("disabled", true);
  });

  it("creates a branch from a focused modal and returns focus after close", async () => {
    function BranchDialogHarness() {
      const [branchName, setBranchName] = useState("");
      const [open, setOpen] = useState(false);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={triggerRef} onClick={() => setOpen(true)} type="button">
            Create branch
          </button>
          <BranchCreationDialog
            branchName={branchName}
            onBranchNameChange={setBranchName}
            onCreate={() => setOpen(false)}
            onOpenChange={setOpen}
            onSetPrefix={() => undefined}
            open={open}
            returnFocusRef={triggerRef}
          />
        </>
      );
    }

    render(<BranchDialogHarness />);
    const trigger = screen.getByRole("button", { name: "Create branch" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Create and checkout branch",
    });
    const input = within(dialog).getByRole("textbox", {
      name: "Branch name",
    });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const submit = within(dialog).getByRole("button", {
      name: "Create and checkout",
    });
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.change(input, { target: { value: "feat/current-branch" } });
    expect(submit).toHaveProperty("disabled", false);
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps host branch errors linked to the field and blocks duplicate submission while creating", async () => {
    const onCreate = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <BranchCreationDialog
        branchName="main"
        error="A branch named main already exists."
        onBranchNameChange={() => undefined}
        onCreate={onCreate}
        onOpenChange={onOpenChange}
        open
        status="creating"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Branch name" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(accessibleDescriptionText(input)).toContain(
      "A branch named main already exists.",
    );
    expect(input).toHaveProperty("disabled", true);
    const submit = screen.getByRole("button", {
      name: "Creating and checking out branch",
    });
    expect(submit).toHaveProperty("disabled", true);
    const close = screen.getByRole("button", {
      name: "Close branch creation dialog",
    });
    expect(close).toHaveProperty("disabled", true);
    const dialog = screen.getByRole("dialog", {
      name: "Create and checkout branch",
    });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.pointerDown(dialog.parentElement!);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.submit(input.closest("form")!);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("returns focus to the branch input when creation fails", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <BranchCreationDialog
        branchName="feat/retry"
        onBranchNameChange={() => undefined}
        onCreate={() => undefined}
        onOpenChange={onOpenChange}
        open
        status="creating"
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Create and checkout branch",
    });
    await waitFor(() => expect(document.activeElement).toBe(dialog));

    rerender(
      <BranchCreationDialog
        branchName="feat/retry"
        error="Git could not create and checkout the branch."
        onBranchNameChange={() => undefined}
        onCreate={() => undefined}
        onOpenChange={onOpenChange}
        open
        status="error"
      />,
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Branch name" }),
      ),
    );
  });

  it("preserves Unicode whitespace while trimming ASCII branch padding", () => {
    const onCreate = vi.fn();
    render(
      <BranchCreationDialog
        branchName={"  feat/unicode\u00a0  "}
        onBranchNameChange={() => undefined}
        onCreate={onCreate}
        onOpenChange={() => undefined}
        open
      />,
    );

    fireEvent.submit(
      screen.getByRole("textbox", { name: "Branch name" }).closest("form")!,
    );
    expect(onCreate).toHaveBeenCalledWith("feat/unicode\u00a0");
  });

  it("trims large ASCII branch padding without backtracking", () => {
    const onCreate = vi.fn();
    render(
      <BranchCreationDialog
        branchName={`${"\t".repeat(100_000)}feat/linear${" ".repeat(100_000)}`}
        onBranchNameChange={() => undefined}
        onCreate={onCreate}
        onOpenChange={() => undefined}
        open
      />,
    );

    fireEvent.submit(
      screen.getByRole("textbox", { name: "Branch name" }).closest("form")!,
    );
    expect(onCreate).toHaveBeenCalledWith("feat/linear");
  });

  it("separates conversation destination from project, environment, and worktree context", () => {
    const onSelect = vi.fn();
    render(
      <NewConversationStart
        composer={<textarea aria-label="Conversation prompt" />}
        context={
          <ConversationContextBar
            expandedId="project"
            items={[
              {
                ariaLabel: "Choose project",
                controlsId: "project-options",
                id: "project",
                kind: "project",
                label: "Project",
                popupRole: "listbox",
              },
              {
                id: "local",
                kind: "environment",
                label: "Local",
              },
              {
                id: "main",
                kind: "worktree",
                label: "Main",
              },
              {
                id: "repairing",
                kind: "worktree",
                label: "Repairing",
                status: "repairing",
                statusLabel: "Repairing",
              },
            ]}
            onSelect={onSelect}
          />
        }
        destination="ChatGPT"
        prompt={<button type="button">Choose a project for worktrees</button>}
      />,
    );

    const setup = screen.getByRole("region", {
      name: "New conversation setup",
    });
    expect(within(setup).getByText("ChatGPT")).toBeTruthy();
    expect(
      within(setup).getByRole("textbox", { name: "Conversation prompt" }),
    ).toBeTruthy();
    const context = setup.querySelector(
      ".codex-ui-new-conversation-start__context",
    );
    const composer = setup.querySelector(
      ".codex-ui-new-conversation-start__composer",
    );
    expect(
      context &&
        composer &&
        Boolean(
          context.compareDocumentPosition(composer) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    ).toBe(true);
    const project = within(setup).getByRole("button", {
      name: "Choose project",
    });
    expect(project.getAttribute("aria-controls")).toBe(
      "project-options",
    );
    expect(project.getAttribute("aria-expanded")).toBe("true");
    expect(project.getAttribute("aria-haspopup")).toBe("listbox");
    fireEvent.click(
      within(setup).getByRole("button", {
        name: "Change environment: Local",
      }),
    );
    expect(onSelect).toHaveBeenCalledWith("local");
    const repairing = within(setup).getByRole("button", {
      name: "Change worktree: Repairing",
    });
    expect(repairing).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(repairing)).toContain("Repairing");
  });

  it("lets a controlled menu wrap a context trigger without losing its semantics", () => {
    function ContextMenuHarness() {
      const [open, setOpen] = useState(false);
      return (
        <ConversationContextBar
          expandedId={open ? "environment" : undefined}
          items={[
            {
              controlsId: "start-in-menu",
              id: "environment",
              kind: "environment",
              label: "Local",
              popupRole: "menu",
            },
          ]}
          onSelect={() => setOpen((value) => !value)}
          renderItem={(_item, trigger) => (
            <Menu
              label="Start in"
              onOpenChange={setOpen}
              open={open}
              trigger={trigger}
            >
              <MenuItem>Work locally</MenuItem>
            </Menu>
          )}
        />
      );
    }

    render(<ContextMenuHarness />);
    const trigger = screen.getByRole("button", {
      name: "Change environment: Local",
    });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    expect(screen.getByRole("menu", { name: "Start in" })).toBeTruthy();
    expect(trigger.getAttribute("aria-controls")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("menuitem", { name: "Work locally" }),
    ).toBeTruthy();
  });

  it("focuses and keyboard-navigates linked conversation project options", async () => {
    const onDismiss = vi.fn();
    const onSelect = vi.fn();
    render(
      <>
        <button id="project-trigger" type="button">
          Project
        </button>
        <ConversationProjectListbox
          id="project-options"
          items={[
            {
              description: "Component workspace",
              icon: <span data-testid="ui-kit-project-icon">□</span>,
              id: "ui-kit",
              label: "UI Kit",
            },
            {
              description: "Desktop application",
              id: "desktop",
              label: "Desktop",
              meta: "1 task",
              path: "/Applications/ChatGPT.app",
              statusLabel: "Ready",
            },
            {
              id: "repair",
              label: "Repairing",
              status: "unavailable",
            },
          ]}
          onDismiss={onDismiss}
          onSelect={onSelect}
          selectedId="ui-kit"
          triggerId="project-trigger"
        />
      </>,
    );

    const uiKit = screen.getByRole("option", {
      name: "Select project UI Kit",
    });
    const desktop = screen.getByRole("option", {
      name: "Select project Desktop",
    });
    const repair = screen.getByRole("option", {
      name: "Select project Repairing",
    });
    expect(document.activeElement).toBe(uiKit);
    expect(screen.getByTestId("ui-kit-project-icon")).toBeTruthy();
    expect(
      uiKit.querySelector(
        ".codex-ui-conversation-project-options__check",
      )?.textContent,
    ).toBe("✓");
    expect(uiKit.tabIndex).toBe(0);
    expect(repair).toHaveProperty("disabled", true);

    fireEvent.keyDown(uiKit, { key: "ArrowDown" });
    expect(document.activeElement).toBe(desktop);
    expect(uiKit.tabIndex).toBe(-1);
    expect(desktop.tabIndex).toBe(0);
    expect(accessibleDescriptionText(desktop)).toContain(
      "Desktop application",
    );
    expect(accessibleDescriptionText(desktop)).toContain(
      "/Applications/ChatGPT.app",
    );
    expect(accessibleDescriptionText(desktop)).toContain(
      "1 task · Ready",
    );
    fireEvent.keyDown(desktop, { key: "ArrowDown" });
    expect(document.activeElement).toBe(uiKit);
    fireEvent.keyDown(uiKit, { key: "End" });
    expect(document.activeElement).toBe(desktop);
    fireEvent.click(desktop);
    expect(onSelect).toHaveBeenCalledWith("desktop");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Project" }),
      ),
    );

    desktop.focus();
    fireEvent.keyDown(desktop, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Project" }),
      ),
    );
  });

  it("keeps pinned project actions inside the listbox navigation order", () => {
    const onSelect = vi.fn();
    render(
      <ConversationProjectListbox
        items={[
          { id: "ui-kit", label: "UI Kit" },
          { id: "desktop", label: "Desktop" },
        ]}
        onSelect={onSelect}
        pinnedItems={[
          {
            ariaLabel: "New project",
            id: "new-project",
            label: "New project",
          },
          {
            ariaLabel: "Don't work in a project",
            id: "no-project",
            label: "Don't work in a project",
          },
        ]}
        selectedId="ui-kit"
      />,
    );

    const listbox = screen.getByRole("listbox", {
      name: "Conversation projects",
    });
    const options = within(listbox).getAllByRole("option");
    const uiKit = screen.getByRole("option", {
      name: "Select project UI Kit",
    });
    const newProject = screen.getByRole("option", {
      name: "New project",
    });
    const noProject = screen.getByRole("option", {
      name: "Don't work in a project",
    });
    expect(options).toHaveLength(4);
    expect(
      listbox
        .querySelector(".codex-ui-conversation-project-options__scroll")
        ?.contains(uiKit),
    ).toBe(true);
    expect(
      listbox
        .querySelector(".codex-ui-conversation-project-options__pinned")
        ?.contains(newProject),
    ).toBe(true);

    fireEvent.keyDown(uiKit, { key: "End" });
    expect(document.activeElement).toBe(noProject);
    fireEvent.keyDown(noProject, { key: "ArrowDown" });
    expect(document.activeElement).toBe(uiKit);
    fireEvent.click(newProject);
    expect(onSelect).toHaveBeenCalledWith("new-project");
  });

  it("focuses a selected option when controlled items become enabled", () => {
    const renderListbox = (disabled: boolean) => (
      <>
        <button id="dynamic-project-trigger" type="button">
          Project
        </button>
        <ConversationProjectListbox
          items={[
            {
              disabled,
              id: "ui-kit",
              label: "UI Kit",
            },
          ]}
          onSelect={() => undefined}
          selectedId="ui-kit"
          triggerId="dynamic-project-trigger"
        />
      </>
    );
    const { rerender } = render(renderListbox(true));
    const trigger = screen.getByRole("button", { name: "Project" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(renderListbox(false));

    const option = screen.getByRole("option", {
      name: "Select project UI Kit",
    });
    expect(document.activeElement).toBe(option);
    expect(option.tabIndex).toBe(0);
  });

  it("does not steal focus after the initial listbox entry succeeds", () => {
    const renderListbox = (selectedId: string, desktopDisabled: boolean) => (
      <>
        <textarea aria-label="Outside composer" />
        <ConversationProjectListbox
          items={[
            {
              id: "ui-kit",
              label: "UI Kit",
            },
            {
              disabled: desktopDisabled,
              id: "desktop",
              label: "Desktop",
            },
          ]}
          onSelect={() => undefined}
          selectedId={selectedId}
        />
      </>
    );
    const { rerender } = render(renderListbox("ui-kit", true));
    expect(document.activeElement).toBe(
      screen.getByRole("option", {
        name: "Select project UI Kit",
      }),
    );
    const composer = screen.getByRole("textbox", {
      name: "Outside composer",
    });
    composer.focus();

    rerender(renderListbox("desktop", false));

    expect(document.activeElement).toBe(composer);
  });

  it("dismisses without stealing the destination when focus leaves", () => {
    const onDismiss = vi.fn();
    render(
      <>
        <button id="focus-project-trigger" type="button">
          Project
        </button>
        <ConversationProjectListbox
          items={[
            {
              id: "ui-kit",
              label: "UI Kit",
            },
          ]}
          onDismiss={onDismiss}
          onSelect={() => undefined}
          selectedId="ui-kit"
          triggerId="focus-project-trigger"
        />
        <textarea aria-label="Conversation composer" />
      </>,
    );
    const option = screen.getByRole("option", {
      name: "Select project UI Kit",
    });
    expect(document.activeElement).toBe(option);

    const trigger = screen.getByRole("button", {
      name: "Project",
    });
    trigger.focus();
    expect(onDismiss).not.toHaveBeenCalled();
    option.focus();

    const composer = screen.getByRole("textbox", {
      name: "Conversation composer",
    });
    composer.focus();

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(composer);
  });

  it("keeps sibling controls inside an explicit dismissal boundary", () => {
    const onDismiss = vi.fn();
    render(
      <>
        <button id="bounded-project-trigger" type="button">
          Project
        </button>
        <div id="bounded-project-dialog">
          <input aria-label="Search projects" />
          <ConversationProjectListbox
            dismissBoundaryId="bounded-project-dialog"
            items={[
              {
                id: "ui-kit",
                label: "UI Kit",
              },
            ]}
            onDismiss={onDismiss}
            onSelect={() => undefined}
            selectedId="ui-kit"
            triggerId="bounded-project-trigger"
          />
          <button type="button">New project</button>
        </div>
        <textarea aria-label="Conversation composer" />
      </>,
    );
    const option = screen.getByRole("option", {
      name: "Select project UI Kit",
    });
    expect(document.activeElement).toBe(option);

    const search = screen.getByRole("textbox", {
      name: "Search projects",
    });
    fireEvent.pointerDown(search);
    search.focus();
    expect(onDismiss).not.toHaveBeenCalled();

    const action = screen.getByRole("button", {
      name: "New project",
    });
    fireEvent.pointerDown(action);
    action.focus();
    expect(onDismiss).not.toHaveBeenCalled();

    screen
      .getByRole("textbox", {
        name: "Conversation composer",
      })
      .focus();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses after focus leaves an allowed trigger outside the boundary", () => {
    const onDismiss = vi.fn();
    render(
      <>
        <button id="observed-project-trigger" type="button">
          Project
        </button>
        <div id="observed-project-dialog">
          <input aria-label="Search projects" />
          <ConversationProjectListbox
            dismissBoundaryId="observed-project-dialog"
            initialFocus="none"
            items={[{ id: "ui-kit", label: "UI Kit" }]}
            onDismiss={onDismiss}
            onSelect={() => undefined}
            selectedId="ui-kit"
            triggerId="observed-project-trigger"
          />
        </div>
        <textarea aria-label="Conversation composer" />
      </>,
    );

    const search = screen.getByRole("textbox", {
      name: "Search projects",
    });
    const trigger = screen.getByRole("button", { name: "Project" });
    const composer = screen.getByRole("textbox", {
      name: "Conversation composer",
    });
    search.focus();
    trigger.focus();
    expect(onDismiss).not.toHaveBeenCalled();
    composer.focus();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses an explicit boundary with Escape from a sibling control", async () => {
    const onDismiss = vi.fn();
    render(
      <>
        <button id="escape-project-trigger" type="button">
          Project
        </button>
        <div id="escape-project-dialog">
          <input aria-label="Search projects" />
          <ConversationProjectListbox
            dismissBoundaryId="escape-project-dialog"
            initialFocus="none"
            items={[
              {
                id: "ui-kit",
                label: "UI Kit",
              },
            ]}
            onDismiss={onDismiss}
            onSelect={() => undefined}
            selectedId="ui-kit"
            triggerId="escape-project-trigger"
          />
        </div>
      </>,
    );
    const search = screen.getByRole("textbox", {
      name: "Search projects",
    });
    search.focus();

    fireEvent.keyDown(search, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Project" }),
      ),
    );
  });

  it("keeps a first-enabled tab stop without automatic focus", () => {
    render(
      <ConversationProjectListbox
        initialFocus="none"
        items={[
          {
            id: "repair",
            label: "Repairing",
            status: "unavailable",
          },
          {
            id: "ui-kit",
            label: "UI Kit",
          },
          {
            id: "desktop",
            label: "Desktop",
          },
        ]}
        onSelect={() => undefined}
        selectedId="repair"
      />,
    );

    expect(
      screen.getByRole("option", {
        name: "Select project Repairing",
      }).tabIndex,
    ).toBe(-1);
    expect(
      screen.getByRole("option", {
        name: "Select project UI Kit",
      }).tabIndex,
    ).toBe(0);
    expect(
      screen.getByRole("option", {
        name: "Select project Desktop",
      }).tabIndex,
    ).toBe(-1);
  });

  it("renders grouped local environments in a controlled dialog", () => {
    const onOpenChange = vi.fn();
    const onQueryChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <LocalEnvironmentDialog
        createAction={<button type="button">Create environment</button>}
        groups={[
          {
            description: "Current checkout and linked worktrees",
            id: "ui-kit",
            items: [
              {
                branch: "main",
                id: "main",
                label: "Main",
                meta: "clean",
              },
              {
                branch: "fix/repair",
                id: "repairing",
                label: "Repairing",
                status: "repairing",
                statusLabel: "Repairing",
              },
            ],
            label: "UI Kit",
          },
        ]}
        onOpenChange={onOpenChange}
        onQueryChange={onQueryChange}
        onSelect={onSelect}
        open
        query=""
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Create local environment",
    });
    const search = within(dialog).getByRole("searchbox", {
      name: "Search local environments",
    });
    fireEvent.change(search, { target: { value: "main" } });
    expect(onQueryChange).toHaveBeenCalledWith("main");
    const main = within(dialog).getByRole("button", {
      name: "Use local environment Main",
    });
    expect(accessibleDescriptionText(main)).toContain("main");
    expect(accessibleDescriptionText(main)).toContain("clean");
    fireEvent.click(main);
    expect(onSelect).toHaveBeenCalledWith("ui-kit", "main");
    const repairing = within(dialog).getByRole("button", {
      name: "Use local environment Repairing",
    });
    expect(repairing).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(repairing)).toContain("Repairing");
    expect(
      within(dialog).getByRole("button", { name: "Create environment" }),
    ).toBeTruthy();
  });

  it("filters local environments from the controlled query", () => {
    const groups = [
      {
        id: "ui-kit",
        items: [
          {
            branch: "main",
            id: "main",
            label: "Main",
          },
          {
            branch: "desktop",
            id: "desktop",
            label: "Desktop checkout",
          },
        ],
        label: "UI Kit",
      },
    ];
    const commonProps = {
      groups,
      onOpenChange: () => undefined,
      onQueryChange: () => undefined,
      onSelect: () => undefined,
      open: true,
    };
    const { rerender } = render(
      <LocalEnvironmentDialog
        {...commonProps}
        query="desktop"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Use local environment Desktop checkout",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Use local environment Main",
      }),
    ).toBeNull();

    rerender(
      <LocalEnvironmentDialog
        {...commonProps}
        query="missing"
      />,
    );
    expect(screen.getByText("No local environments")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Use local environment Desktop checkout",
      }),
    ).toBeNull();
  });

  it("returns focus to the environment trigger when the dialog closes", async () => {
    function Fixture() {
      const [open, setOpen] = useState(true);
      const triggerRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={triggerRef} type="button">
            Environment
          </button>
          <LocalEnvironmentDialog
            groups={[]}
            onOpenChange={setOpen}
            onQueryChange={() => undefined}
            onSelect={() => undefined}
            open={open}
            query=""
            returnFocusRef={triggerRef}
          />
        </>
      );
    }
    render(<Fixture />);

    fireEvent.keyDown(
      screen.getByRole("dialog", {
        name: "Create local environment",
      }),
      { key: "Escape" },
    );

    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Environment" }),
      ),
    );
  });

  it("composes application projects with conversation and workspace setup", () => {
    render(
      <ProjectConversationPage
        description="Choose a project and route."
        footer={<output>Ready</output>}
        projects={
          <ProjectIndex
            items={[
              {
                id: "ui-kit",
                label: "UI Kit",
                path: "/workspace/ui-kit",
              },
            ]}
            onSelect={() => undefined}
            selectedId="ui-kit"
          />
        }
      >
        <p>Conversation setup content</p>
      </ProjectConversationPage>,
    );

    const page = screen.getByRole("region", {
      name: "Project conversation routing",
    });
    expect(page.getAttribute("data-status")).toBe("ready");
    expect(
      within(page).getByRole("complementary", { name: "Projects" }),
    ).toBeTruthy();
    expect(
      within(page).getByRole("region", { name: "Conversation setup" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Open project UI Kit" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("selects projects and keeps unavailable entries disabled", () => {
    const onSelect = vi.fn();
    render(
      <ProjectIndex
        emptyState="No matching projects"
        items={[
          {
            actions: <button aria-label="UI Kit actions">⋯</button>,
            description: "Current project",
            id: "ui-kit",
            label: "UI Kit",
            meta: "3 tasks",
            recentChats: [],
            status: "available",
          },
          {
            id: "missing",
            label: "Missing project",
            status: "unavailable",
            statusLabel: "Unavailable",
          },
          {
            id: "failed",
            label: "Failed project",
            status: "error",
            statusLabel: "Failed",
          },
        ]}
        onSelect={onSelect}
        onExpandedChange={() => undefined}
        selectedId="ui-kit"
        toolbar={<input aria-label="Search projects" type="search" />}
      />,
    );

    const currentProject = screen.getByRole("button", {
      name: "Open project UI Kit",
    });
    fireEvent.click(currentProject);
    expect(onSelect).toHaveBeenCalledWith("ui-kit");
    expect(accessibleDescriptionText(currentProject)).toContain(
      "Current project",
    );
    expect(accessibleDescriptionText(currentProject)).toContain("3 tasks");
    expect(
      currentProject
        .closest(".codex-ui-project-index__row")
        ?.getAttribute("data-has-actions"),
    ).toBe("true");
    expect(
      currentProject
        .closest(".codex-ui-project-index__row")
        ?.getAttribute("data-has-expand"),
    ).toBe("true");
    const missingProject = screen.getByRole("button", {
      name: "Open project Missing project",
    });
    expect(missingProject).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(missingProject)).toContain(
      "Unavailable",
    );
    const failedProject = screen.getByRole("button", {
      name: "Open project Failed project",
    });
    expect(failedProject).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(failedProject)).toContain("Failed");
    expect(
      screen.getByRole("searchbox", { name: "Search projects" }),
    ).toBeTruthy();
  });

  it("renders the current table index with sort and recent-chat ownership", () => {
    const onExpandedChange = vi.fn();
    const onOpenRecentChat = vi.fn();
    const onSelect = vi.fn();
    const onSortChange = vi.fn();
    render(
      <ProjectIndex
        actions={<button type="button">New project</button>}
        items={[
          {
            actions: <button type="button">UI Kit actions</button>,
            description: "Component library",
            expanded: true,
            id: "ui-kit",
            kindLabel: "Local",
            label: "UI Kit",
            meta: "3 tasks",
            path: "/workspace/ui-kit",
            recentChats: [
              {
                id: "parity",
                label: "Match project index",
                meta: "2m",
                pinned: true,
              },
            ],
            status: "available",
            statusLabel: "Ready",
            updated: "2m",
          },
          {
            actions: <button type="button">Docs actions</button>,
            id: "docs",
            label: "Docs",
          },
        ]}
        layout="table"
        onExpandedChange={onExpandedChange}
        onOpenRecentChat={onOpenRecentChat}
        onSelect={onSelect}
        onSortChange={onSortChange}
        sortBy="updated"
        sortDirection="descending"
        status="partial-error"
        toolbar={<input aria-label="Search projects" type="search" />}
      />,
    );

    const index = screen.getByRole("navigation", { name: "Project index" });
    expect(index.getAttribute("data-layout")).toBe("table");
    expect(index.getAttribute("data-status")).toBe("partial-error");
    expect(
      screen.getByRole("button", { name: "New project" }),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Some projects may be missing",
    );
    const updatedSort = screen.getByRole("button", {
      name: "Sort projects by updated, descending",
    });
    expect(updatedSort.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Sort projects by name" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    fireEvent.click(updatedSort);
    expect(onSortChange).toHaveBeenCalledWith("updated");
    const openProject = screen.getByRole("button", {
      name: "Open project UI Kit",
    });
    fireEvent.click(openProject);
    expect(onSelect).toHaveBeenCalledWith("ui-kit");
    expect(accessibleDescriptionText(openProject)).toContain(
      "Component library",
    );
    expect(accessibleDescriptionText(openProject)).toContain(
      "/workspace/ui-kit",
    );
    expect(accessibleDescriptionText(openProject)).toContain("Local");
    expect(accessibleDescriptionText(openProject)).toContain("Ready");
    expect(accessibleDescriptionText(openProject)).toContain("3 tasks");
    expect(accessibleDescriptionText(openProject)).toContain("2m");
    const collapseProject = screen.getByRole("button", {
      name: "Collapse project UI Kit",
    });
    expect(collapseProject.textContent).toBe("⌄");
    fireEvent.click(collapseProject);
    expect(onExpandedChange).toHaveBeenCalledWith("ui-kit", false);
    const recentChat = screen.getByRole("button", {
      name: "Open chat Match project index",
    });
    fireEvent.click(recentChat);
    expect(onOpenRecentChat).toHaveBeenCalledWith("ui-kit", "parity");
    expect(accessibleDescriptionText(recentChat)).toContain("2m");
    expect(accessibleDescriptionText(recentChat)).toContain("Pinned");
    expect(screen.getByLabelText("Pinned")).toBeTruthy();
    expect(
      recentChat.querySelector(
        ".codex-ui-project-index__recent-trailing",
      )?.children,
    ).toHaveLength(2);
    expect(
      screen.getByRole("toolbar", {
        name: "Project actions for UI Kit",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("toolbar", {
        name: "Project actions for Docs",
      }),
    ).toBeTruthy();
  });

  it("renders recent chats as noninteractive content without an open handler", () => {
    render(
      <ProjectIndex
        items={[
          {
            expanded: true,
            id: "ui-kit",
            label: "UI Kit",
            recentChats: [
              {
                id: "parity",
                label: "Match project index",
                meta: "2m",
                pinned: true,
              },
            ],
          },
        ]}
        onExpandedChange={() => undefined}
        onSelect={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Open chat Match project index",
      }),
    ).toBeNull();
    expect(screen.getByText("Match project index")).toBeTruthy();
    expect(screen.getByText("2m")).toBeTruthy();
    expect(screen.getByLabelText("Pinned")).toBeTruthy();
  });

  it("exposes table loading and error states without interactive rows", () => {
    const { rerender } = render(
      <ProjectIndex
        items={[]}
        layout="table"
        onSelect={() => undefined}
        status="loading"
      />,
    );

    const index = screen.getByRole("navigation", { name: "Project index" });
    expect(index.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain(
      "Loading projects",
    );
    expect(screen.queryByText("No projects")).toBeNull();

    rerender(
      <ProjectIndex
        items={[]}
        layout="table"
        onSelect={() => undefined}
        status="error"
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn’t load projects",
    );
    expect(screen.queryByText("No projects")).toBeNull();
  });

  it("supports radio keyboard navigation and skips unavailable routes", () => {
    function Fixture() {
      const [route, setRoute] = useState("local");
      return (
        <>
          <ConversationRouteSelector
            description="Choose where the conversation runs."
            onValueChange={setRoute}
            options={[
              {
                description: "Use this Mac",
                id: "local",
                label: "Local",
              },
              {
                id: "remote",
                label: "Remote",
                status: "unavailable",
                statusLabel: "Unavailable",
              },
              {
                description: "General conversation",
                id: "chatgpt",
                label: "ChatGPT",
              },
            ]}
            value={route}
          />
          <output>{route}</output>
        </>
      );
    }

    render(<Fixture />);

    const group = screen.getByRole("radiogroup", {
      name: "Conversation route",
    });
    expect(accessibleDescriptionText(group)).toBe(
      "Choose where the conversation runs.",
    );
    const local = within(group).getByRole("radio", { name: /Local/ });
    const remote = within(group).getByRole("radio", {
      name: /Remote/,
    });
    const chatgpt = within(group).getByRole("radio", {
      name: /ChatGPT/,
    });
    expect(local.getAttribute("aria-checked")).toBe("true");
    expect(remote).toHaveProperty("disabled", true);

    local.focus();
    fireEvent.keyDown(local, { key: "ArrowRight" });
    expect(document.activeElement).toBe(chatgpt);
    expect(chatgpt.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("chatgpt", { selector: "output" })).toBeTruthy();

    fireEvent.keyDown(chatgpt, { key: "Home" });
    expect(document.activeElement).toBe(local);
    expect(local.getAttribute("aria-checked")).toBe("true");
  });

  it("selects ready worktrees while exposing repair and item actions", () => {
    const onSelect = vi.fn();
    const onInspect = vi.fn();
    render(
      <WorktreeList
        actions={<button type="button">Create worktree</button>}
        items={[
          {
            branch: "feat/routing",
            id: "routing",
            label: "Routing",
            meta: "2 changes",
            path: "/workspace/routing",
            status: "available",
          },
          {
            actions: (
              <button onClick={onInspect} type="button">
                Details
              </button>
            ),
            branch: "fix/repair",
            id: "repair",
            label: "Repairing",
            status: "repairing",
            statusLabel: "Repairing",
          },
        ]}
        onSelect={onSelect}
        selectedId="routing"
      />,
    );

    const routing = screen.getByRole("button", {
      name: "Open worktree Routing",
    });
    expect(routing.getAttribute("aria-current")).toBe("location");
    fireEvent.click(routing);
    expect(onSelect).toHaveBeenCalledWith("routing");

    const repairing = screen.getByRole("button", {
      name: "Open worktree Repairing",
    });
    expect(repairing).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(repairing)).toContain("fix/repair");
    expect(accessibleDescriptionText(repairing)).toContain("Repairing");
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(onInspect).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Create worktree" }),
    ).toBeTruthy();
  });

  it("announces loading pages and independent empty states", () => {
    render(
      <ProjectConversationPage
        projects={
          <ProjectIndex
            emptyState="No projects yet"
            items={[]}
            onSelect={() => undefined}
          />
        }
        status="loading"
      >
        <WorktreeList
          emptyState="No worktrees yet"
          items={[]}
          onSelect={() => undefined}
        />
      </ProjectConversationPage>,
    );

    expect(
      screen
        .getByRole("region", { name: "Project conversation routing" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    expect(screen.getByText("No projects yet")).toBeTruthy();
    expect(screen.getByText("No worktrees yet")).toBeTruthy();
  });
});
