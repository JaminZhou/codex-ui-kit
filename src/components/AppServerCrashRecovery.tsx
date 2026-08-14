import {
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
} from "react";

export interface AppServerCrashRecoveryAction {
  disabled?: boolean;
  icon?: ReactNode;
  label: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export interface AppServerCrashRecoveryProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  appName?: string;
  configurationAction?: AppServerCrashRecoveryAction;
  description?: ReactNode;
  documentationAction?: AppServerCrashRecoveryAction;
  heading?: ReactNode;
  icon?: ReactNode;
  restartAction?: AppServerCrashRecoveryAction;
  updateAction?: AppServerCrashRecoveryAction;
}

function AppServerErrorIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" />
      <path
        d="M12 7.5v6M12 16.55v.1"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AppServerUpdateIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="M8 2.75v7.5m0 0 2.5-2.5M8 10.25l-2.5-2.5M3.25 11.75v1.5h9.5v-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecoveryButton({
  action,
  kind,
}: {
  action: AppServerCrashRecoveryAction;
  kind: "configuration" | "restart" | "update";
}) {
  return (
    <button
      className="codex-ui-app-server-crash-recovery__action"
      data-kind={kind}
      disabled={action.disabled}
      onClick={action.onClick}
      type="button"
    >
      {action.icon ?? (kind === "update" ? <AppServerUpdateIcon /> : null)}
      {action.label}
    </button>
  );
}

export function AppServerCrashRecovery({
  appName = "ChatGPT",
  className,
  configurationAction,
  description,
  documentationAction,
  heading,
  icon,
  restartAction,
  updateAction,
  ...props
}: AppServerCrashRecoveryProps) {
  const classes = ["codex-ui-app-server-crash-recovery", className]
    .filter(Boolean)
    .join(" ");
  const resolvedHeading = heading ?? `${appName} stopped unexpectedly`;
  const resolvedDescription =
    description ?? (
      <>
        Restart {appName} to continue. If the problem persists, check your
        configuration
        {documentationAction ? (
          <>
            {" or visit the "}
            <button
              className="codex-ui-app-server-crash-recovery__documentation"
              disabled={documentationAction.disabled}
              onClick={documentationAction.onClick}
              type="button"
            >
              {documentationAction.label}
            </button>
          </>
        ) : null}
      </>
    );
  const hasActions = Boolean(
    updateAction || configurationAction || restartAction,
  );

  return (
    <div className={classes} {...props}>
      <section
        aria-atomic="true"
        className="codex-ui-app-server-crash-recovery__content"
        role="alert"
      >
        <span className="codex-ui-app-server-crash-recovery__icon">
          {icon === undefined ? <AppServerErrorIcon /> : icon}
        </span>
        <div className="codex-ui-app-server-crash-recovery__copy">
          <h1>{resolvedHeading}</h1>
          <p>{resolvedDescription}</p>
        </div>
        {hasActions ? (
          <div className="codex-ui-app-server-crash-recovery__actions">
            {updateAction ? (
              <RecoveryButton action={updateAction} kind="update" />
            ) : null}
            {configurationAction ? (
              <RecoveryButton
                action={configurationAction}
                kind="configuration"
              />
            ) : null}
            {restartAction ? (
              <RecoveryButton action={restartAction} kind="restart" />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
