// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConversationRouteSelector,
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
