import { useId, type HTMLAttributes, type ReactNode } from "react";

export type EnvironmentSettingsStatus =
  | "error"
  | "loading"
  | "ready"
  | "unavailable";

export interface EnvironmentSettingsPageProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  children?: ReactNode;
  message?: ReactNode;
  status?: EnvironmentSettingsStatus;
  statusHeading?: ReactNode;
  title?: ReactNode;
}

export function EnvironmentSettingsPage({
  children,
  className,
  message = "We could not load local environment settings for this project",
  status = "ready",
  statusHeading,
  title = "Environments",
  ...props
}: EnvironmentSettingsPageProps) {
  const titleId = useId();
  const statusHeadingId = useId();
  const statusMessageId = useId();
  const showStatus = status !== "ready";
  const role = status === "error" ? "alert" : "status";
  const resolvedStatusHeading =
    statusHeading ??
    (status === "loading"
      ? "Loading local environments"
      : status === "error"
        ? "Local environments error"
        : "Local environments unavailable");

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={["codex-ui-environment-settings-page", className]
        .filter(Boolean)
        .join(" ")}
      data-status={status}
    >
      <h1 id={titleId}>{title}</h1>
      {showStatus ? (
        <div className="codex-ui-environment-settings-page__status">
          <h2 id={statusHeadingId}>{resolvedStatusHeading}</h2>
          <div
            aria-labelledby={statusHeadingId}
            aria-describedby={statusMessageId}
            className="codex-ui-environment-settings-page__status-card"
            role={role}
          >
            <div id={statusMessageId}>
              {status === "loading" ? "Loading…" : message}
            </div>
          </div>
        </div>
      ) : (
        <div className="codex-ui-environment-settings-page__content">
          {children}
        </div>
      )}
    </section>
  );
}
