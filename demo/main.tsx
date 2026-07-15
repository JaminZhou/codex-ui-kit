import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  ActivityGroup,
  AgentActivity,
  AgentMessage,
  AgentThread,
  StatusIndicator,
  ToolCallCard,
  type AgentItemStatus,
} from "../src";
import "./showcase.css";

interface GalleryCardProps {
  children: ReactNode;
  description: string;
  title: string;
  wide?: boolean;
}

function GalleryCard({
  children,
  description,
  title,
  wide = false,
}: GalleryCardProps) {
  return (
    <section className="gallery-card" data-wide={wide || undefined}>
      <header className="gallery-card__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="gallery-card__body">{children}</div>
    </section>
  );
}

const statuses: Array<{ label: string; status: AgentItemStatus }> = [
  { label: "Pending", status: "pending" },
  { label: "Running", status: "running" },
  { label: "Completed", status: "completed" },
  { label: "Failed", status: "failed" },
];

function Showcase() {
  const [dark, setDark] = useState(false);

  return (
    <main
      className="showcase"
      data-codex-ui
      data-theme={dark ? "dark" : "light"}
    >
      <header className="showcase__topbar">
        <a className="showcase__brand" href="#top" aria-label="Codex UI Kit home">
          <span className="showcase__brand-mark" aria-hidden="true">
            C
          </span>
          <span>codex-ui-kit</span>
        </a>
        <div className="showcase__topbar-actions">
          <span className="showcase__version">foundations preview</span>
          <button type="button" onClick={() => setDark((value) => !value)}>
            {dark ? "Light" : "Dark"} theme
          </button>
        </div>
      </header>

      <div className="showcase__content" id="top">
        <section className="showcase__hero">
          <span className="showcase__eyebrow">Independent React primitives</span>
          <h1>Build clear coding-agent threads.</h1>
          <p>
            Protocol-neutral components for messages, activities, tools, and
            the states between them. Designed from interaction research and
            implemented independently.
          </p>
          <div className="showcase__hero-meta" aria-label="Package highlights">
            <span>React 18+</span>
            <span>TypeScript</span>
            <span>Light + dark</span>
            <span>MIT</span>
          </div>
        </section>

        <div className="gallery-grid">
          <GalleryCard
            description="A complete conversation surface assembled from the primitives."
            title="Thread composition"
            wide
          >
            <div className="thread-preview">
              <AgentThread aria-label="Example coding agent thread">
                <AgentMessage role="user">
                  Add a compact activity timeline and verify the component tests.
                </AgentMessage>

                <AgentMessage role="assistant">
                  <p>
                    I’ll inspect the component model, make the change, and run
                    checks.
                  </p>
                </AgentMessage>

                <ActivityGroup aria-label="Agent activity">
                  <AgentActivity
                    kind="reasoning"
                    status="completed"
                    summary="Inspected the existing component boundaries"
                  />
                  <AgentActivity
                    defaultOpen
                    detail="3 files"
                    kind="file-change"
                    status="completed"
                    summary="Implemented thread primitives"
                  >
                    <ul>
                      <li>Added an expandable activity primitive.</li>
                      <li>Added responsive thread and grouping layout.</li>
                      <li>Added semantic light and dark tokens.</li>
                    </ul>
                  </AgentActivity>
                  <ToolCallCard
                    name="pnpm check"
                    status="running"
                    summary="Typechecking, testing, and building the package"
                  />
                </ActivityGroup>

                <AgentMessage role="assistant" status="running">
                  The implementation is ready; I’m waiting for the final checks.
                </AgentMessage>
              </AgentThread>
            </div>
          </GalleryCard>

          <GalleryCard
            description="One activity model across the full execution lifecycle."
            title="Status language"
          >
            <div className="status-grid">
              {statuses.map(({ label, status }) => (
                <div className="status-sample" key={status}>
                  <StatusIndicator status={status} />
                  <span>{label}</span>
                  <code>{status}</code>
                </div>
              ))}
            </div>
          </GalleryCard>

          <GalleryCard
            description="Compact summaries keep detail available without dominating the thread."
            title="Activity disclosure"
          >
            <ActivityGroup>
              <AgentActivity
                kind="command"
                status="completed"
                summary="Read package configuration"
              />
              <AgentActivity
                detail="2 changes"
                kind="file-change"
                status="completed"
                summary="Updated component exports"
              >
                <code>src/index.ts</code>
              </AgentActivity>
              <AgentActivity
                kind="search"
                status="failed"
                summary="Could not resolve design reference"
              />
            </ActivityGroup>
          </GalleryCard>

          <GalleryCard
            description="Roles change presentation while keeping semantic article markup."
            title="Message roles"
          >
            <div className="message-stack">
              <AgentMessage role="user">User messages align to the edge.</AgentMessage>
              <AgentMessage role="assistant">
                Assistant messages stay in the reading column.
              </AgentMessage>
              <AgentMessage role="system">
                System context is visually quiet but remains available.
              </AgentMessage>
            </div>
          </GalleryCard>

          <GalleryCard
            description="Semantic variables can be overridden by any product theme."
            title="Theme tokens"
          >
            <div className="token-grid">
              <div className="token-sample" data-token="surface">
                <span />
                <code>--codex-ui-bg</code>
              </div>
              <div className="token-sample" data-token="subtle">
                <span />
                <code>--codex-ui-bg-subtle</code>
              </div>
              <div className="token-sample" data-token="text">
                <span />
                <code>--codex-ui-text</code>
              </div>
              <div className="token-sample" data-token="focus">
                <span />
                <code>--codex-ui-focus</code>
              </div>
            </div>
          </GalleryCard>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Showcase />
  </StrictMode>,
);
