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
  PullRequestCommentComposer,
  PullRequestDetails,
  PullRequestList,
  PullRequestMergeReadiness,
  PullRequestPanelSummary,
  PullRequestPage,
  PullRequestQueryState,
  PullRequestReviewComposer,
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
                indicator: <span data-testid="pr-indicator">⑂</span>,
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
          headingLevel="h1"
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
    expect(
      screen.getByTestId("pr-indicator").parentElement?.getAttribute(
        "aria-hidden",
      ),
    ).toBe("true");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Add workflow surfaces",
      }),
    ).toBeTruthy();
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

  it("distinguishes loading and failed query states without relying on color", () => {
    const { rerender } = render(
      <PullRequestQueryState
        placeholderRows={3}
        status="loading"
        variant="list"
      />,
    );

    const loading = screen.getByRole("status");
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.getAttribute("aria-label")).toBe(
      "Loading pull requests",
    );
    expect(
      loading.querySelectorAll(
        ".codex-ui-pull-request-query-state__skeleton",
      ),
    ).toHaveLength(3);

    rerender(
      <PullRequestQueryState
        heading="No pull requests found"
        placeholderRows={5}
        status="loading"
        variant="split-list"
      />,
    );
    const splitLoading = screen.getByRole("status");
    expect(splitLoading.textContent).toContain("Loading pull requests");
    expect(
      splitLoading.querySelectorAll(
        ".codex-ui-pull-request-query-state__skeleton-copy",
      ),
    ).toHaveLength(5);

    rerender(
      <PullRequestQueryState
        heading="No pull requests found"
        status="empty"
        variant="split-list"
      />,
    );
    const splitEmpty = screen.getByRole("status");
    expect(splitEmpty.textContent).toBe("No pull requests found");
    expect(
      splitEmpty.querySelector(
        ".codex-ui-pull-request-query-state__indicator",
      ),
    ).toBeNull();

    rerender(
      <PullRequestQueryState
        action={<button type="button">Retry</button>}
        description="Check the connection and try again."
        status="error"
      />,
    );
    const failed = screen.getByRole("alert");
    expect(failed.textContent).toContain("Pull requests unavailable");
    expect(failed.textContent).toContain(
      "Check the connection and try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("announces merge readiness and exposes every requirement state", () => {
    const { rerender } = render(
      <PullRequestMergeReadiness
        action={<button type="button">View failed check</button>}
        requirements={[
          {
            id: "ci",
            label: "CI",
            status: "failed",
          },
          {
            id: "review",
            label: "Codex review",
            status: "pending",
          },
          {
            id: "threads",
            label: "Review threads",
            status: "passed",
          },
        ]}
        status="blocked"
      />,
    );

    const blocked = screen.getByRole("alert");
    expect(blocked.textContent).toContain("Merge blocked");
    expect(
      blocked.querySelector('[data-status="failed"]')?.textContent,
    ).toContain("CI");
    expect(
      blocked.querySelector('[data-status="pending"]')?.textContent,
    ).toContain("Codex review");
    expect(
      blocked.querySelector('[data-status="passed"]')?.textContent,
    ).toContain("Review threads");

    rerender(
      <PullRequestMergeReadiness
        action={<button type="button">Squash and merge</button>}
        status="ready"
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Ready to merge",
    );
    expect(
      screen.getByRole("button", { name: "Squash and merge" }),
    ).toBeTruthy();
  });

  it("submits a controlled review decision and reports progress", () => {
    const onSubmit = vi.fn();

    function Fixture() {
      const [body, setBody] = useState("");
      const [kind, setKind] = useState<
        "approve" | "comment" | "request-changes"
      >("comment");
      return (
        <PullRequestReviewComposer
          body={body}
          kind={kind}
          onBodyChange={setBody}
          onKindChange={setKind}
          onSubmit={onSubmit}
        />
      );
    }

    const { rerender } = render(<Fixture />);
    fireEvent.click(
      screen.getByRole("radio", { name: "Request changes" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Review summary" }),
      {
        target: { value: "Please restore keyboard focus." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(onSubmit).toHaveBeenCalledWith({
      body: "Please restore keyboard focus.",
      kind: "request-changes",
    });

    rerender(
      <PullRequestReviewComposer
        body="Please restore keyboard focus."
        kind="request-changes"
        status="submitting"
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "Submitting review.",
    );
    expect(
      screen.getByRole("button", { name: "Submitting…" }),
    ).toHaveProperty("disabled", true);
  });

  it("requires review feedback when requesting changes", () => {
    render(
      <PullRequestReviewComposer
        body="  "
        kind="request-changes"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Submit review" }),
    ).toHaveProperty("disabled", true);
  });

  it("supports an uncontrolled review body and decision", () => {
    const onSubmit = vi.fn();
    render(<PullRequestReviewComposer onSubmit={onSubmit} />);

    fireEvent.click(
      screen.getByRole("radio", { name: "Request changes" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Review summary" }),
      {
        target: { value: "Please restore keyboard focus." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));

    expect(onSubmit).toHaveBeenCalledWith({
      body: "Please restore keyboard focus.",
      kind: "request-changes",
    });
  });

  it("submits a controlled comment and exposes a recoverable error", () => {
    const onSubmit = vi.fn();

    function Fixture() {
      const [value, setValue] = useState("");
      return (
        <PullRequestCommentComposer
          onSubmit={onSubmit}
          onValueChange={setValue}
          value={value}
        />
      );
    }

    const { rerender } = render(<Fixture />);
    const submit = screen.getByRole("button", { name: "Post comment" });
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
      target: { value: "The current-head checks are green." },
    });
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(
      "The current-head checks are green.",
    );

    rerender(
      <PullRequestCommentComposer
        error="The comment was not posted. Try again."
        status="error"
        value="The current-head checks are green."
      />,
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "The comment was not posted. Try again.",
    );
  });

  it("supports an uncontrolled pull request comment", () => {
    const onSubmit = vi.fn();
    render(<PullRequestCommentComposer onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: "Post comment" });
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
      target: { value: "Current-head checks are green." },
    });
    expect(submit).toHaveProperty("disabled", false);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith(
      "Current-head checks are green.",
    );
  });

  it("renders the current pull request panel summary structure", () => {
    render(
      <PullRequestPanelSummary
        checks={<span>CI passed</span>}
        commentComposer={<textarea aria-label="Pull request comment" />}
        description={<p>Add the current review workspace.</p>}
        descriptionAction={<button type="button">Edit description</button>}
        facts={[
          {
            id: "branch",
            indicator: "⑂",
            label: "Branch",
            value: "feat/review → main",
          },
          {
            id: "checks",
            label: "Checks",
            tone: "success",
            value: "Successful",
          },
        ]}
        meta="Jamin · Ready for review"
        timeline={<article>Codex reviewed the latest push.</article>}
        title="Add review workspace"
        titleAction={<button type="button">Edit title</button>}
      />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Add review workspace",
      }),
    ).toBeTruthy();
    expect(screen.getByText("feat/review → main")).toBeTruthy();
    expect(screen.getByText("Successful")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Description" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Checks" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit title" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Edit description" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Pull request comment" }),
    ).toBeTruthy();
    expect(screen.getByText("Codex reviewed the latest push.")).toBeTruthy();
  });

  it("can place the pull request comment composer after the timeline", () => {
    render(
      <PullRequestPanelSummary
        commentComposer={<textarea aria-label="Pull request comment" />}
        commentPlacement="after-timeline"
        timeline={<article>Jamin opened this pull request.</article>}
        title="Current pull request"
      />,
    );

    const timeline = screen.getByText("Jamin opened this pull request.");
    const comment = screen.getByRole("textbox", {
      name: "Pull request comment",
    });
    expect(
      timeline.compareDocumentPosition(comment) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
