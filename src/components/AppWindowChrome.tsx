import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

function SidebarIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <rect height="10.5" rx="2" stroke="currentColor" width="12" x="2" y="2.75" />
      <path d="M5.75 3v10" stroke="currentColor" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="m9.75 3.75-4.25 4.25 4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
      <path
        d="m6.25 3.75 4.25 4.25-4.25 4.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface AppWindowChromeAction
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: ReactNode;
  label: string;
}

export interface AppWindowChromeProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  backAction?: AppWindowChromeAction;
  endActions?: ReactNode;
  forwardAction?: AppWindowChromeAction;
  sidebarAction?: AppWindowChromeAction;
  startActions?: ReactNode;
  title?: ReactNode;
}

function WindowChromeAction({
  className,
  icon,
  label,
  ...props
}: AppWindowChromeAction) {
  return (
    <button
      aria-label={label}
      className={[
        "codex-ui-app-window-chrome__action",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={label}
      type="button"
      {...props}
    >
      {icon}
    </button>
  );
}

export function AppWindowChrome({
  backAction,
  className,
  endActions,
  forwardAction,
  sidebarAction,
  startActions,
  title,
  ...props
}: AppWindowChromeProps) {
  const resolvedSidebarAction = sidebarAction
    ? { icon: <SidebarIcon />, ...sidebarAction }
    : undefined;
  const resolvedBackAction = backAction
    ? { icon: <BackIcon />, ...backAction }
    : undefined;
  const resolvedForwardAction = forwardAction
    ? { icon: <ForwardIcon />, ...forwardAction }
    : undefined;

  return (
    <header
      className={[
        "codex-ui-app-window-chrome",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-codex-ui-drag-region
      {...props}
    >
      <div className="codex-ui-app-window-chrome__navigation">
        {resolvedSidebarAction ? (
          <WindowChromeAction {...resolvedSidebarAction} />
        ) : null}
        {resolvedBackAction ? (
          <WindowChromeAction {...resolvedBackAction} />
        ) : null}
        {resolvedForwardAction ? (
          <WindowChromeAction {...resolvedForwardAction} />
        ) : null}
        {startActions}
      </div>
      {title ? (
        <div className="codex-ui-app-window-chrome__title">{title}</div>
      ) : null}
      {endActions ? (
        <div className="codex-ui-app-window-chrome__end-actions">
          {endActions}
        </div>
      ) : null}
    </header>
  );
}
