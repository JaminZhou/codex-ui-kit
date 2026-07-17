import {
  ActivityTimeline,
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  AgentComposer,
  ApprovalCommandPreview,
  ApprovalRequest,
  type ApprovalAction,
  type ApprovalRequestKind,
  CodeBlock,
  CommandExecution,
  CommandOutput,
  type CodeHighlighter,
  ComposerAttachment,
  ComposerMentionMenu,
  type ComposerMentionOption,
  ComposerModeIndicator,
  type ComposerLayout,
  FileChange,
  FileDiff,
  InlineNotice,
  type NoticeTone,
  ProposedPlan,
  type QueuedPrompt,
  QueuedPromptList,
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
const composerLayout: ComposerLayout = "auto";
const mentionOption: ComposerMentionOption = {
  id: "package-consumer",
  label: "Package consumer",
};
const queuedPrompt: QueuedPrompt = {
  id: "queued-package-consumer",
  text: "Verify public types",
};

void FileChange;
void FileDiff;
void InlineNotice;
void ActivityTimeline;
void AgentMarkdown;
void AgentPlan;
void AgentReasoning;
void AgentComposer;
void ApprovalCommandPreview;
void ApprovalRequest;
void CodeBlock;
void CommandExecution;
void CommandOutput;
void ComposerAttachment;
void ComposerMentionMenu;
void ComposerModeIndicator;
void ProposedPlan;
void QueuedPromptList;
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
void composerLayout;
void mentionOption;
void queuedPrompt;
