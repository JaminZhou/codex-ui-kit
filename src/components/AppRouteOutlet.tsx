import {
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";

export type AppRouteOutletStatus =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "reconnecting"
  | "stale";

export interface AppRouteOutletAction {
  disabled?: boolean;
  id?: string;
  label: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  primary?: boolean;
}

export interface AppRouteOutletProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  actions?: readonly AppRouteOutletAction[];
  children?: ReactNode;
  description?: ReactNode;
  heading?: ReactNode;
  status?: AppRouteOutletStatus;
}

const defaultCopy: Record<
  Exclude<AppRouteOutletStatus, "ready">,
  { description: string; heading: string }
> = {
  empty: {
    description: "There is nothing to show here yet.",
    heading: "No results",
  },
  error: {
    description: "Try again to load this page.",
    heading: "Something went wrong",
  },
  loading: {
    description: "This usually takes a moment.",
    heading: "Loading",
  },
  offline: {
    description: "Reconnect to continue.",
    heading: "You’re offline",
  },
  reconnecting: {
    description: "Your existing content remains available.",
    heading: "Reconnecting",
  },
  stale: {
    description: "Showing the most recently available data.",
    heading: "Updates are delayed",
  },
};

function RouteStateIcon({ status }: { status: AppRouteOutletStatus }) {
  if (status === "loading" || status === "reconnecting") {
    return (
      <span
        aria-hidden="true"
        className="codex-ui-app-route-outlet__spinner"
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-app-route-outlet__icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      {status === "empty" ? (
        <>
          <rect height="15" rx="3" stroke="currentColor" width="18" x="3" y="4.5" />
          <path d="M7 9.5h10M7 13.5h6" stroke="currentColor" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8" stroke="currentColor" />
          <path d="M12 7.75v5.5M12 16.25v.1" stroke="currentColor" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function AppRouteOutlet({
  actions = [],
  children,
  className,
  description,
  heading,
  status = "ready",
  ...props
}: AppRouteOutletProps) {
  const classes = ["codex-ui-app-route-outlet", className]
    .filter(Boolean)
    .join(" ");
  const preservesContent = status === "stale" || status === "reconnecting";
  const showsContent = status === "ready" || preservesContent;
  const copy = status === "ready" ? undefined : defaultCopy[status];
  const resolvedHeading = heading ?? copy?.heading;
  const resolvedDescription = description ?? copy?.description;
  const liveRole =
    status === "error" || status === "offline" ? "alert" : "status";

  return (
    <section
      className={classes}
      data-preserves-content={preservesContent || undefined}
      data-status={status}
      {...props}
    >
      {status !== "ready" ? (
        <div
          aria-atomic="true"
          aria-live={liveRole === "status" ? "polite" : undefined}
          className="codex-ui-app-route-outlet__state"
          role={liveRole}
        >
          <RouteStateIcon status={status} />
          <div className="codex-ui-app-route-outlet__copy">
            <h2>{resolvedHeading}</h2>
            {resolvedDescription ? <p>{resolvedDescription}</p> : null}
          </div>
          {actions.length > 0 ? (
            <div className="codex-ui-app-route-outlet__actions">
              {actions.map((action, index) => (
                <button
                  className="codex-ui-app-route-outlet__action"
                  data-primary={action.primary || undefined}
                  disabled={action.disabled}
                  key={action.id ?? index}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {showsContent ? (
        <div
          aria-busy={status === "reconnecting" || undefined}
          className="codex-ui-app-route-outlet__content"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
