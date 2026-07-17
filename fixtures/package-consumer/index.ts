import {
  ActivityTimeline,
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  ApprovalCommandPreview,
  ApprovalRequest,
  type ApprovalAction,
  type ApprovalRequestKind,
  CodeBlock,
  CommandExecution,
  CommandOutput,
  type CodeHighlighter,
  FileChange,
  FileDiff,
  InlineNotice,
  type NoticeTone,
  ProposedPlan,
  SearchActivity,
  StatusBanner,
  type StatusBannerAction,
  StreamNotice,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentPanel,
  SubagentSummary,
  SubagentTranscriptHeader,
  TurnDuration,
  formatCommandDuration,
  fileDiffToText,
  formatTurnDuration,
  type FileDiffSize,
  type FileDiffLine,
  type SearchActivityEntry,
  type SubagentActivityItem,
  type SubagentItem,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";
import "codex-ui-kit/tokens.css";

const line: FileDiffLine = {
  content: "package contract",
  kind: "context",
};
const highlighter: CodeHighlighter = (code) => ({ code, html: code });
const diffSize: FileDiffSize = "short";
const searchEntry: SearchActivityEntry = {
  detail: "package contract",
  id: "search-entry",
};
const subagent: SubagentItem = {
  id: "package-consumer",
  name: "Consumer",
  status: "active",
};
const subagentActivity: SubagentActivityItem = {
  activityStatus: "active",
  id: subagent.id,
  name: subagent.name,
};
const approvalAction: ApprovalAction = {
  onClick: () => undefined,
};
const approvalKind: ApprovalRequestKind = "command";
const noticeTone: NoticeTone = "warning";
const noticeAction: StatusBannerAction = {
  label: "Try again",
  variant: "primary",
};

void FileChange;
void FileDiff;
void InlineNotice;
void ActivityTimeline;
void AgentMarkdown;
void AgentPlan;
void AgentReasoning;
void ApprovalCommandPreview;
void ApprovalRequest;
void CodeBlock;
void CommandExecution;
void CommandOutput;
void ProposedPlan;
void SearchActivity;
void StatusBanner;
void StreamNotice;
void SubagentActivity;
void SubagentActivityGroup;
void SubagentPanel;
void SubagentSummary;
void SubagentTranscriptHeader;
void TurnDuration;
void formatCommandDuration;
void fileDiffToText([line]);
void formatTurnDuration;
void diffSize;
void highlighter;
void line;
void searchEntry;
void subagent;
void subagentActivity;
void approvalAction;
void approvalKind;
void noticeTone;
void noticeAction;
