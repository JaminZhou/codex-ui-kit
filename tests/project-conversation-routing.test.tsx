// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConversationContextBar,
  ConversationProjectListbox,
  ConversationRouteSelector,
  LocalEnvironmentDialog,
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
    const project = within(setup).getByRole("button", {
      name: "Change project: Project",
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
    expect(document.activeElement).toBe(
      screen.getByRole("option", {
        name: "Select project UI Kit",
      }),
    );

    const composer = screen.getByRole("textbox", {
      name: "Conversation composer",
    });
    composer.focus();

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(composer);
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
            description: "Current project",
            id: "ui-kit",
            label: "UI Kit",
            meta: "3 tasks",
            status: "available",
          },
          {
            id: "missing",
            label: "Missing project",
            status: "unavailable",
            statusLabel: "Unavailable",
          },
        ]}
        onSelect={onSelect}
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
    const missingProject = screen.getByRole("button", {
      name: "Open project Missing project",
    });
    expect(missingProject).toHaveProperty("disabled", true);
    expect(accessibleDescriptionText(missingProject)).toContain(
      "Unavailable",
    );
    expect(screen.getByRole("searchbox", { name: "Search projects" })).toBeTruthy();
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
