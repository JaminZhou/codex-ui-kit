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
  ConversationEvent,
  ConversationEventList,
  ProjectPicker,
  PullRequestCheckList,
  PullRequestDetails,
  PullRequestList,
  PullRequestPage,
  PullRequestReviewSummary,
  PullRequestReviewThread,
  RunLocationMenu,
  WorkspaceSelection,
  WorktreePicker,
} from "../src";

afterEach(cleanup);

describe("conversation event surfaces", () => {
  it("classifies event ownership and announces live and failed states", () => {
    render(
      <ConversationEventList label="Session events">
        <ConversationEvent
          actions={<button type="button">Stop</button>}
          description="Running the desktop checks"
          kind="command"
          meta="2s"
          status="running"
          title="Ran pnpm check"
        />
        <ConversationEvent
          kind="handoff"
          ownership="thread"
          status="failed"
          title="Worktree handoff failed"
        />
      </ConversationEventList>,
    );

    const list = screen.getByRole("list", { name: "Session events" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.getAttribute("data-kind")).toBe("command");
    expect(items[0]?.getAttribute("data-ownership")).toBe("turn");
    expect(items[1]?.getAttribute("data-ownership")).toBe("thread");
    expect(screen.getByRole("status").getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Worktree handoff failed",
    );
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  });
});

describe("workspace selection surfaces", () => {
  it("coordinates project, run location, and worktree choices", async () => {
    function Fixture() {
      const [project, setProject] = useState("ui-kit");
      const [location, setLocation] = useState("local");
      const [worktree, setWorktree] = useState("current");
      return (
        <WorkspaceSelection
          description="Choose where the next session runs."
          footer={<output>{`${project}/${location}/${worktree}`}</output>}
        >
          <ProjectPicker
            onProjectChange={setProject}
            projects={[
              {
                description: "Current project",
                id: "ui-kit",
                label: "UI Kit",
                path: "/workspace/ui-kit",
              },
              {
                id: "desktop",
                label: "Desktop",
                status: "available",
              },
            ]}
            value={project}
          />
          <RunLocationMenu
            onValueChange={setLocation}
            options={[
              {
                description: "Use the current checkout",
                id: "local",
                label: "Local",
              },
              {
                disabled: true,
                id: "cloud",
                label: "Cloud",
                status: "unavailable",
                statusLabel: "Unavailable",
              },
              {
                id: "worktree",
                label: "New worktree",
              },
            ]}
            value={location}
          />
          <WorktreePicker
            onWorktreeChange={setWorktree}
            value={worktree}
            worktrees={[
              {
                branch: "feat/current",
                id: "current",
                label: "Current checkout",
              },
              {
                branch: "feat/review",
                id: "review",
                label: "Review worktree",
                status: "available",
                statusLabel: "Ready",
              },
            ]}
          />
        </WorkspaceSelection>
      );
    }

    render(<Fixture />);

    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    fireEvent.click(screen.getByRole("option", { name: "Desktop" }));
    expect(screen.getByRole("button", { name: "Project" }).textContent).toContain(
      "Desktop",
    );

    fireEvent.keyDown(screen.getByRole("button", { name: "Run location" }), {
      key: "ArrowDown",
    });
    const menu = screen.getByRole("menu");
    const localOption = within(menu).getByRole("menuitemradio", {
      name: /Local/,
    });
    await waitFor(() => expect(document.activeElement).toBe(localOption));
    expect(
      localOption.getAttribute("aria-checked"),
    ).toBe("true");
    const cloudOption = within(menu).getByRole("menuitemradio", {
      name: "Cloud Unavailable",
    });
    expect(cloudOption).toHaveProperty("disabled", true);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    const worktreeOption = within(menu).getByRole("menuitemradio", {
      name: /New worktree/,
    });
    expect(document.activeElement).toBe(worktreeOption);
    fireEvent.click(
      worktreeOption,
    );

    fireEvent.click(screen.getByRole("button", { name: "Worktree" }));
    fireEvent.click(
      screen.getByRole("option", { name: /Review worktree/ }),
    );
    expect(screen.getByText("desktop/worktree/review")).toBeTruthy();
  });

  it("keeps unavailable project and repairing worktree options disabled", () => {
    render(
      <>
        <ProjectPicker
          onProjectChange={() => undefined}
          projects={[
            {
              id: "missing",
              label: "Missing project",
              status: "unavailable",
              statusLabel: "Unavailable",
            },
          ]}
        />
        <WorktreePicker
          onWorktreeChange={() => undefined}
          worktrees={[
            {
              id: "repairing",
              label: "Repairing worktree",
              status: "repairing",
              statusLabel: "Repairing",
            },
          ]}
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    expect(
      screen.getByRole("option", { name: /Missing project/ }),
    ).toHaveProperty("disabled", true);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Worktree" }));
    expect(
      screen.getByRole("option", { name: /Repairing worktree/ }),
    ).toHaveProperty("disabled", true);
  });
});

describe("pull request workspace surfaces", () => {
  it("composes list, detail, checks, reviews, and inline threads", () => {
    const onSelect = vi.fn();
    render(
      <PullRequestPage
        list={
          <PullRequestList
            items={[
              {
                checkStatus: "passed",
                id: "50",
                number: 50,
                repository: "ui-kit",
                state: "open",
                title: "Add workflow surfaces",
              },
              {
                checkStatus: "running",
                id: "51",
                number: 51,
                repository: "ui-kit",
                state: "draft",
                title: "Polish the desktop shell",
              },
            ]}
            onSelect={onSelect}
            selectedId="50"
          />
        }
      >
        <PullRequestDetails
          actions={<button type="button">Merge</button>}
          additions={128}
          author="Jamin"
          deletions={12}
          filesChanged={8}
          number={50}
          repository="ui-kit"
          sourceBranch="feat/workflow"
          targetBranch="main"
          title="Add workflow surfaces"
        >
          <PullRequestCheckList
            checks={[
              {
                duration: "1m",
                id: "ci",
                name: "CI",
                status: "passed",
              },
              {
                id: "review",
                name: "Review",
                status: "running",
              },
            ]}
          />
          <PullRequestReviewSummary
            reviewers={[
              {
                id: "bot",
                name: "Codex",
                status: "commented",
                summary: "One suggestion",
              },
            ]}
          />
          <PullRequestReviewThread
            actions={<button type="button">Resolve</button>}
            author="Codex"
            line={42}
            path="src/example.ts"
          >
            Keep the focus target connected.
          </PullRequestReviewThread>
        </PullRequestDetails>
      </PullRequestPage>,
    );

    const current = screen.getByRole("button", {
      name: "Open pull request 50: Add workflow surfaces",
    });
    expect(current.getAttribute("aria-current")).toBe("page");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open pull request 51: Polish the desktop shell",
      }),
    );
    expect(onSelect).toHaveBeenCalledWith("51");
    expect(screen.getByText("Passed · 1m")).toBeTruthy();
    expect(screen.getByText("Commented")).toBeTruthy();
    expect(screen.getByText("src/example.ts:42")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Merge" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Resolve" })).toBeTruthy();
  });

  it("renders independent list and detail empty states", () => {
    render(
      <PullRequestPage
        emptyDetail="Choose a review"
        list={<PullRequestList items={[]} />}
      />,
    );
    expect(screen.getByText("No pull requests")).toBeTruthy();
    expect(screen.getByText("Choose a review")).toBeTruthy();
  });
});
