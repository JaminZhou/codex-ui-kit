import {
  ActivityTimeline,
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  AgentComposer,
  AgentThreadViewport,
  AgentTurn,
  ArtifactList,
  ApprovalCommandPreview,
  ApprovalRequest,
  Button,
  type ApprovalAction,
  type ApprovalRequestKind,
  CodeBlock,
  CommandExecution,
  CommandOutput,
  type CommandExecutionStatus,
  type CodeHighlighter,
  ComposerAttachment,
  ComposerMentionMenu,
  type ComposerMentionOption,
  ComposerModeIndicator,
  type ComposerLayout,
  Dialog,
  DialogChoice,
  type DialogSize,
  FileChange,
  type FileChangeStatus,
  FileDiff,
  GeneratedImageGallery,
  ImagePreviewDialog,
  IconButton,
  InlineNotice,
  LoadingShimmer,
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuSubmenu,
  type NoticeTone,
  ProposedPlan,
  Popover,
  ResourceCard,
  ResourceList,
  type QueuedPrompt,
  QueuedPromptList,
  SearchActivity,
  Select,
  StatusBanner,
  type StatusIndicatorStatus,
  SourceList,
  FloatingThreadPanel,
  ThreadFloatingButton,
  ThreadContextOptimization,
  ThreadHeader,
  ThreadLoadingState,
  ThreadMessageNavigationRail,
  ThreadNavigationControls,
  ThreadRenderError,
  ThreadSkeleton,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  type ThreadMessageNavigationItem,
  type StatusBannerAction,
  StreamNotice,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentPanel,
  SubagentSummary,
  SubagentTranscriptHeader,
  TurnDuration,
  Tooltip,
  formatCommandDuration,
  fileDiffToText,
  formatTurnDuration,
  type FileDiffSize,
  type FileDiffLine,
  type GeneratedImageItem,
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
const generatedImage: GeneratedImageItem = {
  id: "package-image",
  src: "https://example.com/image.png",
};
const dialogSize: DialogSize = "compact";
const warningStatus: StatusIndicatorStatus = "warning";
// @ts-expect-error Warning is intentionally scoped to activity/status surfaces.
const invalidFileChangeWarning: FileChangeStatus = "warning";
// @ts-expect-error Warning is intentionally scoped to activity/status surfaces.
const invalidCommandWarning: CommandExecutionStatus = "warning";
const navigationItem: ThreadMessageNavigationItem = {
  id: "package-navigation-message",
  label: "Package consumer",
  preview: "Public navigation rail type",
};

void FileChange;
void FileDiff;
void GeneratedImageGallery;
void ImagePreviewDialog;
void InlineNotice;
void LoadingShimmer;
void ActivityTimeline;
void AgentMarkdown;
void AgentPlan;
void AgentReasoning;
void AgentComposer;
void AgentThreadViewport;
void AgentTurn;
void ArtifactList;
void ApprovalCommandPreview;
void ApprovalRequest;
void CodeBlock;
void CommandExecution;
void CommandOutput;
void ComposerAttachment;
void ComposerMentionMenu;
void ComposerModeIndicator;
void Dialog;
void DialogChoice;
void ProposedPlan;
void ResourceCard;
void ResourceList;
void QueuedPromptList;
void SearchActivity;
void StatusBanner;
void SourceList;
void FloatingThreadPanel;
void ThreadFloatingButton;
void ThreadContextOptimization;
void ThreadHeader;
void ThreadLoadingState;
void ThreadMessageNavigationRail;
void ThreadNavigationControls;
void ThreadRenderError;
void ThreadSkeleton;
void ThreadThinkingPlaceholder;
void ThreadVirtualizedPlaceholder;
void navigationItem;
void StreamNotice;
void SubagentActivity;
void SubagentActivityGroup;
void SubagentPanel;
void SubagentSummary;
void SubagentTranscriptHeader;
void TurnDuration;
void Button;
void IconButton;
void Menu;
void MenuCheckboxItem;
void MenuItem;
void MenuSubmenu;
void Popover;
void Select;
void Tooltip;
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
void generatedImage;
void dialogSize;
void warningStatus;
void invalidFileChangeWarning;
void invalidCommandWarning;
