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
  description?: ReactNode;
  feedbackAction?: AppServerCrashRecoveryAction;
  feedbackDescription?: ReactNode;
  heading?: ReactNode;
  illustration?: ReactNode;
  restartAction?: AppServerCrashRecoveryAction;
}

function AppServerOfflineIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-app-server-crash-recovery__fallback-illustration"
      fill="none"
      viewBox="0 0 160 160"
    >
      <path
        d="M38 116c16-18 11-29 1-36-8-6-16 0-12 8 5 11 25 2 38 13 11 9 6 24-5 28-9 4-17-1-15-7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M97 117c7-17 23-22 36-13 12 8 2 25-10 18-8-4-5-14 4-18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <rect fill="#2269e8" height="64" rx="24" width="78" x="40" y="38" />
      <rect
        fill="#151c2c"
        height="38"
        rx="15"
        stroke="#72a8ff"
        strokeWidth="3"
        transform="rotate(-8 51 54)"
        width="58"
        x="51"
        y="54"
      />
      <path
        d="m67 68 7 5-6 6m18-14 7 5-6 6"
        stroke="#70f3ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M56 42c5-15 24-18 34-7 13-7 27 1 28 15M48 95l-9 13m66-11 12 12"
        stroke="#4d87f3"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M117 109h13v9h-13zm-77-1h12v9H40z"
        fill="#aaa"
        stroke="#ddd"
        strokeWidth="2"
      />
    </svg>
  );
}

function RecoveryButton({
  action,
  kind,
}: {
  action: AppServerCrashRecoveryAction;
  kind: "feedback" | "restart";
}) {
  return (
    <button
      className="codex-ui-app-server-crash-recovery__action"
      data-kind={kind}
      disabled={action.disabled}
      onClick={action.onClick}
      type="button"
    >
      {action.icon}
      {action.label}
    </button>
  );
}

export function AppServerCrashRecovery({
  appName = "ChatGPT",
  className,
  description,
  feedbackAction,
  feedbackDescription,
  heading,
  illustration,
  restartAction,
  ...props
}: AppServerCrashRecoveryProps) {
  const classes = ["codex-ui-app-server-crash-recovery", className]
    .filter(Boolean)
    .join(" ");
  const resolvedHeading = heading ?? `${appName} hit a snag`;
  const resolvedDescription =
    description ?? `Something went wrong. Restart ${appName} to try again.`;
  const resolvedFeedbackDescription =
    feedbackDescription ?? "Send feedback to help us make the app better.";

  return (
    <div className={classes} {...props}>
      <section
        aria-atomic="true"
        className="codex-ui-app-server-crash-recovery__content"
        role="alert"
      >
        <div className="codex-ui-app-server-crash-recovery__group">
          <div className="codex-ui-app-server-crash-recovery__illustration">
            {illustration ?? <AppServerOfflineIllustration />}
          </div>
          <div className="codex-ui-app-server-crash-recovery__copy">
            <h1>{resolvedHeading}</h1>
            <p>{resolvedDescription}</p>
            <p>{resolvedFeedbackDescription}</p>
          </div>
          {restartAction || feedbackAction ? (
            <div className="codex-ui-app-server-crash-recovery__actions">
              {restartAction ? (
                <RecoveryButton action={restartAction} kind="restart" />
              ) : null}
              {feedbackAction ? (
                <RecoveryButton action={feedbackAction} kind="feedback" />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
