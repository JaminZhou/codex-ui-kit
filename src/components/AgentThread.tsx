import type { HTMLAttributes, ReactNode } from "react";

export type AgentThreadWidth = "narrow" | "wide" | "full";

export interface AgentThreadProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  width?: AgentThreadWidth;
}

export function AgentThread({
  children,
  className,
  width = "wide",
  ...props
}: AgentThreadProps) {
  const classes = ["codex-ui-thread", className].filter(Boolean).join(" ");

  return (
    <section className={classes} data-width={width} {...props}>
      {children}
    </section>
  );
}

export interface ActivityGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ActivityGroup({
  children,
  className,
  ...props
}: ActivityGroupProps) {
  const classes = ["codex-ui-activity-group", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
