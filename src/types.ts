export type AgentItemStatus = "pending" | "running" | "completed" | "failed";

export type AgentMessageRole = "user" | "assistant" | "system";

export type ApprovalDecision = "pending" | "approved" | "rejected";

export interface AgentMessageItem {
  id: string;
  type: "message";
  role: AgentMessageRole;
  text: string;
  status?: AgentItemStatus;
}

export interface ToolCallItem {
  id: string;
  type: "tool-call";
  name: string;
  summary?: string;
  status: AgentItemStatus;
}

export type AgentItem = AgentMessageItem | ToolCallItem;

export type AgentActivityKind =
  | "command"
  | "file-change"
  | "reasoning"
  | "search"
  | "subagent"
  | "tool"
  | "generic";
